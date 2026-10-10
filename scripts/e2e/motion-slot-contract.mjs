import assert from 'node:assert/strict'
import { isDeepStrictEqual } from 'node:util'

/** Queue lifecycle only. Position, first eligible tick and draw obligations remain separate. */
export function verifyMotionSlotLifetimes(causes) {
  const slots = new Map(),
    dropped = []
  const owner = (event) => ({
    runId: event.runId,
    activityId: event.activityId,
    occurrence: event.occurrence,
  })
  for (const event of causes.filter(
    (e) => e.engine === 'reforge' && e.phase.startsWith('motion-slot-'),
  )) {
    const phase = event.phase.slice('motion-slot-'.length),
      command = event.occurrence?.command?.command
    assert(
      Number.isSafeInteger(event.runId) && command,
      'motion slot lacks actual script invocation',
    )
    assert(
      ['stepEntity', 'moveEntity', 'ride'].includes(command.kind),
      'motion slot has unclassified author',
    )
    assert.equal(event.entity, command.target.entity, 'motion slot targets wrong entity')
    assert.equal(event.input.scene, command.target.scene, 'motion slot targets wrong scene')
    if (command.kind === 'stepEntity')
      assert.equal(event.input.dir, command.dir, 'motion slot has wrong direction')
    else {
      assert.deepEqual(event.input.to, command.to, 'motion slot has wrong endpoint')
      assert.equal(event.input.speed, command.speed, 'motion slot has wrong speed')
    }
    if (phase === 'dropped') {
      assert.equal(command.kind, 'stepEntity')
      assert.equal(event.slotId, null)
      assert.equal(event.outcome, 'droppedByAuthority')
      assert(event.lifecycle?.authority?.[event.entity], 'immediate step drop lacks live authority')
      dropped.push(event)
      continue
    }
    assert(Number.isSafeInteger(event.slotId), 'motion slot identity missing')
    if (phase === 'registered') {
      assert(!slots.has(event.slotId), 'motion slot identity registered twice')
      assert.equal(
        event.slot.kind,
        command.kind === 'stepEntity' ? 'step' : 'move',
        'motion slot kind differs',
      )
      assert.equal(
        event.slot.source,
        event.occurrence.timing === 'auto' ? 'auto' : 'script',
        'motion slot source differs',
      )
      if (event.slot.source === 'auto') {
        assert.equal(
          event.slot.activationOwnerId,
          event.input.activation?.ownerId,
          'motion activation owner changed',
        )
        assert.equal(
          event.slot.activationEpoch,
          event.input.activation?.epoch,
          'motion activation epoch changed',
        )
        assert.equal(
          event.slot.activationOwnerId,
          event.occurrence.self.entity,
          'motion owned by another automatic caller',
        )
      }
      if (event.slot.kind === 'move') {
        assert.equal(
          event.slot.preserveFacing ?? false,
          event.input.preserveFacing ?? false,
          'motion facing policy differs',
        )
        const resumed = event.resumed
        const matches =
          resumed &&
          event.slot.source === 'auto' &&
          event.input.activation?.ownerId === resumed.owner &&
          isDeepStrictEqual(event.input.to, resumed.to) &&
          event.input.speed === resumed.speed
        assert.equal(
          event.slot.slowRestPending,
          matches ? resumed.slowRestPending : false,
          'motion resumed cadence phase differs',
        )
        assert.equal(
          event.slot.slowCadence,
          matches ? resumed.slowCadence : (event.input.slowCadence ?? true),
          'motion cadence policy differs',
        )
      }
      assert.deepEqual(
        event.current,
        event.slot,
        'registered motion slot differs from stored receipt',
      )
      slots.set(event.slotId, {
        registration: event,
        owner: owner(event),
        phase: 'registered',
        events: [event],
      })
    } else {
      const receipt = slots.get(event.slotId)
      assert(receipt, 'motion slot transition lacks registration')
      assert.deepEqual(
        owner(event),
        receipt.owner,
        'motion slot transition changed author occurrence',
      )
      assert.deepEqual(
        event.slot,
        receipt.registration.slot,
        'motion slot immutable identity changed',
      )
      assert(
        !['settled', 'cancelled'].includes(receipt.phase),
        'motion slot changed after terminal',
      )
      if (phase === 'committed')
        assert.equal(receipt.phase, 'registered', 'motion slot committed twice')
      else if (phase === 'settled') {
        if (event.slot.kind === 'step') {
          assert(
            ['attempted', 'droppedByAuthority'].includes(event.outcome),
            'step acknowledgement missing',
          )
          assert.equal(
            receipt.phase,
            event.outcome === 'attempted' ? 'committed' : 'registered',
            'step acknowledgement contradicts commit',
          )
        }
      } else {
        assert.equal(phase, 'cancelled', 'unclassified slot transition')
        // A move detaches at durable settlement. A one-shot can be aborted after its
        // live attempt but before its queued acknowledgement; the commit still exists.
        if (event.slot.kind === 'move')
          assert.equal(receipt.phase, 'registered', 'committed move cannot be cancelled')
      }
      receipt.phase = phase
      receipt.events.push(event)
    }
  }
  return { slots, dropped }
}
