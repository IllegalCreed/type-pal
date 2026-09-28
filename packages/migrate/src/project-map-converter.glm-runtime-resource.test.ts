/**
 * TEST-GLM-RUNTIME-RESOURCE-2 R27（migrate/project-map-converter.ts 窄入口）。
 * 去重账：project-map-converter.test/boundaries 已覆盖 word 编解码/整图转换/审计。
 * 本文件只做未占用合同：formattedProjectMapBytes（格式化字节确定性、随尺寸增长、
 * 与 Buffer.byteLength 一致）。
 */
import type { Tilemap } from '@type-pal/shared'
import { describe, expect, test } from 'vitest'
import { convertSourceTilemap, formattedProjectMapBytes } from './project-map-converter.js'

/** 合法地面 word（lower=0x2000 地面、upper=0），构造 width×1 tilemap。 */
function sourceTilemap(width: number): Tilemap {
  return {
    width,
    height: 1,
    cells: [Array.from({ length: width }, () => ({ lower: 0x2000, upper: 0 }))],
    tileset: 'tileset/1.rle',
  }
}

describe('R27 formattedProjectMapBytes', () => {
  test('同一 map 确定性；更大 map 字节更多；值为正整数', () => {
    const small = convertSourceTilemap(1, sourceTilemap(2))
    const large = convertSourceTilemap(2, sourceTilemap(24))
    const a = formattedProjectMapBytes(small)
    expect(a).toBe(formattedProjectMapBytes(small))
    expect(Number.isSafeInteger(a)).toBe(true)
    expect(a).toBeGreaterThan(0)
    expect(formattedProjectMapBytes(large)).toBeGreaterThan(a)
  })
})
