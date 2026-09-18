/**
 * TEST-REFORGE-RUNTIME-CONTRACTS-1 B1-B3：装备菜单两阶段导航与角色过滤（equip-menu-state.ts）。
 * 用合法多物品背包经真实 openEquipMenu 构造列表；旧 equip-menu-state.test.ts:57 已有单项
 * 向上/空表/pick-role 不动轴，本文件补多行网格 clamp、阶段往返与多角色过滤，不重复。
 * 不变性：快照并比较的就是**真正传入** openEquipMenu/equipBackToList 的同一 world 对象。
 */
import { describe, expect, test } from 'vitest'
import { deepSnapshot, multiItems, multiWorld } from './__tests__/glm-runtime-contract-fixtures.js'
import {
  EQUIP_GRID_COLS,
  equipBackToList,
  equipConfirmItem,
  equipMoveCursor,
  openEquipMenu,
} from './equip-menu-state.js'

/** hero-a 可装 4 件：w-1 w-2 w-3 a-1（3 列网格 → 第二行只有 1 项）。 */

describe('B1 装备列表四方向真实 clamp', () => {
  test('4 项/3 列：末行不满；↑↓±3、←→±1，越界吸附首/尾不环绕', () => {
    const world = multiWorld()
    const s = openEquipMenu(world, 'hero-a', multiItems())
    expect(s.items.map((i) => i.id)).toEqual(['w-1', 'w-2', 'w-3', 'a-1'])
    expect(s.items.length % EQUIP_GRID_COLS).not.toBe(0) // 末行不满
    let cur = s.cursor
    cur = equipMoveCursor({ ...s, cursor: cur }, 'down').cursor
    expect(cur).toBe(3) // 0 + 3
    cur = equipMoveCursor({ ...s, cursor: cur }, 'down').cursor
    expect(cur).toBe(3) // 吸附尾项
    cur = equipMoveCursor({ ...s, cursor: cur }, 'right').cursor
    expect(cur).toBe(3) // 尾项吸附
    cur = equipMoveCursor({ ...s, cursor: cur }, 'left').cursor
    expect(cur).toBe(2)
    cur = equipMoveCursor({ ...s, cursor: cur }, 'up').cursor
    expect(cur).toBe(0)
    cur = equipMoveCursor({ ...s, cursor: cur }, 'left').cursor
    expect(cur).toBe(0) // 首项吸附
    // 首尾及跨行选择的实际 itemId 正确
    expect(s.items[equipMoveCursor({ ...s, cursor: 0 }, 'down').cursor]?.id).toBe('a-1')
    expect(s.items[equipMoveCursor({ ...s, cursor: 3 }, 'up').cursor]?.id).toBe('w-1')
  })
})

describe('B2 list→pick-role→返回 阶段往返', () => {
  test('确认只记选中进 pick-role 不换装；返回重读背包重置阶段/光标；传入 world 全程不变', () => {
    const world = multiWorld()
    const items = multiItems()
    const worldSnapshot = deepSnapshot(world)
    const s0 = openEquipMenu(world, 'hero-a', items) // s0 由真正传入的 world 构造
    const s1 = equipConfirmItem(s0)
    expect(s1.phase).toBe('pick-role')
    expect(s1.selectedItemId).toBe('w-1')
    // pick-role 阶段导航不动
    expect(equipMoveCursor(s1, 'down')).toBe(s1)
    // 返回 list：重算列表（消费 world）、光标归 0、清选中
    const s2 = equipBackToList(s1, world, items)
    expect(s2.phase).toBe('list')
    expect(s2.selectedItemId).toBeUndefined()
    expect(s2.cursor).toBe(0)
    expect(s2.items.map((i) => i.id)).toEqual(['w-1', 'w-2', 'w-3', 'a-1'])
    // 最后一次消费 world 的调用之后比较：真正传入的对象未被污染
    expect(world).toEqual(worldSnapshot)
  })
})

describe('B3 多角色合法装备过滤', () => {
  test('hero-b 只见自己的可装件（稳定身份对照）；party 外角色 → 空列表；传入 world 不变', () => {
    const world = multiWorld()
    const worldSnapshot = deepSnapshot(world)
    const forB = openEquipMenu(world, 'hero-b', multiItems())
    expect(forB.items.map((i) => i.id)).toEqual(['b-1']) // 稳定 id 身份，非位置
    const forA = openEquipMenu(world, 'hero-a', multiItems())
    expect(forA.items.map((i) => i.id)).not.toContain('b-1')
    expect(forB.items.map((i) => i.id)).not.toContain('w-1')
    const empty = openEquipMenu(world, 'nobody', multiItems())
    expect(empty.items).toEqual([])
    expect(empty.cursor).toBe(0)
    expect(world).toEqual(worldSnapshot)
  })
})
