import type { Tilemap } from '@type-pal/shared'
import { describe, expect, test } from 'vitest'
import { buildIsBlocked } from './collision.js'

function emptyMap(w: number, h: number): Tilemap {
  const cells = Array.from({ length: h }, () =>
    Array.from({ length: w }, () => ({ lower: 0, upper: 0 })),
  )
  return { width: w, height: h, cells, tileset: '' }
}

describe('buildIsBlocked — 原版障碍位 bit 13 (0x2000) + 菱形映射', () => {
  test('障碍位(lower & 0x2000)的格 → 阻挡', () => {
    const map = emptyMap(4, 4)
    map.cells[1]![1]!.lower = 0x2000 // 障碍位
    // 像素 (36,18) → 菱形映射 col1 row1 h0 → 查 lower
    expect(buildIsBlocked(map)(36, 18)).toBe(true)
  })

  test('普通地板瓦片(无 0x2000) → 可走', () => {
    const map = emptyMap(4, 4)
    map.cells[1]![1]!.lower = 0x002e // 地板，无障碍位
    expect(buildIsBlocked(map)(36, 18)).toBe(false)
  })

  test('界外（映射后仍超出网格）→ 阻挡', () => {
    const b = buildIsBlocked(emptyMap(4, 4))
    expect(b(200, 8)).toBe(true) // col 6 > width 4
    expect(b(8, 200)).toBe(true) // row 12 > height 4
  })
})
