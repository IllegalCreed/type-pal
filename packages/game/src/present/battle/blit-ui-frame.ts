import type { IndexedImage } from '../../assets/png.js'
import type { Framebuffer } from '../framebuffer.js'

/** 左上角定位的 UI 图块；借用只读像素，mask 决定透明，屏幕裁剪由 Framebuffer 负责。 */
export function blitUiFrame(
  fb: Framebuffer,
  frame: IndexedImage,
  dstX: number,
  dstY: number,
): void {
  for (let y = 0; y < frame.height; y++) {
    for (let x = 0; x < frame.width; x++) {
      const off = y * frame.width + x
      if (frame.opaque[off]! > 0) fb.writePixel(dstX + x, dstY + y, frame.indices[off]!)
    }
  }
}
