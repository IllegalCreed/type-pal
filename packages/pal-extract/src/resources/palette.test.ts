import { describe, expect, it } from 'vitest'
import { decodePalette } from './palette.js'

describe('decodePalette', () => {
  it('256 色 VGA(0-63)解出 0-255', () => {
    // 256 * 3 = 768 字节;每色 0x3F → ((0x3F << 2) | (0x3F >> 4)) = 0xFC | 0x03 = 0xFF
    const buf = new Uint8Array(768)
    buf.fill(0x3f)
    const palette = decodePalette(buf)
    expect(palette.colors).toHaveLength(256)
    expect(palette.colors[0]).toEqual([0xff, 0xff, 0xff])
  })

  it('零调色板出 [0, 0, 0]', () => {
    const palette = decodePalette(new Uint8Array(768))
    expect(palette.colors[0]).toEqual([0, 0, 0])
  })

  it('cycles 保留传入的完整配置', () => {
    const palette = decodePalette(new Uint8Array(768), [
      { start: 200, length: 8, step: 1, frameInterval: 4 },
    ])
    expect(palette.cycles).toEqual([{ start: 200, length: 8, step: 1, frameInterval: 4 }])
  })
})
