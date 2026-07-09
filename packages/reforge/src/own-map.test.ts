import { describe, expect, test } from 'vitest'
import {
  buildBlankOwnMap,
  COLLISION_MASK,
  encodeTileLayer0,
  encodeTileLayer1,
  floodFillSubTiles,
  LAYER0_TILE_MASK,
  LAYER1_TILE_MASK,
  paintCells,
  subTilesInRect,
} from './own-map.js'

describe('buildBlankOwnMap', () => {
  test('尺寸 / 全空格(lower·upper=0) / tileset 引用', () => {
    const m = buildBlankOwnMap(3, 2, 'tileset/12.rle')
    expect(m.width).toBe(3)
    expect(m.height).toBe(2)
    expect(m.cells).toHaveLength(2) // rows
    expect(m.cells[0]).toHaveLength(3) // cols
    expect(m.cells[1]?.[2]).toEqual({ lower: 0, upper: 0 })
    expect(m.tileset).toBe('tileset/12.rle')
  })

  test('每格独立对象(改一格不串改别格)', () => {
    const m = buildBlankOwnMap(2, 2, 't')
    const cell = m.cells[0]?.[0]
    if (cell) cell.lower = 99
    expect(m.cells[0]?.[1]?.lower).toBe(0)
    expect(m.cells[1]?.[0]?.lower).toBe(0)
  })
})

describe('encodeTileLayer0(W7c)', () => {
  test('与 render.ts tileIdLayer0 互逆(位 0-7 + 位 12 作第 9 位)', () => {
    const decode = (d: number): number => (d & 0xff) | ((d >> 4) & 0x100) // = tileIdLayer0
    for (const id of [0, 1, 0xff, 0x100, 0x1ff]) {
      expect(decode(encodeTileLayer0(id))).toBe(id)
    }
    expect(encodeTileLayer0(0x100)).toBe(0x1000) // 第 9 位落在位 12
    expect(encodeTileLayer0(5)).toBe(5)
  })
})

describe('encodeTileLayer1(W7c-3)', () => {
  test('与 render.ts tileIdLayer1 互逆(高 16 位存 tileId+1,0=无)', () => {
    const decode = (d: number): number => {
      const hi = d >>> 16
      return ((hi & 0xff) | ((hi >> 4) & 0x100)) - 1
    }
    for (const id of [0, 1, 0xff, 0x100, 0x1fe]) {
      expect(decode(encodeTileLayer1(id))).toBe(id)
    }
    expect(encodeTileLayer1(0) >>> 16).toBe(1)
    expect(encodeTileLayer1(0x1fe)).toBe(0x10ff0000)
  })
})

describe('paintCells(W7c)', () => {
  test('写子格 word(h=0→lower / h=1→upper);源图不动,未触及行同引用', () => {
    const m = buildBlankOwnMap(3, 3, 't')
    const out = paintCells(m, [
      { col: 1, row: 1, h: 0, word: 7 },
      { col: 2, row: 1, h: 1, word: 9 },
    ])
    expect(out.cells[1]?.[1]).toEqual({ lower: 7, upper: 0 })
    expect(out.cells[1]?.[2]).toEqual({ lower: 0, upper: 9 })
    // 源不变
    expect(m.cells[1]?.[1]).toEqual({ lower: 0, upper: 0 })
    // 未触及行浅共享,触及行新引用
    expect(out.cells[0]).toBe(m.cells[0])
    expect(out.cells[1]).not.toBe(m.cells[1])
  })

  test('界外忽略;全界外 → 返回原图同引用', () => {
    const m = buildBlankOwnMap(2, 2, 't')
    expect(paintCells(m, [{ col: 5, row: 0, h: 0, word: 1 }])).toBe(m)
    const out = paintCells(m, [
      { col: -1, row: 0, h: 0, word: 1 },
      { col: 0, row: 0, h: 0, word: 3 },
    ])
    expect(out.cells[0]?.[0]?.lower).toBe(3)
  })

  test('masked write:画 layer0 不破坏 layer1 / 碰撞 / 高度位', () => {
    const m = buildBlankOwnMap(1, 1, 't')
    const oldWord = encodeTileLayer1(7) | COLLISION_MASK | 0x0a00
    m.cells[0]![0]!.lower = oldWord
    const out = paintCells(m, [
      { col: 0, row: 0, h: 0, word: encodeTileLayer0(0x100), mask: LAYER0_TILE_MASK },
    ])
    expect(out.cells[0]?.[0]?.lower).toBe(
      ((oldWord & ~LAYER0_TILE_MASK) | encodeTileLayer0(0x100)) >>> 0,
    )
    const lower = out.cells[0]![0]!.lower
    expect(lower & COLLISION_MASK).toBe(COLLISION_MASK)
    expect(lower >>> 16).toBe(encodeTileLayer1(7) >>> 16)
  })

  test('masked write:画 layer1 与碰撞 set/clear 互不干扰', () => {
    let m = buildBlankOwnMap(1, 1, 't')
    m = paintCells(m, [
      { col: 0, row: 0, h: 1, word: encodeTileLayer0(3), mask: LAYER0_TILE_MASK },
      { col: 0, row: 0, h: 1, word: encodeTileLayer1(9), mask: LAYER1_TILE_MASK },
      { col: 0, row: 0, h: 1, word: COLLISION_MASK, mask: COLLISION_MASK },
    ])
    const upper = m.cells[0]![0]!.upper
    expect(upper & LAYER0_TILE_MASK).toBe(encodeTileLayer0(3))
    expect(upper >>> 16).toBe(encodeTileLayer1(9) >>> 16)
    expect(upper & COLLISION_MASK).toBe(COLLISION_MASK)

    const out = paintCells(m, [{ col: 0, row: 0, h: 1, word: 0, mask: COLLISION_MASK }])
    const cleared = out.cells[0]![0]!.upper
    expect(cleared & COLLISION_MASK).toBe(0)
    expect(cleared & LAYER0_TILE_MASK).toBe(encodeTileLayer0(3))
    expect(cleared >>> 16).toBe(encodeTileLayer1(9) >>> 16)
  })
})

describe('subTilesInRect(W7c 矩形)', () => {
  test('覆盖两类子格;端点任意序等价', () => {
    // AABB 恰含 h=0 (1,1)(中心 32,16)与 h=1 (0,0)(中心 16,8)与 h=1 (1,0)(中心 48,8)…
    const got = subTilesInRect(15, 7, 49, 17)
    expect(got).toContainEqual({ col: 0, row: 0, h: 1 })
    expect(got).toContainEqual({ col: 1, row: 0, h: 1 })
    expect(got).toContainEqual({ col: 1, row: 1, h: 0 })
    expect(subTilesInRect(49, 17, 15, 7)).toEqual(got) // 反序端点同结果
  })
  test('单点(零面积)命中恰一子格中心', () => {
    expect(subTilesInRect(32, 16, 32, 16)).toEqual([{ col: 1, row: 1, h: 0 }])
    expect(subTilesInRect(48, 24, 48, 24)).toEqual([{ col: 1, row: 1, h: 1 }])
  })
})

describe('floodFillSubTiles(W7c 填充)', () => {
  test('空白图从任一子格填 → 全图连通(cols×rows×2 子格)', () => {
    const m = buildBlankOwnMap(3, 3, 't')
    const edits = floodFillSubTiles(m, { col: 1, row: 1, h: 0 }, 5)
    expect(edits.length).toBe(3 * 3 * 2)
    expect(edits.every((e) => e.word === 5)).toBe(true)
  })
  test('异 word 屏障隔断连通;起点已是目标 word → []', () => {
    let m = buildBlankOwnMap(3, 1, 't')
    // 竖切一刀:col1 的两个子格设 9 —— 等等,连通性走对角,单列屏障是否隔断 3×1 图?
    // 3×1 图子格链:(0,0,0)-(0,0,1)-(1,0,0)-(1,0,1)-(2,0,0)-(2,0,1)(对角邻接成链)
    m = paintCells(m, [
      { col: 1, row: 0, h: 0, word: 9 },
      { col: 0, row: 0, h: 1, word: 9 },
    ])
    const edits = floodFillSubTiles(m, { col: 0, row: 0, h: 0 }, 5)
    expect(edits).toEqual([{ col: 0, row: 0, h: 0, word: 5 }]) // 只剩起点自己
    expect(floodFillSubTiles(m, { col: 1, row: 0, h: 0 }, 9)).toEqual([]) // 已是目标
  })
  test('masked 填充只按目标位域判连通,并产出带 mask 的编辑集', () => {
    let m = buildBlankOwnMap(2, 1, 't')
    m = paintCells(m, [
      { col: 0, row: 0, h: 0, word: encodeTileLayer1(1), mask: LAYER1_TILE_MASK },
      { col: 1, row: 0, h: 1, word: COLLISION_MASK, mask: COLLISION_MASK },
    ])
    const edits = floodFillSubTiles(
      m,
      { col: 0, row: 0, h: 0 },
      encodeTileLayer0(5),
      LAYER0_TILE_MASK,
    )
    expect(edits.length).toBe(2 * 1 * 2)
    expect(edits.every((e) => e.word === encodeTileLayer0(5) && e.mask === LAYER0_TILE_MASK)).toBe(
      true,
    )
  })
})
