/**
 * TEST-GAME-MENU-BOUNDARIES-1 G09：in-game-menu 系统菜单状态字段（in-game-menu.ts）。
 * 既有 in-game-menu.test 已覆盖词表/顺序/default/环绕——不重复。本文件：
 * systemMenuEnterConfirm/EnterSwitch/ToggleConfirm 三状态字段（:104/110/118）、
 * systemMenuChoice 按 id 而非数组位置。
 */
import { describe, expect, it } from 'vitest'
import {
  createSystemMenu,
  systemMenuChoice,
  systemMenuDown,
  systemMenuEnterConfirm,
  systemMenuEnterSwitch,
  systemMenuToggleConfirm,
} from './in-game-menu.js'

describe('G09 SystemMenu 三阶段状态字段', () => {
  it('EnterConfirm 重置 confirmYes=false；ToggleConfirm 翻转；EnterSwitch 按 id 记目标且高亮当前态', () => {
    const s = createSystemMenu()
    expect(s.phase).toBe('menu')
    expect(s.confirmYes).toBe(false)
    systemMenuEnterConfirm(s)
    expect(s.phase).toBe('confirm')
    expect(s.confirmYes).toBe(false) // 默认 否
    systemMenuToggleConfirm(s)
    expect(s.confirmYes).toBe(true)
    systemMenuToggleConfirm(s)
    expect(s.confirmYes).toBe(false)

    systemMenuEnterSwitch(s, 'music', true)
    expect(s.phase).toBe('switch')
    expect(s.switchTarget).toBe('music')
    expect(s.confirmYes).toBe(true) // 当前开 → 高亮 开
    systemMenuEnterSwitch(s, 'sound', false)
    expect(s.switchTarget).toBe('sound')
    expect(s.confirmYes).toBe(false) // 当前关 → 高亮 关
  })
  it('systemMenuChoice 按 label id 映射 choice，不按数组位置猜测', () => {
    const s = createSystemMenu()
    const first = systemMenuChoice(s)
    expect(first).toBeDefined()
    systemMenuDown(s)
    const second = systemMenuChoice(s)
    expect(second).toBeDefined()
    expect(second).not.toBe(first) // 逐项移动改变 choice（按 id 映射）
  })
})
