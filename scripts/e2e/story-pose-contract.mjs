import assert from 'node:assert/strict'
import actors from '../../projects/pal/content/actors.json' with { type: 'json' }
import sprites from '../../projects/pal/content/sprites.json' with { type: 'json' }
import { canonicalScenes } from './entity-action-contract.mjs'
import { assertRestoredPoseHandoff } from './runtime-handoff-contract.mjs'
import { authoredMotionStep } from './story-motion-contract.mjs'

const direction = { down: 0, left: 1, up: 2, right: 3 }
const leaf = (event) => event.occurrence?.command?.command
const vector = (position) => [position.col, position.row, position.height]
const spriteDefinition = (value) =>
  sprites.find(
    (sprite) =>
      sprite.id ===
      (Number.isInteger(value)
        ? `sprite-${value}`
        : (actors.find((actor) => actor.id === value)?.spriteId ?? value)),
  )

/** Renderer input algebra, independent of the renderer's selected frame. */
export function projectAuthoredFrame(layout, facing, inputs, totalFrames) {
  assert(['directional', 'static'].includes(layout.kind), 'unclassified story sprite layout')
  assert(
    Number.isSafeInteger(totalFrames) && totalFrames > 0,
    'sprite frame count lacks resource proof',
  )
  const bounded = (frame) =>
    Number.isInteger(frame) && frame >= 0 && frame < totalFrames ? frame : 0
  const base = layout.kind === 'directional' ? direction[facing] * layout.framesPerDir : 0
  const gait =
    inputs.gait !== null && !(inputs.gaitSource === 'auto' && inputs.held) ? inputs.gait : null
  const walk = (phase) => {
    if (layout.kind === 'static') return 0
    const n = layout.framesPerDir,
      cycle = n === 3 ? [0, 1, 0, 2] : Array.from({ length: n }, (_, i) => i)
    return bounded(base + cycle[((phase % cycle.length) + cycle.length) % cycle.length])
  }
  if (inputs.fixed !== null) return bounded(bounded(base) + inputs.fixed)
  if (gait !== null) return walk(gait)
  if (inputs.explicit !== null)
    return layout.kind === 'directional'
      ? walk(inputs.explicit)
      : ((inputs.explicit % totalFrames) + totalFrames) % totalFrames
  if (inputs.action !== null) return bounded(inputs.action)
  return bounded(base)
}

/** One reducer for explicit pose authors, committed locomotion, and proven restore seeds.
 * Actor snapshots/drawn pixels are assertions, never the expected initial animation phase.
 */
export function verifyStoryPoses(
  trace,
  participants,
  motion,
  handoffs,
  actions,
  frameCounts,
  renders,
  states,
) {
  const models = new Map(),
    authority = new Map(),
    result = new Map(),
    proofDraws = []
  const key = (scene, visit, id) => `${visit}/${scene}/${id}`
  const wanted = (scene, id) =>
    participants.some((actor) => actor.scene === scene && actor.entity === id)
  const allDraws = trace.worldRenders.filter((draw) => draw.order <= trace.renderScope.throughOrder)
  const actorTimelines = new Map()
  for (const event of trace.events ?? []) {
    if (event.kind !== 'actor' || !wanted(event.scene, event.id)) continue
    const timelineKey = key(event.scene, event.sceneVisit, event.id)
    const timeline = actorTimelines.get(timelineKey) ?? []
    timeline.push(event)
    actorTimelines.set(timelineKey, timeline)
  }
  for (const timeline of actorTimelines.values()) timeline.sort((a, b) => a.order - b.order)
  const latestActorBefore = (scene, sceneVisit, entity, order) => {
    const timeline = actorTimelines.get(key(scene, sceneVisit, entity)) ?? []
    let low = 0,
      high = timeline.length
    while (low < high) {
      const middle = Math.floor((low + high) / 2)
      if (timeline[middle].order < order) low = middle + 1
      else high = middle
    }
    return timeline[low - 1]
  }
  const poseByDraw = new Map(
    participants.flatMap(({ entity, scene }) =>
      renders(trace, entity, scene).map((pose) => [`${pose.renderId}/${entity}`, pose]),
    ),
  )
  const timelines = new Map(
    participants.map(({ entity, scene }) => [`${scene}/${entity}`, states(trace, entity, scene)]),
  )
  const motions = motion.flatMap((route) =>
    route.commits.map((commit) => ({
      ...commit,
      phase: 'proof:motion',
      scene: route.scene,
      sceneVisit: route.sceneVisit,
      entity: route.actor,
    })),
  )
  const noOps = motion.flatMap((route) =>
    route.noOps.map((commit) => ({
      ...commit,
      phase: 'proof:no-op',
      scene: route.scene,
      sceneVisit: route.sceneVisit,
      entity: route.actor,
    })),
  )
  const events = [
    ...trace.causes,
    ...motions,
    ...noOps,
    ...(trace.events ?? []).filter(
      (event) => event.kind === 'actor' && event.source === 'before:render',
    ),
    ...allDraws.map((draw) => ({ ...draw, phase: 'proof:draw' })),
  ].sort((a, b) => a.order - b.order)
  const current = (event, id) => models.get(key(event.scene, event.sceneVisit, id))
  const clearGait = (model) => {
    model.gait = null
    model.gaitSource = null
    model.gaitOwner = null
    model.lastMoved = null
  }
  const mark = (model, event, source, owner) => {
    const previous = model.explicit ?? model.gait
    model.fixed = null
    model.explicit = null
    model.gait = (previous ?? 0) + 1
    model.gaitSource = source
    model.gaitOwner = owner
    model.lastMoved = event.tick
  }
  const settleStanding = (model, event, entity) => {
    if (
      model.gait !== null &&
      model.gaitSource === 'script' &&
      event.tick > model.lastMoved &&
      authority.get(entity)?.kind !== 'script' &&
      !motion.some(
        (route) =>
          route.actor === entity &&
          route.sceneVisit === event.sceneVisit &&
          route.command < event.order &&
          route.end > event.order,
      )
    )
      clearGait(model)
  }
  const deriveRiders = (event) => {
    for (const [id, held] of authority)
      if (held.kind === 'mount' && current(event, id)) {
        const carrier = current(event, held.parent)
        assert(carrier, 'rider position lacks verified carrier')
        current(event, id).position = [
          carrier.position[0] + held.dx,
          carrier.position[1] + held.dy,
          carrier.position[2],
        ]
      }
  }
  for (const event of events) {
    if (event.phase === 'runtime-projection-start') {
      assert(
        event.worldSource === 'observe:causal' && event.world?.script,
        'scene pose seed lacks actual world input',
      )
      const scene = canonicalScenes[event.scene]
      assert(scene, 'scene pose seed lacks canonical definition')
      for (const definition of scene.entities.filter((entity) => wanted(event.scene, entity.id))) {
        const script = event.world.script,
          state = script.entityState?.[event.scene]?.[definition.id]
        const lifecycle = event.world.entityLifecycles?.[event.scene]?.[definition.id]
        assert(!lifecycle || lifecycle.phase === 'normal', 'unclassified lifecycle pose seed')
        models.set(key(event.scene, event.sceneVisit, definition.id), {
          position: vector(script.entityPos?.[event.scene]?.[definition.id] ?? definition.pos),
          facing: definition.facing ?? 'down',
          visible: state === undefined ? !definition.hidden : state > 0,
          sprite: definition.sprite ?? definition.actor ?? null,
          fixed: null,
          gait: null,
          gaitSource: null,
          gaitOwner: null,
          lastMoved: null,
          explicit: null,
          restoredMove: null,
        })
      }
      authority.clear()
    }
    if (event.phase === 'runtime-projection-pose' && wanted(event.scene, event.entity)) {
      const model = current(event, event.entity)
      assert(model, 'restored pose lacks canonical scene seed')
      assertRestoredPoseHandoff(event, handoffs)
      const saved = event.motion
      model.facing = event.facing ?? model.facing
      model.fixed = event.fixedFrame
      model.explicit = saved.explicitAnimation ?? null
      model.gait = saved.gait?.phase ?? null
      model.gaitSource = saved.gait?.source ?? null
      model.gaitOwner = saved.gait?.owner ?? null
      model.lastMoved = saved.gait ? event.tick : null
      model.restoredMove = saved.move ?? null
    }
    if (event.phase === 'authority-changed') {
      if (event.after) authority.set(event.actor, event.after)
      else authority.delete(event.actor)
      const model = current(event, event.actor)
      if (model && model.gaitSource !== 'auto') clearGait(model)
    }
    if (event.kind === 'actor' && ['before:render', 'observe:causal'].includes(event.source)) {
      const model = current(event, event.id)
      // stopAutoRunners can settle between the scene-ready snapshot and the first draw without
      // producing a resolved run-ended event. A real before-render actor observation that has
      // lost its automatic gait is the causal state change, not a guessed draw-time correction.
      if (model && model.gait !== null && event.state.frameDebug?.gait === null) clearGait(model)
    }
    if (event.phase === 'proof:motion') {
      const model = current(event, event.entity)
      assert(model, 'motion lacks proven scene pose seed')
      assert.deepEqual(model.position.slice(0, 2), event.from, 'pose motion origin differs')
      model.position = event.to
      model.facing = event.facing
      if (event.arrived) {
        clearGait(model)
        model.fixed = null
        model.explicit = null
      } else mark(model, event, event.source, event.activationOwner)
      deriveRiders(event)
    }
    if (event.phase === 'proof:no-op') {
      const model = current(event, event.entity)
      if (model) clearGait(model)
    }
    if (event.phase === 'motion-slot-cancelled' && event.entity) {
      const model = current(event, event.entity)
      if (model) clearGait(model)
    }
    if (event.phase === 'motion-slot-registered' && current(event, event.entity))
      current(event, event.entity).restoredMove = null
    if (event.phase === 'leaf-completed') {
      const command = leaf(event),
        id = command?.target?.entity
      const model = command?.target?.scene === event.scene ? current(event, id) : null
      if (model)
        switch (command.kind) {
          case 'setEntityFacing':
            model.facing = command.facing
            break
          case 'faceEntityToParty': {
            const party = event.poses?.party?.state?.position
            assert(party?.length === 3, 'interaction turn lacks actual party input')
            const dx = party[0] - model.position[0] - party[1] + model.position[1]
            const dy = party[0] - model.position[0] + party[1] - model.position[1]
            if (dx || dy)
              model.facing = dx > 0 ? (dy > 0 ? 'right' : 'up') : dy > 0 ? 'down' : 'left'
            break
          }
          case 'setEntityFrame':
            model.fixed = command.frame
            model.explicit = command.frame
            clearGait(model)
            break
          case 'setEntityState':
            model.visible = command.state > 0
            break
          case 'setEntityPos':
            model.position = [command.pos.col, command.pos.row, model.position[2]]
            model.restoredMove = null
            clearGait(model)
            break
          case 'setEntityPosRelParty': {
            const party = event.poses?.party?.state?.position
            assert(party?.length === 3, 'relative pose lacks actual party input')
            model.position = [party[0] + command.dcol, party[1] + command.drow, model.position[2]]
            model.restoredMove = null
            clearGait(model)
            break
          }
          case 'nudgeEntity':
            if (event.occurrence.timing !== 'auto' || !authority.has(id))
              model.position = [
                model.position[0] + command.dx / 32 + command.dy / 16,
                model.position[1] + command.dy / 16 - command.dx / 32,
                model.position[2],
              ]
            break
          case 'animEntity':
            model.fixed = null
            model.explicit = (model.explicit ?? model.gait ?? 0) + 1
            clearGait(model)
            break
          case 'stepEntity':
            if (event.occurrence.timing !== 'auto') {
              const step = authoredMotionStep(model.position, command)
              model.position = step.to
              model.facing = step.facing
              mark(model, event, 'script', null)
            }
            break
        }
    }
    if (event.phase === 'runtime-captured') {
      for (const { entity } of participants.filter((actor) => actor.scene === event.scene)) {
        const model = current(event, entity),
          saved = event.saved.entities[entity]
        assert(model && saved, 'capture lacks independently reconstructed entity')
        settleStanding(model, event, entity)
        assert.deepEqual(
          vector(event.positions[entity]),
          model.position,
          'capture position differs from authored pose',
        )
        assert.equal(
          saved.facing ?? 'down',
          model.facing,
          'capture facing differs from authored pose',
        )
        assert.equal(
          saved.fixedFrame ?? null,
          model.fixed,
          'capture fixed frame differs from authored pose',
        )
        const route = motion.findLast(
          (route) =>
            route.actor === entity &&
            route.sceneVisit === event.sceneVisit &&
            route.registration.slot.source === 'auto' &&
            route.registration.slot.kind === 'move' &&
            route.command < event.order &&
            route.end > event.order &&
            !route.commits.some((commit) => commit.arrived && commit.order < event.order) &&
            !route.noOps.some((commit) => commit.order < event.order),
        )
        const moving = route
          ? {
              owner: route.registration.slot.activationOwnerId,
              to: route.target,
              speed: route.registration.slot.speed,
              slowRestPending:
                route.restPhases.findLast((phase) => phase.order < event.order)?.rest ??
                route.registration.slot.slowRestPending,
              slowCadence: route.registration.slot.slowCadence,
            }
          : model.restoredMove
        const expected = {
          ...(model.gait !== null
            ? {
                gait: {
                  phase: model.gait,
                  source: model.gaitSource,
                  ...(model.gaitOwner ? { owner: model.gaitOwner } : {}),
                },
              }
            : {}),
          ...(model.explicit !== null ? { explicitAnimation: model.explicit } : {}),
          ...(moving ? { move: moving } : {}),
        }
        assert.deepEqual(
          saved.motion,
          expected,
          'capture animation differs from independent author history',
        )
      }
    }
    if (event.phase === 'run-ended' && event.occurrence?.timing === 'auto' && event.resolved) {
      for (const { entity, scene } of participants.filter((actor) => actor.scene === event.scene)) {
        const model = models.get(key(scene, event.sceneVisit, entity))
        const owner = event.occurrence.self?.entity
        if (model && (model.gaitOwner === owner || entity === owner)) clearGait(model)
      }
    }
    if (event.phase === 'proof:draw' && event.order > trace.renderScope.afterOrder) {
      const checked = []
      for (const { entity, scene } of participants.filter((actor) => actor.scene === event.scene)) {
        const model = current(event, entity),
          pose = poseByDraw.get(`${event.renderId}/${entity}`)
        assert(model && pose, `${entity}: full draw lacks pose model or actual draw`)
        const latestActor = latestActorBefore(scene, event.sceneVisit, entity, event.order)
        if (model.gait !== null && latestActor?.state?.frameDebug?.gait === null) clearGait(model)
        // Interactive one-shots stand after the next world step; automatic steps keep gait
        // through their authored waits until that automatic invocation ends.
        deriveRiders(event)
        settleStanding(model, event, entity)
        assert.deepEqual(
          pose.position,
          model.position.slice(0, 2),
          `${entity}: unexplained drawn position at ${event.order}`,
        )
        assert.equal(pose.facing, model.facing, `${entity}: unexplained facing at ${event.order}`)
        assert.equal(
          pose.visible,
          model.visible,
          `${entity}: unexplained visibility at ${event.order}`,
        )
        const committed = timelines
          .get(`${scene}/${entity}`)
          .findLast(
            (state) => state.sceneVisit === event.sceneVisit && state.order < event.order,
          )?.state
        assert(committed?.frameDebug, `${entity}: pose inputs were not recorded`)
        const debug = committed.frameDebug
        assert.deepEqual(
          [debug.override, debug.gait, debug.explicit, debug.gaitOwner?.source ?? null],
          [model.fixed, model.gait, model.explicit, model.gaitSource],
          `${entity}: unauthored animation state at ${event.order}`,
        )
        const definition = spriteDefinition(model.sprite)
        if (model.visible && definition) {
          const page =
            actions.frames.find((frame) => frame.order === event.order)?.frames?.[entity] ?? null
          assert.equal(
            debug.action,
            page,
            `${entity}: action selection differs from independent timeline`,
          )
          const expected = projectAuthoredFrame(
            definition.layout,
            model.facing,
            { ...model, held: authority.has(entity), action: page },
            frameCounts[definition.asset],
          )
          assert.equal(
            pose.frame,
            expected,
            `${entity}: incorrect actual rendered frame at ${event.order}`,
          )
          assert.equal(pose.frameSource, 'drawn', `${entity}: missing successful draw`)
          assert.equal(pose.drawStatus, 'drawn', `${entity}: missing successful draw status`)
          const rect = pose.geometry?.worldRect
          assert(rect?.length === 4 && rect[2] > 0 && rect[3] > 0, 'sprite bounds missing')
          assert.equal(
            rect[0],
            16 * (model.position[0] - model.position[1]) - Math.floor(rect[2] / 2),
            'sprite x detached from actor',
          )
          assert.equal(
            rect[1],
            8 * (model.position[0] + model.position[1]) - model.position[2] * 16 + 7 - rect[3],
            'sprite y detached from actor',
          )
        } else assert.equal(pose.frame, null, 'hidden or sprite-less entity was drawn')
        const entry = result.get(`${scene}/${entity}`) ?? {
          id: entity,
          scene,
          draws: 0,
          first: event.order,
        }
        entry.draws++
        entry.last = event.order
        result.set(`${scene}/${entity}`, entry)
        checked.push(entity)
      }
      proofDraws.push({ order: event.order, renderId: event.renderId, actors: checked })
    }
  }
  return { actors: [...result.values()], draws: proofDraws }
}
