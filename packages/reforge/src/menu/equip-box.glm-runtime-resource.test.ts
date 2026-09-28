/**
 * TEST-GLM-RUNTIME-RESOURCE-2 R12（reforge/menu/equip-box.ts）。
 * 该文件此前无任何测试。合同：list 阶段纯委托 drawItemGridList（实参身份）；
 * pick-role 面板：状态板 320×200 铺底、选中物金名 (5,73) 与青数量 (62,52)、
 * 角色名闪烁 (15,108)、6 槽 label 黑字深灰影 (92,11+22i) 与穿戴名白 (130,同 y)、
 * 5 有效属性青数字右对齐 (292,14+22i)。
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
import type { EquipMenuState } from '../equip-menu-state.js'
import { makeTestItems, makeTestWorld } from '../test-fixtures.js'
import { drawEquipMenu } from './equip-box.js'

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

function texts(): [string, number, number, readonly number[]][] {
  return textCalls.mock.calls.map((c: unknown[]) => {
    const spans = c[1] as { text: string }[]
    const opts = c[4] as { forceRgba?: readonly number[]; shadowRgba?: readonly number[] }
    return [spans[0]!.text, c[2] as number, c[3] as number, opts.forceRgba!]
  })
}

function textsByY(y: number): [string, number, number, readonly number[]][] {
  return texts().filter((t) => t[2] === y)
}

describe('R12 drawEquipMenu list 阶段委托', () => {
  test('drawItemGridList 实参身份透传', () => {
    const h = drawHost()
    const w = makeTestWorld()
    const items = [makeTestItems()['61']!]
    const s: EquipMenuState = {
      active: true,
      phase: 'list',
      items,
      cursor: 2,
      casterId: 'li-xiaoyao',
    }
    drawEquipMenu(h.ctx, s, w, menuAssets(), glyphTable(), 0, locale, makeTestItems())
    expect(gridCalls).toHaveBeenCalledTimes(1)
    const args = gridCalls.mock.calls[0] as unknown[]
    expect(args[1]).toBe(items)
    expect(args[2]).toBe(2)
    expect(args[3]).toBe(w)
  })
})

describe('R12 drawEquipMenu pick-role 面板', () => {
  const pickRole = (): { s: EquipMenuState; items: ItemDataMap } => {
    const items = makeTestItems()
    return {
      s: {
        active: true,
        phase: 'pick-role',
        items: [],
        cursor: 0,
        casterId: 'li-xiaoyao',
        selectedItemId: '61',
      },
      items,
    }
  }

  test('状态板铺底 320×200；角色名闪烁 (15,108)；选中物金名 (5,73) + 青数量 (62,52)', () => {
    const h = drawHost()
    stubDocumentCanvas(h)
    const assets = menuAssets()
    const { s, items } = pickRole()
    drawEquipMenu(h.ctx, s, makeTestWorld(), assets, glyphTable(), 0, locale, items)
    expect(h.drawImage).toHaveBeenCalledWith(assets.statusBg, 0, 0, 320, 200)
    const rows = texts()
    expect(rows).toContainEqual([lookupText('name.li-xiaoyao', locale), 15, 108, [247, 231, 109]])
    expect(rows).toContainEqual(['观音符', 5, 73, [255, 203, 113]])
    const cyan = h.drawImage.mock.calls
      .filter((c: unknown[]) => String((c[0] as { id: string }).id).startsWith('nc-'))
      .map((c: unknown[]) => [(c[0] as { id: string }).id, c[1], c[2]])
    expect(cyan).toContainEqual(['nc-2', 56, 52]) // 背包 61×2 → 右对齐 62-6
    // 图标：items['61'] 无 icon → 无 32×32 图标 blit；仅 statusBg + 框块
  })

  test('6 槽 label (92,11+22i) 黑字深灰影；穿戴名白：weapon=?166 缺表、accessory=护腕', () => {
    const h = drawHost()
    stubDocumentCanvas(h)
    const { s, items } = pickRole()
    drawEquipMenu(h.ctx, s, makeTestWorld(), menuAssets(), glyphTable(), 0, locale, items)
    // 槽 label y：11,33,55,77,99,121
    const head = textsByY(11)
    expect(head).toContainEqual([lookupText('equip.head', locale), 92, 11, [0, 0, 0]])
    // weapon 槽 y = 11+66 = 77：label + 穿戴名 ?166（testItems 无 166）
    const weaponRow = textsByY(77)
    expect(weaponRow).toContainEqual([lookupText('equip.weapon', locale), 92, 77, [0, 0, 0]])
    expect(weaponRow).toContainEqual(['?166', 130, 77, [199, 186, 174]])
    // accessory 槽 y = 11+110 = 121：穿戴名 护腕
    const accRow = textsByY(121)
    expect(accRow).toContainEqual(['护腕', 130, 121, [199, 186, 174]])
  })

  test('5 有效属性青数字右对齐 (292,14+22i)：attack 33 无装备加成', () => {
    const h = drawHost()
    stubDocumentCanvas(h)
    const { s, items } = pickRole()
    drawEquipMenu(h.ctx, s, makeTestWorld(), menuAssets(), glyphTable(), 0, locale, items)
    const cyan = h.drawImage.mock.calls
      .filter((c: unknown[]) => String((c[0] as { id: string }).id).startsWith('nc-'))
      .map((c: unknown[]) => [(c[0] as { id: string }).id, c[1], c[2]])
    expect(cyan).toContainEqual(['nc-3', 286, 14]) // attack 33 → '3'@286、'3'@280
    expect(cyan).toContainEqual(['nc-3', 280, 14])
  })
})
