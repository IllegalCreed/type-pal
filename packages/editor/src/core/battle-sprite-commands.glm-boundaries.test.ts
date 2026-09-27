/**
 * TEST-GLM-STATE-COMMANDS-1 C03：battle-sprite-commands 残差。
 * 去重：battle-sprite-commands.residual.test.ts 四例（重复 id/路径占用/SetEnemy enemy profile/
 * profile 换型无索引）、sprite-reference-commands.test.ts（动作边/实时 canonical/缺目标跳过）、
 * commands.test.ts「SetEnemyBattleSprite」「Actor/Enemy 上传新定义并设置引用」——
 * 本文件只补冻结池内：UpdateBattleSprite 缺席 id 与未 apply invert、仅 label 补丁无需 ABI 证明、
 * 证明过期与 profile 换型引用不兼容恰抛、ReplaceBattleSprite 守卫族、Remove/DeleteUnused
 * 三向 no-op 与仍被引用恰抛、SetEnemyBattleSprite 缺席敌人 no-op。
 * 实际帧数一律来自 decodeBattleSpriteAssetBytes 对真实种子字节的解码。
 */

import type { EnemyDef } from '@type-pal/content'
import { decodeBattleSpriteAssetBytes } from '@type-pal/reforge'
import { describe, expect, test } from 'vitest'
import {
  loadBoundaryProject,
  withSharedEnemyBattleSprite,
} from './__tests__/cursor-command-boundary-fixtures.js'
import {
  expectErrorContaining,
  expectExactError,
  expectInputsUnchanged,
} from './__tests__/glm-state-commands-c.js'
import {
  DeleteUnusedBattleSpriteAssetCommand,
  RemoveBattleSpriteDefinitionCommand,
  ReplaceBattleSpriteAssetCommand,
  SetEnemyBattleSpriteCommand,
  UpdateBattleSpriteDefinitionCommand,
} from './battle-sprite-commands.js'
import type { EditorState } from './edit-session.js'
import { AddEnemyCommand } from './enemy-commands.js'
import { collectCurrentProjectReferenceIndex } from './project-reference-adapters.js'

const realRefs = (state: EditorState) => collectCurrentProjectReferenceIndex(state)

const loneEnemy = (id: string): EnemyDef => ({
  id,
  name: `name.${id}`,
  battleSprite: 'starter-fighter',
  yPosOffset: 0,
  stats: {
    health: 10,
    level: 1,
    exp: 1,
    cash: 1,
    attackStrength: 5,
    magicStrength: 0,
    defense: 0,
    dexterity: 5,
    fleeRate: 0,
    physicalResistance: 0,
    poisonResistance: 0,
    elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    dualMove: false,
    collectValue: 0,
  },
  ai: { resistanceToSorcery: 5 },
  sounds: {},
})

describe('C03 battle-sprite-commands 残差', () => {
  test('UpdateBattleSpriteDefinition：缺席 id/未 apply invert 原引用；仅 label 补丁无需 ABI 证明', async () => {
    const { state } = await loadBoundaryProject('battle-glm-update-noop')
    const missing = new UpdateBattleSpriteDefinitionCommand('gone', { label: 'x' })
    expect(missing.apply(state)).toBe(state)
    expect(missing.invert(state)).toBe(state)
    const cmd = new UpdateBattleSpriteDefinitionCommand('starter-fighter', { label: '新标签' })
    const next = cmd.apply(state)
    expect(next.battleSprites[0]!.label).toBe('新标签')
    expect(cmd.invert(next).battleSprites[0]!.label).toBe('占位主角战斗形象')
  })

  test('UpdateBattleSpriteDefinition：profile 换型证明过期恰抛；换型与引用不兼容恰抛（真实索引）', async () => {
    const { source, state } = await loadBoundaryProject('battle-glm-profile-switch')
    const starter = state.battleSprites.find((entry) => entry.id === 'starter-fighter')!
    const record = state.assetCatalog.assets[starter.asset]!
    const bytes = await source.readBytes(record.path)
    const decoded = await decodeBattleSpriteAssetBytes(record, bytes)
    const enemyProfile = {
      kind: 'enemy',
      idle: { start: 0, count: 1 },
      magic: { start: 1, count: 0 },
      attack: { start: 1, count: 0 },
      idleTicksPerFrame: 1,
      actTicksPerFrame: 0,
    } as const
    expectExactError(
      () =>
        new UpdateBattleSpriteDefinitionCommand(
          'starter-fighter',
          { profile: enemyProfile },
          { asset: starter.asset, sha256: 'a'.repeat(64), actualFrameCount: decoded.frames.length },
          realRefs,
        ).apply(state),
      '战斗精灵 ABI 证明缺失或已过期，请等待资源重新载入',
    )
    expectErrorContaining(
      () =>
        new UpdateBattleSpriteDefinitionCommand(
          'starter-fighter',
          { profile: enemyProfile },
          { asset: starter.asset, sha256: record.sha256, actualFrameCount: decoded.frames.length },
          realRefs,
        ).apply(state),
      '战斗精灵定义 starter-fighter 的 profile 与引用',
    )
  })

  test('ReplaceBattleSpriteAsset：定义/资产不一致、缺席 catalog、证明过期、消费者漂移 各自恰抛', async () => {
    const { source, state } = await loadBoundaryProject('battle-glm-replace-guards')
    const starter = state.battleSprites.find((entry) => entry.id === 'starter-fighter')!
    const record = state.assetCatalog.assets[starter.asset]!
    const bytes = await source.readBytes(record.path)
    const proof = {
      asset: starter.asset,
      previousSha256: record.sha256,
      previousFrameCount: 10,
      nextFrameCount: 10,
      consumerIds: ['starter-fighter'],
    }
    expectExactError(
      () =>
        new ReplaceBattleSpriteAssetCommand(
          'other-def',
          starter.asset,
          structuredClone(record),
          bytes,
          bytes,
          proof,
        ).apply(state),
      '战斗精灵定义与待替换 AssetId 不一致',
    )
    expectExactError(
      () =>
        new ReplaceBattleSpriteAssetCommand(
          undefined,
          'battle-sprite.gone',
          structuredClone(record),
          bytes,
          bytes,
          { ...proof, asset: 'battle-sprite.gone' },
        ).apply(state),
      '待替换战斗精灵资源不在 catalog',
    )
    expectExactError(
      () =>
        new ReplaceBattleSpriteAssetCommand(
          'starter-fighter',
          starter.asset,
          structuredClone(record),
          bytes,
          bytes,
          { ...proof, previousSha256: 'b'.repeat(64) },
        ).apply(state),
      '战斗精灵替换证明已过期，请重新载入资源',
    )
    expectExactError(
      () =>
        new ReplaceBattleSpriteAssetCommand(
          'starter-fighter',
          starter.asset,
          structuredClone(record),
          bytes,
          bytes,
          { ...proof, consumerIds: [] },
        ).apply(state),
      '共享战斗精灵消费者已变化，请重新确认影响范围',
    )
    expectExactError(
      () =>
        new ReplaceBattleSpriteAssetCommand(
          undefined,
          starter.asset,
          structuredClone(record),
          bytes,
          bytes,
          { ...proof },
        ).apply(state),
      '待替换战斗精灵资源已有语义消费者，请重新确认影响范围',
    )
  })

  test('RemoveBattleSpriteDefinition：缺席 id/未 apply invert 原引用；删除+undo 原索引（真实索引）', async () => {
    const { source, state } = await loadBoundaryProject('battle-glm-remove')
    const withEnemyShape = await withSharedEnemyBattleSprite(source, state, 'enemy-shape')
    const missing = new RemoveBattleSpriteDefinitionCommand('gone', realRefs)
    expect(missing.apply(withEnemyShape)).toBe(withEnemyShape)
    expect(missing.invert(withEnemyShape)).toBe(withEnemyShape)
    const cmd = new RemoveBattleSpriteDefinitionCommand('enemy-shape', realRefs)
    const removed = cmd.apply(withEnemyShape)
    expect(removed.battleSprites.map((entry) => entry.id)).toEqual(['starter-fighter'])
    expect(cmd.invert(removed).battleSprites.map((entry) => entry.id)).toEqual([
      'starter-fighter',
      'enemy-shape',
    ])
    expectInputsUnchanged(() => missing.apply(withEnemyShape), [withEnemyShape])
  })

  test('DeleteUnusedBattleSpriteAsset：缺席 asset/未 apply invert 原引用；仍被定义引用恰抛', async () => {
    const { state } = await loadBoundaryProject('battle-glm-unused')
    const starter = state.battleSprites.find((entry) => entry.id === 'starter-fighter')!
    expect(
      new DeleteUnusedBattleSpriteAssetCommand('battle-sprite.gone', realRefs).apply(state),
    ).toBe(state)
    expect(
      new DeleteUnusedBattleSpriteAssetCommand('battle-sprite.gone', realRefs).invert(state),
    ).toBe(state)
    expectExactError(
      () => new DeleteUnusedBattleSpriteAssetCommand(starter.asset, realRefs).apply(state),
      `战斗精灵资产 ${starter.asset} 仍被定义引用`,
    )
  })

  test('SetEnemyBattleSprite：缺席敌人 apply 原引用；未 apply invert 原引用', async () => {
    const { source, state } = await loadBoundaryProject('battle-glm-set-enemy')
    const withEnemyShape = await withSharedEnemyBattleSprite(source, state, 'enemy-shape')
    const withEnemy = new AddEnemyCommand(loneEnemy('slime')).apply(withEnemyShape)
    const switched = new SetEnemyBattleSpriteCommand('slime', 'enemy-shape').apply(withEnemy)
    expect(switched.enemies!.find((entry) => entry.id === 'slime')!.battleSprite).toBe(
      'enemy-shape',
    )
    expect(new SetEnemyBattleSpriteCommand('gone', 'enemy-shape').apply(withEnemy)).toBe(withEnemy)
    expect(new SetEnemyBattleSpriteCommand('slime', 'enemy-shape').invert(withEnemy)).toBe(
      withEnemy,
    )
  })
})
