/** Synchronous player-poison entry: return addresses, nested calls and target ownership. */
import type { Command } from '@type-pal/shared'
import { afterEach, describe, expect, it } from 'vitest'
import { freshPlayerOpcodeState } from './event-opcode-player.test-fixtures.js'
import { buildLabelMap, runPlayerPoisonEntrySync, tickEventSystem } from './event-system.js'
import { setObjectPoisons } from './player-poison-state.js'
import { snap } from './scene.test-fixtures.js'
import { setGlobalEvents } from './script-catalog.js'

afterEach(() => {
  setGlobalEvents([])
  setObjectPoisons([])
})

function install(commands: Command[]) {
  setGlobalEvents([{ op: 'end', label: 'L_0' }, ...commands])
  return freshPlayerOpcodeState()
}

describe('synchronous poison entry addressing', () => {
  it.each([
    { entry: 5, cash: 111, returned: 1 },
    { entry: 3, cash: 0, returned: 3 },
  ])('entry $entry leaves cash $cash and returns $returned', ({ entry, cash, returned }) => {
    const gs = install([
      { op: 'raw', opcode: 0x1e, operands: [111, 0, 0], label: 'L_5' },
      { op: 'end' },
      { op: 'end' },
    ])
    expect(runPlayerPoisonEntrySync(gs, 0, entry)).toBe(returned)
    expect(gs.dwCash).toBe(cash)
  })

  it.each([
    { name: 'plain', end: { op: 'end' } as const, returned: 1 },
    { name: 'advance', end: { op: 'end', advance: true } as const, returned: 3 },
    { name: 'reset', end: { op: 'end', reset: true, resetTo: 4 } as const, returned: 4 },
    {
      name: 'missing reset',
      end: { op: 'end', reset: true, resetTo: 60000 } as const,
      returned: 1,
    },
  ])('$name end returns $returned after executing only the entry prefix', ({ end, returned }) => {
    const gs = install([
      { op: 'raw', opcode: 0x1e, operands: [50, 0, 0], label: 'L_1' },
      end,
      { op: 'raw', opcode: 0x1e, operands: [60, 0, 0] },
      { op: 'end', label: 'L_4' },
    ])
    expect(runPlayerPoisonEntrySync(gs, 0, 1)).toBe(returned)
    expect(gs.dwCash).toBe(50)
  })

  it('a nested child returns before the caller suffix executes', () => {
    const gs = install([
      { op: 'raw', opcode: 0x04, operands: [4, 0, 0], label: 'L_1' },
      { op: 'raw', opcode: 0x1e, operands: [7, 0, 0] },
      { op: 'end' },
      { op: 'raw', opcode: 0x1e, operands: [33, 0, 0], label: 'L_4' },
      { op: 'end' },
    ])
    expect(runPlayerPoisonEntrySync(gs, 0, 1)).toBe(1)
    expect(gs.dwCash).toBe(40)
  })

  it.each([
    { target: 'L_3', cash: 222 },
    { target: 'L_60000', cash: 0 },
  ])('goto $target leaves cash $cash and preserves the original entry', ({ target, cash }) => {
    const gs = install([
      { op: 'goto', to: target, label: 'L_1' },
      { op: 'raw', opcode: 0x1e, operands: [50, 0, 0] },
      { op: 'raw', opcode: 0x1e, operands: [222, 0, 0], label: 'L_3' },
      { op: 'end' },
    ])
    expect(runPlayerPoisonEntrySync(gs, 0, 1)).toBe(1)
    expect(gs.dwCash).toBe(cash)
  })

  it('blocking dialogue leaves its entry armed without opening UI or executing the suffix', () => {
    const gs = install([
      { op: 'end' },
      { op: 'showDialog', messageIndex: 1, text: '毒发', label: 'L_5' },
      { op: 'raw', opcode: 0x1e, operands: [50, 0, 0] },
      { op: 'end' },
    ])
    expect(runPlayerPoisonEntrySync(gs, 0, 5)).toBe(2)
    expect(gs.dwCash).toBe(0)
    expect(gs.dialogBox).toBeUndefined()
  })

  it('an out-of-range entry stays armed without changing game state', () => {
    const gs = install([{ op: 'end' }])
    const before = structuredClone(gs)
    expect(runPlayerPoisonEntrySync(gs, 0, 60000)).toBe(60000)
    expect(gs).toEqual(before)
  })
})

describe('poison entry target ownership', () => {
  it('the current role reaches only its corresponding poison party slot', () => {
    const gs = install([
      { op: 'raw', opcode: 0x29, operands: [0, 6, 0], label: 'L_1' },
      { op: 'end' },
    ])
    gs.partyMembers = [4, 1]
    gs.PlayerRolesRuntime.rgwPoisonResistance[1] = 0
    setObjectPoisons([{ id: 6, level: 1, color: 0, playerScript: 0, enemyScript: 0 }])
    expect(runPlayerPoisonEntrySync(gs, 1, 1)).toBe(1)
    expect(gs.rgPoisonStatus).toEqual({ '0_1': { wPoisonID: 6, wPoisonScript: 0 } })
  })

  it('the real overworld poison opcode runs entry effects immediately and stores the advanced return', () => {
    const gs = install([
      { op: 'raw', opcode: 0x1e, operands: [50, 0, 0], label: 'L_1' },
      { op: 'end', advance: true },
    ])
    gs.partyMembers = [4, 1]
    gs.PlayerRolesRuntime.rgwPoisonResistance[1] = 0
    setObjectPoisons([{ id: 6, level: 1, color: 0, playerScript: 1, enemyScript: 0 }])
    const commands: Command[] = [{ op: 'raw', opcode: 0x29, operands: [0, 6, 0] }, { op: 'end' }]
    gs.eventCursor = { commands, labelMap: buildLabelMap(commands), ip: 0, currentEventObjectId: 1 }
    gs.mode = 'event'
    tickEventSystem(gs, snap())
    expect(gs.dwCash).toBe(50)
    expect(gs.rgPoisonStatus).toEqual({ '0_1': { wPoisonID: 6, wPoisonScript: 3 } })
    expect(gs.mode).toBe('explore')
  })
})
