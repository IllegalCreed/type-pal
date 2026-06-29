import { initialWorld } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  closeEquipMenu,
  equipMoveCursor,
  equipSelected,
  openEquipMenu,
} from './equip-menu-state.js'

describe('装备菜单状态机', () => {
  test('openEquipMenu:列出可装物(土灵珠),cursor 0', () => {
    const s = openEquipMenu(initialWorld(), 'li-xiaoyao')
    expect(s.active).toBe(true)
    expect(s.items.map((i) => i.id)).toEqual(['267'])
    expect(s.cursor).toBe(0)
  })
  test('equipSelected:换装 → 新 world(土灵珠入槽)+ 列表重算(护腕)', () => {
    const w0 = initialWorld()
    const s0 = openEquipMenu(w0, 'li-xiaoyao')
    const { world, state } = equipSelected(s0, w0, 'li-xiaoyao')
    expect(world.party[0]?.equipment.accessory).toBe('267')
    expect(state.items.map((i) => i.id)).toEqual(['249']) // 护腕 换下、入列表
  })
  test('equipMoveCursor:越界 clamp 不动;空列表不崩', () => {
    const s = openEquipMenu(initialWorld(), 'li-xiaoyao')
    expect(equipMoveCursor(s, 'up').cursor).toBe(0)
    expect(equipMoveCursor({ ...s, items: [] }, 'down').cursor).toBe(0)
  })
  test('closeEquipMenu:active false', () => {
    expect(closeEquipMenu().active).toBe(false)
  })
})
