// @vitest-environment jsdom
import type { Palette, RleFrame } from '@type-pal/reforge'
import { bakeFrame, buildBlankProjectMap } from '@type-pal/reforge'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import type { StampPlacementPlan } from '../core/stamp-placement.js'
import { drawStampPlacementOverlay } from './stamp-placement-overlay.js'

vi.mock('@type-pal/reforge', async (importOriginal) => {
  const original = await importOriginal<typeof import('@type-pal/reforge')>()
  return {
    ...original,
    bakeFrame: vi.fn((frame: RleFrame) => {
      const canvas = document.createElement('canvas')
      canvas.dataset.width = String(frame.width)
      return canvas
    }),
  }
})

function frame(width: number, height = 16): RleFrame {
  return {
    width,
    height,
    pixels: new Uint8Array(width * height),
    opaque: new Uint8Array(width * height).fill(1),
  }
}

function palette(): Palette {
  return {
    colors: Array.from({ length: 256 }, () => [0, 0, 0] as [number, number, number]),
    cycles: [],
  }
}

function plan(patch: Partial<StampPlacementPlan> = {}): StampPlacementPlan {
  const map = buildBlankProjectMap(3, 2, 'tiles')
  return {
    mapId: 'map-a',
    baseMap: map,
    mapRevision: 3,
    template: {
      id: 'tree',
      name: '树',
      origin: 'authored',
      anchor: { row: 0, col: 0 },
      width: 1,
      height: 1,
      tilesetRefs: ['tiles'],
      layers: [{ id: 'ground', name: '地面', tiles: [[1], [null]], sources: [[0], [null]] }],
      collision: [[null], [null]],
    },
    anchor: { row: 0, col: 0 },
    placementBaseHeight: 0,
    mappings: [{ layerSlotId: 'ground', targetLayerId: 'floor' }],
    permission: {
      hiddenLayerIds: [],
      lockedLayerIds: [],
      requiredWritableLayerIds: ['floor'],
    },
    resolvedVisual: [],
    resolvedCollision: [],
    patch: { visual: [], collision: [] },
    placement: {
      id: 'tree-placement',
      anchor: { row: 0, col: 0 },
      visualSlots: [{ layerId: 'floor', row: 0, col: 0 }],
      gridPoints: [],
    },
    conflicts: [],
    issues: [],
    canApply: true,
    ...patch,
  }
}

function context(): {
  ctx: CanvasRenderingContext2D
  fills: string[]
  drawImage: ReturnType<typeof vi.fn>
} {
  const fills: string[] = []
  const drawImage = vi.fn()
  const value = {
    canvas: { width: 640, height: 480 },
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(function (this: { fillStyle: string }) {
      fills.push(this.fillStyle)
    }),
    stroke: vi.fn(),
    setLineDash: vi.fn(),
    drawImage,
    globalAlpha: 1,
    imageSmoothingEnabled: true,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
  }
  return { ctx: value as unknown as CanvasRenderingContext2D, fills, drawImage }
}

beforeEach(() => vi.clearAllMocks())

describe('stamp placement ghost overlay', () => {
  test('只消费 resolved 最终值，按目标层/格排序并缓存 baked frame', () => {
    const low = frame(32)
    const high = frame(48)
    const colors = palette()
    const placement = plan({
      resolvedVisual: [
        {
          layerSlotId: 'high',
          targetLayerId: 'objects',
          targetLayerIndex: 1,
          ref: { layerId: 'objects', row: 1, col: 0 },
          tileId: 2,
          tilesetId: 'tiles',
          relativeHeight: 2,
          height: 7,
        },
        {
          layerSlotId: 'ground',
          targetLayerId: 'floor',
          targetLayerIndex: 0,
          ref: { layerId: 'floor', row: 0, col: 0 },
          tileId: 1,
          tilesetId: 'tiles',
          relativeHeight: 0,
          height: 0,
        },
      ],
    })
    const before = structuredClone(placement)
    const first = context()
    drawStampPlacementOverlay(first.ctx, {
      plan: placement,
      tilesets: new Map([
        [
          'tiles',
          new Map([
            [1, low],
            [2, high],
          ]),
        ],
      ]),
      palette: colors,
      view: { zoom: 2, panX: 0, panY: 0 },
    })
    expect(vi.mocked(bakeFrame).mock.calls.map(([item]) => item)).toEqual([low, high])
    expect(first.drawImage.mock.calls.map(([image]) => image.dataset.width)).toEqual(['32', '48'])
    expect(first.drawImage.mock.calls[0]?.slice(1)).toEqual([-32, -16, 64, 32])

    const second = context()
    drawStampPlacementOverlay(second.ctx, {
      plan: placement,
      tilesets: new Map([
        [
          'tiles',
          new Map([
            [1, low],
            [2, high],
          ]),
        ],
      ]),
      palette: colors,
      view: { zoom: 1, panX: 0, panY: 0 },
    })
    expect(bakeFrame).toHaveBeenCalledTimes(2)
    expect(placement).toEqual(before)
  })

  test('collision 0、非零、普通冲突、issue 与 anchor 都有非颜色唯一的独立绘制步骤', () => {
    const overlay = plan({
      resolvedCollision: [
        { ref: { row: 0, col: 0 }, value: 0 },
        { ref: { row: 1, col: 0 }, value: 2 },
      ],
      conflicts: [
        {
          channel: 'visual',
          ref: { layerId: 'floor', row: 0, col: 0 },
          currentValue: 9,
          incomingValue: 1,
        },
      ],
      issues: [{ code: 'out-of-bounds', message: '越界', ref: { row: 3, col: 2 } }],
      canApply: false,
    })
    const { ctx, fills } = context()
    drawStampPlacementOverlay(ctx, {
      plan: overlay,
      tilesets: new Map(),
      palette: palette(),
      view: { zoom: 1, panX: 0, panY: 0 },
    })
    expect(fills).toContain('rgba(67, 151, 255, 0.16)')
    expect(fills).toContain('rgba(255, 137, 79, 0.24)')
    expect(fills).toContain('rgba(255, 76, 83, 0.24)')
    expect(fills).toContain('rgba(255, 54, 74, 0.18)')
    expect(fills.at(-1)).toBe('#ff5364')
    expect(vi.mocked(ctx.setLineDash)).not.toHaveBeenCalled()
  })
})
