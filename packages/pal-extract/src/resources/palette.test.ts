/** Palette color conversion, day/night halves, input views and caller-owned cycle configuration. */
import { describe, expect, it, test } from 'vitest'
import { decodePalette } from './palette.js'

describe('color channels and day/night halves', () => {
  /** 256×3 块：值 = (i*7+seed) % 64（非对称、覆盖 0..63 多数位）。 */
  function colorBlock(seed: number): Uint8Array {
    const out = new Uint8Array(768)
    for (let i = 0; i < 256; i++) {
      out[i * 3] = (i * 7 + seed) % 64
      out[i * 3 + 1] = (i * 13 + seed * 3) % 64
      out[i * 3 + 2] = (i * 29 + seed * 5) % 64
    }
    return out
  }

  it('256 色 VGA(0-63)解出 0-255', () => {
    // 256 * 3 = 768 字节;每色 0x3F → ((0x3F << 2) | (0x3F >> 4)) = 0xFC | 0x03 = 0xFF
    const bytes = new Uint8Array(768)
    bytes.fill(0x3f)
    const palette = decodePalette(bytes)
    expect(palette.colors).toHaveLength(256)
    expect(palette.colors[0]).toEqual([0xff, 0xff, 0xff])
  })

  it('零调色板出 [0, 0, 0]', () => {
    const palette = decodePalette(new Uint8Array(768))
    expect(palette.colors[0]).toEqual([0, 0, 0])
  })

  test('1536 输入：colors 与 nightColors 都满 256×3 且非对称；锚点手算值精确', () => {
    const day = colorBlock(1)
    const night = colorBlock(2)
    const palette = decodePalette(new Uint8Array([...day, ...night]))
    expect(palette.colors).toHaveLength(256)
    expect(palette.nightColors).toHaveLength(256)
    // 锚点：6→8bit 映射 (v<<2)|(v>>4)：0→0、1→4、16→65、17→69、63→255
    // day[0] = ((0*7+1)%64, (0*13+3)%64, (0*29+5)%64) = (1,3,5)
    expect(palette.colors[0]).toEqual([4, 12, 20])
    // night[0] = (2,6,10)
    expect(palette.nightColors![0]).toEqual([8, 24, 40])
    // day 与 night 整体非对称（逐色比对至少一半不同）
    let different = 0
    for (let i = 0; i < 256; i++) {
      if (palette.colors[i]!.join() !== palette.nightColors![i]!.join()) different++
    }
    expect(different).toBeGreaterThan(128)
    // 抽查映射真值：i=5 → day r=(5*7+1)%64=36 → (36<<2)|(36>>4)=146
    expect(palette.colors[5]![0]).toBe(146)
  })

  test('768 输入：无 nightColors 键；非零 byteOffset 视图等价', () => {
    const day = colorBlock(1)
    const palette = decodePalette(day)
    expect(palette.colors).toHaveLength(256)
    expect('nightColors' in palette).toBe(false)
    const padded = new Uint8Array(4 + 768)
    padded.set(day, 4)
    const view = padded.subarray(4)
    const viewed = decodePalette(view)
    expect(viewed.colors).toHaveLength(256)
    expect(viewed.colors[0]).toEqual([4, 12, 20])
    expect(viewed.colors[5]![0]).toBe(146)
    expect('nightColors' in viewed).toBe(false)
    expect(viewed.colors).toEqual(palette.colors)
  })

  test('单条目 r/g/b 三通道独立 6-bit 值：通道不错位（防 r/g/b 装配顺序错）', () => {
    const bytes = new Uint8Array(768)
    // color[3]：r=1 → 4、g=7 → 28、b=32 → 130（(v<<2)|(v>>4) 手算）
    bytes[9] = 1
    bytes[10] = 7
    bytes[11] = 32
    const palette = decodePalette(bytes)
    expect(palette.colors[3]).toEqual([4, 28, 130])
  })

  test('decodePalette：短缓冲仅保留首通道，所有缺位补零且无夜色', () => {
    const palette = decodePalette(new Uint8Array([0x3f]))
    expect(palette).toEqual({
      colors: [[255, 0, 0], ...Array.from({ length: 255 }, () => [0, 0, 0])],
      cycles: [],
    })
  })
})

describe('cycle defaults and borrowed configuration', () => {
  it('cycles 保留传入的完整配置', () => {
    const palette = decodePalette(new Uint8Array(768), [
      { start: 200, length: 8, step: 1, frameInterval: 4 },
    ])
    expect(palette.cycles).toEqual([{ start: 200, length: 8, step: 1, frameInterval: 4 }])
  })

  test('默认参数：cycles 键存在且为空数组', () => {
    const palette = decodePalette(new Uint8Array(768))
    expect('cycles' in palette).toBe(true)
    expect(palette.cycles).toEqual([])
  })

  test('1536 输入 + cycles：colors/cycles/nightColors 三键齐备且 cycles 引用透传', () => {
    const bytes = new Uint8Array(1536)
    bytes[0] = 63
    bytes[768] = 31
    const cycles = [{ start: 200, length: 8, step: 1, frameInterval: 4 }]
    const before = structuredClone(cycles)
    const palette = decodePalette(bytes, cycles)
    expect(palette.cycles).toBe(cycles) // 引用透传，不复制
    expect(cycles).toEqual(before)
    expect(palette.colors[0]).toEqual([255, 0, 0])
    expect(palette.nightColors).toHaveLength(256)
    expect(palette.nightColors![0]![0]).toBe(125) // 31 → (31<<2)|(31>>4) = 124|1
  })
})
