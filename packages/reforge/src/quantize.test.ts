import type { Palette } from '@type-pal/shared'
import { expect, test } from 'vitest'
import { quantizeToRleFrame } from './quantize.js'

const palette: Palette = {
  colors: [
    [0, 0, 0],
    [255, 0, 0],
    [0, 255, 0],
    [0, 0, 255],
    [250, 250, 250],
  ],
  cycles: [],
}

test('精确色、近似色和透明像素各自输出色号与遮罩', () => {
  const input = Uint8Array.of(
    255,
    0,
    0,
    255,
    240,
    20,
    10,
    255,
    10,
    250,
    5,
    255,
    0,
    0,
    0,
    50,
    252,
    252,
    252,
    255,
    0,
    0,
    0,
    255,
  )
  const frame = quantizeToRleFrame(input, 3, 2, palette)
  expect(frame).toStrictEqual({
    width: 3,
    height: 2,
    pixels: Uint8Array.of(1, 1, 2, 0, 4, 0),
    opaque: Uint8Array.of(1, 1, 1, 0, 1, 1),
  })
})

test('全透明保留四个透明像素，缺字节明确报错', () => {
  expect(quantizeToRleFrame(new Uint8Array(16), 2, 2, palette).opaque).toEqual(new Uint8Array(4))
  expect(() => quantizeToRleFrame(Uint8Array.of(0, 0, 0), 2, 2, palette)).toThrow('像素数据不足')
})

test('Canvas RGBA 的透明边界和同色缓存不改输入', () => {
  const input = Uint8ClampedArray.of(0, 0, 255, 127, 0, 0, 255, 128, 0, 0, 250, 255, 0, 0, 255, 255)
  const before = input.slice()
  const frame = quantizeToRleFrame(input, 2, 2, palette)
  expect(frame.pixels).toEqual(Uint8Array.of(0, 3, 3, 3))
  expect(frame.opaque).toEqual(Uint8Array.of(0, 1, 1, 1))
  expect(input).toEqual(before)
  expect(palette.colors[3]).toEqual([0, 0, 255])
})

test('两盘色等距时选低色号，稀疏槽跳过且保留色号', () => {
  const colors: Palette['colors'] = []
  colors[1] = [10, 10, 10]
  colors[2] = [20, 20, 20]
  const frame = quantizeToRleFrame(Uint8Array.of(15, 15, 15, 255), 1, 1, { colors, cycles: [] })
  expect(frame.pixels).toEqual(Uint8Array.of(1))
  expect(frame.opaque).toEqual(Uint8Array.of(1))
})
