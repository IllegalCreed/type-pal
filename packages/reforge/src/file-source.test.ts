import { afterEach, describe, expect, test, vi } from 'vitest'
import { httpSource } from './file-source.js'

describe('httpSource', () => {
  afterEach(() => vi.restoreAllMocks())

  test('readJson / readText:base 拼 rel 后 fetch,返回解析结果', async () => {
    const fetchMock = vi.fn(
      async (url: string) => new Response(JSON.stringify({ at: url }), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const s = httpSource('projects/pal')
    expect(await s.readJson('manifest.json')).toEqual({ at: 'projects/pal/manifest.json' })
    expect(await s.readText('content/a.json')).toContain('projects/pal/content/a.json')
  })

  test("rel 以 '/' 开头 = 应用绝对路径,忽略 base", async () => {
    const fetchMock = vi.fn(async () => new Response('x', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const s = httpSource('projects/pal')
    await s.readText('/extracted/data/maps/1.json')
    expect(fetchMock).toHaveBeenCalledWith('/extracted/data/maps/1.json')
  })

  test('readBytes 返回 ArrayBuffer', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(new Uint8Array([1, 2, 3]), { status: 200 })),
    )
    const s = httpSource('projects/pal')
    const buf = await s.readBytes('assets/x.rle')
    expect(new Uint8Array(buf)).toEqual(new Uint8Array([1, 2, 3]))
  })

  test('非 200 抛错带 url + 状态码', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 404 })),
    )
    const s = httpSource('projects/pal')
    await expect(s.readJson('nope.json')).rejects.toThrow('404')
  })

  test('AbortSignal 透传 fetch，取消未完成读取', async () => {
    const fetchMock = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            'abort',
            () => reject(new DOMException('aborted', 'AbortError')),
            { once: true },
          )
        }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const ac = new AbortController()
    const reading = httpSource('projects/pal').readJson('content/scripts/chunk.json', ac.signal)
    ac.abort()
    await expect(reading).rejects.toMatchObject({ name: 'AbortError' })
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBe(ac.signal)
  })

  test('urlFor:相对拼 base,绝对原样', async () => {
    const s = httpSource('projects/pal')
    expect(await s.urlFor('content/a.json')).toBe('projects/pal/content/a.json')
    expect(await s.urlFor('/extracted/x.png')).toBe('/extracted/x.png')
  })
})
