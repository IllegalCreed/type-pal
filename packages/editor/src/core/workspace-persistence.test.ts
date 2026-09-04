import type { CurrentManifest } from '@type-pal/content'
import { assembleCurrentProject, type FileSource } from '@type-pal/reforge'
import { beforeEach, describe, expect, test, vi } from 'vitest'

const handleStore = vi.hoisted(() => ({
  load: vi.fn(),
  find: vi.fn(),
  saveUnderLock: vi.fn(),
  discoveryTail: Promise.resolve() as Promise<void>,
}))

vi.mock('./handle-store.js', () => ({
  loadWorkspaceRecord: (...args: unknown[]) => handleStore.load(...args),
  findWorkspaceRecordByHandle: (...args: unknown[]) => handleStore.find(...args),
  withWorkspaceDiscoveryLock: async (operation: () => Promise<unknown>) => {
    const previous = handleStore.discoveryTail
    let release!: () => void
    handleStore.discoveryTail = new Promise<void>((resolve) => {
      release = resolve
    })
    await previous
    try {
      return await operation()
    } finally {
      release()
    }
  },
  withWorkspaceRegistrationLock: async (
    _workspaceId: string,
    operation: (lock: object) => Promise<unknown>,
  ) => operation(Object.freeze({})),
  saveWorkspaceHandleUnderLock: (...args: unknown[]) => handleStore.saveUnderLock(...args),
}))

import { sha256Hex } from './binary-signature.js'
import { DeleteAssetCommand } from './commands.js'
import { EditSession } from './edit-session.js'
import { collectCurrentProjectReferenceIndex } from './project-reference-adapters.js'
import { serializeProject, toEditorState, writeFile, writeProject } from './project-io.js'
import {
  assertSamePalDevelopmentProof,
  createLocalWorkspaceContext,
  createPalDevelopmentWorkspaceContext,
  createSandboxWorkspaceContext,
  fingerprintJsonFiles,
  PAL_DEVELOPMENT_SENTINEL_PATH,
  palFingerprintPaths,
  parseSandboxWorkspaceMarker,
  SANDBOX_WORKSPACE_MARKER_PATH,
} from './workspace-context.js'
import {
  type AuthorizedWorkspaceMutation,
  type AuthorizedWorkspaceTarget,
  authorizeBoundWorkspaceTarget,
  authorizedDirectory,
  authorizeFirstSaveTarget,
  createSaveAsWorkspaceContext,
  inspectWorkspaceMetadata,
  preflightFirstSaveTarget,
  registerAuthorizedWorkspaceMutation,
  resolveOpenedWorkspaceContext,
  withAuthorizedWorkspaceMutation,
} from './workspace-persistence.js'

interface MemFile {
  kind: 'file'
  name: string
  bytes: Uint8Array<ArrayBufferLike>
}

interface MemDir {
  kind: 'directory'
  name: string
  children: Map<string, MemDir | MemFile>
  writes: number
}

function emptyDir(name = 'workspace'): MemDir {
  return { kind: 'directory', name, children: new Map(), writes: 0 }
}

function bytes(value: string | Uint8Array): Uint8Array {
  return typeof value === 'string' ? new TextEncoder().encode(value) : value
}

function setFile(root: MemDir, path: string, value: string | Uint8Array): void {
  const segments = path.split('/')
  const fileName = segments.pop()!
  let current = root
  for (const segment of segments) {
    const found = current.children.get(segment)
    if (found?.kind === 'file') throw new Error(`${segment} is a file`)
    if (found) current = found
    else {
      const child = emptyDir(segment)
      current.children.set(segment, child)
      current = child
    }
  }
  current.children.set(fileName, { kind: 'file', name: fileName, bytes: bytes(value) })
}

function jsonFile(root: MemDir, path: string, value: unknown): void {
  setFile(root, path, `${JSON.stringify(value, null, 2)}\n`)
}

function getFile(root: MemDir, path: string): MemFile | undefined {
  const segments = path.split('/')
  let node: MemDir | MemFile = root
  for (const segment of segments) {
    if (node.kind !== 'directory') return undefined
    const next = node.children.get(segment)
    if (!next) return undefined
    node = next
  }
  return node.kind === 'file' ? node : undefined
}

async function toBytes(value: unknown): Promise<Uint8Array> {
  if (typeof value === 'string') return new TextEncoder().encode(value)
  if (value instanceof Blob) return new Uint8Array(await value.arrayBuffer())
  if (value instanceof ArrayBuffer) return new Uint8Array(value)
  if (ArrayBuffer.isView(value))
    return new Uint8Array(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength))
  throw new Error(`unsupported write ${String(value)}`)
}

function dirHandle(node: MemDir): FileSystemDirectoryHandle {
  return {
    kind: 'directory',
    name: node.name,
    async isSameEntry(other: FileSystemHandle) {
      return (other as unknown as { __node?: MemDir }).__node === node
    },
    async *entries() {
      for (const [name, child] of node.children)
        yield [name, child.kind === 'directory' ? dirHandle(child) : fileHandle(node, child)]
    },
    async getDirectoryHandle(name: string, options?: { create?: boolean }) {
      let child = node.children.get(name)
      if (!child && options?.create) {
        child = emptyDir(name)
        node.children.set(name, child)
      }
      if (!child || child.kind !== 'directory') throw new DOMException(name, 'NotFoundError')
      return dirHandle(child)
    },
    async getFileHandle(name: string, options?: { create?: boolean }) {
      let child = node.children.get(name)
      if (!child && options?.create) {
        child = { kind: 'file', name, bytes: new Uint8Array() }
        node.children.set(name, child)
      }
      if (!child || child.kind !== 'file') throw new DOMException(name, 'NotFoundError')
      return fileHandle(node, child)
    },
    async removeEntry(name: string) {
      if (!node.children.delete(name)) throw new DOMException(name, 'NotFoundError')
    },
    __node: node,
  } as unknown as FileSystemDirectoryHandle
}

function fileHandle(parent: MemDir, file: MemFile): FileSystemFileHandle {
  return {
    kind: 'file',
    name: file.name,
    async getFile() {
      return new Blob([file.bytes as BlobPart]) as File
    },
    async createWritable() {
      let pending: Uint8Array<ArrayBufferLike> = new Uint8Array()
      return {
        async write(value: unknown) {
          pending = await toBytes(value)
        },
        async close() {
          file.bytes = pending
          parent.writes++
        },
      }
    },
  } as unknown as FileSystemFileHandle
}

const PAL_ID = 'b71e6905-4422-4f0b-9bc4-a65f23f4c721'
const SANDBOX_ID = '44444444-4444-4444-8444-444444444444'
const LOCAL_ID = '55555555-5555-4555-8555-555555555555'

const manifest = {
  id: 'pal',
  name: 'PAL',
  contentVersion: 19,
  minimumSaveVersion: 8,
  defaultEntryId: 'main',
  content: {
    scenes: 'content/scenes/',
    maps: 'content/maps/index.json',
  },
  assets: { catalog: 'assets/index.json', roles: {} },
  entryPoints: [
    {
      id: 'main',
      label: '主要入口',
      scene: 's001',
      startWorld: { party: [], money: 0, inventory: [] },
    },
  ],
} satisfies CurrentManifest

const sentinel = {
  kind: 'type-pal-editor-pal-development',
  version: 1,
  workspaceId: PAL_ID,
  projectId: 'pal',
} as const

function palFiles(): Record<string, unknown> {
  return {
    [PAL_DEVELOPMENT_SENTINEL_PATH]: sentinel,
    'manifest.json': manifest,
    'assets/index.json': { version: 1, assets: {} },
    'content/scenes/index.json': ['s001', 's002'],
    'content/maps/index.json': { version: 1, maps: ['m001', 'm002'] },
  }
}

function sourceFromJson(files: Record<string, unknown>): FileSource {
  return {
    async readJson<T>(path: string) {
      if (!(path in files)) throw new Error(`404 ${path}`)
      return structuredClone(files[path]) as T
    },
    async readText(path: string) {
      return JSON.stringify(await this.readJson(path))
    },
    async readBytes(path: string) {
      return new TextEncoder().encode(await this.readText(path)).buffer
    },
    async urlFor(path: string) {
      return path
    },
  }
}

function dirFromJson(files: Record<string, unknown>, name = 'pal'): MemDir {
  const root = emptyDir(name)
  for (const [path, value] of Object.entries(files)) jsonFile(root, path, value)
  return root
}

describe('workspace persistence policy', () => {
  beforeEach(() => {
    handleStore.load.mockReset().mockResolvedValue(null)
    handleStore.find.mockReset().mockResolvedValue(null)
    handleStore.saveUnderLock.mockReset().mockResolvedValue(undefined)
    handleStore.discoveryTail = Promise.resolve()
  })

  test('普通项目首存只接受空目录；未经授权的 writeFile 在 FSA mutation 前失败', async () => {
    const workspace = createLocalWorkspaceContext('local', 'save-as', LOCAL_ID)
    const occupied = emptyDir()
    setFile(occupied, 'keep.txt', 'keep')
    await expect(preflightFirstSaveTarget(workspace, dirHandle(occupied))).rejects.toThrow(
      '目标文件夹必须为空',
    )
    expect(occupied.writes).toBe(0)

    await expect(writeFile({} as AuthorizedWorkspaceTarget, 'forbidden.txt', 'no')).rejects.toThrow(
      '未经 workspace persistence policy 授权',
    )
    expect(getFile(occupied, 'forbidden.txt')).toBeUndefined()
  })

  test('沙盒先提交最小受限 marker，随后只能由同 workspaceId 的绑定句柄继续写', async () => {
    const root = emptyDir()
    const handle = dirHandle(root)
    const workspace = createSandboxWorkspaceContext('pal', 'ui-samples', SANDBOX_ID)
    await preflightFirstSaveTarget(workspace, handle)
    const target = await authorizeFirstSaveTarget(workspace, handle)

    expect(() => authorizedDirectory(target as unknown as AuthorizedWorkspaceMutation)).toThrow(
      'active workspace mutation',
    )
    await withAuthorizedWorkspaceMutation(target, async (mutation) => {
      expect(authorizedDirectory(mutation)).toBe(handle)
    })
    const marker = JSON.parse(
      new TextDecoder().decode(getFile(root, SANDBOX_WORKSPACE_MARKER_PATH)!.bytes),
    ) as Record<string, unknown>
    expect(marker).toEqual({
      kind: 'type-pal-editor-workspace',
      version: 1,
      mode: 'sandbox',
      workspaceId: SANDBOX_ID,
      projectId: 'pal',
      source: 'ui-samples',
    })
    expect(marker).not.toHaveProperty('persistencePolicy')

    handleStore.load.mockResolvedValue({
      workspaceId: SANDBOX_ID,
      projectId: 'pal',
      mode: 'sandbox',
      source: 'ui-samples',
      handle,
    })
    await expect(authorizeBoundWorkspaceTarget(workspace, handle)).resolves.toBeDefined()
    await expect(
      authorizeBoundWorkspaceTarget(workspace, dirHandle(emptyDir('other'))),
    ).rejects.toThrow('不是当前工作区已绑定的目录')
  })

  test('沙盒授权阶段零写；两个 identity 争用同一空目录时只有一个 marker 能提交', async () => {
    const root = emptyDir('shared-target')
    const handle = dirHandle(root)
    const first = createSandboxWorkspaceContext('pal', 'ui-samples', SANDBOX_ID)
    const second = createSandboxWorkspaceContext(
      'pal',
      'review-copy',
      '88888888-8888-4888-8888-888888888888',
    )
    const firstTarget = await authorizeFirstSaveTarget(first, handle)
    const secondTarget = await authorizeFirstSaveTarget(second, handle)
    expect(root.writes).toBe(0)
    expect(getFile(root, SANDBOX_WORKSPACE_MARKER_PATH)).toBeUndefined()

    const results = await Promise.allSettled([
      withAuthorizedWorkspaceMutation(firstTarget, async () => undefined),
      withAuthorizedWorkspaceMutation(secondTarget, async () => undefined),
    ])
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1)
    const sidecarDir = root.children.get('.type-pal')
    expect(sidecarDir?.kind).toBe('directory')
    expect(sidecarDir?.kind === 'directory' ? sidecarDir.writes : -1).toBe(1)
    const marker = JSON.parse(
      new TextDecoder().decode(getFile(root, SANDBOX_WORKSPACE_MARKER_PATH)!.bytes),
    ) as { workspaceId: string }
    expect(marker.workspaceId).toBe(SANDBOX_ID)
  })

  test('授权 capability 不能靠对象展开换目录伪造，bound 也不能由调用方自证', async () => {
    const root = emptyDir('authorized')
    const handle = dirHandle(root)
    const workspace = createLocalWorkspaceContext('local', 'save-as', LOCAL_ID)
    const target = await authorizeFirstSaveTarget(workspace, handle)
    const forged = { ...target, dir: dirHandle(emptyDir('forged')) } as AuthorizedWorkspaceTarget
    await expect(writeFile(forged, 'manifest.json', {})).rejects.toThrow('未经 workspace')

    handleStore.load.mockResolvedValue({
      workspaceId: LOCAL_ID,
      projectId: 'local',
      mode: 'local-project',
      source: 'save-as',
      handle: dirHandle(emptyDir('registered-elsewhere')),
    })
    await expect(authorizeBoundWorkspaceTarget(workspace, handle)).rejects.toThrow(
      '不是当前工作区已绑定的目录',
    )
  })

  test('写入完成后的 recent 登记复用同一 active identity lock', async () => {
    const root = emptyDir('registered')
    const handle = dirHandle(root)
    const workspace = createLocalWorkspaceContext('local', 'save-as', LOCAL_ID)
    const target = await authorizeFirstSaveTarget(workspace, handle)

    await withAuthorizedWorkspaceMutation(target, async (mutation) => {
      await writeFile(mutation, 'manifest.json', { id: 'local' })
      await registerAuthorizedWorkspaceMutation(mutation, workspace, 'registered')
    })

    expect(handleStore.saveUnderLock).toHaveBeenCalledTimes(1)
    expect(handleStore.saveUnderLock.mock.calls[0]?.slice(1)).toEqual([
      workspace,
      'registered',
      handle,
    ])
  })

  test('一次性 capability 完成后不可重放，并发消费只允许一个写操作进入', async () => {
    const firstRoot = emptyDir('replay')
    const workspace = createLocalWorkspaceContext('local', 'save-as', LOCAL_ID)
    const firstTarget = await authorizeFirstSaveTarget(workspace, dirHandle(firstRoot))
    await writeFile(firstTarget, 'first.json', { ok: true })
    await expect(writeFile(firstTarget, 'replayed.json', { no: true })).rejects.toThrow(
      '授权已消费或正在使用',
    )
    expect(getFile(firstRoot, 'replayed.json')).toBeUndefined()

    const concurrentRoot = emptyDir('concurrent')
    const concurrentWorkspace = createLocalWorkspaceContext(
      'local',
      'save-as',
      '66666666-6666-4666-8666-666666666666',
    )
    const concurrentTarget = await authorizeFirstSaveTarget(
      concurrentWorkspace,
      dirHandle(concurrentRoot),
    )
    const results = await Promise.allSettled([
      writeFile(concurrentTarget, 'one.json', 1),
      writeFile(concurrentTarget, 'two.json', 2),
    ])
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1)
    expect(concurrentRoot.writes).toBe(1)
  })

  test('普通 HTTP 项目首存部分写入后只允许本会话同一目录续写', async () => {
    const workspace = createLocalWorkspaceContext('local', 'local-directory', LOCAL_ID)
    const root = emptyDir('local-first-save')
    const handle = dirHandle(root)
    const interrupted = await authorizeFirstSaveTarget(workspace, handle)
    await expect(
      withAuthorizedWorkspaceMutation(interrupted, async (mutation) => {
        await writeFile(mutation, 'manifest.json', { id: 'local' })
        throw new Error('simulated first-save interruption')
      }),
    ).rejects.toThrow('simulated first-save interruption')

    const retry = await authorizeFirstSaveTarget(workspace, handle, {
      resumesInterruptedAttempt: true,
    })
    await expect(writeFile(retry, 'content/retry.json', { ok: true })).resolves.toBeUndefined()

    const unrelated = createLocalWorkspaceContext(
      'local',
      'local-directory',
      '99999999-9999-4999-8999-999999999999',
    )
    await expect(
      authorizeFirstSaveTarget(unrelated, handle, { resumesInterruptedAttempt: true }),
    ).rejects.toThrow('目标文件夹必须为空')
  })

  test('只读预检或未消费授权不会签发 local 首存续写资格', async () => {
    const workspace = createLocalWorkspaceContext(
      'local',
      'local-directory',
      'abababab-abab-4bab-8bab-abababababab',
    )
    const root = emptyDir('selected-but-never-written')
    const handle = dirHandle(root)
    await preflightFirstSaveTarget(workspace, handle)
    await authorizeFirstSaveTarget(workspace, handle)
    setFile(root, 'external.txt', 'not written by this editor')

    await expect(
      authorizeFirstSaveTarget(workspace, handle, { resumesInterruptedAttempt: true }),
    ).rejects.toThrow('目标文件夹必须为空')
    expect(root.writes).toBe(0)
  })

  test('空目录句柄若已属于另一 workspace，新的首存必须在零写时拒绝', async () => {
    const root = emptyDir('cleared-but-still-bound')
    const handle = dirHandle(root)
    handleStore.find.mockResolvedValue({
      workspaceId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      projectId: 'local',
      mode: 'local-project',
      source: 'local-directory',
      handle,
    })
    const workspace = createLocalWorkspaceContext('local', 'local-directory', LOCAL_ID)

    await expect(authorizeFirstSaveTarget(workspace, handle)).rejects.toThrow(
      '已经绑定到另一个 workspace identity',
    )
    expect(root.writes).toBe(0)
  })

  test('PAL workspace 已绑定 A 时，完全相同的副本 B 也必须在首写前零写拒绝', async () => {
    const files = palFiles()
    const context = await createPalDevelopmentWorkspaceContext(sourceFromJson(files), manifest)
    const rootA = dirFromJson(files, 'pal-a')
    const rootB = dirFromJson(files, 'pal-b')
    handleStore.load.mockResolvedValue({
      workspaceId: PAL_ID,
      projectId: 'pal',
      mode: 'pal-development',
      source: 'dev-http',
      handle: dirHandle(rootA),
    })

    await expect(authorizeFirstSaveTarget(context, dirHandle(rootB))).rejects.toThrow(
      '已绑定到另一个目录',
    )
    expect(rootB.writes).toBe(0)
    expect(getFile(rootB, 'content/changed.json')).toBeUndefined()
  })

  test('PAL bound 保存推进会话指纹；外部关键快照漂移后下一笔写入零写拒绝', async () => {
    const files = palFiles()
    const context = await createPalDevelopmentWorkspaceContext(sourceFromJson(files), manifest)
    const root = dirFromJson(files)
    const handle = dirHandle(root)
    const firstTarget = await authorizeFirstSaveTarget(context, handle)
    await writeFile(firstTarget, 'content/scenes/index.json', ['s001', 's002', 's003'])

    handleStore.load.mockResolvedValue({
      workspaceId: PAL_ID,
      projectId: 'pal',
      mode: 'pal-development',
      source: 'dev-http',
      handle,
    })
    const bound = await authorizeBoundWorkspaceTarget(context, handle)
    await writeFile(bound, 'content/author-note.json', { ok: true })
    const writesBeforeDrift = root.writes

    jsonFile(root, 'content/maps/index.json', { version: 1, maps: ['external-change'] })
    await expect(authorizeBoundWorkspaceTarget(context, handle)).rejects.toThrow(
      '关键快照与本次会话预期不一致',
    )
    expect(root.writes).toBe(writesBeforeDrift)
  })

  test('PAL 自身受控文件部分写入中断可在同句柄重试，夹杂外部漂移仍拒绝', async () => {
    const files = palFiles()
    const context = await createPalDevelopmentWorkspaceContext(sourceFromJson(files), manifest)
    const root = dirFromJson(files)
    const handle = dirHandle(root)
    const interrupted = await authorizeFirstSaveTarget(context, handle)

    await expect(
      withAuthorizedWorkspaceMutation(interrupted, async (mutation) => {
        await writeFile(mutation, 'content/scenes/index.json', ['s001', 'partial-editor-write'])
        throw new Error('simulated close failure')
      }),
    ).rejects.toThrow('simulated close failure')

    const retry = await authorizeFirstSaveTarget(context, handle, {
      resumesInterruptedAttempt: true,
    })
    await expect(writeFile(retry, 'content/retry.json', { ok: true })).resolves.toBeUndefined()

    const driftFiles = palFiles()
    const driftContext = await createPalDevelopmentWorkspaceContext(
      sourceFromJson(driftFiles),
      manifest,
    )
    const driftRoot = dirFromJson(driftFiles, 'pal-with-external-drift')
    const driftHandle = dirHandle(driftRoot)
    const driftTarget = await authorizeFirstSaveTarget(driftContext, driftHandle)
    await expect(
      withAuthorizedWorkspaceMutation(driftTarget, async (mutation) => {
        await writeFile(mutation, 'content/scenes/index.json', ['s001', 'partial-editor-write'])
        jsonFile(driftRoot, 'content/maps/index.json', {
          version: 1,
          maps: ['external-change'],
        })
        throw new Error('simulated close failure with drift')
      }),
    ).rejects.toThrow('simulated close failure with drift')
    await expect(
      authorizeFirstSaveTarget(driftContext, driftHandle, {
        resumesInterruptedAttempt: true,
      }),
    ).rejects.toThrow('关键快照与本次会话预期不一致')
  })

  test('PAL 写后校验只接受本次编辑器期望状态，不收编回调末尾的外部漂移', async () => {
    const files = palFiles()
    const context = await createPalDevelopmentWorkspaceContext(sourceFromJson(files), manifest)
    const root = dirFromJson(files)
    const handle = dirHandle(root)
    const target = await authorizeFirstSaveTarget(context, handle)

    await expect(
      withAuthorizedWorkspaceMutation(target, async (mutation) => {
        await writeFile(mutation, 'content/scenes/index.json', ['s001', 'editor-change'])
        await registerAuthorizedWorkspaceMutation(mutation, context, 'pal')
        // Simulate migration/external tooling landing after the editor's first write but before
        // the operation can advance its session precondition.
        jsonFile(root, 'content/maps/index.json', {
          version: 1,
          maps: ['external-change'],
        })
      }),
    ).rejects.toThrow('写入后的关键快照与本次编辑器操作不一致')
    expect(handleStore.saveUnderLock).not.toHaveBeenCalled()

    handleStore.load.mockResolvedValue({
      workspaceId: PAL_ID,
      projectId: 'pal',
      mode: 'pal-development',
      source: 'dev-http',
      handle,
    })
    await expect(authorizeBoundWorkspaceTarget(context, handle)).rejects.toThrow(
      '关键快照与本次会话预期不一致',
    )
  })

  test('PAL capability 在真正首写前重验，authorize 后目标变化仍零写', async () => {
    const files = palFiles()
    const context = await createPalDevelopmentWorkspaceContext(sourceFromJson(files), manifest)
    const root = dirFromJson(files)
    const target = await authorizeFirstSaveTarget(context, dirHandle(root))
    jsonFile(root, 'content/scenes/index.json', ['changed-after-authorize'])

    await expect(writeFile(target, 'content/changed.json', {})).rejects.toThrow(
      '关键快照与本次会话预期不一致',
    )
    expect(root.writes).toBe(0)
    expect(getFile(root, 'content/changed.json')).toBeUndefined()
  })

  test('项目写入和删除都不能覆盖 workspace identity 旁车', async () => {
    const root = emptyDir('local')
    const workspace = createLocalWorkspaceContext('local', 'save-as', LOCAL_ID)
    const target = await authorizeFirstSaveTarget(workspace, dirHandle(root))
    await expect(writeFile(target, SANDBOX_WORKSPACE_MARKER_PATH, {})).rejects.toThrow(
      '不能覆盖 workspace identity',
    )
    await expect(
      writeProject(
        target,
        { 'manifest.json': {} },
        { removePaths: [PAL_DEVELOPMENT_SENTINEL_PATH] },
      ),
    ).rejects.toThrow('不能覆盖 workspace identity')
    await expect(
      writeProject(
        target,
        { 'manifest.json': {} },
        {
          prevSnapshot: new Map([[SANDBOX_WORKSPACE_MARKER_PATH, 'old']]),
        },
      ),
    ).rejects.toThrow('不能覆盖 workspace identity')
    await expect(writeFile(target, '.TYPE-PAL/workspace.json', {})).rejects.toThrow(
      '不能覆盖 workspace identity',
    )
    await expect(
      writeProject(target, { 'manifest.json': {} }, { removePaths: ['.type-pal./workspace.json'] }),
    ).rejects.toThrow('不能覆盖 workspace identity')
    expect(root.writes).toBe(0)
  })

  test('资源删除保存后撤销再保存会同时恢复 catalog record 与原始二进制', async () => {
    const assetId = 'portrait.lifecycle'
    const assetPath = 'assets/authored/portraits/lifecycle.png'
    const previousBytes = Uint8Array.from([0x89, 0x50, 0x4e, 0x47]).buffer as ArrayBuffer
    const assetRecord = {
      kind: 'portrait' as const,
      path: assetPath,
      mediaType: 'image/png',
      bytes: previousBytes.byteLength,
      sha256: await sha256Hex(previousBytes),
      origin: { kind: 'authored' as const },
    }
    const lifecycleManifest: CurrentManifest = {
      ...manifest,
      id: 'media-lifecycle',
      name: '媒体生命周期',
      content: {
        ...manifest.content,
        sharedScripts: 'content/shared-scripts.json',
        worldVariables: 'content/world-variables.json',
      },
    }
    const scene = {
      id: 's001',
      mapId: 'map-001',
      entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' as const },
      entities: [],
    }
    const loaded = assembleCurrentProject(lifecycleManifest, {
      actors: [],
      sceneIds: ['s001'],
      entryScenes: { s001: scene },
      skills: { skills: [], levelUp: {} },
      items: [],
      locale: {},
      sprites: [],
      battleSprites: [],
      tilesets: [],
      maps: {
        version: 1,
        maps: [{ id: 'map-001', name: '地图', path: 'content/maps/map-001.json' }],
      },
      sharedScripts: {},
      worldVariables: {},
      assetCatalog: { version: 1, assets: { [assetId]: assetRecord } },
    })
    const baseline = {
      ...toEditorState(loaded, [loaded.authorContent.entryScene]),
      assetBlobs: { [assetPath]: previousBytes },
    }
    const mapCopies = { 'content/maps/map-001.json': '{"version":4}\n' }
    const root = emptyDir('media-lifecycle')
    const handle = dirHandle(root)
    const workspace = createLocalWorkspaceContext(lifecycleManifest.id, 'save-as', LOCAL_ID)
    let snapshot = await writeProject(
      await authorizeFirstSaveTarget(workspace, handle),
      serializeProject(baseline, { mapCopies }),
    )
    expect(getFile(root, assetPath)?.bytes).toEqual(new Uint8Array(previousBytes))

    handleStore.load.mockResolvedValue({
      workspaceId: LOCAL_ID,
      projectId: lifecycleManifest.id,
      mode: 'local-project',
      source: 'save-as',
      handle,
    })
    const session = new EditSession({ ...baseline, assetBlobs: {} })
    session.markSaved()
    expect(
      session.dispatch(
        new DeleteAssetCommand(assetId, collectCurrentProjectReferenceIndex, previousBytes),
      ),
    ).toBe(true)
    expect(session.getDeletedAssetPaths()).toEqual([assetPath])

    snapshot = await writeProject(
      await authorizeBoundWorkspaceTarget(workspace, handle),
      serializeProject(session.getState(), { mapCopies }),
      { prevSnapshot: snapshot, removePaths: session.getDeletedAssetPaths() },
    )
    session.markSaved()
    expect(getFile(root, assetPath)).toBeUndefined()
    expect(
      (
        JSON.parse(new TextDecoder().decode(getFile(root, 'assets/index.json')!.bytes)) as {
          assets: Record<string, unknown>
        }
      ).assets,
    ).not.toHaveProperty(assetId)

    expect(session.undo()).toBe(true)
    expect(session.getState().assetCatalog.assets[assetId]).toEqual(assetRecord)
    expect(new Uint8Array(session.getState().assetBlobs[assetPath]!)).toEqual(
      new Uint8Array(previousBytes),
    )
    expect(session.getDeletedAssetPaths()).toEqual([])

    snapshot = await writeProject(
      await authorizeBoundWorkspaceTarget(workspace, handle),
      serializeProject(session.getState(), { mapCopies }),
      { prevSnapshot: snapshot, removePaths: session.getDeletedAssetPaths() },
    )
    session.markSaved()
    expect(
      (
        JSON.parse(new TextDecoder().decode(getFile(root, 'assets/index.json')!.bytes)) as {
          assets: Record<string, unknown>
        }
      ).assets[assetId],
    ).toEqual(assetRecord)
    expect(getFile(root, assetPath)?.bytes).toEqual(new Uint8Array(previousBytes))
    expect(snapshot.has(assetPath)).toBe(true)
    expect(session.isDirty()).toBe(false)
  })

  test('sandbox marker source 必须是严格字符串而非可 String 化值', () => {
    expect(() =>
      parseSandboxWorkspaceMarker({
        kind: 'type-pal-editor-workspace',
        version: 1,
        mode: 'sandbox',
        workspaceId: SANDBOX_ID,
        projectId: 'pal',
        source: ['ui-samples'],
      }),
    ).toThrow('内容无效')
  })

  test('ui_samples 沙盒即使选择完全匹配的 PAL 开发目录也拒绝写入', async () => {
    const root = dirFromJson(palFiles())
    const target = dirHandle(root)
    const sandbox = createSandboxWorkspaceContext('pal', 'ui-samples', SANDBOX_ID)
    await expect(preflightFirstSaveTarget(sandbox, target)).rejects.toThrow(
      '新沙盒只能保存到空文件夹',
    )
    expect(root.writes).toBe(0)
  })

  test('ui_samples 保存独立沙盒并可按 marker 重开，PAL 受控快照保持不变', async () => {
    const sourceFiles = palFiles()
    const palRoot = dirFromJson(sourceFiles, 'pal-source')
    const paths = palFingerprintPaths(manifest)
    const readPalJson = async (path: string): Promise<unknown> => {
      const file = getFile(palRoot, path)
      if (!file) throw new Error(`missing ${path}`)
      return JSON.parse(new TextDecoder().decode(file.bytes)) as unknown
    }
    const before = await fingerprintJsonFiles(paths, readPalJson)

    const sandboxRoot = emptyDir('review-copy')
    const sandboxHandle = dirHandle(sandboxRoot)
    const sandbox = createSandboxWorkspaceContext('pal', 'ui-samples', SANDBOX_ID)
    const target = await authorizeFirstSaveTarget(sandbox, sandboxHandle)
    await withAuthorizedWorkspaceMutation(target, async (mutation) => {
      await writeProject(mutation, {
        'manifest.json': manifest,
        'assets/index.json': sourceFiles['assets/index.json'],
        'content/scenes/index.json': sourceFiles['content/scenes/index.json'],
        'content/maps/index.json': sourceFiles['content/maps/index.json'],
      })
      await registerAuthorizedWorkspaceMutation(mutation, sandbox, 'review-copy')
    })

    const restored = await resolveOpenedWorkspaceContext(sandboxHandle, 'pal', {
      loadTrustedPalContext: async () => {
        throw new Error('sandbox marker must remain authoritative')
      },
    })
    expect(restored).toMatchObject({
      mode: 'sandbox',
      workspaceId: SANDBOX_ID,
      source: 'ui-samples',
    })
    expect(await fingerprintJsonFiles(paths, readPalJson)).toBe(before)
  })

  test('PAL 首存要求可信 sentinel + boot 固定关键快照；数组变化会使二次校验失败', async () => {
    const files = palFiles()
    const context = await createPalDevelopmentWorkspaceContext(sourceFromJson(files), manifest)
    const root = dirFromJson(files)
    await expect(preflightFirstSaveTarget(context, dirHandle(root))).resolves.toBeUndefined()

    jsonFile(root, 'content/scenes/index.json', ['s002', 's001'])
    await expect(authorizeFirstSaveTarget(context, dirHandle(root))).rejects.toThrow(
      '关键快照与本次会话预期不一致',
    )
    expect(root.writes).toBe(0)
  })

  test('canonical JSON 指纹忽略对象 key 顺序，但保留数组顺序', async () => {
    const paths = ['a.json']
    const left = await fingerprintJsonFiles(paths, async () => ({ z: 1, a: [1, 2] }))
    const same = await fingerprintJsonFiles(paths, async () => ({ a: [1, 2], z: 1 }))
    const changed = await fingerprintJsonFiles(paths, async () => ({ a: [2, 1], z: 1 }))
    expect(same).toBe(left)
    expect(changed).not.toBe(left)
  })

  test('PAL canonical load 前后的 proof 必须属于同一固定快照', async () => {
    const before = await createPalDevelopmentWorkspaceContext(sourceFromJson(palFiles()), manifest)
    const changedFiles = palFiles()
    changedFiles['content/scenes/index.json'] = ['publication-landed']
    const after = await createPalDevelopmentWorkspaceContext(sourceFromJson(changedFiles), manifest)
    expect(() => assertSamePalDevelopmentProof(before, after)).toThrow('载入期间发生变化')
  })

  test('Save As 保留模式边界：沙盒得到新 sandbox identity，PAL/local 降为普通本地项目', () => {
    const sandbox = createSandboxWorkspaceContext('pal', 'ui-samples', SANDBOX_ID)
    const sandboxCopy = createSaveAsWorkspaceContext(sandbox)
    expect(sandboxCopy).toMatchObject({ mode: 'sandbox', source: 'sandbox-copy' })
    expect(sandboxCopy.workspaceId).not.toBe(sandbox.workspaceId)

    const local = createLocalWorkspaceContext('pal', 'local-directory', LOCAL_ID)
    expect(createSaveAsWorkspaceContext(local)).toMatchObject({
      mode: 'local-project',
      source: 'save-as',
    })
  })

  test('有效 marker 可在 IDB 清空后权威恢复 sandbox；复制同 identity 到另一目录 fail-closed', async () => {
    const root = emptyDir()
    const sandbox = createSandboxWorkspaceContext('pal', 'ui-samples', SANDBOX_ID)
    await withAuthorizedWorkspaceMutation(
      await authorizeFirstSaveTarget(sandbox, dirHandle(root)),
      async () => undefined,
    )
    const metadata = await inspectWorkspaceMetadata(dirHandle(root))
    const restored = await resolveOpenedWorkspaceContext(dirHandle(root), 'pal', {
      metadata,
      loadTrustedPalContext: async () => {
        throw new Error('sandbox must win')
      },
    })
    expect(restored).toMatchObject({ workspaceId: SANDBOX_ID, mode: 'sandbox' })

    handleStore.load.mockResolvedValue({ handle: dirHandle(emptyDir('original')) })
    await expect(
      resolveOpenedWorkspaceContext(dirHandle(root), 'pal', {
        metadata,
        loadTrustedPalContext: async () => {
          throw new Error('sandbox must win')
        },
      }),
    ).rejects.toThrow('已属于另一个目录')
  })

  test('非法或试图升权的 workspace marker 不得降级为普通本地项目', async () => {
    const root = emptyDir()
    jsonFile(root, SANDBOX_WORKSPACE_MARKER_PATH, {
      kind: 'type-pal-editor-workspace',
      version: 1,
      mode: 'local-project',
      workspaceId: SANDBOX_ID,
      projectId: 'pal',
      source: 'ui-samples',
    })
    await expect(
      resolveOpenedWorkspaceContext(dirHandle(root), 'pal', {
        loadTrustedPalContext: async () => {
          throw new Error('invalid marker must fail first')
        },
      }),
    ).rejects.toThrow('工作区 identity 冲突')
  })

  test('无 marker 的普通目录按 isSameEntry 恢复 workspaceId；受限 IDB 记录缺 marker 时拒绝降级', async () => {
    const root = emptyDir('local')
    const handle = dirHandle(root)
    handleStore.find.mockResolvedValue({
      workspaceId: LOCAL_ID,
      projectId: 'local',
      mode: 'local-project',
      source: 'local-directory',
      handle,
    })
    const restored = await resolveOpenedWorkspaceContext(handle, 'local', {
      loadTrustedPalContext: async () => {
        throw new Error('not pal')
      },
    })
    expect(restored.workspaceId).toBe(LOCAL_ID)

    handleStore.find.mockResolvedValue({
      workspaceId: SANDBOX_ID,
      projectId: 'local',
      mode: 'sandbox',
      source: 'ui-samples',
      handle,
    })
    await expect(
      resolveOpenedWorkspaceContext(handle, 'local', {
        loadTrustedPalContext: async () => {
          throw new Error('not pal')
        },
      }),
    ).rejects.toThrow('marker 缺失')

    handleStore.find.mockResolvedValue({
      workspaceId: LOCAL_ID,
      projectId: 'local',
      mode: 'local-project',
      source: 'dev-http',
      handle,
    })
    await expect(
      resolveOpenedWorkspaceContext(handle, 'local', {
        loadTrustedPalContext: async () => {
          throw new Error('not pal')
        },
      }),
    ).rejects.toThrow('local-project 来源无效')
  })

  test('PAL sentinel 不能单独授予权限；必须由可信 HTTP context 复算目标指纹', async () => {
    const files = palFiles()
    const root = dirFromJson(files)
    const trusted = await createPalDevelopmentWorkspaceContext(sourceFromJson(files), manifest)
    const restored = await resolveOpenedWorkspaceContext(dirHandle(root), 'pal', {
      loadTrustedPalContext: async () => trusted,
    })
    expect(restored).toMatchObject({ mode: 'pal-development', workspaceId: PAL_ID })

    jsonFile(root, 'assets/index.json', { version: 1, assets: { forged: {} } })
    await expect(
      resolveOpenedWorkspaceContext(dirHandle(root), 'pal', {
        loadTrustedPalContext: async () => trusted,
      }),
    ).rejects.toThrow('关键快照与本次会话预期不一致')
  })

  test('force sandbox 打开可信 PAL 也只返回新的未绑定沙盒 authority', async () => {
    const files = palFiles()
    const trusted = await createPalDevelopmentWorkspaceContext(sourceFromJson(files), manifest)
    const context = await resolveOpenedWorkspaceContext(dirHandle(dirFromJson(files)), 'pal', {
      forceSandbox: true,
      loadTrustedPalContext: async () => trusted,
    })
    expect(context).toMatchObject({ mode: 'sandbox', source: 'ui-samples', projectId: 'pal' })
    expect(context.workspaceId).not.toBe(PAL_ID)
  })

  test('force sandbox 重开有效沙盒时保留其 marker identity', async () => {
    const root = emptyDir()
    const sandbox = createSandboxWorkspaceContext('pal', 'ui-samples', SANDBOX_ID)
    await withAuthorizedWorkspaceMutation(
      await authorizeFirstSaveTarget(sandbox, dirHandle(root)),
      async () => undefined,
    )
    const restored = await resolveOpenedWorkspaceContext(dirHandle(root), 'pal', {
      forceSandbox: true,
      loadTrustedPalContext: async () => {
        throw new Error('sandbox marker must win')
      },
    })
    expect(restored).toMatchObject({
      mode: 'sandbox',
      workspaceId: SANDBOX_ID,
      source: 'ui-samples',
    })
  })

  test('recent identity 与目录 marker 不一致时 fail-closed', async () => {
    const root = emptyDir()
    const sandbox = createSandboxWorkspaceContext('pal', 'ui-samples', SANDBOX_ID)
    await withAuthorizedWorkspaceMutation(
      await authorizeFirstSaveTarget(sandbox, dirHandle(root)),
      async () => undefined,
    )
    await expect(
      resolveOpenedWorkspaceContext(dirHandle(root), 'pal', {
        expectedIdentity: {
          workspaceId: LOCAL_ID,
          projectId: 'pal',
          name: 'wrong recent',
          mode: 'local-project',
          source: 'local-directory',
          handle: dirHandle(root),
          updatedAt: 1,
        },
        loadTrustedPalContext: async () => {
          throw new Error('sandbox must win')
        },
      }),
    ).rejects.toThrow('最近项目记录与目录中的 workspace identity 不一致')
  })
})
