/** Rendering obligation only: a proven move remains a move even when its scene is
 * replaced before the renderer can see it. The caller still proves motion/pose semantics.
 */
export function movementDrawOpportunity(trace, move) {
  if (trace.overflow !== false || !Array.isArray(trace.errors) || trace.errors.length) return null
  const draws = trace.worldRenders ?? []
  const before = draws.findLast((draw) => draw.order < move.order)
  const after = draws.find((draw) => draw.order > move.order)
  if (
    !before ||
    !after ||
    before.scene !== move.scene ||
    before.sceneVisit !== move.sceneVisit ||
    after.sceneVisit === move.sceneVisit ||
    after.scene === move.scene ||
    after.previousRenderId !== before.renderId ||
    after.renderId !== before.renderId + 1
  )
    return null
  const boundaries = (trace.events ?? []).filter(
    (event) =>
      event.kind === 'scene-lifecycle' &&
      event.order > move.order &&
      event.order < after.order &&
      event.scene === after.scene &&
      event.sceneVisit === after.sceneVisit,
  )
  const materialized = boundaries.filter((event) => event.phase === 'materialized')
  const ready = boundaries.filter((event) => event.phase === 'ready')
  if (materialized.length !== 1 || ready.length !== 1 || materialized[0].order >= ready[0].order)
    return null
  return {
    kind: 'scene-exit-before-draw',
    commit: move.order,
    before: before.order,
    after: after.order,
    from: { scene: move.scene, visit: move.sceneVisit },
    to: { scene: after.scene, visit: after.sceneVisit },
    materialized: materialized[0].order,
    ready: ready[0].order,
  }
}
