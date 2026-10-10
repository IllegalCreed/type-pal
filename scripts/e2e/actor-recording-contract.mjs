import assert from 'node:assert/strict'

/** Producer gate for new captures. Archived evidence is assessed by the offline proof model. */
export function assertActorRecording(trace, engine) {
  assert.equal(trace.overflow, false, 'actor recording overflow')
  assert.deepEqual(trace.errors, [], 'actor recording errors')
  const events = (trace.actors ?? trace.events).filter(
    (event) => event.kind === 'actor' && event.id !== 'party',
  )
  assert(events.length, 'actor recording empty')
  for (const event of events) {
    assert(
      Number.isInteger(event.order) && event.sceneVisit > 0 && event.source,
      'actor recording identity missing',
    )
    assert(Number.isInteger(event.state.state), `missing numeric state: ${event.id}`)
    for (const field of engine === 'game'
      ? ['trigger', 'resume', 'auto', 'autoIp', 'triggerMode']
      : ['behavior'])
      assert(
        Object.hasOwn(event.state, field) && event.state[field] !== undefined,
        `missing actor ${field}: ${event.id}`,
      )
  }
  return {
    status: 'passed',
    actors: events.length,
    fields: engine === 'game' ? 'native-state-and-script' : 'state-and-behavior-overrides',
  }
}
