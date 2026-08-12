import { describe, expect, test } from 'vitest'
import { dialogSlotShowsCursor } from './dialog-box.js'

describe('DialogBox slot cursor contract', () => {
  test('center/narration 不画普通对话箭头', () => {
    expect(dialogSlotShowsCursor('center')).toBe(false)
    expect(dialogSlotShowsCursor('narration')).toBe(false)
    expect(dialogSlotShowsCursor('top')).toBe(true)
    expect(dialogSlotShowsCursor('bottom')).toBe(true)
  })
})
