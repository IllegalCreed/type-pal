import assert from 'node:assert/strict'
import { installErrandObserver } from './errand-observer.mjs'
import { ERRAND_TRACE_TARGETS, instrumentErrandTrace } from './errand-trace-plugin.mjs'
import { createEvidenceRecorder } from './evidence-recorder.mjs'
import { createScriptCausalObserver } from './script-causal-observer.mjs'
import { createSnapshotGraph } from './snapshot-graph.mjs'

export const mazeScenes = ['s017', 's018', 's016']

function replaceAnchor(source, before, after, count) {
  assert.equal(source.split(before).length - 1, count, 'maze observer anchor changed')
  return source.replaceAll(before, after)
}

function isMazeRaft(id) {
  return /^e(?:24[3-9]|25[0-9])$/.test(id)
}

function createMazeCausalObserver(createCausal, options) {
  const ambient = new Map()
  return createCausal({
    ...options,
    append(list, event, limit) {
      // Commands retain their clocks without also recording every frame clock.
      if (event.phase === 'clock') return
      const author = event.author
      if (
        event.phase === 'run-started' &&
        author?.scene === 's017' &&
        author.channel === 'auto' &&
        isMazeRaft(author.entity)
      ) {
        ambient.set(event.runId, new Map())
      }
      const sampled = ambient.get(event.runId)
      if (sampled && event.phase !== 'run-started' && event.phase !== 'run-ended') {
        if (!['command', 'leaf-completed'].includes(event.phase)) return
        const { id, path } = event.occurrence
        const location = JSON.stringify(path)
        if (!sampled.has(location)) sampled.set(location, id)
        if (sampled.get(location) !== id) return
      }
      if (event.phase === 'run-ended') ambient.delete(event.runId)
      return options.append(list, event, limit)
    },
  })
}

function mazeActorHasChanged(id, before, actor, exact) {
  if (!before || exact || !isMazeRaft(id)) return JSON.stringify(before) !== JSON.stringify(actor)
  return (
    before.position.some((value, axis) => value !== actor.position[axis]) ||
    before.facing !== actor.facing ||
    before.visible !== actor.visible ||
    before.state !== actor.state ||
    before.sprite !== actor.sprite ||
    before.behavior?.page !== actor.behavior?.page ||
    JSON.stringify(before.behavior?.trigger) !== JSON.stringify(actor.behavior?.trigger) ||
    JSON.stringify(before.behavior?.triggerActivation) !==
      JSON.stringify(actor.behavior?.triggerActivation)
  )
}

function installMazePointSampling(setSkipSnapshot) {
  const point = globalThis.__errandPoint
  const ambient = new WeakMap()
  const ambientSignals = new WeakSet()
  let exactSnapshot = false
  let skipSnapshot = false
  const withSnapshotPolicy = (exact, skip, observe) => {
    const previous = { exactSnapshot, skipSnapshot }
    exactSnapshot = exact
    skipSnapshot = skip
    setSkipSnapshot(skip)
    try {
      return observe()
    } finally {
      exactSnapshot = previous.exactSnapshot
      skipSnapshot = previous.skipSnapshot
      setSkipSnapshot(skipSnapshot)
    }
  }
  const draws = new Map()
  globalThis.__mazeCaptureDraw = (source, scene, tick, ready, dialogue) => {
    const draw = `${scene}/${tick}/${ready}/${dialogue}`
    if (draw === draws.get(source)) return false
    draws.set(source, draw)
    return true
  }
  globalThis.__errandPoint = (source, state) => {
    point(source, { ...state, mazeExactSnapshot: exactSnapshot || source === 'commit:scene-ready' })
  }
  for (const suffix of ['Run', 'Step', 'LeafCompleted', 'Settled', 'Ended']) {
    const name = `__openingCause${suffix}`
    const observe = globalThis[name]
    globalThis[name] = (runner, ...args) => {
      if (suffix === 'Run') {
        const [signal, data] = args
        if (data.timing === 'auto' && data.self?.scene === 's017' && isMazeRaft(data.self.entity)) {
          ambient.set(runner, { paths: new Set(), repeat: false })
          ambientSignals.add(signal)
        } else ambient.delete(runner)
      }
      const loop = ambient.get(runner)
      if (loop && suffix === 'Step') {
        const path = JSON.stringify(args[0].path)
        loop.repeat = loop.paths.has(path)
        loop.paths.add(path)
      }
      const repeat = !!loop?.repeat && ['Step', 'LeafCompleted'].includes(suffix)
      // Repeated automatic leaves still advance native observer identities and
      // timers. Only their unretained full-world snapshots are skipped.
      return withSnapshotPolicy(!loop, repeat, () => observe(runner, ...args))
    }
  }
  const observeTimer = globalThis.__openingCauseTimer
  globalThis.__openingCauseTimer = (phase, timer, signal, data) =>
    withSnapshotPolicy(exactSnapshot, ambientSignals.has(signal), () =>
      observeTimer(phase, timer, signal, data),
    )
  const observeDialogue = globalThis.__openingCauseDialogueDraw
  globalThis.__openingCauseDialogueDraw = (engine, slots) => {
    if (slots.length) observeDialogue(engine, slots)
  }
  // These independent diagnostic frame streams are outside the maze oracle.
  globalThis.__openingCauseCadence = undefined
  globalThis.__openingCauseActionFrame = undefined
  globalThis.__openingCauseActionGate = undefined
  globalThis.__openingCauseActionGateInputs = undefined
}

export function fairyIslandMazeObserverScript() {
  let observer = replaceAnchor(
    installErrandObserver.toString(),
    "['s001', 's002', 's003', 's004', 's005', 's014']",
    JSON.stringify(mazeScenes),
    2,
  )
  observer = replaceAnchor(
    observer,
    'JSON.stringify(before) !== JSON.stringify(actor)',
    'mazeActorHasChanged(id, before, actor, state.mazeExactSnapshot)',
    1,
  )
  observer = replaceAnchor(
    observer,
    "(id === 'party' && (newVisit || source === 'commit:refreshRuntimeProjection'))",
    "(id === 'party' && newVisit)",
    1,
  )
  observer = replaceAnchor(
    observer,
    'startPoint(source, state)\n',
    'startPoint(source, state)\n      const orderBeforePoint = order\n',
    1,
  )
  observer = replaceAnchor(
    observer,
    'final = structuredClone(state)',
    "if (source !== 'commit:refreshRuntimeProjection' || order !== orderBeforePoint) final = structuredClone(state)",
    1,
  )
  observer = replaceAnchor(
    observer,
    "if (source === 'render:world') retainRender(source, state, id, actor)",
    "if (source === 'render:world' && (!isMazeRaft(id) || id === 'e259')) retainRender(source, state, id, actor)",
    1,
  )
  observer = replaceAnchor(
    observer,
    'globalThis.__readErrandRouteEvidence = () =>',
    `globalThis.__readMazePlateDraws = (after) => events.filter((event) =>
      event.order > after && event.kind === 'actor-render' && event.id === 'e262' &&
      event.state.visible && event.state.drawStatus === 'drawn')
      .map(({order, state}) => ({order, frame: state.frame, frameResourceId: state.frameResourceId}));
    globalThis.__readErrandRouteEvidence = () =>`,
    1,
  )
  observer = replaceAnchor(
    observer,
    "events: events.filter((e) => e.kind === 'actor' && e.id === 'party'),",
    `events: events.filter((e) => e.kind === 'actor' && e.id === 'party' && e.source === 'commit:player.input'),`,
    1,
  )
  let causal = replaceAnchor(
    createScriptCausalObserver.toString(),
    'const snapshotReforge = () => {',
    'const snapshotReforge = () => {\n    if (skipMazeCausalSnapshot) return',
    1,
  )
  causal = replaceAnchor(
    causal,
    'globalThis.__openingCauseFrame = (data) => {\n    snapshotReforge()',
    'globalThis.__openingCauseFrame = (data) => {',
    1,
  )
  return `(() => {
    let skipMazeCausalSnapshot = false;
    const isMazeRaft = ${isMazeRaft};
    const mazeActorHasChanged = ${mazeActorHasChanged};
    (${observer})(options => (${createMazeCausalObserver})((${causal}), options), ${createEvidenceRecorder}, ${createSnapshotGraph});
    (${installMazePointSampling})(skip => { skipMazeCausalSnapshot = skip; });
  })()`
}

export function fairyIslandMazeTracePlugin() {
  return {
    name: 'isolated-fairy-island-maze-trace',
    enforce: 'pre',
    apply: 'serve',
    transform(source, id) {
      const file = ERRAND_TRACE_TARGETS.find(
        (path) => path.startsWith('packages/reforge/') && id.endsWith(`/${path}`),
      )
      if (!file) return null
      let { code } = instrumentErrandTrace(source, file)
      if (file.endsWith('/main.ts')) {
        code = replaceAnchor(
          code,
          "['s001','s002','s003','s004','s005','s014']",
          JSON.stringify(mazeScenes),
          1,
        )
        code = replaceAnchor(
          code,
          'const slot=value=>value?{selection:value.selection,cursor:value.cursor}:null;',
          `if ((source==='render:world'||source==='before:render') && !globalThis.__mazeCaptureDraw(source,sid,tick,
            !runner&&!dialogBox.active&&!presentation.busy()&&!menus.active&&!battleHost.active&&fadeDriver.value===0&&ditherTransition.active===null,
            dialogBox.active)) return;
          const slot=value=>value?{selection:value.selection,cursor:value.cursor}:null;`,
          1,
        )
        const marker = 'const rewardGainQueue = new RewardGainQueue()'
        code = replaceAnchor(
          code,
          marker,
          `${marker}
          globalThis.__mazeReadUi = () => ({
            menu: {
              active: menus.active,
              panel: menus.view.menu.openPanel ?? null,
              levels: menus.view.menu.stack.map(({nodes,cursor}) => ({ids:nodes.map(node => node.id),cursor})),
              phase: menus.view.useMenu.phase,
              cursor: menus.view.useMenu.cursor,
              items: menus.view.useMenu.items.map(item => item.id),
            },
            reward: rewardGainQueue.current ?? null,
            inventory: world.inventory.map(({itemId,count}) => ({itemId,count})),
            entityState: {...world.script?.entityState?.s017},
          });`,
          1,
        )
      }
      return { code, map: null }
    },
  }
}

const at = (position) => [...position, 0]
const leaf = (event) => event.occurrence?.command?.command
const triggerOwner = (event, entity) =>
  event.author?.kind === 'entity-behavior' &&
  event.author.channel === 'trigger' &&
  event.author.entity === entity

function exactlyOne(values, label) {
  assert.equal(values.length, 1, `expected one ${label}, got ${values.length}`)
  return values[0]
}

function verifyRide(events, commands, causes, { entity, waypoints, landing }) {
  const rides = commands.filter((event) => leaf(event)?.kind === 'ride')
  assert.deepEqual(
    rides.map((event) => [leaf(event).to.col, leaf(event).to.row]),
    waypoints,
  )
  const samples = rides.flatMap((event) => {
    assert.deepEqual(leaf(event).target, { scene: 's017', entity })
    const completed = exactlyOne(
      causes.filter(
        (cause) => cause.phase === 'leaf-completed' && cause.occurrence.id === event.occurrence.id,
      ),
      'ride completion',
    )
    const { col, row, height } = leaf(event).to
    assert.deepEqual(completed.poses[entity].state.position, [col, row, height])
    assert.deepEqual(completed.poses.party.state.position, [col, row, height])
    const commits = events.filter(
      (sample) =>
        sample.order > event.order &&
        sample.order <= completed.order &&
        sample.kind === 'actor' &&
        sample.id === entity &&
        sample.source === 'commit:meta.entity.pos' &&
        JSON.stringify(sample.state.position) !== JSON.stringify(sample.before?.position),
    )
    assert(commits.length > 0, `no native motion commits on ${entity}`)
    return commits.map((sample) => {
      const party = events.find(
        (actor) =>
          actor.order > sample.order &&
          actor.order <= completed.order &&
          actor.kind === 'actor' &&
          actor.id === 'party' &&
          actor.source === 'commit:player.pos' &&
          actor.sceneVisit === sample.sceneVisit &&
          actor.tick === sample.tick &&
          JSON.stringify(actor.state.position) === JSON.stringify(sample.state.position),
      )
      assert(party, `missing same-tick rider commit on ${entity} at ${sample.order}`)
      return {
        tick: sample.tick,
        position: sample.state.position,
        raftOrder: sample.order,
        partyOrder: party.order,
      }
    })
  })
  const dismount = exactlyOne(
    causes.filter((event) => event.phase === 'leaf-completed' && leaf(event)?.kind === 'moveParty'),
    'dismount completion',
  )
  assert.deepEqual(dismount.poses.party.state.position, at(landing))
  assert.deepEqual(dismount.poses[entity].state.position, at(waypoints.at(-1)))
  return { samples, dismountOrder: dismount.order }
}

/** Relate the runner's keyboard windows to native script dispatch, effects, and completion. */
export function verifyMazeCausality(trace, observations) {
  const starts = trace.causes.filter((event) => event.phase === 'run-started')
  const scriptEntries = []
  const remember = (start) => {
    const events = trace.causes.filter((event) => event.runId === start.runId)
    const commands = events.filter((event) => event.phase === 'command')
    const end = exactlyOne(
      events.filter((event) => event.phase === 'run-ended'),
      'native run completion',
    )
    assert.equal(end.aborted, false)
    scriptEntries.push({
      entry: start.author,
      stage: start.stage,
      sceneVisit: start.sceneVisit,
      runId: start.runId,
      parentRunId: start.parentRunId,
      startOrder: start.order,
      firstCommandOrder: commands[0]?.order ?? null,
      firstCommandPath: commands[0]?.occurrence?.path ?? null,
      endOrder: end.order,
    })
    return { events, commands }
  }
  const actualTriggers = starts.filter((start) => start.author?.channel === 'trigger')
  assert.deepEqual(
    actualTriggers.map((start) => start.author.entity),
    observations.map((row) => row.target),
  )
  for (const row of observations) {
    const window = (event) => event.order > row.startOrder && event.order <= row.endOrder
    const start = exactlyOne(
      starts.filter((event) => window(event) && triggerOwner(event, row.target)),
      `${row.target} trigger`,
    )
    const { events, commands } = remember(start)
    if (row.ride) {
      assert.equal(start.stage, row.ride.stage)
      row.nativeRide = verifyRide(trace.events, commands, events, row.ride)
    } else if (row.hammer) {
      const item = exactlyOne(
        starts.filter(
          (event) =>
            window(event) && event.author?.kind === 'item-private' && event.author.item === '279',
        ),
        'hammer item run',
      )
      const parent = remember(item)
      const call = exactlyOne(
        parent.commands.filter(
          (event) =>
            leaf(event)?.kind === 'runEntityTrigger' && leaf(event).target.entity === row.target,
        ),
        'hammer child dispatch',
      )
      assert.equal(start.parentRunId, item.runId)
      assert.equal(start.parentOccurrence, call.occurrence.id)
      assert.equal(start.author.behavior, 'break-with-hammer')
      assert.equal(start.stage, 'initial')
      const broken = exactlyOne(
        events.filter(
          (event) =>
            event.phase === 'leaf-completed' &&
            leaf(event)?.kind === 'setEntityState' &&
            leaf(event).target.entity === row.target &&
            leaf(event).state === 0,
        ),
        'actual statue break',
      )
      assert.equal(broken.poses[row.target].state.visible, false)
    } else if (row.pickup) {
      assert.deepEqual(
        commands
          .filter((event) => leaf(event)?.kind === 'giveItem')
          .map((event) => leaf(event).itemId),
        row.pickup.items,
      )
    } else {
      const loading = exactlyOne(
        commands.filter((event) => leaf(event)?.kind === 'loadScene'),
        `${row.target} loadScene`,
      )
      const target =
        row.target === 'e262'
          ? { scene: 's018', pos: { col: 89, row: 25, height: 0 } }
          : { scene: 's016', pos: { col: 61, row: 42, height: 0 } }
      assert.equal(leaf(loading).scene, target.scene)
      assert.deepEqual(leaf(loading).pos, target.pos)
      if (row.target === 'e262') {
        assert(new Set(row.plateDraws.map(({ frame }) => frame)).size > 1)
        for (const { order, frame, frameResourceId } of row.plateDraws) {
          const draw = trace.events.find((event) => event.order === order)
          assert(order < start.order, 'blink evidence must precede the first press')
          assert.equal(draw?.id, 'e262')
          assert.equal(draw.state.drawStatus, 'drawn')
          assert.equal(draw.state.visible, true)
          assert.equal(draw.state.frame, frame)
          assert.equal(draw.state.frameResourceId, frameResourceId)
        }
      }
    }
  }
  for (const scene of ['s018', 's016']) {
    const entry = exactlyOne(
      starts.filter(
        (event) =>
          event.author?.scene === scene &&
          event.author.kind === 'scene-hook' &&
          event.author.slot === 'onEnter',
      ),
      `${scene} entry`,
    )
    remember(entry)
  }
  assert(
    !trace.events.some((event) => event.scene === 's016' && event.source === 'commit:player.input'),
    'input continued past first peach grove arrival',
  )
  return scriptEntries
}
