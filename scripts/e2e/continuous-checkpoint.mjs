import assert from 'node:assert/strict'
import { assertBoatStoryEnd } from './boat-contract.mjs'
import { assertErrandEndWorld } from './errand-contract.mjs'
import { assertInnStoryHandoff } from './inn-contract.mjs'
import { assertKitchenStoryEnd } from './kitchen-contract.mjs'
import { assertMealEndWorld, mealSaveView } from './meal-contract.mjs'

/** Reuse the standalone story oracle against live, detached state; never create a save slot. */
export function assertContinuousWorldCheckpoint({
  fragment,
  engine,
  payload,
  predecessor,
  contract,
}) {
  if (fragment === '001') {
    if (engine === 'game') {
      assert.equal(payload.gs.wNumScene, 2)
      assert.deepEqual(payload.gs.party, { x: 1344, y: 288, facing: 'down' })
      assert.equal(payload.gs.dwCash, 0)
      assert.deepEqual(payload.gs.partyMembers, [0])
    } else {
      assert.deepEqual(payload.position, {
        sceneId: 's001',
        col: 60,
        row: -24,
        height: 0,
        facing: 'down',
      })
      assert.equal(payload.world.money, 0)
      assert.deepEqual(
        payload.world.party.map((actor) => actor.id),
        ['li-xiaoyao'],
      )
    }
  } else if (fragment === '002') assertInnStoryHandoff(payload, engine)
  else if (fragment === '003') assertKitchenStoryEnd(payload, engine, predecessor, contract)
  else if (fragment === '004' || fragment === '005') {
    const view = engine === 'game' ? mealSaveView(payload, engine) : payload
    if (fragment === '004') assertMealEndWorld(view, engine)
    else assertErrandEndWorld(view, engine)
  } else assert.equal(fragment, '006', 'unknown story checkpoint')
}

/** The independent final world is the endpoint, not the last route sampling record. */
export function assertRecordedStoryEndpoint(state, engine, report) {
  if (report.fragment === '001') return // Fixed opening handoff is checked by the world oracle.
  const world = report.storyEndWorld ?? report.endWorld
  assert(world, `missing independent ${report.fragment} final world`)
  if (report.fragment === '006') {
    assertBoatStoryEnd(state, engine)
    assert.equal(world.controlReturned, true, 'independent 006 control return is missing')
    assert.deepEqual(world.arrivalDialogue, [], 'independent 006 arrival dialogue is unfinished')
  }
  const party = engine === 'game' ? (world.party ?? world.position?.pos) : world.position
  assert(party, 'missing independent final party')
  const pos = party.pos ?? party
  const expected = engine === 'game' ? [pos.x, pos.y] : [pos.col, pos.row, pos.height]
  assert(expected.every(Number.isFinite), 'invalid independent final position')
  assert.deepEqual(
    state.position,
    expected,
    `continuous ${report.fragment} final position differs from independent run`,
  )
  if (party.facing !== undefined)
    assert.equal(
      engine === 'game' ? state.facing : state.runtime?.facing,
      party.facing,
      `continuous ${report.fragment} final facing differs from independent run`,
    )
}
