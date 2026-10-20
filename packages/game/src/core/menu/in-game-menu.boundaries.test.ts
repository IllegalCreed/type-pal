/**
 * TEST-GAME-MENU-BOUNDARIES-1 G09：in-game-menu 系统菜单状态字段（in-game-menu.ts）。
 * 既有 in-game-menu.test 已覆盖词表/顺序/default/环绕——不重复。本文件：
 * systemMenuEnterConfirm/EnterSwitch/ToggleConfirm 三状态字段、
 * systemMenuChoice 按 id 而非数组位置。
 */
import { describe, expect, it } from 'vitest'
import {
  createSystemMenu,
  systemMenuChoice,
  systemMenuEnterConfirm,
  systemMenuEnterSwitch,
  systemMenuToggleConfirm,
} from './in-game-menu.js'

describe('G09 SystemMenu 三阶段状态字段', () => {
  it('EnterConfirm 重置已有 Yes；ToggleConfirm 在否/是之间切换', () => {
    const s = createSystemMenu()
    expect(s.phase).toBe('menu')
    expect(s.confirmYes).toBe(false)
    systemMenuToggleConfirm(s)
    expect(s.confirmYes).toBe(true)
    systemMenuEnterConfirm(s)
    expect(s.phase).toBe('confirm')
    expect(s.confirmYes).toBe(false) // 默认 否
    systemMenuToggleConfirm(s)
    expect(s.confirmYes).toBe(true)
    systemMenuToggleConfirm(s)
    expect(s.confirmYes).toBe(false)
  })

  it('EnterSwitch 按当前音频开关初始化目标和高亮', () => {
    const s = createSystemMenu()
    systemMenuEnterSwitch(s, 'music', true)
    expect(s.phase).toBe('switch')
    expect(s.switchTarget).toBe('music')
    expect(s.confirmYes).toBe(true) // 当前开 → 高亮 开
    systemMenuEnterSwitch(s, 'sound', false)
    expect(s.phase).toBe('switch')
    expect(s.switchTarget).toBe('sound')
    expect(s.confirmYes).toBe(false) // 当前关 → 高亮 关
  })
  it('systemMenuChoice 按 label id 映射 choice，不按数组位置猜测', () => {
    const s = createSystemMenu()
    // 公开 state 的防御输入：重排已有合法菜单项，区分 WORD id 与 cursor；
    // 生产 factory 仍使用固定顺序，本例不声称产品允许用户重排菜单。
    s.selection.items.reverse()
    expect(systemMenuChoice(s)).toBe('quit')
    s.selection.cursor = 1
    expect(systemMenuChoice(s)).toBe('sound')
  })
})
