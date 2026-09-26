/**
 * TEST-CURSOR-COMMAND-BOUNDARIES-3：精灵命令残项。
 */
import type { AssetRecordV1, SpriteDef } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { loadBoundaryProject } from './__tests__/cursor-command-boundary-fixtures.js'
import type { EditorState } from './edit-session.js'
import { EditSession } from './edit-session.js'
import { collectCurrentProjectReferenceIndex } from './project-reference-adapters.js'
import {
  AddSpriteCommand,
  DeleteUnusedSpriteAssetCommand,
  type SpriteLayoutEditProof,
  UpdateSpriteCommand,
} from './sprite-commands.js'

function expectRejected(
  command: { apply(state: EditorState): EditorState },
  input: EditorState,
  pattern: RegExp,
): void {
  const snapshot = structuredClone(input)
  expect(() => command.apply(input)).toThrow(pattern)
  expect(input).toEqual(snapshot)
}

function heroProof(state: EditorState): SpriteLayoutEditProof {
  const sprite = state.sprites.find((entry) => entry.id === 'hero')!
  return {
    asset: sprite.asset,
    sha256: state.assetCatalog.assets[sprite.asset]!.sha256,
    actualFrameCount: 12,
  }
}

describe('精灵命令残项', () => {
  test('UpdateSprite 非法预制动作 durationMs=0 → 预制动作非法', async () => {
    const { state } = await loadBoundaryProject('sprite-residual-pose')
    expectRejected(
      new UpdateSpriteCommand(
        'hero',
        { poses: { bad: { label: '坏动作', steps: [{ frame: 0, durationMs: 0 }] } } },
        heroProof(state),
      ),
      state,
      /预制动作 .* 非法/,
    )
  })

  test('UpdateSprite proof.actualFrameCount 为 0 → 实际帧数非法', async () => {
    const { state } = await loadBoundaryProject('sprite-residual-frames')
    const proof = heroProof(state)
    proof.actualFrameCount = 0
    expectRejected(
      new UpdateSpriteCommand(
        'hero',
        { poses: { wave: { label: '挥手', steps: [{ frame: 0, durationMs: 200 }] } } },
        proof,
      ),
      state,
      /实际帧数非法/,
    )
  })

  test('先合法加入预制动作，再 poses:{} 且无 currentReferences → 无法读取引用索引', async () => {
    const { state } = await loadBoundaryProject('sprite-residual-index')
    const session = new EditSession(state)
    const proof = heroProof(state)
    const poses = { wave: { label: '挥手', steps: [{ frame: 0, durationMs: 200 }] } }
    const add = new UpdateSpriteCommand('hero', { poses }, proof)
    poses.wave.label = 'mutated-after-construct'
    poses.wave.steps[0]!.durationMs = 1
    const neighborActor = state.actors[0]
    expect(session.dispatch(add)).toBe(true)
    expect(
      session.getState().sprites.find((sprite) => sprite.id === 'hero')!.poses?.wave?.label,
    ).toBe('挥手')
    expect(session.getState().actors[0]).toBe(neighborActor)
    expect(session.undo()).toBe(true)
    expect(session.getState().sprites.find((sprite) => sprite.id === 'hero')!.poses).toBeUndefined()
    expect(session.redo()).toBe(true)
    expect(
      session.getState().sprites.find((sprite) => sprite.id === 'hero')!.poses?.wave?.steps[0],
    ).toEqual({ frame: 0, durationMs: 200 })

    const input = session.getState()
    expectRejected(
      new UpdateSpriteCommand('hero', { poses: {} }, proof),
      input,
      /删除预制动作前无法读取 current-author 引用索引/,
    )
  })

  test('DeleteUnusedSpriteAssetCommand 删除 hero 资产 → 精灵资产仍被定义引用', async () => {
    const { state } = await loadBoundaryProject('sprite-residual-inuse')
    const asset = state.sprites.find((sprite) => sprite.id === 'hero')!.asset
    expectRejected(
      new DeleteUnusedSpriteAssetCommand(asset, collectCurrentProjectReferenceIndex),
      state,
      /精灵资产 .* 仍被定义引用/,
    )
  })

  test('AddSprite 缺 asset 字段 → 精灵定义缺 AssetId', async () => {
    const { state } = await loadBoundaryProject('sprite-residual-asset')
    const record: AssetRecordV1 = {
      kind: 'sprite',
      path: 'assets/generated/sprites/missing.rle',
      mediaType: 'application/vnd.type-pal.rle',
      bytes: 0,
      sha256: 'a'.repeat(64),
      origin: { kind: 'generated' },
    }
    const def = { id: 'chest', label: '箱子', layout: { kind: 'static' } } as SpriteDef
    expectRejected(
      new AddSpriteCommand(def, record, new ArrayBuffer(0)),
      state,
      /精灵定义缺 AssetId/,
    )
  })
})
