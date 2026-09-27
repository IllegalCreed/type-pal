import assert from 'node:assert/strict'

const anchors = [
  ['ask-about-guests', '一大早就有客人上门啦'],
  ['aunt-calls-to-help', '还不快过来帮忙'],
]
const text = (event) => (event.dialogue?.text ?? event.dialogue?.pageText ?? '').replace(/\s/g, '')

/** Content/partial-order contract, never equality of coordinates, ticks, speeds or page counts. */
export function openingTiming(trace, engine) {
  assert(['game', 'reforge'].includes(engine), 'unknown timing engine')
  assert(trace && !trace.overflow, 'commit trace overflow or absent')
  assert.deepEqual(trace.errors, [], 'incomplete commit observation')
  const events = trace.events
  assert(events.length > 0 && events.length <= 1600, 'empty/oversize trace')
  assert.equal(events[0].kind, 'initial')
  const instance = events[0].instance
  for (const [seq, e] of events.entries()) {
    assert.equal(e.seq, seq, 'event gap/reorder')
    assert.equal(e.engine, engine, 'wrong engine')
    assert.equal(e.instance, instance, '001 unexpectedly reentered scene')
    assert.equal(e.npc, engine === 'game' ? 10 : 'e10', 'wrong semantic NPC')
    assert.equal(e.position.length, engine === 'game' ? 2 : 3)
    assert(e.position.every(Number.isFinite), 'invalid position')
    assert(
      Number.isFinite(e.atMs) && (seq === 0 || e.atMs >= events[seq - 1].atMs),
      'invalid event clock',
    )
    assert(['initial', 'move', 'dialogue', 'actor', 'control'].includes(e.kind), 'unknown event')
    if (e.kind === 'move') {
      assert(e.source.startsWith('commit:'), 'plan/sample is not a committed move')
      assert.notDeepEqual(e.from, e.position, 'no-op is not a move')
      assert.deepEqual(e.from, events[seq - 1].position, 'discontinuous move')
    } else if (seq > 0)
      assert.deepEqual(
        e.position,
        events[seq - 1].position,
        'position changed without commit event',
      )
  }
  for (const key of engine === 'game'
    ? ['commit:npcWalkTo', 'tick:tickEventSystem', 'render:world']
    : ['commit:meta.entity.pos', 'render:dialogue', 'render:world']) {
    assert(trace.sources[key] > 0, `missing actual source ${key}`)
  }
  const moves = events.filter((e) => e.kind === 'move')
  const intervals = anchors.map(([id, needle]) => {
    const start = events.findIndex((e) => text(e).includes(needle))
    assert(start >= 0, `missing dialogue ${id}`)
    const end = events.findIndex((e, i) => i > start && !text(e).includes(needle))
    assert(end > start, `unclosed dialogue ${id}`)
    const slice = events.slice(start, end)
    assert(
      slice.some((e) =>
        ['waiting-input', 'waiting-page-key', 'waiting-end-key'].includes(e.dialogue?.phase),
      ),
      `dialogue never reached actual key wait: ${id}`,
    )
    assert(
      slice.every((e) => e.visible),
      `speaker absent during ${id}`,
    )
    const violations = slice.filter((e) => e.kind === 'move')
    return {
      id,
      start,
      end,
      waitingObserved: true,
      stationary: violations.length === 0,
      moveSequences: violations.map((e) => e.seq),
    }
  })
  assert(intervals[0].end < intervals[1].start, 'dialogue order')
  const [first, second] = intervals
  const turned = events.find(
    (e) =>
      e.seq >= first.end &&
      e.seq <= second.start &&
      e.kind === 'actor' &&
      e.facing !== events[first.start].facing,
  )
  assert(turned && turned.facing === events[second.start].facing, 'missing turn before aunt reply')
  const movementStages = [
    moves.filter((e) => e.seq < first.start),
    moves.filter((e) => e.seq >= first.end && e.seq < second.start),
    moves.filter((e) => e.seq >= second.end),
  ]
  assert(
    movementStages.every((stage) => stage.length > 0),
    'missing before/between/after movement witness',
  )
  const hidden = events.find((e) => e.seq > moves.at(-1).seq && e.visible === false)
  assert(hidden, 'aunt never leaves after final movement')
  const final = events.at(-1)
  assert(final.control && !final.dialogue && !final.visible, 'no final return of control')
  return {
    engine,
    status: intervals.every((i) => i.stationary) ? 'passed' : 'different',
    eventCount: events.length,
    moveCount: moves.length,
    intervals,
    turnSequence: turned.seq,
    movementStages: movementStages.map((s) => s.length),
    semanticOrder: ['approach', first.id, 'turn-and-walk', second.id, 'leave', 'hidden', 'control'],
    scope:
      '001 room / moving Aunt entity / two explicit dialogue intervals; not all NPCs or full capture acceptance',
  }
}

export function compareOpeningTiming(gameTrace, reforgeTrace) {
  const game = openingTiming(gameTrace, 'game'),
    reforge = openingTiming(reforgeTrace, 'reforge')
  assert.deepEqual(game.semanticOrder, reforge.semanticOrder)
  return {
    status: game.status === 'passed' && reforge.status === 'passed' ? 'passed' : 'different',
    game,
    reforge,
  }
}
