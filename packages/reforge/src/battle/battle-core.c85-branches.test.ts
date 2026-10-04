// TEST-COVERAGE85-GLM-REFORGE-1 — battle-core.ts 残留分支臂合同测试(r3 去重后)。
// 全部走公开 createBattleState/stepBattle/decideEnemyAction/applyEnemyEffect 入口,
// 定值 rng 驱动;断言业务状态/日志而非内部调用次数。
// 与既有 battle-core.test.ts / battle-enemy-confused.test.ts / battle-casualty.test.ts
// 重复的合同(divide 门与均分、transform 保 HP、summon 初始态、混乱派发、伤亡 sweep、
// 偷窃入包/余量/耗尽/偷钱 moneyDelta)已在 r3 撤销,本文件只保留非重复臂。
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
function runOneTurn(s: BattleState, rng: () => number): void {
  stepBattle(s, rng) // preBattle -> selectAction(turn 1)
  s.pendingActions.set(0, { kind: 'defend' })
  let guard = 0
  while (s.phase !== 'selectAction' || s.turn === 1) {
    stepBattle(s, rng)
    if (++guard > 60) throw new Error('battle did not settle within one turn')
  }
}

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
    steal: { itemId: string; count: number },
    items: Record<string, ItemData> = {},
  ): BattleState => {
    // 敌 dex 50 先手、玩家 dex 1 后手:偷窃是本回合最后一步,lastAction.notice 存活到回合末
    const s = createBattleState({
      players: [player('li', { skills: ['steal-hand'], attackStrength: 0, baseDexterity: 1 })],
      enemies: [
        mkEnemy('fat-boss', { health: 500, defense: 100, dexterity: 50, attackStrength: 5 }),
      ],
      skills: { 'steal-hand': stealSkill() },
      items,
    })
    const enemy = s.enemies[0]
    if (!enemy) throw new Error('enemy absent')
    enemy.def = { ...enemy.def, steal }
    stepBattle(s, () => 0)
    s.pendingActions.set(0, { kind: 'cast', skillId: 'steal-hand', targetEnemyIdx: 0 })
    let guard = 0
    while (s.phase !== 'selectAction' || s.turn === 1) {
      stepBattle(s, () => 0)
      if (++guard > 60) throw new Error('steal turn did not settle')
    }
    return s
  }

  test('偷窃非重复臂:lastAction notice 文案、未知道具名回落 itemId、c=0 静默不弹提示', () => {
    // 既有 battle-core.test.ts:3074 已覆盖偷物入包/余量递减/偷光一无所获/偷钱 moneyDelta;
    // 本测试只测它未覆盖的 notice 与回落臂(battle-core.ts:651,654,663)。
    const s = castStealTurn({ itemId: '0', count: 9 }, { relic: itemOf('relic', '夜行衣') })
    expect(s.lastAction?.notice).toBe('获得 4 文钱') // 651/654:获得文钱 notice
    const named = castStealTurn({ itemId: 'relic', count: 1 }, { relic: itemOf('relic', '夜行衣') })
    expect(named.lastAction?.notice).toBe('获得 夜行衣')
    // 663:items 表缺名 → notice 回落 itemId
    const mystery = castStealTurn({ itemId: 'mystery', count: 1 })
    expect(mystery.lastAction?.notice).toBe('获得 mystery')
    // 651 false 臂:余量 1 → c = trunc(1/2) = 0 → moneyDelta 不动且不弹文钱 notice
    const zero = castStealTurn({ itemId: '0', count: 1 })
    expect(zero.moneyDelta).toBe(0)
    expect(zero.lastAction?.notice).toBeUndefined()
    expect(zero.log).not.toContain('li 获得 0 文钱')
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
})

describe('C85 回合末臂', () => {
  test('装备回蓝臂:regenMp 每回合回蓝并钳上限', () => {
    const s = createBattleState({
      players: [player('li', { mp: 26, maxMp: 30, regenHp: 3, regenMp: 5 })],
      enemies: [mkEnemy('e')],
    })
    runOneTurn(s, () => 0)
    expect(s.players[0]?.mp).toBe(30)
  })
})
