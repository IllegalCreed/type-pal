/** TEST-GLM-WAVE-O-1 O08：equipItem 装备流与资源键合同残余。
 *  旧证：item.test.ts:397-449 覆盖装备形象/授予技/useItem 消耗；本卡按 gap-map 直击
 *  未覆盖臂：equipItem 四拒绝前置（无 equip 块/无队员/模板不匹配/不在包）、
 *  旧件回包、worldResourceValue 键域、curePoison 显式 id 装备侧轴。
 */
import { describe, expect, test } from 'vitest'
import type { ItemData, ItemDataMap } from '@type-pal/content'
import { equipItem, resolveWorldItemUse, worldResourceValue } from './item.js'
import {
  item as makeItem,
  world,
} from './__tests__/glm-item-logic-fixtures.js'

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
    const total = second.inventory.filter((e) => e.itemId === 'bead').reduce((n, e) => n + e.count, 0)
    expect(total).toBe(1)
  })

  test('物品无 equip 块 → 原引用返回', () => {
    const items: ItemDataMap = { plain: makeItem({ id: 'plain', name: '无装备块' }) }
    const base = world([{ itemId: 'plain', count: 1 }])
    expect(equipItem(base, 'hero', 'plain', items)).toBe(base)
  })

  test('caster 不在 party → 原引用返回', () => {
    const items: ItemDataMap = { bead: equipItemDef() }
    const base = world([{ itemId: 'bead', count: 1 }])
    expect(equipItem(base, 'ghost', 'bead', items)).toBe(base)
  })

  test('模板不匹配 equipableBy → 原引用返回', () => {
    const items: ItemDataMap = {
      bead: equipItemDef({ equip: { slot: 'accessory', equipableBy: ['other'], effects: [] } }),
    }
    const base = world([{ itemId: 'bead', count: 1 }])
    expect(equipItem(base, 'hero', 'bead', items)).toBe(base)
  })

  test('背包没有该件（count=0）→ 原引用返回', () => {
    const items: ItemDataMap = { bead: equipItemDef() }
    const base = world([])
    expect(equipItem(base, 'hero', 'bead', items)).toBe(base)
  })

  test('未知物品 id → 原引用返回', () => {
    const base = world([{ itemId: 'bead', count: 1 }])
    expect(equipItem(base, 'hero', 'ghost', {})).toBe(base)
  })
})

describe('O08 worldResourceValue：键域合同', () => {
  test('空/纯空格资源键 fail-loud；collectValue 缺省 0', () => {
    expect(() => worldResourceValue(world([]), '')).toThrow('资源键不能为空')
    expect(() => worldResourceValue(world([]), '  ')).toThrow('资源键不能为空')
    expect(worldResourceValue(world([]), 'collectValue')).toBe(0)
  })

  test('resources 键缺省 0；已设值读取', () => {
    const w = world([])
    expect(worldResourceValue(w, 'herb')).toBe(0)
    w.resources = { herb: 7 }
    expect(worldResourceValue(w, 'herb')).toBe(7)
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
