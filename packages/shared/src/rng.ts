/**
 * RNG.MKF 动画解码:sub-MKF + YJ2 + RLE delta → 320×200 帧序列(palette 下标平面)。
 *
 * extractor 与 runtime 共用同一份(资源管线优化:RNG 从 92MB 逐帧 PNG 改为每 chunk
 * 一个 gzip 的原始 RNG chunk,runtime 解码)。
 *
 * sdlpal 真值锚:`reference/sdlpal/rngplay.c`
 *   - `PAL_RNGReadFrame`(rngplay.c:27-137):RNG chunk 是 sub-MKF,内层每条 sub-chunk
 *     是 YJ2 压缩的 RLE delta payload(单帧增量)
 *   - `PAL_RNGBlitToSurface`(rngplay.c:139-369):RLE opcode 0x00-0x13,基于上一帧
 *     surface 增量修改 → 当前帧
 */
import { chunkCount, openMkf, readChunk } from './mkf.js'
import { decompressYj2 } from './yj2.js'

export const RNG_WIDTH = 320
export const RNG_HEIGHT = 200

/**
 * RLE delta blit:把 YJ2-解压后的 payload 按 sdlpal `PAL_RNGBlitToSurface` opcode
 * 应用到 320×200 surface(in-place,跨 frame 复用,delta 累加)。
 *
 * opcode 真值(rngplay.c:185-364):
 *   0x00 / 0x13      → end frame
 *   0x02             → dst += 2(skip 2 bytes)
 *   0x03 + 1byte n   → dst += (n+1) * 2
 *   0x04 + 2byte w   → dst += (w+1) * 2
 *   0x06-0x0a        → 写 (op - 0x05) 个 2-byte literal pair
 *   0x0b + 1byte n   → 写 (n+1) 个 2-byte literal pair
 *   0x0c + 2byte w   → 写 (w+1) 个 2-byte literal pair
 *   0x0d-0x10        → 写同 2-byte 重复 (op - 0x0b) 次
 *   0x11 + 1byte n   → 写同 2-byte 重复 (n+1) 次
 *   0x12 + 2byte w   → 写同 2-byte 重复 (w+1) 次
 *
 * 0x01 / 0x05 sdlpal 真值无 case;遇 unknown opcode throw(ptr 错位会 cascade,早 fail 早定位)。
 */
export function rngBlitDelta(payload: Uint8Array, surface: Uint8Array): void {
  let ptr = 0
  let dst = 0
  const len = payload.length

  while (ptr < len) {
    const op = payload[ptr++]!
    switch (op) {
      case 0x00:
      case 0x13:
        return // end frame

      case 0x02:
        dst += 2
        break

      case 0x03: {
        const n = payload[ptr++]!
        dst += (n + 1) * 2
        break
      }

      case 0x04: {
        const w = payload[ptr]! | (payload[ptr + 1]! << 8)
        ptr += 2
        dst += (w + 1) * 2
        break
      }

      case 0x0a:
      case 0x09:
      case 0x08:
      case 0x07:
      case 0x06: {
        const repeats = op - 0x05 // 0x06=1, 0x07=2, 0x08=3, 0x09=4, 0x0a=5
        for (let r = 0; r < repeats; r++) {
          surface[dst++] = payload[ptr++]!
          surface[dst++] = payload[ptr++]!
        }
        break
      }

      case 0x0b: {
        const n = payload[ptr++]!
        for (let i = 0; i <= n; i++) {
          surface[dst++] = payload[ptr++]!
          surface[dst++] = payload[ptr++]!
        }
        break
      }

      case 0x0c: {
        const w = payload[ptr]! | (payload[ptr + 1]! << 8)
        ptr += 2
        for (let i = 0; i <= w; i++) {
          surface[dst++] = payload[ptr++]!
          surface[dst++] = payload[ptr++]!
        }
        break
      }

      case 0x0d:
      case 0x0e:
      case 0x0f:
      case 0x10: {
        const repeats = op - 0x0b // 0x0d=2, 0x0e=3, 0x0f=4, 0x10=5
        const a = payload[ptr]!
        const b = payload[ptr + 1]!
        for (let i = 0; i < repeats; i++) {
          surface[dst++] = a
          surface[dst++] = b
        }
        ptr += 2
        break
      }

      case 0x11: {
        const n = payload[ptr++]!
        const a = payload[ptr]!
        const b = payload[ptr + 1]!
        for (let i = 0; i <= n; i++) {
          surface[dst++] = a
          surface[dst++] = b
        }
        ptr += 2
        break
      }

      case 0x12: {
        const n = (payload[ptr]! | (payload[ptr + 1]! << 8)) + 1
        ptr += 2
        const a = payload[ptr]!
        const b = payload[ptr + 1]!
        for (let i = 0; i < n; i++) {
          surface[dst++] = a
          surface[dst++] = b
        }
        ptr += 2
        break
      }

      default:
        throw new Error(`RNG decode: unknown opcode 0x${op.toString(16)} at ptr=${ptr - 1}`)
    }
  }
}

/** 一帧解码结果:320×200 palette 下标平面(全 opaque)。 */
export interface RngFrame {
  /** sub-MKF 内的帧下标(= 原 per-frame PNG 的 frame index)。 */
  index: number
  /** 长度 = 320×200,palette 下标。RNG 帧无透明(全屏不透明),无 opaque mask。 */
  pixels: Uint8Array
}

/**
 * 解一个 RNG chunk(sub-MKF)→ 帧序列。
 * 注:RLE 是 delta,跨 frame 共享 surface(每帧基于上一帧);故每帧 `pixels` 是当帧
 * surface 的**拷贝**(surface 后续会被下一帧继续改写)。
 */
export function decodeRngFrames(chunkBuf: Uint8Array): RngFrame[] {
  if (chunkBuf.byteLength === 0) return []
  const subMkf = openMkf(chunkBuf)
  const totalFrames = chunkCount(subMkf)
  const surface = new Uint8Array(RNG_WIDTH * RNG_HEIGHT)
  const frames: RngFrame[] = []

  for (let i = 0; i < totalFrames; i++) {
    const subChunk = readChunk(subMkf, i)
    if (subChunk.byteLength === 0) continue
    let payload: Uint8Array
    try {
      payload = decompressYj2(subChunk)
    } catch {
      continue
    }
    rngBlitDelta(payload, surface)
    frames.push({ index: i, pixels: surface.slice() })
  }

  return frames
}
