/**
 * TEST-GLM-RUNTIME-RESOURCE-2 / R03 当前 FIRE blob writer 压缩分支 fixture。
 *
 * 明文见 SPRITE_CHUNK_2X2；字节由 glm-q/yj2-encoder.ts 的 literal-only 编码器派生，
 * 含真正 0xFFF 结束符。原历史 derive 工具不写结束符，其向量已撤回。
 * 本轮用有边界保护的 SDLPal 原生 YJ2_Decompress 核到 EOS 且输出11字节完全相等；
 * TS 解压器按声明长度提前结束，单独往返不能证明位流完整。
 * 此常量只供当前 FIRE blob writer 专测，RLE/像素预期独立手列。
 */

/** 1 帧 sprite chunk：frameCount=1（兼 frame0 word 偏移=1 → byte 2）；帧 2×2 =
 *  跳1透明 + 实心2（0xAA、palette-0 不透明）+ 跳1透明。 */
export const SPRITE_CHUNK_2X2 = [
  0x01,
  0x00, // frameCount = 1
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
