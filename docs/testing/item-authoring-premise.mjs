// Read-only D-06/D-07 diagnosis: actual UI callbacks, sessions, loader and serializer.
// All author files stay in memory; runtime route witness is explicitly a host-boundary witness.
// node docs/testing/item-authoring-premise.mjs
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'

const root = new URL('../../', import.meta.url)
const req = createRequire(new URL('packages/editor/package.json', root))
const { createServer } = await import(req.resolve('vite'))
const originalFetch = globalThis.fetch
globalThis.fetch = () => {
  throw new Error('premise probe forbids network IO')
}
const server = await createServer({
  root: fileURLToPath(new URL('packages/editor', root)),
  configFile: false,
  server: { middlewareMode: true, watch: null, hmr: false, ws: false },
  appType: 'custom',
  optimizeDeps: { noDiscovery: true, include: [] },
})
function parse(path) {
  const sf = ts.createSourceFile(
    path,
    readFileSync(new URL(path, root), 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  )
  assert.equal(sf.parseDiagnostics.length, 0, `${path}: valid production AST`)
  return sf
}
function find(sf, predicate) {
  const nodes = []
  function visit(n) {
    if (predicate(n)) nodes.push(n)
    ts.forEachChild(n, visit)
  }
  visit(sf)
  assert.equal(nodes.length, 1, 'exact production AST node')
  return nodes[0]
}
function evaluate(node, sf, bindings) {
  const code = ts.transpileModule(`const fn=(${node.getText(sf)});fn`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText
  return vm.runInNewContext(code, bindings)
}
const tab = parse('packages/editor/src/ui/ItemTab.tsx')
const initializer = (name) =>
  find(tab, (n) => ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === name)
    .initializer
const blank = (id) => ({
  id,
  name: id,
  desc: [],
  buyPrice: 0,
  sellPrice: 0,
  sellable: false,
  use: { target: 'scene', consuming: true, effects: [] },
})
try {
  const { buildBlankProject } = await server.ssrLoadModule('/src/core/seed.ts')
  const { EditSession } = await server.ssrLoadModule('/src/core/edit-session.ts')
  const { ScriptEditSession, AddItemPrivateScriptCommand } = await server.ssrLoadModule(
    '/src/core/script-editor.ts',
  )
  const { EditorHistoryCoordinator } = await server.ssrLoadModule(
    '/src/core/editor-history-coordinator.ts',
  )
  const { AddItemCommand, UpdateItemCommand } = await server.ssrLoadModule('/src/core/commands.ts')
  const { createBlankItem, cloneItemForAuthoring } = await server.ssrLoadModule(
    '/src/core/item-authoring.ts',
  )
  const { projectEditorItemShells, mergeEditorProjectionWithCurrentAuthorState: merge } =
    await server.ssrLoadModule('/src/core/script-editor-projection.ts')
  const { toEditorState, serializeProjectWithMapCopies } =
    await server.ssrLoadModule('/src/core/project-io.ts')
  const { loadCurrentProjectFrom, loadAllAuthorScenes, loadStampTemplates } =
    await server.ssrLoadModule('/../reforge/src/project-loader.ts')
  const { isRuntimeScriptRef } = await server.ssrLoadModule(
    '/../reforge/src/runtime-project-view.ts',
  )
  const seed = await buildBlankProject('item-authoring-premise')
  const sourceFor = (files) => ({
    async readText(path) {
      if (!Object.hasOwn(files, path)) throw new DOMException(path, 'NotFoundError')
      const v = files[path]
      assert(!(v instanceof ArrayBuffer))
      return typeof v === 'string' ? v : JSON.stringify(v)
    },
    async readJson(path) {
      return JSON.parse(await this.readText(path))
    },
    async readBytes(path) {
      if (!Object.hasOwn(files, path)) throw new DOMException(path, 'NotFoundError')
      const v = files[path]
      return v instanceof ArrayBuffer
        ? v.slice(0)
        : new TextEncoder().encode(await this.readText(path)).buffer
    },
    async urlFor() {
      throw new Error('no external URL')
    },
  })
  async function open(files) {
    const source = sourceFor(files),
      project = await loadCurrentProjectFrom(source)
    const scenes = await loadAllAuthorScenes(project),
      stamps = await loadStampTemplates(project)
    const session = new EditSession({
      ...toEditorState(project, scenes, {}, {}, stamps),
      items: projectEditorItemShells(project),
    })
    const scriptSession = new ScriptEditSession({
      scenes,
      items: project.authorContent.items,
      sharedScripts: project.authorContent.sharedScripts,
    })
    return {
      source,
      project,
      session,
      scriptSession,
      historyCoordinator: new EditorHistoryCoordinator(session, scriptSession),
    }
  }
  const snapshot = (f) => ({
    main: structuredClone(f.session.getState()),
    script: structuredClone(f.scriptSession.getState()),
  })
  const serialize = (f) =>
    serializeProjectWithMapCopies(merge(f.scriptSession.getState(), f.session.getState()), f.source)
  function addPrivate(f, itemId) {
    const notices = []
    evaluate(initializer('addPrivateScript').arguments[0], tab, {
      ...f,
      itemId,
      isRuntimeScriptRef,
      AddItemPrivateScriptCommand,
      UpdateItemCommand,
      onStatusNotice: (n) => notices.push(n),
      Error,
    })()
    return notices
  }

  // D-06: exact createItem and addPrivateScript callbacks, no copied business implementation.
  const fresh = await open(structuredClone(seed))
  let createdId
  evaluate(initializer('createItem'), tab, {
    session: fresh.session,
    items: fresh.session.getState().items,
    createBlankItem,
    AddItemCommand,
    selectItem: (id) => {
      createdId = id
    },
  })()
  assert.equal(fresh.session.getState().items.length, 1)
  assert.equal(fresh.scriptSession.getState().items.length, 0)
  fresh.session.dispatch(
    new UpdateItemCommand(createdId, { use: { target: 'scene', consuming: true, effects: [] } }),
  )
  const afterCreate = snapshot(fresh),
    createdFiles = await serialize(fresh)
  const immediate = addPrivate(fresh, createdId)
  assert.match(immediate.at(-1).message, /物品不存在/)
  assert.deepEqual(snapshot(fresh), afterCreate, 'failed paired command preserves both sessions')
  const reopened = await open({ ...structuredClone(seed), ...createdFiles })
  assert.equal(addPrivate(reopened, createdId).at(-1).kind, 'info')
  assert.equal(reopened.scriptSession.getState().items[0].use.effects[0].kind, 'itemPrivateScript')
  await open({ ...structuredClone(seed), ...(await serialize(reopened)) })
  console.log(
    JSON.stringify({
      case: 'D06',
      newItem: createdId,
      canonicalMissing: true,
      immediateError: immediate.at(-1).message,
      reopenThenAdd: 'accepted',
    }),
  )

  // Both shared IDs are accepted by the formal loader, not manufactured invalid shells.
  const mainSf = parse('packages/reforge/src/main.ts')
  const dispatch = find(
    mainSf,
    (n) => ts.isFunctionDeclaration(n) && n.name?.text === 'dispatchItemUse',
  )
  const route = find(
    dispatch,
    (n) => ts.isPropertyAssignment(n) && n.name.getText(mainSf) === 'runScript',
  ).initializer
  for (const id of ['shared/plain', 'item:collision-item:use', 'item:other:use']) {
    const files = structuredClone(seed),
      item = blank('collision-item')
    item.use.effects = [{ kind: 'runScript', script: id }]
    files['content/items.json'] = [item]
    files['content/shared-scripts.json'] = {
      [id]: { name: 'legal shared script', self: 'none', body: [{ kind: 'wait', ms: 7 }] },
    }
    const f = await open(files),
      before = snapshot(f)
    let save = 'accepted'
    try {
      await open({ ...files, ...(await serialize(f)) })
    } catch (e) {
      save = e.message
    }
    if (id === 'item:collision-item:use') assert.match(save, /私有脚本 use 正文缺失/)
    else assert.match(save, /保存前内容引用校验失败：共享脚本 "undefined"/)
    assert.deepEqual(snapshot(f), before)
    const calls = []
    const fn = evaluate(route, mainSf, {
      isRuntimeScriptRef,
      Error,
      Promise,
      runDetachedScriptChain: async (signal, callback) =>
        callback(
          {
            runSharedScript: async (...args) => calls.push(['shared', ...args]),
            runItemPrivateScript: async (_items, itemId, scriptId) =>
              calls.push(['private', itemId, scriptId]),
          },
          signal,
        ),
      canonicalProject: f.project,
    })
    await fn(f.session.getState().items[0].use.effects[0].script)
    assert.equal(calls[0][0], id.startsWith('item:') ? 'private' : 'shared')
    console.log(
      JSON.stringify({
        case: 'D07',
        sharedId: id,
        formalLoader: 'accepted',
        save,
        runtimeHostRoute: calls[0],
        scope: 'actual callback with host method recorders; not a full game run',
      }),
    )
  }

  // Nearby D-06 copy path, characterized separately rather than silently extending repair scope.
  const privateFiles = structuredClone(seed),
    privateItem = blank('private-source')
  privateItem.use.effects = [
    {
      kind: 'itemPrivateScript',
      script: { id: 'use', label: 'source', body: [{ kind: 'wait', ms: 7 }] },
    },
  ]
  privateFiles['content/items.json'] = [privateItem]
  const copied = await open(privateFiles)
  let copyId
  evaluate(initializer('duplicateItem'), tab, {
    item: copied.session.getState().items[0],
    items: copied.session.getState().items,
    cloneItemForAuthoring,
    session: copied.session,
    AddItemCommand,
    selectItem: (id) => {
      copyId = id
    },
  })()
  let copySave = 'accepted'
  try {
    await open({ ...privateFiles, ...(await serialize(copied)) })
  } catch (e) {
    copySave = e.message
  }
  console.log(
    JSON.stringify({
      case: 'D06-adjacent-copy',
      copyId,
      canonicalIds: copied.scriptSession.getState().items.map((i) => i.id),
      save: copySave,
    }),
  )
} finally {
  await server.close()
  globalThis.fetch = originalFetch
}
