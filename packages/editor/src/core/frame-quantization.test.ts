import { expect, test } from 'vitest'
import { quantizeCompleteFrame } from './frame-animation-draft.js'

const palette = [
  [0, 0, 0],
  [255, 255, 255],
] as const
const gray = (value: number, alpha = 255) => [value, value, value, alpha]

test('dithering carries error to the next row while skipping transparent pixels and preserving alpha', () => {
  const pixels = Uint8Array.of(...gray(100), ...gray(100, 0), ...gray(100, 128), ...gray(100))
  expect([...quantizeCompleteFrame(pixels, 2, 2, palette)]).toEqual([
    ...gray(0),
    ...gray(100, 0),
    ...gray(0, 128),
    ...gray(0),
  ])
  // The first pixel's downward share moves the third pixel over the 127.5 midpoint.
  expect([...quantizeCompleteFrame(pixels, 2, 2, palette, 'floyd-steinberg')]).toEqual([
    ...gray(0),
    ...gray(100, 0),
    ...gray(255, 128),
    ...gray(0),
  ])
  expect([...pixels]).toEqual([...gray(100), ...gray(100, 0), ...gray(100, 128), ...gray(100)])
})
