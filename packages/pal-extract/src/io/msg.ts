import { decodeGbk } from '../utils/gbk.js'

/**
 * M.MSG is a flat GBK string region. The offset table (in SSS.MKF chunk 3) gives
 * each message's start byte. parseMessages slices it into string[].
 * 参考 sdlpal text.c。
 */
export function parseMessages(msg: Uint8Array, offsets: Uint32Array): string[] {
  const out: string[] = []
  for (let i = 0; i < offsets.length - 1; i++) {
    const start = offsets[i]!
    const end = offsets[i + 1]!
    out.push(decodeGbk(msg.subarray(start, end)))
  }
  return out
}
