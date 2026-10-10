// @vitest-environment jsdom
import type { Palette, RleFrame } from '@type-pal/shared'
import { describe, expect, test } from 'vitest'
import {
  buildBlankProjectMap,
  buildProjectMapLayer,
  insertProjectMapLayer,
  paintProjectMapTiles,
} from './project-map.js'
import { Canvas2DRenderer, type RenderLayerOpts, type SpriteDraw } from './render.js'

// jsdom delegates these canvases to the installed native canvas implementation.
// No draw-call substitutes: assertions read the actual composited RGBA pixels.
const palette: Palette = {
  colors: Array.from({ length: 256 }, (_, index) =>
    index === 0
      ? [100, 100, 100]
      : index === 1
        ? [200, 0, 0]
        : index === 2
          ? [0, 200, 0]
          : [0, 0, 200],
  ),
  cycles: [],
}

function frame(width: number, height: number, color: number): RleFrame {
  return {
    width,
    height,
    pixels: new Uint8Array(width * height).fill(color),
    opaque: new Uint8Array(width * height).fill(1),
  }
}

function sprite(color = 1, x = 10, y = 24, eligible = true): SpriteDraw {
  return {
    frame: frame(8, 10, color),
    worldX: x,
    worldY: y,
    anchorX: 4,
    anchorY: 10,
    occlusionTrigger: eligible,
  }
}

function context(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('native canvas 2d unavailable')
  return ctx
}

function harness(tile = frame(32, 16, 3), scale = 1) {
  let map = buildBlankProjectMap(3, 3, 'test')
  map = insertProjectMapLayer(map, buildProjectMapLayer(map, 'cover', 'cover'))
  map = paintProjectMapTiles(map, [
    { layerId: 'cover', col: 0, row: 3, tileId: 7, tilesetId: 'test', height: 2 },
  ])
  const canvas = document.createElement('canvas')
  canvas.width = 100 * scale
  canvas.height = 80 * scale
  const ctx = context(canvas)
  ctx.scale(scale, scale)
  ctx.imageSmoothingEnabled = false
  let now = 0
  const renderer = new Canvas2DRenderer(
    ctx,
    palette,
    new Map([['test', new Map([[7, tile]])]]),
    () => now,
  )
  const camera = { x: 0, y: 0 }
  return {
    camera,
    ctx,
    renderer,
    get map() {
      return map
    },
    set map(next: typeof map) {
      map = next
    },
    time(value: number) {
      now = value
    },
    render(sprites: readonly SpriteDraw[], opts?: RenderLayerOpts) {
      renderer.clear()
      renderer.renderScene(map, { col: 0, row: 0, cols: 3, rows: 3 }, camera, sprites, opts)
    },
    pixel(x: number, y: number) {
      return [...ctx.getImageData(x * scale, y * scale, 1, 1).data]
    },
    pixels() {
      return [...ctx.getImageData(0, 0, canvas.width, canvas.height).data]
    },
  }
}

const wall = [0, 0, 200, 255]
const red = [200, 0, 0, 255]
const green = [0, 200, 0, 255]

function revealed(pixel: number[], color = red, foreground = wall): void {
  expect(pixel[3]).toBe(255)
  for (let channel = 0; channel < 3; channel++) {
    expect(
      Math.abs(
        (pixel[channel] ?? 0) - ((color[channel] ?? 0) * 0.2 + (foreground[channel] ?? 0) * 0.8),
      ),
    ).toBeLessThanOrEqual(1)
  }
}

describe('party-only foreground composition: real RGBA canvas', () => {
  test('NPC-only stays normally occluded; a party does not reveal a shared-wall NPC or empty wall', () => {
    const h = harness()
    h.render([sprite(2, 24, 24, false)])
    expect(h.pixel(24, 25)).toEqual(wall)
    h.render([sprite(), sprite(2, 24, 24, false)])
    revealed(h.pixel(10, 25))
    expect(h.pixel(24, 25)).toEqual(wall)
    expect(h.pixel(18, 25)).toEqual(wall)
  })

  test('NPC ahead of party erases only its true opaque footprint; an NPC behind does not erase party', () => {
    const h = harness()
    h.render([sprite(), sprite(2, 10, 25, false)])
    expect(h.pixel(10, 25)).toEqual(wall)
    revealed(h.pixel(10, 21))
    h.render([sprite(2, 10, 23, false), sprite()])
    revealed(h.pixel(10, 25))
  })

  test('equal-depth ties use existing stable draw order, not worldY or eligible priority', () => {
    const h = harness()
    const party = sprite()
    const npc = sprite(2, 10, 24, false)
    h.render([party, npc])
    expect(h.pixel(10, 25)).toEqual(wall)
    h.render([npc, party])
    revealed(h.pixel(10, 25))
    h.render([party, { ...npc, baseYBias: -1 }])
    revealed(h.pixel(10, 25))
  })

  test('NPC in front of wall stays opaque and overlays party normally', () => {
    const h = harness()
    h.render([sprite(), { ...sprite(2, 10, 24, false), baseYBias: 4 }])
    expect(h.pixel(10, 25)).toEqual(green)
  })

  test('all eligible party members reveal; extra followers remain normally occluded', () => {
    const h = harness()
    h.render([sprite(), sprite(2, 24), sprite(2, 18, 24, false)])
    revealed(h.pixel(10, 25))
    revealed(h.pixel(24, 25), green)
    expect(h.pixel(18, 25)).toEqual(wall)
  })

  test('sprite holes never reveal underlying NPC; opaque palette index zero does reveal', () => {
    const h = harness()
    const party = sprite()
    party.frame.opaque[4 * 8 + 4] = 0
    party.frame.pixels[4 * 8 + 3] = 0
    h.render([sprite(2, 10, 23, false), party])
    expect(h.pixel(10, 25)).toEqual(wall)
    revealed(h.pixel(9, 25), [100, 100, 100, 255])
  })

  test('tile holes preserve normal party/NPC pixels without extra reveal alpha', () => {
    const tile = frame(32, 16, 3)
    tile.opaque[10 * 32 + 10] = 0
    tile.opaque[10 * 32 + 24] = 0
    const h = harness(tile)
    h.render([sprite(), sprite(2, 24, 24, false)])
    expect(h.pixel(10, 25)).toEqual(red)
    expect(h.pixel(24, 25)).toEqual(green)
    revealed(h.pixel(11, 25))
  })

  test('a foreground palette-zero pixel remains opaque; instance height is only a depth input', () => {
    const h = harness(frame(32, 16, 0))
    h.render([sprite(), sprite(2, 24, 24, false)])
    revealed(h.pixel(10, 25), red, [100, 100, 100, 255])
    expect(h.pixel(24, 25)).toEqual([100, 100, 100, 255])
    h.map = paintProjectMapTiles(h.map, [
      { layerId: 'cover', col: 0, row: 3, tileId: 7, tilesetId: 'test', height: 0 },
    ])
    h.render([sprite()])
    expect(h.pixel(10, 25)).toEqual(red)
  })

  test('transparent pixels of a nearer NPC do not erase party, and alpha does not leak to later draws', () => {
    const h = harness()
    const npc = sprite(2, 10, 25, false)
    npc.frame.opaque[3 * 8 + 4] = 0
    h.render([sprite(), npc])
    revealed(h.pixel(10, 25))
    expect(h.pixel(9, 25)).toEqual(wall)
    expect(h.ctx.globalAlpha).toBe(1)
    expect(h.ctx.globalCompositeOperation).toBe('source-over')
  })

  test('overlapping walls and parties never accumulate reveal brightness', () => {
    const h = harness()
    h.map = insertProjectMapLayer(h.map, buildProjectMapLayer(h.map, 'second', 'second'))
    h.map = paintProjectMapTiles(h.map, [
      { layerId: 'second', col: 0, row: 3, tileId: 7, tilesetId: 'test', height: 2 },
    ])
    h.render([sprite(), sprite()])
    revealed(h.pixel(10, 25))
    expect(h.pixel(18, 25)).toEqual(wall)
  })

  test('latch retains only current party intersection during a candidate gap and expires at 120ms', () => {
    const h = harness()
    h.render([sprite()])
    const withoutCandidate = { ...sprite(), coverILayer: -200 }
    h.time(50)
    h.render([withoutCandidate])
    revealed(h.pixel(10, 25))
    h.time(120)
    h.render([withoutCandidate])
    expect(h.pixel(10, 25)).toEqual(red)
  })

  test('a latch-only cover never changes ordinary NPC pixels outside the current party mask', () => {
    const h = harness()
    h.render([sprite()])
    h.time(50)
    h.render([
      { ...sprite(), coverILayer: -200 },
      { ...sprite(2, 24, 24, false), coverILayer: -200 },
    ])
    revealed(h.pixel(10, 25))
    expect(h.pixel(24, 25)).toEqual(green)
    expect(h.pixel(18, 25)).toEqual(wall)
  })

  test('leaving, empty party or changed frame never leaves old-position ghosts or reveals an NPC', () => {
    const h = harness()
    h.render([sprite()])
    h.time(50)
    h.render([sprite(2, 10, 24, false)])
    expect(h.pixel(10, 25)).toEqual(wall)
    h.render([])
    expect(h.pixel(10, 25)).toEqual(wall)
    h.render([sprite(1, 50), sprite(2, 10, 24, false)])
    expect(h.pixel(10, 25)).toEqual(wall)
    const moved = sprite(1, 24)
    h.render([moved])
    expect(h.pixel(10, 25)).toEqual(wall)
    revealed(h.pixel(24, 25))
    const emptyFrame = sprite(1, 24)
    emptyFrame.frame.opaque.fill(0)
    h.render([emptyFrame])
    expect(h.pixel(24, 25)).toEqual(wall)
  })

  test('reset and changed tile identity discard retained relationships', () => {
    const h = harness()
    h.render([sprite()])
    h.time(50)
    h.renderer.resetOcclusionLatch()
    h.render([{ ...sprite(), coverILayer: -200 }])
    expect(h.pixel(10, 25)).toEqual(red)
    h.render([sprite()])
    h.map = paintProjectMapTiles(h.map, [
      { layerId: 'cover', col: 0, row: 3, tileId: 8, tilesetId: 'test', height: 2 },
    ])
    h.render([{ ...sprite(), coverILayer: -200 }])
    expect(h.pixel(10, 25)).toEqual(red)
  })

  test.each([
    { showAll: true },
    { focusLayerId: 'cover' },
    { focusHeight: 2 },
  ])('debug $showAll/$focusLayerId/$focusHeight preserves normal occlusion and clears latch', (opts) => {
    const h = harness()
    h.render([sprite()])
    h.render([sprite()], opts)
    expect(h.pixel(10, 25)).toEqual(wall)
    h.time(50)
    h.render([{ ...sprite(), coverILayer: -200 }])
    expect(h.pixel(10, 25)).toEqual(red)
  })

  test('skipCover and hidden layers keep ordinary sprite composition, without retained cover', () => {
    const h = harness()
    h.render([sprite()])
    h.render([sprite(), sprite(2, 10, 24, false)], { skipCover: true })
    expect(h.pixel(10, 25)).toEqual(green)
    h.render([sprite()], { hiddenLayerIds: ['cover'] })
    expect(h.pixel(10, 25)).toEqual(red)
  })

  test.each([
    { x: -0.25, y: -0.75 },
    { x: -0.375, y: -0.625 },
    { x: -0.2, y: -0.8 },
  ])('fractional camera $x/$y, scale4 and foot +7 align reveal exactly with the ordinary opaque sprite mask', (camera) => {
    const h = harness(frame(32, 16, 3), 4)
    h.camera.x = camera.x
    h.camera.y = camera.y
    h.render([sprite()], { skipCover: true })
    const normal = h.pixels()
    h.render([sprite()])
    const feedback = h.pixels()
    const covered = normal.map((value, index) => index % 4 === 0 && value === 200)
    let count = 0
    for (let index = 0; index < feedback.length; index += 4) {
      if (covered[index]) {
        // A red pixel inside the foreground should contain precisely the same reveal fraction.
        const blue = feedback[index + 2] ?? 0
        if (blue > 0) {
          revealed(feedback.slice(index, index + 4))
          count++
        }
      } else {
        expect(feedback[index]).toBe(0)
      }
    }
    expect(count).toBeGreaterThan(0)
  })
})
