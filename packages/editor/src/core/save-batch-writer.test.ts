/**
 * EDITOR-SAVE-RECOVERY-1 · GLM batch-r1 返工（R2）：W6 在真实 catalog 读取节点注错并区分错误类别；
 * W10 使用确有删除的合法计划验证进度语义。仅替身 FSA/IDB；writer/journal/校验器全真实。
 */
import type { CurrentManifest } from '@type-pal/content'
import { beforeEach, expect, test, vi } from 'vitest'
import { memoryAuthorDirectory } from './__tests__/author-save-fixture.js'
import { authorSaveStorage, memoryAuthorSaveStore } from './__tests__/author-save-store-fixture.js'

vi.mock('./author-save-store.js', async (original) =>
  memoryAuthorSaveStore(await original<typeof import('./author-save-store.js')>()),
)
const bindings = vi.hoisted(
  () => new Map<string, import('./handle-store.js').WorkspaceHandleRecord>(),
)
vi.mock('./handle-store.js', async (original) => ({
  ...(await original<typeof import('./handle-store.js')>()),
  loadWorkspaceRecord: async (id: string) => bindings.get(id) ?? null,
  findWorkspaceRecordByHandle: async (handle: FileSystemDirectoryHandle) => {
    for (const record of bindings.values())
      if (await record.handle.isSameEntry(handle)) return record
    return null
  },
  saveWorkspaceHandle: async () => undefined,
  saveWorkspaceHandleUnderLock: async (
    _lock: unknown,
    context: import('./workspace-context.js').WorkspaceContext,
    name: string,
    handle: FileSystemDirectoryHandle,
  ) => {
    bindings.set(context.workspaceId, { ...context, name, handle, updatedAt: 1 })
  },
}))
beforeEach(() => {
  bindings.clear()
  authorSaveStorage.receipts.clear()
})

import { loadAllAuthorScenes } from '@type-pal/reforge'
import { recoverInterruptedAuthorSave } from './author-save-journal.js'
import { finishOpen } from './open-actions.js'
import { serializeProjectWithMapCopies, toEditorState, writeProject } from './project-io.js'
import { buildBlankProject } from './seed.js'
import { authorizeFirstSaveTarget } from './workspace-persistence.js'

const authorChanges = (disk: ReturnType<typeof memoryAuthorDirectory>) =>
  Object.fromEntries(
    Object.entries(disk.changes).map(([kind, paths]) => [
      kind,
      paths.filter((path) => path !== '.type-pal' && !path.startsWith('.type-pal/')),
    ]),
  )

async function openedProject(id: string) {
  const files = await buildBlankProject(id)
  const disk = memoryAuthorDirectory(files)
  const opened = await finishOpen(disk.dir)
  bindings.set(opened.workspace.workspaceId, {
    ...opened.workspace,
    name: disk.dir.name,
    handle: disk.dir,
    updatedAt: 1,
  })
  return { files, disk, opened }
}

const fullSaveInputs = (opened: Awaited<ReturnType<typeof openedProject>>['opened']) => {
  // 带 manifest+catalog 的完整输入，使 writeProject 的磁盘 catalog 读取节点真实执行。
  return serializeProjectWithMapCopies(
    toEditorState(opened.project, structuredClone(opened.scenes ?? []), {}, {}, []),
    opened.project.source,
  ).then((files) => {
    ;(files as Record<string, unknown>)['manifest.json'] = opened.project.manifest
    return files as Record<string, unknown>
  })
}

test('W6: 磁盘 catalog 读取节点坏 JSON 拒绝（同条件正控成功；非基线冲突）', async () => {
  const { disk, opened } = await openedProject('batch-w6')
  const target = await (await import('./workspace-persistence.js')).authorizeBoundWorkspaceTarget(
    opened.workspace,
    disk.dir,
    opened.authorBaseline,
  )
  const files = await fullSaveInputs(opened)
  // 正控：不注错时同一输入完整保存成功。
  await expect(writeProject(target, files)).resolves.toBeTruthy()

  const fresh = await openedProject('batch-w6-bad')
  const target2 = await (await import('./workspace-persistence.js')).authorizeBoundWorkspaceTarget(
    fresh.opened.workspace,
    fresh.disk.dir,
    fresh.opened.authorBaseline,
  )
  const files2 = await fullSaveInputs(fresh.opened)
  // 在真实 catalog 读取节点（Blob.text 读 assets/index.json）注入坏 JSON。
  const originalText = Blob.prototype.text
  let injected = false
  Blob.prototype.text = async function (this: Blob) {
    const text = await originalText.call(this)
    if (!injected && text.includes('"assets"') && text.includes('"kind"')) {
      injected = true
      return '{not-json'
    }
    return text
  }
  try {
    await expect(writeProject(target2, files2)).rejects.toThrow()
  } finally {
    Blob.prototype.text = originalText
  }
  expect(injected).toBe(true)
  fresh.disk.resetChanges()
  expect(authorChanges(fresh.disk)).toEqual({ creates: [], closes: [], removes: [] })
})

test('W10(写边界): 引用表写入失败时进度序列非空且未满、可恢复；完成后最终进度恰为 100%', async () => {
  const { files, disk } = await openedProject('batch-w10')
  const wp = await import('./workspace-persistence.js')
  const opened2 = await finishOpen(disk.dir)
  const authorize = () =>
    wp.authorizeBoundWorkspaceTarget(opened2.workspace, disk.dir, opened2.authorBaseline)
  const changed = { ...files } as Record<string, unknown>
  const locale = { ...(changed['content/locale.json'] as Record<string, string>) }
  locale['name.hero'] = '进度测试'
  changed['content/locale.json'] = locale
  const events: Array<{ completed: number; total: number }> = []
  let interrupted = false
  disk.hooks.beforeClose = (path) => {
    if (!interrupted && path === 'manifest.json') {
      interrupted = true
      throw new Error('stop before final reference table')
    }
  }
  await expect(
    writeProject(await authorize(), changed, {
      onProgress: (p) => events.push({ completed: p.completed, total: p.total }),
    }),
  ).rejects.toThrow('stop before final reference table')
  expect(events.length).toBeGreaterThan(0)
  expect(Math.max(...events.map((e) => e.completed / Math.max(1, e.total)))).toBeLessThan(1)
  expect([...authorSaveStorage.receipts.values()].length).toBeGreaterThan(0)
  disk.hooks.beforeClose = undefined
  disk.resetChanges()
  await recoverInterruptedAuthorSave(disk.dir)
  expect(disk.json('manifest.json').id).toBe('batch-w10')
  // 正控：无故障时最终进度 100%。
  const control = await openedProject('batch-w10-control')
  const controlOpened = await finishOpen(control.disk.dir)
  const events2: Array<{ completed: number; total: number }> = []
  await writeProject(
    await wp.authorizeBoundWorkspaceTarget(
      controlOpened.workspace,
      control.disk.dir,
      controlOpened.authorBaseline,
    ),
    control.files,
    { onProgress: (p) => events2.push({ completed: p.completed, total: p.total }) },
  )
  const last = events2.at(-1)!
  expect(events2.length).toBeGreaterThan(0)
  expect(last.completed).toBe(last.total)
})

test('W1（保留）: 编辑态有图章模板但 manifest 缺 stamps 登记时序列化拒绝', async () => {
  const { opened } = await openedProject('batch-w1')
  const scenes = await loadAllAuthorScenes(opened.project)
  const state = toEditorState(opened.project, scenes, {}, {}, opened.stamps)
  state.stamps.push({
    id: 'glm-stamp',
    name: '图章',
    category: 'vegetation',
    origin: 'authored',
    width: 2,
    height: 1,
    anchor: { row: 0, col: 0 },
    tilesetRefs: ['starter'],
    layers: [
      {
        id: 'ground',
        name: '地面',
        tiles: [
          [1, null],
          [null, null],
        ],
        sources: [
          [0, null],
          [null, null],
        ],
      },
    ],
    collision: [
      [1, 0],
      [null, null],
    ],
  } as unknown as (typeof state.stamps)[number])
  delete (state.manifest as unknown as { content: Record<string, unknown> }).content.stamps
  await expect(serializeProjectWithMapCopies(state, opened.project.source)).rejects.toThrow(
    /stamps/,
  )
})
