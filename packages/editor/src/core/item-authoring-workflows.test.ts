import { type AuthorItemData, validateAuthorItems } from '@type-pal/content'
import {
  fsaSource,
  loadAllAuthorScenes,
  loadCurrentProjectFrom,
  projectItemsView,
  runtimeItemPrivateScriptRef,
} from '@type-pal/reforge'
import { beforeEach, expect, test, vi } from 'vitest'
import { memoryAuthorDirectory } from './__tests__/author-save-fixture.js'
import { authorSaveStorage, memoryAuthorSaveStore } from './__tests__/author-save-store-fixture.js'

// Origin persistence only. The save authorization, journal, writer and loader are real.
const records = vi.hoisted(
  () => new Map<string, import('./handle-store.js').WorkspaceHandleRecord>(),
)
vi.mock('./author-save-store.js', async (original) =>
  memoryAuthorSaveStore(await original<typeof import('./author-save-store.js')>()),
)
vi.mock('./handle-store.js', async (original) => ({
  ...(await original<typeof import('./handle-store.js')>()),
  loadWorkspaceRecord: async (id: string) => records.get(id) ?? null,
  findWorkspaceRecordByHandle: async (handle: FileSystemDirectoryHandle) => {
    for (const record of records.values())
      if (await record.handle.isSameEntry(handle)) return record
    return null
  },
  saveWorkspaceHandleUnderLock: async (
    _lock: unknown,
    context: import('./workspace-context.js').WorkspaceContext,
    name: string,
    handle: FileSystemDirectoryHandle,
  ) => {
    records.set(context.workspaceId, { ...context, name, handle, updatedAt: 1 })
  },
}))
beforeEach(() => {
  records.clear()
  authorSaveStorage.receipts.clear()
})

import { AddItemCommand, DeleteItemCommand, UpdateItemCommand } from './commands.js'
import { EditSession } from './edit-session.js'
import { EditorHistoryCoordinator } from './editor-history-coordinator.js'
import { cloneItemForAuthoring, createBlankItem } from './item-authoring.js'
import { collectEditorStatusIssues } from './project-diagnostics.js'
import { serializeProjectWithMapCopies, toEditorState, writeProject } from './project-io.js'
import { collectCurrentProjectReferenceIndex } from './project-reference-adapters.js'
import {
  AddItemDefinitionCommand,
  AddItemPrivateScriptCommand,
  DeleteItemDefinitionCommand,
  ScriptEditSession,
  SetItemPrivateScriptBodyCommand,
} from './script-editor.js'
import {
  mergeCurrentItemShell,
  mergeEditorProjectionWithCurrentAuthorState,
  projectEditorItemShells,
} from './script-editor-projection.js'
import { buildBlankProject } from './seed.js'
import { createLocalWorkspaceContext } from './workspace-context.js'
import { authorizeFirstSaveTarget } from './workspace-persistence.js'

async function fixture(items: AuthorItemData[] = []) {
  validateAuthorItems(items)
  const files = await buildBlankProject('item-authoring-tests')
  files['content/items.json'] = structuredClone(items)
  files['content/shared-scripts.json'] = Object.fromEntries(
    ['shared/plain', 'item:source:use', 'item:other:use'].map((id) => [
      id,
      { name: id, self: 'none', body: [] },
    ]),
  )
  const disk = memoryAuthorDirectory(files)
  const source = fsaSource(disk.dir)
  const project = await loadCurrentProjectFrom(source)
  const scenes = await loadAllAuthorScenes(project)
  const main = new EditSession({
    ...toEditorState(project, scenes, {}, {}, []),
    items: projectEditorItemShells(project),
  })
  const script = new ScriptEditSession({
    scenes,
    items: project.authorContent.items,
    sharedScripts: project.authorContent.sharedScripts,
  })
  const history = new EditorHistoryCoordinator(main, script)
  const snapshot = () =>
    structuredClone({
      main: main.getState(),
      script: script.getStateSnapshot(),
      history: history.getToolbarSnapshot(),
      version: history.getVersion(),
    })
  const author = () =>
    mergeEditorProjectionWithCurrentAuthorState(script.getStateSnapshot(), main.getState())
  return { main, script, history, snapshot, author, source, disk }
}

test('new record immediately accepts a private body, atomically notifies, and real writer/loader preserves it', async () => {
  const f = await fixture()
  const notifications: { shell: string[]; canonical: string[] }[] = []
  const observe = () => {
    const shellIds = f.main.getState().items.map((item) => item.id)
    notifications.push({
      shell: shellIds,
      canonical: f.script.getStateSnapshot().items.map((item) => item.id),
    })
  }
  f.main.subscribe(observe)
  f.script.subscribe(observe)
  const created = createBlankItem([])
  f.history.dispatch(new AddItemDefinitionCommand(created), new AddItemCommand(created))
  f.main.dispatch(
    new UpdateItemCommand(created.id, { use: { target: 'scene', consuming: true, effects: [] } }),
  )
  f.history.dispatch(
    new AddItemPrivateScriptCommand(created.id, '新正文'),
    new UpdateItemCommand(created.id, {
      use: {
        target: 'scene',
        consuming: true,
        effects: [{ kind: 'runScript', script: runtimeItemPrivateScriptRef(created.id) }],
      },
    }),
  )
  f.script.dispatch(
    new SetItemPrivateScriptBodyCommand(created.id, 'use', 0, [{ kind: 'wait', ms: 23 }]),
  )
  expect(notifications.length).toBeGreaterThanOrEqual(4)
  // Observers are deliberately exception-isolated by the product: assert outside their callbacks.
  for (const notification of notifications)
    expect(notification.canonical).toEqual(notification.shell)
  const before = f.snapshot()
  const serialization = serializeProjectWithMapCopies(f.author(), f.source)
  await expect(serialization).resolves.toBeDefined()
  const files = await serialization
  // First-save inputs include the seed's actual binaries, not catalog-only placeholders.
  for (const record of Object.values(f.main.getState().assetCatalog.assets))
    files[record.path] = await f.source.readBytes(record.path)
  const output = memoryAuthorDirectory()
  await writeProject(
    await authorizeFirstSaveTarget(
      createLocalWorkspaceContext('item-authoring-tests', 'blank-project'),
      output.dir,
    ),
    files,
  )
  expect(output.json('.type-pal/save-state.json').phase).toBe('committed')
  const reopened = await loadCurrentProjectFrom(fsaSource(output.dir))
  expect(reopened.authorContent.items).toEqual(f.script.getStateSnapshot().items)
  expect(reopened.authorContent.items[0]!.use!.effects).toEqual([
    {
      kind: 'itemPrivateScript',
      script: { id: 'use', label: '新正文', body: [{ kind: 'wait', ms: 23 }] },
    },
  ])
  expect(f.snapshot()).toEqual(before)
})

test.each([
  'shared/plain',
  'item:source:use',
  'item:other:use',
])('shared %s survives diagnostics and serialization; missing ID is reported verbatim', async (sharedId) => {
  const item: AuthorItemData = {
    ...createBlankItem([]),
    id: 'source',
    use: { target: 'scene', consuming: true, effects: [{ kind: 'runScript', script: sharedId }] },
  }
  const f = await fixture([item])
  const before = f.snapshot()
  expect(
    collectEditorStatusIssues(f.main.getState(), f.script.getStateSnapshot()).filter((issue) =>
      issue.message.includes('共享脚本'),
    ),
  ).toEqual([])
  const serialization = serializeProjectWithMapCopies(f.author(), f.source)
  await expect(serialization).resolves.toBeDefined()
  const files = await serialization
  const reopened = await loadCurrentProjectFrom(fsaSource(memoryAuthorDirectory(files).dir))
  expect(reopened.authorContent.items).toEqual([item])
  expect(f.snapshot()).toEqual(before)
  f.main.dispatch(
    new UpdateItemCommand('source', {
      use: {
        ...f.main.getState().items[0]!.use!,
        effects: [
          { kind: 'runScript', script: { chunk: '__author-script-runtime', id: 'missing:脚本' } },
        ],
      },
    }),
  )
  await expect(serializeProjectWithMapCopies(f.author(), f.source)).rejects.toThrow('missing:脚本')
  expect(
    collectEditorStatusIssues(f.main.getState(), f.script.getStateSnapshot()).some((issue) =>
      issue.message.includes('missing:脚本'),
    ),
  ).toBe(true)
})

test('copy takes current unsaved fields/body; delete, undo/redo and same-ID recreation cannot reuse orphan body', async () => {
  const source: AuthorItemData = {
    ...createBlankItem([]),
    id: 'source',
    use: {
      target: 'oneAlly',
      consuming: true,
      effects: [
        { kind: 'healHp', amount: 5 },
        { kind: 'itemPrivateScript', script: { id: 'use', body: [{ kind: 'wait', ms: 1 }] } },
      ],
    },
  }
  const f = await fixture([source])
  f.main.dispatch(new UpdateItemCommand('source', { name: '未保存名称', buyPrice: 99 }))
  f.script.dispatch(
    new SetItemPrivateScriptBodyCommand('source', 'use', 1, [{ kind: 'wait', ms: 29 }]),
  )
  const current = f.main.getState().items[0]!
  const copy = cloneItemForAuthoring(
    mergeCurrentItemShell(current, f.script.getStateSnapshot().items[0], true),
    [current],
  )
  const beforeCopy = f.snapshot()
  f.history.dispatch(
    new AddItemDefinitionCommand(copy, 1),
    new AddItemCommand(projectItemsView({ [copy.id]: copy })[copy.id]!, 1),
  )
  expect(copy.name).toBe('未保存名称 副本')
  expect(copy.buyPrice).toBe(99)
  expect(copy.use!.effects[1]).toEqual({
    kind: 'itemPrivateScript',
    script: { id: 'use', body: [{ kind: 'wait', ms: 29 }] },
  })
  expect(f.main.getState().items[1]!.use!.effects[1]).toEqual({
    kind: 'runScript',
    script: runtimeItemPrivateScriptRef(copy.id),
  })
  f.history.undo()
  expect(f.main.getState()).toEqual(beforeCopy.main)
  expect(f.script.getStateSnapshot()).toEqual(beforeCopy.script)
  f.history.redo()
  f.script.dispatch(
    new SetItemPrivateScriptBodyCommand(copy.id, 'use', 1, [{ kind: 'wait', ms: 61 }]),
  )
  expect(f.script.getStateSnapshot().items[0]!.use!.effects[1]).toEqual(copy.use!.effects[1])
  const beforeDelete = f.snapshot()
  const refs = (state: typeof beforeDelete.main) =>
    collectCurrentProjectReferenceIndex(state, f.script.getStateSnapshot())
  f.history.dispatch(new DeleteItemDefinitionCommand(copy.id), new DeleteItemCommand(copy.id, refs))
  expect(f.main.getState().items.map((item) => item.id)).toEqual(['source'])
  expect(f.script.getStateSnapshot().items.map((item) => item.id)).toEqual(['source'])
  f.history.undo()
  expect(f.main.getState()).toEqual(beforeDelete.main)
  expect(f.script.getStateSnapshot()).toEqual(beforeDelete.script)
  f.history.redo()
  const replacement = { ...createBlankItem([]), id: copy.id }
  f.history.dispatch(new AddItemDefinitionCommand(replacement), new AddItemCommand(replacement))
  expect(f.script.getStateSnapshot().items[1]).toEqual(replacement)
  expect(f.author().items[1]).toEqual(replacement)
})

test('second-side failure preserves both records and redo; missing private body and foreign owner fail closed', async () => {
  const f = await fixture()
  const item = createBlankItem([])
  f.history.dispatch(new AddItemDefinitionCommand(item), new AddItemCommand(item))
  f.history.undo()
  const before = f.snapshot()
  expect(() =>
    f.history.dispatch(new AddItemDefinitionCommand(item), {
      label: '拒绝主会话',
      apply() {
        throw new Error('second-side failure')
      },
      invert: (state) => state,
    }),
  ).toThrow('second-side failure')
  expect(f.snapshot()).toEqual(before)
  f.history.redo()
  const shell = {
    ...item,
    use: {
      target: 'scene' as const,
      consuming: true,
      effects: [{ kind: 'runScript' as const, script: runtimeItemPrivateScriptRef(item.id) }],
    },
  }
  expect(() => mergeCurrentItemShell(shell, item, true)).toThrow('正文缺失')
  f.main.dispatch(new UpdateItemCommand(item.id, { use: shell.use }))
  expect(f.author).toThrow('正文缺失')
  shell.use.effects[0]!.script = runtimeItemPrivateScriptRef('wrong:owner')
  expect(() => mergeCurrentItemShell(shell, item)).toThrow('owner 不符')
  shell.use.effects[0]!.script = { chunk: 'unknown', id: 'use' }
  expect(() => mergeCurrentItemShell(shell, item)).toThrow('不是 current runtime ref')
})
