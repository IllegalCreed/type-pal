import { describe, expect, test } from 'vitest'
import { back, CLOSED, confirm, MAIN_MENU, moveCursor, openMenu, topLevel } from './menu-state.js'

describe('从记忆的光标打开主菜单', () => {
  test('非零记忆重开定位该项；合法末项保持；越界（正/负）归 0', () => {
    expect(topLevel(openMenu(2))?.cursor).toBe(2) // 记忆 = 物品
    expect(topLevel(openMenu(MAIN_MENU.length - 1))?.cursor).toBe(MAIN_MENU.length - 1)
    expect(topLevel(openMenu(MAIN_MENU.length))?.cursor).toBe(0) // 超界归 0
    expect(topLevel(openMenu(-1))?.cursor).toBe(0) // 负值归 0
    // 记忆定位的语义正确性：cursor=2 确实指向 item 节点
    expect(topLevel(openMenu(2))?.nodes[2]?.id).toBe('item')
  })
})

describe('物品级联菜单的回退与隔离', () => {
  test('物品→使用子菜单→退回父层：完整 stack、父 cursor 保持、原始状态不可变', () => {
    const start = openMenu(2) // 记忆在物品
    const startSnapshot = structuredClone(start)
    let s = confirm(start) // 进物品子菜单
    expect(s.stack).toHaveLength(2)
    s = moveCursor(s, 1) // 子菜单选使用
    expect(topLevel(s)?.cursor).toBe(1)
    s = confirm(s) // 开 use panel
    expect(s.openPanel).toBe('use')
    s = back(s) // 关 panel 回子菜单
    expect(s.openPanel).toBeUndefined()
    s = back(s) // 弹栈回主菜单
    expect(s.stack).toHaveLength(1)
    // 父层 cursor 保持在物品（记忆不被子菜单导航破坏）
    expect(topLevel(s)?.cursor).toBe(2)
    expect(start).toEqual(startSnapshot)
  })
  test('一份菜单移动到使用时，另一份菜单仍确认装备', () => {
    const first = confirm(openMenu(2))
    const second = confirm(openMenu(2))
    expect(confirm(moveCursor(first, 1)).openPanel).toBe('use')
    expect(topLevel(second)?.cursor).toBe(0)
    expect(confirm(second).openPanel).toBe('equip')
  })
})

describe('关闭与重开隔离', () => {
  test('单层 back 关菜单 = CLOSED 常量；重开不污染 CLOSED；关闭态导航不变', () => {
    const s = back(openMenu(1))
    expect(s).toBe(CLOSED) // 关闭返回共享常量（同引用）
    expect(s.active).toBe(false)
    const reopened = openMenu(0)
    expect(reopened.active).toBe(true)
    expect(CLOSED.active).toBe(false) // CLOSED 未被重开污染
    expect(CLOSED.stack).toEqual([])
    // 关闭态上导航/确认不再转移（无末层 → 原样返回）
    expect(moveCursor(CLOSED, 1)).toBe(CLOSED)
    expect(confirm(CLOSED)).toBe(CLOSED)
  })
})
