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

  // ── B2 c1a:敌方状态门(fight.c:4582-4658)──────────────────────────────────
  it('B2:敌 sleep>0 → pass(do nothing,fight.c:4582-4589)', () => {
    const action = decideEnemyAction({
      enemy: minimalEnemy({ magic: 50, magicRate: 10 }),
      alivePlayers: [{ idx: 0, hp: 100 }],
      rng: createSeedableRng(1),
      status: { sleep: 1 },
    })
    expect(action.type).toBe('pass')
  })

  it('B2:敌 paralyzed>0 → pass(fight.c:4583)', () => {
    const action = decideEnemyAction({
      enemy: minimalEnemy({ magic: 50, magicRate: 10 }),
      alivePlayers: [{ idx: 0, hp: 100 }],
      rng: createSeedableRng(1),
      status: { paralyzed: 1 },
    })
    expect(action.type).toBe('pass')
  })

  it('B2:敌 silence>0 → 强制物理(不出魔法,fight.c:4658 silence==0 门;原 ts 漏判=bug)', () => {
    const action = decideEnemyAction({
      enemy: minimalEnemy({ magic: 50, magicRate: 10 }), // magicRate=10 本必出魔法
      alivePlayers: [{ idx: 0, hp: 100 }],
      rng: createSeedableRng(1),
      status: { silence: 1 },
    })
    expect(action.type).toBe('attack') // 沉默 → 退化物理
  })

  it('B2:wMagic==0xFFFF + 必出魔法 → pass(哨兵,fight.c:4663 goto end 什么不做)', () => {
    const action = decideEnemyAction({
      enemy: minimalEnemy({ magic: 0xFFFF, magicRate: 10 }),
      alivePlayers: [{ idx: 0, hp: 100 }],
      rng: createSeedableRng(1),
    })
    expect(action.type).toBe('pass')
  })

  // ── B2 c10:D9 RNG 对拍(party reject 采样,fight.c:4540-4545)────────────────────
  it('B2:party 传入 → 用 full-party RandomLong + while 重摇(跳过死者)', () => {
    // party idx0 死、idx1 活;rng 第一次摇 0(死)→ 重摇 1(活)→ 选 idx1
    const seq = [0, 1]
    let k = 0
    const action = decideEnemyAction({
      enemy: minimalEnemy({ magic: 0, magicRate: 0 }),
      alivePlayers: [{ idx: 1, hp: 50 }],
      party: [{ idx: 0, hp: 0 }, { idx: 1, hp: 50 }], // idx0 死
      rng: { ...createSeedableRng(1), rangeInclusive: () => seq[k++] ?? 1 },
    })
    expect(action.target).toBe(1) // 跳过死者 idx0,重摇命中活者 idx1
  })

  // ── B2 c1b:confused 敌打友敌(fight.c:4591-4655)──────────────────────────────
  it('B2:敌 confused → attack-mate 打另一活敌(fight.c:4593)', () => {
    // 两敌 idx 0/1,self=1;rng 选中 idx 0(非自己)→ attack-mate target 0
    const action = decideEnemyAction({
      enemy: minimalEnemy({ magic: 50, magicRate: 10 }),
      alivePlayers: [{ idx: 0, hp: 100 }],
      rng: { ...createSeedableRng(1), range: () => 0 }, // 选 aliveEnemies[0]
      status: { confused: 1 },
      selfIdx: 1,
      aliveEnemies: [{ idx: 0 }, { idx: 1 }],
    })
    expect(action.type).toBe('attack-mate')
    expect(action.target).toBe(0)
  })

  it('B2:敌 confused 选中自己 → pass(fight.c:4594 iTarget==self goto end)', () => {
    const action = decideEnemyAction({
      enemy: minimalEnemy(),
      alivePlayers: [{ idx: 0, hp: 100 }, { idx: 1, hp: 100 }], // 2 个防 range()=>1 越界
      rng: { ...createSeedableRng(1), range: () => 1 }, // 选 aliveEnemies[1]=self
      status: { confused: 1 },
      selfIdx: 1,
      aliveEnemies: [{ idx: 0 }, { idx: 1 }],
    })
    expect(action.type).toBe('pass')
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
