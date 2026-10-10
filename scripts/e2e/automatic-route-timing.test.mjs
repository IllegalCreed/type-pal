import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import objects from '../../data/extracted/data/event-objects.json' with { type: 'json' }
import original from '../../data/extracted/events/all.json' with { type: 'json' }
import village from '../../projects/pal/content/scenes/s004.json' with { type: 'json' }
import sprites from '../../projects/pal/content/sprites.json' with { type: 'json' }

async function runtime(t) {
  const require = createRequire(new URL('../../packages/reforge/package.json', import.meta.url))
  const { createServer } = await import(require.resolve('vite'))
  const cacheDir = await mkdtemp(join(tmpdir(), 'pal-route-timing-'))
  const server = await createServer({
    configFile: false,
    cacheDir,
    root: fileURLToPath(new URL('../../', import.meta.url)),
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    appType: 'custom',
  })
  t.after(async () => {
    await server.close()
    await rm(cacheDir, { recursive: true, force: true })
  })
  const load = (path) => server.ssrLoadModule(`/packages/${path}`)
  const { createInitialGameState } = await load('game/src/core/game-state.ts')
  const { setGlobalEvents, tickAutoScripts } = await load('game/src/core/event-system.ts')
  const { ScriptRunnerCore } = await load('reforge/src/script-runner-core.ts')
  const { compileBaseScriptFlow } = await load('reforge/src/script-compiler-core.ts')
  const { RuntimeFrameSession } = await load('reforge/src/runtime-frame-session.ts')
  const { ScriptWorkQueue } = await load('reforge/src/script-work-queue.ts')
  const { WorldMotionRuntime } = await load('reforge/src/world-motion-runtime.ts')
  const { walkTick, consumeScheduledMoveRest, restAfterMoveAttempt } = await load(
    'reforge/src/entity-walk.ts',
  )
  const { commitDurableMotionEndpoint, wakeDurableMotionEndpoint } = await load(
    'reforge/src/motion-runtime-wiring.ts',
  )
  const source = original.segments[0].commands
  t.after(() => setGlobalEvents([]))
  function game(id, entry, start, terminal, passes = 1) {
    setGlobalEvents(source)
    const gs = createInitialGameState({ x: 160, y: 112, facing: 'down' })
    const npc = {
      id,
      x: (start.col - start.row) * 16,
      y: (start.col + start.row) * 8,
      spriteNum: 1,
      nSpriteFrames: 3,
      sState: 1,
      facing: 'up',
      scriptedFrame: 0,
      autoCursor: { ip: entry },
    }
    gs.npcs = [npc]
    gs.allEventObjects = objects.eventObjects.map((object) => ({
      ...object,
      facing: ['down', 'left', 'up', 'right'][object.direction],
      scriptedFrame: object.currentFrameNum,
    }))
    gs.allEventObjects[id] = npc
    const events = []
    events.movements = []
    for (let tick = 0; tick < 4000; tick++) {
      gs.frameNum = tick
      const ip = npc.autoCursor.ip,
        command = source[ip]
      const before = [npc.x, npc.y]
      tickAutoScripts(gs)
      if (npc.x !== before[0] || npc.y !== before[1]) events.movements.push({ at: tick * 100, ip })
      if (command.op === 'raw' && command.opcode === 15)
        events.push({ kind: 'pose', facing: npc.facing, at: tick * 100, ip })
      if (command.op === 'raw' && [16, 17].includes(command.opcode) && npc.autoCursor.ip !== ip)
        events.push({
          kind: 'arrival',
          at: tick * 100,
          ip,
          to: [npc.x / 32 + npc.y / 16, npc.y / 16 - npc.x / 32],
        })
      if (ip === terminal && --passes === 0) return events
    }
    assert.fail('source route did not reach its terminal')
  }
  async function reforge(body, start) {
    const frames = new RuntimeFrameSession(100),
      queue = new ScriptWorkQueue(),
      motion = new WorldMotionRuntime(100)
    const controller = new AbortController(),
      signal = controller.signal,
      pending = [],
      events = [],
      draws = [],
      movements = []
    let position = { ...start },
      facing = 'up',
      finished = false
    const ports = {
      afterScriptWork: (action) => queue.whenIdle(action),
      activateConfirm() {},
      resumeScriptGates() {},
      gameplayFrozen: () => false,
      advanceFade() {},
      settleClosedDialogue() {},
      consumePressed: () => new Set(),
      tickHostiles() {},
      deriveMounts() {},
      advanceLifecycle() {},
      advanceEntityActions() {},
      clearWorldTicks() {},
      presentBattle: () => false,
      routeInput() {},
      advanceMoves(dt) {
        if (!motion.advanceCadence(dt, false)) return
        for (const slot of [...motion.coordinator.autoSlots.values()]) {
          const rest = consumeScheduledMoveRest(slot.speed, slot.slowRestPending)
          slot.slowRestPending = rest.restPending
          if (!rest.attempt) continue
          const step = walkTick(position, slot.to, slot.speed)
          if (step.pos.col !== position.col || step.pos.row !== position.row)
            movements.push({ at: frames.now - 1, to: [slot.to.col, slot.to.row] })
          position = step.pos
          facing = step.facing
          slot.slowRestPending = restAfterMoveAttempt(slot.speed)
          if (step.done) {
            commitDurableMotionEndpoint(motion.coordinator, 'npc', slot)
            events.push({ kind: 'arrival', at: frames.now - 1, to: [position.col, position.row] })
            pending.push(() => wakeDurableMotionEndpoint(motion.coordinator, 'npc', slot))
          }
        }
      },
      settleMotionContinuations() {
        for (const wake of pending.splice(0)) wake()
      },
      presentWorld() {
        draws.push({ at: frames.now - 1, position: { ...position }, facing })
      },
    }
    await frames.tick(1, ports)
    const finish = queue.begin(signal)
    const runner = new ScriptRunnerCore(
      {
        gameplayNow: () => frames.now,
        execute(command, _context, owner) {
          if (command.kind === 'wait') return frames.wait(command.ms, owner)
          if (command.kind === 'moveEntity')
            return motion.registerMove({
              source: 'auto',
              id: 'npc',
              to: command.to,
              speed: command.speed,
              sceneId: 's004',
              signal: owner,
              activation: { ownerId: 'npc', epoch: 1 },
            })
          if (command.kind === 'setEntityFacing') {
            facing = command.facing
            events.push({ kind: 'pose', facing, at: frames.now - 1 })
            return
          }
          if (command.kind === 'selectEntityBehavior') return
          assert.equal(command.kind, 'setEntityFrame')
        },
      },
      signal,
    )
    const done = runner
      .runFlow(
        compileBaseScriptFlow(
          { kind: 'stages', initial: 'a', stages: [{ id: 'a', body, next: { kind: 'complete' } }] },
          { timing: 'auto', canonicalContentDigest: 'a'.repeat(64) },
        ),
        {
          self: { scene: 's004', entity: 'npc' },
          cursorController: { reachSafePoint: () => 'continue' },
        },
      )
      .finally(() => {
        finished = true
        finish()
      })
    for (let tick = 1; tick < 4000 && !finished; tick++) await frames.tick(1 + tick * 100, ports)
    if (!finished) {
      controller.abort()
      await assert.rejects(done)
      assert.fail('authored route did not complete')
    }
    await done
    return { events, draws, movements }
  }
  return { game, reforge, load }
}

// Actual automatic op execution is the timing oracle. A move's duration is intentionally
// opaque: modern vector movement is approved. Pauses are measured FROM the actual arrival.
function arrivalRelative(events) {
  let origin = 0
  return events.map((event) => {
    if (event.kind === 'arrival') {
      origin = event.at
      return { kind: 'arrival', to: event.to }
    }
    return { kind: 'pose', facing: event.facing, afterArrivalMs: event.at - origin }
  })
}

test('Xianglan return preserves each source pose slot, without splitting a single atomic pose', async (t) => {
  const run = await runtime(t),
    start = { col: 139.5, row: 34, height: 0 }
  const expected = arrivalRelative(run.game(83, 888, start, 35633))
  const body = village.entities.find((e) => e.id === 'e83').behaviors.auto['legacy-002'].flow
    .stages[0].body
  const actual = await run.reforge(body, start)
  assert.deepEqual(arrivalRelative(actual.events), expected)
  const before = JSON.parse(
    await readFile(
      new URL('../../packages/migrate/baselines/pal/content/scenes/s004.json', import.meta.url),
      'utf8',
    ),
  )
  const old = await run.reforge(
    before.entities.find((e) => e.id === 'e83').behaviors.auto['legacy-002'].flow.stages[0].body,
    start,
  )
  assert.notDeepEqual(
    arrivalRelative(old.events),
    expected,
    'the retained old timing must be rejected',
  )
})

test('landed grain page remains idle until an actual automatic setter supersedes it', async (t) => {
  const run = await runtime(t),
    { EntityActionPlayer, resolveSpriteActionBinding } = await run.load(
      'reforge/src/entity-action-player.ts',
    ),
    { WorldScenePresentation } = await run.load('reforge/src/world-scene-presentation.ts'),
    entity = village.entities.find((value) => value.id === 'e88'),
    definition = sprites.find((value) => value.id === entity.sprite),
    frames = Array.from({ length: 8 }, (_, index) => ({
      width: index + 1,
      height: 1,
      pixels: new Uint8Array(index + 1),
      opaque: new Uint8Array(index + 1),
    })),
    loaded = { frames, anchorX: 0, anchorY: 0 },
    actions = new EntityActionPlayer(),
    presentation = new WorldScenePresentation({
      canvas: { width: 1280, height: 800 },
      context: {},
      worldScale: 4,
      createCanvas: () => ({}),
      contextFor: () => ({}),
      createRenderer: () => ({}),
    })
  const binding = entity.pages?.[0]?.animation
  if (binding)
    actions.syncBases([
      { entity: entity.id, ...resolveSpriteActionBinding(definition, binding, frames.length) },
    ])
  const input = {
    entities: [entity],
    visible: () => true,
    entitySprite: () => definition,
    loadedSprite: () => loaded,
    entityGait: () => undefined,
    entityExplicitAnimation: () => undefined,
    entityActionFrame: (id) => actions.frame(id),
    entityLayer: () => 0,
    party: [],
    partyVisual: () => undefined,
    player: {
      pos: { col: 0, row: 0, height: 0 },
      facing: 'down',
      walking: false,
      stepFrame: 0,
      layer: 0,
    },
    followers: [],
    extraFollowerSpriteIds: [],
    extraFollowerPosition: () => ({ pos: { col: 0, row: 0, height: 0 }, facing: 'down' }),
    spriteById: () => undefined,
    now: () => 0,
  }
  assert.equal(presentation.sprites(input)[0].frame, frames[7])
  presentation.setEntityFrame(entity.id, 0)
  assert.equal(
    presentation.sprites(input)[0].frame,
    frames[0],
    'actual setter supersedes initial pose',
  )
  presentation.clearEntityFrame(entity.id)
  actions.syncBases([])
  assert.notEqual(
    presentation.sprites(input)[0].frame,
    frames[7],
    'removing the authored landed-grain binding must fail the idle presentation contract',
  )
})

test('Xianglan stroll preserves automatic pause, atomic pose and reset timing', async (t) => {
  const run = await runtime(t),
    start = { col: 157, row: 50, height: 0 },
    source = run.game(83, 1303, start, 1348, 2),
    body = village.entities.find((entity) => entity.id === 'e83').behaviors.auto.default.flow
      .stages[0].body[0].body,
    actual = await run.reforge([...body, ...body], start)
  const movements = (items, events, target) =>
    items.flatMap((move, index) => {
      const to = target(move)
      if (index && JSON.stringify(to) === JSON.stringify(target(items[index - 1]))) return []
      const previous = events.findLast((event) => event.at < move.at)
      return [{ to, afterBoundaryMs: move.at - (previous?.at ?? 0) }]
    })
  assert.deepEqual(
    movements(actual.movements, actual.events, (move) => move.to),
    movements(source.movements, source, (move) => {
      const [x, y, h] = original.segments[0].commands[move.ip].operands
      return [x + y + h, y - x]
    }),
  )
  assert.deepEqual(arrivalRelative(actual.events), arrivalRelative(source))
  for (const [index, command] of body.entries())
    if (command.kind === 'setEntityFacing')
      assert.equal(body[index + 1].kind, 'setEntityFrame', 'every source pose remains atomic')
  const pose = body.findIndex((command) => command.kind === 'setEntityFacing'),
    end = body.findIndex(
      (command) => command.kind === 'moveEntity' && command.to.col === 142 && command.to.row === 59,
    ),
    noRest = structuredClone(body.slice(0, end + 1)),
    sourcePose = source.find((event) => event.kind === 'pose'),
    sourceGap = source.movements.find((event) => event.at > sourcePose.at).at - sourcePose.at
  noRest[pose + 2].ms = 0
  const wrong = await run.reforge(noRest, start),
    wrongPose = wrong.events.find((event) => event.kind === 'pose')
  assert.notEqual(
    wrong.movements.find((event) => event.at > wrongPose.at).at - wrongPose.at,
    sourceGap,
    'removing the ordinary post-pose rest must be rejected',
  )
})

test('Xiulan return tail retains the slow pause and subsequent atomic pose slots', async (t) => {
  const run = await runtime(t),
    start = { col: 157, row: 62, height: 0 },
    source = run.game(84, 1374, start, 1386, 2),
    body = village.entities.find((entity) => entity.id === 'e84').behaviors.auto.default.flow
      .stages[0].body[0].body,
    entry = body.findIndex(
      (command) => command.kind === 'moveEntity' && command.to.col === 141 && command.to.row === 62,
    ),
    actual = await run.reforge([...body.slice(entry), ...body], start),
    boundary = (events) =>
      events.find((event) => event.kind === 'arrival' && event.to[0] === 99 && event.to[1] === 30),
    sourceStep = source.movements.find((move) => move.ip === 1381),
    actualStep = actual.movements.find((move) => move.to[0] === 98 && move.to[1] === 30)
  assert(entry >= 0)
  assert.equal(
    actualStep.at - boundary(actual.events).at,
    sourceStep.at - boundary(source).at,
    'the source wait2 before the final slow move cannot become an ordinary adjacent move',
  )
  assert.deepEqual(arrivalRelative(actual.events), arrivalRelative(source))
  const oldTail = structuredClone(body.slice(entry)),
    beforeLastMove = oldTail.findIndex(
      (command) => command.kind === 'moveEntity' && command.to.col === 99 && command.to.row === 30,
    )
  oldTail[beforeLastMove + 1].ms = 100
  const wrong = await run.reforge(oldTail, start)
  assert.notEqual(
    wrong.movements.find((move) => move.to[0] === 98 && move.to[1] === 30).at -
      boundary(wrong.events).at,
    sourceStep.at - boundary(source).at,
    'the old adjacent pause cannot pass as the original wait2',
  )
})
