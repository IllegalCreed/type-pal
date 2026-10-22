import type { Command, Spell } from '@type-pal/shared'
import { afterEach, describe, expect, it } from 'vitest'
import { parseImportedSave, serializeSave } from '../tools/save-io.js'
import {
  makeFreshGameState,
  makeItem,
  makeItemFlags,
} from './__tests__/stats/stats-test-fixtures.js'
import { createCommandBus } from './command-bus.js'
import { updateAllEquipments } from './equip-effect.js'
import { setGlobalEvents, startOverworldItemScript, tickEventSystem } from './event-system.js'
import { resetPresentationTransients } from './game-state.js'
import { castOverworldMagic } from './menu/magic-script.js'
import { Save } from './save/api.js'

function installCommands(commands: Command[]): void {
  setGlobalEvents(commands.map((command, ip) => ({ ...command, label: `L_${ip}` })))
}

const emptyInput = { held: new Set<never>(), pressed: new Set<never>(), frameNum: 0 }
afterEach(async () => {
  setGlobalEvents([])
  await Save._clearAllForTest()
})

describe('overworld object script ownership', () => {
  it('casts the advanced success hook on the next heal while the use hook stays independent', () => {
    const gs = makeFreshGameState()
    gs.PlayerRolesRuntime.rgwHP[0] = 10
    const spell: Spell = {
      id: 296,
      magicNumber: 0,
      scriptOnUse: 1,
      scriptOnSuccess: 3,
      scriptDesc: 99,
      flags: {
        usableOutsideBattle: true,
        usableInBattle: true,
        usableToEnemy: false,
        applyToAll: false,
      },
    }
    const commands: Command[] = [
      { op: 'end' },
      { op: 'end', advance: true },
      { op: 'end' },
      { op: 'raw', opcode: 0x1b, operands: [0, 10, 0] },
      { op: 'end', advance: true },
      { op: 'raw', opcode: 0x1b, operands: [0, 20, 0] },
      { op: 'end' },
    ]
    installCommands(commands)
    expect(castOverworldMagic(gs, spell, 0, 0, 0)).toBe(true)
    expect(gs.PlayerRolesRuntime.rgwHP[0]).toBe(20)
    expect(castOverworldMagic(gs, spell, 0, 0, 0)).toBe(true)
    expect(gs.PlayerRolesRuntime.rgwHP[0]).toBe(40)
    expect(gs.rgObject[296]?.rgwData).toEqual([0, 0, 5, 2, 0, 99, 3])
    expect([spell.scriptOnUse, spell.scriptOnSuccess]).toEqual([1, 3])
  })

  it('equipment hooks are object-owned across roles, preserving the other item hooks and flags', () => {
    const gs = makeFreshGameState()
    gs.PlayerRolesRuntime.rgwEquipment[3]![0] = 187
    gs.PlayerRolesRuntime.rgwEquipment[3]![1] = 187
    const item = makeItem({
      id: 187,
      scriptOnUse: 7,
      scriptOnEquip: 1,
      scriptOnThrow: 8,
      scriptDesc: 9,
    })
    installCommands([
      { op: 'end' },
      { op: 'raw', opcode: 0x17, operands: [14, 17, 10] },
      { op: 'end', advance: true },
      { op: 'raw', opcode: 0x17, operands: [14, 17, 20] },
      { op: 'end' },
    ])
    updateAllEquipments(gs, [item])
    expect(gs.rgEquipmentEffect[3]!.rgwAttackStrength.slice(0, 2)).toEqual([10, 20])
    expect(gs.rgObject[187]?.rgwData.slice(2, 6)).toEqual([7, 3, 8, 9])
    expect(item.scriptOnEquip).toBe(1)
  })

  it('item-use root survives a nested call and saved wait, then advances and resets on later use', async () => {
    const gs = makeFreshGameState()
    const item = makeItem({
      id: 61,
      scriptOnUse: 1,
      scriptOnEquip: 6,
      scriptOnThrow: 9,
      flags: makeItemFlags({ usable: true, consuming: true }),
    })
    gs.inventory = [{ itemId: 61, count: 2 }]
    installCommands([
      { op: 'end' },
      { op: 'raw', opcode: 4, operands: [8, 0, 0] },
      { op: 'raw', opcode: 9, operands: [1, 0, 0] },
      { op: 'end', advance: true },
      { op: 'giveItem', itemId: 80, count: 1 },
      { op: 'end', reset: true, resetTo: 1 },
      { op: 'end' },
      { op: 'end' },
      { op: 'end', advance: true },
    ])
    const bus = createCommandBus()
    expect(startOverworldItemScript(gs, item, 0)).toBe(true)
    tickEventSystem(gs, emptyInput, bus)
    expect(gs.eventCursor?.waiting).toBe('frame-wait')
    expect(gs.rgObject[61]?.rgwData[2]).toBe(1) // child's advance did not commit the item root
    await Save.saveSlot(1, parseImportedSave(serializeSave(gs)))
    const loaded = await Save.loadSlot(1)
    expect(loaded).not.toBeNull()
    const restored = makeFreshGameState()
    Object.assign(restored, loaded)
    for (let i = 0; i < 3 && restored.eventCursor; i++) tickEventSystem(restored, emptyInput, bus)
    expect(restored.eventCursor).toBeUndefined()
    expect(restored.inventory).toEqual([{ itemId: 61, count: 1 }])
    expect(restored.rgObject[61]?.rgwData[2]).toBe(4)
    expect(startOverworldItemScript(restored, item, 0)).toBe(true)
    tickEventSystem(restored, emptyInput, bus)
    expect(restored.inventory.find((entry) => entry.itemId === 80)?.count).toBe(1)
    expect(restored.rgObject[61]?.rgwData.slice(2, 5)).toEqual([1, 6, 9])
    expect(item.scriptOnUse).toBe(1)
  })

  it('root checkpoint survives a child checkpoint and plain end, so the next use skips the completed prefix', () => {
    const gs = makeFreshGameState()
    const item = makeItem({ id: 61, scriptOnUse: 1 })
    installCommands([
      { op: 'end' },
      { op: 'giveItem', itemId: 80, count: 1 },
      { op: 'raw', opcode: 8, operands: [0, 0, 0] },
      { op: 'raw', opcode: 4, operands: [6, 0, 0] },
      { op: 'end' },
      { op: 'end' },
      { op: 'raw', opcode: 8, operands: [0, 0, 0] },
      { op: 'end' },
    ])
    const bus = createCommandBus()
    expect(startOverworldItemScript(gs, item, 0)).toBe(true)
    tickEventSystem(gs, emptyInput, bus)
    expect(gs.rgObject[61]?.rgwData[2]).toBe(3)
    expect(startOverworldItemScript(gs, item, 0)).toBe(true)
    tickEventSystem(gs, emptyInput, bus)
    expect(gs.inventory.find((entry) => entry.itemId === 80)?.count).toBe(1)
  })

  it('returning to title during a waiting item script discards its unfinished next entry', () => {
    const gs = makeFreshGameState()
    const item = makeItem({ id: 61, scriptOnUse: 1 })
    installCommands([
      { op: 'end' },
      { op: 'raw', opcode: 8, operands: [0, 0, 0] },
      { op: 'raw', opcode: 9, operands: [1, 0, 0] },
      { op: 'end', advance: true },
    ])
    expect(startOverworldItemScript(gs, item, 0)).toBe(true)
    tickEventSystem(gs, emptyInput, createCommandBus())
    expect(gs.eventCursor?.waiting).toBe('frame-wait')
    expect(gs.eventCursor?.itemScript?.entry).toBe(2)
    resetPresentationTransients(gs)
    expect(gs.eventCursor).toBeUndefined()
    expect(gs.rgObject[61]?.rgwData[2]).toBe(1)
    expect(item.scriptOnUse).toBe(1)
  })
})
