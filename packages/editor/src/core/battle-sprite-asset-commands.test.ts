import type { BattleSpriteDef } from '@type-pal/content'
import { expect, test } from 'vitest'
import {
  authoredBattleRecord,
  decodeBattleAsset,
  encodeBattleBytes,
  enemyProfile,
  loadBattleSpriteProject,
} from '../__tests__/battle-sprite-project.js'
import { prepareBattleSpriteImport } from './battle-sprite-import.js'
import { sha256Hex } from './binary-signature.js'
import {
  AddBattleSpriteCommand,
  DeleteUnusedBattleSpriteAssetCommand,
  ReplaceBattleSpriteAssetCommand,
} from './commands.js'
import { EditSession } from './edit-session.js'
import { createEditorAssetReader } from './editor-asset-reader.js'
import { assertProjectSaveValid } from './project-diagnostics.js'
import { collectCurrentProjectReferenceIndex } from './project-reference-adapters.js'

const OWNED_ASSET = 'battle-sprite.authored.forest'
const RAW_ASSET = 'battle-sprite.authored.spirit'

async function loadAssets(name: string) {
  const project = await loadBattleSpriteProject(name, [
    {
      asset: OWNED_ASSET,
      label: '林间小妖帧',
      frameCount: 4,
      definitions: [{ id: 'forest-ghost', label: '林间小妖', profile: enemyProfile(2, 1, 1) }],
    },
    { asset: RAW_ASSET, label: '灯灵帧', frameCount: 3, colorOffset: 1, definitions: [] },
  ])
  const session = new EditSession(project.state)
  const reader = createEditorAssetReader(project.source, () => session.getState())
  return { project, session, reader }
}

test('a shareable frame source can gain another use and lose it without moving its record or bytes', async () => {
  const { project, session, reader } = await loadAssets('reuse battle asset')
  const source = reader.record(OWNED_ASSET, 'battle-sprite')
  const bytes = await reader.readBytes(OWNED_ASSET, 'battle-sprite')
  const definition: BattleSpriteDef = {
    id: 'lightning-spirit',
    label: '雷灵',
    asset: OWNED_ASSET,
    profile: { kind: 'summon' },
  }
  expect(session.dispatch(new AddBattleSpriteCommand(definition, source, bytes, 4))).toBe(true)
  expect(session.getState().battleSprites.at(-1)).toEqual(definition)
  expect(session.getState().assetCatalog).toBe(project.state.assetCatalog)
  expect(session.undo()).toBe(true)
  expect(session.getState().battleSprites).toEqual(project.state.battleSprites)
  expect(await sha256Hex(await reader.readBytes(OWNED_ASSET, 'battle-sprite'))).toBe(source.sha256)
  expect(session.redo()).toBe(true)
  expect(session.getState().battleSprites.at(-1)).toEqual(definition)
  assertProjectSaveValid(session.getState())
})

test('duplicate use and conflicting physical path are rejected before any history entry', async () => {
  const { project, session, reader } = await loadAssets('battle asset add conflicts')
  const source = reader.record(OWNED_ASSET, 'battle-sprite')
  const bytes = await reader.readBytes(OWNED_ASSET, 'battle-sprite')
  const actualFrameCount = (await decodeBattleAsset(project, project.state, OWNED_ASSET)).frames
    .length
  const definition = project.state.battleSprites.find(({ id }) => id === 'forest-ghost')!
  expect(() =>
    session.dispatch(new AddBattleSpriteCommand(definition, source, bytes, actualFrameCount)),
  ).toThrow('战斗精灵定义 id 已存在: forest-ghost')
  expect(() =>
    session.dispatch(
      new AddBattleSpriteCommand(
        { ...definition, id: 'other-ghost', asset: 'battle-sprite.authored.other' },
        source,
        bytes,
        actualFrameCount,
      ),
    ),
  ).toThrow(`战斗精灵资源路径已由 ${OWNED_ASSET} 登记`)
  expect(session.getState()).toBe(project.state)
  expect(session.getHistoryVersion()).toBe(0)
})

test('replacing battle frames requires the selected use, current revision and current consumer set', async () => {
  const { project, session, reader } = await loadAssets('battle replacement guards')
  const source = reader.record(OWNED_ASSET, 'battle-sprite')
  const previousBytes = await reader.readBytes(OWNED_ASSET, 'battle-sprite')
  const replacement = await encodeBattleBytes(project.palette, 5, 4)
  const record = authoredBattleRecord(replacement, '新版林间小妖')
  const proof = {
    asset: OWNED_ASSET,
    previousSha256: source.sha256,
    previousFrameCount: (await decodeBattleAsset(project, project.state, OWNED_ASSET)).frames
      .length,
    nextFrameCount: replacement.frameCount,
    consumerIds: ['forest-ghost'],
  }
  const replace = (definition: string | undefined, selected: typeof proof = proof) =>
    new ReplaceBattleSpriteAssetCommand(
      definition,
      selected.asset,
      record,
      replacement.bytes,
      previousBytes,
      selected,
    )

  const rejected = [
    [replace('starter-fighter'), '战斗精灵定义与待替换 AssetId 不一致'],
    [
      replace(undefined, { ...proof, asset: 'battle-sprite.absent' }),
      '待替换战斗精灵资源不在 catalog',
    ],
    [
      replace('forest-ghost', { ...proof, previousSha256: reader.record(RAW_ASSET).sha256 }),
      '战斗精灵替换证明已过期',
    ],
    [replace('forest-ghost', { ...proof, consumerIds: [] }), '共享战斗精灵消费者已变化'],
    [replace(undefined), '待替换战斗精灵资源已有语义消费者'],
  ] as const
  for (const [attempt, message] of rejected) {
    expect(() => session.dispatch(attempt)).toThrow(message)
    expect(session.getState()).toBe(project.state)
  }
  expect(session.getHistoryVersion()).toBe(0)

  expect(session.dispatch(replace('forest-ghost'))).toBe(true)
  expect(await sha256Hex(await reader.readBytes(OWNED_ASSET, 'battle-sprite'))).toBe(record.sha256)
  expect(session.getState().battleSprites).toEqual(project.state.battleSprites)
  assertProjectSaveValid(session.getState())
  expect(session.undo()).toBe(true)
  expect(await sha256Hex(await reader.readBytes(OWNED_ASSET, 'battle-sprite'))).toBe(source.sha256)
})

test('only an unused source can be removed, and its original bytes survive undo and redo', async () => {
  const { session, reader } = await loadAssets('battle delete source')
  const source = reader.record(RAW_ASSET, 'battle-sprite')
  const bytes = await reader.readBytes(RAW_ASSET, 'battle-sprite')
  const remove = (asset: string, savedBytes?: ArrayBuffer) =>
    new DeleteUnusedBattleSpriteAssetCommand(asset, collectCurrentProjectReferenceIndex, savedBytes)
  const before = session.getState()
  const absent = remove('battle-sprite.absent')
  expect(absent.invert(before)).toBe(before)
  expect(session.dispatch(absent)).toBe(false)
  expect(() => session.dispatch(remove(OWNED_ASSET))).toThrow('仍被定义引用')
  expect(session.getHistoryVersion()).toBe(0)

  expect(session.dispatch(remove(RAW_ASSET, bytes))).toBe(true)
  expect(session.getState().assetCatalog.assets[RAW_ASSET]).toBeUndefined()
  await expect(reader.readBytes(RAW_ASSET, 'battle-sprite')).rejects.toThrow('不在 catalog')
  expect(session.undo()).toBe(true)
  expect(reader.record(RAW_ASSET, 'battle-sprite')).toEqual(source)
  expect(await sha256Hex(await reader.readBytes(RAW_ASSET, 'battle-sprite'))).toBe(source.sha256)
  expect(session.redo()).toBe(true)
  expect(session.getState().assetCatalog.assets[RAW_ASSET]).toBeUndefined()
  expect(reader.record(OWNED_ASSET, 'battle-sprite')).toBe(before.assetCatalog.assets[OWNED_ASSET])
})

test.each([
  'metadata',
  'bytes',
])('replay uses the accepted upload after the caller reuses %s', async (input) => {
  const { project, session, reader } = await loadAssets('battle upload history ownership')
  const outline = await encodeBattleBytes(project.palette, 4, 7)
  const draft = await prepareBattleSpriteImport(session.getState(), {
    hint: 'river-spirit',
    label: '河灯灵',
    kind: 'summon',
    bytes: outline.bytes,
    frameCount: outline.frameCount,
    reader,
  })
  const expectedDefinition = structuredClone(draft.definition)
  const expectedRecord = structuredClone(draft.record)
  const command = new AddBattleSpriteCommand(
    draft.definition,
    draft.record,
    draft.bytes,
    draft.frameCount,
  )
  expect(session.dispatch(command)).toBe(true)
  expect(session.getState().battleSprites.at(-1)).toEqual(expectedDefinition)
  expect(await sha256Hex(await reader.readBytes(expectedDefinition.asset))).toBe(outline.sha256)
  expect(project.state.assetCatalog.assets[expectedDefinition.asset]).toBeUndefined()
  expect(session.undo()).toBe(true)
  expect(session.getState().battleSprites).toEqual(project.state.battleSprites)
  expect(session.getState().assetCatalog.assets[expectedDefinition.asset]).toBeUndefined()

  if (input === 'metadata') {
    draft.definition.label = '另一次编辑的名称'
    draft.record.label = '另一次编辑的资源文件名'
  } else {
    new Uint8Array(draft.bytes).fill(0)
  }
  expect(session.redo()).toBe(true)
  expect(session.getState().battleSprites.at(-1)).toEqual(expectedDefinition)
  expect(reader.record(expectedDefinition.asset)).toEqual(expectedRecord)
  expect(await sha256Hex(await reader.readBytes(expectedDefinition.asset))).toBe(outline.sha256)
  assertProjectSaveValid(session.getState())
})
