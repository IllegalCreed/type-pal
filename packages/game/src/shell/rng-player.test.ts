import { afterEach, describe, expect, it, vi } from 'vitest'
import type { IndexedImage } from '../assets/png.js'
import { createFramebuffer } from '../present/framebuffer.js'
import { __setRngChunkLoaderForTest, playRng } from './rng-player.js'

const MOCK_MANIFEST = {
  chunks: [{ chunkIndex: 6, frameCount: 3, frames: [{ index: 0 }, { index: 1 }, { index: 2 }] }],
}

function mockManifestOk(): () => Promise<typeof MOCK_MANIFEST> {
  return async () => MOCK_MANIFEST
}

/** 每帧 indices 全填 (frameIdx+1) — 验最后一帧 fb 是哪个 frame。 */
function mockFrameFiller(): (chunkIdx: number, frameIdx: number) => Promise<IndexedImage> {
  return async (_chunkIdx, frameIdx) => ({
    width: 320,
    height: 200,
    indices: new Uint8Array(320 * 200).fill(frameIdx + 1),
    opaque: new Uint8Array(320 * 200).fill(1),
  })
}

const mockPalette = {
  colors: Array.from({ length: 256 }, () => [0, 0, 0] as [number, number, number]),
  cycles: [],
} as unknown as import('@type-pal/shared').Palette
const mockCanvasCtx = {
  putImageData: vi.fn(),
} as unknown as CanvasRenderingContext2D

afterEach(() => {
  vi.restoreAllMocks()
  __setRngChunkLoaderForTest(null) // 复原默认 loader + 清 chunk 缓存
})

describe('playRng — sdlpal PAL_RNGPlay 等价 (M5.6 T18 Step 4)', () => {
  it('全部帧播完 → fb.indices = 末帧填充', async () => {
    const fb = createFramebuffer()
    await playRng({
      chunkIdx: 6,
      frameDelayMs: 1,
      fb,
      canvasCtx: mockCanvasCtx,
      palette: mockPalette,
      fetchManifest: mockManifestOk(),
      fetchFrame: mockFrameFiller(),
    })
    // 末帧 frameIdx=2 → indices 全填 3
    expect(fb.indices[0]).toBe(3)
    expect(fb.indices[100 * 320 + 100]).toBe(3)
  })

  it('Space 按键跳过 → 不到末帧停', async () => {
    const fb = createFramebuffer()
    const promise = playRng({
      chunkIdx: 6,
      frameDelayMs: 50,
      fb,
      canvasCtx: mockCanvasCtx,
      palette: mockPalette,
      fetchManifest: mockManifestOk(),
      fetchFrame: mockFrameFiller(),
    })
    await new Promise((r) => setTimeout(r, 60))
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }))
    await promise
    // fb 是某中间帧(不一定是末帧)
    expect(fb.indices[0]).toBeGreaterThanOrEqual(1)
    expect(fb.indices[0]).toBeLessThanOrEqual(3)
  })

  it('manifest 缺该 chunk → 警告 + return,不抛', async () => {
    const fb = createFramebuffer()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await playRng({
      chunkIdx: 999,
      frameDelayMs: 1,
      fb,
      canvasCtx: mockCanvasCtx,
      palette: mockPalette,
      fetchManifest: mockManifestOk(),
      fetchFrame: mockFrameFiller(),
    })
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('999 不在 manifest'))
    expect(fb.indices.every((v) => v === 0)).toBe(true)
  })

  it('startFrame > endFrame → 立即 return 不播', async () => {
    const fb = createFramebuffer()
    await playRng({
      chunkIdx: 6,
      frameDelayMs: 1,
      fb,
      canvasCtx: mockCanvasCtx,
      palette: mockPalette,
      startFrame: 5,
      endFrame: 1,
      fetchManifest: mockManifestOk(),
      fetchFrame: mockFrameFiller(),
    })
    expect(fb.indices.every((v) => v === 0)).toBe(true)
  })

  it('endFrame=-1 → 默认播到 frameCount-1', async () => {
    const fb = createFramebuffer()
    await playRng({
      chunkIdx: 6,
      frameDelayMs: 1,
      fb,
      canvasCtx: mockCanvasCtx,
      palette: mockPalette,
      endFrame: -1,
      fetchManifest: mockManifestOk(),
      fetchFrame: mockFrameFiller(),
    })
    expect(fb.indices[0]).toBe(3)
  })

  it('manifest fetch throw → 警告 + return,不抛', async () => {
    const fb = createFramebuffer()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await playRng({
      chunkIdx: 6,
      frameDelayMs: 1,
      fb,
      canvasCtx: mockCanvasCtx,
      palette: mockPalette,
      fetchManifest: async () => {
        throw new Error('mock fail')
      },
      fetchFrame: mockFrameFiller(),
    })
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('manifest fetch failed'),
      expect.any(Error),
    )
    expect(fb.indices.every((v) => v === 0)).toBe(true)
  })

  it('单帧 fetch throw → warn + skip 该帧 + 继续', async () => {
    const fb = createFramebuffer()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await playRng({
      chunkIdx: 6,
      frameDelayMs: 1,
      fb,
      canvasCtx: mockCanvasCtx,
      palette: mockPalette,
      fetchManifest: mockManifestOk(),
      fetchFrame: async (_, frameIdx) => {
        if (frameIdx === 1) throw new Error('mock frame 1 fail')
        return {
          width: 320,
          height: 200,
          indices: new Uint8Array(320 * 200).fill(frameIdx + 1),
          opaque: new Uint8Array(320 * 200).fill(1),
        }
      },
    })
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('frame 1 fetch fail'),
      expect.any(Error),
    )
    // 末帧 frameIdx=2 仍画到 fb
    expect(fb.indices[0]).toBe(3)
  })

  // sdlpal rngplay.c:436:每帧 PAL_RNGBlitToSurface 后 VIDEO_UpdateScreen(NULL)(video.c:571-616)——
  // shake 进行中对视频帧本身施加垂直跳动 + g_wShakeTime--。漏接 → 0x35 震屏计数在 RNG 播放期间冻结,
  // 整段泄漏进下一场景(僵尸王→血池演出全程狂抖,2026-06-10)。
  describe('shakeState 透传(VIDEO_UpdateScreen shake 分支)', () => {
    it('shakeTime 随每显示帧递减(3 帧视频:65→62)', async () => {
      const fb = createFramebuffer()
      const shakeState = { shakeTime: 65, shakeLevel: 4 }
      await playRng({
        chunkIdx: 6,
        frameDelayMs: 0,
        fb,
        canvasCtx: mockCanvasCtx,
        palette: mockPalette,
        fetchManifest: mockManifestOk(),
        fetchFrame: mockFrameFiller(),
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
        canvasCtx: mockCanvasCtx,
        palette: mockPalette,
        startFrame: 0,
        endFrame: 0, // 单帧(frameIdx 0 → 填 1)
        fetchManifest: mockManifestOk(),
        fetchFrame: mockFrameFiller(),
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
        canvasCtx: mockCanvasCtx,
        palette: mockPalette,
        fetchManifest: mockManifestOk(),
        fetchFrame: mockFrameFiller(),
        shakeState,
      })
      expect(shakeState.shakeTime).toBe(0)
      // 末帧(frameIdx 2 → 填 3)无 shake 残留:第 0 行就是帧内容
      expect(fb.indices[0]).toBe(3)
    })

    it('跳过键提前结束 → 未显示帧的递减一次性结清(与完整播完一致)', async () => {
      const fb = createFramebuffer()
      const shakeState = { shakeTime: 100, shakeLevel: 4 }
      const promise = playRng({
        chunkIdx: 6,
        frameDelayMs: 50,
        fb,
        canvasCtx: mockCanvasCtx,
        palette: mockPalette,
        fetchManifest: mockManifestOk(),
        fetchFrame: mockFrameFiller(),
        shakeState,
      })
      await new Promise((r) => setTimeout(r, 60))
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }))
      await promise
      // 无论实际显示几帧,显示帧逐帧递减 + 跳过结清剩余 = 总递减恒为全片 3 帧
      expect(shakeState.shakeTime).toBe(97)
    })

    it('不传 shakeState → 行为不变', async () => {
      const fb = createFramebuffer()
      await playRng({
        chunkIdx: 6,
        frameDelayMs: 0,
        fb,
        canvasCtx: mockCanvasCtx,
        palette: mockPalette,
        fetchManifest: mockManifestOk(),
        fetchFrame: mockFrameFiller(),
      })
      expect(fb.indices[0]).toBe(3)
    })
  })

  it('initialFadeInMs:第一帧先按黑 palette 显示,再恢复目标 palette', async () => {
    const fb = createFramebuffer()
    const putImageData = vi.fn()
    const ctx = { putImageData } as unknown as CanvasRenderingContext2D
    const palette = {
      colors: Array.from({ length: 256 }, () => [0, 0, 0] as [number, number, number]),
      cycles: [],
    } as unknown as import('@type-pal/shared').Palette
    palette.colors[1] = [180, 120, 60]

    await playRng({
      chunkIdx: 6,
      frameDelayMs: 0,
      initialFadeInMs: 1,
      fb,
      canvasCtx: ctx,
      palette,
      startFrame: 0,
      endFrame: 0,
      fetchManifest: mockManifestOk(),
      fetchFrame: mockFrameFiller(),
    })

    const first = putImageData.mock.calls[0]?.[0] as ImageData
    const last = putImageData.mock.calls.at(-1)?.[0] as ImageData
    expect(Array.from(first.data.slice(0, 3))).toEqual([0, 0, 0])
    expect(Array.from(last.data.slice(0, 3))).toEqual([180, 120, 60])
  })

  // 资源管线优化(2026-06-22)后,playRng 用 `Promise.all(frames.map(fetchFrame))` 并发取帧,默认
  //   fetchFrame → loadRngChunk(chunkIdx)。loadRngChunk 旧实现 cache.set 在 await 之后 → 同一 chunk 的
  //   N 个并发取帧全部 cache-miss,重复 fetch+decompressGzip+decodeRngFrames **整个 chunk** N 次 = O(N²)。
  //   山神庙酒剑仙(chunk 帧多)实测 5 秒黑屏。修复:loadRngChunk 缓存 in-flight Promise,并发复用。
  it('单次 playRng:同一 chunk 的 N 帧并发只触发一次底层加载(防 O(N²) stampede)', async () => {
    let loadCount = 0
    __setRngChunkLoaderForTest(async () => {
      loadCount++
      await new Promise((r) => setTimeout(r, 5)) // 放大并发窗口,确保 N 帧在首个加载未完成时都进来
      const map = new Map<number, IndexedImage>()
      for (let i = 0; i < 3; i++) {
        map.set(i, {
          width: 320,
          height: 200,
          indices: new Uint8Array(320 * 200).fill(i + 1),
          opaque: new Uint8Array(320 * 200).fill(1),
        })
      }
      return map
    })
    const fb = createFramebuffer()
    // 不注入 fetchFrame → 走默认 defaultFetchFrame → loadRngChunk → 注入的 loader
    await playRng({
      chunkIdx: 6, // MOCK_MANIFEST chunk 6 = 3 帧 → Promise.all 并发 3 次取帧
      frameDelayMs: 0,
      fb,
      canvasCtx: mockCanvasCtx,
      palette: mockPalette,
      fetchManifest: mockManifestOk(),
    })
    expect(loadCount).toBe(1) // 修复前:3(每帧 cache-miss);修复后:1
  })
})
