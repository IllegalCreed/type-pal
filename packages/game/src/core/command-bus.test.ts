import { describe, expect, it } from 'vitest'
import { createCommandBus } from './command-bus.js'

describe('CommandBus', () => {
  it('emit + drain 顺序', () => {
    const bus = createCommandBus()
    bus.emit({ op: 'playSound', soundId: 7 })
    bus.emit({ op: 'stopMusic', fadeMs: 250 })
    expect(bus.drain()).toEqual([
      { cmd: { op: 'playSound', soundId: 7 } },
      { cmd: { op: 'stopMusic', fadeMs: 250 } },
    ])
  })

  it('drain 后 bus 清空', () => {
    const bus = createCommandBus()
    bus.emit({ op: 'playSound', soundId: 7 })
    const first = bus.drain()
    expect(bus.drain()).toEqual([])
    bus.emit({ op: 'stopMusic', fadeMs: 250 })
    const next = bus.drain()
    // 新发送不修改已交付数组，消费方修改旧数组也不能污染下一批。
    expect(first).toEqual([{ cmd: { op: 'playSound', soundId: 7 } }])
    first.length = 0
    expect(next).toEqual([{ cmd: { op: 'stopMusic', fadeMs: 250 } }])
  })

  it('不同 bus 实例独立持有队列', () => {
    const first = createCommandBus()
    const other = createCommandBus()
    first.emit({ op: 'playSound', soundId: 7 })
    expect(other.drain()).toEqual([])
    other.emit({ op: 'stopMusic', fadeMs: 250 })
    expect(first.drain()).toEqual([{ cmd: { op: 'playSound', soundId: 7 } }])
    expect(other.drain()).toEqual([{ cmd: { op: 'stopMusic', fadeMs: 250 } }])
  })
})
