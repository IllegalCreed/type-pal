/**
 * RNG.MKF 动画 → 帧 PNG(extractor 侧)。
 *
 * 解码核心(rngBlitDelta + sub-MKF + YJ2 + delta)已搬到 `@type-pal/shared` 的 `rng.ts`
 * (extractor 与 runtime 共用;资源管线优化:RNG 改存每 chunk 一个 gzip 原始 chunk,
 * runtime 解码,见 cli.ts / game rng-player.ts)。本文件只在共享解码结果上加 PNG 编码,
 * 供历史 / 测试用(cli 主流程已改走 gzip blob,不再逐帧写 PNG)。
 */
import { decodeRngFrames, RNG_HEIGHT, RNG_WIDTH, rngBlitDelta } from '@type-pal/shared'
import { encodeIndexedPng } from '../sprite.js'

// rngBlitDelta 经本文件 re-export,保持既有测试 `import { rngBlitDelta } from './rng-frames.js'`。
export { rngBlitDelta }

export interface RngFrame {
  index: number
  pngBytes: Uint8Array
}

export interface RngAnimResult {
  chunkIndex: number
  frameCount: number
  frames: RngFrame[]
}

/**
 * 解一个 RNG chunk → 帧 PNG 数组。= shared `decodeRngFrames`(出 320×200 下标平面)
 * 再逐帧 `encodeIndexedPng`(全 opaque)。
 */
export function decodeRngAnim(chunkIdx: number, chunkBuf: Uint8Array): RngAnimResult {
  const frames = decodeRngFrames(chunkBuf).map((f) => ({
    index: f.index,
    pngBytes: encodeIndexedPng(RNG_WIDTH, RNG_HEIGHT, f.pixels),
  }))
  return { chunkIndex: chunkIdx, frameCount: frames.length, frames }
}
