import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  applyPlayerOpcode,
  OP_ADD_MAGIC,
  OP_CURE_ENEMY_POISON_KIND,
  OP_EQUIP_ITEM,
  OP_INCREASE_HP_MP,
  OP_INCREASE_PLAYER_LEVEL,
  OP_POISON_PLAYER,
  OP_REMOVE_MAGIC,
  OP_SET_PLAYER_STATUS,
} from './event-opcode-player.js'
import * as eventEntry from './event-system.js'
import { createInitialGameState } from './game-state.js'
import { setObjectPoisons } from './player-poison-state.js'

const here = dirname(fileURLToPath(import.meta.url))
const ownerFile = resolve(here, 'event-opcode-player.ts')
const entryFile = resolve(here, 'event-system.ts')
const fresh = () => createInitialGameState({ x: 0, y: 0, facing: 'down' })
const poisonRunner = vi.fn(() => 0)

afterEach(() => {
  vi.restoreAllMocks()
  poisonRunner.mockClear()
  setObjectPoisons([])
})

describe('player opcode family ownership', () => {
  it('the legacy event entrypoint re-exports owner constants while delegating exactly once', () => {
    expect(eventEntry.OP_EQUIP_ITEM).toBe(OP_EQUIP_ITEM)
    expect(eventEntry.OP_INCREASE_HP_MP).toBe(OP_INCREASE_HP_MP)
    expect(eventEntry.OP_POISON_PLAYER).toBe(OP_POISON_PLAYER)
    expect(eventEntry.OP_INCREASE_PLAYER_LEVEL).toBe(OP_INCREASE_PLAYER_LEVEL)

    const ownerSource = readFileSync(ownerFile, 'utf8')
    const entrySource = readFileSync(entryFile, 'utf8')
    expect(ownerSource).not.toMatch(/(?:from|import\()['"]\.\/event-system/)
    expect(ownerSource).not.toMatch(
      /from ['"][^'"]*(?:battle-state|battle-system|bootstrap)['"]|import\(['"][^'"]*(?:battle-state|battle-system|bootstrap)/,
    )
    expect(entrySource.match(/applyPlayerOpcode\(/g)).toHaveLength(1)
    expect(entrySource).not.toMatch(/case OP_(?:EQUIP_ITEM|INCREASE_HP_MP|POISON_PLAYER)/)
  })

  it('HP/MP and status mutations keep the supplied role sample and synchronous success rules', () => {
    const gs = fresh()
    gs.partyMembers = [1]
    gs.PlayerRolesRuntime.rgwHP[1] = 50
    gs.PlayerRolesRuntime.rgwMaxHP[1] = 100
    gs.PlayerRolesRuntime.rgwMP[1] = 10
    gs.PlayerRolesRuntime.rgwMaxMP[1] = 40

    expect(
      applyPlayerOpcode({
        gs,
        opcode: OP_INCREASE_HP_MP,
        operands: [0, 20, 0],
        currentEventObjectId: 1,
        runPlayerPoisonEntry: poisonRunner,
      }),
    ).toBe(true)
    expect([gs.PlayerRolesRuntime.rgwHP[1], gs.PlayerRolesRuntime.rgwMP[1]]).toEqual([70, 30])

    applyPlayerOpcode({
      gs,
      opcode: OP_SET_PLAYER_STATUS,
      operands: [5, 3, 0],
      currentEventObjectId: 1,
      runPlayerPoisonEntry: poisonRunner,
    })
    expect(gs.rgPlayerStatus[1]?.[5]).toBe(3)
  })

  it('equipment swap preserves the one-item in-place replacement and current-slot sampling', () => {
    const gs = fresh()
    gs.partyMembers = [0]
    gs.PlayerRolesRuntime.rgwEquipment[0]![0] = 100
    gs.inventory = [{ itemId: 200, count: 1 }]

    applyPlayerOpcode({
      gs,
      opcode: OP_EQUIP_ITEM,
      operands: [0x0b, 200, 0],
      currentEventObjectId: 0,
      runPlayerPoisonEntry: poisonRunner,
    })

    expect(gs.iCurEquipPart).toBe(0)
    expect(gs.PlayerRolesRuntime.rgwEquipment[0]?.[0]).toBe(200)
    expect(gs.inventory).toEqual([{ itemId: 100, count: 1 }])
    expect(gs.wLastUnequippedItem).toBe(100)
  })

  it('poison resistance samples once before the existing poison owner and runs its entry synchronously', () => {
    const gs = fresh()
    gs.partyMembers = [0]
    gs.PlayerRolesRuntime.rgwPoisonResistance[0] = 0
    setObjectPoisons([{ id: 77, level: 2, color: 0, playerScript: 123, enemyScript: 0 }])
    const random = vi.spyOn(Math, 'random').mockReturnValue(0)

    applyPlayerOpcode({
      gs,
      opcode: OP_POISON_PLAYER,
      operands: [0, 77, 0],
      currentEventObjectId: 0,
      runPlayerPoisonEntry: poisonRunner,
    })

    expect(random).toHaveBeenCalledTimes(1)
    expect(poisonRunner).toHaveBeenCalledWith(gs, 0, 123)
    expect(gs.rgPoisonStatus['0_0']).toEqual({ wPoisonID: 77, wPoisonScript: 0 })
  })

  it('level-up retains seven random samples, stat increments, caps and primary-exp reset', () => {
    const gs = fresh()
    const role = 0
    gs.PlayerRolesRuntime.rgwLevel[role] = 1
    gs.PlayerRolesRuntime.rgwMaxHP[role] = 100
    gs.PlayerRolesRuntime.rgwMaxMP[role] = 50
    gs.PlayerRolesRuntime.rgwAttackStrength[role] = 10
    gs.PlayerRolesRuntime.rgwMagicStrength[role] = 10
    gs.PlayerRolesRuntime.rgwDefense[role] = 10
    gs.PlayerRolesRuntime.rgwDexterity[role] = 10
    gs.PlayerRolesRuntime.rgwFleeRate[role] = 10
    gs.Exp.rgPrimaryExp[role] = { wExp: 999, wLevel: 1, wCount: 0 }
    const random = vi.spyOn(Math, 'random').mockReturnValue(0)

    applyPlayerOpcode({
      gs,
      opcode: OP_INCREASE_PLAYER_LEVEL,
      operands: [1, 0, 0],
      currentEventObjectId: role,
      runPlayerPoisonEntry: poisonRunner,
    })

    expect(random).toHaveBeenCalledTimes(6)
    expect({
      level: gs.PlayerRolesRuntime.rgwLevel[role],
      maxHP: gs.PlayerRolesRuntime.rgwMaxHP[role],
      maxMP: gs.PlayerRolesRuntime.rgwMaxMP[role],
      attack: gs.PlayerRolesRuntime.rgwAttackStrength[role],
      magic: gs.PlayerRolesRuntime.rgwMagicStrength[role],
      defense: gs.PlayerRolesRuntime.rgwDefense[role],
      dexterity: gs.PlayerRolesRuntime.rgwDexterity[role],
      flee: gs.PlayerRolesRuntime.rgwFleeRate[role],
      exp: gs.Exp.rgPrimaryExp[role],
    }).toEqual({
      level: 2,
      maxHP: 110,
      maxMP: 58,
      attack: 14,
      magic: 14,
      defense: 12,
      dexterity: 12,
      flee: 12,
      exp: { wExp: 0, wLevel: 2, wCount: 0 },
    })
  })

  it('magic slots stay single-owned and battle-only enemy opcodes remain consumed no-ops', () => {
    const gs = fresh()
    const before = structuredClone(gs)
    expect(
      applyPlayerOpcode({
        gs,
        opcode: OP_CURE_ENEMY_POISON_KIND,
        operands: [1, 2, 3],
        currentEventObjectId: 0,
        runPlayerPoisonEntry: poisonRunner,
      }),
    ).toBe(true)
    expect(gs).toEqual(before)

    applyPlayerOpcode({
      gs,
      opcode: OP_ADD_MAGIC,
      operands: [300, 1, 0],
      runPlayerPoisonEntry: poisonRunner,
    })
    applyPlayerOpcode({
      gs,
      opcode: OP_ADD_MAGIC,
      operands: [300, 1, 0],
      runPlayerPoisonEntry: poisonRunner,
    })
    expect(gs.PlayerRolesRuntime.rgwMagic.filter((slot) => slot?.[0] === 300)).toHaveLength(1)
    applyPlayerOpcode({
      gs,
      opcode: OP_REMOVE_MAGIC,
      operands: [300, 1, 0],
      runPlayerPoisonEntry: poisonRunner,
    })
    expect(gs.PlayerRolesRuntime.rgwMagic.some((slot) => slot?.[0] === 300)).toBe(false)

    expect(
      applyPlayerOpcode({
        gs,
        opcode: 0x43,
        operands: [1, 0, 0],
        runPlayerPoisonEntry: poisonRunner,
      }),
    ).toBe(false)
  })
})
