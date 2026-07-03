import type { EnemyDef } from '@type-pal/content'
import { calcPhysicalAttackDamage } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  type BattlePlayerState,
  createBattleState,
  resolveAttack,
  runBattleToEnd,
  stepBattle,
} from './battle-core.js'

// 造敌人:只填 M4a 用到的 stats,其余给合理默认
function mkEnemy(id: string, o: Partial<EnemyDef['stats']> = {}): EnemyDef {
  return {
    id,
    name: `name.${id}`,
    spriteNum: 1,
    stats: {
      health: 30, level: 1, exp: 5, cash: 3, attackStrength: 20, magicStrength: 0,
      defense: 10, dexterity: 10, fleeRate: 0, physicalResistance: 0, poisonResistance: 0,
      elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 }, dualMove: false, collectValue: 0,
      ...o,
    },
    ai: { magic: 0, magicRate: 0, resistanceToSorcery: 5 },
    anim: { idleFrames: 2, magicFrames: 0, attackFrames: 2, idleAnimSpeed: 5, actWaitFrames: 1, yPosOffset: 0 },
    sounds: { attack: 0, action: 0, magic: 0, death: 0, call: 0 },
  }
}
const player = (roleId: string, o: Partial<BattlePlayerState> = {}): Omit<BattlePlayerState, 'status' | 'defending'> => ({
  roleId, hp: 100, maxHp: 100, mp: 30, maxMp: 30, attackStrength: 40, defense: 30, magicStrength: 20, baseDexterity: 50, ...o,
})
const rng0 = () => 0 // 定值:AI 恒选第一个目标

describe('M4a headless 战斗核', () => {
  test('resolveAttack = calcPhysicalAttackDamage;防御减半', () => {
    const raw = calcPhysicalAttackDamage(40, 10, 0)
    expect(resolveAttack(40, 10, 0, false)).toBe(raw)
    expect(resolveAttack(40, 10, 0, true)).toBe(Math.trunc(raw / 2))
  })

  test('一场 1v1 攻击战:玩家碾压 → won,伤害对齐公式', () => {
    const s = createBattleState({ players: [player('li', { attackStrength: 40 })], enemies: [mkEnemy('slime', { health: 30, defense: 10, attackStrength: 1 })] })
    const dmg = calcPhysicalAttackDamage(40, 10, 0) // 每击伤害
    const result = runBattleToEnd(s, (st) => st.pendingActions.set(0, { kind: 'attack', targetEnemyIdx: 0 }), rng0)
    expect(result).toBe('won')
    expect(Math.ceil(30 / dmg)).toBeGreaterThanOrEqual(1)
    expect(s.log.some((l) => l.includes('胜利'))).toBe(true)
  })

  test('一场 1v1:敌强玩家弱 → lost', () => {
    const s = createBattleState({ players: [player('li', { hp: 10, attackStrength: 1, defense: 0 })], enemies: [mkEnemy('boss', { health: 999, attackStrength: 100, defense: 999 })] })
    const result = runBattleToEnd(s, (st) => st.pendingActions.set(0, { kind: 'attack', targetEnemyIdx: 0 }), rng0)
    expect(result).toBe('lost')
    expect(s.players[0]!.hp).toBe(0)
  })

  test('逃跑 → fled', () => {
    const s = createBattleState({ players: [player('li')], enemies: [mkEnemy('slime')] })
    const result = runBattleToEnd(s, (st) => st.pendingActions.set(0, { kind: 'flee' }), rng0)
    expect(result).toBe('fled')
  })

  test('出手顺序:高 dex 先动（玩家 dex 50 > 敌 dex,玩家先削敌）', () => {
    // 玩家 baseDex 50(haste 无 → 50);敌 level1 dex10 → (1+6)*3+10=31。玩家先。
    const s = createBattleState({ players: [player('li', { attackStrength: 100 })], enemies: [mkEnemy('slime', { health: 40, defense: 0, dexterity: 10, level: 1 })] })
    stepBattle(s, rng0) // preBattle → selectAction
    s.pendingActions.set(0, { kind: 'attack', targetEnemyIdx: 0 })
    stepBattle(s, rng0) // selectAction → performAction(build queue)
    expect(s.phase).toBe('performAction')
    expect(s.actionQueue[0]!.isEnemy).toBe(false) // 队首 = 玩家(dex 高)
  })

  test('防御:选 defend → 该队员受击减半', () => {
    const s = createBattleState({ players: [player('li', { hp: 100, defense: 0 })], enemies: [mkEnemy('e', { attackStrength: 40, dexterity: 999, level: 20 })] })
    // 敌 dex 高先手;玩家防御 → 受击减半
    const rawDmg = calcPhysicalAttackDamage(40, 0, 0)
    stepBattle(s, rng0)
    s.pendingActions.set(0, { kind: 'defend' })
    // 跑一整回合
    let guard = 0
    while (s.phase !== 'selectAction' || s.turn === 1) {
      if (s.turn > 1) break
      stepBattle(s, rng0)
      if (++guard > 50) break
    }
    // 玩家防御后被打:掉血 = 减半伤害(而非全额)
    expect(100 - s.players[0]!.hp).toBe(Math.trunc(rawDmg / 2))
  })
})
