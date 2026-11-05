import type { AbstractKey, Command, InputSnapshot } from '@type-pal/shared'
import { describe, expect, it, onTestFinished, vi } from 'vitest'

import { buildLabelMap, OP_GOTO_IF_NO, OP_SET_CAMERA, tickEventSystem } from './event-system.js'
import { createInitialGameState, type GameState } from './game-state.js'

/** Dialogue cleanup when a script exits or redraws the scene. */

function snap(pressed: AbstractKey[] = []): InputSnapshot {
  return { held: new Set(), pressed: new Set(pressed), frameNum: 0 }
}

function loadEvent(gs: GameState, commands: Command[]): void {
  gs.eventCursor = { commands, labelMap: buildLabelMap(commands), ip: 0 }
  gs.mode = 'event'
  gs.nowMs = 1000
}

describe('dialogue cleanup across script control flow', () => {
  it('a missing No target terminates the script and clears its question without running the Yes branch', () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
    onTestFinished(() => warning.mockRestore())
    // A missing label is the existing TS fail-closed policy; C directly uses the target entry.
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })

    loadEvent(gs, [
      { op: 'showDialog', messageIndex: 0, text: '要不要' },
      { op: 'raw', opcode: OP_GOTO_IF_NO, operands: [9, 0, 0] }, // L_9 不在 labelMap → fail-closed
      { op: 'showDialog', messageIndex: 1, text: '不该看到' },
      { op: 'end' },
    ])
    // 问句逐字打完自动推进到 0x0A,进 confirm(问句留屏,不需要额外确认键)。
    let enteredConfirm = false
    for (let i = 0; i < 24 && gs.eventCursor !== undefined; i++) {
      gs.nowMs += 100
      tickEventSystem(gs, snap([]))
      if (gs.eventCursor?.waiting === 'confirm') {
        enteredConfirm = true
        break
      }
    }
    expect(enteredConfirm).toBe(true)
    expect(gs.dialogBox?.currentLineText).toBe('要不要') // 前提:问句在屏(confirm 期保留)
    expect(gs.mode).toBe('event')
    // 默认 否 + Confirm 提交 → resolveConfirmGoto 解不出 L_9 → fail-closed 终止。
    gs.nowMs += 100
    tickEventSystem(gs, snap(['Confirm']))
    expect(gs.eventCursor).toBeUndefined() // 脚本终止(不是续跑到 0x0A 之后)
    expect(gs.mode).toBe('explore') // restoreModeAfterScript 收口
    expect(gs.dialogBox).toBeUndefined() // 问句被 clearDialogBoxes 清掉
    expect(gs.dialogBoxKept).toBeUndefined()
    expect(gs.dialogHistory?.some((line) => line.text === '不该看到')).toBe(false) // 是分支未跑
    expect(warning.mock.calls).toEqual([
      ['event-system: 0x0A goto entry 9 不在 labelMap → 终止脚本'],
    ])
  })

  it.each([
    { flag: 0, portrait: undefined },
    { flag: 0xffff, portrait: 90 },
  ])('camera recenter flag $flag leaves portrait $portrait for the next dialogue', ({
    flag,
    portrait,
  }) => {
    // PAL_InterpretInstruction 0x7F skips MakeScene only for recenter + 0xFFFF.
    // A five-line dialogue ending in ~ leaves an empty body with its portrait to observe redraw ownership.
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })

    gs.nowMs = 1000
    gs.party = { x: 300, y: 200, facing: 'down' }
    gs.camera = { x: -999, y: -999 }
    gs.eventCursor = {
      commands: [
        { op: 'setDialogStyleBottom', arg0: 90 }, // 赵灵儿立绘 90
        { op: 'showDialog', messageIndex: 0, text: '我只是丑陋的蛇女' },
        { op: 'showDialog', messageIndex: 1, text: '又失去化成人形的能力' },
        { op: 'showDialog', messageIndex: 2, text: '活着对我来说．．已经' },
        { op: 'showDialog', messageIndex: 3, text: '没有意义' },
        { op: 'showDialog', messageIndex: 4, text: '你．．又何必犯险来救我~80' }, // 第 5 行 → 翻页
        { op: 'raw', opcode: OP_SET_CAMERA, operands: [0, 0, flag] },
        { op: 'showDialog', messageIndex: 5, text: '第二句观察' }, // 观察点:append vs 新建
        { op: 'end' },
      ],
      labelMap: {},
      ip: 0,
    }
    gs.mode = 'event'
    let lingerPortrait: number | undefined
    let observed = false
    for (let i = 0; i < 200 && gs.eventCursor !== undefined; i++) {
      gs.nowMs += 100
      tickEventSystem(gs, snap(['Confirm']))
      if (gs.dialogBox?.currentLineText?.includes('蛇女'))
        lingerPortrait = gs.dialogBox.portraitIcon
      if (gs.dialogBox?.currentLineText === '第二句观察') {
        observed = true
        expect(gs.camera).toEqual({ x: 140, y: 88 }) // 两臂都回正(party-(160,112))
        expect(gs.dialogBox.portraitIcon).toBe(portrait)
        break
      }
    }
    expect(lingerPortrait).toBe(90) // 前提:立绘阶段正常显示 90
    expect(observed).toBe(true)
  })
})
