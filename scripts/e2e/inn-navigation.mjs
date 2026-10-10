import assert from 'node:assert/strict'

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
