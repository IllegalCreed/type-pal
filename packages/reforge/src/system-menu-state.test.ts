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

describe('系统菜单状态机', () => {
  test('openSystemMenu:5 项全可用(音频开关已落);cursor 0', () => {
    const s = openSystemMenu()
    expect(s.active).toBe(true)
    expect(s.phase).toBe('menu')
    expect(s.items.map((i) => i.id)).toEqual(['save', 'load', 'music', 'sound', 'quit'])
    expect(s.items.every((i) => !i.disabled)).toBe(true) // 无占位项
    expect(s.cursor).toBe(0)
  })
  test('systemMoveCursor:单列环绕(末项↓→0、首项↑→4),对齐 primitives.moveSelection', () => {
    const s = openSystemMenu()
    expect(systemMoveCursor(s, 'down').cursor).toBe(1)
    expect(systemMoveCursor(s, 'right').cursor).toBe(1) // Right=Down
    expect(systemMoveCursor({ ...s, cursor: 4 }, 'down').cursor).toBe(0) // 末项↓环绕→0
    expect(systemMoveCursor(s, 'up').cursor).toBe(4) // 首项↑环绕→4
  })
  test('systemConfirm:save/load→open-save/open-load;music/sound→进 switch;quit→进 confirm', () => {
    const s = openSystemMenu()
    expect(systemConfirm(s).action?.kind).toBe('open-save') // cursor0=save
    expect(systemConfirm({ ...s, cursor: 1 }).action?.kind).toBe('open-load') // load
    const q = systemConfirm({ ...s, cursor: 4 }) // quit
    expect(q.state.phase).toBe('confirm')
    expect(q.state.confirmYes).toBe(false) // 默认否
  })
  test('music/sound 进 switch:默认高亮当前开关态(PAL_SwitchMenu(fEnabled))', () => {
    const s = openSystemMenu()
    const m = systemConfirm({ ...s, cursor: 2 }, { musicOn: true, soundOn: false })
    expect(m.state.phase).toBe('switch')
    expect(m.state.switchTarget).toBe('music')
    expect(m.state.confirmYes).toBe(true) // 音乐当前开 → 高亮「开」
    expect(m.action).toBeUndefined()
    const snd = systemConfirm({ ...s, cursor: 3 }, { musicOn: true, soundOn: false })
    expect(snd.state.switchTarget).toBe('sound')
    expect(snd.state.confirmYes).toBe(false) // 音效当前关 → 高亮「关」
    // 不传当前态 → 缺省按开
    expect(systemConfirm({ ...s, cursor: 2 }).state.confirmYes).toBe(true)
  })
  test('switch 阶段:四方向 toggle 关/开;commit 落定 set-music/set-sound 并关菜单(回 hub)', () => {
    const s = systemConfirm({ ...openSystemMenu(), cursor: 2 }, { musicOn: true, soundOn: true }).state
    expect(systemToggleConfirm(s).confirmYes).toBe(false) // 开 → 关
    const off = systemSwitchCommit({ ...s, confirmYes: false })
    expect(off.action).toEqual({ kind: 'set-music', on: false })
    expect(off.state.active).toBe(false) // 落定即关整个系统菜单(一阶段 DH9 映射)
    const sndOn = systemSwitchCommit({ ...s, switchTarget: 'sound', confirmYes: true })
    expect(sndOn.action).toEqual({ kind: 'set-sound', on: true })
  })
  test('systemSwitchCommit 非 switch 阶段 no-op', () => {
    const s = openSystemMenu()
    expect(systemSwitchCommit(s).action).toBeUndefined()
    expect(systemSwitchCommit(s).state).toBe(s)
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
