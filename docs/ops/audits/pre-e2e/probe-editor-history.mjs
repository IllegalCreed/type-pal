// node --import tsx docs/ops/audits/pre-e2e/probe-editor-history.mjs
// Real sessions/commands/merge/serialization, actual App history callbacks via AST.
// Seed files and every edit remain in memory. Navigation is stubbed; no browser or disk save.
// Assertions characterize the unfixed baseline, not desired undo behavior.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'

const root = new URL('../../../../', import.meta.url)
const req = createRequire(new URL('packages/editor/package.json', root))
const { createServer } = await import(req.resolve('vite'))
assert.equal(typeof globalThis.indexedDB, 'undefined')
const oldFetch = globalThis.fetch
globalThis.fetch = () => {
  throw new Error('Editor audit forbids network access')
}
const server = await createServer({
  root: fileURLToPath(new URL('packages/editor/', root)),
  configFile: false,
  server: { middlewareMode: true, watch: null, hmr: false, ws: false },
  appType: 'custom',
  optimizeDeps: { noDiscovery: true, include: [] },
})
try {
  const { EditSession } = await server.ssrLoadModule('/src/core/edit-session.ts')
  const { ScriptEditSession, AddItemPrivateScriptCommand, SetItemPrivateScriptBodyCommand } =
    await server.ssrLoadModule('/src/core/script-editor.ts')
  const { UpdateItemCommand } = await server.ssrLoadModule('/src/core/commands.ts')
  const { EditorHistoryCoordinator } = await server.ssrLoadModule(
    '/src/core/editor-history-coordinator.ts',
  )
  const { mergeEditorProjectionWithCurrentAuthorState: merge } = await server.ssrLoadModule(
    '/src/core/script-editor-projection.ts',
  )
  const { buildBlankProject } = await server.ssrLoadModule('/src/core/seed.ts')
  const { toEditorState, serializeProjectWithMapCopies } =
    await server.ssrLoadModule('/src/core/project-io.ts')
  const { loadCurrentProjectFrom, loadAllAuthorScenes, loadStampTemplates } =
    await server.ssrLoadModule('/../reforge/src/project-loader.ts')
  const files = await buildBlankProject('history-audit')
  files['content/items.json'] = [
    {
      id: 'private',
      name: '私有脚本物品',
      desc: [],
      buyPrice: 0,
      sellPrice: 0,
      sellable: false,
      use: { target: 'scene', consuming: true, effects: [] },
    },
  ]
  const get = (rel) => {
    assert(Object.hasOwn(files, rel), `missing memory file ${rel}`)
    return files[rel]
  }
  const source = {
    async readText(rel) {
      const x = get(rel)
      assert(!(x instanceof ArrayBuffer))
      return typeof x === 'string' ? x : JSON.stringify(x)
    },
    async readJson(rel) {
      return JSON.parse(await this.readText(rel))
    },
    async readBytes(rel) {
      const x = get(rel)
      return x instanceof ArrayBuffer
        ? x.slice(0)
        : new TextEncoder().encode(await this.readText(rel)).buffer
    },
    async urlFor() {
      throw new Error('Memory fixture forbids external URLs')
    },
  }
  const project = await loadCurrentProjectFrom(source)
  const scenes = await loadAllAuthorScenes(project),
    stamps = await loadStampTemplates(project)
  const base = toEditorState(project, scenes, {}, {}, stamps)
  const scriptBase = {
    scenes,
    items: project.authorContent.items,
    sharedScripts: project.authorContent.sharedScripts,
  }
  const sf = ts.createSourceFile(
    'App.tsx',
    readFileSync(new URL('packages/editor/src/ui/App.tsx', root), 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  const callbacks = new Map(),
    subs = []
  function visit(n) {
    if (
      ts.isVariableDeclaration(n) &&
      ts.isIdentifier(n.name) &&
      ['undo', 'redo'].includes(n.name.text) &&
      n.initializer &&
      ts.isCallExpression(n.initializer)
    ) {
      assert(!callbacks.has(n.name.text))
      callbacks.set(n.name.text, n.initializer.arguments[0])
    }
    if (
      ts.isCallExpression(n) &&
      n.expression.getText(sf) === 'useEffect' &&
      n.arguments[0]?.getText(sf).includes('getHistoryVersion()')
    )
      subs.push(n.arguments[0])
    ts.forEachChild(n, visit)
  }
  visit(sf)
  assert.equal(subs.length, 2)
  assert.equal(callbacks.size, 2)
  function sessions(existing = false) {
    const main = structuredClone(base),
      script = structuredClone(scriptBase)
    if (existing) {
      script.items[0].use.effects = [
        { kind: 'itemPrivateScript', script: { id: 'use', label: '正文', body: [] } },
      ]
      main.items[0].use.effects = structuredClone(script.items[0].use.effects)
    }
    const session = new EditSession(main),
      scriptSession = new ScriptEditSession(script)
    const historyCoordinator = new EditorHistoryCoordinator(session, scriptSession)
    const historyOwnerRef = { current: 'main' }
    const scope = {
      session,
      scriptSession,
      historyCoordinator,
      historyOwnerRef,
      reconcileLocationAfterHistory() {},
    }
    const actual = (n) =>
      vm.runInNewContext(
        ts.transpileModule(`(${n.getText(sf)})`, {
          compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
        }).outputText,
        scope,
      )
    const off = subs.map((n) => actual(n)())
    const snapshot = () => ({
      price: session.getState().items[0].buyPrice,
      shellEffects: session.getState().items[0].use.effects.length,
      canonicalEffects: scriptSession.getStateSnapshot().items[0].use.effects.length,
      body: scriptSession.getStateSnapshot().items[0].use.effects[0]?.script?.body,
    })
    return {
      session,
      scriptSession,
      historyCoordinator,
      undo: actual(callbacks.get('undo')),
      redo: actual(callbacks.get('redo')),
      snapshot,
      dispose: () =>
        off.forEach((fn) => {
          fn()
        }),
    }
  }
  function pair(c) {
    c.historyCoordinator.dispatch(
      new AddItemPrivateScriptCommand('private', '正文'),
      new UpdateItemCommand('private', {
        use: {
          target: 'scene',
          consuming: true,
          effects: [
            {
              kind: 'runScript',
              script: { chunk: '__author-script-runtime', id: 'item:private:use' },
            },
          ],
        },
      }),
    )
  }
  async function serialize(c) {
    const out = await serializeProjectWithMapCopies(
      merge(c.scriptSession.getStateSnapshot(), c.session.getState()),
      source,
    )
    return out['content/items.json'][0]
  }
  const control = sessions()
  try {
    pair(control)
    control.undo()
    const pairedUndo = control.snapshot()
    assert.equal(pairedUndo.shellEffects, 0)
    assert.equal(pairedUndo.canonicalEffects, 0)
    control.redo()
    const pairedRedo = control.snapshot()
    assert.equal(pairedRedo.shellEffects, 1)
    assert.equal(pairedRedo.canonicalEffects, 1)
    await serialize(control)
    console.log(
      'D-history-control',
      JSON.stringify({ pairedUndo, pairedRedo, serialize: 'passed' }),
    )
  } finally {
    control.dispose()
  }

  const bad = sessions()
  try {
    pair(bad)
    bad.session.dispatch(new UpdateItemCommand('private', { buyPrice: 10 }))
    bad.scriptSession.dispatch(
      new SetItemPrivateScriptBodyCommand('private', 'use', 0, [{ kind: 'wait', ms: 1 }]),
    )
    await serialize(bad)
    bad.undo()
    assert.deepEqual(bad.snapshot().body, [])
    bad.undo()
    const split = bad.snapshot()
    assert.equal(split.price, 10)
    assert.equal(split.shellEffects, 1)
    assert.equal(split.canonicalEffects, 0)
    const serializedItem = await serialize(bad)
    assert.deepEqual(serializedItem.use.effects, [])
    bad.redo()
    const restored = bad.snapshot()
    assert.equal(restored.canonicalEffects, 1)
    console.log(
      'D-history-split',
      JSON.stringify({ split, serializedItem, redoRestoresCanonical: true, restored }),
    )
  } finally {
    bad.dispose()
  }

  const normal = sessions(true)
  try {
    normal.session.dispatch(new UpdateItemCommand('private', { buyPrice: 10 }))
    normal.scriptSession.dispatch(
      new SetItemPrivateScriptBodyCommand('private', 'use', 0, [{ kind: 'wait', ms: 1 }]),
    )
    normal.session.dispatch(new UpdateItemCommand('private', { buyPrice: 20 }))
    normal.undo()
    const afterUndo1 = normal.snapshot()
    normal.undo()
    const afterUndo2 = normal.snapshot()
    assert.equal(afterUndo1.price, 10)
    assert.equal(afterUndo2.price, 0)
    assert.deepEqual(afterUndo2.body, [{ kind: 'wait', ms: 1 }])
    console.log('D-history-order', JSON.stringify({ afterUndo1, afterUndo2 }))
  } finally {
    normal.dispose()
  }
} finally {
  await server.close()
  globalThis.fetch = oldFetch
}
