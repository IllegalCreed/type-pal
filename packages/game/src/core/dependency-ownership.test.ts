import type { Command, InputSnapshot } from '@type-pal/shared'
import { afterEach, describe, expect, it } from 'vitest'
import { createCommandBus } from './command-bus.js'
import * as equipEntry from './equip-effect.js'
import * as equipment from './equipment-state.js'
import * as eventEntry from './event-system.js'
import { createInitialGameState } from './game-state.js'
import * as inventory from './inventory-state.js'
import { createInGameMenu } from './menu/in-game-menu.js'
import * as menuEntry from './menu/menu-mode.js'
import * as menuStack from './menu/menu-stack.js'
import * as poison from './player-poison-state.js'
import * as identity from './scene-identity.js'
import * as sceneEntry from './scene-system.js'
import * as catalog from './script-catalog.js'

const fresh = () => createInitialGameState({ x: 0, y: 0, facing: 'down' })
const input = (): InputSnapshot => ({ held: new Set(), pressed: new Set(), frameNum: 0 })

afterEach(() => {
  catalog.setGlobalEvents([])
  poison.setObjectPoisons([])
  identity.setCurrentMapNum(0)
})

describe('D1 shared-state ownership after dependency split', () => {
  it('old entrypoints export the same callable bindings, not copied state or wrappers', () => {
    expect(eventEntry.setGlobalEvents).toBe(catalog.setGlobalEvents)
    expect(eventEntry.getGlobalCommands).toBe(catalog.getGlobalCommands)
    expect(eventEntry.addItemToInventory).toBe(inventory.addItemToInventory)
    expect(eventEntry.setObjectPoisons).toBe(poison.setObjectPoisons)
    expect(eventEntry.addPoisonForPlayer).toBe(poison.addPoisonForPlayer)
    expect(equipEntry.getPlayerAttackStrength).toBe(equipment.getPlayerAttackStrength)
    expect(equipEntry.removeEquipmentEffect).toBe(equipment.removeEquipmentEffect)
    expect(sceneEntry.setCurrentMapNum).toBe(identity.setCurrentMapNum)
    expect(menuEntry.openMenu).toBe(menuStack.openMenu)
    expect(menuEntry.closeTopMenu).toBe(menuStack.closeTopMenu)
  })

  it('catalog keeps the actual patched command array and publishes replacements through both entrypoints', () => {
    const commands: Command[] = [
      { op: 'showDialog', messageIndex: 12256, text: '获得九节鞭', label: 'L_1' },
      { op: 'giveItem', itemId: 0, count: 1 },
      { op: 'end' },
    ]
    eventEntry.setGlobalEvents(commands)
    expect(commands[1]).toEqual({ op: 'giveItem', itemId: 164, count: 1 })
    expect(catalog.getGlobalCommands()).toBe(commands)
    expect(eventEntry.getCmds({})).toBe(commands)
    const oldMap = eventEntry.getGlobalLabelMap()
    expect(oldMap).toEqual({ L_1: 0 })
    const replacement: Command[] = [{ op: 'end', label: 'L_2' }]
    catalog.setGlobalEvents(replacement)
    expect(eventEntry.getGlobalCommands()).toBe(replacement)
    expect(eventEntry.getGlobalLabelMap()).toEqual({ L_2: 0 })
    expect(oldMap).toEqual({ L_1: 0 })
  })

  it('explicit cursor overrides stay local while ordinary cursors read the latest shared catalog', () => {
    const local: Command[] = [{ op: 'end' }]
    const cursor = { commands: local, labelMap: { L_7: 0 } }
    const global: Command[] = [{ op: 'end', label: 'L_8' }]
    catalog.setGlobalEvents(global)
    expect(eventEntry.getCmds(cursor)).toBe(local)
    expect(catalog.resolveLabelIp(cursor, 'shared#L_7')).toBe(0)
    expect(catalog.resolveLabelIp(cursor, 'L_8')).toBeUndefined()
    expect(eventEntry.getCmds({})).toBe(global)
    expect(eventEntry.resolveScriptLabel(fresh(), 'L_8')).toEqual({ ip: 0 })
  })

  it('inventory consumption across entrypoints mutates only the supplied GameState', () => {
    const gs = fresh(),
      untouched = fresh(),
      before = structuredClone(untouched)
    eventEntry.addItemToInventory(gs, 5, 2)
    inventory.consumeItemFromInventory(gs, 5)
    expect(gs.inventory).toEqual([{ itemId: 5, count: 1 }])
    eventEntry.consumeItemFromInventory(gs, 5)
    expect(gs.inventory).toEqual([])
    expect(untouched).toEqual(before)
  })

  it('lower poison and catalog owners are consumed synchronously by the original equipment runner', () => {
    poison.setObjectPoisons([{ id: 100, level: 2, color: 0, playerScript: 555, enemyScript: 0 }])
    catalog.setGlobalEvents([
      { op: 'raw', opcode: 0x29, operands: [0, 100, 0], label: 'L_520' },
      { op: 'end' },
      { op: 'raw', opcode: 0x1b, operands: [0, 20, 0], label: 'L_555' },
      { op: 'end', advance: true },
    ])
    const gs = fresh()
    gs.partyMembers = [1]
    gs.PlayerRolesRuntime.rgwMaxHP[1] = 100
    gs.PlayerRolesRuntime.rgwHP[1] = 50
    gs.PlayerRolesRuntime.rgwPoisonResistance[1] = 0
    equipEntry.runEquipScript(gs, 520, 1)
    expect(gs.PlayerRolesRuntime.rgwHP[1]).toBe(70)
    expect(gs.rgPoisonStatus['0_1']).toEqual({ wPoisonID: 100, wPoisonScript: 4 })
  })

  it('equipment removal sees poison definitions registered at the original event entrypoint', () => {
    eventEntry.setObjectPoisons([
      { id: 100, level: 99, color: 0, playerScript: 0, enemyScript: 0 },
      { id: 101, level: 2, color: 0, playerScript: 0, enemyScript: 0 },
    ])
    const gs = fresh()
    poison.addPoisonForPlayer(gs, 0, 100)
    poison.addPoisonForPlayer(gs, 0, 101)
    poison.addPoisonForPlayer(gs, 1, 100)
    equipment.removeEquipmentEffect(gs, 0, 5)
    expect(gs.rgPoisonStatus['0_0']).toEqual({ wPoisonID: 0, wPoisonScript: 0 })
    expect(gs.rgPoisonStatus['1_0']).toEqual({ wPoisonID: 101, wPoisonScript: 0 })
    expect(gs.rgPoisonStatus['0_1']).toEqual({ wPoisonID: 100, wPoisonScript: 0 })
    expect(poison.isPlayerPoisoned(gs, 1)).toBe(false)
    expect(poison.isPlayerPoisoned(gs, 0)).toBe(true)
  })

  it('event history consumes the latest map written through either scene identity entrypoint', () => {
    const gs = fresh(),
      bus = createCommandBus()
    for (const [setMap, map] of [
      [sceneEntry.setCurrentMapNum, 7],
      [identity.setCurrentMapNum, 9],
    ] as const) {
      setMap(map)
      gs.eventCursor = {
        commands: [{ op: 'showDialog', messageIndex: map, text: '共享地图' }],
        ip: 0,
      }
      gs.mode = 'event'
      eventEntry.tickEventSystem(gs, input(), bus)
      expect(gs.dialogHistory?.at(-1)).toEqual({ map, text: '共享地图' })
      expect(sceneEntry.getCurrentMapNum()).toBe(map)
    }
  })

  it('closing the lower menu stack defers shop resumption until the existing menu tick', () => {
    const gs = fresh()
    gs.eventCursor = { ip: 3, waiting: 'shop' }
    menuEntry.openMenu(gs, { kind: 'in-game', state: createInGameMenu() })
    menuStack.closeTopMenu(gs)
    expect(gs.mode).toBe('menu')
    expect(gs.eventCursor).toEqual({ ip: 3, waiting: 'shop' })
    menuEntry.tickMenu(gs, input(), createCommandBus())
    expect(gs.mode).toBe('event')
    expect(gs.eventCursor).toEqual({ ip: 3, waiting: undefined })
    expect(gs.menuStack).toEqual([])
  })
})
