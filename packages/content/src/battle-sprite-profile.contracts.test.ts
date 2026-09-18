/**
 * TEST-CONTENT-CONTRACTS-1 D3/D4：battle-sprite 帧集合/需求/解析（battle-sprite.ts:156-233）。
 * profile 三类；合法 0 帧段/0 tick；集合去重；expected 单值/集合/缺省；summon 需实际帧数。
 */
import { describe, expect, test } from 'vitest'
import { deepSnapshot } from './__tests__/glm-content-contract-fixtures.js'
import type { BattleSpriteDef } from './battle-sprite.js'
import {
  battleSpriteDefinitionFrameDemand,
  battleSpriteDefinitionFrameIndices,
  resolveBattleSpriteDefinition,
  validateBattleSprites,
} from './battle-sprite.js'

const player = (): BattleSpriteDef => ({
  id: 'bs-player',
  label: '主角',
  asset: 'battle.x',
  profile: {
    kind: 'player-fighter',
    frames: {
      idle: 0,
      dying: 1,
      dead: 2,
      defend: 3,
      hurt: 4,
      preMagic: 5,
      magic: 6,
      attackWindup: 7,
      attackRush: 8,
      attackStrike: 9,
    },
    castEffectBase: 0,
    attackEffectBase: 0,
  },
})
const enemy = (): BattleSpriteDef => ({
  id: 'bs-enemy',
  label: '敌人',
  asset: 'battle.y',
  profile: {
    kind: 'enemy',
    idle: { start: 0, count: 2 },
    magic: { start: 2, count: 0 }, // PAL 合法零段
    attack: { start: 2, count: 3 },
    idleTicksPerFrame: 1,
    actTicksPerFrame: 0, // PAL 0 合法
  },
})

describe('D3 battleSpriteDefinitionFrameIndices/Demand · 三类 profile', () => {
  test('player：全部必填帧索引 + 可选 steal；demand=max+1', () => {
    const indices = battleSpriteDefinitionFrameIndices(player())
    expect([...indices].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
    expect(battleSpriteDefinitionFrameDemand(player())).toBe(10)
    const stealPlayer = player()
    ;(stealPlayer.profile as { frames: { steal?: number } }).frames.steal = 15
    expect(battleSpriteDefinitionFrameDemand(stealPlayer)).toBe(16)
  })
  test('enemy：连续段展开；0 帧段贡献零索引；去重', () => {
    const indices = battleSpriteDefinitionFrameIndices(enemy())
    expect([...indices].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4])
    expect(battleSpriteDefinitionFrameDemand(enemy())).toBe(5)
  })
  test('summon：必须传 actualFrameCount；非正数拒绝', () => {
    const summon: BattleSpriteDef = {
      id: 'bs-summon',
      label: '召唤',
      asset: 'battle.z',
      profile: { kind: 'summon' },
    }
    expect(() => battleSpriteDefinitionFrameIndices(summon)).toThrow(/actualFrameCount/)
    expect([...battleSpriteDefinitionFrameIndices(summon, 3)]).toEqual([0, 1, 2])
    expect(battleSpriteDefinitionFrameDemand(summon, 3)).toBe(3)
    expect(() => battleSpriteDefinitionFrameIndices(summon, 0)).toThrow(/至少需要 1/)
  })
})

describe('D3/D4 validateBattleSprites + resolveBattleSpriteDefinition', () => {
  test('合法定义通过且输入不变；resolve 精确查找', () => {
    const raw = [player(), enemy()]
    const before = deepSnapshot(raw)
    const validated = validateBattleSprites(raw)
    expect(validated).toEqual(raw)
    expect(raw).toEqual(before)
    expect(resolveBattleSpriteDefinition('bs-player', validated)).toBe(validated[0])
    expect(resolveBattleSpriteDefinition('bs-enemy', validated, 'enemy')).toBeDefined()
    expect(resolveBattleSpriteDefinition('bs-enemy', validated, ['enemy', 'summon'])).toBeDefined()
  })
  test('缺目标拒绝；kind 不匹配（单值/集合）拒绝', () => {
    expect(() => resolveBattleSpriteDefinition('ghost', [player()])).toThrow(/不存在/)
    expect(() => resolveBattleSpriteDefinition('bs-player', [player()], 'enemy' as const)).toThrow(
      /期望 enemy，实际 player-fighter/,
    )
    expect(() =>
      resolveBattleSpriteDefinition('bs-player', [player()], ['enemy', 'summon'] as const),
    ).toThrow(/期望 enemy\/summon/)
  })
})
