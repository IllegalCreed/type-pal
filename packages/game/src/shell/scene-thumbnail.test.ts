import type { Palette, Tilemap } from '@type-pal/shared'
import { createCanvas, loadImage } from 'canvas'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSceneThumbnailRenderer } from './scene-thumbnail.js'

const map: Tilemap = {
  width: 64,
  height: 128,
  tileset: 'tileset/test.rle',
  cells: Array.from({ length: 128 }, () =>
    Array.from({ length: 64 }, () => ({ lower: 0, upper: 0 })),
  ),
}
function palette(): Palette {
  const colors = Array.from({ length: 256 }, (): [number, number, number] => [0, 0, 0])
  colors[17] = [240, 32, 16]
  return { colors, cycles: [] }
}

// One 32×16 GOP frame: two WORD offsets, then width/height and row-sized literals.
// The optional final transparent row models an uncovered map edge, not palette index zero.
function tileset(transparentEdge = false): Uint8Array {
  const body = [32, 0, 16, 0]
  for (let row = 0; row < 16; row++) {
    if (transparentEdge && row === 15) body.push(0x80 + 32)
    else body.push(32, ...Array<number>(32).fill(17))
  }
  const end = (body.length + 4) / 2
  return Uint8Array.from([2, 0, end & 255, end >>> 8, ...body])
}
function installTransport(bytes = tileset()): string[] {
  const requests: string[] = []
  vi.stubGlobal('fetch', async (input: RequestInfo | URL): Promise<Response> => {
    const url = String(input)
    requests.push(url)
    if (url.includes('/scene/')) return Response.json({ mapNum: 12 })
    if (url.includes('/tilemap/')) return Response.json(map)
    if (url.endsWith('/tileset/test.rle')) return new Response(Uint8Array.from(bytes))
    throw new Error(`Unexpected thumbnail request: ${url}`)
  })
  return requests
}
async function pixels(url: string | null): Promise<{
  width: number
  height: number
  at: (x: number, y: number) => number[]
}> {
  expect(url).toMatch(/^data:image\/png;base64,/)
  const image = await loadImage(url!)
  const canvas = createCanvas(image.width, image.height)
  const ctx = canvas.getContext('2d')
  ctx.drawImage(image, 0, 0)
  return {
    width: image.width,
    height: image.height,
    at: (x, y) => [...ctx.getImageData(x, y, 1, 1).data],
  }
}

afterEach(() => vi.unstubAllGlobals())

describe('shared scene thumbnail renderer', () => {
  it('keeps picker and minimap sizes distinct while caching each successful map/width', async () => {
    const requests = installTransport()
    const render = createSceneThumbnailRenderer(palette())
    const picker = await render(0, 12)
    const minimap = await render(0, 12, 640)
    expect(await render(9, 12)).toBe(picker)
    const small = await pixels(picker)
    const large = await pixels(minimap)
    expect([small.width, small.height, large.width, large.height]).toEqual([96, 96, 640, 640])
    expect(small.at(48, 48)).toEqual([240, 32, 16, 255])
    expect(large.at(320, 320)).toEqual([240, 32, 16, 255])
    expect(requests).toEqual([
      '/extracted/data/tilemap/12.json',
      '/extracted/data/tileset/test.rle',
      '/extracted/data/tilemap/12.json',
      '/extracted/data/tileset/test.rle',
    ])
  })

  it('resolves missing map numbers from the scene and then shares the map cache', async () => {
    const requests = installTransport()
    const render = createSceneThumbnailRenderer(palette())
    const first = await render(3)
    expect(await render(4)).toBe(first)
    expect(requests).toEqual([
      '/extracted/data/scene/3.json',
      '/extracted/data/tilemap/12.json',
      '/extracted/data/tileset/test.rle',
      '/extracted/data/scene/4.json',
    ])
  })

  it('deduplicates inflight map/width jobs and hands one of two slots to queued work', async () => {
    const pending = new Map<number, (response: Response) => void>()
    const started: number[] = []
    let releasing = false
    vi.stubGlobal('fetch', async (input: RequestInfo | URL): Promise<Response> => {
      const url = String(input)
      const match = /\/tilemap\/(\d+)\.json$/.exec(url)
      if (match) {
        const id = Number(match[1])
        started.push(id)
        if (releasing) return Response.json(map)
        return new Promise<Response>((resolve) => pending.set(id, resolve))
      }
      if (url.endsWith('/tileset/test.rle')) return new Response(Uint8Array.from(tileset()))
      throw new Error(`Unexpected thumbnail request: ${url}`)
    })
    const render = createSceneThumbnailRenderer(palette())
    const jobs = [render(0, 1), render(0, 1), render(0, 2), render(0, 3)]
    try {
      await vi.waitFor(() => expect(started).toEqual([1, 2]))
      pending.get(1)!(Response.json(map))
      expect(await jobs[1]).toBe(await jobs[0])
      await vi.waitFor(() => expect(started).toEqual([1, 2, 3]))
      pending.get(3)!(Response.json(map))
      expect(await jobs[3]).toMatch(/^data:image\/png;base64,/)
      expect(pending.has(2)).toBe(true)
    } finally {
      releasing = true
      for (const resolve of pending.values()) resolve(Response.json(map))
      await Promise.allSettled(jobs)
    }
  })

  it('reports a failed map load once and leaves failure uncached for retry', async () => {
    const requests = installTransport()
    const normal = fetch
    let first = true
    vi.stubGlobal('fetch', async (input: RequestInfo | URL): Promise<Response> => {
      if (first) {
        first = false
        return new Response('', { status: 500 })
      }
      return normal(input)
    })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const render = createSceneThumbnailRenderer(palette())
      expect(await render(0, 12)).toBeNull()
      expect(warn).toHaveBeenCalledExactlyOnceWith(
        '[dev-panel] 缩略图渲染失败 map 12:',
        expect.objectContaining({ message: 'tilemap-12.json fetch failed (500)' }),
      )
      expect(await render(0, 12)).toMatch(/^data:image\/png;base64,/)
      expect(requests).toEqual([
        '/extracted/data/tilemap/12.json',
        '/extracted/data/tileset/test.rle',
      ])
    } finally {
      warn.mockRestore()
    }
  })

  it('fills an uncovered edge before downsampling the actual 640px minimap image', async () => {
    installTransport(tileset(true))
    const render = createSceneThumbnailRenderer(palette())
    const output = await pixels(await render(0, 12, 640))
    expect(output.at(639, 639)).toEqual([240, 32, 16, 255])
  })
})
