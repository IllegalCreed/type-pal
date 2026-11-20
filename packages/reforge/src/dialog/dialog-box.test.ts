// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'
import { startDialogue } from '../dialogue.js'
import { DialogBox, dialogSlotShowsCursor } from './dialog-box.js'

describe('DialogBox slot cursor contract', () => {
  test('center/narration 不画普通对话箭头', () => {
    expect(dialogSlotShowsCursor('center')).toBe(false)
    expect(dialogSlotShowsCursor('narration')).toBe(false)
    expect(dialogSlotShowsCursor('top')).toBe(true)
    expect(dialogSlotShowsCursor('bottom')).toBe(true)
  })
})

test('一个 Unicode 码点占一次打字间隔，后续行按时显示', () => {
  const context = document.createElement('canvas').getContext('2d')
  if (!context) throw new Error('2D canvas is required')
  const glyph = { width: 8, height: 1, bitmap: Uint8Array.of(0x80) }
  const dialog = new DialogBox(context, { has: () => true, get: () => glyph }, [])
  dialog.open(
    startDialogue({
      id: 'unicode-timing',
      cues: [
        {
          rows: [
            { text: 'A\u{20bb7}', speed: 10 },
            { text: 'B', speed: 10 },
          ],
        },
      ],
    }),
    0,
  )
  dialog.render(20)
  expect(dialog.observeSlots()[0]?.visibleText).toBe('A\u{20bb7}\n')
  dialog.render(30)
  expect(dialog.observeSlots()[0]?.visibleText).toBe('A\u{20bb7}\nB')
  expect(dialog.observe()?.phase).toBe('waiting-input')
})
