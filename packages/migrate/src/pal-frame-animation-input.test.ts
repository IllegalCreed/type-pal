import { gzipSync } from 'node:zlib'
import { describe, expect, test } from 'vitest'
import { json, put, tempRepo } from './__tests__/pal-asset-fixtures.js'
import { loadPalAssets } from './pal-assets.js'

const EXTRACTED = 'data/extracted'

/** 空 sub-MKF 动画块（1 个 0 字节 sub-chunk）：decodeRngFrames → 0 帧。 */
function emptyRngBlob(): Uint8Array {
  const subMkf = new Uint8Array(8)
  new DataView(subMkf.buffer).setUint32(0, 8, true)
  new DataView(subMkf.buffer).setUint32(4, 8, true)
  return gzipSync(subMkf)
}

/** frameAnimations 阶段关系闭包自洽输入（12 段 × frameCount 0 + 4 块 legacy 调色板）。 */
function buildFrameAnimationsTree(repo: string): void {
  json(repo, `${EXTRACTED}/data/rng-frames.json`, {
    chunks: Array.from({ length: 12 }, (_, index) => ({
      chunkIndex: index,
      frameCount: 0,
      frames: [],
    })),
  })
  for (const palette of [0, 2, 3, 6])
    json(repo, `${EXTRACTED}/data/palette/${palette}.json`, {
      colors: Array.from({ length: 256 }, () => [0, 0, 0]),
    })
  const blob = emptyRngBlob()
  for (let index = 0; index < 12; index++)
    put(repo, `${EXTRACTED}/data/animation/rng-${String(index).padStart(2, '0')}.rle`, blob)
}

// The loader reads the soundfont and video containers as opaque bytes before decoding animations.
function buildPreFrameAnimationsTree(repo: string): void {
  put(repo, 'packages/reforge/public/soundfont.sf3', new Uint8Array([0x53, 0x46]))
  for (let video = 1; video <= 6; video++)
    put(repo, `${EXTRACTED}/videos/${video}.mp4`, new Uint8Array([0x00]))
  buildFrameAnimationsTree(repo)
}

describe('PAL frame-animation input through the full asset loader', () => {
  test('RNG manifest 段数≠12 精确拒绝', () => {
    const repo = tempRepo()
    buildPreFrameAnimationsTree(repo)
    json(repo, `${EXTRACTED}/data/rng-frames.json`, {
      chunks: [{ chunkIndex: 0, frameCount: 0, frames: [] }],
    })
    expect(() => loadPalAssets(repo, [], [])).toThrow('PAL RNG manifest 期望 12 段，收到 1')
  })

  test('RNG manifest 段号不连续精确拒绝', () => {
    const repo = tempRepo()
    buildPreFrameAnimationsTree(repo)
    json(repo, `${EXTRACTED}/data/rng-frames.json`, {
      chunks: Array.from({ length: 12 }, (_, index) => ({
        chunkIndex: index === 0 ? 7 : index, // 首段即不符：守卫先于任何 blob 解码
        frameCount: 0,
        frames: [],
      })),
    })
    expect(() => loadPalAssets(repo, [], [])).toThrow('PAL RNG manifest 段号不连续，期望 0，实际 7')
  })

  test('RNG manifest 帧数与帧清单长度不符精确拒绝', () => {
    const repo = tempRepo()
    buildPreFrameAnimationsTree(repo)
    json(repo, `${EXTRACTED}/data/rng-frames.json`, {
      chunks: Array.from({ length: 12 }, (_, index) => ({
        chunkIndex: index,
        frameCount: index === 0 ? 2 : 0,
        frames: index === 0 ? [{ index: 0 }] : [],
      })),
    })
    expect(() => loadPalAssets(repo, [], [])).toThrow('PAL RNG 0: manifest 帧清单不连续')
  })

  test('RNG manifest 帧下标不连续精确拒绝', () => {
    const repo = tempRepo()
    buildPreFrameAnimationsTree(repo)
    json(repo, `${EXTRACTED}/data/rng-frames.json`, {
      chunks: Array.from({ length: 12 }, (_, index) => ({
        chunkIndex: index,
        frameCount: index === 0 ? 1 : 0,
        frames: index === 0 ? [{ index: 5 }] : [],
      })),
    })
    expect(() => loadPalAssets(repo, [], [])).toThrow('PAL RNG 0: manifest 帧清单不连续')
  })

  test('RNG 解码 0 帧 ≠ 登记 1 帧精确拒绝', () => {
    const repo = tempRepo()
    buildPreFrameAnimationsTree(repo)
    json(repo, `${EXTRACTED}/data/rng-frames.json`, {
      chunks: Array.from({ length: 12 }, (_, index) => ({
        chunkIndex: index,
        frameCount: 1,
        frames: [{ index: 0 }],
      })),
    })
    expect(() => loadPalAssets(repo, [], [])).toThrow('PAL RNG 000: 解码 0 帧，manifest 登记 1')
  })
})
