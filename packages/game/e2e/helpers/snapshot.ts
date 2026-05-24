import type { Page } from '@playwright/test'

/**
 * 截 canvas 像素到 PNG buffer。
 * type-pal canvas 是 320×200 物理像素(D12 软件帧缓冲,vite 上层 canvas 元素可能 scaled
 * 显示,但 toDataURL 输出物理像素 PNG)。
 */
export async function snapshotCanvas(page: Page): Promise<Buffer> {
  const dataUrl = await page.evaluate(() => {
    const canvas = document.querySelector('canvas')
    if (!canvas) throw new Error('no canvas')
    return canvas.toDataURL('image/png')
  })
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, '')
  return Buffer.from(base64, 'base64')
}
