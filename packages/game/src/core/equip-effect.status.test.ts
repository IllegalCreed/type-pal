/** Persistent status rules through the synchronous equipment-script caller. */
import type { Command } from '@type-pal/shared'
import { afterEach, describe, expect, it } from 'vitest'
import { runEquipScript } from './equip-effect.js'
import { freshPlayerOpcodeState } from './event-opcode-player.test-fixtures.js'
import { setGlobalEvents } from './script-catalog.js'

afterEach(() => setGlobalEvents([]))

function installStatusScript(status: number, rounds: number): void {
  setGlobalEvents([
    { op: 'end', label: 'L_0' },
    { op: 'raw', opcode: 0x2d, operands: [status, rounds, 0], label: 'L_1' },
    { op: 'end', label: 'L_2' },
  ] satisfies Command[])
}

describe('equipment bad statuses', () => {
  it.each([
    { name: 'sleep', status: 2, current: 5, requested: 3 },
    { name: 'silence', status: 3, current: 8, requested: 2 },
  ])('$name is retained when present and applied to an unaffected role', ({
    status,
    current,
    requested,
  }) => {
    installStatusScript(status, requested)
    const gs = freshPlayerOpcodeState()
    gs.rgPlayerStatus[0]![status] = current
    runEquipScript(gs, 1, 0)
    expect(gs.rgPlayerStatus[0]![status]).toBe(current)
    runEquipScript(gs, 1, 1)
    expect(gs.rgPlayerStatus[1]![status]).toBe(requested)
  })
})

describe('equipment puppet status', () => {
  it.each([
    { name: 'living role is rejected', hp: 100, current: 0, expected: 0 },
    { name: 'dead role receives the status', hp: 0, current: 0, expected: 9 },
    { name: 'longer existing status is retained', hp: 0, current: 12, expected: 12 },
  ])('$name', ({ hp, current, expected }) => {
    installStatusScript(4, 9)
    const gs = freshPlayerOpcodeState()
    gs.PlayerRolesRuntime.rgwHP[0] = hp
    gs.rgPlayerStatus[0]![4] = current
    runEquipScript(gs, 1, 0)
    expect(gs.rgPlayerStatus[0]![4]).toBe(expected)
  })
})

describe('equipment good statuses', () => {
  it.each([
    {
      name: 'living weapon buff',
      hp: 100,
      current: 0,
      rounds: 32760,
      expected: 32760,
    },
    {
      name: 'longer status retained',
      hp: 100,
      current: 100,
      rounds: 50,
      expected: 100,
    },
    {
      name: 'dead role rejected',
      hp: 0,
      current: 0,
      rounds: 32760,
      expected: 0,
    },
  ])('$name', ({ hp, current, rounds, expected }) => {
    installStatusScript(8, rounds)
    const gs = freshPlayerOpcodeState()
    gs.PlayerRolesRuntime.rgwHP[1] = hp
    gs.rgPlayerStatus[1]![8] = current
    runEquipScript(gs, 1, 1)
    expect(gs.rgPlayerStatus[1]![8]).toBe(expected)
  })
})
