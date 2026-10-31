/**
 * 固定sprite向量及其literal-only YJ2字节（含0xFFF结束符）。
 * 原生SDLPal有界解码已验证EOS及11字节输出；TS按声明长度提前结束，
 * TS往返不单独证明位流完整。生成方法为测试专用yj2EncodeLiterals。
 * 仅供FIRE blob writer专测，RLE/PNG预期在consumer中独立手列。
 */

/** 1 帧 sprite chunk：frame0 word 偏移=1 → byte 2；帧 2×2 =
 *  跳1透明 + 实心2（0xAA、palette-0 不透明）+ 跳1透明。 */
export const SPRITE_CHUNK_2X2 = [
  0x01,
  0x00, // frame0 word offset = 1
  0x02,
  0x00,
  0x02,
  0x00, // width 2, height 2
  0x81, // 跳 1（透明）
  0x02,
  0xaa,
  0x00, // 实心 2：0xAA、palette-0（opaque）
  0x81, // 跳 1（透明）
] as const

/** SPRITE_CHUNK_2X2 的 YJ2 压缩形态（uncompLen=11 LE + 全字面位流）。 */
export const YJ2_SPRITE_CHUNK_2X2 = Uint8Array.from([
  11, 0, 0, 0, 253, 251, 13, 232, 237, 233, 254, 239, 80, 116, 219, 253, 0, 126,
])
