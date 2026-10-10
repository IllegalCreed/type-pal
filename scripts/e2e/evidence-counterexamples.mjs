import assert from 'node:assert/strict'
import { compareNpcStateTraces } from './npc-transition-contract.mjs'

/** A known incomplete recording can still falsify an independently proved obligation.
 * Never call it a passing baseline, and never count its pre-existing unknown as a rejection.
 */
export function assertCounterBaseline(comparison) {
  assert(
    comparison.findings.every((e) => e.proof?.status === 'unknown'),
    'counter baseline contains an actual failed obligation',
  )
  assert.equal(
    (comparison.holdIntent ?? comparison.innTiming ?? comparison.kitchenTiming).status,
    'passed',
  )
}

/** Shared evidence contract, exercised through the full comparator on captured callers. */
export function evidenceCounterexamples(game, reforge, fragment) {
  const baseline = compareNpcStateTraces(game, reforge, fragment)
  assertCounterBaseline(baseline)
  assert(!baseline.findings.some((e) => e.field === 'collector-integrity'))
  const variants = []
  for (const engine of ['game', 'reforge'])
    for (const [name, change] of [
      [
        'collector error',
        (t) => {
          t.errors = ['collector lost receipt']
        },
      ],
      [
        'collector overflow',
        (t) => {
          t.overflow = true
        },
      ],
      [
        'missing error receipt',
        (t) => {
          delete t.errors
        },
      ],
      [
        'missing overflow receipt',
        (t) => {
          delete t.overflow
        },
      ],
    ])
      variants.push([`${engine} ${name}`, engine, change, 'collector-integrity'])
  for (const phase of ['wait-start', 'wait-end'])
    variants.push([
      `reforge foreground ${phase} clock detached`,
      'reforge',
      (t) => {
        const start = t.causes.find(
          (e) =>
            e.phase === 'wait-start' &&
            e.occurrence?.timing === 'interactive' &&
            t.causes.some((end) => end.phase === 'wait-end' && end.waitId === e.waitId),
        )
        assert(start, 'clock counter requires an actual complete foreground wait')
        t.causes.find((e) => e.phase === phase && e.waitId === start.waitId).now += 100
      },
      null,
    ])
  return variants.map(([name, engine, change, field]) => {
    const traces = { game: structuredClone(game), reforge: structuredClone(reforge) }
    change(traces[engine])
    const result = compareNpcStateTraces(traces.game, traces.reforge, fragment)
    assert(result.findings.length, `comparator missed ${fragment}: ${name}`)
    if (field) assert(result.findings.some((e) => e.field === field && e.engine === engine))
    else
      assert(
        (result.holdIntent ?? result.innTiming ?? result.kitchenTiming).errors.some((e) =>
          e.includes('actual gameplay clock'),
        ),
      )
    return { name, status: 'rejected' }
  })
}
