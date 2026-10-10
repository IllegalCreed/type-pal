import { isDeepStrictEqual } from 'node:util'

/** A failed proof obligation is not a runtime exception or a successful empty comparison. */
export class TraceObligation extends Error {
  constructor(status, rule, expected, actual) {
    super(rule)
    this.status = status
    this.rule = rule
    this.expected = expected
    this.actual = actual
  }
}

export function requireTrace(condition, rule, expected, actual, status = 'rejected') {
  if (!condition) throw new TraceObligation(status, rule, expected, actual)
}

/** Deterministic labelled transition conformance: s[i+1] = delta(s[i], event[i]).
 * Unknown labels/initial evidence never imply stuttering. Models must declare the alphabet.
 * The first failing prefix is returned with its pre-state and source event (a replay witness).
 */
export function checkTransitionTrace(model, events) {
  let state = structuredClone(model.initial)
  let index = 0
  try {
    requireTrace(Array.isArray(events), 'trace-present', 'event array', events, 'unknown')
    for (const event of events) {
      const transition = Object.hasOwn(model.transitions, event.type)
        ? model.transitions[event.type]
        : undefined
      requireTrace(
        transition,
        'alphabet-closed',
        Object.keys(model.transitions),
        event.type,
        'unknown',
      )
      // Do not allow a failing transition to alter the witness pre-state.
      // A model may explicitly copy its mutable bookkeeping while sharing immutable
      // evidence entries. It must preserve the same failed-transition isolation.
      state = transition(model.copyState ? model.copyState(state) : structuredClone(state), event)
      index++
    }
    model.accept(state)
    return { status: 'proved', model: model.id, checked: index, final: state }
  } catch (error) {
    if (!(error instanceof TraceObligation)) throw error
    return {
      status: error.status,
      model: model.id,
      checked: index,
      witness: {
        index,
        event: events?.[index] ?? null,
        before: state,
        rule: error.rule,
        expected: error.expected,
        actual: error.actual,
      },
    }
  }
}

/** Timed observation equivalence, not endpoint equality or arbitrary resampling.
 * Only consecutive identical observations are silent; their elapsed duration remains in
 * the next change time and interval end. No numeric tolerance and no actor-specific filter.
 */
export function compareTimedObservations(left, right, fields) {
  const normalize = (trace) => {
    requireTrace(
      Array.isArray(fields) && fields.length > 0 && new Set(fields).size === fields.length,
      'observation-schema',
      'nonempty unique fields',
      fields,
      'unknown',
    )
    requireTrace(trace?.complete === true, 'observation-complete', true, trace?.complete, 'unknown')
    requireTrace(
      Number.isFinite(trace.duration) && trace.duration >= 0 && trace.samples?.length > 0,
      'observation-interval',
      'finite duration and initial sample',
      trace,
      'unknown',
    )
    let previous = -1
    const word = []
    for (const sample of trace.samples) {
      requireTrace(
        sample.state && isDeepStrictEqual(Object.keys(sample.state).sort(), [...fields].sort()),
        'observation-schema',
        fields,
        Object.keys(sample.state ?? {}),
        'unknown',
      )
      requireTrace(
        Number.isFinite(sample.time) &&
          sample.time >= 0 &&
          sample.time >= previous &&
          sample.time <= trace.duration,
        'observation-time',
        [previous, trace.duration],
        sample.time,
      )
      requireTrace(
        word.length || sample.time === 0,
        'observation-initial',
        0,
        sample.time,
        'unknown',
      )
      previous = sample.time
      if (!word.length || !isDeepStrictEqual(word.at(-1).state, sample.state)) word.push(sample)
    }
    return { duration: trace.duration, word }
  }
  try {
    const a = normalize(left),
      b = normalize(right)
    const index = a.word.findIndex((sample, i) => !isDeepStrictEqual(sample, b.word[i]))
    requireTrace(
      index === -1 && a.word.length === b.word.length,
      'timed-observation-equivalence',
      a.word[index < 0 ? a.word.length : index] ?? null,
      b.word[index < 0 ? a.word.length : index] ?? null,
    )
    requireTrace(a.duration === b.duration, 'observation-duration', a.duration, b.duration)
    return { status: 'proved', model: 'timed-observation-equivalence', changes: a.word.length }
  } catch (error) {
    if (!(error instanceof TraceObligation)) throw error
    return {
      status: error.status,
      model: 'timed-observation-equivalence',
      witness: { rule: error.rule, expected: error.expected, actual: error.actual },
    }
  }
}
