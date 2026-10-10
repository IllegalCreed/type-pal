import assert from 'node:assert/strict'

/** Original input is a different obligation from the subsequently projected world.
 * Callers obtain expectedPayload from the byte-bound checkpoint, never from this trace.
 */
export function assertReforgeRestoreInput(trace, expectedPayload) {
  // restorePayload receives the validated current save, not the preflight file.
  // Independently model only the two defaults explicitly permitted by that schema;
  // never project fields away or use the recorded input as its own oracle.
  const expectedInput = structuredClone(expectedPayload)
  assert(expectedInput.world && !Array.isArray(expectedInput.world), 'restore world missing')
  if (!Object.hasOwn(expectedInput.world, 'skillUseCounts')) expectedInput.world.skillUseCounts = {}
  if (expectedInput.world.entityLifecycles === undefined) expectedInput.world.entityLifecycles = {}
  assert.equal(trace.restoreCommits?.length, 1, 'restore input requires one actual committed load')
  const restore = trace.restoreCommits[0]
  assert(
    Number.isSafeInteger(restore.loadId) && restore.loadId > 0,
    'restore input load identity missing',
  )
  assert.equal(restore.source, 'commit:restorePayload', 'restore input source differs')
  assert.deepEqual(
    restore.inputPayload,
    expectedInput,
    'actual restore input differs from normalized current checkpoint',
  )
  const loaded = trace.causes.filter((event) => event.phase === 'runtime-loaded')
  assert(
    loaded.every((event) => event.loadId === restore.loadId),
    'runtime loaded from another input identity',
  )
  assert.deepEqual(
    loaded.map((event) => event.scene).sort(),
    Object.keys(expectedPayload.sceneRuntime).sort(),
    'restore runtime scene census differs',
  )
  for (const event of loaded) {
    assert.deepEqual(
      event.saved,
      expectedPayload.sceneRuntime[event.scene],
      'restored scene differs from checkpoint input',
    )
    assert(event.order < restore.order, 'runtime load occurred after successful restore receipt')
  }
  return {
    loadId: restore.loadId,
    scenes: loaded.map((event) => event.scene),
    order: restore.order,
  }
}
