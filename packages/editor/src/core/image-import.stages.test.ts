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

/** 安装 Canvas/ImageBitmap 双替身（记录 close/decode/toBlob；finally 恢复）。 */
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
          callback(new Blob([new Uint8Array(8)], { type: 'image/png' }))
        },
      }
      return canvas as unknown as HTMLCanvasElement
    },
  })
  const cryptoStub = vi
    .spyOn(crypto.subtle, 'digest')
    .mockImplementation(async () => new ArrayBuffer(32))
  return {
    events,
    cryptoStub,
    restore: () => {
      cryptoStub.mockRestore()
    },
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
      expect(prepared.hash).toMatch(/^[0-9a-f]{64}$/)
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
