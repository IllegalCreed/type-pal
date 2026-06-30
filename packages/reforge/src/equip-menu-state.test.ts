import { DEMO_ITEMS, initialWorld } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  closeEquipMenu,
  equipApply,
  equipBackToList,
  equipConfirmItem,
  equipMoveCursor,
  openEquipMenu,
} from './equip-menu-state.js'

describe('装备菜单状态机', () => {
  test('openEquipMenu:list 阶段,列出可装物(土灵珠),cursor 0', () => {
    const s = openEquipMenu(initialWorld(), 'li-xiaoyao', DEMO_ITEMS)
    expect(s.active).toBe(true)
    expect(s.phase).toBe('list')
    expect(s.items.map((i) => i.id)).toEqual(['267'])
    expect(s.cursor).toBe(0)
  })
  test('equipConfirmItem:list → pick-role,记下选中物(不换)', () => {
    const s0 = openEquipMenu(initialWorld(), 'li-xiaoyao', DEMO_ITEMS)
    const s1 = equipConfirmItem(s0)
    expect(s1.phase).toBe('pick-role')
    expect(s1.selectedItemId).toBe('267')
  })
  test('equipApply:满槽换装 → 留 pick-role + 选中变换下的旧件(可空格来回切换对比)', () => {
    const w0 = initialWorld() // 手饰=护腕(249),背包=土灵珠(267)
    const s1 = equipConfirmItem(openEquipMenu(w0, 'li-xiaoyao', DEMO_ITEMS)) // 选 267
    const { world, state } = equipApply(s1, w0, DEMO_ITEMS)
    expect(world.party[0]?.equipment.accessory).toBe('267') // 土灵珠入槽
    expect(state.phase).toBe('pick-role') // 满槽 → 留面板续换
    expect(state.selectedItemId).toBe('249') // 选中变护腕(换下的)
    const r2 = equipApply(state, world, DEMO_ITEMS) // 再 Space → 换回
    expect(r2.world.party[0]?.equipment.accessory).toBe('249')
    expect(r2.state.selectedItemId).toBe('267')
  })
  test('equipApply:空槽换装 → 回 list(原版 wLastUnequippedItem==0)', () => {
    const w0 = initialWorld()
    const world = {
      ...w0,
      party: w0.party.map((c, i) =>
        i === 0 ? { ...c, equipment: { ...c.equipment, accessory: '' } } : c,
      ),
    }
    const s1 = equipConfirmItem(openEquipMenu(world, 'li-xiaoyao', DEMO_ITEMS))
    const r = equipApply(s1, world, DEMO_ITEMS)
    expect(r.world.party[0]?.equipment.accessory).toBe('267')
    expect(r.state.phase).toBe('list') // 空槽 → 回 list
  })
  test('equipBackToList:pick-role → list(重算背包),清选中', () => {
    const w0 = initialWorld()
    const s1 = equipConfirmItem(openEquipMenu(w0, 'li-xiaoyao', DEMO_ITEMS))
    const s2 = equipBackToList(s1, w0, DEMO_ITEMS)
    expect(s2.phase).toBe('list')
    expect(s2.selectedItemId).toBeUndefined()
  })
  test('equipMoveCursor:list 越界 clamp 不动;空列表不崩;pick-role 不动', () => {
    const s = openEquipMenu(initialWorld(), 'li-xiaoyao', DEMO_ITEMS)
    expect(equipMoveCursor(s, 'up').cursor).toBe(0)
    expect(equipMoveCursor({ ...s, items: [] }, 'down').cursor).toBe(0)
    expect(equipMoveCursor(equipConfirmItem(s), 'down').phase).toBe('pick-role')
  })
  test('closeEquipMenu:active false', () => {
    expect(closeEquipMenu().active).toBe(false)
  })
})
