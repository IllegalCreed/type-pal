import type { EnemyDef, SkillData } from '@type-pal/content'
import { calcMagicDamage } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { wfEnemy, wfPlayer } from '../__tests__/battle-workflows/catalog.js'
import { runBattleToEnd } from '../__tests__/battle-workflows/core-driver.js'
import {
  applyEnemyEffect,
  applyPoisonToEnemy,
  buildAiView,
  createBattleState,
  decideEnemyAction,
  stepBattle,
} from './battle-core.js'

const rng0 = () => 0

describe('敌方决策与施法', () => {
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
    ...wfEnemy('mage', { magicStrength: 60, attackStrength: 5, health: 500, defense: 0 }),
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
      players: [wfPlayer('li', { hp: 400, maxHp: 400, defense: 0 })],
      enemySlots: [caster()],
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
      players: [wfPlayer('li')],
      enemySlots: [caster()],
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
      ...wfEnemy('boss', { health: 800, attackStrength: 5 }),
      ai: {
        resistanceToSorcery: 5,
        rules: [{ at: 'act', do: { kind: 'cast', skillId: '339' }, once: true }],
      },
    }
    const s = createBattleState({
      players: [wfPlayer('li', { hp: 900, maxHp: 900 })],
      enemySlots: [e],
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
      players: [wfPlayer('li')],
      enemySlots: [caster()],
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
    const s = createBattleState({ players: [wfPlayer('li')], enemySlots: [caster()] }) // 无 skills
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

describe('敌方形态、槽位与撤离', () => {
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
    const boss = wfEnemy('boss', { health: 300 })
    const truth = wfEnemy('truth', { health: 999, attackStrength: 50 })
    boss.ai = {
      resistanceToSorcery: 5,
      rules: [{ at: 'act', do: { kind: 'transform', enemyId: 'truth' }, once: true }],
    }
    const s = createBattleState({
      players: [wfPlayer('li', { hp: 500, maxHp: 500 })],
      enemySlots: [boss],
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
    const blob = wfEnemy('blob', { health: 90, attackStrength: 1 })
    blob.ai = {
      resistanceToSorcery: 5,
      rules: [{ at: 'act', do: { kind: 'divide', copies: 1 }, once: true }],
    }
    // 两只在场:分裂失败(门拦下)
    const s0 = createBattleState({
      players: [wfPlayer('li', { hp: 500, maxHp: 500 })],
      enemySlots: [blob, wfEnemy('other', { attackStrength: 1 })],
    })
    runOneTurn(s0)
    expect(s0.log.some((l) => l.includes('分裂失败'))).toBe(true)
    expect(s0.enemies.length).toBe(5)
    expect(s0.maxEnemyIndex).toBe(1)
    // 单only:成功均分
    const s = createBattleState({
      players: [wfPlayer('li', { hp: 500, maxHp: 500 })],
      enemySlots: [blob],
    })
    runOneTurn(s)
    expect(s.enemies.length).toBe(5)
    expect(s.maxEnemyIndex).toBe(1)
    expect(s.enemies[0]!.hp).toBe(45)
    expect(s.enemies[1]!.hp).toBe(45)

    const caller = wfEnemy('caller', { health: 200, attackStrength: 1 })
    caller.ai = {
      resistanceToSorcery: 5,
      rules: [{ at: 'act', do: { kind: 'summon', count: 9 }, once: true }],
    }
    const s2 = createBattleState({
      players: [wfPlayer('li', { hp: 500, maxHp: 500 })],
      enemySlots: [caller],
    })
    runOneTurn(s2)
    expect(s2.enemies.length).toBe(5)
    expect(s2.maxEnemyIndex).toBe(0) // 当前上限内无空槽，且 summon 不扩展上限
    expect(s2.log.some((l) => l.includes('召唤失败'))).toBe(true)
  })

  test('分裂进低槽后按最高占用槽重排，空尾槽退出阵形', () => {
    const cloud = { ...wfEnemy('cloud', { health: 1200 }), yPosOffset: 4 }
    const state = createBattleState({
      players: [wfPlayer('li')],
      enemySlots: [null, cloud, null],
    })
    expect(state.maxEnemyIndex).toBe(2)

    const result = applyEnemyEffect(state, 1, { kind: 'divide', copies: 1 })

    expect(result.spawnedIdxs).toEqual([0])
    expect(state.maxEnemyIndex).toBe(1)
    expect(state.enemies.slice(0, 2).map((enemy) => enemy?.basePos)).toEqual([
      { x: 70, y: 134 },
      { x: 140, y: 110 },
    ])
  })

  test('站位定死:死怪不换挡、分裂/召唤填死槽继承位置(作者报「死后错位」根治)', () => {
    const a = wfEnemy('a', { health: 10 })
    const b = wfEnemy('b', { health: 200 })
    const c = wfEnemy('c', { health: 200 })
    const s = createBattleState({ players: [wfPlayer('li')], enemySlots: [a, b, c] })
    const posB = { ...s.enemies[1]!.basePos }
    const posC = { ...s.enemies[2]!.basePos }
    // a 死:b/c 站位纹丝不动(曾按活敌数换挡 → 全场重排)
    s.enemies[0]!.hp = 0
    expect(s.enemies[1]!.basePos).toEqual(posB)
    expect(s.enemies[2]!.basePos).toEqual(posC)
    // 分裂/召唤填死槽:继承 a 的槽位坐标,不加长数组
    const posA = { ...s.enemies[0]!.basePos }
    const blob = wfEnemy('blob', { health: 90 })
    blob.ai = {
      resistanceToSorcery: 5,
      rules: [{ at: 'act', do: { kind: 'summon', count: 1 }, once: true }],
    }
    s.enemies[1] = { ...s.enemies[1]!, def: blob, firedRules: new Set() }
    runOneTurn(s)
    expect(s.enemies.length).toBe(5) // 固定容量；填槽不扩展上限
    expect(s.maxEnemyIndex).toBe(2)
    expect(s.enemies[0]!.hp).toBeGreaterThan(0) // 死槽被增援复活
    expect(s.enemies[0]!.basePos).toEqual(posA) // 继承槽位
    expect(s.enemies[0]!.rewardCounted).toBe(false) // 新怪再死重新计赏
  })

  test('fleeAll:整场敌逃离 → won + enemyFled 标记(无奖励语义留钩)', () => {
    const snake = wfEnemy('snake', { health: 500 })
    snake.ai = { resistanceToSorcery: 5, rules: [{ at: 'act', do: { kind: 'flee' } }] }
    const s = createBattleState({ players: [wfPlayer('li')], enemySlots: [snake] })
    runOneTurn(s)
    expect(s.enemyFled).toBe(true)
    expect(s.phase).toBe('won')
    expect(s.log.some((l) => l.includes('逃走了'))).toBe(true)
  })
})

describe('敌实例的脚本与候补行动', () => {
  test('AI 条件读取 ActorDef 模板 id，rules > instance fallback > attack', () => {
    const caster = wfEnemy('caster')
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
        wfPlayer('instance-42', {
          actorTemplateId: 'zhao-linger',
        }),
      ],
      enemySlots: [caster],
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
    const source = wfEnemy('source')
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
    const target = wfEnemy('target')
    target.ai = {
      resistanceToSorcery: 0,
      fallback: {
        action: { kind: 'cast', skillId: 'target-magic' },
        chancePercent: 25,
      },
    }
    const state = createBattleState({
      players: [wfPlayer('hero')],
      enemySlots: [source],
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

  test('分裂后赤毒留在母体，分身从无毒状态入场', () => {
    const state = createBattleState({
      players: [wfPlayer('hero')],
      enemySlots: [wfEnemy('slime', { health: 110 })],
    })
    const mother = state.enemies[0]!
    expect(applyPoisonToEnemy(mother, 551, () => 0.6)).toBe(true)

    const result = applyEnemyEffect(state, 0, { kind: 'divide', copies: 1 })

    expect(result).toMatchObject({ outcome: 'succeeded', spawnedIdxs: [1] })
    expect(mother.poisons).toEqual([{ poisonId: 551, tickIndex: 0 }])
    expect(state.enemies[1]!.poisons).toEqual([])
  })

  test('divide 深拷 owner/cursor/fallback/fired；summon 使用目标 initial state', () => {
    const source = wfEnemy('source', { health: 90 })
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
    const summoned = wfEnemy('summoned')
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
      players: [wfPlayer('hero')],
      enemySlots: [source],
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
      players: [wfPlayer('hero')],
      enemySlots: [source, null],
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
    const caller = wfEnemy('caller')
    const target = wfEnemy('target')
    const state = createBattleState({
      players: [wfPlayer('hero')],
      enemySlots: [caller, wfEnemy('b'), wfEnemy('c'), wfEnemy('d')],
      enemiesById: { target },
    })
    const before = state.enemies.slice(0, 4).map((enemy) => enemy?.def.id)
    expect(
      applyEnemyEffect(state, 0, {
        kind: 'summon',
        enemyId: 'target',
        count: 2,
      }).outcome,
    ).toBe('failed')
    expect(state.enemies.slice(0, 4).map((enemy) => enemy?.def.id)).toEqual(before)

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

describe('敌方法术抗性与格挡', () => {
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
    ...wfEnemy('mage', { magicStrength: 60, attackStrength: 5, health: 500, defense: 0, ...o }),
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
      players: [wfPlayer('li')],
      enemySlots: [mage()],
      skills: { '339': bolt },
    })
    runTurn1(s, rng0, () => s.pendingActions.set(0, { kind: 'defend' }))
    expect(castDmg(s)).toBe(Math.trunc(raw(1, 30) / 3)) // (防2)×(护1)+(挡1)=3
    expect(s.lastAction?.kind).toBe('cast')
    expect(s.lastAction?.autoDefend).toEqual([0])
  })

  test('防御+护体+格挡全叠:除因子 5(最深)', () => {
    const s = createBattleState({
      players: [wfPlayer('li')],
      enemySlots: [mage()],
      skills: { '339': bolt },
    })
    s.players[0]!.status.protect = 3
    runTurn1(s, rng0, () => s.pendingActions.set(0, { kind: 'defend' }))
    expect(castDmg(s)).toBe(Math.trunc(raw(1, 30) / 5))
  })

  test('眠者无格挡资格:rng0 本该必中,除因子回 1 全额', () => {
    const s = createBattleState({
      players: [wfPlayer('li')],
      enemySlots: [mage()],
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
      players: [wfPlayer('li', { hp: 5 })],
      enemySlots: [mage()],
      skills: { '339': bolt },
    })
    runTurn1(s, rng0, () => s.pendingActions.set(0, { kind: 'defend' }))
    expect(castDmg(s)).toBe(5)
    expect(s.players[0]!.hp).toBe(0)

    // 无最小 1:magStr = -99+42 = -57 → 钳 0;power 0 → calcBaseDamage(0,30)=0 → 造成 0
    const bolt0 = { ...bolt, effects: [{ kind: 'damage' as const, power: 0, elemental: 0 }] }
    const s2 = createBattleState({
      players: [wfPlayer('li')],
      enemySlots: [mage({ magicStrength: -99 })],
      skills: { '339': bolt0 },
    })
    runTurn1(s2, rng0, () => s2.pendingActions.set(0, { kind: 'defend' }))
    expect(castDmg(s2)).toBe(0)
    expect(s2.players[0]!.hp).toBe(100)
  })
})
