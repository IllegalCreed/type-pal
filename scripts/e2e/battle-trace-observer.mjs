import { evidenceObserverScript } from './evidence-recorder.mjs'

/** Runner-owned configuration is separate from the observer's source and contains no oracle. */
export function battleObserverScript(context) {
  return `globalThis.__battleTraceContext=${JSON.stringify(context)};${evidenceObserverScript(installBattleTraceObserver)}`
}

/** Browser serializable. All engine adapters submit facts; only the shared recorder assigns order. */
export function installBattleTraceObserver(context, createRecorder) {
  const input = context ?? globalThis.__battleTraceContext
  delete globalThis.__battleTraceContext
  if (
    !input ||
    !['game', 'reforge'].includes(input.engine) ||
    ![input.scenarioId, input.runId, input.random?.algorithm].every(
      (value) => typeof value === 'string' && value.trim(),
    ) ||
    !Number.isSafeInteger(input.random?.seed) ||
    input.random.seed < 0 ||
    input.random.seed > 0xffffffff ||
    typeof createRecorder !== 'function'
  )
    throw new Error('invalid battle evidence context')
  const identity = {
    engine: input.engine,
    scenarioId: input.scenarioId,
    runId: input.runId,
  }
  const random = structuredClone(input.random)
  const errors = [],
    starts = [],
    commands = [],
    actions = [],
    randomDraws = [],
    presentations = [],
    terminals = []
  let closed = false,
    overflow = false
  const recorder = createRecorder({
    context: () => identity,
    errors,
    onOverflow: () => {
      overflow = true
    },
  })
  const append = (list, value, requiresStart = true) => {
    try {
      if (closed) throw new Error('battle evidence is sealed')
      if (requiresStart && starts.length !== 1) throw new Error('battle evidence has no start')
      if (!value || typeof value !== 'object' || Array.isArray(value))
        throw new Error('invalid battle evidence fact')
      for (const key of ['order', 'seq', 'atMs', 'engine', 'runId', 'scenarioId'])
        if (Object.hasOwn(value, key)) throw new Error(`fact cannot replace evidence ${key}`)
      if (typeof value.source !== 'string' || !value.source.trim())
        throw new Error('battle evidence source is required')
      return recorder.append(list, { ...value, atMs: performance.now() })
    } catch (error) {
      recorder.fail(error)
      return undefined
    }
  }
  const port = {
    start(state, source) {
      if (starts.length) {
        recorder.fail('duplicate battle start')
        return
      }
      append(starts, { kind: 'battle-start', state, source }, false)
    },
    command(value) {
      append(commands, value)
    },
    action(value) {
      append(actions, value)
    },
    random(value, source) {
      if (!Number.isFinite(value) || value < 0 || value >= 1) {
        recorder.fail('invalid random draw')
        return
      }
      append(randomDraws, { kind: 'random-draw', index: randomDraws.length, value, source }, false)
    },
    presentation(value) {
      append(presentations, value)
    },
    terminal(value) {
      if (append(terminals, value)) closed = true
    },
    fail(error) {
      recorder.fail(error)
    },
    read() {
      return structuredClone({
        schemaVersion: 1,
        kind: 'battle-foundation-trace',
        ...identity,
        random,
        start: starts[0] ?? null,
        commands,
        actions,
        randomDraws,
        presentations,
        resources: recorder.resources(),
        terminal: terminals[0] ?? null,
        errors,
        overflow,
      })
    },
  }
  globalThis.__battleEvidence = Object.freeze(port)
}
