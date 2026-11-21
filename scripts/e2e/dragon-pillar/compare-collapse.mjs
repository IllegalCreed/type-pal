import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { readEvidenceArtifact } from '../../../scripts/e2e/evidence-artifact.mjs'
import { assertInputLedger } from '../../../scripts/e2e/input-ledger.mjs'
import { assertCutscenes } from './observe-collapse.mjs'

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}
const round = (value) => Math.round(value * 10) / 10
const intervals = (events) => events.slice(1).map((row, index) => round(row.at - events[index].at))
const counts = (values) =>
  Object.fromEntries(
    Object.entries(Object.groupBy(values, String)).map(([key, items]) => [key, items.length]),
  )
const originalWaits = [
  [24819, 1000],
  [24821, 600],
  [24823, 400],
  [24826, 200],
  [24828, 600],
  [24830, 400],
  [24833, 200],
  [24835, 600],
  [24837, 1600],
]

async function runSide(reportPath, engine) {
  const path = resolve(reportPath)
  const reportBytes = await readFile(path)
  const report = JSON.parse(reportBytes)
  const [run] = report.cases
  const game = engine === 'game'
  assert.equal(report.engine, engine)
  assert.equal(report.status, 'passed')
  assert.equal(report.inputExecution.status, 'passed')
  assert.equal(report.inputExecution.actions, report.actions.length)
  assert.equal(report.errors.length, 0)
  assertInputLedger(report.actions, { requireReceipts: true })
  assert.deepEqual(report.dependencies.hashes, report.hashes)
  assert.equal(report.input.lastPillar, true)
  assert.equal(report.input.flee, false)
  assert.equal(run.endpoint.state.scene, 's150')
  assert.equal(run.visibleEndpoint.scene, 's150')
  assert(run.endpoint.landed && run.visibleEndpoint.nonBlack >= 20)
  assert(!report.cleanupErrors?.length)
  if (report.profile === 'capture') assert.equal(report.media.status, 'passed')

  const artifacts = await Promise.all(
    [run.collapse, run.raw, report.save].map((ref) => readEvidenceArtifact(dirname(path), ref)),
  )
  assert(artifacts.every(({ binding }) => binding.status === 'verified'))
  const [{ value: rawPresentation }, { value: trace }, { value: save }] = artifacts
  const presentation = {
    events: rawPresentation.events.filter(({ at }) => at <= run.visibleEndpoint.at),
  }
  assertCutscenes(presentation, engine)
  assert.equal(trace.engine, engine)
  assert.equal(trace.seed, report.input.seed)
  assert(!trace.overflow && trace.errors.length === 0)
  assert.deepEqual(run.initial.state.position, [60, 30, 0])
  assert.deepEqual(
    run.initial.state.party.map(({ id }) => id),
    ['zhao-linger', 'li-xiaoyao', 'lin-yueru'],
  )
  assert.deepEqual(
    run.initial.storyActors,
    Array.from({ length: 7 }, (_, i) => [2390 + i, i === 0 ? (game ? 2 : null) : 0]),
  )
  if (game) {
    assert.equal(run.slotReadback, report.save.sha256)
    assert.deepEqual(save.gs.partyMembers, [1, 0, 2])
    assert.deepEqual(
      [save.gs.wNumScene, save.gs.wNumBattleField, save.gs.wNumBattleMusic],
      [145, 32, 42],
    )
  } else {
    assert.equal(run.initial.state.checkpoint, 'loaded')
    assert.equal(save.position.sceneId, 's144')
  }

  const traceEvents = (kind) => trace.events.filter((event) => event.kind === kind)
  const trigger = traceEvents('trigger').find(
    ({ scene, owner }) => scene === 's144' && owner === 'e2390',
  )
  assert(trigger)
  assert.deepEqual(trigger.position, [60, 30, 0])
  const end = traceEvents('battle-finished')[0]
  assert.equal(end.result, game ? 'won' : 'victory')
  assert.deepEqual([end.cash, end.inventory], [0, []])
  const prepared = traceEvents('prepared')[0]
  assert.deepEqual(
    [
      game ? prepared.field : traceEvents('field')[0].fieldId,
      Number(String(prepared.music).split('.').at(-1)),
    ],
    [32, 42],
  )
  const commands = traceEvents('command').map(({ turn, slot, action }) => [
    turn,
    slot,
    action.type ?? action.kind,
    action.targetEnemyIdx ?? (action.target === -1 ? null : (action.target ?? null)),
  ])
  const actions = traceEvents('action').map(({ turn, actor, action, party }) => [
    turn,
    game ? (actor.isEnemy ? 'enemy' : 'player') : action.side,
    game ? actor.idx : action.idx,
    action.type ?? action.kind,
    action.targetEnemyIdx ??
      action.targetPlayerIdx ??
      (action.target === -1 ? null : (action.target ?? null)),
    String(action.skillId ?? action.actionId ?? ''),
    party.map(({ id, hp, mp }) => [id, hp, mp]),
  ])
  const rng = traceEvents('rng').map(({ value }) => value)
  assert.deepEqual([commands.length, actions.length, rng.length], [9, 11, 58])
  const sfx = traceEvents('sfx-start')
    .filter((row) => row.order > trigger.order && row.order < end.order)
    .map(({ asset }) => asset)
  assert.deepEqual(sfx, [236, 91, 236, 91, 38, 2, 179])
  const operations = traceEvents('script-op').filter(({ order }) => order > end.order)
  const cue = operations.find((op) =>
    game ? op.ip === 24816 : op.rows?.some(({ text }) => text === 'dlg.9192'),
  )
  const collapseMusic = traceEvents('music-start').find(
    ({ track, order }) => track === 23 && order > cue.order,
  )
  assert(cue && collapseMusic)
  const transfer = operations.findIndex(
    (op) => op.order > cue.order && (game ? op.ip === 24838 : op.op === 'loadScene'),
  )
  assert(transfer >= 0)
  const waitSteps = operations.filter(
    (op, index) =>
      op.order > cue.order &&
      index < transfer &&
      (game ? originalWaits.some(([ip]) => op.ip === ip) : op.op === 'wait' || op.op === 'fade'),
  )
  assert.equal(waitSteps.length, originalWaits.length)
  const waits = waitSteps.map((step, i) => [
    originalWaits[i][0],
    originalWaits[i][1],
    round(operations[operations.indexOf(step) + 1].atMs - step.atMs),
  ])

  const { events } = presentation
  const world = events.filter(({ kind, scene }) => kind === 'world-shake-draw' && scene === 's144')
  const requests = events.filter(
    ({ kind, scene }) => kind === 'world-shake-request' && scene === 's144',
  )
  const worldShakes = [1, 2, 3].map((level, i) => {
    const samples = game
      ? world.filter((row) => row.level === level && row.advance)
      : world.filter(
          ({ at, shiftY }) =>
            requests[i].at <= at &&
            at < (requests[i + 1]?.at ?? Infinity) &&
            Math.abs(shiftY) === level,
        )
    assert(samples.length, `no actual shake presentations at ${level}px`)
    const steps = samples.filter((row, j) => j === 0 || row.shiftY !== samples[j - 1].shiftY)
    const samplesAt = intervals(steps)
    return {
      level,
      steps: steps.length,
      directions: steps.map(({ shiftY }) => shiftY),
      phaseIntervalsMs: samplesAt,
      intervalMedianMs: median(samplesAt),
      intervalMeanMs: round(samplesAt.reduce((sum, value) => sum + value, 0) / samplesAt.length),
    }
  })

  const films = [5, 2].map((chunk) => {
    const start = events.find((row) => row.kind === 'animation-begin' && row.chunk === chunk)
    const finish = events.find((row) => row.kind === 'animation-end' && row.chunk === chunk)
    const frameDraws = events.filter(
      (row) => row.kind === 'animation-frame-draw' && row.chunk === chunk && row.at < finish.at,
    )
    const unique = [...new Map(frameDraws.map((row) => [row.index, row])).values()]
    const cinematicPaints = events.filter(
      (row) =>
        row.kind === 'world-shake-draw' && row.cinema && start.at <= row.at && row.at < finish.at,
    )
    const screenCovered = cinematicPaints.filter(({ fade }) => fade === 1).length
    const firstVisiblePaint = cinematicPaints.find(({ fade }) => fade < 0.95)
    return {
      chunk,
      count: unique.length,
      firstIndex: unique[0].index,
      lastIndex: unique.at(-1).index,
      firstDrawAt: unique[0].at,
      lastDrawAt: unique.at(-1).at,
      endAt: finish.at,
      durationMs: round(finish.at - start.at),
      intervalMedianMs: median(intervals(unique)),
      shifts: unique.map(({ shiftY }) => shiftY),
      shiftHistogram: counts(unique.map(({ shiftY }) => shiftY)),
      ...(game
        ? { firstFadeInMs: start.initialFadeInMs }
        : {
            totalLayerPaints: cinematicPaints.length,
            coveredByOpaqueFade: screenCovered,
            firstVisibleAt: firstVisiblePaint?.at ?? null,
          }),
    }
  })
  return {
    engine,
    report: path,
    reportSha256: createHash('sha256').update(reportBytes).digest('hex'),
    revision: report.revision,
    profile: report.profile,
    semanticAnchor: cue.atMs,
    reportInput: report.input,
    checkpointSha256: report.save.sha256,
    raw: run.raw,
    presentation: run.collapse,
    fixture: { commands, actions, rng, sfx },
    collapseMusicAt: collapseMusic.atMs,
    waits,
    worldShakes,
    films,
    s150FirstDrawAt: events.find(
      ({ scene, kind }) => scene === 's150' && kind === 'first-world-flush',
    ).at,
    s150VisibleAt: run.visibleEndpoint.at,
  }
}

export async function compareCollapse(gameReport, reforgeReport) {
  const [game, reforge] = await Promise.all([
    runSide(gameReport, 'game'),
    runSide(reforgeReport, 'reforge'),
  ])
  assert.equal(game.revision, reforge.revision, 'same candidate must run both sides')
  assert.equal(game.profile, reforge.profile)
  assert.deepEqual(game.reportInput, reforge.reportInput)
  assert.deepEqual(game.fixture, reforge.fixture)
  const differences = []
  for (const side of [game, reforge]) {
    for (const [ip, expected, actual] of side.waits) {
      // The Game palette fade duration elapses on the render clock. Its next script
      // instruction may be dispatched up to one 100 ms world update later.
      const dispatchLag = side.engine === 'game' && ip === 24837 ? 100 : 0
      if (actual < expected - 50 || actual > expected + 50 + dispatchLag)
        differences.push({
          engine: side.engine,
          issue: 'collapse-script-wait',
          ip,
          expected,
          actual,
        })
    }
  }
  for (const [index, phase] of reforge.worldShakes.entries()) {
    const reference = game.worldShakes[index]
    if (
      Math.abs(phase.intervalMeanMs - reference.intervalMeanMs) > 12 ||
      phase.directions[0] !== -phase.level
    )
      differences.push({
        engine: 'reforge',
        issue: 'world-shake-beat',
        level: phase.level,
        gameMs: reference.intervalMeanMs,
        reforgeMs: phase.intervalMeanMs,
        firstShiftY: phase.directions[0],
      })
  }
  for (const [index, film] of reforge.films.entries()) {
    const reference = game.films[index]
    if (film.firstVisibleAt === null || film.totalLayerPaints === film.coveredByOpaqueFade)
      differences.push({
        engine: 'reforge',
        issue: 'cinematic-layer-hidden',
        chunk: film.chunk,
        covered: film.coveredByOpaqueFade,
      })
    if (JSON.stringify(film.shifts) !== JSON.stringify(reference.shifts))
      differences.push({
        engine: 'reforge',
        issue: 'cinematic-shake-beat',
        chunk: film.chunk,
        game: reference.shiftHistogram,
        reforge: film.shiftHistogram,
      })
  }

  return {
    status: differences.length ? 'differences-observed' : 'passed',
    game,
    reforge,
    differences,
  }
}
