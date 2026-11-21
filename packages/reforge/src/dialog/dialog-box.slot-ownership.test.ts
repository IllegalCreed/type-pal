// @vitest-environment jsdom
import type { DialogueCue } from '@type-pal/content'
import { expect, test } from 'vitest'
import { startDialogue } from '../dialogue.js'
import { DialogBox } from './dialog-box.js'

function dialogBox(): DialogBox {
  const context = document.createElement('canvas').getContext('2d')
  if (!context) throw new Error('test canvas unavailable')
  const glyph = { width: 8, height: 8, bitmap: new Uint8Array(8).fill(255) }
  return new DialogBox(context, { has: () => true, get: () => glyph }, [])
}

test.each([
  [undefined, 'bottom'],
  ['top', 'top'],
  ['bottom', 'bottom'],
  ['narration', 'narration'],
  ['center', 'center'],
] as const)('opening cue in %s renders text only in the %s slot', (requestedSlot, visibleSlot) => {
  const box = dialogBox()
  const rows = [{ text: 'Cue', speed: 10 }]
  const cue: DialogueCue = requestedSlot === undefined ? { rows } : { slot: requestedSlot, rows }
  expect(box.observe()).toBeNull()
  expect(box.observeSlots()).toEqual([])
  box.open(startDialogue({ id: 'slots', cues: [cue] }), 0)
  box.render(100)
  expect(box.observeSlots()).toMatchObject([
    { slot: visibleSlot, active: true, cueIndex: 0, visibleText: 'Cue' },
  ])
})

test('returning to the default slot replaces only that slot and preserves the other cue', () => {
  const box = dialogBox()
  box.open(
    startDialogue({
      id: 'slots',
      cues: [
        { rows: [{ text: 'First', speed: 10 }] },
        { slot: 'top', rows: [{ text: 'Retained', speed: 10 }] },
        { rows: [{ text: 'Replacement', speed: 10 }] },
      ],
    }),
    0,
  )
  box.render(100)
  box.advance(101)
  box.render(200)
  const earlier = box.observeSlots()
  expect(earlier).toMatchObject([
    { slot: 'bottom', active: false, cueIndex: 0, visibleText: 'First' },
    { slot: 'top', active: true, cueIndex: 1, visibleText: 'Retained' },
  ])
  box.advance(201)
  box.render(400)
  const final = box.observeSlots()
  expect(final).toMatchObject([
    { slot: 'bottom', active: true, cueIndex: 2, visibleText: 'Replacement' },
    { slot: 'top', active: false, cueIndex: 1, visibleText: 'Retained' },
  ])
  expect(final[1]?.presentationId).toBe(earlier[1]?.presentationId)
  expect(final[0]?.presentationId).not.toBe(earlier[0]?.presentationId)
})
