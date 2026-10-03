/**
 * G02-C。旧 load 测试只喂 gzip，并用 /404/ 正则。本组用裸 chunk 与精确状态串。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { twoFrameChunk } from '../__tests__/grok-render-r1/legal-host.js'
import { loadCharacterSpriteBlob, loadSpriteFramesBlob, loadTilesetBlob } from './tileset-blob.js'

const raw = twoFrameChunk().slice()

describe('G02-C sprite 与 tileset 加载边界', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('G02-C01 裸 RLE 经过 loadSpriteFramesBlob 得到两帧 AA 与 BB', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(raw, { status: 200 })),
    )
    const frames = await loadSpriteFramesBlob('/extracted/data/sprite/5.rle')
    expect(frames).toHaveLength(2)
    expect(Array.from(frames[0]?.indices ?? [])).toEqual([0xaa])
    expect(Array.from(frames[1]?.indices ?? [])).toEqual([0xbb])
  })

  it('G02-C02 裸 RLE 经过 loadTilesetBlob 得到键 0 与键 1', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(raw, { status: 200 })),
    )
    const map = await loadTilesetBlob('/extracted/data/tileset/3.rle')
    expect(map.size).toBe(2)
    expect(Array.from(map.get(0)?.indices ?? [])).toEqual([0xaa])
    expect(Array.from(map.get(1)?.indices ?? [])).toEqual([0xbb])
  })

  it('G02-C03 裸 RLE 经过 loadCharacterSpriteBlob 时锚点为 0,1，第二帧为 BB', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(raw, { status: 200 })),
    )
    const sprite = await loadCharacterSpriteBlob('/extracted/data/sprite/9.rle')
    expect(sprite.anchorX).toBe(0)
    expect(sprite.anchorY).toBe(1)
    expect(Array.from(sprite.frames[1]?.indices ?? [])).toEqual([0xbb])
  })

  it('G02-C04 sprite blob 503 的错误带 URL 与状态码', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 503 })),
    )
    await expect(loadSpriteFramesBlob('/extracted/data/battle-sprite/enemy/4.rle')).rejects.toThrow(
      'sprite-blob: fetch /extracted/data/battle-sprite/enemy/4.rle failed (503)',
    )
  })

  it('G02-C05 tileset blob 503 的错误带 URL 与状态码', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(raw, { status: 503 })),
    )
    await expect(loadTilesetBlob('/extracted/data/tileset/9.rle')).rejects.toThrow(
      'tileset-blob: fetch /extracted/data/tileset/9.rle failed (503)',
    )
  })

  it('G02-C06 角色 blob 404 的错误来自 sprite-blob，并带上角色 URL', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(raw, { status: 404 })),
    )
    await expect(loadCharacterSpriteBlob('/extracted/data/sprite/9.rle')).rejects.toThrow(
      'sprite-blob: fetch /extracted/data/sprite/9.rle failed (404)',
    )
  })

  it('G02-C07 tileset 200 但 gzip 主体损坏时，错误不是 fetch 失败串', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(Uint8Array.of(0x1f, 0x8b, 0x00), { status: 200 })),
    )
    const caught = await loadTilesetBlob('/extracted/data/tileset/1.rle').then(
      () => null,
      (error: unknown) => error,
    )
    expect(caught).toBeInstanceOf(TypeError)
    if (!(caught instanceof TypeError)) throw new Error('expected TypeError')
    expect(caught.message).not.toContain('tileset-blob: fetch')
  })

  it('G02-C08 sprite blob 返回损坏 gzip 时错误不是 fetch 失败串', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(Uint8Array.of(0x1f, 0x8b, 0x00), { status: 200 })),
    )
    const caught = await loadSpriteFramesBlob('/extracted/data/sprite/2.rle').then(
      () => null,
      (error: unknown) => error,
    )
    expect(caught).toBeInstanceOf(TypeError)
    if (!(caught instanceof TypeError)) throw new Error('expected TypeError')
    expect(caught.message).not.toContain('sprite-blob: fetch')
  })
})
