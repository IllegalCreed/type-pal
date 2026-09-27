import type { CharacterInstance, ItemDataMap, WorldState } from '@type-pal/content'
import { describe, expect, test, vi } from 'vitest'
import type { GlyphTable } from '../text/glyph.js'
import type { MenuAssets } from './menu-box.js'
import { drawShop, openShopUi, shopInput } from './shop-box.js'

const calls = vi.hoisted(() => ({
  text: vi.fn(),
  number: vi.fn(),
  scroll: vi.fn(),
  box: vi.fn(),
  grid: vi.fn(),
  confirm: vi.fn(),
}))
vi.mock('../text/text-render.js', async (original) => ({
  ...(await original<typeof import('../text/text-render.js')>()),
  renderSpans: (...args: unknown[]) => calls.text(...args),
}))
vi.mock('./menu-box.js', async (original) => ({
  ...(await original<typeof import('./menu-box.js')>()),
  drawNumber: (...args: unknown[]) => calls.number(...args),
  drawScroll: (...args: unknown[]) => calls.scroll(...args),
  drawSlicedBox: (...args: unknown[]) => calls.box(...args),
  drawConfirmBox: (...args: unknown[]) => calls.confirm(...args),
}))
vi.mock('./item-list.js', async (original) => ({
  ...(await original<typeof import('./item-list.js')>()),
  drawItemGridList: (...args: unknown[]) => calls.grid(...args),
}))

const item = (id: string, sellPrice = 7) => ({
  id,
  name: `物品${id}`,
  desc: [],
  buyPrice: 50,
  sellPrice,
  sellable: true,
})

function world(money: number, inventory: WorldState['inventory']): WorldState {
  const hero: CharacterInstance = {
    id: 'hero1',
    template: 'hero',
    level: 1,
    exp: 0,
    hp: 10,
    maxHP: 10,
    mp: 5,
    maxMP: 5,
    attack: 1,
    defense: 1,
    magicAttack: 1,
    speed: 1,
    luck: 1,
    equipment: { accessory: 'ring' },
    tags: [],
  }
  return { money, inventory, party: [hero], learnedSkills: {} }
}

function image(): ImageBitmap {
  return { width: 8, height: 8, close() {} } as ImageBitmap
}

function drawHost() {
  const tile = image()
  const tiles = { tiles: Array.from({ length: 9 }, () => tile) }
  const icon = image()
  const assets: MenuAssets = {
    box: tiles,
    statusBg: tile,
    equipSlot: tile,
    scroll: tiles,
    nums: Array.from({ length: 10 }, () => image()),
    avatar: undefined,
    numsBlue: [],
    numsCyan: [],
    slash: tile,
    itemIcons: { 'icon-ring': icon },
    redBox: tiles,
    magicPlayerBox: tile,
    cursorGrid: tile,
    cursorUp: tile,
    cursorUpRed: tile,
    cursorDown: tile,
    settleArrow: tile,
    battleIcons: [],
    itembox: tiles,
  }
  const drawImage = vi.fn()
  const ctx = { drawImage } as unknown as CanvasRenderingContext2D
  const glyphs: GlyphTable = { has: () => false, get: () => undefined }
  for (const spy of Object.values(calls)) spy.mockClear()
  return { ctx, glyphs, assets, icon, drawImage }
}

describe('当前商店 UI 的卖出与画面派发', () => {
  test('卖出按三列导航、确认后走真实结算，卖光后重算列表并收敛游标', () => {
    const items: ItemDataMap = { ring: item('ring', 11), potion: item('potion', 7) }
    const ui = openShopUi('sell', ['ring', 'potion'])
    let current = world(100, [
      { itemId: 'ring', count: 1 },
      { itemId: 'potion', count: 2 },
    ])
    const apply = vi.fn((next: WorldState) => {
      current = next
    })
    const input = (key: string) => shopInput(ui, new Set([key]), current, items, apply)
    input('ArrowRight')
    expect(ui.cursor).toBe(1)
    input('ArrowDown')
    expect(ui.cursor).toBe(1)
    const before = structuredClone(current)
    input('Enter')
    expect(ui.phase).toBe('confirm')
    expect(ui.confirmYes).toBe(false)
    input('ArrowLeft')
    expect(input('Enter')).toBe('changed')
    expect(current.money).toBe(107)
    expect(current.inventory).toEqual([
      { itemId: 'ring', count: 1 },
      { itemId: 'potion', count: 1 },
    ])
    expect(before.inventory).toEqual([
      { itemId: 'ring', count: 1 },
      { itemId: 'potion', count: 2 },
    ])
    expect(ui.list).toEqual(['ring', 'potion'])
    expect(ui.cursor).toBe(1)

    input('Enter')
    input('ArrowRight')
    expect(input('Enter')).toBe('changed')
    expect(current.money).toBe(114)
    expect(current.inventory).toEqual([{ itemId: 'ring', count: 1 }])
    expect(ui.list).toEqual(['ring'])
    expect(ui.cursor).toBe(0)
    expect(ui.phase).toBe('list')
    expect(apply).toHaveBeenCalledTimes(2)
  })

  test('卖出网格三列步进钳边界，方向键不结算也不改世界', () => {
    const stock = Array.from({ length: 8 }, (_, index) => `stock${index}`)
    const ui = openShopUi('sell', stock)
    const current = world(90, [])
    const before = structuredClone(current)
    const apply = vi.fn()
    const items = Object.fromEntries(stock.map((id) => [id, item(id)])) satisfies ItemDataMap
    const input = (key: string) => shopInput(ui, new Set([key]), current, items, apply)
    for (const [key, expected] of [
      ['ArrowDown', 3],
      ['ArrowDown', 6],
      ['ArrowRight', 7],
      ['ArrowDown', 7],
      ['ArrowLeft', 6],
      ['ArrowUp', 3],
      ['ArrowUp', 0],
      ['ArrowLeft', 0],
    ] as const) {
      expect(input(key)).toBeUndefined()
      expect(ui.cursor).toBe(expected)
    }
    expect(current).toEqual(before)
    expect(apply).not.toHaveBeenCalled()
  })

  test('买入八行窗口只绘当前货品；预览持有数含背包与装备，确认覆盖复用同源卷轴', () => {
    const host = drawHost()
    const items: ItemDataMap = Object.fromEntries(
      Array.from({ length: 9 }, (_, index) => [`stock${index}`, item(`stock${index}`)]),
    )
    items.stock3!.icon = 'icon-ring'
    items.stock3!.equip = { slot: 'accessory', equipableBy: ['hero'], effects: [] }
    const ui = openShopUi('buy', Object.keys(items))
    ui.scrollTop = 1
    ui.cursor = 3
    ui.phase = 'confirm'
    ui.confirmYes = true
    const state = world(77, [{ itemId: 'stock3', count: 2 }])
    state.party[0]!.equipment.accessory = 'stock3'
    const before = structuredClone(state)
    drawShop(host.ctx, ui, state, items, host.assets, host.glyphs, 0, { no: '否', yes: '是' })
    expect(calls.box.mock.calls.map((args) => args.slice(1, 6))).toEqual([
      [host.assets.redBox, 122, 8, 190, 190],
      [host.assets.itembox, 40, 8, 64, 64],
    ])
    expect(
      calls.text.mock.calls
        .slice(0, 8)
        .map((args) => [args[1][0].text, args[2], args[3], args[4].forceRgba]),
    ).toEqual(
      Array.from({ length: 8 }, (_, index) => [
        `物品stock${index + 1}`,
        150,
        21 + index * 18,
        index === 2 ? [247, 231, 109] : [199, 186, 174],
      ]),
    )
    expect(calls.number.mock.calls.map((args) => [args[1], args[2], args[3]])).toEqual([
      ...Array.from({ length: 8 }, (_, index) => [50, 286, 26 + index * 18]),
      [3, 99, 115],
      [77, 99, 156],
    ])
    expect(host.drawImage).toHaveBeenCalledExactlyOnceWith(host.icon, 48, 15)
    expect(calls.scroll.mock.calls.map((args) => args.slice(1))).toEqual([
      [host.assets.scroll, 20, 100, 5],
      [host.assets.scroll, 20, 141, 5],
    ])
    expect(calls.confirm).toHaveBeenCalledExactlyOnceWith(
      host.ctx,
      host.assets.scroll,
      { leftText: '否', rightText: '是', rightSelected: true },
      host.glyphs,
      0,
    )
    expect(state).toEqual(before)
  })

  test('卖出先派发全屏无描述网格，再绘金钱/选中物售价；列表态不造确认框', () => {
    const host = drawHost()
    const items: ItemDataMap = { ring: item('ring', 11), potion: item('potion', 7) }
    const ui = openShopUi('sell', ['ring', 'potion'])
    ui.cursor = 1
    const state = world(90, [{ itemId: 'potion', count: 1 }])
    drawShop(host.ctx, ui, state, items, host.assets, host.glyphs, 120, { no: '否', yes: '是' })
    expect(calls.grid).toHaveBeenCalledExactlyOnceWith(
      host.ctx,
      [items.ring, items.potion],
      1,
      state,
      host.assets,
      host.glyphs,
      120,
      undefined,
      { noDesc: true },
    )
    expect(calls.scroll.mock.calls.map((args) => args.slice(1))).toEqual([
      [host.assets.scroll, 100, 150, 5],
      [host.assets.scroll, 224, 150, 5],
    ])
    expect(calls.text.mock.calls.map((args) => [args[1][0].text, args[2], args[3]])).toEqual([
      ['金钱', 110, 160],
      ['售价', 234, 160],
    ])
    expect(calls.number.mock.calls.map((args) => [args[1], args[2], args[3]])).toEqual([
      [90, 178, 165],
      [7, 302, 165],
    ])
    expect(calls.confirm).not.toHaveBeenCalled()
  })
})
