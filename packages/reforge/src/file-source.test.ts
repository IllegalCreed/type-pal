import { afterEach, describe, expect, test, vi } from 'vitest'
import { httpSource } from './file-source.js'
import { PROJECT_SAVE_STATE_PATH } from './project-save-state.js'

const projectUrl = 'projects/pal'
const manifestPath = 'manifest.json'

afterEach(() => vi.unstubAllGlobals())

describe('HTTP project reads', () => {
  test('requests the registered relative paths and returns the native response data', async () => {
    const reply = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('{"n":7,"label":"中文"}'))
      .mockResolvedValueOnce(new Response(' \n{ "id": "target" }\n'))
      .mockResolvedValueOnce(new Response(Uint8Array.of(1, 2, 3)))
    vi.stubGlobal('fetch', reply)
    const source = httpSource(`${projectUrl}/`)

    await expect(source.readJson(manifestPath)).resolves.toEqual({ n: 7, label: '中文' })
    await expect(source.readText('content/a.json')).resolves.toBe(' \n{ "id": "target" }\n')
    expect(new Uint8Array(await source.readBytes('assets/x.rle'))).toEqual(Uint8Array.of(1, 2, 3))
    expect(reply.mock.calls).toEqual([
      [`${projectUrl}/manifest.json`],
      [`${projectUrl}/content/a.json`],
      [`${projectUrl}/assets/x.rle`],
    ])
  })

  test('passes the native JSON syntax error through to the caller', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(new Response('{"incomplete":')))
    await expect(httpSource(projectUrl).readJson(manifestPath)).rejects.toBeInstanceOf(SyntaxError)
  })

  test('rejects an absolute path from any entry before requesting it', async () => {
    const reply = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', reply)
    const source = httpSource(projectUrl)
    const absolute = '/extracted/data/maps/1.json'
    const diagnostic = new Error(`FileSource 路径: 禁止绝对路径 "${absolute}"`)
    await expect(source.readText(absolute)).rejects.toThrow(diagnostic)
    await expect(source.readJson(absolute)).rejects.toThrow(diagnostic)
    await expect(source.readBytes(absolute)).rejects.toThrow(diagnostic)
    await expect(source.urlFor(absolute)).rejects.toThrow(diagnostic)
    expect(reply).not.toHaveBeenCalled()
  })

  test('constructs a relative URL without contacting the transport', async () => {
    const reply = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', reply)
    await expect(httpSource(projectUrl).urlFor('content/a.json')).resolves.toBe(
      `${projectUrl}/content/a.json`,
    )
    expect(reply).not.toHaveBeenCalled()
  })

  test('passes the same abort signal to fetch and preserves its cancellation', async () => {
    const reply = vi.fn<typeof fetch>(async (_input, init) => {
      const signal = init?.signal
      if (!signal) return new Response('null')
      return new Promise<Response>((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(signal.reason), { once: true })
      })
    })
    vi.stubGlobal('fetch', reply)
    const controller = new AbortController()
    const reading = httpSource(projectUrl).readJson(manifestPath, controller.signal)
    const rejection = expect(reading).rejects.toBeInstanceOf(DOMException)
    const reason = new DOMException('cancel this read', 'AbortError')
    controller.abort(reason)
    await rejection
    await expect(reading).rejects.toBe(reason)
    expect(reply.mock.calls).toEqual([
      [`${projectUrl}/manifest.json`, { signal: controller.signal }],
    ])
  })
})

describe('HTTP status and project save-state', () => {
  test('reports a missing ordinary file with its original address and NotFoundError', async () => {
    const reply = vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status: 404 }))
    vi.stubGlobal('fetch', reply)
    await expect(httpSource(projectUrl).readJson('nope.json')).rejects.toMatchObject({
      name: 'NotFoundError',
      message: `httpSource ${projectUrl}/nope.json -> 404`,
    })
  })

  test('bypasses the HTTP cache for the project save-state metadata', async () => {
    const reply = vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status: 404 }))
    vi.stubGlobal('fetch', reply)
    const source = httpSource(projectUrl)
    const controller = new AbortController()
    await expect(source.readText(PROJECT_SAVE_STATE_PATH)).rejects.toMatchObject({
      name: 'NotFoundError',
    })
    await expect(source.readText(PROJECT_SAVE_STATE_PATH, controller.signal)).rejects.toMatchObject(
      {
        name: 'NotFoundError',
      },
    )
    expect(reply.mock.calls).toEqual([
      [`${projectUrl}/.type-pal/save-state.json`, { cache: 'no-store' }],
      [`${projectUrl}/.type-pal/save-state.json`, { cache: 'no-store', signal: controller.signal }],
    ])
  })

  test.each([403, 500])('reports HTTP %i as a read error rather than absence', async (status) => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status })))
    const reading = httpSource(projectUrl).readText(PROJECT_SAVE_STATE_PATH)
    await expect(reading).rejects.toMatchObject({
      name: 'Error',
      message: `httpSource ${projectUrl}/.type-pal/save-state.json -> ${status}`,
    })
  })
})
