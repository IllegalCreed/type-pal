/** Automatic NPC scripts: admission, resumption, random gates and one-frame stepping. */
import type { Command } from '@type-pal/shared'
import { afterEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { freshPlayerOpcodeState } from './event-opcode-player.test-fixtures.js'
import { OP_SET_OBJECT_POS, tickAutoScripts } from './event-system.js'
import type { NpcState } from './game-state.js'
import { setGlobalEvents } from './script-catalog.js'

function npc(over: Partial<NpcState> = {}): NpcState {
  return { id: 0, x: 100, y: 100, spriteNum: 1, sState: 1, autoCursor: { ip: 1 }, ...over }
}

function install(commands: Command[]) {
  setGlobalEvents([{ op: 'end', label: 'L_0' }, ...commands])
  return freshPlayerOpcodeState()
}

afterEach(() => setGlobalEvents([]))

const walk: Command = { op: 'raw', opcode: 0x10, operands: [0, 0, 0], label: 'L_1' }

describe('automatic script admission', () => {
  it('an empty global program leaves its NPC and cursor unchanged', () => {
    setGlobalEvents([])
    const gs = freshPlayerOpcodeState()
    gs.npcs = [npc()]
    const before = structuredClone(gs.npcs)
    tickAutoScripts(gs)
    expect(gs.npcs).toEqual(before)
  })

  it.each([
    { state: -1, vanish: 0 },
    { state: 0, vanish: 0 },
    { state: 1, vanish: 3 },
  ])('state $state / vanish $vanish does not run its script', ({ state, vanish }) => {
    const gs = install([walk, { op: 'end' }])
    gs.npcs = [npc({ sState: state, sVanishTime: vanish })]
    const before = structuredClone(gs.npcs)
    tickAutoScripts(gs)
    expect(gs.npcs).toEqual(before)
  })

  it('only the trigger owner pauses before its first trigger instruction', () => {
    const gs = install([walk, { op: 'end' }])
    gs.npcs = [npc(), npc({ id: 1 })]
    gs.eventCursor = { ip: 1, triggerOwnerId: 0 }
    tickAutoScripts(gs)
    expect(gs.npcs.map(({ x, y }) => [x, y])).toEqual([
      [100, 100],
      [94, 97],
    ])
  })

  it.each([
    { name: 'started', cursor: { ip: 1, triggerOwnerId: 0, startedExecution: true } },
    { name: 'waiting', cursor: { ip: 1, triggerOwnerId: 0, waiting: 'frame-wait' as const } },
  ])('the $name trigger owner continues its automatic movement', ({ cursor }) => {
    const gs = install([walk, { op: 'end' }])
    gs.npcs = [npc()]
    gs.eventCursor = cursor
    tickAutoScripts(gs)
    expect(gs.npcs[0]?.x).toBe(94)
    expect(gs.npcs[0]?.y).toBe(97)
  })

  it.each([
    { label: 'L_1', moves: true },
    { label: 'L_60000', moves: false },
    { label: undefined, moves: false },
  ])('an unresolved cursor with label $label moves=$moves', ({ label, moves }) => {
    const gs = install([walk, { op: 'end' }])
    gs.npcs = [npc({ autoCursor: undefined, autoLabel: label })]
    tickAutoScripts(gs)
    expect(gs.npcs[0]?.x).toBe(moves ? 94 : 100)
    expect(gs.npcs[0]?.autoCursor?.ip).toBe(moves ? 1 : undefined)
  })
})

describe('automatic script control flow', () => {
  it.each([
    { advance: false, expected: 1 },
    { advance: true, expected: 2 },
  ])('end advance=$advance parks at $expected on subsequent ticks', ({ advance, expected }) => {
    const gs = install([{ op: 'end', advance }, { op: 'end' }])
    gs.npcs = [npc()]
    tickAutoScripts(gs)
    expect(gs.npcs[0]?.autoCursor?.ip).toBe(expected)
    tickAutoScripts(gs)
    expect(gs.npcs[0]?.autoCursor?.ip).toBe(expected)
  })

  it('zero-idle reset returns to its checkpoint without incrementing a counter', () => {
    const gs = install([{ op: 'end', reset: true, resetTo: 1, idleFrames: 0, label: 'L_1' }])
    gs.npcs = [npc()]
    for (let n = 0; n < 3; n++) tickAutoScripts(gs)
    expect(gs.npcs[0]?.autoCursor).toEqual({ ip: 1 })
  })

  it('a reset whose checkpoint is missing stops the automatic cursor', () => {
    const gs = install([{ op: 'end', reset: true, resetTo: 60000 }])
    gs.npcs = [npc()]
    tickAutoScripts(gs)
    expect(gs.npcs[0]?.autoCursor).toBeUndefined()
  })

  it('an instant child call uses the child object and restores the caller object', () => {
    const gs = install([
      { op: 'raw', opcode: 0x04, operands: [4, 2, 0] },
      { op: 'raw', opcode: OP_SET_OBJECT_POS, operands: [0, 3, 0] },
      { op: 'end' },
      { op: 'raw', opcode: OP_SET_OBJECT_POS, operands: [0, 2, 0], label: 'L_4' },
      { op: 'end' },
    ])
    gs.npcs = [npc(), npc({ id: 1, autoCursor: undefined })]
    tickAutoScripts(gs)
    expect(gs.npcs.map(({ x, y }) => [x, y])).toEqual([
      [100, 100],
      [2, 0],
    ])
    expect(gs.npcs[0]?.autoCursor?.ip).toBe(2)
    expect(gs.npcs[0]?.autoCursor?.callStack).toEqual([])
    expect(gs.npcs[0]?.autoCursor?.currentEventObjectId).toBeUndefined()
    tickAutoScripts(gs)
    expect(gs.npcs.map(({ x, y }) => [x, y])).toEqual([
      [3, 0],
      [2, 0],
    ])
  })

  it('a goto self-loop stops at the existing per-tick depth guard', () => {
    const gs = install([{ op: 'goto', to: 'L_1', label: 'L_1' }])
    gs.npcs = [npc()]
    tickAutoScripts(gs)
    expect(gs.npcs[0]?.autoCursor).toBeUndefined()
  })

  it('a counted goto revisits the loop in the same tick, then falls through at the limit', () => {
    const gs = install([
      { op: 'raw', opcode: 0x1e, operands: [7, 0, 0], label: 'L_1' },
      { op: 'goto', to: 'L_1', frameDelay: 2 },
      { op: 'end' },
    ])
    gs.npcs = [npc()]
    tickAutoScripts(gs)
    expect(gs.dwCash).toBe(7)
    expect(gs.npcs[0]?.autoCursor?.ip).toBe(2)
    tickAutoScripts(gs)
    expect(gs.dwCash).toBe(14)
    expect(gs.npcs[0]?.autoCursor?.ip).toBe(2)
    expect(gs.npcs[0]?.autoCursor?.idleFrameCount).toBe(1)
    tickAutoScripts(gs)
    expect(gs.dwCash).toBe(14)
    expect(gs.npcs[0]?.autoCursor?.ip).toBe(3)
    expect(gs.npcs[0]?.autoCursor?.idleFrameCount).toBe(0)
  })

  it('a missing goto label stops instead of executing the next instruction', () => {
    const gs = install([
      { op: 'goto', to: 'L_60000' },
      { op: 'raw', opcode: 0x1e, operands: [7, 0, 0] },
    ])
    gs.npcs = [npc()]
    tickAutoScripts(gs)
    expect(gs.npcs[0]?.autoCursor).toBeUndefined()
    expect(gs.dwCash).toBe(0)
  })

  it('wait accumulates exactly three invocations, then advances and resets its counter', () => {
    const gs = install([{ op: 'raw', opcode: 0x09, operands: [3, 0, 0] }, { op: 'end' }])
    gs.npcs = [npc()]
    const observations = []
    for (let n = 0; n < 3; n++) {
      tickAutoScripts(gs)
      observations.push([gs.npcs[0]?.autoCursor?.ip, gs.npcs[0]?.autoCursor?.idleFrameCount])
    }
    expect(observations).toEqual([
      [1, 1],
      [1, 2],
      [2, 0],
    ])
  })

  it('an out-of-range automatic cursor stops', () => {
    const gs = install([{ op: 'end' }])
    gs.npcs = [npc({ autoCursor: { ip: 60000 } })]
    tickAutoScripts(gs)
    expect(gs.npcs[0]?.autoCursor).toBeUndefined()
  })

  it('a child wait uses the existing TS multi-tick fallback, then returns once to its caller', () => {
    const gs = install([
      { op: 'raw', opcode: 0x04, operands: [4, 0, 0] },
      { op: 'raw', opcode: 0x1e, operands: [90, 0, 0] },
      { op: 'end' },
      { op: 'raw', opcode: 0x09, operands: [2, 0, 0], label: 'L_4' },
      { op: 'end' },
    ])
    gs.npcs = [npc()]
    const positions = []
    for (let n = 0; n < 5; n++) {
      tickAutoScripts(gs)
      positions.push([gs.npcs[0]?.autoCursor?.ip, gs.dwCash])
    }
    expect(positions).toEqual([
      [4, 0],
      [5, 0],
      [2, 0],
      [3, 90],
      [3, 90],
    ])
    expect(gs.npcs[0]?.autoCursor?.callStack).toEqual([])
  })
})

describe('automatic probability gate', () => {
  it.each([
    { random: 0.49, target: 0, ip: 1, cash: 0 },
    { random: 0.48, target: 0, ip: 2, cash: 0 },
    { random: 0.49, target: 4, ip: 5, cash: 222 },
    { random: 0.48, target: 4, ip: 2, cash: 0 },
  ])('draw source $random / target $target leaves ip $ip and cash $cash', ({
    random,
    target,
    ip,
    cash,
  }) => {
    const rng = vi.spyOn(Math, 'random').mockReturnValue(random)
    onTestFinished(() => rng.mockRestore())
    const gs = install([
      { op: 'raw', opcode: 0x06, operands: [50, target, 0] },
      { op: 'end' },
      { op: 'end' },
      { op: 'raw', opcode: 0x1e, operands: [222, 0, 0], label: 'L_4' },
      { op: 'end' },
    ])
    gs.npcs = [npc()]
    tickAutoScripts(gs)
    expect(gs.dwCash).toBe(cash)
    expect(gs.npcs[0]?.autoCursor?.ip).toBe(ip)
    expect(rng.mock.calls).toEqual([[]])
  })
})

describe('automatic walking and unsupported instructions', () => {
  it.each([
    { frame: 0, x: 96, y: 98 },
    { frame: 1, x: 100, y: 100 },
  ])('staggered walk at frame $frame ends at $x,$y', ({ frame, x, y }) => {
    const gs = install([{ op: 'raw', opcode: 0x11, operands: [0, 0, 0] }, { op: 'end' }])
    gs.frameNum = frame
    gs.npcs = [npc()]
    tickAutoScripts(gs)
    expect(gs.npcs[0]?.x).toBe(x)
    expect(gs.npcs[0]?.y).toBe(y)
    expect(gs.npcs[0]?.autoCursor?.ip).toBe(1)
  })

  it('an already-arrived ordinary walk advances without changing coordinates', () => {
    const gs = install([{ op: 'raw', opcode: 0x10, operands: [0, 0, 0] }, { op: 'end' }])
    gs.npcs = [npc({ x: 0, y: 0 })]
    tickAutoScripts(gs)
    expect(gs.npcs[0]?.autoCursor?.ip).toBe(2)
    expect([gs.npcs[0]?.x, gs.npcs[0]?.y]).toEqual([0, 0])
  })

  it('dialogue in an automatic script is skipped without opening a dialog', () => {
    const gs = install([
      { op: 'showDialog', messageIndex: 0, text: 'unsupported here' },
      { op: 'end' },
    ])
    gs.npcs = [npc()]
    tickAutoScripts(gs)
    expect(gs.npcs[0]?.autoCursor?.ip).toBe(2)
    expect(gs.dialogBox).toBeUndefined()
  })
})
