// @vitest-environment jsdom
/**
 * TEST-CURSOR-ASSET-UI-LARGE-1 C03-G06：image-import 真实 PNG 端口与 catalog 身份。
 * 排重：image-import.test 已证 quantize 数值；image-import.stages.test 用 mock canvas
 * 证 battle-background/签名门/nextAuthoredImageId 主链。本组只补：经 installBrowserHardwarePorts
 * 的 portrait/face/item-icon 直传域、label/origin/path 字段与 nextAuthoredImageId 边界。
 */
import type { AssetCatalogV1 } from '@type-pal/content'
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  installBrowserHardwarePorts,
  pngFileOf,
  pngRgba,
  solidRgba,
} from '../__tests__/cursor-asset-r1/image-ports.js'
import { stubNodeTestHost } from '../__tests__/cursor-asset-r1/kit.js'
import { nextAuthoredImageId, prepareAuthoredImage } from './image-import.js'

function emptyCatalog(): AssetCatalogV1 {
  return { version: 1, assets: {} }
}

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

beforeAll(async () => {
  await stubNodeTestHost()
})

beforeEach(async () => {
  await installBrowserHardwarePorts()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('C03-G06 真实 PNG 导入与 AssetId', () => {
  test('C03-G06-01 portrait 直传：bytes/hash 等于源 PNG 且 record.kind=portrait', async () => {
    const rgba = solidRgba(4, 4, [40, 80, 120, 255])
    const bytes = pngRgba(4, 4, rgba)
    const file = pngFileOf('hero-face.png', bytes)
    const prepared = await prepareAuthoredImage(file, 'portrait')
    expect(prepared.width).toBe(4)
    expect(prepared.height).toBe(4)
    expect(new Uint8Array(prepared.bytes)).toEqual(new Uint8Array(bytes))
    expect(prepared.hash).toBe(await sha256Hex(bytes.slice().buffer))
    expect(prepared.record.kind).toBe('portrait')
    expect(prepared.record.path).toBe(`assets/authored/portrait/${prepared.hash}.png`)
  })

  test('C03-G06-02 face 直传不产生 effectPreviewBytes', async () => {
    const file = pngFileOf('face.png', pngRgba(2, 2, solidRgba(2, 2, [1, 2, 3, 255])))
    const prepared = await prepareAuthoredImage(file, 'face', undefined, '表情')
    expect(prepared.effectPreviewBytes).toBeUndefined()
    expect(prepared.record.label).toBe('表情')
    expect(prepared.record.origin).toEqual({ kind: 'authored', ref: 'face.png' })
  })

  test('C03-G06-03 item-icon label 缺省剥扩展名', async () => {
    const file = pngFileOf('Sword.Icon.png', pngRgba(3, 3, solidRgba(3, 3, [9, 9, 9, 255])))
    const prepared = await prepareAuthoredImage(file, 'item-icon')
    expect(prepared.record.label).toBe('Sword.Icon')
    expect(prepared.record.mediaType).toBe('image/png')
  })

  test('C03-G06-04 非 .png 扩展名拒绝', async () => {
    const file = {
      name: 'a.jpeg',
      type: 'image/jpeg',
      arrayBuffer: async () => new ArrayBuffer(8),
    } as File
    await expect(prepareAuthoredImage(file, 'portrait')).rejects.toThrow('只允许导入 PNG 文件')
  })

  test('C03-G06-05 坏 PNG 签名：错误带文件名', async () => {
    const file = pngFileOf('broken.png', new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]))
    await expect(prepareAuthoredImage(file, 'portrait')).rejects.toThrow(/broken\.png/)
  })

  test('C03-G06-06 nextAuthoredImageId：base 空闲直接返回 hash 前 16', () => {
    const hash = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789'
    expect(nextAuthoredImageId(emptyCatalog(), 'portrait', hash)).toBe(
      `portrait.authored.${hash.slice(0, 16)}`,
    )
  })

  test('C03-G06-07 base 占用递增 -2/-3 后缀', () => {
    const catalog = emptyCatalog()
    const hash = 'a'.repeat(64)
    const base = nextAuthoredImageId(catalog, 'face', hash)
    catalog.assets[base] = {
      kind: 'face',
      path: 'assets/x.png',
      mediaType: 'image/png',
      bytes: 1,
      sha256: hash,
      label: '占',
      origin: { kind: 'authored' },
    }
    const second = nextAuthoredImageId(catalog, 'face', hash)
    expect(second).toBe(`${base}-2`)
    catalog.assets[second] = { ...catalog.assets[base]! }
    expect(nextAuthoredImageId(catalog, 'face', hash)).toBe(`${base}-3`)
  })

  test('C03-G06-08 同 hash 不同 kind 的 base 互不占用', () => {
    const hash = 'b'.repeat(64)
    const portraitId = nextAuthoredImageId(emptyCatalog(), 'portrait', hash)
    const catalog = emptyCatalog()
    catalog.assets[portraitId] = {
      kind: 'portrait',
      path: 'assets/p.png',
      mediaType: 'image/png',
      bytes: 1,
      sha256: hash,
      label: 'P',
      origin: { kind: 'authored' },
    }
    const faceId = nextAuthoredImageId(catalog, 'face', hash)
    expect(faceId).toBe(`face.authored.${hash.slice(0, 16)}`)
    expect(faceId).not.toBe(portraitId)
  })

  test('C03-G06-09 sourceBytes 保留原始文件缓冲引用长度', async () => {
    const payload = pngRgba(5, 5, solidRgba(5, 5, [3, 3, 3, 255]))
    const file = pngFileOf('keep-src.png', payload)
    const prepared = await prepareAuthoredImage(file, 'item-icon')
    expect(prepared.sourceBytes.byteLength).toBe(payload.byteLength)
    expect(new Uint8Array(prepared.sourceBytes)).toEqual(new Uint8Array(payload))
  })

  test('C03-G06-10 portrait 与 face 同图 hash 相同但 path 前缀按 kind 区分', async () => {
    const payload = pngRgba(2, 2, solidRgba(2, 2, [7, 7, 7, 255]))
    const file = pngFileOf('same.png', payload)
    const portrait = await prepareAuthoredImage(file, 'portrait')
    const face = await prepareAuthoredImage(file, 'face')
    expect(portrait.hash).toBe(face.hash)
    expect(portrait.record.path).toContain('/portrait/')
    expect(face.record.path).toContain('/face/')
  })
})
