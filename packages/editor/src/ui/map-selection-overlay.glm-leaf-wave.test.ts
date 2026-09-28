// @vitest-environment jsdom
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest'
import type { MapSelection } from '../core/map-selection.js'
import { drawMapSelectionOverlay, mapSelectionBoundarySegments } from './map-selection-overlay.js'

function cellsSelection(
  gridPoints: readonly { row: number; col: number }[],
  visualSlots: readonly { layerId: string; row: number; col: number }[] = [],
): Extract<MapSelection, { kind: 'cells' }> {
  return {
    kind: 'cells',
    gridPoints: gridPoints.map((point) => ({ ...point })),
    visualSlots: visualSlots.map((point) => ({ ...point })),
    hitScope: 'active-layer',
  }
}

class PathRecorder {
  movePoints: unknown[][] = []
  linePoints: unknown[][] = []
  closePathCount = 0
  moveTo(...args: unknown[]): void {
    this.movePoints.push(args)
  }
  lineTo(...args: unknown[]): void {
    this.linePoints.push(args)
  }
  closePath(): void {
    this.closePathCount += 1
  }
}

beforeAll(() => {
  vi.stubGlobal('Path2D', PathRecorder)
})

afterAll(() => {
  vi.unstubAllGlobals()
})

function fakeContext(width = 320, height = 200) {
  const canvas = { width, height }
  const ctx = {
    canvas,
    save: vi.fn(),
    restore: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    lineJoin: '',
    lineCap: '',
  }
  return ctx as unknown as CanvasRenderingContext2D & {
    fill: ReturnType<typeof vi.fn>
    stroke: ReturnType<typeof vi.fn>
    strokeStyle: string
    fillStyle: string
  }
}

function drawnPaths(ctx: { fill: ReturnType<typeof vi.fn>; stroke: ReturnType<typeof vi.fn> }) {
  return [...ctx.fill.mock.calls, ...ctx.stroke.mock.calls].map(([path]) => path as PathRecorder)
}

function undirectedKey(edge: { from: { x: number; y: number }; to: { x: number; y: number } }): string {
  const left = `${edge.from.x}:${edge.from.y}`
  const right = `${edge.to.x}:${edge.to.y}`
  return left < right ? `${left}|${right}` : `${right}|${left}`
}

describe('mapSelectionBoundarySegments 剩余合同', () => {
  test('edge-adjacent diamonds cancel the shared edge on the staggered lattice', () => {
    const pair = [
      { row: 4, col: 5 },
      { row: 5, col: 5 },
    ]
    const segments = mapSelectionBoundarySegments(pair)
    // 两个菱形 8 条边，恰好共享 1 条 → 剩 6 条。
    expect(segments).toHaveLength(6)
    const lone = mapSelectionBoundarySegments([{ row: 4, col: 5 }])
    const segmentKeys = new Set(segments.map(undirectedKey))
    // 共享边完全消失；(4,5) 的其余 3 条边保留。
    expect(lone.filter((edge) => segmentKeys.has(undirectedKey(edge)))).toHaveLength(3)

    const center = { row: 5, col: 5 }
    const ring = [
      { row: 4, col: 5 },
      { row: 4, col: 6 },
      { row: 6, col: 5 },
      { row: 6, col: 6 },
    ]
    const ringSegments = mapSelectionBoundarySegments(ring)
    const filledSegments = mapSelectionBoundarySegments([...ring, center])
    const reference = mapSelectionBoundarySegments([center])
    const referenceKeys = new Set(reference.map(undirectedKey))
    // 实测：环 16 条 = 外轮廓 12 + 面向中心洞的 4 条；并入中心后 4 条洞边被共享抵消 → 12 条。
    expect(ringSegments).toHaveLength(16)
    const holeEdges = ringSegments.filter((segment) => referenceKeys.has(undirectedKey(segment)))
    expect(holeEdges).toHaveLength(4)
    expect(filledSegments).toHaveLength(12)
    expect(
      filledSegments.filter((segment) => referenceKeys.has(undirectedKey(segment))),
    ).toHaveLength(0)
  })

  test('duplicate points collapse to one diamond outline', () => {
    const segments = mapSelectionBoundarySegments([
      { row: 2, col: 3 },
      { row: 2, col: 3 },
    ])
    expect(segments).toHaveLength(4)
  })
})

describe('drawMapSelectionOverlay 剩余合同', () => {
  test('off-canvas points are culled from the fill while boundaries keep both cells', () => {
    const ctx = fakeContext(64, 32)
    drawMapSelectionOverlay(
      ctx,
      cellsSelection([
        { row: 0, col: 0 },
        { row: 0, col: 40 },
      ]),
      { zoom: 1, panX: 0, panY: 0 },
    )
    const paths = drawnPaths(ctx)
    expect(ctx.fill).toHaveBeenCalledTimes(1)
    expect(ctx.stroke).toHaveBeenCalledTimes(2)
    // (0,0) 菱形在画布内；(0,40) 中心 x=1280 被剔除，只画 1 个 moveTo。
    expect(paths[0]!.movePoints.length).toBe(1)
    // 边界路径包含远处格子的边（描边走完整并集，不做视口裁剪）。
    const boundary = paths[1]!
    expect(boundary.movePoints.length).toBe(8)
  })

  test('pan and zoom transform both fill diamonds and boundary strokes', () => {
    const ctx = fakeContext(640, 480)
    drawMapSelectionOverlay(ctx, cellsSelection([{ row: 2, col: 2 }]), {
      zoom: 2,
      panX: 32,
      panY: 8,
    })
    const paths = drawnPaths(ctx)
    const fillPath = paths[0]!
    const boundaryPath = paths[1]!
    // 中心 (64,16) → ((64-32)*2, (16-8)*2) = (64,16)；ry = 8*2 = 16。
    expect(fillPath.movePoints[0]).toEqual([64, 0])
    expect(fillPath.linePoints[0]).toEqual([96, 16])
    // 边界起点 = 菱形顶点 (64,8) → ((64-32)*2, (8-8)*2) = (64,0)。
    expect(boundaryPath.movePoints[0]).toEqual([64, 0])
  })

  test('each tone applies its documented fill and final stroke colors', () => {
    const tones = [
      ['selected', 'rgba(59,155,255,0.22)', '#77c8ff'],
      ['preview', 'rgba(87,224,166,0.18)', '#62e6ad'],
      ['conflict', 'rgba(255,72,78,0.23)', '#ff6870'],
      ['locked', 'rgba(255,196,95,0.16)', '#ffc45f'],
    ] as const
    for (const [tone, fill, inner] of tones) {
      const ctx = fakeContext()
      drawMapSelectionOverlay(
        ctx,
        cellsSelection([{ row: 1, col: 1 }]),
        { zoom: 1, panX: 0, panY: 0 },
        { tone },
      )
      expect(ctx.fillStyle).toBe(fill)
      expect(ctx.stroke).toHaveBeenCalledTimes(2)
      expect(ctx.strokeStyle).toBe(inner)
    }
  })

  test('non-cells selections draw nothing', () => {
    const ctx = fakeContext()
    drawMapSelectionOverlay(
      ctx,
      { kind: 'entities', entityIds: ['a'] } as unknown as MapSelection,
      { zoom: 1, panX: 0, panY: 0 },
    )
    expect(ctx.fill).not.toHaveBeenCalled()
    expect(ctx.stroke).not.toHaveBeenCalled()
  })

  test('visual slot duplicates of the same cell are drawn once', () => {
    const ctx = fakeContext(640, 480)
    drawMapSelectionOverlay(ctx, cellsSelection([{ row: 3, col: 3 }], [{ layerId: 'objects', row: 3, col: 3 }]), {
      zoom: 1,
      panX: 0,
      panY: 0,
    })
    const fillPath = drawnPaths(ctx)[0]!
    expect(fillPath.movePoints.length).toBe(1)
  })
})
