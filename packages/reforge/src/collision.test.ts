import type { GridPos } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { buildIsBlocked, isBlockedAt, sameGrid, sameLatticeCell } from './collision.js'
import {
  buildBlankProjectMap,
  latticeCenter,
  paintProjectMapCollision,
  paintProjectMapTiles,
  withProjectMapStampPlacements,
} from './project-map.js'

describe('ProjectMap 独立碰撞 lattice', () => {
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

  test('菱形站位命中对应的碰撞子格，忽略高度', () => {
    const map = paintProjectMapCollision(buildBlankProjectMap(100, 100, 'tileset-001'), [
      { col: 40, row: 104, value: 1 },
    ])
    expect(isBlockedAt(map, { col: 92, row: 12, height: 0 })).toBe(true)
    expect(isBlockedAt(map, { col: 92, row: 12, height: 5 })).toBe(true)
    expect(isBlockedAt(map, { col: 91, row: 12, height: 0 })).toBe(false)
  })

  test('相同 collision 的有无作者态判定逐点一致', () => {
    let base = buildBlankProjectMap(1, 1, 'tileset-001')
    base = paintProjectMapTiles(base, [
      {
        layerId: 'floor',
        row: 0,
        col: 0,
        tileId: 1,
        tilesetId: 'tileset-001',
        height: 0,
      },
    ])
    base = paintProjectMapCollision(base, [{ row: 0, col: 0, value: 1 }])
    const authored = withProjectMapStampPlacements(base, [
      {
        id: 'placement-1',
        anchor: { row: 0, col: 0 },
        visualSlots: [{ layerId: 'floor', row: 0, col: 0 }],
        gridPoints: [{ row: 0, col: 0 }],
      },
    ])
    const point = latticeCenter({ row: 0, col: 0 })
    expect(buildIsBlocked(authored)(point.x, point.y)).toBe(true)
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
