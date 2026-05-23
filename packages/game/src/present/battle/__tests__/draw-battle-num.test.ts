import { describe, it, expect } from 'vitest'
import { FloatingNumsLayer } from '../draw-battle-num.js'

// Mock Framebuffer
function makeMockFb() {
  const writes: Array<{ x: number; y: number; idx: number }> = []
  return {
    writePixel: (x: number, y: number, idx: number) => {
      writes.push({ x, y, idx })
    },
    writes,
  }
}

describe('FloatingNumsLayer', () => {
  it('emit + draw 写入像素', () => {
    const layer = new FloatingNumsLayer()
    const fb = makeMockFb()
    layer.emit({ x: 100, y: 50, value: 25, color: 'yellow', currentFrame: 0 })
    layer.draw(fb as any, 0)
    expect(fb.writes.length).toBeGreaterThan(0)
  })

  it('数字向上飘(currentFrame 推进,y 减小)', () => {
    const layer = new FloatingNumsLayer()
    const fb1 = makeMockFb()
    const fb2 = makeMockFb()
    layer.emit({ x: 100, y: 50, value: 25, color: 'yellow', currentFrame: 0 })
    layer.draw(fb1 as any, 0)
    layer.draw(fb2 as any, 5) // 5 帧后
    const y1 = Math.min(...fb1.writes.map((w) => w.y))
    const y2 = Math.min(...fb2.writes.map((w) => w.y))
    expect(y2).toBeLessThan(y1) // 飘上去了
  })

  it('过期数字消失', () => {
    const layer = new FloatingNumsLayer()
    layer.emit({ x: 100, y: 50, value: 25, color: 'yellow', currentFrame: 0 })
    expect(layer.count).toBe(1)
    layer.draw(makeMockFb() as any, 100) // 超过 duration=15
    expect(layer.count).toBe(0)
  })

  it('clear() 清空', () => {
    const layer = new FloatingNumsLayer()
    layer.emit({ x: 100, y: 50, value: 25, color: 'yellow', currentFrame: 0 })
    layer.emit({ x: 200, y: 50, value: 50, color: 'blue', currentFrame: 0 })
    expect(layer.count).toBe(2)
    layer.clear()
    expect(layer.count).toBe(0)
  })

  it('yellow vs blue 用不同 palette idx', () => {
    const layer = new FloatingNumsLayer()
    const fbYellow = makeMockFb()
    const fbBlue = makeMockFb()
    layer.emit({ x: 100, y: 50, value: 25, color: 'yellow', currentFrame: 0 })
    layer.draw(fbYellow as any, 0)
    layer.clear()
    layer.emit({ x: 100, y: 50, value: 25, color: 'blue', currentFrame: 0 })
    layer.draw(fbBlue as any, 0)
    const yIdx = new Set(fbYellow.writes.map((w) => w.idx))
    const bIdx = new Set(fbBlue.writes.map((w) => w.idx))
    expect(yIdx).not.toEqual(bIdx)
  })
})
