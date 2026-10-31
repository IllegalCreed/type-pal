/** Dialogue-clear opcode producers and one-time consumption by the real script runner.
 * Queue flags are observed here; tick-driven box lifetime is covered by battle-dialog.test.ts.
 */
import type { Command } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { makeBattleFixture } from '../../__tests__/battle-fixture.js'
import { runScript } from '../event-system.js'
import { dispatchBattleOpcode } from './battle-opcodes.js'

describe('Battle script dialogue clear boundaries', () => {
  it('0x05 → battleDialogPendingClear = true(战斗侧延迟清屏标记)', () => {
    const { state } = makeBattleFixture()
    expect(state.battleDialogPendingClear).toBeUndefined()
    const r = dispatchBattleOpcode(0x05, [0, 0, 0], { state, caster: { type: 'enemy', idx: 0 } })
    expect(r.consumed).toBe(true)
    expect(state.battleDialogPendingClear).toBe(true)
  })

  it('0x8E → battleDialogPendingClear = true(与 0x05 同一战斗侧语义)', () => {
    const { state } = makeBattleFixture()
    const r = dispatchBattleOpcode(0x8e, [0, 0, 0], { state, caster: { type: 'enemy', idx: 0 } })
    expect(r.consumed).toBe(true)
    expect(state.battleDialogPendingClear).toBe(true)
  })

  it('战斗脚本内 0x05 → 下一个 showDialog 带 clearBefore 且只清一次;后续行不受影响', () => {
    const { state, bus } = makeBattleFixture()
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
