import assert from 'node:assert/strict'

/** Joint poses at actual completed world draws, derived only from committed actor records.
 * Intermediate nested setters are not simultaneous boat/party poses. The general NPC
 * contract still checks those commits; this projection proves the visible mounted relation.
 */
export function boatMotionEvidence(trace, startOrder, endOrder) {
  assert.equal(trace.overflow, false, 'boat source overflow')
  assert.deepEqual(trace.errors, [], 'boat source errors')
  const events = trace.events
    .filter((event) => event.kind === 'actor')
    .sort((a, b) => a.order - b.order)
  const current = new Map(),
    samples = []
  let cursor = 0
  for (const draw of trace.worldRenders) {
    while (cursor < events.length && events[cursor].order < draw.order) {
      const event = events[cursor++]
      current.set(`${event.sceneVisit}/${event.scene}/${event.id}`, event.state)
    }
    if (draw.scene !== 's005' || draw.order <= startOrder || draw.order > endOrder) continue
    const actor = (id) => current.get(`${draw.sceneVisit}/s005/${id}`)
    assert(
      actor('party')?.position && actor('e116')?.position && actor('e117')?.position,
      `boat draw ${draw.order} has no complete committed pose`,
    )
    const sample = {
      position: actor('party').position,
      facing: actor('party').facing,
      e116: actor('e116').position,
      e117: actor('e117').position,
      e123: actor('e123')?.position ?? null,
      e123Visible: actor('e123')?.visible ?? null,
    }
    const previous = samples.at(-1)
    if (!previous || JSON.stringify(previous.pose) !== JSON.stringify(sample))
      samples.push({ pose: structuredClone(sample), order: draw.order, renderId: draw.renderId })
  }
  assert(samples.length >= 3, 'missing committed/rendered boat motion')
  return samples.map(({ pose, ...identity }) => ({ ...pose, ...identity }))
}
