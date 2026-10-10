import assert from 'node:assert/strict'
import objects from '../../data/extracted/data/event-objects.json' with { type: 'json' }
import sprites from '../../projects/pal/content/sprites.json' with { type: 'json' }
import { automaticLanguageGraphs } from './automatic-language-receipts.mjs'
import { canonicalPosition } from './coordinate-evidence.mjs'
import { gameNpcRequestedFrame } from './game-pose-semantics.mjs'
import { actorTransitions, renderedPoseEvidence } from './npc-transition-contract.mjs'
import { verifySelfAutomaticCycle } from './stationary-automatic-cycle.mjs'

const deltas = { down: [0, 1], left: [-1, 0], up: [0, -1], right: [1, 0] },
  equal = (a, b) => JSON.stringify(a) === JSON.stringify(b),
  add = (a, b) => a.map((value, index) => value + b[index])

/** Integer quarter-tile potential at every reachable node. A conflict at ANY
 * merge/backedge rejects: checking only a selected main loop is insufficient. */
export function closedCyclePotential(graph) {
  const positions = new Map([[graph.entry, [0, 0]]]),
    todo = [graph.entry]
  for (let i = 0; i < todo.length; i++) {
    const at = todo[i],
      node = graph.nodes[at],
      position = positions.get(at),
      delta =
        node.kind === 'effect' && node.value.kind === 'step' ? deltas[node.value.direction] : [0, 0]
    assert(delta, 'closed cycle direction unsupported')
    const after = add(position, delta),
      next =
        node.kind === 'choice' ? [node.then, node.else] : node.next === undefined ? [] : [node.next]
    for (const target of next) {
      if (positions.has(target))
        assert.deepEqual(positions.get(target), after, 'automatic cycle has nonzero displacement')
      else {
        positions.set(target, after)
        todo.push(target)
      }
    }
  }
  return positions
}

function frontier(graph, entries) {
  const pending = [...entries],
    seen = new Set(),
    effects = []
  for (let i = 0; i < pending.length; i++) {
    const at = pending[i]
    if (seen.has(at)) continue
    seen.add(at)
    const node = graph.nodes[at]
    if (node.kind === 'effect') effects.push(at)
    else if (node.kind === 'choice') {
      if (node.percent > 0) pending.push(node.then)
      if (node.percent < 100) pending.push(node.else)
    } else if (node.next !== undefined) pending.push(node.next)
  }
  return effects
}
const effect = (command) =>
  command.kind === 'stepEntity'
    ? { kind: 'step', direction: command.dir }
    : command.kind === 'setEntityFrame'
      ? { kind: 'frame', value: command.frame }
      : command.kind === 'setEntityFacing'
        ? { kind: 'facing', value: command.facing }
        : command.kind === 'animEntity'
          ? { kind: 'animate' }
          : null

export function verifyClosedAutomaticCycle(game, reforge, binding, receipts) {
  const base = verifySelfAutomaticCycle(game, reforge, binding, { moving: true }),
    graphs = automaticLanguageGraphs(binding),
    source = closedCyclePotential(graphs.source),
    authored = closedCyclePotential(graphs.authored),
    root = objects.eventObjects.find((object) => `e${object.id}` === binding.entity),
    origin = canonicalPosition([root.x, root.y]),
    definition = sprites.find((sprite) => sprite.id === `sprite-${root.spriteNum}`)
  assert(
    [2, 3, 4].includes(root.nSpriteFrames) &&
      definition?.layout.kind === 'directional' &&
      definition.layout.framesPerDir === root.nSpriteFrames,
    'closed cycle animation layout unsupported',
  )
  // Primary advances n==3 over four phases; other directional layouts use n.
  // Literal frame setters remain unnormalized, including frame2 in a layout2 atlas.
  const phasePeriod = root.nSpriteFrames === 3 ? 4 : root.nSpriteFrames
  assert(
    graphs.source.nodes.some((node) => node.value?.kind === 'step'),
    'closed cycle has no movement',
  )
  for (const graph of [graphs.source, graphs.authored])
    assert(
      graph.nodes.every(
        (node) =>
          node.value?.kind !== 'frame' ||
          (Number.isInteger(node.value.value) && node.value.value >= 0 && node.value.value < 4),
      ),
      'closed cycle frame outside primary phase domain',
    )
  const position = (units) =>
      add(
        origin,
        units.map((value) => value / 4),
      ),
    byIp = new Map()
  for (const [node, units] of source) {
    const ip = graphs.source.nodes[node].ip
    if (!Number.isInteger(ip)) continue
    if (byIp.has(ip))
      assert.deepEqual(byIp.get(ip), units, 'source instruction has ambiguous spatial phase')
    byIp.set(ip, units)
  }
  const calls = binding.sourceCalls.map((proof) => ({
    before: game.causes.find((event) => event.order === proof.from),
    after: game.causes.find((event) => event.order === proof.to),
  }))
  let previous = null
  for (const { before, after } of calls) {
    assert(
      after?.phase === 'auto-step' && after.autoCallId === before.autoCallId,
      'closed source step detached from invocation',
    )
    for (const state of [before.before, after.after]) {
      assert.equal(state.layout, root.nSpriteFrames, 'closed source layout differs from primary')
      // Scene hydration fills autoFrames with the loaded sprite's total frames;
      // directional layouts use nSpriteFrames for phase, not that fallback.
      assert.equal(
        state.autoFrames,
        calls[0].before.before.autoFrames,
        'closed source hydrated animation range changes',
      )
      assert(byIp.has(state.ip), 'closed source cursor escapes spatial graph')
      assert.deepEqual(
        canonicalPosition(state.position),
        position(byIp.get(state.ip)),
        'source position escapes rooted cycle potential',
      )
    }
    if (previous)
      assert.deepEqual(before.before, previous, 'closed source cycle loses its previous phase')
    let expectedFrame = before.before.frame,
      expectedFacing = before.before.facing
    for (const commandEvent of game.causes.filter(
      (event) =>
        event.phase === 'command' && event.order > before.order && event.order < after.order,
    )) {
      assert(
        commandEvent.channel === 'auto' &&
          commandEvent.actor === root.id &&
          commandEvent.autoCallId === before.autoCallId &&
          commandEvent.runId === before.runId &&
          commandEvent.scene === binding.scene &&
          commandEvent.sceneVisit === base.sourceVisit,
        'closed source effect belongs to another invocation',
      )
      const command = commandEvent.command
      if (command.op !== 'raw') continue
      const [a, b] = command.operands,
        opcode = command.opcode
      if (opcode >= 11 && opcode <= 14) {
        expectedFacing = ['down', 'left', 'up', 'right'][opcode - 11]
        expectedFrame = (expectedFrame + 1) % phasePeriod
      } else if (opcode === 135) expectedFrame = (expectedFrame + 1) % phasePeriod
      else if (opcode === 20) {
        expectedFrame = a
        expectedFacing = 'down'
      } else if (opcode === 15) {
        if (a !== 65535) expectedFacing = ['down', 'left', 'up', 'right'][a]
        if (b !== 65535) expectedFrame = b
      }
    }
    assert.equal(
      after.after.frame,
      expectedFrame,
      'closed source effect loses primary current frame',
    )
    assert.equal(after.after.facing, expectedFacing, 'closed source effect loses primary facing')
    previous = after.after
  }
  const sourceTerminal = actorTransitions(game, binding.entity, binding.scene)
      .filter((event) => event.sceneVisit === base.sourceVisit)
      .at(-1),
    lastCall = calls.at(-1).after
  assert.equal(
    lastCall.poses[binding.entity].commitOrder,
    sourceTerminal.order,
    'closed source terminal is detached from last actual call',
  )
  assert.deepEqual(
    lastCall.poses[binding.entity].state,
    sourceTerminal.state,
    'closed source terminal observation differs from last actual call',
  )
  assert.deepEqual(
    sourceTerminal.state.position,
    previous.position,
    'closed source terminal loses position',
  )
  assert.equal(sourceTerminal.state.facing, previous.facing, 'closed source terminal loses facing')
  assert.equal(
    sourceTerminal.state.frame,
    previous.frame,
    'closed source terminal loses current frame',
  )
  assert.equal(sourceTerminal.state.autoIp, previous.ip, 'closed source terminal loses cursor')
  const run = binding.runs[0],
    leaves = reforge.causes.filter(
      (event) =>
        event.phase === 'command' &&
        event.runId === run.runId &&
        event.occurrence?.command?.kind === 'leaf',
    ),
    routes = [],
    states = new Set([graphs.authored.entry])
  let spatial = [0, 0],
    current = states
  for (const event of leaves) {
    const command = event.occurrence.command.command,
      value = effect(command)
    if (!value) {
      assert.equal(command.kind, 'wait')
      continue
    }
    const choices = frontier(graphs.authored, current).filter((at) =>
      equal(graphs.authored.nodes[at].value, value),
    )
    assert(choices.length, 'actual authored effect escapes cycle language')
    for (const at of choices)
      assert.deepEqual(authored.get(at), spatial, 'actual authored effect has wrong spatial phase')
    current = new Set(choices.map((at) => graphs.authored.nodes[at].next))
    if (command.kind !== 'stepEntity') continue
    const proof = run.leaves.find((leaf) => leaf.command === event.order),
      route = receipts.motion.find(
        (route) =>
          route.registration.runId === event.runId &&
          route.registration.occurrence.id === event.occurrence.id &&
          route.sceneVisit === base.authoredVisit,
      )
    assert(route && proof.slot === route.slotId, 'closed step lacks its admitted actual slot')
    const from = position(spatial),
      to = position(add(spatial, deltas[command.dir])),
      actualOrigin = route.registration.poses[binding.entity].state.position
    assert.deepEqual(
      actualOrigin.slice(0, 2),
      from,
      'closed step slot origin escapes graph potential',
    )
    assert(
      route.commits.length <= 1 && route.noOps.length === 0,
      'closed step has extra displacement',
    )
    for (const commit of route.commits) {
      assert.deepEqual(commit.from, from, 'closed step actual origin differs')
      assert.deepEqual(
        commit.to.slice(0, 2),
        to,
        'closed step actual target escapes graph potential',
      )
    }
    routes.push({ event, route, from, to })
    spatial = add(spatial, deltas[command.dir])
  }
  assert(
    routes.length && routes.filter(({ route }) => !route.commits.length).length <= 1,
    'closed cycle has multiple uncommitted steps',
  )
  for (const [index, { route }] of routes.entries())
    if (!route.commits.length)
      assert.equal(index, routes.length - 1, 'closed cycle passes an uncommitted step')

  // Both actual render streams are interpreted from primary current-frame
  // semantics and their own legal word, not compared at unrelated wall times.
  const gamePoses = renderedPoseEvidence(game, binding.entity, binding.scene)
  let cursor = 0,
    phase = root.currentFrameNum,
    facing = ['down', 'left', 'up', 'right'][root.direction],
    sourcePosition = origin
  for (const draw of gamePoses) {
    while (cursor < calls.length && calls[cursor].after.order < draw.order) {
      const state = calls[cursor++].after.after
      phase = state.frame
      facing = state.facing
      sourcePosition = canonicalPosition(state.position)
    }
    assert.deepEqual(draw.position, sourcePosition, 'closed source draw loses causal position')
    assert.equal(draw.facing, facing, 'closed source draw loses causal facing')
    if (draw.drawStatus === 'drawn')
      assert.equal(
        draw.frame,
        gameNpcRequestedFrame(root.nSpriteFrames, phase, facing),
        'closed source draw loses causal current frame',
      )
  }
  const poseEffects = reforge.causes.filter(
      (event) =>
        event.phase === 'leaf-completed' &&
        event.runId === run.runId &&
        effect(event.occurrence?.command?.command ?? {}) &&
        event.occurrence.command.command.kind !== 'stepEntity',
    ),
    timeline = [
      ...poseEffects,
      ...routes.flatMap(({ event, route }) =>
        route.commits.map((commit) => ({
          ...commit,
          phase: 'closed-step',
          dir: event.occurrence.command.command.dir,
        })),
      ),
    ].sort((a, b) => a.order - b.order),
    reforgePoses = renderedPoseEvidence(reforge, binding.entity, binding.scene)
  cursor = 0
  phase = root.currentFrameNum
  facing = ['down', 'left', 'up', 'right'][root.direction]
  let actualPosition = origin
  const fold = (event) => {
    if (event.phase === 'closed-position') actualPosition = event.to.slice(0, 2)
    else if (event.phase === 'closed-facing') {
      facing = event.dir
      phase = (phase + 1) % phasePeriod
    } else if (event.phase === 'closed-step') {
      actualPosition = event.to.slice(0, 2)
      facing = event.dir
      phase = (phase + 1) % phasePeriod
    } else {
      const command = event.occurrence.command.command
      if (command.kind === 'setEntityFrame') phase = command.frame
      else if (command.kind === 'setEntityFacing') facing = command.facing
      else {
        assert.equal(command.kind, 'animEntity')
        phase = (phase + 1) % phasePeriod
      }
    }
  }
  for (const draw of reforgePoses) {
    while (cursor < timeline.length && timeline[cursor].order < draw.order) {
      fold(timeline[cursor++])
    }
    assert.deepEqual(
      draw.position,
      actualPosition,
      'closed authored draw advances uncommitted position',
    )
    assert.equal(draw.facing, facing, 'closed authored draw loses primary facing')
    assert.equal(
      draw.frame,
      gameNpcRequestedFrame(root.nSpriteFrames, phase, facing),
      'closed authored draw loses primary current frame',
    )
  }
  const terminal = actorTransitions(reforge, binding.entity, binding.scene)
    .filter((event) => event.sceneVisit === base.authoredVisit)
    .at(-1)
  // A proved commit can occur after the last actual draw and before scene exit.
  // Fold independently to the actual terminal, which may precede a compressed
  // draw span's final clock. A cached rendered frame can be stale after a commit;
  // compare the renderer's current-frame inputs, not that previous image.
  cursor = 0
  phase = root.currentFrameNum
  facing = ['down', 'left', 'up', 'right'][root.direction]
  actualPosition = origin
  while (cursor < timeline.length && timeline[cursor].order < terminal.order) {
    fold(timeline[cursor++])
  }
  assert.deepEqual(
    canonicalPosition(terminal.state.position),
    actualPosition,
    'closed terminal position advances an uncommitted step',
  )
  assert.equal(terminal.state.facing, facing, 'closed terminal loses primary facing')
  const debug = terminal.state.frameDebug
  for (const field of ['override', 'gait', 'explicit', 'action'])
    assert(
      Object.hasOwn(debug, field) &&
        (debug[field] === null || (Number.isSafeInteger(debug[field]) && debug[field] >= 0)),
      'closed terminal frame input unknown',
    )
  assert.equal(debug.authority, 'world', 'closed terminal has foreign authority')
  assert.equal(debug.action, null, 'closed terminal has independent action frame')
  if (debug.gait !== null) {
    assert.equal(debug.gaitOwner?.source, 'auto', 'closed terminal has foreign gait owner')
    assert.equal(
      debug.gaitActivationOwner,
      binding.entity,
      'closed terminal has foreign gait activation',
    )
  }
  const observedPhase = debug.override ?? (debug.gait ?? debug.explicit ?? 0) % phasePeriod
  assert.equal(observedPhase, phase, 'closed terminal loses primary current frame')
  const observedTimeline = [
    ...poseEffects.map((event) => ({ ...event, order: event.poses[binding.entity].commitOrder })),
    ...routes.flatMap(({ event, route }) =>
      route.commits.flatMap((commit) => {
        const acknowledgements = reforge.causes.filter(
          (receipt) =>
            receipt.phase === 'motion-slot-committed' &&
            receipt.slotId === route.slotId &&
            receipt.runId === event.runId &&
            receipt.sceneVisit === base.authoredVisit,
        )
        assert.equal(
          acknowledgements.length,
          1,
          'closed observation lacks unique actual slot commit',
        )
        const acknowledged = acknowledgements[0].poses[binding.entity]
        assert(
          acknowledged.commitOrder >= commit.order &&
            acknowledged.commitOrder < acknowledgements[0].order,
          'closed slot facing acknowledgement precedes actual displacement',
        )
        assert.deepEqual(
          acknowledged.state.position.slice(0, 2),
          commit.to.slice(0, 2),
          'closed slot acknowledgement has wrong position',
        )
        assert.equal(
          acknowledged.state.facing,
          event.occurrence.command.command.dir,
          'closed slot acknowledgement has wrong facing',
        )
        return [
          { ...commit, phase: 'closed-position' },
          {
            order: acknowledged.commitOrder,
            phase: 'closed-facing',
            dir: event.occurrence.command.command.dir,
          },
        ]
      }),
    ),
  ].sort((a, b) => a.order - b.order)
  cursor = 0
  phase = root.currentFrameNum
  facing = ['down', 'left', 'up', 'right'][root.direction]
  actualPosition = origin
  for (const observed of actorTransitions(reforge, binding.entity, binding.scene).filter(
    (event) => event.sceneVisit === base.authoredVisit,
  )) {
    while (cursor < observedTimeline.length && observedTimeline[cursor].order <= observed.order)
      fold(observedTimeline[cursor++])
    assert.deepEqual(
      canonicalPosition(observed.state.position),
      actualPosition,
      'closed authored observation loses causal position',
    )
    assert.equal(
      observed.state.facing,
      facing,
      `closed authored observation ${observed.order} loses causal facing`,
    )
  }
  for (const observed of actorTransitions(game, binding.entity, binding.scene).filter(
    (event) => event.sceneVisit === base.sourceVisit,
  )) {
    const enclosing = calls.find(
        ({ before, after }) => before.order < observed.order && observed.order < after.order,
      ),
      previousCall = calls.findLast(({ after }) => after.order < observed.order),
      possible = enclosing
        ? [enclosing.before.before, enclosing.after.after]
        : [
            previousCall?.after.after ?? {
              position: [root.x, root.y],
              facing: ['down', 'left', 'up', 'right'][root.direction],
            },
          ]
    assert(
      possible.some(
        (state) =>
          equal(state.position, observed.state.position) && state.facing === observed.state.facing,
      ),
      'closed source observation loses causal position or facing',
    )
  }
  // The comparator also consumes causal observations of the outgoing cached
  // actor after the scene's last draw. These observations earn no continuation
  // credit: every compared pose field must equal its own proved terminal.
  for (const [trace, actualTerminal, visit, fields] of [
    [
      game,
      sourceTerminal,
      base.sourceVisit,
      ['position', 'facing', 'visible', 'state', 'sprite', 'frame'],
    ],
    [
      reforge,
      terminal,
      base.authoredVisit,
      ['position', 'facing', 'visible', 'state', 'sprite', 'frameDebug'],
    ],
  ])
    for (const observed of actorTransitions(trace, binding.entity, binding.scene)) {
      if (observed.sceneVisit === visit) continue
      assert(observed.order > actualTerminal.order, 'closed cycle has an unproved earlier visit')
      for (const field of fields)
        assert.deepEqual(
          observed.state[field],
          actualTerminal.state[field],
          'closed outgoing observation differs from its proved terminal',
        )
    }
  return {
    ...base,
    steps: routes.length,
    committedSteps: routes.reduce((sum, { route }) => sum + route.commits.length, 0),
    sourceNodes: source.size,
    authoredNodes: authored.size,
    terminal: {
      game: {
        order: sourceTerminal.order,
        position: canonicalPosition(sourceTerminal.state.position),
      },
      reforge: { order: terminal.order, position: canonicalPosition(terminal.state.position) },
    },
  }
}

export function closedAutomaticCertificates(game, reforge, languages, receipts) {
  assert.equal(languages?.status, 'proved', 'closed cycle lacks actual language bridge')
  const proved = [],
    declined = []
  for (const binding of languages.bindings) {
    try {
      proved.push(verifyClosedAutomaticCycle(game, reforge, binding, receipts))
    } catch (error) {
      declined.push({ scene: binding.scene, entity: binding.entity, reason: error.message })
    }
  }
  return { proved, declined }
}
