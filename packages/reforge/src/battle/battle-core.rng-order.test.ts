import type { EnemyDef, SkillData } from '@type-pal/content'
import { expect, test } from 'vitest'
import {
  type CreatePlayerInput,
  createBattleState,
  healthyPlayerCount,
  stepBattle,
} from './battle-core.js'

// Canonical PAL enemy-399 and the party-lanterns fixture's equipped Wu Hou.
const lantern: EnemyDef = {
  id: 'enemy-399',
  name: 'name.enemy-399',
  battleSprite: 'enemy-battle-2',
  yPosOffset: 0,
  stats: {
    health: 30,
    level: 1,
    exp: 1,
    cash: 3,
    attackStrength: 0,
    magicStrength: 6,
    defense: 0,
    dexterity: 0,
    fleeRate: 1,
    physicalResistance: 2,
    poisonResistance: 10,
    elemResistance: { wind: 2, thunder: 5, water: 5, fire: 0, earth: 5 },
    dualMove: false,
    collectValue: 1,
  },
  ai: { resistanceToSorcery: 10 },
  sounds: {},
}

const wuHou: CreatePlayerInput = {
  roleId: 'wu-hou',
  actorTemplateId: 'wu-hou',
  hp: 150,
  maxHp: 150,
  mp: 100,
  maxMp: 100,
  attackStrength: 350,
  defense: 248,
  magicStrength: 358,
  baseDexterity: 509,
  skills: [],
  fleeRate: 66,
}

// First two queue draws and next four draws from the Mulberry32 seed 708 reproduction.
const queueDraws = [0.004550792742520571, 0.9717323326040059]
const strikeDraws = [
  0.05668900837190449, 0.8924913087394089, 0.39028966007754207, 0.7917016907595098,
]

function fixedDraws(values: readonly number[]): () => number {
  const draws = values.values()
  return () => {
    const draw = draws.next()
    if (draw.done) throw new Error('Battle consumed a draw beyond the fixture')
    return draw.value
  }
}

test('enemy dexterity jitter receives the first draw when effective base dexterities match', () => {
  const rng = fixedDraws(queueDraws)
  const state = createBattleState({
    players: [{ ...wuHou, baseDexterity: 21 }],
    enemySlots: [lantern],
  })
  stepBattle(state, rng)
  state.pendingActions.set(0, { kind: 'attack', targetEnemyIdx: 0 })
  stepBattle(state, rng)

  // fight.c:1461-1565: effective dex 21 gets 18 for the enemy and 22 for the player.
  expect(state.actionQueue).toEqual([
    { isEnemy: false, idx: 0, dex: 22, fIsSecond: false },
    { isEnemy: true, idx: 0, dex: 18, fIsSecond: false },
  ])
})

test('single attack rolls damage before hidden growth and carries overkill in the action result', () => {
  const rng = fixedDraws([...queueDraws, ...strikeDraws])
  const state = createBattleState({ players: [wuHou], enemySlots: [lantern] })
  stepBattle(state, rng)
  state.pendingActions.set(0, { kind: 'attack', targetEnemyIdx: 0 })
  stepBattle(state, rng)
  stepBattle(state, rng)

  // fight.c:3636-3658,3756-3757: base 327, add 1, no crit, float draw 0.39028966, growth 3.
  expect(state.log[0]).toBe('wu-hou 攻击 enemy-399 造成 344')
  expect(state.lastAction).toMatchObject({
    side: 'player',
    kind: 'attack',
    targetEnemyIdx: 0,
    crit: false,
    firstDamage: 344,
  })
  expect(state.enemies[0]?.hp).toBe(0)
  expect(state.players[0]?.hiddenCounts).toEqual({ attack: 1, maxHP: 3 })
})

test('dual attack consumes both hit rolls before the one hidden growth roll', () => {
  const rng = fixedDraws([...queueDraws, ...strikeDraws, 0.05, 0.4, 0.2])
  const state = createBattleState({
    players: [{ ...wuHou, grantedStatuses: ['dualAttack'] }],
    enemySlots: [{ ...lantern, stats: { ...lantern.stats, health: 1500 } }],
  })
  stepBattle(state, rng)
  state.pendingActions.set(0, { kind: 'attack', targetEnemyIdx: 0 })
  stepBattle(state, rng)
  stepBattle(state, rng)

  expect(state.enemies[0]?.hp).toBe(120) // 1500 - 344 - trunc((327 + 2) * 3 * 1.05)
  expect(state.lastAction).toMatchObject({ firstDamage: 344, secondDamage: 1036 })
  expect(state.players[0]?.hiddenCounts).toEqual({ attack: 1, maxHP: 2 })
})

test('a cooperative attack falls back to the single-hit draw order if a contributor is defeated', () => {
  const skill: SkillData = {
    id: '374',
    name: '爆炸蛊',
    desc: '',
    cost: { mp: 49 },
    usableOutsideBattle: false,
    target: 'oneEnemy',
    effects: [{ kind: 'damage', power: 392, elemental: 4 }],
    animation: { effectSprite: 37 },
  }
  const rng = fixedDraws([0.5, 0.5, 0.5, 0.75, 0.1, 0.25, 0.25, ...strikeDraws])
  const state = createBattleState({
    players: [
      { ...wuHou, baseDexterity: 1, cooperativeMagicSkillId: skill.id },
      {
        ...wuHou,
        roleId: 'anu',
        actorTemplateId: 'anu',
        hp: 6,
        maxHp: 6,
        defense: 0,
        baseDexterity: 1,
      },
    ],
    enemySlots: [lantern],
    skills: { [skill.id]: skill },
  })
  stepBattle(state, rng)
  expect(healthyPlayerCount(state)).toBe(2)
  state.pendingActions.set(0, { kind: 'coop', targetEnemyIdx: 0 })
  state.pendingActions.set(1, { kind: 'attack', targetEnemyIdx: -1 }) // selection's coop placeholder
  stepBattle(state, rng)
  stepBattle(state, rng)
  expect(state.players[1]?.hp).toBe(0)
  stepBattle(state, rng)

  expect(state.log[1]).toBe('wu-hou 合击人手不足,改普攻 enemy-399 造成 344')
  expect(state.lastAction).toMatchObject({ side: 'player', kind: 'attack', firstDamage: 344 })
  expect(state.players[0]?.hp).toBe(150)
  expect(state.players[0]?.hiddenCounts).toEqual({ attack: 1, maxHP: 3 })
})

test('a landed enemy attack without an equiv item consumes the rate draw before the next round', () => {
  // Queue, target, block, two damage draws, equiv rate, then the next two queue draws.
  const rng = fixedDraws([0.5, 0.5, 0.25, 0.1, 0.25, 0.25, 0.8, 0.6, 0.6])
  const state = createBattleState({
    players: [{ ...wuHou, baseDexterity: 4 }],
    enemySlots: [lantern],
  })
  stepBattle(state, rng)
  state.pendingActions.set(0, { kind: 'defend' })
  stepBattle(state, rng)
  stepBattle(state, rng)
  expect(state.players[0]).toMatchObject({ hp: 149, poisons: [] })
  stepBattle(state, rng) // player defends
  stepBattle(state, rng) // turn end
  expect(state.turn).toBe(2)
  state.pendingActions.set(0, { kind: 'defend' })
  stepBattle(state, rng)

  expect(state.actionQueue).toEqual([
    { isEnemy: true, idx: 0, dex: 21, fIsSecond: false },
    { isEnemy: false, idx: 0, dex: 20, fIsSecond: false },
  ])
})
