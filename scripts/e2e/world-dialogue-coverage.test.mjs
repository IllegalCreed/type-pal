import assert from 'node:assert/strict'
import { test } from 'node:test'
import vm from 'node:vm'
import { scriptedDefeatObserver } from './battle-scripted-defeat-observer.mjs'
import {
  compareWorldDialogueCast,
  inspectWorldDialogueCoverage,
} from './boss-entrances/world-dialogue-coverage.mjs'

function visit() {
  const scene = 's110'
  const actor = 'e2061'
  const cue = {
    scene,
    slot: 'top',
    speaker: null,
    portrait: null,
    portraitLayout: false,
    rows: [{ id: 'dlg.5863', ip: 16790, text: '请这边坐。' }],
  }
  const view = {
    scene,
    kind: 'world-drawn',
    atMs: 0,
    order: 0,
    visible: true,
    camera: [0, 0],
    leader: [160, 112],
    actors: {
      [actor]: {
        asset: 198,
        position: [80, 100],
        facing: 'down',
        frame: 0,
        rect: [70, 60, 20, 47],
      },
    },
  }
  const frames = [1, 2, 3, 4].map((atMs, renderId) => ({
    scene,
    kind: 'world-render',
    atMs,
    renderId,
    order: renderId + 1,
    dialogue: renderId < 3,
    backdrop: { dark: false, textured: true },
    view: 0,
  }))
  const { rows, ...identity } = cue
  return {
    phase: 'welcome',
    scene,
    start: 0,
    end: 5,
    expected: [cue],
    actors: [actor],
    events: [view, ...frames],
    draws: [
      {
        scene,
        atMs: 0.9,
        renderId: 0,
        slots: [{ ...identity, lines: rows.map(({ text }) => text) }],
      },
      { scene, atMs: 3.9, renderId: 3, slots: [] },
    ],
    background: true,
    locale: {},
  }
}

test('a visible welcome with a complete native frame span carries its source cue and actor draw', () => {
  const proof = inspectWorldDialogueCoverage(visit())
  assert.deepEqual(proof.issues, [])
  assert.equal(proof.expectedPages, 1)
  assert.equal(proof.backdrop.checkedFrames, 3)
  assert.deepEqual(proof.cues[0].views[0].view.cast.e2061, [198, [80, 100], 'down', 0])
})

test('the original top slot rejects an otherwise identical welcome painted below', () => {
  const input = visit()
  input.draws[0].slots[0].slot = 'bottom'
  const { issues } = inspectWorldDialogueCoverage(input)
  assert.deepEqual(
    issues.map(({ issue }) => issue),
    ['wrong-drawn-dialogue-identity'],
  )
})

test('a single submitted black background fails even when the dialogue overlay is still painted', () => {
  const input = visit()
  input.events[2].backdrop = { dark: true, textured: false }
  const { issues } = inspectWorldDialogueCoverage(input)
  assert(
    issues.some(({ issue, at }) => issue === 'dialogue-background-hidden' && at.renderId === 1),
  )
})

test('missing native frames and unbound dialogue output reject the coverage receipt', () => {
  const input = visit()
  input.events.splice(2, 1)
  input.draws[0].renderId = 1
  const { issues } = inspectWorldDialogueCoverage(input)
  for (const required of ['missing-submitted-world-frame', 'unbound-dialogue-draw'])
    assert(issues.some(({ issue }) => issue === required))
})

test('one actor turning for a single frame is still a failed comparison after the pose returns', () => {
  const input = visit()
  const original = inspectWorldDialogueCoverage(input)
  const wrong = structuredClone(input.events[0])
  wrong.atMs = 1.5
  wrong.order = 8
  wrong.actors.e2061.facing = 'right'
  wrong.actors.e2061.frame = 9
  input.events.splice(2, 0, wrong)
  input.events[3].view = wrong.order
  const candidate = inspectWorldDialogueCoverage(input)
  assert.deepEqual(candidate.issues, [])
  const result = compareWorldDialogueCast(original, candidate)
  assert.equal(result[0]?.issue, 'different-drawn-dialogue-formation')
  assert.deepEqual(
    result[0]?.actual.map(({ renderId }) => renderId),
    [0, 1, 2],
  )
})

test('native foreground frames keep later battle events within the recorder byte budgets', () => {
  const context = vm.createContext({ structuredClone, TextEncoder, performance })
  vm.runInContext(scriptedDefeatObserver({ engine: 'reforge', scene: 's110', seed: 1 }), context)
  const observer = context.__defeat
  for (let renderId = 0; renderId < 9000; renderId++)
    observer.event('world-render', { scene: 's110', renderId })
  observer.reforgeFinish({ enemySlotDefs: () => [] }, 'terminated', {
    party: [],
    money: 0,
    inventory: [],
  })
  assert.equal(observer.read().overflow, false)
  assert.equal(observer.read().outcome, 'terminated')
  assert.equal(observer.trace().events.at(-1).kind, 'battle-finished')
  assert.equal(observer.trace().events.at(-1).seq, 9000)

  observer.event('oversized', { text: 'x'.repeat(4 * 1024 * 1024) })
  assert.equal(observer.read().overflow, true)
  assert.equal(observer.trace().overflow, true)
  assert.equal(observer.trace().events.at(-1).kind, 'battle-finished')
})
