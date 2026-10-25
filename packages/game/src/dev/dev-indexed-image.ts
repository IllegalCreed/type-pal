import type { Palette } from '@type-pal/shared'

/**
 * 把已解码索引图(indices + opaque mask)用调色板上色画到 DOM canvas。
 * portraits PNG 是索引位图(非真彩),直接 <img> 会错色 —— 必须 palette 上色(同 framebuffer.toImageData)。
 */
export function indexImageToCanvas(
  img: { width: number; height: number; indices: Uint8Array; opaque: Uint8Array },
  palette: Palette,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const data = new Uint8ClampedArray(img.width * img.height * 4)
    for (let i = 0; i < img.indices.length; i++) {
      const col = palette.colors[img.indices[i]!] ?? [0, 0, 0]
      data[i * 4] = col[0]
      data[i * 4 + 1] = col[1]
      data[i * 4 + 2] = col[2]
      data[i * 4 + 3] = img.opaque[i] ? 255 : 0 // RLE-skip 透明 → alpha 0
    }
    ctx.putImageData(new ImageData(data, img.width, img.height), 0, 0)
  }
  // canvas保留原图像素尺寸；头像、敌人缩略图和物品图标各由caller设置显示尺寸。
  return canvas
}
