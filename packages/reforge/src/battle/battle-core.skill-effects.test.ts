import type { EnemyDef, ItemData, SkillData } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  wfEnemy,
  wfHealItem,
  wfPlayer,
  wfThrowItem,
} from '../__tests__/battle-workflows/catalog.js'
import { expectDefined } from '../defined.js'
import { createBattleState, pendingItemUses, stepBattle } from './battle-core.js'

const rng0 = () => 0

describe('玩家与敌方法术效果路由', () => {
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
    wfEnemy('dummy', { attackStrength: 0, health: 9999, ...o })

  test('玩家技能 0x28 投影也在成功新增敌毒时立即执行 enemy tick0', () => {
    const poisonSkill = mkSkill('poison', {
      effects: [{ kind: 'applyPoison', poisonId: '552' }],
    })
    const s = createBattleState({
      players: [wfPlayer('li', { baseDexterity: 500, skills: ['poison'] })],
      enemySlots: [dummy({ health: 1000, dexterity: 0 })],
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
      players: [wfPlayer('li', { skills: ['lh'] })],
      enemySlots: [dummy({ health: 100, collectValue: 5 })],
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
      players: [wfPlayer('li', { skills: ['lh'] })],
      enemySlots: [dummy({ health: 100, collectValue: 5 })],
      skills: { lh },
    })
    turn(s2, rng0, (st) =>
      st.pendingActions.set(0, { kind: 'cast', skillId: 'lh', targetEnemyIdx: 0 }),
    )
    expect(s2.enemies[0]!.hp).toBe(100)
    expect(s2.collectGained).toBe(0)
    expect(s2.log.some((l) => l.includes('无任何效果'))).toBe(true)
  })

  test('灵葫咒在残血敌没有灵葫值时终止后续即死', () => {
    const gourd = mkSkill('gourd', {
      effects: [
        { kind: 'gate', hpAtMostPercent: 25 },
        { kind: 'gate', chance: 60 },
        { kind: 'collectTreasure' },
        { kind: 'instantKill' },
      ],
    })
    const state = createBattleState({
      players: [wfPlayer('li', { skills: [gourd.id], baseDexterity: 500 })],
      enemySlots: [dummy({ health: 100, collectValue: 0 })],
      skills: { [gourd.id]: gourd },
    })
    state.enemies[0]!.hp = 25
    stepBattle(state, rng0)
    state.pendingActions.set(0, { kind: 'cast', skillId: gourd.id, targetEnemyIdx: 0 })
    stepBattle(state, rng0)
    stepBattle(state, rng0)
    expect(state.enemies[0]!.hp).toBe(25)
    expect(state.collectGained).toBe(0)
    expect(state.lastAction?.failureFeedback).toBe('spellIneffective')
  })

  test('概率门(0x06):掷 100 ≥ 60 → 截断即死;灵抗门:巫抗 0 过 / 巫抗满不过', () => {
    const kill60 = mkSkill('k60', {
      effects: [{ kind: 'gate', chance: 60 }, { kind: 'instantKill' }],
    })
    const s = createBattleState({
      players: [wfPlayer('li', { skills: ['k60'] })],
      enemySlots: [dummy()],
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
      players: [wfPlayer('li', { skills: ['mres'] })],
      enemySlots: [{ ...dummy(), ai: { resistanceToSorcery: 0 } }],
      skills: { mres },
    })
    turn(pass, rng0, (st) =>
      st.pendingActions.set(0, { kind: 'cast', skillId: 'mres', targetEnemyIdx: 0 }),
    )
    expect(pass.enemies[0]!.hp).toBe(0)
    const block = createBattleState({
      players: [wfPlayer('li', { skills: ['mres'] })],
      enemySlots: [dummy()],
      skills: { mres },
    })
    turn(block, rng0, (st) =>
      st.pendingActions.set(0, { kind: 'cast', skillId: 'mres', targetEnemyIdx: 0 }),
    )
    expect(block.enemies[0]!.hp).toBe(9999)
  })

  test('状态术把概率门失败/全目标抵抗写成结构化失败反馈，成功不误报', () => {
    const statusSkill = mkSkill('status-feedback', {
      effects: [
        { kind: 'gate', chance: 44 },
        { kind: 'applyStatus', status: 'confused', turns: 4 },
      ],
    })
    const castOnce = (resistanceToSorcery: number, rng: () => number) => {
      const s = createBattleState({
        players: [wfPlayer('li', { skills: [statusSkill.id], baseDexterity: 500 })],
        enemySlots: [
          {
            ...dummy(),
            ai: { resistanceToSorcery },
          },
        ],
        skills: { [statusSkill.id]: statusSkill },
      })
      stepBattle(s, rng)
      s.pendingActions.set(0, {
        kind: 'cast',
        skillId: statusSkill.id,
        targetEnemyIdx: 0,
      })
      stepBattle(s, rng)
      expect(s.actionQueue[0]?.isEnemy).toBe(false)
      stepBattle(s, rng)
      expect(s.lastAction?.kind).toBe('cast')
      return s
    }

    const chanceFailed = castOnce(0, () => 0.99)
    expect(chanceFailed.enemies[0]!.status.confused).toBe(0)
    expect(chanceFailed.lastAction?.failureFeedback).toBe('statusIneffective')

    const resisted = castOnce(10, rng0)
    expect(resisted.enemies[0]!.status.confused).toBe(0)
    expect(resisted.lastAction?.failureFeedback).toBe('statusIneffective')

    const succeeded = castOnce(0, rng0)
    expect(succeeded.enemies[0]!.status.confused).toBe(4)
    expect(succeeded.lastAction?.failureFeedback).toBeUndefined()
  })

  test('状态失败反馈按整次敌方 action 聚合：友方 gate 不误报，多状态任一成功即不报', () => {
    const castOnce = (definition: SkillData, enemyResistance: number, rolls: number[]) => {
      const draws = rolls.values()
      const rng = () => expectDefined(draws.next().value)
      const s = createBattleState({
        players: [wfPlayer('li', { skills: [definition.id], baseDexterity: 500 })],
        enemySlots: [{ ...dummy(), ai: { resistanceToSorcery: enemyResistance } }],
        skills: { [definition.id]: definition },
      })
      stepBattle(s, rng)
      s.pendingActions.set(0, {
        kind: 'cast',
        skillId: definition.id,
        ...(definition.target === 'oneEnemy' ? { targetEnemyIdx: 0 } : { targetAllyIdx: 0 }),
      })
      stepBattle(s, rng)
      expect(s.actionQueue[0]?.isEnemy).toBe(false)
      stepBattle(s, rng)
      return s
    }

    const ally = mkSkill('ally-gated-status', {
      target: 'oneAlly',
      effects: [
        { kind: 'gate', chance: 44 },
        { kind: 'applyStatus', status: 'haste', turns: 4 },
      ],
    })
    const allyFailed = castOnce(ally, 10, [0, 0, 0.99, 0])
    expect(allyFailed.players[0]!.status.haste).toBe(0)
    expect(allyFailed.players[0]!.hiddenCounts.maxMP).toBe(2)
    expect(allyFailed.lastAction?.failureFeedback).toBeUndefined()

    const twoStatuses = mkSkill('two-enemy-statuses', {
      effects: [
        { kind: 'applyStatus', status: 'sleep', turns: 2 },
        { kind: 'applyStatus', status: 'confused', turns: 4 },
      ],
    })
    // 队列两掷 → sleep 抵抗(0) → confused 命中(9) → 隐藏成长。
    const partiallyApplied = castOnce(twoStatuses, 5, [0, 0, 0, 0.99, 0])
    expect(partiallyApplied.enemies[0]!.status.sleep).toBe(0)
    expect(partiallyApplied.enemies[0]!.status.confused).toBe(4)
    expect(partiallyApplied.lastAction?.failureFeedback).toBeUndefined()

    const fullyResisted = castOnce(twoStatuses, 10, [0, 0, 0, 0, 0])
    expect(fullyResisted.lastAction?.failureFeedback).toBe('statusIneffective')
  })

  test('偷窃(fight.c:5193):偷物入包、余量递减、偷光一无所获;偷钱敌走 moneyDelta', () => {
    const st6 = mkSkill('steal6', { effects: [{ kind: 'steal', rate: 6 }] })
    const s = createBattleState({
      players: [wfPlayer('li', { skills: ['steal6'] })],
      enemySlots: [{ ...dummy(), steal: { itemId: '91', count: 2 } }],
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
      players: [wfPlayer('li', { skills: ['steal6'] })],
      enemySlots: [{ ...dummy(), steal: { itemId: '0', count: 100 } }],
      skills: { steal6: st6 },
    })
    turn(coins, rng0, cast)
    expect(coins.moneyDelta).toBe(50)
    expect(coins.enemies[0]!.stealLeft).toBe(50)
  })

  test('金蝉脱壳耗费 33 真气，禁逃时继续战斗', () => {
    const jc = mkSkill('jc', {
      target: 'allAllies',
      cost: { mp: 33 },
      effects: [{ kind: 'fleeBattle' }],
    })
    const mk = (boss: boolean) =>
      createBattleState({
        players: [wfPlayer('li', { skills: ['jc'], mp: 50, maxMp: 50 })],
        enemySlots: [dummy()],
        skills: { jc },
        boss,
      })
    const s = mk(false)
    turn(s, rng0, (st) => st.pendingActions.set(0, { kind: 'cast', skillId: 'jc' }))
    expect(s.phase).toBe('fled')
    expect(s.players[0]!.mp).toBe(17) // MP 33 照扣
    const b = mk(true)
    turn(b, rng0, (st) => st.pendingActions.set(0, { kind: 'cast', skillId: 'jc' }))
    expect(b.phase).toBe('selectAction')
    expect(b.players[0]!.mp).toBe(17)
    expect(b.log.some((l) => l.includes('无法逃离'))).toBe(true)
  })

  test('乾坤一掷按上限扣钱，零基础威力跳过伤害', () => {
    const qk = mkSkill('qk', {
      target: 'allEnemies',
      cost: { mp: 1 },
      effects: [{ kind: 'moneyDamage', maxSpend: 5000, num: 2, den: 5, elemental: 0 }],
    })
    const mk = (money: number) =>
      createBattleState({
        players: [wfPlayer('li', { skills: ['qk'] })],
        enemySlots: [dummy({ health: 9999 })],
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
    expect(poor.players[0]!.mp).toBe(29)
    expect(poor.log.some((l) => l.includes('金钱不足'))).toBe(true)
    const one = mk(1)
    turn(one, rng0, (st) => st.pendingActions.set(0, { kind: 'cast', skillId: 'qk' }))
    expect(one.moneyDelta).toBe(-1)
    expect(one.enemies[0]!.hp).toBe(9999)
  })

  test('铜钱镖选招后检查固定金钱成本，缺钱时只扣真气并保留成长', () => {
    const tq = mkSkill('tq', {
      target: 'oneEnemy',
      cost: { mp: 1, money: 500 },
      effects: [{ kind: 'damage', power: 198, elemental: 0 }],
    })
    const mk = (money: number) =>
      createBattleState({
        players: [wfPlayer('li', { skills: ['tq'] })],
        enemySlots: [dummy({ health: 9999 })],
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
    expect(poor.moneyDelta).toBe(0)
    expect(poor.enemies[0]!.hp).toBe(9999)
    expect(poor.players[0]!.mp).toBe(29)
    expect(poor.players[0]!.hiddenCounts.maxMP).toBe(2)
    expect(poor.log.some((l) => l.includes('金钱不足'))).toBe(true)
  })

  test('解状态(0x2F)按 targetAllyIdx 点名队友;buffStat 烙属性 + 定时到期扣回', () => {
    const bx = mkSkill('bx', {
      target: 'oneAlly',
      effects: [{ kind: 'removeStatus', statuses: ['confused', 'paralyzed', 'sleep'] }],
    })
    const s = createBattleState({
      players: [wfPlayer('li', { skills: ['bx'] }), wfPlayer('ling')],
      enemySlots: [dummy()],
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
      players: [wfPlayer('li', { skills: ['buff'], attackStrength: 40, baseDexterity: 50 })],
      enemySlots: [dummy()],
      skills: { buff },
    })
    const caster = expectDefined(b.players[0])
    stepBattle(b, rng0)
    b.pendingActions.set(0, { kind: 'cast', skillId: 'buff' })
    stepBattle(b, rng0)
    stepBattle(b, rng0)
    expect(caster.attackStrength).toBe(80)
    expect(caster.baseDexterity).toBe(75)
    stepBattle(b, rng0)
    stepBattle(b, rng0)
    expect(b.phase).toBe('selectAction')
    expect(caster.attackStrength).toBe(80)
    expect(caster.baseDexterity).toBe(50)
    turn(b, rng0, (st) => st.pendingActions.set(0, { kind: 'defend' }))
    expect(b.players[0]!.attackStrength).toBe(80)
  })

  test('复活(0x22 全语义):还魂咒仅救死者 + 解重毒 + 清临时状态(装备派生状态保留)', () => {
    const rev = mkSkill('rev', { target: 'oneAlly', effects: [{ kind: 'revive', hpPercent: 10 }] })
    const s = createBattleState({
      players: [
        wfPlayer('li', { skills: ['rev'] }),
        wfPlayer('ling', { maxHp: 200, poisons: [{ poisonId: 1, tickIndex: 0 }] }),
      ],
      enemySlots: [dummy()],
      skills: { rev },
      poisonDefs: { 1: { id: 1, name: '赤毒', curability: 'common', color: 0 } },
    })
    const t = s.players[1]!
    t.hp = 0
    t.status.confused = 3 // 定时状态:复活应清
    t.status.dualAttack = 5 // 临时双攻:复活应清
    t.grantedStatuses = ['dualAttack'] // 装备常驻派生:应保留
    turn(s, rng0, (st) => {
      st.pendingActions.set(0, { kind: 'cast', skillId: 'rev', targetAllyIdx: 1 })
      st.pendingActions.set(1, { kind: 'defend' })
    })
    expect(t.hp).toBe(20) // 200×10%
    expect(t.poisons.length).toBe(0)
    expect(t.status.confused).toBe(0)
    expect(t.status.dualAttack).toBe(0)
    expect(t.grantedStatuses).toContain('dualAttack')
    expect(s.log.some((l) => l.includes('死而复生'))).toBe(true)
    // 对活人无效果
    turn(s, rng0, (st) => {
      st.pendingActions.set(0, { kind: 'cast', skillId: 'rev', targetAllyIdx: 1 })
      st.pendingActions.set(1, { kind: 'defend' })
    })
    expect(t.hp).toBe(20)
    expect(s.log.some((l) => l.includes('无任何效果'))).toBe(true)
  })

  test('解状态只清临时层，不会卸掉装备授予的双攻', () => {
    const cleanse = mkSkill('cleanse', {
      target: 'oneAlly',
      effects: [{ kind: 'removeStatus', statuses: ['dualAttack'] }],
    })
    const s = createBattleState({
      players: [
        wfPlayer('li', { skills: ['cleanse'] }),
        wfPlayer('ling', { grantedStatuses: ['dualAttack'] }),
      ],
      enemySlots: [dummy()],
      skills: { cleanse },
    })
    s.players[1]!.status.dualAttack = 3
    turn(s, rng0, (st) => {
      st.pendingActions.set(0, { kind: 'cast', skillId: 'cleanse', targetAllyIdx: 1 })
      st.pendingActions.set(1, { kind: 'defend' })
    })
    expect(s.players[1]!.status.dualAttack).toBe(0)
    expect(s.players[1]!.grantedStatuses).toContain('dualAttack')
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
      players: [wfPlayer('li'), wfPlayer('ling', { maxHp: 200 })],
      enemySlots: [dummy()],
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
      ...wfEnemy('reaper', { health: 9999, attackStrength: 0 }),
      ai: { resistanceToSorcery: 5, rules: [{ at: 'act', do: { kind: 'cast', skillId: 'dh' } }] },
    } as EnemyDef
    const s = createBattleState({
      players: [wfPlayer('li'), wfPlayer('ling')],
      enemySlots: [reaper],
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
      players: [wfPlayer('li'), wfPlayer('ling')],
      enemySlots: [reaper],
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
      ...wfEnemy('snake', { health: 9999, attackStrength: 0 }),
      ai: { resistanceToSorcery: 5, rules: [{ at: 'act', do: { kind: 'cast', skillId: 'px' } }] },
    } as EnemyDef
    const hit = createBattleState({
      players: [wfPlayer('li')],
      enemySlots: [snake],
      skills: { px },
      poisonDefs: { 1: { id: 1, name: '赤毒', curability: 'common', color: 0 } },
    })
    turn(hit, rng0, (st) => st.pendingActions.set(0, { kind: 'defend' })) // 掷 1 > 毒抗 0 → 中
    expect(hit.players[0]!.poisons.length).toBe(1)
    const resist = createBattleState({
      players: [wfPlayer('li', { poisonRes: 50 })],
      enemySlots: [snake],
      skills: { px },
    })
    turn(resist, rng0, (st) => st.pendingActions.set(0, { kind: 'defend' })) // 掷 1 ≤ 50 → 抗住
    expect(resist.players[0]!.poisons.length).toBe(0)
  })

  test('隐身(0x5C 隐蛊):负值待激活→行动步前激活(同轮敌即跳过),3 轮不行动,轮末递减恢复', () => {
    const s = createBattleState({
      players: [wfPlayer('li', { hp: 100 })],
      enemySlots: [dummy({ attackStrength: 100, health: 9999 })],
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
          wfPlayer('ling'), // slot0 守护者(健康)
          wfPlayer('li', { hp: 10, maxHp: 100, coveredBy: 'ling' }), // slot1 濒死(10 < 100/5)
        ],
        enemySlots: [dummy({ attackStrength: 50 })],
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
    const consumable = wfHealItem('yao')
    const reusable = wfHealItem('zhu')
    const throwingItem = wfThrowItem('du')
    const s = createBattleState({
      players: [wfPlayer('li'), wfPlayer('ling')],
      enemySlots: [dummy()],
      items: {
        yao: consumable,
        zhu: { ...reusable, use: { ...expectDefined(reusable.use), consuming: false } },
        du: throwingItem,
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
      players: [wfPlayer('ling', { skills: ['ms'], attackStrength: 30 })],
      enemySlots: [dummy()],
      skills: { ms: mengshe },
    })
    turn(s, rng0, (st) => st.pendingActions.set(0, { kind: 'cast', skillId: 'ms' }))
    expect(s.players[0]!.tranceBattleSprite).toBe('battle-sprite.player.005')
    expect(s.players[0]!.attackStrength).toBe(60)
  })
})
