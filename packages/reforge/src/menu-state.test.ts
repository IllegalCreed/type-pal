import { describe, expect, test } from 'vitest'
import { back, confirm, MAIN_MENU, moveCursor, openMenu, topLevel } from './menu-state.js'

describe('多级菜单(树 + 级联栈)', () => {
  test('openMenu:主菜单单层,cursor 0', () => {
    const s = openMenu()
    expect(s.active).toBe(true)
    expect(s.stack).toHaveLength(1)
    expect(topLevel(s)?.cursor).toBe(0)
    expect(topLevel(s)?.nodes).toBe(MAIN_MENU)
    expect(s.openPanel).toBeUndefined()
  })
  test('moveCursor 末层环绕', () => {
    expect(topLevel(moveCursor(openMenu(), -1))?.cursor).toBe(MAIN_MENU.length - 1)
  })
  test('confirm 叶子(状态)→ 开 panel', () => {
    expect(confirm(openMenu()).openPanel).toBe('status') // cursor0 = 状态
  })
  test('confirm 子菜单(物品)→ 压栈级联,不开 panel', () => {
    const s = confirm(moveCursor(openMenu(), 2)) // idx2 = 物品(有 children)
    expect(s.stack).toHaveLength(2)
    expect(topLevel(s)?.nodes.map((n) => n.id)).toEqual(['equip', 'use'])
    expect(s.openPanel).toBeUndefined()
  })
  test('子菜单选装备 → 开 equip panel', () => {
    const sub = confirm(moveCursor(openMenu(), 2))
    expect(confirm(sub).openPanel).toBe('equip') // 子菜单 cursor0 = 装备
  })
  test('back:面板→关面板 / 多层→弹栈 / 单层→关', () => {
    let s = confirm(confirm(moveCursor(openMenu(), 2))) // 物品→装备 panel(2 层 + panel)
    expect(s.openPanel).toBe('equip')
    s = back(s)
    expect(s.openPanel).toBeUndefined()
    expect(s.stack).toHaveLength(2) // 回子菜单
    s = back(s)
    expect(s.stack).toHaveLength(1) // 弹栈回主菜单
    s = back(s)
    expect(s.active).toBe(false) // 单层 → 关
  })
  test('disabled 叶子(系统)不开 panel', () => {
    expect(confirm(moveCursor(openMenu(), 3)).openPanel).toBeUndefined() // idx3 = 系统(disabled)
  })
  test('面板打开时 moveCursor/confirm 不动', () => {
    const open = confirm(openMenu()) // status panel
    expect(moveCursor(open, 1)).toBe(open)
    expect(confirm(open)).toBe(open)
  })
})
