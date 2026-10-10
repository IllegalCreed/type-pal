import assert from 'node:assert/strict'
import test from 'node:test'
import {
  assertContinuousWorldCheckpoint,
  assertRecordedStoryEndpoint,
} from './continuous-checkpoint.mjs'

test('continuous meal checkpoint rejects an unfinished story even in the correct hall', () => {
  const payload = {
    position: { sceneId: 's003', col: 137, row: 72, height: 0, facing: 'left' },
    world: {
      money: 500,
      inventory: [],
      party: [{ id: 'li-xiaoyao' }],
      script: {
        entityState: { s001: { e15: 0, e16: 0, e20: 0 }, s003: { e62: 0 } },
        behaviors: {
          entities: {
            s001: { e19: { trigger: { selection: { kind: 'use', value: 'c8-74bc98f07f8e' } } } },
          },
        },
      },
    },
  }
  const check = (value) =>
    assertContinuousWorldCheckpoint({ fragment: '004', engine: 'reforge', payload: value })
  check(payload)
  const unfinished = structuredClone(payload)
  unfinished.world.script.entityState.s003.e62 = 2
  assert.throws(() => check(unfinished), /e62 remained active/)
  const dispatched = structuredClone(payload)
  dispatched.world.script.behaviors.entities.s001.e19.trigger.cursor = { at: { kind: 'completed' } }
  assert.throws(() => check(dispatched), /005 already activated/)
})

test('continuous endpoint uses the independent final world, including exact position and facing', () => {
  const report = {
    fragment: '003',
    endWorld: { position: { sceneId: 's001', pos: { col: 89, row: 46, height: 0 }, facing: 'up' } },
    route: { steps: [{ position: [122.9375, 49.3125, 0] }] },
  }
  const state = { position: [89, 46, 0], runtime: { facing: 'up' } }
  assertRecordedStoryEndpoint(state, 'reforge', report)
  assert.throws(
    () => assertRecordedStoryEndpoint({ ...state, position: [89.0625, 46, 0] }, 'reforge', report),
    /final position differs/,
  )
  assert.throws(
    () => assertRecordedStoryEndpoint({ ...state, runtime: { facing: 'left' } }, 'reforge', report),
    /final facing differs/,
  )
  assert.throws(
    () => assertRecordedStoryEndpoint(state, 'reforge', { ...report, endWorld: undefined }),
    /missing independent 003 final world/,
  )
  const island = { scene: 15, position: [752, 808], mode: 'explore' }
  const boatReport = {
    fragment: '006',
    endWorld: {
      position: { sceneId: 's014', pos: { x: 752, y: 808 } },
      controlReturned: true,
      arrivalDialogue: [],
    },
  }
  assertRecordedStoryEndpoint(island, 'game', boatReport)
  assert.throws(
    () =>
      assertRecordedStoryEndpoint(
        { ...island, dialog: { phase: 'waiting-end-key' } },
        'game',
        boatReport,
      ),
    /has not returned control/,
  )
  assert.throws(
    () =>
      assertRecordedStoryEndpoint(island, 'game', {
        ...boatReport,
        endWorld: { ...boatReport.endWorld, controlReturned: false },
      }),
    /independent 006 control return/,
  )
})
