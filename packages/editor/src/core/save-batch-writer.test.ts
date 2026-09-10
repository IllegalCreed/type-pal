/**
 * EDITOR-SAVE-RECOVERY-1 · GLM batch-r1 · G2 序列化与实际写入（W1/W6/W10 进度语义）。
 * 真实 serializeProjectWithMapCopies / writeProject / journal；仅替身 FSA/IDB 边界。
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
  saveWorkspaceHandleUnderLock: async () => undefined,
}))
beforeEach(() => authorSaveStorage.receipts.clear())

import { fsaSource, loadAllAuthorScenes } from '@type-pal/reforge'
import { finishOpen } from './open-actions.js'
import { serializeProjectWithMapCopies, toEditorState, writeProject } from './project-io.js'
import { buildBlankProject } from './seed.js'
import { createLocalWorkspaceContext } from './workspace-context.js'
import { authorizeFirstSaveTarget } from './workspace-persistence.js'

const authorChanges = (disk: ReturnType<typeof memoryAuthorDirectory>) =>
  Object.fromEntries(
    Object.entries(disk.changes).map(([kind, paths]) => [
      kind,
      paths.filter((path) => path !== '.type-pal' && !path.startsWith('.type-pal/')),
    ]),
  )

async function openedProject() {
  const files = await buildBlankProject('batch-writer')
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

test('W1: 编辑态有图章模板但 manifest 缺 stamps 登记时序列化拒绝（纯函数，零 IO）', async () => {
  const { opened } = await openedProject()
  const scenes = await loadAllAuthorScenes(opened.project)
  const state = toEditorState(opened.project, scenes, {}, {}, opened.stamps)
  // 空白工程默认无图章模板；注入一个与 content 校验合同一致的合法模板（形状取自 stamp.test fixture），
  // 构造“编辑态有模板但 manifest 未登记”的不一致输入。
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
  expect(state.stamps.length).toBeGreaterThan(0)
  delete (state.manifest as unknown as { content: Record<string, unknown> }).content.stamps
  await expect(serializeProjectWithMapCopies(state, opened.project.source)).rejects.toThrow(
    /stamps/,
  )
})

test('W6: 磁盘 catalog 坏 JSON 使保存拒绝且零作者 IO（与 NotFound 严格区分）', async () => {
  const { disk, opened } = await openedProject()
  const target = await (await import('./workspace-persistence.js')).authorizeBoundWorkspaceTarget(
    opened.workspace,
    disk.dir,
    opened.authorBaseline,
  )
  disk.set('assets/index.json', '{not-json')
  disk.resetChanges()
  await expect(
    writeProject(target, { 'content/locale.json': disk.json('content/locale.json') }),
  ).rejects.toThrow()
  expect(authorChanges(disk)).toEqual({ creates: [], closes: [], removes: [] })
})

test('W10: 完成进度只在全部删除落定后报告 100%（注入最后一步失败对照半程）', async () => {
  const files = await buildBlankProject('batch-writer-progress')
  const disk = memoryAuthorDirectory()
  const context = createLocalWorkspaceContext(
    (files['manifest.json'] as CurrentManifest).id,
    'blank-project',
  )
  const target = await authorizeFirstSaveTarget(context, disk.dir)
  const events: Array<{ completed: number; total: number }> = []
  let interrupted = false
  disk.hooks.beforeClose = (path) => {
    if (!interrupted && path === 'manifest.json') {
      interrupted = true
      throw new Error('stop before final reference table')
    }
  }
  await expect(
    writeProject(target, files, {
      onProgress: (p) => events.push({ completed: p.completed, total: p.total }),
    }),
  ).rejects.toThrow('stop before final reference table')
  const maxRatio = Math.max(...events.map((e) => e.completed / Math.max(1, e.total)))
  expect(maxRatio).toBeLessThan(1)
  // manifest 引用表未落定（创建占位不可解析为有效清单）。
  expect(() => disk.json('manifest.json')).toThrow()
})
void fsaSource
