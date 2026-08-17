import { beforeEach, describe, expect, test, vi } from 'vitest'

const reforge = vi.hoisted(() => ({
  source: { kind: 'fixture-source' },
  fsaSource: vi.fn(),
  loadProjectV15: vi.fn(),
  loadProjectV15From: vi.fn(),
}))

vi.mock('@type-pal/reforge', () => ({
  fsaSource: reforge.fsaSource,
  loadProjectV15: reforge.loadProjectV15,
  loadProjectV15From: reforge.loadProjectV15From,
}))

import { loadPlayProject } from './load-play-project.js'

describe('loadPlayProject current canonical boundary', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    reforge.fsaSource.mockReturnValue(reforge.source)
    reforge.loadProjectV15.mockResolvedValue({ manifest: { contentVersion: 15 } })
    reforge.loadProjectV15From.mockResolvedValue({ manifest: { contentVersion: 15 } })
  })

  test('loads repository projects through the current v15 loader', async () => {
    await loadPlayProject('pal')

    expect(reforge.loadProjectV15).toHaveBeenCalledExactlyOnceWith('pal')
    expect(reforge.fsaSource).not.toHaveBeenCalled()
    expect(reforge.loadProjectV15From).not.toHaveBeenCalled()
  })

  test('loads directory-backed projects through the current v15 loader', async () => {
    const dir = { name: 'local-pal' } as FileSystemDirectoryHandle

    await loadPlayProject('pal', dir)

    expect(reforge.fsaSource).toHaveBeenCalledExactlyOnceWith(dir)
    expect(reforge.loadProjectV15From).toHaveBeenCalledExactlyOnceWith(reforge.source)
    expect(reforge.loadProjectV15).not.toHaveBeenCalled()
  })
})
