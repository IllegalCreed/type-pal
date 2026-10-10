import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { parseArgs } from 'node:util'
import objects from '../../data/extracted/data/event-objects.json' with { type: 'json' }
import { automaticLanguageGraphs } from './automatic-language-receipts.mjs'
import { verifyClosedAutomaticCycle } from './closed-automatic-cycle.mjs'
import { verifyMotionSlotLifetimes } from './motion-slot-contract.mjs'
import { movementTransitions, readNpcTrace } from './npc-transition-contract.mjs'
import { verifyRestoredAutomaticActivations } from './restored-automatic-cycle.mjs'
import { verifyRuntimeHandoffs } from './runtime-handoff-contract.mjs'
import { verifySelfAutomaticCycle } from './stationary-automatic-cycle.mjs'
import { verifyStoryMotion } from './story-motion-contract.mjs'
import { storyProofPrefix } from './story-presentation-intent.mjs'

// Opt-in experiment on an actual first-visit prefix. Does not publish acceptance.
const { values } = parseArgs({
  options: {
    acceptance: { type: 'string' },
    restored: { type: 'boolean', default: false },
  },
})
assert(values.acceptance, 'actual 005 acceptance path required')
const acceptance = JSON.parse(await readFile(values.acceptance, 'utf8'))
assert.equal(acceptance.fragment, '005')
assert.deepEqual(acceptance.sourceChanges, [])
assert.equal(acceptance.comparison.storyTiming.status, 'passed')
const evidence = await Promise.all(acceptance.recordings.map((r) => readNpcTrace(r.report.path)))
for (const [index, loaded] of evidence.entries()) {
  assert.equal(loaded.reportSha256, acceptance.recordings[index].report.sha256)
  assert.equal(loaded.traceSha256, acceptance.recordings[index].trace.sha256)
}
const [game, reforge] = evidence.map((e) => storyProofPrefix(e.trace, e.rawTrace)),
  bindings = acceptance.comparison.storyTiming.automaticLanguages.bindings
const moduleUrl = new URL('./closed-automatic-cycle.mjs', import.meta.url),
  current = await readFile(moduleUrl, 'utf8'),
  period = 'const phasePeriod = root.nSpriteFrames === 3 ? 4 : root.nSpriteFrames'
assert(current.includes(period), 'period mutation anchor changed')
const mutated = current
    .replace(period, 'const phasePeriod = 4')
    .replace(/from '([^']+)'/g, (whole, specifier) =>
      specifier.startsWith('.') ? `from '${new URL(specifier, moduleUrl).href}'` : whole,
    ),
  wrong = await import(`data:text/javascript;base64,${Buffer.from(mutated).toString('base64')}`)

function firstVisit(trace, binding, draws) {
  const visit = draws[0].sceneVisit,
    last = trace.worldRenders
      .filter((e) => e.scene === binding.scene && e.sceneVisit === visit)
      .at(-1)
  assert(last, 'actual first visit world draw missing')
  const clocks = trace.worldRenders.filter((e) => e.order <= last.order)
  return {
    ...trace,
    renderScope: { ...trace.renderScope, throughOrder: last.order },
    worldRenders: clocks,
    causes: trace.causes.filter((e) => e.order <= last.order),
    events: trace.events
      .filter((e) => e.order <= last.order)
      .map((e) => {
        if (
          e.kind !== 'actor-render' ||
          e.throughRenderId === undefined ||
          e.throughOrder <= last.order
        )
          return e
        const end = clocks
          .filter((c) => c.renderId >= e.renderId && c.renderId <= e.throughRenderId)
          .at(-1)
        assert(end, 'real span prefix lacks retained clock')
        return {
          ...e,
          throughRenderId: end.renderId,
          throughOrder: end.order,
          throughAtMs: end.atMs,
        }
      }),
  }
}
const results = []
for (const original of bindings.filter((b) => {
  const graph = automaticLanguageGraphs(b).source
  return (
    objects.eventObjects.find((o) => `e${o.id}` === b.entity)?.nSpriteFrames === 2 &&
    graph.nodes.some((node) => node.value?.kind === 'step') &&
    graph.nodes.every((node) => node.value?.kind !== 'frame' || node.value.value < 4)
  )
})) {
  const g = firstVisit(game, original, original.gameDraws),
    r = firstVisit(reforge, original, original.draws),
    through = r.renderScope.throughOrder,
    binding = {
      ...original,
      sourceCalls: original.sourceCalls.filter((c) => c.to <= g.renderScope.throughOrder),
      gameDraws: original.gameDraws.filter((d) => d.order <= g.renderScope.throughOrder),
      draws: original.draws.filter((d) => d.order <= through),
      runs: original.runs
        .filter((run) => r.causes.some((e) => e.phase === 'run-started' && e.runId === run.runId))
        .map((run) => ({
          ...run,
          outcome: 'proved-prefix',
          leaves: run.leaves
            .filter((leaf) => leaf.command <= through)
            .map((leaf) => ({
              ...leaf,
              completed: leaf.completed > through ? null : leaf.completed,
            })),
        })),
    },
    slots = verifyMotionSlotLifetimes(r.causes),
    handoffs = verifyRuntimeHandoffs(r),
    receipts = {
      slots,
      handoffs,
      motion: verifyStoryMotion(r, slots, [binding], movementTransitions, handoffs),
    }
  let restored = null
  if (values.restored) {
    const fullSlots = verifyMotionSlotLifetimes(reforge.causes),
      fullHandoffs = verifyRuntimeHandoffs(reforge),
      fullReceipts = {
        slots: fullSlots,
        handoffs: fullHandoffs,
        motion: verifyStoryMotion(
          reforge,
          fullSlots,
          [original],
          movementTransitions,
          fullHandoffs,
        ),
      }
    restored = verifyRestoredAutomaticActivations(game, reforge, original, fullReceipts)
    const staging = restored.restorations[0].staging,
      changedOrder = staging.at(1),
      changed = reforge.events.find(
        (event) =>
          event.kind === 'actor' &&
          event.scene === original.scene &&
          event.sceneVisit === restored.restorations[0].sceneVisit &&
          event.order === changedOrder,
      )
    assert(changed, 'actual restored staging counter input missing')
    const wrongStaging = {
      ...reforge,
      events: reforge.events.map((event) => {
        if (event !== changed) return event
        const variant = structuredClone(event)
        variant.state.position[0] += 1
        return variant
      }),
    }
    assert.throws(
      () => verifyRestoredAutomaticActivations(game, wrongStaging, original, fullReceipts),
      /staging loses causal position/,
      'restored projection staging must retain its own position evidence',
    )
  }
  const base = verifySelfAutomaticCycle(g, r, binding, { moving: true })
  console.log(
    JSON.stringify({
      entity: binding.entity,
      base: 'proved',
      sourceCutoff: g.renderScope.throughOrder,
      authoredCutoff: through,
      sourceCalls: base.sourceCalls,
      gameDraws: base.gameDraws,
      reforgeDraws: base.reforgeDraws,
    }),
  )
  results.push({
    closed: verifyClosedAutomaticCycle(g, r, binding, receipts),
    restored,
  })
  assert.throws(
    () => wrong.verifyClosedAutomaticCycle(g, r, binding, receipts),
    /closed source effect loses primary current frame/,
    'mod4 cannot impersonate actual layout2 progression',
  )
  for (const [engine, trace] of [
    ['game', g],
    ['reforge', r],
  ]) {
    const actual = trace.events.find(
        (e) =>
          e.kind === 'actor-render' &&
          e.source === 'render:world' &&
          e.id === binding.entity &&
          e.scene === binding.scene &&
          e.state.drawStatus === 'drawn' &&
          (e.throughOrder ?? e.order) > trace.renderScope.afterOrder &&
          e.order <= trace.renderScope.throughOrder,
      ),
      changed = structuredClone(actual)
    assert(actual, 'actual visible frame counter input missing')
    changed.state.frame ^= 1
    const variant = { ...trace, events: trace.events.map((e) => (e === actual ? changed : e)) }
    assert.throws(
      () =>
        verifyClosedAutomaticCycle(
          engine === 'game' ? variant : g,
          engine === 'reforge' ? variant : r,
          binding,
          receipts,
        ),
      assert.AssertionError,
      `${engine} actual layout2 drawn frame`,
    )
  }
}
assert.equal(results.length, 2, 'experiment requires both actual layout2 moving actors')
console.log(
  JSON.stringify({
    status: 'diagnostic-prefix-passed',
    results,
    note: 'No original files changed, no cross-visit or final E2E acceptance credit.',
  }),
)
