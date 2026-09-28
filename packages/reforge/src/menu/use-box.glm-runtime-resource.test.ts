/**
 * TEST-GLM-RUNTIME-RESOURCE-2 R12（reforge/menu/use-box.ts）。
 * 该文件此前无任何测试。合同：pick-item 阶段纯委托 drawItemGridList（实参身份）并早退；
 * pick-target 右侧黄框 8 属性行（level/hp/mp 池/有效属性）、斜杠 + 蓝 max 错落、
 * 角色名闪烁、选中物 itembox/图标/名/数量。
 */
import type { ItemDataMap, Locale } from '@type-pal/content'
import { lookupText } from '@type-pal/content'
import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  drawHost,
  glyphTable,
  menuAssets,
  stubDocumentCanvas,
} from '../__tests__/glm-runtime-resource/menu-draw-fixtures.js'
import { makeTestItems, makeTestWorld } from '../test-fixtures.js'
import type { UseMenuState } from '../use-menu-state.js'
import { drawUseMenu } from './use-box.js'

const textCalls = vi.hoisted(() => vi.fn())
vi.mock('../text/text-render.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../text/text-render.js')>()
  return {
    ...actual,
    renderSpans: (...args: unknown[]) => {
      textCalls(...args)
      return 0
    },
  }
})

const gridCalls = vi.hoisted(() => vi.fn())
vi.mock('./item-list.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./item-list.js')>()
  return {
    ...actual,
    drawItemGridList: (...args: unknown[]) => {
      gridCalls(...args)
    },
  }
})

afterEach(() => {
  vi.unstubAllGlobals()
  textCalls.mockClear()
  gridCalls.mockClear()
})

const locale: Locale = {}
const host = () => drawHost()

function texts(): [string, number, number, readonly number[]][] {
  return textCalls.mock.calls.map((c: unknown[]) => {
    const spans = c[1] as { text: string }[]
    const opts = c[4] as { forceRgba?: readonly number[] }
    return [spans[0]!.text, c[2] as number, c[3] as number, opts.forceRgba!]
  })
}

const state = (over: Partial<UseMenuState>): UseMenuState => ({
  active: true,
  phase: 'pick-item',
  items: [],
  cursor: 0,
  ...over,
})

describe('R12 drawUseMenu pick-item 委托', () => {
  test('整宽列表实参身份透传；pick-item 早退零额外绘制', () => {
    const h = host()
    const w = makeTestWorld()
    const items = [makeTestItems()['61']!]
    const s = state({ items, cursor: 0 })
    drawUseMenu(h.ctx, s, w, menuAssets(), glyphTable(), 0, locale, makeTestItems())
    expect(gridCalls).toHaveBeenCalledTimes(1)
    const args = gridCalls.mock.calls[0] as unknown[]
    expect(args[1]).toBe(items)
    expect(args[2]).toBe(0)
    expect(args[3]).toBe(w)
    expect(texts()).toEqual([])
    expect(h.drawImage).not.toHaveBeenCalled()
  })
})

describe('R12 drawUseMenu pick-target', () => {
  const pickTarget = (): { s: UseMenuState; items: ItemDataMap } => {
    const items = makeTestItems()
    return {
      s: state({ phase: 'pick-target', items: [items['61']!], cursor: 0, selectedItemId: '61' }),
      items,
    }
  }

  test('8 属性行 label (200,16+18i)；level=1、hp 100/150 数字与蓝 max', () => {
    const h = host()
    stubDocumentCanvas(h)
    const { s, items } = pickTarget()
    drawUseMenu(h.ctx, s, makeTestWorld(), menuAssets(), glyphTable(), 0, locale, items)
    const rows = texts()
    expect(rows).toHaveLength(10) // 8 label + 角色名 + 选中物名
    expect(rows[0]).toEqual([lookupText('stat.level', locale), 200, 16, [186, 166, 125]])
    expect(rows[1]).toEqual([lookupText('stat.hp', locale), 200, 34, [186, 166, 125]])
    expect(rows[7]).toEqual([lookupText('stat.luck', locale), 200, 142, [186, 166, 125]])
    // level 数字：右对齐 262, y=20 → '1' @256；hp 100 → '0'@256 '0'@250 '1'@244；maxHP 150 蓝 y=41
    const isDigit = (c: unknown[]): boolean => {
      const id = String((c[0] as { id: string }).id)
      return id.startsWith('n-') || id.startsWith('nb-') || id.startsWith('nc-')
    }
    const digits = h.drawImage.mock.calls
      .filter(isDigit)
      .map((c: unknown[]) => [(c[0] as { id: string }).id, c[1], c[2]])
    expect(digits).toContainEqual(['n-1', 256, 20]) // level 1
    expect(digits).toContainEqual(['n-0', 256, 38]) // hp 100 个位
    expect(digits).toContainEqual(['n-1', 244, 38]) // hp 100 百位
    expect(digits).toContainEqual(['nb-0', 278, 41]) // maxHP 150 蓝错落 y=41
    expect(digits).toContainEqual(['n-3', 250, 74]) // attack 33 = base 33（装备 166 无加成）
  })

  test('斜杠 (264, valY+1)；选中物名金 (116,143) + 数量青右对齐 (182,133)', () => {
    const h = host()
    stubDocumentCanvas(h)
    const assets = menuAssets()
    const { s, items } = pickTarget()
    drawUseMenu(h.ctx, s, makeTestWorld(), assets, glyphTable(), 0, locale, items)
    expect(h.drawImage).toHaveBeenCalledWith(assets.slash, 264, 39)
    const rows = texts()
    expect(rows[8]).toEqual([lookupText('name.li-xiaoyao', locale), 125, 16, [247, 231, 109]]) // 角色名闪烁
    expect(rows[9]).toEqual(['观音符', 116, 143, [231, 223, 195]]) // 选中物名
    const cyan = h.drawImage.mock.calls
      .filter((c: unknown[]) => String((c[0] as { id: string }).id).startsWith('nc-'))
      .map((c: unknown[]) => [(c[0] as { id: string }).id, c[1], c[2]])
    expect(cyan).toEqual([['nc-2', 176, 133]]) // 数量 2 → 右对齐 182-6
  })
})
