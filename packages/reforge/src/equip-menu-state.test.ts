import { initialWorld } from '@type-pal/content'
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
    const s = openEquipMenu(initialWorld(), 'li-xiaoyao')
    expect(s.active).toBe(true)
    expect(s.phase).toBe('list')
    expect(s.items.map((i) => i.id)).toEqual(['267'])
    expect(s.cursor).toBe(0)
  })
  test('equipConfirmItem:list → pick-role,记下选中物(不换)', () => {
    const s0 = openEquipMenu(initialWorld(), 'li-xiaoyao')
    const s1 = equipConfirmItem(s0)
    expect(s1.phase).toBe('pick-role')
    expect(s1.selectedItemId).toBe('267')
  })
  test('equipApply:pick-role 换上 → 新 world(土灵珠入槽)+ 回 list 重算(护腕入列表)', () => {
    const w0 = initialWorld()
    const s1 = equipConfirmItem(openEquipMenu(w0, 'li-xiaoyao'))
    const { world, state } = equipApply(s1, w0)
    expect(world.party[0]?.equipment.accessory).toBe('267')
    expect(state.phase).toBe('list')
    expect(state.items.map((i) => i.id)).toEqual(['249']) // 护腕 换下、入列表
  })
  test('equipBackToList:pick-role → list,清选中', () => {
    const s1 = equipConfirmItem(openEquipMenu(initialWorld(), 'li-xiaoyao'))
    const s2 = equipBackToList(s1)
    expect(s2.phase).toBe('list')
    expect(s2.selectedItemId).toBeUndefined()
  })
  test('equipMoveCursor:list 越界 clamp 不动;空列表不崩;pick-role 不动', () => {
    const s = openEquipMenu(initialWorld(), 'li-xiaoyao')
    expect(equipMoveCursor(s, 'up').cursor).toBe(0)
    expect(equipMoveCursor({ ...s, items: [] }, 'down').cursor).toBe(0)
    expect(equipMoveCursor(equipConfirmItem(s), 'down').phase).toBe('pick-role')
  })
  test('closeEquipMenu:active false', () => {
    expect(closeEquipMenu().active).toBe(false)
  })
})
