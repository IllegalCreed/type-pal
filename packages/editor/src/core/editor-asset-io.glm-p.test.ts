// @vitest-environment node
/**
 * TEST-GLM-WAVE-P-1 P01（editor-asset-io.glm-p）：资源读取器/目录选择器/seed 克隆清单残余。
 * 去重：file-system-access / editor-asset-reader / seed / open-actions 的既有测试已证
 * 指纹 JSON 行为、seed 主干与另存为整笔流。本文件只补暗区臂：
 * G08 editor-asset-reader（未知 id、kind 不符、pending blob 副本语义、角色缺失、pending URL）
 * G09 classifyDirectoryPicker（insecure 提示、localhostOrigin 回退、无 picker、可用）
 * G10 seed 克隆清单（scenesDir 归一化、palFingerprintPaths 缺省/归一、克隆输出路径重复）
 * G11 另存为带源目录但无基线证据 → 复制开始前拒绝
 */
import type { AssetKind, CurrentManifest } from '@type-pal/content'
import { fsaSource, loadAllAuthorScenes, loadCurrentProjectFrom } from '@type-pal/reforge'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { memoryAuthorDirectory } from './__tests__/author-save-fixture.js'
import { authorSaveStorage, memoryAuthorSaveStore } from './__tests__/author-save-store-fixture.js'
import { loadLegalProject } from '../__tests__/glm-p/kit.js'

const bindings = vi.hoisted(
  () => new Map<string, import('./handle-store.js').WorkspaceHandleRecord>(),
)
vi.mock('./author-save-store.js', async (original) =>
  memoryAuthorSaveStore(await original<typeof import('./author-save-store.js')>()),
)
vi.mock('./handle-store.js', async (original) => {
  const actual = await original<typeof import('./handle-store.js')>()
  const save = async (
    context: import('./workspace-context.js').WorkspaceContext,
    name: string,
    handle: FileSystemDirectoryHandle,
  ) => {
    bindings.set(context.workspaceId, { ...context, name, handle, updatedAt: 1 })
  }
  return {
    ...actual,
    loadWorkspaceRecord: async (id: string) => bindings.get(id) ?? null,
    findWorkspaceRecordByHandle: async (handle: FileSystemDirectoryHandle) => {
      for (const record of bindings.values())
        if (await record.handle.isSameEntry(handle)) return record
      return null
    },
    saveWorkspaceHandle: save,
    saveWorkspaceHandleUnderLock: async (_lock: unknown, ...args: Parameters<typeof save>) =>
      save(...args),
  }
})

beforeEach(() => {
  bindings.clear()
  authorSaveStorage.receipts.clear()
})
import { classifyDirectoryPicker } from './file-system-access.js'
import { createEditorAssetReader } from './editor-asset-reader.js'
import { buildBlankProject, enumerateSeedFiles, scenesDir } from './seed.js'
import { palFingerprintPaths } from './workspace-context.js'
import { createLocalWorkspaceContext, PAL_DEVELOPMENT_SENTINEL_PATH } from './workspace-context.js'
import { finishOpen, saveProjectAs } from './open-actions.js'
import { serializeProjectWithMapCopies, toEditorState } from './project-io.js'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('P01-G08 editor-asset-reader 契约', () => {
  async function readerFixture() {
    const { source, state } = await loadLegalProject('glm-p-reader')
    const firstId = Object.keys(state.assetCatalog.assets)[0]!
    const first = state.assetCatalog.assets[firstId]!
    return {
      reader: createEditorAssetReader(source, state),
      state,
      firstId,
      first,
      source,
    }
  }

  test('未知 AssetId → 不在 catalog 拒绝并指名', async () => {
    const { reader } = await readerFixture()
    expect(() => reader.record('sprite.nowhere')).toThrow('AssetId "sprite.nowhere" 不在 catalog')
  })

  test('期望 kind 与实际不符 → 拒绝并报出双 kind', async () => {
    const { reader, first, firstId } = await readerFixture()
    const wrongKind: AssetKind = first.kind === 'sprite' ? 'music' : 'sprite'
    expect(() => reader.record(firstId, wrongKind)).toThrow(
      `AssetId "${firstId}" 期望 ${wrongKind}，实际 ${first.kind}`,
    )
  })

  test('readBytes：pending blob 覆盖磁盘，两次读取内容一致（副本语义）', async () => {
    const { state } = await loadLegalProject('glm-p-reader')
    const spriteId = Object.keys(state.assetCatalog.assets).find(
      (id) => state.assetCatalog.assets[id]!.kind === 'sprite',
    )!
    const record = state.assetCatalog.assets[spriteId]!
    const pending = new ArrayBuffer(record.bytes)
    new Uint8Array(pending).fill(9)
    const blobbed = { ...state, assetBlobs: { [record.path]: pending } }
    const reader = createEditorAssetReader(fsaSource(memoryAuthorDirectory().dir), blobbed)
    const first = await reader.readBytes(spriteId, 'sprite')
    const second = await reader.readBytes(spriteId, 'sprite')
    expect(first).not.toBe(second)
    expect([...new Uint8Array(first)]).toEqual([...new Uint8Array(second)])
    expect(new Uint8Array(first)[0]).toBe(9)
  })

  test('readRoleBytes：缺角色 → 指名缺失角色；已登记角色 → 读到非空字节', async () => {
    const { source, state } = await loadLegalProject('glm-p-reader')
    const reader = createEditorAssetReader(source, state)
    await expect(reader.readRoleBytes('audio.midiSoundfont')).rejects.toThrow(
      '项目缺资源角色 "audio.midiSoundfont"',
    )
    expect(
      (await reader.readRoleBytes('visual.standardColorTable')).byteLength,
    ).toBeGreaterThan(0)
  })

  test('urlFor：pending blob 直接生成 object URL（携带 record mediaType，不经源读取）', async () => {
    const { state, firstId, first } = await readerFixture()
    const pending = new ArrayBuffer(first.bytes)
    new Uint8Array(pending).fill(3)
    const blobbed = { ...state, assetBlobs: { [first.path]: pending } }
    const created: Array<{ blob: Blob; url: string }> = []
    vi.stubGlobal('URL', {
      ...globalThis.URL,
      createObjectURL: (blob: Blob) => {
        const url = `blob:mock-${created.length + 1}`
        created.push({ blob, url })
        return url
      },
    })
    // 空目录：pending 路径绝不读源，否则 NotFoundError 即失败见证。
    const reader = createEditorAssetReader(fsaSource(memoryAuthorDirectory().dir), blobbed)
    expect(await reader.urlFor(firstId)).toBe('blob:mock-1')
    expect(created).toHaveLength(1)
    expect(created[0]!.blob.type).toBe(first.mediaType)
  })
})

describe('P01-G09 classifyDirectoryPicker 分类', () => {
  test('非安全上下文 → insecure-context 并提示 dev:lan 自签 HTTPS', () => {
    const result = classifyDirectoryPicker({
      isSecureContext: false,
      hasDirectoryPicker: true,
      origin: 'http://192.168.1.5:6010',
    })
    expect(result).toMatchObject({ available: false, reason: 'insecure-context' })
    expect(result.available === false && result.message).toContain('dev:lan')
  })

  test('localhostOrigin 解析失败 → 回退 http://localhost 提示', () => {
    const result = classifyDirectoryPicker({
      isSecureContext: false,
      hasDirectoryPicker: true,
      origin: 'not-a-url',
    })
    expect(result.available === false && result.message).toContain('http://localhost')
  })

  test('安全上下文但无 picker API → unsupported-browser', () => {
    expect(
      classifyDirectoryPicker({
        isSecureContext: true,
        hasDirectoryPicker: false,
        origin: 'http://localhost:6010',
      }),
    ).toMatchObject({ available: false, reason: 'unsupported-browser' })
  })

  test('安全上下文且有 picker → 可用', () => {
    expect(
      classifyDirectoryPicker({
        isSecureContext: true,
        hasDirectoryPicker: true,
        origin: 'http://localhost:6010',
      }),
    ).toEqual({ available: true })
  })
})


/** 供克隆清单/指纹测试的最小完整 manifest 构造器（合法形状，仅 content 路径不同）。 */
function manifestOf(content: Record<string, string>): CurrentManifest {
  const entry = {
    id: 'main',
    label: '主要入口',
    scene: 'start',
    startWorld: { party: [], money: 0, inventory: [] },
  }
  return {
    id: 'wave-p',
    name: 'Wave-P',
    contentVersion: 20,
    minimumSaveVersion: 8,
    defaultEntryId: 'main',
    entryPoints: [entry],
    content,
    assets: { catalog: 'assets/index.json', roles: {} },
  }
}

describe('P01-G10 seed 克隆清单残余', () => {
  test('scenesDir：缺省回默认目录；无斜杠补斜杠；带斜杠原样', () => {
    expect(scenesDir(manifestOf({}))).toBe('content/scenes/')
    expect(scenesDir(manifestOf({ scenes: 'content/my-scenes' }))).toBe('content/my-scenes/')
    expect(scenesDir(manifestOf({ scenes: 'content/scenes/' }))).toBe('content/scenes/')
  })

  test('palFingerprintPaths：缺省产出默认场景索引且无 maps 条目；自定义 scenes 归一', () => {
    expect(palFingerprintPaths(manifestOf({}))).toEqual([
      PAL_DEVELOPMENT_SENTINEL_PATH,
      'assets/index.json',
      'content/scenes/index.json',
      'manifest.json',
    ])
    expect(
      palFingerprintPaths(manifestOf({ scenes: 'content/story-scenes' })),
    ).toContain('content/story-scenes/index.json')
  })

  test('克隆清单内容路径重复 → 输出路径重复拒绝并指名', () => {
    expect(() =>
      enumerateSeedFiles(manifestOf({ actors: 'content/dup.json', skills: 'content/dup.json' }), {
        version: 1,
        scenes: [],
      }),
    ).toThrow(
      '克隆输出路径重复: content/dup.json',
    )
  })
})

describe('P01-G11 另存为证据守卫', () => {
  test('带源目录但缺源基线证据 → 校验阶段拒绝且目标零写（读取证据臂为 typed 不可达防御）', async () => {
    const disk = memoryAuthorDirectory(await buildBlankProject('glm-p-saveas-evidence'))
    const project = await loadCurrentProjectFrom(fsaSource(disk.dir))
    await finishOpen(disk.dir)
    const target = memoryAuthorDirectory()
    vi.stubGlobal('window', {
      isSecureContext: true,
      location: { origin: 'http://localhost' },
      showDirectoryPicker: vi.fn(async () => target.dir),
    })
    const state = toEditorState(project, await loadAllAuthorScenes(project), {}, {}, [])
    const files = await serializeProjectWithMapCopies(state, fsaSource(disk.dir))
    const context = createLocalWorkspaceContext(project.manifest.id, 'save-as')
    await expect(
      saveProjectAs(context, async () => files as Record<string, unknown>, disk.dir),
    ).rejects.toThrow('另存为缺少源项目基线，请重新打开项目')
    expect(target.files.size).toBe(0)
  })
})
