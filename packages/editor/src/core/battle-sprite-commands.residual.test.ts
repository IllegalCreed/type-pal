/**
 * TEST-CURSOR-COMMAND-BOUNDARIES-3：战斗精灵命令残项。
 */
import type { AssetRecordV1, BattleSpriteDef, EnemyDef } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { loadBoundaryProject } from './__tests__/cursor-command-boundary-fixtures.js'
import {
  AddBattleSpriteCommand,
  SetEnemyBattleSpriteCommand,
  UpdateBattleSpriteDefinitionCommand,
} from './battle-sprite-commands.js'
import type { EditorState } from './edit-session.js'
import { AddEnemyCommand } from './enemy-commands.js'

function expectRejected(
  command: { apply(state: EditorState): EditorState },
  input: EditorState,
  pattern: RegExp,
): void {
  const snapshot = structuredClone(input)
  expect(() => command.apply(input)).toThrow(pattern)
  expect(input).toEqual(snapshot)
}

function dummyBattleRecord(): AssetRecordV1 {
  return {
    kind: 'battle-sprite',
    path: 'assets/generated/battle-sprites/dummy.rle',
    mediaType: 'application/vnd.type-pal.rle',
    bytes: 0,
    sha256: 'a'.repeat(64),
    origin: { kind: 'generated' },
  }
}

function typedEnemy(): EnemyDef {
  return {
    id: 'slime',
    name: 'name.slime',
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
  }
}

describe('战斗精灵命令残项', () => {
  test('AddBattleSprite 重复 id starter-fighter → 已存在', async () => {
    const { state } = await loadBoundaryProject('battle-sprite-residual-dup')
    const existing = state.battleSprites.find((entry) => entry.id === 'starter-fighter')!
    expectRejected(
      new AddBattleSpriteCommand(existing, dummyBattleRecord(), new ArrayBuffer(0), 1),
      state,
      /战斗精灵定义 id 已存在: starter-fighter/,
    )
  })

  test('AddBattleSprite 新 id 但路径已被 starter 战斗精灵登记', async () => {
    const { source, state } = await loadBoundaryProject('battle-sprite-residual-path')
    const starter = state.battleSprites.find((entry) => entry.id === 'starter-fighter')!
    const existing = state.assetCatalog.assets[starter.asset]!
    const bytes = await source.readBytes(existing.path)
    const record = structuredClone(existing)
    const definition: BattleSpriteDef = {
      ...structuredClone(starter),
      id: 'alt-fighter',
      asset: 'battle-sprite.generated.alt',
    }
    expectRejected(
      new AddBattleSpriteCommand(definition, record, bytes, 16),
      state,
      /路径已由 .* 登记/,
    )
  })

  test('AddEnemy 后 SetEnemyBattleSprite(starter-fighter) → 敌人只能引用 enemy profile', async () => {
    const { state } = await loadBoundaryProject('battle-sprite-residual-enemy')
    const enemy = typedEnemy()
    const withEnemy = new AddEnemyCommand(enemy).apply(state)
    expectRejected(
      new SetEnemyBattleSpriteCommand(enemy.id, 'starter-fighter'),
      withEnemy,
      /敌人只能引用 enemy profile/,
    )
  })

  test('UpdateBattleSpriteDefinition 改 profile kind 且无 currentReferences', async () => {
    const { state } = await loadBoundaryProject('battle-sprite-residual-profile')
    const starter = state.battleSprites.find((entry) => entry.id === 'starter-fighter')!
    const record = state.assetCatalog.assets[starter.asset]!
    expectRejected(
      new UpdateBattleSpriteDefinitionCommand(
        'starter-fighter',
        {
          profile: {
            kind: 'enemy',
            idle: { start: 0, count: 1 },
            magic: { start: 1, count: 0 },
            attack: { start: 1, count: 0 },
            idleTicksPerFrame: 1,
            actTicksPerFrame: 0,
          },
        },
        { asset: starter.asset, sha256: record.sha256, actualFrameCount: 16 },
      ),
      state,
      /修改战斗精灵 profile 类型前无法读取 current-author 引用索引/,
    )
  })
})
