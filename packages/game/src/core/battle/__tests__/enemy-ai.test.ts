import type { Enemy } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { createSeedableRng } from '../../rng.js'
import { decideEnemyAction } from '../enemy-ai.js'

/**
 * 敌方 AI 测试 —— M3 T18。
 *
 * 覆盖:wMagic=0 → 物理、magicRate=10 必 magic、magicRate=0 必物理、
 * target 选活的队员、空队员 → pass、同 seed 决策稳定(T23 baseline 对拍前提)。
 */

function minimalEnemy(overrides: Partial<Enemy> = {}): Enemy {
  return {
    id: 100,
    _name: 'Test',
    idleFrames: 0,
    magicFrames: 0,
    attackFrames: 0,
    idleAnimSpeed: 0,
    actWaitFrames: 0,
    yPosOffset: 0,
    attackSound: 0,
    actionSound: 0,
    magicSound: 0,
    deathSound: 0,
    callSound: 0,
    health: 50,
    exp: 10,
    cash: 30,
    level: 5,
    magic: 0,
    magicRate: 0,
    attackEquivItem: 0,
    attackEquivItemRate: 0,
    stealItem: 0,
    stealItemCount: 0,
    attackStrength: 0,
    magicStrength: 0,
    defense: 0,
    dexterity: 20,
    fleeRate: 0,
    poisonResistance: 0,
    elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    physicalResistance: 1,
    dualMove: 0,
    collectValue: 0,
    ...overrides,
  }
}

describe('decideEnemyAction', () => {
  it('wMagic=0 → 物理攻击', () => {
    const action = decideEnemyAction({
      enemy: minimalEnemy({ magic: 0, magicRate: 0 }),
      alivePlayers: [{ idx: 0, hp: 100 }],
      rng: createSeedableRng(1),
    })
    expect(action.type).toBe('attack')
    expect(action.target).toBe(0)
  })

  it('wMagic != 0 && magicRate=10 → 必出 magic(rng range 0-9 < 10)', () => {
    const action = decideEnemyAction({
      enemy: minimalEnemy({ magic: 50, magicRate: 10 }),
      alivePlayers: [{ idx: 0, hp: 100 }],
      rng: createSeedableRng(1),
    })
    expect(action.type).toBe('magic')
    expect(action.actionId).toBe(50)
  })

  it('wMagicRate=0 → 必出物理', () => {
    const action = decideEnemyAction({
      enemy: minimalEnemy({ magic: 50, magicRate: 0 }),
      alivePlayers: [{ idx: 0, hp: 100 }],
      rng: createSeedableRng(1),
    })
    expect(action.type).toBe('attack')
  })

  it('选活的队员(只剩 idx=2)', () => {
    const action = decideEnemyAction({
      enemy: minimalEnemy(),
      alivePlayers: [{ idx: 2, hp: 50 }],
      rng: createSeedableRng(1),
    })
    expect(action.target).toBe(2)
  })

  it('alivePlayers 空 → pass action', () => {
    const action = decideEnemyAction({
      enemy: minimalEnemy(),
      alivePlayers: [],
      rng: createSeedableRng(1),
    })
    expect(action.type).toBe('pass')
    expect(action.target).toBe(-1)
  })

  it('同 seed 决策稳定(确定性 — T23 baseline 对拍前提)', () => {
    const a1 = decideEnemyAction({
      enemy: minimalEnemy({ magic: 50, magicRate: 5 }),
      alivePlayers: [{ idx: 0, hp: 100 }, { idx: 1, hp: 50 }, { idx: 2, hp: 80 }],
      rng: createSeedableRng(42),
    })
    const a2 = decideEnemyAction({
      enemy: minimalEnemy({ magic: 50, magicRate: 5 }),
      alivePlayers: [{ idx: 0, hp: 100 }, { idx: 1, hp: 50 }, { idx: 2, hp: 80 }],
      rng: createSeedableRng(42),
    })
    expect(a1).toEqual(a2)
  })
})
