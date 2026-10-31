import type { Palette } from '@type-pal/shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { legalPalette } from '../__tests__/asset-fixtures.js'
import { realCanvasContext } from '../__tests__/canvas-host.js'
import { createFramebuffer } from '../present/framebuffer.js'
import {
  blackPalette,
  fetchSequentialFrame,
  fetchThreeFrameManifest,
  rngFrame,
  rngManifest,
} from './__tests__/rng-frames.js'
import { __setRngChunkLoaderForTest, playRng } from './rng-player.js'

afterEach(async () => {
  try {
    if (vi.isFakeTimers()) await vi.runAllTimersAsync()
  } finally {
    __setRngChunkLoaderForTest(null)
    vi.restoreAllMocks()
    vi.useRealTimers()
  }
})
describe('RNG shake on rendered frames', () => {
  it('shakeTime 随每显示帧递减(3 帧视频:65→62)', async () => {
    const fb = createFramebuffer()
    const shakeState = { shakeTime: 65, shakeLevel: 4 }
    await playRng({
      chunkIdx: 6,
      frameDelayMs: 0,
      fb,
      canvasCtx: realCanvasContext(),
      palette: blackPalette,
      fetchManifest: fetchThreeFrameManifest,
      fetchFrame: fetchSequentialFrame,
      shakeState,
    })
    expect(shakeState.shakeTime).toBe(62)
  })
  it('视频帧本身被震:偶 shakeTime 帧整幅下移 shakeLevel 行,顶部填黑', async () => {
    const fb = createFramebuffer()
    const shakeState = { shakeTime: 2, shakeLevel: 4 }
    await playRng({
      chunkIdx: 6,
      frameDelayMs: 0,
      fb,
      canvasCtx: realCanvasContext(),
      palette: blackPalette,
      startFrame: 0,
      endFrame: 0, // 单帧(frameIdx 0 → 填 1)
      fetchManifest: fetchThreeFrameManifest,
      fetchFrame: fetchSequentialFrame,
      shakeState,
    })
    // 偶帧分支(video.c dstrect.y=shakeLevel):内容下移 4 行,顶部 4 行黑(index 0)
    expect(fb.indices[0]).toBe(0)
    expect(fb.indices[3 * 320]).toBe(0)
    expect(fb.indices[4 * 320]).toBe(1)
    expect(shakeState.shakeTime).toBe(1)
  })
  it('shakeTime 中途耗尽 → 剩余帧不震不再递减(不下穿 0)', async () => {
    const fb = createFramebuffer()
    const shakeState = { shakeTime: 1, shakeLevel: 4 }
    await playRng({
      chunkIdx: 6,
      frameDelayMs: 0,
      fb,
      canvasCtx: realCanvasContext(),
      palette: blackPalette,
      fetchManifest: fetchThreeFrameManifest,
      fetchFrame: fetchSequentialFrame,
      shakeState,
    })
    expect(shakeState.shakeTime).toBe(0)
    // 末帧(frameIdx 2 → 填 3)无 shake 残留:第 0 行就是帧内容
    expect(fb.indices[0]).toBe(3)
  })
  it('跳过键提前结束 → 未显示帧的递减一次性结清(与完整播完一致)', async () => {
    vi.useFakeTimers()
    try {
      const fb = createFramebuffer()
      const shakeState = { shakeTime: 100, shakeLevel: 4 }
      const promise = playRng({
        chunkIdx: 6,
        frameDelayMs: 50,
        skipKeys: ['Space'],
        fb,
        canvasCtx: realCanvasContext(),
        palette: blackPalette,
        fetchManifest: fetchThreeFrameManifest,
        fetchFrame: fetchSequentialFrame,
        shakeState,
      })
      await vi.advanceTimersByTimeAsync(0)
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }))
      await vi.runAllTimersAsync()
      await promise
      expect(fb.indices[4 * 320]).toBe(1)
      expect(shakeState.shakeTime).toBe(97)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('RNG first-frame palette fade', () => {
  it('initialFadeInMs:第一帧先按黑 palette 显示,再恢复目标 palette', async () => {
    const fb = createFramebuffer()
    vi.useFakeTimers()
    const ctx = realCanvasContext()
    const putImageData = vi.spyOn(ctx, 'putImageData')
    const palette: Palette = {
      colors: Array.from({ length: 256 }, (): [number, number, number] => [0, 0, 0]),
      cycles: [],
    }
    palette.colors[1] = [180, 120, 60]

    const pending = playRng({
      chunkIdx: 6,
      frameDelayMs: 0,
      // Fake time controls the20ms ramp; real Canvas pixels verify intermediate and final colors.
      initialFadeInMs: 20,
      fb,
      canvasCtx: ctx,
      palette,
      startFrame: 0,
      endFrame: 0,
      fetchManifest: fetchThreeFrameManifest,
      fetchFrame: fetchSequentialFrame,
    })
    await vi.advanceTimersByTimeAsync(0)
    await vi.advanceTimersByTimeAsync(16)
    expect([...ctx.getImageData(0, 0, 1, 1).data]).toEqual([144, 96, 48, 255])
    await vi.runAllTimersAsync()
    await pending
    expect([...ctx.getImageData(0, 0, 1, 1).data]).toEqual([180, 120, 60, 255])

    const renderedColors = putImageData.mock.calls.map(([frame]) =>
      Array.from(frame.data.slice(0, 3)),
    )
    expect(renderedColors[0]).toEqual([0, 0, 0])
    expect(renderedColors.at(-1)).toEqual([180, 120, 60])
  })
})

describe('RNG zero-effect boundaries', () => {
  it('淡入时长 0 把索引 3 写成调色板 RGB', async () => {
    const fb = createFramebuffer()
    const ctx = realCanvasContext()
    await playRng({
      chunkIdx: 6,
      frameDelayMs: 0,
      initialFadeInMs: 0,
      fb,
      canvasCtx: ctx,
      palette: legalPalette(),
      fetchManifest: async () => rngManifest(1),
      fetchFrame: async () => rngFrame(3),
    })
    expect(Array.from(ctx.getImageData(0, 0, 1, 1).data)).toEqual([3, 20, 40, 255])
    expect(fb.indices[0]).toBe(3)
  })
  it('shakeTime 为 0 时首帧不填黑且计数保持 0', async () => {
    const fb = createFramebuffer()
    const shakeState = { shakeTime: 0, shakeLevel: 4 }
    await playRng({
      chunkIdx: 6,
      frameDelayMs: 0,
      fb,
      canvasCtx: realCanvasContext(),
      palette: legalPalette(),
      fetchManifest: async () => rngManifest(1),
      fetchFrame: async () => rngFrame(5),
      shakeState,
    })
    expect(fb.indices[0]).toBe(5)
    expect(shakeState.shakeTime).toBe(0)
  })
})
