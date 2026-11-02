import assert from 'node:assert/strict'

const leaf = (event) => event.occurrence?.command?.command
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right)

/** A real binding replacement can retire a timer after settlement, without leaving
 * the scene. This certifies the cancelled activation, never an extra resumed leaf. */
export function verifyReplacedAutomaticWait(start, end, ended, draw, events) {
  const owner = start.occurrence?.self
  const one = (matches, label) => {
    assert.equal(matches.length, 1, `replaced wait lacks unique ${label}`)
    return matches[0]
  }
  const inFrame = (event) => {
    assert.equal(event.engine, 'reforge', 'replacement engine changed')
    assert.equal(event.scene, start.scene, 'replacement scene changed')
    assert.equal(event.sceneVisit, start.sceneVisit, 'replacement visit changed')
    assert.equal(event.clock?.frameId, end.clock.frameId, 'replacement missed settled frame')
  }
  assert(owner && Number.isSafeInteger(start.activityId), 'replacement lacks owned activity')
  const original = one(
    events.filter((event) => event.phase === 'run-started' && event.runId === start.runId),
    'original run',
  )
  assert.equal(original.timing, 'auto', 'replacement original is not automatic')
  assert.deepEqual(original.self, owner, 'replacement original owner differs')
  assert.equal(original.activityId, start.activityId, 'replacement original activity differs')
  assert.equal(original.author?.kind, 'entity-behavior', 'replacement lacks original author')
  assert.equal(original.author.channel, 'auto')
  assert.equal(original.author.scene, owner.scene)
  assert.equal(original.author.entity, owner.entity)
  assert.equal(typeof original.author.behavior, 'string')
  assert.equal(typeof original.author.sceneSession, 'string')
  const replacements = events.filter(
    (event) =>
      event.phase === 'command' &&
      event.order > end.order &&
      event.order < ended.order &&
      leaf(event)?.kind === 'selectEntityBehavior' &&
      leaf(event).channel === 'auto' &&
      same(leaf(event).target, owner),
  )
  const replacement = one(replacements, 'binding replacement')
  assert.notEqual(replacement.runId, start.runId, 'automatic runner replaced itself')
  const selection = leaf(replacement).selection
  assert.equal(selection?.kind, 'use', 'unclassified automatic replacement')
  assert.notEqual(selection.value, original.author?.behavior, 'automatic binding did not change')
  const completed = one(
    events.filter(
      (event) =>
        event.phase === 'leaf-completed' &&
        event.runId === replacement.runId &&
        event.occurrence?.id === replacement.occurrence.id,
    ),
    'successful replacement completion',
  )
  assert.equal(completed.source, 'script-runner-core', 'replacement lacks real completion')
  assert.deepEqual(completed.occurrence, replacement.occurrence)
  assert(completed.order > replacement.order && completed.order < draw.order)
  const aborted = one(
    events.filter(
      (event) => event.phase === 'auto-aborted' && event.activationId === start.activityId,
    ),
    'activation cancellation',
  )
  assert.equal(aborted.entity, owner.entity, 'cancelled another entity')
  assert.equal(aborted.sceneSession, original.author?.sceneSession, 'cancelled another session')
  assert.equal(aborted.aborted, true)
  assert.equal(aborted.error, null, 'automatic replacement concealed an execution error')
  assert(aborted.order > replacement.order && aborted.order < ended.order)
  const gate = one(
    events.filter(
      (event) =>
        event.phase === 'gate-wait' &&
        event.runId === start.runId &&
        event.order > end.order &&
        event.order < aborted.order,
    ),
    'settled wake gate',
  )
  const rejected = one(
    events.filter(
      (event) =>
        ['gate-ready', 'gate-rejected'].includes(event.phase) && event.gateId === gate.gateId,
    ),
    'wake gate rejection',
  )
  assert.equal(rejected.phase, 'gate-rejected', 'cancelled automatic wake gate resumed')
  for (const event of [gate, rejected]) {
    assert.equal(event.runId, start.runId)
    assert.equal(event.activityId, start.activityId)
    assert.equal(event.signalActivityId, start.activityId)
    assert.deepEqual(event.occurrence, start.occurrence)
  }
  assert(rejected.order > aborted.order && rejected.order < ended.order)
  assert.equal(rejected.aborted, true)
  const successor = one(
    events.filter(
      (event) =>
        event.phase === 'run-started' &&
        event.timing === 'auto' &&
        same(event.self, owner) &&
        event.author?.behavior === selection.value &&
        event.order > aborted.order &&
        event.order < draw.order,
    ),
    'successor automatic run',
  )
  assert(Number.isSafeInteger(successor.activityId), 'successor lacks actual activity')
  assert.notEqual(successor.activityId, start.activityId, 'replacement reused cancelled activity')
  assert.equal(successor.author.kind, 'entity-behavior')
  assert.equal(successor.author.channel, 'auto')
  assert.equal(successor.author.scene, owner.scene)
  assert.equal(successor.author.entity, owner.entity)
  assert.equal(successor.author.sceneSession, original.author.sceneSession)
  assert(
    !events.some(
      (event) =>
        event.runId === start.runId &&
        event.order > end.order &&
        ['command', 'stage-settled', 'gate-ready'].includes(event.phase),
    ),
    'cancelled automatic runner executed after settlement',
  )
  for (const event of [replacement, completed, aborted, gate, rejected, successor]) inFrame(event)
  return {
    replacement: replacement.order,
    completed: completed.order,
    aborted: aborted.order,
    rejected: rejected.order,
    successor: successor.order,
  }
}
