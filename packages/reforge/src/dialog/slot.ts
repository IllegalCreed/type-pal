import type { DialogueCue } from '@type-pal/content'

export type SlotId = 'top' | 'bottom' | 'narration' | 'center'

interface SlotEntry {
  cueIdx: number
}

export interface SlotState {
  top?: SlotEntry
  bottom?: SlotEntry
  narration?: SlotEntry
  center?: SlotEntry
  activeSlot: SlotId
}

export function emptySlots(): SlotState {
  return { activeSlot: 'bottom' }
}

/** 最近收到对白的槽负责推进。其它槽继续占用原位置，排版由 DialogBox 持有。 */
export function advanceSlots(state: SlotState, cue: DialogueCue, cueIdx: number): SlotState {
  const slot: SlotId = cue.slot ?? 'bottom'
  return {
    ...state,
    [slot]: { cueIdx },
    activeSlot: slot,
  }
}
