/**
 * 对话序列指针(纯状态机,不碰 DOM,可独立单测)。
 * 只管「当前是哪一句」「推进到下一句」——逐 DialogueLine 推进。
 * 分页(按显示行)在渲染层(DialogBox + layout.ts),design §6:分页由渲染层按框容量算。
 */
import type { Dialogue, DialogueLine } from '@type-pal/content'

export interface DialogueState {
  readonly dialogue: Dialogue
  readonly lineIdx: number
}

export function startDialogue(dialogue: Dialogue): DialogueState {
  return { dialogue, lineIdx: 0 }
}

/** 当前 DialogueLine(可能 undefined = 已越过末句)。 */
export function currentLine(state: DialogueState): DialogueLine | undefined {
  return state.dialogue.lines[state.lineIdx]
}

/** 推进到下一句;越过末句 → null(对话结束)。 */
export function advanceLine(state: DialogueState): DialogueState | null {
  const next = state.lineIdx + 1
  return next < state.dialogue.lines.length ? { ...state, lineIdx: next } : null
}
