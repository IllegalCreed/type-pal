/**
 * TEST-GLM-PHASE1-LEAVES-3 L05（shop-menu.ts）— 去重表：
 *  - shop-menu.test（列表/买得起门/confirm toggle/意图返回/cancel 分层/0x0026 调用链）→ 不重复
 *  - shop-menu.boundaries.test（cash===price 恰等/差 1/空列表/No 意图收尾/零副作用）→ 不重复
 *  - 新差异：缺 _name 的 label 回退 ?id、pageSize 固定 8、错相 shopSelectItem 零请求、
 *    买目录缺 item 的 no-op（!item 分支）、list 相 shopConfirm null。
 * 只测状态机意图；cash 扣/入包由 dispatcher 做（现有 event 调用链测试已证，不重复）。
 */
import type { Item } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { createBuyMenu, shopConfirm, shopSelectItem } from './shop-menu.js'

function mkItem(id: number, price: number, name: string | undefined): Item {
  return {
    id,
    _name: name,
    bitmap: 0,
    price,
    scriptOnUse: 0,
    scriptOnEquip: 0,
    scriptOnThrow: 0,
    scriptDesc: 0,
    flags: {
      usable: false,
      equipable: false,
      throwable: false,
      consuming: false,
      applyToAll: false,
      sellable: true,
      equipableBy: [false, false, false, false, false, false],
    },
  }
}

describe('L05 shop-menu 剩余合同', () => {
  it('缺 _name 的店铺物品 → label 回退 ?<id>；买菜单 pageSize 固定 8', () => {
    const s = createBuyMenu([mkItem(400, 50, undefined)])
    expect(s.list.items[0]?.label).toBe('?400')
    expect(s.list.items[0]?.rightText).toBe('50')
    expect(s.list.pageSize).toBe(8)
    expect(s.mode).toBe('buy')
  })

  it('错相 shopSelectItem 零请求；买目录缺该 item → no-op 留 list', () => {
    const items = [mkItem(401, 10, '草药')]
    const s = createBuyMenu(items)
    // 直造 confirm 相（防御分支可达性同 boundaries 惯例）
    s.phase = 'confirm'
    expect(shopSelectItem(s, items, 999)).toBe(false)
    s.phase = 'list'
    s.list.items[0]!.id = 777 // 光标项不在目录（find undefined 分支）
    expect(shopSelectItem(s, items, 999)).toBe(false)
    expect(s.phase).toBe('list')
    expect(s.selectedItemId).toBeUndefined()
  })

  it('list 相 shopConfirm → null（未进 confirm 无意图）', () => {
    expect(shopConfirm(createBuyMenu([]))).toBeNull()
  })
})
