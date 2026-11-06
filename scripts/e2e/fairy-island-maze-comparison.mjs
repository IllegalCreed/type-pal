import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { isDeepStrictEqual as same } from 'node:util'
import { recompareBoundStory } from './bound-story-comparison.mjs'
import { readBoundStoryRecording } from './bound-story-recording.mjs'
import { continuousGrid } from './continuous-route.mjs'
import { assertErrandCollector } from './errand-contract.mjs'
import { readEvidenceArtifact } from './evidence-artifact.mjs'
import { assertFairyMazeGameTrace } from './fairy-island-maze-game-observer.mjs'
import { verifyMazeCausality } from './fairy-island-maze-reforge-trace.mjs'
import { FAIRY_MAZE_LOOT, FAIRY_MAZE_STATUES, fairyMazePlan } from './fairy-island-maze-route.mjs'
import { readLongEvidenceArtifact } from './long-evidence.mjs'

const fragment = '008'
const rawPath = 'data/extracted/events/all.json'
const originalObjects = 'data/extracted/data/event-objects.json'
const pathScenes = ['s017', 's018', 's016']
const stepSources = { game: 'commit:tickSceneInput', reforge: 'commit:player.input' }
const arrow = { '-1,0': 'ArrowLeft', '1,0': 'ArrowRight', '0,-1': 'ArrowUp', '0,1': 'ArrowDown' }
function effectKind(observation) {
  if (observation.ride) return 'raft'
  if (observation.hammer) return 'hammer'
  if (observation.pickup) return 'search'
  return observation.target === 'e262' ? 'gate' : 'exit'
}

async function readRecording(path, engine) {
  const game = engine === 'game'
  const recording = await readBoundStoryRecording({
    path,
    engine,
    fragment,
    readTrace: game ? readEvidenceArtifact : readLongEvidenceArtifact,
    assertTrace: game ? assertFairyMazeGameTrace : assertErrandCollector,
  })
  const { definition } = recording.report.dependencies
  assert.equal(definition.entry, `scripts/e2e/fairy-island-maze-${engine}.mjs`)
  assert.equal(definition.packageName, engine)
  assert.equal(definition.traceConfig, `scripts/e2e/fairy-island-maze-${engine}.config.mts`)
  return recording
}

function normalizedStep({ scene, key, from, to }, engine) {
  return { scene, key, from: continuousGrid(from, engine), to: continuousGrid(to, engine) }
}

function measureRoute({ report, trace }) {
  const engine = report.engine
  const ready = trace.events.filter((event) =>
    engine === 'game' ? event.kind === 'ready' : event.kind === 'control' && event.state === true,
  )
  const boundaries = ready.filter(({ scene }, i) => scene !== ready[i - 1]?.scene)
  assert.deepEqual(
    boundaries.map(({ scene }) => scene),
    pathScenes,
    '008 native control boundaries',
  )
  const [start, gate, end] = boundaries
  const restore = engine === 'game' ? trace.gameRestores[0] : trace.restoreCommits[0]
  assert(restore, '008 story lacks native predecessor restore')
  // A Reforge boot may already publish control before replacing that world with the checkpoint.
  const storyStart = Math.max(start.order, restore.order)
  const delivered = report.actions
    .filter(({ scope }) => scope === 'story')
    .flatMap((action) => (action.kind === 'press' ? action.execution.dispatches : [action]))
  assert.deepEqual(
    trace.inputs
      .filter(({ order }) => storyStart < order && order < end.order)
      .map(({ type, key, repeat }) => [type, key, repeat]),
    delivered.map(({ kind, key }) => [`key${kind}`, key, false]),
    '008 story dispatches differ from actual native key events',
  )
  assert.deepEqual(
    report.actions.filter(({ routeId }) => routeId !== undefined),
    report.route.inputs,
    '008 route inputs lack dispatch receipts',
  )

  const moves = trace.events.filter(
    ({ id, kind, before, source, state }) =>
      id === 'party' &&
      kind === 'actor' &&
      source === stepSources[engine] &&
      before &&
      !same(before.position, state.position),
  )
  let consumed = 0
  const legs = report.route.legs.map(({ startOrder, endOrder, replay, inputPlan }, index) => {
    const legMoves = moves.filter(({ order }) => startOrder < order && order <= endOrder)
    const native = legMoves.map(({ before, state, source, order, scene }) => {
      const from = before.position
      const to = state.position
      const [oldCol, oldRow] = continuousGrid(from, engine)
      const [col, row] = continuousGrid(to, engine)
      const key = arrow[`${col - oldCol},${row - oldRow}`]
      assert(key, `non-unit 008 native step at order ${order}`)
      return { scene, key, from, to, source, order }
    })
    assert.deepEqual(native, replay.steps, '008 recorded route differs from native commits')
    assert.deepEqual(
      native.map(({ order: _order, ...step }) => step),
      inputPlan.steps,
    )
    assert.deepEqual(replay.completion, inputPlan.completion)
    assert(legMoves.every(({ order }) => storyStart < order && order < end.order))
    consumed += native.length
    return {
      startOrder,
      endOrder,
      steps: native.map((step) => ({
        order: step.order,
        leg: index + 1,
        ...normalizedStep(step, engine),
      })),
      completion: {
        ...replay.completion,
        position: continuousGrid(replay.completion.position, engine),
      },
    }
  })
  assert.equal(consumed, moves.length, '008 unbound native direction commits')
  return {
    legs,
    steps: legs.flatMap((leg) => leg.steps),
    boundaries: { start, gate, end, storyStart },
    dispatches: delivered.length,
  }
}

function compareRoute(game, reforge) {
  const shape = ({ order: _order, leg: _leg, ...step }) => step
  const count = Math.max(game.steps.length, reforge.steps.length)
  for (let i = 0; i < count; i++) {
    const left = game.steps[i],
      right = reforge.steps[i]
    if (!left || !right || !same(shape(left), shape(right))) {
      return {
        status: 'rejected',
        reason: 'first native walking step diverged',
        firstDifference: {
          step: i + 1,
          game: { before: game.steps[i - 1] ?? null, after: left ?? null },
          reforge: { before: reforge.steps[i - 1] ?? null, after: right ?? null },
        },
      }
    }
  }
  const plan = fairyMazePlan('reforge')
  assert.equal(game.legs.length, plan.length)
  assert.equal(reforge.legs.length, plan.length)
  for (const [i, { route }] of plan.entries()) {
    const expected = route.steps.map((step) => normalizedStep(step, 'reforge'))
    assert.deepEqual(game.legs[i].steps.map(shape), expected, `008 Game common leg ${i + 1}`)
    assert.deepEqual(reforge.legs[i].steps.map(shape), expected, `008 Reforge common leg ${i + 1}`)
    const completion = {
      ...route.completion,
      position: continuousGrid(route.completion.position, 'reforge'),
    }
    assert.deepEqual(game.legs[i].completion, completion, `008 Game leg ${i + 1} completion`)
    assert.deepEqual(reforge.legs[i].completion, completion, `008 Reforge leg ${i + 1} completion`)
  }
  return {
    status: 'proved',
    steps: count,
    legs: plan.length,
    nativeStoryDispatches: { game: game.dispatches, reforge: reforge.dispatches },
    firstDifference: null,
  }
}

function rawRideWaypoints(commands, entry) {
  const waypoints = []
  for (let ip = entry; commands[ip].op !== 'end'; ip++) {
    assert(ip - entry < 20, '008 original ride lacks its terminating script command')
    if (![0x3f, 0x44, 0x97].includes(commands[ip].opcode)) continue
    const [x, y, half] = commands[ip].operands
    waypoints.push([x + y + half, y - x])
  }
  return waypoints
}

function compareRide(game, reforge, gameLeg, gameAction, observation, entry, commands) {
  const movement = game.events.filter(
    ({ kind, owner, order }) =>
      kind === 'raft-motion' &&
      owner === entry.id &&
      gameLeg.startOrder < order &&
      order <= gameLeg.endOrder,
  )
  const riding = movement.filter(({ source }) => source === 'commit:partyRideEventObject')
  assert.equal(riding[0]?.ip, entry.entry)
  assert.equal(gameAction.entry, entry.entry)
  assert.equal(gameAction.resume, entry.resume)
  assert.equal(movement.at(-1)?.source, 'commit:partyWalkTo')
  assert.deepEqual(continuousGrid(movement.at(-1).party, 'game'), entry.landing)
  assert(
    riding.every(({ party, raft }) => same(party, raft)),
    '008 Game rider left its raft',
  )
  const waypoints = rawRideWaypoints(commands, entry.entry)
  assert.deepEqual(entry.ride.waypoints, waypoints)
  assert.deepEqual(
    [...new Set(riding.map(({ ip }) => ip))].map((ip) =>
      continuousGrid(riding.findLast((point) => point.ip === ip).raft, 'game'),
    ),
    waypoints,
  )
  assert.deepEqual(observation.ride, entry.ride)
  const boarding = continuousGrid(gameLeg.replay.steps.at(-1).to, 'game')
  const moved = riding.filter(
    ({ raft }, i) =>
      !same(
        continuousGrid(raft, 'game'),
        i === 0 ? boarding : continuousGrid(riding[i - 1].raft, 'game'),
      ),
  )
  const gamePath = moved.map(({ raft }) => continuousGrid(raft, 'game'))
  // verifyMazeCausality binds each Reforge sample to the raft and party commits in the same tick.
  const reforgePath = observation.nativeRide.samples.map(({ position }) =>
    continuousGrid(position, 'reforge'),
  )
  assert.deepEqual(reforgePath, gamePath, `008 rider trajectory e${entry.id} at ${entry.entry}`)
  const facing = compareRideFacing(game, reforge, moved, observation.nativeRide.samples)
  return {
    stage: observation.ride.stage,
    originalEntry: entry.entry,
    originalResume: entry.resume,
    waypoints,
    samples: gamePath.length,
    facing,
    gameBoardOrder: riding[0].order,
    reforgeBoardOrder: observation.nativeRide.samples[0].raftOrder,
    gameDismountOrder: movement.at(-1).order,
    reforgeDismountOrder: observation.nativeRide.dismountOrder,
  }
}

function comparedActorPose(event, source, position) {
  assert.equal(event?.kind, 'actor')
  assert.equal(event.id, 'party')
  assert.equal(event.source, source)
  assert.deepEqual(event.state.position, position)
  assert(['up', 'down', 'left', 'right'].includes(event.state.facing))
  return { order: event.order, facing: event.state.facing }
}

function compareRideFacing(game, reforge, moves, nativeRide) {
  const mismatches = []
  const turns = []
  for (const [index, moved] of moves.entries()) {
    const gameActor = game.byOrder.get(moved.order - 1)
    const reforgeActor = reforge.byOrder.get(nativeRide[index].partyOrder)
    const left = comparedActorPose(gameActor, 'commit:partyRideEventObject', moved.party)
    const right = comparedActorPose(reforgeActor, 'commit:player.pos', nativeRide[index].position)
    const sample = { step: index + 1, game: left, reforge: right }
    if (left.facing !== right.facing) mismatches.push(sample)
    if (gameActor.before.facing === left.facing) continue
    const painted = (timeline, actor) =>
      timeline.draws.get(`party:${actor.sceneVisit}:${actor.tick}:${actor.state.position}`)
    const gameDraw = painted(game, gameActor)
    const reforgeDraw = painted(reforge, reforgeActor)
    turns.push({
      ...sample,
      draws: [gameDraw, reforgeDraw].map((draw) =>
        draw ? { order: draw.order, facing: draw.state.facing } : null,
      ),
    })
  }
  return {
    checked: moves.length,
    mismatches: mismatches.length,
    firstDifference: mismatches[0] ?? null,
    turns,
  }
}

function actorTimeline({ events }) {
  const rendered = events.filter((e) => e.kind === 'actor-render' && e.state.drawStatus === 'drawn')
  return {
    events,
    rendered,
    byOrder: new Map(events.map((event) => [event.order, event])),
    draws: new Map(
      rendered.map((e) => [`${e.id}:${e.sceneVisit}:${e.tick}:${e.state.position}`, e]),
    ),
  }
}

function compareActions(game, reforge, commands) {
  const timelines = [actorTimeline(game.trace), actorTimeline(reforge.trace)]
  const observations = structuredClone(reforge.report.observations)
  assert.deepEqual(
    verifyMazeCausality(reforge.trace, observations),
    reforge.report.checks.causality,
  )
  const plan = fairyMazePlan('reforge')
  assert.equal(game.report.mazeActions.length, plan.length)
  assert.equal(observations.length, plan.length)
  let hammerHits = 0
  const actions = plan.map((entry, index) => {
    const left = game.report.mazeActions[index]
    const right = observations[index]
    const entity = `e${entry.id}`
    assert.equal(left.index, index)
    assert.equal(left.id, entry.id)
    assert.equal(left.kind, entry.kind)
    assert.equal(right.target, entity)
    assert.equal(effectKind(right), entry.kind)
    const arrival = continuousGrid(left.after, 'game')
    assert.deepEqual(arrival, entry.landing)
    const receipt = { action: index + 1, entity, kind: entry.kind, arrival }
    if (entry.kind === 'raft') {
      return {
        ...receipt,
        ...compareRide(...timelines, game.report.route.legs[index], left, right, entry, commands),
      }
    }
    if (entry.kind === 'hammer') {
      hammerHits++
      assert.equal(left.statueState, 0)
      assert.equal(right.hammer.state[entity], 0)
      assert.equal(right.hammer.facing, entry.holds.at(-1)[0])
      const remaining = right.hammer.inventory.find(({ itemId }) => itemId === '279')?.count ?? 0
      assert.equal(remaining, hammerHits === FAIRY_MAZE_STATUES.length ? 0 : 1)
      assert.equal(left.hammerCount, remaining)
      return { ...receipt, remainingHammer: remaining }
    }
    if (entry.kind === 'search') {
      assert.deepEqual(left.loot, FAIRY_MAZE_LOOT[entry.id])
      assert.deepEqual(right.pickup.items, left.loot.map(String))
      return { ...receipt, items: left.loot }
    }
    return receipt
  })
  const rides = actions.filter(({ kind }) => kind === 'raft')
  assert.equal(rides.length, 31)
  assert.equal(hammerHits, 6)
  assert.equal(actions.filter(({ kind }) => kind === 'search').length, 2)
  return {
    status: 'proved',
    actions,
    rides: rides.length,
    pairedRideSamples: rides.reduce((sum, ride) => sum + ride.samples, 0),
  }
}

function compareRiderTurns({ actions }) {
  const rides = actions.filter(({ kind }) => kind === 'raft')
  const samples = rides.reduce((sum, { facing }) => sum + facing.checked, 0)
  const mismatches = rides.reduce((sum, { facing }) => sum + facing.mismatches, 0)
  const turns = rides.flatMap(({ action, entity, facing }) =>
    facing.turns.map((turn) => ({ action, entity, ...turn })),
  )
  const missing = turns.filter(({ draws }) => draws.some((draw) => !draw))
  const firstBadDraw = turns.find(({ game, draws }) =>
    draws.some((draw) => draw && draw.facing !== game.facing),
  )
  const firstBadRide = rides.find(({ facing }) => facing.firstDifference)
  return {
    status: mismatches || firstBadDraw ? 'rejected' : missing.length ? 'unknown' : 'proved',
    samples,
    mismatches,
    turns: turns.length,
    missingDraws: missing.length,
    firstMissingDraw: missing[0] ?? null,
    firstBadDraw: firstBadDraw ?? null,
    firstDifference: firstBadRide
      ? {
          entity: firstBadRide.entity,
          action: firstBadRide.action,
          ...firstBadRide.facing.firstDifference,
        }
      : null,
  }
}

function compareStatues(game, reforge, objects) {
  const drawings = [game, reforge].map(({ trace }) => actorTimeline(trace).rendered)
  const states = FAIRY_MAZE_STATUES.map((id) => {
    const original = objects.find((object) => object.id === id)
    assert.equal(original?.spriteNum, 66)
    const expected = {
      position: continuousGrid([original.x, original.y], 'game'),
      frame: original.currentFrameNum,
    }
    const pose = (e, engine) => ({
      position: continuousGrid(e.state.position, engine),
      frame: e.state.frame,
    })
    const samples = drawings.map((draws) =>
      draws.filter((e) => e.scene === 's017' && e.id === `e${id}`),
    )
    const mismatched = samples.map((draws, index) =>
      draws.find(
        (e) =>
          !same(pose(e, index === 0 ? 'game' : 'reforge'), expected) ||
          (index === 0 ? e.state.assetId !== 66 : e.state.resourceAssetId !== 'sprite.pal.066'),
      ),
    )
    const receipt = (e, index) =>
      e && {
        ...pose(e, index === 0 ? 'game' : 'reforge'),
        facing: e.state.facing,
        order: e.order,
      }
    return {
      entity: `e${id}`,
      expected,
      game: receipt(samples[0][0], 0) ?? null,
      reforge: receipt(samples[1][0], 1) ?? null,
      firstDifferences: mismatched.map((e, i) => receipt(e, i) ?? null),
    }
  })
  return {
    status: states.some(({ firstDifferences }) => firstDifferences.some(Boolean))
      ? 'rejected'
      : states.some(({ game, reforge }) => !game || !reforge)
        ? 'unknown'
        : 'proved',
    states,
  }
}

function terminalInventory(payload, engine) {
  const items = engine === 'game' ? payload.gs.inventory : payload.world.inventory
  return new Map(items.map(({ itemId, count }) => [String(itemId), count]))
}

function footpointAt({ report, trace }, boundary) {
  const engine = report.engine
  const pose =
    engine === 'game'
      ? boundary
      : trace.events.findLast(
          (event) =>
            event.kind === 'actor' &&
            event.id === 'party' &&
            event.scene === boundary.scene &&
            event.sceneVisit === boundary.sceneVisit &&
            event.order <= boundary.order,
        )?.state
  assert(pose, '008 native ready boundary lacks its party pose')
  return { position: continuousGrid(pose.position, engine), facing: pose.facing }
}

function verifyTerminal(recording, boundary) {
  const { report, terminal, predecessor } = recording
  const engine = report.engine
  const game = engine === 'game'
  const before = terminalInventory(predecessor, engine)
  const after = terminalInventory(terminal, engine)
  assert.equal(before.get('279'), 1)
  const expected = new Map(before)
  expected.delete('279')
  for (const item of Object.values(FAIRY_MAZE_LOOT).flat().map(String)) {
    expected.set(item, (before.get(item) ?? 0) + 1)
  }
  assert.deepEqual(after, expected, '008 persisted reward/hammer delta')
  const state = (save, id) =>
    game
      ? save.gs.allEventObjects.find((object) => object.id === id).sState
      : save.world.script.entityState?.s017?.[`e${id}`]
  for (const id of FAIRY_MAZE_STATUES) assert.equal(state(terminal, id), 0)
  assert.equal(state(terminal, 236), state(predecessor, 236))
  assert.equal(state(terminal, 262), 1)
  const pos = game
    ? continuousGrid([terminal.gs.party.x, terminal.gs.party.y], engine)
    : [terminal.position.pos.col, terminal.position.pos.row]
  assert.equal(game ? terminal.gs.wNumScene : terminal.position.sceneId, game ? 17 : 's016')
  assert.deepEqual(pos, [61, 42])
  assert.equal(game ? terminal.gs.party.facing : terminal.position.facing, 'up')
  assert.equal(report.endWorld.controlReturned, true)
  assert.deepEqual(continuousGrid(report.endWorld.position, engine), pos)
  assert.deepEqual(footpointAt(recording, boundary), { position: pos, facing: 'up' })
  return { readyOrder: boundary.order, position: pos, facing: 'up', freshRestore: 'proved' }
}

function compareGate(game, reforge, gameRoute, reforgeRoute) {
  const gameGate = game.report.mazeActions.find(({ kind }) => kind === 'gate')
  assert.deepEqual(footpointAt(game, gameRoute.boundaries.start), {
    position: [90, 54],
    facing: 'up',
  })
  const reforgeStart = {
    ...reforgeRoute.boundaries.start,
    order: reforgeRoute.boundaries.storyStart,
  }
  assert.deepEqual(footpointAt(reforge, reforgeStart), { position: [90, 54], facing: 'up' })
  assert.deepEqual(footpointAt(game, gameRoute.boundaries.gate).position, [89, 25])
  assert.deepEqual(footpointAt(reforge, reforgeRoute.boundaries.gate).position, [89, 25])
  assert.deepEqual(continuousGrid(gameGate.after, 'game'), [89, 25])
  const floor = game.trace.events.filter(
    ({ kind, id, order }) =>
      kind === 'floor-frame' && id === 262 && order < gameRoute.boundaries.gate.order,
  )
  const gameFrames = [...new Set(floor.map(({ frame }) => frame))]
  const reforgeGate = reforge.report.observations.find(({ target }) => target === 'e262')
  // verifyMazeCausality verifies actual render frames and that they precede touching the plate.
  const reforgeFrames = [...new Set(reforgeGate.plateDraws.map(({ frame }) => frame))]
  assert(gameFrames.length >= 2)
  assert(reforgeFrames.length >= 2)
  assert.deepEqual(reforgeRoute.legs.at(-2).completion, {
    scene: 's018',
    position: [89, 25],
    mode: 'ready',
  })
  return {
    status: 'proved',
    transition: ['s017', 's018', 's016'],
    plate: { gameNativeFrames: gameFrames, reforgeDrawnFrames: reforgeFrames, landing: [89, 25] },
    game: verifyTerminal(game, gameRoute.boundaries.end),
    reforge: verifyTerminal(reforge, reforgeRoute.boundaries.end),
  }
}

function prove(check) {
  try {
    return check()
  } catch (error) {
    if (!(error instanceof assert.AssertionError)) throw error
    return { status: 'unknown', reason: error.message }
  }
}

export async function recompareFairyIslandMaze(root, gamePath, reforgePath) {
  const [game, reforge] = await Promise.all([
    readRecording(gamePath, 'game'),
    readRecording(reforgePath, 'reforge'),
  ])
  const [raw, objects] = await Promise.all(
    [rawPath, originalObjects].map((path) => readFile(resolve(root, path))),
  )
  const objectsSha = createHash('sha256').update(objects).digest('hex')
  const sha256 = createHash('sha256').update(raw).digest('hex')
  return recompareBoundStory({
    root,
    fragment,
    recordings: [game, reforge],
    semanticPaths: [rawPath, originalObjects],
    scope:
      '008 native directions and footpoints, rider trajectories and turns, six statues’ original drawn poses, two pickups, the flashing plate, and checkpoint restores.',
    compare: ({ semanticSources }) => {
      assert.equal(
        semanticSources[rawPath],
        sha256,
        '008 original script changed during comparison',
      )
      const gameRoute = measureRoute(game)
      const reforgeRoute = measureRoute(reforge)
      const proofs = { route: prove(() => compareRoute(gameRoute, reforgeRoute)) }
      if (proofs.route.status === 'proved') {
        proofs.actions = prove(() => {
          assert.equal(
            game.report.hashes[rawPath],
            sha256,
            '008 original script differs from Game recording',
          )
          return compareActions(game, reforge, JSON.parse(raw).segments[0].commands)
        })
        if (proofs.actions.status === 'proved') {
          proofs.riderFacing = prove(() => compareRiderTurns(proofs.actions))
          proofs.gate = prove(() => compareGate(game, reforge, gameRoute, reforgeRoute))
        }
        proofs.statuePresentation = prove(() => {
          assert.equal(objectsSha, semanticSources[originalObjects])
          assert.equal(objectsSha, game.report.hashes[originalObjects])
          return compareStatues(game, reforge, JSON.parse(objects).eventObjects)
        })
      }
      return {
        ...proofs,
        findings: Object.entries(proofs).flatMap(([field, proof]) =>
          proof.status === 'proved'
            ? []
            : [
                {
                  type: 'fairy-maze',
                  field,
                  status: proof.status,
                  reason: proof.reason,
                  ...(proof.firstDifference ? { firstDifference: proof.firstDifference } : {}),
                },
              ],
        ),
      }
    },
  })
}
