/**
 * TEST-GLM-STATE-COMMANDS-1 A02：system-menu-state 残差
 * 去重：system-menu-state.test.ts 10+ 例、system-menu-state.boundaries.test.ts E5–E6 已证
 * 基础导航/确认/开关/quit——本文件只补冻结池内：空列表导航、cursor 越界确认 no-op、
 * menu 阶段 toggle no-op、switchCommit 无 switchTarget、confirmYes 非 confirm 阶段、
 * items 引用同一性、closeSystemMenu 完整对象。
 */
import { describe, expect, test } from 'vitest'
import {
  closeSystemMenu,
  openSystemMenu,
  SYSTEM_ITEMS,
  type SystemMenuState,
  systemConfirm,
  systemConfirmYes,
  systemMoveCursor,
  systemSwitchCommit,
  systemToggleConfirm,
} from './system-menu-state.js'

describe('A02 system-menu-state 残差', () => {
  test('空列表导航：同引用不变', () => {
    const s: SystemMenuState = {
      active: true,
      phase: 'menu',
      items: [],
      cursor: 0,
      confirmYes: false,
    }
    const result = systemMoveCursor(s, 'down')
    expect(result).toBe(s)
  })

  test('cursor 越界确认：同引用无 action', () => {
    const s: SystemMenuState = {
      active: true,
      phase: 'menu',
      items: SYSTEM_ITEMS,
      cursor: 99,
      confirmYes: false,
    }
    const { state, action } = systemConfirm(s)
    expect(state).toBe(s)
    expect(action).toBeUndefined()
  })

  test('menu 阶段 toggleConfirm：同引用不变', () => {
    const s = openSystemMenu()
    const result = systemToggleConfirm(s)
    expect(result).toBe(s)
  })

  test('switchCommit 无 switchTarget：同引用不变', () => {
    const s: SystemMenuState = {
      active: true,
      phase: 'switch',
      items: SYSTEM_ITEMS,
      cursor: 0,
      confirmYes: false,
    }
    const result = systemSwitchCommit(s)
    expect(result.state).toBe(s)
    expect(result.action).toBeUndefined()
  })

  test('confirmYes 非 confirm 阶段：同引用不变', () => {
    const menuState = openSystemMenu()
    const r1 = systemConfirmYes(menuState)
    expect(r1.state).toBe(menuState)
    expect(r1.action).toBeUndefined()
  })

  test('SYSTEM_ITEMS 引用同一性及 label 值', () => {
    const s = openSystemMenu()
    expect(s.items).toBe(SYSTEM_ITEMS)
    expect(SYSTEM_ITEMS.map((i) => i.label)).toEqual([
      'menu.system.save',
      'menu.system.load',
      'menu.system.music',
      'menu.system.sound',
      'menu.system.quit',
    ])
  })

  test('closeSystemMenu 完整对象', () => {
    const closed = closeSystemMenu()
    expect(closed).toEqual({
      active: false,
      phase: 'menu',
      items: [],
      cursor: 0,
      confirmYes: false,
    })
  })
})
