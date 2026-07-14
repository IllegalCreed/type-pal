import type { Palette } from '@type-pal/shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { playRng, type RngFrameSnapshot } from './rng-player.js'

afterEach(() => {
  vi.unstubAllGlobals()
})

function installCanvasStub(): {
  appendChild: ReturnType<typeof vi.fn>
  putImageData: ReturnType<typeof vi.fn>
} {
  const appendChild = vi.fn()
  const putImageData = vi.fn()
  const context = {
    createImageData: (width: number, height: number) =>
      ({ width, height, data: new Uint8ClampedArray(width * height * 4) }) as ImageData,
    putImageData,
  }
  const canvas = {
    width: 0,
    height: 0,
    style: { cssText: '' },
    parentElement: null,
    getContext: () => context,
  }
  vi.stubGlobal('document', {
    body: { appendChild },
    createElement: () => canvas,
  })
  vi.stubGlobal('window', {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })
  return { appendChild, putImageData }
}

describe('playRng', () => {
  it('提供 onFrame 时逐帧交给引擎呈现栈，不创建独立 DOM overlay', async () => {
    const { appendChild, putImageData } = installCanvasStub()
    const colors = Array.from({ length: 256 }, () => [0, 0, 0] as [number, number, number])
    colors[1] = [17, 18, 19]
    colors[2] = [29, 30, 31]
    const palette: Palette = { colors, cycles: [] }
    const first = new Uint8Array(320 * 200).fill(1)
    const last = new Uint8Array(320 * 200).fill(2)
    const onFrame = vi.fn()

    const result = await playRng({
      chunkIdx: 9,
      palette,
      frameDelayMs: 0,
      onFrame,
      loadChunk: async () => ({
        frameCount: 2,
        framesByIndex: new Map([
          [0, first],
          [1, last],
        ]),
      }),
    })

    expect(onFrame).toHaveBeenCalledTimes(2)
    const emitted = onFrame.mock.calls[0]?.[0] as RngFrameSnapshot | undefined
    expect(emitted).toBeDefined()
    expect([...emitted!.rgba.slice(0, 4)]).toEqual([17, 18, 19, 255])
    expect([...result!.rgba.slice(0, 4)]).toEqual([29, 30, 31, 255])
    expect(appendChild).not.toHaveBeenCalled()
    expect(putImageData).not.toHaveBeenCalled()
  })
})
