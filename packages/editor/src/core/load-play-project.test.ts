import { beforeEach, describe, expect, test, vi } from 'vitest'

const reforge = vi.hoisted(() => ({
  source: { kind: 'fixture-source' },
  fsaSource: vi.fn(),
  loadProjectV16: vi.fn(),
  loadProjectV16From: vi.fn(),
}))

vi.mock('@type-pal/reforge', () => ({
  fsaSource: reforge.fsaSource,
  loadProjectV16: reforge.loadProjectV16,
  loadProjectV16From: reforge.loadProjectV16From,
}))

import { loadPlayProject } from './load-play-project.js'

describe('loadPlayProject current canonical boundary', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    reforge.fsaSource.mockReturnValue(reforge.source)
    reforge.loadProjectV16.mockResolvedValue({ manifest: { contentVersion: 16 } })
    reforge.loadProjectV16From.mockResolvedValue({ manifest: { contentVersion: 16 } })
  })

  test('loads repository projects through the current v16 loader', async () => {
    await loadPlayProject('pal')

    expect(reforge.loadProjectV16).toHaveBeenCalledExactlyOnceWith('pal')
    expect(reforge.fsaSource).not.toHaveBeenCalled()
    expect(reforge.loadProjectV16From).not.toHaveBeenCalled()
  })

  test('loads directory-backed projects through the current v16 loader', async () => {
    const dir = { name: 'local-pal' } as FileSystemDirectoryHandle

    await loadPlayProject('pal', dir)

    expect(reforge.fsaSource).toHaveBeenCalledExactlyOnceWith(dir)
    expect(reforge.loadProjectV16From).toHaveBeenCalledExactlyOnceWith(reforge.source)
    expect(reforge.loadProjectV16).not.toHaveBeenCalled()
  })
})
