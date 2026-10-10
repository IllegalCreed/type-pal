import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { verifyMotionSlotLifetimes } from './motion-slot-contract.mjs'
import { instrumentOpeningTrace, openingTracePlugin } from './opening-trace-plugin.mjs'
import { createScriptCausalObserver } from './script-causal-observer.mjs'
import { verifyStoryMotion, verifyStoryPartyMotion } from './story-motion-contract.mjs'
import { verifyStoryHolds } from './story-presentation-intent.mjs'

const require = createRequire(new URL('../../packages/reforge/package.json', import.meta.url))
const { createServer } = await import(require.resolve('vite'))

test('real motion queues retain invocation identity through commit, acknowledgement, takeover and cancellation', async (t) => {
  const cacheDir = await mkdtemp(join(tmpdir(), 'type-pal-slots-'))
  const server = await createServer({
    configFile: false,
    cacheDir,
    root: fileURLToPath(new URL('../../packages/reforge', import.meta.url)),
    plugins: [openingTracePlugin()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    appType: 'custom',
  })
  const globals = new Map(
    Object.getOwnPropertyNames(globalThis)
      .filter((key) => key.startsWith('__openingCause'))
      .map((key) => [key, globalThis[key]]),
  )
  t.after(async () => {
    await server.close()
    await rm(cacheDir, { recursive: true, force: true })
    for (const key of Object.getOwnPropertyNames(globalThis).filter((key) =>
      key.startsWith('__openingCause'),
    )) {
      if (globals.has(key)) globalThis[key] = globals.get(key)
      else delete globalThis[key]
    }
  })
  const { WorldMotionRuntime } = await server.ssrLoadModule('/src/world-motion-runtime.ts')
  const { ScriptRunnerCore } = await server.ssrLoadModule('/src/script-runner-core.ts')
  const { compileBaseScriptFlow } = await server.ssrLoadModule('/src/script-compiler-core.ts')
  const motion = new WorldMotionRuntime(100),
    causes = [],
    errors = []
  let order = 0,
    position = { col: 0, row: 0, height: 0 },
    activeSignal
  createScriptCausalObserver({
    append: (list, event) => {
      const copy = structuredClone({ ...event, order: ++order })
      list.push(copy)
      causes.push(copy)
    },
    context: () => ({
      scene: 's003',
      sceneVisit: 1,
      tick: motion.worldTick,
      poses: {
        e62: { state: { position: [position.col, position.row, position.height], visible: true } },
        party: {
          state: { position: [position.col, position.row, position.height], visible: true },
        },
      },
    }),
    snapshotGame() {},
    fail: (error) => errors.push(error),
    scenes: ['s003'],
  })
  globalThis.__openingCauseLifecycleSnapshot = () => ({
    activations: activeSignal ? [{ entity: 'e62', epoch: 1, signal: activeSignal }] : [],
    restored: [],
    authority: Object.fromEntries(motion.coordinator.authority),
  })
  const target = { scene: 's003', entity: 'e62' }
  async function start(command) {
    const timing = command.kind === 'moveParty' ? 'interactive' : 'auto'
    const controller = new AbortController()
    activeSignal = controller.signal
    let ready, acknowledgement
    const entered = new Promise((resolve) => {
      ready = resolve
    })
    const flow = compileBaseScriptFlow(
      {
        kind: 'stages',
        initial: 'initial',
        stages: [{ id: 'initial', body: [command], next: { kind: 'complete' } }],
      },
      { timing, canonicalContentDigest: 'a'.repeat(64) },
    )
    const done = new ScriptRunnerCore(
      {
        execute(actual, context, signal) {
          assert.equal(context.timing, timing)
          const input = {
            id: actual.target?.entity,
            sceneId: actual.target?.scene,
            signal,
            activation: { ownerId: 'e62', epoch: 1 },
          }
          const pending =
            actual.kind === 'moveParty'
              ? motion.schedulePartyMove(actual.to, actual.speed, signal)
              : actual.kind === 'stepEntity'
                ? motion.registerAutoStep({ ...input, dir: actual.dir })
                : motion.registerMove({
                    ...input,
                    source: 'auto',
                    to: actual.to,
                    speed: actual.speed,
                  })
          ready()
          return pending.then((value) => {
            acknowledgement = value
          })
        },
      },
      controller.signal,
    ).runFlow(flow, { self: target, cursorController: { reachSafePoint: () => 'continue' } })
    void done.catch(() => {})
    await entered
    return {
      controller,
      done,
      slot:
        command.kind === 'moveParty' ? motion.partyMove : motion.coordinator.autoSlots.get('e62'),
      ack: () => acknowledgement,
    }
  }
  const step = { kind: 'stepEntity', target, dir: 'left' }
  let run = await start(step)
  run.slot.commitAttempt()
  run.slot.commitAttempt() // Native idempotence: the recorder must not invent another commit.
  run.slot.resolve()
  run.slot.resolve()
  await run.done
  assert.equal(run.ack().outcome, 'attempted')
  run = await start(step)
  run.slot.dropByAuthority()
  await run.done
  assert.deepEqual(run.ack(), { outcome: 'droppedByAuthority' })
  motion.coordinator.authority.set('e62', { kind: 'script' })
  run = await start(step)
  await run.done
  assert.equal(run.slot, undefined)
  assert.deepEqual(run.ack(), { outcome: 'droppedByAuthority' })
  motion.coordinator.authority.delete('e62')
  for (const committed of [false, true]) {
    run = await start(step)
    if (committed) run.slot.commitAttempt()
    run.controller.abort()
    await assert.rejects(run.done)
  }
  const to = { col: 130, row: 72, height: 0 }
  motion.restoreEntity('e62', {
    move: { owner: 'e62', to, speed: 'slow', slowRestPending: true, slowCadence: true },
  })
  run = await start({ kind: 'moveEntity', target, to, speed: 'slow' })
  assert.equal(run.slot.slowRestPending, true)
  run.slot.commitSettlement()
  run.slot.cancel('late cancellation cannot roll back committed movement')
  run.slot.resolve()
  await run.done
  assert.equal(run.ack(), run.slot.commandEpoch)
  assert.deepEqual(errors, [])
  const proof = verifyMotionSlotLifetimes(causes)
  assert.equal(proof.slots.size, 5)
  assert.equal(proof.dropped.length, 1)
  assert.equal([...proof.slots.values()].filter((e) => e.phase === 'cancelled').length, 2)
  for (const corrupt of [
    (events) => {
      events.find((e) => e.phase === 'motion-slot-settled').runId++
    },
    (events) => {
      events.find((e) => e.phase === 'motion-slot-registered').slot.dir = 'up'
    },
    (events) => {
      events.splice(
        events.findIndex((e) => e.phase === 'motion-slot-committed'),
        1,
      )
    },
    (events) => {
      const event = events.find((e) => e.phase === 'motion-slot-settled')
      events.push({ ...event, order: order + 1 })
    },
    (events) => {
      events.find(
        (e) => e.phase === 'motion-slot-registered' && e.slot.kind === 'move',
      ).slot.slowRestPending = false
    },
  ]) {
    const changed = structuredClone(causes)
    corrupt(changed)
    assert.throws(() => verifyMotionSlotLifetimes(changed))
  }
  // Native queue + native cadence/rest/stride drive the independent due-step proof.
  const { walkTick, consumeScheduledMoveRest, restAfterMoveAttempt } =
    await server.ssrLoadModule('/src/entity-walk.ts')
  causes.length = 0
  const commits = [],
    draws = []
  let now = 0
  globalThis.__openingCauseFrame({ now, realNow: now, frozen: false, stepping: false })
  motion.advanceCadence(0, false)
  run = await start({
    kind: 'moveEntity',
    target,
    to: { col: 0.5, row: 0, height: 0 },
    speed: 'slow',
  })
  for (const [dt, frozen, held] of [
    [60, false, false],
    [40, false, false],
    [100, true, false],
    [100, false, false],
    [100, false, true],
    [100, false, false],
  ]) {
    now += dt
    if (held) motion.coordinator.authority.set('e62', { kind: 'script' })
    else motion.coordinator.authority.delete('e62')
    globalThis.__openingCauseFrame({ now, realNow: now, frozen: false, stepping: false })
    if (motion.advanceCadence(dt, frozen) && !held) {
      const cadence = consumeScheduledMoveRest(run.slot.speed, run.slot.slowRestPending)
      run.slot.slowRestPending = cadence.restPending
      if (cadence.attempt) {
        const before = position,
          result = walkTick(position, run.slot.to, run.slot.speed)
        position = result.pos
        commits.push({
          order: ++order,
          tick: motion.worldTick,
          scene: 's003',
          sceneVisit: 1,
          from: [before.col, before.row],
          to: [position.col, position.row],
        })
        run.slot.slowRestPending = restAfterMoveAttempt(run.slot.speed)
        if (result.done) {
          run.slot.commitSettlement()
          run.slot.resolve()
          await run.done
        }
      }
    }
    draws.push({
      order: ++order,
      sceneVisit: 1,
      causalFrame: causes.findLast((event) => event.phase === 'clock').clock,
    })
  }
  assert.deepEqual(position, { col: 0.5, row: 0, height: 0 })
  const verify = (events, steps = commits) =>
    verifyStoryMotion(
      { causes: events, worldRenders: draws },
      verifyMotionSlotLifetimes(events),
      [target],
      () => steps,
    )
  assert.equal(verify(causes)[0].commits.length, 2)
  const through = draws[2].order,
    prefix = {
      causes: causes.filter((e) => e.order <= through),
      worldRenders: draws.slice(0, 3),
      renderScope: { afterOrder: 0, throughOrder: through },
    },
    prefixMotion = verifyStoryMotion(
      prefix,
      verifyMotionSlotLifetimes(prefix.causes),
      [target],
      () => commits.filter((e) => e.order <= through),
    )
  assert.equal(
    verifyStoryHolds(prefix, [target], {
      motion: prefixMotion,
      partyMotion: [],
      waits: [],
      dialogues: [],
    }).length,
    3,
  )
  assert.throws(
    () =>
      verifyStoryHolds(prefix, [target], {
        motion: prefixMotion.map((route) => ({ ...route, terminal: 'motion-slot-settled' })),
        partyMotion: [],
        waits: [],
        dialogues: [],
      }),
    /unexplained draw after moveEntity/,
  )
  assert.throws(() => verify(causes, commits.slice(1)), /motion step|preceding position/)
  const late = structuredClone(commits)
  late[0].tick++
  assert.throws(() => verify(causes, late), /motion step/)
  const missingCadence = causes.filter((event) => !(event.phase === 'cadence' && event.dt === 60))
  assert.throws(() => verify(missingCadence), /continuity|cadence/)
  const omittedTake = structuredClone(causes)
  omittedTake.find(
    (event) => event.phase === 'cadence' && event.lifecycle.authority.e62,
  ).lifecycle.authority = {}
  assert.throws(() => verify(omittedTake), /motion step/)
  // Execute main's actual party branch, including its deferred native acknowledgement.
  causes.length = 0
  const file = 'packages/reforge/src/main.ts',
    source = await readFile(new URL(`../../${file}`, import.meta.url), 'utf8')
  const code = instrumentOpeningTrace(source, file).code,
    ast = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true)
  let branch
  function visit(node) {
    if (ts.isIfStatement(node) && node.expression.getText(ast) === 'partyMove') branch = node
    ts.forEachChild(node, visit)
  }
  visit(ast)
  assert(branch)
  const player = {
      get pos() {
        return position
      },
      set pos(value) {
        position = value
      },
    },
    motionContinuations = []
  const pointSources = []
  const originalPartyHook = globalThis.__openingCausePartyMotion
  globalThis.__openingCausePartyMotion = (phase, ...args) => {
    if (phase === 'step')
      assert.equal(
        pointSources.at(-1),
        'commit:player.pos',
        'causal snapshot ran before original position commit',
      )
    return originalPartyHook(phase, ...args)
  }
  const deps = {
    __openingPoint: (source) => pointSources.push(source),
    motion,
    player,
    walkTick,
    trail: [],
    pushTrail() {},
    deriveFollowers() {},
    updateCamera() {},
    worldPresentation: { setPartyGesture() {} },
    motionContinuations,
  }
  const advance = new Function(
    'deps',
    ts.transpile(
      `const {${Object.keys(deps)}}=deps;let walking=false,facing='down',stepFrame=0;return ()=>{const partyMove=motion.partyMove;${branch.getText(ast)}}`,
      { target: ts.ScriptTarget.ES2022 },
    ),
  )(deps)
  globalThis.__openingCauseFrame({ now, realNow: now, frozen: false, stepping: false })
  run = await start({ kind: 'moveParty', to: { col: 1.25, row: 0, height: 0 }, speed: 'normal' })
  for (let i = 0; i < 2; i++) {
    now += 100
    globalThis.__openingCauseFrame({ now, realNow: now, frozen: false, stepping: false })
    assert(motion.advanceCadence(100, false))
    advance()
    for (const resume of motionContinuations.splice(0)) resume()
    await new Promise(setImmediate)
  }
  await run.done
  assert.equal(verifyStoryPartyMotion({ causes })[0].commits.length, 2)
  const steps = causes.filter((event) => event.phase === 'party-motion-step')
  // A live prefix owes the next cadence even before it has any terminal receipt.
  const omittedLast = causes.filter((event) => event.order < steps[1].order)
  assert.throws(() => verifyStoryPartyMotion({ causes: omittedLast }), /eligible step/)
  const wrongTarget = structuredClone(causes),
    wrongRegistration = wrongTarget.find((event) => event.phase === 'party-motion-registered')
  wrongRegistration.to = { ...wrongRegistration.to, col: 2 }
  assert.throws(() => verifyStoryPartyMotion({ causes: wrongTarget }), /endpoint/)
  const lostStep = causes.filter((event) => event !== steps[0])
  assert.throws(() => verifyStoryPartyMotion({ causes: lostStep }), /origin/)
  assert.deepEqual(errors, [])
})
