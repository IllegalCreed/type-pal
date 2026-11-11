import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const roles = {
  'li-xiaoyao': 0,
  'wu-hou': 3,
  anu: 4,
}
const random = { algorithm: 'mulberry32', seed: 1729 }
const copy = (value) => structuredClone(value)

function defineScenario(id, title, actorIds, enemyCount, medicine = false) {
  const party = actorIds.map((actorId, slot) => ({
    id: actorId,
    actorId,
    gameRole: roles[actorId],
    hp: medicine && slot === 0 ? 50 : 150,
    speed: [900, 500, 100][slot],
  }))
  const enemies = Array.from({ length: enemyCount }, (_, slot) => ({
    id: `lantern-${String.fromCharCode(97 + slot)}`,
    slot,
    templateId: 'enemy-399',
  }))
  const inventory = medicine ? [{ itemId: '99', count: 2 }] : []
  const team = enemyCount === 1 ? 1 : 3
  const commands = medicine
    ? [
        { turn: 1, actorId: party[0].id, kind: 'item', itemId: '99', targetId: party[0].id },
        { turn: 1, actorId: party[1].id, kind: 'attack', targetId: enemies[0].id },
      ]
    : party.map((player, slot) => ({
        turn: 1,
        actorId: player.id,
        kind: 'attack',
        targetId: enemies[slot].id,
      }))
  const initial = {
    players: party.map((player, slot) => ({
      id: player.id,
      slot,
      hp: player.hp,
      maxHP: 150,
      mp: 100,
      maxMP: 100,
      level: 1,
      exp: 0,
      statuses: {},
    })),
    enemies: Array.from({ length: 5 }, (_, slot) =>
      enemies[slot]
        ? {
            ...enemies[slot],
            hp: 30,
            maxHP: 30,
            alive: true,
            statuses: {},
          }
        : null,
    ),
    inventory: copy(inventory),
    money: 0,
  }
  let state = copy(initial)
  // Independent finite oracle: these fixtures use only lethal ordinary attacks and healHp50.
  // Raw rolled damage, queue-jitter allocation, AI and equipment specials are later obligations.
  const actions = commands.map((command) => {
    const before = copy(state)
    if (command.kind === 'item') {
      state.players[0].hp = 100
      state.inventory[0].count = 1
    } else {
      const target = state.enemies.find((enemy) => enemy?.id === command.targetId)
      assert(target, `scenario ${id} references a missing enemy`)
      target.hp = 0
      target.alive = false
    }
    return { ...command, before, after: copy(state) }
  })
  state = copy(state)
  state.money = enemyCount * 3
  for (const player of state.players) {
    player.exp = enemyCount
    if (medicine && player.id === party[0].id) player.hp = 125
  }
  return {
    id,
    title,
    random: copy(random),
    party,
    enemies,
    game: {
      fixture: {
        id: `q2-${id}`,
        label: title,
        partyMembers: party.map((player) => player.gameRole),
        playerOverrides: Object.fromEntries(
          party.map((player) => [
            player.gameRole,
            {
              level: 1,
              hp: player.hp,
              maxHP: 150,
              mp: 100,
              maxMP: 100,
              attackStrength: 250,
              defense: 100,
              magicStrength: 50,
              dexterity: player.speed,
              fleeRate: 30,
            },
          ]),
        ),
        expOverrides: Object.fromEntries(
          party.map((player) => [player.gameRole, { wExp: 0, wLevel: 1 }]),
        ),
        inventory: inventory.map((item) => ({ itemId: Number(item.itemId), count: item.count })),
        enemyTeamId: team,
        battleFieldId: 7,
      },
    },
    reforge: {
      config: {
        party: {
          members: party.map((player) => ({
            actorId: player.actorId,
            stats: {
              level: 1,
              maxHP: 150,
              maxMP: 100,
              attack: 250,
              defense: 100,
              magicAttack: 50,
              speed: player.speed,
              luck: 30,
            },
            equipment: {},
            skills: { kind: 'replace', ids: [] },
            hp: { kind: 'value', value: player.hp },
            mp: { kind: 'full' },
          })),
        },
        enemies: { kind: 'team', teamId: `team-${team}` },
        bag: {
          items: inventory.map((item) => ({ itemId: item.itemId, quantity: item.count })),
        },
        fieldId: 7,
        music: { kind: 'default' },
        money: 0,
        auto: false,
        boss: false,
      },
    },
    expected: {
      start: initial,
      commands,
      actions,
      terminal: { result: 'victory', settlementCount: 1, after: state },
    },
  }
}

function defineTwoRoundScenario() {
  const scenario = defineScenario(
    'two-round-commands',
    '防御、替队友用药、取消后施法与普攻',
    ['li-xiaoyao', 'wu-hou'],
    1,
    true,
  )
  scenario.random.seed = 4
  const {
    party,
    game: { fixture },
    reforge: { config },
    expected: { start },
  } = scenario
  party[1].hp = 50
  start.players[1].hp = 50
  Object.assign(fixture.playerOverrides[0], { defense: 31, magic: [296] })
  Object.assign(fixture.playerOverrides[3], { hp: 50, magic: [] })
  config.party.members[0].stats.defense = 31
  config.party.members[0].skills.ids = ['296']
  config.party.members[1].hp.value = 50

  const [hero, ally] = party.map(({ id }) => id)
  const lantern = scenario.enemies[0].id
  const commands = [
    { turn: 1, actorId: hero, kind: 'defend', targetId: null },
    { turn: 1, actorId: ally, kind: 'item', itemId: '99', targetId: hero },
    { turn: 2, actorId: hero, kind: 'cast', skillId: '296', targetId: ally, cancelTargetId: hero },
    { turn: 2, actorId: ally, kind: 'attack', targetId: lantern },
  ]
  const state = copy(start)
  const step = (command, apply) => {
    const before = copy(state)
    apply(state)
    return { ...command, before, after: copy(state) }
  }
  const actions = [
    step(commands[0], () => {}),
    step(commands[1], ({ players, inventory }) => {
      players[0].hp = 100
      inventory[0].count = 1
    }),
    step(
      { turn: 1, actorId: lantern, actorSide: 'enemy', kind: 'attack', targetId: hero },
      ({ players }) => {
        // Seed 4 targets slot 0 without a block. Attack 43 meets doubled defense 80,
        // which is below the physical threshold and therefore deals the minimum 1.
        players[0].hp = 99
      },
    ),
    step(commands[2], ({ players }) => {
      players[0].mp = 94
      players[1].hp = 125
    }),
    step(commands[3], ({ enemies }) => {
      enemies[0].hp = 0
      enemies[0].alive = false
    }),
  ]
  actions[0].guard = { before: false, after: true }
  actions[2].guard = { before: true, after: true }
  actions[3].guard = { before: false, after: false }
  state.players[0].hp = 124
  state.players[0].mp = 97
  state.players[1].hp = 137
  state.money = 3
  for (const player of state.players) player.exp = 1
  scenario.expected = {
    start,
    commands,
    actions,
    terminal: { result: 'victory', settlementCount: 1, after: state },
  }
  return scenario
}

export const BATTLE_FOUNDATION_SCENARIOS = Object.freeze([
  defineScenario('solo-lantern', '单人单灯笼', ['li-xiaoyao'], 1),
  defineScenario('party-lanterns', '三名队员分别选择三个灯笼', ['li-xiaoyao', 'wu-hou', 'anu'], 3),
  defineScenario('herb-settlement', '止血草治疗、消耗与正式结算', ['li-xiaoyao', 'anu'], 1, true),
  defineTwoRoundScenario(),
])

export function battleFoundationScenario(id) {
  const scenario = BATTLE_FOUNDATION_SCENARIOS.find((entry) => entry.id === id)
  assert(scenario, `unknown battle foundation scenario: ${id}`)
  return copy(scenario)
}

/** The browser receives setup inputs only; the factual producer never receives the oracle. */
export function battleLaunchSpec(scenario) {
  return copy({
    id: scenario.id,
    seed: scenario.random.seed,
    party: scenario.party,
    enemies: scenario.enemies,
    game: scenario.game,
    reforge: scenario.reforge,
  })
}

/** Snapshot the available author/raw JSON inputs; runtime assets remain outside pixel/audio acceptance. */
export async function battleFoundationInputSources(root) {
  const paths = []
  for (const directory of ['data/extracted', 'projects/pal']) {
    for (const name of await readdir(resolve(root, directory), { recursive: true }))
      if (name.endsWith('.json')) paths.push(`${directory}/${name}`)
  }
  return paths.sort()
}

/** Verify the few independent data premises before either engine is launched. */
export async function verifyBattleFoundationSources(root) {
  const json = async (path) => JSON.parse(await readFile(resolve(root, path), 'utf8'))
  const [rawTeams, rawEnemies, enemies, teams, items, rawSpells, rawMagic, events, skills] =
    await Promise.all([
      json('data/extracted/data/enemy-teams.json'),
      json('data/extracted/data/enemies.json'),
      json('projects/pal/content/enemies.json'),
      json('projects/pal/content/enemy-teams.json'),
      json('projects/pal/content/items.json'),
      json('data/extracted/data/spells.json'),
      json('data/extracted/data/magic.json'),
      json('data/extracted/events/all.json'),
      json('projects/pal/content/skills.json'),
    ])
  const rawEnemy = rawEnemies.find((enemy) => enemy.id === 2)
  const enemy = enemies.find((entry) => entry.id === 'enemy-399')
  assert.equal(rawEnemy.health, 30)
  assert.deepEqual([rawEnemy.exp, rawEnemy.cash], [1, 3])
  assert.deepEqual([enemy.stats.health, enemy.stats.exp, enemy.stats.cash], [30, 1, 3])
  assert.equal(enemy.ai.hooks, undefined)
  for (const [id, count] of [
    [1, 1],
    [3, 3],
  ]) {
    const raw = rawTeams.find((entry) => entry.id === id)
    const current = teams.find((entry) => entry.id === `team-${id}`)
    assert.deepEqual(raw.enemyObjectIndexes.slice(0, count), Array(count).fill(399))
    assert.deepEqual(raw.enemies.slice(0, count), Array(count).fill(2))
    assert.deepEqual(
      current.slots.filter((slot) => slot !== null),
      Array(count).fill('enemy-399'),
    )
  }
  const herb = items.find((entry) => entry.id === '99')
  assert.equal(herb.use.consuming, true)
  assert.equal(herb.use.target, 'oneAlly')
  assert.deepEqual(herb.use.effects, [{ kind: 'healHp', amount: 50 }])
  const cure = rawSpells.find((spell) => spell.id === 296)
  const cureCode = events.segments
    .find(({ name }) => name === 'all')
    .commands.find(({ label }) => label === `L_${cure.scriptOnSuccess}`)
  assert.equal(cure.flags.usableInBattle, true)
  assert.equal(cure.flags.usableToEnemy, false)
  assert.equal(cure.flags.applyToAll, false)
  assert.equal(rawMagic.find(({ id }) => id === cure.magicNumber).costMP, 6)
  assert.deepEqual([cureCode.opcode, cureCode.operands], [0x1b, [0, 75, 0]])
  const currentCure = skills.skills.find(({ id }) => id === '296')
  assert.deepEqual(
    [currentCure.target, currentCure.cost.mp, currentCure.effects],
    ['oneAlly', 6, [{ kind: 'healHp', amount: 75 }]],
  )
  return {
    enemy: 'enemy-399',
    hp: 30,
    exp: 1,
    cash: 3,
    herb: '99',
    healing: 50,
    cure: '296',
    cureMP: 6,
  }
}
