/**
 * TEST-GLM-PHASE1-LEAVES-3 L01（item-select.ts）— 去重表：
 *  - __tests__/item-magic-select.test（equip/potion/battle 菜单级过滤、buy/sell/inventory rightText 主干）→ 不重复
 *  - item-select 无独立 boundaries 文件（targets.json existingTestPointers 为空）。
 *  - 新差异：matchesFilter 直接真值表补 potion 否决位 / battle 三分支 / important / sellable、
 *    库存含目录外 itemId 剔除、缺 _name 回退 item#id、空库存、pageSize 覆写、
 *    sell 奇数价 floor、数据层恒可选（过滤不命中留渲染层着色，不在建表期禁用）。
 * 第一阶段锚：sdlpal itemmenu.c:380 / play.c:266 / uigame.c:1777（item-select.ts 注释）。
 */
import type { Item } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { createItemSelectMenu, matchesFilter } from './item-select.js'

function mkItem(id: number, name: string | undefined, flags: Partial<Item['flags']>): Item {
  return {
    id,
    _name: name,
    bitmap: 0,
    price: 100,
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
      sellable: false,
      equipableBy: [false, false, false, false, false, false],
      ...flags,
    },
  }
}

describe('L01 matchesFilter 直接真值表（菜单级未覆盖的分支）', () => {
  const cases = {
    plain: mkItem(1, '白板', {}),
    equipOnly: mkItem(2, '木剑', { equipable: true }),
    usableOnly: mkItem(3, '观音符', { usable: true }),
    usableEquip: mkItem(4, '风灵珠', { usable: true, equipable: true }),
    throwableOnly: mkItem(5, '梅花镖', { throwable: true }),
    usableConsuming: mkItem(6, '草药', { usable: true, consuming: true }),
    throwableConsuming: mkItem(7, '飞镖', { throwable: true, consuming: true }),
    importantStory: mkItem(8, '剧情玉', { sellable: false }),
    sellableEquip: mkItem(9, '卖价装备', { equipable: true, sellable: true }),
  } satisfies Record<string, Item>

  it('potion = usable 且非装备非投掷：装备位/投掷位各自否决', () => {
    expect(matchesFilter(cases.usableOnly, 'potion')).toBe(true)
    expect(matchesFilter(cases.usableEquip, 'potion')).toBe(false) // equipable 否决
    expect(matchesFilter(cases.usableConsuming, 'potion')).toBe(true)
    expect(matchesFilter(cases.throwableOnly, 'potion')).toBe(false) // throwable 否决（即使非 usable）
  })

  it('battle = throwable 或 (usable 且 consuming)：三分支各一', () => {
    expect(matchesFilter(cases.throwableOnly, 'battle')).toBe(true) // throwable 单独命中
    expect(matchesFilter(cases.throwableConsuming, 'battle')).toBe(true)
    expect(matchesFilter(cases.usableConsuming, 'battle')).toBe(true) // usable+consuming 命中
    expect(matchesFilter(cases.usableOnly, 'battle')).toBe(false) // 只 usable 不算战斗道具
    expect(matchesFilter(cases.equipOnly, 'battle')).toBe(false)
  })

  it('important = 非 sellable 且非 equipable；sellable 直接按标志', () => {
    expect(matchesFilter(cases.importantStory, 'important')).toBe(true)
    expect(matchesFilter(cases.plain, 'important')).toBe(true) // 白板：非卖非装备（fixture 默认双 false）
    expect(matchesFilter(cases.sellableEquip, 'important')).toBe(false) // equipable 否决
    expect(matchesFilter(cases.usableConsuming, 'important')).toBe(true) // 可用草药非卖 → 本判定也归 important
    expect(matchesFilter(cases.sellableEquip, 'sellable')).toBe(true)
    expect(matchesFilter(cases.importantStory, 'sellable')).toBe(false)
    expect(matchesFilter(cases.plain, 'all')).toBe(true) // all 与 flags 无关
  })
})

describe('L01 createItemSelectMenu 建表合同', () => {
  const catalog: Item[] = [
    mkItem(10, '草药', { usable: true, consuming: true }),
    mkItem(11, '木剑', { equipable: true }),
  ]

  it('库存条目 itemId 不在目录 → 剔除（find undefined 分支）', () => {
    const s = createItemSelectMenu({
      inventory: [
        { itemId: 10, count: 1 },
        { itemId: 999, count: 3 }, // 目录外
      ],
      items: catalog,
      filter: 'all',
      mode: 'inventory',
    })
    expect(s.items.map((i) => i.id)).toEqual([10])
  })

  it('目录项缺 _name → label 回退 item#<id>（_name 可选合法输入）', () => {
    const s = createItemSelectMenu({
      inventory: [{ itemId: 12, count: 1 }],
      items: [mkItem(12, undefined, { usable: true })],
      filter: 'all',
      mode: 'inventory',
    })
    expect(s.items[0]?.label).toBe('item#12')
  })

  it('空库存 → 空表 cursor 0；pageSize 覆写进 state', () => {
    const empty = createItemSelectMenu({
      inventory: [],
      items: catalog,
      filter: 'all',
      mode: 'inventory',
    })
    expect(empty.items).toEqual([])
    expect(empty.cursor).toBe(0)
    const paged = createItemSelectMenu({
      inventory: [{ itemId: 10, count: 1 }],
      items: catalog,
      filter: 'all',
      mode: 'inventory',
      pageSize: 2,
    })
    expect(paged.pageSize).toBe(2)
    expect(paged.pageOffset).toBe(0)
  })

  it('sell 模式卖价 = floor(price/2)：奇数价向下取整（itemmenu.c price/2 真值）', () => {
    const odd = mkItem(13, '半价剑', { equipable: true })
    odd.price = 99
    const s = createItemSelectMenu({
      inventory: [{ itemId: 13, count: 2 }],
      items: [odd],
      filter: 'all',
      mode: 'sell',
    })
    expect(s.items[0]?.rightText).toBe('×2  $49')
  })

  it('建表期按 filter 过滤（区别于全显示的 fullscreen InventoryMenu）；列入项恒 disabled=false', () => {
    const s = createItemSelectMenu({
      inventory: [
        { itemId: 10, count: 1 },
        { itemId: 11, count: 1 },
      ],
      items: catalog,
      filter: 'potion', // 木剑(11) 不命中 → 建表期剔除
      mode: 'inventory',
    })
    expect(s.items.map((i) => i.id)).toEqual([10])
    // M5 简版合同：建出的菜单项全部可选；MP/占用级别的禁用由各调用方菜单负责
    expect(s.items[0]?.disabled).toBe(false)
  })
})
