import type { ItemDataMap, Locale } from '@type-pal/content'
import { lookupText } from '@type-pal/content'
import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  drawHost,
  glyphTable,
  menuAssets,
  stubDocumentCanvas,
} from '../__tests__/glm-runtime-resource/menu-draw-fixtures.js'
import { equipConfirmItem, openEquipMenu } from '../equip-menu-state.js'
import { makeTestItems, makeTestWorld } from '../test-fixtures.js'
import type { renderSpans } from '../text/text-render.js'
import { openUseMenu, useConfirm, useMoveCursor } from '../use-menu-state.js'
import { drawEquipMenu } from './equip-box.js'
import { drawUseMenu } from './use-box.js'

const textCalls = vi.hoisted(() => vi.fn<typeof renderSpans>())
vi.mock('../text/text-render.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../text/text-render.js')>()
  return {
    ...actual,
    renderSpans: (...args: Parameters<typeof renderSpans>) => {
      textCalls(...args)
      return 0
    },
  }
})

afterEach(() => {
  vi.unstubAllGlobals()
  textCalls.mockClear()
})

const locale: Locale = {}

function texts() {
  return textCalls.mock.calls.map(([, spans, x, y, options]) => [
    spans.map((span) => span.text).join(''),
    x,
    y,
    options.forceRgba,
  ])
}

function textsByY(y: number) {
  return texts().filter((t) => t[2] === y)
}

const itemCatalog = (): ItemDataMap => ({
  ...makeTestItems(),
  '166': {
    id: '166',
    name: '木剑',
    desc: [],
    buyPrice: 0,
    sellPrice: 0,
    sellable: true,
    equip: { slot: 'weapon', equipableBy: ['li-xiaoyao'], effects: [] },
  },
})

function selectedEquipment() {
  const world = makeTestWorld()
  const items = itemCatalog()
  const state = equipConfirmItem(openEquipMenu(world, 'li-xiaoyao', items))
  return { state, items, world }
}

test('装备列表画出可穿戴物，确认前没有选人页', () => {
  const h = drawHost()
  stubDocumentCanvas(h)
  const world = makeTestWorld()
  const items = itemCatalog()
  const state = openEquipMenu(world, 'li-xiaoyao', items)
  const assets = menuAssets()
  drawEquipMenu(h.ctx, state, world, assets, glyphTable(), 0, locale, items)
  expect(texts()).toContainEqual(['土灵珠', 15, 12, [247, 231, 109]])
  expect(texts().some(([label]) => label === '观音符')).toBe(false)
  expect(h.drawImage).not.toHaveBeenCalledWith(assets.statusBg, 0, 0, 320, 200)
})

describe('装备选人卷轴', () => {
  test('状态板铺底 320×200；角色名闪烁 (15,108)；选中物金名 (5,73) + 青数量 (62,52)', () => {
    const h = drawHost()
    stubDocumentCanvas(h)
    const assets = menuAssets()
    const { state, items, world } = selectedEquipment()
    drawEquipMenu(h.ctx, state, world, assets, glyphTable(), 0, locale, items)
    expect(h.drawImage).toHaveBeenCalledWith(assets.statusBg, 0, 0, 320, 200)
    const rows = texts()
    expect(rows).toContainEqual([lookupText('name.li-xiaoyao', locale), 15, 108, [247, 231, 109]])
    expect(rows).toContainEqual(['土灵珠', 5, 73, [255, 203, 113]])
    expect(h.drawImage).toHaveBeenCalledWith(assets.numsCyan[1], 56, 52)
    // 图标：items['267'] 无 icon → 无 32×32 图标 blit；仅 statusBg + 框块
  })

  test('穿戴槽用深色标签和现行物品名称', () => {
    const h = drawHost()
    stubDocumentCanvas(h)
    const { state, items, world } = selectedEquipment()
    drawEquipMenu(h.ctx, state, world, menuAssets(), glyphTable(), 0, locale, items)
    // 槽 label y：11,33,55,77,99,121
    const head = textsByY(11)
    expect(head).toContainEqual([lookupText('equip.head', locale), 92, 11, [0, 0, 0]])
    // Slot label and equipped item occupy the same row.
    const weaponRow = textsByY(77)
    expect(weaponRow).toContainEqual([lookupText('equip.weapon', locale), 92, 77, [0, 0, 0]])
    expect(weaponRow).toContainEqual(['木剑', 130, 77, [199, 186, 174]])
    // accessory 槽 y = 11+110 = 121：穿戴名 护腕
    const accRow = textsByY(121)
    expect(accRow).toContainEqual(['护腕', 130, 121, [199, 186, 174]])
  })

  test('5 有效属性青数字右对齐 (292,14+22i)：attack 33 无装备加成', () => {
    const h = drawHost()
    stubDocumentCanvas(h)
    const { state, items, world } = selectedEquipment()
    const assets = menuAssets()
    drawEquipMenu(h.ctx, state, world, assets, glyphTable(), 0, locale, items)
    expect(h.drawImage).toHaveBeenCalledWith(assets.numsCyan[3], 286, 14)
    expect(h.drawImage).toHaveBeenCalledWith(assets.numsCyan[3], 280, 14)
  })
})

function selectedRecipient() {
  const world = makeTestWorld()
  const items = itemCatalog()
  const menu = useMoveCursor(openUseMenu(world, items), 'right')
  const confirmed = useConfirm(menu, world)
  if (confirmed.kind !== 'pick-target') throw new Error('观音符应交给选人面板')
  return { state: confirmed.state, world, items }
}

describe('道具使用列表和目标面板', () => {
  test('列表阶段画出实际物品网格，未形成角色右栏', () => {
    const h = drawHost()
    stubDocumentCanvas(h)
    const world = makeTestWorld()
    const items = itemCatalog()
    const menu = openUseMenu(world, items)
    drawUseMenu(h.ctx, menu, world, menuAssets(), glyphTable(), 0, locale, items)
    expect(texts()).toContainEqual(['土灵珠', 15, 12, [247, 231, 109]])
    expect(texts().some(([, x]) => x === 200)).toBe(false)
  })

  test('目标栏按既定行距画等级、两种资源池和五项属性', () => {
    const h = drawHost()
    stubDocumentCanvas(h)
    const assets = menuAssets()
    const { state, world, items } = selectedRecipient()
    drawUseMenu(h.ctx, state, world, assets, glyphTable(), 0, locale, items)
    expect(texts().filter(([, x]) => x === 200)).toEqual([
      [lookupText('stat.level', locale), 200, 16, [186, 166, 125]],
      [lookupText('stat.hp', locale), 200, 34, [186, 166, 125]],
      [lookupText('stat.mp', locale), 200, 52, [186, 166, 125]],
      [lookupText('stat.attack', locale), 200, 70, [186, 166, 125]],
      [lookupText('stat.magicAttack', locale), 200, 88, [186, 166, 125]],
      [lookupText('stat.defense', locale), 200, 106, [186, 166, 125]],
      [lookupText('stat.speed', locale), 200, 124, [186, 166, 125]],
      [lookupText('stat.luck', locale), 200, 142, [186, 166, 125]],
    ])
    expect(h.drawImage).toHaveBeenCalledWith(assets.nums[1], 256, 20)
    expect(h.drawImage).toHaveBeenCalledWith(assets.nums[1], 244, 38)
    expect(h.drawImage).toHaveBeenCalledWith(assets.nums[0], 256, 38)
    expect(h.drawImage).toHaveBeenCalledWith(assets.slash, 264, 39)
    expect(h.drawImage).toHaveBeenCalledWith(assets.numsBlue[0], 278, 41)
    expect(h.drawImage).toHaveBeenCalledWith(assets.nums[3], 250, 74)
  })

  test('目标栏高亮已选角色并显示所用物品与实际库存', () => {
    const h = drawHost()
    stubDocumentCanvas(h)
    const assets = menuAssets()
    const { state, world, items } = selectedRecipient()
    drawUseMenu(h.ctx, state, world, assets, glyphTable(), 0, locale, items)
    expect(texts()).toContainEqual([
      lookupText('name.li-xiaoyao', locale),
      125,
      16,
      [247, 231, 109],
    ])
    expect(texts()).toContainEqual(['观音符', 116, 143, [231, 223, 195]])
    expect(h.drawImage).toHaveBeenCalledWith(assets.numsCyan[2], 176, 133)
  })
})
