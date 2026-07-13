import { describe, expect, it } from 'vitest'
import type { IndexedImage } from '../../../assets/png.js'
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

/**
 * 假 SPRITEUI 数字帧 —— drawNumber base:yellow 19 / blue 29 / cyan 56(每色 10 位)。
 * 每色 digit 帧填不同 palette index 让测试能区分用了哪个 base:
 *   yellow → idx 0xAA;blue → idx 0xBB;cyan → idx 0xCC。
 * 帧 6×8 全 opaque。
 */
function mkUiSpriteFrames(): IndexedImage[] {
  const frames: IndexedImage[] = []
  for (let i = 0; i < 66; i++) {
    let fill = 1
    if (i >= 19 && i <= 28)
      fill = 0xaa // yellow
    else if (i >= 29 && i <= 38)
      fill = 0xbb // blue
    else if (i >= 56 && i <= 65) fill = 0xcc // cyan
    frames.push({
      width: 6,
      height: 8,
      indices: new Uint8Array(6 * 8).fill(fill),
      opaque: new Uint8Array(6 * 8).fill(1),
    })
  }
  return frames
}

describe('FloatingNumsLayer', () => {
  const ui = mkUiSpriteFrames()

  it('emit + draw 写入像素(UI sprite 数字帧)', () => {
    const layer = new FloatingNumsLayer()
    const fb = makeMockFb()
    layer.emit({ x: 100, y: 50, value: 25, color: 'yellow', currentFrame: 0 })
    layer.draw(fb as any, 0, ui)
    expect(fb.writes.length).toBeGreaterThan(0)
  })

  it('缺 uiSpriteFrames → 不写像素(防御)', () => {
    const layer = new FloatingNumsLayer()
    const fb = makeMockFb()
    layer.emit({ x: 100, y: 50, value: 25, color: 'yellow', currentFrame: 0 })
    layer.draw(fb as any, 0, undefined)
    expect(fb.writes.length).toBe(0)
  })

  it('数字每帧上移 1px(dy = -age,sdlpal uibattle.c:1760)', () => {
    const layer = new FloatingNumsLayer()
    const fb0 = makeMockFb()
    const fb1 = makeMockFb()
    const fb5 = makeMockFb()
    layer.emit({ x: 100, y: 50, value: 25, color: 'yellow', currentFrame: 0 })
    layer.draw(fb0 as any, 0, ui)
    layer.draw(fb1 as any, 1, ui)
    layer.draw(fb5 as any, 5, ui)
    const y0 = Math.min(...fb0.writes.map((w) => w.y))
    const y1 = Math.min(...fb1.writes.map((w) => w.y))
    const y5 = Math.min(...fb5.writes.map((w) => w.y))
    // age 每 +1 上移 1px:y0 - y1 = 1,y0 - y5 = 5
    expect(y0 - y1).toBe(1)
    expect(y0 - y5).toBe(5)
  })

  it('寿命 11 帧:age 0..10 显示,age=11 清除(sdlpal uibattle.c:1753)', () => {
    const layer = new FloatingNumsLayer()
    layer.emit({ x: 100, y: 50, value: 25, color: 'yellow', currentFrame: 0 })
    expect(layer.count).toBe(1)
    // age=10(currentFrame 10)仍显示
    layer.draw(makeMockFb() as any, 10, ui)
    expect(layer.count).toBe(1)
    // age=11(currentFrame 11)清除 → count 0
    layer.draw(makeMockFb() as any, 11, ui)
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

  it('yellow / blue / cyan 选不同 base frame(sprite index 区分)', () => {
    const draw = (color: 'yellow' | 'blue' | 'cyan') => {
      const layer = new FloatingNumsLayer()
      const fb = makeMockFb()
      layer.emit({ x: 100, y: 50, value: 25, color, currentFrame: 0 })
      layer.draw(fb as any, 0, ui)
      return new Set(fb.writes.map((w) => w.idx))
    }
    const yIdx = draw('yellow')
    const bIdx = draw('blue')
    const cIdx = draw('cyan')
    // 各色用各自 base frame → palette index 各异
    expect(yIdx).toEqual(new Set([0xaa]))
    expect(bIdx).toEqual(new Set([0xbb]))
    expect(cIdx).toEqual(new Set([0xcc]))
  })
})
