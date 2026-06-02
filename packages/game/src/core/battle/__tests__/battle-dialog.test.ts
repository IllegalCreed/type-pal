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

  it('单行打字完 → 无后续 → waiting-end-key;Confirm 关 box + 返回 true(吃掉关框键防漏进菜单)', () => {
    const gs = makeGs()
    const state = makeState([{ text: '哼', style: 'bottom' }])
    tickBattleDialog(state, gs, input()) // 起行
    driveUntil(state, gs, () => gs.dialogBox?.phase === 'waiting-end-key')
    expect(gs.dialogBox?.phase).toBe('waiting-end-key') // 无后续行 → 等结束键
    const held = tickBattleDialog(state, gs, input(['Confirm']))
    expect(gs.dialogBox).toBeUndefined() // dialog-end → 关 box
    // **本 tick 仍 hold(返回 true)**:吃掉关框的 Confirm,避免同一 Confirm 漏进战斗菜单触发普通攻击
    //   (user 2026-05-31 实测)。放行战斗在**下一 tick**(box 已空 → 顶层 return false)。
    expect(held).toBe(true)
    // 下一 tick:无 box / 空队列 → 放行
    expect(tickBattleDialog(state, gs, input())).toBe(false)
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
    // 被按键消掉 → 本 tick 仍 hold(返回 true,吃掉该键防漏进菜单);放行在下一 tick。
    expect(held).toBe(true)
    expect(tickBattleDialog(state, gs, input())).toBe(false)
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

  it('风格切换(top→bottom)另起新框(不混页)', () => {
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

  // ── 上下同屏共存(user 2026-05-31:林月如 top 不消失,李逍遥 bottom 接出)──────
  it('top↔bottom 切换 → 旧框移入 dialogBoxKept(同屏共存),整段结束清两者', () => {
    const gs = makeGs()
    const state = makeState([
      { text: '让开!', style: 'top', portrait: 1 },
      { text: '你是谁', style: 'bottom', portrait: 0 },
    ])
    tickBattleDialog(state, gs, input()) // 起 top(林月如)
    driveUntil(state, gs, () => gs.dialogBox?.phase === 'waiting-end-key')
    expect(gs.dialogBox?.style).toBe('top')
    expect(gs.dialogBoxKept).toBeUndefined()
    // Confirm 关 top 段:因下一行是 bottom(反位置)→ top 框移入 dialogBoxKept(不消失)
    tickBattleDialog(state, gs, input(['Confirm']))
    expect(gs.dialogBoxKept?.style).toBe('top') // 林月如 top 框保留
    expect(gs.dialogBox).toBeUndefined()
    // 下 tick 起 bottom(李逍遥):top kept + bottom active 同屏
    tickBattleDialog(state, gs, input())
    expect(gs.dialogBox?.style).toBe('bottom')
    expect(gs.dialogBoxKept?.style).toBe('top')
    // bottom 打完 + Confirm 结束整段(末行无 next)→ 两框都清
    driveUntil(state, gs, () => gs.dialogBox?.phase === 'waiting-end-key')
    tickBattleDialog(state, gs, input(['Confirm']))
    expect(tickBattleDialog(state, gs, input())).toBe(false) // 放行
    expect(gs.dialogBox).toBeUndefined()
    expect(gs.dialogBoxKept).toBeUndefined() // 整段结束清掉共存框
  })

  it('同位置续行(都 bottom)→ 不进 dialogBoxKept(正常翻页/append)', () => {
    const gs = makeGs()
    const state = makeState([
      { text: 'A', style: 'bottom' },
      { text: 'B', style: 'bottom' },
    ])
    tickBattleDialog(state, gs, input())
    driveUntil(state, gs, () => (state.battleDialogQueue?.length ?? 0) === 0)
    expect(gs.dialogBoxKept).toBeUndefined()
  })

  // D26(2b):dialog 序列中的内联可见 effect(0x69 敌逃跑)按位置入队,tickBattleDialog 按序 dispatch。
  it('D26(2b) effect 条目 → dispatch 0x69(set enemyEscapeAnim)+ 消费 + hold,不开 dialog', () => {
    const gs = makeGs()
    const state = makeState([{ effect: { opcode: 0x69, operands: [0, 0, 0] } }])
    const held = tickBattleDialog(state, gs, input())
    expect(held).toBe(true)
    expect(state.enemyEscapeAnim).toEqual({ step: 0 }) // 0x69 PAL_BattleEnemyEscape 触发飞出
    expect(state.battleDialogQueue?.length).toBe(0) // effect 已消费
    expect(gs.dialogBox).toBeUndefined() // effect 不开 dialog box
  })

  it('D26(2b) 时序:嘲讽对话 → effect(0x69) → narration 按队列顺序处理', () => {
    const gs = makeGs()
    const state = makeState([
      { text: '何方妖孽', style: 'top' },
      { effect: { opcode: 0x69, operands: [0, 0, 0] } },
      { text: '半人蛇妖逃走了', style: 'narration' },
    ])
    // 1) 起嘲讽对话(top)
    tickBattleDialog(state, gs, input())
    expect(gs.dialogBox?.style).toBe('top')
    // 打完 → 下一条是 effect(style≠top)→ 段结束等键
    driveUntil(state, gs, () => gs.dialogBox?.phase === 'waiting-end-key')
    tickBattleDialog(state, gs, input(['Confirm'])) // 关嘲讽框
    expect(gs.dialogBox).toBeUndefined()
    expect(state.enemyEscapeAnim).toBeUndefined() // effect 还没处理
    // 2) 队首 = effect → dispatch 逃跑动画;narration 仍在队列(真机由 tickBattleEnemyEscapeAnim
    //    优先 hold 飞出,飞完才轮到 narration;此处单测 tickBattleDialog 验顺序与消费)
    tickBattleDialog(state, gs, input())
    expect(state.enemyEscapeAnim).toEqual({ step: 0 })
    expect(state.battleDialogQueue?.[0]?.text).toBe('半人蛇妖逃走了')
    // 3) narration 显示(在 effect 之后)
    tickBattleDialog(state, gs, input())
    expect(gs.dialogBox?.style).toBe('narration')
    expect(state.battleDialogQueue?.length).toBe(0)
  })

})
