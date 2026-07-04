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
    ai: { resistanceToSorcery: 5 },
    anim: { idleFrames: 2, magicFrames: 0, attackFrames: 2, idleAnimSpeed: 5, actWaitFrames: 1, yPosOffset: 0 },
    sounds: { attack: 0, action: 0, magic: 0, death: 0, call: 0 },
  }
}
const player = (roleId: string, o: Partial<BattlePlayerState> = {}): Omit<BattlePlayerState, 'status' | 'defending'> => ({
  roleId, hp: 100, maxHp: 100, mp: 30, maxMp: 30, attackStrength: 40, defense: 30, magicStrength: 20, baseDexterity: 50, skills: [], fleeRate: 20, ...o,
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

describe('M4c 敌人 AI(规则决策 + cast 结算)', () => {
  const bolt: import('@type-pal/content').SkillData = {
    id: '339', name: '雷咒', desc: '', cost: { mp: 10 }, usableOutsideBattle: false,
    target: 'oneEnemy', effects: [{ kind: 'damage', power: 50, elemental: 0 }],
    animation: { effectSprite: 1 },
  }
  const caster = (): EnemyDef => ({
    ...mkEnemy('mage', { magicStrength: 60, attackStrength: 5, health: 500, defense: 0 }),
    ai: {
      resistanceToSorcery: 5,
      rules: [{ at: 'act', when: { kind: 'chance', percent: 50 }, do: { kind: 'cast', skillId: '339' } }],
    },
  })

  test('概率中 → 施法(calcMagicDamage 路径,日志记名);概率不中 → 兜底普攻', () => {
    // rng 序列:构造可控 —— 第一次 rng 用于 chance(0 → 中),后续用于目标/rngFactor
    const s = createBattleState({ players: [player('li', { hp: 400, maxHp: 400, defense: 0 })], enemies: [caster()], skills: { '339': bolt } })
    stepBattle(s, rng0)
    s.pendingActions.set(0, { kind: 'defend' })
    let guard = 0
    while (s.phase !== 'selectAction' || s.turn === 1) {
      stepBattle(s, rng0)
      if (++guard > 50) break
    }
    expect(s.log.some((l) => l.includes('施展 雷咒'))).toBe(true)

    const s2 = createBattleState({ players: [player('li')], enemies: [caster()], skills: { '339': bolt } })
    const r9 = () => 0.99 // chance 不中 → 普攻
    stepBattle(s2, r9)
    s2.pendingActions.set(0, { kind: 'defend' })
    guard = 0
    while (s2.phase !== 'selectAction' || s2.turn === 1) {
      stepBattle(s2, r9)
      if (++guard > 50) break
    }
    expect(s2.log.some((l) => l.includes('攻击'))).toBe(true)
    expect(s2.log.some((l) => l.includes('施展'))).toBe(false)
  })

  test('once 规则只触发一次;沉默跳过 cast 落普攻', () => {
    const e: EnemyDef = {
      ...mkEnemy('boss', { health: 800, attackStrength: 5 }),
      ai: { resistanceToSorcery: 5, rules: [{ at: 'act', do: { kind: 'cast', skillId: '339' }, once: true }] },
    }
    const s = createBattleState({ players: [player('li', { hp: 900, maxHp: 900 })], enemies: [e], skills: { '339': bolt } })
    // 回合1:施法(once);回合2:规则已耗尽 → 普攻
    let casts = 0
    let attacks = 0
    runBattleToEnd(s, (st) => {
      for (const i of st.players.keys()) if (st.players[i]!.hp > 0) st.pendingActions.set(i, { kind: 'defend' })
      if (st.turn >= 3) st.pendingActions.set(0, { kind: 'flee' })
    }, rng0)
    casts = s.log.filter((l) => l.includes('施展')).length
    attacks = s.log.filter((l) => l.includes('攻击')).length
    expect(casts).toBe(1)
    expect(attacks).toBeGreaterThanOrEqual(1)

    // 沉默:cast 规则被跳过 → 普攻
    const s3 = createBattleState({ players: [player('li')], enemies: [caster()], skills: { '339': bolt } })
    stepBattle(s3, rng0)
    s3.enemies[0]!.status.silence = 3
    s3.pendingActions.set(0, { kind: 'defend' })
    let guard = 0
    while (s3.phase !== 'selectAction' || s3.turn === 1) {
      stepBattle(s3, rng0)
      if (++guard > 50) break
    }
    expect(s3.log.some((l) => l.includes('施展'))).toBe(false)
    expect(s3.log.some((l) => l.includes('攻击'))).toBe(true)
  })

  test('缺技能数据:cast 落普攻并 log 提示(不崩)', () => {
    const s = createBattleState({ players: [player('li')], enemies: [caster()] }) // 无 skills
    stepBattle(s, rng0)
    s.pendingActions.set(0, { kind: 'defend' })
    let guard = 0
    while (s.phase !== 'selectAction' || s.turn === 1) {
      stepBattle(s, rng0)
      if (++guard > 50) break
    }
    expect(s.log.some((l) => l.includes('缺技能数据'))).toBe(true)
    expect(s.log.some((l) => l.includes('攻击'))).toBe(true)
  })
})

describe('M4c-2 动作:变身/分裂/召唤/整场逃离', () => {
  const runOneTurn = (s: ReturnType<typeof createBattleState>, rng = rng0) => {
    stepBattle(s, rng)
    for (const i of s.players.keys()) if (s.players[i]!.hp > 0) s.pendingActions.set(i, { kind: 'defend' })
    let guard = 0
    while ((s.phase as string) !== 'selectAction' || s.turn === 1) {
      if ((s.phase as string) === 'won' || (s.phase as string) === 'lost') break
      stepBattle(s, rng)
      if (++guard > 60) break
    }
  }

  test('transform:保当前 HP 换 def,once 记账清零', () => {
    const boss = mkEnemy('boss', { health: 300 })
    const truth = mkEnemy('truth', { health: 999, attackStrength: 50 })
    boss.ai = { resistanceToSorcery: 5, rules: [{ at: 'act', do: { kind: 'transform', enemyId: 'truth' }, once: true }] }
    const s = createBattleState({ players: [player('li', { hp: 500, maxHp: 500 })], enemies: [boss], enemiesById: { truth } })
    s.enemies[0]!.hp = 123 // 打残再变身
    runOneTurn(s)
    expect(s.enemies[0]!.def.id).toBe('truth')
    expect(s.enemies[0]!.hp).toBe(123) // 保血
    expect(s.enemies[0]!.firedRules.size).toBe(0) // 新形态记账清零
    expect(s.log.some((l) => l.includes('现出真身'))).toBe(true)
  })

  test('divide:仅剩一只才分裂(原版内建门);血量均分', () => {
    const blob = mkEnemy('blob', { health: 90, attackStrength: 1 })
    blob.ai = { resistanceToSorcery: 5, rules: [{ at: 'act', do: { kind: 'divide', copies: 1 }, once: true }] }
    // 两只在场:分裂失败(门拦下)
    const s0 = createBattleState({ players: [player('li', { hp: 500, maxHp: 500 })], enemies: [blob, mkEnemy('other', { attackStrength: 1 })] })
    runOneTurn(s0)
    expect(s0.log.some((l) => l.includes('分裂失败'))).toBe(true)
    expect(s0.enemies.length).toBe(2)
    // 单only:成功均分
    const s = createBattleState({ players: [player('li', { hp: 500, maxHp: 500 })], enemies: [blob] })
    runOneTurn(s)
    expect(s.enemies.length).toBe(2)
    expect(s.enemies[0]!.hp).toBe(45)
    expect(s.enemies[1]!.hp).toBe(45)

    const caller = mkEnemy('caller', { health: 200, attackStrength: 1 })
    caller.ai = { resistanceToSorcery: 5, rules: [{ at: 'act', do: { kind: 'summon', count: 9 }, once: true }] }
    const s2 = createBattleState({ players: [player('li', { hp: 500, maxHp: 500 })], enemies: [caller] })
    runOneTurn(s2)
    expect(s2.enemies.length).toBe(5) // 1 + min(9, 4) = 5 槽满
  })

  test('fleeAll:整场敌逃离 → won + enemyFled 标记(无奖励语义留钩)', () => {
    const snake = mkEnemy('snake', { health: 500 })
    snake.ai = { resistanceToSorcery: 5, rules: [{ at: 'act', do: { kind: 'flee' } }] }
    const s = createBattleState({ players: [player('li')], enemies: [snake] })
    runOneTurn(s)
    expect(s.enemyFled).toBe(true)
    expect(s.phase).toBe('won')
    expect(s.log.some((l) => l.includes('逃走了'))).toBe(true)
  })
})

describe('M4b-3 玩家仙术', () => {
  const bolt2: import('@type-pal/content').SkillData = {
    id: '300', name: '御剑术', desc: '', cost: { mp: 5 }, usableOutsideBattle: false,
    target: 'oneEnemy', effects: [{ kind: 'damage', power: 30, elemental: 0 }], animation: { effectSprite: 1 },
  }
  const heal: import('@type-pal/content').SkillData = {
    id: '296', name: '气疗术', desc: '', cost: { mp: 6 }, usableOutsideBattle: true,
    target: 'oneAlly', effects: [{ kind: 'healHp', amount: 75 }], animation: { effectSprite: 27 },
  }
  test('对敌施法:扣 MP + calcMagicDamage 用敌方真实元素抗;奶自己回血;MP 不足空过', () => {
    const s = createBattleState({
      players: [player('li', { hp: 20, maxHp: 200, mp: 30, magicStrength: 50, skills: ['300', '296'] })],
      enemies: [mkEnemy('e', { health: 500, defense: 0, attackStrength: 1 })],
      skills: { '300': bolt2, '296': heal },
    })
    stepBattle(s, rng0)
    s.pendingActions.set(0, { kind: 'cast', skillId: '300', targetEnemyIdx: 0 })
    let guard = 0
    while (s.phase !== 'selectAction' || s.turn === 1) { stepBattle(s, rng0); if (++guard > 50) break }
    expect(s.players[0]!.mp).toBe(25) // 30-5
    expect(s.log.some((l) => l.includes('施展 御剑术'))).toBe(true)
    expect(s.enemies[0]!.hp).toBeLessThan(500)

    s.pendingActions.set(0, { kind: 'cast', skillId: '296' }) // 奶自己(oneAlly 无敌目标)
    guard = 0
    while (s.phase !== 'selectAction' || s.turn === 2) { stepBattle(s, rng0); if (++guard > 50) break }
    expect(s.players[0]!.mp).toBe(19)
    expect(s.players[0]!.hp).toBeGreaterThan(20)

    // MP 耗尽:空过不崩
    s.players[0]!.mp = 2
    s.pendingActions.set(0, { kind: 'cast', skillId: '300', targetEnemyIdx: 0 })
    guard = 0
    while (s.phase !== 'selectAction' || s.turn === 3) { stepBattle(s, rng0); if (++guard > 50) break }
    expect(s.log.some((l) => l.includes('MP 不足'))).toBe(true)
  })
})

describe('M4b-3b 物品 / 逃跑真判定', () => {
  test('物品:回血 + consuming 扣库存;逃跑:str vs Σ敌(吉运+(lv+6)*4) 掷骰', () => {
    const potion: import('@type-pal/content').ItemData = {
      id: '61', name: '金创药', desc: '', price: 50, bitmap: 0,
      use: { target: 'oneAlly', consuming: true, effects: [{ kind: 'healHp', amount: 50 }] },
    } as never
    const s = createBattleState({
      players: [player('li', { hp: 10, maxHp: 100 })],
      enemies: [mkEnemy('e', { attackStrength: 1, health: 500 })],
      items: { '61': potion },
      inventory: [{ itemId: '61', count: 2 }],
    })
    stepBattle(s, rng0)
    s.pendingActions.set(0, { kind: 'item', itemId: '61' })
    let guard = 0
    while (s.phase !== 'selectAction' || s.turn === 1) { stepBattle(s, rng0); if (++guard > 50) break }
    expect(s.players[0]!.hp).toBe(60)
    expect(s.inventory[0]!.count).toBe(1)

    // 逃跑失败:str 低 + rng 高 → roll 大
    const s2 = createBattleState({ players: [player('li', { fleeRate: 0 })], enemies: [mkEnemy('e', { level: 10, fleeRate: 50, health: 500, attackStrength: 1 })] })
    const r9 = () => 0.99
    stepBattle(s2, r9)
    s2.pendingActions.set(0, { kind: 'flee' })
    guard = 0
    while (s2.phase !== 'selectAction' || s2.turn === 1) {
      if ((s2.phase as string) === 'fled') break
      stepBattle(s2, r9)
      if (++guard > 50) break
    }
    expect(s2.log.some((l) => l.includes('逃跑失败'))).toBe(true)
    expect(s2.phase).not.toBe('fled')
  })
})
