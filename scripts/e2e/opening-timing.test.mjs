import assert from 'node:assert/strict'
import test from 'node:test'
import { compareOpeningTiming, openingTiming } from './opening-timing.mjs'

function fixture(engine = 'game') {
  const p = (x) => (engine === 'game' ? [x, 0] : [50, x * 3, 0])
  const dialogue = (text, waiting = false) =>
    engine === 'game'
      ? { text, phase: waiting ? 'waiting-page-key' : 'typing' }
      : { pageText: text, phase: waiting ? 'waiting-input' : 'typing' }
  const ask = '一大早就有客人上门啦？',
    reply = '是啊．．还不快过来帮忙！'
  const rows = [
    { kind: 'initial', position: p(0), visible: false },
    { kind: 'actor', position: p(0) },
    { kind: 'move', from: p(0), position: p(1) },
    { kind: 'dialogue', position: p(1), dialogue: dialogue(ask) },
    { kind: 'dialogue', position: p(1), dialogue: dialogue(ask, true) },
    { kind: 'dialogue', position: p(1) },
    { kind: 'move', from: p(1), position: p(2) },
    { kind: 'actor', position: p(2) },
    { kind: 'dialogue', position: p(2), dialogue: dialogue(reply) },
    { kind: 'dialogue', position: p(2), dialogue: dialogue(reply, true) },
    { kind: 'dialogue', position: p(2) },
    { kind: 'move', from: p(2), position: p(3) },
    { kind: 'actor', position: p(3), visible: false },
    { kind: 'control', position: p(3), visible: false, control: true },
  ]
  return {
    errors: [],
    overflow: false,
    sources: {
      'commit:npcWalkTo': 3,
      'tick:tickEventSystem': 20,
      'render:world': 30,
      'commit:meta.entity.pos': 3,
      'render:dialogue': 10,
    },
    events: rows.map((r, seq) => ({
      engine,
      instance: 'room',
      npc: engine === 'game' ? 10 : 'e10',
      facing: seq < 7 ? 'down' : 'up',
      seq,
      atMs: seq,
      visible: true,
      control: false,
      dialogue: null,
      source: r.kind === 'move' ? 'commit:walk' : 'render:world',
      ...r,
    })),
  }
}
test('semantic two-engine comparison ignores unlike coordinates/clocks while proving ordered intervals', () => {
  const a = fixture(),
    b = fixture('reforge')
  b.events.forEach((e) => {
    e.atMs *= 100
  })
  const before = structuredClone([a, b])
  const result = compareOpeningTiming(a, b)
  assert.equal(result.status, 'passed')
  assert.deepEqual(result.game.movementStages, [1, 1, 1])
  assert.deepEqual([a, b], before)
})
test('out-and-back during dialogue is a semantic difference even though endpoints are identical', () => {
  const trace = fixture()
  const waiting = trace.events[4]
  trace.events.splice(
    5,
    0,
    { ...waiting, kind: 'move', source: 'commit:walk', from: [1, 0], position: [2, 0] },
    { ...waiting, kind: 'move', source: 'commit:walk', from: [2, 0], position: [1, 0] },
  )
  trace.events.forEach((e, i) => {
    e.seq = i
    e.atMs = i
  })
  const result = openingTiming(trace, 'game')
  assert.equal(result.status, 'different')
  assert.deepEqual(result.intervals[0].moveSequences, [5, 6])
})
test('incomplete, wrong identity, plan-only, missing wait, missing commit and fake control fail closed', () => {
  for (const mutate of [
    (t) => {
      t.overflow = true
    },
    (t) => {
      t.errors.push('lost event')
    },
    (t) => {
      t.events[2].source = 'plan:move'
    },
    (t) => {
      t.events[2].npc = 19
    },
    (t) => {
      t.events[4].dialogue.phase = 'typing'
    },
    (t) => {
      t.events[2].kind = 'actor'
    },
    (t) => {
      t.events.at(-1).control = false
    },
    (t) => {
      t.events[3].instance = 'another-room'
    },
    (t) => {
      t.events[2].seq = 99
    },
    (t) => {
      delete t.sources['commit:npcWalkTo']
    },
    (t) => {
      t.events.forEach((e) => {
        e.facing = 'down'
      })
    },
  ]) {
    const trace = fixture()
    mutate(trace)
    assert.throws(() => openingTiming(trace, 'game'))
  }
})
