import assert from 'node:assert/strict'
import test from 'node:test'
import dump from '../../data/extracted/data/event-objects.json' with { type: 'json' }
import author from '../../projects/pal/content/scenes/s003.json' with { type: 'json' }
import { verifyAutomaticSourceDraws } from './automatic-language-receipts.mjs'
import {
  verifyInnGamePresentation,
  verifyInnPresentation,
  verifyInnReadyContinuations,
} from './inn-presentation-intent.mjs'

const ids = ['e54', 'e55', 'e56', 'e59', 'e60', 'e61', 'e73', 'e74']
const command = (order, value) => ({
  order,
  scene: 's003',
  phase: 'command',
  runId: 1,
  occurrence: { self: { scene: 's003', entity: 'e56' }, command: { kind: 'leaf', command: value } },
})
// Collector-domain inputs: three completed draws, with legal current author commands between them.
function fixture() {
  const trace = {
    causes: [],
    events: ids.map((id) => ({
      kind: 'actor',
      id,
      scene: 's003',
      sceneVisit: 1,
      order: 1,
      state: {
        frameDebug: {
          override: null,
          gait: null,
          explicit: null,
          action: null,
          authority: 'world',
        },
      },
    })),
    renderScope: { afterOrder: 0, throughOrder: 40 },
    worldRenders: [1, 2, 3].map((renderId) => ({
      order: renderId * 10,
      renderId,
      sceneVisit: 1,
      scene: 's003',
      view: { transform: [1, 0, 0, 1, 0, 0], camera: [0, 0], canvasSize: [320, 200] },
    })),
  }
  const poses = Object.fromEntries(
    ids.map((id) => [
      id,
      trace.worldRenders.map((draw) => ({
        ...draw,
        position: [0, 0],
        facing: 'down',
        frame: 0,
        visible: true,
        frameSource: 'drawn',
        drawStatus: 'drawn',
        geometry: { worldRect: [-10, -33, 20, 40] },
      })),
    ]),
  )
  return { trace, poses, renders: (_trace, id) => poses[id] }
}
const reception = author.entities.find((entity) => entity.id === 'e56').behaviors.trigger.default
  .flow.stages[0].body

test('explicit turn is presented on the first draw and remains correct throughout the wait', () => {
  const { trace, poses, renders } = fixture()
  trace.causes = [
    command(
      14,
      reception.find((value) => value.kind === 'setEntityFacing' && value.facing === 'up'),
    ),
    command(
      15,
      reception.find((value) => value.kind === 'setEntityFrame'),
    ),
  ]
  for (const pose of poses.e56.slice(1)) Object.assign(pose, { facing: 'up', frame: 6 })
  assert.equal(verifyInnPresentation(trace, renders, () => [], []).actors.length, 8)
  for (const index of [1, 2]) {
    poses.e56[index].frame = 7
    assert.throws(
      () => verifyInnPresentation(trace, renders, () => [], []),
      /unexplained actual pose/u,
    )
    poses.e56[index].frame = 6
  }
})

test('hidden actor cannot reappear in the stationary tail after its hide command', () => {
  const { trace, poses, renders } = fixture()
  const hide = author.entities
    .find((entity) => entity.id === 'e59')
    .behaviors.auto['legacy-003'].flow.stages[0].body.find(
      (value) => value.kind === 'setEntityState' && value.state === 0,
    )
  trace.causes = [command(15, hide)]
  for (const pose of poses.e59.slice(1))
    Object.assign(pose, {
      visible: false,
      frame: null,
      frameSource: 'none',
      drawStatus: 'not-drawn',
    })
  verifyInnPresentation(trace, renders, () => [], [])
  Object.assign(poses.e59[2], {
    visible: true,
    frame: 0,
    frameSource: 'drawn',
    drawStatus: 'drawn',
  })
  assert.throws(
    () => verifyInnPresentation(trace, renders, () => [], []),
    /unexplained drawn visibility/u,
  )
})

test('opened door keeps the authored open frame, not a later closed-frame blink', () => {
  const { trace, poses, renders } = fixture()
  const open = author.entities
    .find((entity) => entity.id === 'e73')
    .behaviors.trigger.default.flow.stages[0].body.find(
      (value) => value.kind === 'selectEntityPage',
    )
  trace.causes = [command(15, open)]
  for (const pose of poses.e73.slice(1)) pose.frame = 1
  verifyInnPresentation(trace, renders, () => [], [])
  poses.e73[2].frame = 0
  assert.throws(
    () => verifyInnPresentation(trace, renders, () => [], []),
    /unexplained actual pose/u,
  )
})

test('reference standing holds require every actual draw and its committed local-frame mapping', () => {
  const { trace, poses, renders } = fixture()
  const states = (_trace, id) => [
    {
      order: 1,
      sceneVisit: 1,
      state: {
        position: [0, 0],
        facing: 'down',
        frame: 0,
        visible: true,
        sprite: dump.eventObjects.find((e) => `e${e.id}` === id).spriteNum,
      },
    },
  ]
  for (const pose of poses.e56) pose.order--
  const proof = verifyInnGamePresentation(trace, renders, states, (value) => value)
  assert.equal(proof.length, 8)
  assert.equal(verifyAutomaticSourceDraws(trace, { scene: 's003', entity: 'e56' }, proof).length, 3)
  for (const pose of poses.e56) pose.sceneVisit = 2
  assert.throws(
    () =>
      verifyInnGamePresentation(
        trace,
        renders,
        (t, id) => states(t, id).map((commit) => ({ ...commit, sceneVisit: id === 'e56' ? 2 : 1 })),
        (value) => value,
      ),
    /draw visit differs/,
  )
  for (const pose of poses.e56) pose.sceneVisit = 1
  for (const corrupt of [
    (p) => {
      p.drawBindings[1].order++
    },
    (p) => {
      p.drawBindings[1].renderId++
    },
    (p) => {
      p.drawBindings[1].sceneVisit++
    },
    (p) => {
      p.drawBindings.splice(1, 1)
    },
    (p) => {
      p.scene = 's004'
    },
  ]) {
    const changed = structuredClone(proof)
    corrupt(changed.find((p) => p.id === 'e56'))
    assert.throws(
      () => verifyAutomaticSourceDraws(trace, { scene: 's003', entity: 'e56' }, changed),
      /source actual draw proof/,
    )
  }
  poses.e56[1].frame = 1
  assert.throws(
    () => verifyInnGamePresentation(trace, renders, states, (value) => value),
    /unexplained actual frame/u,
  )
  poses.e56[1].frame = 0
  poses.e56.splice(1, 1)
  assert.throws(
    () => verifyInnGamePresentation(trace, renders, states, (value) => value),
    /coverage incomplete/u,
  )
})

test('instant command continuation must finish before the first available draw', () => {
  const { trace } = fixture()
  trace.causes = [
    command(
      11,
      reception.find((value) => value.kind === 'setEntityFacing'),
    ),
    command(
      12,
      reception.find((value) => value.kind === 'setEntityFrame'),
    ),
  ]
  assert.equal(verifyInnReadyContinuations(trace, () => []).length, 1)
  trace.causes[1].order = 21
  assert.throws(() => verifyInnReadyContinuations(trace, () => []), /missed first draw/u)
})

test('take after a movement commit but before its first draw presents standing, not a stale stride', () => {
  const { trace, poses, renders } = fixture()
  const take = reception.find(
    (value) => value.kind === 'takeEntity' && value.target.entity === 'e59',
  )
  const release = reception.find(
    (value) => value.kind === 'releaseEntity' && value.target.entity === 'e59',
  )
  trace.causes = [command(15, take), command(22, release)]
  const moves = (_trace, id) =>
    id === 'e59'
      ? [
          { order: 12, from: [0, 0], to: [0, 0.25] },
          { order: 25, from: [0, 0.25], to: [0, 0.5] },
        ]
      : []
  const motion = [{ actor: 'e59', command: 11, continuation: 26, to: [0, 0.5] }]
  Object.assign(poses.e59[1], { position: [0, 0.25], geometry: { worldRect: [-14, -31, 20, 40] } })
  Object.assign(poses.e59[2], { position: [0, 0.5], geometry: { worldRect: [-18, -29, 20, 40] } })
  assert.deepEqual(
    verifyInnPresentation(trace, renders, moves, motion).standingOverlays.map((entry) => [
      entry.frame,
      entry.suspendedFrame,
    ]),
    [[0, 1]],
  )
  poses.e59[1].frame = 1
  assert.throws(
    () => verifyInnPresentation(trace, renders, moves, motion),
    /unexplained actual pose/u,
  )
})
