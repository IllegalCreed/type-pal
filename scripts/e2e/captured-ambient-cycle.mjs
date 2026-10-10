import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import original from '../../data/extracted/events/all.json' with { type: 'json' }
import {
  authoredAutomaticLanguage,
  compareAutomaticLanguages,
  sourceAutomaticLanguage,
} from './automatic-language-contract.mjs'
import { verifyAutomaticBindings } from './automatic-language-receipts.mjs'
import { canonicalScenes } from './entity-action-contract.mjs'
import { verifyKitchenSourceCycle } from './kitchen-presentation-intent.mjs'
import { readMealPredecessor } from './meal-contract.mjs'
import {
  actorTransitions,
  canonicalPosition,
  compareNpcStateTraces,
  renderedPoseEvidence,
} from './npc-transition-contract.mjs'
import { storyProofPrefix } from './story-presentation-intent.mjs'

const binding = { scene: 's003', entity: 'e62', channel: 'auto', behavior: 'default' },
  leaf = (event) => event.occurrence?.command?.command

/** Real predecessor bytes and independently reread raw; no reported pass flag
 * substitutes for the current ancestor's actual cycle/take/draw contracts. */
export async function readCapturedAmbientAncestors(reports, readTrace, frameCounts) {
  const predecessors = await Promise.all(
    reports.map((report, index) =>
      readMealPredecessor(report.predecessor.report, ['game', 'reforge'][index]),
    ),
  )
  for (const [index, predecessor] of predecessors.entries())
    assert.equal(
      predecessor.sha256,
      reports[index].predecessor.sha256,
      'ambient ancestor saved bytes differ from actual loaded predecessor',
    )
  const evidence = await Promise.all(
      predecessors.map((predecessor) => readTrace(predecessor.reportPath)),
    ),
    comparison = compareNpcStateTraces(evidence[0].trace, evidence[1].trace, '003', {
      rawGame: evidence[0].rawTrace,
      rawReforge: evidence[1].rawTrace,
      frameCounts,
    })
  assert.deepEqual(comparison.findings, [], 'ambient ancestor actual comparison failed')
  assert.equal(
    comparison.kitchenTiming.status,
    'passed',
    'ambient ancestor actual cycle/take/draw failed',
  )
  return { predecessors, evidence }
}

function graphs() {
  const stage = canonicalScenes.s003.entities
      .find((entity) => entity.id === 'e62')
      .behaviors.auto.default.flow.stages.find((stage) => stage.id === 'initial'),
    [birth, loop] = stage.body
  assert.equal(stage.body.length, 2, 'ambient birth/cycle shape changed')
  assert.deepEqual(birth, { kind: 'wait', ms: 200 }, 'ambient birth delay changed')
  assert.equal(loop.kind, 'loop')
  assert.equal(loop.mode, 'forever')
  const source = sourceAutomaticLanguage(original.segments[0].commands, 735, { self: 63 }),
    authored = authoredAutomaticLanguage([loop], { scene: 's003', entity: 'e62' })
  return {
    source,
    authored,
    label: 'L_734',
    stage: 'initial',
    proof: compareAutomaticLanguages(source, authored),
  }
}

/** This correspondence is ONLY a saved, stationary cycle followed by the
 * already-verified gift trigger. It does not cover arbitrary cache revisits. */
export function verifyCapturedAmbientCycle(game, reforge, receipts, ancestors) {
  assert(ancestors, 'ambient cycle lacks real predecessor evidence')
  for (const predecessor of ancestors.predecessors) {
    assert.deepEqual(
      predecessor.payload,
      JSON.parse(predecessor.bytes),
      'ambient payload detached from actual saved bytes',
    )
    assert.equal(
      createHash('sha256').update(predecessor.bytes).digest('hex'),
      predecessor.sha256,
      'ambient saved byte hash differs',
    )
  }
  const [g, r] = ancestors.evidence.map((e) => storyProofPrefix(e.trace, e.rawTrace)),
    [savedGame, savedReforge] = ancestors.predecessors.map((p) => p.payload),
    npc = savedGame.gs.allEventObjects.find((e) => e.id === 62),
    cached = savedReforge.sceneRuntime.s003,
    previousGame = actorTransitions(g, 'e62', 's003').at(-1).state,
    previousReforge = actorTransitions(r, 'e62', 's003').at(-1).state
  assert.deepEqual(
    npc && {
      position: [npc.x, npc.y],
      facing: npc.facing,
      frame: npc.scriptedFrame,
      auto: npc.autoLabel,
      ip: npc.autoCursor.ip,
    },
    {
      position: previousGame.position,
      facing: previousGame.facing,
      frame: previousGame.localFrame ?? previousGame.frame,
      auto: previousGame.auto,
      ip: previousGame.autoIp,
    },
    'ambient saved Game pose/cursor loses its actual ancestor',
  )
  assert.equal(
    cached.entities.e62.fixedFrame,
    previousReforge.frameDebug.override,
    'ambient saved fixed frame loses its actual ancestor',
  )
  assert.equal(
    cached.entities.e62.motion.explicitAnimation,
    previousReforge.frameDebug.explicit,
    'ambient saved explicit frame loses its actual ancestor',
  )
  assert.equal(cached.entities.e62.facing, previousReforge.facing)
  const loaded = reforge.causes.filter((e) => e.phase === 'runtime-loaded' && e.scene === 's003')
  assert.equal(loaded.length, 1, 'ambient lacks unique real saved runtime load')
  assert.deepEqual(
    loaded[0].saved.entities.e62,
    cached.entities.e62,
    'ambient restored pose differs from saved bytes',
  )
  assert.deepEqual(
    loaded[0].saved.automatic.e62,
    cached.automatic.e62,
    'ambient restored cursor/wait differs from saved bytes',
  )
  const actual = verifyAutomaticBindings(game, reforge, [binding], receipts, graphs).bindings[0]
  assert(actual?.runs.length, 'ambient lacks actual restored automatic runs')
  const start = reforge.causes.find(
    (e) => e.phase === 'run-started' && e.runId === actual.runs[0].runId,
  )
  assert.deepEqual(
    start.resume,
    cached.automatic.e62.cursor.resume,
    'ambient resumed a different saved word',
  )
  const consumed = reforge.causes.filter(
    (e) =>
      e.phase === 'runtime-wait-consumed' &&
      e.runId === start.runId &&
      e.origin?.snapshotId === loaded[0].snapshotId &&
      e.origin.entity === 'e62',
  )
  assert.equal(consumed.length, 1, 'ambient needs its unique real saved wait consumption')
  for (const field of ['kind', 'durationMs', 'remainingMs'])
    assert.equal(
      consumed[0][field],
      cached.automatic.e62.wait[field],
      `ambient saved wait ${field} differs`,
    )
  for (const run of actual.runs.slice(1)) {
    const resumed = reforge.causes.find((e) => e.phase === 'run-started' && e.runId === run.runId),
      projection = receipts.handoffs.projections.find(
        (e) => e.scene === 's003' && e.sceneVisit === run.sceneVisit && e.endOrder < resumed.order,
      ),
      origin = receipts.handoffs.snapshots.find((e) => e.snapshotId === projection?.snapshotId)
    assert(
      origin && origin.phase === 'runtime-captured',
      'ambient revisit lacks its own captured ancestor',
    )
    assert(
      origin.order > start.order && origin.order < resumed.order,
      'ambient revisit borrows an earlier snapshot',
    )
    assert.deepEqual(
      resumed.resume,
      origin.saved.automatic.e62.cursor.resume,
      'ambient revisit resumes a different captured word',
    )
    assert.equal(
      resumed.poses.e62.state.frameDebug.override,
      origin.saved.entities.e62.fixedFrame,
      'ambient revisit loses its own captured pose',
    )
    const restored = reforge.causes.filter(
      (e) =>
        e.phase === 'runtime-wait-consumed' &&
        e.runId === run.runId &&
        e.origin?.snapshotId === origin.snapshotId &&
        e.origin.entity === 'e62',
    )
    assert.equal(restored.length, 1, 'ambient revisit lacks unique own captured wait')
    for (const field of ['kind', 'durationMs', 'remainingMs'])
      assert.equal(
        restored[0][field],
        origin.saved.automatic.e62.wait[field],
        'ambient revisit loses its own captured wait',
      )
  }
  const firstGame = game.causes.find(
      (e) => e.phase === 'auto-before' && e.actor === 62 && e.scene === 's003',
    ),
    firstReforge = start.poses.e62.state
  assert.deepEqual(
    firstGame.before,
    {
      ip: npc.autoCursor.ip,
      idle: npc.autoCursor.idleFrameCount ?? 0,
      frame: npc.scriptedFrame,
      facing: npc.facing,
      position: [npc.x, npc.y],
      layout: npc.nSpriteFrames,
      autoFrames: npc.nSpriteFramesAuto,
    },
    'ambient actual Game seed differs from saved ancestor',
  )
  for (const event of game.causes.filter((e) => e.phase === 'auto-before' && e.actor === 62))
    assert.equal(
      event.runId,
      firstGame.runId,
      'ambient source revisit lost its actual cursor identity',
    )
  assert.equal(
    firstReforge.frameDebug.override,
    cached.entities.e62.fixedFrame,
    'ambient actual Reforge seed differs from saved ancestor',
  )
  assert.equal(firstReforge.frameDebug.explicit, cached.entities.e62.motion.explicitAnimation)
  assert.equal(firstReforge.frameDebug.gait, null)
  assert.equal(firstReforge.frameDebug.action, null)
  assert.equal(firstReforge.frameDebug.authority, 'world')
  assert.deepEqual(
    canonicalPosition(firstGame.before.position),
    canonicalPosition(firstReforge.position),
  )
  const sourceSetter = game.causes.find(
      (e) =>
        e.phase === 'command' &&
        e.channel === 'trigger' &&
        e.currentEventObjectId === 62 &&
        e.command?.op === 'raw' &&
        e.command.opcode === 20 &&
        e.command.operands[0] === 2,
    ),
    authoredSetter = reforge.causes.find(
      (e) =>
        e.phase === 'command' &&
        leaf(e)?.kind === 'setEntityFrame' &&
        leaf(e).target.scene === 's003' &&
        leaf(e).target.entity === 'e62' &&
        leaf(e).frame === 2,
    )
  assert(sourceSetter && authoredSetter, 'ambient lacks actual common foreground pose setter')
  assert.deepEqual(sourceSetter.command, original.segments[0].commands[sourceSetter.ip])
  const take = reforge.causes.find(
    (e) =>
      e.phase === 'command' &&
      e.runId === authoredSetter.runId &&
      leaf(e)?.kind === 'takeEntity' &&
      leaf(e).target.entity === 'e62' &&
      e.order < authoredSetter.order,
  )
  assert(take, 'ambient foreground setter lacks its own real take')
  const disabled = reforge.causes.find(
    (e) =>
      e.phase === 'command' &&
      e.runId === authoredSetter.runId &&
      leaf(e)?.kind === 'selectEntityBehavior' &&
      leaf(e).target.entity === 'e62' &&
      leaf(e).channel === 'auto' &&
      leaf(e).selection.kind === 'disabled' &&
      e.order < authoredSetter.order &&
      e.order > take.order,
  )
  assert(disabled, 'ambient foreground pose did not stop its automatic owner')
  const sourceDisabled = game.causes.find(
    (e) =>
      e.phase === 'command' &&
      e.runId === sourceSetter.runId &&
      e.command?.op === 'raw' &&
      e.command.opcode === 36 &&
      e.command.operands[0] === 65535 &&
      e.command.operands[1] === 0 &&
      e.order > sourceSetter.order,
  )
  assert(sourceDisabled, 'ambient source foreground pose did not stop its automatic owner')
  assert.equal(
    sourceDisabled.currentEventObjectId,
    62,
    'ambient source disable targets another owner',
  )
  assert.deepEqual(sourceDisabled.command, original.segments[0].commands[sourceDisabled.ip])
  const nextCommand = game.causes.find(
      (e) => e.phase === 'command' && e.order > sourceDisabled.order,
    ),
    committedDisable = game.causes.filter(
      (e) =>
        e.phase === 'auto-selection-committed' &&
        e.entity === 62 &&
        e.order > sourceDisabled.order &&
        e.order < nextCommand.order,
    )
  assert.equal(
    committedDisable.length,
    1,
    'ambient source disable lacks its own committed selection',
  )
  assert.equal(committedDisable[0].operand, 65535)
  assert.equal(committedDisable[0].label, null)
  assert.equal(committedDisable[0].cursor, null)
  const automaticRuns = new Set(actual.runs.map((run) => run.runId))
  assert(
    !reforge.causes.some(
      (e) => e.phase === 'command' && automaticRuns.has(e.runId) && e.order > disabled.order,
    ),
    'ambient automatic owner continued after disable',
  )
  const sourceCycle = verifyKitchenSourceCycle(
    { ...game, causes: game.causes.filter((e) => e.order < sourceSetter.order) },
    (trace, id, scene) =>
      renderedPoseEvidence(trace, id, scene).filter((e) => e.order < sourceSetter.order),
    (state) => state.frame,
  )
  const setters = reforge.causes.filter(
    (e) =>
      e.phase === 'leaf-completed' &&
      automaticRuns.has(e.runId) &&
      leaf(e)?.kind === 'setEntityFrame',
  )
  assert(setters.length, 'ambient restored cycle has no actual setters')
  for (const setter of setters)
    assert([0, 1].includes(leaf(setter).frame), 'ambient cycle frame escaped')
  for (const draw of renderedPoseEvidence(reforge, 'e62', 's003').filter(
    (e) => e.order < authoredSetter.order,
  )) {
    const setter = setters.findLast((e) => e.order < draw.order),
      expected = setter ? leaf(setter).frame : cached.entities.e62.fixedFrame
    if (draw.drawStatus === 'drawn')
      assert.equal(draw.frame, expected, 'ambient actual draw loses its saved/cyclic phase')
  }
  const completed = reforge.causes.find(
    (e) =>
      e.phase === 'leaf-completed' &&
      e.runId === authoredSetter.runId &&
      e.occurrence?.id === authoredSetter.occurrence.id,
  )
  assert.equal(
    completed?.poses.e62.state.frameDebug.override,
    2,
    'ambient common pose never committed',
  )
  const ended = reforge.causes.find(
    (e) => e.phase === 'run-ended' && e.runId === actual.runs.at(-1).runId,
  )
  assert(
    ended?.aborted && ended.order > disabled.order && ended.order < completed.order,
    'ambient disabled automatic owner was not actually terminated',
  )
  for (const [trace, order] of [
    [game, sourceSetter.order],
    [reforge, completed.order],
  ])
    for (const draw of renderedPoseEvidence(trace, 'e62', 's003').filter((e) => e.order > order))
      if (draw.drawStatus === 'drawn')
        assert.equal(draw.frame, 2, 'ambient draw escaped its common terminal pose')
  for (const trace of [game, reforge]) {
    const terminal = actorTransitions(trace, 'e62', 's003').at(-1).state
    assert.equal(terminal.visible, false)
    assert.equal(terminal.state, 0)
    assert.equal(trace === game ? terminal.frame : terminal.frameDebug.override, 2)
    if (trace === game)
      assert.equal(terminal.auto, null, 'ambient source automatic owner remains selected')
    else
      assert.equal(
        terminal.behavior.auto.selection.kind,
        'disabled',
        'ambient authored automatic owner remains selected',
      )
  }
  return {
    scene: 's003',
    entity: 'e62',
    sourceCycle,
    ancestral: ancestors.evidence.map((e, index) => ({
      engine: ['game', 'reforge'][index],
      reportSha256: e.reportSha256,
      traceSha256: e.traceSha256,
      saveSha256: ancestors.predecessors[index].sha256,
    })),
    restoredWait: consumed[0].order,
    sourceSetter: sourceSetter.order,
    authoredSetter: authoredSetter.order,
    gameDraws: actual.gameDraws.length,
    reforgeDraws: actual.draws.length,
  }
}
