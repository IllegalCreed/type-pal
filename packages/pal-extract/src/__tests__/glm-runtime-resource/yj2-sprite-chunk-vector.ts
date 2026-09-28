/**
 * TEST-GLM-RUNTIME-RESOURCE-2 / R03 fire.ts 压缩分支 fixture。
 *
 * 向量由 docs/testing/glm-runtime-resource-wave/tools/yj2-encode-derive.mjs 派生：
 * 明文 = 下面的 SPRITE_CHUNK_2X2（全字面 YJ2 编码，树规则与 shared/yj2.ts 同构），
 * 派生时已用真实 decompressYj2 核验往返一次。测试断言只依赖此处注释的明文语义
 * （帧数/尺寸/像素），不回读解压器输出；YJ2 位流层本身由 foundation 队列的
 * 手推向量独立覆盖（yj2.boundaries.test.ts）。
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
  11, 0, 0, 0, 253, 251, 13, 232, 237, 233, 254, 239, 80, 116, 219, 1,
])
