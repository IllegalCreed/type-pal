import { expect, test } from 'vitest'
import { advanceSlots, emptySlots } from './slot.js'

test('初始状态预选下槽，四个槽都未被占用', () => {
  expect(emptySlots()).toStrictEqual({ activeSlot: 'bottom' })
})

test.each(['top', 'bottom', 'narration', 'center'] as const)('载入对白后选中 %s 槽', (slot) => {
  expect(advanceSlots(emptySlots(), { slot, rows: [{ text: 'first' }] }, 0)).toStrictEqual({
    [slot]: { cueIdx: 0 },
    activeSlot: slot,
  })
})

test('未指定槽时覆盖下槽，另一侧与输入快照保留', () => {
  const bottom = advanceSlots(emptySlots(), { rows: [{ text: 'first' }] }, 0)
  const both = advanceSlots(bottom, { slot: 'top', rows: [{ text: 'second' }] }, 1)
  const replaced = advanceSlots(both, { rows: [{ text: 'third' }] }, 2)

  expect(bottom).toEqual({ bottom: { cueIdx: 0 }, activeSlot: 'bottom' })
  expect(both).toEqual({ bottom: { cueIdx: 0 }, top: { cueIdx: 1 }, activeSlot: 'top' })
  expect(replaced).toEqual({ bottom: { cueIdx: 2 }, top: { cueIdx: 1 }, activeSlot: 'bottom' })
})
