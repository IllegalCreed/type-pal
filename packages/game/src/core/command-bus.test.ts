import { describe, it, expect } from 'vitest'
import { createCommandBus } from './command-bus.js'

describe('CommandBus', () => {
  it('emit + drain 顺序', () => {
    const bus = createCommandBus()
    bus.emit({ op: 'showDialogBox', text: 'hi', style: 'center' })
    bus.emit({ op: 'showDialogBox', text: 'bye', style: 'top' })
    const drained = bus.drain()
    expect(drained).toHaveLength(2)
    expect(drained[0]?.cmd.op).toBe('showDialogBox')
  })

  it('drain 后 bus 清空', () => {
    const bus = createCommandBus()
    bus.emit({ op: 'showDialogBox', text: 'a', style: 'top' })
    bus.drain()
    expect(bus.drain()).toEqual([])
  })

  it('emit 返回唯一 cmdId', () => {
    const bus = createCommandBus()
    const id1 = bus.emit({ op: 'clearDialogBox' })
    const id2 = bus.emit({ op: 'clearDialogBox' })
    expect(id1).not.toBe(id2)
  })

  it('complete(cmdId) M2 内 no-op,但不抛错', () => {
    const bus = createCommandBus()
    const id = bus.emit({ op: 'clearDialogBox' })
    expect(() => bus.complete(id)).not.toThrow()
  })

  it('未知 cmdId complete —— 不抛错', () => {
    const bus = createCommandBus()
    expect(() => bus.complete(999999)).not.toThrow()
  })

  it('emit 返回的 cmdId 与 drain 出的 BusEntry.cmdId 配对', () => {
    const bus = createCommandBus()
    const id = bus.emit({ op: 'clearDialogBox' })
    const [entry] = bus.drain()
    expect(entry?.cmdId).toBe(id)
  })
})
