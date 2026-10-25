/** Container structure/legacy-tail axes not owned by the basic decoder suite.
 * Inputs use test-owned bytes, never the production encoder as the parser oracle.
 * Full sentinel semantics live in rle.boundaries; public encoder interoperability
 * lives in rle-encode.test's mixed-frame case. The empty encoder rejection remains here.
 */
import { describe, expect, test } from 'vitest'
import { frameBytes, strictChunk } from './__tests__/rle-bytes.js'
import { parseIndexedRleChunk, parseSpriteChunkStrict } from './rle.js'
import { encodeSpriteChunk } from './rle-encode.js'

describe('O10 parseSpriteChunkStrict：容器结构轴', () => {
  test.each([
    ['过短', new Uint8Array(1)],
    ['不含帧', new Uint8Array([0, 0])],
    ['offset table 越界', new Uint8Array([4, 0, 1, 2])],
  ])('%s：拒绝非法容器头', (message, bytes) => {
    expect(() => parseSpriteChunkStrict(bytes)).toThrow(`sprite chunk ${message}`)
  })

  test('声明1槽但没有完整帧头的容器不能伪装成纯sentinel', () => {
    // Count and slot0 share WORD0: [1,0] means count=1 and offset=2, never a zero sentinel.
    expect(() => parseSpriteChunkStrict(new Uint8Array([1, 0, 0, 0]))).toThrow(
      'sprite chunk frame 0 offset 越界',
    )
  })

  test.each([
    ['offset 非递增', 4],
    ['offset 越界', 0xfff0],
  ])('%s：第二帧独立拒绝', (message, offset) => {
    const bytes = strictChunk([
      frameBytes(2, 2, [4, 1, 1, 1, 1]),
      frameBytes(2, 2, [4, 2, 2, 2, 2]),
    ])
    // WORD0 is both count and slot0. Mutate slot1 only, keeping the table valid.
    new DataView(bytes.buffer).setUint16(2, offset / 2, true)
    expect(() => parseSpriteChunkStrict(bytes)).toThrow(`sprite chunk frame 1 ${message}`)
  })

  test.each([
    ['宽为0', 0, 0, 2],
    ['高超上限', 1, 2, 401],
  ])('%s：拒绝该帧尺寸', (_label, index, width, height) => {
    const bytes = strictChunk([
      frameBytes(2, 2, [4, 1, 1, 1, 1]),
      frameBytes(2, 2, [4, 2, 2, 2, 2]),
    ])
    const view = new DataView(bytes.buffer)
    const offset = view.getUint16(index * 2, true) << 1
    view.setUint16(offset, width, true)
    view.setUint16(offset + 2, height, true)
    expect(() => parseSpriteChunkStrict(bytes)).toThrow(`sprite chunk frame ${index} 尺寸非法`)
  })

  test('合法双帧完整通过，pixels与opaque均保序', () => {
    const bytes = strictChunk([
      frameBytes(2, 2, [4, 1, 1, 1, 1]),
      frameBytes(2, 2, [4, 2, 2, 2, 2]),
    ])
    expect(parseSpriteChunkStrict(bytes)).toEqual([
      {
        width: 2,
        height: 2,
        pixels: new Uint8Array([1, 1, 1, 1]),
        opaque: new Uint8Array([1, 1, 1, 1]),
      },
      {
        width: 2,
        height: 2,
        pixels: new Uint8Array([2, 2, 2, 2]),
        opaque: new Uint8Array([1, 1, 1, 1]),
      },
    ])
  })
})

describe('O10 parseIndexedRleChunk：legacy 坏尾三轴', () => {
  test('legacy：尾槽坏offset被跳过，保留全部有效帧并精确报告', () => {
    const out = strictChunk([
      frameBytes(2, 2, [4, 5, 5, 5, 5]),
      frameBytes(2, 2, [4, 6, 6, 6, 6]),
      new Uint8Array(),
    ])
    new DataView(out.buffer).setUint16(4, 0xfff0 >> 1, true)
    expect(parseIndexedRleChunk(out, 'legacy-migrated')).toEqual({
      frames: [
        {
          width: 2,
          height: 2,
          pixels: new Uint8Array([5, 5, 5, 5]),
          opaque: new Uint8Array([1, 1, 1, 1]),
        },
        {
          width: 2,
          height: 2,
          pixels: new Uint8Array([6, 6, 6, 6]),
          opaque: new Uint8Array([1, 1, 1, 1]),
        },
      ],
      declaredSlots: 3,
      skippedLegacyTailSlots: 1,
      trailingSentinel: false,
    })
    expect(() => parseIndexedRleChunk(out, 'canonical')).toThrow('sprite chunk frame 2 offset 越界')
  })

  test('坏尾之后仍可独立解出的帧 → 中间空洞拒绝（非坏尾）', () => {
    const out = strictChunk([
      frameBytes(2, 2, [4, 1, 1, 1, 1]),
      new Uint8Array(),
      frameBytes(2, 2, [4, 3, 3, 3, 3]),
    ])
    new DataView(out.buffer).setUint16(2, 0xfff0 >> 1, true)
    expect(() => parseIndexedRleChunk(out, 'legacy-migrated')).toThrow(
      'sprite chunk frame 2 在坏尾后仍可解，拒绝中间空洞',
    )
  })
})

describe('O10 encodeSpriteChunk：空容器', () => {
  test('空 frames → 2 字节空容器（strict/索引入口一致拒绝“不含帧”）', () => {
    const out = encodeSpriteChunk([])
    expect(out).toEqual(new Uint8Array(2))
    expect(() => parseSpriteChunkStrict(out)).toThrow('sprite chunk 不含帧')
    expect(() => parseIndexedRleChunk(out, 'legacy-migrated')).toThrow('sprite chunk 不含帧')
  })
})
