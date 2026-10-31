/**
 * P01：合成五chunk原始结构，核完整字段与实际输入父buffer所有权。
 * 数值是WORD/SHORT布局向量，不冒充可执行场景或真实剧情。
 * 各chunk拒绝轴独立执行；完整原盘结构oracle另在sss.test.ts。
 */
import { describe, expect, test } from 'vitest'
import { concatBytes, mkfContainer } from '../__tests__/binary-fixtures.js'
import { sssChunks } from '../__tests__/sss-fixtures.js'
import { parseSss } from './sss.js'

/** view本身不含保护区；比较父buffer才能覆盖前后各3B。 */
function guardedSss() {
  const guard = Uint8Array.of(0xee, 0xee, 0xee)
  const raw = mkfContainer(sssChunks())
  const wrapped = concatBytes([guard, raw, guard])
  const view = wrapped.subarray(3, 3 + raw.byteLength)
  return { view, wrapped, before: wrapped.slice() }
}

describe('P01 parseSss 合成 5-chunk MKF', () => {
  test('非对称 16 字段 EO 逐字段精确；signed（vanishTime/layer/state）与 unsigned 高位分开', () => {
    const { view, wrapped, before } = guardedSss()
    const sss = parseSss(view)
    expect(sss.eventObjects).toStrictEqual([
      {
        vanishTime: -32768,
        x: 0xffff,
        y: 0x1234,
        layer: -2,
        triggerScript: 0x000a,
        autoScript: 0x000b,
        state: -5,
        triggerMode: 0x00c3,
        spriteNum: 0x0abc,
        nSpriteFrames: 3,
        direction: 2,
        currentFrameNum: 1,
        scriptIdleFrame: 9,
        spritePtrOffset: 0x0fed,
        nSpriteFramesAuto: 0x12,
        scriptIdleFrameCountAuto: 0x34,
        raw: new Uint16Array([
          0x8000, 0xffff, 0x1234, 0xfffe, 0x000a, 0x000b, 0xfffb, 0x00c3, 0x0abc, 3, 2, 1, 9,
          0x0fed, 0x12, 0x34,
        ]),
      },
      {
        vanishTime: 32767,
        x: 1,
        y: 2,
        layer: 1,
        triggerScript: 0x1110,
        autoScript: 0x2220,
        state: 2,
        triggerMode: 4,
        spriteNum: 5,
        nSpriteFrames: 6,
        direction: 7,
        currentFrameNum: 8,
        scriptIdleFrame: 9,
        spritePtrOffset: 0x000a,
        nSpriteFramesAuto: 0x000b,
        scriptIdleFrameCountAuto: 0x000c,
        raw: new Uint16Array([
          0x7fff, 1, 2, 1, 0x1110, 0x2220, 2, 4, 5, 6, 7, 8, 9, 0x000a, 0x000b, 0x000c,
        ]),
      },
    ])
    expect(wrapped).toEqual(before)
  })

  test('scene 四字段精确；chunk2 WORD / chunk3 DWORD / chunk4 字节完整', () => {
    const sss = parseSss(mkfContainer(sssChunks()))
    expect(sss.scenes).toStrictEqual([
      {
        mapNum: 0x0102,
        scriptOnEnter: 0x0304,
        scriptOnTeleport: 0x0506,
        eventObjectIndex: 0x0708,
        raw: new Uint16Array([0x0102, 0x0304, 0x0506, 0x0708]),
      },
      {
        mapNum: 0x1122,
        scriptOnEnter: 0x3344,
        scriptOnTeleport: 0x5566,
        eventObjectIndex: 0x7788,
        raw: new Uint16Array([0x1122, 0x3344, 0x5566, 0x7788]),
      },
    ])
    expect(sss.objects).toStrictEqual(new Uint16Array([1, 0x8000, 0xfffe, 0x7fff, 0x1234, 0xabcd]))
    expect(sss.messageOffsets).toStrictEqual(new Uint32Array([0, 3, 3, 7, 0xbeef]))
    // 直接手列LE字节，expected不再复用输入的u16Bytes构造器。
    expect(sss.bytecode).toStrictEqual(
      Uint8Array.of(
        0x01,
        0x00,
        0x11,
        0x00,
        0x22,
        0x00,
        0x33,
        0x00,
        0xff,
        0x00,
        0x11,
        0x01,
        0x22,
        0x02,
        0x33,
        0x03,
        0x00,
        0x80,
        0x44,
        0x04,
        0x55,
        0x05,
        0x66,
        0x06,
      ),
    )
  })

  test('解析后的结构数组独立于输入；字节码借用原输入的精确范围', () => {
    const { view, wrapped, before } = guardedSss()
    const sss = parseSss(view)
    const ownedArrays = [
      ...sss.eventObjects.map((entry) => entry.raw),
      ...sss.scenes.map((entry) => entry.raw),
      sss.objects,
      sss.messageOffsets,
    ]
    for (const array of ownedArrays) array.fill(0)
    expect(wrapped).toEqual(before)
    expect(sss.eventObjects[0]!.vanishTime).toBe(-32768)
    expect(sss.scenes[0]!.mapNum).toBe(0x0102)
    expect(sss.bytecode.buffer).toBe(view.buffer)
    expect(sss.bytecode.byteOffset).toBe(view.byteOffset + view.byteLength - 24)
    expect(sss.bytecode.byteLength).toBe(24)
  })

  test.each([
    {
      chunk: 0,
      append: Uint8Array.of(1, 0),
      error: 'SSS chunk0: byte length 66 is not a multiple of 32',
    },
    {
      chunk: 1,
      append: Uint8Array.of(0),
      error: 'SSS chunk1: byte length 17 is not a multiple of 8',
    },
    {
      chunk: 2,
      append: Uint8Array.of(0),
      error: 'SSS chunk2: byte length 13 is not a multiple of 2',
    },
    {
      chunk: 3,
      append: Uint8Array.of(0),
      error: 'SSS chunk3: byte length 21 is not a multiple of 4',
    },
    {
      chunk: 4,
      append: Uint8Array.of(0),
      error: 'SSS chunk4: byte length 25 is not a multiple of 8',
    },
  ])('chunk$chunk 非结构对齐：其余chunk合法，错误定位当前chunk', ({ chunk, append, error }) => {
    const malformed = sssChunks().map((bytes, index) =>
      index === chunk ? concatBytes([bytes, append]) : bytes,
    )
    expect(() => parseSss(mkfContainer(malformed))).toThrow(error)
  })
})
