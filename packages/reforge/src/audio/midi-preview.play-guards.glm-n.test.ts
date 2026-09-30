// @vitest-environment jsdom
import { describe, expect, test, vi } from 'vitest'
import type { AudioAssetReader } from './bgm.js'
import { createMidiPreviewTransport } from './midi-preview.js'

function reader(readBytes = vi.fn(async () => midiBytes())): AudioAssetReader {
  return {
    readBytes,
    readRoleBytes: vi.fn(async () => new ArrayBuffer(8)),
  }
}

/** 最小合法 SMF（division 96、单音 C4 vel 64），load 走真实 MIDI 解析。 */
function midiBytes(): ArrayBuffer {
  return Uint8Array.from([
    0x4d, 0x54, 0x68, 0x64, 0x00, 0x00, 0x00, 0x06, 0x00, 0x00, 0x00, 0x01, 0x00, 0x60, 0x4d, 0x54,
    0x72, 0x6b, 0x00, 0x00, 0x00, 0x0c, 0x00, 0x90, 0x3c, 0x40, 0x60, 0x80, 0x3c, 0x40, 0x00, 0xff,
    0x2f, 0x00,
  ]).buffer
}

describe('N02 MIDI 试听 play 守卫与取消', () => {
  test('未完成读取前 play → 精确拒绝；jsdom 无 AudioContext → 不支持试听', async () => {
    expect(window.AudioContext).toBeUndefined()
    expect((window as { webkitAudioContext?: unknown }).webkitAudioContext).toBeUndefined()
    const transport = createMidiPreviewTransport(reader())
    try {
      await expect(transport.play()).rejects.toThrow('请等待 MIDI 读取完成。')
      const loadPromise = transport.load('music.a', 'music.a', undefined).then(
        () => 'resolved' as const,
        (error: Error) => error.message,
      )
      await expect(loadPromise).resolves.toBe('resolved')
      // 读取完成后 play 仍因运行时缺失而拒绝（getRuntime 懒探测 → undefined）。
      await expect(transport.play()).rejects.toThrow('当前浏览器不支持 MIDI 试听。')
      expect(transport.snapshot().asset).toBe('music.a')
    } finally {
      transport.dispose()
    }
  })

  test('dispose 后的 load 仍以 AbortError 收场，且成果永不入账', async () => {
    const readBytes = vi.fn(async () => midiBytes())
    const transport = createMidiPreviewTransport(reader(readBytes))
    transport.dispose()
    // 传入 cachedActivity 跳过真实解析，直达 disposed 门。
    const cached = { kind: 'note-activity' as const, duration: 1, buckets: [1], noteCount: 0 }
    await expect(transport.load('music.a', 'music.a', cached)).rejects.toMatchObject({
      name: 'AbortError',
    })
    // 字节读取被允许发生（dispose 不拦截上游 reader）；选择指针已前移但成果永不入账
    // （activity 缺席 → duration 仍为 0）。
    expect(readBytes).toHaveBeenCalledTimes(1)
    expect(transport.snapshot()).toMatchObject({ asset: 'music.a', duration: 0 })
  })
})
