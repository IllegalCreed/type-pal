import { afterEach, expect, test, vi } from 'vitest'
import { drawMainIcons } from './battle-ui.js'

type Raster = { width: number; height: number; pixels: Uint8ClampedArray }
function host() {
  const draws: Raster[] = []
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
    drawImage: (image: Raster) => draws.push(image),
    save() {},
    restore() {},
  } as unknown as CanvasRenderingContext2D
  const icon = (white = 255) =>
    ({
      width: 3,
      height: 1,
      pixels: new Uint8ClampedArray([white, white, white, 255, 0, 0, 0, 255, 74, 108, 176, 0]),
    }) as unknown as ImageBitmap
  return { ctx, draws, icon }
}
afterEach(() => vi.unstubAllGlobals())

test('engine chrome keeps selected color / inactive gray / disabled red without a project palette', () => {
  const { ctx, draws, icon } = host()
  const icons = [icon(), icon(), icon(), icon()]
  drawMainIcons(ctx, icons, 0, [true, true, false, true], true)
  expect(draws[0]).toBe(icons[0])
  expect([...draws[1]!.pixels]).toEqual([186, 186, 186, 255, 0, 0, 0, 255, 74, 108, 176, 0])
  expect([...draws[2]!.pixels]).toEqual([203, 89, 77, 255, 52, 0, 0, 255, 74, 108, 176, 0])
  expect([...draws[3]!.pixels]).toEqual([...draws[1]!.pixels])
})

test('cached colors belong to the actual chrome bitmap, not its slot number or another run', () => {
  const { ctx, draws, icon } = host()
  const first = icon(),
    second = icon(0)
  drawMainIcons(ctx, [first], 0, [true], false)
  drawMainIcons(ctx, [first], 0, [true], false)
  drawMainIcons(ctx, [second], 0, [true], false)
  expect(draws[1]).toBe(draws[0])
  expect(draws[2]).not.toBe(draws[0])
  expect([...draws[2]!.pixels.slice(0, 4)]).toEqual([0, 0, 0, 255])
  drawMainIcons(ctx, [first], 0, [false], false)
  expect([...draws[3]!.pixels.slice(0, 4)]).toEqual([203, 89, 77, 255])
})
