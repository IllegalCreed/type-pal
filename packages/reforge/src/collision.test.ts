import { type GridPos, gridToPixel } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { buildIsBlocked, isBlockedAt, sameGrid, sameLatticeCell } from './collision.js'
import {
  buildBlankProjectMap,
  latticeCenter,
  paintProjectMapCollision,
  pixelToLattice,
} from './project-map.js'

describe('ProjectMapV2 独立碰撞 lattice', () => {
  test('像素入口精确读取命中的子格', () => {
    let map = buildBlankProjectMap(3, 3, 'tileset-001')
    map = paintProjectMapCollision(map, [{ col: 1, row: 3, value: 1 }])
    const blocked = latticeCenter({ col: 1, row: 3 })
    const open = latticeCenter({ col: 1, row: 2 })
    expect(buildIsBlocked(map)(blocked.x, blocked.y)).toBe(true)
    expect(buildIsBlocked(map)(open.x, open.y)).toBe(false)
  })

  test('非 0 值均阻挡；界外恒阻挡', () => {
    let map = buildBlankProjectMap(2, 2, 'tileset-001')
    map = paintProjectMapCollision(map, [{ col: 1, row: 1, value: 7 }])
    const center = latticeCenter({ col: 1, row: 1 })
    const blocked = buildIsBlocked(map)
    expect(blocked(center.x, center.y)).toBe(true)
    expect(blocked(-100, -100)).toBe(true)
    expect(blocked(10_000, 10_000)).toBe(true)
  })

  test('isBlockedAt 与 buildIsBlocked(gridToPixel) 同源', () => {
    const pos: GridPos = { col: 92, row: 12, height: 0 }
    const pixel = gridToPixel(pos)
    const target = pixelToLattice(pixel.x, pixel.y)
    let map = buildBlankProjectMap(100, 100, 'tileset-001')
    map = paintProjectMapCollision(map, [{ ...target, value: 1 }])
    expect(isBlockedAt(map, pos)).toBe(true)
    expect(isBlockedAt(map, pos)).toBe(buildIsBlocked(map)(pixel.x, pixel.y))
  })
})

describe('坐标同格判定', () => {
  test('sameLatticeCell 以错排子格为单位', () => {
    const center = latticeCenter({ col: 2, row: 3 })
    expect(sameLatticeCell(center.x, center.y, center.x + 1, center.y)).toBe(true)
    const next = latticeCenter({ col: 2, row: 4 })
    expect(sameLatticeCell(center.x, center.y, next.x, next.y)).toBe(false)
  })

  test('sameGrid 忽略 height，但不忽略 col/row', () => {
    const ground: GridPos = { col: 92, row: 12, height: 0 }
    expect(sameGrid(ground, { col: 92, row: 12, height: 5 })).toBe(true)
    expect(sameGrid(ground, { col: 93, row: 12, height: 0 })).toBe(false)
    expect(sameGrid(ground, { col: 92, row: 13, height: 0 })).toBe(false)
  })
})
