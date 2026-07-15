/**
 * 对话序列指针(纯状态机,不碰 DOM,可独立单测)。
 * 只管「当前是哪一个显示单元」「推进到下一个显示单元」——逐 DialogueCue 推进。
 * 分页(按显示行)在渲染层(DialogBox + layout.ts),design §6:分页由渲染层按框容量算。
 */
import type { Dialogue, DialogueCue } from '@type-pal/content'

export interface DialogueState {
  readonly dialogue: Dialogue
  readonly cueIdx: number
}

export function startDialogue(dialogue: Dialogue): DialogueState {
  return { dialogue, cueIdx: 0 }
}

/** 当前 DialogueCue(可能 undefined = 已越过末项)。 */
export function currentCue(state: DialogueState): DialogueCue | undefined {
  return state.dialogue.cues[state.cueIdx]
}

/** 推进到下一个 cue；越过末项 → null(对话结束)。 */
export function advanceCue(state: DialogueState): DialogueState | null {
  const next = state.cueIdx + 1
  return next < state.dialogue.cues.length ? { ...state, cueIdx: next } : null
}
