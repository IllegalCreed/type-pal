import { fsaSource } from '@type-pal/reforge'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { memoryAuthorDirectory } from './__tests__/author-save-fixture.js'
import { loadPlayProject } from './load-play-project.js'
import { buildBlankProject } from './seed.js'

vi.mock('@type-pal/reforge', async (original) => {
  const runtime = await original<typeof import('@type-pal/reforge')>()
  return { ...runtime, fsaSource: vi.fn(runtime.fsaSource) }
})

vi.mock('./handle-store.js', async (original) => ({
  ...(await original<typeof import('./handle-store.js')>()),
  findWorkspaceRecordByHandle: async () => null,
}))

afterEach(() => {
  vi.unstubAllGlobals()
  vi.mocked(fsaSource).mockClear()
})

function observeSource(dir: FileSystemDirectoryHandle) {
  const real = fsaSource(dir)
  return { ...real, dispose: vi.fn(() => real.dispose?.()) }
}

describe('loading the game preview from its selected project source', () => {
  test('opens the requested HTTP project through the real current-project loader', async () => {
    const id = 'http-play-project'
    const disk = memoryAuthorDirectory(await buildBlankProject(id))
    const prefix = `projects/${id}/`
    const fetchProject = vi.fn<typeof fetch>(async (input) => {
      if (typeof input !== 'string' || !input.startsWith(prefix))
        throw new Error(`Read outside this preview project: ${String(input)}`)
      const body = disk.files.get(input.slice(prefix.length))
      return body ? new Response(body.slice(0)) : new Response(null, { status: 404 })
    })
    vi.stubGlobal('fetch', fetchProject)

    const loaded = await loadPlayProject(id)
    expect(loaded.manifest.id).toBe(id)
    expect(loaded.manifest.assets.catalog).toBe('assets/index.json')
    expect(fetchProject).toHaveBeenCalledWith(`${prefix}manifest.json`)
    expect(fsaSource).not.toHaveBeenCalled()
  })

  test('keeps the actual directory source available for lazy reads after a successful load', async () => {
    const disk = memoryAuthorDirectory(await buildBlankProject('local-play-project'))
    const source = observeSource(disk.dir)
    vi.mocked(fsaSource).mockReturnValueOnce(source)

    const loaded = await loadPlayProject('ignored-http-project', disk.dir)
    expect(loaded.manifest.id).toBe('local-play-project')
    expect(loaded.source).toBe(source)
    expect(source.dispose).not.toHaveBeenCalled()
    await expect(loaded.source.readJson('manifest.json')).resolves.toMatchObject({
      id: 'local-play-project',
    })
    expect(disk.changes).toEqual({ creates: [], closes: [], removes: [] })
  })

  test('releases the directory source if loading fails and propagates the original failure', async () => {
    const disk = memoryAuthorDirectory()
    const source = observeSource(disk.dir)
    const failure = new DOMException('directory read denied', 'NotAllowedError')
    vi.mocked(fsaSource).mockReturnValueOnce({
      ...source,
      async readText() {
        throw failure
      },
    })

    await expect(loadPlayProject('no-http-fallback', disk.dir)).rejects.toBe(failure)
    expect(source.dispose).toHaveBeenCalledOnce()
    expect(disk.changes).toEqual({ creates: [], closes: [], removes: [] })
  })
})
