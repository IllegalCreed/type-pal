/**
 * TEST-GLM-NEW-H-1 / H03 — equip-effect 当前公开合同补测。
 *
 * equip-effect.test.ts 只证了 0x2D 的「好状态」分支(set-if-longer / HP!=0);
 * 本文件按 PAL_SetPlayerStatus(global.c:2221-2277)一手真值补齐:
 *  - 坏状态(Confused0/Paralyzed1/Sleep2/Silence3):已有(>0)则**不刷新**(global.c:2229-2241)
 *  - 傀儡 kStatusPuppet(4):仅死人(HP==0)可设,且 set-if-longer(global.c:2243-2257)
 * 走公开入口 runEquipScript(0x2D scriptOnEquip 链,仙女剑等装备授状态的真实路径)。
 */
import type { Command } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { runEquipScript } from './equip-effect.js'
import { setGlobalEvents } from './event-system.js'
import { createInitialGameState } from './game-state.js'

function freshGs() {
  return createInitialGameState({ x: 0, y: 0, facing: 'down' })
}

describe('0x2D scriptOnEquip → 坏状态不刷新(global.c:2229-2241)', () => {
  it('已有 Sleep 5 → 脚本设 3 不覆盖(保持 5);另一 role 当前 0 → 设为 3', () => {
    setGlobalEvents([
      { op: 'raw', opcode: 0x2d, operands: [2, 3, 0], label: 'L_710' }, // Sleep(2) 3 回合
      { op: 'end' },
    ] satisfies Command[])
    const gs = freshGs()
    gs.PlayerRolesRuntime.rgwHP[0] = 100
    gs.PlayerRolesRuntime.rgwHP[1] = 100
    gs.rgPlayerStatus[0]![2] = 5 // role 0 已睡 5 回合
    runEquipScript(gs, 710, 0)
    expect(gs.rgPlayerStatus[0]![2]).toBe(5) // 坏状态已有 → 不刷新
    runEquipScript(gs, 710, 1)
    expect(gs.rgPlayerStatus[1]![2]).toBe(3) // 当前 0 → 设为脚本值
  })

  it('Silence(3) 同规则:已有 8 不被 2 覆盖', () => {
    setGlobalEvents([
      { op: 'raw', opcode: 0x2d, operands: [3, 2, 0], label: 'L_711' },
      { op: 'end' },
    ] satisfies Command[])
    const gs = freshGs()
    gs.PlayerRolesRuntime.rgwHP[0] = 100
    gs.rgPlayerStatus[0]![3] = 8
    runEquipScript(gs, 711, 0)
    expect(gs.rgPlayerStatus[0]![3]).toBe(8)
  })
})

describe('0x2D scriptOnEquip → 傀儡仅死人可设 + set-if-longer(global.c:2243-2257)', () => {
  it('活人(Hp>0)设 Puppet 9 → 不施加;死人 → 设为 9', () => {
    setGlobalEvents([
      { op: 'raw', opcode: 0x2d, operands: [4, 9, 0], label: 'L_720' }, // Puppet(4) 9 回合
      { op: 'end' },
    ] satisfies Command[])
    const gs = freshGs()
    gs.PlayerRolesRuntime.rgwHP[0] = 100 // 活人
    gs.PlayerRolesRuntime.rgwHP[1] = 0 // 死人
    runEquipScript(gs, 720, 0)
    expect(gs.rgPlayerStatus[0]![4] ?? 0).toBe(0) // 活人 → fSuccess=FALSE,不设
    runEquipScript(gs, 720, 1)
    expect(gs.rgPlayerStatus[1]![4]).toBe(9) // 死人 → 设
  })

  it('死人已有 Puppet 12 → 脚本设 9 不覆盖(set-if-longer)', () => {
    setGlobalEvents([
      { op: 'raw', opcode: 0x2d, operands: [4, 9, 0], label: 'L_721' },
      { op: 'end' },
    ] satisfies Command[])
    const gs = freshGs()
    gs.PlayerRolesRuntime.rgwHP[0] = 0
    gs.rgPlayerStatus[0]![4] = 12
    runEquipScript(gs, 721, 0)
    expect(gs.rgPlayerStatus[0]![4]).toBe(12)
  })
})
