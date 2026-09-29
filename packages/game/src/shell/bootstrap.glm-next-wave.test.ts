/** GLM Wave I / I01 — bootstrap.ts 启动失败显示端口 `showError`(生产冻结 ced193f4)。
 *
 * 旧证去重:bootstrap-load.test.ts 已证 cloneScreenPalette / makeBlackScreenPalette;
 * bootstrap-audio.test.ts 已证 syncShellAudio;bootstrap-resources.test.ts 已证资源生命周期;
 * bootstrap() 本体是全资源启动编排,vitest(jsdom,无 /extracted)不能合法驱动。
 * showError 合同:有 2D 上下文 → 先以 `#400` 铺满画布,再切 `#f88` + monospace 10px 在 (8,32)
 * 画失败信息;无 2D 上下文 → 静默返回。替身按调用时序记录每次绘制发生时的
 * fillStyle/font 端口值(而非仅结束值),铺底色与绘字色分别断言。
 */

import { describe, expect, it, vi } from 'vitest'
import { showError } from './bootstrap.js'

describe('showError 启动失败显示(bootstrap.ts)', () => {
  it('绘制时序:fillRect 时 fillStyle=#400 铺满画布;fillText 时 fillStyle=#f88、font=10px monospace 于 (8,32)', () => {
    const canvas = document.createElement('canvas')
    canvas.width = 320
    canvas.height = 200
    const draws: {
      bg?: { fn: string; fillStyle: string; font: string; args: unknown[] }
      text?: { fn: string; fillStyle: string; font: string; args: unknown[] }
    } = {}
    // DOM 替身:普通对象基座(环境原生 ctx 原型带 host 访问器,属性赋值会抛),
    // 只实现 showError 声明的 fillStyle/font/fillRect/fillText 四个端口,并按调用时序记录端口值。
    const recordingCtx: CanvasRenderingContext2D = Object.assign(Object.create(Object.prototype), {
      fillStyle: '',
      font: '',
    })
    recordingCtx.fillRect = (...args: unknown[]) => {
      draws.bg = {
        fn: 'fillRect',
        fillStyle: String(recordingCtx.fillStyle),
        font: String(recordingCtx.font),
        args,
      }
    }
    recordingCtx.fillText = (...args: unknown[]) => {
      draws.text = {
        fn: 'fillText',
        fillStyle: String(recordingCtx.fillStyle),
        font: String(recordingCtx.font),
        args,
      }
    }
    const getContext = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue(recordingCtx)

    try {
      showError(canvas, 'boot failed: manifest missing')
    } finally {
      getContext.mockRestore()
    }

    expect(draws.bg).toEqual({
      fn: 'fillRect',
      fillStyle: '#400',
      font: '',
      args: [0, 0, 320, 200],
    })
    expect(draws.text).toEqual({
      fn: 'fillText',
      fillStyle: '#f88',
      font: '10px monospace',
      args: ['boot failed: manifest missing', 8, 32],
    })
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
