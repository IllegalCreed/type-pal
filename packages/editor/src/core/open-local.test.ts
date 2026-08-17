import { beforeEach, describe, expect, test, vi } from 'vitest'

const reforge = vi.hoisted(() => ({
  dispose: vi.fn(),
  readJson: vi.fn(),
  loadProjectV15From: vi.fn(),
  loadAllAuthorScenesV15: vi.fn(),
  loadStampTemplatesV15: vi.fn(),
}))

vi.mock('@type-pal/reforge', () => ({
  fsaSource: vi.fn(() => ({
    readJson: reforge.readJson,
    dispose: reforge.dispose,
  })),
  loadProjectV15From: reforge.loadProjectV15From,
  loadAllAuthorScenesV15: reforge.loadAllAuthorScenesV15,
  loadStampTemplatesV15: reforge.loadStampTemplatesV15,
}))

import { openLocalProject } from './open-local.js'

function directory(name = 'fixture'): FileSystemDirectoryHandle {
  return { name } as FileSystemDirectoryHandle
}

describe('openLocalProject current canonical boundary', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    reforge.readJson.mockResolvedValue({ contentVersion: 15 })
    reforge.loadProjectV15From.mockResolvedValue({ manifest: { contentVersion: 15 } })
    reforge.loadAllAuthorScenesV15.mockResolvedValue([{ id: 'scene-a' }])
    reforge.loadStampTemplatesV15.mockResolvedValue([{ id: 'stamp-a' }])
  })

  test('opens contentVersion 15 through the canonical loader only', async () => {
    const opened = await openLocalProject(directory())

    expect(opened).toMatchObject({
      kind: 'v15',
      scenes: [{ id: 'scene-a' }],
      stamps: [{ id: 'stamp-a' }],
      scriptChunks: {},
    })
    expect(reforge.loadProjectV15From).toHaveBeenCalledOnce()
    expect(reforge.loadAllAuthorScenesV15).toHaveBeenCalledOnce()
    expect(reforge.loadStampTemplatesV15).toHaveBeenCalledOnce()
    expect(reforge.dispose).not.toHaveBeenCalled()
  })

  test.each([12, 13, 14])('rejects contentVersion %s before loading project data', async (version) => {
    reforge.readJson.mockResolvedValue({ contentVersion: version })

    await expect(openLocalProject(directory(`legacy-v${version}`))).rejects.toThrow(
      `contentVersion ${version}；开发期编辑器只接受当前 contentVersion 15`,
    )
    expect(reforge.loadProjectV15From).not.toHaveBeenCalled()
    expect(reforge.dispose).toHaveBeenCalledOnce()
  })

  test('reports missing or malformed manifest with the directory name', async () => {
    reforge.readJson.mockRejectedValue(new Error('404 manifest.json'))

    await expect(openLocalProject(directory('empty-folder'))).rejects.toThrow(
      '打开工程失败:「empty-folder」里没有有效的 manifest.json(404 manifest.json)',
    )
    expect(reforge.dispose).toHaveBeenCalledOnce()
  })

  test('wraps canonical loader failures without falling back to an older loader', async () => {
    reforge.loadProjectV15From.mockRejectedValue(new Error('bad current schema'))

    await expect(openLocalProject(directory('bad-current'))).rejects.toThrow(
      'canonical v15 内容无效(bad current schema)',
    )
    expect(reforge.dispose).toHaveBeenCalledOnce()
  })
})
