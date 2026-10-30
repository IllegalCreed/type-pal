import type { Command, Item, Magic, Spell } from '@type-pal/shared'
import { afterEach, describe, expect, it } from 'vitest'
import { makeHBattle, makeHRole } from '../../../__tests__/glm-next-wave/H/harness.js'
import { parseImportedSave, serializeSave } from '../../../tools/save-io.js'
import { runScript } from '../../event-system.js'
import {
  createInitialGameState,
  hydratePlayerRolesRuntime,
  resetSceneRuntimeForNewGame,
} from '../../game-state.js'
import { Save } from '../../save/api.js'
import { performItem } from '../actions/item.js'
import { performMagic } from '../actions/magic.js'
import { performThrowItem } from '../actions/throw-item.js'
import { setBattleResources } from '../battle-runtime-context.js'
import { tickBattle } from '../battle-system.js'

// Raw Win Wine God hooks: use 43075..43081 and success 43126..43137.
// Local IPs preserve their control flow; D18's data correction explicitly removes role 0's magic.
const commands: Command[] = [
  { op: 'end' },
  { op: 'raw', opcode: 0x20, operands: [86, 1, 4], label: 'L_1' },
  { op: 'raw', opcode: 0x57, operands: [370, 0, 0] },
  { op: 'end' },
  { op: 'raw', opcode: 0x41, operands: [0, 0, 0], label: 'L_4' },
  { op: 'end' },
  ...Array.from({ length: 8 }, (): Command => ({ op: 'end', advance: true })),
  { op: 'raw', opcode: 0x56, operands: [370, 1, 0] },
  { op: 'end' },
]
const wine: Spell = {
  id: 370,
  magicNumber: 75,
  scriptOnSuccess: 6,
  scriptOnUse: 1,
  scriptDesc: 43331,
  flags: {
    usableOutsideBattle: false,
    usableInBattle: true,
    usableToEnemy: true,
    applyToAll: true,
  },
}
const magic: Magic = {
  id: 75,
  type: 'summon',
  effect: 61,
  xOffset: 0,
  yOffset: 18,
  special: 5,
  speed: 1,
  keepEffect: 1,
  fireDelay: 2,
  effectTimes: 0,
  shake: 0,
  wave: 0,
  unknown: 0,
  costMP: 1,
  baseDamage: 3,
  elemental: 0,
  sound: 301,
}
function battle() {
  const b = makeHBattle({ roles: [makeHRole(0), makeHRole(1)], party: [1, 0] })
  hydratePlayerRolesRuntime(b.gs.PlayerRolesRuntime, b.playerRoles)
  b.gs.PlayerRolesRuntime.rgwMagic[0]![0] = 370
  b.gs.PlayerRolesRuntime.rgwMagic[1]![0] = 296
  b.gs.inventory = [{ itemId: 86, count: 12 }]
  return b
}
function cast(b: ReturnType<typeof battle>, spell = wine) {
  b.playerRoles.roles[0]!.mp = 30
  performMagic({
    ...b,
    casterIsEnemy: false,
    casterIdx: 1,
    spellId: spell.id,
    targetIsEnemy: true,
    targetIdx: 'all',
    spells: [spell],
    magics: [{ ...magic }],
    commands,
    runScript,
  })
  b.bus.drain()
}
const learnedWine = (b: ReturnType<typeof battle>) =>
  b.gs.PlayerRolesRuntime.rgwMagic.some((row) => row[0] === 370)

afterEach(async () => {
  await Save._clearAllForTest()
})

describe('object script progress belongs to the saved game', () => {
  it('Wine God: eight successes, save/import/load, ninth removes the nonleader spell; Repeat cannot cast a tenth', async () => {
    const b = battle()
    const staticSpell = structuredClone(wine)
    for (let n = 0; n < 8; n++) cast(b, staticSpell)
    expect(learnedWine(b)).toBe(true)
    expect(b.gs.inventory[0]!.count).toBe(4)
    expect(b.gs.rgObject[370]?.rgwData[2]).toBe(14)
    b.gs.battleState = undefined // Save from the overworld; battle RNG is not a serializable resource.
    await Save.saveSlot(1, parseImportedSave(serializeSave(b.gs)))
    const loaded = await Save.loadSlot(1)
    expect(loaded).not.toBeNull()
    const continued = battle()
    Object.assign(continued.gs, loaded)
    cast(continued, staticSpell)
    expect(learnedWine(continued)).toBe(false)
    expect(continued.gs.inventory[0]!.count).toBe(3)
    expect(staticSpell).toEqual(wine)

    // A repeated previous action traverses production action validation, rather than calling performMagic illegally.
    continued.gs.mode = 'battle'
    continued.gs.battleState = continued.state
    continued.state.phase = 'performAction'
    continued.state.pendingActions = new Map([[1, { type: 'magic', actionId: 370, target: -1 }]])
    continued.state.actionQueue = [{ isEnemy: false, idx: 1, dex: 100, fIsSecond: false }]
    continued.state.currentActionIndex = 0
    setBattleResources(continued.gs, {
      items: [],
      spells: [staticSpell],
      magics: [{ ...magic }],
      objectMagics: [],
      objectPoisons: [],
      objectPlayers: [],
      enemies: [],
      enemyObjects: [],
      playerRoles: continued.playerRoles,
      commands,
    })
    const hp = continued.state.enemies[0]!.e.health
    tickBattle(continued.gs, { held: new Set(), pressed: new Set(), frameNum: 1 }, continued.bus)
    expect(continued.gs.inventory[0]!.count).toBe(3)
    expect(continued.state.enemies[0]!.e.health).toBeLessThan(hp) // fell back to physical attack
  })

  it('failed Wine God resource check does not advance; a new game starts from the resource entry', () => {
    const b = battle()
    cast(b)
    b.gs.inventory = []
    cast(b)
    expect(b.gs.fScriptSuccess).toBe(false)
    expect(b.gs.rgObject[370]?.rgwData[2]).toBe(7)
    resetSceneRuntimeForNewGame(b.gs, [])
    b.gs.inventory = [{ itemId: 86, count: 1 }]
    cast(b)
    expect(b.gs.rgObject[370]?.rgwData[2]).toBe(7)
    expect(createInitialGameState({ x: 0, y: 0, facing: 'down' }).rgObject).toEqual({})
  })

  it('use and throw hooks advance independently without changing the item table', () => {
    const b = battle()
    const item: Item = {
      id: 61,
      bitmap: 10,
      price: 20,
      scriptOnUse: 1,
      scriptOnEquip: 5,
      scriptOnThrow: 3,
      scriptDesc: 8,
      flags: {
        usable: true,
        equipable: true,
        throwable: true,
        consuming: true,
        applyToAll: false,
        sellable: true,
        equipableBy: [true, false, true, false, false, false],
      },
    }
    const source = structuredClone(item)
    const code: Command[] = [
      { op: 'end' },
      { op: 'end', advance: true },
      { op: 'raw', opcode: 0x1e, operands: [7, 0, 0] },
      { op: 'end', advance: true },
      { op: 'raw', opcode: 0x1e, operands: [11, 0, 0] },
      { op: 'end' },
    ]
    b.gs.inventory = [{ itemId: 61, count: 4 }]
    const input = {
      ...b,
      casterIsEnemy: false,
      casterIdx: 1,
      itemId: 61,
      items: [item],
      commands: code,
      runScript,
    }
    performItem({ ...input, targetIsEnemy: false, targetIdx: 1 })
    performThrowItem({ ...input, targetIdx: 0, magics: [], objectMagics: [], objectPoisons: [] })
    const cash = b.gs.dwCash
    performItem({ ...input, targetIsEnemy: false, targetIdx: 1 })
    performThrowItem({ ...input, targetIdx: 0, magics: [], objectMagics: [], objectPoisons: [] })
    expect(b.gs.dwCash - cash).toBe(18)
    expect(b.gs.inventory[0]!.count).toBe(0)
    expect(item).toEqual(source)
    expect(b.gs.rgObject[61]?.rgwData).toEqual([10, 20, 4, 5, 4, 8, 367])
  })
})
