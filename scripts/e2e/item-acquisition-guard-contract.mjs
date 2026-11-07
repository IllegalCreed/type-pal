import assert from 'node:assert/strict'
import { writeEvidenceArtifact } from './evidence-artifact.mjs'

/** These are the existing journeys' actual interaction positions, not preview overrides. */
export const ITEM_GUARD_SAMPLES = Object.freeze({
  e235: {
    fragment: '008',
    scene: 's017',
    position: [99, -14, 0],
    facing: 'up',
    emptyText: 'dlg.1575',
    items: ['108'],
  },
  e263: {
    fragment: '008',
    scene: 's017',
    position: [70, -17, 0],
    facing: 'right',
    emptyText: 'dlg.12222',
    items: ['67', '68', '69', '70', '71'],
  },
  e233: {
    fragment: '009',
    scene: 's016',
    position: [44, -11, 0],
    facing: 'left',
    items: ['99'],
  },
})

export function assertItemGuardSeed(payload, entity) {
  const sample = ITEM_GUARD_SAMPLES[entity]
  assert(sample, 'unknown acquisition guard sample')
  const [col, row, height] = sample.position
  assert.deepEqual(
    payload.position,
    {
      sceneId: sample.scene,
      pos: { col, row, height },
      facing: sample.facing,
    },
    'acquisition guard must start at its actual normal-route interaction',
  )
  for (const item of sample.items)
    assert.equal(
      payload.world.inventory.find(({ itemId }) => itemId === item)?.count,
      1,
      'guard requires the already collected normal-route reward',
    )
  return sample
}

/** Read-only native serialization at a normal-route boundary; no extra story input is issued. */
export async function captureItemGuardSeed(page, out, report, entity) {
  const { payload, order } = await page.evaluate(async () => {
    const payload = await window.__tpE2e.dumpSave()
    return { payload, order: window.__readErrandDrive(Number.MAX_SAFE_INTEGER).order }
  })
  const sample = assertItemGuardSeed(payload, entity)
  assert.equal(report.fragment, sample.fragment)
  assert(Number.isSafeInteger(order) && order >= 0)
  report.itemGuardSeeds ??= []
  assert(!report.itemGuardSeeds.some((seed) => seed.entity === entity), 'duplicate native seed')
  report.itemGuardSeeds.push({
    entity,
    captureOrder: order,
    source: 'normal-route:dumpSave',
    checkpoint: await writeEvidenceArtifact(out, `${entity}.collected.save.json`, payload),
  })
}

const leaf = (event) => event.occurrence?.command?.command
const rewardKinds = new Set(['giveItem', 'giveMoney'])
const openingKinds = new Set(['playSound', 'setEntityFrame', 'setEntityFacing'])

/** Audit native effects and actual presentation as well as the unchanged final inventory.
 * Each range is a separate ordinary Enter interaction in a fresh restored browser.
 */
export function assertItemGuardRepeats({ trace, entity, ranges, before, after, locale }) {
  const sample = assertItemGuardSeed(before, entity)
  assertItemGuardSeed(after, entity)
  assert.deepEqual(after.world.inventory, before.world.inventory, 'repeat changed inventory')
  assert.equal(after.world.money, before.world.money, 'repeat changed money')
  assert.equal(ranges.length, 2, 'guard requires two separate native repeat attempts')
  const starts = trace.causes.filter((event) => event.phase === 'run-started')
  const proofs = []
  for (const [index, range] of ranges.entries()) {
    assert(range.startOrder < range.endOrder, 'repeat range has no observed runtime progress')
    if (index) assert(ranges[index - 1].endOrder <= range.startOrder)
    const within = ({ order }) => range.startOrder < order && order <= range.endOrder
    const keys = trace.inputs.filter(within)
    assert(keys.length >= 2, 'repeat has no actual native key pair')
    assert(keys.every(({ key, repeat }) => key === 'Enter' && !repeat))
    assert.deepEqual(
      keys.map(({ type }) => type),
      Array.from({ length: keys.length / 2 }, () => ['keydown', 'keyup']).flat(),
      'repeat native keys are unpaired',
    )
    assert(trace.worldRenders.some(within), 'repeat attempt did not reach an actual world render')
    const triggers = starts.filter((event) => within(event) && event.author?.channel === 'trigger')
    const effects = trace.causes.filter(
      (event) => within(event) && ['command', 'leaf-completed'].includes(event.phase),
    )
    assert(
      effects.every((event) => !rewardKinds.has(leaf(event)?.kind)),
      'repeat executed a reward even though its final inventory may match',
    )
    const draws = trace.events.filter(
      (event) =>
        event.kind === 'actor-render' &&
        event.id === entity &&
        event.scene === sample.scene &&
        event.order <= range.endOrder &&
        (event.throughOrder ?? event.order) > range.startOrder,
    )
    const pages = trace.pages.filter((event) => within(event) && event.page)
    if (!sample.emptyText) {
      assert.equal(triggers.length, 0, 'collected visible object dispatched another trigger')
      assert.equal(pages.length, 0, 'collected visible object displayed another prompt')
      assert(draws.length > 0, 'hidden object lacks actual renderer evidence')
      assert(
        draws.every(({ state }) => !state.visible && state.drawStatus === 'not-drawn'),
        'collected visible object respawned or was drawn',
      )
      proofs.push({ ...range, nativeKeys: keys.length, hiddenDraws: draws.length })
      continue
    }
    assert.equal(triggers.length, 1, 'empty search must dispatch exactly one real trigger')
    const [start] = triggers
    assert.equal(start.author.entity, entity)
    assert.equal(start.author.scene, sample.scene)
    const owned = new Set([start.runId])
    for (const run of starts) if (owned.has(run.parentRunId)) owned.add(run.runId)
    assert(
      effects
        .filter((event) => owned.has(event.runId))
        .every((event) => !openingKinds.has(leaf(event)?.kind)),
      'empty search reopened the object',
    )
    const ended = trace.causes.filter(
      (event) => within(event) && event.phase === 'run-ended' && event.runId === start.runId,
    )
    assert.equal(ended.length, 1, 'empty search did not complete its actual trigger')
    assert.equal(ended[0].aborted, false)
    assert(
      pages.some(({ page }) => page.pageTextIds?.includes(sample.emptyText)),
      'empty search did not show the original empty prompt',
    )
    assert(
      pages.every(({ page }) => page.pageTextIds?.every((id) => id === sample.emptyText)),
      'empty search displayed an acquisition or unexpected prompt',
    )
    const text = locale[sample.emptyText]
    assert(typeof text === 'string' && text.length > 0, 'empty prompt lacks source text')
    const painted = trace.causes.filter(
      (event) =>
        within(event) &&
        event.phase === 'dialogue-presentation' &&
        event.slots?.some((slot) => owned.has(slot.owner?.runId) && slot.visibleText === text),
    )
    assert(painted.length > 0, 'empty prompt never reached the actual renderer')
    if (entity === 'e263') {
      assert(draws.length > 0, 'opened chest lacks actual renderer evidence')
      assert(
        draws.every(
          ({ state }) =>
            state.visible &&
            state.drawStatus === 'drawn' &&
            state.frame === 1 &&
            state.facing === 'down',
        ),
        'empty chest lost its opened pose',
      )
    }
    proofs.push({
      ...range,
      runId: start.runId,
      nativeKeys: keys.length,
      emptyText: sample.emptyText,
      painted: painted.map(({ order }) => order),
    })
  }
  return proofs
}
