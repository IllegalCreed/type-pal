import assert from 'node:assert/strict'
import test from 'node:test'
import { npcStoryBoundary, scopeNpcStoryTrace } from './npc-story-scope.mjs'
import {
  actorTransitions,
  compareNpcStateTraces,
  renderedPoseEvidence,
} from './npc-transition-contract.mjs'

test('story scope retains the actual restored baseline and every later change, not bootstrap moves', () => {
  const actor = (order, x, before) => ({
    kind: 'actor',
    order,
    scene: 's003',
    sceneVisit: 2,
    id: 'e56',
    state: { position: [x, 66, 0] },
    before: before === null ? null : { position: [before, 66, 0] },
  })
  const raw = {
    events: [
      { kind: 'scene', order: 0, scene: 's003', sceneVisit: 2 },
      actor(1, 124, null),
      actor(3, 137, 124),
      actor(6, 138, 137),
      actor(9, 999, 138),
    ],
    pages: [{ order: 2 }, { order: 7 }, { order: 10 }],
  }
  const before = structuredClone(raw)
  const scoped = scopeNpcStoryTrace(raw, { start: { afterOrder: 4 }, end: { afterOrder: 8 } })
  const states = actorTransitions(scoped, 'e56')
  assert.deepEqual(
    states.map((e) => e.state.position),
    [
      [137, 66, 0],
      [138, 66, 0],
    ],
  )
  assert.equal(states[0].before, null)
  assert.deepEqual(states[1].before.position, [137, 66, 0])
  assert.deepEqual(scoped.pages, [{ order: 7 }])
  assert.deepEqual(raw, before)
  const shifted = structuredClone(scoped)
  shifted.events.find((event) => event.id === 'e56').state.position[0] += 1
  const errors = compareNpcStateTraces(scoped, shifted, '003').findings
  assert(
    errors.some(
      (finding) =>
        finding.id === 'e56' &&
        finding.type === 'actor-position-boundary' &&
        finding.boundary === 'initial',
    ),
  )
  const changed = structuredClone(scoped)
  changed.events.find((event) => event.order === 6).state.position[0] += 1
  assert(
    compareNpcStateTraces(scoped, changed, '003').findings.some(
      (finding) =>
        finding.id === 'e56' &&
        finding.type === 'actor-position-boundary' &&
        finding.boundary === 'final',
    ),
  )
  assert.throws(() => scopeNpcStoryTrace(raw, null), /explicit start\/end/)
  assert.throws(
    () => scopeNpcStoryTrace(raw, { start: { afterOrder: 9 }, end: { afterOrder: 8 } }),
    /interval/,
  )
})

test('story scope uses the last actor state at scene-ready as the baseline', () => {
  const raw = {
    events: [
      { kind: 'scene', order: 0, scene: 's001', sceneVisit: 2 },
      {
        kind: 'actor',
        order: 2,
        scene: 's001',
        sceneVisit: 2,
        id: 'e19',
        before: null,
        state: { position: [89, 45, 0], visible: false, state: 0 },
      },
      {
        kind: 'actor',
        order: 4,
        scene: 's001',
        sceneVisit: 2,
        id: 'e19',
        before: { visible: false },
        state: { position: [89, 45, 0], visible: true, state: 2 },
      },
      { kind: 'scene-lifecycle', phase: 'ready', order: 5, scene: 's001', sceneVisit: 2 },
      {
        kind: 'actor',
        order: 7,
        scene: 's001',
        sceneVisit: 2,
        id: 'e19',
        before: { visible: true },
        state: { position: [90, 45, 0], visible: true, state: 2 },
      },
      { kind: 'control', order: 8, state: true },
    ],
  }
  const scoped = scopeNpcStoryTrace(raw, { start: { afterOrder: 0 }, end: { afterOrder: 8 } })
  const states = actorTransitions(scoped, 'e19')
  assert.deepEqual(
    states.map(({ order, state }) => ({ order, state })),
    [
      { order: 5, state: { position: [89, 45, 0], visible: true, state: 2 } },
      { order: 7, state: { position: [90, 45, 0], visible: true, state: 2 } },
    ],
  )
  assert.equal(states[0].before, null)
  assert.deepEqual(raw.events[1].state, { position: [89, 45, 0], visible: false, state: 0 })
})

test('a render span crossing both story boundaries validates all clocks but exposes only story draws', () => {
  const clocks = [1, 2, 3, 4].map((renderId) => ({
    renderId,
    order: renderId * 10,
    tick: renderId,
    atMs: renderId * 100,
    scene: 's003',
    sceneVisit: 2,
  }))
  const raw = {
    worldRenders: clocks,
    events: [
      {
        kind: 'actor-render',
        id: 'e56',
        source: 'render:world',
        scene: 's003',
        sceneVisit: 2,
        renderId: 1,
        order: 11,
        tick: 1,
        atMs: 100,
        throughRenderId: 4,
        throughOrder: 40,
        throughAtMs: 400,
        state: { position: [137, 66, 0], frame: 0, facing: 'down', visible: true },
      },
    ],
  }
  const scoped = scopeNpcStoryTrace(raw, { start: { afterOrder: 15 }, end: { afterOrder: 35 } })
  assert.deepEqual(
    renderedPoseEvidence(scoped, 'e56').map((e) => e.renderId),
    [2, 3],
  )
  scoped.worldRenders = clocks.slice(1)
  assert.throws(() => renderedPoseEvidence(scoped, 'e56'), /incomplete render span/)
})

test('boundary capture includes the render-clock sink, not just the last actor event', () => {
  assert.deepEqual(npcStoryBoundary({ events: [{ order: 3 }], worldRenders: [{ order: 9 }] }), {
    afterOrder: 9,
  })
  assert.deepEqual(npcStoryBoundary({ events: [] }), { afterOrder: -1 })
})
