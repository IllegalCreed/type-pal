/**
 * slot 状态机(② 外观 Task 6):管理 top/bottom 两槽各自显示哪段话。
 * 纯函数,不碰 DOM/canvas。语义(design §4):
 * - 同 slot 连续段 = 覆盖(新段清掉旧段)
 * - 异 slot = 共存(旧 slot 留显,新 slot 成活跃)
 * - 推进只推活跃槽(最新进槽的段)
 * 排版(displayLines/pageStart)不在此,归 DialogBox(它持 glyphs)。
 */
import type { DialogueLine } from '@type-pal/content'

export type SlotId = 'top' | 'bottom'

export interface SlotEntry {
  lineIdx: number // 该槽当前显示的是第几段话
}

export interface SlotState {
  top?: SlotEntry
  bottom?: SlotEntry
  activeSlot: SlotId
}

export function emptySlots(): SlotState {
  return { activeSlot: 'bottom' }
}

/**
 * 把一段话放进它的 slot(默认 bottom)。
 * 同 slot 覆盖(替换 entry),异 slot 共存(旧槽不动),该 slot 成活跃。
 */
export function advanceSlots(state: SlotState, line: DialogueLine, lineIdx: number): SlotState {
  const slot: SlotId = line.slot ?? 'bottom'
  return {
    ...state,
    [slot]: { lineIdx },
    activeSlot: slot,
  }
}
