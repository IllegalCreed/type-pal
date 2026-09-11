/**
 * EDITOR-SAVE-RECOVERY-1 · GLM batch-r1 返工（R2）：W6 在真实 catalog 读取节点注错并区分错误类别；
 * W10 包含写入与删除边界。Codex接收修订补齐删除正反控及W6副作用见证；生产代码保持不变。
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
import {
  resumeOwnProjectSave,
  serializeProjectWithMapCopies,
  toEditorState,
  writeProject,
} from './project-io.js'
import { buildBlankProject } from './seed.js'

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

  const fresh = await openedProject('batch-w6')
  const target2 = await (await import('./workspace-persistence.js')).authorizeBoundWorkspaceTarget(
    fresh.opened.workspace,
    fresh.disk.dir,
    fresh.opened.authorBaseline,
  )
  const files2 = await fullSaveInputs(fresh.opened)
  expect(files2).toEqual(files)
  const beforeFiles = new Map(fresh.disk.files)
  fresh.disk.resetChanges()
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
    await expect(writeProject(target2, files2)).rejects.toBeInstanceOf(SyntaxError)
  } finally {
    Blob.prototype.text = originalText
  }
  expect(injected).toBe(true)
  expect(fresh.disk.files).toEqual(beforeFiles)
  expect(authorChanges(fresh.disk)).toEqual({ creates: [], closes: [], removes: [] })
  expect(authorSaveStorage.receipts.has(fresh.opened.workspace.workspaceId)).toBe(false)
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

test('B5: 中断保存后原页 resume 触发回调、完成提交并返回 snapshot', async () => {
  const { files, disk, opened } = await openedProject('batch-b5')
  const changed = { ...files } as Record<string, unknown>
  const locale = { ...(changed['content/locale.json'] as Record<string, string>) }
  locale['name.hero'] = '续存测试'
  changed['content/locale.json'] = locale
  const wp = await import('./workspace-persistence.js')
  const attempt = async (onRecovering?: () => void) => {
    const resumed = await resumeOwnProjectSave(
      opened.workspace,
      disk.dir,
      opened.authorBaseline,
      onRecovering,
    )
    await writeProject(
      await wp.authorizeBoundWorkspaceTarget(opened.workspace, disk.dir, opened.authorBaseline),
      changed,
    )
    return resumed
  }
  let interrupted = false
  disk.hooks.beforeClose = (path) => {
    if (!interrupted && path === 'manifest.json') {
      interrupted = true
      throw new Error('b5 interrupt')
    }
  }
  await expect(attempt()).rejects.toThrow('b5 interrupt')
  disk.hooks.beforeClose = undefined
  disk.resetChanges()
  let recovering = 0
  const resumed = await attempt(() => {
    recovering += 1
  })
  expect(recovering).toBe(1)
  expect(resumed?.snapshot).toBeInstanceOf(Map)
  expect(disk.json('content/locale.json')['name.hero']).toBe('续存测试')
  expect(disk.json('.type-pal/save-state.json').phase).toBe('committed')
  let called = 0
  await expect(
    resumeOwnProjectSave(opened.workspace, disk.dir, opened.authorBaseline, () => {
      called += 1
    }),
  ).resolves.toBeNull()
  expect(called).toBe(0)
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

// Codex接收补证：可选氛围表可合法注销，不能用必需locale表的失败推断删除不可测试。
test.each([
  false,
  true,
])('W10（删除边界）: 实际remove前不报满，删除成功或中断恢复后完整提交（%s）', async (interrupt) => {
  const files = await buildBlankProject('batch-optional-delete')
  ;(files['manifest.json'] as CurrentManifest).content.ambiences = 'content/ambiences.json'
  files['content/ambiences.json'] = []
  const disk = memoryAuthorDirectory(files)
  const opened = await finishOpen(disk.dir)
  bindings.set(opened.workspace.workspaceId, {
    ...opened.workspace,
    name: disk.dir.name,
    handle: disk.dir,
    updatedAt: 1,
  })
  const next = structuredClone(files)
  delete (next['manifest.json'] as CurrentManifest).content.ambiences
  delete next['content/ambiences.json']
  const wp = await import('./workspace-persistence.js')
  const events: Array<{ completed: number; total: number }> = []
  let entered = false
  disk.resetChanges()
  disk.hooks.beforeRemove = (path) => {
    if (path !== 'content/ambiences.json') return
    entered = true
    expect(events.length).toBeGreaterThan(0)
    expect(
      events.every(
        (p) => Number.isFinite(p.total) && p.total > 0 && p.completed >= 0 && p.completed < p.total,
      ),
    ).toBe(true)
    if (interrupt) throw new Error('stopped actual deletion')
  }
  const running = writeProject(
    await wp.authorizeBoundWorkspaceTarget(opened.workspace, disk.dir, opened.authorBaseline),
    next,
    {
      removePaths: ['content/ambiences.json'],
      onProgress: (p) => events.push({ ...p }),
    },
  )
  if (interrupt) {
    await expect(running).rejects.toThrow('stopped actual deletion')
    expect(disk.files.has('content/ambiences.json')).toBe(true)
    expect(disk.json('.type-pal/save-state.json').phase).toBe('pending')
    expect(authorSaveStorage.receipts.get(opened.workspace.workspaceId)).toMatchObject({
      phase: 'applying',
      issued: true,
    })
    disk.hooks.beforeRemove = undefined
    await expect(recoverInterruptedAuthorSave(disk.dir)).resolves.toMatchObject({
      kind: 'committed',
    })
  } else {
    await running
    expect(events.at(-1)!.completed).toBe(events.at(-1)!.total)
  }
  expect(entered).toBe(true)
  expect(disk.changes.removes).toContain('content/ambiences.json')
  expect(disk.files.has('content/ambiences.json')).toBe(false)
  expect(disk.json('.type-pal/save-state.json').phase).toBe('committed')
  await expect(finishOpen(disk.dir)).resolves.toMatchObject({ kind: 'current' })
})

// ═══ W3/W9：私有域与资源格式写入边界（batch 剩余，C2 返工） ═══

test('W3(收窄): 输出路径落入 .type-pal 私有域时在预检拒绝，私有文件未被创建', async () => {
  const { disk, opened } = await openedProject('batch-w3')
  const target = await (await import('./workspace-persistence.js')).authorizeBoundWorkspaceTarget(
    opened.workspace,
    disk.dir,
    opened.authorBaseline,
  )
  disk.resetChanges()
  await expect(writeProject(target, { '.type-pal/evil.json': { a: 1 } })).rejects.toThrow()
  // 被拒私有文件本身也不得落盘（不把 .type-pal 从轨迹里过滤掉）。
  expect(disk.files.has('.type-pal/evil.json')).toBe(false)
  expect(disk.changes).toEqual({ creates: [], closes: [], removes: [] })
})

test('W9: 待保存输入中摘要正确但格式坏的 sprite/battle-sprite 沿真实 decoder 拒绝（同项目正控）', async () => {
  const wp = await import('./workspace-persistence.js')
  const { sha256Hex } = await import('./binary-signature.js')
  for (const kind of ['sprite', 'battle-sprite'] as const) {
    // 同一项目、同一合法磁盘基线；坏字节/匹配摘要只进入“待保存输入”，不先污染磁盘。
    const { files, disk, opened } = await openedProject(`batch-w9-${kind}`)
    const authorize = () =>
      wp.authorizeBoundWorkspaceTarget(opened.workspace, disk.dir, opened.authorBaseline)
    // 正控：同输入原样保存成功。
    await expect(writeProject(await authorize(), files)).resolves.toBeTruthy()

    const bad = new Uint8Array(24) // 非 canonical RLE：全零无 gzip 魔数
    const catalog = structuredClone(files['assets/index.json']) as {
      assets: Record<string, { kind: string; path: string; bytes: number; sha256: string }>
    }
    const entry = Object.values(catalog.assets).find((record) => record.kind === kind)!
    const digest = await sha256Hex(bad.buffer.slice(0) as ArrayBuffer)
    entry.bytes = bad.byteLength
    entry.sha256 = digest
    const badInputs = {
      ...files,
      'assets/index.json': catalog,
      [entry.path]: bad.buffer.slice(0),
    } as Record<string, unknown>
    disk.resetChanges()
    await expect(writeProject(await authorize(), badInputs)).rejects.toThrow(
      kind === 'battle-sprite' ? /battle-sprite|canonical/ : /sprite|canonical/,
    )
    // 零作者副作用：磁盘上该资源仍是原合法字节，catalog 未被改写。
    expect(new Uint8Array(disk.files.get(entry.path)!)[1]).toBe(0x8b)
    expect(
      disk.json('assets/index.json').assets[
        Object.keys(catalog.assets).find((id) => catalog.assets[id] === entry)!
      ].sha256,
    ).not.toBe(digest)
    expect(disk.changes.creates.filter((path) => !path.startsWith('.type-pal'))).toEqual([])
  }
})

// ═══ C4：publishState 写/读双故障边界（真实 journal 路径） ═══

test('C4c: 状态门写入失败优先以写错误拒绝；写成功而读校验失败以冲突拒绝', async () => {
  const wp = await import('./workspace-persistence.js')
  const { files, disk } = await openedProject('batch-c4c')
  const opened = await (await import('./open-actions.js')).finishOpen(disk.dir)
  const changed = { ...files } as Record<string, unknown>
  const locale = { ...(changed['content/locale.json'] as Record<string, string>) }
  locale['name.hero'] = '双故障'
  changed['content/locale.json'] = locale

  // 情形一：状态门 close 失败 → 拒绝且以写错误为因（非读取错误）。
  let stateWriteFailed = false
  disk.hooks.beforeClose = (path) => {
    if (path === '.type-pal/save-state.json') {
      stateWriteFailed = true
      throw new Error('state gate write failure')
    }
  }
  await expect(
    writeProject(
      await wp.authorizeBoundWorkspaceTarget(opened.workspace, disk.dir, opened.authorBaseline),
      changed,
    ),
  ).rejects.toThrow('state gate write failure')
  expect(stateWriteFailed).toBe(true)

  // 情形一失败后目录处于 pending：先恢复完成，再做情形二。
  disk.hooks.beforeClose = undefined
  disk.hooks.afterClose = undefined
  disk.resetChanges()
  const { recoverInterruptedAuthorSave } = await import('./author-save-journal.js')
  await recoverInterruptedAuthorSave(disk.dir)
  disk.hooks.afterClose = undefined
  disk.hooks.afterClose = (path) => {
    if (path === '.type-pal/save-state.json') {
      // 写入完成后立刻被外部替换为“合法形状但不同操作”的状态 → 读回 token 不匹配（保持可解析）。
      disk.set(
        '.type-pal/save-state.json',
        JSON.stringify({
          kind: 'type-pal-author-save',
          version: 1,
          operationId: '33333333-3333-4333-8333-333333333333',
          phase: 'committed',
          planHash: 'f'.repeat(64),
        }) + '\n',
      )
    }
  }
  try {
    // 恢复后重新打开取新鲜基线，再做一次会触发状态门读回校验失败的保存。
    const reopened = await (await import('./open-actions.js')).finishOpen(disk.dir)
    const again = { ...files } as Record<string, unknown>
    const locale2 = { ...(again['content/locale.json'] as Record<string, string>) }
    locale2['name.hero'] = '双故障二'
    again['content/locale.json'] = locale2
    await expect(
      writeProject(
        await wp.authorizeBoundWorkspaceTarget(
          reopened.workspace,
          disk.dir,
          reopened.authorBaseline,
        ),
        again,
      ),
    ).rejects.toThrow('save-state')
  } finally {
    disk.hooks.afterClose = undefined
  }
})
