import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import source from '../../data/extracted/events/all.json' with { type: 'json' }
import { approvedAutomaticInitialFacing } from './automatic-initial-facing.mjs'
import { automaticLanguageGraphs } from './automatic-language-receipts.mjs'
import { checkAuthoredOwnership, checkAutomaticLifecycle } from './automatic-lifecycle-contract.mjs'
import { checkFollowCamera } from './camera-trace-model.mjs'
import {
  checkDialogueCorrespondence,
  checkGameDialogueCausality,
  checkOccurrenceLineage,
} from './causal-recording-contract.mjs'
import { checkCommandCoverage } from './command-obligations.mjs'
import { canonicalPosition } from './coordinate-evidence.mjs'
import { canonicalScenes } from './entity-action-contract.mjs'
import { readEvidenceArtifact } from './evidence-artifact.mjs'
import { readLongEvidenceArtifact } from './long-evidence.mjs'
import { checkLoopControl } from './loop-control-contract.mjs'

export { canonicalPosition } from './coordinate-evidence.mjs'

import { originalSpriteNumber } from './game-pose-semantics.mjs'
import { compareInnTimingIntent } from './inn-timing-intent.mjs'
import { compareKitchenTimingIntent } from './kitchen-timing-intent.mjs'
import { movementDrawOpportunity } from './movement-draw-opportunity.mjs'
import { scopeNpcStoryTrace } from './npc-story-scope.mjs'
import { compareOpeningHoldIntent } from './opening-hold-intent.mjs'
import {
  approvedOpeningTerminalMotion,
  approvedOpeningTerminalViewport,
} from './opening-terminal-motion.mjs'
import { checkPersistentEffects } from './persistent-effect-model.mjs'
import { checkPresentationEffects } from './presentation-contract.mjs'
import { checkScriptInvocations } from './script-invocation-contract.mjs'
import { checkStoryExecutions } from './story-execution-contract.mjs'
import { storyExecutionSpecifications } from './story-execution-specs.mjs'
import {
  compareStoryPresentationIntent,
  storyParticipants,
  storyProofPrefix,
} from './story-presentation-intent.mjs'

const sourceCommands = source.segments[0].commands
const ACTOR_FIELDS = [
    'position',
    'visible',
    'state',
    'facing',
    'frame',
    'sprite',
    'walking',
    'stepFrame',
    'trigger',
    'resume',
    'auto',
    'autoIp',
    'triggerMode',
  ],
  compact = (values) =>
    values.filter((value, index) => index === 0 || stable(value) !== stable(values[index - 1])),
  stable = (value) => JSON.stringify(value),
  defined = (values) => values.filter((value) => value !== undefined && value !== null),
  normalizeText = (value) => String(value ?? '').replace(/\s+/gu, ''),
  sign = (value) => (value === 0 ? 0 : value > 0 ? 1 : -1)

export async function readNpcTrace(reportPath) {
  const reportBytes = await readFile(reportPath),
    reportSha256 = createHash('sha256').update(reportBytes).digest('hex'),
    report = JSON.parse(reportBytes),
    dir = dirname(reportPath)
  const scope = (trace) =>
    report.storyScope
      ? scopeNpcStoryTrace(trace, report.storyScope)
      : { ...trace, storyScopeMissing: true }
  if (report.fragment === '001') {
    const matrix = report.matrix
    assert(
      matrix?.renders && matrix.controls && matrix.lifecycle,
      '001 lacks rendered/lifecycle NPC observations; record again',
    )
    return {
      report,
      trace: scope({
        events: [...matrix.actors, ...matrix.lifecycle, ...matrix.renders, ...matrix.controls].sort(
          (a, b) => a.order - b.order,
        ),
        pages: matrix.pages,
        worldRenders: matrix.worldRenders,
        causes: matrix.causes ?? [],
        resources: matrix.resources,
        errors: matrix.errors,
        overflow: matrix.overflow,
      }),
      tracePath: reportPath,
      rawTrace: matrix,
      artifactBinding: { status: 'verified', missing: [], source: 'embedded-report' },
      reportSha256,
      traceSha256: reportSha256,
    }
  }
  const traceName =
    report.contextTraces?.[0]?.path ??
    { '002': 'inn-trace.json', '003': 'kitchen-trace.json' }[report.fragment] ??
    null
  assert(traceName, `missing NPC trace registration in ${reportPath}`)
  const readArtifact = ['005', '006'].includes(report.fragment)
    ? readLongEvidenceArtifact
    : readEvidenceArtifact
  const artifact = await readArtifact(dir, report.contextTraces?.[0] ?? { path: traceName })
  return {
    report,
    trace: scope(artifact.value),
    rawTrace: artifact.value,
    artifactBinding: artifact.binding,
    tracePath: artifact.path,
    reportSha256,
    traceSha256: artifact.sha256,
  }
}

export function actorTransitions(trace, id, onlyScene) {
  return (trace.events ?? [])
    .filter(
      (event) =>
        event.kind === 'actor' &&
        event.id === id &&
        event.state &&
        (!onlyScene || event.scene === onlyScene),
    )
    .sort((a, b) => a.order - b.order)
    .map((event) => ({
      order: event.order,
      atMs: event.atMs,
      scene: event.scene,
      sceneVisit: event.sceneVisit ?? null,
      tick: event.tick ?? null,
      source: event.source,
      before: event.before ?? null,
      state: event.state,
    }))
}

export function movementTransitions(trace, id, onlyScene) {
  return actorTransitions(trace, id, onlyScene).flatMap((event) => {
    // A null before is an observed baseline, including scene restoration. It is
    // not a displacement from an earlier visit's last recorded position.
    const from = canonicalPosition(event.before?.position),
      to = canonicalPosition(event.state.position)
    if (!from || !to || stable(from) === stable(to)) return []
    return [
      {
        order: event.order,
        atMs: event.atMs,
        scene: event.scene,
        sceneVisit: event.sceneVisit,
        tick: event.tick,
        source: event.source,
        from,
        to,
        delta: [to[0] - from[0], to[1] - from[1]],
      },
    ]
  })
}

function stateTimeline(trace, id, onlyScene) {
  const events = actorTransitions(trace, id, onlyScene),
    states = Object.fromEntries(ACTOR_FIELDS.map((field) => [field, []]))
  for (const event of events)
    for (const field of ACTOR_FIELDS) {
      const value =
        field === 'frame' ? (event.state.frameRendered ?? event.state.frame) : event.state[field]
      states[field].push(
        field === 'sprite' && value !== undefined
          ? value === null
            ? 0
            : originalSpriteNumber(value)
          : value,
      )
    }
  return states
}

function movementSummary(trace, id, onlyScene) {
  const movement = movementTransitions(trace, id, onlyScene),
    intervals = movement
      .slice(1)
      .map((event, index) => event.atMs - movement[index].atMs)
      .filter((ms) => Number.isFinite(ms) && ms > 0),
    sorted = intervals.slice().sort((a, b) => a - b),
    medianIntervalMs = sorted.length ? sorted[Math.floor(sorted.length / 2)] : null
  return {
    count: movement.length,
    directions: compact(movement.map((event) => [sign(event.delta[0]), sign(event.delta[1])])),
    intervalsMs: intervals,
    minIntervalMs: intervals.length ? Math.min(...intervals) : null,
    medianIntervalMs,
    burstFraction: intervals.length
      ? intervals.filter((interval) => interval < 20).length / intervals.length
      : 0,
    transitions: movement,
  }
}

/** Actual completed renders, including every pose change without a position commit. */
function screenProjection(geometry, view) {
  if (
    !geometry ||
    !Array.isArray(geometry.worldRect) ||
    geometry.worldRect.length !== 4 ||
    !view?.camera ||
    !Array.isArray(view.canvasSize) ||
    view.canvasSize.length !== 2 ||
    !Array.isArray(view.transform) ||
    view.transform.length !== 6
  )
    return null
  const [worldX, worldY, width, height] = geometry.worldRect,
    cameraX = Array.isArray(view.camera) ? view.camera[0] : view.camera.x,
    cameraY = Array.isArray(view.camera) ? view.camera[1] : view.camera.y
  if (
    ![worldX, worldY, width, height, cameraX, cameraY, ...view.canvasSize, ...view.transform].every(
      Number.isFinite,
    ) ||
    width <= 0 ||
    height <= 0 ||
    view.canvasSize.some((size) => size <= 0)
  )
    return null
  const [a, b, c, d, e, f] = view.transform
  const determinant = a * d - b * c
  if (!Number.isFinite(determinant) || determinant === 0) return null
  let x = worldX - cameraX,
    y = worldY - cameraY
  if (view.pixelRounding === 'round-after-camera') {
    x = Math.round(x)
    y = Math.round(y)
  }
  const corners = [
      [x, y],
      [x + width, y],
      [x, y + height],
      [x + width, y + height],
    ].map(([u, v]) => [a * u + c * v + e, b * u + d * v + f]),
    left = Math.min(...corners.map(([u]) => u)),
    top = Math.min(...corners.map(([, v]) => v)),
    right = Math.max(...corners.map(([u]) => u)),
    bottom = Math.max(...corners.map(([, v]) => v))
  if (
    !corners.flat().every(Number.isFinite) ||
    ![right - left, bottom - top].every((size) => Number.isFinite(size) && size > 0)
  )
    return null
  return {
    rect: [left, top, right - left, bottom - top],
    screenVisible: right > 0 && bottom > 0 && left < view.canvasSize[0] && top < view.canvasSize[1],
  }
}

export function renderedPoseEvidence(trace, id, onlyScene) {
  return (trace.events ?? [])
    .filter(
      (event) =>
        event.kind === 'actor-render' &&
        event.source === 'render:world' &&
        event.id === id &&
        (!onlyScene || event.scene === onlyScene),
    )
    .sort((a, b) => a.order - b.order)
    .flatMap((event) => {
      const pose = {
        sceneVisit: event.sceneVisit ?? null,
        scene: event.scene,
        position: canonicalPosition(event.state.position),
        facing: event.state.facing,
        frame: event.state.frame,
        visible: event.state.visible,
        frameSource: event.state.frameSource ?? null,
        assetId: event.state.assetId ?? null,
        resourceAssetId: event.state.resourceAssetId ?? null,
        frameResourceId: event.state.frameResourceId ?? null,
        spriteSource: event.state.spriteSource ?? null,
        drawStatus: event.state.drawStatus ?? null,
        geometry: event.state.geometry ?? null,
      }
      if (event.throughRenderId === undefined)
        return [
          {
            ...pose,
            order: event.order,
            atMs: event.atMs,
            tick: event.tick ?? null,
            renderId: event.renderId ?? null,
          },
        ]
      const clocks = (trace.worldRenders ?? []).filter(
        (clock) => clock.renderId >= event.renderId && clock.renderId <= event.throughRenderId,
      )
      assert(
        Number.isSafeInteger(event.renderId) &&
          Number.isSafeInteger(event.throughRenderId) &&
          event.throughRenderId >= event.renderId &&
          clocks.length === event.throughRenderId - event.renderId + 1 &&
          clocks.every(
            (clock, index) =>
              clock.renderId === event.renderId + index &&
              clock.sceneVisit === event.sceneVisit &&
              clock.scene === event.scene,
          ) &&
          clocks[0].tick === event.tick &&
          clocks[0].atMs === event.atMs &&
          clocks.at(-1).order === event.throughOrder &&
          clocks.at(-1).atMs === event.throughAtMs,
        `incomplete render span: ${id} at order ${event.order}`,
      )
      return clocks.map((clock, index) => ({
        ...pose,
        ...(() => {
          const projected = screenProjection(pose.geometry, clock.view)
          return projected
            ? { screenVisible: projected.screenVisible, screenRect: projected.rect }
            : { screenVisible: null, screenRect: null }
        })(),
        order: index === 0 ? event.order : clock.order,
        atMs: clock.atMs,
        tick: clock.tick,
        renderId: clock.renderId,
      }))
    })
    .filter(
      (event) =>
        !trace.renderScope ||
        (event.order > trace.renderScope.afterOrder &&
          event.order <= trace.renderScope.throughOrder),
    )
}

function renderedPoseSequence(evidence, anchor, overlays = []) {
  // Compare pose changes independently of browser render frequency. The full
  // evidence above retains every hold and clock for the cadence contract.
  return compact(
    evidence
      .filter(({ screenVisible, order }) => screenVisible !== false || order === anchor)
      .map(({ scene, facing, frame, visible, order }) => ({
        scene,
        facing,
        frame: overlays.find((entry) => entry.order === order)?.suspendedFrame ?? frame,
        visible,
      })),
  )
}

function comparablePoseWindows(game, reforge, leftMoves, rightMoves, alignedMoves) {
  if (alignedMoves) return [{ kind: 'complete-route', game, reforge }]
  const windows = [],
    pathKey = ({ scene, from, to }) => stable({ scene, from, to })
  if (
    leftMoves.length &&
    rightMoves.length &&
    stable([leftMoves[0].scene, leftMoves[0].from]) ===
      stable([rightMoves[0].scene, rightMoves[0].from])
  )
    windows.push({
      kind: 'before-first-move',
      game: game.filter((event) => event.order < leftMoves[0].order),
      reforge: reforge.filter((event) => event.order < rightMoves[0].order),
    })
  for (let i = 0; i < Math.min(leftMoves.length, rightMoves.length); i++) {
    if (pathKey(leftMoves[i]) !== pathKey(rightMoves[i])) break
    // Both next commits must exist. An unmatched stationary tail has no shared
    // closing boundary and cannot stand in for the other engine's moving window.
    if (!leftMoves[i + 1] || !rightMoves[i + 1]) break
    const between = (events, moves) =>
      events.filter(
        (event) =>
          event.order >= moves[i].order &&
          event.order < moves[i + 1].order &&
          event.scene === moves[i].scene &&
          event.sceneVisit === moves[i].sceneVisit,
      )
    windows.push({
      kind: 'shared-move',
      from: leftMoves[i].from,
      to: leftMoves[i].to,
      game: between(game, leftMoves),
      reforge: between(reforge, rightMoves),
    })
  }
  return windows
}

function renderEvidenceSource(evidence) {
  if (!evidence.length) return { observed: false, invalid: [] }
  const invalid = evidence
    .filter(
      ({ frame, frameSource, drawStatus, geometry, screenVisible }) =>
        (geometry !== null && screenVisible === null) ||
        !(
          (frameSource === 'drawn' &&
            drawStatus === 'drawn' &&
            Number.isSafeInteger(frame) &&
            frame >= 0) ||
          (frameSource === 'none' && drawStatus === 'not-drawn' && frame === null)
        ),
    )
    .map(({ order, frame, frameSource, drawStatus }) => ({ order, frame, frameSource, drawStatus }))
  return { observed: true, invalid }
}

function renderedHolds(evidence) {
  const holds = []
  for (const event of evidence) {
    const pose = {
        scene: event.scene,
        position: event.position,
        facing: event.facing,
        frame: event.frame,
        visible: event.visible,
      },
      previous = holds.at(-1)
    if (previous?.sceneVisit === event.sceneVisit && stable(previous.pose) === stable(pose))
      continue
    if (
      previous &&
      previous.sceneVisit === event.sceneVisit &&
      previous.pose.scene === event.scene
    ) {
      previous.endOrder = event.order
      previous.endAtMs = event.atMs
      previous.elapsedMs =
        Number.isFinite(event.atMs) && Number.isFinite(previous.atMs) && event.atMs >= previous.atMs
          ? event.atMs - previous.atMs
          : null
      previous.ticks =
        Number.isSafeInteger(event.tick) &&
        Number.isSafeInteger(previous.tick) &&
        event.tick >= previous.tick
          ? event.tick - previous.tick
          : null
    }
    holds.push({
      pose,
      sceneVisit: event.sceneVisit,
      order: event.order,
      atMs: event.atMs,
      tick: event.tick,
      // A scene's first observed pose may have started before recording. Neither
      // this left-open hold nor a final right-open hold has a known full duration.
      startKnown:
        !!previous &&
        previous.sceneVisit === event.sceneVisit &&
        previous.pose.scene === event.scene,
      endOrder: null,
      endAtMs: null,
      elapsedMs: null,
      ticks: null,
    })
  }
  return holds
}

function compareRenderedHolds(game, reforge, id) {
  const left = renderedHolds(game),
    right = renderedHolds(reforge),
    poses = (holds) => holds.map(({ pose }) => pose)
  // Never zip unaligned poses or use equal total dwell as proof of equal authored
  // waits: an input wait could compensate a missing authored wait. The raw holds
  // remain diagnostic evidence until their timing responsibilities are captured.
  const alignedPoses = stable(poses(left)) === stable(poses(right))
  const bounded = (holds) =>
      holds.filter(({ startKnown, endOrder }) => startKnown && endOrder !== null),
    a = bounded(left),
    b = bounded(right)
  if (!a.length && !b.length) return []
  if ([...a, ...b].some(({ elapsedMs }) => elapsedMs === null))
    return [{ type: 'evidence-gap', id, field: 'render-hold-clock', game: a, reforge: b }]
  // frameNum and motion.worldTick are not the same clock. Even equal tick
  // differences can hide different elapsed draw durations. Keep the observation
  // unresolved until authored timing, typing, input dwell and presentation delay
  // are attributed; neither invent a timing tolerance nor call this an NPC bug.
  return [
    {
      type: 'evidence-gap',
      id,
      field: 'render-hold-attribution',
      alignedPoses,
      clocks: {
        elapsedMs: 'engine-local performance.now draw intervals, not authored wait durations',
        gameTicks: 'frameNum',
        reforgeTicks: 'motion.worldTick',
      },
      game: a,
      reforge: b,
    },
  ]
}

function authoredMoveTargets(scene, entity) {
  const flow = canonicalScenes[scene]?.entities.find((candidate) => candidate.id === entity)
    ?.behaviors?.auto?.default?.flow
  if (!flow) return []
  const targets = []
  const visit = (commands) => {
    for (const command of commands ?? []) {
      if (command.kind === 'moveEntity' && command.target?.entity === entity)
        targets.push(command.to)
      if (command.kind === 'loop') visit(command.body)
      if (command.kind === 'branch') {
        visit(command.then)
        visit(command.else)
      }
    }
  }
  for (const stage of flow.stages ?? []) visit(stage.body)
  return targets
}

export function movementFrameEvidence(trace, id, onlyScene) {
  const events = actorTransitions(trace, id, onlyScene),
    moves = movementTransitions(trace, id, onlyScene).filter(
      (move) => events.find((event) => event.order === move.order)?.state.visible !== false,
    ),
    renders = renderedPoseEvidence(trace, id, onlyScene),
    sceneBoundaries = (trace.events ?? [])
      .filter((event) => event.kind === 'scene')
      .sort((a, b) => a.order - b.order)
  return moves.map((move, index) => {
    // A commit may still carry the previous render's cache. Both engines need a real render
    // at this exact position before the next move, including when its frame index is unchanged.
    const sceneEnd = sceneBoundaries.find((event) => event.order > move.order)?.order ?? Infinity,
      nextDraw = trace.worldRenders?.find((event) => event.order > move.order),
      frameEvent = renders.find(
        (event) =>
          event.scene === move.scene &&
          (event.sceneVisit ?? null) === move.sceneVisit &&
          event.order >= move.order &&
          event.order < Math.min(moves[index + 1]?.order ?? Infinity, sceneEnd) &&
          (!trace.worldRenders || event.renderId === nextDraw?.renderId) &&
          stable(event.position) === stable(move.to),
      )
    return {
      order: move.order,
      position: move.to,
      renderOrder: frameEvent?.order ?? null,
      frame: frameEvent?.visible === false ? null : (frameEvent?.frame ?? null),
      draw: frameEvent ?? null,
      opportunity: frameEvent ? null : movementDrawOpportunity(trace, move),
    }
  })
}

export function movementFrameParity(gameTrace, reforgeTrace, id, onlyScene, commonPrefixOnly) {
  let game = movementFrameEvidence(gameTrace, id, onlyScene),
    reforge = movementFrameEvidence(reforgeTrace, id, onlyScene)
  if (commonPrefixOnly) {
    const left = movementTransitions(gameTrace, id, onlyScene),
      right = movementTransitions(reforgeTrace, id, onlyScene),
      pathKey = ({ scene, from, to }) => stable({ scene, from, to }),
      gameByOrder = new Map(game.map((step) => [step.order, step])),
      reforgeByOrder = new Map(reforge.map((step) => [step.order, step]))
    game = []
    reforge = []
    for (let i = 0; i < Math.min(left.length, right.length); i++) {
      if (pathKey(left[i]) !== pathKey(right[i])) break
      const a = gameByOrder.get(left[i].order),
        b = reforgeByOrder.get(right[i].order)
      if (!a && !b) continue // Neither side draws this hidden movement.
      game.push(a ?? { order: left[i].order, position: left[i].to, renderOrder: null, frame: null })
      reforge.push(
        b ?? { order: right[i].order, position: right[i].to, renderOrder: null, frame: null },
      )
    }
    // Only the first actual draw bound to each exact shared commit is comparable here.
    // A shorter route's later stationary tail is not the other route's pre-divergence window.
    // The unmatched remainder remains an explicit movement-leg-alignment evidence gap.
  }
  const culled = game.map((step, index) => {
    const a = step.draw,
      b = reforge[index]?.draw
    return !!(
      a &&
      b &&
      a.scene === b.scene &&
      a.sceneVisit !== null &&
      b.sceneVisit !== null &&
      stable(a.position) === stable(b.position) &&
      a.facing === b.facing &&
      [a, b].every(
        (draw) =>
          draw.visible === true &&
          draw.screenVisible === false &&
          draw.geometry &&
          !renderEvidenceSource([draw]).invalid.length,
      )
    )
  })
  const equivalentSteps = game.map(
    (step, index) =>
      !!(
        culled[index] ||
        step.opportunity ||
        reforge[index]?.opportunity ||
        step.frame === reforge[index]?.frame
      ),
  )
  return {
    game,
    reforge,
    equivalentSteps,
    culled: game.flatMap((step, index) =>
      culled[index]
        ? [{ position: step.position, game: step.draw, reforge: reforge[index].draw }]
        : [],
    ),
    opportunities: game.flatMap((step, index) =>
      step.opportunity || reforge[index]?.opportunity
        ? [
            {
              position: step.position,
              game: step.opportunity,
              reforge: reforge[index]?.opportunity ?? null,
            },
          ]
        : [],
    ),
    missing:
      game.length !== reforge.length ||
      game.some((step, index) => step.frame === null && !culled[index] && !step.opportunity) ||
      reforge.some((step, index) => step.frame === null && !culled[index] && !step.opportunity),
    equal: game.length === reforge.length && equivalentSteps.every(Boolean),
  }
}

export function facingSequence(trace, id, onlyScene) {
  return compact(defined(stateTimeline(trace, id, onlyScene).facing))
}

export function movementCadence(trace, id, onlyScene) {
  return movementSummary(trace, id, onlyScene)
}

function controlSequence(trace) {
  return compact(
    (trace.events ?? [])
      .filter((event) => event.kind === 'control')
      .sort((a, b) => a.order - b.order)
      .map((event) => event.state),
  )
}

function dialogueLines(trace) {
  const lines = [],
    previousByInstance = new Map()
  for (const entry of trace.pages ?? []) {
    const page = entry.page ?? entry
    if (!page) continue
    const value = page.pageText ?? (Array.isArray(page.lines) ? page.lines.join('\n') : '')
    const current = String(value).split('\n').map(normalizeText).filter(Boolean)
    if (!current.length) continue
    const instance =
        page.instance ??
        `${page.dialogueId ?? 'page'}:${page.cueIndex ?? ''}:${page.pageIndex ?? ''}`,
      previous = previousByInstance.get(instance) ?? []
    const grows = previous.every((line, index) => current[index] === line),
      appended = grows ? current.slice(previous.length) : current
    previousByInstance.set(instance, current)
    for (const line of appended) {
      const normalized = normalizeText(line)
      if (normalized) lines.push(normalized)
    }
  }
  return compact(lines)
}

function snapshotsBefore(trace, targetOrder) {
  const actors = new Map()
  for (const event of (trace.events ?? []).slice().sort((a, b) => a.order - b.order)) {
    if (event.order >= targetOrder) break
    if (event.kind === 'scene') actors.clear()
    if (event.kind === 'actor' && event.state) actors.set(event.id, event.state)
  }
  return actors
}

/** Infer contact from observed party displacement and an adjacent visible NPC. */
export function tracePartyContactEvents(trace) {
  let clusterScene = null,
    clusterAtMs = -Infinity
  return (trace.events ?? [])
    .filter((event) => event.kind === 'actor' && event.id === 'party' && event.state?.position)
    .slice()
    .sort((a, b) => a.order - b.order)
    .flatMap((event) => {
      const from = canonicalPosition(event.before?.position),
        to = canonicalPosition(event.state.position)
      if (!from || !to || stable(from) === stable(to)) return []
      const delta = [to[0] - from[0], to[1] - from[1]],
        distance = Math.hypot(...delta)
      if (distance > 2.5) return []
      const previousPartyMoves = (trace.events ?? []).filter(
          (candidate) =>
            candidate.kind === 'actor' &&
            candidate.id === 'party' &&
            candidate.state?.position &&
            candidate.order < event.order &&
            candidate.before?.position,
        ),
        previousPartyMove = previousPartyMoves.at(-1),
        // Walking past an NPC produces the same small displacement. A contact
        // response is the displacement after a stable dwell at the spot.
        dwellMs = previousPartyMove ? event.atMs - previousPartyMove.atMs : Infinity
      const continuesCluster = clusterScene === event.scene && event.atMs - clusterAtMs <= 1000
      if (dwellMs < 1000 && !continuesCluster) return []
      const candidates = [...snapshotsBefore(trace, event.order).entries()]
        .filter(
          ([id, state]) =>
            ['e54', 'e55', 'e56', 'e59', 'e60', 'e61', 'e73', 'e74'].includes(id) &&
            state.visible !== false &&
            state.position,
        )
        .map(([id, state]) => {
          const position = canonicalPosition(state.position)
          return position
            ? { id, position, distance: Math.hypot(position[0] - from[0], position[1] - from[1]) }
            : null
        })
        .filter(Boolean)
        .sort((a, b) => a.distance - b.distance)
      const nearest = candidates[0]
      if (!nearest || nearest.distance > 1.75) return []
      clusterScene = event.scene
      clusterAtMs = event.atMs
      return [
        {
          order: event.order,
          atMs: event.atMs,
          source: event.source,
          npc: nearest.id,
          npcDistance: nearest.distance,
          from,
          to,
          delta,
        },
      ]
    })
}

export function observeNpcState(trace, ids, sceneByActor = {}) {
  const actors = Object.fromEntries(
    ids.map((id) => {
      const onlyScene = sceneByActor[id],
        transitions = actorTransitions(trace, id, onlyScene),
        states = stateTimeline(trace, id, onlyScene)
      return [
        id,
        {
          observed: transitions.length > 0,
          transitions,
          fields: Object.fromEntries(
            ACTOR_FIELDS.map((field) => [field, compact(defined(states[field]))]),
          ),
          movement: movementSummary(trace, id, onlyScene),
        },
      ]
    }),
  )
  return {
    actors,
    control: controlSequence(trace),
    dialogue: dialogueLines(trace),
    partyContacts: tracePartyContactEvents(trace),
  }
}

function fieldDifference(game, reforge, id, field) {
  const left = game.actors[id]?.fields[field] ?? [],
    right = reforge.actors[id]?.fields[field] ?? []
  if (!left.length && !right.length) return null
  if (stable(left) === stable(right)) return null
  return { type: 'actor-field', id, field, game: left, reforge: right }
}

/**
 * A scene-materialization pose may exist only in the non-visible prefix of one engine.
 * Accept it only when a later observed setter establishes the other engine's first pose,
 * every prefix render has independently-proved offscreen geometry, and the first common
 * visible state still agrees. This is a certificate, never an actor-id allowlist.
 */
export function invisibleInitialFacingProjection({
  gameTransitions,
  reforgeTransitions,
  gameRenders,
  reforgeRenders,
  id,
}) {
  const gameInitial = gameTransitions[0],
    reforgeInitial = reforgeTransitions[0]
  if (!gameInitial || !reforgeInitial) return null
  const gameFacing = gameInitial.state.facing,
    reforgeFacing = reforgeInitial.state.facing
  if (!gameFacing || !reforgeFacing || gameFacing === reforgeFacing) return null
  const canonicalPositionValue = canonicalPosition(gameInitial.state.position)
  if (
    !canonicalPositionValue ||
    stable(canonicalPositionValue) !== stable(canonicalPosition(reforgeInitial.state.position))
  )
    return null
  const setter = gameTransitions.find(
    (event, index) =>
      index > 0 &&
      event.state.facing === reforgeFacing &&
      gameTransitions[index - 1]?.state.facing === gameFacing &&
      typeof event.source === 'string' &&
      event.source.startsWith('commit:'),
  )
  if (!setter) return null
  const gamePrefix = gameRenders.filter((event) => event.order < setter.order),
    firstReforgeDraw = reforgeRenders.findIndex((event) => event.drawStatus === 'drawn'),
    reforgePrefix =
      firstReforgeDraw < 0 ? reforgeRenders : reforgeRenders.slice(0, firstReforgeDraw + 1)
  if (
    gamePrefix.length === 0 ||
    gamePrefix.some((event) => event.screenVisible !== false) ||
    reforgePrefix.some((event) => event.screenVisible !== false)
  )
    return null
  const common = reforgeTransitions.find((event) => event.state.facing === reforgeFacing)
  if (!common) return null
  for (const field of ['position', 'visible', 'state', 'frame', 'sprite']) {
    const left = field === 'position' ? canonicalPosition(setter.state[field]) : setter.state[field]
    const right =
      field === 'position' ? canonicalPosition(common.state[field]) : common.state[field]
    if (stable(left) !== stable(right)) return null
  }
  return {
    type: 'invisible-initial-facing-projection',
    id,
    game: {
      initial: { order: gameInitial.order, facing: gameFacing },
      setter: { order: setter.order, facing: setter.state.facing },
      prefixRenders: gamePrefix.length,
    },
    reforge: {
      initial: { order: reforgeInitial.order, facing: reforgeFacing },
      prefixRenders: reforgePrefix.length,
    },
  }
}

function hasNoSprite(actor) {
  // A sprite-less trigger has state but no animation. Missing metadata is not
  // proof of absence, and any visual appearance still requires frame evidence.
  return actor.transitions.every(
    ({ state }) => Object.hasOwn(state, 'sprite') && (state.sprite === null || state.sprite === 0),
  )
}

function compareObservedState(
  game,
  reforge,
  ids,
  fragment,
  gameTrace,
  reforgeTrace,
  sceneByActor,
  acceptedDifferences,
  holdIntent,
  innTiming,
  kitchenTiming,
  storyTiming,
) {
  const findings = []
  for (const id of ids) {
    const left = game.actors[id],
      right = reforge.actors[id]
    if (!left?.observed || !right?.observed) {
      findings.push({
        type: 'missing-actor-observation',
        id,
        game: left?.observed ?? false,
        reforge: right?.observed ?? false,
      })
      continue
    }
    const movement = left.movement,
      otherMovement = right.movement,
      path = (value) => value.transitions.map(({ scene, from, to }) => ({ scene, from, to })),
      alignedMoves = stable(path(movement)) === stable(path(otherMovement)),
      renderedGame = renderedPoseEvidence(gameTrace, id, sceneByActor[id]),
      renderedReforge = renderedPoseEvidence(reforgeTrace, id, sceneByActor[id]),
      approvedTerminal = approvedOpeningTerminalMotion({
        fragment,
        id,
        game: {
          moves: movement.transitions,
          renders: renderedGame,
          states: left.transitions,
          worldRenders: gameTrace.worldRenders ?? [],
        },
        reforge: {
          moves: otherMovement.transitions,
          renders: renderedReforge,
          states: right.transitions,
          worldRenders: reforgeTrace.worldRenders ?? [],
        },
      })
    const initialFacingProjection =
      id === 'party'
        ? null
        : (approvedAutomaticInitialFacing({
            fragment,
            id,
            game: gameTrace,
            reforge: reforgeTrace,
            gameTransitions: left.transitions,
            reforgeTransitions: right.transitions,
            gameRenders: renderedGame,
            reforgeRenders: renderedReforge,
            storyTiming,
          }) ??
          invisibleInitialFacingProjection({
            gameTransitions: left.transitions,
            reforgeTransitions: right.transitions,
            gameRenders: renderedGame,
            reforgeRenders: renderedReforge,
            id,
          }))
    if (initialFacingProjection) acceptedDifferences.push(initialFacingProjection)
    if (approvedTerminal) acceptedDifferences.push(approvedTerminal)
    const closedCycle =
      storyTiming?.status === 'passed' &&
      storyTiming.closedCycles?.proved.find(
        (proof) =>
          proof.entity === id &&
          proof.scene === sceneByActor[id] &&
          proof.gameDraws === renderedGame.length &&
          proof.reforgeDraws === renderedReforge.length,
      )
    if (closedCycle)
      acceptedDifferences.push({
        type: 'causal-closed-automatic-cycle',
        id,
        reason:
          '相同primary根、单visit闭合空间势能、真实control/effect/slot及每draw当前帧和终点姿态均已核；两轨正文耗时产生的合法循环相位不同。',
        evidence: closedCycle,
      })
    const interruptedRoute =
      storyTiming?.status === 'passed' &&
      storyTiming.interruptedRoute?.entity === id &&
      storyTiming.interruptedRoute.gameDraws === renderedGame.length &&
      storyTiming.interruptedRoute.reforgeDraws === renderedReforge.length &&
      storyTiming.interruptedRoute
    if (interruptedRoute)
      acceptedDifferences.push({
        type: 'causal-interrupted-automatic-route',
        id,
        reason:
          '同一实际primary selector和两条已执行慢速leg，逐call/stride/current-phase、真实slot/cancel/take/release和完整draw已核；仅解释各自实际触发/离场前缀的进度，不授予终点容差。',
        evidence: interruptedRoute,
      })
    const sameAuthoredRouteProgress = (() => {
      if (id === 'party' || storyTiming?.status !== 'passed') return false
      const report = storyTiming.reportingRoute?.entity === id && storyTiming.reportingRoute
      const beforeReport = (value, engine) => {
        if (!report) return value
        const transitions = value.transitions.filter((step) => step.order < report.resets[engine])
        const directions = transitions
          .map((step) => step.delta.map(sign))
          .filter(
            (direction, index, values) => !index || stable(direction) !== stable(values[index - 1]),
          )
        return { ...value, transitions, directions }
      }
      const routeMovement = beforeReport(movement, 'game')
      const otherRouteMovement = beforeReport(otherMovement, 'reforge')
      if (!routeMovement.directions.length || !otherRouteMovement.directions.length) return false
      const initialGame = canonicalPosition(left.transitions[0]?.state?.position),
        initialReforge = canonicalPosition(right.transitions[0]?.state?.position),
        finalGame = report
          ? routeMovement.transitions.at(-1)?.to
          : canonicalPosition(left.transitions.at(-1)?.state?.position),
        finalReforge = report
          ? otherRouteMovement.transitions.at(-1)?.to
          : canonicalPosition(right.transitions.at(-1)?.state?.position),
        gameCoverage = storyTiming.gamePresentation?.find((actor) => actor.id === id),
        reforgeCoverage = storyTiming.presentation?.actors.find((actor) => actor.id === id),
        targets = authoredMoveTargets(sceneByActor[id], id),
        points = [initialGame, ...targets.map((target) => [target.col, target.row])]
      if (
        !initialGame ||
        !initialReforge ||
        !finalGame ||
        !finalReforge ||
        stable(initialGame) !== stable(initialReforge) ||
        !gameCoverage ||
        !reforgeCoverage ||
        gameCoverage.draws !== renderedGame.length ||
        reforgeCoverage.draws !== renderedReforge.length
      )
        return false
      const routes = storyTiming.routeEvidence
      if (!routes) return false
      const boundSource = routeMovement.transitions.every((transition) =>
        routes.source.some((call) => {
          if (
            call.actor !== id ||
            call.scene !== transition.scene ||
            call.sceneVisit !== transition.sceneVisit ||
            call.from >= transition.order ||
            call.to <= transition.order ||
            stable(canonicalPosition(call.before.position)) !== stable(transition.from) ||
            stable(canonicalPosition(call.after.position)) !== stable(transition.to)
          )
            return false
          return call.commands.some((ip) => {
            const command = sourceCommands[ip]
            if (command?.op !== 'raw' || ![0x10, 0x11].includes(command.opcode)) return false
            const [x, y, height] = command.operands
            return targets.some(
              (target) =>
                stable([target.col, target.row]) ===
                stable(canonicalPosition([x * 32 + height * 16, y * 16 + height * 8])),
            )
          })
        }),
      )
      const boundAuthored = otherRouteMovement.transitions.every((transition) =>
        routes.authored.some(
          (route) =>
            route.actor === id &&
            route.scene === transition.scene &&
            route.sceneVisit === transition.sceneVisit &&
            route.timing === 'auto' &&
            route.command.kind === 'moveEntity' &&
            targets.some(
              (target) =>
                stable([target.col, target.row, target.height]) ===
                stable([route.command.to.col, route.command.to.row, route.command.to.height]),
            ) &&
            route.commits.some(
              (commit) =>
                commit.order === transition.order &&
                stable(commit.from) === stable(transition.from) &&
                stable(commit.to.slice(0, 2)) === stable(transition.to),
            ),
        ),
      )
      if (!boundSource || !boundAuthored) return false
      const legFor = (point) =>
        points.findIndex((from, index) => {
          const to = points[index + 1]
          if (!to) return false
          const horizontal = from[1] === to[1] && point[1] === from[1]
          const vertical = from[0] === to[0] && point[0] === from[0]
          return (
            (horizontal || vertical) &&
            point[0] >= Math.min(from[0], to[0]) &&
            point[0] <= Math.max(from[0], to[0]) &&
            point[1] >= Math.min(from[1], to[1]) &&
            point[1] <= Math.max(from[1], to[1])
          )
        })
      const gameLeg = legFor(finalGame),
        reforgeLeg = legFor(finalReforge),
        authoredDirections = points
          .slice(1)
          .map((to, index) => [sign(to[0] - points[index][0]), sign(to[1] - points[index][1])]),
        matchesPrefix = (directions, leg) =>
          leg >= 0 &&
          directions.length === leg + 1 &&
          stable(directions) === stable(authoredDirections.slice(0, leg + 1))
      // A corner belongs to both adjacent legs. Direction-wide maximum strides
      // are not interchangeable: two executed legs may use different speeds.
      // Exact strides above come from each verified native call / authored slot.
      const routeSteps = (transitions) =>
        transitions.every((transition) => {
          const delta = transition.to.map((value, index) => value - transition.from[index])
          return (
            delta.filter((value) => value !== 0).length === 1 &&
            points.some((from, index) => {
              const to = points[index + 1]
              if (
                !to ||
                stable(delta.map(sign)) !==
                  stable(to.map((value, axis) => sign(value - from[axis])))
              )
                return false
              return [transition.from, transition.to].every((point) =>
                point.every(
                  (value, axis) =>
                    value >= Math.min(from[axis], to[axis]) &&
                    value <= Math.max(from[axis], to[axis]),
                ),
              )
            })
          )
        })
      return (
        matchesPrefix(routeMovement.directions, gameLeg) &&
        matchesPrefix(otherRouteMovement.directions, reforgeLeg) &&
        routeSteps(routeMovement.transitions) &&
        routeSteps(otherRouteMovement.transitions)
      )
    })()
    if (sameAuthoredRouteProgress)
      acceptedDifferences.push({
        type: 'causal-authored-route-progress',
        id,
        reason:
          '每个真实transition绑定独立source call和authored motion slot，逐目标/leg/stride及完整draw已核；仅允许该已执行路线的正文时序进度不同。',
      })
    const sameRouteTiming = (() => {
      if (!sameAuthoredRouteProgress) return false
      const gameFacing = left.fields.facing ?? [],
        reforgeFacing = right.fields.facing ?? [],
        shorter = gameFacing.length <= reforgeFacing.length ? gameFacing : reforgeFacing,
        longer = gameFacing.length <= reforgeFacing.length ? reforgeFacing : gameFacing
      return shorter.every((value, index) => value === longer[index])
    })()
    const restoredAutomaticCycle = (() => {
      if (storyTiming?.status !== 'passed') return false
      const proof = storyTiming.restoredAutomatic?.find((entry) => entry.entity === id)
      return (
        !!proof &&
        proof.phase?.increments > 0 &&
        proof.restorations?.length > 0 &&
        storyTiming.gamePresentation?.find(
          (actor) => actor.id === id && actor.draws === renderedGame.length,
        ) &&
        storyTiming.presentation?.actors.find(
          (actor) => actor.id === id && actor.draws === renderedReforge.length,
        )
      )
    })()
    const automaticLanguageProgress = (() => {
      if (storyTiming?.status !== 'passed') return false
      const binding = storyTiming.automaticLanguages?.bindings?.find(
          (entry) => entry.entity === id && entry.scene === sceneByActor[id],
        ),
        gameCoverage = storyTiming.gamePresentation?.find((actor) => actor.id === id),
        reforgeCoverage = storyTiming.presentation?.actors.find((actor) => actor.id === id)
      if (
        !binding?.runs?.length ||
        !binding.sourceCalls?.length ||
        gameCoverage?.draws !== renderedGame.length ||
        reforgeCoverage?.draws !== renderedReforge.length
      )
        return false
      const graph = automaticLanguageGraphs(binding),
        effects = (value) =>
          value.nodes.filter((node) => node.kind === 'effect').map((node) => node.value),
        framesCausal = (transitions, renders) =>
          renders.every((render) => {
            if (render.frame === null) return true
            const transition = transitions.findLast(
              (event) => event.sceneVisit === render.sceneVisit && event.order <= render.order,
            )
            return transition?.state.frame === render.frame
          })
      return (
        stable(effects(graph.source)) === stable(effects(graph.authored)) &&
        effects(graph.source).every((effect) =>
          ['step', 'animate', 'frame', 'facing'].includes(effect.kind),
        ) &&
        framesCausal(right.transitions, renderedReforge)
      )
    })()
    if (automaticLanguageProgress)
      acceptedDifferences.push({
        type: 'causal-automatic-language-progress',
        id,
        reason:
          'source/authored automatic language、真实 runs/sourceCalls/slot-wait-draw receipts 和每个实际渲染帧到最近 actor observation 的因果绑定均通过；仅保留同一语言在不同正文时序下的进度差异。',
      })
    const kitchenActor =
      kitchenTiming?.status === 'passed' && kitchenTiming.presentation.find((e) => e.id === id)
    const kitchenSource =
      kitchenTiming?.status === 'passed' && kitchenTiming.gamePresentation.find((e) => e.id === id)
    const kitchenCoverage =
      kitchenActor &&
      kitchenSource &&
      kitchenActor.draws === renderedReforge.length &&
      kitchenSource.draws === renderedGame.length
    const kitchenWalk =
      id === 'e56' &&
      kitchenCoverage &&
      kitchenTiming.sourceWalk &&
      kitchenTiming.motionCadence.length === 3
    if (kitchenWalk)
      acceptedDifferences.push({
        type: 'approved-uniform-terminal-steps',
        id,
        reason:
          '003已批准三段末半格保持匀速；逐源像素步、每个应执行运动拍、完整实际步帧及精确终点均已核验。',
        game: kitchenTiming.sourceWalk,
        reforge: kitchenTiming.motionCadence,
      })
    const innDeparture = id === 'e56' && innTiming?.status === 'passed' && innTiming.sourceDeparture
    if (innDeparture)
      acceptedDifferences.push({
        type: 'authored-uniform-departure',
        id,
        reason:
          '李大娘说去准备酒菜后，按六个原始目标匀速离开；仅三苗人被接管，不复制Game对白期间的全局auto冻结。',
        game: innDeparture,
        reforge: innTiming.motionCadence.filter((event) => event.actor === id),
      })
    if (
      id !== 'party' &&
      !alignedMoves &&
      !sameAuthoredRouteProgress &&
      !interruptedRoute &&
      !restoredAutomaticCycle &&
      !automaticLanguageProgress &&
      !approvedTerminal &&
      !innDeparture &&
      !kitchenWalk &&
      !closedCycle
    )
      findings.push({
        type: 'evidence-gap',
        id,
        field: 'movement-leg-alignment',
        game: path(movement),
        reforge: path(otherMovement),
      })
    for (const field of id === 'party' ? [] : ['visible', 'facing', 'state', 'sprite']) {
      const difference = fieldDifference(game, reforge, id, field)
      if (
        difference &&
        !(
          (field === 'facing' && (initialFacingProjection || closedCycle || sameRouteTiming)) ||
          restoredAutomaticCycle ||
          automaticLanguageProgress
        )
      )
        findings.push(difference)
    }
    if (id !== 'party') {
      for (const [boundary, index] of [
        ['initial', 0],
        ['final', -1],
      ]) {
        const gamePosition = canonicalPosition(left.transitions.at(index)?.state.position),
          reforgePosition = canonicalPosition(right.transitions.at(index)?.state.position)
        if (
          boundary === 'final' &&
          (sameAuthoredRouteProgress ||
            interruptedRoute ||
            restoredAutomaticCycle ||
            (closedCycle &&
              stable(gamePosition) === stable(closedCycle.terminal.game.position) &&
              stable(reforgePosition) === stable(closedCycle.terminal.reforge.position)))
        )
          continue
        if (
          !gamePosition ||
          !reforgePosition ||
          (stable(gamePosition) !== stable(reforgePosition) &&
            !sameAuthoredRouteProgress &&
            !interruptedRoute &&
            !restoredAutomaticCycle &&
            !automaticLanguageProgress)
        )
          findings.push({
            type: gamePosition && reforgePosition ? 'actor-position-boundary' : 'evidence-gap',
            id,
            boundary,
            game: gamePosition,
            reforge: reforgePosition,
          })
      }
    }
    if (id !== 'party' && !(hasNoSprite(left) && hasNoSprite(right))) {
      const gameSource = renderEvidenceSource(renderedGame),
        reforgeSource = renderEvidenceSource(renderedReforge)
      if (
        !gameSource.observed ||
        !reforgeSource.observed ||
        gameSource.invalid.length ||
        reforgeSource.invalid.length
      )
        findings.push({
          type: 'evidence-gap',
          id,
          field: 'render-evidence-source',
          game: gameSource,
          reforge: reforgeSource,
        })
      const poseWindows = comparablePoseWindows(
        renderedGame,
        renderedReforge,
        movement.transitions,
        otherMovement.transitions,
        alignedMoves,
      )
      const terminalViewport = approvedOpeningTerminalViewport(
        approvedTerminal,
        { renders: renderedGame, worldRenders: gameTrace.worldRenders ?? [] },
        { renders: renderedReforge, worldRenders: reforgeTrace.worldRenders ?? [] },
      )
      if (approvedTerminal)
        poseWindows.push({
          kind: 'after-approved-terminal-arrival',
          ...(terminalViewport ? { terminalViewport } : {}),
          game: renderedGame.filter((event) => event.order >= approvedTerminal.game.endpointOrder),
          reforge: renderedReforge.filter(
            (event) => event.order >= approvedTerminal.reforge.endpointOrder,
          ),
        })
      const differentWindows = poseWindows.filter(
        (window) =>
          stable(renderedPoseSequence(window.game, window.terminalViewport?.gameAnchor)) !==
          stable(renderedPoseSequence(window.reforge, window.terminalViewport?.reforgeAnchor)),
      )
      const standing =
        innTiming?.status === 'passed'
          ? innTiming.presentation.standingOverlays.filter((event) => event.id === id)
          : []
      const standingEquivalent =
        differentWindows.length &&
        standing.length &&
        differentWindows.every(
          (window) =>
            stable(renderedPoseSequence(window.game)) ===
            stable(renderedPoseSequence(window.reforge, undefined, standing)),
        )
      if (standingEquivalent)
        acceptedDifferences.push({
          type: 'explicit-take-standing-pose',
          id,
          reason: '明确接管期间原地站定，释放后保留原步态相位；除此逐帧序列相同。',
          evidence: standing,
        })
      const kitchenCycle =
        id === 'e62' &&
        kitchenCoverage &&
        kitchenTiming.sourceCycle &&
        kitchenTiming.automaticTake.status === 'passed'
      if (kitchenCycle)
        acceptedDifferences.push({
          type: 'causal-ambient-cycle',
          id,
          reason:
            '原版实际auto调用2/13拍与作者200/1300ms逐轮核验；明确接管冻结余时及全部实际draw已核，不要求不同对白/行路耗时拥有相同循环次数。',
          game: kitchenTiming.sourceCycle,
          reforge: kitchenTiming.automaticWaits.filter((e) => e.actor === id),
        })
      const stationaryCycle =
        storyTiming?.status === 'passed' &&
        storyTiming.stationaryCycles?.proved.find(
          (proof) => proof.entity === id && proof.scene === sceneByActor[id],
        )
      if (stationaryCycle)
        acceptedDifferences.push({
          type: 'causal-stationary-cycle',
          id,
          reason:
            '同primary初始状态、单visit自姿态语言、完整incoming writer census及实际control/effect/wait/draw均证明；不同正文耗时的合法循环采样次数不要求相等。',
          evidence: stationaryCycle,
        })
      const capturedCycle =
        storyTiming?.status === 'passed' &&
        storyTiming.capturedAmbient?.entity === id &&
        storyTiming.capturedAmbient.scene === sceneByActor[id] &&
        storyTiming.capturedAmbient.gameDraws === renderedGame.length &&
        storyTiming.capturedAmbient.reforgeDraws === renderedReforge.length &&
        storyTiming.capturedAmbient
      if (capturedCycle)
        acceptedDifferences.push({
          type: 'causal-captured-ambient-cycle',
          id,
          reason:
            '独立前驱真实cycle/take/draw、保存字节、自身恢复姿态/余时、实际控制字与共同foreground setter/停auto已绑定；仅解释循环采样和冻结时保留自身相位。',
          evidence: capturedCycle,
        })
      const pageCycle =
        storyTiming?.status === 'passed' &&
        storyTiming.pageCycles?.proved.find(
          (proof) =>
            proof.entity === id &&
            proof.scene === sceneByActor[id] &&
            proof.gameDraws === renderedGame.length &&
            proof.reforgeDraws === renderedReforge.length,
        )
      if (pageCycle)
        acceptedDifferences.push({
          type: 'causal-page-cycle-progress',
          id,
          reason:
            '纯自身primary帧循环与canonical页面动作、实际安装/选择/未暂停gate/advance及两轨完整draw已核；每个实际帧等于自身时钟预测，不复制Game对白全局冻结。',
          evidence: pageCycle,
        })
      if (
        differentWindows.length &&
        !standingEquivalent &&
        !kitchenCycle &&
        !stationaryCycle &&
        !closedCycle &&
        !sameAuthoredRouteProgress &&
        !interruptedRoute &&
        !restoredAutomaticCycle &&
        !automaticLanguageProgress &&
        !capturedCycle &&
        !pageCycle
      )
        findings.push({
          type: 'actor-render-sequence',
          id,
          field: 'rendered-pose',
          game: renderedGame,
          reforge: renderedReforge,
          windows: differentWindows,
        })
      const gameCoverage =
        innTiming?.status === 'passed' &&
        innTiming.gamePresentation.find((event) => event.id === id)
      const reforgeCoverage =
        innTiming?.status === 'passed' &&
        innTiming.presentation.actors.find((event) => event.id === id)
      const innHold =
        gameCoverage &&
        reforgeCoverage &&
        gameCoverage.draws === renderedGame.length &&
        reforgeCoverage.draws === renderedReforge.length &&
        innTiming.holdSchedule.reduce((sum, event) => sum + event.draws, 0) ===
          renderedReforge.length
      if (innHold)
        acceptedDifferences.push({
          type: 'causal-hold-attribution',
          id,
          reason:
            '按源等待、真实对白消费、运动/接管和完成后静止逐draw归因；两浏览器draw数量和人工输入耗时不作相等要求。',
          game: gameCoverage,
          reforge: reforgeCoverage,
          schedule: 'innTiming.holdSchedule',
        })
      if (kitchenCoverage)
        acceptedDifferences.push({
          type: 'causal-hold-attribution',
          id,
          reason:
            '003每次实际绘制绑定作者姿态、运动、等待、对白消费或真实脚本终结；保留所有原始draw与离场尾轮。',
          game: kitchenSource,
          reforge: kitchenActor,
          schedule: 'kitchenTiming.holdSchedule',
        })
      const storyCoverage =
        storyTiming?.status === 'passed' &&
        storyTiming.presentation.actors.find(
          (actor) =>
            actor.id === id &&
            actor.scene === sceneByActor[id] &&
            actor.draws === renderedReforge.length,
        ) &&
        storyTiming.gamePresentation.find(
          (actor) => actor.id === id && actor.draws === renderedGame.length,
        )
      if (storyCoverage)
        acceptedDifferences.push({
          type: 'causal-hold-attribution',
          id,
          reason:
            '完整来源链、计时/门控/移动义务和每次绘制均通过；此证明不豁免坐标、帧序列或其它差异。',
          schedule: 'storyTiming.holdSchedule',
        })
      if (holdIntent?.status !== 'passed' && !innHold && !kitchenCoverage && !storyCoverage)
        findings.push(...compareRenderedHolds(renderedGame, renderedReforge, id))
      // Raw actor frames have engine-specific meanings (direction-local vs display index).
      // Animation verdicts use only the actual draw records above and movement-bound draws.
      {
        const frameParity = movementFrameParity(
          gameTrace,
          reforgeTrace,
          id,
          sceneByActor[id],
          !alignedMoves,
        )
        const mountedRower = storyTiming?.status === 'passed' && storyTiming.mountedRower
        const mountedFrameProgress =
          !frameParity.missing &&
          alignedMoves &&
          mountedRower?.entity === id &&
          mountedRower.gameDraws === renderedGame.length &&
          mountedRower.reforgeDraws === renderedReforge.length &&
          stable(mountedRower.movements.game) ===
            stable(movement.transitions.map((move) => move.order)) &&
          stable(mountedRower.movements.reforge) ===
            stable(otherMovement.transitions.map((move) => move.order))
        if (mountedFrameProgress && !frameParity.equal)
          acceptedDifferences.push({
            type: 'causal-mounted-rower-frame-progress',
            id,
            reason:
              '实际安装的划船语言、每个 effect/wait/run/draw、载具权威及精确移动均已核实；仅动画在不同实际时钟下的循环进度不同。',
            evidence: mountedRower,
          })
        if (frameParity.culled.length)
          acceptedDifferences.push({
            type: 'offscreen-movement-draw',
            id,
            reason:
              'Both exact committed positions are wholly outside their actual viewports; draw-call culling differs.',
            evidence: frameParity.culled,
          })
        if (frameParity.opportunities.length)
          acceptedDifferences.push({
            type: 'scene-exit-before-movement-draw',
            id,
            reason:
              '位移已提交，但旧场景在下一次完整世界绘制前已成功退出；只解除该次旧场景绘制义务，位置及演出帧语义仍单独检查。',
            evidence: frameParity.opportunities,
          })
        const standingFirstDraws = frameParity.reforge.flatMap((step, index) => {
          const overlay = standing.find((event) => event.order === step.renderOrder)
          return overlay &&
            frameParity.game[index]?.frame === overlay.suspendedFrame &&
            step.frame === overlay.frame &&
            stable(step.position) === stable(overlay.position)
            ? [{ index, ...overlay }]
            : []
        })
        const standingFrameEquivalent =
          !frameParity.missing &&
          !frameParity.equal &&
          frameParity.game.every(
            (_step, index) =>
              frameParity.equivalentSteps[index] ||
              standingFirstDraws.some((event) => event.index === index),
          )
        if (standingFrameEquivalent)
          acceptedDifferences.push({
            type: 'explicit-take-before-first-draw',
            id,
            reason:
              '同一实际帧先提交位移、后明确接管；首draw呈现最终站姿，不强行闪一次已被接管的抬脚帧。',
            evidence: standingFirstDraws,
          })
        if (
          (frameParity.missing || (!frameParity.equal && !standingFrameEquivalent)) &&
          !closedCycle &&
          !sameAuthoredRouteProgress &&
          !interruptedRoute &&
          !restoredAutomaticCycle &&
          !automaticLanguageProgress &&
          !mountedFrameProgress
        )
          findings.push({
            type: frameParity.missing ? 'evidence-gap' : 'actor-frame-sequence',
            id,
            field: 'movement-frame',
            game: frameParity.game,
            reforge: frameParity.reforge,
          })
      }
    }
    if (
      id !== 'party' &&
      movement.directions.length &&
      otherMovement.directions.length &&
      stable(movement.directions) !== stable(otherMovement.directions) &&
      !closedCycle &&
      !sameAuthoredRouteProgress &&
      !interruptedRoute &&
      !restoredAutomaticCycle &&
      !automaticLanguageProgress
    )
      findings.push({
        type: 'movement-path',
        id,
        game: movement.directions,
        reforge: otherMovement.directions,
      })
  }
  if (!game.control.length || !reforge.control.length)
    findings.push({
      type: 'evidence-gap',
      field: 'control',
      game: game.control.length > 0,
      reforge: reforge.control.length > 0,
    })
  else if (game.control.at(-1) !== reforge.control.at(-1))
    findings.push({ type: 'control', game: game.control, reforge: reforge.control })
  if (!game.dialogue.length || !reforge.dialogue.length)
    findings.push({
      type: 'evidence-gap',
      field: 'dialogue',
      game: game.dialogue.length > 0,
      reforge: reforge.dialogue.length > 0,
    })
  else if (stable(game.dialogue) !== stable(reforge.dialogue))
    findings.push({ type: 'dialogue', game: game.dialogue, reforge: reforge.dialogue })
  if (
    fragment === '002' &&
    stable(game.partyContacts.map((event) => [event.npc, event.delta])) !==
      stable(reforge.partyContacts.map((event) => [event.npc, event.delta]))
  )
    findings.push({
      type: 'party-contact-response',
      game: game.partyContacts,
      reforge: reforge.partyContacts,
    })
  return findings
}

export function compareNpcStateTraces(gameTrace, reforgeTrace, fragment, options = {}) {
  const ids = {
    '001': ['e3', 'e8', 'e10', 'e11', 'party'],
    '002': ['e54', 'e55', 'e56', 'e59', 'e60', 'e61', 'e73', 'e74', 'party'],
    '003': ['e19', 'e20', 'e56', 'e59', 'e60', 'e61', 'e62', 'party'],
    '004': ['e19', 'e26', 'e62', 'party'],
    '005': ['e19', 'e62', 'e83', 'e84', 'e123', 'e124', 'e127', 'party'],
    '006': ['e35', 'e36', 'e59', 'e60', 'e61', 'e116', 'e117', 'e123', 'e203', 'party'],
  }[fragment]
  assert(ids, `no NPC state contract for ${fragment}`)
  const sceneByActor = {
    '001': Object.fromEntries(ids.filter((id) => id !== 'party').map((id) => [id, 's001'])),
    '002': Object.fromEntries(ids.filter((id) => id !== 'party').map((id) => [id, 's003'])),
    '003': {
      e19: 's001',
      e20: 's001',
      e56: 's003',
      e59: 's003',
      e60: 's003',
      e61: 's003',
      e62: 's003',
    },
    '004': { e19: 's001', e26: 's001', e62: 's003' },
    '005': {
      e19: 's001',
      e62: 's003',
      e83: 's004',
      e84: 's004',
      e123: 's005',
      e124: 's005',
      e127: 's005',
    },
    '006': {
      e35: 's002',
      e36: 's002',
      e59: 's003',
      e60: 's003',
      e61: 's003',
      e116: 's005',
      e117: 's005',
      e123: 's005',
      e203: 's014',
    },
  }[fragment]
  const commonPresentation = ['004', '005', '006'].includes(fragment)
  const fullGame =
      commonPresentation && gameTrace.renderScope
        ? storyProofPrefix(gameTrace, options.rawGame)
        : null,
    fullReforge =
      commonPresentation && reforgeTrace.renderScope
        ? storyProofPrefix(reforgeTrace, options.rawReforge)
        : null
  const participants = fullReforge
    ? fragment === '006'
      ? ids
          .filter((entity) => entity !== 'party')
          .map((entity) => ({ entity, scene: sceneByActor[entity] }))
      : storyParticipants(
          fullReforge,
          ids
            .filter((entity) => entity !== 'party')
            .map((entity) => ({ entity, scene: sceneByActor[entity] })),
        )
    : []
  for (const actor of participants)
    if (!ids.includes(actor.entity)) {
      ids.push(actor.entity)
      sceneByActor[actor.entity] = actor.scene
    }
  const game = observeNpcState(gameTrace, ids, sceneByActor),
    reforge = observeNpcState(reforgeTrace, ids, sceneByActor),
    acceptedDifferences = [],
    kitchenTiming =
      fragment === '003'
        ? compareKitchenTimingIntent(
            gameTrace,
            reforgeTrace,
            renderedPoseEvidence,
            movementTransitions,
            actorTransitions,
            canonicalPosition,
          )
        : undefined,
    innTiming =
      fragment === '002'
        ? compareInnTimingIntent(
            gameTrace,
            reforgeTrace,
            renderedPoseEvidence,
            movementTransitions,
            actorTransitions,
            canonicalPosition,
          )
        : undefined,
    holdIntent =
      fragment === '001'
        ? compareOpeningHoldIntent(gameTrace, reforgeTrace, {
            renders: renderedPoseEvidence,
            moves: movementTransitions,
            position: canonicalPosition,
          })
        : undefined,
    storyTiming = commonPresentation
      ? fullGame && fullReforge
        ? compareStoryPresentationIntent(fullGame, fullReforge, participants, {
            renders: renderedPoseEvidence,
            moves: movementTransitions,
            states: actorTransitions,
            position: canonicalPosition,
            frameCounts: options.frameCounts ?? {},
            terminalSpecifications: storyExecutionSpecifications(fragment),
            capturedAncestors: options.capturedAncestors,
          })
        : { status: 'needs-review', errors: ['missing explicit story scope'] }
      : undefined,
    findings = compareObservedState(
      game,
      reforge,
      ids,
      fragment,
      gameTrace,
      reforgeTrace,
      sceneByActor,
      acceptedDifferences,
      holdIntent,
      innTiming,
      kitchenTiming,
      storyTiming,
    ),
    // Every observed mismatch is unresolved until the report explains why it
    // is an intentional engine difference or fixes the responsible layer.
    violations = findings
  if (innTiming && innTiming.status !== 'passed')
    findings.push({
      type: 'evidence-gap',
      field: 'inn-authored-timing',
      errors: innTiming.errors,
    })
  if (holdIntent && holdIntent.status !== 'passed')
    findings.push({
      type: 'evidence-gap',
      field: 'opening-authored-execution',
      errors: holdIntent.errors,
    })
  if (kitchenTiming && kitchenTiming.status !== 'passed')
    findings.push({
      type: 'evidence-gap',
      field: 'kitchen-authored-timing',
      errors: kitchenTiming.errors,
    })
  if (storyTiming && storyTiming.status !== 'passed')
    findings.push({
      type: 'evidence-gap',
      field: 'story-authored-presentation',
      errors: storyTiming.errors,
    })
  for (const [engine, trace] of [
    ['game', gameTrace],
    ['reforge', reforgeTrace],
  ]) {
    if (!Array.isArray(trace.errors) || trace.errors.length || trace.overflow !== false)
      findings.push({
        type: 'evidence-gap',
        field: 'collector-integrity',
        engine,
        errors: trace.errors ?? null,
        overflow: trace.overflow ?? null,
      })
    if (trace.storyScopeMissing)
      findings.push({ type: 'evidence-gap', field: 'story-boundary', engine })
  }
  const authority = checkAuthoredOwnership(reforgeTrace)
  if (authority && authority.status !== 'proved')
    findings.push({ type: 'evidence-gap', field: 'npc-authority-admission', proof: authority })
  const camera = {
    game: checkFollowCamera(gameTrace, 'game'),
    reforge: checkFollowCamera(reforgeTrace, 'reforge'),
  }
  if (camera)
    for (const [engine, proof] of Object.entries(camera))
      if (proof.status !== 'proved')
        findings.push({ type: 'evidence-gap', field: 'follow-camera', engine, proof })
  const effects = (() => {
    const participants = ids
      .filter((id) => id !== 'party')
      .map((entity) => ({ entity, scene: sceneByActor[entity] }))
    const gameDialogue = checkGameDialogueCausality(gameTrace, {
      pagePolicy: 'instance',
    })
    return {
      commandCoverage: checkCommandCoverage(reforgeTrace),
      gameLineage: checkOccurrenceLineage(gameTrace),
      reforgeLineage: checkOccurrenceLineage(reforgeTrace),
      reforgeInvocations: checkScriptInvocations(reforgeTrace),
      loopControl: checkLoopControl(fullReforge ?? reforgeTrace),
      gameDialogue,
      dialogueCorrespondence: checkDialogueCorrespondence(gameDialogue, reforgeTrace),
      persistentOverrides: checkPersistentEffects(reforgeTrace, participants),
      presentation: checkPresentationEffects(reforgeTrace),
    }
  })()
  if (effects)
    for (const [field, proof] of Object.entries(effects))
      if (proof.status !== 'proved')
        findings.push({
          type: proof.status === 'unknown' ? 'evidence-gap' : 'effect-conformance',
          field,
          proof,
        })
  const storyExecutions = checkStoryExecutions(reforgeTrace, fragment)
  const lifecycle = checkAutomaticLifecycle(reforgeTrace)
  if (lifecycle.status !== 'proved')
    findings.push({
      type: lifecycle.status === 'unknown' ? 'evidence-gap' : 'effect-conformance',
      field: 'automatic-lifecycle',
      proof: lifecycle,
    })
  if (storyExecutions.status !== 'proved')
    findings.push({
      type: storyExecutions.status === 'unknown' ? 'evidence-gap' : 'effect-conformance',
      field: 'required-story-executions',
      proof: storyExecutions,
    })
  return {
    fragment,
    actors: ids,
    game,
    reforge,
    acceptedDifferences,
    ...(innTiming ? { innTiming } : {}),
    ...(kitchenTiming ? { kitchenTiming } : {}),
    ...(storyTiming ? { storyTiming } : {}),
    holdIntent,
    ...(authority ? { authority } : {}),
    ...(camera ? { camera } : {}),
    ...(effects ? { effects } : {}),
    storyExecutions,
    lifecycle,
    findings,
    violations,
  }
}
