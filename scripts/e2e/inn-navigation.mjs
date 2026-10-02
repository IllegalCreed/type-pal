import assert from 'node:assert/strict'
import {
  planInnRoute,
  routeFrontierOpened,
  routeStepBlocked,
  TemporaryRouteObstruction,
} from './inn-route.mjs'

/** An obstruction replan must not restart the unchanged-position five-second deadline. */
export function createRouteProgressDeadline(now = () => performance.now()) {
  let prior,
    since = now()
  return (position) => {
    const key = JSON.stringify(position)
    if (key !== prior) {
      prior = key
      since = now()
    }
    const remaining = 5000 - (now() - since)
    assert(remaining > 0, 'normal input committed progress deadline exhausted')
    return remaining
  }
}

/** Wait with every key released; only a blocking frontier opening wakes the expensive planner. */
export async function waitForRouteOpening({
  error,
  engine,
  state,
  release,
  onReplan,
  read,
  until,
  inScene,
  ready,
  finished,
  remaining,
}) {
  if (!(error instanceof TemporaryRouteObstruction)) throw error
  await release('temporarily occupied route; wait without held keys')
  onReplan({
    kind: 'wait-for-clearance',
    position: state.position,
    frontier: error.frontier,
    actors: state.routeActors,
  })
  await until(
    read,
    (next) =>
      JSON.stringify(next.position) !== JSON.stringify(state.position) ||
      !inScene(next) ||
      !ready(next) ||
      finished(next) ||
      routeFrontierOpened(engine, error.frontier, next.routeActors),
    'temporary route occupation clears',
    remaining(state.position),
  )
}

/** Ordinary held input only. Progress observations are not an exact census of committed steps. */
export async function navigateInnRoute({
  engine,
  keyboard,
  map,
  read,
  until,
  health,
  grid,
  inScene,
  ready,
  destination,
  finished,
  onInput,
  onProgress,
  onReplan = () => {},
}) {
  let heldKey
  const remaining = createRouteProgressDeadline()
  const release = async (reason) => {
    if (heldKey === undefined) return
    const key = heldKey
    await keyboard.up(key)
    heldKey = undefined
    onInput({ kind: 'up', key, reason })
  }
  const cleanupInput = async () => {
    // One bounded cleanup retry. A failed dispatch still fails the run, even if cleanup succeeds.
    try {
      await release('route end or failure')
    } catch (error) {
      await release('retry failed release')
      throw error
    }
  }
  try {
    for (let n = 0; n < 120; n++) {
      health()
      const state = await read()
      if (finished(state)) return
      assert(inScene(state), 'route entered unexpected scene')
      assert(ready(state), 'unexpected script/dialogue while navigating')
      if (destination(...grid(state))) {
        await release('touch/scene boundary')
        await until(read, finished, 'actual touch/scene transition')
        return
      }
      remaining(state.position)
      let path
      try {
        path = planInnRoute(map, grid(state), destination, state.routeActors, engine)
      } catch (error) {
        await waitForRouteOpening({
          error,
          engine,
          state,
          release,
          onReplan,
          read,
          until,
          inScene,
          ready,
          finished,
          remaining,
        })
        continue
      }
      assert(path.length > 0)
      const key = path[0]
      if (key !== heldKey) {
        await release('turn')
        // Remember before down so finally also releases an input operation that partially fails.
        heldKey = key
        await keyboard.down(key)
        onInput({ kind: 'down', key, reason: 'normal held route' })
      }
      const before = state.position
      const observed = await until(
        read,
        (next) =>
          JSON.stringify(next.position) !== JSON.stringify(before) ||
          !inScene(next) ||
          !ready(next) ||
          finished(next) ||
          routeStepBlocked(engine, grid(next), key, next.routeActors),
        'normal input committed progress',
        remaining(before),
      )
      // Release immediately at the first observed scene/script boundary, not after another poll.
      if (finished(observed) || !inScene(observed) || !ready(observed))
        await release('route effect')
      const moved = JSON.stringify(before) !== JSON.stringify(observed.position)
      if (moved) {
        remaining(observed.position)
        onProgress({ key, from: before, to: observed.position })
      } else if (
        inScene(observed) &&
        ready(observed) &&
        !finished(observed) &&
        routeStepBlocked(engine, grid(observed), key, observed.routeActors)
      ) {
        await release('observed actor obstruction; replan held route')
        onReplan({ key, position: observed.position, actors: observed.routeActors })
      }
      if (finished(observed)) return
      if (!ready(observed)) {
        const settled = await until(
          read,
          (next) => finished(next) || ready(next),
          'route effect settles',
        )
        if (finished(settled)) return
        assert(inScene(settled), 'route entered unexpected scene')
      } else assert(inScene(observed), 'route entered unexpected scene')
    }
    throw new Error('normal route action budget exhausted')
  } finally {
    await cleanupInput()
  }
}

/** Actual observer commits, never interpolate missing cells from progress samples. */
export function committedInnMoves(trace, afterOrder) {
  assert(Number.isInteger(afterOrder) && afterOrder >= -1, 'invalid route start order')
  assert.equal(trace.overflow, false, 'inn movement collector overflow')
  assert.deepEqual(trace.errors, [], 'inn movement collector error')
  return trace.events.filter((event) => {
    assert(Number.isInteger(event.order), 'invalid movement evidence order')
    if (event.order <= afterOrder) return false
    if (event.kind !== 'actor' || event.id !== 'party' || !event.before) return false
    if (JSON.stringify(event.before.position) === JSON.stringify(event.state.position)) return false
    assert(event.source.startsWith('commit:'), 'unobserved normal route move')
    return true
  })
}

/** Ready-scene legs plus verified motion commit sources; a one-cell delta is not proof of walking. */
export function partitionInnMoves(moves, legs) {
  const steps = [],
    placements = []
  for (const move of moves) {
    const walking = legs.some(
      (leg) =>
        move.scene === leg.scene &&
        move.order > leg.startOrder &&
        move.order <= leg.endOrder &&
        leg.moveSources.includes(move.source),
    )
    if (walking) steps.push(move)
    else placements.push(move)
  }
  return { steps, placements }
}
