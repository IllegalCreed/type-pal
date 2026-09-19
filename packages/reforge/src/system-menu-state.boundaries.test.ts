/**
 * TEST-RUNTIME-STATE-BOUNDARIES-1 E5-E6（system 侧）：系统菜单返回 action 域（system-menu-state.ts）。
 * system-menu-state.test.ts:13-78 已覆盖开单/环绕/分流/switch 默认态/toggle/commit/记忆/关闭——不重复；
 * 本文件补四方向完整映射、记忆 cursor 边界、非 menu 确认 no-op 与 audio 缺席默认。
 */
import { describe, expect, test } from 'vitest'
import {
  closeSystemMenu,
  openSystemMenu,
  SYSTEM_ITEMS,
  systemConfirm,
  systemConfirmYes,
  systemMoveCursor,
  systemSwitchCommit,
  systemToggleConfirm,
} from './system-menu-state.js'

describe('E5 四方向与记忆 cursor 边界', () => {
  test('left/up 同为 -1、right/down 同为 +1；首尾环绕', () => {
    const atFirst = {
      active: true,
      phase: 'menu' as const,
      items: SYSTEM_ITEMS,
      cursor: 0,
      confirmYes: false,
    }
    expect(systemMoveCursor(atFirst, 'up').cursor).toBe(SYSTEM_ITEMS.length - 1)
    expect(systemMoveCursor(atFirst, 'left').cursor).toBe(SYSTEM_ITEMS.length - 1)
    const atLast = { ...atFirst, cursor: SYSTEM_ITEMS.length - 1 }
    expect(systemMoveCursor(atLast, 'down').cursor).toBe(0)
    expect(systemMoveCursor(atLast, 'right').cursor).toBe(0)
    // 记忆越界 clamp：非负超界与负值
  })
  test('openSystemMenu 记忆恢复与越界 clamp', () => {
    expect(openSystemMenu(3).cursor).toBe(3)
    expect(openSystemMenu(99).cursor).toBe(SYSTEM_ITEMS.length - 1)
    expect(openSystemMenu(-1).cursor).toBe(0)
  })
  test('非 menu 阶段确认不重复 action（confirm/switch 上 systemConfirm no-op）', () => {
    const menu = {
      active: true,
      phase: 'menu' as const,
      items: SYSTEM_ITEMS,
      cursor: 4,
      confirmYes: false,
    }
    const confirmPhase = systemConfirm(menu).state // quit → confirm
    expect(confirmPhase.phase).toBe('confirm')
    expect(systemConfirm(confirmPhase)).toEqual({ state: confirmPhase }) // 无 action、状态不变
    const switchPhase = systemConfirm({ ...menu, cursor: 2 }).state
    expect(systemConfirm(switchPhase)).toEqual({ state: switchPhase })
  })
})

describe('E6 music/sound 显式开关与 audio 缺席默认', () => {
  test('显式 on/off 落定完整 state/action；audio 缺席默认 true；save/load 只核返回请求', () => {
    const menu = {
      active: true,
      phase: 'menu' as const,
      items: SYSTEM_ITEMS,
      cursor: 0,
      confirmYes: false,
    }
    // save/load：返回浏览请求、状态不变（仅核返回请求，不做存储 IO）
    const save = systemConfirm(menu)
    expect(save.action).toEqual({ kind: 'open-save' })
    expect(save.state).toBe(menu)
    expect(systemConfirm({ ...menu, cursor: 1 }).action).toEqual({ kind: 'open-load' })
    // music：显式关 → switch 默认高亮 false；提交 set-music on=false 并关菜单
    const musicOff = systemConfirm({ ...menu, cursor: 2 }, { musicOn: false, soundOn: true })
    expect(musicOff.state.phase).toBe('switch')
    expect(musicOff.state.switchTarget).toBe('music')
    expect(musicOff.state.confirmYes).toBe(false)
    const committed = systemSwitchCommit(musicOff.state)
    expect(committed.action).toEqual({ kind: 'set-music', on: false })
    expect(committed.state).toEqual(closeSystemMenu())
    // sound：显式开
    const soundOn = systemConfirm({ ...menu, cursor: 3 }, { musicOn: true, soundOn: true })
    expect(systemSwitchCommit(soundOn.state).action).toEqual({ kind: 'set-sound', on: true })
    // audio 缺席：默认高亮 true
    const noAudio = systemConfirm({ ...menu, cursor: 2 })
    expect(noAudio.state.confirmYes).toBe(true)
    // 确认/取消完整 state/action：quit 选是 → action、状态保持；选否 → 关菜单无 action
    const quitConfirm = systemConfirm({ ...menu, cursor: 4 }).state
    const toggled = systemToggleConfirm(quitConfirm) // 否→是
    expect(toggled.confirmYes).toBe(true)
    const yes = systemConfirmYes(toggled)
    expect(yes.action).toEqual({ kind: 'quit' })
    expect(yes.state).toBe(toggled)
    const no = systemConfirmYes(quitConfirm) // 默认否
    expect(no.action).toBeUndefined()
    expect(no.state).toEqual(closeSystemMenu())
  })
})
