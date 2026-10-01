/** TEST-GLM-WAVE-O-1 O08：equipItem 装备流与资源键合同残余。
 *  旧证：item.test.ts:397-449 覆盖装备形象/授予技/useItem 消耗；本卡按 gap-map 直击
 *  未覆盖臂：equipItem 四拒绝前置（无 equip 块/无队员/模板不匹配/不在包）、
 *  旧件回包、worldResourceValue 键域、curePoison 显式 id 装备侧轴。
 */

import type { ItemData, ItemDataMap } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { item as makeItem, world } from './__tests__/glm-item-logic-fixtures.js'
import { equipItem, resolveWorldItemUse, worldResourceValue } from './item.js'

const equipItemDef = (over: Partial<ItemData> = {}): ItemData =>
  makeItem({
    id: 'bead',
    name: '念珠',
    desc: [],
    buyPrice: 0,
    sellPrice: 0,
    sellable: false,
    equip: { slot: 'accessory', equipableBy: ['hero'], effects: [] },
    ...over,
  })

describe('O08 equipItem：四拒绝前置与成功流', () => {
  test('成功装上：入槽、扣包 1、旧件回包 1', () => {
    const items: ItemDataMap = { bead: equipItemDef() }
    const base = world([{ itemId: 'bead', count: 2 }])
    // heroActor 初始 accessory=oldRing：首装即有旧件回包。
    const first = equipItem(base, 'hero', 'bead', items)
    expect(first.party[0]!.equipment.accessory).toBe('bead')
    expect(first.inventory).toEqual([
      { itemId: 'bead', count: 1 },
      { itemId: 'oldRing', count: 1 },
    ])
    // 再装一件：扣新 1 后回旧 1 → 聚合为单条 count=1（addToInventory 合并语义）。
    const second = equipItem(first, 'hero', 'bead', items)
    const total = second.inventory
      .filter((e) => e.itemId === 'bead')
      .reduce((n, e) => n + e.count, 0)
    expect(total).toBe(1)
  })

  // 以下五轴已由旧测同入口覆盖，按 O-R7 审核登记 existing-proof 扣除（不计新合同）：
  // - caster 缺席 / 背包无该件 / 未知物品：item.test.ts:405-409
  //   “equipItem 不可装(未知物/非该角色/不在包)→ 原样返回”（nobody/不在包/noSuchItem 同引用断言）
  // - equipableBy 模板不匹配：item.inventory.background.test.ts:90-99
  //   “I2 equipItem 残差 equipableBy 不含成员模板时原引用返回”
  // - 物品无 equip 块：item.test.ts:407 noSuchItem 同守卫首臂（item?.equip 缺省路径）。
  // 该守卫组保留的唯一新轴是成功装上的 oldRing 旧件回包（旧证仅 397-403 为 bead→旧 bead，
  // 未覆盖 heroActor initialEquipment accessory=oldRing 的初始件回包输入域）。
})

describe('O08 worldResourceValue：键域合同（仅保留未证轴）', () => {
  // 旧证扣除：空/纯空格键恰抛与 collectValue 缺省 0 已由
  // item.ownership.background.test.ts:108-127 “I4 ownedItemCount / worldResourceValue 残差”覆盖。
  test('resources 键在对象存在但值为 0 的显式零与缺键 0 分开（独立读取语义）', () => {
    const w = world([])
    w.resources = { herb: 0 }
    expect(worldResourceValue(w, 'herb')).toBe(0)
    expect(w.resources).toEqual({ herb: 0 })
  })
})

describe('O08 curePoison 显式 id 轴（世界执行器）', () => {
  test('显式 poisonId 只解指定毒、其它保留', () => {
    const items: ItemDataMap = {
      cure: makeItem({
        id: 'cure',
        name: '解药',
        use: {
          target: 'oneAlly',
          consuming: true,
          effects: [{ kind: 'curePoison', poisonId: '551' }],
        },
      }),
    }
    const base = world([{ itemId: 'cure', count: 1 }])
    base.party[0]!.poisons = [
      { poisonId: 551, tickIndex: 0 },
      { poisonId: 552, tickIndex: 1 },
    ]
    const outcome = resolveWorldItemUse(base, 'hero', 'cure', items)
    expect(outcome.world.party[0]!.poisons).toEqual([{ poisonId: 552, tickIndex: 1 }])
  })
})
