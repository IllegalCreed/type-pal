import type { Command } from '@type-pal/shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getGlobalLabelMap, setGlobalEvents } from '../script-catalog.js'
import { magicGameState, magicProgram } from './__tests__/magic-script-fixture.js'
import { runMagicScriptSync } from './magic-script.js'

describe('Synchronous magic control and failure', () => {
  beforeEach(() => setGlobalEvents(magicProgram))
  afterEach(() => {
    setGlobalEvents([])
    vi.restoreAllMocks()
  })
  describe('runMagicScriptSync - 流程控制', () => {
    it('多 op chain 顺序执行(HP-50 → revive 不触发因 HP>0)', () => {
      const gs = magicGameState()
      gs.PlayerRolesRuntime.rgwHP[0] = 200
      expect(runMagicScriptSync(gs, 502, 0)).toBe(false)
      // L_502 chain:HP-50 → revive ratio 10%
      // HP=200 → 150;revive 检 HP==0 → skip;final HP=150
      expect(gs.PlayerRolesRuntime.rgwHP[0]).toBe(150)
    })
    it('多 op chain 扣尽最后 50 HP 后复活(HP=0 → maxHP * 1/10)', () => {
      const gs = magicGameState()
      // fixture 指令不变，目标初始 HP=50：扣50→0，再复活为20。
      gs.PlayerRolesRuntime.rgwHP[0] = 50
      expect(runMagicScriptSync(gs, 502, 0)).toBe(true)
      expect(gs.PlayerRolesRuntime.rgwHP[0]).toBe(20) // revive 1/10 of maxHP=200 = 20
    })
    it('未知 raw opcode 静默跳过，不阻断后续治疗', () => {
      const gs = magicGameState()
      runMagicScriptSync(gs, 503, 0)
      expect(gs.PlayerRolesRuntime.rgwHP[0]).toBe(55) // 50+5
    })
    it('scriptId=0 → 返回 true (skip)', () => {
      const gs = magicGameState()
      const ok = runMagicScriptSync(gs, 0, 0)
      expect(ok).toBe(true)
      expect(gs.PlayerRolesRuntime.rgwHP[0]).toBe(50) // 未变
    })
    it('label 不存在 → 返回 false', () => {
      const gs = magicGameState()
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const ok = runMagicScriptSync(gs, 65000, 0)
      expect(ok).toBe(false)
      expect(warn).toHaveBeenCalledTimes(1)
      expect(warn).toHaveBeenCalledWith('runMagicScriptSync: L_65000 不在全局 labelMap')
    })
    it('label 指向命令表外 → fail closed 并报告越界', () => {
      setGlobalEvents([{ op: 'end', label: 'L_504' }])
      getGlobalLabelMap().L_504 = 99
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      expect(runMagicScriptSync(magicGameState(), 504, 0)).toBe(false)
      expect(warn).toHaveBeenCalledTimes(1)
      expect(warn).toHaveBeenCalledWith('runMagicScriptSync: ip 99 越界')
    })
    it('单体复活收到 0xFFFF 目标哨兵 → 不访问角色并返回 false', () => {
      setGlobalEvents([
        { op: 'raw', opcode: 0x22, operands: [0, 1, 0], label: 'L_504' },
        { op: 'end' },
      ])
      const gs = magicGameState()
      expect(runMagicScriptSync(gs, 504, 0xffff)).toBe(false)
      expect(gs.PlayerRolesRuntime.rgwHP).toEqual([50, 100, 50, 0, 0, 0])
    })
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
      const gs = magicGameState(400)

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
      const gs = magicGameState(400)

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
      const gs = magicGameState(400)

      expect(runMagicScriptSync(gs, 779, 0)).toBe(true)
      expect(gs.PlayerRolesRuntime.rgwHP[0]).toBe(55)
      expect(warn).toHaveBeenCalledTimes(1)
      expect(warn).toHaveBeenCalledWith(
        "runMagicScriptSync: 撞到 non-raw op 'showDialog' ip=0 — skip",
      )
    })
    it('Single-target healing with 0xFFFF: explicit TS guard keeps roles untouched', () => {
      const commands: Command[] = [
        { op: 'raw', opcode: 0x1b, operands: [0, 75, 0], label: 'L_780' },
        { op: 'end' },
      ]
      setGlobalEvents(commands)
      const gs = magicGameState(400)

      expect(runMagicScriptSync(gs, 780, 0xffff)).toBe(true)
      expect(gs.PlayerRolesRuntime.rgwHP).toEqual([50, 100, 50, 0, 0, 0])
    })
  })
})
