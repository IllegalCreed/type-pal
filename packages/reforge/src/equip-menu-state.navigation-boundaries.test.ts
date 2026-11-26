import { describe, expect, test } from 'vitest'
import { multiItems, multiWorld } from './__tests__/glm-runtime-contract-fixtures.js'
import {
  equipBackToList,
  equipConfirmItem,
  equipMoveCursor,
  openEquipMenu,
} from './equip-menu-state.js'

describe('装备网格的方向导航', () => {
  test('5 项/3 列：末行不满；↑↓±3、←→±1，越界吸附首/尾不环绕', () => {
    const world = multiWorld()
    const s = openEquipMenu(world, 'hero-a', multiItems())
    expect(s.items.map((i) => i.id)).toEqual(['w-1', 'w-2', 'w-3', 'a-1', 'b-1'])
    let cur = s.cursor
    cur = equipMoveCursor({ ...s, cursor: cur }, 'down').cursor
    expect(cur).toBe(3) // 0 + 3
    cur = equipMoveCursor({ ...s, cursor: cur }, 'down').cursor
    expect(cur).toBe(4) // 吸附尾项
    cur = equipMoveCursor({ ...s, cursor: cur }, 'right').cursor
    expect(cur).toBe(4) // 尾项吸附
    cur = equipMoveCursor({ ...s, cursor: cur }, 'left').cursor
    expect(cur).toBe(3)
    cur = equipMoveCursor({ ...s, cursor: cur }, 'up').cursor
    expect(cur).toBe(0)
    cur = equipMoveCursor({ ...s, cursor: cur }, 'left').cursor
    expect(cur).toBe(0) // 首项吸附
    // 首尾及跨行选择的实际 itemId 正确
    expect(s.items[equipMoveCursor({ ...s, cursor: 0 }, 'down').cursor]?.id).toBe('a-1')
    expect(s.items[equipMoveCursor({ ...s, cursor: 3 }, 'up').cursor]?.id).toBe('w-1')
  })
})

describe('取消选择穿戴者', () => {
  test('确认只记选中进 pick-role 不换装；返回重读背包重置阶段/光标；传入 world 全程不变', () => {
    const world = multiWorld()
    const items = multiItems()
    const worldSnapshot = structuredClone(world)
    const s0 = openEquipMenu(world, 'hero-a', items) // s0 由真正传入的 world 构造
    const s1 = equipConfirmItem(s0)
    expect(s1.phase).toBe('pick-role')
    expect(s1.selectedItemId).toBe('w-1')
    // pick-role 阶段导航不动
    expect(equipMoveCursor(s1, 'down')).toBe(s1)
    // 返回 list：重算列表（消费 world）、光标归 0、清选中
    const afterInventoryChange = {
      ...world,
      inventory: world.inventory.filter(({ itemId }) => itemId !== 'a-1'),
    }
    const afterSnapshot = structuredClone(afterInventoryChange)
    const s2 = equipBackToList(s1, afterInventoryChange, items)
    expect(s2.phase).toBe('list')
    expect(s2.selectedItemId).toBeUndefined()
    expect(s2.cursor).toBe(0)
    expect(s2.items.map((i) => i.id)).toEqual(['w-1', 'w-2', 'w-3', 'b-1'])
    expect(afterInventoryChange).toEqual(afterSnapshot)
    // 最后一次消费 world 的调用之后比较：真正传入的对象未被污染
    expect(world).toEqual(worldSnapshot)
  })
})

describe('装备列表的队伍资格', () => {
  test('列表包含所有在队角色可装件；party 外角色 → 空列表；传入 world 不变', () => {
    const world = multiWorld()
    const worldSnapshot = structuredClone(world)
    const forB = openEquipMenu(world, 'hero-b', multiItems())
    expect(forB.items.map((i) => i.id)).toEqual(['w-1', 'w-2', 'w-3', 'a-1', 'b-1'])
    expect(forB.casterId).toBe('hero-b')
    const empty = openEquipMenu(world, 'nobody', multiItems())
    expect(empty.items).toEqual([])
    expect(empty.cursor).toBe(0)
    expect(world).toEqual(worldSnapshot)
  })
})
