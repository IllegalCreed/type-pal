import { describe, expect, test } from 'vitest'
import { back, confirm, MAIN_ITEMS, moveCursor, openMenu } from './menu-state.js'

describe('菜单状态机', () => {
  test('开菜单 = main + cursor 0', () => {
    const s = openMenu()
    expect(s.active).toBe(true)
    expect(s.menu).toBe('main')
    expect(s.cursor).toBe(0)
  })
  test('moveCursor 环绕(上下选)', () => {
    let s = openMenu()
    s = moveCursor(s, -1) // 上:0 → 末项(环绕)
    expect(s.cursor).toBe(MAIN_ITEMS.length - 1)
    s = moveCursor(s, 1) // 下:回 0
    expect(s.cursor).toBe(0)
  })
  test('确认「状态」(enabled) → 进 status 子菜单', () => {
    let s = openMenu() // cursor 0 = 状态(MAIN_ITEMS[0])
    s = confirm(s)
    expect(s.menu).toBe('status')
  })
  test('确认占位项(disabled) → 不进、停留 main', () => {
    let s = openMenu()
    const itemIdx = MAIN_ITEMS.findIndex((m) => !m.enabled)
    s = { ...s, cursor: itemIdx }
    s = confirm(s)
    expect(s.menu).toBe('main') // 占位不进
  })
  test('子菜单 back → 回 main;main back → 关菜单', () => {
    let s = confirm(openMenu()) // → status
    s = back(s)
    expect(s.menu).toBe('main')
    s = back(s)
    expect(s.active).toBe(false) // 关
  })
})
