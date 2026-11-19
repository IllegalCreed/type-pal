/** 战斗对话队列的逐tick消费：只拥有对话宿主字段及内联演出请求，不路由战斗phase。 */
import type { DialogBoxStyle, InputSnapshot } from '@type-pal/shared'
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
import {
  OP_DELAY,
  OP_ENEMY_ESCAPE,
  OP_PLAY_CD_MUSIC,
  OP_PLAY_MUSIC,
  OP_PLAY_SOUND,
  OP_STOP_MUSIC,
} from '../script-opcode-ids.js'
import { BATTLE_FRAME_TIME } from './anim-timeline.js'
import type { BattleState } from './battle-state.js'

type BattleDialogHost = Pick<
  GameState,
  'dialogBox' | 'dialogBoxKept' | 'pendingSounds' | 'wNumMusic' | 'musicLoop'
>
type BattleDialogState = Pick<
  BattleState,
  | 'battleDialogQueue'
  | 'phaseStallTicks'
  | 'battleDialogNarrationFrames'
  | 'battleDialogTypingAccMs'
  | 'battleDialogWaitMs'
  | 'scriptMusicActive'
  | 'enemyEscapeAnim'
>
const BATTLE_DT = BATTLE_FRAME_TIME

/** narration 风格(物品提示式)自动消失时长 = 1.4s(sdlpal PAL_DialogWaitForKeyWithMaximumSeconds(1.4),text.c:1701)。 */
const BATTLE_DIALOG_NARRATION_MS = 1400

/** Consume adjacent effects in one beat. A delay stays queued until its full script time elapses. */
function consumeBattleDialogueEffects(state: BattleDialogState, gs: BattleDialogHost): boolean {
  const queue = state.battleDialogQueue
  while (queue?.[0]?.effect) {
    const { opcode, operands } = queue[0].effect
    const [first = 0, second = 0] = operands
    if (opcode === OP_DELAY) {
      const remaining =
        state.battleDialogWaitMs === undefined ? first * 80 : state.battleDialogWaitMs - BATTLE_DT
      if (remaining > 0) {
        state.battleDialogWaitMs = remaining
        return true
      }
      state.battleDialogWaitMs = undefined
    }
    queue.shift()
    switch (opcode) {
      case OP_ENEMY_ESCAPE:
        state.enemyEscapeAnim = { step: 0 }
        gs.pendingSounds ??= []
        gs.pendingSounds.push(45)
        return true
      case OP_PLAY_SOUND:
        gs.pendingSounds ??= []
        gs.pendingSounds.push(first)
        break
      case OP_PLAY_MUSIC:
      case OP_PLAY_CD_MUSIC:
      case OP_STOP_MUSIC:
        state.scriptMusicActive = true
        gs.wNumMusic = opcode === OP_PLAY_CD_MUSIC ? second : opcode === OP_STOP_MUSIC ? 0 : first
        gs.musicLoop = opcode === OP_PLAY_CD_MUSIC || (opcode === OP_PLAY_MUSIC && second !== 1)
        break
    }
  }
  return false
}

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
 * Use the same per-character reveal times as world dialogue, sampling with the battle clock.
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

  // (A) The current page is closed. Play ordered effects before opening the next page.
  if (!gs.dialogBox) {
    if (consumeBattleDialogueEffects(state, gs)) return true
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

  const wasFullyRevealed = box.charsRevealed >= (box.currentLineText?.length ?? 0)
  const elapsed = (state.battleDialogTypingAccMs ?? 0) + BATTLE_DT
  state.battleDialogTypingAccMs = elapsed
  tickDialog(box, elapsed)

  // The menu key is also allowed to skip a timed line's typing, without shortening its tail.
  if (
    input.pressed.has('Confirm') ||
    (box.currentLineEndedWithTilde && input.pressed.has('Menu'))
  ) {
    const result = confirmDialog(box, elapsed)
    if (result === 'skip-typing') {
      return true // 本 tick 整行显满;下 tick 才走 line-done 推进(同大世界 fUserSkip)
    }
    if (result === 'page-advance') {
      feedNextBattleDialogLine(state, gs) // 4 行翻页清完 → append 下一行到清空的 box
      return true
    }
    if (result === 'dialog-end') {
      closeBattleDialogPage(state, gs, box)
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
    if (box.currentLineEndedWithTilde) {
      // TEXT_DisplayText resets the line count before PAL_ClearDialog can ask for a key.
      if (box.lineDoneRenderPending && !wasFullyRevealed) {
        box.lineDoneRenderPending = false
        return true
      }
      // A localized page clear carries no style. Resolve it before checking the next page.
      const queue = state.battleDialogQueue
      const clearPage = queue?.[0]?.clearPage
      while (queue?.[0]?.clearPage) queue.shift()
      const next = queue?.[0]
      const continuesPage = next?.style === box.style && !next.clearBefore
      if (clearPage || continuesPage) resetDialogBody(box)
      if (!continuesPage) closeBattleDialogPage(state, gs, box)
      if (next && !next.effect) feedNextBattleDialogLine(state, gs)
      return true
    }
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

function closeBattleDialogPage(
  state: BattleDialogState,
  gs: BattleDialogHost,
  box: NonNullable<BattleDialogHost['dialogBox']>,
): void {
  const next = state.battleDialogQueue?.[0]
  // PAL_StartDialog can show the opposite portrait and text while the previous box is still visible.
  gs.dialogBoxKept =
    next?.style && !next.clearBefore && isVerticalDialogSwap(box.style, next.style)
      ? box
      : undefined
  gs.dialogBox = undefined
  state.battleDialogTypingAccMs = 0
}

/** 从 battleDialogQueue 取下一行喂进 gs.dialogBox(无 box → startDialogLine;有 → appendDialogLine)。 */
function feedNextBattleDialogLine(state: BattleDialogState, gs: BattleDialogHost): void {
  const queue = state.battleDialogQueue
  if (!queue) return
  const line = queue[0]
  if (!line || line.effect) return
  queue.shift()
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
