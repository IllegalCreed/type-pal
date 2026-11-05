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
  // Literal source/destination boundaries from the four SDLPal erasure bands.
  for (const [x, y, sy] of [
    [92, 8, 136],
    [123, 71, 199],
    [92, 72, 136],
    [123, 135, 199],
    [226, 9, 113],
    [257, 89, 193],
    [226, 99, 115],
    [257, 112, 128],
  ] as const) {
    expect(english.indices[y * 320 + x]).toBe(before[sy * 320 + x])
  }
  for (const [x, y] of [
    [91, 8],
    [124, 8],
    [92, 7],
    [92, 136],
    [225, 9],
    [258, 9],
    [226, 90],
    [226, 113],
  ] as const) {
    expect(english.indices[y * 320 + x]).toBe(before[y * 320 + x])
  }
  expect(source.indices).toEqual(before)
  expect(englishEquipBackground(source)).toBe(english)
})

it('moves the status image box to the requested English positions without reusing another layout', () => {
  const source = image()
  const before = source.indices.slice()
  const english = englishStatusBackground(source, [{ x: 95, y: 1 }])
  const moved = englishStatusBackground(source, [{ x: 95, y: 59 }])
  expect(english.indices[2 * 320 + 96]).toBe(source.indices[40 * 320 + 248])
  expect(moved.indices[60 * 320 + 96]).toBe(source.indices[40 * 320 + 248])
  expect(english.indices[49 * 320 + 144]).toBe(before[87 * 320 + 296])
  expect(source.indices).toEqual(before)
  expect(moved).not.toBe(english)
  expect(englishStatusBackground(source, [{ x: 95, y: 1 }])).toBe(english)
})

it('clips boxes at both screen edges and keeps cache ownership with the source image', () => {
  const source = image()
  const result = englishStatusBackground(source, [
    { x: -1, y: -1 },
    { x: 319, y: 199 },
  ])
  expect(result.indices[0]).toBe(source.indices[40 * 320 + 248])
  expect(result.indices[47 * 320 + 48]).toBe(source.indices[87 * 320 + 296])
  expect(result.indices[199 * 320 + 319]).toBe(source.indices[39 * 320 + 247])
  expect(result.indices).toHaveLength(64000)
  const other = image()
  other.indices[39 * 320 + 247] = 222
  expect(englishStatusBackground(other, [{ x: 319, y: 199 }]).indices[63999]).toBe(222)
  expect(source.indices[39 * 320 + 247]).not.toBe(222)
})
