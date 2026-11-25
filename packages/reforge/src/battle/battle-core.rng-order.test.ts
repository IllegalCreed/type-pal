import type { CharacterInstance, SkillData } from '@type-pal/content'
import {
  validateBattleFields,
  validateEnemies,
  validateEnemyTeams,
  validateItems,
  validateSkills,
} from '@type-pal/content'
import { expect, test } from 'vitest'
import palBattleFields from '../../../../projects/pal/content/battle-fields.json' with {
  type: 'json',
}
import palEnemies from '../../../../projects/pal/content/enemies.json' with { type: 'json' }
import palEnemyTeams from '../../../../projects/pal/content/enemy-teams.json' with { type: 'json' }
import palItems from '../../../../projects/pal/content/items.json' with { type: 'json' }
import palSkills from '../../../../projects/pal/content/skills.json' with { type: 'json' }
import { wfPlayer } from '../__tests__/battle-workflows/catalog.js'
import { fixedDraws } from '../__tests__/battle-workflows/controlled-io.js'
import { expectDefined } from '../defined.js'
import {
  type CreatePlayerInput,
  createBattleState,
  healthyPlayerCount,
  stepBattle,
} from './battle-core.js'
import { createBattlePlayers } from './battle-player-input.js'

// Use the current PAL enemy and the party-lanterns fixture's equipped Wu Hou.
const lantern = expectDefined(validateEnemies(palEnemies).find(({ id }) => id === 'enemy-399'))

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

  expect(state.log).toContain('wu-hou 合击人手不足,降级普攻')
  expect(state.log).toContain('wu-hou 攻击 enemy-399 造成 344')
  expect(state.lastAction).toMatchObject({ side: 'player', kind: 'attack', firstDamage: 344 })
  expect(state.players[0]?.hp).toBe(150)
  expect(state.players[0]?.hiddenCounts).toEqual({ attack: 1, maxHP: 3 })
})

test('a cooperative attack interrupted by Sleep Spell uses both equipped sword strikes', () => {
  const enemy = expectDefined(validateEnemies(palEnemies).find(({ id }) => id === 'enemy-507'))
  const team = expectDefined(validateEnemyTeams(palEnemyTeams).find(({ id }) => id === 'team-204'))
  expect(team.slots).toEqual([enemy.id])
  const skills = validateSkills(palSkills).skills.filter(({ id }) => id === '303' || id === '381')
  const state = createBattleState({
    players: [
      wfPlayer('zhao-linger', {
        hp: 150,
        maxHp: 150,
        mp: 100,
        maxMp: 100,
        attackStrength: 258,
        magicStrength: 88,
        defense: 413,
        baseDexterity: 6,
        grantedStatuses: ['dualAttack'], // Starting weapon: 仙女剑170.
        cooperativeMagicSkillId: '381',
      }),
      wfPlayer('li-xiaoyao', {
        hp: 150,
        maxHp: 150,
        mp: 100,
        maxMp: 100,
        attackStrength: 902,
        magicStrength: 50,
        defense: 409,
        baseDexterity: 3,
      }),
    ],
    enemySlots: [enemy],
    skills: Object.fromEntries(skills.map((skill) => [skill.id, skill])),
  })
  // Seed 25: three initiative draws, four for 回梦, two independent strikes, then growth.
  const draw = fixedDraws([
    0.5979374819435179, 0.8292901203967631, 0.5748988559935242, 0.7436923568602651,
    0.27351520699448884, 0.10549482028000057, 0.4276351644657552, 0.452096592169255,
    0.3359841746278107, 0.2509741382673383, 0.24817373999394476, 0.047595186391845345,
    0.5251377997919917, 0.1725152910221368,
  ])
  let drawCount = 0
  const rng = (): number => {
    drawCount++
    return draw()
  }
  stepBattle(state, rng)
  expect(healthyPlayerCount(state)).toBe(2)
  state.pendingActions.set(0, { kind: 'coop', targetEnemyIdx: 0 })
  state.pendingActions.set(1, { kind: 'attack', targetEnemyIdx: -1 }) // Selection's coop placeholder.
  stepBattle(state, rng)
  stepBattle(state, rng)

  expect(state.lastAction).toMatchObject({
    side: 'enemy',
    kind: 'cast',
    skillId: '303',
    targetPlayerIdx: 1,
  })
  expect(state.players[1]).toMatchObject({ hp: 149, status: { sleep: 3 } })

  stepBattle(state, rng)

  // fight.c:3374–3378,3628–3674,3756–3757: the effective action is ordinary attack.
  expect(state.lastAction).toMatchObject({
    side: 'player',
    idx: 0,
    kind: 'attack',
    targetEnemyIdx: 0,
    firstDamage: 141,
    crit: false,
    secondDamage: 437,
    secondCrit: true,
  })
  expect(state.enemies[0]?.hp).toBe(222)
  expect(state.players[0]).toMatchObject({
    hp: 150,
    mp: 100,
    hiddenCounts: { attack: 1, maxHP: 2 },
  })
  expect(state.players[1]).toMatchObject({ hp: 149, mp: 100, hiddenCounts: {} })
  expect(drawCount).toBe(14)
})

test('a cooperative attack interrupted by a defeat uses the caster’s equipped attack-all weapon', () => {
  const enemies = validateEnemies(palEnemies)
  const team = expectDefined(validateEnemyTeams(palEnemyTeams).find(({ id }) => id === 'team-30'))
  const skills = validateSkills(palSkills).skills.filter(({ id }) => id === '339' || id === '343')
  const state = createBattleState({
    players: [
      wfPlayer('lin-yueru', {
        hp: 150,
        maxHp: 150,
        mp: 100,
        maxMp: 100,
        attackStrength: 270,
        defense: 437,
        baseDexterity: 24,
        attackAll: true, // Starting weapon: 长鞭163.
        cooperativeMagicSkillId: '339',
      }),
      wfPlayer('li-xiaoyao', {
        hp: 45,
        maxHp: 150,
        mp: 100,
        maxMp: 100,
        defense: 9,
        baseDexterity: 3,
      }),
    ],
    enemySlots: team.slots.map((id) => expectDefined(enemies.find((enemy) => enemy.id === id))),
    skills: Object.fromEntries(skills.map((skill) => [skill.id, skill])),
  })
  // Seed 26: enemy 479's 暗器 comes before the submitted coop, then the sweep and growth draws.
  const rng = fixedDraws([
    0.5114786140620708, 0.74351347819902, 0.5101396401878446, 0.0016550610307604074,
    0.8222677248995751, 0.5393128525465727, 0.9901514884550124, 0.7465278028976172,
    0.8287821030244231, 0.8554703120607883, 0.25272027868777514, 0.06508457357995212,
    0.8539295108057559,
  ])
  stepBattle(state, rng)
  expect(healthyPlayerCount(state)).toBe(2)
  state.pendingActions.set(0, { kind: 'coop', targetEnemyIdx: 0 })
  state.pendingActions.set(1, { kind: 'attack', targetEnemyIdx: -1 })
  stepBattle(state, rng)
  stepBattle(state, rng)
  expect(state.lastAction).toMatchObject({
    side: 'enemy',
    idx: 1,
    kind: 'cast',
    skillId: '343',
    targetPlayerIdx: 1,
  })
  expect(state.players[1]?.hp).toBe(0)

  stepBattle(state, rng)

  // fight.c:3482–3497,3681–3730: the whip follows ordinary slot order and damage division.
  expect(state.lastAction).toMatchObject({
    side: 'player',
    idx: 0,
    kind: 'attack',
    targetEnemyIdx: -1,
    attackAllSweeps: [
      {
        critical: false,
        hits: [
          { idx: 2, value: 141 },
          { idx: 1, value: 68 },
          { idx: 0, value: 36 },
        ],
      },
    ],
  })
  expect(state.enemies.slice(0, 3).map((enemy) => enemy?.hp)).toEqual([254, 1182, 149])
  expect(state.players[0]).toMatchObject({
    hp: 150,
    mp: 100,
    hiddenCounts: { attack: 1, maxHP: 2 },
  })
})

test('玄冥宝刀 rerolls each sweep and keeps the first sweep’s defeated enemy in the falloff order', () => {
  const enemies = validateEnemies(palEnemies)
  const team = expectDefined(validateEnemyTeams(palEnemyTeams).find(({ id }) => id === 'team-157'))
  const [weapon] = validateItems(palItems.filter(({ id }) => id === '187'))
  const anu: CharacterInstance = {
    id: 'anu',
    template: 'anu',
    level: 6,
    exp: 0,
    hp: 180,
    maxHP: 180,
    mp: 100,
    maxMP: 100,
    attack: 402,
    defense: 400,
    magicAttack: 50,
    speed: 500,
    luck: 30,
    equipment: { weapon: '187' },
    tags: [],
  }
  const hero: CharacterInstance = {
    ...anu,
    id: 'li-xiaoyao',
    template: 'li-xiaoyao',
    attack: 1200,
    speed: 200,
    equipment: {},
  }
  const state = createBattleState({
    players: createBattlePlayers(
      { party: [hero, anu], learnedSkills: {} },
      { actorsById: {}, items: { 187: expectDefined(weapon) } },
    ),
    enemySlots: team.slots.map((id) => expectDefined(enemies.find((enemy) => enemy.id === id))),
  })
  // Seed 5: four dexterity draws, a critical sweep, a normal sweep, then a single growth draw.
  const rng = fixedDraws([
    0.6897749109, 0.7727432733, 0.2197630103, 0.6231788222, 0.0851372012, 0.5921649402,
    0.7201022457,
  ])
  stepBattle(state, rng)
  state.pendingActions.set(0, { kind: 'attack', targetEnemyIdx: 0 })
  state.pendingActions.set(1, { kind: 'attack', targetEnemyIdx: -1 })
  stepBattle(state, rng)
  stepBattle(state, rng)

  expect(state.lastAction).toMatchObject({
    side: 'player',
    idx: 1,
    kind: 'attack',
    targetEnemyIdx: -1,
    attackAllSweeps: [
      {
        critical: true,
        hits: [
          { idx: 1, value: 807 },
          { idx: 0, value: 404 },
        ],
      },
      {
        critical: false,
        hits: [
          { idx: 1, value: 269 },
          { idx: 0, value: 135 },
        ],
      },
    ],
  })
  expect(state.enemies.slice(0, 2).map((enemy) => enemy?.hp)).toEqual([1, 0])
  expect(state.players[1]?.hiddenCounts).toEqual({ attack: 1, maxHP: 3 })
  expect(rng).toThrow('Battle consumed a draw beyond the fixture')
})

test('the two-bee encounter truncates overkill damage at the HP write of each sweep', () => {
  const bee = expectDefined(validateEnemies(palEnemies).find(({ id }) => id === 'enemy-403'))
  const [weapon] = validateItems(palItems.filter(({ id }) => id === '187'))
  const anu: CharacterInstance = {
    id: 'anu',
    template: 'anu',
    level: 28,
    exp: 0,
    hp: 470,
    maxHP: 480,
    mp: 400,
    maxMP: 410,
    attack: 168,
    defense: 110,
    magicAttack: 220,
    speed: 160,
    luck: 150,
    equipment: { weapon: '187' },
    tags: [],
  }
  const state = createBattleState({
    players: createBattlePlayers(
      { party: [anu], learnedSkills: {} },
      { actorsById: {}, items: { 187: expectDefined(weapon) } },
    ),
    enemySlots: [bee, bee],
  })
  // Seed 4. The first sweep is critical, the second normal, and both are genuine overkill.
  const rng = fixedDraws([
    0.9236361971125007, 0.33304587937891483, 0.2216679009143263, 0.08184101991355419,
    0.23399724275805056, 0.5084968549199402,
  ])
  stepBattle(state, rng)
  state.pendingActions.set(0, { kind: 'attack', targetEnemyIdx: -1 })
  stepBattle(state, rng)
  stepBattle(state, rng)

  expect(state.lastAction).toMatchObject({
    attackAllSweeps: [
      {
        critical: true,
        hits: [
          { idx: 1, value: 747 },
          { idx: 0, value: 373 },
        ],
      },
      {
        critical: false,
        hits: [
          { idx: 1, value: 249 },
          { idx: 0, value: 124 },
        ],
      },
    ],
  })
  expect(state.enemies.slice(0, 2).map((enemy) => enemy?.hp)).toEqual([0, 0])
})

test('梦蛇 adds the unequipped attack and speed once, and a second cast replaces its bonus', () => {
  const trance = expectDefined(validateSkills(palSkills).skills.find(({ id }) => id === '295'))
  const enemy = expectDefined(validateEnemies(palEnemies).find(({ id }) => id === 'enemy-444'))
  const items = Object.fromEntries(
    validateItems(palItems.filter(({ id }) => ['170', '210', '237'].includes(id))).map((item) => [
      item.id,
      item,
    ]),
  )
  const initial: CharacterInstance = {
    id: 'zhao-linger',
    template: 'zhao-linger',
    level: 6,
    exp: 0,
    hp: 180,
    maxHP: 180,
    mp: 200,
    maxMP: 200,
    attack: 92,
    defense: 400,
    magicAttack: 50,
    speed: 80,
    luck: 30,
    equipment: { weapon: '170', body: '210', feet: '237' },
    tags: [],
  }
  const state = createBattleState({
    players: createBattlePlayers(
      { party: [initial], learnedSkills: { [initial.id]: ['295'] } },
      { actorsById: {}, items },
    ),
    enemySlots: [enemy],
    skills: { [trance.id]: trance },
  })
  const linger = expectDefined(state.players[0])
  expect(linger).toMatchObject({ attackStrength: 100, baseDexterity: 86 })
  const rng = () => 0.5
  stepBattle(state, rng)
  for (const mp of [101, 2]) {
    state.pendingActions.set(0, { kind: 'cast', skillId: '295' })
    stepBattle(state, rng) // queue
    stepBattle(state, rng) // cast before the enemy
    expect(linger).toMatchObject({
      attackStrength: 192,
      baseDexterity: 166,
      mp,
      tranceBattleSprite: 'player-fighter-5',
    })
    stepBattle(state, rng) // enemy
    stepBattle(state, rng) // round end
  }
  expect(linger.persistentProgress).toMatchObject({ attack: 92, speed: 80 })
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

test('cooperative 爆炸 uses the blood worm’s level-adjusted defense without spell growth', () => {
  const enemy = expectDefined(validateEnemies(palEnemies).find(({ id }) => id === 'enemy-406'))
  const skill = expectDefined(validateSkills(palSkills).skills.find(({ id }) => id === '381'))
  const field = expectDefined(validateBattleFields(palBattleFields).find(({ id }) => id === 7))
  const state = createBattleState({
    players: [
      wfPlayer('zhao-linger', {
        hp: 150,
        maxHp: 150,
        mp: 100,
        maxMp: 100,
        attackStrength: 8,
        magicStrength: 208,
        baseDexterity: 906,
        cooperativeMagicSkillId: skill.id,
      }),
      wfPlayer('anu', {
        hp: 150,
        maxHp: 150,
        mp: 100,
        maxMp: 100,
        attackStrength: 300,
        magicStrength: 112,
        baseDexterity: 150,
      }),
    ],
    enemySlots: [enemy],
    fieldEffect: field.magicEffect,
    skills: { [skill.id]: skill },
  })
  const rng = fixedDraws([
    0.5257466111797839, 0.002343546599149704, 0.6631714215036482, 0.20216270093806088,
  ])
  stepBattle(state, rng)
  state.pendingActions.set(0, { kind: 'coop', targetEnemyIdx: 0 })
  state.pendingActions.set(1, { kind: 'attack', targetEnemyIdx: -1 }) // selection's coop placeholder
  stepBattle(state, rng)
  stepBattle(state, rng)

  // Seed 6, fight.c:3982–3995,4030–4035: combined strength 157, defense 82, damage 161.
  expect(state.enemies[0]?.hp).toBe(149)
  expect(state.lastAction).toMatchObject({ kind: 'coop', skillId: '381', coopContributors: [0, 1] })
  expect(state.players.map(({ hp, mp, hiddenCounts }) => ({ hp, mp, hiddenCounts }))).toEqual([
    { hp: 140, mp: 100, hiddenCounts: {} },
    { hp: 140, mp: 100, hiddenCounts: {} },
  ])
  stepBattle(state, rng)
  expect(state.lastAction).toMatchObject({ side: 'player', idx: 1, kind: 'pass' })
})

test('throwing the wooden sword uses bare attack while a wooden sword is equipped', () => {
  const enemy = expectDefined(validateEnemies(palEnemies).find(({ id }) => id === 'enemy-406'))
  const [sword] = validateItems(palItems.filter(({ id }) => id === '166'))
  const item = expectDefined(sword)
  const state = createBattleState({
    players: [
      wfPlayer('li-xiaoyao', {
        hp: 150,
        maxHp: 150,
        mp: 100,
        maxMp: 100,
        attackStrength: 52,
        baseDexterity: 903,
        persistentProgress: {
          level: 6,
          exp: 0,
          maxHP: 150,
          maxMP: 100,
          attack: 50,
          magicAttack: 50,
          defense: 400,
          speed: 900,
          luck: 32,
        },
      }),
      wfPlayer('anu', { hp: 150, maxHp: 150, attackStrength: 950, baseDexterity: 150 }),
    ],
    enemySlots: [enemy],
    items: { [item.id]: item },
    inventory: [{ itemId: item.id, count: 1 }],
  })
  const rng = fixedDraws([
    0.7342509443406016, 0.32499843230471015, 0.28529605525545776, 0.5379551574587822,
    0.8752879470121115,
  ])
  stepBattle(state, rng)
  state.pendingActions.set(0, { kind: 'throw', itemId: item.id, targetEnemyIdx: 0 })
  state.pendingActions.set(1, { kind: 'attack', targetEnemyIdx: 0 })
  stepBattle(state, rng)
  stepBattle(state, rng)

  // Seed 2, script.c:2007–2013: bare attack 50 × 2 before the independent damage variance.
  expect(state.lastAction).toMatchObject({ kind: 'throw', throwHits: [{ idx: 0, value: 219 }] })
  expect(state.enemies[0]?.hp).toBe(91)
  expect(state.inventory).toEqual([{ itemId: '166', count: 0 }])
})

test('sleep expires by turn even when the affected enemy is defeated before the round ends', () => {
  const enemies = validateEnemies(palEnemies)
  const team = expectDefined(validateEnemyTeams(palEnemyTeams).find(({ id }) => id === 'team-62'))
  const skill = expectDefined(validateSkills(palSkills).skills.find(({ id }) => id === '303'))
  expect(team.slots).toEqual(['enemy-407', 'enemy-399'])
  const state = createBattleState({
    players: [
      wfPlayer('zhao-linger', {
        hp: 150,
        maxHp: 150,
        mp: 100,
        maxMp: 100,
        defense: 413,
        baseDexterity: 906,
        skills: [skill.id],
      }),
      wfPlayer('li-xiaoyao', {
        hp: 150,
        maxHp: 150,
        attackStrength: 602,
        defense: 409,
        baseDexterity: 503,
      }),
    ],
    enemySlots: team.slots.map((id) => expectDefined(enemies.find((enemy) => enemy.id === id))),
    skills: { [skill.id]: skill },
  })
  // Seed 4: first turn initiative, sleep gate/resistance/growth, then the lantern's target/block.
  // The second turn starts with initiative, Xiaoyao's five strike draws and the lantern's block.
  const rng = fixedDraws([
    0.9236361971125007, 0.33304587937891483, 0.2216679009143263, 0.08184101991355419,
    0.23399724275805056, 0.5084968542214483, 0.0773914884775877, 0.9738619206473231,
    0.6220374784898013, 0.6908154499251395, 0.7681461023166776, 0.3691486772149801,
    0.7324949100147933, 0.8758750655688345, 0.5287687703967094, 0.7433461560867727,
    0.42174601648002863, 0.4904501575510949, 0.7359134785365313, 0.9307232699356973,
    0.9795403191819787,
  ])
  stepBattle(state, rng)
  state.pendingActions.set(0, { kind: 'cast', skillId: skill.id, targetEnemyIdx: 0 })
  state.pendingActions.set(1, { kind: 'defend' })
  for (let i = 0; i < 6; i++) stepBattle(state, rng)
  const ghoul = expectDefined(state.enemies[0])
  expect(state.turn).toBe(2)
  expect(ghoul).toMatchObject({ hp: 450, status: { sleep: 3 } })

  state.pendingActions.set(0, { kind: 'defend' })
  state.pendingActions.set(1, { kind: 'attack', targetEnemyIdx: 0 })
  for (let i = 0; i < 5; i++) stepBattle(state, rng)
  expect(state.turn).toBe(2)
  expect(ghoul).toMatchObject({ hp: 0, status: { sleep: 3 } })
  expect(state.enemies[1]?.hp).toBe(30)
  stepBattle(state, rng)

  expect(state.turn).toBe(3)
  expect(ghoul).toMatchObject({ hp: 0, status: { sleep: 2 } })
})
