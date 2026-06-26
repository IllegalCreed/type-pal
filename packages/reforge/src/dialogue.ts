/**
 * 对话翻页:纯状态机(不碰 DOM,可独立单测)。
 * 按容量(linesPerPage)分页;打字 / autoAdvance / 瞬显的「时间驱动」在渲染层(② / 演出),
 * 本状态机只管「当前页是哪几行」「翻到下一页」——保持纯函数、无隐式等待态(design §6)。
 */
import type { Dialogue, DialogueLine } from '@type-pal/content'

export interface DialogueState {
  readonly dialogue: Dialogue
  readonly pageStart: number
  readonly linesPerPage: number
}

/**
 * linesPerPage 由渲染层按对话框容量定(design §6:不写死原版 4 行/页)。
 * 默认 1 仅为 ② 外观落地前的临时值;② 落地后渲染层按框容量传入(鬼话框 = 4 行)。
 */
export function startDialogue(dialogue: Dialogue, linesPerPage = 1): DialogueState {
  return { dialogue, pageStart: 0, linesPerPage }
}

/** 当前页的行(可能不足 linesPerPage,如最后一页)。 */
export function pageLines(state: DialogueState): DialogueLine[] {
  return state.dialogue.lines.slice(state.pageStart, state.pageStart + state.linesPerPage)
}

/** 翻下一页;越过最后一页 → null(对话结束)。 */
export function advancePage(state: DialogueState): DialogueState | null {
  const next = state.pageStart + state.linesPerPage
  return next < state.dialogue.lines.length ? { ...state, pageStart: next } : null
}
