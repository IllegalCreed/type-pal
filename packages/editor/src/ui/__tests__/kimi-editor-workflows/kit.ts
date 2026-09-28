/**
 * TEST-KIMI-EDITOR-WORKFLOWS-1 共享夹具（只被本卡新增测试导入，不被生产引用）。
 *
 * 边界纪律：
 * - PNG 编码器产出真实可解码字节（真 IHDR/CRC-32/IDAT zlib-stored 扫描线/IEND），
 *   像素由调用方显式交付，不是固定占位产物。
 * - 唯一替身是浏览器硬件端口：jsdom 无 createImageBitmap，这里用 node-canvas loadImage
 *   做真实 PNG 解码；jsdom 2d canvas 本身已由 node-canvas 后端提供真实像素读写，
 *   故 drawImage/getImageData 链路为真。DataTransfer 为 jsdom 缺失对象，按 HTML DnD
 *   存储语义实现（setData 后 types 可见、getData 取回），不伪造业务结果。
 * - gatedFileSource 只在磁盘 I/O 端口制造可观测的迟到读取，被测的 reader/cache/组件
 *   全部保持真实实现。
 */

// @ts-expect-error Node test-host bridge only.
import { Buffer, Blob as NodeBlob } from 'node:buffer'
// @ts-expect-error Node test-host bridge only.
import { webcrypto } from 'node:crypto'
// @ts-expect-error Node test-host bridge only.
import { createRequire } from 'node:module'
// @ts-expect-error Node test-host bridge only.
import { dirname, join } from 'node:path'
// @ts-expect-error Node test-host bridge only.
import { fileURLToPath } from 'node:url'
import type { FileSource } from '@type-pal/reforge'
import { vi } from 'vitest'
import { deferred } from '../glm-ui-wave-kit.js'

/** 本文件真实磁盘路径（vitest 下 import.meta.url 可能是 http /@fs 形式，两种都还原）。 */
function selfDir(): string {
  const url = new URL(import.meta.url)
  if (url.protocol === 'file:') return dirname(fileURLToPath(url))
  return dirname(decodeURIComponent(url.pathname.replace(/^\/@fs(?=\/)/, '')))
}

function concatBytes(parts: readonly Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.byteLength
  }
  return out
}

function pngCrc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}

/** RFC1951 stored 块 + RFC1950 zlib 头尾（Adler-32），可独立解压。 */
function zlibWrapStored(raw: Uint8Array): Uint8Array {
  const blocks: Uint8Array[] = []
  for (let at = 0; at < raw.byteLength || at === 0; at += 65535) {
    const slice = raw.subarray(at, Math.min(at + 65535, raw.byteLength))
    const isFinal = at + 65535 >= raw.byteLength
    const block = new Uint8Array(5 + slice.byteLength)
    block[0] = isFinal ? 1 : 0
    block[1] = slice.byteLength & 0xff
    block[2] = slice.byteLength >> 8
    block[3] = ~slice.byteLength & 0xff
    block[4] = (~slice.byteLength >> 8) & 0xff
    block.set(slice, 5)
    blocks.push(block)
    if (isFinal) break
  }
  const body = concatBytes(blocks)
  const head = new Uint8Array([0x78, 0x01])
  let a = 1
  let b = 0
  for (const byte of raw) {
    a = (a + byte) % 65521
    b = (b + a) % 65521
  }
  const adler = ((b << 16) | a) >>> 0
  const tail = new Uint8Array(4)
  const view = new DataView(tail.buffer)
  view.setUint32(0, adler)
  return concatBytes([head, body, tail])
}

/** 真实 PNG 编码：filter-0 RGBA8 扫描线，像素逐字节取自调用方交付的 rgba。 */
export function pngRgba(width: number, height: number, rgba: Uint8Array): Uint8Array {
  if (rgba.byteLength !== width * height * 4)
    throw new Error(`pngRgba 像素长度 ${rgba.byteLength} 与 ${width}×${height}×4 不符`)
  const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])
  const encoder = new TextEncoder()
  const chunk = (type: string, data: Uint8Array): Uint8Array => {
    const typeBytes = encoder.encode(type)
    const body = new Uint8Array(4 + 4 + data.byteLength + 4)
    const view = new DataView(body.buffer)
    view.setUint32(0, data.byteLength)
    body.set(typeBytes, 4)
    body.set(data, 8)
    view.setUint32(8 + data.byteLength, pngCrc32(concatBytes([typeBytes, data])))
    return body
  }
  const ihdr = new Uint8Array(13)
  const ihdrView = new DataView(ihdr.buffer)
  ihdrView.setUint32(0, width)
  ihdrView.setUint32(4, height)
  ihdr[8] = 8
  ihdr[9] = 6
  const scanline = new Uint8Array(height * (1 + width * 4))
  for (let row = 0; row < height; row += 1) {
    const at = row * (1 + width * 4)
    scanline[at] = 0
    scanline.set(rgba.subarray(row * width * 4, (row + 1) * width * 4), at + 1)
  }
  return concatBytes([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlibWrapStored(scanline)),
    chunk('IEND', new Uint8Array(0)),
  ])
}

export interface AtlasPng {
  bytes: Uint8Array
  width: number
  height: number
  frameW: number
  frameH: number
  frameCount: number
}

/** 实心 RGBA 像素块（量化期望值的独立计算输入）。 */
export function solidRgba(
  width: number,
  height: number,
  color: readonly [number, number, number, number],
): Uint8Array {
  const rgba = new Uint8Array(width * height * 4)
  for (let at = 0; at < rgba.byteLength; at += 4) {
    rgba[at] = color[0]
    rgba[at + 1] = color[1]
    rgba[at + 2] = color[2]
    rgba[at + 3] = color[3]
  }
  return rgba
}

/** 横排图集 PNG：每帧一个实心色块，帧间颜色互异（量化后仍是可区分真实像素）。 */
export function solidAtlasPng(
  frameW: number,
  frameH: number,
  colors: readonly (readonly [number, number, number, number])[],
): AtlasPng {
  const width = frameW * colors.length
  const rgba = new Uint8Array(width * frameH * 4)
  for (const [index, color] of colors.entries()) {
    const cell = solidRgba(frameW, frameH, color)
    for (let y = 0; y < frameH; y += 1)
      rgba.set(
        cell.subarray(y * frameW * 4, (y + 1) * frameW * 4),
        (y * width + index * frameW) * 4,
      )
  }
  return {
    bytes: pngRgba(width, frameH, rgba),
    width,
    height: frameH,
    frameW,
    frameH,
    frameCount: colors.length,
  }
}

/** 预设互异不透明色板（避开纯色相相邻，最近色量化不会串色）。 */
export function atlasColors(count: number): [number, number, number, number][] {
  const base: [number, number, number][] = [
    [216, 32, 32],
    [32, 200, 64],
    [32, 64, 216],
    [224, 208, 32],
    [192, 32, 192],
    [32, 200, 200],
    [128, 128, 128],
    [255, 128, 0],
    [96, 48, 160],
    [0, 96, 48],
    [240, 144, 160],
    [48, 144, 240],
    [160, 160, 96],
    [96, 240, 144],
    [144, 96, 240],
    [64, 64, 64],
  ]
  if (count > base.length) throw new Error(`atlasColors 最多 ${base.length} 色`)
  return base.slice(0, count).map(([r, g, b]) => [r, g, b, 255])
}

/** File 实例（真实字节，name/type 齐备），供文件输入驱动。 */
export function pngFileOf(name: string, bytes: Uint8Array): File {
  const copy = bytes.slice()
  return new File([copy.buffer as ArrayBuffer], name, { type: 'image/png' })
}

/**
 * 安装浏览器硬件端口替身：Node Blob/crypto（jsdom 缺 CompressionStream 依赖的
 * Blob.stream 与 subtle digest）+ createImageBitmap 真实 PNG 解码（node-canvas loadImage，
 * 走真实 libpng 语义；返回对象带 close()）。jsdom 的 2d canvas 已由 node-canvas 后端
 * 提供真实 drawImage/getImageData，不在此处替换。afterEach 由 vitest 统一 unstub。
 */
export function installBrowserHardwarePorts(): void {
  vi.stubGlobal('Blob', NodeBlob)
  vi.stubGlobal('crypto', webcrypto)
  const gameRequire = createRequire(join(selfDir(), '../../../../../game/package.json'))
  const { loadImage } = gameRequire('canvas') as {
    loadImage: (bytes: Uint8Array) => Promise<{ width: number; height: number }>
  }
  vi.stubGlobal('createImageBitmap', async (source: { arrayBuffer(): Promise<ArrayBuffer> }) => {
    const image = await loadImage(Buffer.from(await source.arrayBuffer()))
    if (typeof (image as { close?: unknown }).close !== 'function')
      Object.defineProperty(image, 'close', { value: () => undefined })
    return image
  })
}

/** jsdom 缺失的 DataTransfer：按 HTML DnD 语义的真实类型化存储。 */
export class MemoryDataTransfer {
  effectAllowed = 'none'
  dropEffect = 'none'
  private readonly store = new Map<string, string>()

  get types(): readonly string[] {
    return [...this.store.keys()]
  }

  setData(type: string, value: string): void {
    this.store.set(type, value)
  }

  getData(type: string): string {
    return this.store.get(type) ?? ''
  }

  clearData(type?: string): void {
    if (type === undefined) this.store.clear()
    else this.store.delete(type)
  }
}

/** 以原生事件驱动 React DnD 处理器（dragstart/dragenter/dragover/drop 通用）。 */
export function dispatchDragEvent(
  target: Element,
  type: string,
  dataTransfer: MemoryDataTransfer,
): void {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'dataTransfer', { value: dataTransfer })
  target.dispatchEvent(event)
}

export interface GatedFileSource {
  source: FileSource
  /** 按调用顺序记录 readBytes 进入见证（相对路径）。 */
  calls: readonly string[]
  /** 按完成顺序记录 readBytes 退出见证（相对路径；迟到读取的退出据此证实）。 */
  completed: readonly string[]
  /** 对指定路径安装一次性闸门；返回的 deferred 放行后读取才真正落到磁盘端口。 */
  gate(path: string): ReturnType<typeof deferred<void>>
}

/** 磁盘 I/O 端口闸门：只延迟真实 readBytes 的进入，不替换 reader/解码任何核心函数。 */
export function gatedFileSource(inner: FileSource): GatedFileSource {
  const gates = new Map<string, ReturnType<typeof deferred<void>>>()
  const calls: string[] = []
  const completed: string[] = []
  const source: FileSource = {
    readText: (rel, signal) => inner.readText(rel, signal),
    readJson: (rel, signal) => inner.readJson(rel, signal),
    urlFor: (rel) => inner.urlFor(rel),
    async readBytes(rel, signal) {
      calls.push(rel)
      await gates.get(rel)?.promise
      const bytes = await inner.readBytes(rel, signal)
      completed.push(rel)
      return bytes
    },
    dispose: () => inner.dispose?.(),
  }
  return {
    source,
    calls,
    completed,
    gate(path) {
      const hold = deferred<void>()
      gates.set(path, hold)
      return hold
    },
  }
}
