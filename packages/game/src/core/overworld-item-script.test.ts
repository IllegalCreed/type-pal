/** Item-script admission and deferred consumption through the real event runner. */
import { afterEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { makeItem, makeItemFlags } from './__tests__/stats/stats-test-fixtures.js'
import { freshPlayerOpcodeState } from './event-opcode-player.test-fixtures.js'
import { setGlobalEvents, startOverworldItemScript, tickEventSystem } from './event-system.js'
import { snap } from './scene.test-fixtures.js'

afterEach(() => setGlobalEvents([]))

describe('overworld item-script admission', () => {
  it.each([
    { name: 'zero entry', entry: 0, warning: '[item-use] scriptOnUse=0 for itemId=61,不可用' },
    { name: 'missing label', entry: 1, warning: '[item-use] L_1 不在全局 labelMap(itemId=61)' },
  ])('$name rejects without changing game state or consuming inventory', ({ entry, warning }) => {
    const gs = freshPlayerOpcodeState()
    gs.inventory = [{ itemId: 61, count: 1 }]
    setGlobalEvents([{ op: 'end', label: 'L_0' }])
    const item = makeItem({
      id: 61,
      scriptOnUse: entry,
      flags: makeItemFlags({ usable: true, consuming: true }),
    })
    const before = structuredClone(gs)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    onTestFinished(() => warn.mockRestore())
    expect(startOverworldItemScript(gs, item, 0)).toBe(false)
    expect(gs).toEqual(before)
    expect(warn.mock.calls).toEqual([[warning]])
  })

  it('a valid owned item starts its script and consumes only after completion', () => {
    const gs = freshPlayerOpcodeState()
    gs.inventory = [{ itemId: 61, count: 1 }]
    setGlobalEvents([
      { op: 'end', label: 'L_0' },
      { op: 'end', label: 'L_1' },
    ])
    const item = makeItem({
      id: 61,
      scriptOnUse: 1,
      flags: makeItemFlags({ usable: true, consuming: true }),
    })
    expect(startOverworldItemScript(gs, item, 0)).toBe(true)
    expect(gs.mode).toBe('event')
    expect(gs.eventCursor?.ip).toBe(1)
    expect(gs.pendingItemConsume).toBe(61)
    expect(gs.fScriptSuccess).toBe(true)
    expect(gs.inventory).toEqual([{ itemId: 61, count: 1 }])
    tickEventSystem(gs, snap())
    expect(gs.pendingItemConsume).toBeUndefined()
    expect(gs.inventory).toEqual([])
  })
})
