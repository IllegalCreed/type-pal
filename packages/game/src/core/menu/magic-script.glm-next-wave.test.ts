/** 同步法术 runner 的流程边界；数值和复活合同见 magic-script.test.ts。
 * - 256步 raw/goto 循环终止，精确观察128次HP变化。
 * - 缺失 goto 目标返回false并保留此前副作用。
 * - 具名非raw指令警告后继续；单体指令遇全体目标哨兵不访问角色。
 */

import type { Command } from '@type-pal/shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createInitialGameState } from '../game-state.js'
import { setGlobalEvents } from '../script-catalog.js'
import { runMagicScriptSync } from './magic-script.js'

function mkGs(): ReturnType<typeof createInitialGameState> {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  gs.partyMembers = [0, 1, 2]
  gs.PlayerRolesRuntime.rgwMaxHP = [400, 400, 400, 0, 0, 0]
  gs.PlayerRolesRuntime.rgwMaxMP = [100, 100, 100, 0, 0, 0]
  gs.PlayerRolesRuntime.rgwHP = [50, 100, 50, 0, 0, 0]
  gs.PlayerRolesRuntime.rgwMP = [80, 50, 30, 0, 0, 0]
  return gs
}

afterEach(() => {
  setGlobalEvents([])
  vi.restoreAllMocks()
})

describe('runMagicScriptSync goto / 具名 op / 0xFFFF 目标分支', () => {
  it('goto 自环死循环被 SCRIPT_TICK_LIMIT 终止:返回 false,0x1B 恰执行 128 次(HP 50→178)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const commands: Command[] = [
      { op: 'raw', opcode: 0x1b, operands: [0, 1, 0], label: 'L_777' },
      { op: 'goto', to: 'L_777' },
      { op: 'end' },
    ]
    setGlobalEvents(commands)
    const gs = mkGs()

    expect(runMagicScriptSync(gs, 777, 0)).toBe(false)
    // while(step++ < 256) 恰 256 步,raw/goto 交替 → 128 次真实 HP+1(证明循环真执行而非早退)。
    expect(gs.PlayerRolesRuntime.rgwHP[0]).toBe(178)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith('runMagicScriptSync: SCRIPT_TICK_LIMIT 超出 — 死循环?')
  })

  it('goto 目标 label 缺失 → false;前序已执行副作用保留(HP +1)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const commands: Command[] = [
      { op: 'raw', opcode: 0x1b, operands: [0, 1, 0], label: 'L_778' },
      { op: 'goto', to: 'L_NOT_REGISTERED' },
      { op: 'end' },
    ]
    setGlobalEvents(commands)
    const gs = mkGs()

    expect(runMagicScriptSync(gs, 778, 0)).toBe(false)
    expect(gs.PlayerRolesRuntime.rgwHP[0]).toBe(51)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith(
      'runMagicScriptSync: goto label L_NOT_REGISTERED 不在 labelMap',
    )
  })

  it('非 raw 具名 op(showDialog)warn skip 不阻流:后续 0x1B 照常执行,success=true', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const commands: Command[] = [
      { op: 'showDialog', messageIndex: 0, text: '过场对话', label: 'L_779' },
      { op: 'raw', opcode: 0x1b, operands: [0, 5, 0] },
      { op: 'end' },
    ]
    setGlobalEvents(commands)
    const gs = mkGs()

    expect(runMagicScriptSync(gs, 779, 0)).toBe(true)
    expect(gs.PlayerRolesRuntime.rgwHP[0]).toBe(55)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith(
      "runMagicScriptSync: 撞到 non-raw op 'showDialog' ip=0 — skip",
    )
  })

  it('single-target 0x1B 在 target=0xFFFF(applyToAll 语境)→ no-op 且 success=true(不误报失败)', () => {
    const commands: Command[] = [
      { op: 'raw', opcode: 0x1b, operands: [0, 75, 0], label: 'L_780' },
      { op: 'end' },
    ]
    setGlobalEvents(commands)
    const gs = mkGs()

    expect(runMagicScriptSync(gs, 780, 0xffff)).toBe(true)
    expect(gs.PlayerRolesRuntime.rgwHP).toEqual([50, 100, 50, 0, 0, 0])
  })
})
