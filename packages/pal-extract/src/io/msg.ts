import { decodeGbk } from '../utils/gbk.js'

/**
 * M.MSG is a flat GBK string region. The offset table (in SSS.MKF chunk 3) gives
 * each message's start byte. parseMessages slices it into string[].
 * 参考 sdlpal text.c。
 */
export function parseMessages(msg: Uint8Array, offsets: Uint32Array): string[] {
  for (let i = 0; i < offsets.length; i++) {
    const offset = offsets[i]!
    if (offset > msg.byteLength) {
      throw new Error(
        `parseMessages: offset[${i}] ${offset} exceeds message buffer ${msg.byteLength}`,
      )
    }
    if (i > 0 && offset < offsets[i - 1]!) {
      throw new Error(
        `parseMessages: offset[${i}] ${offset} precedes offset[${i - 1}] ${offsets[i - 1]!}`,
      )
    }
  }

  const out: string[] = []
  for (let i = 0; i < offsets.length - 1; i++) {
    const start = offsets[i]!
    const end = offsets[i + 1]!
    out.push(decodeGbk(msg.subarray(start, end)))
  }
  return out
}
