/**
 * TEST-GLM-RUNTIME-RESOURCE-2 R02（pal-extract/resources/palette.ts）。
 * 去重账：palette.test 覆盖 VGA63→255/全零/cycles 传入；palette.boundaries（RESOURCE-TOOLS-COVERAGE-1 R07）
 * 覆盖 1536 双半非对称、768 无 nightColors 键、偶偏移 subarray。本文件只做未占用合同：
 * 默认参数 cycles 为空数组的显式断言、1536+cycles 三键组合轴、cycles 数组引用透传、
 * 单条目内 r/g/b 三通道独立值的 (v<<2)|(v>>4) 手算锚点（防通道错位）。
 */
import { describe, expect, test } from 'vitest'
import { decodePalette } from './palette.js'

describe('R02 decodePalette 默认 cycles 与组合轴', () => {
  test('默认参数：cycles 键存在且为空数组', () => {
    const palette = decodePalette(new Uint8Array(768))
    expect('cycles' in palette).toBe(true)
    expect(palette.cycles).toEqual([])
  })

  test('1536 输入 + cycles：colors/cycles/nightColors 三键齐备且 cycles 引用透传', () => {
    const buf = new Uint8Array(1536)
    buf[0] = 63
    buf[768] = 31
    const cycles = [{ start: 200, length: 8, step: 1, frameInterval: 4 }]
    const palette = decodePalette(buf, cycles)
    expect(palette.cycles).toBe(cycles) // 引用透传，不复制
    expect(palette.colors[0]).toEqual([255, 0, 0])
    expect(palette.nightColors).toHaveLength(256)
    expect(palette.nightColors![0]![0]).toBe(125) // 31 → (31<<2)|(31>>4) = 124|1
  })

  test('单条目 r/g/b 三通道独立 6-bit 值：通道不错位（防 r/g/b 装配顺序错）', () => {
    const buf = new Uint8Array(768)
    // color[3]：r=1 → 4、g=7 → 28、b=32 → 130（(v<<2)|(v>>4) 手算）
    buf[9] = 1
    buf[10] = 7
    buf[11] = 32
    const palette = decodePalette(buf)
    expect(palette.colors[3]).toEqual([4, 28, 130])
  })
})
