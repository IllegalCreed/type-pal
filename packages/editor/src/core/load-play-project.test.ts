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

import { loadPlayProject } from './load-play-project.js'

describe('loadPlayProject current canonical boundary', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    reforge.fsaSource.mockReturnValue(reforge.source)
    reforge.loadCurrentProject.mockResolvedValue({ manifest: { contentVersion: 17 } })
    reforge.loadCurrentProjectFrom.mockResolvedValue({ manifest: { contentVersion: 17 } })
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
})
