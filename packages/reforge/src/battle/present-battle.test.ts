import type { Palette, RleFrame } from '@type-pal/shared'
import { afterEach, describe, expect, test, vi } from 'vitest'
import type { LoadedSprite } from '../assets.js'
import { type BattleSpriteDraw, renderBattleScene } from './present-battle.js'

function sprite(marker: number): LoadedSprite {
  const frame: RleFrame = {
    width: marker,
    height: 1,
    pixels: new Uint8Array(marker).fill(1),
    opaque: new Uint8Array(marker).fill(1),
  }
  return { frames: [frame], anchorX: 0, anchorY: 0 }
}

function draw(marker: number, x: number, y: number): BattleSpriteDraw {
  return { sprite: sprite(marker), x, y, frame: 0 }
}

describe('renderBattleScene 战斗遮挡排序', () => {
  afterEach(() => vi.unstubAllGlobals())

  test('Y 升序；equal-Y 时敌我混排并按 X 降序', () => {
    // 一阶段真值：packages/game/src/present/battle/draw-battle-sprites.ts:392-393。
    vi.stubGlobal('document', {
      createElement: () => ({
        width: 0,
        height: 0,
        getContext: () => ({
          createImageData: (width: number, height: number) => ({
            data: new Uint8ClampedArray(width * height * 4),
          }),
          putImageData: () => undefined,
        }),
      }),
    })
    const order: number[] = []
    const context = {
      drawImage: (image: { width: number }) => order.push(image.width),
      fillRect: () => undefined,
      restore: () => undefined,
      save: () => undefined,
      scale: () => undefined,
    } as unknown as CanvasRenderingContext2D
    const palette: Palette = {
      colors: Array.from({ length: 256 }, () => [0, 0, 0]),
      cycles: [],
    }

    renderBattleScene(
      context,
      {
        palette,
        enemies: [draw(30, 100, 90), draw(10, 80, 100), draw(40, 100, 110)],
        players: [draw(20, 200, 100)],
      },
      1,
    )

    expect(order).toEqual([30, 20, 10, 40])
  })

  test('magic overlay 按 y + layerOffset 与敌我精灵统一排序，绘制仍使用原底锚', () => {
    vi.stubGlobal('document', {
      createElement: () => ({
        width: 0,
        height: 0,
        getContext: () => ({
          createImageData: (width: number, height: number) => ({
            data: new Uint8ClampedArray(width * height * 4),
          }),
          putImageData: () => undefined,
        }),
      }),
    })
    const order: number[] = []
    const positions: Array<[number, number]> = []
    const context = {
      drawImage: (image: { width: number }, x?: number, y?: number) => {
        order.push(image.width)
        positions.push([x ?? 0, y ?? 0])
      },
      fillRect: () => undefined,
      restore: () => undefined,
      save: () => undefined,
      scale: () => undefined,
    } as unknown as CanvasRenderingContext2D
    const palette: Palette = {
      colors: Array.from({ length: 256 }, () => [0, 0, 0]),
      cycles: [],
    }

    renderBattleScene(
      context,
      {
        palette,
        enemies: [draw(20, 100, 100)],
        players: [],
        depthOverlays: [
          { sprite: sprite(11), x: 100, y: 100, frame: 0, layerOffset: -50 },
          { sprite: sprite(13), x: 100, y: 100, frame: 0, layerOffset: 0 },
          { sprite: sprite(12), x: 100, y: 100, frame: 0, layerOffset: 99 },
        ],
      },
      1,
    )

    expect(order).toEqual([11, 13, 20, 12])
    // special 只影响排序，不改变 overlay 的实际底中锚。
    expect(positions[0]).toEqual([95, 99])
    expect(positions[3]).toEqual([94, 99])
  })
})
