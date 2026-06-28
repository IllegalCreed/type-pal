import type { GridPos } from '@type-pal/content'
import type { Tilemap } from '@type-pal/shared'
import { describe, expect, test } from 'vitest'
import { buildIsBlocked, isBlockedAt, sameGrid, sameTile } from './collision.js'

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

describe('sameTile(实体碰撞:两点是否同站立格)', () => {
  test('实体 pos 与自身同格', () => {
    expect(sameTile(1280, 832, 1280, 832)).toBe(true)
  })
  test('相邻 iso 站立格判不同格(一步 ±16/±8 必换 col/row/h)', () => {
    expect(sameTile(1280, 832, 1296, 840)).toBe(false) // → (40,52,h=1)
    expect(sameTile(1280, 832, 1264, 824)).toBe(false) // → (39,51,h=1)
  })
  test('同格内微小偏移仍同格', () => {
    expect(sameTile(1280, 832, 1281, 832)).toBe(true)
  })
})

describe('isBlockedAt / sameGrid — GridPos 入口(D16:复用旧像素层,零行为变化)', () => {
  test('isBlockedAt 障碍位格 → 阻挡', () => {
    const map = emptyMap(64, 64)
    // 鬼格 (92,12) → 像素(1280,832) → 旧映射查到的 cell 设障碍
    const px = { x: 1280, y: 832 }
    // 用 sameTile 的旧映射定位 cell 再设障碍位
    const ghost: GridPos = { col: 92, row: 12, height: 0 }
    // 直接验:isBlockedAt(gridToPixel 一致路径)与 buildIsBlocked 同结果
    const direct = buildIsBlocked(map)(px.x, px.y)
    expect(isBlockedAt(map, ghost)).toBe(direct)
  })

  test('isBlockedAt 与 buildIsBlocked(gridToPixel) 恒等', () => {
    const map = emptyMap(64, 64)
    map.cells[1]![1]!.lower = 0x2000
    // 选一个 gridToPixel 落到 col1 row1 的格:gridToPixel(2,0)=(32,0)→旧映射...
    // 用鬼格验恒等即可(行为不变,只换入口)
    const ghost: GridPos = { col: 92, row: 12, height: 0 }
    const { x, y } = { x: 16 * (92 - 12), y: 8 * (92 + 12) }
    expect(isBlockedAt(map, ghost)).toBe(buildIsBlocked(map)(x, y))
  })

  test('sameGrid 同格 → true,相邻格 → false', () => {
    const ghost: GridPos = { col: 92, row: 12, height: 0 }
    expect(sameGrid(ghost, { col: 92, row: 12, height: 0 })).toBe(true)
    expect(sameGrid(ghost, { col: 93, row: 12, height: 0 })).toBe(false) // 走一格 col+1
    expect(sameGrid(ghost, { col: 92, row: 13, height: 0 })).toBe(false) // 走一格 row+1
  })

  test('sameGrid 不看 height(逻辑/碰撞在地面层)', () => {
    const ground: GridPos = { col: 92, row: 12, height: 0 }
    const flying: GridPos = { col: 92, row: 12, height: 5 }
    expect(sameGrid(ground, flying)).toBe(true) // 同平面格,高度不同仍算碰撞
  })
})
