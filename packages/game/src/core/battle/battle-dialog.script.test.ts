/** Dialogue-clear opcode producers and one-time consumption by the real script runner.
 * Queue flags are observed here; tick-driven box lifetime is covered by battle-dialog.test.ts.
 */
import type { Command, InputSnapshot } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { makeBattleFixture } from '../../__tests__/battle-fixture.js'
import { runScript } from '../event-system.js'
import {
  OP_DELAY,
  OP_PLAY_CD_MUSIC,
  OP_PLAY_MUSIC,
  OP_PLAY_SOUND,
  OP_STOP_MUSIC,
} from '../script-opcode-ids.js'
import { dispatchBattleOpcode } from './battle-opcodes.js'
import { tickBattleDialog } from './battle-system.js'

describe('Battle script dialogue clear boundaries', () => {
  it('erases a portrait on redraw, then resets to upper text for the next trigger', () => {
    const { state, bus } = makeBattleFixture()
    const commands: Command[] = [
      { op: 'setDialogStyleBottom', arg0: 27 },
      { op: 'showDialog', messageIndex: 0, text: '开场' },
      { op: 'raw', opcode: 0x05, operands: [0, 0, 0] },
      { op: 'showDialog', messageIndex: 1, text: '回应' },
      { op: 'end', advance: true },
      { op: 'showDialog', messageIndex: 2, text: '下一轮' },
      { op: 'end' },
    ]
    const call = {
      commands,
      bus,
      runtimeMode: 'battle' as const,
      battleCtx: { state, caster: { type: 'enemy' as const, idx: 0 } },
    }
    runScript({ ...call, ip: runScript({ ...call, ip: 0 }) })
    expect(
      state.battleDialogQueue?.map(({ style, portrait, portraitLayout, clearBefore }) => [
        style,
        portrait,
        portraitLayout,
        clearBefore,
      ]),
    ).toEqual([
      ['bottom', 27, undefined, undefined],
      ['bottom', undefined, true, true],
      ['top', undefined, undefined, undefined],
    ])
  })

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

  it('keeps the current score through dialogue and starts the queued cues after the full wait', () => {
    const { gs, state, bus } = makeBattleFixture()
    gs.wNumMusic = 12
    gs.musicLoop = true
    const commands: Command[] = [
      { op: 'setDialogStyleTop', arg0: 0 },
      { op: 'showDialog', messageIndex: 0, text: '等一等' },
      { op: 'raw', opcode: OP_DELAY, operands: [2, 0, 0] },
      { op: 'raw', opcode: OP_PLAY_MUSIC, operands: [17, 1, 0] },
      { op: 'raw', opcode: OP_PLAY_SOUND, operands: [175, 0, 0] },
      { op: 'raw', opcode: OP_DELAY, operands: [1, 0, 0] },
      { op: 'raw', opcode: OP_PLAY_CD_MUSIC, operands: [8, 13, 0] },
      { op: 'raw', opcode: OP_DELAY, operands: [1, 0, 0] },
      { op: 'raw', opcode: OP_STOP_MUSIC, operands: [0, 0, 0] },
      { op: 'end' },
    ]
    runScript({
      commands,
      bus,
      ip: 0,
      runtimeMode: 'battle',
      battleCtx: { state, gs, caster: { type: 'enemy', idx: 0 } },
    })
    const tick = (pressed: InputSnapshot['pressed'] = new Set()) =>
      tickBattleDialog(state, gs, { pressed, held: new Set(), frameNum: 0 })
    for (let i = 0; i < 20 && gs.dialogBox?.phase !== 'waiting-end-key'; i++) {
      expect(tick()).toBe(true)
    }
    expect(gs.dialogBox?.phase).toBe('waiting-end-key')
    expect(gs.wNumMusic).toBe(12)
    expect(gs.pendingSounds ?? []).toEqual([])
    tick(new Set(['Confirm']))

    // Wait operands count 80ms units, and the battle dialogue clock samples every 40ms.
    for (let i = 0; i < 4; i++) {
      expect(tick()).toBe(true)
      expect(gs.wNumMusic).toBe(12)
      expect(gs.pendingSounds ?? []).toEqual([])
    }
    expect(tick()).toBe(true)
    expect([gs.wNumMusic, gs.musicLoop, gs.pendingSounds]).toEqual([17, false, [175]])
    expect(tick()).toBe(true)
    expect(tick()).toBe(true)
    expect([gs.wNumMusic, gs.musicLoop]).toEqual([13, true])
    expect(tick()).toBe(true)
    expect(tick()).toBe(true)
    expect([gs.wNumMusic, gs.musicLoop, gs.pendingSounds]).toEqual([0, false, [175]])
    expect(tick()).toBe(false)
  })
})
