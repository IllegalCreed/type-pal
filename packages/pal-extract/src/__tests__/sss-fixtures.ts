import { concatBytes, u16Bytes, u32Bytes } from './binary-fixtures.js'

/** SSS 五 chunk 合成数据：两条非对称 16 字段 EO + 两 scene + WORD 数组 + u32 表 + 3 条字节码。 */
export function sssChunks(): Uint8Array[] {
  const eo0 = u16Bytes(
    0x8000, // vanishTime = -32768 (signed)
    0xffff, // x（unsigned 高位）
    0x1234, // y
    0xfffe, // layer = -2 (signed)
    0x000a, // triggerScript
    0x000b, // autoScript
    0xfffb, // state = -5 (signed)
    0x00c3, // triggerMode
    0x0abc, // spriteNum
    0x0003, // nSpriteFrames
    0x0002, // direction
    0x0001, // currentFrameNum
    0x0009, // scriptIdleFrame
    0x0fed, // spritePtrOffset
    0x0012, // nSpriteFramesAuto
    0x0034, // scriptIdleFrameCountAuto
  )
  const eo1 = u16Bytes(
    0x7fff, // vanishTime = 32767
    0x0001,
    0x0002,
    0x0001, // layer = 1
    0x1110,
    0x2220,
    0x0002, // state
    0x0004,
    0x0005,
    0x0006,
    0x0007,
    0x0008,
    0x0009,
    0x000a,
    0x000b,
    0x000c,
  )
  const scene0 = u16Bytes(0x0102, 0x0304, 0x0506, 0x0708)
  const scene1 = u16Bytes(0x1122, 0x3344, 0x5566, 0x7788)
  const objects = u16Bytes(0x0001, 0x8000, 0xfffe, 0x7fff, 0x1234, 0xabcd)
  const messageOffsets = u32Bytes(0, 3, 3, 7, 0x0000beef)
  const bytecode = concatBytes([
    u16Bytes(0x0001, 0x0011, 0x0022, 0x0033),
    u16Bytes(0x00ff, 0x0111, 0x0222, 0x0333),
    u16Bytes(0x8000, 0x0444, 0x0555, 0x0666),
  ])
  return [
    concatBytes([eo0, eo1]), // 64B = 2 × 32
    concatBytes([scene0, scene1]), // 16B = 2 × 8
    objects,
    messageOffsets,
    bytecode, // 24B = 3 × 8
  ]
}
