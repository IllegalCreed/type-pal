import {
  type AssetCatalogV1,
  PAL_PHYSICAL_EFFECT_ASSET_ID,
  palMagicEffectSpriteAssetId,
} from '@type-pal/content'
import { encodeSpriteChunk, type Palette } from '@type-pal/shared'
import { describe, expect, test, vi } from 'vitest'
import { AssetResolver } from './asset-resolver.js'
import {
  type AssetBase,
  bakeBgImageData,
  compressGzip,
  loadEffectSprite,
  loadFireSprite,
  loadProjectMap,
} from './assets.js'
import type { FileSource } from './file-source.js'

const palette: Palette = {
  colors: Array.from({ length: 256 }, (_, index): [number, number, number] => [
    index,
    255 - index,
    (index * 3) & 0xff,
  ]),
  cycles: [],
}

function imageContext() {
  const createImageData = vi.fn((width: number, height: number) => ({
    data: new Uint8ClampedArray(width * height * 4),
    width,
    height,
    colorSpace: 'srgb' as const,
  }))
  return { createImageData } as unknown as CanvasRenderingContext2D
}

async function effectAssets(): Promise<{ base: AssetBase; reads: string[]; bytes: Uint8Array }> {
  const raw = encodeSpriteChunk([
    {
      width: 2,
      height: 2,
      pixels: new Uint8Array([1, 2, 3, 4]),
      opaque: new Uint8Array([1, 1, 1, 1]),
    },
  ])
  const bytes = await compressGzip(raw)
  const digest = await crypto.subtle.digest('SHA-256', Uint8Array.from(bytes).buffer)
  const sha256 = [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')
  const physical = PAL_PHYSICAL_EFFECT_ASSET_ID
  const magic = palMagicEffectSpriteAssetId(5)
  const pathOf = (asset: string) => `assets/generated/${asset}.rle`
  const catalog: AssetCatalogV1 = {
    version: 1,
    assets: Object.fromEntries(
      [physical, magic].map((asset) => [
        asset,
        {
          kind: 'effect-sprite' as const,
          path: pathOf(asset),
          mediaType: 'application/vnd.type-pal.rle',
          bytes: bytes.byteLength,
          sha256,
          origin: { kind: 'generated' as const },
        },
      ]),
    ),
  }
  const reads: string[] = []
  const source: FileSource = {
    async readJson() {
      throw new Error('unexpected JSON read')
    },
    async readText() {
      throw new Error('unexpected text read')
    },
    async readBytes(path) {
      reads.push(path)
      if (path !== pathOf(physical) && path !== pathOf(magic)) throw new Error(`404 ${path}`)
      return bytes.slice().buffer as ArrayBuffer
    },
    async urlFor(path) {
      return path
    },
  }
  return {
    base: { source, assetResolver: new AssetResolver('effects', catalog, {}, source) },
    reads,
    bytes,
  }
}

describe('当前战斗画面索引着色与特效资源边界', () => {
  test('原索引按调色板逐字节上色；正负 nibble 位移分别饱和上界与归零下界', () => {
    const ctx = imageContext()
    const indices = new Uint8Array([0x2e, 0x21, 0x13])
    const original = indices.slice()
    const withoutShift = bakeBgImageData(ctx, indices, 3, 1, palette, 0)
    const positive = bakeBgImageData(ctx, indices, 3, 1, palette, 3)
    const negative = bakeBgImageData(ctx, indices, 3, 1, palette, -3)
    const expected = (values: number[]) =>
      values.flatMap((index) => [...palette.colors[index]!, 255])
    expect([...withoutShift.data]).toEqual(expected([0x2e, 0x21, 0x13]))
    expect([...positive.data]).toEqual(expected([0x2f, 0x24, 0x16]))
    expect([...negative.data]).toEqual(expected([0x2b, 0x20, 0x10]))
    expect(indices).toEqual(original)
  })

  test('物理与法术特效使用各自 catalog 身份读取同源真实 gzip；源字节与登记哈希保持一致', async () => {
    const { base, reads, bytes } = await effectAssets()
    const before = bytes.slice()
    const physical = await loadEffectSprite(base)
    const magic = await loadFireSprite(base, 5)
    expect([physical.anchorX, physical.anchorY, magic.anchorX, magic.anchorY]).toEqual([0, 0, 0, 0])
    expect(physical.frames.map((frame) => [...frame.pixels])).toEqual([[1, 2, 3, 4]])
    expect(magic.frames.map((frame) => [...frame.pixels])).toEqual([[1, 2, 3, 4]])
    expect(reads).toEqual([
      `assets/generated/${PAL_PHYSICAL_EFFECT_ASSET_ID}.rle`,
      `assets/generated/${palMagicEffectSpriteAssetId(5)}.rle`,
    ])
    expect(bytes).toEqual(before)
  })

  test('缺失地图源文件保留真实路径和提取指引，不让空地图冒充成功', async () => {
    const { base } = await effectAssets()
    await expect(loadProjectMap(base, 'content/maps/missing.json')).rejects.toThrow(
      /content\/maps\/missing\.json.*pnpm extract.*unexpected JSON read/,
    )
  })
})
