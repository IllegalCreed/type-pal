import { describe, expect, test } from 'vitest'
import {
  closeSystemMenu,
  openSystemMenu,
  systemConfirm,
  systemConfirmYes,
  systemMoveCursor,
  systemToggleConfirm,
} from './system-menu-state.js'

describe('系统菜单状态机', () => {
  test('openSystemMenu:5 项,4 占位 disabled,quit 正常;cursor 0', () => {
    const s = openSystemMenu()
    expect(s.active).toBe(true)
    expect(s.phase).toBe('menu')
    expect(s.items.map((i) => i.id)).toEqual(['save', 'load', 'music', 'sound', 'quit'])
    expect(s.items[0]?.disabled).toBe(true) // 占位
    expect(s.items[4]?.disabled).toBeUndefined() // quit 正常
    expect(s.cursor).toBe(0)
  })
  test('systemMoveCursor:单列环绕(末项↓→0、首项↑→4),对齐 primitives.moveSelection', () => {
    const s = openSystemMenu()
    expect(systemMoveCursor(s, 'down').cursor).toBe(1)
    expect(systemMoveCursor(s, 'right').cursor).toBe(1) // Right=Down
    expect(systemMoveCursor({ ...s, cursor: 4 }, 'down').cursor).toBe(0) // 末项↓环绕→0
    expect(systemMoveCursor(s, 'up').cursor).toBe(4) // 首项↑环绕→4
  })
  test('systemConfirm:占位项 → placeholder action(不进 confirm);quit → 进 confirm', () => {
    const s = openSystemMenu()
    const ph = systemConfirm(s) // cursor0=save(占位)
    expect(ph.action?.kind).toBe('placeholder')
    expect(ph.state.phase).toBe('menu') // 留 menu
    const q = systemConfirm({ ...s, cursor: 4 }) // quit
    expect(q.state.phase).toBe('confirm')
    expect(q.state.confirmYes).toBe(false) // 默认否
  })
  test('confirm 阶段:四方向 toggle;选是→quit action;选否→关菜单', () => {
    const s = systemConfirm({ ...openSystemMenu(), cursor: 4 }).state // 进 confirm
    expect(systemToggleConfirm(s).confirmYes).toBe(true) // toggle 否→是
    const yes = systemConfirmYes({ ...s, confirmYes: true })
    expect(yes.action?.kind).toBe('quit')
    const no = systemConfirmYes({ ...s, confirmYes: false })
    expect(no.state.active).toBe(false) // 关菜单
  })
  test('cursor 跨调用记忆(原版 iCurSystemMenuItem)', () => {
    expect(openSystemMenu(3).cursor).toBe(3) // 恢复上次
    expect(openSystemMenu(99).cursor).toBe(4) // 越界 clamp
  })
  test('closeSystemMenu:active false', () => {
    expect(closeSystemMenu().active).toBe(false)
  })
})
