import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { battleFoundationScenario, battleLaunchSpec } from './battle-foundation-scenarios.mjs'
import { repoRoot } from './browser-journey.mjs'

const hero = 'li-xiaoyao'
const linger = 'zhao-linger'
const anu = 'anu'
const roles = { [hero]: 0, [linger]: 1, [anu]: 4 }
const foe = (slot = 0) => `foe-${slot}`
const defend = (turn, actorId) => ({ turn, actorId, kind: 'defend', targetId: null })
const attack = (turn, actorId, targetId = foe()) => ({ turn, actorId, kind: 'attack', targetId })
const groupAttack = (turn, actorId) => ({ ...attack(turn, actorId, null), targetSide: 'enemy' })
const cast = (turn, actorId, skillId, targetId) => ({
  turn,
  actorId,
  kind: 'cast',
  skillId,
  targetId,
})
const use = (turn, actorId, itemId, targetId) => ({ turn, actorId, kind: 'item', itemId, targetId })
const toss = (turn, actorId, itemId, targetId) => ({
  turn,
  actorId,
  kind: 'throw',
  itemId,
  targetId,
})
const member = (id, speed, attack, skills = [], options = {}) => ({
  id,
  speed,
  attack,
  skills,
  level: 6,
  hp: 220,
  maxHP: 240,
  defense: 400,
  ...options,
})
const caseOf = (id, team, seed, party, commands, family) => ({
  id,
  team,
  seed,
  party,
  commands,
  family,
})

const silenceCases = [
  ['queued-offense-silenced', '312', foe(), defend(1, anu), 3, 20],
  ['queued-support-silenced', '309', linger, defend(1, anu), 3, 20],
  ['queued-spell-cleansed', '312', foe(), use(1, anu, '65', linger), 3, 20],
  ['equivalent-status-resisted', '312', foe(), use(1, anu, '84', linger), 79, 80],
].map(([id, skillId, target, allyCommand, seed, speed]) =>
  caseOf(
    id,
    220,
    seed,
    [member(linger, 10, 90, [skillId]), member(anu, speed, 6500)],
    [cast(1, linger, skillId, target), allyCommand, attack(2, linger), attack(2, anu)],
    'silence',
  ),
)

const bravery = caseOf(
  'bravery-expires',
  152,
  4,
  [member(hero, 100, 1500, ['311'], { level: 8 }), member(anu, 50, 130)],
  Array.from({ length: 9 }, (_, i) => i + 1).flatMap((turn) => [
    turn === 1
      ? cast(turn, hero, '311', anu)
      : turn === 9
        ? attack(turn, hero)
        : defend(turn, hero),
    [1, 7, 8].includes(turn) ? attack(turn, anu) : defend(turn, anu),
  ]),
  'buff',
)
const hasteAndDual = caseOf(
  'haste-and-dual-expire',
  300,
  4,
  [member(hero, 130, 1500, ['390', '393']), member(anu, 20, 50)],
  Array.from({ length: 11 }, (_, i) => i + 1).flatMap((turn) => [
    turn === 1
      ? cast(turn, hero, '393', anu)
      : turn === 2
        ? cast(turn, hero, '390', anu)
        : turn === 11
          ? attack(turn, hero)
          : defend(turn, hero),
    [1, 2, 6, 7, 9, 10].includes(turn) ? attack(turn, anu) : defend(turn, anu),
  ]),
  'buff',
)
const dualAll = caseOf(
  'equipped-dual-all',
  157,
  4,
  [
    member(hero, 200, 1200, [], { hp: 180, maxHP: 180, weapon: null }),
    member(anu, 500, 62, [], { hp: 180, maxHP: 180, weapon: '187' }),
  ],
  [attack(1, hero), groupAttack(1, anu), attack(2, hero, foe(1)), defend(2, anu)],
  'buff',
)
const trance = caseOf(
  'trance-attack-and-speed',
  258,
  4,
  [member(hero, 200, 1600), member(linger, 80, 92, ['295'], { level: 20 })],
  [
    defend(1, hero),
    cast(1, linger, '295', linger),
    defend(2, hero),
    attack(2, linger),
    attack(3, hero),
    defend(3, linger),
  ],
  'buff',
)
const tranceRevival = caseOf(
  'trance-after-revival',
  258,
  4,
  [member(linger, 160, 92, ['295'], { level: 20, hp: 30, defense: 0 }), member(anu, 145, 1600)],
  [
    cast(1, linger, '295', linger),
    defend(1, anu),
    use(2, anu, '95', linger),
    attack(3, linger),
    attack(3, anu),
  ],
  'revival',
)

const dualAllLethal = {
  ...dualAll,
  id: 'equipped-dual-all-lethal',
  seed: 5,
  party: [dualAll.party[0], { ...dualAll.party[1], attack: 402 }],
  commands: [defend(1, hero), groupAttack(1, anu), attack(2, hero), defend(2, anu)],
}
const puppetParty = [
  member(hero, 0, 0, [], { hp: 30, maxHP: 150, defense: 0 }),
  member(linger, 40, 0, [], { hp: 150, maxHP: 150 }),
  member(anu, 40, 900, [], { hp: 150, maxHP: 150 }),
]
const puppet = caseOf(
  'puppet-and-revival',
  1,
  4,
  puppetParty,
  [
    ...[hero, linger, anu].map((id) => defend(1, id)),
    use(2, linger, '152', hero),
    defend(2, anu),
    use(3, linger, '95', hero),
    attack(3, anu),
  ],
  'puppet',
)
const puppetAllDead = caseOf(
  'puppet-all-dead',
  1,
  4,
  [
    { ...puppetParty[0], attack: 250 },
    { ...puppetParty[1], hp: 20, defense: 0 },
  ],
  [defend(1, hero), defend(1, linger), use(2, linger, '152', hero)],
  'puppet',
)
const buffedPuppet = caseOf(
  'puppet-with-active-buffs',
  300,
  86,
  [
    member(hero, 120, 40, ['311', '390'], {
      level: 8,
      hp: 180,
      maxHP: 180,
      defense: 9,
      weapon: '166',
    }),
    member(anu, 125, 1600),
  ],
  [
    cast(1, hero, '311', hero),
    defend(1, anu),
    cast(2, hero, '390', hero),
    defend(2, anu),
    use(3, anu, '152', hero),
    use(4, anu, '95', hero),
    attack(5, hero),
    attack(5, anu),
  ],
  'revival',
)
const expiringPuppet = {
  ...buffedPuppet,
  id: 'puppet-buffs-expire',
  seed: 62,
  commands: [
    ...buffedPuppet.commands.slice(0, 5),
    ...Array.from({ length: 9 }, (_, index) => defend(index + 4, anu)),
    attack(13, anu),
  ],
}
const partyConfused = caseOf(
  'confused-party-and-cleanse',
  1,
  2,
  [member(hero, 45, 0), member(linger, 220, 0), member(anu, 1, 900)].map((entry) => ({
    ...entry,
    hp: 150,
    maxHP: 150,
  })),
  [
    defend(1, hero),
    use(1, linger, '128', hero),
    defend(1, anu),
    use(2, linger, '65', hero),
    attack(2, anu),
  ],
  'confusion',
)
const enemyConfused = caseOf(
  'confused-enemy-strikes-ally',
  4,
  12,
  [member(hero, 300, 900), member(anu, 1, 0)].map((entry) => ({ ...entry, hp: 150, maxHP: 150 })),
  [toss(1, hero, '128', foe()), defend(1, anu), attack(2, hero), defend(2, anu)],
  'confusion',
)
const enemyConfusedSelf = {
  ...enemyConfused,
  id: 'confused-enemy-draws-self',
  seed: 2,
  party: [enemyConfused.party[0], { ...enemyConfused.party[1], attack: 900 }],
  commands: [toss(1, hero, '128', foe()), defend(1, anu), attack(2, hero), attack(2, anu, foe(1))],
}
const enemyConfusedResist = caseOf(
  'confusion-resisted',
  1,
  4,
  enemyConfused.party,
  [toss(1, hero, '128', foe()), defend(1, anu), attack(2, hero), defend(2, anu)],
  'confusion',
)
const enemyCastsConfusion = caseOf(
  'enemy-ghost-curse',
  90,
  4,
  [
    member(hero, 20, 0, [], { hp: 800, maxHP: 800 }),
    member(anu, 5, 900, [], { hp: 800, maxHP: 800 }),
  ],
  [defend(1, hero), defend(1, anu), attack(2, anu)],
  'confusion',
)
const spiderCases = [false, true].map((garlic) =>
  caseOf(
    garlic ? 'spider-sleep-resisted' : 'spider-sleep-and-expiry',
    144,
    24,
    [member(linger, 1, 300)],
    [garlic ? use(1, linger, '84', linger) : defend(1, linger), attack(garlic ? 2 : 4, linger)],
    'silence',
  ),
)
const overlappingParty = [
  member(linger, 10, 0, ['312']),
  member(hero, 150, 1500),
  member(anu, 90, 0),
]
const selectiveCleanse = {
  ...caseOf(
    'selective-cleanse',
    69,
    4,
    overlappingParty,
    [
      cast(1, linger, '312', foe()),
      use(1, hero, '85', linger),
      use(1, anu, '127', linger),
      use(2, hero, '127', linger),
      use(2, anu, '255', linger),
      ...[linger, hero, anu].map((id) => defend(3, id)),
      cast(4, linger, '312', foe()),
      defend(4, hero),
      defend(4, anu),
      defend(5, linger),
      attack(5, hero),
      defend(5, anu),
    ],
    'overlap',
  ),
  silenceMenuProbe: { turn: 3, actorId: linger },
}
const enemyStatusReapply = caseOf(
  'enemy-sleep-reapply',
  69,
  4,
  overlappingParty.slice(1),
  [
    toss(1, hero, '135', foe()),
    toss(1, anu, '127', foe()),
    ...[2, 3].flatMap((turn) => [defend(turn, hero), defend(turn, anu)]),
    attack(4, hero),
    defend(4, anu),
  ],
  'overlap',
)
const cases = [
  bravery,
  hasteAndDual,
  dualAll,
  dualAllLethal,
  trance,
  tranceRevival,
  puppet,
  puppetAllDead,
  buffedPuppet,
  expiringPuppet,
  partyConfused,
  enemyConfused,
  enemyConfusedSelf,
  enemyConfusedResist,
  enemyCastsConfusion,
  ...silenceCases,
  ...spiderCases,
  selectiveCleanse,
  enemyStatusReapply,
]

export function battleStatusCases(selector = 'all') {
  const names = selector.split(',')
  assert(
    names.every(
      (name) => name === 'all' || cases.some((entry) => entry.id === name || entry.family === name),
    ),
    `unknown battle status group: ${selector}`,
  )
  return cases.filter(({ id, family }) =>
    names.some((name) => name === 'all' || name === id || name === family),
  )
}

const raw = 'data/extracted/data/'
const pal = 'projects/pal/content/'
const dataFiles = [
  `${raw}enemy-teams.json`,
  `${raw}enemy-objects.json`,
  `${raw}enemies.json`,
  `${raw}items.json`,
  `${raw}object-magics.json`,
  `${raw}level-up-magic.json`,
  'data/extracted/events/all.json',
  `${pal}enemy-teams.json`,
  `${pal}enemies.json`,
  `${pal}items.json`,
  `${pal}skills.json`,
  `${pal}battle-sprites.json`,
]
export const battleStatusSources = [
  ...dataFiles,
  'reference/sdlpal/battle.c',
  'reference/sdlpal/fight.c',
  'reference/sdlpal/global.c',
  'reference/sdlpal/script.c',
  'reference/sdlpal/uibattle.c',
]

export async function prepareBattleStatusInputs() {
  const [
    rawTeams,
    objects,
    rawEnemies,
    rawItems,
    rawSpells,
    levelUpMagic,
    events,
    palTeams,
    palEnemies,
    palItems,
    { skills },
  ] = await Promise.all(
    dataFiles.map(async (path) => JSON.parse(await readFile(resolve(repoRoot, path), 'utf8'))),
  )
  const all = events.segments.find(({ name }) => name === 'all').commands
  const raw = (index, opcode, operands) => {
    const entry = all[index]
    assert.deepEqual(
      [entry.op, entry.opcode, entry.operands],
      ['raw', opcode, operands],
      `PAL script ${index}`,
    )
  }
  for (const [spell, entry] of [
    [295, 43028],
    [311, 43034],
    [390, 43138],
    [393, 43140],
  ])
    assert.equal(rawSpells.find(({ id }) => id === spell).scriptOnSuccess, entry)
  raw(24103, 0x55, [295, 2, 0])
  raw(23221, 0x55, [390, 1, 0])
  assert(levelUpMagic.some(([entry]) => entry.level === 8 && entry.magic === 311))
  raw(43028, 0x31, [5, 0, 0])
  raw(43029, 0x30, [17, 100, 0])
  raw(43030, 0x30, [20, 100, 0])
  assert.equal(all[43031].op, 'end')
  raw(43034, 0x2d, [5, 7, 0])
  raw(43138, 0x2d, [8, 5, 0])
  raw(43140, 0x2d, [7, 9, 0])
  assert.equal(rawItems.find(({ id }) => id === 95).scriptOnUse, 43024)
  assert.equal(rawItems.find(({ id }) => id === 152).scriptOnUse, 39522)
  raw(43024, 0x22, [0, 1, 0])
  raw(39522, 0x2d, [4, 9, 0])
  raw(39854, 0x2d, [3, 3, 0])
  raw(39391, 0x2d, [2, 3, 0])
  raw(39392, 0x1b, [0, 65535, 0])
  assert.equal(rawItems.find(({ id }) => id === 187).scriptOnEquip, 39697)
  raw(39697, 0x18, [14, 187, 0])
  raw(39698, 0x17, [14, 17, 98])
  raw(39699, 0x17, [14, 20, 98])
  raw(39702, 0x1a, [4, 1, 0])
  raw(39703, 0x2d, [8, 32760, 0])
  raw(41027, 0x06, [12, 0, 0])
  assert.deepEqual(
    [all[41028].op, all[41028].itemId, all[41030].text],
    ['giveItem', 115, '获得一个蜂巢'],
  )
  assert.equal(objects.find(({ objectIndex }) => objectIndex === 403).scriptOnBattleEnd, 41027)
  return (scenario) => {
    const { id, seed, team, party, commands } = scenario
    const formation = rawTeams.find((entry) => entry.id === team)
    const authored = palTeams.find((entry) => entry.id === `team-${team}`)
    assert(formation && authored, 'both PAL formations must exist')
    const enemies = formation.enemyObjectIndexes.flatMap((index, slot) => {
      const templateId = `enemy-${index}`
      if (index === 65535 || index === 0) {
        assert(!authored.slots[slot], 'PAL gap differs')
        return []
      }
      const object = objects.find(({ objectIndex }) => objectIndex === index)
      const base = rawEnemies.find((entry) => entry.id === object?.enemyId)
      const definition = palEnemies.find((entry) => entry.id === templateId)
      assert.equal(authored.slots[slot], templateId)
      assert.equal(definition.stats.health, base.health)
      assert.equal(definition.ai.resistanceToSorcery, object.resistanceToSorcery)
      return [{ id: foe(slot), slot, templateId }]
    })
    const bag = new Map()
    for (const { kind, itemId, skillId } of commands) {
      if (kind === 'cast') assert(skills.some((skill) => skill.id === skillId))
      if (!itemId) continue
      const capability = kind === 'throw' ? 'throw' : 'use'
      const flag = kind === 'throw' ? 'throwable' : 'usable'
      assert(rawItems.find((item) => item.id === Number(itemId))?.flags[flag])
      assert(palItems.find((item) => item.id === itemId)?.[capability])
      bag.set(itemId, (bag.get(itemId) ?? 0) + 1)
    }
    const spec = battleLaunchSpec(battleFoundationScenario('herb-settlement'))
    Object.assign(spec, {
      id: `status-${id}`,
      seed,
      enemies,
      party: party.map(({ id: actorId, hp, speed }) => ({
        id: actorId,
        actorId,
        gameRole: roles[actorId],
        hp,
        speed,
      })),
    })
    Object.assign(spec.game.fixture, {
      id: `q2-${spec.id}`,
      label: id,
      enemyTeamId: team,
      partyMembers: party.map(({ id: actorId }) => roles[actorId]),
      playerOverrides: Object.fromEntries(
        party.map(({ id: actorId, hp, maxHP, attack, defense, speed, level, skills, weapon }) => [
          roles[actorId],
          {
            level,
            hp,
            maxHP,
            mp: 100,
            maxMP: 100,
            attackStrength: attack,
            defense,
            magicStrength: 50,
            dexterity: speed,
            fleeRate: 30,
            magic: skills.map(Number),
            ...(weapon === undefined ? {} : { equipment: [0, 0, 0, Number(weapon), 0, 0] }),
          },
        ]),
      ),
      expOverrides: Object.fromEntries(
        party.map(({ id: actorId, level }) => [roles[actorId], { wExp: 0, wLevel: level }]),
      ),
      inventory: [...bag].map(([itemId, count]) => ({ itemId: Number(itemId), count })),
    })
    Object.assign(spec.reforge.config, {
      party: {
        members: party.map(
          ({ id: actorId, hp, maxHP, attack, defense, speed, level, skills: ids, weapon }) => ({
            actorId,
            stats: { level, maxHP, maxMP: 100, attack, defense, magicAttack: 50, speed, luck: 30 },
            equipment:
              weapon === undefined
                ? {}
                : { head: null, cloak: null, body: null, weapon, feet: null, accessory: null },
            skills: { kind: 'replace', ids },
            hp: { kind: 'value', value: hp },
            mp: { kind: 'full' },
          }),
        ),
      },
      enemies: { kind: 'team', teamId: `team-${team}` },
      bag: { items: [...bag].map(([itemId, quantity]) => ({ itemId, quantity })) },
    })
    return spec
  }
}
