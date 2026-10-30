import type { Palette } from '@type-pal/shared'
import { expect, it } from 'vitest'
import { indexImageToCanvas } from './dev-indexed-image.js'

it('索引图按palette上色并保留透明mask，canvas尺寸使用原图像素', () => {
  const palette: Palette = { colors: Array.from({ length: 256 }, () => [0, 0, 0]), cycles: [] }
  palette.colors[1] = [10, 20, 30]
  palette.colors[2] = [40, 50, 60]
  palette.colors[3] = [70, 80, 90]
  palette.colors[255] = [100, 110, 120]
  const canvas = indexImageToCanvas(
    {
      width: 2,
      height: 2,
      indices: new Uint8Array([1, 2, 3, 255]),
      opaque: new Uint8Array([1, 0, 1, 1]),
    },
    palette,
  )
  expect([canvas.width, canvas.height]).toEqual([2, 2])
  const context = canvas.getContext('2d')
  expect(context).not.toBeNull()
  expect([...context!.getImageData(0, 0, 2, 2).data]).toEqual([
    10, 20, 30, 255, 0, 0, 0, 0, 70, 80, 90, 255, 100, 110, 120, 255,
  ])
})
