import iconv from 'iconv-lite'

/**
 * GBK 字节流 → UTF-8 字符串。原版数据中的对话 / 物品名 / 人名都是 GBK。
 * 遇 0x00 截断 —— 与 sdlpal text.c 的 C 字符串语义一致。
 */
export function decodeGbk(bytes: Uint8Array): string {
  let end = bytes.indexOf(0)
  if (end < 0) end = bytes.length
  return iconv.decode(Buffer.from(bytes.buffer, bytes.byteOffset, end), 'gbk')
}
