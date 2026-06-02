/**
 * 商店买 / 卖菜单测试 — sdlpal uigame.c:1615 PAL_BuyMenu / 1755 PAL_SellMenu 真值。
 * 含状态机单测 + opcode 0x0026 → 开菜单 → 买 → 关 → 续跑脚本 的端到端集成测试。
 */
import type { Command, InputSnapshot, AbstractKey, Item, ItemFlags } from '@type-pal/shared'
import { beforeEach, describe, expect, it } from 'vitest'
import { createCommandBus } from '../command-bus.js'
import { createInitialGameState, type GameState } from '../game-state.js'
import {
  buildLabelMap, tickEventSystem, setShopMenuHandler, addItemToInventory,
  OP_BUY_MENU,
} from '../event-system.js'
import { openMenu, tickMenu } from './menu-mode.js'
import { dispatchMenuInput, setMenuCatalogs } from './menu-driver.js'
import {
  createBuyMenu,
  shopCancel, shopConfirm, shopMoveDown, shopSelectItem,
} from './shop-menu.js'
import { createSellMenu } from './sell-menu.js'

function snap(pressed: AbstractKey[] = []): InputSnapshot {
  return { held: new Set(), pressed: new Set(pressed), frameNum: 0 }
}

function loadEvent(gs: GameState, commands: Command[]): void {
  gs.eventCursor = { commands, labelMap: buildLabelMap(commands), ip: 0 }
  gs.mode = 'event'
}

function flags(over: Partial<ItemFlags> = {}): ItemFlags {
  return {
    usable: false, equipable: false, throwable: false, consuming: false,
    applyToAll: false, sellable: false, equipableBy: [false, false, false, false, false, false],
    ...over,
  } as ItemFlags
}

function mkItem(id: number, price: number, over: Partial<Item> = {}): Item {
  return {
    id, _name: `item${id}`, bitmap: id, price,
    scriptOnUse: 0, scriptOnEquip: 0, scriptOnThrow: 0, scriptDesc: 0,
    flags: flags(), ...over,
  }
}

// 曾伯 store(operand[0]=1)真值 = [87,99,105,95,90](2026-05-29 stores.json 验证)
const CATALOG: Item[] = [
  mkItem(87, 100), mkItem(99, 200), mkItem(105, 50, { flags: flags({ sellable: true }) }),
]

describe('shop-menu 状态机(sdlpal uigame.c:1615/1755)', () => {
  it('createBuyMenu:list = 店铺物品,label=名,rightText=原价', () => {
    const s = createBuyMenu(CATALOG)
    expect(s.mode).toBe('buy')
    expect(s.phase).toBe('list')
    expect(s.list.items.map((i) => i.id)).toEqual([87, 99, 105])
    expect(s.list.items[0]!.rightText).toBe('100')
  })

  it('shopSelectItem 买得起 → 进 confirm,默认 No(sdlpal PAL_ConfirmMenu nDefault=0)', () => {
    const s = createBuyMenu(CATALOG)
    const entered = shopSelectItem(s, CATALOG, 1000)
    expect(entered).toBe(true)
    expect(s.phase).toBe('confirm')
    expect(s.selectedItemId).toBe(87)
    expect(s.confirmYes).toBe(false)
  })

  it('shopSelectItem 买不起(price>cash)→ 不进 confirm,留 list(sdlpal uigame.c:1683)', () => {
    const s = createBuyMenu(CATALOG)
    const entered = shopSelectItem(s, CATALOG, 50) // item87 价 100 > 50
    expect(entered).toBe(false)
    expect(s.phase).toBe('list')
  })

  it('confirm 阶段方向键 toggle yes/no;shopConfirm 返回意图 + 回 list', () => {
    const s = createBuyMenu(CATALOG)
    shopSelectItem(s, CATALOG, 1000)
    shopMoveDown(s) // toggle → yes
    expect(s.confirmYes).toBe(true)
    const r = shopConfirm(s)
    expect(r).toEqual({ itemId: 87, mode: 'buy', yes: true })
    expect(s.phase).toBe('list') // 回 list 继续买
  })

  it('shopCancel:confirm → back(回 list);list → close(关商店)', () => {
    const s = createBuyMenu(CATALOG)
    shopSelectItem(s, CATALOG, 1000)
    expect(shopCancel(s)).toBe('back')
    expect(s.phase).toBe('list')
    expect(shopCancel(s)).toBe('close')
  })
})

describe('shop opcode 0x0026 端到端(开菜单 → 买 → 关 → 续跑脚本)', () => {
  let gs: GameState

  beforeEach(() => {
    setMenuCatalogs({ items: CATALOG, spells: [], magics: [], playerRoles: { roles: [] } as never })
    // 模拟 bootstrap 的 setShopMenuHandler:buy 开 shop-buy 菜单
    setShopMenuHandler(({ gs: g, mode }) => {
      if (mode === 'buy') openMenu(g, { kind: 'shop-buy', state: createBuyMenu(CATALOG) })
      else openMenu(g, { kind: 'shop-sell', state: createSellMenu(g, CATALOG) })
    })
    gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.dwCash = 1000
  })

  it('0x0026 → 开 shop-buy menu + waiting=shop + mode=menu + ip 续到下条', () => {
    loadEvent(gs, [
      { op: 'raw', opcode: OP_BUY_MENU, operands: [1, 0, 0] }, // ip0
      { op: 'raw', opcode: 0x100, operands: [0, 0, 0] },       // ip1(随便后续 op)
      { op: 'end' },
    ])
    tickEventSystem(gs, snap(), createCommandBus())
    expect(gs.mode).toBe('menu')
    expect(gs.menuStack[0]?.kind).toBe('shop-buy')
    expect(gs.eventCursor?.waiting).toBe('shop')
    expect(gs.eventCursor?.ip).toBe(1) // 已 ip++(菜单关后从此续)
  })

  it('买 1 个:Confirm 选 → Confirm 买 → cash 扣 + item 入包', () => {
    loadEvent(gs, [{ op: 'raw', opcode: OP_BUY_MENU, operands: [1, 0, 0] }, { op: 'end' }])
    tickEventSystem(gs, snap(), createCommandBus())
    // list:Confirm 选 item87(价 100)→ 进 confirm(默认 No)
    dispatchMenuInput(gs, snap(['Confirm']), createCommandBus())
    const st = gs.menuStack[0]!.state as { phase: string; confirmYes: boolean }
    expect(st.phase).toBe('confirm')
    // toggle 到 Yes 再 Confirm
    dispatchMenuInput(gs, snap(['Down']), createCommandBus())
    dispatchMenuInput(gs, snap(['Confirm']), createCommandBus())
    expect(gs.dwCash).toBe(900) // 1000 - 100
    expect(gs.inventory.find((e) => e.itemId === 87)?.count).toBe(1)
    expect(st.phase).toBe('list') // 留在菜单可继续买(sdlpal while loop)
  })

  it('关商店(list 阶段 Menu)→ menuStack 空 → resume mode=event 续跑脚本', () => {
    loadEvent(gs, [{ op: 'raw', opcode: OP_BUY_MENU, operands: [1, 0, 0] }, { op: 'end' }])
    tickEventSystem(gs, snap(), createCommandBus())
    // list 阶段 Menu → 关菜单;同一 tickMenu 的 post-dispatch 检栈空 → resume mode=event
    tickMenu(gs, snap(['Menu']), createCommandBus())
    expect(gs.menuStack.length).toBe(0)
    expect(gs.mode).toBe('event') // waiting='shop' → 续跑脚本(非 explore)
    expect(gs.eventCursor?.waiting).toBeUndefined()
  })

  it('买不起(cash<price)→ Confirm 无反应,留 list(sdlpal uigame.c:1683)', () => {
    gs.dwCash = 50 // 全部商品都买不起(最低 100)
    loadEvent(gs, [{ op: 'raw', opcode: OP_BUY_MENU, operands: [1, 0, 0] }, { op: 'end' }])
    tickEventSystem(gs, snap(), createCommandBus())
    dispatchMenuInput(gs, snap(['Confirm']), createCommandBus())
    const st = gs.menuStack[0]!.state as { phase: string }
    expect(st.phase).toBe('list') // 没进 confirm
    expect(gs.dwCash).toBe(50)    // 没扣钱
  })

  it('卖 1 个:cash += price/2 + item 出包', () => {
    gs.inventory = [{ itemId: 105, count: 2 }] // 105 可卖,价 50 → 售 25
    addItemToInventory // (touch import)
    openMenu(gs, { kind: 'shop-sell', state: createSellMenu(gs, CATALOG) })
    dispatchMenuInput(gs, snap(['Confirm']), createCommandBus()) // 选 105
    dispatchMenuInput(gs, snap(['Down']), createCommandBus())     // toggle Yes
    dispatchMenuInput(gs, snap(['Confirm']), createCommandBus())  // 卖
    expect(gs.dwCash).toBe(1025) // 1000 + 25
    expect(gs.inventory.find((e) => e.itemId === 105)?.count).toBe(1)
  })
})
