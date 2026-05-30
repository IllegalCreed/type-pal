/**
 * battle-dialog.test.ts —— 战斗内对话 hold(tickBattleDialog)。
 *
 * 战斗脚本(scriptOnReady / scriptOnTurnStart)的 0xFFFF showDialog 由 runScript 收集到
 * state.battleDialogQueue;tickBattleDialog 逐 tick 把队列喂进**复用的大世界** gs.dialogBox
 * (startDialogLine/appendDialogLine + tickDialog 打字 + confirmDialog page/end-key),期间暂停战斗。
 *
 * 对照 sdlpal:CLASSIC battle dialog 走普通 dialog box(text.c:1660-1772),同步 blocking
 * (PAL_DialogWaitForKeyWithMaximumSeconds,text.c:1701)。
 */

import type { InputSnapshot } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import type { GameState } from '../../game-state.js'
import type { BattleDialogLine, BattleState } from '../battle-state.js'
import { tickBattleDialog } from '../battle-system.js'

function makeState(queue?: BattleDialogLine[]): BattleState {
  // biome-ignore lint/suspicious/noExplicitAny: 最小 BattleState(tickBattleDialog 只碰对话字段 + phaseStallTicks)
  return { battleDialogQueue: queue, phaseStallTicks: 5 } as any as BattleState
}

function makeGs(): GameState {
  // biome-ignore lint/suspicious/noExplicitAny: 最小 GameState(tickBattleDialog 只碰 gs.dialogBox)
  return { dialogBox: undefined } as any as GameState
}

function input(keys: string[] = []): InputSnapshot {
  // biome-ignore lint/suspicious/noExplicitAny: pressed 用 string Set 足够
  return { held: new Set(), pressed: new Set(keys), frameNum: 0 } as any as InputSnapshot
}

/** 驱动 tickBattleDialog 直到条件满足或超 limit(防死循环),返回实际 tick 数。 */
function driveUntil(state: BattleState, gs: GameState, cond: () => boolean, keys: string[] = [], limit = 200): number {
  let n = 0
  while (!cond() && n < limit) {
    tickBattleDialog(state, gs, input(keys))
    n++
  }
  return n
}

describe('tickBattleDialog —— 战斗内对话 hold', () => {
  it('队列空 + 无 box → 返回 false(不 hold,放行战斗)', () => {
    const gs = makeGs()
    const state = makeState()
    expect(tickBattleDialog(state, gs, input())).toBe(false)
    expect(gs.dialogBox).toBeUndefined()
  })

  it('队列有行 + 无 box → startDialogLine 起首行 + 返回 true(暂停战斗)+ 清 phaseStall', () => {
    const gs = makeGs()
    const state = makeState([{ text: '哈哈哈', style: 'bottom' }])
    const held = tickBattleDialog(state, gs, input())
    expect(held).toBe(true)
    expect(gs.dialogBox).toBeDefined()
    expect(gs.dialogBox?.style).toBe('bottom')
    expect(state.battleDialogQueue?.length).toBe(0) // 行已消费进 box
    expect(state.phaseStallTicks).toBe(0) // 对话是合法等待 → 清看门狗计数
  })

  it('单行打字完 → 无后续 → waiting-end-key;Confirm 关 box + 返回 false(放行)', () => {
    const gs = makeGs()
    const state = makeState([{ text: '哼', style: 'bottom' }])
    tickBattleDialog(state, gs, input()) // 起行
    driveUntil(state, gs, () => gs.dialogBox?.phase === 'waiting-end-key')
    expect(gs.dialogBox?.phase).toBe('waiting-end-key') // 无后续行 → 等结束键
    const held = tickBattleDialog(state, gs, input(['Confirm']))
    expect(gs.dialogBox).toBeUndefined() // dialog-end → 关 box
    expect(held).toBe(false) // 队列空 → 放行战斗
  })

  it('同风格多行 → 行间自动累积(append,不等键)', () => {
    const gs = makeGs()
    const state = makeState([
      { text: 'A', style: 'bottom' },
      { text: 'B', style: 'bottom' },
    ])
    tickBattleDialog(state, gs, input()) // 起 A
    driveUntil(state, gs, () => (state.battleDialogQueue?.length ?? 0) === 0)
    expect(state.battleDialogQueue?.length).toBe(0) // A、B 都消费
    // B 已 append(A 在 shownLines,B 当前行 typing 或已完)
    expect(gs.dialogBox).toBeDefined()
    expect(gs.dialogBox!.shownLines.length).toBeGreaterThanOrEqual(1)
  })

  it('打字中 Confirm → 跳到行末(skip-typing,整行显满)', () => {
    const gs = makeGs()
    const state = makeState([{ text: '一二三四五', style: 'bottom' }])
    tickBattleDialog(state, gs, input()) // 起行(charsRevealed 还没满)
    expect(gs.dialogBox?.phase).toBe('typing')
    tickBattleDialog(state, gs, input(['Confirm'])) // skip-typing
    expect(gs.dialogBox?.charsRevealed).toBe(gs.dialogBox?.currentLineText?.length)
  })

  it('narration 风格:满 1.4s 自动消失', () => {
    const gs = makeGs()
    const state = makeState([{ text: '得到宝物', style: 'narration' }])
    tickBattleDialog(state, gs, input()) // 起 narration(本 tick 不计时)
    // 1400ms / 40ms = 35 ticks 后自消
    const n = driveUntil(state, gs, () => gs.dialogBox === undefined)
    expect(gs.dialogBox).toBeUndefined()
    expect(n).toBeGreaterThanOrEqual(34) // ~35 tick(1.4s)
    expect(n).toBeLessThanOrEqual(40)
  })

  it('narration 风格:任意键立即消失(不止 Confirm)', () => {
    const gs = makeGs()
    const state = makeState([{ text: '得到宝物', style: 'narration' }])
    tickBattleDialog(state, gs, input()) // 起
    const held = tickBattleDialog(state, gs, input(['ArrowDown'])) // 任意键
    expect(gs.dialogBox).toBeUndefined()
    expect(held).toBe(false) // 队列空 → 放行
  })

  it('clearBefore 行:先结束当前段(等结束键),Confirm 后下段起新框', () => {
    const gs = makeGs()
    const state = makeState([
      { text: '前段', style: 'bottom' },
      { text: '后段', style: 'bottom', clearBefore: true },
    ])
    tickBattleDialog(state, gs, input()) // 起"前段"
    // "前段"打完 → next 有 clearBefore → setWaitingEndKey(不直接 append)
    driveUntil(state, gs, () => gs.dialogBox?.phase === 'waiting-end-key')
    expect(gs.dialogBox?.phase).toBe('waiting-end-key')
    expect(state.battleDialogQueue?.length).toBe(1) // "后段"还在队列
    // Confirm 关前段 → 下 tick 起"后段"新框
    const held = tickBattleDialog(state, gs, input(['Confirm']))
    expect(held).toBe(true) // 队列还有"后段" → 继续 hold
    tickBattleDialog(state, gs, input()) // 起"后段"
    expect(gs.dialogBox).toBeDefined()
    expect(state.battleDialogQueue?.length).toBe(0)
  })

  it('风格切换(top→bottom)也另起新框(不混页)', () => {
    const gs = makeGs()
    const state = makeState([
      { text: '上', style: 'top' },
      { text: '下', style: 'bottom' },
    ])
    tickBattleDialog(state, gs, input()) // 起"上"(top)
    driveUntil(state, gs, () => gs.dialogBox?.phase === 'waiting-end-key')
    // 不同风格 → 先结束"上"段(不 append 到 top 框)
    expect(gs.dialogBox?.phase).toBe('waiting-end-key')
    expect(state.battleDialogQueue?.length).toBe(1) // "下"还在队列
  })
})
