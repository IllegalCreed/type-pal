import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setObjectPoisons } from '../player-poison-state.js'
import { setGlobalEvents } from '../script-catalog.js'
import { magicGameState, magicProgram } from './__tests__/magic-script-fixture.js'
import { runMagicScriptSync } from './magic-script.js'

describe('Overworld magic HP,MP and revival', () => {
  beforeEach(() => setGlobalEvents(magicProgram))
  afterEach(() => {
    setGlobalEvents([])
    setObjectPoisons([])
  })
  describe('runMagicScriptSync - opcode 0x1B OP_INCREASE_HP', () => {
    it('气疗术 chain (HP+75 single) → target role HP +75 clamp maxHP', () => {
      const gs = magicGameState()
      const ok = runMagicScriptSync(gs, 43016, 0) // target = role 0
      expect(ok).toBe(true)
      expect(gs.PlayerRolesRuntime.rgwHP[0]).toBe(125) // 50 + 75
      expect(gs.PlayerRolesRuntime.rgwHP[1]).toBe(100) // 其他不变
    })
    it('HP+75 但当前 HP 已接近 maxHP → clamp maxHP', () => {
      const gs = magicGameState()
      gs.PlayerRolesRuntime.rgwHP[0] = 180
      const ok = runMagicScriptSync(gs, 43016, 0)
      expect(ok).toBe(true)
      expect(gs.PlayerRolesRuntime.rgwHP[0]).toBe(200) // clamp 200,不超
    })
    it('五气朝元 chain (HP+300 applyToAll) → 全队活着的 +300 clamp', () => {
      const gs = magicGameState()
      const ok = runMagicScriptSync(gs, 39554, 0xffff)
      expect(ok).toBe(true)
      expect(gs.PlayerRolesRuntime.rgwHP[0]).toBe(200) // 50+300=350 clamp 200
      expect(gs.PlayerRolesRuntime.rgwHP[1]).toBe(200) // 100+300 clamp
      expect(gs.PlayerRolesRuntime.rgwHP[2]).toBe(200)
    })
    it('applyToAll skip dead role(sdlpal applyHPMPDeltaAll 真值)', () => {
      const gs = magicGameState()
      gs.PlayerRolesRuntime.rgwHP[1] = 0 // role 1 dead
      runMagicScriptSync(gs, 39554, 0xffff)
      expect(gs.PlayerRolesRuntime.rgwHP[1]).toBe(0) // 死不复活(0x1B 真值跳过 HP==0)
      expect(gs.PlayerRolesRuntime.rgwHP[0]).toBe(200)
      expect(gs.PlayerRolesRuntime.rgwHP[2]).toBe(200)
    })
    it('M10:满血单体治疗 → success=false(无变化,sdlpal Avoid over treatment global.c:1324)', () => {
      const gs = magicGameState()
      gs.PlayerRolesRuntime.rgwHP[0] = 200 // 满血(=maxHP)
      const ok = runMagicScriptSync(gs, 43016, 0) // 气疗术 HP+75 single
      expect(ok).toBe(false) // 无变化 → fScriptSuccess=FALSE → 上层不扣 MP
      expect(gs.PlayerRolesRuntime.rgwHP[0]).toBe(200) // 不变
    })
    it('M10:死人单体治疗 → success=false + HP 不抬(仅活人,sdlpal PAL_IncreaseHPMP hp>0 global.c:1287)', () => {
      const gs = magicGameState()
      gs.PlayerRolesRuntime.rgwHP[0] = 0 // 阵亡
      const ok = runMagicScriptSync(gs, 43016, 0) // 气疗术对死人
      expect(ok).toBe(false) // 死人不治 → fScriptSuccess=FALSE → 不扣 MP
      expect(gs.PlayerRolesRuntime.rgwHP[0]).toBe(0) // 不抬血(原 bug 会变 75 = 廉价复活)
    })
    it('M11:大世界复活只清 level<=3 毒,level>3 保留(script.c:1071)', () => {
      setObjectPoisons([
        { id: 100, level: 0, color: 0, playerScript: 0, enemyScript: 0 },
        { id: 101, level: 3, color: 0, playerScript: 0, enemyScript: 0 },
        { id: 200, level: 5, color: 0, playerScript: 0, enemyScript: 0 },
      ])
      const gs = magicGameState()
      gs.PlayerRolesRuntime.rgwHP[0] = 0
      gs.rgPoisonStatus['0_0'] = { wPoisonID: 100, wPoisonScript: 1 }
      gs.rgPoisonStatus['1_0'] = { wPoisonID: 101, wPoisonScript: 3 }
      gs.rgPoisonStatus['2_0'] = { wPoisonID: 200, wPoisonScript: 5 }
      const ok = runMagicScriptSync(gs, 43024, 0) // 还魂咒 10%
      expect(ok).toBe(true)
      expect(gs.PlayerRolesRuntime.rgwHP[0]).toBe(20)
      expect(gs.rgPoisonStatus).toEqual({
        '0_0': { wPoisonID: 0, wPoisonScript: 0 },
        '1_0': { wPoisonID: 0, wPoisonScript: 0 },
        '2_0': { wPoisonID: 200, wPoisonScript: 5 },
      })
    })
  })
  describe('runMagicScriptSync - opcode 0x1C OP_INCREASE_MP', () => {
    it('MP +20 single target → 仅目标回蓝', () => {
      const gs = magicGameState()
      runMagicScriptSync(gs, 500, 1) // target = role 1, MP 50 + 20 = 70
      expect(gs.PlayerRolesRuntime.rgwMP).toEqual([80, 70, 30, 0, 0, 0])
    })
    it('MP +20 当前 MP 接近 maxMP → clamp', () => {
      const gs = magicGameState()
      gs.PlayerRolesRuntime.rgwMP[0] = 95
      runMagicScriptSync(gs, 500, 0)
      expect(gs.PlayerRolesRuntime.rgwMP[0]).toBe(100) // clamp
    })
    it('MP +20 applyToAll → 全队活人 clamp', () => {
      const gs = magicGameState()
      expect(runMagicScriptSync(gs, 505, 0xffff)).toBe(true)
      expect(gs.PlayerRolesRuntime.rgwMP).toEqual([100, 70, 50, 0, 0, 0])
    })
    it('MP 单体无变化 → success=false', () => {
      const gs = magicGameState()
      gs.PlayerRolesRuntime.rgwMP[0] = 100
      expect(runMagicScriptSync(gs, 500, 0)).toBe(false)
      expect(gs.PlayerRolesRuntime.rgwMP[0]).toBe(100)
    })
  })
  describe('runMagicScriptSync - opcode 0x1D OP_INCREASE_HP_MP', () => {
    it('HP+10 + MP+10 同 delta', () => {
      const gs = magicGameState()
      runMagicScriptSync(gs, 501, 0)
      expect(gs.PlayerRolesRuntime.rgwHP[0]).toBe(60) // 50+10
      expect(gs.PlayerRolesRuntime.rgwMP[0]).toBe(90) // 80+10
    })
    it('HP+10 + MP+10 applyToAll → 全队活人同步增加', () => {
      const gs = magicGameState()
      expect(runMagicScriptSync(gs, 506, 0xffff)).toBe(true)
      expect(gs.PlayerRolesRuntime.rgwHP).toEqual([60, 110, 60, 0, 0, 0])
      expect(gs.PlayerRolesRuntime.rgwMP).toEqual([90, 60, 40, 0, 0, 0])
    })
    it('HP+10 + MP+10 单体无变化 → success=false', () => {
      const gs = magicGameState()
      gs.PlayerRolesRuntime.rgwHP[0] = 200
      gs.PlayerRolesRuntime.rgwMP[0] = 100
      expect(runMagicScriptSync(gs, 501, 0)).toBe(false)
      expect(gs.PlayerRolesRuntime.rgwHP[0]).toBe(200)
      expect(gs.PlayerRolesRuntime.rgwMP[0]).toBe(100)
    })
  })
  describe('runMagicScriptSync - opcode 0x22 OP_REVIVE_PLAYER', () => {
    it('赎魂 HP==0 → 复活 maxHP * 3/10 = 60', () => {
      const gs = magicGameState()
      gs.PlayerRolesRuntime.rgwHP[0] = 0
      runMagicScriptSync(gs, 43026, 0)
      expect(gs.PlayerRolesRuntime.rgwHP[0]).toBe(60)
    })
    it('单体复活：清 <=999 状态、保留 >999 装备状态，并按 roleId 作用于非顺序队伍', () => {
      const gs = magicGameState()
      gs.partyMembers = [2, 0]
      gs.PlayerRolesRuntime.rgwHP[0] = 0
      gs.rgPlayerStatus[0]![2] = 999 // 临时睡眠边界：应清
      gs.rgPlayerStatus[0]![8] = 32760 // 武器双攻装备哨兵：应保留
      gs.rgPlayerStatus[2]![5] = 9 // 队友 role 2：单体目标不是它
      const ok = runMagicScriptSync(gs, 43024, 0)
      expect(ok).toBe(true)
      expect(gs.PlayerRolesRuntime.rgwHP[0]).toBe(20)
      expect(gs.rgPlayerStatus[0]![2]).toBe(0)
      expect(gs.rgPlayerStatus[0]![8]).toBe(32760)
      expect(gs.rgPlayerStatus[2]![5]).toBe(9)
    })
    it('活人复活失败：状态与 HP 均保持不变', () => {
      const gs = magicGameState()
      gs.rgPlayerStatus[0]![2] = 999
      gs.rgPlayerStatus[0]![8] = 32760
      const ok = runMagicScriptSync(gs, 43024, 0)
      expect(ok).toBe(false)
      expect(gs.PlayerRolesRuntime.rgwHP[0]).toBe(50)
      expect(gs.rgPlayerStatus[0]![2]).toBe(999)
      expect(gs.rgPlayerStatus[0]![8]).toBe(32760)
    })
    it('revive applyToAll 全活 → return false 且不清活人状态', () => {
      setGlobalEvents([
        { op: 'raw', opcode: 0x22, operands: [1, 1, 0], label: 'L_504' },
        { op: 'end' },
      ])
      const gs = magicGameState() // 全活
      gs.rgPlayerStatus[0]![2] = 999
      gs.rgPlayerStatus[0]![8] = 1000
      expect(runMagicScriptSync(gs, 504, 0xffff)).toBe(false)
      expect(gs.rgPlayerStatus[0]![2]).toBe(999)
      expect(gs.rgPlayerStatus[0]![8]).toBe(1000)
    })
  })
  describe('runMagicScriptSync - revive applyToAll g_fScriptSuccess', () => {
    it('revive applyToAll 至少 1 死 → return true', () => {
      setGlobalEvents([
        { op: 'raw', opcode: 0x22, operands: [1, 1, 0], label: 'L_504' },
        { op: 'end' },
      ])
      const gs = magicGameState()
      gs.PlayerRolesRuntime.rgwHP[1] = 0
      expect(runMagicScriptSync(gs, 504, 0xffff)).toBe(true)
      expect(gs.PlayerRolesRuntime.rgwHP).toEqual([50, 20, 50, 0, 0, 0])
    })
    it('applyAll：只清 party 中阵亡角色的 <=999，保留 >999 与 party 外角色状态', () => {
      setGlobalEvents([
        { op: 'raw', opcode: 0x22, operands: [1, 1, 0], label: 'L_504' },
        { op: 'end' },
      ])
      const gs = magicGameState()
      gs.partyMembers = [2, 0]
      gs.PlayerRolesRuntime.rgwHP[0] = 0
      gs.PlayerRolesRuntime.rgwHP[2] = 0
      gs.PlayerRolesRuntime.rgwHP[1] = 0 // party 外，不应被 applyAll 触碰
      gs.rgPlayerStatus[0]![2] = 999
      gs.rgPlayerStatus[0]![8] = 1000
      gs.rgPlayerStatus[2]![5] = 9
      gs.rgPlayerStatus[1]![2] = 999
      expect(runMagicScriptSync(gs, 504, 0xffff)).toBe(true)
      expect(gs.rgPlayerStatus[0]![2]).toBe(0)
      expect(gs.rgPlayerStatus[0]![8]).toBe(1000)
      expect(gs.PlayerRolesRuntime.rgwHP).toEqual([20, 0, 20, 0, 0, 0])
      expect(gs.rgPlayerStatus[2]![5]).toBe(0)
      expect(gs.rgPlayerStatus[1]![2]).toBe(999)
    })
  })
})
