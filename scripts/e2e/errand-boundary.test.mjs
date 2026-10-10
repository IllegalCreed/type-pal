import assert from 'node:assert/strict'
import test from 'node:test'
import { assertErrandStoryBoundary, errandReadyPresentation } from './errand-contract.mjs'
import { errandDialogueReader } from './errand-journey.mjs'

test('005 ready receipt captures order and end world before asynchronous screenshot ticks', async (t) => {
  const previous = globalThis.window
  t.after(() => {
    if (previous === undefined) delete globalThis.window
    else globalThis.window = previous
  })
  const runtime = {
    sceneId: 's004',
    position: { col: 139, row: 34, height: 0 },
    facing: 'down',
    controllable: true,
    inputLocked: false,
    dialogue: null,
    menuActive: false,
    fadeBlack: 0,
  }
  let order = 41
  const world = { money: 550, npc: { col: 139.5, row: 34 } }
  globalThis.window = {
    __tpObserve: { readRuntime: () => runtime },
    __rfWorld: world,
    __rfScene: { entities: [] },
    __readErrandDrive: (after) => ({ order, after, pages: [], errors: [], overflow: false }),
  }
  const receipt = errandDialogueReader('reforge')(17)
  assert.equal(receipt.trace.after, 17)
  assert.equal(receipt.trace.order, 41)
  assert.deepEqual(receipt.world.world.npc, { col: 139.5, row: 34 })
  await Promise.resolve()
  order = 42
  world.npc.row = 34.25
  assert.equal(receipt.trace.order, 41)
  assert.equal(receipt.world.world.npc.row, 34, 'later draw must not rewrite terminal world')
  assert.notDeepEqual(receipt.world, errandDialogueReader('reforge')(17).world)
  runtime.dialogue = { phase: 'waiting-input' }
  assert.equal(errandDialogueReader('reforge')(17).world, null, 'open dialogue is not an end')
})

test('005 cannot borrow a successful draw or dialogue clear from after its story boundary', () => {
  const trace = {
    events: [{ kind: 'control', order: 5, state: true, sceneVisit: 2 }],
    worldRenders: [{ order: 6, sceneVisit: 2 }],
    pages: [
      { order: 4, page: { text: 'last' }, sceneVisit: 2 },
      { order: 7, page: null, sceneVisit: 2 },
    ],
  }
  const report = { storyScope: { end: { afterOrder: 7 } }, milestones: { news: { order: 7 } } }
  assertErrandStoryBoundary(trace, report)
  for (const mutate of [
    (value) => {
      value.worldRenders[0].order = 8
    },
    (value) => {
      value.worldRenders = []
    },
    (value) => {
      value.worldRenders[0].sceneVisit = 1
    },
    (value) => {
      value.pages.at(-1).order = 8
    },
    (value) => {
      value.events[0].state = false
    },
  ]) {
    const bad = structuredClone(trace)
    mutate(bad)
    assert.throws(() => assertErrandStoryBoundary(bad, report), /control-ready draw/)
  }
  assert.equal(
    errandReadyPresentation({
      pages: trace.pages,
      worldRender: { order: 3, sceneVisit: 2 },
      control: trace.events[0],
    }),
    false,
  )
})
