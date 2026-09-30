import assert from 'node:assert/strict'
import { planInnRoute } from './inn-route.mjs'

/** Ordinary held input only. Progress observations are not an exact census of committed steps. */
export async function navigateInnRoute({
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
}) {
  let heldKey
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
      const path = planInnRoute(map, grid(state), destination, state.routeActors)
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
          finished(next),
        'normal input committed progress',
        5000,
      )
      // Release immediately at the first observed scene/script boundary, not after another poll.
      if (finished(observed) || !inScene(observed) || !ready(observed))
        await release('route effect')
      onProgress({ key, from: before, to: observed.position })
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
