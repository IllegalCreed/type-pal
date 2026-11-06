import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { isDeepStrictEqual as same } from 'node:util'
import { readBoundStoryRecording } from './bound-story-recording.mjs'
import { committedRouteReceipt } from './committed-route.mjs'
import { continuousGrid } from './continuous-route.mjs'
import { verifyDialoguePresentation } from './dialogue-presentation-contract.mjs'
import { assertErrandCollector } from './errand-contract.mjs'
import { readEvidenceArtifact } from './evidence-artifact.mjs'
import {
  assertDependencyClosure,
  dependencyImpact,
  hashRepositoryFiles,
  localDependencyGraph,
  recordingDependencies,
} from './evidence-dependencies.mjs'
import { assertFairyPoolGameTrace } from './fairy-island-pool-game-observer.mjs'
import { assertFairyPoolGameStory } from './fairy-island-pool-game-oracle.mjs'
import { verifyFairyIslandPoolTrace } from './fairy-island-pool-reforge-trace.mjs'
import { fairyPoolRoutes } from './fairy-island-pool-route.mjs'
import { readLongEvidenceArtifact } from './long-evidence.mjs'
import { checkTransitionTrace, requireTrace, TraceObligation } from './trace-refinement.mjs'

const scene = 's016'
const rawScriptPath = 'data/extracted/events/all.json'
const leaf = (event) => event.occurrence?.command?.command
const digest = (value) => createHash('sha256').update(value).digest('hex')

async function readRecording(path, engine) {
  const game = engine === 'game'
  const result = await readBoundStoryRecording({
    path,
    engine,
    fragment: '009',
    readTrace: game ? readEvidenceArtifact : readLongEvidenceArtifact,
    assertTrace: game ? assertFairyPoolGameTrace : assertErrandCollector,
  })
  const { report, trace } = result
  const { definition } = report.dependencies
  assert.equal(definition.entry, `scripts/e2e/fairy-island-pool-${engine}.mjs`)
  assert.equal(definition.packageName, engine)
  assert.equal(
    definition.traceConfig,
    `scripts/e2e/fairy-island-pool-${engine}${game ? '.config.mts' : '.config.mjs'}`,
  )
  if (game) assertFairyPoolGameStory(trace, report)
  else verifyFairyIslandPoolTrace(trace)
  return result
}

function measuredRoute(recording) {
  const { report, trace } = recording
  const engine = report.engine
  const plans = Object.values(fairyPoolRoutes(engine))
  assert.equal(report.route.legs.length, plans.length)
  const moves = trace.events.filter(
    ({ id, kind, source, before, state }) =>
      kind === 'actor' &&
      id === 'party' &&
      before &&
      source === (engine === 'game' ? 'commit:tickSceneInput' : 'commit:player.input') &&
      !same(before.position, state.position),
  )
  const inputs = report.actions.filter(({ routeId }) => routeId)
  assert.deepEqual(inputs, report.route.inputs, 'route actions lost their dispatch receipts')
  const arrows = trace.inputs.filter(
    ({ key, order }) => key.startsWith('Arrow') && order > report.route.legs[0].startOrder,
  )
  assert(
    arrows.every(({ repeat }) => !repeat),
    'route contains keyboard auto-repeat',
  )
  assert.deepEqual(
    arrows.map(({ type, key }) => [type, key]),
    inputs.map(({ kind, key }) => [`key${kind}`, key]),
    'route dispatches differ from actual key events',
  )
  assert.equal(moves.length, plans.flatMap(({ steps }) => steps).length)
  return report.route.legs.map((leg, i) => {
    const { startOrder, endOrder, inputPlan } = leg
    const commits = moves.filter(({ order }) => startOrder < order && order <= endOrder)
    const last = commits.at(-1)
    assert(last, 'route lacks its native terminal step')
    const dialogue = i === 2
    const ready =
      engine === 'game'
        ? last.ready === true
        : trace.events.findLast((e) => e.kind === 'control' && e.order <= last.order)?.state ===
          true
    if (dialogue) {
      const started =
        engine === 'game'
          ? trace.events.find((e) => e.kind === 'cursor' && e.cursor?.owner === 213)
          : trace.causes.find((e) => e.phase === 'run-started' && e.author?.entity === 'e213')
      assert(
        started && last.order <= started.order && started.order <= endOrder,
        'return route lacks the actual touch-trigger entry',
      )
    } else assert(ready, 'walk ended without native free control')
    const receipt = committedRouteReceipt({
      id: inputPlan.id,
      engine,
      trace,
      startOrder,
      endOrder,
      scene,
      end:
        engine === 'game'
          ? { scene: 17, position: last.state.position, dialog: dialogue }
          : { scene, position: last.state.position, runtime: { dialogue } },
      ready,
      inputCount: inputs.filter(({ phase }) => phase === leg.phase).length,
    })
    assert.deepEqual(receipt, leg.replay, 'route summary differs from native commits')
    assert.deepEqual(
      receipt.steps.map(({ order: _order, ...step }) => step),
      inputPlan.steps,
    )
    assert.deepEqual(receipt.completion, inputPlan.completion)
    const coordinate = (position) => continuousGrid(position, engine)
    const shape = ({ key, from, to }) => ({ key, from: coordinate(from), to: coordinate(to) })
    return {
      id: plans[i].id,
      expected: plans[i].steps.map(shape),
      actual: receipt.steps.map(shape),
      orders: receipt.steps.map(({ order }) => order),
    }
  })
}

function compareRoute(game, reforge) {
  const routes = [measuredRoute(game), measuredRoute(reforge)]
  const legs = routes[0].map(({ id, expected, actual }, i) => {
    const left = routes[0][i]
    const right = routes[1][i]
    const mismatch = expected.findIndex(
      (step, n) => !same(step, actual[n]) || !same(step, right.actual[n]),
    )
    return {
      id,
      moves: expected.length,
      firstDifference:
        mismatch === -1
          ? null
          : {
              step: mismatch + 1,
              expected: expected[mismatch],
              game: { order: left.orders[mismatch], step: left.actual[mismatch] },
              reforge: { order: right.orders[mismatch], step: right.actual[mismatch] },
            },
    }
  })
  return { status: legs.some((leg) => leg.firstDifference) ? 'rejected' : 'proved', legs }
}

function reforgePans({ causes }) {
  return causes.filter(
    (event) =>
      event.phase === 'command' &&
      event.occurrence.self?.entity === 'e212' &&
      leaf(event)?.kind === 'cameraPan',
  )
}

function panFrames(game, reforge) {
  const draws = game.events.filter((e) => e.kind === 'world-draw')
  const path = draws.filter((e) => e.cursor?.owner === 212 && e.cursor.ip === 5240)
  assert(path.length, 'missing Game original 0x7F pan draws')
  const final = draws.find((e) => e.order > path.at(-1).order && e.cursor?.ip === 5241)
  assert(final, 'missing Game final pan draw in the following wait')
  const [start] = reforgePans(reforge)
  const end = reforge.causes.find(
    (e) => e.phase === 'leaf-completed' && e.occurrence.id === start?.occurrence.id,
  )
  assert(start && end, 'missing Reforge pan execution boundaries')
  const finalRf = reforge.worldRenders.find((e) => e.order > end.order)
  assert(finalRf, 'missing Reforge final pan draw')
  return {
    game: [draws.findLast((e) => e.order < path[0].order), ...path, final],
    reforge: [
      reforge.worldRenders.findLast((e) => e.order < start.order),
      ...reforge.worldRenders.filter((e) => start.order < e.order && e.order < end.order),
      finalRf,
    ],
  }
}

function cameraProof(frames, [dx, dy, steps], engine) {
  const pos = (frame) => {
    const { x, y } = frame.view?.camera ?? frame.camera
    return [x, y]
  }
  const [before, ...draws] = frames
  const samples = draws
    .filter((draw, index) => !same(pos(draw), pos(draws[index - 1] ?? before)))
    .map((draw) => ({ type: 'draw', order: draw.order, atMs: draw.atMs, camera: pos(draw) }))
  const proof = checkTransitionTrace(
    {
      id: 'pool-camera-pan/v1',
      initial: { index: 0, camera: pos(before), atMs: before.atMs },
      transitions: {
        draw(state, event) {
          const next = [state.camera[0] + dx, state.camera[1] + dy]
          requireTrace(same(event.camera, next), 'native-camera-step', next, event.camera)
          requireTrace(event.atMs > state.atMs, 'native-camera-clock', '> last draw', event.atMs)
          return { index: state.index + 1, camera: next, atMs: event.atMs }
        },
      },
      accept: ({ index }) => requireTrace(index === steps, 'native-camera-census', steps, index),
    },
    samples,
  )
  return {
    ...proof,
    engine,
    start: pos(before),
    frames: samples,
    durationMs: samples.at(-1).atMs - samples[0].atMs,
  }
}

function compareCamera(game, reforge, raw) {
  const { commands } = raw.segments[0]
  const source = commands[5240]
  assert.equal(source.opcode, 127)
  assert.deepEqual(source.operands, [4, 2, 48])
  const frames = panFrames(game, reforge)
  const a = cameraProof(frames.game, source.operands, 'game')
  const b = cameraProof(frames.reforge, source.operands, 'reforge')
  // The native Game beat is 100 ms. Allow presentation jitter without allowing
  // a burst followed by an idle tail to pass as a steady sweep.
  const [minimum, maximum] = [0.85, 1.15].map((ratio) => a.durationMs * ratio)
  const slowEnough = minimum <= b.durationMs && b.durationMs <= maximum
  const cadence = b.frames.every((frame, i, list) => {
    if (i < 8) return true
    const gameSpan = a.frames[i]?.atMs - a.frames[i - 8]?.atMs
    const span = frame.atMs - list[i - 8].atMs
    return gameSpan * 0.8 <= span && span <= gameSpan * 1.2
  })
  return {
    status:
      a.status === 'proved' &&
      b.status === 'proved' &&
      same(a.start, b.start) &&
      slowEnough &&
      cadence
        ? 'proved'
        : 'rejected',
    source: { pc: 5240, ...source },
    game: a,
    reforge: b,
    slowEnough,
    cadence,
  }
}

function gameEmptyWindow(trace, { pc, nextPc }) {
  const first = trace.events.find(
    (e) => e.kind === 'world-draw' && e.cursor?.owner === 212 && e.cursor.ip === pc,
  )
  assert(first, 'missing first native Game camera draw')
  const next = trace.events.find(
    (e) =>
      e.kind === 'dialogue' &&
      e.order > first.order &&
      e.cursor?.owner === 212 &&
      e.cursor.ip === nextPc,
  )
  assert(next, 'missing next Game dialogue')
  const overlays = trace.events.filter(
    (e) => e.kind === 'dialogue-draw' && first.order < e.order && e.order < next.order,
  )
  assert.equal(
    overlays[0]?.renderId,
    first.renderId,
    'Game first camera draw has no overlay witness',
  )
  return {
    firstDraw: first.order,
    through: next.order,
    overlays: overlays.map(({ order, renderId, slots }) => ({ order, renderId, slots })),
    status: overlays.every(({ slots }) => slots.length === 0) ? 'proved' : 'rejected',
  }
}

function reforgeEmptyWindow(trace, pan, { oldLine, nextLine }) {
  const open = trace.causes.findLast(
    (e) =>
      e.order < pan.order &&
      e.runId === pan.runId &&
      e.phase === 'dialogue' &&
      e.source === 'open' &&
      e.after?.rowTextIds?.includes(oldLine),
  )
  const next = trace.causes.find(
    (e) =>
      e.order > pan.order &&
      e.runId === pan.runId &&
      e.phase === 'dialogue' &&
      e.source === 'open' &&
      e.after?.rowTextIds?.includes(nextLine),
  )
  assert(open && next, 'missing authored dialogue boundaries for pool camera')
  const clear = trace.causes.find(
    (e) =>
      open.order < e.order &&
      e.order < pan.order &&
      e.runId === pan.runId &&
      e.phase === 'dialogue-clear-request' &&
      leaf(e)?.kind === 'clearDialog',
  )
  const overlay = new Map(
    trace.causes
      .filter((e) => e.phase === 'dialogue-presentation')
      .map((draw) => [draw.renderId, draw]),
  )
  const worlds = trace.worldRenders.filter((e) => pan.order < e.order && e.order < next.order)
  assert(worlds.length > 0, 'no actual world draws between the pan and next line')
  const stale = worlds.flatMap((frame) => {
    const draw = overlay.get(frame.renderId)
    assert(
      draw && draw.sceneVisit === pan.sceneVisit && draw.order > frame.order,
      'missing continuous all-slot world draw during the pool transition',
    )
    return draw.slots.length
      ? [
          {
            order: draw.order,
            renderId: draw.renderId,
            slots: draw.slots.map(({ visibleText, rowTextIds, active }) => ({
              visibleText,
              rowTextIds,
              active,
            })),
          },
        ]
      : []
  })
  const fadeIn = trace.causes.find(
    (e) =>
      pan.order < e.order &&
      e.order < next.order &&
      e.runId === pan.runId &&
      e.phase === 'presentation-start' &&
      e.presentation.kind === 'fade' &&
      e.presentation.to === 0,
  )
  const faded = trace.causes.find(
    (e) => e.phase === 'presentation-end' && e.effectId === fadeIn?.effectId,
  )
  assert(
    fadeIn && faded && faded.order < next.order,
    'pool fade-in completion lacks native evidence',
  )
  assert(
    worlds.some(({ order }) => fadeIn.order < order && order < faded.order),
    'no actual fade-in draw',
  )
  return {
    status: clear && !stale.length ? 'proved' : 'rejected',
    clearOrder: clear?.order ?? null,
    panOrder: pan.order,
    firstDraw: worlds[0].order,
    through: next.order,
    draws: worlds.length,
    fadeIn: [fadeIn.order, faded.order],
    staleDraws: stale.length,
    firstStaleDraw: stale[0] ?? null,
  }
}

function compareDialogue(game, reforge) {
  // Reuse the existing all-slot/caller model for every actual paint. The two
  // authored transitions below independently define which actions close a cue.
  const lifecycle = verifyDialoguePresentation(
    reforge.causes.filter(({ phase }) => phase !== 'command'),
    reforge.worldRenders,
  )
  const pans = reforgePans(reforge)
  const windows = [
    { pc: 5240, nextPc: 5247, oldLine: 'dlg.1902', nextLine: 'dlg.1903' },
    { pc: 5254, nextPc: 5263, oldLine: 'dlg.1905', nextLine: 'dlg.1906' },
  ].map((window, i) => ({
    ...window,
    game: gameEmptyWindow(game, window),
    reforge: reforgeEmptyWindow(reforge, pans[i], window),
  }))
  return {
    status: windows.every(
      (window) => window.game.status === 'proved' && window.reforge.status === 'proved',
    )
      ? 'proved'
      : 'rejected',
    lifecycle,
    windows,
  }
}

function prove(check) {
  try {
    return check()
  } catch (error) {
    if (!(error instanceof assert.AssertionError || error instanceof TraceObligation)) throw error
    return { status: error.status ?? 'unknown', reason: error.message }
  }
}

export async function recompareFairyIslandPool(root, gamePath, reforgePath) {
  const [game, reforge] = await Promise.all([
    readRecording(gamePath, 'game'),
    readRecording(reforgePath, 'reforge'),
  ])
  const recordings = [game, reforge].map(({ report, files }) => ({
    engine: report.engine,
    revision: report.revision,
    report: files[0],
    trace: files[1],
    artifacts: files.slice(2),
    predecessor: report.predecessor,
    sources: report.hashes,
    dependencies: report.dependencies,
  }))
  assert.equal(
    game.report.revision,
    reforge.report.revision,
    '009 recordings used different candidates',
  )
  const graph = await localDependencyGraph(root, ['scripts/e2e/recompare-recording.mjs'])
  const paths = [
    ...new Set([
      ...graph.files,
      rawScriptPath,
      ...recordings.flatMap(({ sources }) => Object.keys(sources)),
      'package.json',
      'pnpm-lock.yaml',
    ]),
  ]
  const current = await hashRepositoryFiles(root, paths)
  const original = await readFile(resolve(root, rawScriptPath))
  assert.equal(
    digest(original),
    game.report.hashes[rawScriptPath],
    'original script source differs from Game recording',
  )
  const raw = JSON.parse(original)
  const sourceChanges = recordings.flatMap(({ engine, sources, dependencies }) =>
    Object.entries(sources).flatMap(([path, sha256]) =>
      current[path] === sha256
        ? []
        : [
            {
              engine,
              path,
              recorded: sha256,
              current: current[path],
              impact: dependencyImpact(dependencies, path),
            },
          ],
    ),
  )
  const dependencyProofs = await Promise.all(
    recordings.map(async ({ dependencies, engine }) => {
      const now = await recordingDependencies(root, dependencies.definition)
      try {
        assertDependencyClosure(dependencies, now)
        return { engine, status: 'proved' }
      } catch (error) {
        if (!(error instanceof assert.AssertionError)) throw error
        return { engine, status: 'changed', reason: error.message.split('\n')[0] }
      }
    }),
  )
  const comparison = {
    route: prove(() => compareRoute(game, reforge)),
    camera: prove(() => compareCamera(game.trace, reforge.trace, raw)),
    dialogue: prove(() => compareDialogue(game.trace, reforge.trace)),
  }
  comparison.findings = Object.entries(comparison).flatMap(([field, proof]) =>
    proof.status === 'proved'
      ? []
      : [{ type: 'fairy-pool', field, status: proof.status, reason: proof.reason }],
  )
  for (const proof of dependencyProofs)
    if (proof.status !== 'proved')
      comparison.findings.push({ type: 'producer-dependency-change', ...proof })
  assert.deepEqual(
    await hashRepositoryFiles(root, paths),
    current,
    '009 verifier/source changed during comparison',
  )
  for (const { files } of [game, reforge])
    for (const artifact of files)
      assert.equal(
        digest(await readFile(artifact.path)),
        artifact.sha256,
        '009 input changed during comparison',
      )
  const sources = Object.fromEntries(graph.files.map((path) => [path, current[path]]))
  return {
    kind: 'archived-recording-recomparison',
    fragment: '009',
    status: comparison.findings.length ? 'needs-review' : 'passed',
    scope:
      '009 frozen route, authored opening pan and pool-transition dialogue draws. Native journey and terminal restore required for both engines.',
    recordings,
    sourceChanges,
    currentSemanticSources: { [rawScriptPath]: current[rawScriptPath] },
    verifier: {
      entry: 'scripts/e2e/recompare-recording.mjs',
      external: graph.external,
      sources,
      sha256: digest(JSON.stringify(sources)),
    },
    comparison,
  }
}
