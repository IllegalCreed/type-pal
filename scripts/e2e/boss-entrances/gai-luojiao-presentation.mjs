import assert from 'node:assert/strict'
import { isDeepStrictEqual } from 'node:util'
import { compareRenderedDialogue, sourceDialogueGroups } from '../rendered-dialogue-comparison.mjs'

export function readGaiLuojiaoSources(data, commands, spec, enemy) {
  const { scene, world } = spec
  const original = data.gameScene.eventObjects
  const raw = (ip, opcode) => {
    assert.equal(commands[ip].opcode, opcode)
    return commands[ip].operands
  }
  assert.deepEqual(raw(world.join.ip, 0x75), [1, world.join.roleId + 1, 0])
  const [visitor] = raw(31165, 0x49)
  const anu = original.find(({ id }) => id === visitor - 1)
  const [first, last, state] = raw(31240, 0x9a)
  const exitActors = original.filter(({ id }) => id >= first - 1 && id <= last - 1)
  const start = Number(anu.autoLabel.slice(2))
  const steps = [start, start + 1].map((ip) => {
    const [col, row, half] = raw(ip, 0x10)
    return [32 * col + 16 * half, 16 * row + 8 * half]
  })
  const owner = original.find(({ id }) => `e${id}` === spec.owner)
  const distance = ([col, row]) =>
    Math.abs(16 * (col - row) - owner.x) + 2 * Math.abs(8 * (col + row) - owner.y)
  const range = (owner.triggerMode - 4) * 32 + 16
  assert(distance(spec.start) >= range && distance(spec.contact) < range)
  assert.deepEqual(spec.contact, [spec.start[0] + 1, spec.start[1], spec.start[2]])
  const windows = [
    ['contact', 31159, 31160],
    ['combat', enemy.scriptOnTurnStart, 42861],
    ['return', 31167, world.join.ip - 1],
  ].map(([phase, first, last]) => ({ phase, scene, first, last }))
  return {
    pages: windows.flatMap(({ phase, ...window }) =>
      sourceDialogueGroups(commands, [window]).map((page) => ({ ...page, phase })),
    ),
    visitor: {
      id: `e${anu.id}`,
      asset: anu.spriteNum,
      start: [anu.x, anu.y],
      steps,
      turns: commands
        .slice(31171, world.join.ip)
        .filter(({ opcode, operands }) => opcode === 0x16 && operands[0] === visitor)
        .map(({ operands: [, direction, frame] }) => direction * anu.nSpriteFrames + frame),
    },
    courtyard: Object.fromEntries(
      exitActors.map(({ id, spriteNum, x, y, direction, nSpriteFrames, currentFrameNum }) => [
        `e${id}`,
        [spriteNum, [x, y], direction * nSpriteFrames + currentFrameNum],
      ]),
    ),
    exitState: state,
    beforeCall: 100 * raw(31166, 0x09)[0],
    afterCall: 100 * raw(31170, 0x09)[0],
  }
}

export function inspectGaiLuojiaoPresentation({ events, draws, boundaries, source, spec, run }) {
  const { trigger, launch, won, control } = boundaries
  const facts = source.gai
  const issues = []
  const check = (rule, actual, expected) => {
    if (!isDeepStrictEqual(actual, expected)) issues.push({ rule, actual, expected })
  }
  const pages = compareRenderedDialogue(
    draws.filter(
      ({ atMs, slots }) =>
        atMs >= trigger.atMs &&
        atMs < control.atMs &&
        slots.some(({ lines }) => lines.join('') !== source.defeatedNote),
    ),
    facts.pages,
    source.locale,
  )
  issues.push(...pages.findings)
  const phases = pages.checked?.map(({ firstComplete }) => {
    if (!firstComplete) return null
    if (firstComplete.atMs < launch.atMs) return 'contact'
    return firstComplete.atMs < won.atMs ? 'combat' : 'return'
  })
  check(
    'each page completes in its source phase',
    phases,
    facts.pages.map(({ phase }) => phase),
  )
  const world = events.filter(
    ({ kind, scene, visible }) => kind === 'world-drawn' && visible && scene === spec.scene,
  )
  const before = world.findLast(({ order }) => order < launch.order)
  const aftermath = world.filter(({ order }) => order > won.order)
  const first = aftermath[0]
  const [x, y] = [16 * (spec.contact[0] - spec.contact[1]), 8 * (spec.contact[0] + spec.contact[1])]
  check(
    'the battle returns to its photographed feet and camera',
    [first?.leader, first?.camera, first?.party.map(({ id }) => id)],
    [[x, y], [x - 160, y - 112], ['li-xiaoyao']],
  )
  check(
    'the reserve actor waits offstage before the battle',
    before?.actors[facts.visitor.id],
    undefined,
  )
  const drawnCourtyard = (frame) =>
    Object.fromEntries(
      Object.entries(frame?.actors ?? {})
        .filter(([id]) => Object.hasOwn(facts.courtyard, id))
        .map(([id, { asset, position, frame }]) => [id, [asset, position, frame]]),
    )
  check('the courtyard cast is drawn correctly at contact', drawnCourtyard(before), facts.courtyard)
  check('the courtyard cast is drawn on the first return', drawnCourtyard(first), facts.courtyard)
  const walk = []
  for (const draw of aftermath) {
    const actor = draw.actors[facts.visitor.id]
    if (!actor) continue
    const pose = { asset: actor.asset, position: actor.position, frame: actor.frame }
    if (!isDeepStrictEqual(walk.at(-1)?.pose, pose))
      walk.push({ atMs: draw.atMs, order: draw.order, pose })
  }
  check(
    'Anu is visibly present at both authored arrival feet',
    facts.visitor.steps.map((pos) =>
      walk.some(
        ({ pose }) => pose.asset === facts.visitor.asset && isDeepStrictEqual(pose.position, pos),
      ),
    ),
    [true, true],
  )
  const stepsBeforeCall = facts.beforeCall / 100
  const [startX, startY] = facts.visitor.start
  const callingAt = [startX - 6 * stepsBeforeCall, startY - 3 * stepsBeforeCall]
  const [goal, final] = facts.visitor.steps
  const approach = [
    ...Array.from({ length: 7 }, (_, i) => [
      callingAt[0] + 6 * (6 - i),
      callingAt[1] + 3 * (6 - i),
    ]),
    ...Array.from({ length: 10 }, (_, i) => [
      callingAt[0] - 6 * (i + 1),
      callingAt[1] - 3 * (i + 1),
    ]),
    goal,
    [goal[0] + 6, goal[1] - 3],
    final,
  ]
  check(
    'all visible rescue steps match the original diagonal movement',
    walk.slice(0, approach.length).map(({ pose }) => pose.position),
    approach,
  )
  check(
    'Anu stops at the call foot and finishes walking before the next page',
    pages.checked
      ?.filter(({ rows }) => ['dlg.11027', 'dlg.11029'].includes(rows[0].id))
      .map(
        ({ firstComplete }) =>
          walk.findLast(({ atMs }) => atMs <= firstComplete?.atMs)?.pose.position,
      ),
    [callingAt, final],
  )
  check(
    'the visitor holds the original three turning poses',
    walk.slice(approach.length - 1).map(({ pose }) => pose.frame),
    [6, ...facts.visitor.turns],
  )
  const stepIntervals = walk
    .slice(0, approach.length)
    .slice(1)
    .map(({ atMs }, i) => atMs - walk[i].atMs)
  check(
    'normal steps use the original beat with a stop for the shout',
    stepIntervals.map((ms, i) => (i === 6 ? ms >= 100 : Math.abs(ms - 100) <= 60)),
    Array(approach.length - 1).fill(true),
  )
  const resumed = walk.slice(7, 17).map(({ pose }) => pose.frame)
  check(
    'the resumed diagonal walk alternates the two legs around the standing frame',
    resumed.length === 10 &&
      [4, 5].includes(resumed[0]) &&
      resumed.every(
        (frame, step) => frame === (step % 2 ? 3 : step % 4 === 0 ? resumed[0] : 9 - resumed[0]),
      ),
    true,
  )
  const stoppedAt = walk[approach.length - 1]?.atMs
  const nextPage = draws.find(
    ({ atMs, slots }) => atMs > stoppedAt && slots.some(({ portrait }) => portrait === 28),
  )
  const settledMs = nextPage?.atMs - stoppedAt
  check(
    'the second page begins after the remaining world beats',
    Math.abs(settledMs - (facts.afterCall - 1300)) <= 80,
    true,
  )
  const departure = events.find(({ kind, order }) => kind === 'move' && order > control.order)
  const landed = aftermath.find(({ order }) => order >= control.order && order < departure?.order)
  check(
    'courtyard extras and Anu’s double leave before freely walking',
    landed && Object.keys(landed.actors),
    [],
  )
  const finalActorStates = run.returned.state.actors
    .filter(({ id }) => Object.hasOwn(facts.courtyard, id))
    .map(({ id, state }) => [id, state])
  check(
    'all seven source actors persist as inactive',
    finalActorStates.toSorted(),
    Object.keys(facts.courtyard)
      .toSorted()
      .map((id) => [id, facts.exitState]),
  )
  check(
    'control returns with the original party join',
    run.returned.state.party.map(({ id }) => id),
    ['li-xiaoyao', spec.world.join.role],
  )
  check(
    'Anu joins on the original trail instead of being reseeded behind the new facing',
    landed?.party
      .toSorted((a, b) => a.slot - b.slot)
      .map(({ id, world, frame }) => [id, world, frame]),
    [
      ['li-xiaoyao', [x, y], 3],
      [spec.world.join.role, [x - 16, y - 8], 9],
    ],
  )
  return { issues, pages, first, walk, landed, stepIntervals, settledMs }
}
