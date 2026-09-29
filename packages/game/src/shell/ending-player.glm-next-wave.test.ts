/** GLM Wave I / I05 — ending-player.ts 未证公开合同(生产冻结 ced193f4)。
 *
 * 旧证去重:ending-player.test.ts 已证 playEndingAnimation 正常 N 帧 /
 * beast 不足 2 帧跳过 / 三个阻塞 fade 助手跑完;不含 skipKeys、不含 waitForKey、
 * 不含 upper/lower 长度回退。本文件补:
 *  - waitForKey(sdlpal PAL_WaitForKey(0) port,bootstrap.ts:1483 真实 caller):
 *    默认 Space/Enter/Escape 命中即 resolve + capture 监听释放;非命中键不拦截;自定义键表。
 *  - playEndingAnimation skipKeys:播中按键 preventDefault + 提前退出(远少于 frameCount 帧),
 *    finally 释放 keydown 监听(取消后释放,非固定 sleep 证明)。
 *  - upperIndices 长度 ≠ 64000 → 回退全黑背景(帧值集合含 0;对照组:合法 upper 无 0)。
 *    帧值集合断言对 applyScreenWave 的行扰动免疫(wave 只重排不造值)。
 */

import type { Palette } from '@type-pal/shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createFramebuffer } from '../present/framebuffer.js'
import { playEndingAnimation, waitForKey } from './ending-player.js'

const palette: Palette = {
  colors: Array.from({ length: 256 }, () => [10, 20, 30] as [number, number, number]),
  cycles: [],
}

function makeCtx(): { putImageData: ReturnType<typeof vi.fn> } {
  return { putImageData: vi.fn() }
}

/** DOM 替身:原型取自环境自身 2D 上下文,只实现 flushToCanvas 声明的 putImageData 端口。 */
function flush(ctx: { putImageData: ReturnType<typeof vi.fn> }): CanvasRenderingContext2D {
  const probe = document.createElement('canvas').getContext('2d')
  const proto = probe ? Object.getPrototypeOf(probe) : Object.prototype
  return Object.assign(Object.create(proto), ctx)
}

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('waitForKey(PAL_WaitForKey(0) port — bootstrap 结局演职员表前等键)', () => {
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
    const ctx = makeCtx()
    const p = playEndingAnimation({
      upperIndices: new Uint8Array(320 * 200).fill(60),
      lowerIndices: new Uint8Array(320 * 200).fill(50),
      beastFrames: [],
      girlFrames: [],
      fb,
      canvasCtx: flush(ctx),
      palette,
      skipKeys: ['Space'],
      frameCount: 100,
      frameDelayMs: 1000,
    })

    await vi.advanceTimersByTimeAsync(1000) // 第 1 帧完成,停在第 2 帧 sleep
    expect(ctx.putImageData).toHaveBeenCalledTimes(2) // 第 1、2 帧各 flush 一次
    const skip = new KeyboardEvent('keydown', { code: 'Space', cancelable: true })
    expect(window.dispatchEvent(skip)).toBe(false) // 播中被拦截
    expect(skip.defaultPrevented).toBe(true)

    await vi.runAllTimersAsync()
    await p
    // 提前退出:总刷帧 2(而非 100)。
    expect(ctx.putImageData).toHaveBeenCalledTimes(2)

    const after = new KeyboardEvent('keydown', { code: 'Space', cancelable: true })
    expect(window.dispatchEvent(after)).toBe(true) // 监听已释放
    expect(after.defaultPrevented).toBe(false)
  })

  it('upperIndices 长度非 64000 → 回退全黑背景(帧值集合 = {黑, lower});合法 upper 对照组无黑', async () => {
    vi.useFakeTimers()
    const fb = createFramebuffer()
    const p = playEndingAnimation({
      upperIndices: new Uint8Array(5), // 非法长度 → 回退黑
      lowerIndices: new Uint8Array(320 * 200).fill(50),
      beastFrames: [],
      girlFrames: [],
      fb,
      canvasCtx: flush(makeCtx()),
      palette,
      frameCount: 3, // 第 3 帧 h=1:顶部 1 行来自回退黑 upper
      frameDelayMs: 1,
    })
    await vi.runAllTimersAsync()
    await p
    const values = new Set(fb.indices)
    expect(values.has(0)).toBe(true) // 回退黑进屏
    for (const v of values) expect([0, 50]).toContain(v)

    const fbOk = createFramebuffer()
    const pOk = playEndingAnimation({
      upperIndices: new Uint8Array(320 * 200).fill(60),
      lowerIndices: new Uint8Array(320 * 200).fill(50),
      beastFrames: [],
      girlFrames: [],
      fb: fbOk,
      canvasCtx: flush(makeCtx()),
      palette,
      frameCount: 3,
      frameDelayMs: 1,
    })
    await vi.runAllTimersAsync()
    await pOk
    expect(fbOk.indices.includes(0)).toBe(false) // 合法长度:全屏只有 50/60,无黑
  })
})
