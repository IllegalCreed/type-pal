import { beforeEach, describe, expect, test, vi } from 'vitest'

const reforge = vi.hoisted(() => ({
  source: { kind: 'fixture-source' },
  fsaSource: vi.fn(),
  loadCurrentProject: vi.fn(),
  loadCurrentProjectFrom: vi.fn(),
}))

vi.mock('@type-pal/reforge', () => ({
  fsaSource: reforge.fsaSource,
  loadCurrentProject: reforge.loadCurrentProject,
  loadCurrentProjectFrom: reforge.loadCurrentProjectFrom,
}))

vi.mock('./handle-store.js', async (original) => ({
  ...(await original<typeof import('./handle-store.js')>()),
  findWorkspaceRecordByHandle: async () => null,
}))

import { loadPlayProject } from './load-play-project.js'

describe('loadPlayProject current canonical boundary', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    reforge.fsaSource.mockReturnValue(reforge.source)
    reforge.loadCurrentProject.mockResolvedValue({ manifest: { contentVersion: 20 } })
    reforge.loadCurrentProjectFrom.mockResolvedValue({ manifest: { contentVersion: 20 } })
  })

  test('loads repository projects through the current canonical loader', async () => {
    await loadPlayProject('pal')

    expect(reforge.loadCurrentProject).toHaveBeenCalledExactlyOnceWith('pal')
    expect(reforge.fsaSource).not.toHaveBeenCalled()
    expect(reforge.loadCurrentProjectFrom).not.toHaveBeenCalled()
  })

  test('loads directory-backed projects through the current canonical loader', async () => {
    const dir = { name: 'local-pal' } as FileSystemDirectoryHandle

    await loadPlayProject('pal', dir)

    expect(reforge.fsaSource).toHaveBeenCalledExactlyOnceWith(dir)
    expect(reforge.loadCurrentProjectFrom).toHaveBeenCalledExactlyOnceWith(reforge.source)
    expect(reforge.loadCurrentProject).not.toHaveBeenCalled()
  })

  test('failed local load disposes its source and preserves the original error', async () => {
    const error = new Error('rejected current project')
    const dispose = vi.fn()
    reforge.fsaSource.mockReturnValue({ ...reforge.source, dispose })
    reforge.loadCurrentProjectFrom.mockRejectedValue(error)
    await expect(loadPlayProject('pal', {} as FileSystemDirectoryHandle)).rejects.toBe(error)
    expect(dispose).toHaveBeenCalledOnce()
  })
})
