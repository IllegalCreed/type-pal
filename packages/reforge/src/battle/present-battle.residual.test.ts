import type { Palette, RleFrame } from '@type-pal/shared'
import { afterEach, describe, expect, test, vi } from 'vitest'
import type { LoadedSprite } from '../assets.js'
import { drawDissolved, renderBattleScene } from './present-battle.js'

const palette: Palette = {
  colors: Array.from({ length: 256 }, () => [0, 0, 0] as [number, number, number]),
  cycles: [],
}

function sprite(width = 6, height = 4): LoadedSprite {
  const frame: RleFrame = {
    width,
    height,
    pixels: new Uint8Array(width * height).fill(1),
    opaque: new Uint8Array(width * height).fill(1),
  }
  return { frames: [frame], anchorX: 0, anchorY: 0 }
}

function installCanvasHost() {
  const created: Array<{
    width: number
    height: number
    context: {
      fillRect: ReturnType<typeof vi.fn>
      clearRect: ReturnType<typeof vi.fn>
      drawImage: ReturnType<typeof vi.fn>
      globalAlpha: number
    }
  }> = []
  vi.stubGlobal('document', {
    createElement(tag: string) {
      expect(tag).toBe('canvas')
      const context = {
        createImageData: (width: number, height: number) => ({
          data: new Uint8ClampedArray(width * height * 4),
        }),
        putImageData: vi.fn(),
        fillRect: vi.fn(),
        clearRect: vi.fn(),
        drawImage: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        globalAlpha: 1,
        globalCompositeOperation: 'source-over',
        fillStyle: '',
      }
      const canvas = {
        width: 0,
        height: 0,
        context,
        getContext: () => context,
      }
      created.push(canvas)
      return canvas
    },
  })
  return created
}

function context() {
  const alphaAtDraw: number[] = []
  const alphaStack: number[] = []
  const drawImage = vi.fn((..._args: unknown[]) => alphaAtDraw.push(ctx.globalAlpha))
  const save = vi.fn(() => alphaStack.push(ctx.globalAlpha))
  const restore = vi.fn(() => {
    ctx.globalAlpha = alphaStack.pop() ?? 1
  })
  const ctx = {
    drawImage,
    fillRect: vi.fn(),
    save,
    restore,
    scale: vi.fn(),
    imageSmoothingEnabled: true,
    fillStyle: '',
    globalAlpha: 1,
  } as unknown as CanvasRenderingContext2D
  return { ctx, drawImage, alphaAtDraw }
}

afterEach(() => vi.unstubAllGlobals())

describe('当前战斗画面未覆盖的呈现边界', () => {
  test('背景先绘制、未知帧回落首帧，空帧不画；实际底锚与 worldScale 保真', () => {
    installCanvasHost()
    const { ctx, drawImage } = context()
    const bg = { width: 320, height: 200 } as CanvasImageSource
    const actor = sprite(6, 4)
    const empty: LoadedSprite = { frames: [], anchorX: 0, anchorY: 0 }
    renderBattleScene(
      ctx,
      {
        bg,
        palette,
        enemies: [
          { sprite: actor, x: 100, y: 80, frame: 99 },
          { sprite: empty, x: 80, y: 70, frame: 0 },
        ],
        players: [],
        depthOverlays: [{ sprite: actor, x: 50, y: 60, frame: 99, layerOffset: 0 }],
      },
      2,
    )
    expect(ctx.imageSmoothingEnabled).toBe(false)
    expect(ctx.scale).toHaveBeenCalledExactlyOnceWith(2, 2)
    expect(drawImage.mock.calls.map((call) => [call[1], call[2]])).toEqual([
      [0, 0],
      [47, 56],
      [97, 76],
    ])
    expect(drawImage.mock.calls[0]).toEqual([bg, 0, 0, 320, 200])
    expect(ctx.fillRect).not.toHaveBeenCalled()
  })

  test('无背景画黑底，半透明单位局部降低 alpha 后恢复，不污染下一个单位', () => {
    installCanvasHost()
    const { ctx, drawImage, alphaAtDraw } = context()
    const actor = sprite()
    renderBattleScene(
      ctx,
      {
        palette,
        enemies: [{ sprite: actor, x: 50, y: 60, frame: 0, alpha: 0.4 }],
        players: [{ sprite: actor, x: 100, y: 120, frame: 0 }],
      },
      1,
    )
    expect(ctx.fillStyle).toBe('#000')
    expect(ctx.fillRect).toHaveBeenCalledExactlyOnceWith(0, 0, 320, 200)
    expect(drawImage.mock.calls.map((call) => [call[1], call[2]])).toEqual([
      [47, 56],
      [97, 116],
    ])
    expect(alphaAtDraw).toEqual([0.4, 1])
    expect(ctx.save).toHaveBeenCalledTimes(2)
    expect(ctx.restore).toHaveBeenCalledTimes(2)
    expect(ctx.globalAlpha).toBe(1)
  })

  test('pattern 不可用时溶解退化为透明度，并把越界进度钳在 0..1', () => {
    const created = installCanvasHost()
    const { ctx, drawImage, alphaAtDraw } = context()
    const patternless = ctx as CanvasRenderingContext2D & {
      createPattern: ReturnType<typeof vi.fn>
    }
    patternless.createPattern = vi.fn(() => null)
    const frame = { width: 6, height: 4 } as HTMLCanvasElement
    drawDissolved(ctx, frame, 27, 31, 1.5)
    expect(alphaAtDraw).toEqual([0])
    expect(ctx.globalAlpha).toBe(1)
    expect(drawImage).toHaveBeenCalledExactlyOnceWith(frame, 27, 31)
    expect(created).toHaveLength(1)
    drawImage.mockClear()
    alphaAtDraw.length = 0
    drawDissolved(ctx, frame, 27, 31, -0.5)
    expect(alphaAtDraw).toEqual([1])
    expect(ctx.globalAlpha).toBe(1)
    expect(drawImage).toHaveBeenCalledExactlyOnceWith(frame, 27, 31)
    expect(created).toHaveLength(2)
  })

  test('可用 pattern 以相位批次消融，波内余量作用于同一离屏画布', () => {
    const created = installCanvasHost()
    const { ctx, drawImage } = context()
    const patterned = ctx as CanvasRenderingContext2D & {
      createPattern: ReturnType<typeof vi.fn>
    }
    patterned.createPattern = vi.fn((tile: object) => ({ tile, setTransform: vi.fn() }))
    const frame = { width: 6, height: 4 } as HTMLCanvasElement
    drawDissolved(ctx, frame, 17, 19, 0.25)
    expect(patterned.createPattern).toHaveBeenCalledTimes(6)
    expect(created).toHaveLength(7)
    const scratch = created[6]!
    expect([scratch.width, scratch.height]).toEqual([6, 4])
    expect(scratch.context.clearRect).toHaveBeenCalledExactlyOnceWith(0, 0, 6, 4)
    expect(scratch.context.drawImage).toHaveBeenCalledExactlyOnceWith(frame, 0, 0)
    expect(scratch.context.fillRect).toHaveBeenCalledTimes(2)
    expect(scratch.context.globalAlpha).toBe(0.5)
    expect(drawImage).toHaveBeenCalledExactlyOnceWith(scratch, 0, 0, 6, 4, 17, 19, 6, 4)
  })
})
