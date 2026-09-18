import { fsaSource, loadAllAuthorScenes, loadCurrentProjectFrom } from '@type-pal/reforge'
import { expect, test } from 'vitest'
import { memoryAuthorDirectory } from './__tests__/author-save-fixture.js'
import {
  sceneGuardFixture,
  sceneReferences,
  stageFlow,
  transitionFlow,
} from './__tests__/scene-reference-fixture.js'
import { createEditorDerivedStore, isEditorDerivedSnapshotCurrent } from './editor-derived-store.js'
import { createProjectReferenceIndex } from './project-reference.js'
import { UpdateSceneHookCommand } from './script-editor.js'

test.each([
  'disabled',
  'inherit',
  'transition',
] as const)('%s blocks paired deletion before changing sessions, history or save output', async (mode) => {
  const flow =
    mode === 'transition'
      ? transitionFlow()
      : stageFlow([
          { kind: 'selectSceneHooks', scene: 'target', selection: { onEnter: { kind: mode } } },
        ])
  const f = await sceneGuardFixture(flow)
  const before = structuredClone({ main: f.main.getState(), script: f.script.getStateSnapshot() })
  const saved = await f.serialize()
  const version = f.history.getVersion()
  expect(() => f.deleteTarget()).toThrow(/场景 target 仍有 1 个外部引用/)
  expect({ main: f.main.getState(), script: f.script.getStateSnapshot() }).toEqual(before)
  expect(f.history.getVersion()).toBe(version)
  expect(f.history.canUndo()).toBe(false)
  expect(f.history.canRedo()).toBe(false)
  expect(await f.serialize()).toEqual(saved)
  expect(f.disk.changes).toEqual({ creates: [], closes: [], removes: [] })
})

test('removing a dependency refreshes warm/cold graphs; delete, serialized reopen, undo and redo stay consistent', async () => {
  const f = await sceneGuardFixture(transitionFlow())
  const staleWarm = f.warm()
  expect(sceneReferences(staleWarm)).toHaveLength(1)
  f.script.dispatch(new UpdateSceneHookCommand('start', 'onEnter', 'main', { flow: stageFlow() }))
  expect(sceneReferences(f.warm())).toEqual([])
  expect(sceneReferences(f.cold())).toEqual([])
  expect(sceneReferences(staleWarm)).toHaveLength(1)
  // Current provider must reject again after undo, even if a caller retained the previous empty view.
  expect(f.history.undo()).toBe(true)
  expect(() => f.deleteTarget()).toThrow(/外部引用/)
  expect(f.history.canRedo()).toBe(true)
  expect(f.history.redo()).toBe(true)
  f.deleteTarget()
  const reopen = async () => {
    const files = await f.serialize()
    // Author saves replace emitted files and retain unchanged binary assets; scene deletions are
    // applied to that same directory, not a fresh metadata-only bag that the loader might accept.
    const persisted = { ...Object.fromEntries(f.disk.files), ...files }
    for (const path of f.main.getDeletedScenePaths()) delete persisted[path]
    const reopenedDisk = memoryAuthorDirectory(persisted)
    const project = await loadCurrentProjectFrom(fsaSource(reopenedDisk.dir))
    const scenes = await loadAllAuthorScenes(project)
    expect(scenes).toEqual(f.script.getStateSnapshot().scenes)
    expect(reopenedDisk.files.has('content/scenes/target.json')).toBe(
      scenes.some((scene) => scene.id === 'target'),
    )
    for (const asset of Object.values(f.main.getState().assetCatalog.assets))
      expect(reopenedDisk.files.get(asset.path)).toEqual(f.disk.files.get(asset.path))
    return scenes.map((scene) => scene.id)
  }
  expect(await reopen()).toEqual(['start'])
  expect(f.history.undo()).toBe(true)
  expect(await reopen()).toEqual(['start', 'target'])
  expect(f.history.redo()).toBe(true)
  expect(await reopen()).toEqual(['start'])
  expect(f.disk.changes).toEqual({ creates: [], closes: [], removes: [] })
})

test.each([
  'disabled',
  'inherit',
  'transition',
] as const)('%s target-only self dependency is excluded by the deletion scope', async (mode) => {
  const f = await sceneGuardFixture()
  const flow =
    mode === 'transition'
      ? transitionFlow()
      : stageFlow([
          { kind: 'selectSceneHooks', scene: 'target', selection: { onEnter: { kind: mode } } },
        ])
  f.script.dispatch(new UpdateSceneHookCommand('target', 'onEnter', 'main', { flow }))
  expect(sceneReferences(f.cold())).toEqual([])
  f.deleteTarget()
  expect(f.script.getStateSnapshot().scenes.map((scene) => scene.id)).toEqual(['start'])
  await expect(f.serialize()).resolves.toBeDefined()
  expect(f.history.undo()).toBe(true)
  expect(
    f.script.getStateSnapshot().scenes.find((scene) => scene.id === 'target')?.hooks?.onEnter
      ?.variants.main?.flow,
  ).toEqual(flow)
})

test.each([
  'disabled',
  'inherit',
  'transition',
] as const)('%s real derived worker init and patches agree with the cold deletion guard', async (mode) => {
  const f = await sceneGuardFixture()
  const store = createEditorDerivedStore({ mainSession: f.main, scriptSession: f.script })
  const stop = store.start()
  const current = () =>
    new Promise<ReturnType<typeof createProjectReferenceIndex>>((resolve, reject) => {
      const revision = {
        mainHistoryVersion: f.main.getHistoryVersion(),
        scriptHistoryVersion: f.script.getHistoryVersion(),
      }
      const check = () => {
        const snapshot = store.getSnapshot()
        if (snapshot.status === 'failed') {
          unsubscribe()
          reject(new Error(snapshot.message))
        } else if (isEditorDerivedSnapshotCurrent(snapshot, revision)) {
          unsubscribe()
          resolve(createProjectReferenceIndex(snapshot.data.projectReferences))
        }
      }
      const unsubscribe = store.subscribe(check)
      check()
    })
  try {
    const formerlyEmpty = await current()
    expect(sceneReferences(formerlyEmpty)).toEqual([])
    const flow =
      mode === 'transition'
        ? transitionFlow()
        : stageFlow([
            { kind: 'selectSceneHooks', scene: 'target', selection: { onEnter: { kind: mode } } },
          ])
    f.script.dispatch(new UpdateSceneHookCommand('start', 'onEnter', 'main', { flow }))
    // The retained warm view is deliberately stale and empty; the destructive command must re-read.
    expect(sceneReferences(formerlyEmpty)).toEqual([])
    expect(() => f.deleteTarget()).toThrow(/仍有 1 个外部引用/)
    expect(sceneReferences(await current())).toEqual(sceneReferences(f.cold()))
    expect(sceneReferences(f.cold())).toHaveLength(1)
    expect(f.history.undo()).toBe(true)
    expect(sceneReferences(await current())).toEqual([])
    expect(f.history.redo()).toBe(true)
    expect(sceneReferences(await current())).toEqual(sceneReferences(f.cold()))
    expect(sceneReferences(f.cold())).toHaveLength(1)
  } finally {
    stop()
  }
})
