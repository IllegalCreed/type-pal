import assert from 'node:assert/strict'

// Fixed landmarks from the source entries, in native Game world pixels.
const strikeSites = [
  [5397, [1120, 1408]],
  [5416, [992, 1424]],
  [5426, [1152, 1344]],
  [5435, [1072, 1378]],
  [5440, [1030, 1350]],
  [5446, [1088, 1280]],
  [5459, [1072, 1270]],
  [5489, [1032, 1288]],
]
const departureWaypoints = [
  [1152, 1200],
  [1216, 1168],
  [1312, 1216],
  [1408, 1168],
  [1504, 1216],
  [1952, 992],
]

/** Independently check story order against actual scene commits, input and completed draws. */
export function assertFairyPoolGameStory(trace, report) {
  const { events, inputs, resources } = trace
  const activations = events.filter(
    ({ kind, before, cursor }) => kind === 'cursor' && before === null && cursor,
  )
  assert.deepEqual(
    activations.map(({ cursor: { owner, ip } }) => [owner, ip]),
    [
      [233, 38091],
      [212, 5233],
      [213, 5383],
    ],
    'Game must activate each named story exactly once',
  )
  const [pickup, firstPool, secondPool] = activations
  const ready = events.filter(({ kind }) => kind === 'ready')
  assert.deepEqual(
    ready.map(({ position, facing }) => [position, facing]),
    [
      [[304, 824], 'up'],
      [[880, 264], 'left'],
      [[672, 1216], 'right'],
      [[1056, 1296], 'up'],
    ],
  )
  const [start, picked, firstPoolReady, secondPoolReady] = ready
  const herbChanges = events.filter(({ kind }) => kind === 'herb-count')
  assert.deepEqual(
    herbChanges.map(({ count }) => count),
    [0, 1],
  )
  const herbDrawn = events.findLast(
    ({ kind, order, actors }) =>
      kind === 'world-draw' && order < pickup.order && actors.e233?.assetId === 69,
  )
  const herbHidden = events.find(
    ({ kind, id, before, state, order }) =>
      kind === 'actor' &&
      id === 'e233' &&
      before?.state === 1 &&
      state.state === 0 &&
      order > pickup.order,
  )
  const drewAfterRemoval = events.find(
    ({ kind, order, actors }) =>
      kind === 'world-draw' && order > herbHidden?.order && order < picked.order && !actors.e233,
  )
  const herbDraw = events.find(
    ({ kind, slots, order }) =>
      kind === 'dialogue-draw' &&
      order < herbChanges[1].order &&
      slots.some(({ cursor, text }) => cursor?.owner === 233 && text === '摘得止血草'),
  )
  assert(
    herbDrawn && herbHidden && drewAfterRemoval && herbDraw,
    'herb visibility/narration is missing',
  )
  assert(herbHidden.order < herbDraw.order && picked.order < firstPool.order)
  assert(firstPool.order < firstPoolReady.order && firstPoolReady.order < secondPool.order)
  assert(secondPool.order < secondPoolReady.order)
  assert.deepEqual(
    report.route.legs.map(({ replay }) => replay.steps.length),
    [70, 144, 25],
  )
  assert(
    inputs.some(
      ({ type, key, order }) =>
        type === 'keydown' &&
        key === 'Enter' &&
        order > picked.order &&
        order <= report.route.legs[1].startOrder,
    ),
    'repeat Search was not dispatched after the herb disappeared',
  )

  const sounds = events.filter(({ kind, id }) => kind === 'sound' && id === 107)
  assert.deepEqual(
    sounds.map(({ cursor, lightningPosition }) => [cursor?.owner, cursor?.ip, lightningPosition]),
    strikeSites.map(([ip, position]) => [213, ip, position]),
    'wrong lightning strike count, order, source or position',
  )
  const spriteResources = new Set(resources.map(({ order }) => order))
  const lightning = sounds.map((sound, index) => {
    const draws = events.filter(
      ({ kind, order, actors }) =>
        kind === 'world-draw' &&
        order > sound.order &&
        order < (sounds[index + 1]?.order ?? secondPoolReady.order) &&
        JSON.stringify(actors.e218?.position) === JSON.stringify(sound.lightningPosition),
    )
    assert(draws.length > 0, `lightning site ${index + 1} never drew its effect`)
    assert(
      draws.every(
        ({ actors }) =>
          actors.e218.assetId === 362 && spriteResources.has(actors.e218.frameResourceId),
      ),
      'lightning draw is missing its native sprite resource',
    )
    return {
      sound,
      draws: draws.map(({ order, tick, actors }) => ({ order, tick, frame: actors.e218.frame })),
    }
  })

  const scriptedWalks = new Map()
  for (const event of events) {
    if (event.kind !== 'actor' || event.id !== 'party' || event.source !== 'commit:partyWalkTo')
      continue
    const {
      cursor: { owner, ip },
      before,
      state,
      order,
    } = event
    const initial = scriptedWalks.get(ip)
    scriptedWalks.set(ip, {
      owner,
      ip,
      from: initial?.from ?? before.position,
      to: state.position,
      order,
    })
  }
  assert.deepEqual(
    [...scriptedWalks.values()].map(({ owner, ip, to }) => [owner, ip, to]),
    [
      [212, 5368, [672, 1216]],
      [213, 5422, [1136, 1352]],
      [213, 5430, [1088, 1376]],
      [213, 5431, [1056, 1360]],
      [213, 5436, [1024, 1344]],
      [213, 5441, [992, 1328]],
      [213, 5442, [1056, 1296]],
    ],
    'Game pool cutscenes did not walk through the native authored waypoints',
  )

  const lingEr = events.filter(
    ({ kind, id, order }) => kind === 'actor' && id === 'e221' && order > secondPool.order,
  )
  let waypointsReached = 0
  for (const { state } of lingEr) {
    if (JSON.stringify(state.position) === JSON.stringify(departureWaypoints[waypointsReached])) {
      waypointsReached++
    }
  }
  assert.equal(
    waypointsReached,
    departureWaypoints.length,
    'Ling’er departure omitted a native waypoint',
  )
  const departure = lingEr.find(({ before, state }) => before?.state === 2 && state.state === 0)
  assert(
    departure && secondPoolReady.order < departure.order,
    'Ling’er must finish leaving after control returns',
  )
  assert.deepEqual(departure.state.position, departureWaypoints.at(-1))
  assert(
    !events.some(
      ({ kind, id, order }) => kind === 'actor' && id === 'party' && order > secondPoolReady.order,
    ),
    'the party moved or faced again after the second cutscene',
  )
  const delivered = report.actions
    .filter(({ scope }) => scope === 'story')
    .flatMap((action) => (action.kind === 'press' ? action.execution.dispatches : [action]))
  assert.deepEqual(
    inputs
      .filter(({ order }) => order > start.order && order < departure.order)
      .map(({ type, key, repeat }) => [type, key, repeat]),
    delivered.map(({ kind, key }) => [`key${kind}`, key, false]),
    'delivered story keys differ from native DOM input',
  )

  const f5 = inputs.filter(({ key, type }) => key === 'F5' && type === 'keydown')
  assert.equal(f5.length, 1)
  assert(departure.order < f5[0].order, 'terminal save preceded Ling’er finishing her departure')
  const capture = trace.saveCaptures.at(-1)
  assert(f5[0].order < capture.order, 'terminal save snapshot preceded F5')
  return {
    start,
    pickup,
    picked,
    firstPool,
    firstPoolReady,
    secondPool,
    secondPoolReady,
    departure,
    lightning,
    scriptedWalks: [...scriptedWalks.values()],
  }
}
