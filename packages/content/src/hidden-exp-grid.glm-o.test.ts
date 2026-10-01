/** TEST-GLM-WAVE-O-1 O08/O09：隐藏经验池与菱形格几何残余合同。
 *  旧证：rewards.test 覆盖 grantBattleRewards 主干；grid 邻域零测试文件（纯几何）。
 *  本卡按 gap-map 直击未覆盖臂：applyHiddenExp 零计数短路/池初始化/阈值升级循环/
 *  WORD 截断、gridToPixel/pixelToGrid 唯一反解/height 不投影/spriteScreenY。
 */

import type { CharacterInstance } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { gridToPixel, pixelDeltaToGridDelta, pixelToGrid, spriteScreenY } from './grid.js'
import { applyHiddenExp } from './rewards.js'

const hero = (over: Partial<CharacterInstance> = {}): CharacterInstance => ({
  id: 'hero',
  template: 'hero',
  level: 5,
  exp: 0,
  hp: 100,
  maxHP: 100,
  mp: 50,
  maxMP: 50,
  attack: 10,
  defense: 10,
  magicAttack: 10,
  speed: 10,
  luck: 10,
  equipment: {},
  tags: [],
  ...over,
})

describe('O08 applyHiddenExp：隐藏经验池', () => {
  // expTable[level] = 升到 level+1 的阈值；5 级角色阈值 100。
  const table = [0, 0, 0, 0, 0, 100, 200, 300]

  test('全零计数 → 空报告且不动角色', () => {
    const c = hero()
    const ups = applyHiddenExp(c, { attack: 0 }, 500, table, () => 0)
    expect(ups).toEqual([])
    expect(c.hiddenExp).toBeUndefined()
  })

  test('单属性全量入池：比例分配 = 100%、×2 加成、阈值升级循环', () => {
    const c = hero()
    const ups = applyHiddenExp(c, { attack: 3 }, 50, table, () => 0)
    // exp = trunc(50*3/3)*2 = 100 → 达阈值 100 → 升一级扣 100，inc=r(1,2)=1。
    expect(ups).toEqual([{ characterId: 'hero', stat: 'attack', delta: 1 }])
    expect(c.attack).toBe(11)
    expect(c.hiddenExp?.attack).toEqual({ exp: 0, level: 6 })
  })

  test('多属性按计数比例分配；未计数属性池初始化但零经验', () => {
    const c = hero()
    const ups = applyHiddenExp(c, { attack: 1, defense: 3 }, 80, table, () => 0)
    // attack: trunc(80*1/4)*2 = 40；defense: trunc(80*3/4)*2 = 120 → 升一级剩 20。
    expect(ups).toEqual([{ characterId: 'hero', stat: 'defense', delta: 1 }])
    expect(c.defense).toBe(11)
    expect(c.hiddenExp?.attack).toEqual({ exp: 40, level: 5 })
    expect(c.hiddenExp?.defense).toEqual({ exp: 20, level: 6 })
  })

  test('池经验 WORD 截断（exp & 0xffff）', () => {
    const c = hero()
    // 大 expGained 使池 exp 超 65536：0x10000 & 0xffff = 0。
    const big = hero()
    const ups = applyHiddenExp(big, { luck: 1 }, 40000, [0, 0, 0, 0, 0, 1, 1, 1, 1, 1], () => 0)
    expect(big.luck).toBeGreaterThan(10)
    expect(ups.length).toBeGreaterThan(0)
    expect((big.hiddenExp?.luck?.exp ?? 0) & 0xffff0000).toBe(0)
    void c
  })

  test('rng=1 上界：每级 inc=2', () => {
    const c = hero()
    const ups = applyHiddenExp(c, { attack: 1 }, 50, table, () => 0.999999)
    expect(ups[0]?.delta).toBe(2)
    expect(c.attack).toBe(12)
  })
})

describe('O09 菱形格几何：唯一反解与 height 语义', () => {
  test('gridToPixel 公式 x=16(col−row), y=8(col+row)', () => {
    expect(gridToPixel({ col: 0, row: 0, height: 0 })).toEqual({ x: 0, y: 0 })
    expect(gridToPixel({ col: 3, row: 1, height: 0 })).toEqual({ x: 32, y: 32 })
    expect(gridToPixel({ col: -2, row: 1, height: 0 })).toEqual({ x: -48, y: -8 })
  })

  test('pixelToGrid 是 gridToPixel 的唯一反解（站位像素）', () => {
    for (const [col, row] of [
      [0, 0],
      [3, 1],
      [-2, 1],
      [10, -7],
    ] as const) {
      const { x, y } = gridToPixel({ col, row, height: 0 })
      expect(pixelToGrid(x, y)).toEqual({ col, row })
    }
  })

  test('height 不投影进格坐标；spriteScreenY 每级 -16px', () => {
    expect(gridToPixel({ col: 2, row: 2, height: 5 })).toEqual({ x: 0, y: 32 })
    expect(spriteScreenY({ col: 2, row: 2, height: 0 })).toBe(32)
    expect(spriteScreenY({ col: 2, row: 2, height: 3 })).toBe(32 - 48)
  })

  test('pixelDeltaToGridDelta 保留小数（碎步位移不取整）', () => {
    // a=4/16=0.25, b=2/8=0.25 → dcol=(0.25+0.25)/2=0.25。
    expect(pixelDeltaToGridDelta(4, 2)).toEqual({ dcol: 0.25, drow: 0 })
    expect(pixelDeltaToGridDelta(-4, -2)).toEqual({ dcol: -0.25, drow: 0 })
    expect(pixelDeltaToGridDelta(16, 8)).toEqual({ dcol: 1, drow: 0 })
    expect(pixelDeltaToGridDelta(0, 8)).toEqual({ dcol: 0.5, drow: 0.5 })
  })
})
