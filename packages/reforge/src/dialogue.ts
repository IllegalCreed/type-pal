/**
 * 对话翻页：纯状态机（不碰 DOM，可独立单测）。
 * start → page 0；advance → 下一页；越过最后一页 → null（结束）。
 */
import type { Dialogue, DialogueLine } from '@type-pal/content'

export interface DialogueState {
  readonly dialogue: Dialogue
  readonly page: number
}

export function startDialogue(dialogue: Dialogue): DialogueState {
  return { dialogue, page: 0 }
}

export function currentLine(state: DialogueState): DialogueLine | undefined {
  return state.dialogue.lines[state.page]
}

/** 翻页：还有下一页 → 新状态；已是最后一页 → null（对话结束）。 */
export function advance(state: DialogueState): DialogueState | null {
  const next = state.page + 1
  return next < state.dialogue.lines.length ? { dialogue: state.dialogue, page: next } : null
}
