import { beforeEach, describe, expect, test, vi } from 'vitest'

const reforge = vi.hoisted(() => ({
  dispose: vi.fn(),
  readJson: vi.fn(),
  loadProjectV16From: vi.fn(),
  loadAllAuthorScenesV16: vi.fn(),
  loadStampTemplatesV16: vi.fn(),
}))

vi.mock('@type-pal/reforge', () => ({
  fsaSource: vi.fn(() => ({
    readJson: reforge.readJson,
    dispose: reforge.dispose,
  })),
  loadProjectV16From: reforge.loadProjectV16From,
  loadAllAuthorScenesV16: reforge.loadAllAuthorScenesV16,
  loadStampTemplatesV16: reforge.loadStampTemplatesV16,
}))

import { openLocalProject } from './open-local.js'

function directory(name = 'fixture'): FileSystemDirectoryHandle {
  return { name } as FileSystemDirectoryHandle
}

describe('openLocalProject current canonical boundary', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    reforge.readJson.mockResolvedValue({ contentVersion: 16 })
    reforge.loadProjectV16From.mockResolvedValue({ manifest: { contentVersion: 16 } })
    reforge.loadAllAuthorScenesV16.mockResolvedValue([{ id: 'scene-a' }])
    reforge.loadStampTemplatesV16.mockResolvedValue([{ id: 'stamp-a' }])
  })

  test('opens contentVersion 16 through the canonical loader only', async () => {
    const opened = await openLocalProject(directory())

    expect(opened).toMatchObject({
      kind: 'v16',
      scenes: [{ id: 'scene-a' }],
      stamps: [{ id: 'stamp-a' }],
      scriptChunks: {},
    })
    expect(reforge.loadProjectV16From).toHaveBeenCalledOnce()
    expect(reforge.loadAllAuthorScenesV16).toHaveBeenCalledOnce()
    expect(reforge.loadStampTemplatesV16).toHaveBeenCalledOnce()
    expect(reforge.dispose).not.toHaveBeenCalled()
  })

  test.each([
    12, 13, 14, 15,
  ])('rejects contentVersion %s before loading project data', async (version) => {
    reforge.readJson.mockResolvedValue({ contentVersion: version })

    await expect(openLocalProject(directory(`legacy-v${version}`))).rejects.toThrow(
      `contentVersion ${version}；开发期编辑器只接受当前 contentVersion 16`,
    )
    expect(reforge.loadProjectV16From).not.toHaveBeenCalled()
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
    reforge.loadProjectV16From.mockRejectedValue(new Error('bad current schema'))

    await expect(openLocalProject(directory('bad-current'))).rejects.toThrow(
      'canonical v16 内容无效(bad current schema)',
    )
    expect(reforge.dispose).toHaveBeenCalledOnce()
  })
})
