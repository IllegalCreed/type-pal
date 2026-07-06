import type { EnemyDef } from '@type-pal/content'
import { calcMagicDamage, calcPhysicalAttackDamage } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import type { ItemData } from '@type-pal/content'
import {
  type BattlePlayerState,
  type CreatePlayerInput,
  applyEnemyEquivItem,
  applyPoisonToEnemy,
  applyPoisonToPlayer,
  createBattleState,
  curePoisons,
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
const player = (roleId: string, o: Partial<CreatePlayerInput> = {}): CreatePlayerInput => ({
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

  test('暴击(fight.c:3639-3647):rng 1/6 → ×3 + 会心日志;高 rng 无暴击;狂暴必暴击', () => {
    // 伤害装配(fight.c:3629-3663):def 含 (敌级+6)×4;+R(1,2);×[1,1.125)
    const base = calcPhysicalAttackDamage(40, 10 + (1 + 6) * 4, 0)
    // 单回合推进:进 selectAction → 填动作 → 消费 performAction 至回合结束
    const oneTurn = (s: ReturnType<typeof createBattleState>, rng: () => number): void => {
      stepBattle(s, rng) // preBattle → selectAction
      s.pendingActions.set(0, { kind: 'attack', targetEnemyIdx: 0 })
      let guard = 0
      do {
        stepBattle(s, rng)
      } while (s.phase === 'performAction' && guard++ < 30)
    }
    const mk = () =>
      createBattleState({
        players: [player('li', { attackStrength: 40 })],
        enemies: [mkEnemy('slime', { health: 999, defense: 10, attackStrength: 0 })],
      })
    // rng0:+R(1,2)=+1,floor(0×6)=0 → 暴击 ×3,浮动 ×1
    const s1 = mk()
    oneTurn(s1, rng0)
    expect(999 - s1.enemies[0]!.hp).toBe((base + 1) * 3)
    expect(s1.log.some((l) => l.includes('会心一击'))).toBe(true)
    // rng 0.9:+R=+2,floor(5.4)=5 无暴击,浮动 ×1.1125
    const rHigh = () => 0.9
    const s2 = mk()
    oneTurn(s2, rHigh)
    expect(999 - s2.enemies[0]!.hp).toBe(Math.trunc((base + 2) * 1.1125))
    // 狂暴:高 rng 也必暴击(fight.c:3641 ‖ Bravery)
    const s3 = mk()
    s3.players[0]!.status.bravery = 3
    oneTurn(s3, rHigh)
    expect(999 - s3.enemies[0]!.hp).toBe(Math.trunc((base + 2) * 3 * 1.1125))
  })

  test('首领战不可逃(fight.c:4143 && !fIsBoss):同 rng 下 boss 场逃跑恒失败', () => {
    const s = createBattleState({
      players: [player('li', { attackStrength: 100 })],
      enemies: [mkEnemy('shilaoshi', { health: 40, defense: 0 })],
      boss: true,
    })
    // 先逃(必失败),第二轮起攻击打完 —— 结果只能是 won,绝到不了 fled
    const result = runBattleToEnd(
      s,
      (st) =>
        st.pendingActions.set(
          0,
          st.turn <= 1 ? { kind: 'flee' } : { kind: 'attack', targetEnemyIdx: 0 },
        ),
      rng0,
    )
    expect(result).toBe('won')
    expect(s.log.some((l) => l.includes('首领战不可逃'))).toBe(true)
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

  test('防御时序:出手时才置位(fight.c:4115)——先手敌全额伤,后手敌才吃 def×2;回合末全清', () => {
    // 敌先手(dex 999):防御尚未执行,def 60 全额;str = 40+(20+6)×6 = 196
    const s = createBattleState({
      players: [player('li', { hp: 400, maxHp: 400, defense: 60 })],
      enemies: [mkEnemy('e', { attackStrength: 40, dexterity: 999, level: 20 })],
    })
    const full = Math.max(1, calcPhysicalAttackDamage(196, 60, 2))
    stepBattle(s, rng0)
    s.pendingActions.set(0, { kind: 'defend' })
    let guard = 0
    while (s.phase !== 'selectAction' || s.turn === 1) {
      stepBattle(s, rng0)
      if (++guard > 50) break
    }
    expect(400 - s.players[0]!.hp).toBe(full)
    expect(s.players[0]!.defending).toBe(false) // 回合末全清(fight.c:1604)

    // 玩家先手(敌 dex 低):防御已置位 → def×2 = 120 前置(fight.c:4926-4929,非伤害减半)
    // str = 200+(5+6)×6 = 266;敌 dex (5+6)×3+1 = 34 < 玩家 50
    const s2 = createBattleState({
      players: [player('li', { hp: 400, maxHp: 400, defense: 60 })],
      enemies: [mkEnemy('e', { attackStrength: 200, dexterity: 1, level: 5 })],
    })
    const halved = Math.max(1, calcPhysicalAttackDamage(266, 120, 2))
    stepBattle(s2, rng0)
    s2.pendingActions.set(0, { kind: 'defend' })
    guard = 0
    while (s2.phase !== 'selectAction' || s2.turn === 1) {
      stepBattle(s2, rng0)
      if (++guard > 50) break
    }
    expect(400 - s2.players[0]!.hp).toBe(halved)
    // 不防御对照:def 60 全额伤更高
    expect(halved).toBeLessThan(Math.max(1, calcPhysicalAttackDamage(266, 60, 2)))
  })

  test('大世界护体符 carriedStatuses:建态注入实际回合数(护体 7,随战衰减);grantedStatuses 仍 9999 永久', () => {
    const s = createBattleState({
      players: [
        player('shielded', { carriedStatuses: [{ status: 'protect', turns: 7 }] }),
        player('combo', { grantedStatuses: ['dualAttack'] }),
      ],
      enemies: [mkEnemy('slime')],
    })
    expect(s.players[0]!.status.protect).toBe(7) // 金刚符定时状态 = 实际回合数
    expect(s.players[1]!.status.dualAttack).toBe(9999) // 装备常驻 = 永久大值
    // 无来源的空态基线
    expect(s.players[0]!.status.dualAttack).toBe(0)
    expect(s.players[1]!.status.protect).toBe(0)
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

    // MP 耗尽 + 攻击系:降级普攻(fight.c:3316 降级链;曾空过)
    s.players[0]!.mp = 2
    const eHpBefore = s.enemies[0]!.hp
    s.pendingActions.set(0, { kind: 'cast', skillId: '300', targetEnemyIdx: 0 })
    guard = 0
    while (s.phase !== 'selectAction' || s.turn === 3) { stepBattle(s, rng0); if (++guard > 50) break }
    expect(s.log.some((l) => l.includes('降级普攻'))).toBe(true)
    expect(s.players[0]!.mp).toBe(2) // 未扣
    expect(s.enemies[0]!.hp).toBeLessThan(eHpBefore) // 物攻真落敌
  })
})

describe('降级链:出手时刻验证(fight.c:3260-3506 PAL_BattlePlayerValidateAction)', () => {
  const bolt: import('@type-pal/content').SkillData = {
    id: '300', name: '御剑术', desc: '', cost: { mp: 5 }, usableOutsideBattle: false,
    target: 'oneEnemy', effects: [{ kind: 'damage', power: 30, elemental: 0 }], animation: { effectSprite: 1 },
  }
  const heal: import('@type-pal/content').SkillData = {
    id: '296', name: '气疗术', desc: '', cost: { mp: 6 }, usableOutsideBattle: true,
    target: 'oneAlly', effects: [{ kind: 'healHp', amount: 75 }], animation: { effectSprite: 27 },
  }

  test('封咒 + 攻击系 → 降普攻:MP 不扣,伤害走物攻全链(暴击/隐藏池)', () => {
    const s = createBattleState({
      players: [player('li', { attackStrength: 40, skills: ['300'] })],
      enemies: [mkEnemy('slime', { health: 999, defense: 10, attackStrength: -999 })],
      skills: { '300': bolt },
    })
    stepBattle(s, rng0)
    s.players[0]!.status.silence = 2 // 选招后被封咒(先手敌施封的 headless 等价)
    s.pendingActions.set(0, { kind: 'cast', skillId: '300', targetEnemyIdx: 0 })
    let guard = 0
    while (s.phase !== 'selectAction' || s.turn === 1) { stepBattle(s, rng0); if (++guard > 50) break }
    expect(s.log.some((l) => l.includes('被封咒,御剑术 降级普攻'))).toBe(true)
    expect(s.players[0]!.mp).toBe(30) // MP 未扣
    const base = calcPhysicalAttackDamage(40, 10 + (1 + 6) * 4, 0)
    expect(999 - s.enemies[0]!.hp).toBe((base + 1) * 3) // rng0 → +1 → 暴击 ×3(真普攻分支)
    expect(s.players[0]!.hiddenCounts.attack).toBe(1) // 隐藏池走物攻记账,非施法记账
  })

  test('MP 不足 + 辅助系 → 降防御:出手时置位可见,没奶没扣,defense 池 +2', () => {
    const s = createBattleState({
      players: [player('li', { hp: 50, maxHp: 200, mp: 2, skills: ['296'] })],
      enemies: [mkEnemy('e', { attackStrength: -999, health: 500 })],
      skills: { '296': heal },
    })
    stepBattle(s, rng0)
    s.pendingActions.set(0, { kind: 'cast', skillId: '296' }) // mp 2 < 6
    stepBattle(s, rng0) // build queue → performAction(未消费)
    stepBattle(s, rng0) // 玩家先手(dex 50 > 敌 31):降级防御执行
    expect(s.log.some((l) => l.includes('MP 不足,气疗术 降级防御'))).toBe(true)
    expect(s.players[0]!.defending).toBe(true) // 出手时置位(fight.c:4115)
    expect(s.players[0]!.hp).toBe(50) // 没奶
    expect(s.players[0]!.mp).toBe(2) // 没扣
    expect(s.players[0]!.hiddenCounts.defense).toBe(2) // 走真防御分支(B7c 记账)
    let guard = 0
    while (s.phase !== 'selectAction' || s.turn === 1) { stepBattle(s, rng0); if (++guard > 50) break }
    expect(s.players[0]!.defending).toBe(false) // 回合末全清
  })

  test('死目标改选:出手前目标已死 → 环扫下一活敌(fight.c:3500 通用尾)', () => {
    const s = createBattleState({
      players: [player('li', { attackStrength: 40 })],
      enemies: [
        mkEnemy('a', { health: 30 }),
        mkEnemy('b', { health: 999, defense: 10, attackStrength: -999 }),
      ],
    })
    stepBattle(s, rng0)
    s.pendingActions.set(0, { kind: 'attack', targetEnemyIdx: 0 })
    stepBattle(s, rng0) // build queue
    s.enemies[0]!.hp = 0 // 出手前 a 已死(多队员抢死/毒杀场景的 headless 等价)
    stepBattle(s, rng0) // 玩家先手:环扫改选 → b
    expect(s.lastAction?.kind).toBe('attack')
    expect(s.lastAction?.target).toBe(1)
    const base = calcPhysicalAttackDamage(40, 10 + (1 + 6) * 4, 0)
    expect(999 - s.enemies[1]!.hp).toBe((base + 1) * 3)
  })

  test('入队身法装配(fight.c:1497-1565):动作系数改写先后手;濒死÷2;×[0.9,1.1) 抖动', () => {
    const heal: import('@type-pal/content').SkillData = {
      id: '296', name: '气疗术', desc: '', cost: { mp: 6 }, usableOutsideBattle: true,
      target: 'oneAlly', effects: [{ kind: 'healHp', amount: 75 }], animation: { effectSprite: 27 },
    }
    const build = (act: import('./battle-core.js').BattleAction, o: { hp?: number; enemyDex?: number } = {}) => {
      const s = createBattleState({
        players: [player('li', { hp: o.hp ?? 400, maxHp: 400 })],
        enemies: [mkEnemy('e', { level: 1, dexterity: o.enemyDex ?? 10, health: 500, attackStrength: -999 })],
        skills: { '296': heal },
      })
      stepBattle(s, rng0)
      s.pendingActions.set(0, act)
      stepBattle(s, rng0) // build queue
      return s
    }
    // 敌 base (1+6)*3+52=73(×0.9=65) > 玩家普攻 50×0.9=45 → 敌先
    expect(build({ kind: 'attack', targetEnemyIdx: 0 }, { enemyDex: 52 }).actionQueue[0]!.isEnemy).toBe(true)
    // 防御×5 → 225 → 玩家反超(×5 排序提前与"出手时才置位"成对 = 原版"防得住"的机制)
    expect(build({ kind: 'defend' }, { enemyDex: 52 }).actionQueue[0]!.isEnemy).toBe(false)
    // 辅助法术×3 → 135 → 玩家先;物品×3 同
    expect(build({ kind: 'cast', skillId: '296' }, { enemyDex: 52 }).actionQueue[0]!.isEnemy).toBe(false)
    expect(build({ kind: 'item', itemId: 'x' }, { enemyDex: 52 }).actionQueue[0]!.isEnemy).toBe(false)
    // 逃跑÷2 → 22 < 敌 dex10(31×0.9=27) → 敌反超
    expect(build({ kind: 'flee' }).actionQueue[0]!.isEnemy).toBe(true)
    // 濒死÷2(fight.c:1557 队列口,区别于非 classic 的 stat 级):hp 60<min(100,80) → 普攻 22 < 27
    expect(build({ kind: 'attack', targetEnemyIdx: 0 }, { hp: 60 }).actionQueue[0]!.isEnemy).toBe(true)
    expect(build({ kind: 'attack', targetEnemyIdx: 0 }).actionQueue[0]!.isEnemy).toBe(false) // 满血对照 45>27
  })

  test('眠者不选招:强制普攻 dex 0 排尾;轮到仍睡跳过;同轮恢复真出手(fight.c:1504-1516)', () => {
    const mkS = () => {
      const s = createBattleState({
        players: [player('li', { attackStrength: 40 })],
        enemies: [mkEnemy('e', { health: 500, defense: 10, attackStrength: -999 })],
      })
      stepBattle(s, rng0)
      s.players[0]!.status.sleep = 2
      stepBattle(s, rng0) // 无手选也 build(强制普攻入队)
      expect(s.phase).toBe('performAction')
      expect(s.pendingActions.get(0)).toEqual({ kind: 'attack', targetEnemyIdx: -1 })
      expect(s.actionQueue.find((q) => !q.isEnemy)?.dex).toBe(0) // 排尾
      stepBattle(s, rng0) // 敌先手(玩家 dex 0)
      return s
    }
    // 未恢复:轮到时仍睡 → 跳过
    const s1 = mkS()
    stepBattle(s1, rng0)
    expect(s1.log.some((l) => l.includes('无法行动'))).toBe(true)
    expect(s1.enemies[0]!.hp).toBe(500)
    // 同轮恢复(被唤醒/解定的等价):强制普攻真出手,目标 -1 环扫落敌
    const s2 = mkS()
    s2.players[0]!.status.sleep = 0
    stepBattle(s2, rng0)
    const base = calcPhysicalAttackDamage(40, 10 + (1 + 6) * 4, 0)
    expect(500 - s2.enemies[0]!.hp).toBe((base + 1) * 3) // rng0 → 暴击 ×3
  })

  test('物品已耗尽 → 降防御(fight.c:3433 UseItem 数 0)', () => {
    const potion: import('@type-pal/content').ItemData = {
      id: '61', name: '金创药', desc: '', price: 50, bitmap: 0,
      use: { target: 'oneAlly', consuming: true, effects: [{ kind: 'healHp', amount: 50 }] },
    } as never
    const s = createBattleState({
      players: [player('li', { hp: 10, maxHp: 100 })],
      enemies: [mkEnemy('e', { attackStrength: -999, health: 500 })],
      items: { '61': potion },
      inventory: [{ itemId: '61', count: 1 }],
    })
    stepBattle(s, rng0)
    s.pendingActions.set(0, { kind: 'item', itemId: '61' })
    stepBattle(s, rng0) // build queue
    s.inventory[0]!.count = 0 // 出手前已被抢用(多队员场景等价)
    stepBattle(s, rng0)
    expect(s.log.some((l) => l.includes('已耗尽,降级防御'))).toBe(true)
    expect(s.players[0]!.defending).toBe(true)
    expect(s.players[0]!.hp).toBe(10) // 没吃到药
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
      enemies: [mkEnemy('e', { attackStrength: -999, health: 500 })],
      items: { '61': potion },
      inventory: [{ itemId: '61', count: 2 }],
    })
    stepBattle(s, rng0)
    s.pendingActions.set(0, { kind: 'item', itemId: '61' })
    let guard = 0
    while (s.phase !== 'selectAction' || s.turn === 1) { stepBattle(s, rng0); if (++guard > 50) break }
    // 回 50 → 60;敌 str 钳 0 后伤害走保底 1(fight.c:5070-5073)→ 59
    expect(s.players[0]!.hp).toBe(59)
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
    expect(s2.players[0]!.hiddenCounts.luck).toBe(2) // 失败 → 吉运池 +2(fight.c:4170)
  })
})

describe('敌法术:防御除因子 + 被动格挡(fight.c:4673-4853)', () => {
  const ZERO = { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 }
  const bolt: import('@type-pal/content').SkillData = {
    id: '339', name: '雷咒', desc: '', cost: { mp: 10 }, usableOutsideBattle: false,
    target: 'oneEnemy', effects: [{ kind: 'damage', power: 50, elemental: 0 }],
    animation: { effectSprite: 1 },
  }
  const mage = (o: Partial<EnemyDef['stats']> = {}): EnemyDef => ({
    ...mkEnemy('mage', { magicStrength: 60, attackStrength: 5, health: 500, defense: 0, ...o }),
    ai: { resistanceToSorcery: 5, rules: [{ at: 'act', do: { kind: 'cast', skillId: '339' } }] },
  })
  // 期望原始伤害走真公式(magStr 含级数项 (级+6)×6 —— fight.c:4673,曾漏):
  const raw = (rngFactor: number, def: number, magicStrength = 60, level = 1, power = 50) =>
    calcMagicDamage({
      magStr: Math.max(0, magicStrength + (level + 6) * 6), def, rngFactor,
      magicData: { baseDamage: power, elemental: 0 },
      elemRes: ZERO, poisonRes: 0, resistMult: 20, fieldEffect: ZERO,
    })
  const castDmg = (s: ReturnType<typeof createBattleState>): number =>
    Number(/造成 (\d+)/.exec(s.log.find((l) => l.includes('施展 雷咒')) ?? '')?.[1] ?? -1)
  const runTurn1 = (s: ReturnType<typeof createBattleState>, rng: () => number, act: () => void): void => {
    stepBattle(s, rng)
    act()
    let guard = 0
    while (s.phase !== 'selectAction' || s.turn === 1) {
      stepBattle(s, rng)
      if (++guard > 50) break
    }
  }

  test('防御+格挡:除因子 3;lastAction 记录格挡队员(演出摆 frame3 用)', () => {
    // rng0:chance 中 → 施法;格挡掷 floor(0*3)=0 → 中;rngFactor=1;玩家防御(×5 先手)
    const s = createBattleState({ players: [player('li')], enemies: [mage()], skills: { '339': bolt } })
    runTurn1(s, rng0, () => s.pendingActions.set(0, { kind: 'defend' }))
    expect(castDmg(s)).toBe(Math.trunc(raw(1, 30) / 3)) // (防2)×(护1)+(挡1)=3
    expect(s.lastAction?.kind).toBe('cast')
    expect(s.lastAction?.autoDefend).toEqual([0])
  })

  test('防御+护体+格挡全叠:除因子 5(最深)', () => {
    const s = createBattleState({ players: [player('li')], enemies: [mage()], skills: { '339': bolt } })
    s.players[0]!.status.protect = 3
    runTurn1(s, rng0, () => s.pendingActions.set(0, { kind: 'defend' }))
    expect(castDmg(s)).toBe(Math.trunc(raw(1, 30) / 5))
  })

  test('眠者无格挡资格:rng0 本该必中,除因子回 1 全额', () => {
    const s = createBattleState({ players: [player('li')], enemies: [mage()], skills: { '339': bolt } })
    stepBattle(s, rng0)
    s.players[0]!.status.sleep = 3 // selectAction 后施加:昏睡者强制普攻不防御
    let guard = 0
    while (s.phase !== 'selectAction' || s.turn === 1) {
      if (s.phase === 'lost') break
      stepBattle(s, rng0)
      if (++guard > 50) break
    }
    expect(castDmg(s)).toBe(raw(1, 30)) // 无防御无格挡 → /1
  })

  test('伤害钳到余血(fight.c:4805);魔强钳 0 + power 0 → 造成 0(无最小 1 钳)', () => {
    // 钳余血:hp 5 防御,trunc(89/3)=29 > 5 → 显示/结算都是 5
    const s = createBattleState({ players: [player('li', { hp: 5 })], enemies: [mage()], skills: { '339': bolt } })
    runTurn1(s, rng0, () => s.pendingActions.set(0, { kind: 'defend' }))
    expect(castDmg(s)).toBe(5)
    expect(s.players[0]!.hp).toBe(0)

    // 无最小 1:magStr = -99+42 = -57 → 钳 0;power 0 → calcBaseDamage(0,30)=0 → 造成 0
    const bolt0 = { ...bolt, effects: [{ kind: 'damage' as const, power: 0, elemental: 0 }] }
    const s2 = createBattleState({
      players: [player('li')], enemies: [mage({ magicStrength: -99 })], skills: { '339': bolt0 },
    })
    runTurn1(s2, rng0, () => s2.pendingActions.set(0, { kind: 'defend' }))
    expect(castDmg(s2)).toBe(0)
    expect(s2.players[0]!.hp).toBe(100)
  })
})

describe('疯魔改派(fight.c:1743-1747 执行时刻指派 + 3760-3855 打友)', () => {
  test('单人队:混乱者无视所选动作乱打唯一活敌;防御被劫持不置位', () => {
    const s = createBattleState({
      players: [player('li')],
      enemies: [mkEnemy('slime', { health: 500, attackStrength: -999 })],
    })
    stepBattle(s, rng0)
    s.players[0]!.status.confused = 3 // 混乱者不出菜单 → 强制普攻入队 → 执行时改派
    let guard = 0
    while (s.phase !== 'selectAction' || s.turn === 1) {
      stepBattle(s, rng0)
      if (++guard > 50) break
    }
    expect(s.log.some((l) => l.includes('攻击 slime 造成'))).toBe(true)
    expect(s.players[0]!.defending).toBe(false)
    expect(s.enemies[0]!.hp).toBeLessThan(500)
  })

  test('双人队:rng 指向队友 → attackMate 公式(防×2 无噪声无暴击),敌毫发无损', () => {
    // r9=0.99 恒值:改派池 [敌0,友1] → floor(0.99*2)=1 → 打友;敌 AI 无规则 → 普攻但
    // 被动格挡 floor(0.99*17)=16>=10 → 免伤,保 hp 干净
    const s = createBattleState({
      players: [player('li'), player('zhao')],
      enemies: [mkEnemy('slime', { health: 500, attackStrength: 5 })],
    })
    const r9 = () => 0.99
    stepBattle(s, r9)
    s.players[0]!.status.confused = 3
    s.pendingActions.set(1, { kind: 'defend' }) // 队友防御 ×5 先手 → 置位后才挨打
    let guard = 0
    while (s.phase !== 'selectAction' || s.turn === 1) {
      stepBattle(s, r9)
      if (++guard > 50) break
    }
    // 友伤 = calcPhys(攻40, 防30×2(防御中), 物抗2),护体无 → 保底后钳余血
    const expected = Math.max(1, calcPhysicalAttackDamage(40, 60, 2))
    expect(s.players[1]!.hp).toBe(100 - expected)
    expect(s.log.some((l) => l.includes('li 神志不清,攻击了 zhao'))).toBe(true)
    expect(s.enemies[0]!.hp).toBe(500) // 混乱者没打敌,敌普攻又被格挡
  })

  test('打友:护体减半(fight.c:3820-3823)', () => {
    const s = createBattleState({
      players: [player('li'), player('zhao')],
      enemies: [mkEnemy('slime', { health: 500, attackStrength: 5 })],
    })
    const r9 = () => 0.99
    stepBattle(s, r9)
    s.players[0]!.status.confused = 3
    s.players[1]!.status.protect = 3
    s.pendingActions.set(1, { kind: 'defend' })
    let guard = 0
    while (s.phase !== 'selectAction' || s.turn === 1) {
      stepBattle(s, r9)
      if (++guard > 50) break
    }
    const expected = Math.max(1, Math.trunc(calcPhysicalAttackDamage(40, 60, 2) / 2))
    expect(s.players[1]!.hp).toBe(100 - expected)
  })

  test('混乱+濒死 → Pass 完全不出手(fight.c:1746)', () => {
    const s = createBattleState({
      players: [player('li', { hp: 15 })], // 15 < min(100, 100/5=20) = 濒死
      enemies: [mkEnemy('slime', { health: 500, attackStrength: -999 })],
    })
    stepBattle(s, rng0)
    s.players[0]!.status.confused = 3
    let guard = 0
    while (s.phase !== 'selectAction' || s.turn === 1) {
      if (s.phase === 'lost') break
      stepBattle(s, rng0)
      if (++guard > 50) break
    }
    expect(s.log.some((l) => l.includes('li 神志不清'))).toBe(true)
    expect(s.log.some((l) => l.includes('li 攻击'))).toBe(false)
    expect(s.enemies[0]!.hp).toBe(500)
  })
})

describe('P2 中毒 DoT(数据化毒 tick;fight.c:4454 逐回合)', () => {
  const POISONS: Record<number, import('@type-pal/content').PoisonDef> = {
    551: { id: 551, name: '赤毒', curability: 'common', color: 16, playerTicks: [{ hpDelta: -7 }], enemyTicks: [{ hpDelta: -7 }] },
    555: {
      id: 555, name: '三尸蛊毒', curability: 'severe', color: 128,
      playerTicks: [{ hpDelta: 0 }, { hpDelta: -1 }, { hpDelta: -2 }, { hpDelta: -3 }, { hpDelta: -200, selfCure: true }],
      enemyTicks: [{ hpDelta: -111 }, { hpDelta: -222 }, { hpDelta: -333, selfCure: true }],
    },
    137: { id: 137, name: '无影毒', curability: 'incurable', color: 0, enemyTicks: [{ halveHp: 1000, selfCure: true }] },
    561: {
      id: 561, name: '食妖虫附', curability: 'incurable', color: 0,
      enemyTicks: [{ hpDelta: -1 }, { hpDelta: -2 }, { hpDelta: -8, grantItem: '145', selfCure: true }],
    },
  }
  // 单回合推进器(填动作 → 消费到回合末毒 tick)
  const oneTurn = (s: ReturnType<typeof createBattleState>, act: () => void): void => {
    if (s.phase === 'preBattle') stepBattle(s, rng0)
    act()
    let g = 0
    do stepBattle(s, rng0)
    while (s.phase === 'performAction' && g++ < 40)
  }

  // 敌人睡死隔离毒 DoT(否则敌每回合物攻干扰血量;sleep 大回合数撑过测试)
  const sleepEnemy = (s: ReturnType<typeof createBattleState>): void => {
    s.enemies[0]!.status.sleep = 99
  }

  test('赤毒:玩家每回合 −7 循环(指针停末项)', () => {
    const s = createBattleState({
      players: [player('li', { hp: 100, attackStrength: 0 })],
      enemies: [mkEnemy('slime', { health: 9999, defense: 999, attackStrength: 0 })],
      poisonDefs: POISONS,
    })
    s.players[0]!.poisons = [{ poisonId: 551, tickIndex: 0 }]
    oneTurn(s, () => { sleepEnemy(s); s.pendingActions.set(0, { kind: 'defend' }) })
    expect(s.players[0]!.hp).toBe(93)
    oneTurn(s, () => { sleepEnemy(s); s.pendingActions.set(0, { kind: 'defend' }) })
    expect(s.players[0]!.hp).toBe(86) // 循环 −7
  })

  test('三尸蛊:递增序列 0→−1→−2→−3→−200 末回合自解', () => {
    const s = createBattleState({
      players: [player('li', { hp: 300, attackStrength: 0 })],
      enemies: [mkEnemy('slime', { health: 9999, defense: 999, attackStrength: 0 })],
      poisonDefs: POISONS,
    })
    s.players[0]!.poisons = [{ poisonId: 555, tickIndex: 0 }]
    const hp = () => s.players[0]!.hp
    const turn = () => oneTurn(s, () => { sleepEnemy(s); s.pendingActions.set(0, { kind: 'defend' }) })
    turn()
    expect(hp()).toBe(300) // tick0: 0
    turn()
    expect(hp()).toBe(299) // tick1: −1
    turn()
    expect(hp()).toBe(297) // tick2: −2
    turn()
    expect(hp()).toBe(294) // tick3: −3
    turn()
    expect(hp()).toBe(94) // tick4: −200 + selfCure
    expect(s.players[0]!.poisons).toHaveLength(0) // 自解移除
  })

  test('上毒命中门 = 巫抗(不是毒抗):巫抗满 boss 不中毒', () => {
    const s = createBattleState({
      players: [player('li')],
      enemies: [mkEnemy('boss', { health: 999 })],
      poisonDefs: POISONS,
    })
    s.enemies[0]!.def.ai.resistanceToSorcery = 10 // 满巫抗
    const hit = applyPoisonToEnemy(s.enemies[0]!, 555, () => 0.99) // floor(0.99*10)=9 < 10 → 挡
    expect(hit).toBe(false)
    expect(s.enemies[0]!.poisons).toHaveLength(0)
    // 零巫抗必中
    s.enemies[0]!.def.ai.resistanceToSorcery = 0
    expect(applyPoisonToEnemy(s.enemies[0]!, 555, () => 0.5)).toBe(true)
    expect(s.enemies[0]!.poisons[0]!.poisonId).toBe(555)
  })

  test('按可解度解毒:common 解常规留六大毒;severe 解六大毒;incurable(无影/寄生)谁都不解', () => {
    const host = { hp: 100, poisons: [{ poisonId: 551, tickIndex: 0 }, { poisonId: 555, tickIndex: 0 }, { poisonId: 137, tickIndex: 0 }] }
    curePoisons(host, POISONS, 'common') // 灵血咒/九节菖蒲
    expect(host.poisons.map((p) => p.poisonId)).toEqual([555, 137]) // 赤毒(common)解,三尸蛊(severe)/无影(incurable)留
    curePoisons(host, POISONS, 'severe') // 复活类
    expect(host.poisons.map((p) => p.poisonId)).toEqual([137]) // 三尸蛊(severe)解,无影毒(incurable)留
  })

  test('养蛊:寄生毒递进伤害(−1/−2/−8)+ 到期产道具入背包(食妖虫附→灵蛊145)', () => {
    const s = createBattleState({
      players: [player('li', { attackStrength: 0 })],
      enemies: [mkEnemy('slime', { health: 9999, defense: 999, attackStrength: 0 })],
      poisonDefs: POISONS,
    })
    s.enemies[0]!.poisons = [{ poisonId: 561, tickIndex: 0 }]
    const hp0 = s.enemies[0]!.hp
    oneTurn(s, () => s.pendingActions.set(0, { kind: 'defend' }))
    expect(hp0 - s.enemies[0]!.hp).toBe(1) // tick0: −1(递进首)
    oneTurn(s, () => s.pendingActions.set(0, { kind: 'defend' }))
    expect(hp0 - s.enemies[0]!.hp).toBe(3) // tick1: −2(累计 −3)
    oneTurn(s, () => s.pendingActions.set(0, { kind: 'defend' }))
    expect(hp0 - s.enemies[0]!.hp).toBe(11) // tick2: −8 + 到期
    expect(s.enemies[0]!.poisons).toHaveLength(0) // selfCure
    expect(s.inventory.find((x) => x.itemId === '145')?.count).toBe(1) // 灵蛊入背包
  })

  test('无影毒对敌:一次性半血上限1000 + 自解', () => {
    const s = createBattleState({
      players: [player('li', { attackStrength: 0 })],
      enemies: [mkEnemy('slime', { health: 500, defense: 999, attackStrength: 0 })],
      poisonDefs: POISONS,
    })
    s.enemies[0]!.poisons = [{ poisonId: 137, tickIndex: 0 }]
    oneTurn(s, () => s.pendingActions.set(0, { kind: 'defend' }))
    expect(s.enemies[0]!.hp).toBe(249) // 500 − min(1000, 250+1) = 500−251
    expect(s.enemies[0]!.poisons).toHaveLength(0) // selfCure
  })
})

describe('P2 敌普攻附毒(attackEquivItem + 玩家毒抗门;fight.c:5139-5146)', () => {
  const poisonItem: ItemData = {
    id: '116', name: '尸腐肉', desc: [], icon: 0, buyPrice: 0, sellPrice: 0, sellable: false,
    use: { target: 'oneAlly', consuming: true, effects: [{ kind: 'applyPoison', poisonId: '552' }] },
  }
  const defs = { 552: { id: 552, name: '尸毒', curability: 'common' as const, color: 0 } }
  const mkState = (poisonRes: number) =>
    createBattleState({
      players: [player('li', { poisonRes })],
      enemies: [{ ...mkEnemy('snake'), attackEquivItem: { itemId: '116', rate: 2 } }],
      items: { '116': poisonItem },
      poisonDefs: defs,
    })
  test('毒抗 0:rate 门过(rate 2 ≥ R(1,10)=1)+ 毒抗门过(0 < R(1,100)=1)→ 玩家中尸毒', () => {
    const s = mkState(0)
    applyEnemyEquivItem(s.players[0]!, s.enemies[0]!, s, () => 0) // rng0:两门都过
    expect(s.players[0]!.poisons).toEqual([{ poisonId: 552, tickIndex: 0 }])
  })
  test('毒抗 50:毒抗门挡(50 ≥ R(1,100)=1)→ 不中毒(大蒜临时毒抗即缩此门)', () => {
    const s = mkState(50)
    applyEnemyEquivItem(s.players[0]!, s.enemies[0]!, s, () => 0)
    expect(s.players[0]!.poisons).toHaveLength(0)
  })
  test('rate 门不过(rate 2 < R(1,10)=10)→ 不触发(即便毒抗 0)', () => {
    const s = mkState(0)
    applyEnemyEquivItem(s.players[0]!, s.enemies[0]!, s, () => 0.99) // rng≈1:R(1,10)=10 > rate2
    expect(s.players[0]!.poisons).toHaveLength(0)
  })
  test('无 attackEquivItem 的敌 → 不附毒(安全)', () => {
    const s = createBattleState({
      players: [player('li', { poisonRes: 0 })],
      enemies: [mkEnemy('slime')],
      items: { '116': poisonItem },
      poisonDefs: defs,
    })
    applyEnemyEquivItem(s.players[0]!, s.enemies[0]!, s, () => 0)
    expect(s.players[0]!.poisons).toHaveLength(0)
  })
})

describe('P2 傀儡续战(fOnlyPuppet;fight.c:1102-1141/1739)', () => {
  test('全队 hp==0 但有傀儡 → 不判负,傀儡续战;敌无活玩家目标自然 pass', () => {
    const s = createBattleState({
      players: [player('li', { hp: 0, maxHp: 100, attackStrength: 100 })],
      enemies: [mkEnemy('slime', { health: 999, defense: 0, attackStrength: 50 })],
    })
    s.players[0]!.status.puppet = 3 // 死傀儡
    // 推进两回合(turn 从 preBattle 起即 1);傀儡强制普攻削敌,敌无活玩家 → pass
    let g = 0
    while (s.turn < 3 && s.phase !== 'lost' && s.phase !== 'won' && g++ < 60) stepBattle(s, rng0)
    expect(s.phase).not.toBe('lost') // 傀儡撑着
    expect(s.enemies[0]!.hp).toBeLessThan(999) // 傀儡真出手削了敌
    expect(s.log.some((l) => l.includes('无法行动'))).toBe(true) // 敌无活玩家目标 → pass
  })

  test('傀儡打光敌人 → 胜(死傀儡也能赢)', () => {
    const s = createBattleState({
      players: [player('li', { hp: 0, maxHp: 100, attackStrength: 999 })],
      enemies: [mkEnemy('slime', { health: 20, defense: 0, attackStrength: 0 })],
    })
    s.players[0]!.status.puppet = 5
    const result = runBattleToEnd(
      s,
      () => {}, // 傀儡自动强制普攻,无需填动作
      rng0,
    )
    expect(result).toBe('won')
  })

  test('无傀儡的全灭 → 判负(对照)', () => {
    const s = createBattleState({
      players: [player('li', { hp: 0, maxHp: 100 })],
      enemies: [mkEnemy('slime', { health: 999, defense: 999, attackStrength: 0 })],
    })
    // puppet=0,全员死 → 判负
    let g = 0
    while (s.phase !== 'lost' && g++ < 20) stepBattle(s, rng0)
    expect(s.phase).toBe('lost')
  })
})

describe('P2 连击双打(装备授 dualAttack;仙女剑170)', () => {
  // 敌睡死隔离(否则敌回合覆写 lastAction);log 持久,断言走 log + 敌血 delta
  const drive = (s: ReturnType<typeof createBattleState>): void => {
    stepBattle(s, rng0)
    s.enemies[0]!.status.sleep = 99
    s.pendingActions.set(0, { kind: 'attack', targetEnemyIdx: 0 })
    let g = 0
    do stepBattle(s, rng0)
    while (s.phase === 'performAction' && g++ < 40)
  }

  test('dualAttack 状态 → 物攻两击(敌未死);log 有连击', () => {
    const s = createBattleState({
      players: [player('zhao', { attackStrength: 60, grantedStatuses: ['dualAttack'] })],
      enemies: [mkEnemy('slime', { health: 9999, defense: 0, attackStrength: 0 })],
    })
    expect(s.players[0]!.status.dualAttack).toBeGreaterThan(0) // 建态置入
    drive(s)
    expect(s.log.filter((l) => l.includes('zhao')).length).toBeGreaterThanOrEqual(2) // 两击各一条
    expect(s.log.some((l) => l.includes('连击'))).toBe(true)
    expect(9999 - s.enemies[0]!.hp).toBeGreaterThan(0)
  })

  test('无 dualAttack → 单击(对照,无连击 log)', () => {
    const s = createBattleState({
      players: [player('li', { attackStrength: 60 })],
      enemies: [mkEnemy('slime', { health: 9999, defense: 0, attackStrength: 0 })],
    })
    drive(s)
    expect(s.log.some((l) => l.includes('连击'))).toBe(false)
  })

  test('首击秒杀 → 无第二击(敌已死)', () => {
    const s = createBattleState({
      players: [player('zhao', { attackStrength: 9999, grantedStatuses: ['dualAttack'] })],
      enemies: [mkEnemy('slime', { health: 10, defense: 0, attackStrength: 0 })],
    })
    drive(s)
    expect(s.log.some((l) => l.includes('连击'))).toBe(false) // 敌首击死,无连击
  })
})

describe('P2 长鞭攻全体(attackAll;fight.c:3683-3730)', () => {
  test('扫全场,逐敌减半(中心向外 division 翻倍),attackAllHits 记账', () => {
    // 3 敌同防同血;rng0 → 暴击(floor(0*6)=0);伤害逐个减半
    const s = createBattleState({
      players: [player('li', { attackStrength: 100, attackAll: true })],
      enemies: [
        mkEnemy('a', { health: 9999, defense: 0, attackStrength: 0 }),
        mkEnemy('b', { health: 9999, defense: 0, attackStrength: 0 }),
        mkEnemy('c', { health: 9999, defense: 0, attackStrength: 0 }),
      ],
    })
    stepBattle(s, rng0)
    for (const e of s.enemies) e.status.sleep = 99 // 隔离敌回合
    s.pendingActions.set(0, { kind: 'attack', targetEnemyIdx: 0 })
    let g = 0
    do stepBattle(s, rng0)
    while (s.phase === 'performAction' && g++ < 40)
    // 3 敌都掉血;打击序 {2,1,0}(原版 index[])→ 敌2 division1 全额 > 敌1 half > 敌0 quarter
    const dealt = s.enemies.map((e) => 9999 - e.hp)
    expect(dealt.every((d) => d > 0)).toBe(true) // 全都吃到
    expect(dealt[2]).toBeGreaterThan(dealt[1]!) // 敌2 首打 division1 最重
    expect(dealt[1]).toBeGreaterThan(dealt[0]!) // 敌1 次之 > 敌0 末打 division4
    expect(dealt[1]).toBe(Math.trunc(dealt[2]! / 2)) // 逐敌减半(division 翻倍,trunc)
    expect(dealt[0]).toBe(Math.trunc(dealt[2]! / 4))
    expect(s.log.some((l) => l.includes('横扫'))).toBe(true)
  })

  test('单敌 attackAll = 单目标伤害(division 1);无 attackAll 对照单体', () => {
    const s = createBattleState({
      players: [player('li', { attackStrength: 100, attackAll: true })],
      enemies: [mkEnemy('a', { health: 9999, defense: 0, attackStrength: 0 })],
    })
    stepBattle(s, rng0)
    s.enemies[0]!.status.sleep = 99
    s.pendingActions.set(0, { kind: 'attack', targetEnemyIdx: 0 })
    let g = 0
    do stepBattle(s, rng0)
    while (s.phase === 'performAction' && g++ < 40)
    expect(9999 - s.enemies[0]!.hp).toBeGreaterThan(0)
    expect(s.log.some((l) => l.includes('横扫'))).toBe(true)
  })
})

describe('P2 投掷道具(throw;养蛊源 + 下毒)', () => {
  const THROW_ITEMS: Record<string, import('@type-pal/content').ItemData> = {
    '144': { id: '144', name: '食妖虫', desc: [], icon: 0, buyPrice: 0, sellPrice: 0, sellable: false, throw: { effects: [{ kind: 'applyPoison', poisonId: '561' }] } },
  }
  const PARASITE: Record<number, import('@type-pal/content').PoisonDef> = {
    561: { id: 561, name: '食妖虫附', curability: 'incurable', color: 0, enemyTicks: [{ hpDelta: -1 }, { hpDelta: -8, grantItem: '145', selfCure: true }] },
  }
  test('投掷食妖虫 → 敌中寄生毒(巫抗门)+ 消耗;到期产灵蛊入背包(养蛊闭环)', () => {
    const s = createBattleState({
      players: [player('li', { attackStrength: 0 })],
      enemies: [mkEnemy('slime', { health: 9999, defense: 999, attackStrength: 0 })],
      items: THROW_ITEMS,
      inventory: [{ itemId: '144', count: 2 }],
      poisonDefs: PARASITE,
    })
    s.enemies[0]!.def.ai.resistanceToSorcery = 0 // 零巫抗必中
    stepBattle(s, () => 0.5)
    s.enemies[0]!.status.sleep = 99 // 隔离敌回合
    s.pendingActions.set(0, { kind: 'throw', itemId: '144', targetEnemyIdx: 0 })
    let g = 0
    do stepBattle(s, () => 0.5)
    while (s.phase === 'performAction' && g++ < 40)
    expect(s.enemies[0]!.poisons.map((p) => p.poisonId)).toEqual([561]) // 中寄生毒
    expect(s.inventory.find((x) => x.itemId === '144')?.count).toBe(1) // 投掷消耗 2→1
    // 再过一回合 → 寄生到期产灵蛊
    s.enemies[0]!.status.sleep = 99
    s.pendingActions.set(0, { kind: 'defend' })
    g = 0
    do stepBattle(s, () => 0.5)
    while (s.phase === 'performAction' && g++ < 40)
    expect(s.inventory.find((x) => x.itemId === '145')?.count).toBe(1) // 灵蛊入背包
  })

  test('巫抗满 → 投掷下毒不中(道具仍消耗)', () => {
    const s = createBattleState({
      players: [player('li')],
      enemies: [mkEnemy('boss', { health: 999 })],
      items: THROW_ITEMS,
      inventory: [{ itemId: '144', count: 1 }],
      poisonDefs: PARASITE,
    })
    s.enemies[0]!.def.ai.resistanceToSorcery = 10 // 满巫抗
    stepBattle(s, () => 0.99)
    s.enemies[0]!.status.sleep = 99
    s.pendingActions.set(0, { kind: 'throw', itemId: '144', targetEnemyIdx: 0 })
    let g = 0
    do stepBattle(s, () => 0.99)
    while (s.phase === 'performAction' && g++ < 40)
    expect(s.enemies[0]!.poisons).toHaveLength(0) // 巫抗挡,不中
    expect(s.inventory.find((x) => x.itemId === '144')?.count).toBe(0) // 仍消耗(count 0,写回时清)
  })
})

describe('P2 投掷致死组合(三对;数据驱动 lethalWith,仅投掷触发)', () => {
  const ITEMS: Record<string, import('@type-pal/content').ItemData> = {
    heding: { id: 'heding', name: '鹤顶红', desc: [], icon: 0, buyPrice: 0, sellPrice: 0, sellable: false, throw: { effects: [{ kind: 'applyPoison', poisonId: '556' }] } },
  }
  const P: Record<number, import('@type-pal/content').PoisonDef> = {
    556: { id: 556, name: '鹤顶红', curability: 'severe', color: 0, enemyTicks: [{ hpDelta: -100 }], lethalWith: 557, counters: 558 },
    557: { id: 557, name: '孔雀胆', curability: 'severe', color: 0, enemyTicks: [{ hpDelta: -100 }], lethalWith: 556, counters: 560 },
  }
  test('敌已中孔雀胆(557),投鹤顶红(556)→ 双毒相冲暴毙', () => {
    const s = createBattleState({
      players: [player('li')],
      enemies: [mkEnemy('boss', { health: 9999, defense: 999, attackStrength: 0 })],
      items: ITEMS, inventory: [{ itemId: 'heding', count: 1 }], poisonDefs: P,
    })
    s.enemies[0]!.def.ai.resistanceToSorcery = 0
    s.enemies[0]!.poisons = [{ poisonId: 557, tickIndex: 0 }] // 已中孔雀胆
    stepBattle(s, () => 0.5)
    s.pendingActions.set(0, { kind: 'throw', itemId: 'heding', targetEnemyIdx: 0 })
    let g = 0
    do stepBattle(s, () => 0.5)
    while (s.phase === 'performAction' && g++ < 40)
    expect(s.enemies[0]!.hp).toBe(0) // 暴毙
    expect(s.log.some((l) => l.includes('暴毙'))).toBe(true)
  })
  test('敌未中配对毒 → 只下毒不暴毙(对照)', () => {
    const s = createBattleState({
      players: [player('li')],
      enemies: [mkEnemy('boss', { health: 9999, defense: 999, attackStrength: 0 })],
      items: ITEMS, inventory: [{ itemId: 'heding', count: 1 }], poisonDefs: P,
    })
    s.enemies[0]!.def.ai.resistanceToSorcery = 0
    stepBattle(s, () => 0.5)
    s.pendingActions.set(0, { kind: 'throw', itemId: 'heding', targetEnemyIdx: 0 })
    let g = 0
    do stepBattle(s, () => 0.5)
    while (s.phase === 'performAction' && g++ < 40)
    expect(s.enemies[0]!.hp).toBeGreaterThan(0) // 未暴毙
    expect(s.enemies[0]!.poisons.some((p) => p.poisonId === 556)).toBe(true) // 只下了毒
  })
  test('巫抗满 boss 免疫致死组合:下毒不中(rng*10 恒<10)→ 无暴毙(致死门在巫抗内)', () => {
    const s = createBattleState({
      players: [player('li')],
      enemies: [mkEnemy('boss', { health: 9999, defense: 999, attackStrength: 0 })],
      items: ITEMS, inventory: [{ itemId: 'heding', count: 1 }], poisonDefs: P,
    })
    s.enemies[0]!.def.ai.resistanceToSorcery = 10 // 满巫抗
    s.enemies[0]!.poisons = [{ poisonId: 557, tickIndex: 0 }] // 即便已中配对毒
    stepBattle(s, () => 0.99)
    s.pendingActions.set(0, { kind: 'throw', itemId: 'heding', targetEnemyIdx: 0 })
    let g = 0
    do stepBattle(s, () => 0.99)
    while (s.phase === 'performAction' && g++ < 40)
    expect(s.enemies[0]!.hp).toBeGreaterThan(0) // 未暴毙(仅原 557 DoT 扣血,非致死秒杀)
    expect(s.log.some((l) => l.includes('暴毙'))).toBe(false) // 致死不触发
    expect(s.enemies[0]!.poisons.map((p) => p.poisonId)).toEqual([557]) // 鹤顶红未上(巫抗挡)
  })
})

describe('P2 相克 use-on-self(以毒攻毒自解;counters/lethalWith 数据驱动)', () => {
  const P: Record<number, import('@type-pal/content').PoisonDef> = {
    556: { id: 556, name: '鹤顶红', curability: 'severe', color: 0, playerTicks: [{ hpDelta: -50 }], counters: 558, lethalWith: 557 },
    558: { id: 558, name: '血海棠', curability: 'severe', color: 0, playerTicks: [{ hpDelta: -50 }], counters: 559, lethalWith: 555 },
    557: { id: 557, name: '孔雀胆', curability: 'severe', color: 0, playerTicks: [{ hpDelta: -50 }], counters: 560, lethalWith: 556 },
  }
  test('身中血海棠(558),用鹤顶红(556)→ 以毒攻毒解掉558,不下556', () => {
    const p = { hp: 100, poisons: [{ poisonId: 558, tickIndex: 0 }] } as never
    expect(applyPoisonToPlayer(p, 556, P)).toBe('cured')
    expect((p as { poisons: { poisonId: number }[] }).poisons).toEqual([]) // 558 解掉,556 未下
  })
  test('身中孔雀胆(557),用鹤顶红(556)→ 致死配对暴毙', () => {
    const p = { hp: 100, poisons: [{ poisonId: 557, tickIndex: 0 }] } as never
    expect(applyPoisonToPlayer(p, 556, P)).toBe('lethal')
    expect((p as { hp: number }).hp).toBe(0) // 暴毙
  })
  test('身上无相关毒 → 下本毒(自毒)', () => {
    const p = { hp: 100, poisons: [] } as never
    expect(applyPoisonToPlayer(p, 556, P)).toBe('applied')
    expect((p as { poisons: { poisonId: number }[] }).poisons).toEqual([{ poisonId: 556, tickIndex: 0 }])
  })
})

describe('P2 毒龙胆/九阴散(0x61 没中毒则秒杀)', () => {
  const ITEMS: Record<string, import('@type-pal/content').ItemData> = {
    '278': { id: '278', name: '毒龙胆', desc: [], icon: 0, buyPrice: 0, sellPrice: 0, sellable: false, use: { target: 'oneAlly', consuming: true, effects: [{ kind: 'dieIfNotPoisoned' }, { kind: 'curePoison', curesTier: 'severe' }] } },
  }
  const P: Record<number, import('@type-pal/content').PoisonDef> = {
    555: { id: 555, name: '三尸蛊', curability: 'severe', color: 0, playerTicks: [{ hpDelta: -50 }] },
  }
  const useOnSelf = (poisons: { poisonId: number; tickIndex: number }[]) => {
    const s = createBattleState({
      players: [player('li', { hp: 100 })],
      enemies: [mkEnemy('slime', { health: 9999, defense: 999, attackStrength: 0 })],
      items: ITEMS, inventory: [{ itemId: '278', count: 1 }], poisonDefs: P,
    })
    s.players[0]!.poisons = poisons
    stepBattle(s, rng0)
    s.enemies[0]!.status.sleep = 99
    s.pendingActions.set(0, { kind: 'item', itemId: '278' })
    let g = 0
    do stepBattle(s, rng0)
    while (s.phase === 'performAction' && g++ < 40)
    return s
  }
  test('没中毒用毒龙胆 → 反噬暴毙', () => {
    const s = useOnSelf([])
    expect(s.players[0]!.hp).toBe(0)
    expect(s.log.some((l) => l.includes('反噬暴毙'))).toBe(true)
  })
  test('中三尸蛊(severe)用毒龙胆 → 解毒不死', () => {
    const s = useOnSelf([{ poisonId: 555, tickIndex: 0 }])
    expect(s.players[0]!.hp).toBeGreaterThan(0) // 未暴毙
    expect(s.players[0]!.poisons).toHaveLength(0) // 三尸蛊(severe)被解
  })
})

describe('P3 合体技(coop magic)', () => {
  type SkillData = import('@type-pal/content').SkillData
  const coopSkill: SkillData = {
    id: 'c386', name: '合体气功', desc: '', cost: { mp: 9 }, usableOutsideBattle: false,
    target: 'oneEnemy', effects: [{ kind: 'damage', power: 90, elemental: 0 }],
    animation: { effectSprite: 1 },
  }
  const coopPlayer = (id: string): CreatePlayerInput =>
    player(id, { attackStrength: 40, magicStrength: 20, cooperativeMagicSkillId: 'c386' })
  // 跑完当前回合到下一次 selectAction(或终局)
  const runTurn = (s: ReturnType<typeof createBattleState>): void => {
    let guard = 0
    const startTurn = s.turn
    while (!(s.phase === 'selectAction' && s.turn > startTurn) && s.phase !== 'won' && s.phase !== 'lost') {
      stepBattle(s, rng0)
      if (++guard > 80) break
    }
  }

  test('合击:全 healthy 贡献 HP(各扣合体技 cost 作 HP)+ 结算走 calcMagicDamage 路径', () => {
    // 弱敌(合击一击必杀)→ 敌死无反击,贡献 HP 净扣可精确断言
    const s = createBattleState({
      players: [coopPlayer('li'), coopPlayer('zhao')],
      enemies: [mkEnemy('slime', { health: 40, defense: 10, attackStrength: 0 })],
      skills: { c386: coopSkill },
    })
    stepBattle(s, rng0) // preBattle → selectAction(turn 1)
    s.pendingActions.set(0, { kind: 'coop', targetEnemyIdx: 0 })
    s.pendingActions.set(1, { kind: 'attack', targetEnemyIdx: 0 })
    runTurn(s)
    expect(s.phase).toBe('won') // 合击(magStr=Σ(atk+mag)/4=30)一击秒杀弱敌
    expect(s.players[0]!.hp).toBe(100 - 9) // 两贡献者各扣 9 HP 代价(cost.mp 作 HP)
    expect(s.players[1]!.hp).toBe(100 - 9)
    expect(s.log.some((l) => l.includes('合体技 合体气功 对 slime'))).toBe(true)
  })

  test('合击消耗:队友本回合出手作废(coopThisTurn),敌只挨合击一击', () => {
    const s = createBattleState({
      players: [coopPlayer('li'), coopPlayer('zhao')],
      enemies: [mkEnemy('slime', { health: 9999, defense: 10, attackStrength: 0 })],
      skills: { c386: coopSkill },
    })
    stepBattle(s, rng0)
    s.pendingActions.set(0, { kind: 'coop', targetEnemyIdx: 0 })
    s.pendingActions.set(1, { kind: 'attack', targetEnemyIdx: 0 }) // 队友普攻:应被合击消耗
    // coopThisTurn 在选招→出手时置位、回合末自清;其效果 = 队友被消耗(下方日志断言),故不在 runTurn 后查该标志
    runTurn(s)
    // 合击伤害 1 次;队友普攻被消耗 → 无玩家物攻打到 slime(敌反击是「slime 攻击 li」,非「攻击 slime」)
    expect(s.log.filter((l) => l.includes('合体技 合体气功')).length).toBe(1)
    expect(s.log.some((l) => l.includes('攻击 slime'))).toBe(false)
  })

  test('全体合击技(allEnemies)打全场', () => {
    const tnsh: SkillData = { ...coopSkill, id: 'c355', name: '天女散花', target: 'allEnemies', effects: [{ kind: 'damage', power: 109, elemental: 0 }] }
    const s = createBattleState({
      players: [
        player('li', { attackStrength: 40, magicStrength: 20, cooperativeMagicSkillId: 'c355' }),
        player('zhao', { attackStrength: 40, magicStrength: 20, cooperativeMagicSkillId: 'c355' }),
      ],
      enemies: [mkEnemy('a', { health: 9999, defense: 0, attackStrength: 0 }), mkEnemy('b', { health: 9999, defense: 0, attackStrength: 0 })],
      skills: { c355: tnsh },
    })
    stepBattle(s, rng0)
    s.pendingActions.set(0, { kind: 'coop' }) // 无目标 = 全体技自动全场
    s.pendingActions.set(1, { kind: 'defend' })
    const a0 = s.enemies[0]!.hp, b0 = s.enemies[1]!.hp
    runTurn(s)
    expect(s.enemies[0]!.hp).toBeLessThan(a0)
    expect(s.enemies[1]!.hp).toBeLessThan(b0) // 全体都掉血
  })

  test('healthy≤1 → 退化普攻(不扣合击 HP 代价)', () => {
    const s = createBattleState({
      players: [coopPlayer('li')],
      enemies: [mkEnemy('slime', { health: 40, defense: 10, attackStrength: 0 })],
      skills: { c386: coopSkill },
    })
    stepBattle(s, rng0)
    s.pendingActions.set(0, { kind: 'coop', targetEnemyIdx: 0 })
    runTurn(s)
    expect(s.phase).toBe('won') // 退化普攻(会心)秒杀弱敌
    expect(s.players[0]!.hp).toBe(100) // 无合击 HP 代价(退化路径不扣)
    expect(s.log.some((l) => l.includes('人手不足'))).toBe(true)
  })

  test('coop×10 出手身法:合击者敏捷极低仍先手(慢发起者也能消耗快队友)', () => {
    const s = createBattleState({
      players: [
        player('slow', { baseDexterity: 1, attackStrength: 40, magicStrength: 20, cooperativeMagicSkillId: 'c386' }),
        player('fast', { baseDexterity: 200, attackStrength: 40, magicStrength: 20, cooperativeMagicSkillId: 'c386' }),
      ],
      enemies: [mkEnemy('slime', { health: 9999, defense: 10, attackStrength: 0 })],
      skills: { c386: coopSkill },
    })
    stepBattle(s, rng0)
    s.pendingActions.set(0, { kind: 'coop', targetEnemyIdx: 0 })
    s.pendingActions.set(1, { kind: 'attack', targetEnemyIdx: 0 })
    runTurn(s)
    // 快队友(dex 200)本会先手,但 coopThisTurn 令其普攻作废 → 无玩家物攻打到 slime
    expect(s.log.some((l) => l.includes('攻击 slime'))).toBe(false)
    expect(s.log.filter((l) => l.includes('合体技')).length).toBe(1)
  })
})
