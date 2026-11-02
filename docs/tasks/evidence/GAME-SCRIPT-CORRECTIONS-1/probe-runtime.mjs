// Directed production-function probes. No product files or raw inputs are changed.
// Run from the repository root with pnpm exec tsx <this-file>.
// These are diagnosis evidence, not an official test suite, E2E, or coverage.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { performMagic } from '../../../../packages/game/src/core/battle/actions/magic.ts'
import { performThrowItem } from '../../../../packages/game/src/core/battle/actions/throw-item.ts'
import { createBattleState } from '../../../../packages/game/src/core/battle/battle-state.ts'
import { createCommandBus } from '../../../../packages/game/src/core/command-bus.ts'
import { removeEquipmentEffect } from '../../../../packages/game/src/core/equipment-state.ts'
import { runScript, tickEventSystem } from '../../../../packages/game/src/core/event-system.ts'
import { createInitialGameState } from '../../../../packages/game/src/core/game-state.ts'
import { createSeedableRng } from '../../../../packages/game/src/core/rng.ts'
import {
  getGlobalCommands,
  setGlobalEvents,
} from '../../../../packages/game/src/core/script-catalog.ts'

const root = new URL('../../../../', import.meta.url)
const read = (path) => JSON.parse(readFileSync(new URL(`data/extracted/${path}`, root), 'utf8'))
const commands = read('events/all.json').segments[0].commands
const items = read('data/items.json')
const spells = read('data/spells.json')
const magics = read('data/magic.json')
const objectMagics = read('data/object-magics.json')
const objectPoisons = read('data/object-poisons.json')
const enemy = { ...read('data/enemies.json').find((row) => row.health > 0), health: 10000 }
const originalDigest = createHash('sha256').update(JSON.stringify(commands)).digest('hex')
const evidence = { kind: 'directed-production-function-probes', scenarios: {} }

function world(roleId = 0) {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  gs.partyMembers = [roleId]
  const playerRoles = read('data/player-roles.json')
  const state = createBattleState({
    gs,
    playerRoles,
    enemies: [enemy],
    field: {
      id: 0,
      screenWave: 0,
      magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    },
    isBoss: false,
    rng: createSeedableRng(42),
  })
  return { gs, playerRoles, state, bus: createCommandBus() }
}

function amended(ip, operands) {
  const copy = structuredClone(commands)
  assert.equal(copy[ip].op, 'raw')
  copy[ip].operands = operands
  return copy
}

setGlobalEvents(structuredClone(commands))
evidence.scenarios.chests = [36936, 37482, 37848].map((ip) => ({
  ip,
  extractedItemId: commands[ip].itemId,
  loadedItemId: getGlobalCommands()[ip].itemId,
}))
assert.deepEqual(
  evidence.scenarios.chests.map((row) => row.loadedItemId),
  [164, 103, 116],
)

function declinePurchase(sequence) {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  gs.dwCash = 100
  gs.mode = 'event'
  setGlobalEvents(structuredClone(sequence))
  gs.eventCursor = { ip: 7567 }
  const bus = createCommandBus()
  let declined = false
  for (let frame = 0; frame < 100 && gs.mode === 'event'; frame++) {
    gs.nowMs = frame * 1000
    const key = gs.eventCursor?.waiting === 'confirm' ? 'Cancel' : 'Confirm'
    if (key === 'Cancel') declined = true
    tickEventSystem(gs, { held: new Set(), pressed: new Set([key]), frameNum: frame }, bus)
    bus.drain()
  }
  assert.equal(gs.mode, 'explore', 'real dialogue/confirmation sequence must finish')
  assert.equal(declined, true, 'must reach and decline the purchase question')
  return { cash: gs.dwCash, received: gs.inventory.find((row) => row.itemId === 80)?.count ?? 0 }
}
const reordered = structuredClone(commands)
;[reordered[7568], reordered[7569]] = [reordered[7569], reordered[7568]]
evidence.scenarios.purchaseCancel = {
  before: declinePurchase(commands),
  candidate: declinePurchase(reordered),
}
assert.equal(evidence.scenarios.purchaseCancel.before.cash, 80)
assert.equal(evidence.scenarios.purchaseCancel.candidate.cash, 100)

function cureStatus(sequence) {
  const env = world()
  Object.assign(env.state.players[0].status, { confused: 3, paralyzed: 3, sleep: 3, silence: 3 })
  runScript({
    commands: sequence,
    ip: 39349,
    bus: env.bus,
    runtimeMode: 'battle',
    battleCtx: {
      state: env.state,
      gs: env.gs,
      playerRoles: env.playerRoles,
      caster: { type: 'player', idx: 0 },
      target: { type: 'player', idx: 0 },
    },
  })
  return env.state.players[0].status
}
evidence.scenarios.cureSilence = {
  before: cureStatus(commands),
  candidate: cureStatus(amended(39352, [3, 0, 0])),
}
assert.equal(evidence.scenarios.cureSilence.before.silence, 3)
assert.equal(evidence.scenarios.cureSilence.candidate.silence, 0)

const poisonPairs = [
  [138, 558, 39471],
  [125, 560, 39476],
  [124, 555, 39481],
  [122, 557, 39486],
  [139, 559, 39491],
  [123, 556, 39496],
]
const poisonResults = []
for (const [itemId, pairedPoison, ip] of poisonPairs) {
  for (const poisonId of [0, pairedPoison, 551]) {
    const execute = (sequence) => {
      const env = world()
      env.gs.inventory = [{ itemId, count: 1 }]
      if (poisonId)
        env.state.enemies[0].poisons = [
          { poisonId, scriptEntry: objectPoisons.find((row) => row.id === poisonId).enemyScript },
        ]
      performThrowItem({
        ...env,
        casterIsEnemy: false,
        casterIdx: 0,
        itemId,
        targetIdx: 0,
        items,
        magics: structuredClone(magics),
        objectMagics,
        objectPoisons,
        commands: sequence,
        runScript,
      })
      return {
        hp: env.state.enemies[0].e.health,
        poisons: env.state.enemies[0].poisons,
        inventory: env.gs.inventory,
      }
    }
    const before = execute(commands)
    const candidate = execute(amended(ip, [pairedPoison, ip + 2, 0]))
    assert.deepEqual(candidate, before, `throw item ${itemId}, existing poison ${poisonId}`)
    poisonResults.push({ itemId, poisonId, same: true, result: before })
  }
}
evidence.scenarios.poisonJumpZero = poisonResults
// Historical reports concern repeated use; single-call equality does not cover that claim.
const repeatedThrows = []
for (const [itemId, pairedPoison, ip] of poisonPairs) {
  const execute = (sequence) => {
    const env = world()
    const localItems = structuredClone(items)
    env.gs.inventory = [{ itemId, count: 2 }]
    const outcomes = []
    for (let attempt = 1; attempt <= 2; attempt++) {
      env.state.enemies[0].e.health = 10000
      env.state.enemies[0].poisons = []
      const visits = []
      performThrowItem({
        ...env,
        casterIsEnemy: false,
        casterIdx: 0,
        itemId,
        targetIdx: 0,
        items: localItems,
        magics: structuredClone(magics),
        objectMagics,
        objectPoisons,
        commands: sequence,
        runScript: (options) => {
          const next = runScript(options)
          visits.push({ entry: options.ip, next })
          return next
        },
      })
      outcomes.push({
        attempt,
        poisons: structuredClone(env.state.enemies[0].poisons),
        remaining: env.gs.inventory[0].count,
        entry: localItems.find((item) => item.id === itemId).scriptOnThrow,
        visits,
      })
      env.bus.drain()
    }
    assert.ok(outcomes[0].poisons.length > 0)
    assert.deepEqual(outcomes[1].poisons, outcomes[0].poisons)
    assert.equal(outcomes[1].remaining, 0)
    return outcomes
  }
  const before = execute(commands)
  const candidate = execute(amended(ip, [pairedPoison, ip + 2, 0]))
  assert.deepEqual(candidate, before)
  repeatedThrows.push({ itemId, same: true, outcomes: before })
}
evidence.scenarios.repeatedPoisonThrows = repeatedThrows

function equipThenRemove(sequence) {
  const env = world(4)
  env.gs.inventory = [{ itemId: 187, count: 1 }]
  runScript({
    commands: sequence,
    ip: 39697,
    bus: env.bus,
    runtimeMode: 'battle',
    eventObjectId: 4,
    battleCtx: {
      state: env.state,
      gs: env.gs,
      playerRoles: env.playerRoles,
      caster: { type: 'player', idx: 0 },
    },
  })
  const weaponFleeRate = env.gs.rgEquipmentEffect[3].rgwFleeRate[4]
  const accessoryFleeRate = env.gs.rgEquipmentEffect[5].rgwFleeRate[4]
  removeEquipmentEffect(env.gs, 4, 3)
  return {
    weaponFleeRate,
    accessoryFleeRate,
    remainingAccessoryFleeRate: env.gs.rgEquipmentEffect[5].rgwFleeRate[4],
  }
}
evidence.scenarios.weaponSlot = {
  before: equipThenRemove(commands),
  candidate: equipThenRemove(amended(39700, [14, 21, 98])),
}
assert.equal(evidence.scenarios.weaponSlot.before.remainingAccessoryFleeRate, 98)
assert.equal(evidence.scenarios.weaponSlot.candidate.remainingAccessoryFleeRate, 0)
assert.equal(evidence.scenarios.weaponSlot.candidate.weaponFleeRate, 98)

const enemyGate = []
for (const ip of [43041, 43049, 43055]) {
  for (const enemyCaster of [false, true]) {
    const execute = (sequence) => {
      const env = world()
      env.gs.inventory = [{ itemId: 148, count: 2 }]
      const next = runScript({
        commands: sequence,
        ip,
        bus: env.bus,
        runtimeMode: 'battle',
        battleCtx: {
          state: env.state,
          gs: env.gs,
          playerRoles: env.playerRoles,
          caster: { type: enemyCaster ? 'enemy' : 'player', idx: 0 },
        },
      })
      return { next, inventory: env.gs.inventory, success: env.gs.fScriptSuccess }
    }
    const before = execute(commands)
    const candidate = execute(amended(ip, [ip + 2, 0, 0]))
    assert.deepEqual(candidate, before)
    enemyGate.push({ ip, enemyCaster, same: true, result: before })
  }
}
evidence.scenarios.enemyTurnJumpZero = enemyGate

const env = world()
env.gs.inventory = [{ itemId: 86, count: 20 }]
env.gs.PlayerRolesRuntime.rgwMagic[0][0] = 370
const wineSpells = structuredClone(spells)
const spell = wineSpells.find((row) => row.id === 370)
const wineMagics = structuredClone(magics)
const wine = []
for (let cast = 1; cast <= 10; cast++) {
  env.playerRoles.roles[0].mp = 100
  const visits = []
  performMagic({
    ...env,
    casterIsEnemy: false,
    casterIdx: 0,
    spellId: 370,
    targetIsEnemy: true,
    targetIdx: 'all',
    spells: wineSpells,
    magics: wineMagics,
    objectMagics,
    commands,
    runScript: (opts) => {
      const next = runScript(opts)
      visits.push({ entry: opts.ip, next })
      return next
    },
  })
  wine.push({
    cast,
    wine: env.gs.inventory.find((row) => row.itemId === 86).count,
    successEntry: spell.scriptOnSuccess,
    learned: env.gs.PlayerRolesRuntime.rgwMagic.some((slot) => slot[0] === 370),
    visits,
  })
  env.bus.drain()
}
evidence.scenarios.wineLimit = wine
assert.equal(wine[9].wine, 10)
assert.equal(wine[9].learned, true)
assert.equal(wine[9].successEntry, 43126)
assert.equal(originalDigest, createHash('sha256').update(JSON.stringify(commands)).digest('hex'))
evidence.originalCommandsUnchanged = true
evidence.producer = 'docs/ops/evidence/GAME-SCRIPT-CORRECTIONS-1/probe-runtime.mjs'
evidence.limits = [
  'Directed function calls and controlled in-memory candidate commands only.',
  'No browser, SDLPal executable, original executable, full story, save roundtrip or official coverage acceptance.',
]
console.log(JSON.stringify(evidence, null, 2))
