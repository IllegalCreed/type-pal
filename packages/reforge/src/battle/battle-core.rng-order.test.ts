import type { EnemyDef, SkillData } from '@type-pal/content'
import {
  validateBattleFields,
  validateEnemies,
  validateEnemyTeams,
  validateItems,
  validatePoisons,
  validateSkills,
} from '@type-pal/content'
import { expect, test } from 'vitest'
import palBattleFields from '../../../../projects/pal/content/battle-fields.json' with {
  type: 'json',
}
import palEnemies from '../../../../projects/pal/content/enemies.json' with { type: 'json' }
import palEnemyTeams from '../../../../projects/pal/content/enemy-teams.json' with { type: 'json' }
import palItems from '../../../../projects/pal/content/items.json' with { type: 'json' }
import palPoisons from '../../../../projects/pal/content/poisons.json' with { type: 'json' }
import palSkills from '../../../../projects/pal/content/skills.json' with { type: 'json' }
import { wfPlayer } from '../__tests__/battle-workflows/catalog.js'
import { expectDefined } from '../defined.js'
import {
  applyEnemyEquivItem,
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
  // Queue, lethal enemy hit (including its rate draw), then the cooperative fallback's strike.
  const rng = fixedDraws([0.5, 0.5, 0.5, 0.75, 0.1, 0.25, 0.25, 0.4, ...strikeDraws])
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
  // Queue, block, two damage draws, equiv rate, then the next two queue draws.
  const rng = fixedDraws([0.5, 0.5, 0.1, 0.25, 0.25, 0.8, 0.6, 0.6])
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

test('the sole player needs no target roll before the two independent enemy actions', () => {
  const enemy = expectDefined(validateEnemies(palEnemies).find(({ id }) => id === 'enemy-414'))
  const slash = expectDefined(validateSkills(palSkills).skills.find(({ id }) => id === '339'))
  const rng = fixedDraws([
    // Mulberry32 seed 64. Round 1 queue, cast gate/defense/float, physical gate/block/bonuses/equiv.
    0.84591693,
    0.425869884, 0.661409723, 0.306843673, 0.889850487, 0.992746293, 0.786205746, 0.458142749,
    0.876674742, 0.655779845, 0.615956283,
    // Round 2 queue, then the player's four hit draws and hidden growth.
    0.863999527, 0.10810903, 0.567365941, 0.035652935, 0.817424394, 0.205908426, 0.582629329,
    0.802532919,
  ])
  const state = createBattleState({
    players: [
      wfPlayer('li-xiaoyao', {
        hp: 400,
        maxHp: 400,
        attackStrength: 902,
        defense: 109,
        baseDexterity: 153,
      }),
    ],
    enemySlots: [enemy],
    skills: { [slash.id]: slash },
  })
  stepBattle(state, rng)
  state.pendingActions.set(0, { kind: 'defend' })
  stepBattle(state, rng)
  expect(state.actionQueue.map(({ dex, fIsSecond }) => [dex, fIsSecond])).toEqual([
    [789, false],
    [130, false],
    [120, true],
  ])
  stepBattle(state, rng) // defend
  stepBattle(state, rng)
  // fight.c:4540 and util.c:244-247: 0..0 leaves the first magic gate at draw 3, which rolls 3.
  expect(state.lastAction).toMatchObject({ kind: 'cast', skillId: '339', targetPlayerIdx: 0 })
  expect(state.players[0]?.hp).toBe(306)
  stepBattle(state, rng)
  expect(state.lastAction).toMatchObject({ kind: 'attack', damage: 44, targetPlayerIdx: 0 })
  expect(state.players[0]?.hp).toBe(262)
  stepBattle(state, rng) // turn end
  state.pendingActions.set(0, { kind: 'attack', targetEnemyIdx: 0 })
  stepBattle(state, rng)
  stepBattle(state, rng)
  expect(state.lastAction).toMatchObject({ kind: 'attack', firstDamage: 865 })
  expect(state).toMatchObject({ phase: 'won', expGained: 110, cashGained: 220 })
})

test('enemy Thunder Spell applies the player elemental base resistance before field and guard', () => {
  const enemy = expectDefined(validateEnemies(palEnemies).find(({ id }) => id === 'enemy-418'))
  const spell = expectDefined(validateSkills(palSkills).skills.find(({ id }) => id === '316'))
  const state = createBattleState({
    players: [
      wfPlayer('li-xiaoyao', { hp: 85, maxHp: 150, defense: 9, baseDexterity: 3 }),
      wfPlayer('anu', { hp: 150, maxHp: 150, attackStrength: 2250, baseDexterity: 1 }),
    ],
    enemySlots: [enemy],
    skills: { [spell.id]: spell },
    fieldEffect: { wind: -3, thunder: -2, water: 0, fire: 1, earth: 0 },
  })
  // Seed 6: three initiative draws, slot 0, spell selected, automatic guard, then magic variance.
  const rng = fixedDraws([
    0.52574661, 0.00234355, 0.66317142, 0.2021627, 0.54211959, 0.07076387, 0.00453784,
  ])
  stepBattle(state, rng)
  state.pendingActions.set(0, { kind: 'defend' })
  state.pendingActions.set(1, { kind: 'attack', targetEnemyIdx: 0 })
  stepBattle(state, rng)
  stepBattle(state, rng)

  expect(state.lastAction).toMatchObject({
    kind: 'cast',
    skillId: '316',
    targetPlayerIdx: 0,
    autoDefend: [0],
  })
  // CLASSIC fight.c:4825–4838: raw 147 × 0.8, then /2 (automatic guard), with integer truncation.
  expect(state.players[0]?.hp).toBe(27)
  expect(state.players[1]?.hp).toBe(150)
})

test.each([
  {
    skillId: '312',
    teamId: 'team-115',
    // Seed 6: three initiative draws, one damage variance, then growth.
    draws: [
      0.5257466111797839, 0.002343546599149704, 0.6631714215036482, 0.20216270093806088,
      0.5421195910312235,
    ],
    enemyHp: [228],
    playerMp: 95,
  },
  {
    skillId: '313',
    teamId: 'team-116',
    // Seed 2: five initiative draws, then the three slot variances and growth.
    draws: [
      0.7342509443406016, 0.32499843230471015, 0.28529605525545776, 0.5379551574587822,
      0.8752879470121115, 0.6308333419729024, 0.4992015736643225, 0.3572446557227522,
      0.7815889057237655,
    ],
    enemyHp: [195, 196, 197],
    playerMp: 89,
  },
])('player spell $skillId rolls damage against effective defense before growth', ({
  skillId,
  teamId,
  draws,
  enemyHp,
  playerMp,
}) => {
  const bloodworm = expectDefined(validateEnemies(palEnemies).find(({ id }) => id === 'enemy-406'))
  const team = expectDefined(validateEnemyTeams(palEnemyTeams).find(({ id }) => id === teamId))
  expect(team.slots).toEqual(enemyHp.map(() => bloodworm.id))
  const spell = expectDefined(validateSkills(palSkills).skills.find(({ id }) => id === skillId))
  const field = expectDefined(validateBattleFields(palBattleFields).find(({ id }) => id === 7))
  const state = createBattleState({
    players: [
      wfPlayer('zhao-linger', {
        hp: 150,
        maxHp: 150,
        mp: 100,
        maxMp: 100,
        attackStrength: 8,
        defense: 13,
        magicStrength: 208,
        baseDexterity: 906,
        fleeRate: 39,
        grantedStatuses: ['dualAttack'],
        skills: [spell.id],
      }),
      wfPlayer('anu', {
        hp: 150,
        maxHp: 150,
        mp: 100,
        maxMp: 100,
        attackStrength: 2250,
        defense: 766,
        magicStrength: 112,
        baseDexterity: 150,
        fleeRate: 48,
      }),
    ],
    enemySlots: team.slots.map(() => bloodworm),
    fieldEffect: field.magicEffect,
    skills: { [spell.id]: spell },
  })
  const rng = fixedDraws(draws)
  stepBattle(state, rng)
  state.pendingActions.set(0, {
    kind: 'cast',
    skillId: spell.id,
    ...(spell.target === 'oneEnemy' ? { targetEnemyIdx: 0 } : {}),
  })
  state.pendingActions.set(1, { kind: 'attack', targetEnemyIdx: 0 })
  stepBattle(state, rng)
  stepBattle(state, rng)

  // fight.c:4284–4309 uses DEF 10 + (12 + 6) * 4. Growth rolls only at 4328–4329.
  expect(state.lastAction).toMatchObject({ side: 'player', idx: 0, kind: 'cast', skillId })
  expect.soft(state.enemies.flatMap((enemy) => (enemy ? [enemy.hp] : []))).toEqual(enemyHp)
  expect.soft(state.players[0]).toMatchObject({
    mp: playerMp,
    hiddenCounts: { maxMP: 3, magicAttack: 1 },
  })
  expect(state.players[1]?.hiddenCounts).toEqual({})
})

function bloodWormBattle() {
  const enemy = expectDefined(validateEnemies(palEnemies).find(({ id }) => id === 'enemy-406'))
  const items = validateItems(palItems.filter(({ id }) => id === '117' || id === '87'))
  const redPoison = expectDefined(validatePoisons(palPoisons).find(({ id }) => id === 551))
  return {
    players: [
      wfPlayer('li-xiaoyao', {
        hp: 150,
        maxHp: 150,
        attackStrength: 452,
        defense: 259,
        baseDexterity: 903,
      }),
    ],
    enemySlots: [enemy],
    items: Object.fromEntries(items.map((item) => [item.id, item])),
    poisonDefs: { [redPoison.id]: redPoison },
    inventory: [{ itemId: '87', count: 2 }],
  }
}

test('the blood worm starts red poison on hit, ticks again at turn end, and red sulfur cures it', () => {
  const rng = fixedDraws([
    // Mulberry32 seed 72. Round 1 queue, physical block/bonuses, equiv rate and both resistance rolls.
    0.20860595,
    0.15407627, 0.27076954, 0.1212119, 0.07027551, 0.33176822, 0.82964625, 0.9120957,
    // Round 2 queue and enemy hit. Equiv rate roll 7 fails, so cured poison stays gone.
    0.82732467, 0.32723454, 0.56938923, 0.21580437, 0.07883221, 0.66864745,
    // Round 3 queue and the lethal player hit.
    0.1257016, 0.48066431, 0.48407086, 0.72779004, 0.64045726, 0.42850434, 0.17432523,
  ])
  const state = createBattleState(bloodWormBattle())
  stepBattle(state, rng)
  state.pendingActions.set(0, { kind: 'defend' })
  stepBattle(state, rng)
  stepBattle(state, rng)
  stepBattle(state, rng)
  expect(state.players[0]).toMatchObject({ hp: 142, poisons: [{ poisonId: 551, tickIndex: 0 }] })
  expect(state.lastAction).toMatchObject({ kind: 'attack', damage: 1, targetPlayerIdx: 0 })
  stepBattle(state, rng)
  expect(state.players[0]?.hp).toBe(135)

  state.pendingActions.set(0, { kind: 'item', itemId: '87', targetAllyIdx: 0 })
  stepBattle(state, rng)
  stepBattle(state, rng)
  expect(state.players[0]?.poisons).toEqual([])
  expect(state.inventory).toEqual([{ itemId: '87', count: 1 }])
  stepBattle(state, rng)
  stepBattle(state, rng)
  expect(state.players[0]).toMatchObject({ hp: 134, poisons: [] })

  state.pendingActions.set(0, { kind: 'attack', targetEnemyIdx: 0 })
  stepBattle(state, rng)
  stepBattle(state, rng)
  expect(state.lastAction).toMatchObject({ kind: 'attack', firstDamage: 407 })
  expect(state).toMatchObject({ phase: 'won', expGained: 14, cashGained: 9 })
})

test('a lethal enemy hit still rolls the equivalent poison and runs its entry without reviving', () => {
  const input = bloodWormBattle()
  const player = expectDefined(input.players[0])
  const redPoison = expectDefined(input.poisonDefs[551])
  const poison = expectDefined(
    validatePoisons([
      { ...redPoison, playerTicks: [{ hpDelta: 5, mpDelta: 4 }, { hpDelta: -7 }] },
    ])[0],
  )
  const state = createBattleState({
    ...input,
    players: [{ ...player, hp: 1, mp: 10 }],
    poisonDefs: { [poison.id]: poison },
  })
  // Seed 72: queue, block, physical bonuses, rate, both resistances, then an unused draw.
  const rng = fixedDraws([
    0.20860595, 0.15407627, 0.27076954, 0.1212119, 0.07027551, 0.33176822, 0.82964625, 0.9120957,
    0.82732467,
  ])
  stepBattle(state, rng)
  state.pendingActions.set(0, { kind: 'defend' })
  stepBattle(state, rng)
  stepBattle(state, rng)
  stepBattle(state, rng)

  // CLASSIC 0x29 adds the poison and enters the tick at HP 0, where 0x1B/0x1C cannot change HP/MP.
  expect(state.lastAction).toMatchObject({ kind: 'attack', damage: 1, targetPlayerIdx: 0 })
  expect(state.players[0]).toMatchObject({
    hp: 0,
    mp: 10,
    poisons: [{ poisonId: 551, tickIndex: 1 }],
  })
  expect(state.phase).toBe('lost')
  expect(rng()).toBe(0.82732467)
})

test('the attached poison script can fail resistance after the equivalent item gate passes', () => {
  const input = bloodWormBattle()
  const playerInput = expectDefined(input.players[0])
  const state = createBattleState({ ...input, players: [{ ...playerInput, poisonRes: 50 }] })
  const player = expectDefined(state.players[0])
  const enemy = expectDefined(state.enemies[0])

  // Rate 4 >= 1 and outer roll 61 > 50, but the 0x29 script roll is 11.
  applyEnemyEquivItem(player, enemy, state, fixedDraws([0, 0.6, 0.1]))
  expect(player.poisons).toEqual([])
  expect(player.hp).toBe(150)
})

test('the immediate equivalent-item tick only runs when a new poison entry is added', () => {
  const state = createBattleState(bloodWormBattle())
  const player = expectDefined(state.players[0])
  const enemy = expectDefined(state.enemies[0])
  const successfulRolls = fixedDraws([0, 0, 0, 0, 0, 0])

  applyEnemyEquivItem(player, enemy, state, successfulRolls)
  applyEnemyEquivItem(player, enemy, state, successfulRolls)
  expect(player.poisons).toEqual([{ poisonId: 551, tickIndex: 0 }])
  expect(player.hp).toBe(143)
})
