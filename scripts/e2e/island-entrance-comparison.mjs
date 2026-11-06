import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { isDeepStrictEqual as same } from 'node:util'
import { recompareBoundStory } from './bound-story-comparison.mjs'
import { readBoundStoryRecording } from './bound-story-recording.mjs'
import { committedRouteReceipt } from './committed-route.mjs'
import { continuousGrid } from './continuous-route.mjs'
import { assertErrandCollector } from './errand-contract.mjs'
import { readLongEvidenceArtifact } from './long-evidence.mjs'

const scene = 's015'
const eventPath = 'data/extracted/data/event-objects.json'
const scriptPath = 'data/extracted/events/all.json'
const enemyIds = [206, 207, 208, 209]

async function readRecording(path, engine) {
  const result = await readBoundStoryRecording({
    path,
    engine,
    fragment: '007',
    readTrace: readLongEvidenceArtifact,
    assertTrace: assertErrandCollector,
  })
  const { definition } = result.report.dependencies
  assert.equal(definition.entry, 'scripts/e2e/island-entrance.mjs')
  assert.equal(definition.packageName, engine)
  assert.equal(definition.traceConfig, `scripts/e2e/island-${engine}.config.mts`)
  return result
}

function measuredRoute({ report, trace, terminal }) {
  const game = report.engine === 'game'
  const grid = (point) => continuousGrid(point, report.engine)
  assert.equal(report.route.legs.length, 2)
  const [dock, island] = report.route.legs
  assert.deepEqual([dock.scene, island.scene], ['s014', scene])
  assert.equal(dock.endOrder, island.startOrder)
  const actions = report.actions.filter(
    ({ phase, key }) => [dock.phase, island.phase].includes(phase) && key.startsWith('Arrow'),
  )
  assert.deepEqual(actions, report.route.inputs)
  const keys = trace.inputs.filter(
    ({ key, order }) =>
      key.startsWith('Arrow') && dock.startOrder < order && order <= island.endOrder,
  )
  assert(keys.every(({ repeat }) => !repeat))
  assert.deepEqual(
    keys.map(({ type, key }) => [type, key]),
    actions.map(({ kind, key }) => [`key${kind}`, key]),
  )
  const routes = [dock, island].map((leg, i) => {
    const { startOrder, endOrder, inputPlan } = leg
    const ready = trace.events.find((e) => e.order === endOrder)
    assert.equal(ready?.scene, inputPlan.completion.scene)
    const last = trace.events.findLast(
      (e) => e.order <= endOrder && e.kind === 'actor' && e.id === 'party',
    )
    const completion = inputPlan.completion
    assert.deepEqual(last?.state.position, completion.position)
    const next = report.route.legs[i + 1]?.replay.steps[0].order ?? Infinity
    const control = trace.events.findLast(
      (e) =>
        e.order < next &&
        e.sceneVisit === last.sceneVisit &&
        e.scene === completion.scene &&
        e.kind === 'control',
    )
    assert.equal(control?.state, true, 'route destination never returned control')
    const replay = committedRouteReceipt({
      id: i,
      engine: report.engine,
      trace,
      startOrder,
      endOrder,
      scene: leg.scene,
      end: {
        scene: game ? Number(completion.scene.slice(1)) + 1 : completion.scene,
        position: last.state.position,
      },
      ready: true,
      inputCount: actions.filter(({ phase }) => phase === leg.phase).length,
    })
    assert.deepEqual(replay, leg.replay)
    assert.deepEqual(replay.completion, inputPlan.completion)
    assert.deepEqual(
      replay.steps.map(({ order: _order, ...step }) => step),
      inputPlan.steps,
    )
    assert.equal(replay.steps.length, i === 0 ? 44 : 88)
    const steps = replay.steps.map(({ order, key, from, to }) => {
      const active = keys.findLast((event) => event.order < order)
      assert(active?.type === 'keydown' && active.key === key, `unbound step at ${order}`)
      return { order, key, from: grid(from), to: grid(to) }
    })
    return {
      id: inputPlan.id,
      steps,
      completion: { ...completion, position: grid(completion.position) },
    }
  })
  const end = report.endWorld
  const position = game
    ? [terminal.gs.party.x, terminal.gs.party.y]
    : [terminal.position.pos.col, terminal.position.pos.row]
  assert.equal(game ? terminal.gs.wNumScene : terminal.position.sceneId, game ? 18 : 's017')
  assert.equal(end.controlReturned, true)
  assert.deepEqual(routes[1].completion, {
    scene: end.scene,
    position: grid(end.position),
    mode: 'ready',
  })
  assert.deepEqual(grid(position), routes[1].completion.position)
  return routes
}

function firstDifference(game, reforge, compare = same) {
  const index = Array.from({ length: Math.max(game.length, reforge.length) }).findIndex(
    (_, i) => !compare(game[i], reforge[i]),
  )
  return index < 0
    ? null
    : { step: index + 1, game: game[index] ?? null, reforge: reforge[index] ?? null }
}

function compareRoute(left, right) {
  const legs = left.map((game, i) => {
    const reforge = right[i]
    assert.equal(game.id, reforge.id)
    const step = (event) => event && { key: event.key, from: event.from, to: event.to }
    const difference = firstDifference(game.steps, reforge.steps, (a, b) => same(step(a), step(b)))
    assert.deepEqual(game.completion, reforge.completion)
    return {
      id: game.id,
      moves: game.steps.length,
      completion: game.completion,
      firstDifference: difference,
    }
  })
  return { status: legs.some((leg) => leg.firstDifference) ? 'rejected' : 'proved', legs }
}

function normalizedBattles({ report, trace, terminal }, route, originals) {
  const game = report.engine === 'game'
  const grid = (point) => continuousGrid(point, report.engine)
  const leg = report.route.legs[1]
  const within = ({ order }) => leg.startOrder < order && order <= leg.endOrder
  const rawBattles = trace.causes.filter(
    (e) => within(e) && e.phase === 'command' && e.command?.opcode === 7,
  )
  const hides = trace.events.filter(
    (e) =>
      within(e) &&
      e.kind === 'actor' &&
      originals.has(e.id) &&
      e.before?.visible &&
      !e.state.visible,
  )
  assert.deepEqual(
    hides.map(({ id }) => id),
    report.encounters.map(({ entityId }) => entityId),
  )
  if (game) assert.equal(rawBattles.length, report.encounters.length)
  const confirms = trace.inputs.filter(
    (e) => within(e) && e.key === 'Enter' && e.type === 'keydown',
  )
  assert.equal(confirms.length, report.encounters.flatMap(({ screens }) => screens).length)
  assert.equal(
    new Set(report.encounters.map(({ entityId }) => entityId)).size,
    report.encounters.length,
  )
  const encounters = report.encounters.map((battle, i) => {
    const { entityId, teamId, before, after, screens } = battle
    assert.equal(battle.status, 'passed')
    assert.equal(teamId, originals.get(entityId)?.teamId)
    assert.deepEqual(before.party, game ? [0] : ['li-xiaoyao'])
    assert.equal(before.hidden, false)
    assert.deepEqual(after, { ...before, exp: after.exp, hidden: true })
    assert(screens.length > 0 && after.exp > before.exp)
    const hide = hides[i]
    const prior = route.steps.findLast(({ order }) => order < hide.order)
    const next = route.steps.find(({ order }) => order > hide.order)
    assert.deepEqual(prior?.to, grid(battle.position))
    assert(next && same(next.from, prior.to))
    const input = confirms.find((event) => prior.order < event.order && event.order < hide.order)
    assert(input && input.order < hide.order, 'settlement lacks a real confirmation before hide')
    const raw = rawBattles[i]
    if (game) {
      assert.equal(raw.actor, Number(entityId.slice(1)))
      assert.equal(raw.command.label, originals.get(entityId).trigger)
      assert.deepEqual(grid(raw.poses.party.state.position), prior.to)
      assert.deepEqual(grid(raw.poses[entityId].state.position), grid(hide.before.position))
    }
    return {
      outcome: {
        entityId,
        teamId,
        at: prior.to,
        screens: screens.length,
        exp: after.exp - before.exp,
        cash: after.cash - before.cash,
        soloHero: true,
      },
      enemyAt: grid(hide.before.position),
      orders: {
        party: prior.order,
        trigger: raw?.order ?? null,
        confirm: input.order,
        hide: hide.order,
        resumed: next.order,
      },
    }
  })
  const last = report.encounters.at(-1)?.after
  const exp = game ? terminal.gs.Exp.rgPrimaryExp[0].wExp : terminal.world.party[0].exp
  assert.equal(last?.exp, exp, 'checkpoint lost actual settlement EXP')
  return encounters
}

function pursuit({ report, trace }, route, original) {
  const game = report.engine === 'game'
  const grid = (point) => continuousGrid(point, report.engine)
  const actor = trace.events.filter(
    (e) => e.scene === scene && e.id === original.id && e.kind === 'actor',
  )
  assert.deepEqual(grid(actor[0]?.state.position), original.start)
  const commits = actor.filter(
    (e) =>
      e.source === (game ? 'commit:monsterChasePlayer' : 'commit:meta.entity.pos') &&
      e.before?.visible &&
      e.state.visible &&
      !same(e.before.position, e.state.position),
  )
  const draws = trace.events.filter(
    (e) =>
      e.scene === scene &&
      e.id === original.id &&
      e.kind === 'actor-render' &&
      e.state.drawStatus === 'drawn',
  )
  assert(commits.length && draws.length, `${original.id} lacks chase or draw samples`)
  const hide = actor.find((e) => e.before?.visible && !e.state.visible)
  return commits.map((e, i) => {
    const endOrder = commits[i + 1]?.order ?? hide?.order ?? report.route.legs[1].endOrder
    const position = grid(e.state.position)
    const party = route.steps.findLast(({ order }) => order < e.order)
    const presented = draws.filter(
      (draw) =>
        e.order < draw.order &&
        draw.order < endOrder &&
        draw.tick === e.tick &&
        same(grid(draw.state.position), position),
    )
    return {
      order: e.order,
      tick: e.tick,
      atMs: e.atMs,
      position,
      party: party?.to ?? route.steps[0].from,
      frames: [...new Set(presented.map((draw) => draw.state.frame))],
      drawOrders: presented.map(({ order }) => order),
    }
  })
}

async function originalHostiles(root, report, semanticSources) {
  const readPinned = async (path) => {
    const bytes = await readFile(resolve(root, path))
    const digest = createHash('sha256').update(bytes).digest('hex')
    assert.equal(digest, semanticSources[path])
    assert.equal(digest, report.hashes[path])
    return JSON.parse(bytes)
  }
  const [{ eventObjects }, { segments }] = await Promise.all([
    readPinned(eventPath),
    readPinned(scriptPath),
  ])
  const commands = segments.find(({ name }) => name === 'all').commands
  return new Map(
    enemyIds.map((id) => {
      const event = eventObjects.find((entry) => entry.id === id)
      const chase = commands.find(({ label }) => label === event.autoLabel)
      const trigger = commands.find(({ label }) => label === event.triggerLabel)
      assert.equal(chase.opcode, 0x4c)
      assert.equal(trigger.opcode, 0x07)
      return [
        `e${id}`,
        {
          id: `e${id}`,
          start: continuousGrid([event.x, event.y], 'game'),
          trigger: event.triggerLabel,
          teamId: `team-${trigger.operands[0]}`,
          triggerMode: event.triggerMode,
          chase,
        },
      ]
    }),
  )
}

function compareChase(game, reforge, left, right, originals) {
  const actors = [...originals.values()].map((original) => {
    const paths = [pursuit(game, left, original), pursuit(reforge, right, original)]
    const samePose = (a, b) => same(a?.position, b?.position) && same(a?.party, b?.party)
    const firstPositionDifference = firstDifference(...paths, samePose)
    // Compare frames drawn at corresponding steps with actual Game presentation evidence.
    const firstFrameDifference = firstDifference(
      ...paths,
      (a, b) => !samePose(a, b) || !a?.frames.length || same(a.frames, b?.frames),
    )
    return {
      original,
      firstPositionDifference,
      firstFrameDifference,
      game: paths[0],
      reforge: paths[1],
    }
  })
  return {
    status: actors.some((actor) => actor.firstPositionDifference || actor.firstFrameDifference)
      ? 'rejected'
      : 'proved',
    actors,
  }
}

export async function recompareIslandEntrance(root, gamePath, reforgePath) {
  const [game, reforge] = await Promise.all([
    readRecording(gamePath, 'game'),
    readRecording(reforgePath, 'reforge'),
  ])
  return recompareBoundStory({
    root,
    fragment: '007',
    recordings: [game, reforge],
    semanticPaths: [eventPath, scriptPath],
    scope:
      '007 committed route, ordinary battle triggers and settlements, hostile pursuit and actual sprite draws, and native checkpoint handoff.',
    async compare({ semanticSources }) {
      const originals = await originalHostiles(root, game.report, semanticSources)
      const left = measuredRoute(game)
      const right = measuredRoute(reforge)
      const route = compareRoute(left, right)
      const battles = [
        normalizedBattles(game, left[1], originals),
        normalizedBattles(reforge, right[1], originals),
      ]
      const firstEncounterDifference = firstDifference(...battles, (a, b) =>
        same(a?.outcome, b?.outcome),
      )
      const firstContactDifference = firstDifference(
        ...battles,
        (a, b) => a?.outcome.entityId !== b?.outcome.entityId || same(a?.enemyAt, b?.enemyAt),
      )
      const encounters = {
        status: firstEncounterDifference || firstContactDifference ? 'rejected' : 'proved',
        firstEncounterDifference,
        firstContactDifference,
        game: battles[0],
        reforge: battles[1],
      }
      const chase = compareChase(game, reforge, left[1], right[1], originals)
      const proofs = { route, encounters, chase }
      return {
        ...proofs,
        findings: Object.entries(proofs).flatMap(([field, proof]) =>
          proof.status === 'proved'
            ? []
            : [{ type: 'island-entrance', field, status: proof.status }],
        ),
      }
    },
  })
}
