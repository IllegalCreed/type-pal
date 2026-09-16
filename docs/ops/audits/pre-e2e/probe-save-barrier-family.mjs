// SAVE-BARRIER-LINEAGE-1 premise probe, not a product fix or formal regression suite.
// node --import tsx docs/ops/audits/pre-e2e/probe-save-barrier-family.mjs --mode=original|admission-only
// admission-only removes ONE begin gate in memory to refute that incomplete fix. No product writes.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const root = new URL('../../../../', import.meta.url)
const mode = process.argv.find((arg) => arg.startsWith('--mode='))?.slice(7) ?? 'original'
assert.ok(['original', 'admission-only'].includes(mode))
const path = new URL('packages/reforge/src/script-world.ts', root)
const before = readFileSync(path, 'utf8')
const hash = (text) => createHash('sha256').update(text).digest('hex')
const req = createRequire(new URL('packages/reforge/package.json', root))
const { createServer } = await import(req.resolve('vite'))
const priorFetch = globalThis.fetch
globalThis.fetch = () => {
  throw new Error('premise probe forbids network')
}
let hits = 0
const server = await createServer({
  root: fileURLToPath(new URL('packages/reforge/', root)),
  configFile: false,
  server: { middlewareMode: true, watch: null, hmr: false, ws: false },
  appType: 'custom',
  optimizeDeps: { noDiscovery: true, include: [] },
  plugins:
    mode === 'admission-only'
      ? [
          {
            name: 'single-incomplete-admission-fix',
            enforce: 'pre',
            load(id) {
              if (id !== fileURLToPath(path)) return
              const needle = 'if (this.pending) return\n    const key = ownerKey(owner)'
              assert.equal(before.split(needle).length, 2)
              hits++
              return before.replace(
                needle,
                '/* witness: admission gate removed */\n    const key = ownerKey(owner)',
              )
            },
          },
        ]
      : [],
})
const deferred = () => {
  let resolve
  const promise = new Promise((yes) => {
    resolve = yes
  })
  return { promise, resolve }
}
try {
  const { ScriptProjectRuntime } = await server.ssrLoadModule('/src/runtime-script-project.ts')
  const { FlowRuntimeCoordinator } = await server.ssrLoadModule('/src/script-world.ts')
  const lineage = await server.ssrLoadModule('/src/script-activity-lineage.ts')
  const { emptyWorldScriptState, buildEntityLifecycleReferenceIndex } = await server.ssrLoadModule(
    '/../content/src/index.ts',
  )
  const machine = (waitFirst) => ({
    kind: 'stateMachine',
    machine: {
      id: 'exit-flow',
      label: 'exit',
      initial: 'first',
      states: {
        first: {
          label: 'first',
          body: [
            ...(waitFirst ? [{ kind: 'confirm', onNo: [] }] : []),
            { kind: 'setFlag', flag: 'first', value: true },
          ],
          next: { kind: 'to', state: 'last', yield: 'macroTask' },
        },
        last: {
          label: 'last',
          body: [{ kind: 'setFlag', flag: 'childEnd', value: true }],
          next: { kind: 'stay' },
        },
      },
    },
  })
  async function scenario({ save, nested }) {
    const entered = deferred(),
      answer = deferred()
    const world = {
      party: [],
      money: 0,
      learnedSkills: {},
      inventory: [],
      script: emptyWorldScriptState(),
    }
    const scene = {
      id: 's',
      mapId: 'map',
      entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
      entities: [],
      hooks: {
        onTeleport: {
          initial: 'exit',
          variants: { exit: { label: 'exit', order: 0, flow: machine(!nested) } },
        },
      },
    }
    let runtime,
      snapshots = 0
    runtime = new ScriptProjectRuntime({ sharedScripts: {} }, world, 'c'.repeat(64), {
      lifecycleReferences: buildEntityLifecycleReferenceIndex([scene]),
      scene: () => scene,
      currentSceneId: () => 's',
      currentSceneSessionId: () => 1,
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
      confirm: async () => {
        entered.resolve()
        return answer.promise
      },
      startBattle: async () => 'victory',
      teleportOut: (signal) => runtime.runSceneHook(scene, 'onTeleport', { signal }),
      wait: async () => {},
      waitWorldTick: async () => {},
      yieldMacroTask: async () => {},
    })
    const signal = new AbortController().signal
    const running = nested
      ? runtime.runCommands(
          [
            { kind: 'confirm', onNo: [] },
            { kind: 'teleportOut' },
            { kind: 'setFlag', flag: 'parentEnd', value: true },
          ],
          { signal },
        )
      : runtime.runSceneHook(scene, 'onTeleport', { signal })
    await entered.promise
    const saving = save
      ? runtime
          .withSaveBarrier(() => {
            snapshots++
            return structuredClone(world.script)
          }, 100)
          .then(
            (value) => ({ saved: true, snapshot: value }),
            (error) => ({ saved: false, error: error.message }),
          )
      : Promise.resolve({ saved: false, notRequested: true })
    assert.equal(snapshots, 0)
    answer.resolve(true)
    const result = await saving
    await running
    return {
      nested,
      result,
      snapshots,
      flags: world.script.flags,
      cursor: world.script.behaviors.scenes?.s?.onTeleport?.cursor,
    }
  }
  const normal = await scenario({ save: false, nested: true })
  assert.deepEqual(normal.flags, { first: true, childEnd: true, parentEnd: true })
  const nested = await scenario({ save: true, nested: true })
  if (mode === 'original') {
    assert.equal(nested.result.saved, false)
    assert.match(nested.result.error, /save barrier 超时/)
    assert.equal(nested.snapshots, 0)
    assert.deepEqual(nested.flags, normal.flags)
  } else {
    assert.ok(hits > 0)
    assert.equal(nested.result.saved, true)
    assert.deepEqual(nested.result.snapshot.flags, { first: true, parentEnd: true })
    assert.equal(nested.result.snapshot.flags.childEnd, undefined)
    assert.deepEqual(nested.cursor.at, { kind: 'state', machine: 'exit-flow', state: 'last' })
  }
  const independent = await scenario({ save: true, nested: false })
  assert.equal(independent.result.saved, true)
  assert.deepEqual(independent.flags, { first: true })
  assert.deepEqual(independent.cursor.at, { kind: 'state', machine: 'exit-flow', state: 'last' })

  let internalLifecycleWindow
  if (mode === 'original') {
    // API-level pressure test only. This artificially holds a registration after its real lease closes;
    // it does NOT establish a reachable new user-facing defect or reopen U-02.
    const coordinator = new FlowRuntimeCoordinator(),
      key = {},
      signal = new AbortController().signal
    const lease = coordinator.begin(
      { kind: 'scene-hook', scene: 's', slot: 'onTeleport' },
      () => {},
    )
    assert.ok(lease)
    const held = deferred()
    const registration = lineage.withRegisteredScriptActivityLineage(
      key,
      signal,
      () => held.promise,
    )
    const barrier = coordinator.requestSaveBarrier()
    await lease.reachSafePoint({ kind: 'stage', stage: 'next' })
    await barrier.ready
    let enteredAfterReady = false
    await lineage.withScriptActivityLineage(key, coordinator, signal, () => {
      enteredAfterReady = true
    })
    assert.equal(enteredAfterReady, true)
    internalLifecycleWindow = {
      enteredAfterReady,
      scope: 'artificial API lifecycle window; not a product-path reproduction',
    }
    barrier.release()
    held.resolve()
    await registration
  }
  assert.equal(readFileSync(path, 'utf8'), before)
  console.log(
    JSON.stringify(
      {
        mode,
        sourceSha256: hash(before),
        mutationHits: hits,
        normal,
        nested,
        independent,
        internalLifecycleWindow,
        scope: 'read-only premise/counterexample; not a successful fix, not browser/E2E',
      },
      null,
      2,
    ),
  )
} finally {
  globalThis.fetch = priorFetch
  await server.close()
}
