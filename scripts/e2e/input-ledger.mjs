import assert from 'node:assert/strict'

export const INPUT_SCOPES = Object.freeze(['story', 'boundary'])
const BOUNDARY_PHASES = new Set(['bootstrap', 'save', 'restore', 'end-save'])

export function inputScope(phase, explicit) {
  const scope = explicit ?? (BOUNDARY_PHASES.has(phase) ? 'boundary' : 'story')
  assert(INPUT_SCOPES.includes(scope), `unknown input scope ${scope}`)
  return scope
}

/** Canonical input record. Callers may keep route/trace projections, but actions is the source. */
export function canonicalInput({ phase, scope, ...event }) {
  return { ...event, ...(phase ? { phase } : {}), scope: inputScope(phase, scope) }
}

/** Keep attempts, not invented successful inputs; even a partially failed down must be released. */
export async function withRecordedKey({
  keyboard,
  key,
  body = async () => {},
  onInput = () => {},
  metadata = {},
}) {
  const errors = []
  const hold = createRecordedHold({ keyboard, key, onInput, metadata })
  try {
    await hold.down()
    await body()
  } catch (error) {
    errors.push(error)
  } finally {
    try {
      await hold.up()
    } catch (error) {
      errors.push(error)
    }
  }
  if (errors.length === 1) throw errors[0]
  if (errors.length)
    throw new AggregateError(errors, 'real keyboard input failed', { cause: errors[0] })
}

/**
 * A held key has a lifetime longer than one callback.  Route strategies own that
 * lifetime, while this helper owns every real keyboard call and its receipt.
 * Callers retain this handle before down and release in finally, even after a
 * partial down failure. One lifetime has at most two up attempts; retry success
 * never erases the original failure. Repeated cleanup shares the same result.
 */
export function createRecordedHold({ keyboard, key, onInput = () => {}, metadata = {} }) {
  let downAttempted = false,
    releaseConfirmed = false,
    releasePromise
  const dispatch = async (kind, extra = {}, retry = false) => {
    const action = {
      ...metadata,
      ...extra,
      kind,
      key,
      atMs: Date.now(),
      execution: { status: 'pending', retry },
    }
    let recordingError
    try {
      onInput(action)
    } catch (error) {
      recordingError = error
    }
    try {
      if (recordingError && kind === 'down') throw recordingError
      await keyboard[kind](key)
      if (kind === 'up') releaseConfirmed = true
      if (recordingError) throw recordingError
      action.execution.status = 'completed'
    } catch (error) {
      action.execution.status = 'failed'
      action.execution.error = String(error)
      throw error
    } finally {
      action.execution.completedAtMs = Date.now()
    }
  }
  return {
    async down() {
      assert(!downAttempted && !releasePromise, `duplicate held keydown ${key}`)
      downAttempted = true
      await dispatch('down')
    },
    up(reason, metadata = {}) {
      assert(downAttempted, `keyup before keydown ${key}`)
      if (releasePromise) return releasePromise
      const extra = { ...metadata, ...(reason === undefined ? {} : { reason }) }
      releasePromise = (async () => {
        try {
          await dispatch('up', extra)
        } catch (error) {
          // Recording can fail after a successful physical up: no further key
          // dispatch is needed, but the run is still invalid.
          if (!releaseConfirmed) {
            try {
              await dispatch('up', extra, true)
            } catch (retryError) {
              throw new AggregateError([error, retryError], 'keyboard release failed', {
                cause: error,
              })
            }
          }
          throw error
        }
      })()
      return releasePromise
    },
    get held() {
      return downAttempted && !releaseConfirmed
    },
  }
}

export async function pressRecordedKey({ keyboard, action, record }) {
  const input = canonicalInput({ ...action, kind: 'press', atMs: Date.now() })
  input.execution = { status: 'pending', dispatches: [] }
  record(input)
  try {
    await withRecordedKey({
      keyboard,
      key: input.key,
      onInput: (event) => input.execution.dispatches.push(event),
    })
    input.execution.status = 'completed'
  } catch (error) {
    input.execution.status = 'failed'
    input.execution.error = String(error)
    throw error
  } finally {
    input.execution.completedAtMs = Date.now()
  }
  return input
}

const holdOwner = (action) => ({
  scope: inputScope(action.phase, action.scope),
  routeId: action.routeId,
  holdId: action.holdId,
  context: action.context,
  fragment: action.fragment,
})

/** One real-input session: retain partial downs and release them before leaving the caller. */
export async function withRecordedInputSession({ keyboard, record, body }) {
  const holds = new Map(),
    errors = []
  let result
  const execute = async (planned) => {
    const { execution: _execution, atMs: _atMs, ...metadata } = planned
    const action = canonicalInput(metadata)
    assert(
      ['press', 'down', 'up'].includes(action.kind ?? 'press'),
      `unknown input kind ${action.kind}`,
    )
    const held = holds.get(action.key)
    if (action.kind === 'down') {
      assert(!held, `duplicate keydown ${action.key}`)
      const hold = createRecordedHold({
        keyboard,
        key: action.key,
        metadata: action,
        onInput: record,
      })
      holds.set(action.key, { hold, owner: holdOwner(action) })
      await hold.down()
    } else if (action.kind === 'up') {
      assert(held, `unpaired keyup ${action.key}`)
      assert.deepEqual(held.owner, holdOwner(action), 'cross-owner keyup')
      await held.hold.up(action.reason, action)
      holds.delete(action.key)
    } else {
      assert(!held, `press while held ${action.key}`)
      await pressRecordedKey({ keyboard, action, record })
    }
  }
  try {
    result = await body(execute)
    assert.equal(holds.size, 0, 'input session ended with unreleased keys')
  } catch (error) {
    errors.push(error)
  } finally {
    for (const { hold } of holds.values()) {
      try {
        await hold.up('session cleanup')
      } catch (error) {
        if (!errors.includes(error)) errors.push(error)
      }
    }
  }
  if (errors.length === 1) throw errors[0]
  if (errors.length) throw new AggregateError(errors, 'input session failed', { cause: errors[0] })
  return result
}

/** Validate before scope trimming: a hold may never lose half its pair at a boundary. */
export function assertInputLedger(actions, { requireReceipts = false } = {}) {
  const held = new Map()
  for (const action of actions) {
    const scope = inputScope(action.phase, action.scope),
      kind = action.kind ?? 'press'
    assert(typeof action.key === 'string' && action.key.length, 'input requires a key')
    assert(['press', 'down', 'up'].includes(kind), `unknown input kind ${kind}`)
    if (requireReceipts || action.execution) {
      assert.equal(action.execution?.status, 'completed', 'input dispatch not completed')
      if (kind === 'press') {
        assert.deepEqual(
          action.execution.dispatches.map((event) => event.kind),
          ['down', 'up'],
          'press dispatch pair incomplete',
        )
        assert(
          action.execution.dispatches.every((event) => event.key === action.key),
          'press dispatch key mismatch',
        )
        assertInputLedger(action.execution.dispatches, { requireReceipts: true })
      }
    }
    if (kind === 'down') {
      assert(!held.has(action.key), `duplicate keydown ${action.key}`)
      held.set(action.key, holdOwner({ ...action, scope }))
    } else if (kind === 'up') {
      assert.deepEqual(
        held.get(action.key),
        holdOwner({ ...action, scope }),
        `unpaired/cross-scope keyup ${action.key}`,
      )
      held.delete(action.key)
    } else assert(!held.has(action.key), `press while held ${action.key}`)
  }
  assert.equal(held.size, 0, 'unreleased keydown')
}
