/**
 * TEST-GLM-NEW-H-1 / H01 — battle-opcodes 当前公开合同补测。
 *
 * 只覆盖既有测试未证明、一手证据支撑的合同:
 *  - 0x0005 / 0x008E → battleDialogPendingClear(script.c:3267-3269 / 3428-3430 PAL_ClearDialog(TRUE)
 *    的战斗侧延迟语义),并由下一个战斗 showDialog 消费成 clearBefore(只清一次)
 *  - 0x006B → iBlow = (SHORT)operand[0] 有符号 16 位截断(script.c:2049-2054)
 */

import type { Command } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { makeHBattle } from '../../__tests__/glm-next-wave/H/harness.js'
import { runScript } from '../event-system.js'
import { dispatchBattleOpcode } from './battle-opcodes.js'

describe('0x0005 / 0x008E ClearDialog(script.c:3267-3269 / 3428-3430)', () => {
  it('0x05 → battleDialogPendingClear = true(战斗侧延迟清屏标记)', () => {
    const { state } = makeHBattle()
    expect(state.battleDialogPendingClear).toBeUndefined()
    const r = dispatchBattleOpcode(0x05, [0, 0, 0], { state, caster: { type: 'enemy', idx: 0 } })
    expect(r.consumed).toBe(true)
    expect(state.battleDialogPendingClear).toBe(true)
  })

  it('0x8E → battleDialogPendingClear = true(与 0x05 同一战斗侧语义)', () => {
    const { state } = makeHBattle()
    const r = dispatchBattleOpcode(0x8e, [0, 0, 0], { state, caster: { type: 'enemy', idx: 0 } })
    expect(r.consumed).toBe(true)
    expect(state.battleDialogPendingClear).toBe(true)
  })

  it('战斗脚本内 0x05 → 下一个 showDialog 带 clearBefore 且只清一次;后续行不受影响', () => {
    const { state, bus } = makeHBattle()
    const commands: Command[] = [
      { op: 'end' }, // ip 0(scriptOnTurnStart 类入口须 >0)
      { op: 'raw', opcode: 0x05, operands: [0, 0, 0] }, // ip 1 ClearDialog
      { op: 'showDialog', messageIndex: 0, text: '甲(清后首行)' }, // ip 2
      { op: 'showDialog', messageIndex: 0, text: '乙(续行)' }, // ip 3
      { op: 'end' }, // ip 4
    ]
    runScript({
      commands,
      ip: 1,
      bus,
      runtimeMode: 'battle',
      battleCtx: { state, caster: { type: 'enemy', idx: 0 } },
    })
    const queue = state.battleDialogQueue ?? []
    expect(queue.length).toBe(2)
    expect(queue[0]).toMatchObject({ text: '甲(清后首行)', clearBefore: true })
    expect(queue[1]).toMatchObject({ text: '乙(续行)' })
    expect(queue[1]!.clearBefore).toBeUndefined() // 消费一次即复位,不跨行泄漏
    expect(state.battleDialogPendingClear).toBe(false)
  })
})

describe('0x006B Blow Away(script.c:2049-2054 iBlow = (SHORT)op0)', () => {
  it('正操作数 → 原值存入 state.iBlow(present 击退位移消费)', () => {
    const { state } = makeHBattle()
    const r = dispatchBattleOpcode(0x6b, [4, 0, 0], { state, caster: { type: 'enemy', idx: 0 } })
    expect(r.consumed).toBe(true)
    expect(state.iBlow).toBe(4)
  })

  it('0xFFFF → (SHORT) 截断为 -1(负值 = 反向吹飞;fight.c:2681 RandomLong(iBlow,0) 分支)', () => {
    const { state } = makeHBattle()
    dispatchBattleOpcode(0x6b, [0xffff, 0, 0], { state, caster: { type: 'enemy', idx: 0 } })
    expect(state.iBlow).toBe(-1)
  })
})
