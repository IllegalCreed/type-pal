/** Input-to-transaction wiring for buying/selling and script resume. Pure menu-state tests retain their own contracts. */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setGlobalEvents, tickEventSystem } from '../event-system.js'
import type { GameState } from '../game-state.js'
import { dispatchMenuInput, setMenuCatalogs } from './menu-driver.js'
import {
  createMenuGameState,
  defaultMenuCatalogs,
  menuInput,
  menuItem,
  menuRoleRecords,
} from './menu-driver.test-fixtures.js'
import { tickMenu } from './menu-mode.js'
import { openMenu } from './menu-stack.js'
import { createSellMenu } from './sell-menu.js'
import { createBuyMenu } from './shop-menu.js'

beforeEach(() => setMenuCatalogs(defaultMenuCatalogs()))
afterEach(() => {
  setGlobalEvents([])
})
describe('商店买菜单(shop-buy)', () => {
  const items = [
    menuItem(105, { price: 10, _name: '止血草' }),
    menuItem(106, { price: 999, _name: '贵物' }),
  ]

  function openBuy(gs: GameState): ReturnType<typeof createBuyMenu> {
    setMenuCatalogs({ items, spells: [], magics: [], playerRoles: menuRoleRecords() })
    const s = createBuyMenu(items)
    openMenu(gs, { kind: 'shop-buy', state: s })
    return s
  }

  it('list:Up/Left 上移、Down/Right 下移、买不起 Confirm 留 list、Menu 关店', () => {
    const gs = createMenuGameState()
    gs.dwCash = 50
    const s = openBuy(gs)
    dispatchMenuInput(gs, menuInput(['Down']))
    expect(s.list.cursor).toBe(1)
    dispatchMenuInput(gs, menuInput(['Up']))
    expect(s.list.cursor).toBe(0)
    // 贵物买不起:光标移到 1 后 Confirm 无反应
    dispatchMenuInput(gs, menuInput(['Down']))
    dispatchMenuInput(gs, menuInput(['Confirm']))
    expect(s.phase).toBe('list')
    // Menu 关店
    dispatchMenuInput(gs, menuInput(['Menu']))
    expect(gs.menuStack).toHaveLength(0)
  })

  it('商店列表左右导航，余额充足时确认进入购买确认', () => {
    const gs = createMenuGameState()
    gs.dwCash = 50
    const s = openBuy(gs)
    dispatchMenuInput(gs, menuInput(['Right']))
    expect(s.list.cursor).toBe(1)
    dispatchMenuInput(gs, menuInput(['Left']))
    expect(s.list.cursor).toBe(0)
    dispatchMenuInput(gs, menuInput(['Confirm']))
    expect(s.phase).toBe('confirm')
  })

  it('confirm:方向 toggle 到 是;Menu 回 list;Confirm 是 → 扣钱+入库', () => {
    const gs = createMenuGameState()
    gs.dwCash = 50
    const s = openBuy(gs)
    dispatchMenuInput(gs, menuInput(['Confirm']))
    expect(s.confirmYes).toBe(false)
    // Menu 回 list
    dispatchMenuInput(gs, menuInput(['Menu']))
    expect(s.phase).toBe('list')
    // 再进 confirm,Down → yes
    dispatchMenuInput(gs, menuInput(['Confirm']))
    dispatchMenuInput(gs, menuInput(['Down']))
    expect(s.confirmYes).toBe(true)
    dispatchMenuInput(gs, menuInput(['Confirm']))
    expect(gs.dwCash).toBe(40)
    expect(gs.inventory).toEqual([{ itemId: 105, count: 1 }])
    expect(s.phase).toBe('list')
  })

  it('confirm:Up/Left 也 toggle;Confirm 否 → 不交易', () => {
    const gs = createMenuGameState()
    gs.dwCash = 50
    const s = openBuy(gs)
    dispatchMenuInput(gs, menuInput(['Confirm']))
    dispatchMenuInput(gs, menuInput(['Up'])) // 竖排两框 toggle
    expect(s.confirmYes).toBe(true)
    dispatchMenuInput(gs, menuInput(['Left']))
    expect(s.confirmYes).toBe(false)
    dispatchMenuInput(gs, menuInput(['Confirm']))
    expect(gs.dwCash).toBe(50)
    expect(gs.inventory).toEqual([])
  })

  it('confirm 期间钱变少(price>cash)→ 交易被拒(applyShopTransaction 再判)', () => {
    const gs = createMenuGameState()
    gs.dwCash = 50
    const s = openBuy(gs)
    dispatchMenuInput(gs, menuInput(['Confirm']))
    dispatchMenuInput(gs, menuInput(['Down']))
    expect(s.confirmYes).toBe(true)
    gs.dwCash = 5 // confirm 期间钱被花掉
    dispatchMenuInput(gs, menuInput(['Confirm']))
    expect(gs.dwCash).toBe(5)
    expect(gs.inventory).toEqual([])
  })
})
describe('商店卖菜单(shop-sell)', () => {
  // 导航需要 11 个不同物品；真实
  // addItemToInventory 按 id 合并（inventory-state.ts），同 id 重复 push 不是生产库存形态。
  const items = [
    menuItem(105, { price: 10, flags: { sellable: true }, _name: '可卖' }),
    menuItem(106, { price: 10, flags: { sellable: false }, _name: '不可卖' }),
    ...Array.from({ length: 9 }, (_, i) =>
      menuItem(107 + i, { price: 10, flags: { sellable: true }, _name: `可卖${12 + i}` }),
    ),
  ]

  function openSell(gs: GameState): ReturnType<typeof createSellMenu> {
    setMenuCatalogs({ items, spells: [], magics: [], playerRoles: menuRoleRecords() })
    const s = createSellMenu(gs, items)
    openMenu(gs, { kind: 'shop-sell', state: s })
    return s
  }

  function stocked(gs: GameState): void {
    gs.inventory = [
      { itemId: 105, count: 2 },
      { itemId: 106, count: 1 },
    ]
  }

  it('list:8 键导航 + PgUp/PgDn/Home/End 精确落点 + Menu 关店(11 条库存,列宽 3)', () => {
    const gs = createMenuGameState()
    stocked(gs)
    for (let i = 0; i < 9; i++) gs.inventory.push({ itemId: 107 + i, count: 1 }) // 11 条不同 id(0..10)
    const s = openSell(gs)
    dispatchMenuInput(gs, menuInput(['Down']))
    expect(s.grid.cursor).toBe(3) // Down = +INV_ITEMS_PER_LINE(3)
    dispatchMenuInput(gs, menuInput(['Right']))
    expect(s.grid.cursor).toBe(4)
    dispatchMenuInput(gs, menuInput(['Left']))
    expect(s.grid.cursor).toBe(3)
    dispatchMenuInput(gs, menuInput(['Up']))
    expect(s.grid.cursor).toBe(0)
    dispatchMenuInput(gs, menuInput(['End']))
    expect(s.grid.cursor).toBe(10) // 末条
    dispatchMenuInput(gs, menuInput(['Home']))
    expect(s.grid.cursor).toBe(0)
    dispatchMenuInput(gs, menuInput(['PgDn']))
    expect(s.grid.cursor).toBe(10) // +21 越界钳到末条
    dispatchMenuInput(gs, menuInput(['PgUp']))
    expect(s.grid.cursor).toBe(0)
    dispatchMenuInput(gs, menuInput(['Menu']))
    expect(gs.menuStack).toHaveLength(0)
  })

  it('不可卖物 Confirm 留 list;可卖 Confirm → confirm,方向 toggle + Menu 回 list', () => {
    const gs = createMenuGameState()
    stocked(gs)
    const s = openSell(gs)
    dispatchMenuInput(gs, menuInput(['Down'])) // 到不可卖物
    dispatchMenuInput(gs, menuInput(['Confirm']))
    expect(s.phase).toBe('list')
    dispatchMenuInput(gs, menuInput(['Up']))
    dispatchMenuInput(gs, menuInput(['Confirm']))
    expect(s.phase).toBe('confirm')
    dispatchMenuInput(gs, menuInput(['Right']))
    expect(s.confirmYes).toBe(true)
    dispatchMenuInput(gs, menuInput(['Menu']))
    expect(s.phase).toBe('list')
  })

  it('confirm 是 → 卖 1 个:+floor(price/2) 钱、库存刷新;否 → 不动', () => {
    const gs = createMenuGameState()
    gs.dwCash = 0
    stocked(gs)
    const s = openSell(gs)
    dispatchMenuInput(gs, menuInput(['Confirm']))
    dispatchMenuInput(gs, menuInput(['Down'])) // yes
    dispatchMenuInput(gs, menuInput(['Confirm']))
    expect(gs.dwCash).toBe(5)
    expect(gs.inventory[0]!.count).toBe(1)
    // 回 confirm 再选否
    dispatchMenuInput(gs, menuInput(['Confirm']))
    expect(s.phase).toBe('confirm')
    dispatchMenuInput(gs, menuInput(['Confirm'])) // 默认 No
    expect(gs.dwCash).toBe(5)
    expect(gs.inventory[0]!.count).toBe(1)
  })
})
describe('商店脚本恢复', () => {
  const shopItems = [menuItem(105, { price: 10 })]

  function openShopWithScript(): GameState {
    setMenuCatalogs({ items: shopItems, spells: [], magics: [], playerRoles: menuRoleRecords() })
    setGlobalEvents([
      { op: 'end', label: 'L_0' },
      { op: 'raw', opcode: 0x1e, operands: [77, 0, 0] }, // 商店后续指令(resume oracle)
      { op: 'end', label: 'L_2' },
    ])
    const gs = createMenuGameState()
    gs.dwCash = 50
    gs.mode = 'event'
    gs.eventCursor = { ip: 1, waiting: 'shop' }
    openMenu(gs, { kind: 'shop-buy', state: createBuyMenu(shopItems) })
    expect(gs.mode).toBe('menu')
    return gs
  }

  it('shop 菜单关闭 → resumeAfterMenusClosed 清 shop 等待并切回 event 续跑脚本', () => {
    const gs = openShopWithScript()

    dispatchMenuInput(gs, menuInput(['Menu'])) // 关店 → 栈空
    expect(gs.menuStack).toHaveLength(0)
    tickMenu(gs, menuInput()) // 栈空 → resumeAfterMenusClosed
    expect(gs.eventCursor?.waiting).toBeUndefined()
    expect(gs.mode).toBe('event')
    tickEventSystem(gs, menuInput()) // 续跑 ip1 → 0x1E +77
    expect(gs.dwCash).toBe(127)
  })
})
