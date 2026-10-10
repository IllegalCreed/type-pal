import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'
import { checkAuthoredOwnership, checkAutomaticLifecycle } from './automatic-lifecycle-contract.mjs'
import { instrumentOpeningCausalTrace } from './opening-causal-instrumentation.mjs'
import { checkPersistentEffects } from './persistent-effect-model.mjs'
import { createScriptCausalObserver } from './script-causal-observer.mjs'

async function actual(name, declaration) {
  const file = `packages/reforge/src/${name}.ts`
  const source = await readFile(new URL(`../../${file}`, import.meta.url), 'utf8')
  const code = instrumentOpeningCausalTrace(source, file).code
  const ast = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true)
  const matches = []
  function visit(node) {
    if (
      (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) &&
      node.name?.text === declaration
    )
      matches.push(node)
    ts.forEachChild(node, visit)
  }
  visit(ast)
  assert.equal(matches.length, 1)
  return ts.transpile(matches[0].getText(ast).replace(/^export /, ''), {
    target: ts.ScriptTarget.ES2022,
  })
}

function observer(poses = {}) {
  const host = {},
    errors = []
  let order = 0
  const observer = new Function(
    'globalThis',
    'options',
    `return (${createScriptCausalObserver})(options)`,
  )(host, {
    append: (list, value) => list.push(structuredClone({ ...value, order: ++order })),
    context: () => ({ scene: 's003', sceneVisit: 1, tick: 0, poses }),
    snapshotGame() {},
    fail: (error) => errors.push(String(error)),
    scenes: ['s003'],
  })
  return { host, errors, read: () => ({ causes: observer.read() }) }
}

test('real canonical move transaction distinguishes pending, pre-commit cancellation and irreversible post-commit cancellation', async () => {
  const source = `${await actual('script-project-core', 'writeEntityValue')}\n${await actual('script-project-core', 'BaseProjectScriptRuntimeHost')}`
  const target = { scene: 's003', entity: 'e59' },
    from = { col: 137, row: 76, height: 0 },
    to = { col: 137, row: 72, height: 0 }
  for (const mode of ['complete', 'cancel-before', 'cancel-after', 'ongoing']) {
    const o = observer(),
      world = { script: { entityPos: { s003: { e59: from } } } }
    o.host.__openingCauseSnapshot = () => o.host.__openingCauseWorld(world)
    const Host = new Function('globalThis', `${source};return BaseProjectScriptRuntimeHost`)(o.host)
    const runner = {},
      controller = new AbortController(),
      command = { kind: 'moveEntity', target, to, speed: 'normal' }
    o.host.__openingCauseRun(runner, controller.signal, {})
    o.host.__openingCauseStep(runner, { timing: 'auto', command: { kind: 'leaf', command } })
    const activityId = o.read().causes.at(-1).activityId
    o.host.__openingCauseLifecycleSnapshot = () => ({
      authority: {},
      epochs: {},
      restored: [],
      activations: [
        {
          signal: controller.signal,
          entity: 'e59',
          epoch: 0,
          sceneSession: 's003:1',
        },
      ],
    })
    let finish
    const host = new Host(
      world.script,
      {},
      {
        currentSceneId: () => 's003',
        executeEffect: async (_command, _context, signal, commit) => {
          if (mode === 'ongoing')
            await new Promise((resolve) => {
              finish = resolve
            })
          if (mode === 'cancel-before') controller.abort()
          signal.throwIfAborted()
          commit.commitMoveEntityEndpoint()
          if (mode === 'cancel-after') controller.abort()
        },
      },
    )
    const pending = host.execute(command, {}, controller.signal)
    if (mode === 'ongoing') {
      const trace = o.read(),
        proof = checkPersistentEffects(trace, [])
      assert.equal(proof.status, 'proved')
      assert.equal(proof.motionPrefixes[0].status, 'ongoing')
      assert.equal(trace.causes.at(-1).lifecycle.activations[0].activityId, activityId)
      const absent = structuredClone(trace)
      absent.causes.at(-1).lifecycle.activations = []
      assert.equal(checkPersistentEffects(absent, []).status, 'unknown')
      finish()
    }
    if (mode.startsWith('cancel')) await assert.rejects(pending, { name: 'AbortError' })
    else await pending
    o.host.__openingCauseEnded(runner, {
      aborted: controller.signal.aborted,
      resolved: !controller.signal.aborted,
    })
    assert.deepEqual(o.errors, [])
    const trace = o.read(),
      proof = checkPersistentEffects(trace, [])
    assert.equal(proof.status, 'proved', mode)
    assert.deepEqual(world.script.entityPos.s003.e59, mode === 'cancel-before' ? from : to)
    const missing = structuredClone(trace)
    missing.causes = missing.causes.filter((e) => e.phase !== 'move-start')
    assert.equal(checkPersistentEffects(missing, []).status, 'unknown')
    const noEnd = structuredClone(trace)
    noEnd.causes = noEnd.causes.filter((e) => e.phase !== 'move-end')
    assert.equal(checkPersistentEffects(noEnd, []).status, 'unknown')
    if (mode !== 'cancel-before') {
      const wrong = structuredClone(trace)
      for (const e of wrong.causes) if (e.world) e.world.script.entityPos.s003.e59 = from
      assert.equal(checkPersistentEffects(wrong, []).witness.rule, 'move-committed-endpoint', mode)
      const rollback = structuredClone(trace)
      for (const e of rollback.causes)
        if (['move-end', 'run-ended'].includes(e.phase)) e.world.script.entityPos.s003.e59 = from
      assert.equal(
        checkPersistentEffects(rollback, []).witness.rule,
        'move-endpoint-retained',
        mode,
      )
    } else assert.equal(proof.checked, 0)
  }
})

test('actual coordinator mutations, repeated takes and release-all are independently checked against host checkpoints', async () => {
  const o = observer(),
    code = await actual('motion-runtime-coordinator', 'MotionRuntimeCoordinator')
  // Prepare the target scene before the live scene/lifecycle exists, as the real
  // restore entry does. This is saved input, not a checkpoint of live authority.
  const Player = new Function(
    'globalThis',
    `${await actual('entity-action-player', 'EntityActionPlayer')};return EntityActionPlayer`,
  )(o.host)
  const prepare = new Function(
    'globalThis',
    'entityActions',
    `${await actual('main', 'prepareSceneActions')};return prepareSceneActions`,
  )(o.host, new Player())
  assert.equal(typeof prepare({ id: 's003' }, new Map(), { actions: [] }), 'function')
  assert.equal(o.read().causes[0].phase, 'action-preparing')
  assert.equal(o.read().causes[0].lifecycle, null)
  const Coordinator = new Function('globalThis', `${code};return MotionRuntimeCoordinator`)(o.host)
  const coordinator = new Coordinator()
  o.host.__openingCauseLifecycleSnapshot = () => ({
    scene: 's003',
    sceneSession: coordinator.currentSceneSessionId('s003'),
    authority: Object.fromEntries(coordinator.authority),
    epochs: Object.fromEntries(coordinator.authorityEpoch),
    activations: [],
    restored: [],
  })
  const runner = {},
    signal = new AbortController().signal
  o.host.__openingCauseRun(runner, signal, {})
  const command = () =>
    o.host.__openingCauseStep(runner, {
      self: { scene: 's003', entity: 'e59' },
      timing: 'interactive',
      command: { kind: 'leaf', command: { kind: 'wait', ms: 10 } },
    })
  command()
  coordinator.setAuthority('e59', { kind: 'script' })
  coordinator.setAuthority('e59', { kind: 'script' })
  command()
  coordinator.setAuthority('party', { kind: 'mount', parent: 'e116', dx: 0, dy: 0 })
  coordinator.releaseAllAuthority()
  coordinator.invalidateSceneSession()
  assert.equal(coordinator.releaseAuthority('e59'), false)
  command()
  o.host.__openingCauseEnded(runner, { aborted: false, resolved: true })
  assert.deepEqual(o.errors, [])
  const raw = o.read()
  assert.equal(checkAutomaticLifecycle(raw).status, 'proved')
  assert.equal(raw.causes.filter((e) => e.phase === 'authority-changed').length, 5)
  const omitted = structuredClone(raw)
  omitted.causes.splice(
    omitted.causes.findIndex((e) => e.phase === 'authority-changed'),
    1,
  )
  assert.equal(checkAutomaticLifecycle(omitted).status, 'rejected')
  const missingSession = structuredClone(raw)
  missingSession.causes = missingSession.causes.filter((e) => e.phase !== 'session-invalidated')
  assert.equal(checkAutomaticLifecycle(missingSession).witness.rule, 'session-transition-observed')
  const forged = structuredClone(raw)
  forged.causes.find((e) => e.phase === 'authority-changed').epochAfter++
  assert.equal(checkAutomaticLifecycle(forged).status, 'rejected')
  const absent = structuredClone(raw)
  for (const event of absent.causes) delete event.lifecycle
  assert.equal(checkAutomaticLifecycle(absent).status, 'unknown')
})

test('ownership cannot borrow a real gated take that started before the story window', async () => {
  const code = await actual('motion-runtime-coordinator', 'MotionRuntimeCoordinator')
  for (const overlaps of [false, true]) {
    const o = observer(),
      Coordinator = new Function('globalThis', `${code};return MotionRuntimeCoordinator`)(o.host)
    const coordinator = new Coordinator()
    o.host.__openingCauseLifecycleSnapshot = () => ({
      scene: 's003',
      sceneSession: 's003:1',
      authority: Object.fromEntries(coordinator.authority),
      epochs: Object.fromEntries(coordinator.authorityEpoch),
      activations: [],
      restored: [],
    })
    const a = {},
      b = {},
      signal = () => new AbortController().signal
    const command = (runner) =>
      o.host.__openingCauseStep(runner, {
        timing: 'interactive',
        command: {
          kind: 'leaf',
          command: { kind: 'takeEntity', target: { scene: 's003', entity: 'e59' } },
        },
      })
    o.host.__openingCauseRun(a, signal(), {})
    command(a)
    const boundary = o.read().causes.at(-1).order
    let release
    const gate = new Promise((resolve) => {
      release = resolve
    })
    const pending = (async () => {
      await gate
      coordinator.setAuthority('e59', { kind: 'script' })
      o.host.__openingCauseEnded(a, { resolved: true, aborted: false })
    })()
    if (!overlaps) {
      release()
      await pending
    }
    o.host.__openingCauseRun(b, signal(), {})
    command(b)
    if (overlaps) {
      release()
      await pending
    } else coordinator.setAuthority('e59', { kind: 'script' })
    o.host.__openingCauseEnded(b, { resolved: true, aborted: false })
    const full = o.read(),
      trace = {
        initialCauses: full.causes.filter((e) => e.order <= boundary),
        causes: full.causes.filter((e) => e.order > boundary),
      }
    const result = checkAuthoredOwnership(trace)
    assert.equal(result.status, overlaps ? 'unknown' : 'proved')
    if (overlaps) assert.equal(result.witness.rule, 'authority-competing-command')
    assert.deepEqual(o.errors, [])
  }
})

test('real mount, ride and take-party callers satisfy own-command ownership and release mounted riders on dismount', async () => {
  const o = observer({ e116: { state: { visible: true } }, e117: { state: { visible: true } } })
  const Coordinator = new Function(
    'globalThis',
    `${await actual('motion-runtime-coordinator', 'MotionRuntimeCoordinator')};return MotionRuntimeCoordinator`,
  )(o.host)
  const coordinator = new Coordinator()
  o.host.__openingCauseLifecycleSnapshot = () => ({
    scene: 's003',
    sceneSession: 's003:1',
    authority: Object.fromEntries(coordinator.authority),
    epochs: Object.fromEntries(coordinator.authorityEpoch),
    activations: [],
    restored: [],
  })
  const file = 'packages/reforge/src/main.ts',
    source = await readFile(new URL(`../../${file}`, import.meta.url), 'utf8')
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true),
    definitions = new Map()
  const collect = (node) => {
    if (ts.isVariableDeclaration(node) && ['host', 'takeByScript'].includes(node.name.getText(ast)))
      definitions.set(node.name.getText(ast), node)
    if (
      ts.isFunctionDeclaration(node) &&
      ['dismountParty', 'detachMountChildrenOf'].includes(node.name?.text)
    )
      definitions.set(node.name.text, node)
    ts.forEachChild(node, collect)
  }
  collect(ast)
  const bodies = ['dismountParty', 'detachMountChildrenOf'].map((name) =>
    definitions.get(name).getText(ast),
  )
  bodies.push(`const takeByScript = ${definitions.get('takeByScript').initializer.getText(ast)};`)
  for (const name of ['mountParty', 'ride']) {
    const property = definitions
      .get('host')
      .initializer.properties.find((p) => p.name?.getText(ast) === name)
    bodies.push(`const ${name} = ${property.initializer.getText(ast)};`)
  }
  // Only geometry/resource/async IO are substituted. Actual ownership and detach logic is unchanged.
  const deps = {
    authority: coordinator.authority,
    followerAuth: new Map(),
    world: { party: [{}] },
    activeScene: { scene: { entities: [{ id: 'e116' }, { id: 'e117' }] } },
    player: { pos: { col: 0, row: 0, height: 0 } },
    facing: 'down',
    entityLifecycleGates: () => ({ visible: true }),
    entityMotionPermanentlyRemoved: () => false,
    setAuthority: (...args) => coordinator.setAuthority(...args),
    releaseAuthority: (id) => coordinator.releaseAuthority(id),
    deriveMounts: () => {},
    deriveFollowers: () => {},
    assertRunnerActive: (s) => s.throwIfAborted(),
    scheduleEntityMove: async () => {},
    host: { report: () => assert.fail('unexpected inactive carrier') },
  }
  const code = ts.transpile(`let trail=[];${bodies.join('\n')}`, { target: ts.ScriptTarget.ES2022 })
  const api = new Function(...Object.keys(deps), `${code}; return {mountParty,ride,takeByScript}`)(
    ...Object.values(deps),
  )
  deps.host.mountParty = api.mountParty
  const runner = {},
    signal = new AbortController().signal
  o.host.__openingCauseRun(runner, signal, {})
  const command = (c) =>
    o.host.__openingCauseStep(runner, {
      self: null,
      timing: 'interactive',
      command: { kind: 'leaf', command: c },
    })
  const target = { scene: 's003', entity: 'e116' },
    rider = { scene: 's003', entity: 'e117' }
  command({
    kind: 'mountParty',
    target,
    dx: -2,
    dy: -4,
    riders: [{ target: rider, dx: -2, dy: 2.25 }],
  })
  api.mountParty('e116', -2, -4, [{ id: 'e117', dx: -2, dy: 2.25 }])
  command({ kind: 'ride', target, to: { col: 3, row: 4, height: 0 }, speed: 2 })
  await api.ride('e116', { col: 3, row: 4, height: 0 }, 2, signal)
  command({ kind: 'moveParty', to: { col: 5, row: 6, height: 0 }, speed: 2 })
  api.takeByScript('party')
  command({ kind: 'wait', ms: 10 })
  o.host.__openingCauseEnded(runner, { resolved: true, aborted: false })
  const trace = o.read()
  assert.equal(checkAutomaticLifecycle(trace).status, 'proved')
  assert.equal(checkAuthoredOwnership(trace).status, 'proved')
  for (const [kind, actor] of [
    ['ride', 'party'],
    ['moveParty', 'e116'],
    ['wait', 'e117'],
  ]) {
    const wrong = structuredClone(trace)
    const end = wrong.causes.find(
      (e) => e.phase === 'command' && e.occurrence.command.command.kind === kind,
    )
    end.lifecycle.authority[actor] = { kind: 'script' }
    if (kind === 'moveParty') delete end.lifecycle.authority.e116
    assert.equal(checkAuthoredOwnership(wrong).status, 'rejected', kind)
  }
})

test('real wake gate observes only actual blocked waits, settlement and cancellation without probing eligibility again', async () => {
  const o = observer(),
    code = await actual('script-wake-gate', 'ScriptWakeGate')
  // Real ScriptWorkWait has no external imports. Keep its real exactly-once settlement.
  const queue = await readFile(
    new URL('../../packages/reforge/src/script-work-queue.ts', import.meta.url),
    'utf8',
  )
  const queueCode = ts.transpile(queue.replaceAll('export ', ''), {
    target: ts.ScriptTarget.ES2022,
  })
  const Gate = new Function('globalThis', `${queueCode};${code};return ScriptWakeGate`)(o.host)
  o.host.__openingCauseLifecycleSnapshot = () => ({
    scene: 's003',
    sceneSession: 's003:1',
    authority: {},
    epochs: {},
    activations: [],
    restored: [],
  })
  const gate = new Gate(),
    controller = new AbortController(),
    runner = {}
  o.host.__openingCauseRun(runner, controller.signal, {})
  o.host.__openingCauseStep(runner, {
    timing: 'interactive',
    command: { kind: 'leaf', command: { kind: 'wait', ms: 10 } },
  })
  let eligible = false,
    calls = 0
  const pending = gate.wait(controller.signal, () => {
    calls++
    return eligible
  })
  gate.notify()
  eligible = true
  gate.notify()
  await pending
  assert.equal(calls, 3)
  await gate.wait(controller.signal, () => {
    calls++
    return true
  })
  const cancelled = gate.wait(controller.signal, () => false)
  controller.abort()
  await assert.rejects(cancelled, { name: 'AbortError' })
  gate.notify()
  o.host.__openingCauseEnded(runner, { aborted: true, resolved: false })
  assert.deepEqual(o.errors, [])
  const raw = o.read()
  assert.deepEqual(
    raw.causes.filter((e) => e.phase.startsWith('gate-')).map((e) => e.phase),
    ['gate-wait', 'gate-ready', 'gate-wait', 'gate-rejected'],
  )
  assert.equal(checkAutomaticLifecycle(raw).status, 'proved')
  const wrong = structuredClone(raw)
  wrong.causes.find((e) => e.phase === 'gate-ready').signalActivityId++
  assert.equal(checkAutomaticLifecycle(wrong).status, 'rejected')
})

test('real startAutoRunner records activation, observed abort and actual finally; missing start cannot prove automatic dispatch', async () => {
  const o = observer(),
    code = await actual('main', 'startAutoRunner'),
    entity = { id: 'e59', pages: [{ auto: { stages: [{}] } }] }
  let workFinished = 0,
    resolveRun
  const scope = {
    globalThis: o.host,
    nextAutoActivationEpoch: 1,
    autoActivations: new Map(),
    autoActivationBySignal: new WeakMap(),
    lifecycleEntryFor: () => ({ phase: 'active' }),
    sceneResources: { peek: () => ({ id: 's003' }) },
    activeScene: { scene: { id: 's003', entities: [entity] } },
    currentMotionSceneSessionId: () => 's003:1',
    scriptWork: { begin: () => () => workFinished++ },
    entityActions: { attachRestoredOwner() {} },
    motion: { gaitActivationOwner: () => null },
    clearEntityGait() {},
    isAbortError: (e) => e.name === 'AbortError',
    scriptRuntime: {
      runEntityBehavior: (_scene, _id, _channel, { signal }) => {
        const runner = {}
        o.host.__openingCauseRun(runner, signal, {})
        o.host.__openingCauseStep(runner, {
          self: { scene: 's003', entity: 'e59' },
          timing: 'auto',
          command: { kind: 'leaf', command: { kind: 'wait', ms: 10 } },
        })
        return new Promise((resolve) => {
          resolveRun = () => {
            o.host.__openingCauseEnded(runner, {
              aborted: signal.aborted,
              resolved: !signal.aborted,
            })
            resolve(true)
          }
        })
      },
    },
  }
  o.host.__openingCauseLifecycleSnapshot = () => ({
    scene: 's003',
    sceneSession: 's003:1',
    authority: {},
    epochs: {},
    restored: [],
    activations: [...scope.autoActivations.values()].map((a) => ({
      entity: a.entityId,
      signal: a.controller.signal,
      epoch: a.epoch,
      sceneSession: a.sceneSessionId,
    })),
  })
  const start = new Function('scope', `with(scope){${code};return startAutoRunner}`)(scope)
  start(entity)
  start(entity)
  const activation = scope.autoActivations.get('e59')
  activation.controller.abort()
  resolveRun()
  await Promise.resolve()
  assert.equal(workFinished, 1)
  assert.equal(scope.autoActivations.size, 0)
  assert.deepEqual(o.errors, [])
  const raw = o.read()
  assert.equal(checkAutomaticLifecycle(raw).status, 'proved')
  const missing = structuredClone(raw)
  missing.causes = missing.causes.filter((e) => e.phase !== 'auto-started')
  assert.equal(checkAutomaticLifecycle(missing).status, 'unknown')
  o.host.__openingCauseFrame({ now: 20 })
  const missingEnd = o.read()
  missingEnd.causes = missingEnd.causes.filter((e) => e.phase !== 'auto-ended')
  assert.equal(checkAutomaticLifecycle(missingEnd).witness.rule, 'activation-end-observed')
  const taken = structuredClone(raw)
  for (const e of taken.causes) e.lifecycle.authority.e59 = { kind: 'script' }
  assert.equal(checkAutomaticLifecycle(taken).witness.rule, 'taken-owner-cannot-dispatch')
})

test('host snapshot hooks are installed before boot recovery and activation; abort diagnostics cannot escape into gameplay', async () => {
  const file = 'packages/reforge/src/main.ts',
    source = await readFile(new URL(`../../${file}`, import.meta.url), 'utf8')
  const { instrumentOpeningTrace } = await import('./opening-trace-plugin.mjs')
  const code = instrumentOpeningTrace(source, file).code
  const ast = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true)
  const boot = ast.statements.find(
    (n) => ts.isFunctionDeclaration(n) && n.name?.text === 'bootGame',
  )
  const statements = boot.body.statements.map((n) => n.getText(ast))
  const snapshot = statements.findIndex((s) => s.startsWith('globalThis.__openingCauseSnapshot ='))
  const lifecycle = statements.findIndex((s) =>
    s.startsWith('globalThis.__openingCauseLifecycleSnapshot ='),
  )
  const ready = statements.findIndex((s) => s.startsWith('const currentMotionSceneSessionId'))
  assert(snapshot > ready && lifecycle > ready)
  for (const [i, s] of statements.entries())
    if (
      !s.startsWith('function ') &&
      (s.includes('await doLoad(bootLoadSlot)') ||
        s.includes('await restorePayload(p, token, where)') ||
        s === 'startAutoRunners()')
    )
      assert(
        snapshot < i && lifecycle < i,
        `snapshot must precede actual startup: ${s.slice(0, 80)}`,
      )
  const o = observer(),
    controller = new AbortController()
  o.host.__openingCauseAuto('auto-started', controller.signal, {
    entity: 'e59',
    epoch: 1,
    sceneSession: 's003:1',
  })
  o.host.__openingCauseLifecycleSnapshot = () => {
    throw new Error('snapshot failure')
  }
  assert.doesNotThrow(() => controller.abort())
  assert.deepEqual(o.errors, ['Error: snapshot failure'])
})
