// Node 环境（无 jsdom）：验证 SSR/无窗口边界与传输守卫的精确结果。
import { describe, expect, test, vi } from 'vitest'
import type { AudioAssetReader } from './bgm.js'
import { createBrowserMidiPreviewRuntime, createMidiPreviewTransport } from './midi-preview.js'

function reader(readBytes = vi.fn(async () => new ArrayBuffer(4))): AudioAssetReader {
  return {
    readBytes,
    readRoleBytes: vi.fn(async () => new ArrayBuffer(4)),
  }
}

describe('N02 MIDI 试听浏览器运行时探测', () => {
  test('无窗口环境：createBrowserMidiPreviewRuntime 返回 undefined，不分配任何资源', () => {
    expect(typeof window).toBe('undefined')
    expect(typeof document).toBe('undefined')
    expect(createBrowserMidiPreviewRuntime(reader())).toBeUndefined()
  })
})

describe('N02 MIDI 试听传输守卫', () => {
  test('空传输快照：无资产、时长 0、暂停态', () => {
    const transport = createMidiPreviewTransport(reader())
    expect(transport.snapshot()).toEqual({
      asset: undefined,
      currentTime: 0,
      duration: 0,
      paused: true,
    })
    transport.dispose()
  })

  test('seek 负值/NaN/超界全部钳制到 [0, duration] 并反映在快照', async () => {
    const transport = createMidiPreviewTransport(reader())
    // 未加载任何资产时 duration = 0 → 一切 seek 都钳到 0。
    transport.seek(-5)
    expect(transport.snapshot().currentTime).toBe(0)
    transport.seek(Number.NaN)
    expect(transport.snapshot().currentTime).toBe(0)
    transport.seek(99)
    expect(transport.snapshot().currentTime).toBe(0)
    transport.dispose()
  })
})
