import type { AiAction, EnemyDef } from '@type-pal/content'
import { calcBaseDamage } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  applyEnemyEffect,
  type BattleState,
  type CreatePlayerInput,
  createBattleState,
  decideEnemyAction,
  stepBattle,
} from './battle-core.js'
import { getEnemyBasePos } from './battle-positions.js'

function enemy(id: string, stats: Partial<EnemyDef['stats']> = {}): EnemyDef {
  return {
    id,
    name: `name.${id}`,
    battleSprite: `battle-sprite.${id}`,
    yPosOffset: 0,
    stats: {
      health: 100,
      level: 1,
      exp: 5,
      cash: 3,
      attackStrength: 20,
      magicStrength: 0,
      defense: 10,
      dexterity: 10,
      fleeRate: 0,
      physicalResistance: 1,
      poisonResistance: 0,
      elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
      dualMove: false,
      collectValue: 0,
      ...stats,
    },
    ai: { resistanceToSorcery: 0 },
    sounds: {},
  }
}

function player(overrides: Partial<CreatePlayerInput> = {}): CreatePlayerInput {
  return {
    roleId: 'hero',
    actorTemplateId: 'hero',
    hp: 100,
    maxHp: 100,
    mp: 0,
    maxMp: 0,
    attackStrength: 1,
    defense: 1,
    magicStrength: 0,
    baseDexterity: 0,
    skills: [],
    fleeRate: 0,
    ...overrides,
  }
}

function sequence(values: readonly number[], fallback = 0) {
  let calls = 0
  return {
    rng: () => values[calls++] ?? fallback,
    calls: () => calls,
  }
}

function confusedState(slots: Array<EnemyDef | null>): BattleState {
  const state = createBattleState({ players: [player()], enemySlots: slots })
  state.enemies[0]!.status.confused = 3
  return state
}

function short(value: number): number {
  return (value << 16) >> 16
}

function expectedMateDamage(attacker: EnemyDef, target: EnemyDef): number {
  const str = short(attacker.stats.attackStrength) + (attacker.stats.level + 6) * 6
  const def = short(target.stats.defense) + (target.stats.level + 6) * 4
  const doubled = calcBaseDamage(str, def) * 2
  const raw =
    target.stats.physicalResistance === 0
      ? doubled
      : Math.trunc(doubled / target.stats.physicalResistance)
  return raw <= 0 ? 1 : raw
}

function performOneConfusedAttack(attacker: EnemyDef, target: EnemyDef) {
  const random = sequence([0, 0, 0, 0, 0.9])
  const state = confusedState([attacker, null, target])
  stepBattle(state, random.rng)
  state.pendingActions.set(0, { kind: 'defend' })
  stepBattle(state, random.rng)
  expect(state.actionQueue[0]).toMatchObject({ isEnemy: true, idx: 0 })
  stepBattle(state, random.rng)
  return { state, random }
}

describe('B10 敌人混乱决策与专用结算', () => {
  test('无活玩家不抽签；眠/定先消耗一次玩家目标后 Pass', () => {
    const noPlayer = confusedState([enemy('source'), enemy('mate')])
    noPlayer.players[0]!.hp = 0
    const none = sequence([])
    expect(decideEnemyAction(noPlayer, noPlayer.enemies[0]!, none.rng)).toEqual({ kind: 'pass' })
    expect(none.calls()).toBe(0)

    for (const status of ['sleep', 'paralyzed'] as const) {
      const state = confusedState([enemy('source'), enemy('mate')])
      state.enemies[0]!.status[status] = 2
      const random = sequence([0])
      expect(decideEnemyAction(state, state.enemies[0]!, random.rng)).toEqual({ kind: 'pass' })
      expect(random.calls()).toBe(1)
    }
  })

  test('silence 不压制混乱；玩家废弃抽签后按全敌槽拒绝 null/死槽', () => {
    const source = enemy('source')
    const dead = enemy('dead')
    const mate = enemy('mate')
    const state = confusedState([source, null, dead, mate])
    state.enemies[0]!.status.silence = 2
    state.enemies[2]!.hp = 0
    // 玩家槽 0 → 敌槽 1(null) → 敌槽 2(dead) → 敌槽 3(mate)。
    const random = sequence([0, 0.3, 0.55, 0.9])
    expect(decideEnemyAction(state, state.enemies[0]!, random.rng)).toEqual({
      kind: 'attackMate',
      targetEnemyIdx: 3,
    })
    expect(random.calls()).toBe(4)
  })

  test('抽到自己直接 Pass；异常 RNG 连续命中空槽在 64 次后有界退出', () => {
    const self = confusedState([enemy('source'), enemy('mate')])
    const pickSelf = sequence([0, 0])
    expect(decideEnemyAction(self, self.enemies[0]!, pickSelf.rng)).toEqual({ kind: 'pass' })
    expect(pickSelf.calls()).toBe(2)

    const guarded = confusedState([enemy('source'), null])
    const stuck = sequence([], 0.9)
    expect(decideEnemyAction(guarded, guarded.enemies[0]!, stuck.rng)).toEqual({ kind: 'pass' })
    // 1 次玩家抽签 + 1 次敌初抽 + 64 次拒绝重抽。
    expect(stuck.calls()).toBe(66)
  })

  test('confused 在普通 rules 与 fallback 前截断，不消费 once', () => {
    const actions: AiAction[] = [
      { kind: 'cast', skillId: 'missing', target: 'random' },
      { kind: 'transform', enemyId: 'missing' },
      { kind: 'summon', enemyId: 'missing', count: 1 },
      { kind: 'divide', copies: 1 },
      { kind: 'flee' },
    ]
    for (const action of actions) {
      const source = enemy(`source-${action.kind}`)
      source.ai = {
        resistanceToSorcery: 0,
        rules: [{ at: 'act', do: action, once: true }],
      }
      const state = confusedState([source, null, enemy('mate')])
      const random = sequence([0, 0.9])
      expect(decideEnemyAction(state, state.enemies[0]!, random.rng)).toEqual({
        kind: 'attackMate',
        targetEnemyIdx: 2,
      })
      expect(state.enemies[0]!.firedRules.size).toBe(0)
    }

    const fallback = enemy('fallback')
    fallback.ai = {
      resistanceToSorcery: 0,
      fallback: { action: { kind: 'cast', skillId: 'missing' }, chancePercent: 100 },
    }
    const state = confusedState([fallback, null, enemy('mate')])
    expect(decideEnemyAction(state, state.enemies[0]!, sequence([0, 0.9]).rng)).toEqual({
      kind: 'attackMate',
      targetEnemyIdx: 2,
    })
  })

  test('专用公式保留完整 overkill damage，HP 单独钳零且不进入普通防御/RNG 链', () => {
    const attacker = enemy('attacker', {
      health: 500,
      attackStrength: 100,
      dexterity: 999,
    })
    const target = enemy('target', {
      health: 30,
      defense: 10,
      physicalResistance: 2,
      dexterity: 0,
    })
    const expected = expectedMateDamage(attacker, target)
    expect(expected).toBeGreaterThan(target.stats.health)
    const { state, random } = performOneConfusedAttack(attacker, target)
    expect(state.enemies[2]!.hp).toBe(0)
    expect(state.players[0]!.hp).toBe(100)
    expect(state.lastAction).toEqual({
      side: 'enemy',
      idx: 0,
      kind: 'attackMate',
      targetEnemyIdx: 2,
      damage: expected,
    })
    expect(random.calls()).toBe(5)
  })

  test.each([
    ['物抗 0 不除', { attackStrength: 100 }, { defense: 10, physicalResistance: 0 }],
    [
      '高防/SHORT 负边界保底 1',
      { attackStrength: 32768 },
      { defense: 32767, physicalResistance: 9 },
    ],
    ['SHORT 正边界先截成 -1', { attackStrength: 65535 }, { defense: 65535, physicalResistance: 1 }],
  ] as const)('%s', (_label, attackerStats, targetStats) => {
    const attacker = enemy('attacker', {
      health: 500,
      dexterity: 999,
      ...attackerStats,
    })
    const target = enemy('target', {
      health: 9999,
      dexterity: 0,
      ...targetStats,
    })
    const { state } = performOneConfusedAttack(attacker, target)
    const damage = expectedMateDamage(attacker, target)
    expect(state.lastAction).toMatchObject({ kind: 'attackMate', damage })
    expect(state.enemies[2]!.hp).toBe(target.stats.health - damage)
  })

  test('dualMove 两次行动各自消费玩家/敌目标抽签并可命中不同同伴', () => {
    const source = enemy('source', {
      health: 500,
      attackStrength: 1,
      dexterity: 999,
      dualMove: true,
    })
    const mate1 = enemy('mate-1', { health: 999, defense: 0, dexterity: 0 })
    const mate2 = enemy('mate-2', { health: 999, defense: 0, dexterity: 0 })
    // queue:player,source×2,mate1,mate2 共 5 抽；两次行动各 2 抽。
    const random = sequence([0, 0, 0, 0, 0, 0, 0.4, 0, 0.9])
    const state = confusedState([source, mate1, mate2])
    stepBattle(state, random.rng)
    state.pendingActions.set(0, { kind: 'defend' })
    stepBattle(state, random.rng)
    expect(state.actionQueue.slice(0, 2)).toEqual([
      expect.objectContaining({ isEnemy: true, idx: 0 }),
      expect.objectContaining({ isEnemy: true, idx: 0 }),
    ])
    stepBattle(state, random.rng)
    expect(state.lastAction).toMatchObject({ kind: 'attackMate', targetEnemyIdx: 1 })
    stepBattle(state, random.rng)
    expect(state.lastAction).toMatchObject({ kind: 'attackMate', targetEnemyIdx: 2 })
    expect(state.enemies[1]!.hp).toBeLessThan(999)
    expect(state.enemies[2]!.hp).toBeLessThan(999)
    expect(random.calls()).toBe(9)
  })
})

describe('B10 固定敌槽下的 summon / divide', () => {
  test('summon 只填当前上限内空槽，count 非正归 1，且不足时不部分写入', () => {
    const caller = enemy('caller')
    const minion = enemy('minion')

    const noHole = createBattleState({
      players: [player()],
      enemySlots: [caller],
      enemiesById: { minion },
    })
    expect(
      applyEnemyEffect(noHole, 0, { kind: 'summon', enemyId: 'minion', count: 1 }).outcome,
    ).toBe('failed')
    expect(noHole.maxEnemyIndex).toBe(0)

    const defaultOne = createBattleState({
      players: [player()],
      enemySlots: [caller, null],
      enemiesById: { minion },
    })
    const spawned = applyEnemyEffect(defaultOne, 0, {
      kind: 'summon',
      enemyId: 'minion',
      count: 0,
    })
    expect(spawned).toMatchObject({ outcome: 'succeeded', spawnedIdxs: [1] })
    expect(defaultOne.maxEnemyIndex).toBe(1)

    const partial = createBattleState({
      players: [player()],
      enemySlots: [caller, null, enemy('occupied')],
      enemiesById: { minion },
    })
    expect(
      applyEnemyEffect(partial, 0, { kind: 'summon', enemyId: 'minion', count: 2 }).outcome,
    ).toBe('failed')
    expect(partial.enemies[1]).toBeNull()
  })

  test('summon 的 hiding/sleep/paralyzed/confused 门均不产生 mutation', () => {
    for (const gate of ['hiding', 'sleep', 'paralyzed', 'confused'] as const) {
      const caller = enemy(`caller-${gate}`)
      const minion = enemy('minion')
      const state = createBattleState({
        players: [player()],
        enemySlots: [caller, null],
        enemiesById: { minion },
      })
      if (gate === 'hiding') state.hidingTime = 1
      else state.enemies[0]!.status[gate] = 1
      expect(
        applyEnemyEffect(state, 0, { kind: 'summon', enemyId: 'minion', count: 1 }).outcome,
      ).toBe('failed')
      expect(state.enemies[1]).toBeNull()
    }
  })

  test('summon 复用死槽时按新敌人的 yOffset 重建站位，不继承尸体坐标', () => {
    const caller = enemy('caller')
    const corpse = enemy('corpse')
    corpse.yPosOffset = 20
    const minion = enemy('minion')
    minion.yPosOffset = 0
    const state = createBattleState({
      players: [player()],
      enemySlots: [caller, corpse],
      enemiesById: { minion },
    })
    state.enemies[1]!.hp = 0
    const corpsePos = { ...state.enemies[1]!.basePos }

    expect(
      applyEnemyEffect(state, 0, { kind: 'summon', enemyId: 'minion', count: 1 }),
    ).toMatchObject({ outcome: 'succeeded', spawnedIdxs: [1] })
    expect(state.enemies[1]!.basePos).toEqual(getEnemyBasePos(2, 1, minion.yPosOffset))
    expect(state.enemies[1]!.basePos).not.toEqual(corpsePos)
    expect(state.maxEnemyIndex).toBe(1)
  })

  test('divide 扫固定 5 槽、扩 maxEnemyIndex，并按新上限重算站位', () => {
    const blob = enemy('blob', { health: 90 })
    const state = createBattleState({ players: [player()], enemySlots: [blob] })
    const oldPos = { ...state.enemies[0]!.basePos }
    const result = applyEnemyEffect(state, 0, { kind: 'divide', copies: 2 })
    expect(result).toMatchObject({ outcome: 'succeeded', spawnedIdxs: [1, 2] })
    expect(state.maxEnemyIndex).toBe(2)
    expect(state.enemies.slice(0, 3).map((entry) => entry?.hp)).toEqual([30, 30, 30])
    expect(state.enemies[0]!.basePos).not.toEqual(oldPos)
    for (let i = 0; i <= 2; i += 1)
      expect(state.enemies[i]!.basePos).toEqual(getEnemyBasePos(3, i, 0))

    const overflow = createBattleState({ players: [player()], enemySlots: [blob] })
    expect(applyEnemyEffect(overflow, 0, { kind: 'divide', copies: 5 })).toMatchObject({
      outcome: 'succeeded',
      spawnedIdxs: [1, 2, 3, 4],
    })
    // 009C 填满固定 5 槽，但分母仍是请求的 5+1 份；缺的第六份不会回补。
    expect(overflow.maxEnemyIndex).toBe(4)
    expect(overflow.enemies.map((entry) => entry?.hp)).toEqual([15, 15, 15, 15, 15])
  })
})
