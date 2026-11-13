import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { battleFoundationScenario, battleLaunchSpec } from './battle-foundation-scenarios.mjs'
import { repoRoot } from './browser-journey.mjs'

const load = async (path) => JSON.parse(await readFile(resolve(repoRoot, path), 'utf8'))
const [rawTeams, rawEnemies, rawObjects, rawItems, palTeams, palEnemies, palItems] =
  await Promise.all([
    load('data/extracted/data/enemy-teams.json'),
    load('data/extracted/data/enemies.json'),
    load('data/extracted/data/enemy-objects.json'),
    load('data/extracted/data/items.json'),
    load('projects/pal/content/enemy-teams.json'),
    load('projects/pal/content/enemies.json'),
    load('projects/pal/content/items.json'),
  ])

const hero = 'li-xiaoyao'
const linger = 'zhao-linger'
const anu = 'anu'
const foe = (slot = 0) => `foe-${slot}`
const use = (actorId, itemId, targetId, turn = 1) => ({
  turn,
  actorId,
  kind: 'item',
  itemId: String(itemId),
  targetId,
})
const toss = (actorId, itemId, targetId = foe(), turn = 1) => ({
  turn,
  actorId,
  kind: 'throw',
  itemId: String(itemId),
  targetId,
})
const hit = (actorId = anu, targetId = foe(), turn = 1) => ({
  turn,
  actorId,
  kind: 'attack',
  targetId,
})
const defend = (actorId, turn = 1) => ({ turn, actorId, kind: 'defend', targetId: null })
export const six = [
  {
    item: 122,
    name: '鹤顶红',
    poison: 556,
    counters: 124,
    lethal: 123,
    onUse: 39443,
    onThrow: 39484,
  },
  {
    item: 123,
    name: '孔雀胆',
    poison: 557,
    counters: 139,
    lethal: 122,
    onUse: 39459,
    onThrow: 39494,
  },
  {
    item: 124,
    name: '血海棠',
    poison: 558,
    counters: 125,
    lethal: 138,
    onUse: 39435,
    onThrow: 39479,
  },
  {
    item: 125,
    name: '断肠草',
    poison: 559,
    counters: 138,
    lethal: 139,
    onUse: 39427,
    onThrow: 39474,
  },
  {
    item: 138,
    name: '三尸蛊',
    poison: 555,
    counters: 123,
    lethal: 124,
    onUse: 39419,
    onThrow: 39469,
  },
  {
    item: 139,
    name: '金蚕蛊',
    poison: 560,
    counters: 122,
    lethal: 125,
    onUse: 39451,
    onThrow: 39489,
  },
]
const open = (
  label,
  commands,
  { team = 69, seed = 4, hp = [171, 171, 171], attack = [100, 120, 2400], focus = [] } = {},
) => ({
  label,
  team,
  seed,
  hp,
  attack,
  focus,
  commands,
})
const finishNextRound = [hit(hero, foe(), 2), hit(linger, foe(), 2), hit(anu, foe(), 2)]
const priority = [
  open('garlic-resistance', [use(hero, 84, linger), use(linger, 117, linger), hit()], {
    focus: [1],
  }),
  open(
    'dragon-ally-only',
    [use(hero, 122, linger), use(linger, 117, anu), use(anu, 278, linger), ...finishNextRound],
    { focus: [0, 1, 2] },
  ),
  open(
    'dragon-mixed-levels',
    [use(hero, 122, anu), use(linger, 117, anu), use(anu, 278, anu), ...finishNextRound],
    { focus: [0, 1, 2] },
  ),
  open('dragon-red-only', [use(hero, 117, linger), use(linger, 278, linger), hit()], {
    focus: [0, 1],
  }),
  open('dragon-clean-target', [use(hero, 278, linger), defend(linger), hit()], { focus: [0] }),
  open('shadowless-self', [use(hero, 137, hero), use(linger, 137, linger), hit()], {
    hp: [21, 20, 171],
    focus: [0, 1],
  }),
  open('shadowless-cap', [toss(hero, 137), toss(linger, 137), hit()], { team: 274, focus: [0, 1] }),
]
const bounds = [
  open(
    'shadowless-20',
    [toss(hero, 161), toss(linger, 137), hit(anu, foe(1)), ...finishNextRound],
    { team: 106, focus: [1] },
  ),
  open('shadowless-1997', [toss(hero, 128), toss(linger, 137), hit()], { team: 138, focus: [1] }),
  open(
    'shadowless-1998',
    [
      toss(hero, 155),
      toss(linger, 126),
      toss(anu, 127),
      toss(hero, 137, foe(), 2),
      ...finishNextRound.slice(1),
    ],
    { team: 274, focus: [3] },
  ),
  open('shadowless-2000', [toss(hero, 155), toss(linger, 137), hit()], { team: 274, focus: [1] }),
]
const usePair = (start, next) => [use(hero, start, linger), use(linger, next, linger), hit()]
const throwPair = (start, next) => [toss(hero, start), toss(linger, next), hit()]
const pairs = six.flatMap(({ item, counters, lethal }) => [
  open(`use-counters-${item}`, usePair(counters, item), { focus: [0, 1] }),
  open(`use-lethal-${item}`, usePair(lethal, item), { focus: [0, 1] }),
  open(`throw-lethal-${item}`, throwPair(lethal, item), { focus: [0, 1] }),
])
const controls = [
  open('use-reverse-counter', usePair(122, 124), { focus: [0, 1] }),
  open('throw-counter-does-not-cure', throwPair(124, 122), { focus: [0, 1] }),
  // Phoenix has sorcery resistance 4. Seed 2 supplies rolls 6 and 3 after the four queue draws.
  open('throw-lethal-after-resist', throwPair(123, 122), { team: 203, seed: 2, focus: [0, 1] }),
  // Both incoming statuses coexist: blood begonia does not counter peacock bile in this direction.
  open(
    'use-counter-before-lethal',
    [use(hero, 124, anu), use(linger, 123, anu), use(anu, 122, anu), ...finishNextRound],
    { focus: [0, 1, 2] },
  ),
  open('use-duplicate-poison', usePair(117, 117), { focus: [0, 1] }),
  open(
    'three-corpse-ally-rounds',
    [
      use(hero, 138, linger),
      defend(linger),
      defend(anu),
      defend(hero, 2),
      defend(linger, 2),
      defend(anu, 2),
      hit(hero, foe(), 3),
      hit(linger, foe(), 3),
      hit(anu, foe(), 3),
    ],
    { focus: [0] },
  ),
  open(
    'three-corpse-enemy-round',
    [toss(hero, 138), toss(linger, 138), defend(anu), ...finishNextRound],
    { focus: [0, 1] },
  ),
]
const groups = { priority, bounds, pairs, controls }
export function poisonCases(selection = 'all') {
  const cases = Object.values(groups).flat()
  if (selection === 'all') return cases
  if (Object.hasOwn(groups, selection)) return groups[selection]
  const labels = selection.split(',')
  const selected = cases.filter(({ label }) => labels.includes(label))
  assert.equal(selected.length, labels.length, 'unknown or duplicate poison scenario')
  return selected
}

export function makeSpec({ label, team, seed, hp, attack, commands }) {
  const party = [
    { id: hero, role: 0, hp: hp[0], speed: 900, attack: attack[0] },
    { id: linger, role: 1, hp: hp[1], speed: 500, attack: attack[1] },
    { id: anu, role: 4, hp: hp[2], speed: 250, attack: attack[2] },
  ]
  const rawTeam = rawTeams.find(({ id }) => id === team)
  const palTeam = palTeams.find(({ id }) => id === `team-${team}`)
  const enemies = rawTeam.enemyObjectIndexes.flatMap((objectIndex, slot) => {
    if (objectIndex === 65535 || objectIndex === 0) return []
    const raw = rawObjects.find((entry) => entry.objectIndex === objectIndex)
    const rawStats = rawEnemies.find(({ id }) => id === raw.enemyId)
    const templateId = `enemy-${objectIndex}`
    const authored = palEnemies.find(({ id }) => id === templateId)
    assert.equal(palTeam.slots[slot], templateId)
    assert.equal(rawStats.health, authored.stats.health)
    assert.equal(raw.resistanceToSorcery, authored.ai.resistanceToSorcery)
    return [{ id: foe(slot), slot, templateId }]
  })
  const stock = new Map()
  for (const { itemId } of commands) if (itemId) stock.set(itemId, (stock.get(itemId) ?? 0) + 1)
  for (const { kind, itemId } of commands) {
    if (!itemId) continue
    const raw = rawItems.find(({ id }) => id === Number(itemId))
    const pal = palItems.find(({ id }) => id === itemId)
    assert(raw.flags[kind === 'item' ? 'usable' : 'throwable'] && raw.flags.consuming)
    assert(pal[kind === 'item' ? 'use' : 'throw'])
  }
  const spec = battleLaunchSpec(battleFoundationScenario('herb-settlement'))
  Object.assign(spec, {
    id: `poison-${label}`,
    seed,
    enemies,
    party: party.map(({ id, role, hp, speed }) => ({ id, actorId: id, gameRole: role, hp, speed })),
  })
  Object.assign(spec.game.fixture, {
    id: `q2-${spec.id}`,
    label,
    enemyTeamId: team,
    battleFieldId: 7,
    partyMembers: party.map(({ role }) => role),
    playerOverrides: Object.fromEntries(
      party.map(({ role, hp, speed, attack }) => [
        role,
        {
          level: 6,
          hp,
          maxHP: 180,
          mp: 100,
          maxMP: 100,
          attackStrength: attack,
          defense: 400,
          magicStrength: 50,
          dexterity: speed,
          fleeRate: 30,
          magic: [],
        },
      ]),
    ),
    expOverrides: Object.fromEntries(party.map(({ role }) => [role, { wExp: 0, wLevel: 6 }])),
    inventory: [...stock].map(([itemId, count]) => ({ itemId: Number(itemId), count })),
  })
  Object.assign(spec.reforge.config, {
    party: {
      members: party.map(({ id, hp, speed, attack }) => ({
        actorId: id,
        stats: {
          level: 6,
          maxHP: 180,
          maxMP: 100,
          attack,
          defense: 400,
          magicAttack: 50,
          speed,
          luck: 30,
        },
        equipment: {},
        skills: { kind: 'replace', ids: [] },
        hp: { kind: 'value', value: hp },
        mp: { kind: 'full' },
      })),
    },
    enemies: { kind: 'team', teamId: `team-${team}` },
    bag: { items: [...stock].map(([itemId, quantity]) => ({ itemId, quantity })) },
    fieldId: 7,
  })
  return spec
}
