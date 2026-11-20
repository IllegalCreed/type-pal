import { expect, test } from 'vitest'
import { sliceAtlasGrid } from './quantize.js'

test('完整格按行优先读像素，右侧和下方不足一格时裁去余边', () => {
  const input = new Uint8ClampedArray(5 * 5 * 4)
  for (let pixel = 0; pixel < 25; pixel++) input.set([pixel, 17, 33, 255 - pixel], pixel * 4)
  const before = input.slice()
  const tiles = sliceAtlasGrid(input, 5, 5, 2, 2)

  expect(tiles).toHaveLength(4)
  expect(tiles.map(({ width, height }) => [width, height])).toEqual([
    [2, 2],
    [2, 2],
    [2, 2],
    [2, 2],
  ])
  expect(tiles.map(({ rgba }) => [rgba[0], rgba[4], rgba[8], rgba[12]])).toEqual([
    [0, 1, 5, 6],
    [2, 3, 7, 8],
    [10, 11, 15, 16],
    [12, 13, 17, 18],
  ])
  expect(tiles[3]?.rgba.slice(12, 16)).toEqual(Uint8Array.of(18, 17, 33, 237))
  tiles[0]?.rgba.fill(0)
  expect(input).toEqual(before)
})

test('图集不足一个完整格时不产出，格尺寸为零明确报错', () => {
  const pixels = new Uint8Array(8)
  expect(sliceAtlasGrid(pixels, 2, 1, 4, 1)).toEqual([])
  expect(() => sliceAtlasGrid(pixels, 2, 1, 0, 1)).toThrow('瓦片尺寸须为正')
})
