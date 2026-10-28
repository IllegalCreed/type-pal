/** Ending modal contracts: wait keys, explicit skip cleanup and upper-background fallback.
 * Production wait caller is dos-cutscenes; direct skip tests cover the existing optional input.
 * This is software/Canvas evidence, not a claim of full original ending visual parity.
 */

import type { Palette } from '@type-pal/shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { realCanvasContext } from '../__tests__/canvas-host.js'
import { createFramebuffer } from '../present/framebuffer.js'
import { playEndingAnimation, waitForKey } from './ending-player.js'

const palette: Palette = {
  colors: Array.from({ length: 256 }, (_, index): [number, number, number] => [index, 20, 30]),
  cycles: [],
}

afterEach(async () => {
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter' }))
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyQ' }))
  if (vi.isFakeTimers()) await vi.runAllTimersAsync()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('waitForKey(PAL_WaitForKey(0) port — dos-cutscenes 结局演职员表前等键)', () => {
  it('默认键表:非命中键不拦截不 resolve;Enter 命中 resolve 并释放监听(再次 Enter 不再拦截)', async () => {
    const p = waitForKey()
    const stray = new KeyboardEvent('keydown', { code: 'KeyZ', cancelable: true })
    expect(window.dispatchEvent(stray)).toBe(true) // 未拦截
    expect(stray.defaultPrevented).toBe(false)

    let resolved = false
    void p.then(() => {
      resolved = true
    })
    await Promise.resolve()
    expect(resolved).toBe(false)

    const hit = new KeyboardEvent('keydown', { code: 'Enter', cancelable: true })
    expect(window.dispatchEvent(hit)).toBe(false) // 命中并 preventDefault
    await p
    expect(resolved).toBe(true)

    const again = new KeyboardEvent('keydown', { code: 'Enter', cancelable: true })
    expect(window.dispatchEvent(again)).toBe(true) // 监听已移除
    expect(again.defaultPrevented).toBe(false)
  })

  it('自定义键表覆盖默认:Space 不再命中,KeyQ 命中', async () => {
    const p = waitForKey(['KeyQ'])
    const space = new KeyboardEvent('keydown', { code: 'Space', cancelable: true })
    expect(window.dispatchEvent(space)).toBe(true)
    await Promise.resolve()
    let resolved = false
    void p.then(() => {
      resolved = true
    })
    await Promise.resolve()
    expect(resolved).toBe(false)

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyQ', cancelable: true }))
    await p
  })
})

describe('playEndingAnimation 取消释放与背景回退', () => {
  it('skipKeys:播中 Space 被拦截并提前退出(刷帧数远小于 frameCount),finally 释放监听', async () => {
    vi.useFakeTimers()
    const fb = createFramebuffer()
    const ctx = realCanvasContext()
    const rendered = vi.spyOn(ctx, 'putImageData')
    const p = playEndingAnimation({
      upperIndices: new Uint8Array(320 * 200).fill(60),
      lowerIndices: new Uint8Array(320 * 200).fill(50),
      beastFrames: [],
      girlFrames: [],
      fb,
      canvasCtx: ctx,
      palette,
      skipKeys: ['Space'],
      frameCount: 100,
      frameDelayMs: 1000,
    })

    await vi.advanceTimersByTimeAsync(1000) // 第 1 帧完成,停在第 2 帧 sleep
    const beforeSkipCount = rendered.mock.calls.length
    const beforeSkipPixel = [...ctx.getImageData(0, 0, 1, 1).data]
    const skip = new KeyboardEvent('keydown', { code: 'Space', cancelable: true })
    expect(window.dispatchEvent(skip)).toBe(false) // 播中被拦截
    expect(skip.defaultPrevented).toBe(true)

    await vi.runAllTimersAsync()
    await p
    // 提前退出:总刷帧 2(而非 100)。
    expect(beforeSkipCount).toBe(2)
    expect(beforeSkipPixel).toEqual([50, 20, 30, 255])
    expect(rendered).toHaveBeenCalledTimes(2)

    const after = new KeyboardEvent('keydown', { code: 'Space', cancelable: true })
    expect(window.dispatchEvent(after)).toBe(true) // 监听已释放
    expect(after.defaultPrevented).toBe(false)
  })

  it('upperIndices 长度非 64000 → 顶行索引归零；合法 upper 对照组保持 60', async () => {
    vi.useFakeTimers()
    const fb = createFramebuffer()
    const p = playEndingAnimation({
      upperIndices: new Uint8Array(5), // 非法长度 → 回退黑
      lowerIndices: new Uint8Array(320 * 200).fill(50),
      beastFrames: [],
      girlFrames: [],
      fb,
      canvasCtx: realCanvasContext(),
      palette,
      frameCount: 3, // 第 3 帧 h=1:顶部 1 行来自回退黑 upper
      frameDelayMs: 1,
    })
    await vi.runAllTimersAsync()
    await p
    expect(fb.indices.slice(0, 320)).toEqual(new Uint8Array(320))
    expect(fb.indices.slice(320)).toEqual(new Uint8Array(199 * 320).fill(50))

    const fbOk = createFramebuffer()
    const pOk = playEndingAnimation({
      upperIndices: new Uint8Array(320 * 200).fill(60),
      lowerIndices: new Uint8Array(320 * 200).fill(50),
      beastFrames: [],
      girlFrames: [],
      fb: fbOk,
      canvasCtx: realCanvasContext(),
      palette,
      frameCount: 3,
      frameDelayMs: 1,
    })
    await vi.runAllTimersAsync()
    await pOk
    expect(fbOk.indices.slice(0, 320)).toEqual(new Uint8Array(320).fill(60))
    expect(fbOk.indices.slice(320)).toEqual(new Uint8Array(199 * 320).fill(50))
  })
})
