import { gzipSync } from 'node:zlib'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { twoFrameChunk } from '../__tests__/asset-fixtures.js'
import { loadCharacterSpriteBlob, loadSpriteFramesBlob, loadTilesetBlob } from './tileset-blob.js'

const raw = twoFrameChunk().slice()

describe('gzip fetch assembly', () => {
  it('loadSpriteFramesBlob:fetch mock → 解压 → IndexedImage[]', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(gzipSync(twoFrameChunk()), { status: 200 }))
    try {
      const frames = await loadSpriteFramesBlob('/fake/sprite/5.rle')
      expect(frames.length).toBe(2)
      expect(Array.from(frames[1]!.indices)).toEqual([0xbb])
    } finally {
      fetchSpy.mockRestore()
    }
  })
})

describe('gzip fetch assembly', () => {
  it('loadCharacterSpriteBlob:fetch mock → 帧 + 锚点', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(gzipSync(twoFrameChunk()), { status: 200 }))
    try {
      const cs = await loadCharacterSpriteBlob('/fake/sprite/5.rle')
      expect(cs.frames.length).toBe(2)
      expect(cs.anchorX).toBe(0) // 1×1 帧 → floor(1/2)=0
      expect(cs.anchorY).toBe(1)
    } finally {
      fetchSpy.mockRestore()
    }
  })
})

describe('gzip fetch assembly', () => {
  it('完整链路:fetch mock → 解压 → 解析 → Map(键一致性 + 像素)', async () => {
    const chunk = twoFrameChunk()
    const gzipped = gzipSync(chunk)
    // mock fetch 返回 gzipped blob
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(gzipped, { status: 200 }))
    try {
      const map = await loadTilesetBlob('/fake/tileset/1.rle')
      expect(fetchSpy).toHaveBeenCalledWith('/fake/tileset/1.rle')
      expect(map.size).toBe(2)
      expect(Array.from(map.get(0)!.indices)).toEqual([0xaa])
      expect(Array.from(map.get(1)!.indices)).toEqual([0xbb])
    } finally {
      fetchSpy.mockRestore()
    }
  })
})

describe('raw transport and fetch failures', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('裸 RLE 经过 loadSpriteFramesBlob 得到两帧 AA 与 BB', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(raw, { status: 200 })),
    )
    const frames = await loadSpriteFramesBlob('/extracted/data/sprite/5.rle')
    expect(frames).toHaveLength(2)
    expect(Array.from(frames[0]?.indices ?? [])).toEqual([0xaa])
    expect(Array.from(frames[1]?.indices ?? [])).toEqual([0xbb])
  })

  it('裸 RLE 经过 loadTilesetBlob 得到键 0 与键 1', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(raw, { status: 200 })),
    )
    const map = await loadTilesetBlob('/extracted/data/tileset/3.rle')
    expect(map.size).toBe(2)
    expect(Array.from(map.get(0)?.indices ?? [])).toEqual([0xaa])
    expect(Array.from(map.get(1)?.indices ?? [])).toEqual([0xbb])
  })

  it('裸 RLE 经过 loadCharacterSpriteBlob 时锚点为 0,1，第二帧为 BB', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(raw, { status: 200 })),
    )
    const sprite = await loadCharacterSpriteBlob('/extracted/data/sprite/9.rle')
    expect(sprite.anchorX).toBe(0)
    expect(sprite.anchorY).toBe(1)
    expect(Array.from(sprite.frames[1]?.indices ?? [])).toEqual([0xbb])
  })

  it('sprite blob 503 的错误带 URL 与状态码', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 503 })),
    )
    await expect(loadSpriteFramesBlob('/extracted/data/battle-sprite/enemy/4.rle')).rejects.toThrow(
      'sprite-blob: fetch /extracted/data/battle-sprite/enemy/4.rle failed (503)',
    )
  })

  it('tileset blob 503 的错误带 URL 与状态码', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(raw, { status: 503 })),
    )
    await expect(loadTilesetBlob('/extracted/data/tileset/9.rle')).rejects.toThrow(
      'tileset-blob: fetch /extracted/data/tileset/9.rle failed (503)',
    )
  })

  it('角色 blob 404 的错误来自 sprite-blob，并带上角色 URL', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(raw, { status: 404 })),
    )
    await expect(loadCharacterSpriteBlob('/extracted/data/sprite/9.rle')).rejects.toThrow(
      'sprite-blob: fetch /extracted/data/sprite/9.rle failed (404)',
    )
  })

  it('tileset 200 但 gzip 主体损坏时，错误不是 fetch 失败串', async () => {
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

  it('sprite blob 返回损坏 gzip 时错误不是 fetch 失败串', async () => {
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
