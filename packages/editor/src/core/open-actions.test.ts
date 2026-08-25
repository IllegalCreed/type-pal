import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const {
  buildBlankProjectMock,
  cloneFromPalMock,
  httpSourceMock,
  openLocalProjectMock,
  writeProjectMock,
} = vi.hoisted(() => ({
    buildBlankProjectMock: vi.fn(),
    cloneFromPalMock: vi.fn(),
    httpSourceMock: vi.fn(),
    openLocalProjectMock: vi.fn(),
    writeProjectMock: vi.fn(),
  }))

vi.mock('./seed.js', () => ({ buildBlankProject: buildBlankProjectMock }))
vi.mock('./clone.js', () => ({ cloneFromPal: cloneFromPalMock }))
vi.mock('./open-local.js', () => ({ openLocalProject: openLocalProjectMock }))
vi.mock('./project-io.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./project-io.js')>()),
  writeProject: writeProjectMock,
}))
vi.mock('@type-pal/reforge', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@type-pal/reforge')>()),
  httpSource: httpSourceMock,
}))

import { finishOpen, newBlankProject, newFromPal, saveProjectAs } from './open-actions.js'
import { createLocalWorkspaceContext } from './workspace-context.js'

const PAL_WORKSPACE_ID = 'b71e6905-4422-4f0b-9bc4-a65f23f4c721'
const palManifest = {
  id: 'pal',
  name: 'PAL',
  contentVersion: 18,
  minimumSaveVersion: 8,
  defaultEntryId: 'main',
  assets: { catalog: 'assets/index.json', roles: {} },
  content: { scenes: 'content/scenes/', maps: 'content/maps/index.json' },
  entryPoints: [
    {
      id: 'main',
      label: '主要入口',
      scene: 's001',
      startWorld: { party: [], money: 0, inventory: [] },
    },
  ],
}

function palJsonFiles(): Record<string, unknown> {
  return {
    '.type-pal/pal-development.json': {
      kind: 'type-pal-editor-pal-development',
      version: 1,
      workspaceId: PAL_WORKSPACE_ID,
      projectId: 'pal',
    },
    'manifest.json': palManifest,
    'assets/index.json': { version: 1, assets: {} },
    'content/scenes/index.json': ['s001'],
    'content/maps/index.json': { version: 1, maps: [] },
  }
}

function jsonDirectory(
  files: Record<string, unknown>,
  name = 'pal',
): FileSystemDirectoryHandle {
  const nested = new Map<string, unknown>()
  for (const [path, value] of Object.entries(files)) nested.set(path, value)
  const directory = (prefix: string, directoryName: string): FileSystemDirectoryHandle => {
    const handle = {
      kind: 'directory',
      name: directoryName,
      async getDirectoryHandle(child: string) {
        const childPrefix = `${prefix}${child}/`
        if (![...nested.keys()].some((path) => path.startsWith(childPrefix)))
          throw new DOMException(child, 'NotFoundError')
        return directory(childPrefix, child)
      },
      async getFileHandle(fileName: string) {
        const path = `${prefix}${fileName}`
        if (!nested.has(path)) throw new DOMException(fileName, 'NotFoundError')
        return {
          kind: 'file',
          name: fileName,
          async getFile() {
            return new Blob([JSON.stringify(nested.get(path))]) as File
          },
        } as FileSystemFileHandle
      },
      async isSameEntry(other: FileSystemHandle) {
        return other === handle
      },
      __setJson(path: string, value: unknown) {
        nested.set(path, value)
      },
    }
    return handle as unknown as FileSystemDirectoryHandle
  }
  return directory('', name)
}

function sourceFromJson(files: Record<string, unknown>) {
  return {
    async readJson<T>(path: string) {
      if (!(path in files)) throw new Error(`404 ${path}`)
      return structuredClone(files[path]) as T
    },
  }
}

function installMemoryIndexedDb(): void {
  const records = new Map<string, unknown>()
  let upgradePending = true
  const request = <T>(run: () => T): IDBRequest<T> => {
    const value = {
      result: undefined as T,
      error: null as DOMException | null,
      onsuccess: null as ((event: Event) => void) | null,
      onerror: null as ((event: Event) => void) | null,
    }
    queueMicrotask(() => {
      try {
        value.result = run()
        value.onsuccess?.(new Event('success'))
      } catch (error) {
        value.error = error instanceof DOMException ? error : new DOMException(String(error))
        value.onerror?.(new Event('error'))
      }
    })
    return value as unknown as IDBRequest<T>
  }
  const store = {
    put: (value: { workspaceId: string }) =>
      request(() => {
        records.set(value.workspaceId, value)
        return value.workspaceId
      }),
    get: (key: string) => request(() => records.get(key)),
    getAll: () => request(() => [...records.values()]),
  }
  const database = {
    objectStoreNames: { contains: () => true },
    deleteObjectStore: () => records.clear(),
    createObjectStore: () => store,
    transaction: () => {
      const transaction = {
        error: null,
        oncomplete: null as ((event: Event) => void) | null,
        onerror: null as ((event: Event) => void) | null,
        onabort: null as ((event: Event) => void) | null,
        objectStore: () => ({
          put: (value: { workspaceId: string }) => {
            const result = store.put(value)
            queueMicrotask(() =>
              queueMicrotask(() => transaction.oncomplete?.(new Event('complete'))),
            )
            return result
          },
          get: (key: string) => {
            const result = store.get(key)
            queueMicrotask(() =>
              queueMicrotask(() => transaction.oncomplete?.(new Event('complete'))),
            )
            return result
          },
          getAll: () => {
            const result = store.getAll()
            queueMicrotask(() =>
              queueMicrotask(() => transaction.oncomplete?.(new Event('complete'))),
            )
            return result
          },
        }),
      }
      return transaction
    },
  }
  vi.stubGlobal('indexedDB', {
    open: () => {
      const openRequest = {
        result: database,
        error: null,
        onupgradeneeded: null as ((event: Event) => void) | null,
        onsuccess: null as ((event: Event) => void) | null,
        onerror: null as ((event: Event) => void) | null,
      }
      queueMicrotask(() => {
        if (upgradePending) {
          upgradePending = false
          openRequest.onupgradeneeded?.(new Event('upgradeneeded'))
        }
        openRequest.onsuccess?.(new Event('success'))
      })
      return openRequest
    },
  })
}

function emptyDirectoryHandle(name = 'empty'): FileSystemDirectoryHandle {
  const handle = {
    kind: 'directory',
    name,
    entries: vi.fn(async function* () {}),
    async getDirectoryHandle(child: string) {
      throw new DOMException(child, 'NotFoundError')
    },
    async getFileHandle(child: string) {
      throw new DOMException(child, 'NotFoundError')
    },
    async isSameEntry(other: FileSystemHandle) {
      return other === handle
    },
  }
  return handle as unknown as FileSystemDirectoryHandle
}

function nonEmptyDir(name = 'occupied'): FileSystemDirectoryHandle {
  const missing = (): never => {
    throw new DOMException('missing', 'NotFoundError')
  }
  const handle = {
    kind: 'directory',
    name,
    entries: async function* () {
      yield ['manifest.json', { kind: 'file', name: 'manifest.json' }]
    },
    getDirectoryHandle: async () => missing(),
    getFileHandle: async () => missing(),
    isSameEntry: async (other: FileSystemHandle) => other === handle,
  }
  return handle as unknown as FileSystemDirectoryHandle
}

describe('project creation and Save As target policy', () => {
  afterEach(() => vi.unstubAllGlobals())

  beforeEach(() => {
    vi.clearAllMocks()
    installMemoryIndexedDb()
    const dir = nonEmptyDir()
    vi.stubGlobal('window', {
      isSecureContext: true,
      location: { origin: 'http://localhost:6010' },
      showDirectoryPicker: vi.fn(async () => dir),
    })
    buildBlankProjectMock.mockResolvedValue({
      'manifest.json': {
        version: 1,
        contentVersion: 18,
        minimumSaveVersion: 8,
        id: 'blank',
        name: 'Blank',
        defaultEntryId: 'main',
        assets: { catalog: 'assets/index.json', roles: {} },
        content: { scenes: 'content/scenes/', maps: 'content/maps/index.json' },
        entryPoints: [
          {
            id: 'main',
            label: '主要入口',
            scene: 'start',
            startWorld: { party: ['hero'], money: 0, inventory: [] },
          },
        ],
      },
    })
    httpSourceMock.mockReturnValue({
      readJson: vi.fn(async () => ({ id: 'pal' })),
    })
  })

  test('newBlankProject refuses a non-empty target before any project write', async () => {
    await expect(newBlankProject()).rejects.toThrow('目标文件夹必须为空')
    expect(writeProjectMock).not.toHaveBeenCalled()
  })

  test('newFromPal refuses a non-empty target before clone mutation', async () => {
    await expect(newFromPal('projects/pal', vi.fn())).rejects.toThrow('目标文件夹必须为空')
    expect(cloneFromPalMock).not.toHaveBeenCalled()
  })

  test('Save As refuses a non-empty target before serialization, copy or write', async () => {
    const buildFiles = vi.fn(async () => ({ 'manifest.json': { id: 'pal' } }))
    await expect(
      saveProjectAs(createLocalWorkspaceContext('pal', 'local-directory'), buildFiles),
    ).rejects.toThrow('目标文件夹必须为空')
    expect(buildFiles).not.toHaveBeenCalled()
    expect(writeProjectMock).not.toHaveBeenCalled()
  })

  test('Save As rejects an empty target nested inside the source before serialization', async () => {
    const target = {
      kind: 'directory',
      name: 'backup',
      entries: async function* () {},
      getDirectoryHandle: async () => {
        throw new DOMException('missing', 'NotFoundError')
      },
      getFileHandle: async () => {
        throw new DOMException('missing', 'NotFoundError')
      },
      isSameEntry: vi.fn(async (other: FileSystemHandle) => other === target),
    } as unknown as FileSystemDirectoryHandle
    const source = {
      kind: 'directory',
      name: 'source',
      resolve: vi.fn(async (candidate: FileSystemHandle) =>
        candidate === target ? ['backup'] : null,
      ),
    } as unknown as FileSystemDirectoryHandle
    vi.mocked(window.showDirectoryPicker).mockResolvedValue(target)
    const buildFiles = vi.fn(async () => ({ 'manifest.json': { id: 'pal' } }))

    await expect(
      saveProjectAs(createLocalWorkspaceContext('pal', 'local-directory'), buildFiles, source),
    ).rejects.toThrow('不能是源项目目录本身或其子目录')
    expect(buildFiles).not.toHaveBeenCalled()
    expect(writeProjectMock).not.toHaveBeenCalled()
  })

  test.each([
    {
      name: 'pending files',
      files: { 'manifest.json': { id: 'pal' }, '.TYPE-PAL/workspace.json': {} },
      removePaths: [] as string[],
    },
    {
      name: 'remove paths',
      files: { 'manifest.json': { id: 'pal' } },
      removePaths: ['.type-pal./workspace.json'],
    },
  ])('Save As rejects identity namespace in $name before copying the source', async ({
    files,
    removePaths,
  }) => {
    const target = emptyDirectoryHandle('target')
    const sourceEntries = vi.fn(async function* () {
      yield ['asset.bin', { kind: 'file', name: 'asset.bin' }]
    })
    const source = {
      kind: 'directory',
      name: 'source',
      resolve: vi.fn(async () => null),
      entries: sourceEntries,
    } as unknown as FileSystemDirectoryHandle
    vi.mocked(window.showDirectoryPicker).mockResolvedValue(target)

    await expect(
      saveProjectAs(
        createLocalWorkspaceContext('pal', 'local-directory'),
        async () => files,
        source,
        removePaths,
      ),
    ).rejects.toThrow('不能覆盖 workspace identity')
    expect(sourceEntries).not.toHaveBeenCalled()
    expect(writeProjectMock).not.toHaveBeenCalled()
  })

  test('Save As rechecks source/target relation after slow source read and before first copy write', async () => {
    const target = emptyDirectoryHandle('target')
    const sourceFile = {
      kind: 'file',
      name: 'asset.bin',
      getFile: vi.fn(async () => new Blob(['asset']) as File),
    } as unknown as FileSystemFileHandle
    const sourceEntries = vi.fn(async function* () {
      yield ['asset.bin', sourceFile] as const
    })
    const resolve = vi
      .fn<() => Promise<string[] | null>>()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValue(['backup'])
    const source = {
      kind: 'directory',
      name: 'source',
      resolve,
      entries: sourceEntries,
    } as unknown as FileSystemDirectoryHandle
    vi.mocked(window.showDirectoryPicker).mockResolvedValue(target)

    await expect(
      saveProjectAs(
        createLocalWorkspaceContext('pal', 'local-directory'),
        async () => ({ 'manifest.json': { id: 'pal' } }),
        source,
      ),
    ).rejects.toThrow('不能是源项目目录本身或其子目录')
    expect(sourceEntries).toHaveBeenCalledTimes(1)
    expect(sourceFile.getFile).toHaveBeenCalledTimes(1)
    expect(writeProjectMock).not.toHaveBeenCalled()
  })

  test('local open rejects a workspace marker that appears during canonical loading', async () => {
    let sandboxMarker: string | undefined
    const metadataDir = {
      kind: 'directory',
      name: 'changing-workspace',
      async getDirectoryHandle(name: string) {
        if (name !== '.type-pal') throw new DOMException(name, 'NotFoundError')
        return {
          kind: 'directory',
          name,
          async getFileHandle(fileName: string) {
            if (fileName !== 'workspace.json' || sandboxMarker === undefined)
              throw new DOMException(fileName, 'NotFoundError')
            return {
              kind: 'file',
              name: fileName,
              async getFile() {
                return new Blob([sandboxMarker!]) as File
              },
            }
          },
        }
      },
    } as unknown as FileSystemDirectoryHandle
    openLocalProjectMock.mockImplementationOnce(async () => {
      sandboxMarker = JSON.stringify({
        kind: 'type-pal-editor-workspace',
        version: 1,
        mode: 'sandbox',
        workspaceId: '77777777-7777-4777-8777-777777777777',
        projectId: 'pal',
        source: 'review-copy',
      })
      return { project: { manifest: { id: 'pal' } } }
    })

    await expect(finishOpen(metadataDir)).rejects.toThrow(
      '工作区 identity 在项目载入期间发生变化',
    )
  })

  test('PAL target snapshot changing during canonical load is rejected before registration', async () => {
    const files = palJsonFiles()
    const dir = jsonDirectory(files) as FileSystemDirectoryHandle & {
      __setJson(path: string, value: unknown): void
    }
    httpSourceMock.mockReturnValue(sourceFromJson(files))
    openLocalProjectMock.mockImplementationOnce(async () => {
      dir.__setJson('content/maps/index.json', { version: 1, maps: ['external-change'] })
      return { project: { manifest: palManifest } }
    })

    await expect(finishOpen(dir)).rejects.toThrow(
      '关键快照与本次会话预期不一致',
    )
  })

  test('trusted PAL HTTP proof changing during canonical load is rejected', async () => {
    const targetFiles = palJsonFiles()
    const httpFiles = palJsonFiles()
    const dir = jsonDirectory(targetFiles)
    httpSourceMock.mockReturnValue(sourceFromJson(httpFiles))
    openLocalProjectMock.mockImplementationOnce(async () => {
      httpFiles['content/scenes/index.json'] = ['s001', 'publication-change']
      return { project: { manifest: palManifest } }
    })

    await expect(finishOpen(dir)).rejects.toThrow(
      'HTTP 快照在载入期间发生变化',
    )
  })

  test('two concurrent first opens of one unmarked directory reuse one workspace identity', async () => {
    installMemoryIndexedDb()
    const dir = jsonDirectory({ 'manifest.json': { id: 'local' } }, 'local')
    openLocalProjectMock.mockResolvedValue({ project: { manifest: { id: 'local' } } })

    const [first, second] = await Promise.all([finishOpen(dir), finishOpen(dir)])

    expect(first.workspace.workspaceId).toBe(second.workspace.workspaceId)
    expect(first.workspace.mode).toBe('local-project')
    expect(second.workspace.mode).toBe('local-project')
    expect(first.dir).toBe(dir)
    expect(second.dir).toBe(dir)
  })
})
