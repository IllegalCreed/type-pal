import { beforeEach, describe, expect, test, vi } from 'vitest'

const reforge = vi.hoisted(() => ({
  source: { kind: 'fixture-source' },
  fsaSource: vi.fn(),
  loadProjectV14: vi.fn(),
  loadProjectV14From: vi.fn(),
}))

vi.mock('@type-pal/reforge', () => ({
  fsaSource: reforge.fsaSource,
  loadProjectV14: reforge.loadProjectV14,
  loadProjectV14From: reforge.loadProjectV14From,
}))

import { loadPlayProject } from './load-play-project.js'

describe('loadPlayProject current canonical boundary', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    reforge.fsaSource.mockReturnValue(reforge.source)
    reforge.loadProjectV14.mockResolvedValue({ manifest: { contentVersion: 14 } })
    reforge.loadProjectV14From.mockResolvedValue({ manifest: { contentVersion: 14 } })
  })

  test('loads repository projects through the current v14 loader', async () => {
    await loadPlayProject('pal')

    expect(reforge.loadProjectV14).toHaveBeenCalledExactlyOnceWith('pal')
    expect(reforge.fsaSource).not.toHaveBeenCalled()
    expect(reforge.loadProjectV14From).not.toHaveBeenCalled()
  })

  test('loads directory-backed projects through the current v14 loader', async () => {
    const dir = { name: 'local-pal' } as FileSystemDirectoryHandle

    await loadPlayProject('pal', dir)

    expect(reforge.fsaSource).toHaveBeenCalledExactlyOnceWith(dir)
    expect(reforge.loadProjectV14From).toHaveBeenCalledExactlyOnceWith(reforge.source)
    expect(reforge.loadProjectV14).not.toHaveBeenCalled()
  })
})
