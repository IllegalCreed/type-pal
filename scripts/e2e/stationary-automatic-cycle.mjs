import assert from 'node:assert/strict'
import objects from '../../data/extracted/data/event-objects.json' with { type: 'json' }
import original from '../../data/extracted/events/all.json' with { type: 'json' }
import {
  automaticLanguageGraphs,
  verifyBoundAutomaticRuns,
} from './automatic-language-receipts.mjs'
import { canonicalPosition } from './coordinate-evidence.mjs'

// Actual executed domain only. Unknown operations decline certification. These
// categories follow event-system.ts pEvtObj/pCurrent, not operand-number guesses.
const globalOperations = new Set([5, 6, 8, 9, 30, 67, 70, 80, 109, 119, 142])
const selfOperations = new Set([11, 12, 13, 14, 15, 16, 17, 20, 111])
const selectedOperations = new Set([18, 22, 36, 37, 64, 73, 135])
const globalLeaves = new Set([
  'loadScene',
  'wait',
  'dialog',
  'giveMoney',
  'clearDialog',
  'playMusic',
  'selectSceneHooks',
  'stopMusic',
])

export function stationarySourceWriter(event) {
  const command = event.command
  assert(command, 'stationary census command missing')
  if (
    [
      'end',
      'goto',
      'loadScene',
      'showDialog',
      'setDialogStyleTop',
      'setDialogStyleNarration',
      'setDialogStyleBottom',
    ].includes(command.op)
  )
    return null
  assert.equal(command.op, 'raw', 'stationary census instruction unsupported')
  const op = command.opcode
  if (globalOperations.has(op)) return null
  const self = event.currentEventObjectId ?? event.actor
  if (selfOperations.has(op)) {
    assert(Number.isSafeInteger(self), 'stationary census current object missing')
    return self
  }
  assert(selectedOperations.has(op), `stationary census opcode ${op} unsupported`)
  const operand = command.operands[0]
  // The enabled guard precedes pCurrent resolution in these handlers.
  if ([22, 36, 37, 64, 73].includes(op) && operand === 0) return null
  if (operand === 0 || operand === 65535)
    assert(Number.isSafeInteger(self), 'stationary census current object missing')
  return operand === 0 || operand === 65535 ? self : operand - 1
}

const stable = JSON.stringify
function pose(state) {
  return {
    position: canonicalPosition(state.position),
    facing: state.facing,
    visible: state.visible,
    state: state.state,
    sprite: state.sprite,
  }
}
function initialFrame(state) {
  const debug = state.frameDebug
  assert(debug && debug.gait === null && debug.authority === 'world', 'stationary seed authority')
  for (const field of ['override', 'explicit', 'action'])
    assert(Object.hasOwn(debug, field), 'stationary seed frame inputs missing')
  return debug.override ?? debug.explicit ?? debug.action ?? 0
}

export function verifyStationaryActivationSeed(entity, root, left, right, seed, run) {
  assert.equal(run.resume, null, 'stationary activation has an unproved continuation')
  const gameInitial = left.findLast((event) => event.order < seed.order),
    authoredInitial = right.findLast((event) => event.order < run.order),
    sourcePose = seed.poses[entity],
    authoredPose = run.poses?.[entity]
  assert.equal(
    sourcePose.commitOrder,
    gameInitial.order,
    'stationary source seed borrowed an old observation',
  )
  assert.equal(
    authoredPose?.commitOrder,
    authoredInitial.order,
    'stationary authored seed borrowed an old observation',
  )
  assert.deepEqual(
    sourcePose.state,
    gameInitial.state,
    'stationary source activation state differs',
  )
  assert.deepEqual(
    authoredPose.state,
    authoredInitial.state,
    'stationary authored activation state differs',
  )
  assert.deepEqual(
    seed.before.position,
    sourcePose.state.position,
    'stationary source activation position differs',
  )
  assert.equal(
    seed.before.facing,
    sourcePose.state.facing,
    'stationary source activation facing differs',
  )
  assert.equal(
    seed.before.frame,
    sourcePose.state.frame,
    'stationary source activation frame differs',
  )
  assert.equal(
    initialFrame(authoredPose.state),
    root.currentFrameNum,
    'stationary actual authored activation frame differs',
  )
}

/** Called only after the formal caller derives effect/wait/control/draw proofs
 * from the same raw prefix. A nominal graph alone can never enter this function.
 * This narrow certificate covers rendered cycle count only, not routes/facing.
 */
export function verifySelfAutomaticCycle(game, reforge, binding, { moving = false } = {}) {
  const graphs = automaticLanguageGraphs(binding)
  for (const graph of [graphs.source, graphs.authored])
    assert(
      graph.nodes.every(
        (node) =>
          ['done', 'epsilon', 'delay', 'choice'].includes(node.kind) ||
          (node.kind === 'effect' &&
            (moving ? ['frame', 'facing', 'animate', 'step'] : ['frame', 'facing']).includes(
              node.value.kind,
            )),
      ),
      'stationary graph has non-pose effects',
    )
  verifyBoundAutomaticRuns(reforge, [{ ...binding, stage: graphs.stage }])
  const id = Number(binding.entity.slice(1)),
    sourceCalls = game.causes.filter(
      (e) => e.phase === 'auto-before' && e.actor === id && e.scene === binding.scene,
    ),
    runs = reforge.causes.filter(
      (e) =>
        e.phase === 'run-started' &&
        e.author?.entity === binding.entity &&
        e.author.scene === binding.scene,
    ),
    sourceVisits = new Set(binding.gameDraws.map((e) => e.sceneVisit)),
    authoredVisits = new Set(binding.draws.map((e) => e.sceneVisit)),
    left = game.events.filter(
      (e) =>
        e.kind === 'actor' &&
        e.id === binding.entity &&
        e.scene === binding.scene &&
        sourceVisits.has(e.sceneVisit),
    ),
    right = reforge.events.filter(
      (e) =>
        e.kind === 'actor' &&
        e.id === binding.entity &&
        e.scene === binding.scene &&
        authoredVisits.has(e.sceneVisit),
    )
  assert(
    sourceCalls.length && runs.length === 1 && binding.runs.length === 1,
    'stationary cycle needs one observed activation',
  )
  assert(
    sourceVisits.size === 1 && authoredVisits.size === 1,
    'stationary cycle crosses scene visits',
  )
  assert(left.length && right.length, 'stationary cycle lacks materialized root')
  for (const [trace, actors, activation] of [
    [game, left, sourceCalls[0]],
    [reforge, right, runs[0]],
  ])
    assert(
      trace.events.some(
        (e) =>
          e.kind === 'scene-lifecycle' &&
          e.phase === 'materialized' &&
          e.scene === binding.scene &&
          e.sceneVisit === actors[0].sceneVisit &&
          e.order < activation.order,
      ),
      'stationary cycle lacks actual materialization',
    )
  const root = objects.eventObjects.find((object) => object.id === id),
    primary = pose({
      position: [root.x, root.y],
      facing: ['down', 'left', 'up', 'right'][root.direction],
      visible: root.sState > 0,
      state: root.sState,
      sprite: root.spriteNum,
    }),
    seed = sourceCalls[0]
  assert.equal(
    seed.before.ip,
    graphs.source.nodes[graphs.source.entry].ip,
    'stationary source entry differs',
  )
  assert.equal(seed.before.idle, 0, 'stationary source starts mid-cycle')
  assert.equal(seed.before.frame, root.currentFrameNum, 'stationary source seed frame differs')
  assert.equal(left[0].state.frame, root.currentFrameNum, 'stationary materialized frame differs')
  assert.equal(
    initialFrame(right[0].state),
    root.currentFrameNum,
    'stationary authored seed differs',
  )
  assert(
    left[0].order < seed.order && right[0].order < runs[0].order,
    'stationary seed does not precede activation',
  )
  verifyStationaryActivationSeed(binding.entity, root, left, right, seed, runs[0])
  for (const state of [
    left[0].state,
    right[0].state,
    seed.poses[binding.entity].state,
    runs[0].poses[binding.entity].state,
  ])
    assert.equal(stable(pose(state)), stable(primary), 'autonomous initial actor state differs')
  const invariant = moving ? ({ visible, state, sprite }) => ({ visible, state, sprite }) : pose,
    expectedInvariant = moving ? invariant(primary) : primary
  for (const event of [...left, ...right])
    assert.equal(
      stable(invariant(event.state)),
      stable(expectedInvariant),
      'stationary actor state changed',
    )
  assert.equal(
    stable(pose(seed.poses[binding.entity].state)),
    stable(primary),
    'stationary invocation seed differs',
  )
  assert.equal(binding.sourceCalls.length, sourceCalls.length, 'stationary source call omitted')
  assert(binding.gameDraws.length && binding.draws.length, 'stationary actual draw proof missing')
  const sourceOrders = new Set(binding.sourceCalls.map((call) => call.from)),
    domains = new Set(graphs.source.nodes.map((node) => node.ip).filter(Number.isInteger)),
    leafOrders = new Set(binding.runs[0].leaves.map((leaf) => leaf.command))
  assert.equal(
    sourceOrders.size,
    binding.sourceCalls.length,
    'stationary source proof repeats a call',
  )
  assert.equal(
    leafOrders.size,
    binding.runs[0].leaves.length,
    'stationary authored proof repeats a leaf',
  )
  for (const [trace, proofs, visit] of [
    [game, binding.gameDraws, left[0].sceneVisit],
    [reforge, binding.draws, right[0].sceneVisit],
  ]) {
    const actual = trace.worldRenders.filter(
      (draw) =>
        draw.scene === binding.scene &&
        draw.order > trace.renderScope.afterOrder &&
        draw.order <= trace.renderScope.throughOrder,
    )
    assert.equal(
      new Set(proofs.map((proof) => proof.order)).size,
      proofs.length,
      'stationary draw proof repeats a frame',
    )
    assert.equal(proofs.length, actual.length, 'stationary draw proof omits a frame')
    for (const [index, draw] of actual.entries())
      assert(
        draw.sceneVisit === visit &&
          ['order', 'renderId', 'sceneVisit'].every((key) => proofs[index][key] === draw[key]),
        'stationary draw proof detached from actual frame',
      )
  }
  const actualLeaves = reforge.causes.filter(
    (event) =>
      event.phase === 'command' &&
      event.runId === runs[0].runId &&
      event.occurrence?.command?.kind === 'leaf',
  )
  assert.equal(actualLeaves.length, leafOrders.size, 'stationary authored proof omits a leaf')
  for (const event of actualLeaves) {
    const proof = binding.runs[0].leaves.find((leaf) => leaf.command === event.order)
    assert(
      proof?.occurrence === event.occurrence.id && event.sceneVisit === right[0].sceneVisit,
      'stationary authored proof detached from actual leaf',
    )
  }
  for (const call of sourceCalls)
    assert(
      sourceOrders.has(call.order) &&
        call.sceneVisit === left[0].sceneVisit &&
        call.poses[binding.entity].state.auto === graphs.label,
      'stationary source call detached',
    )
  let sourceWriters = 0,
    authoredWriters = 0
  for (const event of game.causes.filter((e) => e.phase === 'command')) {
    assert.deepEqual(
      event.command,
      original.segments[0].commands[event.ip],
      'stationary census primary instruction differs',
    )
    if (stationarySourceWriter(event) !== id) continue
    assert(
      event.channel === 'auto' && event.actor === id && domains.has(event.ip),
      'stationary source incoming writer',
    )
    sourceWriters++
  }
  for (const event of reforge.causes) {
    if (event.phase === 'authority-changed')
      assert(
        event.actor !== binding.entity || event.scene !== binding.scene,
        'stationary authority changed',
      )
    if (event.phase !== 'command' || event.occurrence?.command?.kind !== 'leaf') continue
    const command = event.occurrence.command.command
    if (!command.target) {
      assert(globalLeaves.has(command.kind), 'stationary global authored effect unsupported')
      continue
    }
    if (command.target.scene !== binding.scene || command.target.entity !== binding.entity) continue
    assert(
      (moving
        ? ['setEntityFacing', 'setEntityFrame', 'stepEntity', 'animEntity']
        : ['setEntityFacing', 'setEntityFrame']
      ).includes(command.kind) &&
        event.runId === runs[0].runId &&
        leafOrders.has(event.order),
      'stationary authored incoming writer',
    )
    authoredWriters++
  }
  assert(sourceWriters && authoredWriters, 'stationary cycle lacks actual self effects')
  return {
    scene: binding.scene,
    entity: binding.entity,
    sourceSeed: seed.order,
    authoredSeed: right[0].order,
    sourceCalls: sourceCalls.length,
    sourceWriters,
    authoredWriters,
    gameDraws: binding.gameDraws.length,
    reforgeDraws: binding.draws.length,
    sourceVisit: left[0].sceneVisit,
    authoredVisit: right[0].sceneVisit,
  }
}

export function verifyStationaryAutomaticCycle(game, reforge, binding) {
  return verifySelfAutomaticCycle(game, reforge, binding)
}

/** Multiple scene visits may start the same stationary language afresh. This certificate keeps
 * each visit's seed/run/draw domain separate; it does not accept a carried continuation or any
 * movement/selector effect. */
export function verifyMultiVisitStationaryCycle(game, reforge, binding) {
  const graphs = automaticLanguageGraphs(binding)
  const restartEffects = graphs.authored.nodes
    .filter((node) => node.kind === 'effect' && node.value.kind === 'restart')
    .map((node) => node.value)
  const sourceSelectors = game.causes.filter(
    (event) =>
      event.phase === 'command' &&
      event.actor === Number(binding.entity.slice(1)) &&
      event.command?.opcode === 36,
  )
  const selectorCommands = reforge.causes.filter(
    (event) =>
      event.phase === 'command' &&
      event.occurrence?.command?.command?.kind === 'selectEntityBehavior' &&
      restartEffects.some(
        (restart) =>
          event.occurrence.command.command.target?.scene === restart.target.scene &&
          event.occurrence.command.command.target?.entity === restart.target.entity,
      ),
  )
  if (restartEffects.length) {
    assert(sourceSelectors.length, 'multi-visit selector source command missing')
    assert(selectorCommands.length, 'multi-visit selector authored command missing')
    assert(
      game.causes.some(
        (event) =>
          event.phase === 'auto-selection-committed' &&
          restartEffects.some((restart) => event.entity === Number(restart.target.entity.slice(1))),
      ),
      'multi-visit selector source commit missing',
    )
  }
  assert(
    graphs.authored.nodes.every(
      (node) =>
        ['done', 'epsilon', 'delay', 'choice'].includes(node.kind) ||
        (node.kind === 'effect' &&
          ['frame', 'facing', 'animate', ...(restartEffects.length ? ['restart'] : [])].includes(
            node.value.kind,
          )),
    ),
    'multi-visit stationary graph has non-pose effects',
  )
  verifyBoundAutomaticRuns(reforge, [{ ...binding, stage: graphs.stage }])
  const id = Number(binding.entity.slice(1)),
    sourceCalls = game.causes.filter(
      (event) =>
        event.phase === 'auto-before' && event.actor === id && event.scene === binding.scene,
    ),
    runs = reforge.causes.filter(
      (event) =>
        event.phase === 'run-started' &&
        event.author?.entity === binding.entity &&
        event.author.scene === binding.scene &&
        event.author.channel === binding.channel &&
        event.author.behavior === binding.behavior,
    )
  assert(
    sourceCalls.length && runs.length >= 2,
    'multi-visit stationary cycle needs repeated activations',
  )
  const root = objects.eventObjects.find((object) => object.id === id),
    expected = pose({
      position: [root.x, root.y],
      facing: ['down', 'left', 'up', 'right'][root.direction],
      visible: root.sState > 0,
      state: root.sState,
      sprite: root.spriteNum,
    })
  for (const run of runs) {
    const actors = reforge.events.filter(
      (event) =>
        event.kind === 'actor' &&
        event.id === binding.entity &&
        event.sceneVisit === run.sceneVisit,
    )
    assert(actors.length, 'multi-visit stationary activation lacks actor seed')
    const runPose = run.poses?.[binding.entity],
      before = actors.findLast((event) => event.order < run.order)
    assert(before && runPose, 'multi-visit stationary activation lacks own seed pose')
    assert.equal(
      runPose.commitOrder,
      before.order,
      'multi-visit stationary activation borrowed a pose',
    )
    if (run.resume) {
      const projection = reforge.causes.find(
        (event) =>
          event.phase === 'runtime-projection-pose' &&
          event.entity === binding.entity &&
          event.scene === binding.scene &&
          event.sceneVisit === run.sceneVisit &&
          event.order < run.order,
      )
      assert(
        projection?.poses?.[binding.entity],
        'multi-visit continuation lacks own projection pose',
      )
      assert.deepEqual(
        runPose,
        projection.poses[binding.entity],
        'multi-visit continuation changed its projected pose',
      )
    } else {
      assert.deepEqual(pose(before.state), expected, 'multi-visit stationary seed differs')
      assert.deepEqual(pose(runPose.state), expected, 'multi-visit stationary run seed differs')
    }
    const invariant = {
      visible: runPose.state.visible,
      state: runPose.state.state,
      sprite: runPose.state.sprite,
    }
    for (const event of actors) {
      const value = pose(event.state)
      assert.deepEqual(
        { visible: value.visible, state: value.state, sprite: value.sprite },
        invariant,
        'multi-visit stationary actor changed',
      )
    }
    for (const event of reforge.causes.filter(
      (candidate) =>
        candidate.phase === 'command' &&
        candidate.runId === run.runId &&
        candidate.occurrence?.command?.kind === 'leaf',
    )) {
      const command = event.occurrence.command.command
      assert(
        command.kind === 'wait' ||
          (command.kind === 'selectEntityBehavior' &&
            restartEffects.some(
              (restart) =>
                command.target?.scene === restart.target.scene &&
                command.target?.entity === restart.target.entity,
            )) ||
          (command.target?.scene === binding.scene &&
            command.target.entity === binding.entity &&
            ['setEntityFacing', 'setEntityFrame', 'animEntity'].includes(command.kind)),
        'multi-visit stationary authored writer is not self pose/wait',
      )
    }
  }
  const gameDraws = game.worldRenders.filter(
      (draw) =>
        draw.scene === binding.scene &&
        draw.order > game.renderScope.afterOrder &&
        draw.order <= game.renderScope.throughOrder,
    ),
    reforgeDraws = reforge.worldRenders.filter(
      (draw) =>
        draw.scene === binding.scene &&
        draw.order > reforge.renderScope.afterOrder &&
        draw.order <= reforge.renderScope.throughOrder,
    )
  assert.equal(
    binding.gameDraws.length,
    gameDraws.length,
    'multi-visit stationary source draws incomplete',
  )
  assert.equal(
    binding.draws.length,
    reforgeDraws.length,
    'multi-visit stationary authored draws incomplete',
  )
  return {
    scene: binding.scene,
    entity: binding.entity,
    visits: runs.map((run) => run.sceneVisit),
    sourceCalls: sourceCalls.length,
    gameDraws: gameDraws.length,
    reforgeDraws: reforgeDraws.length,
  }
}

export function stationaryAutomaticCertificates(game, reforge, languages) {
  assert.equal(languages?.status, 'proved', 'stationary cycle lacks actual language bridge')
  const proved = [],
    declined = []
  for (const binding of languages.bindings) {
    try {
      proved.push(verifyStationaryAutomaticCycle(game, reforge, binding))
    } catch (error) {
      try {
        proved.push(verifyMultiVisitStationaryCycle(game, reforge, binding))
      } catch (multiError) {
        declined.push({
          scene: binding.scene,
          entity: binding.entity,
          reason: multiError.message ?? error.message,
        })
      }
    }
  }
  return { proved, declined }
}
