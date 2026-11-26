import { describe, expect, test } from 'vitest'
import {
  closeEquipMenu,
  equipApply,
  equipBackToList,
  equipConfirmItem,
  equipMoveCursor,
  openEquipMenu,
} from './equip-menu-state.js'
import { makeTestItems, makeTestWorld } from './test-fixtures.js'

describe('装备选择和换装', () => {
  test('只列背包中可穿戴且有库存的物品', () => {
    const world = makeTestWorld()
    const items = makeTestItems()
    const list = openEquipMenu(world, 'li-xiaoyao', items)
    expect(list).toMatchObject({ active: true, phase: 'list', cursor: 0 })
    expect(list.items.map(({ id }) => id)).toEqual(['267'])
    expect(openEquipMenu({ ...world, inventory: [] }, 'li-xiaoyao', items).items).toEqual([])
  })

  test('满槽换装后可以在同一面板换回旧装备', () => {
    const world = makeTestWorld()
    const items = makeTestItems()
    const itemSelected = equipConfirmItem(openEquipMenu(world, 'li-xiaoyao', items))
    const applied = equipApply(itemSelected, world, items)
    expect(applied.world.party[0]?.equipment.accessory).toBe('267')
    expect(applied.state).toMatchObject({ phase: 'pick-role', selectedItemId: '249' })
    expect(applied.world.inventory.find(({ itemId }) => itemId === '249')?.count).toBe(1)
    const restored = equipApply(applied.state, applied.world, items)
    expect(restored.world.party[0]?.equipment.accessory).toBe('249')
    expect(restored.state.selectedItemId).toBe('267')
  })

  test('装入空槽后返回已更新的背包列表', () => {
    const previous = makeTestWorld()
    const world = {
      ...previous,
      party: previous.party.map((member) => {
        const { accessory: _removed, ...equipment } = member.equipment
        return { ...member, equipment }
      }),
    }
    const items = makeTestItems()
    const selected = equipConfirmItem(openEquipMenu(world, 'li-xiaoyao', items))
    const applied = equipApply(selected, world, items)
    expect(applied.world.party[0]?.equipment.accessory).toBe('267')
    expect(applied.state).toMatchObject({ phase: 'list', items: [], cursor: 0 })
    expect(applied.state.selectedItemId).toBeUndefined()
  })

  test('打开空列表后移动和确认都不会选中装备', () => {
    const world = { ...makeTestWorld(), inventory: [] }
    const menu = openEquipMenu(world, 'li-xiaoyao', makeTestItems())
    expect(equipMoveCursor(menu, 'down')).toBe(menu)
    expect(equipConfirmItem(menu)).toBe(menu)
  })

  test('关闭装备面板会丢弃候选和穿戴者选择', () => {
    expect(closeEquipMenu()).toEqual({
      active: false,
      phase: 'list',
      items: [],
      cursor: 0,
      casterId: '',
    })
  })

  test('列表态忽略选人步骤的应用和返回请求', () => {
    const world = makeTestWorld()
    const items = makeTestItems()
    const menu = openEquipMenu(world, 'li-xiaoyao', items)
    expect(equipApply(menu, world, items)).toEqual({ world, state: menu })
    expect(equipBackToList(menu, world, items)).toBe(menu)
  })
})
