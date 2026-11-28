import type { AuthorCommand } from '@type-pal/content'
import { decodeBattleSpriteAssetBytes, decodeWorldSpriteAssetBytes } from '@type-pal/reforge'
import { expect, test } from 'vitest'
import { loadWorldSpriteProject } from '../__tests__/world-sprite-project.js'
import {
  AddBattleSpriteCommand,
  RemoveBattleSpriteDefinitionCommand,
  RemoveSpriteDefinitionCommand,
  SpriteInUseError,
  UpdateBattleSpriteDefinitionCommand,
  UpdateSpriteCommand,
} from './commands.js'
import { type EditorState, EditSession } from './edit-session.js'
import { assertProjectSaveValid } from './project-diagnostics.js'
import { collectCurrentProjectReferenceIndex } from './project-reference-adapters.js'
import type { ScriptEditorState } from './script-editor.js'

const spriteId = 'command-reference-pose'
const assetId = 'sprite.authored.command-reference'
const battleId = 'command-reference-battle'
const target = { scene: 'start', entity: 'scene-hero' }
const actionUse: AuthorCommand = {
  kind: 'playEntityAction',
  target,
  sprite: spriteId,
  action: 'wave',
  loop: false,
}
const appearanceUse: AuthorCommand = { kind: 'setActorSprite', actor: 'hero', sprite: spriteId }

async function referenceProject(name: string) {
  const project = await loadWorldSpriteProject(
    name,
    [
      {
        asset: assetId,
        label: '引用素材',
        frameCount: 2,
        definitions: [
          {
            id: spriteId,
            label: '引用动作',
            layout: { kind: 'static' },
            poses: { wave: { label: '挥手', steps: [{ frame: 1, durationMs: 120 }] } },
          },
        ],
      },
    ],
    {
      entities: [{ id: target.entity, actor: 'hero', pos: { col: 2, row: 2, height: 0 } }],
    },
  )
  const record = project.state.assetCatalog.assets[assetId]!
  const decoded = await decodeWorldSpriteAssetBytes(
    record,
    await project.source.readBytes(record.path),
  )
  const proof = { asset: assetId, sha256: record.sha256, actualFrameCount: decoded.frames.length }
  const scriptState: ScriptEditorState = { ...project.canonical, items: [] }
  const provider = (state: EditorState) => collectCurrentProjectReferenceIndex(state, scriptState)
  function setSharedBody(body: AuthorCommand[], state = project.state) {
    scriptState.sharedScripts = {
      preview: { name: '引用演出', self: 'none', body },
    }
    assertProjectSaveValid({ ...state, sharedScripts: scriptState.sharedScripts })
  }
  return { project, proof, provider, setSharedBody }
}

test('动作引用阻止删除动作及其用途，角色外观引用只阻止删除用途', async () => {
  const { project, proof, provider, setSharedBody } = await referenceProject(
    'sprite-command-action-blockers',
  )
  const session = new EditSession(project.state)
  const deletePose = () => new UpdateSpriteCommand(spriteId, { poses: undefined }, proof, provider)
  setSharedBody([actionUse])
  expect(() => session.dispatch(new RemoveSpriteDefinitionCommand(spriteId, provider))).toThrow(
    SpriteInUseError,
  )
  expect(() => session.dispatch(deletePose())).toThrow(/动作 wave 仍被 1 处引用/)
  expect(session.getState()).toBe(project.state)
  expect(session.getHistoryVersion()).toBe(0)

  setSharedBody([appearanceUse])
  expect(() => session.dispatch(new RemoveSpriteDefinitionCommand(spriteId, provider))).toThrow(
    SpriteInUseError,
  )
  expect(session.dispatch(deletePose())).toBe(true)
  expect(session.getState().sprites.find((sprite) => sprite.id === spriteId)?.poses).toBeUndefined()
  expect(session.getHistoryVersion()).toBe(1)
})

test('引用当前战斗形象的作者脚本阻止删除及改变 profile，撤掉引用才可删除', async () => {
  const { project, provider, setSharedBody } = await referenceProject(
    'sprite-command-battle-blockers',
  )
  const session = new EditSession(project.state)
  const starter = project.state.battleSprites.find((sprite) => sprite.id === 'starter-fighter')!
  const record = project.state.assetCatalog.assets[starter.asset]!
  const bytes = await project.source.readBytes(record.path)
  const decoded = await decodeBattleSpriteAssetBytes(record, bytes)
  const proof = {
    asset: starter.asset,
    sha256: record.sha256,
    actualFrameCount: decoded.frames.length,
  }
  expect(
    session.dispatch(
      new AddBattleSpriteCommand(
        { ...starter, id: battleId },
        record,
        bytes,
        proof.actualFrameCount,
      ),
    ),
  ).toBe(true)

  setSharedBody(
    [{ kind: 'setActorAppearance', actor: 'hero', battleSprite: battleId }],
    session.getState(),
  )
  const active = session.getState()
  const remove = () => new RemoveBattleSpriteDefinitionCommand(battleId, provider)
  expect(() => session.dispatch(remove())).toThrow(SpriteInUseError)
  expect(() =>
    session.dispatch(
      new UpdateBattleSpriteDefinitionCommand(
        battleId,
        {
          profile: { kind: 'summon' },
        },
        proof,
        provider,
      ),
    ),
  ).toThrow(/profile.*不兼容/)
  expect(session.getState()).toBe(active)
  expect(session.getHistoryVersion()).toBe(1)

  setSharedBody([])
  expect(session.dispatch(remove())).toBe(true)
  expect(session.getState().battleSprites.map((sprite) => sprite.id)).toEqual([starter.id])
  expect(session.getState().assetCatalog.assets[starter.asset]).toEqual(record)
})

test('缺少删除目标不读取引用，引用来源失败时保持状态和撤销历史', async () => {
  const { project, proof } = await referenceProject('sprite-command-reference-unavailable')
  const session = new EditSession(project.state)
  const failed = () => {
    throw new Error('current-author unavailable')
  }
  expect(session.dispatch(new RemoveSpriteDefinitionCommand('missing', failed))).toBe(false)
  expect(session.dispatch(new RemoveBattleSpriteDefinitionCommand('missing', failed))).toBe(false)
  expect(() => session.dispatch(new RemoveSpriteDefinitionCommand(spriteId, failed))).toThrow(
    'current-author unavailable',
  )
  expect(() =>
    session.dispatch(new UpdateSpriteCommand(spriteId, { poses: undefined }, proof, failed)),
  ).toThrow('current-author unavailable')
  expect(session.getState()).toBe(project.state)
  expect(session.getHistoryVersion()).toBe(0)
  expect(session.canUndo()).toBe(false)
})

test.each([
  ['definition', appearanceUse],
  ['action', actionUse],
] as const)('撤销 %s 删除后新增真实引用，重做会复核并保留已恢复记录', async (kind, reference) => {
  const { project, proof, provider, setSharedBody } = await referenceProject(
    'sprite-command-reference-redo',
  )
  const session = new EditSession(project.state)
  const deleteCommand =
    kind === 'definition'
      ? new RemoveSpriteDefinitionCommand(spriteId, provider)
      : new UpdateSpriteCommand(spriteId, { poses: undefined }, proof, provider)
  expect(session.dispatch(deleteCommand)).toBe(true)
  expect(session.undo()).toBe(true)
  const restored = session.getState()
  setSharedBody([reference])
  const beforeRedo = session.getHistoryVersion()
  expect(() => session.redo()).toThrow(SpriteInUseError)
  expect(session.getState()).toBe(restored)
  expect(session.getHistoryVersion()).toBe(beforeRedo)
  expect(
    session.getState().sprites.find((sprite) => sprite.id === spriteId)?.poses?.wave?.label,
  ).toBe('挥手')
  expect(session.canRedo()).toBe(true)
})
