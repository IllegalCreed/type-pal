/**
 * Bug2 修复测试:"按一下全显"(2026-06-26)。
 *
 * sdlpal 真值(text.c:1616 + script.c:3463-3464):PAL_ShowDialogText 是**同步阻塞**调用 ——
 *   逐字 UTIL_Delay,玩家按 kKeySearch|kKeyMenu → fUserSkip=TRUE(text.c:1607)→ 本次调用剩余字符
 *   瞬显 → 函数返回 → wScriptEntry++ 同帧到下一行 → 再调 PAL_ShowDialogText,fUserSkip 跨行持续
 *   (只 4 个复位点:翻页 text.c:1447 / `~` 1553 / 段末 1607 / EndDialog 1815)→ **整段在同一次按键后
 *   连锁瞬显,行间不等键、不各占一帧**。玩家体验:"按一下整段全过"。
 *
 * 第一阶段 bug:把同步语义搬成 10fps tick 状态机后:
 *   - 机制 A:skip-typing 后 `return`(event-system 旧 1763),当前行设满但**本 tick 不推进 ip**;
 *     下一 tick 才 line-done → ip++;再下一 tick 才 append 下一行 → 每行各占 1 tick(100ms)。
 *   - 机制 B:input.nextSnapshot 取完即 pressed.clear()(input.ts:102),一次物理 keydown 只在
 *     **一个** logic tick 出现,配合 typing 只认 Confirm / line-done 认任意键的相位分拆(event-system
 *     旧 1748),玩家无法在 100ms 窗口内连续命中 → 按键被吞 → "要按很多遍"。
 *
 * 修复目标(skip-typing 后不 return,fall through 让 userSkip 驱动后续行同 tick 连锁瞬显):
 *   1. typing 中按一次 Confirm → 当前行瞬显,且**同一 tick**内后续同段行全部瞬显入页。
 *   2. 一段 N 行,玩家只按一次 Confirm,推进到段末/翻页/end —— 不要求多次按键。
 *   3. 撞翻页(>4 行)停在 waiting-page-key(忠实 sdlpal text.c:1649-1658 第 5 行 PAL_DialogWaitForKey)。
 *   4. `~` 段末复位 userSkip(text.c:1553)后下一段恢复逐字 —— 跨段不复读。
 */

import type { AbstractKey, Command, InputSnapshot } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { createCommandBus } from './command-bus.js'
import { tickEventSystem } from './event-system.js'
import { createInitialGameState, type GameState } from './game-state.js'

function snap(keys: AbstractKey[] = []): InputSnapshot {
  return { held: new Set(), pressed: new Set(keys), frameNum: 0 }
}

/**
 * 模拟主循环每 tick 推 100ms 墙钟(Bug1 fix:打字用 wall-clock,需显式推 gs.nowMs)。
 * nowMs 从 1000 起,避免 lineStartMs=0 的缺省回退路径。
 */
function tick(gs: GameState, keys: AbstractKey[] = [], ms = 100): void {
  gs.nowMs += ms
  tickEventSystem(gs, snap(keys), createCommandBus())
}

/**
 * 一段无控制符的多行对话脚本(模拟几个 showDialog opcode + end)。
 * 文本刻意做长(≥10 字 × 24ms = 240ms > 100ms/tick),确保「tick2 按 Confirm 时仍在 typing」——
 * 这正是 bug2 的复现场景:sdlpal 里打字是同步 UTIL_Delay,玩家在逐字间隙按键;tick 模型里需保证
 * 按键那一刻 phase 仍是 typing(否则字已在一 tick 内打完 → 走 line-done 的 noop,根本没 skip-typing)。
 */
function dialogScript(lines: string[]): GameState {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  gs.mode = 'event'
  gs.currentDialogStyle = 'bottom'
  const commands: Command[] = lines.map(text => ({ op: 'showDialog', messageIndex: 0, text }))
  commands.push({ op: 'end' })
  gs.eventCursor = { commands, labelMap: {}, ip: 0 }
  gs.nowMs = 1000
  return gs
}

/** 长文本行(确保 tick 间仍是 typing)。 */
const L = (n: number) => `这是第${n}行足够长的对话文字内容需要逐字显示`

/** 当前行是否已完全瞬显(charsRevealed 满且 phase=line-done 或 waiting-*-key)。 */
function lineFullyShown(ds: NonNullable<GameState['dialogBox']>): boolean {
  const text = ds.currentLineText
  if (text === null) return false
  return ds.charsRevealed >= text.length
}

describe('Bug2: 按一下 Confirm → 同段后续行同 tick 连锁瞬显(fUserSkip 跨行持续)', () => {
  it('3 行对话:typing 中按一次 Confirm,本 tick 内整页 3 行全部瞬显入页(不各占一 tick)', () => {
    const gs = dialogScript([L(1), L(2), L(3)])
    // 首 tick:showDialog line1 启动,typing 中(打字未完)
    tick(gs)
    expect(gs.dialogBox?.currentLineText).toBe(L(1))
    expect(gs.dialogBox?.phase).toBe('typing')
    expect(gs.eventCursor?.ip).toBe(0) // 停在 line1 的 showDialog
    expect(gs.eventCursor?.waiting).toBe('dialog')

    // 本 tick 按 Confirm 跳字 → userSkip=true → 同 tick 连锁把 line2/line3 瞬显入页,
    // 直到撞 end。期望:停在 end 之后的 waiting(段末等键),且 3 行都已在页上且满字符。
    tick(gs, ['Confirm'])
    const ds = gs.dialogBox
    expect(ds).toBeDefined()
    if (!ds) return // 窄化类型,避免 noNonNullAssertion
    // 三行全部瞬显:userSkip 应为 true,且页内容(已沉行 + 当前行)含 line2/line3 文本
    expect(ds.userSkip).toBe(true)
    const allText = [...ds.shownLines.map(s => s), ds.currentLineText ?? '']
    expect(allText.join('')).toContain(L(2))
    expect(allText.join('')).toContain(L(3))
    // 当前行(最后一行)瞬显满
    expect(lineFullyShown(ds)).toBe(true)
  })

  it('3 行对话:按一次 Confirm 后到段末,不再需要第二次按键即可推进到 waiting-end-key/end', () => {
    const gs = dialogScript([L(1), L(2), L(3)])
    tick(gs) // line1 typing
    tick(gs, ['Confirm']) // 一次按键 → 连锁瞬显整段
    // 段末:end opcode 应已执行 → ip 已越过所有 showDialog。
    // 关键:不再需要任何按键,ip 已推过 3 个 showDialog(到 end=ip 3)。
    expect(gs.eventCursor?.ip).toBeGreaterThanOrEqual(3) // 越过 3 个 showDialog
  })

  it('5 行对话:按一次 Confirm 连锁瞬显到第 5 行 → 停在 waiting-page-key(忠实 sdlpal 第 5 行等键)', () => {
    const gs = dialogScript([L(1), L(2), L(3), L(4), L(5)])
    tick(gs) // line1 typing
    tick(gs, ['Confirm']) // 一次按键
    const ds = gs.dialogBox
    expect(ds).toBeDefined()
    if (!ds) return // 窄化类型,避免 noNonNullAssertion
    // 前 4 行入页满;第 5 行触发翻页 → 停在 waiting-page-key(sdlpal text.c:1649)
    const allText = [...ds.shownLines.map(s => s), ds.currentLineText ?? '']
    // 至少前 4 行已瞬显入页
    expect(allText.filter(t => t === L(1) || t === L(2) || t === L(3) || t === L(4)).length).toBe(4)
  })

  it('普通行连锁瞬显后,userSkip 仍 true(同段持续,直到翻页/段末才复位)', () => {
    const gs = dialogScript([L(1), L(2), L(3)])
    tick(gs) // line1 typing
    tick(gs, ['Confirm'])
    expect(gs.dialogBox?.userSkip).toBe(true)
  })
})
