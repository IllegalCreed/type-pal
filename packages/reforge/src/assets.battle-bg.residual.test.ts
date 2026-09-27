import type { AssetCatalogV1 } from '@type-pal/content'
import type { Palette } from '@type-pal/shared'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { AssetResolver } from './asset-resolver.js'
import { type AssetBase, loadBattleBgFull } from './assets.js'
import type { FileSource } from './file-source.js'

const asset = 'battle-background.test'
const path = 'assets/generated/battle-background.test.png'
const palette: Palette = {
  colors: Array.from({ length: 256 }, (_, value): [number, number, number] => [
    value,
    (value * 3) & 0xff,
    255 - value,
  ]),
  cycles: [],
}

function concat(parts: readonly Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((size, part) => size + part.byteLength, 0))
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.byteLength
  }
  return out
}

function crc32(bytes: Uint8Array): number {
  let value = 0xffffffff
  for (const byte of bytes) {
    value ^= byte
    for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0)
  }
  return (value ^ 0xffffffff) >>> 0
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const name = new TextEncoder().encode(type)
  const out = new Uint8Array(12 + data.byteLength)
  const view = new DataView(out.buffer)
  view.setUint32(0, data.byteLength)
  out.set(name, 4)
  out.set(data, 8)
  view.setUint32(8 + data.byteLength, crc32(concat([name, data])))
  return out
}

/** 真 RGBA PNG：完整 IHDR/IDAT/IEND/CRC，scanline filter 0，由宿主替身再独立解码。 */
async function png(
  width: number,
  height: number,
  pixels: readonly number[],
  override?: { index: number; rgba: readonly [number, number, number, number] },
): Promise<Uint8Array> {
  const raw = new Uint8Array(height * (1 + width * 4))
  for (let row = 0; row < height; row++) {
    const start = row * (1 + width * 4)
    for (let col = 0; col < width; col++) {
      const value = pixels[row * width + col] ?? 0
      raw.set(
        override?.index === row * width + col ? override.rgba : [value, value, value, 255],
        start + 1 + col * 4,
      )
    }
  }
  const ihdr = new Uint8Array(13)
  const view = new DataView(ihdr.buffer)
  view.setUint32(0, width)
  view.setUint32(4, height)
  ihdr[8] = 8
  ihdr[9] = 6
  const compressed = new Uint8Array(
    await new Response(
      new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate')),
    ).arrayBuffer(),
  )
  return concat([
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', new Uint8Array(0)),
  ])
}

async function project(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest('SHA-256', Uint8Array.from(bytes).buffer)
  const sha256 = [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')
  const catalog: AssetCatalogV1 = {
    version: 1,
    assets: {
      [asset]: {
        kind: 'battle-background',
        path,
        mediaType: 'image/png',
        bytes: bytes.byteLength,
        sha256,
        origin: { kind: 'generated' },
      },
    },
  }
  const readBytes = vi.fn(async (requested: string) => {
    if (requested !== path) throw new Error(`unexpected ${requested}`)
    return Uint8Array.from(bytes).buffer
  })
  const source: FileSource = {
    readText: async () => {
      throw new Error('unexpected text read')
    },
    readJson: async () => {
      throw new Error('unexpected JSON read')
    },
    readBytes,
    urlFor: async (requested) => requested,
  }
  const base: AssetBase = {
    source,
    assetResolver: new AssetResolver('battle-bg-test', catalog, {}, source),
  }
  return { base, readBytes, sha256 }
}

/** Node 无浏览器位图接口；只替换宿主，解码输入由同一真实 PNG IDAT 字节独立还原。 */
function imageHost() {
  const close = vi.fn()
  const drawImage = vi.fn((bitmap: ImageBitmap) => {
    const decoded = bitmap as ImageBitmap & { rgba: Uint8ClampedArray }
    currentPixels = decoded.rgba
  })
  const getImageData = vi.fn((_x: number, _y: number, width: number, height: number) => ({
    width,
    height,
    data: currentPixels.slice(),
  }))
  const createImageData = vi.fn((width: number, height: number) => ({
    width,
    height,
    data: new Uint8ClampedArray(width * height * 4),
  }))
  const putImageData = vi.fn((_data: ImageData, _x: number, _y: number) => undefined)
  let currentPixels: Uint8ClampedArray<ArrayBufferLike> = new Uint8ClampedArray()
  const ctx = { drawImage, getImageData, createImageData, putImageData }
  const canvas = { width: 0, height: 0, getContext: () => ctx }
  const createElement = vi.fn(() => canvas)
  vi.stubGlobal('document', { createElement })
  const createImageBitmap = vi.fn(async (blob: Blob) => {
    const bytes = new Uint8Array(await blob.arrayBuffer())
    expect([...bytes.slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10])
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    const width = view.getUint32(16)
    const height = view.getUint32(20)
    const idatSize = view.getUint32(33)
    expect(new TextDecoder().decode(bytes.slice(37, 41))).toBe('IDAT')
    const raw = new Uint8Array(
      await new Response(
        new Blob([bytes.slice(41, 41 + idatSize)])
          .stream()
          .pipeThrough(new DecompressionStream('deflate')),
      ).arrayBuffer(),
    )
    const rgba = new Uint8ClampedArray(width * height * 4)
    for (let row = 0; row < height; row++) {
      const start = row * (1 + width * 4)
      expect(raw[start]).toBe(0)
      rgba.set(raw.subarray(start + 1, start + 1 + width * 4), row * width * 4)
    }
    return { width, height, rgba, close } as unknown as ImageBitmap
  })
  vi.stubGlobal('createImageBitmap', createImageBitmap)
  return { canvas, createElement, createImageBitmap, close, drawImage, getImageData, putImageData }
}

afterEach(() => vi.unstubAllGlobals())

describe('当前战场背景索引图的 catalog→位图→调色板链', () => {
  test('真实 320×200 PNG 的索引字节逐像素着色，位图只解码并关闭一次', async () => {
    const indices = new Array<number>(320 * 200).fill(0)
    indices[0] = 7
    indices[1] = 233
    indices[indices.length - 1] = 41
    const bytes = await png(320, 200, indices)
    const before = bytes.slice()
    const { base, readBytes, sha256 } = await project(bytes)
    const host = imageHost()
    const loaded = await loadBattleBgFull(base, asset, palette)
    expect(sha256).toMatch(/^[0-9a-f]{64}$/)
    expect(readBytes).toHaveBeenCalledExactlyOnceWith(path)
    expect(host.createImageBitmap).toHaveBeenCalledTimes(1)
    expect(host.createElement).toHaveBeenCalledExactlyOnceWith('canvas')
    expect(host.drawImage).toHaveBeenCalledTimes(1)
    expect(host.getImageData).toHaveBeenCalledExactlyOnceWith(0, 0, 320, 200)
    expect(host.close).toHaveBeenCalledTimes(1)
    expect([loaded.w, loaded.h, loaded.canvas]).toEqual([320, 200, host.canvas])
    expect(loaded.indices).toHaveLength(320 * 200)
    expect([loaded.indices[0], loaded.indices[1], loaded.indices.at(-1)]).toEqual([7, 233, 41])
    const tinted = host.putImageData.mock.calls[0]?.[0] as ImageData
    expect([...tinted.data.slice(0, 8)]).toEqual([
      ...palette.colors[7]!,
      255,
      ...palette.colors[233]!,
      255,
    ])
    expect(host.putImageData).toHaveBeenCalledWith(tinted, 0, 0)
    expect(bytes).toEqual(before)
  })

  test('真实 PNG 尺寸偏差先关闭位图，绝不创建目标 canvas 或发布着色结果', async () => {
    const { base } = await project(await png(319, 200, []))
    const host = imageHost()
    const outcome = await loadBattleBgFull(base, asset, palette).then(
      () => 'resolved',
      (error: unknown) => (error instanceof Error ? error.message : String(error)),
    )
    expect(outcome).toContain('实际 319×200')
    expect(host.close).toHaveBeenCalledTimes(1)
    expect(host.createElement).not.toHaveBeenCalled()
    expect(host.putImageData).not.toHaveBeenCalled()
  })

  test('解码异常保留资源身份与原始原因，不进入 canvas 绘制', async () => {
    const { base } = await project(await png(320, 200, []))
    const host = imageHost()
    host.createImageBitmap.mockRejectedValueOnce(new Error('decoder unavailable'))
    await expect(loadBattleBgFull(base, asset, palette)).rejects.toThrow(
      `战场背景 AssetId "${asset}" 解码失败:decoder unavailable`,
    )
    expect(host.createElement).not.toHaveBeenCalled()
    expect(host.putImageData).not.toHaveBeenCalled()
  })

  test('非灰度或非不透明像素在精确索引处拒绝，不写入调色板画布', async () => {
    const original = await png(320, 200, [4, 8], { index: 1, rgba: [8, 9, 8, 255] })
    const { base } = await project(original)
    const host = imageHost()
    await expect(loadBattleBgFull(base, asset, palette)).rejects.toThrow('像素 1 不满足索引图契约')
    expect(host.close).toHaveBeenCalledTimes(1)
    expect(host.putImageData).not.toHaveBeenCalled()
  })
})
