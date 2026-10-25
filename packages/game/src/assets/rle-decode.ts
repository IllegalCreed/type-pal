/**
 * 对话图标的 base64 传输适配与共享 sprite-group 解码入口。
 * dialog-assets.ts 读取 DATA.MKF chunk 12；容器内的帧不跳单帧文件前缀。
 * 解码算法与类型由 @type-pal/shared 维护，本模块不另建 codec。
 */
export { parsePalSpriteChunk as parseSpriteChunk } from '@type-pal/shared'

/** base64 string → Uint8Array(浏览器内 atob 模式,与 font.ts loadGlyphs 同型) */
export function base64ToBytes(b64: string): Uint8Array {
  if (b64.length === 0) return new Uint8Array(0)
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
}
