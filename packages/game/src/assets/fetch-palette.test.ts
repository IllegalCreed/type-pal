/** Palette-only requests do not need PNG or loadAll startup fixtures. */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { legalPalette } from '../__tests__/asset-fixtures.js'
import { fetchPalette } from './loader.js'

describe('fetchPalette requests and failures', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('fetchPalette(5) 读取 palette/5.json 并返回完整 256 色', async () => {
    const palette = legalPalette((colors) => {
      colors[5] = [9, 8, 7]
    })
    const calls: string[] = []
    vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
      calls.push(String(input))
      return Response.json(palette)
    })
    const loaded = await fetchPalette(5)
    expect(calls).toEqual(['/extracted/data/palette/5.json'])
    expect(loaded.colors).toHaveLength(256)
    expect(loaded.colors[5]).toEqual([9, 8, 7])
    expect(loaded.cycles).toEqual([{ start: 10, length: 4, step: 1, frameInterval: 3 }])
  })

  it('fetchPalette(12) 503 的错误同时包含 URL 与状态码', async () => {
    const calls: string[] = []
    vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
      calls.push(String(input))
      return new Response(null, { status: 503 })
    })
    await expect(fetchPalette(12)).rejects.toThrow(
      'assets: fetch /extracted/data/palette/12.json failed (503)',
    )
    expect(calls).toEqual(['/extracted/data/palette/12.json'])
  })
})
