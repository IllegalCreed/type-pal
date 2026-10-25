/** 战斗对话队列的逐tick消费：只拥有对话宿主字段及内联演出请求，不路由战斗phase。 */
import type { DialogBoxStyle, InputSnapshot } from '@type-pal/shared'
import { FRAME_MS_EXPLORE } from '@type-pal/shared'
import {
  appendDialogLine,
  confirmDialog,
  resetDialogBody,
  setWaitingEndKey,
  setWaitingPageKey,
  shouldWaitPageKey,
  startDialogLine,
  tickDialog,
} from '../../present/dialog-box.js'
import type { GameState } from '../game-state.js'
import { BATTLE_FRAME_TIME } from './anim-timeline.js'
import type { BattleState } from './battle-state.js'

type BattleDialogHost = Pick<GameState, 'dialogBox' | 'dialogBoxKept' | 'pendingSounds'>
type BattleDialogState = Pick<
  BattleState,
  | 'battleDialogQueue'
  | 'phaseStallTicks'
  | 'battleDialogNarrationFrames'
  | 'battleDialogTypingAccMs'
  | 'enemyEscapeAnim'
>
const BATTLE_DT = BATTLE_FRAME_TIME

/** narration 风格(物品提示式)自动消失时长 = 1.4s(sdlpal PAL_DialogWaitForKeyWithMaximumSeconds(1.4),text.c:1701)。 */
const BATTLE_DIALOG_NARRATION_MS = 1400

/** 上下位置互换(top↔bottom)—— 同屏共存的两位置对话框判定(center/narration 不参与)。 */
function isVerticalDialogSwap(a: DialogBoxStyle, b: DialogBoxStyle): boolean {
  return (a === 'top' && b === 'bottom') || (a === 'bottom' && b === 'top')
}

/**
 * 战斗内对话 hold —— **phase-agnostic**(忠实 sdlpal PAL_ShowDialogText 同步 blocking,text.c:1701)。
 *
 * 战斗脚本(scriptOnReady / scriptOnTurnStart 等)的 0xFFFF showDialog 由 runScript 收集到
 * state.battleDialogQueue(runScript 同步跑完无法跨 tick 阻塞);此 hold 逐 tick 把队列喂进
 * **复用的大世界** gs.dialogBox(startDialogLine/appendDialogLine 行累积 + tickDialog 打字 +
 * confirmDialog page/end-key),期间暂停一切战斗推进。放在 tickBattle 顶层(fade 之后)。
 *
 * CLASSIC 真值:battle dialog 走普通 dialog box(top/bottom 多行翻页 + 等键;narration 1.4s 自消),
 * `#ifndef PAL_CLASSIC` 的战斗飘字 PAL_BattleUIShowText 在 classic build 被编译掉(text.c:1668-1672)。
 *
 * 既有战斗节拍:每tick累计40ms，满100ms后调用一次不带now的tickDialog（使用tick计时）。
 * 大世界caller另传墙钟now；本次职责拆分保持战斗原节拍，不声称两者逐字显示时刻完全一致。
 *
 * @returns true = 本tick被队列/等键/内联effect占用，caller早退暂停战斗；不只指已有可见框。
 */
export function advanceBattleDialog(
  state: BattleDialogState,
  gs: BattleDialogHost,
  input: InputSnapshot,
): boolean {
  const queueLen = state.battleDialogQueue?.length ?? 0
  // 无 active dialogBox 且队列空 → 对话整段结束(放行)。一并清掉同屏共存的反位置框。
  if (!gs.dialogBox && queueLen === 0) {
    gs.dialogBoxKept = undefined
    return false
  }

  // 对话是合法的玩家等待(非卡死)→ 清 phase stall 计数,避免长时间等键被 60s 看门狗强退。
  state.phaseStallTicks = 0

  // (A) 无 active box 但队列有行 → 起首行 / 或处理内联 effect(D26(2b))
  if (!gs.dialogBox) {
    const next = state.battleDialogQueue?.[0]
    if (next?.effect) {
      // D26(2b):dialog 序列中的内联可见 effect 按位置 dispatch(目前仅 0x69 敌逃跑)。
      //   0x69 → set enemyEscapeAnim(= dispatchBattleOpcode 的 0x69 handler,battle.c:1399
      //   PAL_BattleEnemyEscape)→ 下 tick tickBattleEnemyEscapeAnim（优先于本hold）飞出敌人
      //   → phase='fleed';飞完后队列后续 narration 仍由本 hold 显示,再 finalize。
      //   时序:嘲讽对话 → [逃跑动画] → narration「逃走了」→ fleed,忠实 sdlpal 脚本顺序。
      state.battleDialogQueue!.shift()
      if (next.effect.opcode === 0x69) {
        state.enemyEscapeAnim = { step: 0 }
        gs.pendingSounds ??= []
        gs.pendingSounds.push(45) // 敌逃跑音(battle.c:1397)
      }
      return true
    }
    feedNextBattleDialogLine(state, gs)
    return true
  }

  const box = gs.dialogBox

  // (B) narration 风格:满 1.4s 或任意键 → 自动消(sdlpal text.c:1663-1710 CenterWindow 计时自清)
  if (box.style === 'narration') {
    state.battleDialogNarrationFrames = (state.battleDialogNarrationFrames ?? 0) + BATTLE_DT
    const anyKey = input.pressed.size > 0
    if (anyKey || state.battleDialogNarrationFrames >= BATTLE_DIALOG_NARRATION_MS) {
      gs.dialogBox = undefined
      state.battleDialogNarrationFrames = 0
      state.battleDialogTypingAccMs = 0
      // 队列还有后续行 → 继续 hold(下 tick 起下一行)。
      // **被按键消掉** → 本 tick 仍 hold(吃掉该键),避免同一按键漏进战斗菜单(sdlpal 对话后
      //   PAL_ClearKeyState,ts 用"消费本 tick"等价);超时消失无键可漏,空队列才放行。
      return anyKey || (state.battleDialogQueue?.length ?? 0) > 0
    }
    return true // 仍在显示 narration(等 1.4s / 任意键)
  }

  // (C) 普通 typing dialog —— 节拍累加,驱动 tickDialog 在 100ms cadence
  state.battleDialogTypingAccMs = (state.battleDialogTypingAccMs ?? 0) + BATTLE_DT
  while (state.battleDialogTypingAccMs >= FRAME_MS_EXPLORE) {
    state.battleDialogTypingAccMs -= FRAME_MS_EXPLORE
    tickDialog(box)
  }

  // Confirm 处理(phase 决定):skip-typing / page-advance / dialog-end
  if (input.pressed.has('Confirm')) {
    const result = confirmDialog(box)
    if (result === 'skip-typing') {
      return true // 本 tick 整行显满;下 tick 才走 line-done 推进(同大世界 fUserSkip)
    }
    if (result === 'page-advance') {
      feedNextBattleDialogLine(state, gs) // 4 行翻页清完 → append 下一行到清空的 box
      return true
    }
    if (result === 'dialog-end') {
      const next = state.battleDialogQueue?.[0]
      // 上下位置切换(top↔bottom,非 clearBefore)→ **保留旧框**(林月如 top 不消失,下面接着出李逍遥
      //   bottom),对照 sdlpal upper/lower 同屏共存(PAL_StartDialog 不擦旧框)。把旧框移入 dialogBoxKept
      //   (反位置冻结框);否则普通结束 → 清掉两者。
      // effect 条目(next.style undefined)非上下位置切换 → 不保留旧框。
      if (
        next?.style &&
        !next.clearBefore &&
        isVerticalDialogSwap(gs.dialogBox.style, next.style)
      ) {
        gs.dialogBoxKept = gs.dialogBox
      } else {
        gs.dialogBoxKept = undefined
      }
      gs.dialogBox = undefined
      state.battleDialogTypingAccMs = 0
      // **本 tick 吃掉关框的 Confirm** —— 否则同一 Confirm 同 tick 漏进战斗菜单触发普通攻击
      //   (user 2026-05-31 实测:对话最后一个 space 同时结束对话 + 选了普通攻击)。
      //   sdlpal PAL_ShowDialogText 返回后 PAL_ClearKeyState 清键;ts 用"消费本 tick + 下 tick 菜单
      //   只认新按下的 pressed(edge)"等价。队列还有(clearBefore/换风格)也 hold,下 tick 起新框。
      return true
    }
    // 'noop':line-done 等 → 落下面自动推进
  }

  // line-done 自动推进(sdlpal 行间不停):喂下一行 / 满页等键 / 队列空等结束键
  if (box.phase === 'line-done') {
    const next = state.battleDialogQueue?.[0]
    if (!next) {
      setWaitingEndKey(box) // 无后续 → 等结束键(Confirm 关 box)
    } else if (next.clearPage) {
      if (box.dialogLineCount > 0) setWaitingPageKey(box)
      else feedNextBattleDialogLine(state, gs)
    } else if (next.clearBefore || next.style !== box.style) {
      setWaitingEndKey(box) // 新段(显式清屏 / 风格变)→ 先结束当前段,下段起新框
    } else if (shouldWaitPageKey(box)) {
      setWaitingPageKey(box) // 满 4 行 → 等翻页键
    } else {
      feedNextBattleDialogLine(state, gs) // 同段同风格未满页 → append 下一行(继续打字)
    }
  }
  return true
}

/** 从 battleDialogQueue 取下一行喂进 gs.dialogBox(无 box → startDialogLine;有 → appendDialogLine)。 */
function feedNextBattleDialogLine(state: BattleDialogState, gs: BattleDialogHost): void {
  const line = state.battleDialogQueue?.shift()
  if (!line) return
  // D26(2b)防御:effect 条目正常由 advanceBattleDialog (A) 分支处理;若经此(段边界 page-advance)→ 同样 dispatch。
  if (line.effect) {
    if (line.effect.opcode === 0x69) {
      state.enemyEscapeAnim = { step: 0 }
      gs.pendingSounds ??= []
      gs.pendingSounds.push(45) // 敌逃跑音(battle.c:1397)
    }
    return
  }
  if (line.clearPage) {
    if (gs.dialogBox) resetDialogBody(gs.dialogBox)
    return
  }
  const text = line.text ?? ''
  if (!gs.dialogBox) {
    gs.dialogBox = startDialogLine(text, {
      style: line.style ?? 'bottom',
      portraitIcon: line.portrait,
      fontColor: line.fontColor,
    })
  } else {
    appendDialogLine(gs.dialogBox, text)
  }
  state.battleDialogTypingAccMs = 0
  state.battleDialogNarrationFrames = 0
}
