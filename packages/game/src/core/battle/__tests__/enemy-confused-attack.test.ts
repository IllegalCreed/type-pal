/** Direct enemy-confused-attack contracts; controller scheduling and browser presentation are separate. */
import { describe, expect, it } from 'vitest'
import { performEnemyConfusedAttack } from '../actions/attack.js'
import { makeActionFixture } from './action.test-fixtures.js'

// ============================================================================
// performDefend
// ============================================================================
describe('performEnemyConfusedAttack(B2 c1b,fight.c:4596-4654)', () => {
  it('混乱敌打友敌:CalcBaseDamage(str,def)*2/physRes', () => {
    const { state, bus } = makeActionFixture({
      enemies: [
        { level: 5, attackStrength: 500 }, // 攻击者 idx0:str=500+(5+6)*6=566
        { level: 5, defense: 10, physicalResistance: 2, health: 2000 }, // 目标 idx1:def=10+(5+6)*4=54
      ],
    })
    performEnemyConfusedAttack(state, 0, 1, bus)
    // calcBase(566,54)=trunc(566*2-54*1.6+0.5)=trunc(1046.1)=1046;*2=2092;/physRes2=1046
    expect(state.enemies[1]!.e.health).toBe(2000 - 1046)
  })
  it('混乱敌打友敌:伤害<=0 钳 1', () => {
    const { state, bus } = makeActionFixture({
      enemies: [
        { level: 1, attackStrength: 0 }, // str=0+7*6=42
        { level: 50, defense: 10000, physicalResistance: 1, health: 500 }, // def 巨大 → base 0
      ],
    })
    performEnemyConfusedAttack(state, 0, 1, bus)
    expect(state.enemies[1]!.e.health).toBe(499) // base 0 → *2=0 → <=0 → 1
  })
  it('有 posOriginal → 建混乱攻击动画(滑步+火花+抖动)启动 battleAnim,伤害仍结算', () => {
    const { state, bus } = makeActionFixture({
      enemies: [
        { level: 5, attackStrength: 500 },
        { level: 5, defense: 10, physicalResistance: 2, health: 2000 },
      ],
    })
    state.enemies[0]!.posOriginal = { x: 100, y: 80 }
    state.enemies[1]!.posOriginal = { x: 200, y: 100 }
    state.enemies[1]!.spriteFrameHeight = 30
    performEnemyConfusedAttack(state, 0, 1, bus)
    expect(state.battleAnim).toBeDefined() // 动画链启动(替代旧的即时数字,fight.c:4596-4654)
    expect(state.battleAnim!.frames[3]!.overlay).toMatchObject({ x: 193, y: 100 })
    expect(state.enemies[1]!.e.health).toBe(2000 - 1046) // 伤害结算不变
  })
  it('缺 posOriginal(旧 fixture)→ fallback 不建动画', () => {
    const { state, bus } = makeActionFixture({
      enemies: [
        { level: 5, attackStrength: 500 },
        { level: 5, defense: 10, physicalResistance: 2, health: 2000 },
      ],
    })
    performEnemyConfusedAttack(state, 0, 1, bus)
    expect(state.battleAnim).toBeUndefined() // 无 render-state → 退化即时(向后兼容)
    expect(state.enemies[1]!.e.health).toBe(2000 - 1046)
  })
})
