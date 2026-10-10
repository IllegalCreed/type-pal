import assert from 'node:assert/strict'

/** Capture an explicit journey boundary from the observer's single ordered log. */
export function npcStoryBoundary(trace) {
  let afterOrder = -1
  for (const list of Object.values(trace)) {
    if (!Array.isArray(list)) continue
    for (const entry of list)
      if (Number.isSafeInteger(entry.order)) afterOrder = Math.max(afterOrder, entry.order)
  }
  return { afterOrder }
}

/** Keep raw initialization in its artifact; compare the observed baseline and actual story only. */
export function scopeNpcStoryTrace(trace, scope) {
  assert(scope?.start && scope?.end, 'NPC story trace requires explicit start/end boundaries')
  const from = scope.start.afterOrder,
    to = scope.end.afterOrder
  assert(
    Number.isSafeInteger(from) && from >= -1 && Number.isSafeInteger(to) && to >= from,
    'invalid NPC story order interval',
  )
  assert(to <= npcStoryBoundary(trace).afterOrder, 'NPC story end is outside the captured trace')
  const events = (trace.events ?? []).slice().sort((a, b) => a.order - b.order)
  const actors = new Map()
  const readyByVisit = new Map(
    events
      .filter((event) => event.kind === 'scene-lifecycle' && event.phase === 'ready')
      .map((event) => [`${event.sceneVisit}/${event.scene}`, event]),
  )
  const readyBaselines = new Map()
  let scene, control
  for (const event of events) {
    if (event.order > from) break
    if (event.kind === 'scene') {
      scene = event
      actors.clear()
      control = undefined
    }
    if (event.kind === 'actor') actors.set(event.id, event)
    if (event.kind === 'control') control = event
  }
  const baseline = [scene, ...actors.values(), control].filter(Boolean).map((event) => ({
    ...event,
    before: null,
    storyBaseline: true,
  }))
  for (const event of events) {
    if (event.kind !== 'actor' || event.sceneVisit === undefined) continue
    const ready = readyByVisit.get(`${event.sceneVisit}/${event.scene}`)
    if (!ready || ready.order <= from || ready.order > to || event.order > ready.order) continue
    readyBaselines.set(`${event.sceneVisit}/${event.scene}/${event.id}`, {
      ...event,
      before: null,
      order: ready.order,
      source: 'commit:scene-ready',
      storyBaseline: true,
    })
  }
  const inStory = (event) => event.order > from && event.order <= to
  const afterReady = (event) => {
    if (event.kind !== 'actor' || event.sceneVisit === undefined) return true
    const ready = readyByVisit.get(`${event.sceneVisit}/${event.scene}`)
    return !ready || event.order > ready.order
  }
  return {
    ...trace,
    events: [
      ...baseline,
      ...readyBaselines.values(),
      ...events.filter((event) =>
        event.kind === 'actor-render'
          ? event.order <= to && (event.throughOrder ?? event.order) > from
          : inStory(event) && afterReady(event),
      ),
    ].sort((a, b) => a.order - b.order),
    pages: (trace.pages ?? []).filter(inStory),
    causes: (trace.causes ?? []).filter(inStory),
    initialCauses: (trace.causes ?? []).filter((event) => event.order <= from),
    // Preserve independent lifecycle/control receipts for state-machine initialization.
    // A synthesized storyBaseline is a state observation, not proof of a scene reset.
    initialEvents: events.filter((event) => event.order <= from),
    // Spans retain their original clocks for losslessness validation. Expand first, then clip.
    renderScope: { afterOrder: from, throughOrder: to },
    storyScope: structuredClone(scope),
  }
}
