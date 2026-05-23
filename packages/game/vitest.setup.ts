/**
 * jsdom 不带 createImageBitmap / ImageData。装了 canvas 包后拿它的实现顶上,
 * 让 assets/png.ts、present/framebuffer.ts 这种走浏览器原生 API 的代码能在测试里跑通。
 */
import { ImageData as CanvasImageData, loadImage } from 'canvas'

if (typeof globalThis.createImageBitmap === 'undefined') {
  // @ts-expect-error 测试环境兜底,签名只覆盖项目实际用到的 Blob 入参
  globalThis.createImageBitmap = async (source: Blob) => {
    const buffer = Buffer.from(await source.arrayBuffer())
    const img = await loadImage(buffer)
    // canvas 的 Image 没有 close(),补个 no-op 让 png.ts 的 finally 不炸
    return Object.assign(img, { close: () => {} }) as unknown as ImageBitmap
  }
}

if (typeof globalThis.ImageData === 'undefined') {
  // @ts-expect-error 测试环境兜底,canvas 的 ImageData 跟浏览器同形
  globalThis.ImageData = CanvasImageData
}
