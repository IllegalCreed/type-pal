import assert from 'node:assert/strict'
import { test } from 'node:test'
import { assertItemGuardRepeats, assertItemGuardSeed } from './item-acquisition-guard-contract.mjs'

// Serialized recording DTOs exercise the offline verifier, not a simulated game or runtime.
function recording() {
  const before = {
    position: { sceneId: 's017', pos: { col: 70, row: -17, height: 0 }, facing: 'right' },
    world: {
      money: 550,
      inventory: ['67', '68', '69', '70', '71'].map((itemId) => ({ itemId, count: 1 })),
    },
  }
  const trace = { causes: [], pages: [], worldRenders: [], events: [], inputs: [] }
  const ranges = [0, 20].map((startOrder, index) => {
    const runId = `empty-${index}`
    trace.inputs.push(
      ...['keydown', 'keyup', 'keydown', 'keyup'].map((type, i) => ({
        order: startOrder + i + 1,
        key: 'Enter',
        type,
        repeat: false,
      })),
    )
    trace.causes.push(
      {
        order: startOrder + 5,
        phase: 'run-started',
        runId,
        author: { scene: 's017', entity: 'e263', channel: 'trigger' },
      },
      {
        order: startOrder + 7,
        phase: 'dialogue-presentation',
        slots: [{ owner: { runId }, visibleText: '一个空箱子．．' }],
      },
      { order: startOrder + 8, phase: 'run-ended', runId, aborted: false },
    )
    trace.pages.push({ order: startOrder + 6, page: { pageTextIds: ['dlg.12222'] } })
    trace.worldRenders.push({ order: startOrder + 9 })
    trace.events.push({
      order: startOrder + 9,
      throughOrder: startOrder + 10,
      kind: 'actor-render',
      id: 'e263',
      scene: 's017',
      state: { visible: true, drawStatus: 'drawn', frame: 1, facing: 'down' },
    })
    return { startOrder, endOrder: startOrder + 10 }
  })
  return {
    trace,
    entity: 'e263',
    ranges,
    before,
    after: structuredClone(before),
    locale: { 'dlg.12222': '一个空箱子．．' },
  }
}

test('empty acquisition recording needs native dispatch, original painted prompt and preserved open pose', () => {
  assert.equal(assertItemGuardRepeats(recording()).length, 2)
  const corruptions = [
    [
      (r) => {
        r.trace.inputs = []
      },
      /actual native key pair/,
    ],
    [
      (r) => {
        r.trace.causes = r.trace.causes.filter((e) => e.phase !== 'run-started')
      },
      /exactly one real trigger/,
    ],
    [
      (r) => {
        r.trace.causes = r.trace.causes.filter((e) => e.phase !== 'dialogue-presentation')
      },
      /actual renderer/,
    ],
    [
      (r) => {
        r.trace.pages[0].page.pageTextIds = ['dlg.1895']
      },
      /original empty prompt/,
    ],
    [
      (r) => {
        r.trace.events[0].state.frame = 0
      },
      /opened pose/,
    ],
    [
      (r) => {
        r.trace.worldRenders = []
      },
      /actual world render/,
    ],
    [
      (r) => {
        r.trace.causes[2].aborted = true
      },
      /true !== false/,
    ],
  ]
  for (const [corrupt, message] of corruptions) {
    const candidate = recording()
    corrupt(candidate)
    assert.throws(() => assertItemGuardRepeats(candidate), message)
  }
})

test('unchanged final inventory cannot conceal a repeated grant or opening effect', () => {
  for (const kind of ['giveItem', 'giveMoney', 'playSound', 'setEntityFrame', 'setEntityFacing']) {
    const candidate = recording()
    candidate.trace.causes.push({
      order: 6,
      phase: 'leaf-completed',
      runId: 'empty-0',
      occurrence: { command: { command: { kind } } },
    })
    assert.throws(() => assertItemGuardRepeats(candidate), /repeat executed a reward|reopened/)
  }
})

test('collected visible herb requires observed hidden renders and zero repeat dispatches', () => {
  const candidate = recording()
  candidate.entity = 'e233'
  candidate.before = {
    position: { sceneId: 's016', pos: { col: 44, row: -11, height: 0 }, facing: 'left' },
    world: { money: 550, inventory: [{ itemId: '99', count: 1 }] },
  }
  candidate.after = structuredClone(candidate.before)
  candidate.trace.causes = []
  candidate.trace.pages = []
  for (const event of candidate.trace.events) {
    event.id = 'e233'
    event.scene = 's016'
    event.state = { visible: false, drawStatus: 'not-drawn' }
  }
  assert.equal(assertItemGuardRepeats(candidate).length, 2)
  const respawned = structuredClone(candidate)
  respawned.trace.events[0].state = { visible: true, drawStatus: 'drawn' }
  assert.throws(() => assertItemGuardRepeats(respawned), /respawned or was drawn/)
  const retriggered = structuredClone(candidate)
  retriggered.trace.causes.push({ phase: 'run-started', order: 5, author: { channel: 'trigger' } })
  assert.throws(() => assertItemGuardRepeats(retriggered), /dispatched another trigger/)
  const moved = structuredClone(candidate.before)
  moved.position.pos.col++
  assert.throws(() => assertItemGuardSeed(moved, 'e233'), /actual normal-route interaction/)
})
