import type { Palette, RleFrame } from '@type-pal/shared'
import { afterEach, describe, expect, test, vi } from 'vitest'
import type { LoadedSprite } from '../assets.js'
import { ENEMY_SUMMON_COLOR_SHIFT } from './battle-anim.js'
import { renderBattleScene } from './present-battle.js'

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
  vi.stubGlobal('document', {
    createElement(tag: string) {
      expect(tag).toBe('canvas')
      const context = {
        createImageData: (width: number, height: number) => ({
          data: new Uint8ClampedArray(width * height * 4),
        }),
        putImageData: vi.fn(),
      }
      const canvas = {
        width: 0,
        height: 0,
        context,
        getContext: () => context,
      }
      return canvas
    },
  })
}

function context() {
  const alphaAtDraw: number[] = []
  const smoothingAtDraw: boolean[] = []
  const colorAtFill: string[] = []
  const saved: Array<{ globalAlpha: number; imageSmoothingEnabled: boolean; fillStyle: string }> =
    []
  const drawImage = vi.fn((..._args: unknown[]) => {
    alphaAtDraw.push(ctx.globalAlpha)
    smoothingAtDraw.push(ctx.imageSmoothingEnabled)
  })
  const fillRect = vi.fn((..._args: unknown[]) => colorAtFill.push(ctx.fillStyle))
  const save = vi.fn(() => {
    const { globalAlpha, imageSmoothingEnabled, fillStyle } = ctx
    saved.push({ globalAlpha, imageSmoothingEnabled, fillStyle })
  })
  const restore = vi.fn(() => {
    const state = saved.pop()
    if (state) Object.assign(ctx, state)
  })
  const ctx = {
    drawImage,
    fillRect,
    save,
    restore,
    scale: vi.fn(),
    imageSmoothingEnabled: true,
    fillStyle: '#2a5b4c',
    globalAlpha: 1,
  }
  return {
    ctx: ctx as unknown as CanvasRenderingContext2D,
    drawImage,
    alphaAtDraw,
    smoothingAtDraw,
    colorAtFill,
  }
}

afterEach(() => vi.unstubAllGlobals())

describe('战斗画面合成', () => {
  test('背景先绘制、未知帧回落首帧，空帧不画；实际底锚与 worldScale 保真', () => {
    installCanvasHost()
    const { ctx, drawImage, smoothingAtDraw } = context()
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
    expect(smoothingAtDraw).toEqual([false, false, false])
    expect(ctx.imageSmoothingEnabled).toBe(true)
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
    const { ctx, drawImage, alphaAtDraw, colorAtFill } = context()
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
    expect(colorAtFill).toEqual(['#000'])
    expect(ctx.fillStyle).toBe('#2a5b4c')
    expect(ctx.fillRect).toHaveBeenCalledExactlyOnceWith(0, 0, 320, 200)
    expect(drawImage.mock.calls.map((call) => [call[1], call[2]])).toEqual([
      [47, 56],
      [97, 116],
    ])
    expect(alphaAtDraw).toEqual([0.4, 1])
    expect(ctx.globalAlpha).toBe(1)
  })

  test('repaints tinted enemy arrivals in depth order above ordinary fighters', () => {
    installCanvasHost()
    const { ctx, drawImage } = context()
    renderBattleScene(
      ctx,
      {
        palette,
        enemies: [
          { sprite: sprite(14), x: 100, y: 100, frame: 0, colorShift: ENEMY_SUMMON_COLOR_SHIFT },
          { sprite: sprite(24), x: 102, y: 102, frame: 0, colorShift: 6 },
          { sprite: sprite(18), x: 104, y: 100, frame: 0, colorShift: ENEMY_SUMMON_COLOR_SHIFT },
        ],
        players: [
          { sprite: sprite(32), x: 106, y: 101, frame: 0, colorShift: ENEMY_SUMMON_COLOR_SHIFT },
        ],
        depthOverlays: [{ sprite: sprite(40), x: 100, y: 101, frame: 0, layerOffset: -3 }],
      },
      1,
    )
    expect(drawImage.mock.calls.map(([image]) => (image as HTMLCanvasElement).width)).toEqual([
      40, 18, 14, 32, 24, 18, 14,
    ])
  })
})
