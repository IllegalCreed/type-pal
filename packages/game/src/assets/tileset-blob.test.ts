import { gzipSync } from 'node:zlib'
import { parseSpriteChunk } from '@type-pal/shared'
import { describe, expect, it, vi } from 'vitest'
import type { IndexedImage } from './png.js'
import {
  decodeSpriteFrames,
  decodeTilesetBlob,
  decompressGzip,
  framesToCharacterSprite,
  loadCharacterSpriteBlob,
  loadSpriteFramesBlob,
  loadTilesetBlob,
  rleFrameToIndexedImage,
} from './tileset-blob.js'

function makeSimpleChunk(): Uint8Array {
  // imagecount=2, frame0 at byte 4 (1×1 0xAA), frame1 at byte 10 (1×1 0xBB)
  const buf = new Uint8Array(16)
  const v = new DataView(buf.buffer)
  v.setUint16(0, 2, true) // imagecount = 2;frame[0] word-offset = 2 → byte 4
  v.setUint16(2, 5, true) // frame[1] word-offset = 5 → byte 10
  // frame[0] at byte 4: 1×1 0xAA
  v.setUint16(4, 1, true) // w=1
  v.setUint16(6, 1, true) // h=1
  buf[8] = 0x01 // 直 1 像素
  buf[9] = 0xaa
  // frame[1] at byte 10: 1×1 0xBB
  v.setUint16(10, 1, true) // w=1
  v.setUint16(12, 1, true) // h=1
  buf[14] = 0x01
  buf[15] = 0xbb
  return buf
}

describe('rleFrameToIndexedImage', () => {
  it('RleFrame → IndexedImage 字段重命名(pixels→indices),数组复用不拷贝', () => {
    const chunk = makeSimpleChunk()
    const frames = parseSpriteChunk(chunk)
    const img = rleFrameToIndexedImage(frames[0]!)
    expect(img.width).toBe(1)
    expect(img.height).toBe(1)
    expect(Array.from(img.indices)).toEqual([0xaa])
    expect(Array.from(img.opaque)).toEqual([1])
    // 复用同一 Uint8Array(不拷贝):rleFrameToIndexedImage 直接赋 frame.pixels
    expect(img.indices).toBe(frames[0]!.pixels)
  })
})

describe('decodeTilesetBlob', () => {
  it('GOP chunk → Map<tileIndex, IndexedImage>,下标连续 0,1,...', () => {
    const chunk = makeSimpleChunk()
    const map = decodeTilesetBlob(chunk)
    expect(map.size).toBe(2)
    expect(map.get(0)!.width).toBe(1)
    expect(Array.from(map.get(0)!.indices)).toEqual([0xaa])
    expect(map.get(1)!.width).toBe(1)
    expect(Array.from(map.get(1)!.indices)).toEqual([0xbb])
  })

  it('键一致性:Map key == parseSpriteChunk 返回数组下标 == 旧 framesToOut index', () => {
    // 这是核心不变式:新链路的 key 必须与旧链路(per-tile PNG 的 tile-{index})对齐。
    // parseSpriteChunk 是同一份函数(extractor 和 runtime 都从 shared 取),
    // 所以下标天然一致。此测试钉死这个语义。
    const chunk = makeSimpleChunk()
    const frames = parseSpriteChunk(chunk)
    const map = decodeTilesetBlob(chunk)
    expect(map.size).toBe(frames.length)
    for (let i = 0; i < frames.length; i++) {
      expect(map.has(i)).toBe(true)
      // 内容一致(不比引用 —— decodeTilesetBlob 内部调 parseSpriteChunk 是独立一次)
      expect(Array.from(map.get(i)!.indices)).toEqual(Array.from(frames[i]!.pixels))
      expect(Array.from(map.get(i)!.opaque)).toEqual(Array.from(frames[i]!.opaque))
      expect(map.get(i)!.width).toBe(frames[i]!.width)
      expect(map.get(i)!.height).toBe(frames[i]!.height)
    }
  })

  it('透明像素 + opaque palette-0 都正确表达', () => {
    // 4×1:跳 1(0x81) + 直 2(0x02 0x00 0xCC) + 跳 1(0x81)
    //   位置 0:transparent(opaque=0)
    //   位置 1:palette-0 但 opaque=1(关键:不能被当透明)
    //   位置 2:0xCC opaque=1
    //   位置 3:transparent
    const rleFrame = new Uint8Array([0x04, 0x00, 0x01, 0x00, 0x81, 0x02, 0x00, 0xcc, 0x81])
    // 包成单帧 chunk:imagecount=1, frame0 at byte 2
    const chunk = new Uint8Array(2 + rleFrame.length)
    new DataView(chunk.buffer).setUint16(0, 1, true)
    chunk.set(rleFrame, 2)
    const map = decodeTilesetBlob(chunk)
    const img = map.get(0)!
    expect(img.width).toBe(4)
    expect(Array.from(img.indices)).toEqual([0, 0, 0xcc, 0])
    expect(Array.from(img.opaque)).toEqual([0, 1, 1, 0])
  })
})

describe('decodeSpriteFrames / loadSpriteFramesBlob (npc/battle/magic 共用)', () => {
  it('decodeSpriteFrames:chunk → IndexedImage[],序与 parseSpriteChunk 一致', () => {
    const chunk = makeSimpleChunk()
    const frames = decodeSpriteFrames(chunk)
    expect(frames.length).toBe(2)
    expect(Array.from(frames[0]!.indices)).toEqual([0xaa])
    expect(Array.from(frames[1]!.indices)).toEqual([0xbb])
  })

  it('loadSpriteFramesBlob:fetch mock → 解压 → IndexedImage[]', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(gzipSync(makeSimpleChunk()), { status: 200 }))
    try {
      const frames = await loadSpriteFramesBlob('/fake/sprite/5.rle')
      expect(frames.length).toBe(2)
      expect(Array.from(frames[1]!.indices)).toEqual([0xbb])
    } finally {
      fetchSpy.mockRestore()
    }
  })

  it('loadSpriteFramesBlob:404 抛错', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('', { status: 404 }))
    await expect(loadSpriteFramesBlob('/fake/missing.rle')).rejects.toThrow(/404/)
    fetchSpy.mockRestore()
  })
})

describe('framesToCharacterSprite (锚点派生)', () => {
  const img = (w: number, h: number): IndexedImage => ({
    width: w,
    height: h,
    indices: new Uint8Array(w * h),
    opaque: new Uint8Array(w * h),
  })

  it('锚点 = 首帧 floor(width/2) / height(与旧 loader 同源)', () => {
    const cs = framesToCharacterSprite([img(20, 31), img(18, 40)])
    expect(cs.anchorX).toBe(10)
    expect(cs.anchorY).toBe(31)
    expect(cs.frames.length).toBe(2)
  })

  it('空帧 → 锚点 0', () => {
    const cs = framesToCharacterSprite([])
    expect(cs.anchorX).toBe(0)
    expect(cs.anchorY).toBe(0)
  })

  it('loadCharacterSpriteBlob:fetch mock → 帧 + 锚点', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(gzipSync(makeSimpleChunk()), { status: 200 }))
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

describe('decompressGzip', () => {
  it('gzip roundtrip:解压后 == 原始字节', async () => {
    const original = makeSimpleChunk()
    const gzipped = gzipSync(original)
    const blob = new Blob([gzipped])
    const decompressed = await decompressGzip(blob)
    expect(Array.from(decompressed)).toEqual(Array.from(original))
  })

  it('空 blob 也支持(边界)', async () => {
    const original = new Uint8Array(0)
    const gzipped = gzipSync(original)
    const blob = new Blob([gzipped])
    const decompressed = await decompressGzip(blob)
    expect(decompressed.byteLength).toBe(0)
  })

  it('Content-Encoding 已解压(无 gzip 魔数)→ 原样返回,不二次解压', async () => {
    // 模拟 nginx/CDN 自动解掉 Content-Encoding 后,fetch 拿到的是裸 chunk 字节(非 gzip)。
    const rawChunk = makeSimpleChunk() // 首字节 0x02(小端 count),非 0x1f
    const blob = new Blob([Buffer.from(rawChunk)])
    const out = await decompressGzip(blob)
    expect(Array.from(out)).toEqual(Array.from(rawChunk))
  })
})

describe('loadTilesetBlob', () => {
  it('完整链路:fetch mock → 解压 → 解析 → Map(键一致性 + 像素)', async () => {
    const chunk = makeSimpleChunk()
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

  it('fetch 失败抛错', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('', { status: 404 }))
    await expect(loadTilesetBlob('/fake/missing')).rejects.toThrow(/404/)
    fetchSpy.mockRestore()
  })
})
