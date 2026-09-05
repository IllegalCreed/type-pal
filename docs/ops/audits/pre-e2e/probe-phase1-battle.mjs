// Run at repo root: node --import tsx docs/ops/audits/pre-e2e/probe-phase1-battle.mjs
// First-phase current extracted data, actual functions, in-memory state only.
// Controlled queue/round boundaries isolate effects; this is not a whole battle E2E.
// Assertions describe the unfixed baseline; retire these expectations after fixes.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { performMagic } from '../../../../packages/game/src/core/battle/actions/magic.ts'
import { performThrowItem } from '../../../../packages/game/src/core/battle/actions/throw-item.ts'
import { startBattle, tickBattle } from '../../../../packages/game/src/core/battle/battle-system.ts'
import { createCommandBus } from '../../../../packages/game/src/core/command-bus.ts'
import {
  getPlayerFleeRate,
  updateAllEquipments,
} from '../../../../packages/game/src/core/equip-effect.ts'
import {
  runScript,
  setGlobalEvents,
  setObjectPoisons,
} from '../../../../packages/game/src/core/event-system.ts'
import {
  createInitialGameState,
  loadDefaultGame,
  projectRuntimeToBattleRoles,
} from '../../../../packages/game/src/core/game-state.ts'

assert.equal(typeof globalThis.indexedDB, 'undefined')
const oldFetch = globalThis.fetch
const oldRandom = Math.random
globalThis.fetch = () => {
  throw new Error('Game audit forbids network access')
}
try {
  const read = (name) =>
    JSON.parse(
      readFileSync(
        new URL(`../../../../data/extracted/data/${name}.json`, import.meta.url),
        'utf8',
      ),
    )
  const roles = read('player-roles'),
    enemies = read('enemies'),
    enemyObjects = read('enemy-objects')
  const items = read('items'),
    spells = read('spells'),
    magics = read('magic')
  const objectMagics = read('object-magics'),
    objectPoisons = read('object-poisons')
  const battleFields = read('battle-fields'),
    objectPlayers = read('object-players')
  const commands = JSON.parse(
    readFileSync(new URL('../../../../data/extracted/events/all.json', import.meta.url), 'utf8'),
  ).segments.flatMap((s) => s.commands)
  setGlobalEvents(commands)
  setObjectPoisons(objectPoisons)
  const input = { held: new Set(), pressed: new Set(), frameNum: 0 }
  function setup(party = [0], lethal = false) {
    const gs = createInitialGameState({ x: 160, y: 112, facing: 'right' })
    loadDefaultGame(gs, roles)
    gs.partyMembers = party
    gs.PlayerRolesRuntime.rgwMP[party[0]] = 100
    gs.PlayerRolesRuntime.rgwMaxMP[party[0]] = 100
    if (lethal) gs.PlayerRolesRuntime.rgwHP[party[1]] = 1
    gs.inventory = [
      { itemId: 148, count: 1 },
      { itemId: 138, count: 1 },
    ]
    updateAllEquipments(gs, items)
    const live = projectRuntimeToBattleRoles(gs.PlayerRolesRuntime, roles, gs.rgEquipmentEffect)
    const bus = createCommandBus()
    startBattle({
      gs,
      enemyTeamId: 0,
      battleFieldId: 0,
      isBoss: false,
      enemies: [{ ...enemies[1], health: 10000, ...(lethal ? { attackStrength: 10000 } : {}) }],
      enemyObjects,
      enemyTeams: [
        {
          id: 0,
          enemies: [1, 65535, 65535, 65535, 65535],
          enemyObjectIndexes: [398, 65535, 65535, 65535, 65535],
        },
      ],
      battleFields,
      playerRoles: live,
      items,
      spells,
      magics,
      objectMagics,
      objectPoisons,
      objectPlayers,
      commands,
      rngSeed: 1,
    })
    assert(gs.battleState)
    return { gs, live, bus, state: gs.battleState }
  }
  for (const kind of ['magic', 'throw']) {
    const c = setup()
    c.state.phase = 'performAction'
    if (kind === 'magic') {
      performMagic({
        state: c.state,
        gs: c.gs,
        casterIsEnemy: false,
        casterIdx: 0,
        spellId: 352,
        targetIsEnemy: true,
        targetIdx: 0,
        spells,
        magics,
        items,
        objectMagics,
        playerRoles: c.live,
        bus: c.bus,
        commands,
        runScript,
      })
    } else {
      performThrowItem({
        state: c.state,
        gs: c.gs,
        casterIsEnemy: false,
        casterIdx: 0,
        itemId: 138,
        targetIdx: 0,
        items,
        magics,
        objectMagics,
        objectPoisons,
        playerRoles: c.live,
        bus: c.bus,
        commands,
        runScript,
      })
    }
    let guard = 1000
    while (c.state.battleAnim && guard-- > 0) tickBattle(c.gs, input, c.bus)
    assert(guard > 0)
    const poisonAtApply = structuredClone(c.state.enemies[0].poisons)
    const roundHpLosses = []
    for (let i = 0; i < 3; i++) {
      // Isolate real round-end dispatcher; no additional attacks between poison ticks.
      c.state.phase = 'postAction'
      c.state.roundEndDelayTicks = 0
      const hp = c.state.enemies[0].e.health
      tickBattle(c.gs, input, c.bus)
      roundHpLosses.push(hp - c.state.enemies[0].e.health)
    }
    assert.deepEqual(poisonAtApply, [{ poisonId: 555, scriptEntry: kind === 'magic' ? 0 : 40890 }])
    assert.deepEqual(roundHpLosses, kind === 'magic' ? [0, 0, 0] : [111, 222, 333])
    assert.equal(c.state.enemies[0].poisons.length, kind === 'magic' ? 1 : 0)
    console.log(
      'C-phase1-poison',
      JSON.stringify({
        kind,
        poisonAtApply,
        roundHpLosses,
        poisonsAfter: c.state.enemies[0].poisons,
      }),
    )
  }
  for (const guardianId of [0, 2]) {
    const victimId = guardianId === 0 ? 1 : 0
    const c = setup([guardianId, victimId], true)
    c.state.phase = 'performAction'
    c.state.actionQueue = [{ isEnemy: true, idx: 0, dexterity: 100 }]
    c.state.currentActionIndex = 0
    c.state.rng.rangeInclusive = (a, b) => (a === 0 && b === 1 ? 1 : a)
    const rolls = [0.01, 0.01, 0.99]
    Math.random = () => rolls.shift() ?? 0.01
    let ticks = 0
    while (!c.state.battleDialogQueue?.length && ticks++ < 300) tickBattle(c.gs, input, c.bus)
    assert(ticks < 300)
    const baseFlee = c.gs.PlayerRolesRuntime.rgwFleeRate[guardianId]
    const evidence = {
      guardianId,
      victimId,
      victimHp: c.live.roles[victimId].hp,
      dialogue: c.state.battleDialogQueue.map((x) => x.text).filter(Boolean),
      extraDex: c.gs.rgEquipmentEffect[6].rgwDexterity[guardianId],
      baseFlee,
      expectedExtraFlee: Math.trunc(baseFlee * 0.9),
      actualExtraFlee: c.gs.rgEquipmentEffect[6].rgwFleeRate[guardianId],
      liveFlee: c.live.roles[guardianId].fleeRate,
      getterFlee: getPlayerFleeRate(c.gs, guardianId),
    }
    assert.equal(evidence.victimHp, 0)
    assert.equal(evidence.extraDex, guardianId === 0 ? 25 : 18)
    assert.equal(evidence.expectedExtraFlee, guardianId === 0 ? 28 : 25)
    assert.equal(evidence.actualExtraFlee, 0)
    assert.equal(evidence.liveFlee, evidence.getterFlee)
    console.log('C-phase1-friend-death', JSON.stringify(evidence))
  }
} finally {
  globalThis.fetch = oldFetch
  Math.random = oldRandom
}
