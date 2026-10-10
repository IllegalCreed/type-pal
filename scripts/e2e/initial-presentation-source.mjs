import assert from 'node:assert/strict'

/** Use the actual same-visit actor observation preceding the first draw, never its displayed frame. */
export function initialPresentationGait(trace, id, scene, draw) {
  const seed = trace.events?.findLast(
    (event) =>
      event.kind === 'actor' &&
      event.id === id &&
      event.scene === scene &&
      event.sceneVisit === draw.sceneVisit &&
      event.order < draw.order,
  )
  const debug = seed?.state?.frameDebug
  assert(debug, `${id}: initial frame-selection inputs missing`)
  for (const key of ['override', 'gait', 'explicit', 'action'])
    assert(debug[key] === null || Number.isFinite(debug[key]), `${id}: invalid initial ${key}`)
  if (debug.override !== null || debug.gait === null) return false
  assert.equal(debug.gaitOwner?.source, 'auto', `${id}: unsupported initial gait owner`)
  assert.equal(debug.authority, 'world', `${id}: initial automatic gait already held`)
  return true
}
