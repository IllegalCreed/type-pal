import { type BattleSpriteDef, validateBattleSprites, validateSprites } from '@type-pal/content'
import { decodeBattleSpriteAssetBytes, decodeWorldSpriteAssetBytes } from '@type-pal/reforge'
import { expect, test } from 'vitest'
import { loadBoundaryProject } from './__tests__/cursor-command-boundary-fixtures.js'
import { UpdateBattleSpriteDefinitionCommand } from './battle-sprite-commands.js'
import { UpdateSpriteCommand } from './sprite-commands.js'

test('battle definition edits reject a wide declaration with the existing capacity diagnostic', async () => {
  const { state, source } = await loadBoundaryProject('battle-sprite-frame-demand-proof')
  const starter = state.battleSprites.find((entry) => entry.id === 'starter-fighter')
  if (!starter) throw new Error('starter battle sprite fixture missing')
  const record = state.assetCatalog.assets[starter.asset]
  if (!record) throw new Error('battle sprite resource fixture missing')
  const bytes = await source.readBytes(record.path)
  const decoded = await decodeBattleSpriteAssetBytes(record, bytes)
  const actualFrameCount = decoded.frames.length
  function enemyProfile(count: number): BattleSpriteDef['profile'] {
    return {
      kind: 'enemy',
      idle: { start: 0, count },
      magic: { start: count, count: 0 },
      attack: { start: count, count: 0 },
      idleTicksPerFrame: 1,
      actTicksPerFrame: 0,
    }
  }
  const definition: BattleSpriteDef = {
    ...starter,
    id: 'enemy-preview',
    profile: enemyProfile(actualFrameCount),
  }
  const initial = { ...state, battleSprites: [...state.battleSprites, definition] }
  const proof = { asset: definition.asset, sha256: record.sha256, actualFrameCount }
  const wide = enemyProfile(160_000)
  expect(
    validateBattleSprites([{ ...definition, profile: wide }], state.assetCatalog),
  ).toHaveLength(1)

  expect(() =>
    new UpdateBattleSpriteDefinitionCommand(definition.id, { profile: wide }, proof).apply(initial),
  ).toThrow(
    new Error(`战斗精灵定义 ${definition.id} 需要 160000 帧，资源实际只有 ${actualFrameCount} 帧`),
  )
  const accepted = new UpdateBattleSpriteDefinitionCommand(
    definition.id,
    { profile: enemyProfile(actualFrameCount) },
    proof,
  ).apply(initial)
  expect(accepted.battleSprites.find((entry) => entry.id === definition.id)?.profile).toEqual(
    definition.profile,
  )
})

test('world layout edits report the first new missing frame for a range beyond the RLE table', async () => {
  const { state, source } = await loadBoundaryProject('wide-world-sprite-layout')
  const hero = state.sprites.find((entry) => entry.id === 'hero')
  if (!hero) throw new Error('world sprite fixture missing')
  const record = state.assetCatalog.assets[hero.asset]
  if (!record) throw new Error('world sprite resource fixture missing')
  const decoded = await decodeWorldSpriteAssetBytes(record, await source.readBytes(record.path))
  const actualFrameCount = decoded.frames.length
  const proof = { asset: hero.asset, sha256: record.sha256, actualFrameCount }
  const layout = { kind: 'directional', framesPerDir: 0x4000 } as const
  validateSprites([{ ...hero, layout }], state.assetCatalog)
  const previous = {
    ...hero,
    poses: {
      ...hero.poses,
      existing: { label: '已存在的缺帧', steps: [{ frame: actualFrameCount, durationMs: 100 }] },
    },
  }
  const imported = {
    ...state,
    sprites: state.sprites.map((entry) => (entry.id === hero.id ? previous : entry)),
  }
  const change = new UpdateSpriteCommand(hero.id, { layout }, proof)
  expect(() => change.apply(imported)).toThrow(
    new Error(
      `布局会新增越界帧 ${actualFrameCount + 1}（首个），资源实际只有 ${actualFrameCount} 帧`,
    ),
  )

  const legacy = {
    ...imported,
    sprites: imported.sprites.map((entry) => (entry.id === hero.id ? { ...entry, layout } : entry)),
  }
  const repair = new UpdateSpriteCommand(hero.id, { layout: { kind: 'static' } }, proof)
  const repaired = repair.apply(legacy)
  expect(repaired.sprites.find((entry) => entry.id === hero.id)?.layout).toEqual({ kind: 'static' })
  expect(repair.invert(repaired)).toEqual(legacy)
})
