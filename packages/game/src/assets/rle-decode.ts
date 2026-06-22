/**
 * 运行时 RLE 解码 re-export + base64 帮手。
 *
 * `decodeRle` / `parseSpriteChunk` / `RleFrame` 已**统一到 `@type-pal/shared`**:此前 game 这份
 * 多一段 `0x02000000` 单帧 file-header 前缀跳过、与 shared 分叉,现由 shared `decodeRle(buf,
 * { skipFilePrefix })` 参数覆盖(见 shared/rle.ts)。本文件改为 re-export 共享解码器,只保留
 * game 专用的 `base64ToBytes`(浏览器 atob)。
 *
 * 现役消费者:`dialog-assets.ts`(DATA.MKF chunk 12 对话图标 = base64ToBytes + parseSpriteChunk;
 * sprite-group 不带前缀,parseSpriteChunk 内部 decodeRle 不跳)。单帧整-chunk(RGM/BALL)运行时
 * 已走 PNG,不再经本模块;若将来要直解整 chunk 单帧,调 `decodeRle(chunk, { skipFilePrefix: true })`。
 */
export { type RleFrame, decodeRle, parseSpriteChunk } from '@type-pal/shared'

/** base64 string → Uint8Array(浏览器内 atob 模式,与 font.ts loadGlyphs 同型) */
export function base64ToBytes(b64: string): Uint8Array {
  if (b64.length === 0) return new Uint8Array(0)
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
}
