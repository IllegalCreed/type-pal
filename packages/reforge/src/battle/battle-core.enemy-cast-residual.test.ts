/**
 * TEST-GLM-REFORGE-BATTLE-CORE-SESSION-1：battle-core 敌方施法/战果残余合同（BCS-1..5）。
 * 排重边界（与既有 fullName×caller×input×oracle 对账，详见卡面 dedup-ledger）：
 * - 敌施法 damage/格挡除因子/敌方下毒/敌方夺魂概率门 = battle-core.test 既有族；
 * - fleeAll 单敌标记 = battle-core.test「fleeAll:整场敌逃离」；敌逃不计战果从未被断言；
 * - 复活 0x22 全语义 = battle-core.test；无保底 floor-0 边缘从未被断言；
 * - 敌方回复术/敌方 HP 阈值门/敌方状态术三门 = applyEnemySkill 对应分支零既有覆盖。
 * 全部走公开 caller（stepBattle/runBattleToEnd/reviveBattlePlayer），合法 typed 输入，
 * 断言公开业务结果（HP/status/log/战果），不读私有表现层。
 */
import type { EnemyDef, SkillData } from '@type-pal/content'
import { expect, test } from 'vitest'
import { wfEnemy, wfPlayer } from '../__tests__/battle-workflows/catalog.js'
import { createBattleState, reviveBattlePlayer, runBattleToEnd, stepBattle } from './battle-core.js'

/** 敌决策 rng：0.99 = 无暴击、无格挡、无主角彩蛋的确定性档。 */
const rng = () => 0.99

function castRuleEnemy(
  id: string,
  skillId: string,
  stats: Partial<EnemyDef['stats']> = {},
): EnemyDef {
  const foe = wfEnemy(id, stats)
  foe.ai = { resistanceToSorcery: 5, rules: [{ at: 'act', do: { kind: 'cast', skillId } }] }
  return foe
}

/** 完整合法 SkillData 字面量（cost/target/effects/animation 与生产类型一致）。 */
function skill(id: string, target: SkillData['target'], effects: SkillData['effects']): SkillData {
  return {
    id,
    name: `name.${id}`,
    desc: '',
    cost: { mp: 0 },
    usableOutsideBattle: false,
    target,
    effects,
    animation: { effectSprite: 0 },
  }
}

/**
 * 驱动一回合到「敌方行动刚结算」：preBattle→选攻击→建队→玩家先手（dex 60 > 敌 22 上限）
 * →敌按规则施法。返回受击后(敌行动前)的敌 HP 供精确算术断言。
 */
function runUntilEnemyActed(s: ReturnType<typeof createBattleState>): number {
  stepBattle(s, rng) // preBattle → selectAction
  s.pendingActions.set(0, { kind: 'attack', targetEnemyIdx: 0 })
  stepBattle(s, rng) // selectAction → performAction（建队）
  stepBattle(s, rng) // 玩家先手物攻
  const hpAfterPlayerHit = s.enemies[0]?.hp
  if (hpAfterPlayerHit === undefined) throw new Error('enemy absent before its action')
  stepBattle(s, rng) // 敌方行动（规则施法）
  return hpAfterPlayerHit
}

test('BCS-1 敌方回复术：applyEnemySkill healHp 按量回复并钳满血上限，战斗日志留痕', () => {
  // 精确回复量臂：受击后 +5（不触钳）。
  const mender = castRuleEnemy('bcs-mender', 'bcs-mend', { health: 100, attackStrength: 0 })
  const s = createBattleState({
    players: [wfPlayer('bcs-hero', { attackStrength: 40 })],
    enemies: [mender],
    skills: { 'bcs-mend': skill('bcs-mend', 'self', [{ kind: 'healHp', amount: 5 }]) },
  })
  const hpAfterPlayerHit = runUntilEnemyActed(s)
  expect(hpAfterPlayerHit).toBeLessThan(100) // 玩家先手确实造成伤害（判别力前提）
  expect(s.enemies[0]?.hp).toBe(hpAfterPlayerHit + 5)
  expect(s.log).toContain('bcs-mender 施展 name.bcs-mend 回复 5')
  expect(s.players[0]?.hp).toBe(100) // 敌方回复不影响玩家

  // 钳上限臂：受击后 +50 越过满血 → 钳在 def.stats.health。
  const mender2 = castRuleEnemy('bcs-mender2', 'bcs-mend2', { health: 100, attackStrength: 0 })
  const s2 = createBattleState({
    players: [wfPlayer('bcs-hero', { attackStrength: 40 })],
    enemies: [mender2],
    skills: { 'bcs-mend2': skill('bcs-mend2', 'self', [{ kind: 'healHp', amount: 50 }]) },
  })
  const hpAfterPlayerHit2 = runUntilEnemyActed(s2)
  expect(hpAfterPlayerHit2).toBeLessThan(100)
  expect(s2.enemies[0]?.hp).toBe(100)
  expect(s2.log).toContain('bcs-mender2 施展 name.bcs-mend2 回复 50')
})

test('BCS-2 敌方 HP 阈值门：门判玩家当前血，过门即死、超线截断为无任何效果', () => {
  const reap = skill('bcs-reap', 'oneEnemy', [
    { kind: 'gate', hpAtMostPercent: 25 },
    { kind: 'instantKill' },
  ])
  // 超线臂：玩家满血 100/100（100% > 25%）→ 门截断，效果链熄火。
  const reaper = castRuleEnemy('bcs-reaper', 'bcs-reap', { health: 9999, attackStrength: 0 })
  const above = createBattleState({
    players: [wfPlayer('bcs-hero', { attackStrength: 1 })],
    enemies: [reaper],
    skills: { 'bcs-reap': reap },
  })
  runUntilEnemyActed(above)
  expect(above.players[0]?.hp).toBe(100)
  expect(above.log).toContain('name.bcs-reap 无任何效果')
  expect(above.log.some((line) => line.includes('魂飞魄散'))).toBe(false)

  // 过门臂：玩家带伤入战 20/100（20% ≤ 25%）→ 即死结算。
  const reaper2 = castRuleEnemy('bcs-reaper2', 'bcs-reap', { health: 9999, attackStrength: 0 })
  const below = createBattleState({
    players: [wfPlayer('bcs-hero', { attackStrength: 1, hp: 20 })],
    enemies: [reaper2],
    skills: { 'bcs-reap': reap },
  })
  runUntilEnemyActed(below)
  expect(below.players[0]?.hp).toBe(0)
  expect(below.log).toContain('bcs-reaper2 施展 name.bcs-reap,bcs-hero 魂飞魄散')
})

test('BCS-3 敌方状态术：applyEnemySkill applyStatus 对玩家写入 sleep 回合并留痕', () => {
  const hex = skill('bcs-hex', 'oneEnemy', [{ kind: 'applyStatus', status: 'sleep', turns: 3 }])
  const hexer = castRuleEnemy('bcs-hexer', 'bcs-hex', { health: 9999, attackStrength: 0 })
  const s = createBattleState({
    players: [wfPlayer('bcs-hero', { attackStrength: 1 })],
    enemies: [hexer],
    skills: { 'bcs-hex': hex },
  })
  runUntilEnemyActed(s)
  expect(s.players[0]?.status.sleep).toBe(3)
  expect(s.log).toContain('bcs-hexer 对 bcs-hero 施加 sleep 3 回合')
  expect(s.players[0]?.hp).toBe(100) // 状态术无伤害
})

test('BCS-4 复活无保底：极端小档复活到 0 依旧倒地（trunc 语义，无 floor 1）', () => {
  const fallen = createBattleState({
    players: [wfPlayer('bcs-fallen', { hp: 0, maxHp: 9 })],
    enemies: [wfEnemy('bcs-foe')],
  })
  const dead = fallen.players[0]
  if (!dead) throw new Error('player absent')
  expect(reviveBattlePlayer(fallen, dead, 5)).toBe(true)
  expect(dead.hp).toBe(0) // trunc(9×5/100)=0：忠实原版无保底，复活后仍倒地

  // 对照臂：常规档位精确 floor（10×50/100=5）。
  const woken = createBattleState({
    players: [wfPlayer('bcs-woken', { hp: 0, maxHp: 10 })],
    enemies: [wfEnemy('bcs-foe2')],
  })
  const corpse = woken.players[0]
  if (!corpse) throw new Error('player absent')
  expect(reviveBattlePlayer(woken, corpse, 50)).toBe(true)
  expect(corpse.hp).toBe(5)
})

test('BCS-5 先杀后逃的战果会计：先死之敌照计战果，逃跑之敌一律不计', () => {
  const victim = wfEnemy('bcs-victim', { health: 1, exp: 7, cash: 4 })
  const deserter = wfEnemy('bcs-deserter', { health: 999, exp: 99, cash: 88 })
  deserter.ai = { resistanceToSorcery: 5, rules: [{ at: 'act', do: { kind: 'flee' } }] }
  const s = createBattleState({
    players: [wfPlayer('bcs-hero', { attackStrength: 40, baseDexterity: 60 })],
    enemies: [victim, deserter],
  })
  const result = runBattleToEnd(
    s,
    (st) => st.pendingActions.set(0, { kind: 'attack', targetEnemyIdx: 0 }),
    rng, // 玩家先手（dex 60 > 敌 22 上限）一击杀死 victim，deserter 随后整场逃离
  )
  expect(result).toBe('won')
  expect(s.enemyFled).toBe(true)
  expect(s.expGained).toBe(7) // victim 先死照计；deserter 逃跑不计
  expect(s.cashGained).toBe(4)
  expect(s.log).toContain('bcs-deserter 逃走了')
})
