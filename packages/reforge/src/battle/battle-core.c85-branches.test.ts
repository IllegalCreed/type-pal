// TEST-COVERAGE85-GLM-REFORGE-1 — battle-core.ts 残留分支臂合同测试。
// 全部走公开 createBattleState/stepBattle/decideEnemyAction/applyEnemyEffect 入口,
// 定值 rng 驱动;断言业务状态/日志而非内部调用次数。
import type { EnemyDef, ItemData, PoisonDef, SkillData } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  applyEnemyEffect,
  type BattleState,
  type CreatePlayerInput,
  createBattleState,
  decideEnemyAction,
  stepBattle,
} from './battle-core.js'

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
      attackStrength: 5,
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

const skill = (id: string, effects: SkillData['effects']): SkillData => ({
  id,
  name: `skill.${id}`,
  desc: '',
  cost: { mp: 0 },
  target: 'oneEnemy',
  usableOutsideBattle: false,
  effects,
  animation: { effectSprite: 0 },
})

const poison = (
  over: Partial<PoisonDef> & Pick<PoisonDef, 'playerTicks' | 'enemyTicks'>,
): PoisonDef => ({
  id: 1,
  name: '',
  curability: 'common',
  color: 0,
  ...over,
})

/** 从 preBattle 起跑一整回合:防御过,回 selectAction 且 turn>1。 */
function runOneTurn(
  s: BattleState,
  rng: () => number,
  action: { kind: 'defend' } = { kind: 'defend' },
): void {
  stepBattle(s, rng) // preBattle -> selectAction(turn 1)
  s.pendingActions.set(0, action)
  let guard = 0
  while (s.phase !== 'selectAction' || s.turn === 1) {
    stepBattle(s, rng)
    if (++guard > 60) throw new Error('battle did not settle within one turn')
  }
}

describe('C85 建态与槽位臂', () => {
  test('deprecated enemies 别名臂:dense enemies 建出与 enemySlots 等价的敌阵', () => {
    const dense = createBattleState({ players: [player('li')], enemies: [mkEnemy('a')] })
    const slotted = createBattleState({ players: [player('li')], enemySlots: [mkEnemy('a')] })
    expect(dense.maxEnemyIndex).toBe(slotted.maxEnemyIndex)
    expect(dense.enemies[0]?.def.id).toBe('a')
    expect(createBattleState({ players: [player('li')], enemySlots: [] }).maxEnemyIndex).toBe(-1)
  })

  test('divide 扩上限臂:分裂填入 maxEnemyIndex 之外的空槽,全场站位随新上限重排', () => {
    const s = createBattleState({
      players: [player('li')],
      enemies: [mkEnemy('lizard', { health: 90 })],
    })
    const before = s.enemies[0]?.basePos
    const result = applyEnemyEffect(s, 0, { kind: 'divide', copies: 3 })
    expect(result.outcome).toBe('succeeded')
    expect(result.spawnedIdxs).toEqual([1, 2, 3])
    expect(s.maxEnemyIndex).toBe(3)
    expect(s.enemies.every((e, i) => i > 3 || e?.hp === 23)).toBe(true)
    expect(s.enemies[0]?.basePos).not.toEqual(before)
  })
})

describe('C85 毒系统臂', () => {
  test('mpDelta 分侧臂:玩家毒扣蓝,敌毒无 mp 槽只走 HP 不崩', () => {
    const s = createBattleState({
      players: [player('li', { mp: 30, poisons: [{ poisonId: 1, tickIndex: 0 }] })],
      enemies: [mkEnemy('e0', { health: 50 })],
      poisonDefs: {
        1: poison({
          name: '赤毒',
          playerTicks: [{ mpDelta: -4 }],
          enemyTicks: [{ mpDelta: -7, hpDelta: -1 }],
        }),
      },
    })
    const enemy = s.enemies[0]
    if (!enemy) throw new Error('enemy absent')
    enemy.poisons = [{ poisonId: 1, tickIndex: 0 }]
    runOneTurn(s, () => 0)
    expect(s.players[0]?.mp).toBe(26)
    expect(enemy.hp).toBe(49)
    expect(s.log).toContain('li 赤毒 发作')
    expect(s.log).toContain('1 赤毒 发作') // 敌侧前缀 = 毒 def id(敌无 roleId)
  })

  test('毒名缺省与到期产物臂:无 name 按 id 合成名,grantItem 优先叠已有背包槽', () => {
    const s = createBattleState({
      players: [player('li', { hp: 500, maxHp: 500, poisons: [{ poisonId: 3, tickIndex: 0 }] })],
      inventory: [{ itemId: 'gu', count: 2 }],
      enemies: [mkEnemy('e')],
      poisonDefs: {
        3: poison({ id: 3, playerTicks: [{ hpDelta: -1, grantItem: 'gu' }], enemyTicks: [] }),
        4: poison({ id: 4, playerTicks: [{ hpDelta: -1, grantItem: 'new-drop' }], enemyTicks: [] }),
      },
    })
    s.players[0]?.poisons.push({ poisonId: 4, tickIndex: 0 })
    runOneTurn(s, () => 0)
    expect(s.log).toContain('毒3 到期化作 gu')
    expect(s.log).toContain('毒4 到期化作 new-drop')
    expect(s.inventory).toEqual([
      { itemId: 'gu', count: 3 },
      { itemId: 'new-drop', count: 1 },
    ])
    expect(s.players[0]?.poisons.map((p) => p.poisonId)).toEqual([3, 4])
  })
})

describe('C85 偷窃臂(performSteal 经 cast 效果链驱动)', () => {
  const stealSkill = (): SkillData => skill('steal-hand', [{ kind: 'steal', rate: 100 }])

  const itemOf = (id: string, name: string): ItemData => ({
    id,
    name,
    desc: [],
    buyPrice: 0,
    sellPrice: 0,
    sellable: false,
  })
  const castStealTurn = (
    steal: { itemId: string; count: number } | undefined,
    items: Record<string, ItemData> = {},
  ): BattleState => {
    const s = createBattleState({
      // 敌 dex 50 先手、玩家 dex 1 后手:偷窃是本回合最后一步,lastAction.notice 存活到回合末
      players: [player('li', { skills: ['steal-hand'], attackStrength: 0, baseDexterity: 1 })],
      enemies: [
        mkEnemy('fat-boss', { health: 500, defense: 100, dexterity: 50, attackStrength: 5 }),
      ],
      skills: { 'steal-hand': stealSkill() },
      items,
    })
    const enemy = s.enemies[0]
    if (!enemy) throw new Error('enemy absent')
    enemy.def = { ...enemy.def, ...(steal ? { steal } : {}) }
    stepBattle(s, () => 0)
    s.pendingActions.set(0, { kind: 'cast', skillId: 'steal-hand', targetEnemyIdx: 0 })
    let guard = 0
    while (s.phase !== 'selectAction' || s.turn === 1) {
      stepBattle(s, () => 0)
      if (++guard > 60) throw new Error('steal turn did not settle')
    }
    return s
  }

  test('偷钱臂:余量按 R(2,3) 分成入 moneyDelta 并留获得文钱 notice', () => {
    const s = castStealTurn({ itemId: '0', count: 9 })
    expect(s.moneyDelta).toBe(4) // floor(9 / (2 + 0)) = 4
    expect(s.lastAction?.notice).toBe('获得 4 文钱')
    expect(s.log).toContain('li 获得 4 文钱')
    expect(s.enemies[0]?.stealLeft).toBe(5)
  })

  test('偷物臂:具名道具入背包;未知道具名回落 itemId', () => {
    const s = castStealTurn({ itemId: 'relic', count: 2 }, { relic: itemOf('relic', '夜行衣') })
    expect(s.inventory).toEqual([{ itemId: 'relic', count: 1 }])
    expect(s.lastAction?.notice).toBe('获得 夜行衣')

    const s2 = castStealTurn({ itemId: 'mystery', count: 1 })
    expect(s2.lastAction?.notice).toBe('获得 mystery')
  })

  test('偷空臂:余量耗尽后命中也一无所获', () => {
    const s = castStealTurn({ itemId: '0', count: 0 })
    expect(s.moneyDelta).toBe(0)
    expect(s.inventory).toEqual([])
    expect(s.log).toContain('li 施展偷窃,一无所获')
  })
})

describe('C85 AI 决策臂', () => {
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

  test('沉默臂:技能在表的 cast fallback 被沉默拦回落普攻(规则路径由求值器先跳过)', () => {
    const silenced = mkEnemy('silenced')
    silenced.ai = {
      resistanceToSorcery: 5,
      fallback: { action: { kind: 'cast', skillId: 'bolt' }, chancePercent: 100 },
    }
    const s = createBattleState({
      players: [player('li')],
      enemies: [silenced],
      skills: { bolt },
    })
    const enemy = s.enemies[0]
    if (!enemy) throw new Error('enemy absent')
    enemy.status.silence = 2
    // rng: 预选目标 0;fallback 门 rng(0)*100 < 100 命中 cast → 沉默拦截 → 普攻
    const decision = decideEnemyAction(s, enemy, () => 0)
    expect(decision).toMatchObject({ kind: 'attack', targetPlayerIdx: 0 })
    expect(s.log).not.toContain('silenced 施法 bolt 缺技能数据,落普攻')
  })

  test('缺数据落普攻臂:transform/summon 引用缺失时 log 提示并落普攻', () => {
    const transformer = mkEnemy('doppel')
    transformer.ai = {
      resistanceToSorcery: 5,
      rules: [{ at: 'act', do: { kind: 'transform', enemyId: 'ghost' } }],
    }
    const s = createBattleState({ players: [player('li')], enemies: [transformer] })
    expect(decideEnemyAction(s, s.enemies[0]!, () => 0).kind).toBe('attack')
    expect(s.log).toContain('doppel 变身 ghost 缺敌人数据,落普攻')

    const summoner = mkEnemy('caller')
    summoner.ai = {
      resistanceToSorcery: 5,
      rules: [{ at: 'act', do: { kind: 'summon', enemyId: 'ghost', count: 1 } }],
    }
    const s2 = createBattleState({ players: [player('li')], enemies: [summoner] })
    expect(decideEnemyAction(s2, s2.enemies[0]!, () => 0).kind).toBe('attack')
    expect(s2.log).toContain('caller 召唤 ghost 缺敌人数据,落普攻')
  })

  test('无 enemyId 召唤臂:召唤动作回落召唤者自身定义', () => {
    const summoner = mkEnemy('self-caller')
    summoner.ai = {
      resistanceToSorcery: 5,
      rules: [{ at: 'act', do: { kind: 'summon', count: 1 } }],
    }
    const s = createBattleState({ players: [player('li')], enemySlots: [summoner, null] })
    const decision = decideEnemyAction(s, s.enemies[0]!, () => 0)
    expect(decision).toMatchObject({ kind: 'summon', count: 1 })
    if (decision.kind === 'summon') expect(decision.def.id).toBe('self-caller')
  })

  test('混乱臂:唯一敌混乱咬不到同伴转 pass;多敌时咬中同伴', () => {
    const lone = mkEnemy('confused-lone')
    const s = createBattleState({ players: [player('li')], enemies: [lone] })
    const enemy = s.enemies[0]
    if (!enemy) throw new Error('enemy absent')
    enemy.status.confused = 2
    expect(decideEnemyAction(s, enemy, () => 0)).toEqual({ kind: 'pass' })

    const s2 = createBattleState({
      players: [player('li')],
      enemies: [mkEnemy('a'), mkEnemy('b')],
    })
    const b = s2.enemies[1]
    if (!b) throw new Error('enemy absent')
    b.status.confused = 2
    const seq = [0, 0.4]
    expect(decideEnemyAction(s2, b, () => seq.shift() ?? 0)).toEqual({
      kind: 'attackMate',
      targetEnemyIdx: 0,
    })
  })
})

describe('C65 敌效果门', () => {
  test('死亡宿主臂:applyEnemyEffect 对死者直接 failed', () => {
    const s = createBattleState({ players: [player('li')], enemies: [mkEnemy('e')] })
    const enemy = s.enemies[0]
    if (!enemy) throw new Error('enemy absent')
    enemy.hp = 0
    expect(applyEnemyEffect(s, 0, { kind: 'summon', enemyId: 'e', count: 1 })).toEqual({
      outcome: 'failed',
      kind: 'summon',
    })
  })

  test('召唤解析臂:显式 resolvedTarget 优先于表查询;无 fallback 的目标不带 fallback', () => {
    const target = mkEnemy('minion', { health: 12 })
    const s = createBattleState({
      players: [player('li')],
      enemySlots: [mkEnemy('caller'), null, null],
    })
    const result = applyEnemyEffect(s, 0, { kind: 'summon', enemyId: 'whatever', count: 1 }, target)
    expect(result.outcome).toBe('succeeded')
    expect(result.spawnedIdxs).toEqual([1])
    expect(s.enemies[1]?.def.id).toBe('minion')
    expect(s.enemies[1]?.fallback).toBeUndefined()
    expect(s.enemies[1]?.hp).toBe(12)
  })

  test('transform 解析臂:enemiesById 命中即换定义并保留余量', () => {
    const next = mkEnemy('adult', { health: 77 })
    const s = createBattleState({
      players: [player('li')],
      enemies: [mkEnemy('larva', { health: 30 })],
      enemiesById: { adult: next },
    })
    const result = applyEnemyEffect(s, 0, { kind: 'transform', enemyId: 'adult' })
    expect(result.outcome).toBe('succeeded')
    expect(result.beforeDef?.id).toBe('larva')
    expect(s.enemies[0]?.def.id).toBe('adult')
    expect(s.enemies[0]?.hp).toBe(30) // 换定义保当前 HP
  })
})

describe('C85 回合末与伤亡臂', () => {
  test('装备回蓝臂:regenMp 每回合回蓝并钳上限', () => {
    const s = createBattleState({
      players: [player('li', { mp: 26, maxMp: 30, regenHp: 3, regenMp: 5 })],
      enemies: [mkEnemy('e')],
    })
    runOneTurn(s, () => 0)
    expect(s.players[0]?.mp).toBe(30)
  })

  test('濒死伤亡臂:濒死队员睡着时不触发 dying 脚本', () => {
    const guardActor = mkEnemy('e', { attackStrength: 0 })
    const s = createBattleState({
      players: [
        player('li', { maxHp: 100, hp: 60 }),
        player('yu-ru', { maxHp: 100, hp: 60, coveredBy: 'li' }),
      ],
      enemies: [guardActor],
    })
    // 手工构造濒死 + 睡眠态(prevHp 高位跌入濒死;睡眠挡 dying)
    const yu = s.players[1]
    if (!yu) throw new Error('player absent')
    yu.prevHp = 90
    yu.hp = 10
    yu.status.sleep = 2
    runOneTurn(s, () => 0)
    expect(s.casualtyDialogue).toBeUndefined()
  })
})
