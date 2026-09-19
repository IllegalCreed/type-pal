/**
 * TEST-RESOURCE-TOOLS-COVERAGE-1 R07：decodePalette 双半轴（resources/palette.ts）。
 * 既有 palette.test 已覆盖 VGA63→255、全零、cycles——不重复。本文件：768 与 1536 合法输入、
 * 非对称 day/night、768 无 nightColors 键、非零 byteOffset 视图；手算锚点值（(v<<2)|(v>>4)）。
 */
import { describe, expect, test } from 'vitest'
import { decodePalette } from './palette.js'

/** 256×3 块：值 = (i*7+offset) % 64（非对称、覆盖 0..63 多数位）。 */
function block(offset: number): Uint8Array {
  const out = new Uint8Array(768)
  for (let i = 0; i < 256; i++) {
    out[i * 3] = (i * 7 + offset) % 64
    out[i * 3 + 1] = (i * 13 + offset * 3) % 64
    out[i * 3 + 2] = (i * 29 + offset * 5) % 64
  }
  return out
}

describe('R07 decodePalette day/night 双半', () => {
  test('1536 输入：colors 与 nightColors 都满 256×3 且非对称；锚点手算值精确', () => {
    const day = block(1)
    const night = block(2)
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
    const day = block(1)
    const palette = decodePalette(day)
    expect(palette.colors).toHaveLength(256)
    expect('nightColors' in palette).toBe(false)
    const padded = new Uint8Array(4 + 768)
    padded.set(day, 4)
    const view = padded.subarray(4)
    expect(decodePalette(view).colors).toEqual(palette.colors)
  })
})
