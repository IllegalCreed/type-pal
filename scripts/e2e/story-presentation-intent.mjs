import assert from 'node:assert/strict'
import {
  automaticLanguageGraphs,
  verifyAutomaticLanguageReceipts,
} from './automatic-language-receipts.mjs'
import { verifyCapturedAmbientCycle } from './captured-ambient-cycle.mjs'
import { closedAutomaticCertificates } from './closed-automatic-cycle.mjs'
import { canonicalScenes, verifyEntityActionTimelines } from './entity-action-contract.mjs'
import { verifyGameAutoBatches, verifyGameAutoCycles } from './game-auto-contract.mjs'
import { verifyInnGamePresentation } from './inn-presentation-intent.mjs'
import { verifyInterruptedMiaoRoute } from './interrupted-route-contract.mjs'
import { verifyMotionSlotLifetimes } from './motion-slot-contract.mjs'
import { verifyMountedRower } from './mounted-rower-contract.mjs'
import {
  verifyOpeningDialogue,
  verifyOpeningDrawClocks,
  verifyOpeningWaitReceipt,
} from './opening-hold-intent.mjs'
import { pageCycleProgressCertificates } from './page-cycle-progress.mjs'
import { verifyReportingRoute } from './reporting-route-contract.mjs'
import { verifyRestoredAutomaticActivations } from './restored-automatic-cycle.mjs'
import { verifyRuntimeHandoffs } from './runtime-handoff-contract.mjs'
import { authoredTerminalCursor } from './script-terminal-intent.mjs'
import { stationaryAutomaticCertificates } from './stationary-automatic-cycle.mjs'
import { verifyStoryMotion, verifyStoryPartyMotion } from './story-motion-contract.mjs'
import { verifyStoryPoses } from './story-pose-contract.mjs'

const leaf = (event) => event.occurrence?.command?.command
const within = (trace, event) =>
  event.order > trace.renderScope.afterOrder && event.order <= trace.renderScope.throughOrder

export function verifyStoryWorkIO(trace) {
  const pending = new Map(),
    completed = []
  for (const event of trace.causes) {
    if (event.phase === 'work-io-start') {
      assert(
        !pending.has(event.workId) && !completed.some((work) => work.workId === event.workId),
        'work IO identity reused',
      )
      assert(event.runId && event.occurrence, 'work IO lacks originating command')
      pending.set(event.workId, event)
    } else if (event.phase === 'work-io-end') {
      const start = pending.get(event.workId)
      assert(
        start && event.runId === start.runId && event.occurrence.id === start.occurrence.id,
        'work IO ended without matching start',
      )
      completed.push({ workId: event.workId, start: start.order, end: event.order })
      pending.delete(event.workId)
    } else if (['leaf-completed', 'command', 'run-ended', 'stage-settled'].includes(event.phase)) {
      assert(
        ![...pending.values()].some((work) => work.runId === event.runId),
        'script continued with unclosed work IO',
      )
    }
  }
  return { completed, pending: [...pending.keys()] }
}

/** Keep the real prefix for origin proofs. Scope only the obligations/draws, not the
 * evidence that established a loaded scene, automatic activation or saved timer. */
export function storyProofPrefix(scoped, raw) {
  const events = raw
    ? (raw.events ?? [
        ...(raw.actors ?? []),
        ...(raw.lifecycle ?? []),
        ...(raw.renders ?? []),
        ...(raw.controls ?? []),
      ])
    : [...(scoped.initialEvents ?? []), ...scoped.events.filter((event) => !event.storyBaseline)]
  return {
    ...scoped,
    ...(raw ? { restoreCommits: raw.restoreCommits } : {}),
    events: events
      .filter((event) => event.order <= scoped.renderScope.throughOrder)
      .sort((a, b) => a.order - b.order),
    causes: (raw?.causes ?? [...(scoped.initialCauses ?? []), ...scoped.causes]).filter(
      (event) => event.order <= scoped.renderScope.throughOrder,
    ),
    initialCauses: [],
    pages: (raw?.pages ?? scoped.pages).filter(
      (event) => event.order <= scoped.renderScope.throughOrder,
    ),
  }
}

/** Union actual writers, addressed targets, mounted riders and installed page actions.
 * Merely naming an off-scene entity does not claim that its scene was rendered. */
export function storyParticipants(trace, initial) {
  const visited = new Set(
    trace.worldRenders.filter((event) => within(trace, event)).map((event) => event.scene),
  )
  const result = new Map(initial.map((actor) => [`${actor.scene}/${actor.entity}`, actor]))
  const add = (actor) => {
    if (
      actor?.entity &&
      visited.has(actor.scene) &&
      canonicalScenes[actor.scene]?.entities.some((e) => e.id === actor.entity)
    )
      result.set(`${actor.scene}/${actor.entity}`, actor)
  }
  for (const event of trace.causes.filter((e) => e.phase === 'command')) {
    add(event.occurrence.self)
    add(leaf(event)?.target)
    for (const rider of leaf(event)?.riders ?? []) add(rider.target)
  }
  for (const scene of visited)
    for (const entity of canonicalScenes[scene]?.entities ?? [])
      if (entity.pages?.some((page) => page.animation)) add({ scene, entity: entity.id })
  return [...result.values()].filter((actor) => visited.has(actor.scene))
}

/** Restored-cycle proof is limited to a fresh saved leaf. A resumedOneShot
 * represents a step that committed before capture and belongs to the separate
 * continuation contract; it must not be borrowed as an uncommitted retry. */
export function isRestoredAutomaticCandidate(binding) {
  return binding.runs.slice(1).every((run) => {
    const first = run.leaves[0]
    return first && !(first.slot && typeof first.slot === 'object' && first.slot.resumedOneShot)
  })
}

export function verifyStoryWaits(trace, handoffs) {
  const events = trace.causes,
    results = []
  for (const start of events.filter((event) => event.phase === 'wait-start')) {
    const end = events.find((event) => event.phase === 'wait-end' && event.waitId === start.waitId)
    const command = start.occurrence?.command?.command
    // The fade owns its declared duration. A second gameplay wait is an un-authored pause.
    assert.notEqual(command?.kind, 'loadScene', 'un-authored scene-load gameplay wait')
    if (end?.reason === 'deadline') {
      const run = events.find(
        (event) => event.phase === 'run-started' && event.runId === start.runId,
      )
      const author = run?.author,
        scene = canonicalScenes[author?.scene]
      const flow =
        author?.kind === 'entity-behavior'
          ? scene?.entities.find((entity) => entity.id === author.entity)?.behaviors?.[
              author.channel
            ]?.[author.behavior]?.flow
          : author?.kind === 'scene-hook'
            ? scene?.hooks?.[author.slot]?.variants?.[author.hook]?.flow
            : undefined
      const stage = flow?.stages.find((stage) => stage.id === start.occurrence.path[0])
      const receipt = verifyOpeningWaitReceipt(
        start,
        events,
        trace.worldRenders,
        stage ? authoredTerminalCursor(stage) : undefined,
        handoffs,
        { requirePresented: false },
      )
      results.push({
        start: start.order,
        end: end.order,
        waitId: start.waitId,
        runId: start.runId,
        occurrence: start.occurrence.id,
        ms: start.ms,
        next: receipt.resumed.order,
        reason: 'deadline',
      })
      continue
    }
    assert.equal(
      start.engine,
      'reforge',
      'unfinished source wait requires separate source contract',
    )
    assert.equal(start.occurrence.timing, 'auto', 'unfinished foreground wait')
    if (end) {
      assert.equal(end.reason, 'abort', 'unclassified wait termination')
      assert(
        events.some(
          (e) =>
            e.phase === 'auto-aborted' &&
            e.activationId === start.activityId &&
            e.order > start.order &&
            e.order <= end.order,
        ),
        'timer abort lacks actual automatic owner cancellation',
      )
    }
    let deadline = start.deadline,
      paused = false
    for (const event of events.filter(
      (e) => e.order > start.order && e.order < (end?.order ?? Infinity),
    )) {
      if (event.waitId === start.waitId && event.phase === 'wait-pause') paused = true
      if (event.waitId === start.waitId && event.phase === 'wait-resume') {
        paused = false
        deadline = event.deadline
      }
      if (event.phase === 'clock' && !event.frozen && !paused)
        assert(event.now < deadline, 'unfinished wait missed eligible deadline')
    }
    results.push({
      start: start.order,
      end: end?.order ?? Infinity,
      waitId: start.waitId,
      runId: start.runId,
      occurrence: start.occurrence.id,
      ms: start.ms,
      reason: end ? 'cancelled' : 'recording-prefix',
    })
  }
  return results
}

/** Every live writer must be doing real asynchronous work at every draw. A completed
 * leaf cannot silently buy another standing frame. Gates include cross-NPC writers. */
export function verifyStoryHolds(trace, participants, { waits, dialogues, motion, partyMotion }) {
  const events = trace.causes,
    results = []
  const writes = events.filter(
    (event) =>
      event.phase === 'command' &&
      (participants.some(
        (actor) =>
          actor.entity === event.occurrence.self?.entity &&
          actor.scene === event.occurrence.self.scene,
      ) ||
        participants.some(
          (actor) =>
            actor.entity === leaf(event)?.target?.entity &&
            actor.scene === leaf(event).target.scene,
        )),
  )
  // Index without filtering/reordering evidence. Each original runId predicate
  // below is unchanged; cross-run settlement searches still use the whole trace.
  const byRun = new Map()
  for (const event of events) {
    if (!byRun.has(event.runId)) byRun.set(event.runId, [])
    byRun.get(event.runId).push(event)
  }
  const runs = [...new Set(writes.map((event) => event.runId))]
  for (let index = 0; index < runs.length; index++)
    for (const child of events.filter(
      (event) => event.phase === 'run-started' && event.parentRunId === runs[index],
    ))
      if (!runs.includes(child.runId)) runs.push(child.runId)
  for (const draw of trace.worldRenders.filter((event) => within(trace, event))) {
    const reasons = []
    for (const runId of runs) {
      const runEvents = byRun.get(runId) ?? []
      const start = runEvents.find(
        (event) => event.phase === 'run-started' && event.runId === runId,
      )
      if (!start || start.order >= draw.order) continue
      const end = runEvents.find((event) => event.phase === 'run-ended' && event.runId === runId)
      if (end && end.order < draw.order) continue
      const current = runEvents.findLast(
        (event) => event.phase === 'command' && event.runId === runId && event.order < draw.order,
      )
      const gate = runEvents.findLast(
        (event) =>
          event.phase === 'gate-wait' &&
          event.runId === runId &&
          event.order < draw.order &&
          !events.some(
            (e) =>
              ['gate-ready', 'gate-rejected'].includes(e.phase) &&
              e.gateId === event.gateId &&
              e.order < draw.order,
          ),
      )
      if (gate) {
        reasons.push({ runId, kind: 'gate', order: gate.order })
        continue
      }
      assert(current, `run ${runId}: live writer has no command or gate`)
      const kind = leaf(current)?.kind
      const waiting = waits.find(
        (wait) =>
          wait.runId === runId &&
          wait.occurrence === current.occurrence.id &&
          wait.start < draw.order &&
          draw.order < wait.end,
      )
      const dialog = dialogues.find(
        (dialog) =>
          dialog.command === current.order &&
          (dialog.opened < draw.order || dialog.preparation.draws.includes(draw.order)) &&
          draw.order < dialog.closed,
      )
      const moving = [...motion, ...partyMotion].find(
        (route) =>
          route.registration.runId === runId &&
          route.registration.occurrence.id === current.occurrence.id &&
          route.command < draw.order &&
          (draw.order < route.end ||
            (route.terminal === 'recording-prefix' && draw.order === route.end)),
      )
      const io = runEvents.find(
        (event) =>
          event.phase === 'io-start' &&
          event.runId === runId &&
          event.occurrence?.id === current.occurrence.id &&
          event.order < draw.order &&
          !events.some(
            (e) => e.phase === 'io-end' && e.ioId === event.ioId && e.order < draw.order,
          ),
      )
      const effect = runEvents.find(
        (event) =>
          event.phase === 'presentation-start' &&
          event.runId === runId &&
          event.occurrence?.id === current.occurrence.id &&
          event.order < draw.order &&
          !events.some(
            (e) =>
              e.phase === 'presentation-end' &&
              e.effectId === event.effectId &&
              e.order < draw.order,
          ),
      )
      const resource = runEvents.find(
        (event) =>
          event.phase === 'work-io-start' &&
          event.runId === runId &&
          event.occurrence?.id === current.occurrence.id &&
          event.order < draw.order &&
          !events.some(
            (e) => e.phase === 'work-io-end' && e.workId === event.workId && e.order < draw.order,
          ),
      )
      const call = runEvents.find(
        (event) =>
          event.phase === 'call-started' &&
          event.runId === runId &&
          event.occurrence?.id === current.occurrence.id &&
          event.order < draw.order &&
          !events.some(
            (e) =>
              e.phase === 'call-ended' && e.bridgeId === event.bridgeId && e.order < draw.order,
          ),
      )
      const child =
        call &&
        events.find(
          (event) =>
            event.phase === 'run-started' &&
            event.parentRunId === runId &&
            event.callId === call.bridgeId &&
            event.order < draw.order &&
            !events.some(
              (e) => e.phase === 'run-ended' && e.runId === event.runId && e.order < draw.order,
            ),
        )
      const completed = runEvents.find(
        (event) =>
          event.phase === 'leaf-completed' &&
          event.runId === runId &&
          event.occurrence?.id === current.occurrence.id &&
          event.order < draw.order,
      )
      assert(!completed, `run ${runId}: completed ${kind} missed its ready continuation`)
      assert(
        waiting || dialog || moving || io || effect || resource || child,
        `run ${runId}: unexplained draw after ${kind ?? current.occurrence.command.kind}`,
      )
      reasons.push({
        runId,
        kind: waiting
          ? 'wait'
          : dialog
            ? 'dialog'
            : moving
              ? 'motion'
              : io || resource
                ? 'resource'
                : effect
                  ? 'presentation'
                  : 'child',
        ...(child ? { child: child.runId } : {}),
        order: current.order,
      })
    }
    for (const reason of reasons.filter((reason) => reason.kind === 'child'))
      assert(
        reasons.some((entry) => entry.runId === reason.child),
        'parent wait lacks proven live child work',
      )
    results.push({ order: draw.order, renderId: draw.renderId, reasons })
  }
  return results
}

export function compareStoryPresentationIntent(
  game,
  reforge,
  participants,
  { renders, moves, states, position, frameCounts, terminalSpecifications, capturedAncestors },
) {
  const result = { status: 'needs-review', errors: [] }
  const check = (name, fn) => {
    try {
      result[name] = fn()
    } catch (error) {
      result.errors.push(`${name}: ${error.message}`)
    }
  }
  check('drawClocks', () => {
    for (const trace of [game, reforge])
      verifyOpeningDrawClocks(
        trace.causes,
        trace.worldRenders.filter((draw) => within(trace, draw)),
      )
    return true
  })
  check('handoffs', () => verifyRuntimeHandoffs(reforge))
  check('actions', () =>
    verifyEntityActionTimelines({
      ...reforge,
      worldRenders: reforge.worldRenders.filter(
        (event) => event.order <= reforge.renderScope.throughOrder,
      ),
    }),
  )
  check('slots', () => verifyMotionSlotLifetimes(reforge.causes))
  check('motion', () =>
    verifyStoryMotion(reforge, result.slots, participants, moves, result.handoffs),
  )
  check('partyMotion', () => verifyStoryPartyMotion(reforge))
  check('workIO', () => verifyStoryWorkIO(reforge))
  check('waits', () => verifyStoryWaits(reforge, result.handoffs))
  check('dialogues', () =>
    verifyOpeningDialogue(
      reforge.causes,
      reforge.worldRenders,
      reforge.pages.filter((event) => event.page),
      terminalSpecifications,
    ),
  )
  check('gameBatches', () => verifyGameAutoBatches(game))
  check('gameCycles', () => verifyGameAutoCycles(game, participants, result.gameBatches))
  check('gamePresentation', () =>
    [...new Set(participants.map((actor) => actor.scene))].flatMap((scene) =>
      verifyInnGamePresentation(game, renders, states, position, {
        scene,
        actors: participants.filter((actor) => actor.scene === scene).map((actor) => actor.entity),
      }),
    ),
  )
  check('presentation', () =>
    verifyStoryPoses(
      reforge,
      participants,
      result.motion,
      result.handoffs,
      result.actions,
      frameCounts,
      renders,
      states,
    ),
  )
  check('holdSchedule', () => {
    if (!result.waits || !result.dialogues || !result.motion || !result.partyMotion)
      return { status: 'deferred', reason: 'story hold prerequisites are unresolved' }
    return verifyStoryHolds(reforge, participants, result)
  })
  check('automaticLanguages', () =>
    verifyAutomaticLanguageReceipts(game, reforge, participants, result),
  )
  if (!result.errors.length)
    check('stationaryCycles', () =>
      stationaryAutomaticCertificates(game, reforge, result.automaticLanguages),
    )
  if (!result.errors.length)
    check('closedCycles', () =>
      closedAutomaticCertificates(game, reforge, result.automaticLanguages, result),
    )
  if (!result.errors.length)
    check('restoredAutomatic', () => {
      const bindings = result.automaticLanguages.bindings.filter((binding) => {
        const graph = automaticLanguageGraphs(binding).authored
        return (
          binding.runs.length > 1 &&
          isRestoredAutomaticCandidate(binding) &&
          graph.nodes.some((node) => node.value?.kind === 'step') &&
          graph.nodes.every(
            (node) => node.kind !== 'effect' || ['step', 'animate'].includes(node.value.kind),
          )
        )
      })
      return bindings.map((binding) => {
        try {
          return verifyRestoredAutomaticActivations(game, reforge, binding, {
            handoffs: result.handoffs,
            motion: result.motion,
          })
        } catch (error) {
          throw new Error(
            `${binding.entity}: ${error instanceof Error ? error.message : String(error)}`,
          )
        }
      })
    })
  if (!result.errors.length && capturedAncestors)
    check('capturedAmbient', () =>
      verifyCapturedAmbientCycle(game, reforge, result, capturedAncestors),
    )
  if (!result.errors.length)
    check('interruptedRoute', () => verifyInterruptedMiaoRoute(game, reforge, result, { renders }))
  if (!result.errors.length)
    check('mountedRower', () => verifyMountedRower(game, reforge, result, { renders, moves }))
  if (!result.errors.length)
    check('reportingRoute', () => verifyReportingRoute(game, reforge, result, { renders, moves }))
  if (!result.errors.length)
    check('pageCycles', () =>
      pageCycleProgressCertificates(game, reforge, participants, result, { renders, states }),
    )
  result.status = result.errors.length ? 'needs-review' : 'passed'
  const count = (value) => value?.length ?? null
  return {
    status: result.status,
    errors: result.errors,
    drawClocks: result.drawClocks,
    coverage: {
      handoffs: count(result.handoffs?.projections),
      actions: count(result.actions?.frames),
      slots: result.slots?.slots.size ?? null,
      motions: count(result.motion),
      partyMotions: count(result.partyMotion),
      resourceWaits: count(result.workIO?.completed),
      waits: count(result.waits),
      dialogues: count(result.dialogues),
      gameBatches: count(result.gameBatches),
      gameCycles: count(result.gameCycles),
    },
    presentation: result.presentation ? { actors: result.presentation.actors } : undefined,
    gamePresentation: result.gamePresentation,
    routeEvidence:
      result.motion && result.gameCycles
        ? {
            authored: result.motion.map(({ actor, scene, sceneVisit, commits, registration }) => ({
              actor,
              scene,
              sceneVisit,
              commits,
              command: leaf(registration),
              timing: registration.occurrence.timing,
            })),
            source: result.gameCycles,
          }
        : undefined,
    automaticLanguages: result.automaticLanguages,
    continuations: result.motion?.resumedOneShots ?? [],
    restoredAutomatic: result.restoredAutomatic,
    stationaryCycles: result.stationaryCycles,
    closedCycles: result.closedCycles,
    capturedAmbient: result.capturedAmbient,
    pageCycles: result.pageCycles,
    interruptedRoute: result.interruptedRoute,
    mountedRower: result.mountedRower,
    reportingRoute: result.reportingRoute,
    holdSchedule: result.holdSchedule,
  }
}
