import type { Command, InputSnapshot } from '@type-pal/shared'
import { afterEach, expect, it } from 'vitest'
import { parseImportedSave, serializeSave } from '../../tools/save-io.js'
import {
  makeBattleField,
  makeEnemy,
  makeItem,
  makeItemFlags,
  makePlayerRole,
  makePlayerRoles,
} from '../__tests__/stats/stats-test-fixtures.js'
import { createCommandBus } from '../command-bus.js'
import { updateAllEquipments } from '../equip-effect.js'
import { getPlayerPoisonResistance } from '../equipment-state.js'
import { runScript, setGlobalEvents, setRefreshEquipmentsHandler } from '../event-system.js'
import {
  createInitialGameState,
  loadDefaultGame,
  projectRuntimeToBattleRoles,
} from '../game-state.js'
import { Save } from '../save/api.js'
import { performFlee } from './actions/flee.js'
import { performItem } from './actions/item.js'
import { getBattleResources } from './battle-runtime-context.js'
import { startBattle, tickBattle } from './battle-system.js'

afterEach(async () => {
  setGlobalEvents([])
  setRefreshEquipmentsHandler(null)
  await Save.deleteSlot(1)
})

it('clears a departed last-role garlic effect after real import and escape, preserving equipment', async () => {
  // Original SSS entries: setParty20557, FairySword39027 and garlic39536.
  // Only these reachable snippets are supplied; this is not a canonical-story fixture.
  const commands: Command[] = Array.from({ length: 39538 }, () => ({ op: 'end' }))
  commands[20557] = { op: 'raw', opcode: 0x75, operands: [1, 0, 0] }
  commands[20558] = { op: 'end', advance: true }
  commands[39027] = { op: 'raw', opcode: 0x18, operands: [14, 170, 0], label: 'L_39027' }
  commands[39028] = { op: 'raw', opcode: 0x17, operands: [14, 17, 8] }
  commands[39029] = { op: 'raw', opcode: 0x17, operands: [14, 19, 5] }
  commands[39030] = { op: 'raw', opcode: 0x2d, operands: [8, 32760, 0] }
  commands[39536] = { op: 'raw', opcode: 0x17, operands: [17, 22, 30] }
  const items = [
    makeItem({
      id: 84,
      scriptOnUse: 39536,
      flags: makeItemFlags({
        usable: true,
        equipable: false,
        consuming: true,
        equipableBy: [false, false, false, false, false, false],
      }),
    }),
    makeItem({ id: 170, scriptOnEquip: 39027 }),
  ]
  setGlobalEvents(commands)
  setRefreshEquipmentsHandler((gs) => updateAllEquipments(gs, items))
  const baseline = makePlayerRoles(
    Array.from({ length: 6 }, (_, id) => makePlayerRole({ id, fleeRate: 100 })),
  )
  const original = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  loadDefaultGame(original, baseline)
  original.partyMembers = [0, 5]
  original.PlayerRolesRuntime.rgwEquipment[3]![1] = 170
  original.inventory = [{ itemId: 84, count: 1 }]
  original.rgObject[398] = { rgwData: [1, 0, 20557, 0, 0, 0, 0] }
  await Save.saveSlot(1, parseImportedSave(serializeSave(original)))
  const saved = await Save.loadSlot(1)
  expect(saved).not.toBeNull()
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  Object.assign(gs, saved)
  const playerRoles = projectRuntimeToBattleRoles(
    gs.PlayerRolesRuntime,
    baseline,
    gs.rgEquipmentEffect,
  )
  startBattle({
    gs,
    enemyTeamId: 0,
    battleFieldId: 1,
    isBoss: false,
    enemyTeams: [
      {
        id: 0,
        enemies: [1, 0xffff, 0xffff, 0xffff, 0xffff],
        enemyObjectIndexes: [398, 0xffff, 0xffff, 0xffff, 0xffff],
      },
    ],
    enemies: [makeEnemy({ id: 1 })],
    enemyObjects: [
      {
        objectIndex: 398,
        enemyId: 1,
        resistanceToSorcery: 0,
        scriptOnTurnStart: 0,
        scriptOnReady: 0,
        scriptOnBattleEnd: 0,
      },
    ],
    battleFields: [makeBattleField()],
    playerRoles,
    items,
    spells: [],
    magics: [],
    commands,
    rngSeed: 7,
  })
  const state = gs.battleState
  if (!state) throw new Error('startBattle must install the battle state')
  const input: InputSnapshot = { held: new Set(), pressed: new Set(), frameNum: 0 }
  const bus = createCommandBus()
  tickBattle(gs, input, bus)
  tickBattle(gs, input, bus)
  expect(gs.partyMembers).toEqual([0])
  expect(state.players.map((player) => player.roleId)).toEqual([0, 5])
  expect(gs.rgEquipmentEffect[6]!.rgwPoisonResistance).toEqual([0, 0, 0, 0, 0, 0])
  // The equipment script, not a seeded status/bonus, supplies the permanent counter.
  expect(gs.rgEquipmentEffect[3]!.rgwAttackStrength[1]).toBe(8)
  expect(gs.rgPlayerStatus[1]![8]).toBe(32760)
  performItem({
    gs,
    state,
    playerRoles,
    items,
    commands,
    bus,
    runScript,
    casterIsEnemy: false,
    casterIdx: 0,
    itemId: 84,
    targetIsEnemy: false,
    targetIdx: 1,
  })
  expect(gs.rgEquipmentEffect[6]!.rgwPoisonResistance[5]).toBe(30)
  expect(gs.inventory).toEqual([{ itemId: 84, count: 0 }])
  performFlee(state, gs, 0, bus)
  expect(state.fleeAnim).toBeDefined()
  for (let tick = 0; gs.battleState && tick < 20; tick++) tickBattle(gs, input, bus)
  expect(gs.mode).toBe('explore')
  expect(gs.battleState).toBeUndefined()
  expect(getBattleResources(gs)).toBeUndefined()
  expect(gs.rgEquipmentEffect[3]!.rgwAttackStrength[1]).toBe(8)
  expect(gs.rgPlayerStatus[1]![8]).toBe(32760)
  // battle.c:1822-1830 clears Extra for all six roles, including the departed role5.
  expect(gs.rgEquipmentEffect[6]!.rgwPoisonResistance).toEqual([0, 0, 0, 0, 0, 0])
  expect(getPlayerPoisonResistance(gs, 5)).toBe(5)
  expect(parseImportedSave(serializeSave(gs)).rgEquipmentEffect[6]!.rgwPoisonResistance[5]).toBe(0)
})
