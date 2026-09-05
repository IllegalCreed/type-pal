// node --import tsx docs/ops/audits/pre-e2e/probe-editor-reference-delete.mjs
// Real reference index, paired commands and serialize guard; no actual file deletion/writes.
// Assertions characterize the unfixed baseline, not desired behavior.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

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
  const { collectCurrentProjectReferenceIndex, createCurrentProjectReferenceIndexProvider } =
    await server.ssrLoadModule('/src/core/project-reference-adapters.ts')
  const { EditSession } = await server.ssrLoadModule('/src/core/edit-session.ts')
  const { ScriptEditSession, DeleteSceneDefinitionCommand } = await server.ssrLoadModule(
    '/src/core/script-editor.ts',
  )
  const { DeleteSceneCommand } = await server.ssrLoadModule('/src/core/commands.ts')
  const { EditorHistoryCoordinator } = await server.ssrLoadModule(
    '/src/core/editor-history-coordinator.ts',
  )
  const { serializeProject } = await server.ssrLoadModule('/src/core/project-io.ts')
  const { mergeEditorProjectionWithCurrentAuthorState } = await server.ssrLoadModule(
    '/src/core/script-editor-projection.ts',
  )
  const make = (selection) => {
    const target = {
      id: 'target',
      mapId: 'map',
      entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
      entities: [],
      hooks: {
        onEnter: {
          initial: 'main',
          variants: {
            main: {
              label: 'Main',
              order: 0,
              flow: { kind: 'stages', initial: 'start', stages: [{ id: 'start', body: [] }] },
            },
          },
        },
      },
    }
    const source = { ...structuredClone(target), id: 'source' }
    if (selection.kind === 'transition') {
      source.hooks.onEnter.variants.main.flow = {
        kind: 'stateMachine',
        machine: {
          id: 'm',
          label: 'Machine',
          initial: 'one',
          states: {
            one: {
              label: 'One',
              body: [],
              next: {
                kind: 'branch',
                cond: { kind: 'currentScene', scene: 'target' },
                then: { kind: 'stay' },
                else: { kind: 'stay' },
              },
            },
          },
        },
      }
    } else
      source.hooks.onEnter.variants.main.flow.stages[0].body = [
        { kind: 'selectSceneHooks', scene: 'target', selection: { onEnter: selection } },
      ]
    return {
      manifest: {
        id: 'audit',
        name: 'Audit',
        contentVersion: 20,
        minimumSaveVersion: 8,
        defaultEntryId: 'main',
        entryPoints: [
          {
            id: 'main',
            label: 'Main',
            scene: 'source',
            startWorld: { party: [], money: 0, inventory: [] },
          },
        ],
        content: {
          scenes: 'content/scenes/',
          maps: 'content/maps/index.json',
          worldVariables: 'content/world-variables.json',
        },
        assets: { catalog: 'assets/index.json', roles: {} },
      },
      scenes: [source, target],
      sceneIndex: {
        version: 1,
        scenes: [
          { id: 'source', name: 'Source', path: 'content/scenes/source.json' },
          { id: 'target', name: 'Target', path: 'content/scenes/target.json' },
        ],
      },
      actors: [],
      skills: [],
      levelUp: {},
      items: [],
      locale: {},
      sprites: [],
      battleSprites: [],
      maps: {},
      mapIndex: { version: 1, maps: [{ id: 'map', name: 'Map', path: 'content/maps/map.json' }] },
      tilesets: [],
      stamps: [],
      worldVariables: {},
      tilesetBlobs: {},
      scriptChunks: {},
      assetCatalog: { version: 1, assets: {} },
      assetBlobs: {},
      sharedScripts: {},
      shops: [],
    }
  }
  for (const selection of [
    { kind: 'disabled' },
    { kind: 'inherit' },
    { kind: 'use', value: 'main' },
    { kind: 'transition' },
  ]) {
    const state = make(selection)
    const canonical = { scenes: structuredClone(state.scenes), items: [], sharedScripts: {} }
    const main = new EditSession(state),
      script = new ScriptEditSession(canonical)
    const coordinator = new EditorHistoryCoordinator(main, script)
    serializeProject(
      mergeEditorProjectionWithCurrentAuthorState(script.getState(), main.getState()),
    )
    const index = collectCurrentProjectReferenceIndex(main.getState(), script.getState())
    const count = index.deletionImpact(
      { kind: 'scene', id: 'target' },
      index.deletionScopeFor([{ kind: 'scene', id: 'target' }]),
    ).blockers.length
    let deleteError, saveError
    try {
      coordinator.dispatch(
        new DeleteSceneDefinitionCommand('target', (next) =>
          collectCurrentProjectReferenceIndex(main.getState(), next),
        ),
        new DeleteSceneCommand(
          'target',
          createCurrentProjectReferenceIndexProvider(() => script.getState()),
        ),
      )
    } catch (error) {
      deleteError = error.message
    }
    try {
      serializeProject(
        mergeEditorProjectionWithCurrentAuthorState(script.getState(), main.getState()),
      )
    } catch (error) {
      saveError = error.message
    }
    console.log(
      'D-reference-delete',
      JSON.stringify({
        selection: selection.kind,
        blockers: count,
        scenesAfter: main.getState().scenes.map((s) => s.id),
        deleteError,
        saveError,
      }),
    )
    if (selection.kind === 'use') {
      assert(count > 0)
      assert(deleteError)
      assert.equal(saveError, undefined)
    } else {
      assert.equal(count, 0)
      assert.equal(deleteError, undefined)
      assert.match(saveError, /场景 "target" 不在 scenes/)
      assert.deepEqual(
        main.getState().scenes.map((s) => s.id),
        ['source'],
      )
      assert.equal(coordinator.undo(), true)
      serializeProject(
        mergeEditorProjectionWithCurrentAuthorState(script.getState(), main.getState()),
      )
      console.log(
        'D-reference-delete-control',
        JSON.stringify({ selection: selection.kind, undoRestored: true }),
      )
    }
  }
} finally {
  await server.close()
  globalThis.fetch = oldFetch
}
