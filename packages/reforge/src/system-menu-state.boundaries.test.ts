import { describe, expect, test } from 'vitest'
import {
  closeSystemMenu,
  openSystemMenu,
  systemConfirm,
  systemConfirmYes,
  systemMoveCursor,
  systemSwitchCommit,
  systemToggleConfirm,
} from './system-menu-state.js'

describe('系统面板选项边界', () => {
  test('left/up 同为 -1、right/down 同为 +1；首尾环绕', () => {
    const first = openSystemMenu()
    const last = openSystemMenu(4)
    expect(systemMoveCursor(first, 'up').cursor).toBe(4)
    expect(systemMoveCursor(first, 'left').cursor).toBe(4)
    expect(systemMoveCursor(last, 'down').cursor).toBe(0)
    expect(systemMoveCursor(last, 'right').cursor).toBe(0)
  })

  test('恢复系统面板记录的选项并夹在首尾之间', () => {
    expect(openSystemMenu(3).cursor).toBe(3)
    expect(openSystemMenu(99).cursor).toBe(4)
    expect(openSystemMenu(-1).cursor).toBe(0)
  })

  test('弹出退出或音频子面板后，底层选项不再接收方向和确认', () => {
    const quit = systemConfirm(openSystemMenu(4)).state
    const audio = systemConfirm(openSystemMenu(2)).state
    for (const view of [quit, audio]) {
      expect(systemMoveCursor(view, 'down')).toBe(view)
      expect(systemConfirm(view)).toEqual({ state: view })
    }
  })

  test('底层选项不会被当作退出或开关的确认回答', () => {
    const menu = openSystemMenu()
    expect(systemToggleConfirm(menu)).toBe(menu)
    expect(systemConfirmYes(menu)).toEqual({ state: menu })
    expect(systemSwitchCommit(menu)).toEqual({ state: menu })
  })

  test('关闭的系统面板没有可移动或确认的选项', () => {
    const closed = closeSystemMenu()
    expect(closed).toEqual({
      active: false,
      phase: 'menu',
      items: [],
      cursor: 0,
      confirmYes: false,
    })
    expect(systemMoveCursor(closed, 'down')).toBe(closed)
    expect(systemConfirm(closed)).toEqual({ state: closed })
  })
})
