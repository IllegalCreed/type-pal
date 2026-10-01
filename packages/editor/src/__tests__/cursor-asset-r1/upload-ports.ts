/**
 * TEST-CURSOR-ASSET-UI-LARGE-1 C03 上传类组件端口夹具：
 * - gridAtlasPng：cols×rows 网格 PNG，格内实心色，色序由调用方显式交付；
 * - installGatedBitmapPort：只在 createImageBitmap 硬件端口按文件名扣留/放行并记录 close，
 *   真实 PNG 解码仍由 image-ports 的 node-canvas 完成；
 * - gatePalette：只扣留标准色盘 I/O（readRoleText），解码/量化/编码全部真实；
 * - decodeStoredSprite / expectedFrame：以 catalog+blob 真实解码与独立量化期望。
 * 只被本卡 *.cursor-r1.test.ts(x) 导入，不进生产。
 */

import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { AssetId } from '@type-pal/content'
import * as reforge from '@type-pal/reforge'
import {
  type AssetBase,
  decodeWorldSpriteAssetBytes,
  loadStandardPalette,
  type Palette,
  quantizeToRleFrame,
  type RleFrame,
} from '@type-pal/reforge'
import { vi } from 'vitest'
import type { EditSession } from '../../core/edit-session.js'
import { pngFileOf, pngRgba, solidRgba } from './image-ports.js'
import { type Deferred, deferred, stubNodeTestHost } from './kit.js'

export type Rgba = readonly [number, number, number, number]

export interface GridAtlas {
  bytes: Uint8Array
  width: number
  height: number
  frameW: number
  frameH: number
  cols: number
  rows: number
}

/** cols×rows 网格 PNG：第 (row*cols+col) 格用 colors[...]（行优先）。 */
export function gridAtlasPng(
  cols: number,
  rows: number,
  frameW: number,
  frameH: number,
  colors: readonly Rgba[],
): GridAtlas {
  if (colors.length !== cols * rows)
    throw new Error(`gridAtlasPng 需要 ${cols * rows} 色，实际 ${colors.length}`)
  const width = cols * frameW
  const height = rows * frameH
  const rgba = new Uint8Array(width * height * 4)
  for (let row = 0; row < rows; row++)
    for (let col = 0; col < cols; col++) {
      const cell = solidRgba(frameW, frameH, colors[row * cols + col]!)
      for (let y = 0; y < frameH; y++)
        rgba.set(
          cell.subarray(y * frameW * 4, (y + 1) * frameW * 4),
          ((row * frameH + y) * width + col * frameW) * 4,
        )
    }
  return { bytes: pngRgba(width, height, rgba), width, height, frameW, frameH, cols, rows }
}

export function atlasFile(name: string, atlas: GridAtlas): File {
  return pngFileOf(name, atlas.bytes)
}

export interface GatedBitmapPort {
  /** 扣留指定文件名的 createImageBitmap；放行后才完成真实解码。 */
  gate(name: string): Deferred<void>
  /** 按进入顺序记录文件名。 */
  started: string[]
  /** 按完成顺序记录真实解码已落地的文件名（成功才计）。 */
  decoded: string[]
  /** 位图 close() 调用见证（按文件名累计次数）。 */
  closes(name: string): number
}

/** 本文件真实磁盘路径（vitest 下 import.meta.url 可能是 /@fs 形式，两种都还原）。 */
function selfDir(): string {
  const url = new URL(import.meta.url)
  if (url.protocol === 'file:') return dirname(fileURLToPath(url))
  return dirname(decodeURIComponent(url.pathname.replace(/^\/@fs(?=\/)/, '')))
}

/**
 * 先装 Node Blob/crypto，再安装带闸门与 close 计数的 createImageBitmap：
 * 解码走 node-canvas loadImage（真实 libpng），位图 close 为可计数的实例方法。
 */
export async function installGatedBitmapPort(): Promise<GatedBitmapPort> {
  await stubNodeTestHost()
  const gameRequire = createRequire(join(selfDir(), '../../../../game/package.json'))
  const { loadImage } = gameRequire('canvas')
  const { Buffer } = gameRequire('node:buffer')
  const holds = new Map<string, Deferred<void>>()
  const started: string[] = []
  const decoded: string[] = []
  const closeCounts = new Map<string, number>()
  vi.stubGlobal(
    'createImageBitmap',
    async (source: { arrayBuffer(): Promise<ArrayBuffer>; name?: string }) => {
      const name = source instanceof File ? source.name : '<blob>'
      started.push(name)
      await holds.get(name)?.promise
      const image = await loadImage(Buffer.from(await source.arrayBuffer()))
      decoded.push(name)
      Object.defineProperty(image, 'close', {
        configurable: true,
        value: () => {
          closeCounts.set(name, (closeCounts.get(name) ?? 0) + 1)
        },
      })
      return image
    },
  )
  return {
    gate(name) {
      const hold = deferred<void>()
      holds.set(name, hold)
      return hold
    },
    started,
    decoded,
    closes: (name) => closeCounts.get(name) ?? 0,
  }
}

/** 色盘 I/O 闸门：返回新 AssetBase，仅 readRoleText 被扣留；其余能力沿用真实 resolver/source。 */
export function gatePalette(base: AssetBase): { assetBase: AssetBase; hold: Deferred<void> } {
  const hold = deferred<void>()
  const resolver = Object.create(base.assetResolver, {
    readRoleText: {
      value: async (role: Parameters<typeof base.assetResolver.readRoleText>[0]) => {
        await hold.promise
        return base.assetResolver.readRoleText(role)
      },
    },
  }) as AssetBase['assetResolver']
  return { assetBase: { source: base.source, assetResolver: resolver }, hold }
}

/** 色盘读取直接失败（真实 I/O 错误路径）。 */
export function failingPalette(base: AssetBase, message: string): AssetBase {
  const resolver = Object.create(base.assetResolver, {
    readRoleText: {
      value: async () => {
        throw new Error(message)
      },
    },
  }) as AssetBase['assetResolver']
  return { source: base.source, assetResolver: resolver }
}

/** 以 catalog + 待落盘 blob 真实解码（含 sha/bytes/gzip 校验）。 */
export async function decodeStoredSprite(
  session: EditSession,
  asset: AssetId,
): Promise<RleFrame[]> {
  const state = session.getState()
  const record = state.assetCatalog.assets[asset]
  if (!record) throw new Error(`catalog 缺 ${asset}`)
  const blob = state.assetBlobs[record.path]
  if (!blob) throw new Error(`assetBlobs 缺 ${record.path}`)
  const decoded = await decodeWorldSpriteAssetBytes(record, blob.slice(0), `C03 断言 ${asset}`)
  return decoded.frames
}

export async function projectPalette(assetBase: AssetBase): Promise<Palette> {
  return loadStandardPalette(assetBase)
}

/** 独立期望：同一色盘对实心格做量化。 */
export function expectedFrame(
  palette: Palette,
  frameW: number,
  frameH: number,
  color: Rgba,
): RleFrame {
  return quantizeToRleFrame(solidRgba(frameW, frameH, color), frameW, frameH, palette)
}

export function framePixelSet(frame: RleFrame): number[] {
  return [...new Set(frame.pixels)]
}

/** 只扣留 compressGzip 异步；量化/编码仍走真实实现。 */
export interface GatedCompressPort {
  hold: Deferred<void>
  calls: number
  restore(): void
}

export function installGatedCompressPort(): GatedCompressPort {
  const hold = deferred<void>()
  let calls = 0
  const original = reforge.compressGzip.bind(reforge)
  const spy = vi.spyOn(reforge, 'compressGzip').mockImplementation(async (input) => {
    calls += 1
    await hold.promise
    return original(input)
  })
  return {
    hold,
    get calls() {
      return calls
    },
    restore: () => spy.mockRestore(),
  }
}
