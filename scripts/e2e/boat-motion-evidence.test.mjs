import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import { assertBoatMotion } from './boat-contract.mjs'
import { boatMotionEvidence } from './boat-motion-evidence.mjs'
import { summarizeBoatMotion } from './boat-observations.mjs'
import { errandCausalObserverScript } from './errand-observer.mjs'

test('boat proof consumes completed draws, retains real drift and never borrows a prior scene visit', () => {
  const host = vm.createContext({
    structuredClone,
    performance,
    TextEncoder,
    addEventListener() {},
  })
  vm.runInContext(errandCausalObserverScript(), host)
  const state = {
    scene: 's005',
    tick: 0,
    control: false,
    money: 0,
    persistent: {},
    hooks: {},
    actors: {
      party: { position: [0, 4, 0], facing: 'up', visible: true },
      e116: { position: [2, 8, 0], facing: 'up', visible: true },
      e117: { position: [0, 10.25, 0], facing: 'up', visible: true },
    },
  }
  const point = (source) => host.__errandPoint(source, state)
  point('commit:scene-materialized')
  point('render:world')
  for (let n = 1; n <= 4; n++) {
    // Real setters commit sequentially; only the completed world draw is simultaneous.
    for (const actor of Object.values(state.actors)) {
      actor.position[0]--
      point('commit:entity.pos')
    }
    point('render:world')
  }
  const trace = host.__readErrandEvidence()
  assert.deepEqual(trace.errors, [])
  const samples = boatMotionEvidence(trace, -1, Infinity)
  assert.equal(samples.length, 5)
  assert.equal(assertBoatMotion(samples).partyBoatRelative, 'constant-through-ride')
  const before = structuredClone(samples)
  const drift = structuredClone(trace)
  const lastParty = drift.events.findLast((e) => e.kind === 'actor' && e.id === 'party')
  lastParty.state.position[0] += 1 / 65536
  const wrong = boatMotionEvidence(drift, -1, Infinity)
  assert.throws(() => assertBoatMotion(wrong), /party detached/)
  assert.equal(
    summarizeBoatMotion(wrong).partyOffsets.length,
    2,
    'a fractional mismatch is not rounded away',
  )
  assert.deepEqual(samples, before, 'derived samples are detached from raw evidence')
  // Continue the real collector with a transient rider drift on a stationary boat,
  // then restore the rider before the next movement. Both records must survive.
  for (const offset of [1, -1]) {
    state.actors.party.position[0] += offset
    point('commit:entity.pos')
    point('render:world')
  }
  for (const actor of Object.values(state.actors)) {
    actor.position[0]--
    point('commit:entity.pos')
  }
  point('render:world')
  const paused = boatMotionEvidence(host.__readErrandEvidence(), -1, Infinity)
  assert.throws(() => assertBoatMotion(paused), /party detached/)
  assert.equal(summarizeBoatMotion(paused).partyOffsets.length, 3)
  const priorVisit = structuredClone(trace)
  for (const draw of priorVisit.worldRenders) draw.sceneVisit++
  assert.throws(() => boatMotionEvidence(priorVisit, -1, Infinity), /no complete committed pose/)
})
