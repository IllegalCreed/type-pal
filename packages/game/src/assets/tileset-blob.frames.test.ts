import type { RleFrame } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { twoFrameChunk } from '../__tests__/asset-fixtures.js'
import type { IndexedImage } from './png.js'
import {
  decodeSpriteFrames,
  decodeTilesetBlob,
  framesToCharacterSprite,
  rleFrameToIndexedImage,
} from './tileset-blob.js'

describe('rleFrameToIndexedImage', () => {
  it('RleFrame → IndexedImage 字段重命名，借用 pixels 与 opaque 两份数组', () => {
    const frame: RleFrame = {
      width: 1,
      height: 1,
      pixels: Uint8Array.of(0xaa),
      opaque: Uint8Array.of(1),
    }
    const image = rleFrameToIndexedImage(frame)
    expect(image.width).toBe(1)
    expect(image.height).toBe(1)
    expect(Array.from(image.indices)).toEqual([0xaa])
    expect(Array.from(image.opaque)).toEqual([1])
    expect(image.indices).toBe(frame.pixels)
    expect(image.opaque).toBe(frame.opaque)
  })
})

describe('decodeTilesetBlob', () => {
  it('合成两帧容器 → Map<tileIndex, IndexedImage>，键为 0、1', () => {
    const chunk = twoFrameChunk()
    const map = decodeTilesetBlob(chunk)
    expect(map.size).toBe(2)
    expect(map.get(0)!.width).toBe(1)
    expect(Array.from(map.get(0)!.indices)).toEqual([0xaa])
    expect(map.get(1)!.width).toBe(1)
    expect(Array.from(map.get(1)!.indices)).toEqual([0xbb])
  })

  it('坏槽跳过后，Map 按有效帧顺序编号而不保留原始槽号', () => {
    // 三槽分别指向 byte6/12/16；中槽宽0，按当前 TS 宽容解析合同跳过。
    // 这钉的是过滤后编号，不能将它套用到按原编号消费的 UI manifest。
    const chunk = Uint8Array.of(
      3,
      0,
      6,
      0,
      8,
      0,
      1,
      0,
      1,
      0,
      1,
      0xaa,
      0,
      0,
      1,
      0,
      1,
      0,
      1,
      0,
      1,
      0xbb,
    )
    expect([...decodeTilesetBlob(chunk)]).toEqual([
      [0, { width: 1, height: 1, indices: Uint8Array.of(0xaa), opaque: Uint8Array.of(1) }],
      [1, { width: 1, height: 1, indices: Uint8Array.of(0xbb), opaque: Uint8Array.of(1) }],
    ])
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

describe('sprite frame decoding', () => {
  it('decodeSpriteFrames 保留已解码有效帧的顺序', () => {
    const chunk = twoFrameChunk()
    const frames = decodeSpriteFrames(chunk)
    expect(frames.length).toBe(2)
    expect(Array.from(frames[0]!.indices)).toEqual([0xaa])
    expect(Array.from(frames[1]!.indices)).toEqual([0xbb])
  })
})

describe('character frame anchors', () => {
  const img = (w: number, h: number): IndexedImage => ({
    width: w,
    height: h,
    indices: new Uint8Array(w * h),
    opaque: new Uint8Array(w * h),
  })

  it('锚点取首帧 floor(width/2) 与 height', () => {
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
})

describe('odd anchors and borrowed frames', () => {
  it('首帧宽 7 时 anchorX 为 3，更高的后续帧不改锚点', () => {
    const first: IndexedImage = {
      width: 7,
      height: 4,
      indices: new Uint8Array(28),
      opaque: new Uint8Array(28),
    }
    const later: IndexedImage = {
      width: 2,
      height: 9,
      indices: new Uint8Array(18),
      opaque: new Uint8Array(18),
    }
    const sprite = framesToCharacterSprite([first, later])
    expect(sprite.anchorX).toBe(3)
    expect(sprite.anchorY).toBe(4)
    expect(sprite.frames).toHaveLength(2)
  })

  it('framesToCharacterSprite 保留调用方传入的帧数组引用', () => {
    const frames: IndexedImage[] = [
      { width: 2, height: 2, indices: new Uint8Array(4), opaque: new Uint8Array(4) },
    ]
    expect(framesToCharacterSprite(frames).frames).toBe(frames)
  })
})

describe('empty decoded tilesets', () => {
  it('imagecount 为 0 的 chunk 得到空 Map', () => {
    expect(decodeTilesetBlob(Uint8Array.of(0, 0)).size).toBe(0)
  })
})
