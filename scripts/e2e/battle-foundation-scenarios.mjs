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

export const BATTLE_FOUNDATION_SCENARIOS = Object.freeze([
  defineScenario('solo-lantern', '单人单灯笼', ['li-xiaoyao'], 1),
  defineScenario('party-lanterns', '三名队员分别选择三个灯笼', ['li-xiaoyao', 'wu-hou', 'anu'], 3),
  defineScenario('herb-settlement', '止血草治疗、消耗与正式结算', ['li-xiaoyao', 'anu'], 1, true),
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
  for (const directory of ['data/extracted/data', 'projects/pal']) {
    for (const name of await readdir(resolve(root, directory), { recursive: true }))
      if (name.endsWith('.json')) paths.push(`${directory}/${name}`)
  }
  return paths.sort()
}

/** Verify the few independent data premises before either engine is launched. */
export async function verifyBattleFoundationSources(root) {
  const json = async (path) => JSON.parse(await readFile(resolve(root, path), 'utf8'))
  const [rawTeams, rawEnemies, enemies, teams, items] = await Promise.all([
    json('data/extracted/data/enemy-teams.json'),
    json('data/extracted/data/enemies.json'),
    json('projects/pal/content/enemies.json'),
    json('projects/pal/content/enemy-teams.json'),
    json('projects/pal/content/items.json'),
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
  return { enemy: 'enemy-399', hp: 30, exp: 1, cash: 3, herb: '99', healing: 50 }
}
