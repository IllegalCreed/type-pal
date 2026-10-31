import { describe, expect, it } from 'vitest'
import { inventoryItem } from './__tests__/inventory-fixture.js'
import { affordabilityItems, buyFlowItems } from './__tests__/trading-fixture.js'
import {
  createBuyMenu,
  shopCancel,
  shopConfirm,
  shopMoveDown,
  shopMoveUp,
  shopSelectItem,
} from './shop-menu.js'

describe('Buy menu state and affordability', () => {
  describe('Purchase selection, confirmation and cancel', () => {
    it('createBuyMenu:list = 店铺物品,label=名,rightText=原价', () => {
      const menu = createBuyMenu(buyFlowItems)
      expect(menu.mode).toBe('buy')
      expect(menu.phase).toBe('list')
      expect(menu.list.items.map((i) => i.id)).toEqual([87, 99, 105])
      expect(menu.list.items[0]!.rightText).toBe('100')
    })

    it('shopSelectItem 买得起 → 进 confirm,默认 No(sdlpal PAL_ConfirmMenu nDefault=0)', () => {
      const menu = createBuyMenu(buyFlowItems)
      const entered = shopSelectItem(menu, buyFlowItems, 1000)
      expect(entered).toBe(true)
      expect(menu.phase).toBe('confirm')
      expect(menu.selectedItemId).toBe(87)
      expect(menu.confirmYes).toBe(false)
    })

    it('shopSelectItem 买不起(price>cash)→ 不进 confirm,留 list(sdlpal uigame.c:1683)', () => {
      const menu = createBuyMenu(buyFlowItems)
      const entered = shopSelectItem(menu, buyFlowItems, 50) // item87 价 100 > 50
      expect(entered).toBe(false)
      expect(menu.phase).toBe('list')
    })

    it('confirm 阶段方向键 toggle yes/no;shopConfirm 返回意图 + 回 list', () => {
      const menu = createBuyMenu(buyFlowItems)
      shopSelectItem(menu, buyFlowItems, 1000)
      shopMoveDown(menu) // toggle → yes
      expect(menu.confirmYes).toBe(true)
      const r = shopConfirm(menu)
      expect(r).toEqual({ itemId: 87, mode: 'buy', yes: true })
      expect(menu.phase).toBe('list') // 回 list 继续买
    })

    it('shopCancel:confirm → back(回 list);list → close(关商店)', () => {
      const menu = createBuyMenu(buyFlowItems)
      shopSelectItem(menu, buyFlowItems, 1000)
      expect(shopCancel(menu)).toBe('back')
      expect(menu.phase).toBe('list')
      expect(shopCancel(menu)).toBe('close')
    })
  })
  describe('Affordability and catalog ownership', () => {
    it('cash===price 恰等可进 confirm；差 1 拒绝；空列表拒绝', () => {
      const state = createBuyMenu(affordabilityItems)
      state.list.cursor = 0
      expect(shopSelectItem(state, affordabilityItems, 150)).toBe(true) // 恰等
      expect(state.phase).toBe('confirm')
      expect(state.selectedItemId).toBe(105)
      expect(shopConfirm(state)).toEqual({ itemId: 105, mode: 'buy', yes: false })
      expect(state.phase).toBe('list')
      expect(state.selectedItemId).toBeUndefined()

      state.list.cursor = 0
      expect(shopSelectItem(state, affordabilityItems, 149)).toBe(false) // 差 1
      expect(state.phase).toBe('list')

      expect(shopSelectItem(createBuyMenu([]), [], 999)).toBe(false)
    })
    it('confirm 期方向键 toggle；确认后 No 意图与收尾；cancel 分层；状态机零副作用', () => {
      const state = createBuyMenu(affordabilityItems)
      const catalogBefore = structuredClone(affordabilityItems)
      state.list.cursor = 1
      shopSelectItem(state, affordabilityItems, 500)
      shopMoveUp(state) // confirm 期 toggle → yes
      expect(state.confirmYes).toBe(true)
      shopMoveUp(state) // 再 toggle → no
      expect(state.confirmYes).toBe(false)
      expect(shopConfirm(state)).toEqual({ itemId: 110, mode: 'buy', yes: false })
      // cancel 分层：confirm → back；list → close
      state.list.cursor = 0
      shopSelectItem(state, affordabilityItems, 500)
      expect(shopCancel(state)).toBe('back')
      expect(shopCancel(state)).toBe('close')
      // 纯状态机：多次进出 confirm 后 items 目录与列表内容不变
      expect(affordabilityItems).toEqual(catalogBefore)
      expect(state.list.items.map((entry) => entry.rightText)).toEqual(['150', '200'])
    })
  })
  describe('List metadata and defensive requests', () => {
    it('缺 _name 的店铺物品 → label 回退 ?<id>；买菜单 pageSize 固定 8', () => {
      const menu = createBuyMenu([
        {
          ...inventoryItem(105, { bitmap: 0, price: 50, flags: { sellable: true } }),
          _name: undefined,
        },
      ])
      expect(menu.list.items[0]?.label).toBe('?105')
      expect(menu.list.items[0]?.rightText).toBe('50')
      expect(menu.list.pageSize).toBe(8)
      expect(menu.mode).toBe('buy')
    })

    it('错相 shopSelectItem 零请求；买目录缺该 item → no-op 留 list', () => {
      const items = [
        inventoryItem(106, { name: '草药', bitmap: 0, price: 10, flags: { sellable: true } }),
      ]
      const menu = createBuyMenu(items)
      // 直造 confirm 相（防御分支可达性同 boundaries 惯例）
      menu.phase = 'confirm'
      expect(shopSelectItem(menu, items, 999)).toBe(false)
      menu.phase = 'list'
      menu.list.items[0]!.id = 777 // 光标项不在目录（find undefined 分支）
      expect(shopSelectItem(menu, items, 999)).toBe(false)
      expect(menu.phase).toBe('list')
      expect(menu.selectedItemId).toBeUndefined()
    })

    it('list 相 shopConfirm → null（未进 confirm 无意图）', () => {
      expect(shopConfirm(createBuyMenu([]))).toBeNull()
    })
  })
})
