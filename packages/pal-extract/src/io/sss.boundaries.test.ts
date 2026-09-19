/**
 * TEST-PAL-TABLES-COVERAGE-1 P01：SSS 边界（io/sss.ts）。
 * 既有 sss.test 只做真实资产 sanity（倍数/非空）——不重复。本文件用合成 5-chunk MKF：
 * 非对称 16 字段 EO、signed 与 unsigned 高位分开、完整 chunk2 WORD / chunk3 DWORD / chunk4 字节、
 * 32B/8B 截断各单轴。输入前后留保护字节且不变。
 */
import { describe, expect, test } from 'vitest'
import { concatBytes, mkfContainer, sssChunks, u16Bytes } from '../__tests__/glm-tb04-fixtures.js'
import { parseSss } from './sss.js'

/** 前后各 3 字节保护；断言原 buffer 不被改动。 */
function guardedSss(): { parse: () => ReturnType<typeof parseSss>; snapshot: Uint8Array } {
  const guard = new Uint8Array([0xee, 0xee, 0xee])
  const raw = mkfContainer(sssChunks())
  const wrapped = concatBytes([guard, raw, guard])
  const view = wrapped.subarray(3, 3 + raw.byteLength)
  return { parse: () => parseSss(view), snapshot: wrapped.slice() }
}

describe('P01 parseSss 合成 5-chunk MKF', () => {
  test('非对称 16 字段 EO 逐字段精确；signed（vanishTime/layer/state）与 unsigned 高位分开', () => {
    const { parse, snapshot } = guardedSss()
    const sss = parse()
    expect(sss.eventObjects).toHaveLength(2)
    expect(sss.eventObjects[0]).toMatchObject({
      vanishTime: -32768, // 0x8000 signed
      x: 0xffff, // unsigned 高位
      y: 0x1234,
      layer: -2, // 0xFFFE signed
      triggerScript: 0x000a,
      autoScript: 0x000b,
      state: -5, // 0xFFFB signed
      triggerMode: 0x00c3,
      spriteNum: 0x0abc,
      nSpriteFrames: 3,
      direction: 2,
      currentFrameNum: 1,
      scriptIdleFrame: 9,
      spritePtrOffset: 0x0fed,
      nSpriteFramesAuto: 0x12,
      scriptIdleFrameCountAuto: 0x34,
    })
    expect(sss.eventObjects[1]!.vanishTime).toBe(32767)
    expect(sss.eventObjects[1]!.layer).toBe(1)
    expect(sss.eventObjects[1]!.state).toBe(2)
    // raw 16 槽保真（unsigned 位模式）
    expect(Array.from(sss.eventObjects[0]!.raw)).toEqual([
      0x8000, 0xffff, 0x1234, 0xfffe, 0x000a, 0x000b, 0xfffb, 0x00c3, 0x0abc, 0x0003, 0x0002,
      0x0001, 0x0009, 0x0fed, 0x0012, 0x0034,
    ])
    expect(snapshot).toEqual(guardedSss().snapshot) // 输入不变（每次重建同值）
  })
  test('scene 四字段精确；chunk2 WORD / chunk3 DWORD / chunk4 字节完整', () => {
    const sss = parseSss(mkfContainer(sssChunks()))
    expect(sss.scenes).toHaveLength(2)
    expect(sss.scenes[0]).toMatchObject({
      mapNum: 0x0102,
      scriptOnEnter: 0x0304,
      scriptOnTeleport: 0x0506,
      eventObjectIndex: 0x0708,
    })
    expect(Array.from(sss.scenes[1]!.raw)).toEqual([0x1122, 0x3344, 0x5566, 0x7788])
    expect(Array.from(sss.objects)).toEqual([0x0001, 0x8000, 0xfffe, 0x7fff, 0x1234, 0xabcd])
    expect(Array.from(sss.messageOffsets)).toEqual([0, 3, 3, 7, 0x0000beef])
    expect(Array.from(sss.bytecode)).toEqual(
      Array.from(
        concatBytes([
          u16Bytes(0x0001, 0x0011, 0x0022, 0x0033),
          u16Bytes(0x00ff, 0x0111, 0x0222, 0x0333),
          u16Bytes(0x8000, 0x0444, 0x0555, 0x0666),
        ]),
      ),
    )
  })
  test('chunk0 非 32 倍数 / chunk1 非 8 倍数各自单轴拒绝（其余 chunk 合法）', () => {
    const good = sssChunks()
    const bad0 = [...good]
    bad0[0] = concatBytes([bad0[0]!, u16Bytes(0x0001)]) // 66B
    expect(() => parseSss(mkfContainer(bad0))).toThrow(
      'SSS chunk0: byte length 66 is not a multiple of 32',
    )
    const bad1 = [...good]
    bad1[1] = concatBytes([bad1[1]!, new Uint8Array(1)]) // 17B
    expect(() => parseSss(mkfContainer(bad1))).toThrow(
      'SSS chunk1: byte length 17 is not a multiple of 8',
    )
  })
})
