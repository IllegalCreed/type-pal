import { afterEach, describe, expect, test, vi } from 'vitest'
import { WavedBgCache } from './screen-fx.js'

function image(width: number, height: number): ImageBitmap {
  return { width, height, close() {} } as ImageBitmap
}

function canvasHost(contextAvailable = true) {
  const drawImage = vi.fn()
  const context = { drawImage, imageSmoothingEnabled: true }
  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => (contextAvailable ? context : null)),
  }
  const createElement = vi.fn((tag: string) => {
    expect(tag).toBe('canvas')
    return canvas
  })
  vi.stubGlobal('document', { createElement })
  return { canvas, context, drawImage, createElement }
}

afterEach(() => vi.unstubAllGlobals())

describe('当前波动背景缓存的画面消费合同', () => {
  test('关闭态直接返回原背景；活动态按波形左右两段卷行并按相位/源身份重新烘焙', () => {
    const host = canvasHost()
    const src = image(320, 2)
    const cache = new WavedBgCache()
    expect(cache.render(src, 0, 0, 320, 2, 'scene')).toBe(src)
    expect(cache.render(src, 256, 0, 320, 2, 'scene')).toBe(src)
    expect(host.createElement).not.toHaveBeenCalled()

    const first = cache.render(src, 128, 0, 320, 2, 'scene')
    expect(first).toBe(host.canvas)
    expect([host.canvas.width, host.canvas.height]).toEqual([320, 2])
    expect(host.context.imageSmoothingEnabled).toBe(false)
    expect(host.drawImage.mock.calls).toEqual([
      [src, 30, 0, 290, 1, 0, 0, 290, 1],
      [src, 0, 0, 30, 1, 290, 0, 30, 1],
      [src, 56, 1, 264, 1, 0, 1, 264, 1],
      [src, 0, 1, 56, 1, 264, 1, 56, 1],
    ])

    expect(cache.render(src, 128, 39, 320, 2, 'scene')).toBe(first)
    expect(host.drawImage).toHaveBeenCalledTimes(4)
    expect(cache.render(src, 128, 40, 320, 2, 'scene')).toBe(first)
    expect(host.drawImage).toHaveBeenCalledTimes(8)
    expect(cache.render(src, 128, 40, 320, 2, 'summon-tint')).toBe(first)
    expect(host.drawImage).toHaveBeenCalledTimes(12)
    expect(host.createElement).toHaveBeenCalledTimes(1)
  })

  test('波幅零位移走整行复制；无 2D context 时返回源且不把失败烘焙记作缓存命中', () => {
    const host = canvasHost(false)
    const src = image(16, 1)
    const cache = new WavedBgCache()
    expect(cache.render(src, 8, 600, 16, 1, 'scene')).toBe(src)
    expect(host.canvas.getContext).toHaveBeenCalledTimes(1)
    expect(host.drawImage).not.toHaveBeenCalled()

    host.canvas.getContext.mockImplementation(() => host.context)
    expect(cache.render(src, 8, 600, 16, 1, 'scene')).toBe(host.canvas)
    expect(host.drawImage).toHaveBeenCalledExactlyOnceWith(src, 0, 0, 16, 1, 0, 0, 16, 1)
    expect(host.canvas.getContext).toHaveBeenCalledTimes(2)
    expect(host.createElement).toHaveBeenCalledTimes(1)
  })
})
