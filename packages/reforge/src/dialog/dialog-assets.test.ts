import { afterEach, describe, expect, test, vi } from 'vitest'
import raw from '../engine-chrome/assets/dialog-icons-raw.json?raw'
import { decodeCursorFrames, loadCursorFrames } from './dialog-assets.js'

describe('bundled dialog cursor', () => {
  afterEach(() => vi.unstubAllGlobals())

  test('真实 DATA chunk 12 是 282 bytes / 3 个 16×16 帧', () => {
    const entry = JSON.parse(raw) as { source: string; size: number; base64: string }
    const frames = decodeCursorFrames(entry, 'DATA chunk 12')
    expect(entry.size).toBe(282)
    expect(frames.map(({ width, height }) => [width, height])).toEqual([
      [16, 16],
      [16, 16],
      [16, 16],
    ])
    expect(
      frames.map((frame) => frame.opaque.reduce((sum, opaque) => sum + (opaque ? 1 : 0), 0)),
    ).toEqual([49, 73, 36])
  })

  test('metadata 漂移和 HTTP 失败都带 chrome 来源', async () => {
    const entry = JSON.parse(raw) as { source: string; size: number; base64: string }
    expect(() => decodeCursorFrames({ ...entry, size: 1 }, 'DATA chunk 12')).toThrow(
      '引擎 chrome 对话光标长度错误:DATA chunk 12',
    )
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 503 })),
    )
    await expect(loadCursorFrames('chrome://dialog-cursor')).rejects.toThrow(
      '引擎 chrome 对话光标加载失败(503):chrome://dialog-cursor',
    )
  })
})
