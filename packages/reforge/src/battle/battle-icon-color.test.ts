import { afterEach, expect, test, vi } from 'vitest'
import { drawMainIcons } from './battle-ui.js'

type Raster = { width: number; height: number; pixels: Uint8ClampedArray }
function host() {
  const draws: { bitmap: Raster; x: number; y: number }[] = []
  vi.stubGlobal('document', {
    createElement: () => {
      const canvas: Raster = { width: 0, height: 0, pixels: new Uint8ClampedArray() }
      return Object.assign(canvas, {
        getContext: () => ({
          drawImage: (image: Raster) => {
            canvas.pixels = image.pixels.slice()
          },
          getImageData: () => ({ data: canvas.pixels.slice() }),
          putImageData: (image: { data: Uint8ClampedArray }) => {
            canvas.pixels = image.data.slice()
          },
        }),
      })
    },
  })
  const ctx = {
    drawImage: (bitmap: Raster, x: number, y: number) => draws.push({ bitmap, x, y }),
    save() {},
    restore() {},
  } as unknown as CanvasRenderingContext2D
  const icon = (white = 255) =>
    ({
      width: 4,
      height: 1,
      pixels: new Uint8ClampedArray([
        white,
        white,
        white,
        255,
        0,
        0,
        0,
        255,
        200,
        150,
        100,
        255,
        74,
        108,
        176,
        0,
      ]),
    }) as unknown as ImageBitmap
  return { ctx, draws, icon }
}
afterEach(() => vi.unstubAllGlobals())

test('主图标按各自底锚绘制，选中保留原图、可用灰、不可用暗红', () => {
  const { ctx, draws, icon } = host()
  const icons = [icon(), icon(), icon(), icon()]
  drawMainIcons(ctx, icons, 0, [true, true, false, true], true)

  expect(draws.map(({ x, y }) => [x, y])).toEqual([
    [27, 140],
    [0, 155],
    [54, 155],
    [27, 170],
  ])
  expect(draws[0]?.bitmap).toBe(icons[0])
  expect(Array.from(draws[1]?.bitmap.pixels ?? [])).toEqual([
    186, 186, 186, 255, 0, 0, 0, 255, 89, 89, 89, 255, 74, 108, 176, 0,
  ])
  expect(Array.from(draws[2]?.bitmap.pixels ?? [])).toEqual([
    203, 89, 77, 255, 52, 0, 0, 255, 121, 16, 12, 255, 74, 108, 176, 0,
  ])
  expect(draws[3]?.bitmap.pixels).toEqual(draws[1]?.bitmap.pixels)
})

test('同位图同色段共享成图，换位图或切不同色段互不串色', () => {
  const { ctx, draws, icon } = host()
  const first = icon()
  const second = icon(0)
  drawMainIcons(ctx, [first], 0, [true], false)
  drawMainIcons(ctx, [first], 0, [true], false)
  drawMainIcons(ctx, [second], 0, [true], false)
  expect(draws[1]?.bitmap).toBe(draws[0]?.bitmap)
  expect(draws[2]?.bitmap).not.toBe(draws[0]?.bitmap)
  expect(Array.from(draws[2]?.bitmap.pixels.slice(0, 4) ?? [])).toEqual([0, 0, 0, 255])
  drawMainIcons(ctx, [first], 0, [false], false)
  expect(Array.from(draws[3]?.bitmap.pixels.slice(0, 4) ?? [])).toEqual([203, 89, 77, 255])
})

test('缺图的槽不绘制且不挪位，选中的不可用图标仍保留原图', () => {
  const { ctx, draws, icon } = host()
  const attack = icon()
  const cooperative = icon()
  drawMainIcons(
    ctx,
    [attack, undefined, cooperative, undefined],
    2,
    [true, false, false, false],
    true,
  )

  expect(draws.map(({ x, y }) => [x, y])).toEqual([
    [27, 140],
    [54, 155],
  ])
  expect(draws[1]?.bitmap).toBe(cooperative)
})
