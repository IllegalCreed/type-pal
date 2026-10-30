import { expect, it } from 'vitest'
import type { BattleBgAsset } from '../battle/draw-battle-bg.js'
import { englishEquipBackground, englishStatusBackground } from './localized-background.js'

function image(): BattleBgAsset {
  return {
    width: 320,
    height: 200,
    indices: Uint8Array.from(
      { length: 64000 },
      (_, i) => ((i % 320) * 5 + Math.floor(i / 320) * 7) % 256,
    ),
  }
}

it('removes the baked equipment labels from a copy, retaining the original Chinese background', () => {
  const source = image()
  const before = source.indices.slice()
  const english = englishEquipBackground(source)
  expect(english.indices[10 * 320 + 92]).toBe(before[138 * 320 + 92])
  expect(english.indices[70 * 320 + 226]).toBe(before[174 * 320 + 226])
  expect(source.indices).toEqual(before)
  expect(englishEquipBackground(source)).toBe(english)
})

it('moves the status image box to the requested English positions without reusing another layout', () => {
  const source = image()
  const english = englishStatusBackground(source, [{ x: 95, y: 1 }])
  const moved = englishStatusBackground(source, [{ x: 95, y: 59 }])
  expect(english.indices[2 * 320 + 96]).toBe(source.indices[40 * 320 + 248])
  expect(moved.indices[60 * 320 + 96]).toBe(source.indices[40 * 320 + 248])
  expect(moved).not.toBe(english)
  expect(englishStatusBackground(source, [{ x: 95, y: 1 }])).toBe(english)
})
