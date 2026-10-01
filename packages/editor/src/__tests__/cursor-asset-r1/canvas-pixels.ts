/**
 * TEST-CURSOR-ASSET-UI-LARGE-1 C06 真实 Canvas2D 像素读取（jsdom + node-canvas 后端）。
 * 只读 canvas 真实像素；不提供任何 2D 上下文替身。2D 不可用时 `requireRealCanvas2d` 直接失败，
 * 绝不降级为 mock（blocked 由调用方如实标注，不静默通过）。
 */
import { expect } from 'vitest'

export type Rgb = readonly [number, number, number]
export type Rgba = readonly [number, number, number, number]

export interface OpaqueBounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
  count: number
}

/** 真实 2D 探针：写入一像素并读回；不是 node-canvas 级实现时测试必须失败而不是跳过。 */
export function requireRealCanvas2d(): void {
  const canvas = document.createElement('canvas')
  canvas.width = 2
  canvas.height = 2
  const context = canvas.getContext('2d')
  expect(context, 'jsdom 必须挂接真实 Canvas2D（node-canvas）').not.toBeNull()
  context!.fillStyle = 'rgb(12, 34, 56)'
  context!.fillRect(0, 0, 1, 1)
  expect([...context!.getImageData(0, 0, 1, 1).data]).toEqual([12, 34, 56, 255])
}

export function readImage(canvas: HTMLCanvasElement): ImageData {
  const context = canvas.getContext('2d')
  if (!context) throw new Error('canvas 没有 2d 上下文')
  return context.getImageData(0, 0, canvas.width, canvas.height)
}

export function pixelAt(canvas: HTMLCanvasElement, x: number, y: number): Rgba {
  const context = canvas.getContext('2d')
  if (!context) throw new Error('canvas 没有 2d 上下文')
  const data = context.getImageData(x, y, 1, 1).data
  return [data[0] ?? 0, data[1] ?? 0, data[2] ?? 0, data[3] ?? 0]
}

/** alpha=255 的像素外接盒；无不透明像素时返回 undefined。 */
export function opaqueBounds(canvas: HTMLCanvasElement): OpaqueBounds | undefined {
  const image = readImage(canvas)
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = -1
  let maxY = -1
  let count = 0
  for (let y = 0; y < image.height; y++)
    for (let x = 0; x < image.width; x++) {
      if (image.data[(y * image.width + x) * 4 + 3] !== 255) continue
      count++
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  return count ? { minX, maxX, minY, maxY, count } : undefined
}

/** 全部 alpha=0 才算空白；半透明像素不算空白。 */
export function isBlank(canvas: HTMLCanvasElement): boolean {
  const image = readImage(canvas)
  for (let at = 3; at < image.data.byteLength; at += 4) if (image.data[at] !== 0) return false
  return true
}

export function rgbaKey(color: readonly number[]): string {
  return color.join(',')
}

/** 全部不透明像素的互异 RGBA 集合（alpha≠255 的像素被单独计入 translucent）。 */
export function colorCensus(canvas: HTMLCanvasElement): {
  opaque: Set<string>
  translucent: number
  transparent: number
} {
  const image = readImage(canvas)
  const opaque = new Set<string>()
  let translucent = 0
  let transparent = 0
  for (let at = 0; at < image.data.byteLength; at += 4) {
    const alpha = image.data[at + 3] ?? 0
    if (alpha === 255)
      opaque.add(
        rgbaKey([image.data[at] ?? 0, image.data[at + 1] ?? 0, image.data[at + 2] ?? 0, 255]),
      )
    else if (alpha === 0) transparent++
    else translucent++
  }
  return { opaque, translucent, transparent }
}

/** 范围内（含端点）每个像素都是同一不透明颜色。 */
export function uniformOpaque(
  canvas: HTMLCanvasElement,
  box: { minX: number; maxX: number; minY: number; maxY: number },
): Rgba | undefined {
  const image = readImage(canvas)
  let first: Rgba | undefined
  for (let y = box.minY; y <= box.maxY; y++)
    for (let x = box.minX; x <= box.maxX; x++) {
      const at = (y * image.width + x) * 4
      const color: Rgba = [
        image.data[at] ?? 0,
        image.data[at + 1] ?? 0,
        image.data[at + 2] ?? 0,
        image.data[at + 3] ?? 0,
      ]
      if (color[3] !== 255) return undefined
      if (!first) first = color
      else if (color.some((channel, index) => channel !== first![index])) return undefined
    }
  return first
}

export function rgbOf(color: Rgba): Rgb {
  return [color[0], color[1], color[2]]
}
