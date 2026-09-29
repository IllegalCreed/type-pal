/** GLM Wave I / I01 — bootstrap.ts 启动失败显示端口 `showError`(生产冻结 ced193f4)。
 *
 * 旧证去重:bootstrap-load.test.ts 已证 cloneScreenPalette / makeBlackScreenPalette;
 * bootstrap-audio.test.ts 已证 syncShellAudio;bootstrap-resources.test.ts 已证资源生命周期;
 * bootstrap() 本体是全资源启动编排,vitest(jsdom,无 /extracted)不能合法驱动。
 * showError 合同:有 2D 上下文 → 深红底 + 浅红字报告失败信息(仅此三个绘制端口);
 * 无 2D 上下文 → 静默返回。jsdom 自带 stub ctx 缺 fillRect/fillText 端口,故按
 * 「浏览器替身只证声明端口」注入 recording ctx / null ctx(getContext 是 canvas 的声明端口)。
 */

import { describe, expect, it, vi } from 'vitest'
import { showError } from './bootstrap.js'

describe('showError 启动失败显示(bootstrap.ts)', () => {
  it('有 2D 上下文:先 #400 铺满画布,再 #f88 monospace 10px 画失败信息于 (8,32)', () => {
    const canvas = document.createElement('canvas')
    canvas.width = 320
    canvas.height = 200
    const calls: { fillRect?: unknown[]; fillText?: unknown[] } = {}
    // DOM 替身:普通对象基座(环境原生 ctx 原型带 host 访问器,属性赋值会抛),
    // 只实现 showError 声明的 fillStyle/font/fillRect/fillText 四个端口。
    const recordingCtx: CanvasRenderingContext2D = Object.assign(Object.create(Object.prototype), {
      fillStyle: '',
      font: '',
      fillRect: (...args: unknown[]) => {
        calls.fillRect = args
      },
      fillText: (...args: unknown[]) => {
        calls.fillText = args
      },
    })
    const getContext = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue(recordingCtx)

    try {
      showError(canvas, 'boot failed: manifest missing')
    } finally {
      getContext.mockRestore()
    }

    expect(recordingCtx.fillStyle).toBe('#f88') // fillText 前最后一次赋值(字色)
    expect(recordingCtx.font).toBe('10px monospace')
    expect(calls.fillRect).toEqual([0, 0, 320, 200])
    expect(calls.fillText).toEqual(['boot failed: manifest missing', 8, 32])
  })

  it('无 2D 上下文(canvas.getContext 返回 null)→ 静默返回不抛错', () => {
    const canvas = document.createElement('canvas')
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)

    try {
      expect(() => showError(canvas, 'boot failed')).not.toThrow()
    } finally {
      getContext.mockRestore()
    }
  })
})
