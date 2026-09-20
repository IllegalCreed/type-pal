/**
 * TEST-EDITOR-IMPORT-CODEC-1 C1/C2：image-import 阶段化合同（image-import.ts）。
 * image-import.test.ts×2 已覆盖最近色/同距色号/不透明 PNG 契约与拒非256色/坏 RGBA——不重复；
 * 本文件补：PNG 签名门、解码失败上下文、尺寸门、battle-background 域（320×200 + palette）
 * 与 catalog 字段/摘要。**PNG 编码失败位图泄漏已确认（image-import.ts:130-142 无 finally），
 * 归 Codex 修复卡——本包不写默认红、不固化“不释放”为正确绿测。**
 */

import type { AssetCatalogV1 } from '@type-pal/content'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { deepSnapshot, minimalPng, pngFile } from './__tests__/glm-import-codec-fixtures.js'
import { nextAuthoredImageId, prepareAuthoredImage } from './image-import.js'

/** 非同色映射调色板：palette[i] ≠ [i,i,i] → 量化索引帧与预览帧的实际像素天然不同。 */
const palette = (): readonly (readonly [number, number, number])[] =>
  Array.from(
    { length: 256 },
    (_, index) => [(index * 3) % 256, (index * 7 + 11) % 256, (255 - index) % 256] as const,
  )

/** 拒绝见证取值形式（mutation 负控下 produces 纯 AssertionError，非 vitest 内部 Error）。 */
async function rejectionOf(promise: Promise<unknown>): Promise<string> {
  return promise.then(
    () => '<<resolved>>',
    (error: unknown) => (error instanceof Error ? error.message : String(error)),
  )
}

/** 可解码 PNG 宿主产物：按实际宽高与交付像素编码完整合法 PNG
 * （真 IHDR/CRC/IDAT/IEND；zlib stored 块按 ≤65535 分段 + Adler-32）。
 * rgba 缺省为全零（仍是合法像素）；scanline = 每行 1 字节 filter-0 + width×4 像素。 */
function pngPayload(width: number, height: number, rgba?: Uint8Array): Uint8Array {
  const crcTable: number[] = []
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    crcTable[n] = c >>> 0
  }
  const crc32 = (bytes: Uint8Array): number => {
    let crc = 0xffffffff
    for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff]! ^ (crc >>> 8)
    return (crc ^ 0xffffffff) >>> 0
  }
  const chunk = (type: string, data: number[]): number[] => {
    const body = [
      type.charCodeAt(0),
      type.charCodeAt(1),
      type.charCodeAt(2),
      type.charCodeAt(3),
      ...data,
    ]
    const crc = crc32(new Uint8Array(body))
    return [
      (data.length >>> 24) & 0xff,
      (data.length >> 16) & 0xff,
      (data.length >> 8) & 0xff,
      data.length & 0xff,
      ...body,
      (crc >>> 24) & 0xff,
      (crc >> 16) & 0xff,
      (crc >> 8) & 0xff,
      crc & 0xff,
    ]
  }
  // filter-0 扫描线：行首 0 + 实际交付像素（非全零字节）
  const raw: number[] = []
  const stride = width * 4
  for (let row = 0; row < height; row += 1) {
    raw.push(0)
    for (let col = 0; col < stride; col += 1) raw.push(rgba?.[row * stride + col] ?? 0)
  }
  // deflate stored 块分段（单块 ≤65535 字节）
  const stored: number[] = []
  for (let at = 0; ; ) {
    const take = Math.min(65535, raw.length - at)
    const isFinal = at + take >= raw.length
    stored.push(isFinal ? 1 : 0, take & 0xff, (take >> 8) & 0xff, ~take & 0xff, (~take >> 8) & 0xff)
    for (let i = 0; i < take; i += 1) stored.push(raw[at + i] ?? 0)
    at += take
    if (isFinal) break
  }
  let a = 1
  let b = 0
  for (const byte of raw) {
    a = (a + byte) % 65521
    b = (b + a) % 65521
  }
  const adler = ((b << 16) | a) >>> 0
  const idat = [
    0x78,
    0x01,
    ...stored,
    (adler >>> 24) & 0xff,
    (adler >> 16) & 0xff,
    (adler >> 8) & 0xff,
    adler & 0xff,
  ]
  const ihdr = [
    (width >>> 24) & 0xff,
    (width >> 16) & 0xff,
    (width >> 8) & 0xff,
    width & 0xff,
    (height >>> 24) & 0xff,
    (height >> 16) & 0xff,
    (height >> 8) & 0xff,
    height & 0xff,
    8,
    6,
    0,
    0,
    0,
  ]
  return new Uint8Array([
    137,
    80,
    78,
    71,
    13,
    10,
    26,
    10,
    ...chunk('IHDR', ihdr),
    ...chunk('IDAT', idat),
    ...chunk('IEND', []),
  ])
}

/**
 * 独立摘要 oracle：320×200 成功链主图/preview 的实际产物在编写期离线计算的真实
 * SHA-256（独立 sha256 工具直读最终 helper 产物），与产品 crypto.subtle 实现路径无关；
 * 产品摘要必须逐字节等于这些常量。两帧摘要不同来自量化索引帧与调色板预览帧的
 * 实际交付像素差异（palette 非同色映射），不是人为改尺寸。
 */
const PNG_PAYLOAD_SHA256 = {
  main: 'f614fb38624c5011744c4721d11304660db996311d377e3399d7cce1167527f7',
  preview: 'ee694d7766f4e69c15464f2c6d33c851fa638877aedf12a02fe6ec0126be8529',
} as const

/** portrait 直传域源字节（minimalPng(4,4)）的离线真实 SHA-256。 */
const SOURCE_PNG_4x4_SHA256 = 'ff127c16d10d400afeca3db3709a50da874740b19e01112fcd9180df55902ba3'

/** 读 PNG IHDR 宽高（字节偏移 16/20，u32 BE）。 */
function pngDims(bytes: ArrayBuffer | Uint8Array): [number, number] {
  const view =
    bytes instanceof Uint8Array ? new DataView(bytes.buffer, bytes.byteOffset) : new DataView(bytes)
  return [view.getUint32(16), view.getUint32(20)]
}

/** 实际返回字节的 SHA-256（hex）。常量为离线独立预计算——此函数只把返回值绑定到常量。 */
async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** 完整逐字节扫描比较：全等（含长度）返回 -1，否则返回首个差异下标。
 * 失败消息只携带下标而非巨型数组 diff——256k 字节产物上 toEqual 的差异渲染需数分钟，
 * 扫描比较保持完整字节语义且失败即时报错。 */
function firstByteDiff(actual: Uint8Array, expected: Uint8Array): number {
  const shared = Math.min(actual.length, expected.length)
  for (let index = 0; index < shared; index += 1) {
    if (actual[index] !== expected[index]) return index
  }
  return actual.length === expected.length ? -1 : shared
}

/** 安装 Canvas/ImageBitmap 双替身：canvas 尺寸由产品赋值、putImageData 捕获实际交付像素，
 * toBlob 按**当时 canvas 实际宽高 + 最近交付像素**编码合法 PNG——宿主自身的尺寸合同，
 * 不假装固定产物。同时记录每次 toBlob 的实际产物快照（blobProducts，防别名污染），
 * 供“返回值=宿主产物”保真比较。恢复由 afterEach 统一执行。 */
function installCanvasHost(options: {
  width: number
  height: number
  pixels?: Uint8Array
  decodeFails?: boolean
}) {
  const events: string[] = []
  const bitmap = {
    width: options.width,
    height: options.height,
    close: () => events.push('close'),
  }
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn(async () => {
      events.push('decode')
      if (options.decodeFails) throw new Error('libpng corrupt')
      return bitmap
    }),
  )
  const deliveredPixels: Uint8Array[] = []
  const blobProducts: Uint8Array[] = []
  vi.stubGlobal('document', {
    createElement: () => {
      let lastDelivered: Uint8Array | undefined
      const canvas = {
        width: 0,
        height: 0,
        getContext: () => ({
          drawImage: () => events.push('drawImage'),
          getImageData: (_x: number, _y: number, width: number, height: number) => ({
            data: options.pixels ?? new Uint8ClampedArray(width * height * 4),
          }),
          createImageData: (width: number, height: number) => ({
            data: new Uint8ClampedArray(width * height * 4),
          }),
          putImageData: (image: { data: Uint8ClampedArray }) => {
            events.push('putImageData')
            lastDelivered = new Uint8Array(image.data) // 实际交付像素快照（防后续 set 污染）
            deliveredPixels.push(lastDelivered)
          },
        }),
        toBlob: (callback: (blob: Blob | null) => void) => {
          events.push('toBlob')
          const bytes = pngPayload(canvas.width, canvas.height, lastDelivered ?? undefined)
          blobProducts.push(bytes.slice()) // 实际 toBlob 产物快照（防后续别名污染）
          callback(new Blob([bytes.slice()], { type: 'image/png' }))
        },
      }
      return canvas as unknown as HTMLCanvasElement
    },
  })
  return {
    events,
    deliveredPixels,
    blobProducts,
    restore: () => undefined,
  }
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('C1 PNG 签名门与解码失败上下文', () => {
  test('非 PNG 扩展名拒绝；坏签名拒绝（真实 8 字节签名域）；解码失败带文件名与原因', async () => {
    const host = installCanvasHost({ width: 4, height: 4 })
    try {
      const notPngName = {
        name: 'a.jpg',
        type: 'image/jpeg',
        arrayBuffer: async () => new ArrayBuffer(8),
      } as unknown as File
      await expect(prepareAuthoredImage(notPngName, 'portrait')).rejects.toThrow(
        '只允许导入 PNG 文件',
      )
      // 坏签名：合法扩展名但首字节错
      const badSignature = new Uint8Array(minimalPng(4, 4))
      badSignature[0] = 0x00
      const badFile = {
        name: 'bad.png',
        type: 'image/png',
        arrayBuffer: async () => badSignature.buffer,
      } as unknown as File
      expect(await rejectionOf(prepareAuthoredImage(badFile, 'portrait'))).toBe(
        'bad.png: 不是有效 PNG 文件',
      )
    } finally {
      host.restore()
    }
    const decodeFailHost = installCanvasHost({ width: 4, height: 4, decodeFails: true })
    try {
      await expect(prepareAuthoredImage(pngFile('broken.png', 4, 4), 'portrait')).rejects.toThrow(
        'broken.png: PNG 解码失败；libpng corrupt',
      )
    } finally {
      decodeFailHost.restore()
    }
  })
})

describe('C2 battle-background 域与 catalog 字段', () => {
  test('非 battle-background kind 直传源字节（不解码量化）；record 字段完整', async () => {
    const host = installCanvasHost({ width: 4, height: 4 })
    try {
      const file = pngFile('hero.png', 4, 4)
      const sourceSnapshot = deepSnapshot(new Uint8Array(await file.arrayBuffer()))
      const prepared = await prepareAuthoredImage(file, 'portrait')
      expect(prepared.width).toBe(4)
      expect(prepared.height).toBe(4)
      expect(new Uint8Array(prepared.bytes)).toEqual(sourceSnapshot) // 直传（无 canvas 重编码）
      expect(prepared.effectPreviewBytes).toBeUndefined()
      expect(host.events).not.toContain('drawImage') // portrait 不走量化
      expect(prepared.record).toMatchObject({
        kind: 'portrait',
        mediaType: 'image/png',
        origin: { kind: 'authored', ref: 'hero.png' },
      })
      expect(prepared.record.label).toBe('hero')
      expect(prepared.record.path).toContain('assets/authored/portrait/')
      // 真实摘要：hash = 离线预计算的源字节 SHA-256（独立 oracle，不依赖产品 digest 实现）
      expect(sourceSnapshot.byteLength).toBe(136) // minimalPng(4,4) 确定性长度自检
      expect(prepared.hash).toBe(SOURCE_PNG_4x4_SHA256)
      expect(prepared.record.sha256).toBe(SOURCE_PNG_4x4_SHA256)
      expect(prepared.record.bytes).toBe(136)
    } finally {
      host.restore()
    }
  })
  test('battle-background：320×200 + palette 通过并产出 preview；宿主产物与实际 canvas 尺寸/像素一致；尺寸不符拒绝、缺 palette 拒绝', async () => {
    const okHost = installCanvasHost({ width: 320, height: 200 })
    try {
      const prepared = await prepareAuthoredImage(
        pngFile('bg.png', 320, 200),
        'battle-background',
        palette(),
      )
      expect(prepared.width).toBe(320)
      expect(prepared.height).toBe(200)
      expect(prepared.effectPreviewBytes).toBeDefined()
      expect(okHost.events).toContain('drawImage')
      expect(okHost.events.filter((e) => e === 'toBlob').length).toBe(2) // 主图 + preview
      // 宿主尺寸合同：源图/主图/preview 的 IHDR 与声明/返回宽高全部 320×200
      expect(pngDims(new Uint8Array(await pngFile('bg.png', 320, 200).arrayBuffer()))).toEqual([
        320, 200,
      ])
      expect(pngDims(new Uint8Array(prepared.bytes))).toEqual([320, 200])
      expect(pngDims(new Uint8Array(prepared.effectPreviewBytes!))).toEqual([320, 200])
      // 真实不同像素：量化索引帧与调色板预览帧的实际 putImageData 交付内容不同（两份快照）
      expect(okHost.deliveredPixels).toHaveLength(2)
      const [indexedFrame, previewFrame] = okHost.deliveredPixels as [Uint8Array, Uint8Array]
      expect(indexedFrame.byteLength).toBe(320 * 200 * 4)
      expect(previewFrame.byteLength).toBe(320 * 200 * 4)
      expect(firstByteDiff(indexedFrame, previewFrame), '索引帧与预览帧必须真实不同').not.toBe(-1)
      // 实际返回值保真：宿主记录两次真实 toBlob 产物（快照防别名污染），
      // 返回 main/preview 必须与**对应**产物完整逐字节一致（不能只比尺寸/长度）
      const mainBytes = new Uint8Array(prepared.bytes)
      const previewBytes = new Uint8Array(prepared.effectPreviewBytes!)
      expect(okHost.blobProducts).toHaveLength(2)
      const [hostMain, hostPreview] = okHost.blobProducts as [Uint8Array, Uint8Array]
      expect(mainBytes.byteLength).toBeGreaterThan(320 * 200) // 非空像素承载（stored 扫描线 ≥ 像素量）
      expect(firstByteDiff(mainBytes, hostMain), 'main 必须逐字节等于宿主第 1 次 toBlob 产物').toBe(
        -1,
      )
      expect(
        firstByteDiff(previewBytes, hostPreview),
        '返回 preview 必须逐字节等于宿主第 2 次 toBlob 产物',
      ).toBe(-1)
      // 真实摘要：主图 hash/record 与离线常量相等；**实际返回 preview** 的摘要=独立 preview 常量
      expect(prepared.hash).toBe(PNG_PAYLOAD_SHA256.main) // 离线预计算独立 oracle
      expect(prepared.record.sha256).toBe(PNG_PAYLOAD_SHA256.main)
      expect(prepared.record.bytes).toBe(mainBytes.byteLength)
      const previewHash = await sha256Hex(prepared.effectPreviewBytes!)
      expect(previewHash).toBe(PNG_PAYLOAD_SHA256.preview)
      expect(previewHash).not.toBe(prepared.hash) // 摘要差异来自实际像素差异
    } finally {
      okHost.restore()
    }
    const wrongSize = installCanvasHost({ width: 320, height: 201 })
    try {
      expect(
        await rejectionOf(
          prepareAuthoredImage(pngFile('bg2.png', 320, 201), 'battle-background', palette()),
        ),
      ).toBe('bg2.png: 战场背景必须是 320×200，实际 320×201')
    } finally {
      wrongSize.restore()
    }
    const noPalette = installCanvasHost({ width: 320, height: 200 })
    try {
      await expect(
        prepareAuthoredImage(pngFile('bg3.png', 320, 200), 'battle-background'),
      ).rejects.toThrow('战场背景导入缺项目标准色彩')
    } finally {
      noPalette.restore()
    }
  })
  test('label 缺省用文件名去扩展；显式 label 优先', async () => {
    const host = installCanvasHost({ width: 4, height: 4 })
    try {
      const withLabel = await prepareAuthoredImage(
        pngFile('x.png', 4, 4),
        'portrait',
        undefined,
        '自定义',
      )
      expect(withLabel.record.label).toBe('自定义')
      const noLabel = await prepareAuthoredImage(pngFile('y-name.png', 4, 4), 'portrait')
      expect(noLabel.record.label).toBe('y-name')
    } finally {
      host.restore()
    }
  })
})

describe('C2 nextAuthoredImageId 稳定身份', () => {
  test('base 未占用直接返回；占用后 -2/-3 递增；同 hash 不同 kind 互不占用', () => {
    const hash = 'a'.repeat(64)
    // 目录替身只需 id 查重真值（产品仅读 assets[id] 占用），其余字段与判据无关
    const catalog = (...ids: string[]): AssetCatalogV1 =>
      ({
        version: 1,
        assets: Object.fromEntries(ids.map((id) => [id, { kind: 'portrait' }])),
      }) as unknown as AssetCatalogV1
    const base = `portrait.authored.${hash.slice(0, 16)}`
    expect(nextAuthoredImageId(catalog(), 'portrait', hash)).toBe(base)
    expect(nextAuthoredImageId(catalog(base), 'portrait', hash)).toBe(`${base}-2`)
    expect(nextAuthoredImageId(catalog(base, `${base}-2`), 'portrait', hash)).toBe(`${base}-3`)
    expect(nextAuthoredImageId(catalog(base), 'face', hash)).toBe(
      `face.authored.${hash.slice(0, 16)}`,
    )
  })
})
