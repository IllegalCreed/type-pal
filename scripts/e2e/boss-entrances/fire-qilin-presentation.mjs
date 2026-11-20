import assert from 'node:assert/strict'
import { isDeepStrictEqual } from 'node:util'
import {
  compareRenderedDialogue,
  inspectClearedDialogueFrames,
  sourceDialogueGroups,
} from '../rendered-dialogue-comparison.mjs'

const gridFromDisk = ([x, y, half]) => [x + y + half, y - x, 0]
const pixel = ([col, row]) => [16 * (col - row), 8 * (col + row)]
const cameraAt = ([x, y]) => [x - 160, y - 112]

export function readFireQilinSources(data, commands, spec, party) {
  const rawOwner = data.gameScene.eventObjects.find(({ id }) => `e${id}` === spec.owner)
  const scriptedOwner = data.rfScene.entities.find(({ id }) => id === spec.owner)
  assert.deepEqual(scriptedOwner.pages[0].triggerActivation, { on: 'interact', range: 2 })
  const [x, y] = pixel(spec.contact)
  assert.deepEqual([rawOwner.x - x, rawOwner.y - y], [16, -8])
  assert.deepEqual(spec.start, [spec.contact[0], spec.contact[1] + 1, 0])

  const rawParty = party.map(({ roleId }) => roleId + 1)
  assert.deepEqual(rawParty, [5, 1])
  assert.deepEqual([commands[29729].opcode, commands[29729].operands], [0x75, [...rawParty, 0]])
  assert.deepEqual(
    [29748, 29027, 29031].map((ip) => commands[ip].sceneId),
    [207, 213, 202],
  )
  assert.deepEqual(gridFromDisk(commands[29032].operands), [135, 27, 0])
  assert.deepEqual([commands[29966].opcode, commands[29966].operands[0]], [0x47, 236])
  assert.deepEqual([commands[29978].opcode, commands[29978].operands], [0x75, [1, 0, 0]])
  assert.deepEqual(gridFromDisk(commands[29979].operands), spec.world.returned)
  assert.equal(commands[29981].opcode, 0x78)
  assert.deepEqual(
    [29976, 30093].map((ip) => [commands[ip].op, commands[ip].itemId, commands[ip].count]),
    spec.world.inventory.map(({ itemId, count }) => ['giveItem', Number(itemId), count - 1]),
  )
  assert.deepEqual([commands[30195].opcode, commands[30195].operands], [0x75, [...rawParty, 0]])
  assert.equal(commands[spec.disk.last].op, 'end')

  const pages = sourceDialogueGroups(commands, [
    { scene: spec.scene, first: spec.disk.entry, last: spec.disk.battle - 1 },
    { scene: spec.scene, first: spec.disk.battle + 1, last: spec.disk.last },
  ]).flatMap((page) =>
    Array.from({ length: Math.ceil(page.rows.length / 4) }, (_, index) => ({
      ...page,
      rows: page.rows.slice(index * 4, index * 4 + 4),
    })),
  )
  const notes = pages.filter(({ slot }) => slot === 'narration').flatMap(({ rows }) => rows)
  assert.deepEqual(
    notes.map(({ ip }) => ip),
    [29975, 30092],
  )
  const delays = [29982, 30082, 30084, 30086].map((ip) => {
    assert.equal(commands[ip].opcode, 0x09)
    return commands[ip].operands[0] * 100
  })
  const transitions = [29986, 30151].map((ip) => {
    assert.equal(commands[ip].opcode, 0x73)
    return (commands[ip].operands[0] + 1) * 10 * 72
  })
  const actors = [spec.owner, ...spec.watched].map((id) => {
    const actor = data.gameScene.eventObjects.find((entry) => `e${entry.id}` === id)
    assert(actor?.spriteNum)
    return { id, asset: actor.spriteNum, position: [actor.x, actor.y] }
  })
  return { effect: commands[29966].operands[0], actors, pages, notes, delays, transitions }
}

export function inspectFireQilin({
  events,
  draws,
  bounds,
  source,
  spec,
  timeOrigin,
  actions,
  game,
}) {
  const { trigger, launch, entry, won, control, departure } = bounds
  const { scene } = spec
  const { actors, effect, pages, notes, delays, transitions } = source.qilin
  const issues = []
  const check = (rule, actual, expected) => {
    if (!isDeepStrictEqual(actual, expected)) issues.push({ rule, actual, expected })
  }
  const elapsed = (rule, until, since, expected, tolerance) => {
    const actual = Math.round(until - since)
    if (!Number.isFinite(actual) || Math.abs(actual - expected) > tolerance)
      issues.push({ rule, actual, expected, tolerance })
    return actual
  }
  const poseOf = ({ asset, position, facing, frame }) => [asset, position, facing, frame]
  const pose = (index, facing, frame) => poseOf({ ...actors[index], facing, frame })
  const cast = (frame) =>
    actors.map(({ id }) => (frame?.actors[id] ? poseOf(frame.actors[id]) : null))
  const party = (frame) =>
    frame?.party
      ?.map(({ id, slot, spriteId, frame, world }) => [
        slot,
        id,
        typeof spriteId === 'string' ? source.spriteChunks.get(spriteId) : spriteId,
        world,
        frame,
      ])
      .sort(([left], [right]) => left - right)
  const world = events.filter(
    (event) => event.kind === 'world-drawn' && event.scene === scene && event.visible,
  )
  const contact = pixel(spec.contact)
  const enteringParty = [
    [0, 'anu', 5, contact, 6],
    [1, 'li-xiaoyao', 2, pixel([140, 44]), 6],
  ]
  const before = world.filter(({ order }) => trigger.order < order && order < launch.order)
  const latestDraw = world.findLast(({ order }) => order < trigger.order)
  if (isDeepStrictEqual(party(latestDraw), enteringParty)) before.unshift(latestDraw)
  const after = world.filter(({ order }) => won.order < order)
  const echo = pose(0, 'down', 1)
  const firstRoarPose = before.find((frame) => isDeepStrictEqual(cast(frame)[0], echo))
  const stable = (frames, project) =>
    frames.map(project).filter((value, i, all) => !isDeepStrictEqual(value, all[i - 1]))
  const visit = (frame) => [frame?.camera, party(frame)]
  check(
    'the standing party and camera remain in position through the interaction',
    stable(before, visit),
    [[cameraAt(contact), enteringParty]],
  )
  check('only the two original Fire Qilin poses appear before battle', stable(before, cast), [
    [pose(0, 'down', 0), null, null],
    [echo, null, null],
  ])
  const audio = events.filter(
    ({ kind, asset, order }) =>
      kind === 'sfx-start' && asset === effect && trigger.order < order && order < launch.order,
  )
  check('one audible roar in the scene before battle', audio.length, 1)
  const roarDelay = elapsed(
    'roar follows the painted gesture by one world beat',
    audio[0]?.atMs,
    firstRoarPose?.atMs,
    100,
    55,
  )

  const drawn = draws.filter(
    ({ atMs, scene: id }) => id === scene && trigger.atMs < atMs && atMs <= control.atMs,
  )
  const dialogue = compareRenderedDialogue(drawn, pages, source.locale)
  issues.push(...dialogue.findings)
  const firstAfter = pages.findIndex(({ rows }) => rows[0].ip > spec.disk.battle)
  const confirms = {}
  for (const [phase, count] of [
    ['before-dialogue', firstAfter],
    ['after-dialogue', pages.length - firstAfter - notes.length],
  ]) {
    const presses = actions.filter((action) => action.phase === phase)
    check(
      `one physical confirm per manual page in ${phase}`,
      presses.map(({ kind, key }) => [kind, key]),
      Array.from({ length: count }, () => ['press', game ? 'Space' : 'Enter']),
    )
    confirms[phase] = presses
  }
  const completeAt = (id) =>
    dialogue.checked?.find(({ rows }) => rows[0].id === id)?.firstComplete?.atMs
  const cleanText = (lines) => lines.join('').replace(/\s/gu, '')
  for (const [bottomId, topId] of [
    ['dlg.10765', 'dlg.10761'],
    ['dlg.10785', 'dlg.10782'],
  ]) {
    const frame = drawn.find(({ atMs }) => atMs === completeAt(bottomId))
    const top = pages.find(({ rows }) => rows[0].id === topId)
    const kept = frame?.slots.find(({ slot }) => slot === 'top')
    check(
      `the top page remains fully drawn during ${bottomId}`,
      kept ? cleanText(kept.lines) : null,
      cleanText(top.rows.map(({ text }) => text)),
    )
  }
  const rewards = notes.map(({ id, text }) => {
    const index = drawn.findIndex(({ atMs }) => atMs === completeAt(id))
    const start = drawn[index]
    const end =
      index < 0
        ? undefined
        : drawn
            .slice(index + 1)
            .find(
              ({ slots }) =>
                !slots.some(
                  (slot) =>
                    slot.slot === 'narration' &&
                    slot.lines.join('').replace(/\s/gu, '') === text.replace(/\s/gu, ''),
                ),
            )
    const ms = elapsed(`timed narration ${id}`, end?.atMs, start?.atMs, 1400, 60)
    return { id, start: start?.atMs, end: end?.atMs, ms }
  })

  const firstBand = events.find(({ kind, band }) => kind === 'entry-band' && band === 6)
  const entranceClear = inspectClearedDialogueFrames(
    draws,
    [firstBand, entry].filter(Boolean),
    scene,
  )
  if (entranceClear.issue)
    issues.push({
      rule: 'fully painted battle starts with no field dialogue',
      ...entranceClear.issue,
    })

  const feet = pixel(spec.world.returned)
  const camera = cameraAt(feet)
  const old = (frame) => pose(1, 'down', frame)
  const anu = (facing) => pose(2, facing, facing === 'left' ? 3 : 0)
  const soloStart = after.findIndex((frame) => party(frame)?.length === 1)
  const regrouped = after.find(
    (frame, i) => soloStart >= 0 && i > soloStart && party(frame)?.length === 2,
  )
  const solo =
    soloStart < 0
      ? []
      : after.slice(soloStart).filter(({ order }) => order < (regrouped?.order ?? Infinity))
  const rewardField = soloStart < 0 ? [] : after.slice(0, soloStart)
  check(
    'the first visible reward keeps the prebattle camera and both actors in place',
    stable(rewardField, (frame) => [visit(frame), cast(frame)]),
    [
      [
        [cameraAt(contact), enteringParty],
        [echo, null, null],
      ],
    ],
  )
  check(
    'every foreground pose and visibility change in the cave after combat',
    stable(solo, cast),
    [
      [echo, null, anu('left')],
      [null, old(0), anu('left')],
      [null, old(1), anu('left')],
      [null, old(2), anu('left')],
      [null, old(3), anu('left')],
      [null, old(3), anu('down')],
      [null, old(3), anu('left')],
      [null, null, anu('left')],
      [null, null, anu('down')],
      [null, old(3), anu('down')],
      [null, old(3), anu('left')],
      [null, null, anu('left')],
    ],
  )
  const soloPose = (frame) => [camera, [[0, 'li-xiaoyao', 2, feet, frame]]]
  check(
    'first field draw has the solo actor, pose and anchored camera',
    visit(solo[0]),
    soloPose(3),
  )
  check('the solo party keeps exact feet and camera through each turn', stable(solo, visit), [
    soloPose(3),
    soloPose(6),
    soloPose(3),
  ])

  const gestures = [1, 2].map((frame) =>
    solo.find((draw) => isDeepStrictEqual(cast(draw)[1], old(frame))),
  )
  const gestureConfirm = confirms['after-dialogue'].find(
    ({ atMs }) => atMs - timeOrigin >= completeAt('dlg.10736'),
  )
  const clearedAfterConfirm = drawn.find(
    ({ atMs, slots }) => atMs >= gestureConfirm?.atMs - timeOrigin && slots.length === 0,
  )
  const nextLine = drawn.find(
    ({ atMs, slots }) => atMs > (gestures[1]?.atMs ?? Infinity) && slots.length > 0,
  )
  const gesturesMs = [
    elapsed(
      'first old man gesture follows its confirmed page',
      gestures[0]?.atMs,
      clearedAfterConfirm?.atMs,
      delays[1],
      55,
    ),
    elapsed(
      'old man keeps the first gesture for four beats',
      gestures[1]?.atMs,
      gestures[0]?.atMs,
      delays[2],
      55,
    ),
  ]
  const nextTextDelay = Math.round(nextLine?.atMs - gestures[1]?.atMs)
  if (!(nextTextDelay >= delays[3] - 35 && nextTextDelay <= delays[3] + 135))
    issues.push({
      rule: 'second old man gesture is painted alone before the next page',
      actual: nextTextDelay,
      expected: delays[3],
    })
  const gestureClear = inspectClearedDialogueFrames(draws, gestures.filter(Boolean), scene)
  if (gestureClear.issue)
    issues.push({ rule: 'post-dialogue gestures start on a cleared screen', ...gestureClear.issue })

  const dissolves = []
  for (const sample of events.filter(
    ({ kind, order, scene: id, ditherStep }) =>
      kind === 'scene-composite' &&
      id === scene &&
      won.order < order &&
      order < control.order &&
      Number.isInteger(ditherStep),
  )) {
    if (sample.ditherStep === 0) dissolves.push([])
    dissolves.at(-1)?.push(sample)
  }
  const transitionRequests = events.filter(
    ({ kind, order, ip, op }) =>
      kind === 'script-op' &&
      won.order < order &&
      order < control.order &&
      (game ? [29986, 30151].includes(ip) : op === 'ditherScreen'),
  )
  check('both authored transition requests are observed', transitionRequests.length, 2)
  const clearBeforeBackup = transitionRequests.map((request) => {
    // A clear recorded after the request can be too late for the outgoing framebuffer copy.
    const frame = drawn.findLast(({ atMs }) => atMs < request.atMs)
    return { request, frame }
  })
  for (const [index, { request, frame }] of clearBeforeBackup.entries()) {
    check(
      `a painted clear frame precedes the outgoing snapshot for transition ${index + 1}`,
      frame?.slots.length === 0 && request.atMs - frame.atMs >= 40,
      true,
    )
  }
  check('exactly two actual transitions between world shots', dissolves.length, transitions.length)
  const firstDitherDelay = elapsed(
    'solo party and Qilin hold before transformation',
    dissolves[0]?.[0]?.atMs,
    solo[0]?.atMs,
    delays[0],
    60,
  )
  const transitionDraws = dissolves.map((frames, index) => {
    const open = frames[0]
    const last = frames.at(-1)
    const states = [open, last].map((sample) => solo.findLast(({ order }) => order < sample.order))
    const expected = index === 0 ? [null, old(0), anu('left')] : [null, null, anu('left')]
    check(`target cast at both boundaries of transition ${index + 1}`, states.map(cast), [
      expected,
      expected,
    ])
    check(
      `transition covers its full ordered range ${index + 1}`,
      [
        open.ditherStep,
        last.ditherStep,
        frames.every(({ ditherStep }, i) => i === 0 || ditherStep > frames[i - 1].ditherStep),
      ],
      [0, 72, true],
    )
    const ms = elapsed(
      `original duration of transition ${index + 1}`,
      last.atMs,
      open.atMs,
      transitions[index],
      45,
    )
    const clear = inspectClearedDialogueFrames(draws, frames, scene)
    if (clear.issue)
      issues.push({ rule: `cleared dialogue through transition ${index + 1}`, ...clear.issue })
    return {
      open,
      last,
      ms,
      positions: states.map(visit),
      cast: states.map(cast),
      steps: frames.length,
    }
  })

  const exitInput = actions.find(({ phase, kind }) => phase === 'exit' && kind === 'down')
  const exitAt = exitInput?.atMs - timeOrigin
  const stand = [
    camera,
    [
      [0, 'anu', 5, feet, 3],
      [1, 'li-xiaoyao', 2, pixel(spec.world.departure), 6],
    ],
  ]
  check(
    'first actual regroup places both party members in their original pose',
    visit(regrouped),
    stand,
  )
  check(
    'actor representations are exchanged before the restored party is painted',
    cast(regrouped),
    [null, null, null],
  )
  check(
    'every pre-input frame after regroup has the same characters, feet and camera',
    stable(
      after.filter(({ order, atMs }) => order >= regrouped?.order && atMs <= exitAt),
      visit,
    ),
    [stand],
  )
  const departureDraw = after.find(
    ({ order, leader }) =>
      order >= departure.order && isDeepStrictEqual(leader, pixel(spec.world.departure)),
  )
  const exit = pixel(spec.world.departure)
  const walking = party(departureDraw)
  check(
    'one physical departure step is painted at the original camera and both feet',
    [departureDraw?.camera, walking?.map((member) => member.slice(0, 4))],
    [
      cameraAt(exit),
      [
        [0, 'anu', 5, exit],
        [1, 'li-xiaoyao', 2, exit],
      ],
    ],
  )
  // Both characters use the same stride phase of the existing walk cycle. The phase at
  // the first physical step varies with the world clock even for repeated Game runs.
  const stride = walking?.[0]?.[4]
  check(
    'both departure poses use the same walking phase with the original directions',
    [1, 2].includes(stride) && walking?.[1]?.[4] === stride + 6,
    true,
  )
  return {
    issues,
    dialogue,
    rewards,
    confirms: Object.fromEntries(
      Object.entries(confirms).map(([phase, presses]) => [phase, presses.length]),
    ),
    cast: stable(solo, cast),
    firstRoarPose,
    audio: audio[0],
    roarDelay,
    firstWorldReturn: solo[0],
    gestures,
    gesturesMs,
    nextTextDelay,
    firstDitherDelay,
    transitionDraws,
    clearBeforeBackup,
    regrouped,
    departureDraw,
  }
}
