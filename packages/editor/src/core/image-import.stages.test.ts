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

const palette = (): readonly (readonly [number, number, number])[] =>
  Array.from({ length: 256 }, (_, index) => [index, index, index] as const)

/** 拒绝见证取值形式（mutation 负控下 produces 纯 AssertionError，非 vitest 内部 Error）。 */
async function rejectionOf(promise: Promise<unknown>): Promise<string> {
  return promise.then(
    () => '<<resolved>>',
    (error: unknown) => (error instanceof Error ? error.message : String(error)),
  )
}

/** 可解码 PNG 宿主产物：完整合法小 PNG（真 IHDR/CRC/IDAT/IEND，zlib stored 块）。
 * 自包含构造（不引用 fixture 的 minimalPng）；size 直接作宽、高 1 → 不同 size 产物
 * 字节与摘要可区分；编写期已用独立检查器核验通过（chunks/CRC/IDAT 全绿）。 */
function pngPayload(size: number): Uint8Array {
  const width = size
  const height = 1
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
  // zlib: 0x78 0x01 头 + deflate stored 块（RGBA filter-0 扫描线）+ Adler-32 尾
  const raw = new Array<number>(height * (1 + width * 4)).fill(0)
  const stored = [
    0x01,
    raw.length & 0xff,
    (raw.length >> 8) & 0xff,
    ~raw.length & 0xff,
    (~raw.length >> 8) & 0xff,
    ...raw,
  ]
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
  const ihdr = [0, 0, 0, width, 0, 0, 0, height, 8, 6, 0, 0, 0]
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
 * 独立摘要 oracle：确定性合法 PNG 产物在编写期离线计算的真实 SHA-256（独立 sha256 工具），
 * 与产品 crypto.subtle 实现路径无关；产品摘要必须逐字节等于这些常量。
 * 主图 = pngPayload(2)（2×1）、preview = pngPayload(3)（3×1）——维度不同 → 摘要可区分。
 */
const PNG_PAYLOAD_SHA256 = {
  main: 'c510ab93b35bfebf3cabd80634cb021d3405c955b2b0a1acea9ab11ea9eb75ca',
  preview: '6ae26d32eec0cd508f98544355f044973f345eef96ad716bd42a974b41417846',
} as const

/** portrait 直传域源字节（minimalPng(4,4)）的离线真实 SHA-256。 */
const SOURCE_PNG_4x4_SHA256 = 'ff127c16d10d400afeca3db3709a50da874740b19e01112fcd9180df55902ba3'

/** 安装 Canvas/ImageBitmap 双替身（记录 close/decode/toBlob；finally 恢复）。 */
function installCanvasHost(options: {
  width: number
  height: number
  pixels?: Uint8Array
  decodeFails?: boolean
  /** toBlob 确定性产物字节（真实摘要由其内容决定，不再 stub 全零 digest）。 */
  blobBytes?: Uint8Array
  blobBytes2?: Uint8Array
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
  let blobCall = 0
  vi.stubGlobal('document', {
    createElement: () => {
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
          putImageData: () => events.push('putImageData'),
        }),
        toBlob: (callback: (blob: Blob | null) => void) => {
          events.push('toBlob')
          blobCall += 1
          const bytes =
            blobCall === 1
              ? (options.blobBytes ?? pngPayload(2))
              : (options.blobBytes2 ?? pngPayload(3))
          callback(new Blob([bytes.slice()], { type: 'image/png' }))
        },
      }
      return canvas as unknown as HTMLCanvasElement
    },
  })
  return {
    events,
    /** 第 n 次 toBlob（1 起）的确定性合法 PNG 产物，供独立摘要核对。 */
    blobBytes: (call: number) => (call === 1 ? pngPayload(2) : pngPayload(3)),
    customBlobBytes: options.blobBytes,
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
  test('battle-background：320×200 + palette 通过并产出 preview；尺寸不符拒绝、缺 palette 拒绝', async () => {
    const okHost = installCanvasHost({ width: 320, height: 200 })
    try {
      const prepared = await prepareAuthoredImage(
        pngFile('bg.png', 320, 200),
        'battle-background',
        palette(),
      )
      expect(prepared.effectPreviewBytes).toBeDefined()
      expect(okHost.events).toContain('drawImage')
      expect(okHost.events.filter((e) => e === 'toBlob').length).toBe(2) // 主图 + preview
      // 重编码域的真实摘要：hash/record 来自主图 toBlob 合法 PNG 产物（第 1 次），preview 第 2 次
      const mainBytes = okHost.blobBytes(1)
      const previewBytes = okHost.blobBytes(2)
      expect(new Uint8Array(prepared.bytes)).toEqual(mainBytes)
      expect(new Uint8Array(prepared.effectPreviewBytes!)).toEqual(previewBytes)
      expect(prepared.hash).toBe(PNG_PAYLOAD_SHA256.main) // 离线预计算独立 oracle
      expect(prepared.record.sha256).toBe(PNG_PAYLOAD_SHA256.main)
      expect(prepared.record.bytes).toBe(mainBytes.byteLength)
      expect(prepared.hash).not.toBe(PNG_PAYLOAD_SHA256.preview) // 主图与 preview 摘要可区分
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
