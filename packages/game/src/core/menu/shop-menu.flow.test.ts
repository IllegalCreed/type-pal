import type { AbstractKey, Command, InputSnapshot } from '@type-pal/shared'
import { afterEach, assert, beforeEach, describe, expect, it } from 'vitest'
import { buildLabelMap, OP_BUY_MENU, setShopMenuHandler, tickEventSystem } from '../event-system.js'
import { createInitialGameState, type GameState } from '../game-state.js'
import { buyFlowItems } from './__tests__/trading-fixture.js'
import { dispatchMenuInput, setMenuCatalogs } from './menu-driver.js'
import { openMenu, tickMenu } from './menu-mode.js'
import { createSellMenu } from './sell-menu.js'
import { createBuyMenu } from './shop-menu.js'

function inputSnapshot(pressed: AbstractKey[] = []): InputSnapshot {
  return { held: new Set(), pressed: new Set(pressed), frameNum: 0 }
}
function loadEvent(gs: GameState, commands: Command[]): void {
  gs.eventCursor = { commands, labelMap: buildLabelMap(commands), ip: 0 }
  gs.mode = 'event'
}
describe('Shop script and transaction flow', () => {
  let gs: GameState
  let buyMenu: ReturnType<typeof createBuyMenu> | undefined

  beforeEach(() => {
    setMenuCatalogs({ items: buyFlowItems, spells: [], magics: [], playerRoles: { roles: [] } })
    // 模拟 bootstrap 的 setShopMenuHandler:buy 开 shop-buy 菜单
    setShopMenuHandler(({ gs: g, mode }) => {
      if (mode === 'buy') {
        buyMenu = createBuyMenu(buyFlowItems)
        openMenu(g, { kind: 'shop-buy', state: buyMenu })
      } else openMenu(g, { kind: 'shop-sell', state: createSellMenu(g, buyFlowItems) })
    })
    gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.dwCash = 1000
  })

  it('0x0026 → 开 shop-buy menu + waiting=shop + mode=menu + ip 续到下条', () => {
    loadEvent(gs, [
      { op: 'raw', opcode: OP_BUY_MENU, operands: [1, 0, 0] }, // ip0
      { op: 'end' },
    ])
    tickEventSystem(gs, inputSnapshot())
    expect(gs.mode).toBe('menu')
    expect(gs.menuStack[0]?.kind).toBe('shop-buy')
    expect(gs.eventCursor?.waiting).toBe('shop')
    expect(gs.eventCursor?.ip).toBe(1) // 已 ip++(菜单关后从此续)
  })

  it('买 1 个:Confirm 选 → Confirm 买 → cash 扣 + item 入包', () => {
    loadEvent(gs, [{ op: 'raw', opcode: OP_BUY_MENU, operands: [1, 0, 0] }, { op: 'end' }])
    tickEventSystem(gs, inputSnapshot())
    // list:Confirm 选 item87(价 100)→ 进 confirm(默认 No)
    dispatchMenuInput(gs, inputSnapshot(['Confirm']))
    assert(buyMenu, 'buy handler must create its state')
    const st = buyMenu
    expect(gs.menuStack[0]?.state).toBe(st)
    expect(st.phase).toBe('confirm')
    // toggle 到 Yes 再 Confirm
    dispatchMenuInput(gs, inputSnapshot(['Down']))
    dispatchMenuInput(gs, inputSnapshot(['Confirm']))
    expect(gs.dwCash).toBe(900) // 1000 - 100
    expect(gs.inventory.find((e) => e.itemId === 87)?.count).toBe(1)
    expect(st.phase).toBe('list') // 留在菜单可继续买(sdlpal while loop)
  })

  it('关商店(list 阶段 Menu)→ menuStack 空 → resume mode=event 续跑脚本', () => {
    loadEvent(gs, [{ op: 'raw', opcode: OP_BUY_MENU, operands: [1, 0, 0] }, { op: 'end' }])
    tickEventSystem(gs, inputSnapshot())
    // list 阶段 Menu → 关菜单;同一 tickMenu 的 post-dispatch 检栈空 → resume mode=event
    tickMenu(gs, inputSnapshot(['Menu']))
    expect(gs.menuStack.length).toBe(0)
    expect(gs.mode).toBe('event') // waiting='shop' → 续跑脚本(非 explore)
    expect(gs.eventCursor?.waiting).toBeUndefined()
  })

  it('买不起(cash<price)→ Confirm 无反应,留 list(sdlpal uigame.c:1683)', () => {
    gs.dwCash = 50 // 当前首项item87价格100，不能确认；目录中其它商品不参与本次选中门
    loadEvent(gs, [{ op: 'raw', opcode: OP_BUY_MENU, operands: [1, 0, 0] }, { op: 'end' }])
    tickEventSystem(gs, inputSnapshot())
    dispatchMenuInput(gs, inputSnapshot(['Confirm']))
    assert(buyMenu, 'buy handler must create its state')
    const st = buyMenu
    expect(gs.menuStack[0]?.state).toBe(st)
    expect(st.phase).toBe('list') // 没进 confirm
    expect(gs.dwCash).toBe(50) // 没扣钱
  })

  it('卖 1 个:cash += price/2 + item 出包', () => {
    gs.inventory = [{ itemId: 105, count: 2 }] // 105 可卖,价 50 → 售 25
    openMenu(gs, { kind: 'shop-sell', state: createSellMenu(gs, buyFlowItems) })
    dispatchMenuInput(gs, inputSnapshot(['Confirm'])) // 选 105
    dispatchMenuInput(gs, inputSnapshot(['Down'])) // toggle Yes
    dispatchMenuInput(gs, inputSnapshot(['Confirm'])) // 卖
    expect(gs.dwCash).toBe(1025) // 1000 + 25
    expect(gs.inventory.find((e) => e.itemId === 105)?.count).toBe(1)
  })
  afterEach(() => {
    buyMenu = undefined
    setShopMenuHandler(null)
    setMenuCatalogs({ items: [], spells: [], magics: [], playerRoles: { roles: [] } })
  })
})
