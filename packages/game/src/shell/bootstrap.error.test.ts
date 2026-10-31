/** Native Canvas checks for main's error renderer; no full bootstrap or resource-loading credit. */
import { describe, expect, it, vi } from 'vitest'
import { showError } from './bootstrap.js'

describe('showError 启动失败显示(bootstrap.ts)', () => {
  it('绘制时序:fillRect 时 fillStyle=#400 铺满画布;fillText 时 fillStyle=#f88、font=10px monospace 于 (8,32)', () => {
    const canvas = document.createElement('canvas')
    canvas.width = 400
    canvas.height = 250
    const ctx = canvas.getContext('2d')!
    const draws: { fn: string; fillStyle: string; font?: string; args: unknown[] }[] = []
    const fillRect = ctx.fillRect.bind(ctx)
    const fillText = ctx.fillText.bind(ctx)
    const background = vi.spyOn(ctx, 'fillRect').mockImplementation((...args) => {
      draws.push({ fn: 'fillRect', fillStyle: String(ctx.fillStyle), args })
      fillRect(...args)
    })
    const message = vi.spyOn(ctx, 'fillText').mockImplementation((...args) => {
      draws.push({ fn: 'fillText', fillStyle: String(ctx.fillStyle), font: ctx.font, args })
      fillText(...args)
    })
    try {
      showError(canvas, 'boot failed: manifest missing')
      expect(draws).toEqual([
        { fn: 'fillRect', fillStyle: '#440000', args: [0, 0, 400, 250] },
        {
          fn: 'fillText',
          fillStyle: '#ff8888',
          font: '10px monospace',
          args: ['boot failed: manifest missing', 8, 32],
        },
      ])
      expect([...ctx.getImageData(399, 249, 1, 1).data]).toEqual([68, 0, 0, 255])
      const pixels = ctx.getImageData(8, 20, 210, 13).data
      let visibleTextPixels = 0
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i]! > 68 && pixels[i + 1]! > 0 && pixels[i + 2]! > 0 && pixels[i + 3] === 255)
          visibleTextPixels++
      }
      expect(visibleTextPixels).toBeGreaterThan(0)
    } finally {
      background.mockRestore()
      message.mockRestore()
    }
  })

  it('无 2D 上下文(canvas.getContext 返回 null)→ 静默返回不抛错', () => {
    const canvas = document.createElement('canvas')
    const getContext = vi.spyOn(canvas, 'getContext').mockReturnValue(null)
    try {
      expect(() => showError(canvas, 'boot failed')).not.toThrow()
    } finally {
      getContext.mockRestore()
    }
  })
})
