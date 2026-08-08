import type { Palette, RleFrame } from '@type-pal/shared'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  buildBlankProjectMap,
  buildProjectMapLayer,
  insertProjectMapLayer,
  paintProjectMapTiles,
} from './project-map.js'
import { Canvas2DRenderer, type SpriteDraw } from './render.js'

function frame(width: number, height: number): RleFrame {
  return {
    width,
    height,
    pixels: new Uint8Array(width * height).fill(1),
    opaque: new Uint8Array(width * height).fill(1),
  }
}

describe('Canvas2DRenderer cover layer', () => {
  beforeEach(() => {
    vi.stubGlobal('document', {
      createElement: () => {
        const canvas = {
          width: 0,
          height: 0,
          getContext: () => ({
            createImageData: (width: number, height: number) => ({
              data: new Uint8ClampedArray(width * height * 4),
            }),
            putImageData: () => undefined,
          }),
        }
        return canvas
      },
    })
  })

  afterEach(() => vi.unstubAllGlobals())

  test('sLayer=6 把同一高物排到人物之前，layer=0 对照会盖住人物', () => {
    let map = buildBlankProjectMap(3, 3, 'tileset-test')
    map = insertProjectMapLayer(map, buildProjectMapLayer(map, 'cover', '高物'))
    map = paintProjectMapTiles(map, [{ layerId: 'cover', col: 0, row: 3, tileId: 7, height: 2 }])

    const drawOrder: number[] = []
    const ctx = {
      canvas: { width: 320, height: 200 },
      drawImage: (image: { width: number }) => drawOrder.push(image.width),
      fillRect: () => undefined,
      restore: () => undefined,
      save: () => undefined,
    } as unknown as CanvasRenderingContext2D
    const palette: Palette = {
      colors: Array.from({ length: 256 }, () => [0, 0, 0]),
      cycles: [],
    }
    const renderer = new Canvas2DRenderer(ctx, palette, new Map([[7, frame(32, 16)]]))
    const sprite: SpriteDraw = {
      frame: frame(10, 10),
      worldX: 32,
      worldY: 32,
      anchorX: 5,
      anchorY: 10,
    }
    const view = { col: 0, row: 0, cols: 3, rows: 3 }
    const camera = { x: 0, y: 0 }

    renderer.renderScene(map, view, camera, [sprite])
    expect(drawOrder.slice(-2)).toEqual([10, 32])

    drawOrder.length = 0
    renderer.renderScene(map, view, camera, [
      {
        ...sprite,
        baseYBias: 6,
        coverILayer: 6 * 8 + 2,
        coverSortOffset: 6 * 8 + 9,
      },
    ])
    expect(drawOrder.slice(-2)).toEqual([32, 10])

    drawOrder.length = 0
    renderer.renderScene(map, view, camera, [
      {
        ...sprite,
        baseYBias: 6,
        sortOffset: 10,
        coverILayer: 6 * 8 + 6,
        coverSortOffset: 6 * 8 + 10,
      },
    ])
    expect(drawOrder.slice(-2)).toEqual([32, 10])
  })
})

describe('D6-1 遮挡半透明(方案 A)', () => {
  beforeEach(() => {
    vi.stubGlobal('document', {
      createElement: () => {
        const canvas = {
          width: 0,
          height: 0,
          getContext: () => ({
            createImageData: (width: number, height: number) => ({
              data: new Uint8ClampedArray(width * height * 4),
            }),
            putImageData: () => undefined,
          }),
        }
        return canvas
      },
    })
  })

  afterEach(() => vi.unstubAllGlobals())

  function occlusionHarness() {
    let map = buildBlankProjectMap(3, 3, 'tileset-test')
    map = insertProjectMapLayer(map, buildProjectMapLayer(map, 'cover', '高物'))
    map = paintProjectMapTiles(map, [{ layerId: 'cover', col: 0, row: 3, tileId: 7, height: 2 }])
    const draws: Array<{ alpha: number; width: number }> = []
    let globalAlpha = 1
    const setGlobalAlpha = (value: number): void => {
      globalAlpha = value
    }
    const ctx = {
      canvas: { width: 320, height: 200 },
      drawImage: (image: { width: number }) =>
        draws.push({ alpha: globalAlpha, width: image.width }),
      fillRect: () => undefined,
      restore: () => setGlobalAlpha(1),
      save: () => undefined,
      get globalAlpha() {
        return globalAlpha
      },
      set globalAlpha(value: number) {
        setGlobalAlpha(value)
      },
    } as unknown as CanvasRenderingContext2D
    const palette: Palette = {
      colors: Array.from({ length: 256 }, () => [0, 0, 0]),
      cycles: [],
    }
    const view = { col: 0, row: 0, cols: 3, rows: 3 }
    const camera = { x: 0, y: 0 }
    return { map, draws, ctx, palette, view, camera }
  }

  const character: SpriteDraw = {
    frame: frame(10, 10),
    worldX: 32,
    worldY: 32,
    anchorX: 5,
    anchorY: 10,
    occlusionTrigger: true,
  }

  test('K1/K2:角色遮挡瓦片以 0.35 画一次;prop 不触发不透明', () => {
    const h = occlusionHarness()
    const renderer = new Canvas2DRenderer(h.ctx, h.palette, new Map([[7, frame(32, 16)]]))
    renderer.renderScene(h.map, h.view, h.camera, [character])
    expect(h.draws.filter((d) => d.alpha === 0.35)).toHaveLength(1)

    h.draws.length = 0
    // 新渲染器 = 全新 latch,隔离上一帧角色触发的迟滞。
    const propRenderer = new Canvas2DRenderer(h.ctx, h.palette, new Map([[7, frame(32, 16)]]))
    propRenderer.renderScene(h.map, h.view, h.camera, [{ ...character, occlusionTrigger: false }])
    expect(h.draws.filter((d) => d.alpha === 0.35)).toHaveLength(0)
  })

  test('K2:两角色共享同一遮挡瓦片只画一次(防 alpha 叠加变暗)', () => {
    const h = occlusionHarness()
    const renderer = new Canvas2DRenderer(h.ctx, h.palette, new Map([[7, frame(32, 16)]]))
    renderer.renderScene(h.map, h.view, h.camera, [character, { ...character }])
    expect(h.draws.filter((d) => d.alpha === 0.35)).toHaveLength(1)
  })

  test('K3:latch 迟滞——角色离开后 120ms 内仍半透明,到期恢复不透明', () => {
    const h = occlusionHarness()
    let now = 0
    const renderer = new Canvas2DRenderer(
      h.ctx,
      h.palette,
      new Map([[7, frame(32, 16)]]),
      () => now,
    )
    renderer.renderScene(h.map, h.view, h.camera, [character])
    expect(h.draws.filter((d) => d.alpha === 0.35)).toHaveLength(1)

    // 角色离开且本帧候选完全为空：latch payload 仍足以画出半透明瓦片。
    h.draws.length = 0
    now += 50
    renderer.renderScene(h.map, h.view, h.camera, [])
    expect(h.draws.filter((d) => d.alpha === 0.35)).toHaveLength(1)

    // latch 到期 → 不再补画旧候选。
    h.draws.length = 0
    now += 200
    renderer.renderScene(h.map, h.view, h.camera, [])
    expect(h.draws.filter((d) => d.alpha === 0.35)).toHaveLength(0)
  })

  test('K3:调试态(showAll)遮挡半透明不生效', () => {
    const h = occlusionHarness()
    const renderer = new Canvas2DRenderer(h.ctx, h.palette, new Map([[7, frame(32, 16)]]))
    renderer.renderScene(h.map, h.view, h.camera, [character], { showAll: true })
    expect(h.draws.filter((d) => d.alpha === 0.35)).toHaveLength(0)
  })
})
