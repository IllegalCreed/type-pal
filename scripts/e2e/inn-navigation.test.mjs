import assert from 'node:assert/strict'
import test from 'node:test'
import { committedInnMoves, partitionInnMoves } from './inn-navigation.mjs'

function harness() {
  const commits = []
  let position = [2, 0]
  return {
    commits,
    commit(next) {
      commits.push({
        order: commits.length,
        kind: 'actor',
        id: 'party',
        source: 'commit:input',
        before: { position },
        state: { position: next },
      })
      position = next
    },
  }
}

test('overflow/error/non-commit movement cannot become a normal route census', () => {
  const h = harness()
  h.commit([3, 0])
  const trace = { events: h.commits, overflow: false, errors: [] }
  assert.throws(() => committedInnMoves({ ...trace, overflow: true }, -1), /overflow/)
  assert.throws(() => committedInnMoves({ ...trace, errors: ['missing commit'] }, -1), /error/)
  assert.throws(
    () =>
      committedInnMoves(
        {
          ...trace,
          events: [{ ...h.commits[0], source: 'render' }],
        },
        -1,
      ),
    /unobserved/,
  )
  assert.deepEqual(
    committedInnMoves(
      {
        ...trace,
        events: [
          { ...h.commits[0], before: null },
          { ...h.commits[0], id: 'npc' },
          { ...h.commits[0], state: h.commits[0].before },
        ],
      },
      -1,
    ),
    [],
  )
})

test('route-start and ready-scene legs exclude restore and even one-cell scene placements', () => {
  const h = harness()
  for (const position of [
    [3, 0],
    [4, 0],
    [5, 0],
    [6, 0],
  ])
    h.commit(position)
  const events = h.commits.map((move, i) => ({ ...move, scene: i < 2 ? 's001' : 's003' }))
  const trace = { events, overflow: false, errors: [] }
  const moves = committedInnMoves(trace, 0)
  assert.deepEqual(moves, events.slice(1))
  const { steps, placements } = partitionInnMoves(moves, [
    { scene: 's001', startOrder: 0, endOrder: 2, moveSources: ['commit:input'] },
    { scene: 's003', startOrder: 2, endOrder: 3, moveSources: ['commit:input'] },
  ])
  assert.deepEqual(steps, [events[1], events[3]])
  assert.deepEqual(placements, [events[2]], 'one-cell delta is not proof of ordinary walking')
  assert.throws(() => committedInnMoves(trace), /start order/)
  assert.throws(
    () => committedInnMoves({ ...trace, events: [{ ...events[1], order: null }] }, 0),
    /order/,
  )
})

test('legacy placement before the scene event is not walking even in the old-scene leg', () => {
  const h = harness()
  h.commit([3, 0])
  h.commit([4, 0])
  const events = h.commits.map((move, i) => ({
    ...move,
    scene: 's001',
    source: i ? 'commit:applyRawOpcode' : 'commit:tickSceneInput',
  }))
  const { steps, placements } = partitionInnMoves(events, [
    {
      scene: 's001',
      startOrder: -1,
      endOrder: 1,
      moveSources: ['commit:tickSceneInput'],
    },
  ])
  assert.deepEqual(steps, [events[0]])
  assert.deepEqual(placements, [events[1]])
})
