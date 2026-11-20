import assert from 'node:assert/strict'
import { isDeepStrictEqual } from 'node:util'
import { compareRenderedDialogue, sourceDialogueGroups } from '../rendered-dialogue-comparison.mjs'

const deltas = {
  ArrowUp: [0, -1],
  ArrowRight: [1, 0],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
}

const world = ([col, row]) => [16 * (col - row), 8 * (col + row)]
const camera = ([x, y]) => [x - 160, y - 112]
const signed = (word) => (word << 16) >> 16

function walkFrom(start, runs) {
  const steps = []
  let from = start
  for (const [key, count] of runs) {
    const [dc, dr] = deltas[key]
    for (let i = 0; i < count; i++) {
      const to = [from[0] + dc, from[1] + dr, from[2]]
      steps.push({ key, from, to })
      from = to
    }
  }
  return steps
}

export function readGoldenToadSources(data, commands, spec) {
  const { revisit } = spec
  const cave = data.gameScene
  const bridge = data.diskRevisitScene
  const caveActor = (id) => cave.eventObjects.find((actor) => actor.id === id)
  const owner = caveActor(Number(spec.owner.slice(1)))
  const into = walkFrom(revisit.checkpoint, revisit.into.runs)
  const out = walkFrom(revisit.departure, revisit.out.runs)
  const approach = walkFrom(revisit.checkpoint, revisit.cave)
  assert.deepEqual(approach.at(-1).to, spec.start)
  const [dc, dr] = deltas[spec.approach]
  assert.deepEqual(spec.contact, [spec.start[0] + dc, spec.start[1] + dr, spec.start[2]])

  for (const [scene, door, steps, arrival, target] of [
    [cave, revisit.into, into, revisit.arrival, revisit.scene],
    [bridge, revisit.out, out, revisit.checkpoint, spec.scene],
  ]) {
    const trigger = scene.eventObjects.find(({ id }) => `e${id}` === door.owner)
    assert.equal(trigger.triggerLabel, `L_${door.ip}`)
    const [x, y, half] = commands[door.ip + 1].operands
    assert.deepEqual(arrival, [x + y + half, y - x, 0])
    assert.equal(commands[door.ip].sceneId, Number(target.slice(1)) + 1)
    const inside = ([col, row]) =>
      Math.abs(16 * (col - row) - trigger.x) + 2 * Math.abs(8 * (col + row) - trigger.y) <
      (trigger.triggerMode - 4) * 32 + 16
    assert(!inside(steps.at(-1).from) && inside(steps.at(-1).to))
  }
  assert.deepEqual(commands[21473].operands, [102, revisit.hookIp, 0])
  const firstVisit = data.rfScene.entities
    .find(({ id }) => id === spec.owner)
    .behaviors.trigger.default.flow.stages.flatMap(({ body }) => body)
  assert(
    firstVisit.some(
      (command) =>
        command.kind === 'selectSceneHooks' &&
        command.scene === revisit.scene &&
        command.selection.onEnter.value === revisit.hook,
    ),
  )
  const finishedEarlier = bridge.eventObjects.find(({ triggerLabel }) => triggerLabel === 'L_21296')
  assert.deepEqual(
    [finishedEarlier.id, commands[21303].opcode, commands[21303].operands],
    [1846, 0x49, [0xffff, 0, 0]],
  )
  const earlier = data.revisitScene.entities
    .find(({ id }) => id === 'e1846')
    .behaviors.trigger.default.flow.stages.flatMap(({ body }) => body)
  assert(
    earlier.some(
      ({ kind, state, target }) =>
        kind === 'setEntityState' && state === 0 && target.entity === 'e1846',
    ),
  )
  const prep = data.revisitScene.hooks.onEnter.variants[revisit.hook].flow.stages[0].body
  const selected = prep.find(
    ({ kind, target }) =>
      kind === 'selectEntityBehavior' &&
      target.scene === spec.scene &&
      target.entity === spec.owner,
  )
  assert.deepEqual(
    [commands[21486].opcode, commands[21486].operands],
    [0x7d, [owner.id + 1, 32, 0]],
  )
  assert.deepEqual(
    [commands[21487].opcode, commands[21487].operands],
    [0x25, [owner.id + 1, spec.disk.entry, 0]],
  )
  assert.equal(selected.channel, 'trigger')
  assert.equal(selected.selection.kind, 'use')

  const toad = caveActor(commands[21485].operands[0] - 1)
  const collectible = caveActor(commands[21548].operands[0] - 1)
  const back = [world(revisit.arrival)]
  for (const ip of [21490, 21492]) {
    assert.equal(commands[ip].opcode, 0x6e)
    const [dx, dy] = commands[ip].operands.map(signed)
    const [x, y] = back.at(-1)
    back.push([x + dx, y + dy])
  }
  return {
    steps: { into, out, approach },
    behavior: selected.selection.value,
    relocated: [owner.x + commands[21486].operands[1], owner.y + commands[21486].operands[2]],
    back,
    bridgeTrack: commands[revisit.hookIp].operands[0],
    toad: {
      id: `e${toad.id}`,
      asset: toad.spriteNum,
      position: [toad.x, toad.y],
      frame: commands[21547].operands[2],
      state: commands[21485].operands[1],
    },
    ownerAsset: owner.spriteNum,
    collectible: { id: `e${collectible.id}`, state: commands[21548].operands[2] },
    openingSpells: [42642, 42644, 42646].map((ip) => {
      assert.equal(commands[ip].opcode, 0x67)
      const [spell] = commands[ip].operands
      return spell === 0xffff ? ['pass', null] : ['cast', String(spell)]
    }),
    pages: sourceDialogueGroups(commands, [
      { scene: revisit.scene, first: 21495, last: 21510 },
      { scene: spec.scene, first: spec.disk.entry, last: spec.disk.battle - 1 },
    ]),
  }
}

export function inspectGoldenToadPresentation({
  events,
  draws,
  boundaries,
  source,
  spec,
  game,
  run,
}) {
  const { trigger, launch, won, control } = boundaries
  const { revisit, scene, owner } = spec
  const facts = source.toad
  const issues = []
  const check = (rule, actual, expected) => {
    if (!isDeepStrictEqual(actual, expected)) issues.push({ rule, actual, expected })
  }
  const roleFrames = { 'li-xiaoyao': 2, 'lin-yueru': 7 }
  const feet = (draw) =>
    draw?.party
      .toSorted((a, b) => a.slot - b.slot)
      .map(({ id, spriteId, frame, world }) => [
        id,
        game ? spriteId : roleFrames[spriteId],
        frame,
        world,
      ])
  const [x, y] = facts.relocated
  const placed = game ? [x, y] : [x / 32 + y / 16, y / 16 - x / 32, 0]
  const selected = game
    ? `L_${spec.disk.entry}`
    : { selection: { kind: 'use', value: facts.behavior } }
  check(
    'the revisit selects the boss at its relocated world position',
    [run.revisit.prepared.position, run.revisit.prepared.trigger],
    [placed, selected],
  )
  check(
    'the loaded cave binds the boss position, initial facing and trigger',
    run.revisit.returned,
    { position: placed, facing: 'down', trigger: selected },
  )
  check(
    'the footpath starts from the settled bridge scene',
    [run.revisit.entered.scene, run.revisit.entered.position, run.revisit.entered.facing],
    [revisit.scene, revisit.departure, 'up'],
  )

  const visits = events.filter(
    ({ kind, order }) => kind === 'scene-first-drawn' && order < trigger.order,
  )
  const first = [
    [scene, revisit.checkpoint, 0, [16, -8]],
    [revisit.scene, revisit.arrival, 0, [16, -8]],
    [scene, revisit.checkpoint, 6, [-16, 8]],
  ].map(([id, pos, frame, [dx, dy]]) => {
    const [x, y] = world(pos)
    return [
      id,
      camera([x, y]),
      [x, y],
      [
        ['li-xiaoyao', 2, frame, [x, y]],
        ['lin-yueru', 7, frame, [x + dx, y + dy]],
      ],
    ]
  })
  check(
    'every first revealed scene has the source camera and settled party',
    visits.map((draw) => [draw.scene, draw.camera, draw.leader, feet(draw)]),
    first,
  )
  const drawn = events.filter(({ kind, visible }) => kind === 'world-drawn' && visible)
  const bridge = drawn.filter(
    ({ scene, order }) => scene === revisit.scene && order < (visits[2]?.order ?? trigger.order),
  )
  const walked = events.find(({ kind }) => kind === 'route-move')
  const performed = bridge.filter(({ order }) => order < (walked?.order ?? trigger.order))
  const backward = performed.filter(
    ({ leader }, i) => i === 0 || !isDeepStrictEqual(leader, performed[i - 1].leader),
  )
  check(
    'both scripted backward steps draw at the source coordinates',
    backward.map(({ leader, camera }) => [leader, camera]),
    facts.back.map((pos) => [pos, camera(pos)]),
  )
  const nearBeat = (ms) => Math.abs(ms - 100) <= 55
  check(
    'both backward steps draw on consecutive world beats',
    backward.length === 3 && nearBeat(backward[2].atMs - backward[1].atMs),
    true,
  )
  const watch = []
  for (const draw of performed) {
    const direction = Math.floor(draw.party.find(({ slot }) => slot === 0)?.frame / 3)
    if (watch.at(-1)?.direction !== direction) watch.push({ direction, atMs: draw.atMs })
  }
  check(
    'the lead looks right and up in separate painted poses',
    watch.map(({ direction }) => direction),
    [0, 3, 2],
  )
  check('the rightward pose occupies a world beat', nearBeat(watch[2]?.atMs - watch[1]?.atMs), true)

  const pages = compareRenderedDialogue(
    draws.filter(({ atMs }) => atMs < launch.atMs),
    facts.pages,
    source.locale,
  )
  issues.push(...pages.findings)
  const opening = drawn.filter(
    ({ scene: id, order }) =>
      id === scene && order < launch.order && order >= (visits[2]?.order ?? 0),
  )
  const seen = []
  for (const { atMs, order, actors } of opening) {
    const actor = actors[owner]
    if (!actor || seen.at(-1)?.frame === actor.frame) continue
    seen.push({ atMs, order, asset: actor.asset, position: actor.position, frame: actor.frame })
  }
  check(
    'the visible boss is initially facing down, turns to the party then addresses the toad',
    seen.map(({ asset, position, frame }) => [asset, position, frame]),
    [0, 9, 0, 9].map((frame) => [facts.ownerAsset, facts.relocated, frame]),
  )
  check(
    'the final two turns separate the actual spoken pages',
    [
      pages.checked?.[8].firstComplete?.atMs < seen[2]?.atMs,
      seen[2]?.atMs < pages.checked?.[9].firstComplete?.atMs,
      pages.checked?.[9].firstComplete?.atMs < seen[3]?.atMs && seen[3]?.order < launch.order,
    ],
    [true, true, true],
  )
  const returned = drawn.find(({ scene: id, order }) => id === scene && order > won.order)
  const body = returned?.actors[facts.toad.id]
  const contact = opening.findLast(({ order }) => order < launch.order)
  check(
    'the first drawn return has the correct camera, party and body',
    [
      returned?.camera,
      returned?.leader,
      feet(returned),
      returned?.actors[owner],
      body && [body.asset, body.position, body.frame],
    ],
    [
      camera(world(spec.contact)),
      world(spec.contact),
      feet(contact),
      undefined,
      [facts.toad.asset, facts.toad.position, facts.toad.frame],
    ],
  )
  check(
    'the returned cave enables the later investigation',
    [owner, facts.toad.id, facts.collectible.id].map(
      (id) => run.returned.state.actors.find((actor) => actor.id === id)?.state,
    ),
    [spec.world.gameState, facts.toad.state, facts.collectible.state],
  )
  const walkAway = events.find(({ kind, order }) => kind === 'move' && order > control.order)
  check(
    'the fallen body is drawn before the first accepted departure',
    Boolean(returned && returned.order < walkAway?.order),
    true,
  )
  const music = events.filter(({ kind }) => kind === 'music-start')
  const arrivals = [facts.bridgeTrack, spec.mapMusic.track].map((track, i) => {
    const showed = visits[i + 1]
    const cue = music.find(
      ({ order, track: actual, context }) =>
        order > (visits[i]?.order ?? 0) &&
        order < (visits[i + 2]?.order ?? trigger.order) &&
        actual === track &&
        context === 'running',
    )
    return { track, cueAtMs: cue?.atMs, firstAtMs: showed?.atMs }
  })
  check(
    'scene music begins on the first revealed world beat',
    arrivals.map(
      ({ cueAtMs, firstAtMs }) => cueAtMs >= firstAtMs - 200 && cueAtMs <= firstAtMs + 100,
    ),
    [true, true],
  )
  return { issues, pages, visits, arrivals, backward, watch, seen, returnedAtMs: returned?.atMs }
}
