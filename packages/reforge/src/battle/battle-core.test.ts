import type { EnemyDef, ItemData, SkillData } from '@type-pal/content'
import { calcMagicDamage, calcPhysicalAttackDamage } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  applyEnemyEffect,
  applyEnemyEquivItem,
  applyPoisonToEnemy,
  applyPoisonToPlayer,
  buildAiView,
  type CreatePlayerInput,
  createBattleState,
  curePoisons,
  decideEnemyAction,
  pendingItemUses,
  resolveAttack,
  runBattleToEnd,
  stepBattle,
} from './battle-core.js'

// 造敌人:只填 M4a 用到的 stats,其余给合理默认
function mkEnemy(id: string, o: Partial<EnemyDef['stats']> = {}): EnemyDef {
  return {
    id,
    name: `name.${id}`,
    battleSprite: `battle-sprite.${id}`,
    yPosOffset: 0,
    stats: {
      health: 30,
      level: 1,
      exp: 5,
      cash: 3,
      attackStrength: 20,
      magicStrength: 0,
      defense: 10,
      dexterity: 10,
      fleeRate: 0,
      physicalResistance: 0,
      poisonResistance: 0,
      elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
      dualMove: false,
      collectValue: 0,
      ...o,
    },
    ai: { resistanceToSorcery: 5 },
    sounds: {},
  }
}
const player = (roleId: string, o: Partial<CreatePlayerInput> = {}): CreatePlayerInput => ({
  roleId,
  actorTemplateId: roleId,
  hp: 100,
  maxHp: 100,
  mp: 30,
  maxMp: 30,
  attackStrength: 40,
  defense: 30,
  magicStrength: 20,
  baseDexterity: 50,
  skills: [],
  fleeRate: 20,
  ...o,
})
const rng0 = () => 0 // 定值:AI 恒选第一个目标

describe('M4a headless 战斗核', () => {
  test('resolveAttack = calcPhysicalAttackDamage;防御减半', () => {
    const raw = calcPhysicalAttackDamage(40, 10, 0)
    expect(resolveAttack(40, 10, 0, false)).toBe(raw)
    expect(resolveAttack(40, 10, 0, true)).toBe(Math.trunc(raw / 2))
  })

  test('一场 1v1 攻击战:玩家碾压 → won,伤害对齐公式', () => {
    const s = createBattleState({
      players: [player('li', { attackStrength: 40 })],
      enemies: [mkEnemy('slime', { health: 30, defense: 10, attackStrength: 1 })],
    })
    const dmg = calcPhysicalAttackDamage(40, 10, 0) // 每击伤害
    const result = runBattleToEnd(
      s,
      (st) => st.pendingActions.set(0, { kind: 'attack', targetEnemyIdx: 0 }),
      rng0,
    )
    expect(result).toBe('won')
    expect(Math.ceil(30 / dmg)).toBeGreaterThanOrEqual(1)
    expect(s.log.some((l) => l.includes('胜利'))).toBe(true)
  })

  test('一场 1v1:敌强玩家弱 → lost', () => {
    const s = createBattleState({
      players: [player('li', { hp: 10, attackStrength: 1, defense: 0 })],
      enemies: [mkEnemy('boss', { health: 999, attackStrength: 100, defense: 999 })],
    })
    const result = runBattleToEnd(
      s,
      (st) => st.pendingActions.set(0, { kind: 'attack', targetEnemyIdx: 0 }),
      rng0,
    )
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
    const s = createBattleState({
      players: [player('li', { attackStrength: 100 })],
      enemies: [mkEnemy('slime', { health: 40, defense: 0, dexterity: 10, level: 1 })],
    })
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
    id: '339',
    name: '雷咒',
    desc: '',
    cost: { mp: 10 },
    usableOutsideBattle: false,
    target: 'oneEnemy',
    effects: [{ kind: 'damage', power: 50, elemental: 0 }],
    animation: { effectSprite: 1 },
  }
  const caster = (): EnemyDef => ({
    ...mkEnemy('mage', { magicStrength: 60, attackStrength: 5, health: 500, defense: 0 }),
    ai: {
      resistanceToSorcery: 5,
      rules: [
        { at: 'act', when: { kind: 'chance', percent: 50 }, do: { kind: 'cast', skillId: '339' } },
      ],
    },
  })

  test('概率中 → 施法(calcMagicDamage 路径,日志记名);概率不中 → 兜底普攻', () => {
    // rng 序列:构造可控 —— 第一次 rng 用于 chance(0 → 中),后续用于目标/rngFactor
    const s = createBattleState({
      players: [player('li', { hp: 400, maxHp: 400, defense: 0 })],
      enemies: [caster()],
      skills: { '339': bolt },
    })
    stepBattle(s, rng0)
    s.pendingActions.set(0, { kind: 'defend' })
    let guard = 0
    while (s.phase !== 'selectAction' || s.turn === 1) {
      stepBattle(s, rng0)
      if (++guard > 50) break
    }
    expect(s.log.some((l) => l.includes('施展 雷咒'))).toBe(true)

    const s2 = createBattleState({
      players: [player('li')],
      enemies: [caster()],
      skills: { '339': bolt },
    })
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
      ai: {
        resistanceToSorcery: 5,
        rules: [{ at: 'act', do: { kind: 'cast', skillId: '339' }, once: true }],
      },
    }
    const s = createBattleState({
      players: [player('li', { hp: 900, maxHp: 900 })],
      enemies: [e],
      skills: { '339': bolt },
    })
    // 回合1:施法(once);回合2:规则已耗尽 → 普攻
    let casts = 0
    let attacks = 0
    runBattleToEnd(
      s,
      (st) => {
        for (const i of st.players.keys())
          if (st.players[i]!.hp > 0) st.pendingActions.set(i, { kind: 'defend' })
        if (st.turn >= 3) st.pendingActions.set(0, { kind: 'flee' })
      },
      rng0,
    )
    casts = s.log.filter((l) => l.includes('施展')).length
    attacks = s.log.filter((l) => l.includes('攻击')).length
    expect(casts).toBe(1)
    expect(attacks).toBeGreaterThanOrEqual(1)

    // 沉默:cast 规则被跳过 → 普攻
    const s3 = createBattleState({
      players: [player('li')],
      enemies: [caster()],
      skills: { '339': bolt },
    })
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
    for (const i of s.players.keys())
      if (s.players[i]!.hp > 0) s.pendingActions.set(i, { kind: 'defend' })
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
    boss.ai = {
      resistanceToSorcery: 5,
      rules: [{ at: 'act', do: { kind: 'transform', enemyId: 'truth' }, once: true }],
    }
    const s = createBattleState({
      players: [player('li', { hp: 500, maxHp: 500 })],
      enemies: [boss],
      enemiesById: { truth },
    })
    s.enemies[0]!.hp = 123 // 打残再变身
    runOneTurn(s)
    expect(s.enemies[0]!.def.id).toBe('truth')
    expect(s.enemies[0]!.hp).toBe(123) // 保血
    expect(s.enemies[0]!.firedRules.size).toBe(0) // 新形态记账清零
    expect(s.log.some((l) => l.includes('现出真身'))).toBe(true)
  })

  test('divide:仅剩一只才分裂(原版内建门);血量均分', () => {
    const blob = mkEnemy('blob', { health: 90, attackStrength: 1 })
    blob.ai = {
      resistanceToSorcery: 5,
      rules: [{ at: 'act', do: { kind: 'divide', copies: 1 }, once: true }],
    }
    // 两只在场:分裂失败(门拦下)
    const s0 = createBattleState({
      players: [player('li', { hp: 500, maxHp: 500 })],
      enemies: [blob, mkEnemy('other', { attackStrength: 1 })],
    })
    runOneTurn(s0)
    expect(s0.log.some((l) => l.includes('分裂失败'))).toBe(true)
    expect(s0.enemies.length).toBe(2)
    // 单only:成功均分
    const s = createBattleState({
      players: [player('li', { hp: 500, maxHp: 500 })],
      enemies: [blob],
    })
    runOneTurn(s)
    expect(s.enemies.length).toBe(2)
    expect(s.enemies[0]!.hp).toBe(45)
    expect(s.enemies[1]!.hp).toBe(45)

    const caller = mkEnemy('caller', { health: 200, attackStrength: 1 })
    caller.ai = {
      resistanceToSorcery: 5,
      rules: [{ at: 'act', do: { kind: 'summon', count: 9 }, once: true }],
    }
    const s2 = createBattleState({
      players: [player('li', { hp: 500, maxHp: 500 })],
      enemies: [caller],
    })
    runOneTurn(s2)
    expect(s2.enemies.length).toBe(1) // 原版 0x9E:空槽不足时整次失败，不做部分召唤
    expect(s2.log.some((l) => l.includes('召唤失败'))).toBe(true)
  })

  test('站位定死:死怪不换挡、分裂/召唤填死槽继承位置(作者报「死后错位」根治)', () => {
    const a = mkEnemy('a', { health: 10 })
    const b = mkEnemy('b', { health: 200 })
    const c = mkEnemy('c', { health: 200 })
    const s = createBattleState({ players: [player('li')], enemies: [a, b, c] })
    const posB = { ...s.enemies[1]!.basePos }
    const posC = { ...s.enemies[2]!.basePos }
    // a 死:b/c 站位纹丝不动(曾按活敌数换挡 → 全场重排)
    s.enemies[0]!.hp = 0
    expect(s.enemies[1]!.basePos).toEqual(posB)
    expect(s.enemies[2]!.basePos).toEqual(posC)
    // 分裂/召唤填死槽:继承 a 的槽位坐标,不加长数组
    const posA = { ...s.enemies[0]!.basePos }
    const blob = mkEnemy('blob', { health: 90 })
    blob.ai = {
      resistanceToSorcery: 5,
      rules: [{ at: 'act', do: { kind: 'summon', count: 1 }, once: true }],
    }
    s.enemies[1] = { ...s.enemies[1]!, def: blob, firedRules: new Set() }
    runOneTurn(s)
    expect(s.enemies.length).toBe(3) // 填槽不 push
    expect(s.enemies[0]!.hp).toBeGreaterThan(0) // 死槽被增援复活
    expect(s.enemies[0]!.basePos).toEqual(posA) // 继承槽位
    expect(s.enemies[0]!.rewardCounted).toBe(false) // 新怪再死重新计赏
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

describe('R13-5 敌实例脚本 owner / fallback / effect outcome', () => {
  test('AI 条件读取 ActorDef 模板 id，rules > instance fallback > attack', () => {
    const caster = mkEnemy('caster')
    caster.ai = {
      resistanceToSorcery: 0,
      rules: [
        {
          at: 'act',
          when: { kind: 'playerInParty', role: 'zhao-linger' },
          do: { kind: 'pass' },
        },
      ],
      fallback: {
        action: { kind: 'cast', skillId: 'bolt' },
        chancePercent: 100,
      },
    }
    const bolt: SkillData = {
      id: 'bolt',
      name: '雷',
      desc: '',
      cost: { mp: 0 },
      target: 'oneEnemy',
      usableOutsideBattle: false,
      effects: [],
      animation: { effectSprite: 0 },
    }
    const state = createBattleState({
      players: [
        player('instance-42', {
          actorTemplateId: 'zhao-linger',
        }),
      ],
      enemies: [caster],
      skills: { bolt },
    })
    const view = buildAiView(state, state.enemies[0]!)
    expect(view.players[0]?.role).toBe('zhao-linger')
    expect(decideEnemyAction(state, state.enemies[0]!, rng0)).toEqual({ kind: 'pass' })

    caster.ai.rules = []
    expect(decideEnemyAction(state, state.enemies[0]!, rng0)).toMatchObject({
      kind: 'cast',
      skill: bolt,
    })
    state.enemies[0]!.fallback = undefined
    expect(decideEnemyAction(state, state.enemies[0]!, rng0).kind).toBe('attack')
  })

  test('transform 保留 script owner/cursor，切 current fallback/rules 并清 fired', () => {
    const source = mkEnemy('source')
    source.ai = {
      resistanceToSorcery: 0,
      fallback: { action: { kind: 'pass' }, chancePercent: 100 },
      hooks: {
        ready: {
          initial: 'source-state',
          states: {
            'source-state': { body: [], next: { kind: 'stay' } },
          },
        },
      },
    }
    source.onDefeated = [{ kind: 'giveItem', itemId: 'source-reward' }]
    const target = mkEnemy('target')
    target.ai = {
      resistanceToSorcery: 0,
      fallback: {
        action: { kind: 'cast', skillId: 'target-magic' },
        chancePercent: 25,
      },
    }
    const state = createBattleState({
      players: [player('hero')],
      enemies: [source],
      enemiesById: { target },
    })
    const instance = state.enemies[0]!
    instance.firedRules.add(3)
    const result = applyEnemyEffect(state, 0, {
      kind: 'transform',
      enemyId: 'target',
    })
    expect(result.outcome).toBe('succeeded')
    expect(instance.def).toBe(target)
    expect(instance.scriptOwnerDef).toBe(source)
    expect(instance.hookCursors).toEqual({ ready: 'source-state' })
    expect(instance.fallback).toEqual(target.ai.fallback)
    expect(instance.fallback).not.toBe(target.ai.fallback)
    expect(instance.firedRules.size).toBe(0)
  })

  test('divide 深拷 owner/cursor/fallback/fired；summon 使用目标 initial state', () => {
    const source = mkEnemy('source', { health: 90 })
    source.ai = {
      resistanceToSorcery: 0,
      fallback: { action: { kind: 'pass' }, chancePercent: 70 },
      hooks: {
        ready: {
          initial: 'retry',
          states: { retry: { body: [], next: { kind: 'stay' } } },
        },
      },
    }
    const summoned = mkEnemy('summoned')
    summoned.ai = {
      resistanceToSorcery: 0,
      hooks: {
        turnStart: {
          initial: 'intro',
          states: { intro: { body: [], next: { kind: 'stay' } } },
        },
      },
    }
    const divideState = createBattleState({
      players: [player('hero')],
      enemies: [source],
    })
    divideState.enemies[0]!.firedRules.add(2)
    expect(applyEnemyEffect(divideState, 0, { kind: 'divide', copies: 1 }).outcome).toBe(
      'succeeded',
    )
    const copy = divideState.enemies[1]!
    expect(copy.scriptOwnerDef).toBe(source)
    expect(copy.hookCursors).toEqual({ ready: 'retry' })
    expect(copy.hookCursors).not.toBe(divideState.enemies[0]!.hookCursors)
    expect(copy.fallback).toEqual(source.ai.fallback)
    expect(copy.fallback).not.toBe(divideState.enemies[0]!.fallback)
    expect([...copy.firedRules]).toEqual([2])

    const summonState = createBattleState({
      players: [player('hero')],
      enemies: [source],
      enemiesById: { summoned },
    })
    const result = applyEnemyEffect(summonState, 0, {
      kind: 'summon',
      enemyId: 'summoned',
      count: 1,
    })
    expect(result.outcome).toBe('succeeded')
    const child = summonState.enemies[result.spawnedIdxs![0]!]!
    expect(child.def).toBe(summoned)
    expect(child.scriptOwnerDef).toBe(summoned)
    expect(child.hookCursors).toEqual({ turnStart: 'intro' })
    expect(child.firedRules.size).toBe(0)
  })

  test('summon 空槽不足整体失败，状态门失败不产生部分 mutation', () => {
    const caller = mkEnemy('caller')
    const target = mkEnemy('target')
    const state = createBattleState({
      players: [player('hero')],
      enemies: [caller, mkEnemy('b'), mkEnemy('c'), mkEnemy('d')],
      enemiesById: { target },
    })
    const before = state.enemies.map((enemy) => enemy.def.id)
    expect(
      applyEnemyEffect(state, 0, {
        kind: 'summon',
        enemyId: 'target',
        count: 2,
      }).outcome,
    ).toBe('failed')
    expect(state.enemies.map((enemy) => enemy.def.id)).toEqual(before)

    state.enemies[0]!.status.sleep = 1
    expect(
      applyEnemyEffect(state, 0, {
        kind: 'transform',
        enemyId: 'target',
      }).outcome,
    ).toBe('failed')
    expect(state.enemies[0]!.def).toBe(caller)
  })
})

describe('M4b-3 玩家仙术', () => {
  const bolt2: import('@type-pal/content').SkillData = {
    id: '300',
    name: '御剑术',
    desc: '',
    cost: { mp: 5 },
    usableOutsideBattle: false,
    target: 'oneEnemy',
    effects: [{ kind: 'damage', power: 30, elemental: 0 }],
    animation: { effectSprite: 1 },
  }
  const heal: import('@type-pal/content').SkillData = {
    id: '296',
    name: '气疗术',
    desc: '',
    cost: { mp: 6 },
    usableOutsideBattle: true,
    target: 'oneAlly',
    effects: [{ kind: 'healHp', amount: 75 }],
    animation: { effectSprite: 27 },
  }
  test('对敌施法:扣 MP + calcMagicDamage 用敌方真实元素抗;奶自己回血;MP 不足空过', () => {
    const s = createBattleState({
      players: [
        player('li', { hp: 20, maxHp: 200, mp: 30, magicStrength: 50, skills: ['300', '296'] }),
      ],
      enemies: [mkEnemy('e', { health: 500, defense: 0, attackStrength: 1 })],
      skills: { '300': bolt2, '296': heal },
    })
    stepBattle(s, rng0)
    s.pendingActions.set(0, { kind: 'cast', skillId: '300', targetEnemyIdx: 0 })
    let guard = 0
    while (s.phase !== 'selectAction' || s.turn === 1) {
      stepBattle(s, rng0)
      if (++guard > 50) break
    }
    expect(s.players[0]!.mp).toBe(25) // 30-5
    expect(s.log.some((l) => l.includes('施展 御剑术'))).toBe(true)
    expect(s.enemies[0]!.hp).toBeLessThan(500)

    s.pendingActions.set(0, { kind: 'cast', skillId: '296' }) // 奶自己(oneAlly 无敌目标)
    guard = 0
    while (s.phase !== 'selectAction' || s.turn === 2) {
      stepBattle(s, rng0)
      if (++guard > 50) break
    }
    expect(s.players[0]!.mp).toBe(19)
    expect(s.players[0]!.hp).toBeGreaterThan(20)

    // MP 耗尽 + 攻击系:降级普攻(fight.c:3316 降级链;曾空过)
    s.players[0]!.mp = 2
    const eHpBefore = s.enemies[0]!.hp
    s.pendingActions.set(0, { kind: 'cast', skillId: '300', targetEnemyIdx: 0 })
    guard = 0
    while (s.phase !== 'selectAction' || s.turn === 3) {
      stepBattle(s, rng0)
      if (++guard > 50) break
    }
    expect(s.log.some((l) => l.includes('降级普攻'))).toBe(true)
    expect(s.players[0]!.mp).toBe(2) // 未扣
    expect(s.enemies[0]!.hp).toBeLessThan(eHpBefore) // 物攻真落敌
  })
})

describe('降级链:出手时刻验证(fight.c:3260-3506 PAL_BattlePlayerValidateAction)', () => {
  const bolt: import('@type-pal/content').SkillData = {
    id: '300',
    name: '御剑术',
    desc: '',
    cost: { mp: 5 },
    usableOutsideBattle: false,
    target: 'oneEnemy',
    effects: [{ kind: 'damage', power: 30, elemental: 0 }],
    animation: { effectSprite: 1 },
  }
  const heal: import('@type-pal/content').SkillData = {
    id: '296',
    name: '气疗术',
    desc: '',
    cost: { mp: 6 },
    usableOutsideBattle: true,
    target: 'oneAlly',
    effects: [{ kind: 'healHp', amount: 75 }],
    animation: { effectSprite: 27 },
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
    while (s.phase !== 'selectAction' || s.turn === 1) {
      stepBattle(s, rng0)
      if (++guard > 50) break
    }
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
    while (s.phase !== 'selectAction' || s.turn === 1) {
      stepBattle(s, rng0)
      if (++guard > 50) break
    }
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
      id: '296',
      name: '气疗术',
      desc: '',
      cost: { mp: 6 },
      usableOutsideBattle: true,
      target: 'oneAlly',
      effects: [{ kind: 'healHp', amount: 75 }],
      animation: { effectSprite: 27 },
    }
    const build = (
      act: import('./battle-core.js').BattleAction,
      o: { hp?: number; enemyDex?: number } = {},
    ) => {
      const s = createBattleState({
        players: [player('li', { hp: o.hp ?? 400, maxHp: 400 })],
        enemies: [
          mkEnemy('e', {
            level: 1,
            dexterity: o.enemyDex ?? 10,
            health: 500,
            attackStrength: -999,
          }),
        ],
        skills: { '296': heal },
      })
      stepBattle(s, rng0)
      s.pendingActions.set(0, act)
      stepBattle(s, rng0) // build queue
      return s
    }
    // 敌 base (1+6)*3+52=73(×0.9=65) > 玩家普攻 50×0.9=45 → 敌先
    expect(
      build({ kind: 'attack', targetEnemyIdx: 0 }, { enemyDex: 52 }).actionQueue[0]!.isEnemy,
    ).toBe(true)
    // 防御×5 → 225 → 玩家反超(×5 排序提前与"出手时才置位"成对 = 原版"防得住"的机制)
    expect(build({ kind: 'defend' }, { enemyDex: 52 }).actionQueue[0]!.isEnemy).toBe(false)
    // 辅助法术×3 → 135 → 玩家先;物品×3 同
    expect(build({ kind: 'cast', skillId: '296' }, { enemyDex: 52 }).actionQueue[0]!.isEnemy).toBe(
      false,
    )
    expect(build({ kind: 'item', itemId: 'x' }, { enemyDex: 52 }).actionQueue[0]!.isEnemy).toBe(
      false,
    )
    // 逃跑÷2 → 22 < 敌 dex10(31×0.9=27) → 敌反超
    expect(build({ kind: 'flee' }).actionQueue[0]!.isEnemy).toBe(true)
    // 濒死÷2(fight.c:1557 队列口,区别于非 classic 的 stat 级):hp 60<min(100,80) → 普攻 22 < 27
    expect(build({ kind: 'attack', targetEnemyIdx: 0 }, { hp: 60 }).actionQueue[0]!.isEnemy).toBe(
      true,
    )
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
      id: '61',
      name: '金创药',
      desc: '',
      price: 50,
      bitmap: 0,
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
  const runSingleItemAction = (item: ItemData, action: import('./battle-core.js').BattleAction) => {
    const s = createBattleState({
      players: [player('li', { poisonRes: 10 })],
      enemies: [mkEnemy('e', { attackStrength: -999, health: 500 })],
      items: { [item.id]: item },
      inventory: [{ itemId: item.id, count: 1 }],
    })
    stepBattle(s, rng0)
    s.enemies[0]!.status.sleep = 99
    s.pendingActions.set(0, action)
    let guard = 0
    do stepBattle(s, rng0)
    while (s.phase === 'performAction' && guard++ < 40)
    return s
  }

  test('世界专用用途与非法投掷在扣库存前拒绝；大蒜战斗毒抗有真实消费方', () => {
    const worldScript: ItemData = {
      id: 'story',
      name: '剧情道具',
      desc: [],
      buyPrice: 0,
      sellPrice: 0,
      sellable: false,
      use: {
        target: 'scene',
        consuming: true,
        effects: [
          {
            kind: 'runScript',
            script: { chunk: 'shared/c00', id: 'shared/user/story' },
          },
        ],
      },
    }
    const rejectedUse = runSingleItemAction(worldScript, { kind: 'item', itemId: 'story' })
    expect(rejectedUse.inventory[0]!.count).toBe(1)
    expect(rejectedUse.log.some((line) => line.includes('不能在战斗中使用'))).toBe(true)
    expect(rejectedUse.log.some((line) => line.includes('防御'))).toBe(true)

    const invalidThrow = {
      ...worldScript,
      id: 'bad-throw',
      name: '错误投掷配置',
      use: undefined,
      throw: { target: 'oneEnemy', effects: [{ kind: 'healHp', amount: 10 }] },
    } as unknown as ItemData
    const rejectedThrow = runSingleItemAction(invalidThrow, {
      kind: 'throw',
      itemId: 'bad-throw',
      targetEnemyIdx: 0,
    })
    expect(rejectedThrow.inventory[0]!.count).toBe(1)
    expect(rejectedThrow.log.some((line) => line.includes('投掷数据无效'))).toBe(true)

    const emptyThrow: ItemData = {
      ...worldScript,
      id: 'empty-throw',
      name: '未完成投掷配置',
      use: undefined,
      throw: { target: 'oneEnemy', effects: [] },
    }
    const rejectedEmptyThrow = runSingleItemAction(emptyThrow, {
      kind: 'throw',
      itemId: 'empty-throw',
      targetEnemyIdx: 0,
    })
    expect(rejectedEmptyThrow.inventory[0]!.count).toBe(1)
    expect(rejectedEmptyThrow.log.some((line) => line.includes('投掷数据无效'))).toBe(true)

    const garlic: ItemData = {
      ...worldScript,
      id: 'garlic',
      name: '大蒜',
      use: {
        target: 'oneAlly',
        consuming: true,
        effects: [{ kind: 'extraPoisonRes', amount: 30 }],
      },
    }
    const used = runSingleItemAction(garlic, { kind: 'item', itemId: 'garlic' })
    expect(used.inventory[0]!.count).toBe(0)
    expect(used.players[0]!.poisonRes).toBe(40)

    const repeatedGarlic: ItemData = {
      ...garlic,
      id: 'garlic-repeat',
      use: {
        ...garlic.use!,
        effects: [
          { kind: 'extraPoisonRes', amount: 30 },
          { kind: 'extraPoisonRes', amount: 30 },
        ],
      },
    }
    const refreshed = runSingleItemAction(repeatedGarlic, {
      kind: 'item',
      itemId: 'garlic-repeat',
    })
    expect(refreshed.players[0]!.poisonRes).toBe(40)
    expect(refreshed.players[0]!.itemPoisonResBonus).toBe(30)
  })

  test('物品:回血 + consuming 扣库存;逃跑:str vs Σ敌(吉运+(lv+6)*4) 掷骰', () => {
    const potion: import('@type-pal/content').ItemData = {
      id: '61',
      name: '金创药',
      desc: '',
      price: 50,
      bitmap: 0,
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
    while (s.phase !== 'selectAction' || s.turn === 1) {
      stepBattle(s, rng0)
      if (++guard > 50) break
    }
    // 回 50 → 60;敌 str 钳 0 后伤害走保底 1(fight.c:5070-5073)→ 59
    expect(s.players[0]!.hp).toBe(59)
    expect(s.inventory[0]!.count).toBe(1)

    // 逃跑失败:str 低 + rng 高 → roll 大
    const s2 = createBattleState({
      players: [player('li', { fleeRate: 0 })],
      enemies: [mkEnemy('e', { level: 10, fleeRate: 50, health: 500, attackStrength: 1 })],
    })
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

  test('金蚕王与遇敌香写入通用持久队列；成长只加基础值且不回满血蓝', () => {
    const genericItems: Record<string, ItemData> = {
      level: {
        id: 'level',
        name: '金蚕王',
        desc: [],
        buyPrice: 0,
        sellPrice: 0,
        sellable: false,
        use: {
          target: 'oneAlly',
          consuming: true,
          effects: [{ kind: 'levelUp', levels: 1 }],
        },
      },
      incense: {
        id: 'incense',
        name: '驱魔香',
        desc: [],
        buyPrice: 0,
        sellPrice: 0,
        sellable: false,
        use: {
          target: 'scene',
          consuming: true,
          effects: [{ kind: 'modifyHostileAwareness', rangeMultiplier: 0, durationMs: 60_000 }],
        },
      },
    }
    const persistentProgress = {
      level: 1,
      exp: 77,
      maxHP: 100,
      maxMP: 30,
      attack: 40,
      magicAttack: 20,
      defense: 30,
      speed: 50,
      luck: 20,
    }
    const s = createBattleState({
      players: [player('li', { hp: 40, mp: 9, persistentProgress })],
      enemies: [mkEnemy('e', { attackStrength: -999, health: 500 })],
      items: genericItems,
      inventory: [
        { itemId: 'level', count: 1 },
        { itemId: 'incense', count: 1 },
      ],
    })
    stepBattle(s, rng0)
    s.enemies[0]!.status.sleep = 99
    s.pendingActions.set(0, { kind: 'item', itemId: 'level' })
    let guard = 0
    do stepBattle(s, rng0)
    while (s.phase === 'performAction' && guard++ < 40)
    expect(s.players[0]).toMatchObject({
      hp: 40,
      mp: 9,
      maxHp: 110,
      maxMp: 38,
      attackStrength: 44,
      magicStrength: 24,
      defense: 32,
      baseDexterity: 52,
      fleeRate: 22,
    })
    expect(s.pendingWorldMutations[0]).toEqual({
      kind: 'characterGrowth',
      characterId: 'li',
      delta: {
        level: 1,
        maxHP: 10,
        maxMP: 8,
        attack: 4,
        magicAttack: 4,
        defense: 2,
        speed: 2,
        luck: 2,
      },
      expAfter: 0,
    })
    expect(persistentProgress).toMatchObject({ level: 1, exp: 77 })

    s.enemies[0]!.status.sleep = 99
    s.pendingActions.set(0, { kind: 'item', itemId: 'incense' })
    guard = 0
    do stepBattle(s, rng0)
    while (s.phase === 'performAction' && guard++ < 40)
    expect(s.pendingWorldMutations[1]).toEqual({
      kind: 'hostileAwareness',
      value: { rangeMultiplier: 0, remainingMs: 60_000 },
    })
  })

  test('战斗 allAllies 逐个回复活着的队员，不再只作用施用者', () => {
    const feast: ItemData = {
      id: 'feast',
      name: '全体药',
      desc: [],
      buyPrice: 0,
      sellPrice: 0,
      sellable: false,
      use: {
        target: 'allAllies',
        consuming: true,
        effects: [{ kind: 'healHp', amount: 25 }],
      },
    }
    const s = createBattleState({
      players: [player('li', { hp: 10, maxHp: 100 }), player('ling', { hp: 20, maxHp: 100 })],
      enemies: [mkEnemy('e', { attackStrength: -999, health: 500 })],
      items: { feast },
      inventory: [{ itemId: 'feast', count: 1 }],
    })
    stepBattle(s, rng0)
    s.enemies[0]!.status.sleep = 99
    s.pendingActions.set(0, { kind: 'item', itemId: 'feast' })
    s.pendingActions.set(1, { kind: 'defend' })
    let guard = 0
    do stepBattle(s, rng0)
    while (s.phase === 'performAction' && guard++ < 40)
    expect(s.players.map((member) => member.hp)).toEqual([35, 45])
    expect(s.inventory[0]!.count).toBe(0)
  })

  test('战斗 0x06 门失败仍按原版消耗：roll 49 通过、roll 50 失败', () => {
    const gated: ItemData = {
      id: 'salt',
      name: '盐巴',
      desc: [],
      buyPrice: 0,
      sellPrice: 0,
      sellable: false,
      use: {
        target: 'oneAlly',
        consuming: true,
        effects: [
          { kind: 'gate', chance: 50 },
          { kind: 'healHp', amount: 10 },
        ],
      },
    }
    const run = (rng: () => number) => {
      const s = createBattleState({
        players: [player('li', { hp: 10, maxHp: 100 })],
        enemies: [mkEnemy('e', { attackStrength: -999, health: 500 })],
        items: { salt: gated },
        inventory: [{ itemId: 'salt', count: 1 }],
      })
      stepBattle(s, rng)
      s.enemies[0]!.status.sleep = 99
      s.pendingActions.set(0, { kind: 'item', itemId: 'salt' })
      let guard = 0
      do stepBattle(s, rng)
      while (s.phase === 'performAction' && guard++ < 40)
      return s
    }
    expect(run(() => 0.48).players[0]!.hp).toBe(20)
    const failed = run(() => 0.49)
    expect(failed.players[0]!.hp).toBe(10)
    expect(failed.inventory[0]!.count).toBe(0)
    expect(failed.log.some((line) => line.includes('无任何效果'))).toBe(true)
  })

  test('gate 缺省阈值 100 仍遵循严格小于：roll 100 失败且与大世界一致', () => {
    const defaultGate: ItemData = {
      id: 'default-gate',
      name: '缺省概率物',
      desc: [],
      buyPrice: 0,
      sellPrice: 0,
      sellable: false,
      use: {
        target: 'oneAlly',
        consuming: true,
        effects: [{ kind: 'gate' }, { kind: 'healHp', amount: 10 }],
      },
    }
    const s = createBattleState({
      players: [player('li', { hp: 10, maxHp: 100 })],
      enemies: [mkEnemy('e', { attackStrength: -999, health: 500 })],
      items: { 'default-gate': defaultGate },
      inventory: [{ itemId: 'default-gate', count: 1 }],
    })
    stepBattle(s, () => 0.999)
    s.enemies[0]!.status.sleep = 99
    s.pendingActions.set(0, { kind: 'item', itemId: 'default-gate' })
    let guard = 0
    do stepBattle(s, () => 0.999)
    while (s.phase === 'performAction' && guard++ < 40)
    expect(s.players[0]!.hp).toBe(10)
    expect(s.inventory[0]!.count).toBe(0)
  })
})

describe('敌法术:防御除因子 + 被动格挡(fight.c:4673-4853)', () => {
  const ZERO = { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 }
  const bolt: import('@type-pal/content').SkillData = {
    id: '339',
    name: '雷咒',
    desc: '',
    cost: { mp: 10 },
    usableOutsideBattle: false,
    target: 'oneEnemy',
    effects: [{ kind: 'damage', power: 50, elemental: 0 }],
    animation: { effectSprite: 1 },
  }
  const mage = (o: Partial<EnemyDef['stats']> = {}): EnemyDef => ({
    ...mkEnemy('mage', { magicStrength: 60, attackStrength: 5, health: 500, defense: 0, ...o }),
    ai: { resistanceToSorcery: 5, rules: [{ at: 'act', do: { kind: 'cast', skillId: '339' } }] },
  })
  // 期望原始伤害走真公式(magStr 含级数项 (级+6)×6 —— fight.c:4673,曾漏):
  const raw = (rngFactor: number, def: number, magicStrength = 60, level = 1, power = 50) =>
    calcMagicDamage({
      magStr: Math.max(0, magicStrength + (level + 6) * 6),
      def,
      rngFactor,
      magicData: { baseDamage: power, elemental: 0 },
      elemRes: ZERO,
      poisonRes: 0,
      resistMult: 20,
      fieldEffect: ZERO,
    })
  const castDmg = (s: ReturnType<typeof createBattleState>): number =>
    Number(/造成 (\d+)/.exec(s.log.find((l) => l.includes('施展 雷咒')) ?? '')?.[1] ?? -1)
  const runTurn1 = (
    s: ReturnType<typeof createBattleState>,
    rng: () => number,
    act: () => void,
  ): void => {
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
    const s = createBattleState({
      players: [player('li')],
      enemies: [mage()],
      skills: { '339': bolt },
    })
    runTurn1(s, rng0, () => s.pendingActions.set(0, { kind: 'defend' }))
    expect(castDmg(s)).toBe(Math.trunc(raw(1, 30) / 3)) // (防2)×(护1)+(挡1)=3
    expect(s.lastAction?.kind).toBe('cast')
    expect(s.lastAction?.autoDefend).toEqual([0])
  })

  test('防御+护体+格挡全叠:除因子 5(最深)', () => {
    const s = createBattleState({
      players: [player('li')],
      enemies: [mage()],
      skills: { '339': bolt },
    })
    s.players[0]!.status.protect = 3
    runTurn1(s, rng0, () => s.pendingActions.set(0, { kind: 'defend' }))
    expect(castDmg(s)).toBe(Math.trunc(raw(1, 30) / 5))
  })

  test('眠者无格挡资格:rng0 本该必中,除因子回 1 全额', () => {
    const s = createBattleState({
      players: [player('li')],
      enemies: [mage()],
      skills: { '339': bolt },
    })
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
    const s = createBattleState({
      players: [player('li', { hp: 5 })],
      enemies: [mage()],
      skills: { '339': bolt },
    })
    runTurn1(s, rng0, () => s.pendingActions.set(0, { kind: 'defend' }))
    expect(castDmg(s)).toBe(5)
    expect(s.players[0]!.hp).toBe(0)

    // 无最小 1:magStr = -99+42 = -57 → 钳 0;power 0 → calcBaseDamage(0,30)=0 → 造成 0
    const bolt0 = { ...bolt, effects: [{ kind: 'damage' as const, power: 0, elemental: 0 }] }
    const s2 = createBattleState({
      players: [player('li')],
      enemies: [mage({ magicStrength: -99 })],
      skills: { '339': bolt0 },
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
    551: {
      id: 551,
      name: '赤毒',
      curability: 'common',
      color: 16,
      playerTicks: [{ hpDelta: -7 }],
      enemyTicks: [{ hpDelta: -7 }],
    },
    555: {
      id: 555,
      name: '三尸蛊毒',
      curability: 'severe',
      color: 128,
      playerTicks: [
        { hpDelta: 0 },
        { hpDelta: -1 },
        { hpDelta: -2 },
        { hpDelta: -3 },
        { hpDelta: -200, selfCure: true },
      ],
      enemyTicks: [{ hpDelta: -111 }, { hpDelta: -222 }, { hpDelta: -333, selfCure: true }],
    },
    137: {
      id: 137,
      name: '无影毒',
      curability: 'incurable',
      color: 0,
      enemyTicks: [{ halveHp: 1000, selfCure: true }],
    },
    561: {
      id: 561,
      name: '食妖虫附',
      curability: 'incurable',
      color: 0,
      enemyTicks: [
        { hpDelta: -1 },
        { hpDelta: -2 },
        { hpDelta: -8, grantItem: '145', selfCure: true },
      ],
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
    oneTurn(s, () => {
      sleepEnemy(s)
      s.pendingActions.set(0, { kind: 'defend' })
    })
    expect(s.players[0]!.hp).toBe(93)
    oneTurn(s, () => {
      sleepEnemy(s)
      s.pendingActions.set(0, { kind: 'defend' })
    })
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
    const turn = () =>
      oneTurn(s, () => {
        sleepEnemy(s)
        s.pendingActions.set(0, { kind: 'defend' })
      })
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
    const host = {
      hp: 100,
      poisons: [
        { poisonId: 551, tickIndex: 0 },
        { poisonId: 555, tickIndex: 0 },
        { poisonId: 137, tickIndex: 0 },
      ],
    }
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
    id: '116',
    name: '尸腐肉',
    desc: [],
    buyPrice: 0,
    sellPrice: 0,
    sellable: false,
    use: {
      target: 'oneAlly',
      consuming: true,
      effects: [{ kind: 'applyPoison', poisonId: '552' }],
    },
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
    '144': {
      id: '144',
      name: '食妖虫',
      desc: [],
      buyPrice: 0,
      sellPrice: 0,
      sellable: false,
      throw: { target: 'oneEnemy', effects: [{ kind: 'applyPoison', poisonId: '561' }] },
    },
  }
  const PARASITE: Record<number, import('@type-pal/content').PoisonDef> = {
    561: {
      id: 561,
      name: '食妖虫附',
      curability: 'incurable',
      color: 0,
      // 施毒当下先跑 −1，同轮回合末再跑 −2；下一回合才到末段 −8 + 产物。
      enemyTicks: [
        { hpDelta: -1 },
        { hpDelta: -2 },
        { hpDelta: -8, grantItem: '145', selfCure: true },
      ],
    },
  }
  test('投掷目标在出手前死亡时环扫改投下一名活敌', () => {
    const s = createBattleState({
      players: [player('li', { attackStrength: 0 })],
      enemies: [
        mkEnemy('dead', { health: 10 }),
        mkEnemy('alive', { health: 999, attackStrength: -999 }),
      ],
      items: THROW_ITEMS,
      inventory: [{ itemId: '144', count: 1 }],
      poisonDefs: PARASITE,
    })
    s.enemies[0]!.def.ai.resistanceToSorcery = 0
    s.enemies[1]!.def.ai.resistanceToSorcery = 0
    stepBattle(s, () => 0.5)
    s.enemies[0]!.hp = 0
    s.enemies[1]!.status.sleep = 99
    s.pendingActions.set(0, { kind: 'throw', itemId: '144', targetEnemyIdx: 0 })
    let guard = 0
    do stepBattle(s, () => 0.5)
    while (s.phase === 'performAction' && guard++ < 40)
    expect(s.enemies[0]!.poisons).toHaveLength(0)
    expect(s.enemies[1]!.poisons.map((poison) => poison.poisonId)).toEqual([561])
    expect(s.inventory.find((entry) => entry.itemId === '144')?.count).toBe(0)
  })

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

  test('无影毒按敌人当前生命的一半加一扣血，并封顶 1000', () => {
    const poison: ItemData = {
      id: '137',
      name: '无影毒',
      desc: [],
      buyPrice: 0,
      sellPrice: 0,
      sellable: false,
      throw: {
        target: 'oneEnemy',
        effects: [
          {
            kind: 'currentHpDamage',
            numerator: 1,
            denominator: 2,
            bonus: 1,
            cap: 1000,
          },
        ],
      },
    }
    const s = createBattleState({
      players: [player('li')],
      enemies: [mkEnemy('boss', { health: 3000, attackStrength: 0 })],
      items: { '137': poison },
      inventory: [{ itemId: '137', count: 1 }],
    })
    stepBattle(s, rng0)
    s.enemies[0]!.status.sleep = 99
    s.pendingActions.set(0, { kind: 'throw', itemId: '137', targetEnemyIdx: 0 })
    let guard = 0
    do stepBattle(s, rng0)
    while (s.phase === 'performAction' && guard++ < 40)
    expect(s.enemies[0]!.hp).toBe(2000)
    expect(s.inventory[0]!.count).toBe(0)
    expect(s.log.some((line) => line.includes('受到 1000 伤害'))).toBe(true)
  })
})

describe('R13-3 投掷专用效果链', () => {
  const runThrow = (
    thrown: NonNullable<ItemData['throw']>,
    options: {
      enemies?: EnemyDef[]
      player?: Partial<CreatePlayerInput>
      rng?: number[]
      targetEnemyIdx?: number
      poisonDefs?: Record<number, import('@type-pal/content').PoisonDef>
      prepare?: (state: ReturnType<typeof createBattleState>) => void
    } = {},
  ) => {
    let calls = 0
    const values = options.rng ?? []
    const rng = () => values[calls++] ?? 0
    const item: ItemData = {
      id: 'r13-throw',
      name: '投掷测试物',
      desc: [],
      buyPrice: 0,
      sellPrice: 0,
      sellable: false,
      throw: thrown,
    }
    const s = createBattleState({
      players: [
        player('li', {
          baseDexterity: 500,
          attackStrength: 40,
          ...options.player,
        }),
      ],
      enemies: options.enemies ?? [
        mkEnemy('target', { health: 1000, defense: 0, dexterity: 0, attackStrength: -999 }),
      ],
      items: { [item.id]: item },
      inventory: [{ itemId: item.id, count: 1 }],
      poisonDefs: options.poisonDefs,
    })
    stepBattle(s, rng)
    options.prepare?.(s)
    s.pendingActions.set(0, {
      kind: 'throw',
      itemId: item.id,
      ...(options.targetEnemyIdx === undefined ? {} : { targetEnemyIdx: options.targetEnemyIdx }),
    })
    stepBattle(s, rng)
    expect(s.actionQueue[0]?.isEnemy).toBe(false)
    stepBattle(s, rng)
    return { s, calls }
  }

  test('0x42/0x66 共用 SimulateMagic：baseDamage 参与，敌等级防御项生效', () => {
    const { s } = runThrow(
      {
        target: 'oneEnemy',
        effects: [
          {
            kind: 'magicDamage',
            baseDamage: 198,
            element: 'none',
            strength: { kind: 'fixed', value: 110 },
          },
        ],
      },
      {
        enemies: [
          mkEnemy('target', {
            health: 1000,
            level: 1,
            defense: 46,
            dexterity: 0,
            attackStrength: -999,
          }),
        ],
        rng: [0, 0, 0],
        targetEnemyIdx: 0,
      },
    )
    expect(1000 - s.enemies[0]!.hp).toBe(223)
  })

  test('sentinel magic 允许 minDamage=0，不伪造保底伤害', () => {
    const { s } = runThrow(
      {
        target: 'oneEnemy',
        effects: [
          {
            kind: 'magicDamage',
            baseDamage: -999,
            element: 'none',
            strength: { kind: 'fixed', value: 0 },
          },
        ],
      },
      { rng: [0, 0, 0], targetEnemyIdx: 0 },
    )
    expect(s.enemies[0]!.hp).toBe(1000)
    expect(s.lastAction?.throwHits).toEqual([{ idx: 0, value: 0 }])
  })

  test('0x66 全体投掷：力量按 effect/action 只掷一次，伤害浮动逐敌独立', () => {
    const enemies = [
      mkEnemy('a', {
        health: 5000,
        level: 1,
        defense: 46,
        dexterity: 0,
        attackStrength: -999,
      }),
      mkEnemy('b', {
        health: 5000,
        level: 1,
        defense: 46,
        dexterity: 0,
        attackStrength: -999,
      }),
    ]
    const { s, calls } = runThrow(
      {
        target: 'allEnemies',
        effects: [
          {
            kind: 'magicDamage',
            baseDamage: 198,
            element: 'none',
            strength: {
              kind: 'casterAttack',
              bonus: 10,
              multiplier: { kind: 'uniformInt', min: 0, max: 3 },
            },
          },
        ],
      },
      {
        enemies,
        // 建队列 3 掷；力量取 inclusive 3；两敌伤害浮动分别取 1.0 / 约 1.1。
        rng: [0, 0, 0, 0.999999, 0, 0.999999],
      },
    )
    const strength = 10 + 40 * 3
    const base = {
      magStr: strength,
      def: 74,
      magicData: { baseDamage: 198, elemental: 0 },
      elemRes: enemies[0]!.stats.elemResistance,
      poisonRes: 0,
      resistMult: 1,
      fieldEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    }
    expect(5000 - s.enemies[0]!.hp).toBe(calcMagicDamage({ ...base, rngFactor: 1 }))
    expect(5000 - s.enemies[1]!.hp).toBeCloseTo(
      calcMagicDamage({ ...base, rngFactor: 1 + 0.999999 * 0.1 }),
      8,
    )
    expect(s.enemies[1]!.hp).toBeLessThan(s.enemies[0]!.hp)
    expect(calls).toBe(6)
    expect(s.inventory[0]!.count).toBe(0)
  })

  test('applyStatus stopTarget：一个目标抵抗不截断其他目标，且每目标只掷一次', () => {
    const { s, calls } = runThrow(
      {
        target: 'allEnemies',
        effects: [
          { kind: 'applyStatus', status: 'sleep', turns: 3, onResist: 'stopTarget' },
          { kind: 'fixedDamage', amount: 25 },
        ],
      },
      {
        enemies: [
          mkEnemy('resist', { health: 100, dexterity: 0, attackStrength: -999 }),
          mkEnemy('hit', { health: 100, dexterity: 0, attackStrength: -999 }),
        ],
        // 建队列 3 掷；0.4 被巫抗 5 挡，0.5 命中。
        rng: [0, 0, 0, 0.4, 0.5],
      },
    )
    expect(s.enemies[0]!.status.sleep).toBe(0)
    expect(s.enemies[0]!.hp).toBe(100)
    expect(s.enemies[1]!.status.sleep).toBe(3)
    expect(s.enemies[1]!.hp).toBe(75)
    expect(s.lastAction?.notice).toBe('攻击无效')
    expect(calls).toBe(5)
  })

  test('applyStatus continue：抵抗后仍执行本目标后续效果', () => {
    const { s } = runThrow(
      {
        target: 'oneEnemy',
        effects: [
          { kind: 'applyStatus', status: 'sleep', turns: 3, onResist: 'continue' },
          { kind: 'fixedDamage', amount: 25 },
        ],
      },
      { rng: [0, 0, 0.4], targetEnemyIdx: 0 },
    )
    expect(s.enemies[0]!.status.sleep).toBe(0)
    expect(s.enemies[0]!.hp).toBe(975)
  })

  test('applyPoison 被巫抗挡住仍继续固定伤害', () => {
    const { s } = runThrow(
      {
        target: 'oneEnemy',
        effects: [
          { kind: 'applyPoison', poisonId: '556' },
          { kind: 'fixedDamage', amount: 25 },
        ],
      },
      {
        rng: [0, 0, 0.99],
        targetEnemyIdx: 0,
        poisonDefs: {
          556: { id: 556, name: '鹤顶红', curability: 'severe', color: 0 },
        },
        prepare: (s) => {
          s.enemies[0]!.def.ai.resistanceToSorcery = 10
        },
      },
    )
    expect(s.enemies[0]!.poisons).toEqual([])
    expect(s.enemies[0]!.hp).toBe(975)
  })

  test('applyPoison 成功新增毒时立即执行 enemy tick0 并保存推进后的游标', () => {
    const { s } = runThrow(
      {
        target: 'oneEnemy',
        effects: [{ kind: 'applyPoison', poisonId: '552' }],
      },
      {
        rng: [0, 0, 0.5],
        targetEnemyIdx: 0,
        poisonDefs: {
          552: {
            id: 552,
            name: '尸毒',
            curability: 'common',
            color: 0,
            enemyTicks: [{ hpDelta: -50 }, { hpDelta: -60 }],
          },
        },
        prepare: (s) => {
          s.enemies[0]!.def.ai.resistanceToSorcery = 0
        },
      },
    )
    expect(s.enemies[0]!.hp).toBe(950)
    expect(s.enemies[0]!.poisons).toEqual([{ poisonId: 552, tickIndex: 1 }])
  })

  test('applyPoison 重复同毒不重跑首 tick；首 tick 自解与产物复用同一执行器', () => {
    const repeated = runThrow(
      {
        target: 'oneEnemy',
        effects: [{ kind: 'applyPoison', poisonId: '561' }],
      },
      {
        rng: [0, 0, 0.5],
        targetEnemyIdx: 0,
        poisonDefs: {
          561: {
            id: 561,
            name: '食妖虫附',
            curability: 'incurable',
            color: 0,
            enemyTicks: [{ hpDelta: -1 }, { hpDelta: -8, grantItem: '145', selfCure: true }],
          },
        },
        prepare: (s) => {
          s.enemies[0]!.def.ai.resistanceToSorcery = 0
          s.enemies[0]!.poisons = [{ poisonId: 561, tickIndex: 1 }]
        },
      },
    ).s
    expect(repeated.enemies[0]!.hp).toBe(1000)
    expect(repeated.enemies[0]!.poisons).toEqual([{ poisonId: 561, tickIndex: 1 }])
    expect(repeated.inventory.some((entry) => entry.itemId === '145')).toBe(false)

    const selfCured = runThrow(
      {
        target: 'oneEnemy',
        effects: [{ kind: 'applyPoison', poisonId: '561' }],
      },
      {
        rng: [0, 0, 0.5],
        targetEnemyIdx: 0,
        poisonDefs: {
          561: {
            id: 561,
            name: '食妖虫附',
            curability: 'incurable',
            color: 0,
            enemyTicks: [{ hpDelta: -8, grantItem: '145', selfCure: true }],
          },
        },
        prepare: (s) => {
          s.enemies[0]!.def.ai.resistanceToSorcery = 0
        },
      },
    ).s
    expect(selfCured.enemies[0]!.hp).toBe(992)
    expect(selfCured.enemies[0]!.poisons).toEqual([])
    expect(selfCured.inventory.find((entry) => entry.itemId === '145')?.count).toBe(1)
  })

  test('killIfHpAtMost 按逐敌满血判断，等号命中且不把失败扩散到全体', () => {
    const { s } = runThrow(
      {
        target: 'allEnemies',
        effects: [{ kind: 'killIfHpAtMost', percent: 25 }],
      },
      {
        enemies: [
          mkEnemy('equal', { health: 100, dexterity: 0, attackStrength: -999 }),
          mkEnemy('above', { health: 100, dexterity: 0, attackStrength: -999 }),
        ],
        prepare: (s) => {
          s.enemies[0]!.hp = 25
          s.enemies[1]!.hp = 26
        },
      },
    )
    expect(s.enemies[0]!.hp).toBe(0)
    expect(s.enemies[1]!.hp).toBe(26)
    expect(s.inventory[0]!.count).toBe(0)
    expect(s.lastAction?.notice).toBe('无任何效果')
  })

  test('damageAndHealCaster 正常结算并钳治疗上限', () => {
    const { s } = runThrow(
      {
        target: 'oneEnemy',
        effects: [{ kind: 'damageAndHealCaster', damage: 180, heal: 180 }],
      },
      {
        enemies: [mkEnemy('target', { health: 500, dexterity: 0, attackStrength: -999 })],
        player: { hp: 10, maxHp: 100 },
        targetEnemyIdx: 0,
      },
    )
    expect(s.enemies[0]!.hp).toBe(320)
    expect(s.players[0]!.hp).toBe(100)
  })

  test('damageAndHealCaster 过杀也按源 heal 回复，不按实际伤害折算', () => {
    const { s } = runThrow(
      {
        target: 'oneEnemy',
        effects: [{ kind: 'damageAndHealCaster', damage: 180, heal: 180 }],
      },
      {
        enemies: [mkEnemy('target', { health: 50, dexterity: 0, attackStrength: -999 })],
        player: { hp: 90, maxHp: 100 },
        targetEnemyIdx: 0,
      },
    )
    expect(s.enemies[0]!.hp).toBe(0)
    expect(s.players[0]!.hp).toBe(100)
  })

  test('没有活目标或运行时毒 id 非法时，均在扣库存前失败', () => {
    const noTarget = runThrow(
      {
        target: 'allEnemies',
        effects: [{ kind: 'fixedDamage', amount: 1 }],
      },
      {
        prepare: (s) => {
          s.enemies[0]!.hp = 0
        },
      },
    ).s
    expect(noTarget.inventory[0]!.count).toBe(1)
    expect(noTarget.log.some((line) => line.includes('没有有效目标'))).toBe(true)

    const invalidPoison = runThrow(
      {
        target: 'oneEnemy',
        effects: [{ kind: 'applyPoison', poisonId: 'not-a-number' }],
      },
      { targetEnemyIdx: 0 },
    ).s
    expect(invalidPoison.inventory[0]!.count).toBe(1)
    expect(invalidPoison.log.some((line) => line.includes('期望正整数 id'))).toBe(true)
  })
})

describe('P2 投掷致死组合(三对;数据驱动 lethalWith,仅投掷触发)', () => {
  const ITEMS: Record<string, import('@type-pal/content').ItemData> = {
    heding: {
      id: 'heding',
      name: '鹤顶红',
      desc: [],
      buyPrice: 0,
      sellPrice: 0,
      sellable: false,
      throw: { target: 'oneEnemy', effects: [{ kind: 'applyPoison', poisonId: '556' }] },
    },
  }
  const P: Record<number, import('@type-pal/content').PoisonDef> = {
    556: {
      id: 556,
      name: '鹤顶红',
      curability: 'severe',
      color: 0,
      enemyTicks: [{ hpDelta: -100 }],
      lethalWith: 557,
      counters: 558,
    },
    557: {
      id: 557,
      name: '孔雀胆',
      curability: 'severe',
      color: 0,
      enemyTicks: [{ hpDelta: -100 }],
      lethalWith: 556,
      counters: 560,
    },
  }
  test('敌已中孔雀胆(557),投鹤顶红(556)→ 双毒相冲暴毙', () => {
    const s = createBattleState({
      players: [player('li')],
      enemies: [mkEnemy('boss', { health: 9999, defense: 999, attackStrength: 0 })],
      items: ITEMS,
      inventory: [{ itemId: 'heding', count: 1 }],
      poisonDefs: P,
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
      items: ITEMS,
      inventory: [{ itemId: 'heding', count: 1 }],
      poisonDefs: P,
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
  test('巫抗满仅阻止新毒；已有配对毒仍触发投掷致死组合', () => {
    const s = createBattleState({
      players: [player('li')],
      enemies: [mkEnemy('boss', { health: 9999, defense: 999, attackStrength: 0 })],
      items: ITEMS,
      inventory: [{ itemId: 'heding', count: 1 }],
      poisonDefs: P,
    })
    s.enemies[0]!.def.ai.resistanceToSorcery = 10 // 满巫抗
    s.enemies[0]!.poisons = [{ poisonId: 557, tickIndex: 0 }] // 即便已中配对毒
    stepBattle(s, () => 0.99)
    s.pendingActions.set(0, { kind: 'throw', itemId: 'heding', targetEnemyIdx: 0 })
    let g = 0
    do stepBattle(s, () => 0.99)
    while (s.phase === 'performAction' && g++ < 40)
    expect(s.enemies[0]!.hp).toBe(0)
    expect(s.log.some((l) => l.includes('暴毙'))).toBe(true)
    expect(s.enemies[0]!.poisons.map((p) => p.poisonId)).toEqual([557]) // 鹤顶红未上(巫抗挡)
  })
  test('巫抗满且没有配对毒时：新毒被挡，也不会暴毙', () => {
    const s = createBattleState({
      players: [player('li')],
      enemies: [mkEnemy('boss', { health: 9999, defense: 999, attackStrength: 0 })],
      items: ITEMS,
      inventory: [{ itemId: 'heding', count: 1 }],
      poisonDefs: P,
    })
    s.enemies[0]!.def.ai.resistanceToSorcery = 10
    stepBattle(s, () => 0.99)
    s.pendingActions.set(0, { kind: 'throw', itemId: 'heding', targetEnemyIdx: 0 })
    let g = 0
    do stepBattle(s, () => 0.99)
    while (s.phase === 'performAction' && g++ < 40)
    expect(s.enemies[0]!.hp).toBeGreaterThan(0)
    expect(s.log.some((l) => l.includes('暴毙'))).toBe(false)
    expect(s.enemies[0]!.poisons).toEqual([])
  })
})

describe('P2 相克 use-on-self(以毒攻毒自解;counters/lethalWith 数据驱动)', () => {
  const P: Record<number, import('@type-pal/content').PoisonDef> = {
    556: {
      id: 556,
      name: '鹤顶红',
      curability: 'severe',
      color: 0,
      playerTicks: [{ hpDelta: -50 }],
      counters: 558,
      lethalWith: 557,
    },
    558: {
      id: 558,
      name: '血海棠',
      curability: 'severe',
      color: 0,
      playerTicks: [{ hpDelta: -50 }],
      counters: 559,
      lethalWith: 555,
    },
    557: {
      id: 557,
      name: '孔雀胆',
      curability: 'severe',
      color: 0,
      playerTicks: [{ hpDelta: -50 }],
      counters: 560,
      lethalWith: 556,
    },
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
    expect((p as { poisons: { poisonId: number }[] }).poisons).toEqual([
      { poisonId: 556, tickIndex: 0 },
    ])
  })
})

describe('P2 毒龙胆/九阴散(0x61 没中毒则秒杀)', () => {
  const ITEMS: Record<string, import('@type-pal/content').ItemData> = {
    '278': {
      id: '278',
      name: '毒龙胆',
      desc: [],
      buyPrice: 0,
      sellPrice: 0,
      sellable: false,
      use: {
        target: 'oneAlly',
        consuming: true,
        effects: [{ kind: 'dieIfNotPoisoned' }, { kind: 'curePoison', curesTier: 'severe' }],
      },
    },
  }
  const P: Record<number, import('@type-pal/content').PoisonDef> = {
    555: {
      id: 555,
      name: '三尸蛊',
      curability: 'severe',
      color: 0,
      playerTicks: [{ hpDelta: -50 }],
    },
  }
  const useOnSelf = (poisons: { poisonId: number; tickIndex: number }[]) => {
    const s = createBattleState({
      players: [player('li', { hp: 100 })],
      enemies: [mkEnemy('slime', { health: 9999, defense: 999, attackStrength: 0 })],
      items: ITEMS,
      inventory: [{ itemId: '278', count: 1 }],
      poisonDefs: P,
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
    id: 'c386',
    name: '合体气功',
    desc: '',
    cost: { mp: 9 },
    usableOutsideBattle: false,
    target: 'oneEnemy',
    effects: [{ kind: 'damage', power: 90, elemental: 0 }],
    animation: { effectSprite: 1 },
  }
  const coopPlayer = (id: string): CreatePlayerInput =>
    player(id, { attackStrength: 40, magicStrength: 20, cooperativeMagicSkillId: 'c386' })
  // 跑完当前回合到下一次 selectAction(或终局)
  const runTurn = (s: ReturnType<typeof createBattleState>): void => {
    let guard = 0
    const startTurn = s.turn
    while (
      !(s.phase === 'selectAction' && s.turn > startTurn) &&
      s.phase !== 'won' &&
      s.phase !== 'lost'
    ) {
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
    const tnsh: SkillData = {
      ...coopSkill,
      id: 'c355',
      name: '天女散花',
      target: 'allEnemies',
      effects: [{ kind: 'damage', power: 109, elemental: 0 }],
    }
    const s = createBattleState({
      players: [
        player('li', { attackStrength: 40, magicStrength: 20, cooperativeMagicSkillId: 'c355' }),
        player('zhao', { attackStrength: 40, magicStrength: 20, cooperativeMagicSkillId: 'c355' }),
      ],
      enemies: [
        mkEnemy('a', { health: 9999, defense: 0, attackStrength: 0 }),
        mkEnemy('b', { health: 9999, defense: 0, attackStrength: 0 }),
      ],
      skills: { c355: tnsh },
    })
    stepBattle(s, rng0)
    s.pendingActions.set(0, { kind: 'coop' }) // 无目标 = 全体技自动全场
    s.pendingActions.set(1, { kind: 'defend' })
    const a0 = s.enemies[0]!.hp,
      b0 = s.enemies[1]!.hp
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
        player('slow', {
          baseDexterity: 1,
          attackStrength: 40,
          magicStrength: 20,
          cooperativeMagicSkillId: 'c386',
        }),
        player('fast', {
          baseDexterity: 200,
          attackStrength: 40,
          magicStrength: 20,
          cooperativeMagicSkillId: 'c386',
        }),
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

// ── P0 技能效果接线(2026-07-11 通关审计):gate 顺序门/即死/偷窃/收妖/解状态/buffStat/复活/
//    変身 + 己方目标路由 + 敌方侧 gate·即死·下毒。
//    考证锚:script.c 0x06(掷[1,100]≥率 fail)/0x64(HP 高于阈值 fail)/0x2E(rng(0,9)≥巫抗)/
//    0x60 即死/0x33 收妖/0x29 玩家中毒掷[1,100]>毒抗;fight.c:5193 偷窃(rng(0,10)≤率)──
describe('P0 技能效果接线(gate/即死/偷窃/收妖/解状态/buff/复活/目标路由)', () => {
  const mkSkill = (id: string, o: Partial<SkillData>): SkillData => ({
    id,
    name: id,
    desc: '',
    cost: {},
    usableOutsideBattle: false,
    target: 'oneEnemy',
    effects: [],
    animation: { effectSprite: 0 },
    ...o,
  })
  /** 推一整回合:必要时进 selectAction → 填招(先于建队,防 auto-fill 抢跑)→ 消费到回合末。 */
  const turn = (
    s: ReturnType<typeof createBattleState>,
    rng: () => number,
    act: (st: ReturnType<typeof createBattleState>) => void,
  ): void => {
    if (s.phase === 'preBattle') stepBattle(s, rng)
    act(s)
    let guard = 0
    do {
      stepBattle(s, rng)
    } while (s.phase === 'performAction' && ++guard < 60)
  }
  const rngHigh = () => 0.99 // 概率门恒失败(掷 100);灵抗门恒失败(掷 9 < 抗 10 才会,见各测)
  const dummy = (o: Partial<EnemyDef['stats']> = {}) =>
    mkEnemy('dummy', { attackStrength: 0, health: 9999, ...o })

  test('玩家技能 0x28 投影也在成功新增敌毒时立即执行 enemy tick0', () => {
    const poisonSkill = mkSkill('poison', {
      effects: [{ kind: 'applyPoison', poisonId: '552' }],
    })
    const s = createBattleState({
      players: [player('li', { baseDexterity: 500, skills: ['poison'] })],
      enemies: [dummy({ health: 1000, dexterity: 0 })],
      skills: { poison: poisonSkill },
      poisonDefs: {
        552: {
          id: 552,
          name: '尸毒',
          curability: 'common',
          color: 0,
          enemyTicks: [{ hpDelta: -50 }, { hpDelta: -60 }],
        },
      },
    })
    s.enemies[0]!.def.ai.resistanceToSorcery = 0
    stepBattle(s, rng0)
    s.pendingActions.set(0, { kind: 'cast', skillId: 'poison', targetEnemyIdx: 0 })
    stepBattle(s, rng0)
    expect(s.actionQueue[0]?.isEnemy).toBe(false)
    stepBattle(s, rng0)
    expect(s.enemies[0]!.hp).toBe(950)
    expect(s.enemies[0]!.poisons).toEqual([{ poisonId: 552, tickIndex: 1 }])
  })

  test('灵葫咒链:HP≤25% 门过 + 概率门过 → 收妖 + 即死;满血敌 HP 门截断=无任何效果', () => {
    const lh = mkSkill('lh', {
      effects: [
        { kind: 'gate', hpAtMostPercent: 25 },
        { kind: 'gate', chance: 60 },
        { kind: 'collectTreasure' },
        { kind: 'instantKill' },
      ],
    })
    // 残血敌(20/100 ≤ 25%):rng0 掷 1 < 60 过 → 收妖 5 + 即死
    const s = createBattleState({
      players: [player('li', { skills: ['lh'] })],
      enemies: [dummy({ health: 100, collectValue: 5 })],
      skills: { lh },
    })
    s.enemies[0]!.hp = 20
    turn(s, rng0, (st) =>
      st.pendingActions.set(0, { kind: 'cast', skillId: 'lh', targetEnemyIdx: 0 }),
    )
    expect(s.enemies[0]!.hp).toBe(0)
    expect(s.collectGained).toBe(5)
    expect(s.log.some((l) => l.includes('魂飞魄散'))).toBe(true)
    // 满血敌:HP 门截断 → 不死、不收妖、显「无任何效果」
    const s2 = createBattleState({
      players: [player('li', { skills: ['lh'] })],
      enemies: [dummy({ health: 100, collectValue: 5 })],
      skills: { lh },
    })
    turn(s2, rng0, (st) =>
      st.pendingActions.set(0, { kind: 'cast', skillId: 'lh', targetEnemyIdx: 0 }),
    )
    expect(s2.enemies[0]!.hp).toBe(100)
    expect(s2.collectGained).toBe(0)
    expect(s2.log.some((l) => l.includes('无任何效果'))).toBe(true)
  })

  test('概率门(0x06):掷 100 ≥ 60 → 截断即死;灵抗门:巫抗 0 过 / 巫抗满不过', () => {
    const kill60 = mkSkill('k60', {
      effects: [{ kind: 'gate', chance: 60 }, { kind: 'instantKill' }],
    })
    const s = createBattleState({
      players: [player('li', { skills: ['k60'] })],
      enemies: [dummy()],
      skills: { k60: kill60 },
    })
    turn(s, rngHigh, (st) =>
      st.pendingActions.set(0, { kind: 'cast', skillId: 'k60', targetEnemyIdx: 0 }),
    )
    expect(s.enemies[0]!.hp).toBe(9999)
    expect(s.log.some((l) => l.includes('无任何效果'))).toBe(true)
    // 灵抗门(0x2E 同构 rng(0,9) >= 巫抗):rng0 掷 0 —— 巫抗 0 过(即死),巫抗 5(mkEnemy 默认)不过
    const mres = mkSkill('mres', {
      effects: [{ kind: 'gate', magicResist: true }, { kind: 'instantKill' }],
    })
    const pass = createBattleState({
      players: [player('li', { skills: ['mres'] })],
      enemies: [{ ...dummy(), ai: { resistanceToSorcery: 0 } }],
      skills: { mres },
    })
    turn(pass, rng0, (st) =>
      st.pendingActions.set(0, { kind: 'cast', skillId: 'mres', targetEnemyIdx: 0 }),
    )
    expect(pass.enemies[0]!.hp).toBe(0)
    const block = createBattleState({
      players: [player('li', { skills: ['mres'] })],
      enemies: [dummy()],
      skills: { mres },
    })
    turn(block, rng0, (st) =>
      st.pendingActions.set(0, { kind: 'cast', skillId: 'mres', targetEnemyIdx: 0 }),
    )
    expect(block.enemies[0]!.hp).toBe(9999)
  })

  test('偷窃(fight.c:5193):偷物入包、余量递减、偷光一无所获;偷钱敌走 moneyDelta', () => {
    const st6 = mkSkill('steal6', { effects: [{ kind: 'steal', rate: 6 }] })
    const s = createBattleState({
      players: [player('li', { skills: ['steal6'] })],
      enemies: [{ ...dummy(), steal: { itemId: '91', count: 2 } }],
      skills: { steal6: st6 },
      items: { '91': { id: '91', name: '天蚕丝' } as ItemData },
    })
    const cast = (st: ReturnType<typeof createBattleState>) =>
      st.pendingActions.set(0, { kind: 'cast', skillId: 'steal6', targetEnemyIdx: 0 })
    turn(s, rng0, cast) // rng0 掷 0 ≤ 6 命中
    expect(s.inventory.find((x) => x.itemId === '91')?.count).toBe(1)
    expect(s.log.some((l) => l.includes('获得 天蚕丝'))).toBe(true) // CLASSIC「获得」文案(一阶段同)
    turn(s, rng0, cast)
    expect(s.inventory.find((x) => x.itemId === '91')?.count).toBe(2)
    turn(s, rng0, cast) // 余量耗尽
    expect(s.inventory.find((x) => x.itemId === '91')?.count).toBe(2)
    expect(s.log.some((l) => l.includes('一无所获'))).toBe(true)
    // 偷钱敌(itemId '0'):c = trunc(100/(2+0)) = 50 → moneyDelta
    const coins = createBattleState({
      players: [player('li', { skills: ['steal6'] })],
      enemies: [{ ...dummy(), steal: { itemId: '0', count: 100 } }],
      skills: { steal6: st6 },
    })
    turn(coins, rng0, cast)
    expect(coins.moneyDelta).toBe(50)
    expect(coins.enemies[0]!.stealLeft).toBe(50)
  })

  test('金蝉脱壳(0x3A):非 boss 全队必逃 → fled;boss 战「无法逃离!」战斗继续', () => {
    const jc = mkSkill('jc', {
      target: 'allAllies',
      cost: { mp: 33 },
      effects: [{ kind: 'fleeBattle' }],
    })
    const mk = (boss: boolean) =>
      createBattleState({
        players: [player('li', { skills: ['jc'], mp: 50, maxMp: 50 })],
        enemies: [dummy()],
        skills: { jc },
        boss,
      })
    const s = mk(false)
    turn(s, rng0, (st) => st.pendingActions.set(0, { kind: 'cast', skillId: 'jc' }))
    expect(s.phase).toBe('fled')
    expect(s.players[0]!.mp).toBe(17) // MP 33 照扣
    const b = mk(true)
    turn(b, rng0, (st) => st.pendingActions.set(0, { kind: 'cast', skillId: 'jc' }))
    expect(b.phase).not.toBe('fled')
    expect(b.log.some((l) => l.includes('无法逃离'))).toBe(true)
  })

  test('乾坤一掷(0x88):消耗 min(金钱,5000)、基伤=消耗×2/5;分文没有 → 无任何效果不扣钱', () => {
    const qk = mkSkill('qk', {
      target: 'allEnemies',
      cost: { mp: 1 },
      effects: [{ kind: 'moneyDamage', maxSpend: 5000, num: 2, den: 5, elemental: 0 }],
    })
    const mk = (money: number) =>
      createBattleState({
        players: [player('li', { skills: ['qk'] })],
        enemies: [dummy({ health: 9999 })],
        skills: { qk },
        money,
      })
    const s = mk(8000)
    turn(s, rng0, (st) => st.pendingActions.set(0, { kind: 'cast', skillId: 'qk' }))
    expect(s.moneyDelta).toBe(-5000) // 8000 有钱也封顶 5000(script.c:2547)
    expect(s.enemies[0]!.hp).toBeLessThan(9999) // 基伤 2000 入常规法术结算
    expect(s.log.some((l) => l.includes('掷出 5000 文钱'))).toBe(true)
    const poor = mk(0)
    turn(poor, rng0, (st) => st.pendingActions.set(0, { kind: 'cast', skillId: 'qk' }))
    expect(poor.moneyDelta).toBe(0)
    expect(poor.enemies[0]!.hp).toBe(9999)
    expect(poor.log.some((l) => l.includes('金钱不足'))).toBe(true)
  })

  test('铜钱镖(cost.money):固定扣 500 + 伤害;不足 500 → 降级普攻不扣钱(与 MP 门同待遇)', () => {
    const tq = mkSkill('tq', {
      target: 'oneEnemy',
      cost: { mp: 1, money: 500 },
      effects: [{ kind: 'damage', power: 198, elemental: 0 }],
    })
    const mk = (money: number) =>
      createBattleState({
        players: [player('li', { skills: ['tq'] })],
        enemies: [dummy({ health: 9999 })],
        skills: { tq },
        money,
      })
    const s = mk(600)
    turn(s, rng0, (st) =>
      st.pendingActions.set(0, { kind: 'cast', skillId: 'tq', targetEnemyIdx: 0 }),
    )
    expect(s.moneyDelta).toBe(-500)
    expect(s.enemies[0]!.hp).toBeLessThan(9999)
    const poor = mk(400)
    turn(poor, rng0, (st) =>
      st.pendingActions.set(0, { kind: 'cast', skillId: 'tq', targetEnemyIdx: 0 }),
    )
    expect(poor.moneyDelta).toBe(0) // 降级普攻,消耗未发生
    expect(poor.log.some((l) => l.includes('金钱不足') && l.includes('降级普攻'))).toBe(true)
  })

  test('解状态(0x2F)按 targetAllyIdx 点名队友;buffStat 烙属性 + 定时到期扣回', () => {
    const bx = mkSkill('bx', {
      target: 'oneAlly',
      effects: [{ kind: 'removeStatus', statuses: ['confused', 'paralyzed', 'sleep'] }],
    })
    const s = createBattleState({
      players: [player('li', { skills: ['bx'] }), player('ling')],
      enemies: [dummy()],
      skills: { bx },
    })
    s.players[1]!.status.sleep = 4
    turn(s, rng0, (st) => {
      st.pendingActions.set(0, { kind: 'cast', skillId: 'bx', targetAllyIdx: 1 })
      st.pendingActions.set(1, { kind: 'defend' })
    })
    expect(s.players[1]!.status.sleep).toBe(0)
    // buffStat:攻 +100%(40→80)整场;定时 1 回合的到期扣回
    const buff = mkSkill('buff', {
      target: 'self',
      effects: [
        { kind: 'buffStat', stat: 'attack', percent: 100, duration: 'battle' },
        { kind: 'buffStat', stat: 'dexterity', percent: 50, duration: 1 },
      ],
    })
    const b = createBattleState({
      players: [player('li', { skills: ['buff'], attackStrength: 40, baseDexterity: 50 })],
      enemies: [dummy()],
      skills: { buff },
    })
    turn(b, rng0, (st) => st.pendingActions.set(0, { kind: 'cast', skillId: 'buff' }))
    expect(b.players[0]!.attackStrength).toBe(80) // 'battle' 整场:回合末不回落
    expect(b.players[0]!.baseDexterity).toBe(50) // 定时 1 回合:本回合末已扣回 75→50
    turn(b, rng0, (st) => st.pendingActions.set(0, { kind: 'defend' }))
    expect(b.players[0]!.attackStrength).toBe(80)
  })

  test('复活(0x22 全语义):还魂咒仅救死者 + 解重毒 + 清定时状态(装备 9999 哨兵保留)', () => {
    const rev = mkSkill('rev', { target: 'oneAlly', effects: [{ kind: 'revive', hpPercent: 10 }] })
    const s = createBattleState({
      players: [
        player('li', { skills: ['rev'] }),
        player('ling', { maxHp: 200, poisons: [{ poisonId: 1, tickIndex: 0 }] }),
      ],
      enemies: [dummy()],
      skills: { rev },
      poisonDefs: { 1: { id: 1, name: '赤毒', curability: 'common', color: 0 } },
    })
    const t = s.players[1]!
    t.hp = 0
    t.status.confused = 3 // 定时状态:复活应清
    t.status.dualAttack = 9999 // 装备常驻哨兵:应保留
    turn(s, rng0, (st) => {
      st.pendingActions.set(0, { kind: 'cast', skillId: 'rev', targetAllyIdx: 1 })
      st.pendingActions.set(1, { kind: 'defend' })
    })
    expect(t.hp).toBe(20) // 200×10%
    expect(t.poisons.length).toBe(0)
    expect(t.status.confused).toBe(0)
    expect(t.status.dualAttack).toBeGreaterThan(0)
    expect(s.log.some((l) => l.includes('死而复生'))).toBe(true)
    // 对活人无效果
    turn(s, rng0, (st) => {
      st.pendingActions.set(0, { kind: 'cast', skillId: 'rev', targetAllyIdx: 1 })
      st.pendingActions.set(1, { kind: 'defend' })
    })
    expect(t.hp).toBe(20)
    expect(s.log.some((l) => l.includes('无任何效果'))).toBe(true)
  })

  test('物品 targetAllyIdx 路由:还魂香喂尸体复活;金创药对死人无效果', () => {
    const items: Record<string, ItemData> = {
      hh: {
        id: 'hh',
        name: '还魂香',
        use: { target: 'oneAlly', consuming: true, effects: [{ kind: 'revive', hpPercent: 10 }] },
      } as ItemData,
      jc: {
        id: 'jc',
        name: '金创药',
        use: { target: 'oneAlly', consuming: true, effects: [{ kind: 'healHp', amount: 50 }] },
      } as ItemData,
    }
    const s = createBattleState({
      players: [player('li'), player('ling', { maxHp: 200 })],
      enemies: [dummy()],
      items,
      inventory: [
        { itemId: 'hh', count: 1 },
        { itemId: 'jc', count: 1 },
      ],
    })
    s.players[1]!.hp = 0
    turn(s, rng0, (st) => {
      st.pendingActions.set(0, { kind: 'item', itemId: 'jc', targetAllyIdx: 1 })
      st.pendingActions.set(1, { kind: 'defend' })
    })
    expect(s.players[1]!.hp).toBe(0) // 死人吃药无效(PAL_IncreaseHPMP 仅活人)
    turn(s, rng0, (st) => {
      st.pendingActions.set(0, { kind: 'item', itemId: 'hh', targetAllyIdx: 1 })
      st.pendingActions.set(1, { kind: 'defend' })
    })
    expect(s.players[1]!.hp).toBe(20)
    expect(s.inventory.find((x) => x.itemId === 'hh')?.count).toBe(0)
  })

  test('敌方夺魂(gate 灵抗直通 + 概率 33 + 即死):掷 1 过门 → 队员魂飞魄散', () => {
    const dh = mkSkill('dh', {
      effects: [
        { kind: 'gate', magicResist: true },
        { kind: 'gate', chance: 33 },
        { kind: 'instantKill' },
      ],
    })
    const reaper = {
      ...mkEnemy('reaper', { health: 9999, attackStrength: 0 }),
      ai: { resistanceToSorcery: 5, rules: [{ at: 'act', do: { kind: 'cast', skillId: 'dh' } }] },
    } as EnemyDef
    const s = createBattleState({
      players: [player('li'), player('ling')],
      enemies: [reaper],
      skills: { dh },
    })
    turn(s, rng0, (st) => {
      st.pendingActions.set(0, { kind: 'defend' })
      st.pendingActions.set(1, { kind: 'defend' })
    })
    expect(s.players.some((p) => p.hp <= 0)).toBe(true)
    expect(s.log.some((l) => l.includes('魂飞魄散'))).toBe(true)
    // 概率门失败(掷 100 ≥ 33):无人死
    const s2 = createBattleState({
      players: [player('li'), player('ling')],
      enemies: [reaper],
      skills: { dh },
    })
    turn(s2, rngHigh, (st) => {
      st.pendingActions.set(0, { kind: 'defend' })
      st.pendingActions.set(1, { kind: 'defend' })
    })
    expect(s2.players.every((p) => p.hp > 0)).toBe(true)
  })

  test('敌方下毒(0x29):掷[1,100] > 毒抗 → 中毒;高毒抗挡下', () => {
    const px = mkSkill('px', { effects: [{ kind: 'applyPoison', poisonId: '1' }] })
    const snake = {
      ...mkEnemy('snake', { health: 9999, attackStrength: 0 }),
      ai: { resistanceToSorcery: 5, rules: [{ at: 'act', do: { kind: 'cast', skillId: 'px' } }] },
    } as EnemyDef
    const hit = createBattleState({
      players: [player('li')],
      enemies: [snake],
      skills: { px },
      poisonDefs: { 1: { id: 1, name: '赤毒', curability: 'common', color: 0 } },
    })
    turn(hit, rng0, (st) => st.pendingActions.set(0, { kind: 'defend' })) // 掷 1 > 毒抗 0 → 中
    expect(hit.players[0]!.poisons.length).toBe(1)
    const resist = createBattleState({
      players: [player('li', { poisonRes: 50 })],
      enemies: [snake],
      skills: { px },
    })
    turn(resist, rng0, (st) => st.pendingActions.set(0, { kind: 'defend' })) // 掷 1 ≤ 50 → 抗住
    expect(resist.players[0]!.poisons.length).toBe(0)
  })

  test('隐身(0x5C 隐蛊):负值待激活→行动步前激活(同轮敌即跳过),3 轮不行动,轮末递减恢复', () => {
    const s = createBattleState({
      players: [player('li', { hp: 100 })],
      enemies: [dummy({ attackStrength: 100, health: 9999 })],
      items: {
        yg: {
          id: 'yg',
          name: '隐蛊',
          use: {
            target: 'allAllies',
            consuming: true,
            battleOnly: true,
            effects: [{ kind: 'hideParty', turns: 3 }],
          },
        } as ItemData,
      },
      inventory: [{ itemId: 'yg', count: 1 }],
    })
    // R1:用隐蛊(队员 dex×3 先手)—— 同轮敌人立即被跳过(激活在每个行动步前,fight.c:3529)
    turn(s, rng0, (st) => st.pendingActions.set(0, { kind: 'item', itemId: 'yg' }))
    expect(s.players[0]!.hp).toBe(100)
    expect(s.hidingTime).toBe(2) // 轮末 3→2
    // R2/R3:敌仍不行动
    turn(s, rng0, (st) => st.pendingActions.set(0, { kind: 'defend' }))
    turn(s, rng0, (st) => st.pendingActions.set(0, { kind: 'defend' }))
    expect(s.players[0]!.hp).toBe(100)
    expect(s.hidingTime).toBe(0)
    // R4:隐身结束,敌恢复攻击
    turn(s, rng0, (st) => st.pendingActions.set(0, { kind: 'defend' }))
    expect(s.players[0]!.hp).toBeLessThan(100)
  })

  test('替挡(coveredBy,fight.c:4941-4985):濒死被攻守护者顶上免伤;守护者失能退化自挡;坏状态无援护不许闪', () => {
    const mk = () =>
      createBattleState({
        players: [
          player('ling'), // slot0 守护者(健康)
          player('li', { hp: 10, maxHp: 100, coveredBy: 'ling' }), // slot1 濒死(10 < 100/5)
        ],
        enemies: [dummy({ attackStrength: 50 })],
      })
    const bothDefend = (st: ReturnType<typeof createBattleState>) => {
      st.pendingActions.set(0, { kind: 'defend' })
      st.pendingActions.set(1, { kind: 'defend' })
    }
    // rngHigh:敌选目标 = 第二个活人(slot1 濒死李);闪避掷 16≥10 过 → 守护者替挡,完全免伤
    const s = mk()
    turn(s, rngHigh, bothDefend)
    expect(s.players[1]!.hp).toBe(10)
    expect(s.log.some((l) => l.includes('挡下'))).toBe(true)
    // 守护者睡着 → 替挡资格失效;濒死无援护**仍可自闪**(坏状态清单不含濒死)
    const s2 = mk()
    s2.players[0]!.status.sleep = 3
    turn(s2, rngHigh, bothDefend)
    expect(s2.players[1]!.hp).toBe(10)
    expect(s2.log.some((l) => l.includes('格挡'))).toBe(true)
    expect(s2.log.some((l) => l.includes('挡下'))).toBe(false)
    // 目标睡着(坏状态)且守护者也睡 → 不许闪(CLASSIC fight.c:4974),掷中也吃伤害
    const s3 = mk()
    s3.players[0]!.status.sleep = 3
    s3.players[1]!.hp = 90
    s3.players[1]!.status.sleep = 3
    turn(s3, rngHigh, bothDefend)
    expect(s3.players[1]!.hp).toBeLessThan(90)
  })

  test('库存预占(nAmountInUse,fight.c:1900-1916):投掷无条件占;使用仅 consuming 物占', () => {
    const s = createBattleState({
      players: [player('li'), player('ling')],
      enemies: [dummy()],
      items: {
        yao: {
          id: 'yao',
          name: '药',
          use: { consuming: true, effects: [] },
        } as unknown as ItemData,
        zhu: {
          id: 'zhu',
          name: '珠',
          use: { consuming: false, effects: [] },
        } as unknown as ItemData,
        du: { id: 'du', name: '毒', throw: { effects: [] } } as unknown as ItemData,
      },
    })
    s.pendingActions.set(0, { kind: 'item', itemId: 'yao' })
    s.pendingActions.set(1, { kind: 'throw', itemId: 'du', targetEnemyIdx: 0 })
    const m = pendingItemUses(s)
    expect(m.get('yao')).toBe(1) // consuming 用品占
    expect(m.get('du')).toBe(1) // 投掷无条件占
    s.pendingActions.set(0, { kind: 'item', itemId: 'zhu' }) // 不耗物品(宝珠类):不占
    expect(pendingItemUses(s).get('zhu')).toBeUndefined()
    expect(pendingItemUses(s).get('yao')).toBeUndefined() // 改选后自动释放(动态计算)
  })

  test('変身(trance):tranceBattleSprite 落施法者;链上 buffStat 同步生效', () => {
    const mengshe = mkSkill('ms', {
      target: 'self',
      effects: [
        { kind: 'trance', battleSprite: 'battle-sprite.player.005' },
        { kind: 'buffStat', stat: 'attack', percent: 100, duration: 'battle' },
      ],
    })
    const s = createBattleState({
      players: [player('ling', { skills: ['ms'], attackStrength: 30 })],
      enemies: [dummy()],
      skills: { ms: mengshe },
    })
    turn(s, rng0, (st) => st.pendingActions.set(0, { kind: 'cast', skillId: 'ms' }))
    expect(s.players[0]!.tranceBattleSprite).toBe('battle-sprite.player.005')
    expect(s.players[0]!.attackStrength).toBe(60)
  })
})
