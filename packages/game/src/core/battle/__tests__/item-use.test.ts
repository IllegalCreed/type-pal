/** Direct item requests use the real interpreter; controller admission/animation is separate. */
import type { Command } from '@type-pal/shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { runScript } from '../../event-system.js'
import { type PerformItemInput, performItem } from '../actions/item.js'
import type { RunScriptFn } from '../actions/magic.js'
import { makeActionFixture, makeItem } from './action.test-fixtures.js'

afterEach(() => vi.restoreAllMocks())

function prepareItemUse() {
  const fixture = makeActionFixture()
  fixture.gs.inventory = [{ itemId: 7, count: 3 }]
  const commands: Command[] = [
    { op: 'end' },
    { op: 'giveItem', itemId: 99, count: 1 },
    { op: 'end' },
  ]
  const execute = vi.fn<RunScriptFn>(runScript)
  const input: PerformItemInput = {
    ...fixture,
    casterIsEnemy: false,
    casterIdx: 0,
    itemId: 7,
    targetIsEnemy: false,
    targetIdx: 0,
    items: [makeItem({ scriptOnUse: 1 })],
    commands,
    runScript: execute,
  }
  return { ...fixture, input, execute }
}

describe('performItem', () => {
  it('runs the selected script before consuming, preserving its real inventory effect and context', () => {
    const { input, gs, execute } = prepareItemUse()
    execute.mockImplementation((options) => {
      expect(gs.inventory).toEqual([{ itemId: 7, count: 3 }])
      return runScript(options)
    })
    performItem(input)
    expect(gs.inventory).toEqual([
      { itemId: 7, count: 2 },
      { itemId: 99, count: 1 },
    ])
    expect(execute).toHaveBeenCalledTimes(1)
    const options = execute.mock.calls[0]![0]
    expect(options.ip).toBe(1)
    expect(options.runtimeMode).toBe('battle')
    expect(options.commands).toBe(input.commands)
    expect(options.eventObjectId).toBe(0)
    expect(options.battleCtx).toMatchObject({
      state: input.state,
      caster: { type: 'player', idx: 0 },
      target: { type: 'player', idx: 0 },
    })
  })

  it('runs a non-consuming item script without removing the owned item', () => {
    const { input, gs, execute } = prepareItemUse()
    input.items[0]!.flags.consuming = false
    performItem(input)
    expect(gs.inventory).toEqual([
      { itemId: 7, count: 3 },
      { itemId: 99, count: 1 },
    ])
    expect(execute).toHaveBeenCalledTimes(1)
  })

  it('rejects a zero inventory count before executing or consuming', () => {
    const { input, gs, execute, bus } = prepareItemUse()
    gs.inventory[0]!.count = 0
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    performItem(input)
    expect(gs.inventory).toEqual([{ itemId: 7, count: 0 }])
    expect(execute).not.toHaveBeenCalled()
    expect(bus.drain()).toEqual([])
    expect(warn.mock.calls).toEqual([['[item] no inventory for item 7']])
  })

  it('rejects a missing inventory entry while preserving a different item', () => {
    const { input, gs, execute } = prepareItemUse()
    gs.inventory = [{ itemId: 99, count: 5 }]
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    performItem(input)
    expect(gs.inventory).toEqual([{ itemId: 99, count: 5 }])
    expect(execute).not.toHaveBeenCalled()
    expect(warn.mock.calls).toEqual([['[item] no inventory for item 7']])
  })

  it('skips a zero script entry but still consumes once', () => {
    const { input, gs, execute } = prepareItemUse()
    input.items[0]!.scriptOnUse = 0
    performItem(input)
    expect(gs.inventory).toEqual([{ itemId: 7, count: 2 }])
    expect(execute).not.toHaveBeenCalled()
  })

  it('rejects a missing item definition without changing inventory', () => {
    const { input, gs, execute } = prepareItemUse()
    input.itemId = 999
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    performItem(input)
    expect(gs.inventory).toEqual([{ itemId: 7, count: 3 }])
    expect(execute).not.toHaveBeenCalled()
    expect(warn.mock.calls).toEqual([['[item] item id 999 not found']])
  })

  it('passes the all-target sentinel without a single target and consumes once', () => {
    const { input, gs, execute } = prepareItemUse()
    input.targetIdx = 'all'
    input.items[0]!.flags.applyToAll = true
    performItem(input)
    const options = execute.mock.calls[0]![0]
    expect(execute).toHaveBeenCalledTimes(1)
    expect(options.eventObjectId).toBe(0xffff)
    expect(options.battleCtx?.target).toBeUndefined()
    expect(options.battleCtx?.caster).toEqual({ type: 'player', idx: 0 })
    expect(gs.inventory).toEqual([
      { itemId: 7, count: 2 },
      { itemId: 99, count: 1 },
    ])
  })

  it('an enemy request runs its script without consuming player inventory', () => {
    const { input, gs, execute } = prepareItemUse()
    input.casterIsEnemy = true
    performItem(input)
    expect(execute).toHaveBeenCalledTimes(1)
    expect(execute.mock.calls[0]![0].battleCtx).toMatchObject({
      caster: { type: 'enemy', idx: 0 },
      target: { type: 'player', idx: 0 },
    })
    expect(gs.inventory).toEqual([
      { itemId: 7, count: 3 },
      { itemId: 99, count: 1 },
    ])
  })
})
