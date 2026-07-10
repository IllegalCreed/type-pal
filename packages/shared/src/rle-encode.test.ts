import { describe, expect, test } from 'vitest'
import { encodeRleFrame, encodeSpriteChunk } from './rle-encode.js'
import { decodeRle, parseSpriteChunk, type RleFrame } from './rle.js'

/** 帧语义等价:w/h/opaque 全等;pixels 仅比 opaque=1 位(透明位是占位)。 */
function expectFrameEqual(a: RleFrame, b: RleFrame): void {
  expect(a.width).toBe(b.width)
  expect(a.height).toBe(b.height)
  expect([...a.opaque]).toEqual([...b.opaque])
  for (let i = 0; i < a.opaque.length; i++) {
    if (a.opaque[i] === 1) expect(a.pixels[i]).toBe(b.pixels[i])
  }
}

const mkFrame = (w: number, h: number, fill: (i: number) => [number, number]): RleFrame => {
  const pixels = new Uint8Array(w * h)
  const opaque = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) {
    const [p, o] = fill(i)
    pixels[i] = p
    opaque[i] = o
  }
  return { width: w, height: h, pixels, opaque }
}

describe('encodeRleFrame ↔ decodeRle roundtrip', () => {
  test('混合游程(透明/不透明交错,含 palette 0 不透明像素)', () => {
    const f = mkFrame(8, 4, (i) => (i % 3 === 0 ? [0, 0] : [i % 256, 1]))
    expectFrameEqual(decodeRle(encodeRleFrame(f)), f)
  })

  test('全透明帧(必须发满跳段,解码不越界)', () => {
    const f = mkFrame(32, 15, () => [0, 0])
    expectFrameEqual(decodeRle(encodeRleFrame(f)), f)
  })

  test('全不透明帧 + 超 0x7f 长游程分段', () => {
    const f = mkFrame(64, 5, (i) => [(i * 7) % 256, 1]) // 320 px 连续不透明 → 多段
    expectFrameEqual(decodeRle(encodeRleFrame(f)), f)
  })

  test('尾部透明写满(总长恰为 w*h)', () => {
    const f = mkFrame(16, 2, (i) => (i < 5 ? [9, 1] : [0, 0]))
    const decoded = decodeRle(encodeRleFrame(f))
    expect(decoded.opaque.length).toBe(32)
    expectFrameEqual(decoded, f)
  })

  test('伪随机帧 roundtrip(确定种子)', () => {
    let seed = 42
    const rnd = (): number => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      return seed
    }
    const f = mkFrame(33, 17, () => {
      const o = rnd() % 4 === 0 ? 0 : 1
      return [rnd() % 256, o as 0 | 1]
    })
    expectFrameEqual(decodeRle(encodeRleFrame(f)), f)
  })
})

describe('encodeSpriteChunk ↔ parseSpriteChunk roundtrip', () => {
  test('多帧(变尺寸,含奇数长帧数据触发对齐 pad)→ 帧序与内容恒等', () => {
    const frames = [
      mkFrame(32, 15, (i) => [(i % 200) + 1, i % 5 === 0 ? 0 : 1]),
      mkFrame(3, 3, (i) => [i + 1, 1]), // 9 px 全实 → 帧数据 4+1+9=14 偶;换 5 px 造奇数
      mkFrame(5, 1, (i) => [i + 1, 1]), // 4+1+5=10 偶…再来一帧混合
      mkFrame(7, 2, (i) => (i % 2 === 0 ? [i, 1] : [0, 0])),
    ]
    const parsed = parseSpriteChunk(encodeSpriteChunk(frames))
    expect(parsed.length).toBe(frames.length)
    frames.forEach((f, i) => {
      expectFrameEqual(parsed[i]!, f)
    })
  })

  test('单帧与空 chunk 边界', () => {
    const one = [mkFrame(2, 2, (i) => [i + 1, 1])]
    const parsedOne = parseSpriteChunk(encodeSpriteChunk(one))
    expect(parsedOne.length).toBe(1)
    expectFrameEqual(parsedOne[0]!, one[0]!)
    expect(parseSpriteChunk(encodeSpriteChunk([]))).toEqual([])
  })

  test('超 128KB 抛错(u16 word 偏移上限)', () => {
    // 300×300 全不透明 ≈ 90KB/帧 × 2 帧 > 128KB
    const big = mkFrame(300, 300, (i) => [i % 256, 1])
    expect(() => encodeSpriteChunk([big, big])).toThrow(/128|拆分|上限/)
  })
})
