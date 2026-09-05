// Baseline 84434b8a. Actual canonical runtime/runner/coordinator; only host I/O is stubbed.
// node --import tsx docs/ops/audits/pre-e2e/probe-canonical-async.mjs
import assert from 'node:assert/strict'
import {
  buildEntityLifecycleReferenceIndex,
  emptyWorldScriptState,
} from '../../../../packages/content/src/index.ts'
import { ScriptProjectRuntime } from '../../../../packages/reforge/src/runtime-script-project.ts'
import { executeScriptHostEffect } from '../../../../packages/reforge/src/script-host-adapter.ts'

assert.equal(typeof globalThis.indexedDB, 'undefined')
const oldFetch = globalThis.fetch
globalThis.fetch = () => {
  throw new Error('Audit forbids network')
}
globalThis.indexedDB = {
  open() {
    throw new Error('Audit forbids persistent storage')
  },
}
const deferred = () => {
  let resolve
  const promise = new Promise((r) => {
    resolve = r
  })
  return { promise, resolve }
}
const scene = {
  id: 's',
  mapId: 'old-map',
  entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
  entities: [],
}
const world = () => ({
  party: [],
  money: 0,
  learnedSkills: {},
  inventory: [],
  script: emptyWorldScriptState(),
})
const options = (extra = {}) => ({
  lifecycleReferences: buildEntityLifecycleReferenceIndex([scene]),
  currentSceneId: () => scene.id,
  currentSceneSessionId: () => 1,
  scene: () => scene,
  executeEffect() {},
  worldChanged() {},
  query: {
    hasItem: () => false,
    ownsItem: () => false,
    itemEquipped: () => false,
    allFullHp: () => true,
    money: () => 0,
    inParty: () => false,
    entityInScene: () => false,
    facingEntity: () => false,
  },
  confirm: async () => true,
  startBattle: async () => 'victory',
  teleportOut: async () => true,
  wait: async () => {},
  waitWorldTick: async () => {},
  yieldMacroTask: async () => {},
  ...extra,
})
try {
  const w1 = world()
  w1.script.mapOverride = { s: 'old-map' }
  let changes = 0
  const runtime1 = new ScriptProjectRuntime(
    { sharedScripts: {} },
    w1,
    'a'.repeat(64),
    options({
      executeEffect: (command, context, signal) =>
        executeScriptHostEffect(
          {
            reloadMap: async () => {
              throw new Error('fixture map asset load failed')
            },
            query: { sceneId: () => scene.id },
          },
          command,
          context,
          signal,
          { currentSceneId: () => scene.id },
        ),
      worldChanged: () => {
        changes++
      },
    }),
  )
  await assert.rejects(
    runtime1.runCommands([{ kind: 'setSceneMapOverride', mapId: 'new-map' }], {
      signal: new AbortController().signal,
    }),
    /fixture map asset load failed/,
  )
  const snapshot = await runtime1.withSaveBarrier(() => structuredClone(w1))
  assert.equal(snapshot.script.mapOverride.s, 'new-map')
  assert.equal(changes, 0)
  console.log(
    JSON.stringify({
      id: 'B-05',
      commandRejected: true,
      savedOverride: snapshot.script.mapOverride.s,
      changeNotifications: changes,
      rendererNotRun: true,
    }),
  )

  const hook = {
    label: 'Exit',
    order: 0,
    flow: {
      kind: 'stages',
      initial: 'start',
      stages: [{ id: 'start', body: [{ kind: 'setFlag', flag: 'teleported', value: true }] }],
    },
  }
  for (const target of ['battle', 'teleport']) {
    const entered = deferred(),
      answer = deferred(),
      w = world()
    const targetScene = {
      ...scene,
      hooks: { onTeleport: { initial: 'exit', variants: { exit: hook } } },
    }
    let battleStarted = false,
      snapshotCalled = false,
      runtime
    runtime = new ScriptProjectRuntime(
      { sharedScripts: {} },
      w,
      'b'.repeat(64),
      options({
        scene: () => targetScene,
        confirm: async () => {
          entered.resolve()
          return await answer.promise
        },
        startBattle: async () => {
          battleStarted = true
          return 'victory'
        },
        teleportOut: (signal) => runtime.runSceneHook(targetScene, 'onTeleport', { signal }),
      }),
    )
    const running = runtime.runCommands(
      [
        { kind: 'confirm', onNo: [] },
        target === 'battle'
          ? { kind: 'startBattle', enemyTeamId: 'fixture' }
          : { kind: 'teleportOut' },
      ],
      { signal: new AbortController().signal },
    )
    await entered.promise
    // main explicitly permits F5 in the script-confirm branch. 30ms only shortens the real barrier timeout.
    const saving = runtime
      .withSaveBarrier(() => {
        snapshotCalled = true
        return structuredClone(w)
      }, 30)
      .then(
        () => ({ saved: true }),
        (error) => ({ saved: false, error: error.message }),
      )
    answer.resolve(true)
    const result = await saving
    await running
    assert.equal(result.saved, false)
    assert.match(result.error, /barrier 超时/)
    assert.equal(snapshotCalled, false)
    assert.equal(target === 'battle' ? battleStarted : w.script.flags.teleported, true)
    console.log(
      JSON.stringify({
        id: target === 'battle' ? 'B-06' : 'B-07',
        ...result,
        snapshotCalled,
        resumedAfterTimeout: true,
        permanentDeadlock: false,
      }),
    )
  }

  const w2 = world(),
    entered2 = deferred(),
    controller = new AbortController()
  const selectScene = {
    ...scene,
    hooks: { onEnter: { initial: 'before', variants: { before: hook, after: hook } } },
  }
  const runtime2 = new ScriptProjectRuntime(
    { sharedScripts: {} },
    w2,
    'c'.repeat(64),
    options({
      scene: async () => {
        entered2.resolve()
        return selectScene
      }, // Already-cached async resolver is enough.
    }),
  )
  const running2 = runtime2
    .runCommands(
      [
        {
          kind: 'selectSceneHooks',
          scene: 's',
          selection: { onEnter: { kind: 'use', value: 'after' } },
        },
      ],
      { signal: controller.signal },
    )
    .then(
      () => ({ ok: true }),
      (error) => ({ error: error.name }),
    )
  await entered2.promise
  assert.equal(w2.script.behaviors.scenes, undefined)
  controller.abort()
  const outcome = await running2
  assert.equal(outcome.error, 'AbortError')
  assert.equal(w2.script.behaviors.scenes.s.onEnter.selection.value, 'after')
  console.log(
    JSON.stringify({
      id: 'B-09',
      outcome,
      writeAfterCancel: w2.script.behaviors,
      fullRestoreInterleavingNotRun: true,
    }),
  )
} finally {
  delete globalThis.indexedDB
  globalThis.fetch = oldFetch
}
