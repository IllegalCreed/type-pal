// @vitest-environment node
/**
 * TEST-GLM-WAVE-P-1 P01（project-io.glm-p）：项目序列化/写集预检/受控真实 IO 残余合同。
 * 去重：project-io.test / project-io-admission / project-serialization-boundaries /
 * save-preflight-boundaries(P01–P05) / author-save-conflict / project-copy 已证
 * round-trip、stamps 显式装载、map copy-through、catalog 摘要/大小/gzip/RLE 预检、
 * 首存真实 writer、复制清单重复路径、另存为整笔流程。本文件只补：
 * G01 serializeProject 守卫残余（图章未登记/战斗模拟器产物/pending 资源/输出路径冲突/缺 maps 声明/缺省空表）
 * G02 toEditorState 投影契约（battleSimulator 解析隔离、poisons 直传别名 vs sceneIndex clone）
 * G03 diffFiles 纯核（computedSignatures 记录、字符串原样比较、二进制同长判变、remove 精确性）
 * G04 preflightProjectWriteSet 战斗模拟器文件臂 + identity 旁车臂
 * G05 writeProject 残余臂（copy 与编辑产物同路径让位、copy 撞 remove 让位、
 *     非 firstSave 拒绝 copies、缺来源复验拒绝、增量 prevSnapshot 精确写集、
 *     进度不提早 100%、目录创建、成功后无本页恢复意图、manifest 引用表最后 close）
 * 全 typed：合法输入来自 blank seed 真实项目；不 mock 业务核心。
 */
import { formatStampTemplates, parseStampTemplates } from '@type-pal/content'
import {
  fsaSource,
  type LoadedCurrentProjectCore,
  loadAllAuthorScenes,
  loadCurrentProjectFrom,
} from '@type-pal/reforge'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { loadLegalProject } from '../__tests__/glm-p/kit.js'
import { memoryAuthorDirectory } from './__tests__/author-save-fixture.js'
import { authorSaveStorage } from './__tests__/author-save-store-fixture.js'
import {
  BATTLE_SIMULATOR_PATH,
  type BattleSimulatorLibrary,
  emptyBattleSimulatorLibrary,
  parseBattleSimulatorLibrary,
} from './battle-simulator-library.js'
import { binarySnapshotSignature } from './binary-signature.js'
import type { EditorState } from './edit-session.js'
import { finishOpen } from './open-actions.js'
import { assetCopyInputs } from './project-copy-source.js'
import {
  diffFiles,
  preflightProjectWriteSet,
  resumeOwnProjectSave,
  serializeProject,
  serializeProjectWithMapCopies,
  toEditorState,
  writeProject,
} from './project-io.js'
import { buildBlankProject } from './seed.js'
import { createLocalWorkspaceContext } from './workspace-context.js'
import { authorizeBoundWorkspaceTarget, authorizeFirstSaveTarget } from './workspace-persistence.js'

const bindings = vi.hoisted(
  () => new Map<string, import('./handle-store.js').WorkspaceHandleRecord>(),
)
vi.mock('./author-save-store.js', async (original) => {
  // 工厂内动态获取：与 biome 排序无关，避免提升期 TDZ（kit.js 会先行传递触发本 mock）。
  const store = await import('./__tests__/author-save-store-fixture.js')
  return store.memoryAuthorSaveStore(await original<typeof import('./author-save-store.js')>())
})
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
afterEach(() => {
  vi.restoreAllMocks()
})

/** 合法图章模板（2×1 surface，单瓦片实例，锚在原点）。 */
function legalStamp(id: string) {
  const tiles = [
    [0, null],
    [null, null],
  ]
  const sources = [
    [0, null],
    [null, null],
  ]
  return {
    id,
    name: id,
    origin: 'authored' as const,
    anchor: { row: 0, col: 0 },
    width: 2,
    height: 1,
    tilesetRefs: ['starter'],
    layers: [{ id: 'floor', name: '地板', tiles, sources }],
    collision: [
      [0, null],
      [null, null],
    ],
  }
}

/** 合法非空战斗模拟器库（ally 预设空成员草案）。 */
function libraryWithAlly(id: string): BattleSimulatorLibrary {
  return {
    kind: 'type-pal-battle-simulator',
    version: 1,
    allies: [{ id, name: id, description: '说明', config: { members: [] } }],
    enemies: [],
    bags: [],
    plans: [],
  }
}

function byteLengthOf(value: unknown): number {
  return value instanceof ArrayBuffer
    ? value.byteLength
    : new TextEncoder().encode(
        typeof value === 'string' ? value : `${JSON.stringify(value, null, 2)}\n`,
      ).byteLength
}

/** 打开 blank 项目并绑定句柄；boundTarget() 每次签发新授权（写入授权一次性）。 */
async function openBoundBlank(name: string) {
  const disk = memoryAuthorDirectory(await buildBlankProject(name))
  const opened = await finishOpen(disk.dir)
  bindings.set(opened.workspace.workspaceId, {
    ...opened.workspace,
    name: disk.dir.name,
    handle: disk.dir,
    updatedAt: 1,
  })
  const boundTarget = async () =>
    authorizeBoundWorkspaceTarget(opened.workspace, disk.dir, opened.authorBaseline)
  const state = toEditorState(opened.project, await loadAllAuthorScenes(opened.project), {}, {}, [])
  const files = (await serializeProjectWithMapCopies(state, opened.project.source)) as Record<
    string,
    unknown
  >
  return { disk, opened, boundTarget, state, files }
}

// ---------------------------------------------------------------------------
// G01 serializeProject 守卫残余（真实 blank 合法项目为基座，定向破坏单一前提）
// ---------------------------------------------------------------------------

describe('P01-G01 serializeProject 守卫残余', () => {
  test('有图章模板但 manifest.content.stamps 未登记 → 序列化层 fail-loud，不产出任何文件', async () => {
    const { state } = await loadLegalProject('glm-p-g01')
    const content = { ...state.manifest.content }
    delete content.stamps
    const unregistered: EditorState = {
      ...state,
      stamps: [legalStamp('stamp-a')],
      manifest: { ...state.manifest, content },
    }
    expect(() => serializeProject(unregistered)).toThrow(
      'serializeProject: 项目有图章模板但 manifest.content.stamps 未登记',
    )
  })

  test('登记图章表后序列化在登记路径产出规范化模板文本，经正式 parser round-trip 等值', async () => {
    const { state } = await loadLegalProject('glm-p-g01')
    const stamped: EditorState = {
      ...state,
      stamps: [legalStamp('stamp-round')],
      manifest: {
        ...state.manifest,
        content: { ...state.manifest.content, stamps: 'content/stamps.json' },
      },
    }
    const files = serializeProject(stamped)
    expect(files['content/stamps.json']).toBe(formatStampTemplates(stamped.stamps))
    expect(parseStampTemplates(files['content/stamps.json'] as string)).toEqual(stamped.stamps)
  })

  test('非空战斗模拟器库序列化产出保留路径文件；空库不产出该文件', async () => {
    const { state } = await loadLegalProject('glm-p-g01')
    const files = serializeProject({ ...state, battleSimulator: libraryWithAlly('ally-p') })
    expect(
      parseBattleSimulatorLibrary(files[BATTLE_SIMULATOR_PATH]).allies.map((entry) => entry.id),
    ).toEqual(['ally-p'])
    const emptyFiles = serializeProject({
      ...state,
      battleSimulator: emptyBattleSimulatorLibrary(),
    })
    expect(Object.keys(emptyFiles)).not.toContain(BATTLE_SIMULATOR_PATH)
  })

  test('pending 资源未登记 catalog → 序列化层拒绝并指名路径', async () => {
    const { state } = await loadLegalProject('glm-p-g01')
    const pending: EditorState = {
      ...state,
      assetBlobs: { 'assets/generated/ghost.rle': new ArrayBuffer(8) },
    }
    expect(() => serializeProject(pending)).toThrow(
      'serializeProject: pending 资源未登记 catalog: assets/generated/ghost.rle',
    )
  })

  test('两个内容表声明同一路径 → 输出路径冲突 fail-loud 并报出双方 owner', async () => {
    const { state } = await loadLegalProject('glm-p-g01')
    const clashed: EditorState = {
      ...state,
      manifest: {
        ...state.manifest,
        content: {
          ...state.manifest.content,
          items: 'content/dup.json',
          skills: 'content/dup.json',
        },
      },
    }
    // byKey 迭代序 skills 先于 items：先到者得路径，后到者报冲突。
    expect(() => serializeProject(clashed)).toThrow(
      'serializeProject: 输出路径冲突 "content/dup.json"（内容表 skills / 内容表 items）',
    )
  })

  test('manifest 缺 content.maps 声明 → 序列化层拒绝，不产出无索引工程', async () => {
    const { state } = await loadLegalProject('glm-p-g01')
    const content = { ...state.manifest.content }
    delete content.maps
    const mapless: EditorState = {
      ...state,
      manifest: { ...state.manifest, content },
    }
    expect(() => serializeProject(mapless)).toThrow(
      'serializeProject: 项目缺 manifest.content.maps',
    )
  })

  test('声明的内容表在 state 缺数组时按空表序列化（enemies 缺省臂）', async () => {
    const { state } = await loadLegalProject('glm-p-g01')
    const withoutEnemies: EditorState = {
      ...state,
      enemies: undefined,
      manifest: {
        ...state.manifest,
        content: { ...state.manifest.content, enemies: 'content/enemies.json' },
      },
    }
    expect(serializeProject(withoutEnemies)['content/enemies.json']).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// G02 toEditorState 投影契约
// ---------------------------------------------------------------------------

describe('P01-G02 toEditorState 投影契约', () => {
  test('battleSimulator 参数经正式 parser 解析并隔离：改 state 库不动输入对象', async () => {
    const disk = memoryAuthorDirectory(await buildBlankProject('glm-p-projection'))
    const project = await loadCurrentProjectFrom(fsaSource(disk.dir))
    const raw = libraryWithAlly('ally-raw')
    const state = toEditorState(
      project as LoadedCurrentProjectCore,
      await loadAllAuthorScenes(project),
      {},
      {},
      [],
      raw,
    )
    expect(state.battleSimulator!.allies[0]!.config).toEqual({ members: [] })
    expect(state.battleSimulator!.allies[0]!.config).not.toBe(raw.allies[0]!.config)
    state.battleSimulator!.allies[0]!.config.members.push({
      actorId: 'hero',
      stats: {},
      equipment: {},
      skills: { kind: 'inherit' },
      hp: { kind: 'full' },
      mp: { kind: 'full' },
    })
    expect(raw.allies[0]!.config.members).toEqual([])
  })

  test('poisons 数组与 loader 源共享引用（直传），sceneIndex 则是 clone 隔离', async () => {
    const disk = memoryAuthorDirectory(await buildBlankProject('glm-p-projection'))
    const project = await loadCurrentProjectFrom(fsaSource(disk.dir))
    const state = toEditorState(
      project as LoadedCurrentProjectCore,
      await loadAllAuthorScenes(project),
      {},
      {},
      [],
    )
    expect(state.poisons).toBe(project.poisons)
    expect(state.sceneIndex).not.toBe(project.sceneIndex)
    expect(state.sceneIndex).toEqual(project.sceneIndex)
  })
})

// ---------------------------------------------------------------------------
// G03 diffFiles 纯核
// ---------------------------------------------------------------------------

describe('P01-G03 diffFiles 纯核', () => {
  test('computedSignatures 记录每个 next 条目（字符串+二进制），write 只列实际变化', async () => {
    const prev = new Map([
      ['same.json', `${JSON.stringify({ v: 1 }, null, 2)}\n`],
      ['changed.json', `${JSON.stringify({ v: 1 }, null, 2)}\n`],
      ['blob.rle', await binarySnapshotSignature(new ArrayBuffer(4))],
    ])
    const sameBytes = new ArrayBuffer(4)
    const changedBytes = new ArrayBuffer(4)
    new Uint8Array(changedBytes).fill(7)
    const computed = new Map<string, string>()
    const diff = await diffFiles(
      prev,
      {
        'same.json': { v: 1 },
        'changed.json': { v: 2 },
        'blob.rle': sameBytes,
        'new.bin': changedBytes,
      },
      computed,
    )
    expect(diff.write.sort()).toEqual(['changed.json', 'new.bin'])
    expect(computed.get('same.json')).toBe(prev.get('same.json'))
    expect(computed.get('blob.rle')).toBe(await binarySnapshotSignature(sameBytes))
    expect(computed.get('new.bin')).toBe(await binarySnapshotSignature(changedBytes))
    expect(diff.remove).toEqual([])
  })

  test('字符串值按原文比较（copy-through 文本不被 JSON 重序列化）；prev 独有键进 remove', async () => {
    const copyThrough = '  raw map text with  { odd spacing }\n'
    const prev = new Map([
      ['content/maps/unloaded.json', copyThrough],
      ['content/maps/gone.json', '{}\n'],
    ])
    const diff = await diffFiles(prev, { 'content/maps/unloaded.json': copyThrough })
    expect(diff.write).toEqual([])
    expect(diff.remove).toEqual(['content/maps/gone.json'])
    const rewritten = await diffFiles(new Map(), { 'content/maps/unloaded.json': copyThrough })
    expect(rewritten.write).toEqual(['content/maps/unloaded.json'])
  })

  test('同长度异字节二进制判变写盘；computedSignatures 缺省时正常返回', async () => {
    const a = new ArrayBuffer(8)
    const b = new ArrayBuffer(8)
    new Uint8Array(b).fill(1)
    const prev = new Map([['assets/a.rle', await binarySnapshotSignature(a)]])
    expect((await diffFiles(prev, { 'assets/a.rle': b })).write).toEqual(['assets/a.rle'])
    expect((await diffFiles(new Map(), { 'x.json': { a: 1 } })).write).toEqual(['x.json'])
  })
})

// ---------------------------------------------------------------------------
// G04 preflightProjectWriteSet 残余臂
// ---------------------------------------------------------------------------

describe('P01-G04 preflightProjectWriteSet 残余臂', () => {
  test('battle-simulator 文件为合法 JSON 字符串 → 预检解析通过；坏 kind 文档拒绝', async () => {
    const catalogFree = { 'manifest.json': { assets: {} } }
    await expect(
      preflightProjectWriteSet({
        ...catalogFree,
        [BATTLE_SIMULATOR_PATH]: JSON.stringify(emptyBattleSimulatorLibrary()),
      }),
    ).resolves.toBeUndefined()
    await expect(
      preflightProjectWriteSet({
        ...catalogFree,
        [BATTLE_SIMULATOR_PATH]: JSON.stringify({ kind: 'other', version: 1 }),
      }),
    ).rejects.toThrow(BATTLE_SIMULATOR_PATH)
  })

  test('battle-simulator 文件非 JSON 文本 → 语法错误如实传播，不吞成预检通过', async () => {
    await expect(
      preflightProjectWriteSet({
        'manifest.json': { assets: {} },
        [BATTLE_SIMULATOR_PATH]: '{not-json',
      }),
    ).rejects.toThrow()
  })

  test('workspace identity 旁车路径出现在 files 或 removePaths → 预检拒绝', async () => {
    await expect(preflightProjectWriteSet({ '.type-pal/workspace.json': '{}' })).rejects.toThrow(
      'workspace identity 旁车',
    )
    await expect(preflightProjectWriteSet({}, ['.type-pal/workspace.json'])).rejects.toThrow(
      'workspace identity 旁车',
    )
  })
})

// ---------------------------------------------------------------------------
// G05 writeProject 受控真实 IO 残余臂
// ---------------------------------------------------------------------------

describe('P01-G05 writeProject 受控真实 IO', () => {
  test('copy 与编辑产物同路径让位：落盘字节为编辑值，copy 不重复写', async () => {
    const { disk, opened, files } = await openBoundBlank('glm-p-copy-clash')
    disk.set('notes/same.txt', 'source bytes')
    disk.resetChanges()
    const target = memoryAuthorDirectory()
    const context = createLocalWorkspaceContext(opened.workspace.projectId, 'save-as')
    const editorFiles: Record<string, unknown> = { ...files, 'notes/same.txt': 'editor wins' }
    const result = await writeProject(
      await authorizeFirstSaveTarget(context, target.dir),
      editorFiles,
      {
        copies: [
          ...assetCopyInputs(files, opened.project.source),
          {
            path: 'notes/same.txt',
            read: async () => new Blob([new Uint8Array(disk.files.get('notes/same.txt')!)]),
          },
        ],
        verifySource: async () => {},
      },
    )
    expect(result.snapshot.get('notes/same.txt')).toBe('editor wins')
    expect(await fsaSource(target.dir).readText('notes/same.txt')).toBe('editor wins')
    // 让位鉴别器：该路径只允许编辑产物一次 close，copy 步骤必须被剔除。
    expect(target.changes.closes.filter((path) => path === 'notes/same.txt')).toHaveLength(1)
  })

  test('copy 撞 removePaths 让位：既不复制也不删除，路径不进快照', async () => {
    const { disk, opened, files } = await openBoundBlank('glm-p-copy-remove')
    disk.set('notes/gone.txt', 'keep me')
    disk.resetChanges()
    const target = memoryAuthorDirectory()
    const context = createLocalWorkspaceContext(opened.workspace.projectId, 'save-as')
    const result = await writeProject(
      await authorizeFirstSaveTarget(context, target.dir),
      { ...files },
      {
        copies: [
          ...assetCopyInputs(files, opened.project.source),
          {
            path: 'notes/gone.txt',
            read: async () => new Blob([new Uint8Array(disk.files.get('notes/gone.txt')!)]),
          },
        ],
        removePaths: ['notes/gone.txt'],
        verifySource: async () => {},
      },
    )
    expect(result.snapshot.has('notes/gone.txt')).toBe(false)
    expect(target.files.has('notes/gone.txt')).toBe(false)
  })

  test('非 firstSave 授权目标携带 copies → 拒绝且零写', async () => {
    const { disk, opened, boundTarget } = await openBoundBlank('glm-p-bound-copy')
    disk.resetChanges()
    await expect(
      writeProject(
        await boundTarget(),
        { 'manifest.json': opened.project.manifest },
        {
          copies: [{ path: 'assets/extra.bin', read: async () => new Blob(['x']) }],
          verifySource: async () => {},
        },
      ),
    ).rejects.toThrow('整笔复制只允许写入已授权的新项目目标')
    expect(disk.changes).toEqual({ creates: [], closes: [], removes: [] })
  })

  test('firstSave 目标 copies 缺来源复验 → 拒绝准备保存且目标零写', async () => {
    const context = createLocalWorkspaceContext('glm-p-no-verify', 'save-as')
    const targetDir = memoryAuthorDirectory()
    const auth = await authorizeFirstSaveTarget(context, targetDir.dir)
    await expect(
      writeProject(
        auth,
        { 'manifest.json': { id: 'glm-p-no-verify' } },
        { copies: [{ path: 'notes/a.txt', read: async () => new Blob(['a']) }] },
      ),
    ).rejects.toThrow('复制缺少来源复验，拒绝准备保存')
    expect(targetDir.files.size).toBe(0)
  })

  test('增量保存：prevSnapshot 下只写变化文件，返回快照含全部文件新签名', async () => {
    const { disk, boundTarget, files } = await openBoundBlank('glm-p-incremental')
    const first = await writeProject(await boundTarget(), files)
    // prev 快照在下一笔保存中兼作落盘日志被原位更新（真实磁盘演进来），先留存首存签名。
    const firstManifestSignature = first.snapshot.get('manifest.json')
    disk.resetChanges()

    const secondFiles: Record<string, unknown> = {
      ...files,
      'manifest.json': { ...(files['manifest.json'] as { name: string }), name: '改名工程' },
    }
    const second = await writeProject(await boundTarget(), secondFiles, {
      prevSnapshot: first.snapshot,
    })
    const projectFiles = (paths: string[]) => paths.filter((path) => !path.startsWith('.type-pal/'))
    expect(projectFiles(disk.changes.closes)).toEqual(['manifest.json'])
    expect(projectFiles(disk.changes.removes)).toEqual([])
    expect(second.snapshot.size).toBe(first.snapshot.size)
    expect(second.snapshot.get('manifest.json')).not.toBe(firstManifestSignature)
    expect(second.snapshot.get('manifest.json')).toBe(
      `${JSON.stringify(secondFiles['manifest.json'], null, 2)}\n`,
    )
  })

  test('进度不提早 100%：commit 前每帧 completed<total，最终恰一帧 completed=total', async () => {
    const { boundTarget, files } = await openBoundBlank('glm-p-progress')
    const frames: Array<{ completed: number; total: number }> = []
    await writeProject(await boundTarget(), files, {
      onProgress: (progress) => frames.push(progress),
    })
    expect(frames.length).toBeGreaterThan(0)
    for (const frame of frames.slice(0, -1)) expect(frame.completed).toBeLessThan(frame.total)
    const totalBytes = Object.values(files).reduce<number>(
      (sum, value) => sum + byteLengthOf(value),
      0,
    )
    expect(frames.at(-1)).toEqual({ completed: totalBytes, total: totalBytes })
    expect(frames.filter((frame) => frame.completed === frame.total)).toHaveLength(1)
  })

  test('directories 声明在首存目标创建真实目录；写后快照不含目录项', async () => {
    const { opened, files } = await openBoundBlank('glm-p-dirs')
    const target = memoryAuthorDirectory()
    const context = createLocalWorkspaceContext(opened.workspace.projectId, 'save-as')
    const result = await writeProject(
      await authorizeFirstSaveTarget(context, target.dir),
      {
        ...files,
      },
      {
        directories: ['assets/generated/deep'],
        copies: assetCopyInputs(files, opened.project.source),
        verifySource: async () => {},
      },
    )
    expect(target.changes.creates).toContain('assets/generated/deep')
    expect(result.snapshot.has('assets/generated/deep')).toBe(false)
  })

  test('成功提交后本页无恢复意图：resumeOwnProjectSave 返回 null 且不触发 onRecovering', async () => {
    const { disk, opened, boundTarget, files } = await openBoundBlank('glm-p-resume-clean')
    await writeProject(await boundTarget(), files)
    let recovering = 0
    const resumed = await resumeOwnProjectSave(
      opened.workspace,
      disk.dir,
      opened.authorBaseline,
      () => {
        recovering += 1
      },
    )
    expect(resumed).toBeNull()
    expect(recovering).toBe(0)
  })

  test('manifest 引用表最后 close：项目文件先落盘，manifest 收尾（sidecar 除外）', async () => {
    const { disk, boundTarget, files } = await openBoundBlank('glm-p-close-order')
    await writeProject(await boundTarget(), files)
    const projectCloses = disk.changes.closes.filter((path) => !path.startsWith('.type-pal/'))
    expect(projectCloses).toContain('manifest.json')
    expect(projectCloses.at(-1)).toBe('manifest.json')
    for (const rel of Object.keys(files))
      if (rel !== 'manifest.json')
        expect(projectCloses.indexOf(rel)).toBeLessThan(projectCloses.indexOf('manifest.json'))
  })
})
