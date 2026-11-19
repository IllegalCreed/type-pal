import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { sha256 } from '../browser-journey.mjs'
import { readEvidenceArtifact } from '../evidence-artifact.mjs'
import { assertInputLedger } from '../input-ledger.mjs'
import {
  departingPosition,
  gameScene,
  grid,
  initialTrack,
  party,
  readSources,
  returnTrack,
  returnedPosition,
  scenarios,
} from './scenarios.mjs'

const [scenario, gamePath, reforgePath] = process.argv.slice(2)
const spec = scenarios[scenario]
assert(
  spec && gamePath && reforgePath && process.argv.length === 5,
  'usage: node scripts/e2e/boss-entrances/compare.mjs SCENARIO GAME_REPORT REFORGE_REPORT',
)
const source = await readSources(spec)
const fieldMusic = initialTrack(spec)
const returnMusic = returnTrack(spec)
const returnedAt = returnedPosition(spec)
const departureAt = departingPosition(spec)
const approachKey = spec.approach ?? 'ArrowUp'
const exitKey = spec.world.exit ?? 'ArrowDown'
const facing = (key) => key.slice('Arrow'.length).toLowerCase()
const roles = party.map(({ role }) => role)
const subtitle = (s) => s?.replace(/[\s"“”]/gu, '') ?? ''
const speaker = (s) => s?.replace(/^spk\./u, '').replace(/∶$/u, '') ?? null
const totalReward = () => [
  source.original.exp + source.summonBonus.exp,
  source.original.cash + source.summonBonus.cash,
]
const mainAction = (action, game) => {
  const kind = game ? (action.type === 'magic' ? 'cast' : action.type) : action.kind
  return {
    kind,
    spell: kind === 'cast' ? String(game ? action.actionId : action.skillId) : null,
    target: ['defend', 'pass'].includes(kind)
      ? null
      : game
        ? action.target === -1
          ? null
          : action.target
        : (action.targetEnemyIdx ?? action.targetPlayerIdx ?? null),
  }
}

function difference(expected, actual, path = []) {
  if (isDeepStrictEqual(expected, actual)) return null
  if (
    expected != null &&
    actual != null &&
    typeof expected === 'object' &&
    typeof actual === 'object'
  ) {
    if (Array.isArray(expected) && Array.isArray(actual) && expected.length !== actual.length)
      return { path: [...path, 'length'], game: expected.length, reforge: actual.length }
    for (const key of new Set([...Object.keys(expected), ...Object.keys(actual)])) {
      const failure = difference(expected[key], actual[key], [...path, key])
      if (failure) return failure
    }
  }
  return { path, game: expected, reforge: actual }
}

function checkDialogue(events, before, after, game) {
  const expected = (commands) =>
    commands
      .filter(({ op, text }) => op === 'showDialog' && !text.endsWith('∶'))
      .map(({ text }) => subtitle(text))
  const painted = (start, end) => {
    const pages = new Map()
    for (const event of events) {
      const box = event.box
      if (
        event.kind !== 'paint' ||
        event.order <= start ||
        event.order >= end ||
        !box?.text ||
        !box.phase.startsWith('waiting')
      )
        continue
      pages.set(JSON.stringify([box.at, box.id, box.page]), box)
    }
    return [...pages.values()].map(({ text, speaker: heading }) => ({
      text,
      speaker: speaker(heading),
    }))
  }
  const [beforeText, afterText] = [source.pre, source.post].map(expected)
  const pre = painted(before.trigger, before.battle)
  const post = painted(after.won, after.control)
  if (game && spec.disk.reward) {
    const notes = events.filter(
      ({ kind, order }) =>
        kind === 'reward-note-drawn' && order > after.won && order < after.control,
    )
    assert.equal(notes.length, 1, 'native victory reward line')
    post.unshift({ text: notes[0].text, speaker: null })
  }
  for (const [pages, texts, label] of [
    [pre, beforeText, 'before battle'],
    [post, afterText, 'after victory'],
  ]) {
    const displayed = subtitle(pages.map(({ text }) => text).join(''))
    assert.equal(displayed, texts.join(''), `native drawn dialogue ${label}`)
  }
  return { pre, post }
}

function checkThiefForeground(events, draws, { trigger, launch, won, control }, game) {
  const issues = []
  const expect = (condition, rule, actual) => {
    if (!condition) issues.push({ rule, actual })
  }
  const worldFrames = events.filter(({ kind }) => kind === 'world-drawn')
  const pre = worldFrames.filter(({ order }) => order >= trigger.order && order < launch.order)
  const post = worldFrames.filter(
    ({ order, atMs }) => order > won.order && atMs <= control.atMs + 34,
  )
  const initial = pre.find(({ ambience, changing }) => ambience === 'night' && !changing)
  const day = post.find(({ ambience, changing }) => ambience === 'day' && !changing)
  const palette = events.find(
    (event) =>
      event.order > won.order && (game ? event.ip === 13843 : event.op === 'toggleDayNight'),
  )
  const expectedPages = [
    {
      slot: 'top',
      speaker: null,
      portrait: null,
      lines: source.pre.slice(2, 3).map((row) => row.text),
    },
    {
      slot: 'bottom',
      speaker: '女飞贼',
      portrait: 41,
      lines: source.post
        .filter(({ messageIndex }) => [4608, 4609].includes(messageIndex))
        .map((row) => row.text),
    },
    {
      slot: 'bottom',
      speaker: '林月如',
      portrait: 22,
      lines: source.post.filter(({ messageIndex }) => messageIndex === 4611).map((row) => row.text),
    },
  ]
  const painted = expectedPages.map((page, index) => {
    const opening = index === 0
    const start = opening ? trigger.atMs : won.atMs
    const end = opening ? launch.atMs : control.atMs
    const frames = draws.filter(
      ({ atMs, scene, slots }) =>
        scene === spec.scene &&
        atMs >= start &&
        atMs <= end &&
        slots.some(
          ({ speaker: heading, lines }) => speaker(heading) === page.speaker && lines.length > 0,
        ),
    )
    const full = frames.find(({ slots }) =>
      slots.some(({ lines }) => isDeepStrictEqual(lines.map(subtitle), page.lines.map(subtitle))),
    )
    const first = frames[0]
    const slot = full?.slots.find(({ speaker: heading }) => speaker(heading) === page.speaker)
    const actual = slot && {
      slot: slot.slot,
      speaker: speaker(slot.speaker),
      portrait: slot.portrait,
      lines: slot.lines,
      portraitLayout: slot.portraitLayout,
    }
    expect(
      actual &&
        isDeepStrictEqual(
          { ...actual, lines: actual.lines.map(subtitle) },
          { ...page, lines: page.lines.map(subtitle), portraitLayout: page.portrait !== null },
        ),
      `rendered dialogue ${index + 1}`,
      actual ?? null,
    )
    return { firstMs: first?.atMs ?? null, full: actual ?? null }
  })
  expect(initial, 'settled night frame before entering battle', pre[0] ?? null)
  expect(
    post[0]?.ambience === 'night' && !post[0].changing,
    'first world frame still at night',
    post[0] ?? null,
  )
  for (const [rule, frame] of [
    ['contact', initial],
    ['world return', post[0]],
  ]) {
    if (!frame) {
      expect(false, `${rule} frame present`, null)
      continue
    }
    expect(
      isDeepStrictEqual(frame.camera, [1088, 144]) && isDeepStrictEqual(frame.leader, [1248, 256]),
      `${rule} first camera and leader`,
      frame,
    )
    const thief = frame.actors[spec.owner]
    const standIn = frame.actors.e1630
    expect(
      thief?.asset === 350 &&
        thief.frame === 3 &&
        thief.facing === 'left' &&
        isDeepStrictEqual(thief.position, [1296, 280]),
      `${rule} thief pose`,
      thief ?? null,
    )
    expect(
      standIn?.asset === 380 && isDeepStrictEqual(standIn.position, [1312, 272]),
      `${rule} second actor draw`,
      standIn ?? null,
    )
  }
  const paletteMs = day && palette ? day.atMs - palette.atMs : null
  expect(
    paletteMs !== null && paletteMs >= 775 && paletteMs <= 1050,
    '800 ms palette transition',
    paletteMs,
  )
  expect(
    day && painted[1].firstMs !== null && painted[1].firstMs >= day.atMs - 20,
    'dawn finishes before the first rendered line',
    { dayMs: day?.atMs, firstLineMs: painted[1].firstMs },
  )
  const colorWeight = (frame) => frame?.colors.reduce((total, [r, g, b]) => total + r + g + b, 0)
  expect(
    initial && day && colorWeight(initial) > 0 && colorWeight(day) > colorWeight(initial),
    'visible brightening at the unchanged camera',
    { night: colorWeight(initial), day: colorWeight(day) },
  )

  const jump = events.filter(
    ({ kind, asset, order }) =>
      kind === 'sfx-start' && asset === 45 && order > won.order && order < control.order,
  )
  expect(jump.length === 1, 'one actual jump sound', jump)
  const thiefDraws = post.filter(({ actors }) => actors[spec.owner])
  const firstStep = thiefDraws.find(({ actors }) => actors[spec.owner].position[1] === 288)
  const lastJump = thiefDraws.find(({ actors }) => actors[spec.owner].position[1] === 452)
  const hidden =
    lastJump && post.find(({ actors, order }) => order > lastJump.order && !actors[spec.owner])
  expect(
    hidden && painted[2].firstMs !== null && hidden.atMs < painted[2].firstMs,
    'thief finishes escape before Lin Yueru speaks',
    { hiddenMs: hidden?.atMs, firstLineMs: painted[2].firstMs },
  )
  const positions = []
  if (firstStep && lastJump) {
    for (const { actors, leader, order } of thiefDraws) {
      if (order < firstStep.order || order > lastJump.order) continue
      const pose = actors[spec.owner]
      const frame = [pose.position, pose.frame, pose.facing, leader]
      if (!isDeepStrictEqual(frame, positions.at(-1))) positions.push(frame)
    }
  }
  const afterJump = [
    [20, 8],
    [16, 8],
    [12, 8],
    [8, 10],
    [4, 12],
    [0, 14],
    [0, 16],
  ]
  const sources = []
  let [x, y] = [1104, 376]
  for (const [dx, dy] of afterJump) {
    x -= dx
    y += dy
    sources.push([[x, y], 13, 'down'])
  }
  const jumps = positions.map((frame) => frame.slice(0, 3)).filter(([[, y]]) => y > 376)
  expect(isDeepStrictEqual(jumps, sources), 'all seven drawn leap positions', jumps)
  const leaderRoute = [
    [55, -23, 0],
    [56, -23, 0],
    [57, -23, 0],
    ...Array.from({ length: 11 }, (_, step) => [58, -22 + step, 0]),
  ]
  const paints = events.filter(({ kind, surface }) => kind === 'paint' && surface === 'world')
  function formationAt(frame, reason) {
    const party = frame?.geometry?.party
      .slice()
      .sort((a, b) => a.slot - b.slot)
      .map((member) => ({
        role: member.id,
        position: member.world,
        frame: member.frame,
        sprite:
          typeof member.spriteId === 'string'
            ? source.spriteChunks.get(member.spriteId)
            : member.spriteId,
      }))
    expect(
      party?.length === 2 &&
        party.every(({ frame, sprite }) => Number.isInteger(frame) && Number.isInteger(sprite)),
      reason,
      { position: frame?.position, party },
    )
    return party ?? null
  }
  const arrival = paints.find(({ order }) => order > trigger.order && order < launch.order)
  const contactFormation = formationAt(arrival, 'both party sprites on the first contact frame')
  const afterVictory = paints.filter(({ order }) => order > won.order && order < control.order)
  const formations = leaderRoute.map((position) =>
    formationAt(
      afterVictory.find((entry) => isDeepStrictEqual(entry.position, position)),
      'both party sprites at the actual route footstep',
    ),
  )
  return {
    issues,
    paletteMs,
    painted,
    positions,
    formations,
    contactFormation,
    jumpMs: jump[0]?.atMs,
    hiddenMs: hidden?.atMs,
  }
}

function checkSpiderForeground(events, trigger, cue, launch) {
  const paint = events.filter(
    ({ kind, order, surface }) =>
      kind === 'paint' && surface === 'world' && order > trigger.order && order < launch.order,
  )
  const warning = paint.find(
    ({ box }) => box?.text === '月如～小心！' && box.phase.startsWith('waiting'),
  )
  assert(warning && warning.order < cue.order, 'the warning was painted before 182 started')
  const [col, row, height] = spec.contact
  const movement = [0.5, 1, 1.5, 2].map((delta) => {
    const frame = paint.find(
      (event) =>
        event.order > cue.order && isDeepStrictEqual(event.position, [col + delta, row, height]),
    )
    assert(frame, `missing painted spider nudge ${delta} cells from contact`)
    return frame
  })
  const speech = paint.find(
    ({ box, order }) => order > movement.at(-1).order && speaker(box?.speaker) === '黑蜘蛛',
  )
  assert(speech, 'missing the spider dialogue after the fourth nudge')
  const observed = [cue, ...movement, speech]
  assert(observed.slice(1).every((event, i) => event.order > observed[i].order))
  const intervals = observed.slice(1).map((event, i) => event.atMs - observed[i].atMs)
  const expected = [400, 100, 100, 100, 200]
  const samplingTolerance = [90, 44, 44, 44, 60]
  for (const [i, duration] of intervals.entries()) {
    assert(
      Math.abs(duration - expected[i]) <= samplingTolerance[i],
      `Black Spider foreground beat ${i + 1}: ${duration.toFixed(1)} ms, original ${expected[i]} ms`,
    )
  }
  const spiderPosition = ({ actors }) =>
    actors.find(({ id, state }) => id === 'e2347' && state === 1)?.position
  const spiderSteps = []
  for (const frame of paint) {
    if (frame.order <= cue.order || frame.order > speech.order) continue
    const position = spiderPosition(frame)
    if (position && !isDeepStrictEqual(spiderSteps.at(-1)?.position, position))
      spiderSteps.push({ atMs: frame.atMs, position })
  }
  const originalSpiderPath = [
    [61.125, 25.125, 0],
    [61.375, 25.375, 0],
    [61.875, 25.875, 0],
    [62.625, 26.625, 0],
    [63.625, 27.625, 0],
    [64.75, 28.75, 0],
    [65.875, 29.875, 0],
    [67, 31, 0],
  ]
  assert.deepEqual(
    movement.map(spiderPosition),
    originalSpiderPath.slice(3, 7),
    'Black Spider pose drawn in the same frame as each party nudge',
  )
  assert.deepEqual(
    spiderSteps.map(({ position }) => position),
    originalSpiderPath,
  )
  assert.deepEqual(spiderPosition(speech), originalSpiderPath.at(-1))
  const firstSpiderStep = spiderSteps[0].atMs - cue.atMs
  assert(
    Math.abs(firstSpiderStep - 100) <= 50,
    `Black Spider starts moving after the first world tick: ${firstSpiderStep.toFixed(1)} ms`,
  )
  return {
    intervalsMs: intervals,
    soundAtMs: cue.atMs,
    spiderSteps,
    movement: movement.map((frame) => ({
      atMs: frame.atMs,
      position: frame.position,
      spiderPosition: spiderPosition(frame),
    })),
    speechAtMs: speech.atMs,
    speechSpiderPosition: spiderPosition(speech),
  }
}

async function inspect(path, engine) {
  const bytes = await readFile(path)
  const report = JSON.parse(bytes)
  const game = engine === 'game'
  assert.equal(report.engine, engine)
  assert.equal(report.fragment, spec.id)
  assert.deepEqual(report.input, spec)
  assert.equal(report.status, 'passed', report.failure)
  assert.deepEqual(report.errors, [])
  assert.deepEqual(report.cleanupErrors ?? [], [])
  assert.equal(report.inputExecution.status, 'passed')
  assertInputLedger(report.actions, { requireReceipts: true })
  for (const [phase, key] of [
    ['approach', approachKey],
    ['exit', exitKey],
  ])
    assert.deepEqual(
      report.actions.filter((a) => a.phase === phase).map((a) => [a.kind, a.key]),
      [
        ['down', key],
        ['up', key],
      ],
      `one held key for ${phase}`,
    )
  assert.deepEqual(
    report.contexts.map(({ label, initialDatabases }) => [label, initialDatabases]),
    game
      ? [
          ['canonical-boot', []],
          [spec.id, []],
        ]
      : [[spec.id, []]],
  )
  const [run] = report.cases
  const read = async (ref) => {
    const binding = await readEvidenceArtifact(dirname(path), ref)
    assert.equal(binding.binding.status, 'verified')
    return binding.value
  }
  const [saved, raw] = await Promise.all([read(report.save), read(run.raw)])
  if (game) {
    assert.equal(gameScene(spec), saved.gs.wNumScene)
    assert.deepEqual(
      saved.gs.partyMembers,
      party.map(({ roleId }) => roleId),
    )
    assert.equal(run.slotReadback, report.save.sha256)
  } else {
    const readback = await read(run.slotReadback)
    assert.deepEqual(readback.position, {
      sceneId: spec.scene,
      pos: grid(spec.start),
      facing: facing(approachKey),
    })
    assert.equal(readback.version, saved.version)
    assert.equal(readback.contentVersion, saved.contentVersion)
    assert.deepEqual(readback.world.party, saved.world.party)
  }
  assert.equal(raw.engine, engine)
  assert.equal(raw.overflow, false)
  assert.deepEqual(raw.errors, [])
  assert.equal(raw.seed, spec.seed)
  const events = raw.events
  assert(events.length > 0)
  const resources = raw.resources ?? []
  if (spec.prelude) {
    assert(resources.length > 0, 'actual decoded sprites')
    const orders = new Set(resources.map(({ order }) => order))
    for (const { kind, seq, width, height, pixels, opaque } of resources) {
      assert.equal(kind, 'sprite-frame')
      assert.equal(resources[seq]?.pixels, pixels)
      assert(
        width > 0 &&
          height > 0 &&
          pixels.length === width * height &&
          opaque.length === pixels.length,
      )
    }
    for (const { actors } of events.filter(({ kind }) => kind === 'world-drawn'))
      assert(
        Object.values(actors).every(({ resource }) => orders.has(resource)),
        'missing draw receipt',
      )
  }
  assert(
    events.every(({ seq }, i) => seq === i),
    'truncated event stream',
  )
  const nativeOrder = [...events, ...resources].sort((left, right) => left.order - right.order)
  assert(
    nativeOrder.every(
      ({ order, atMs }, i) =>
        order === i && Number.isFinite(atMs) && (i === 0 || atMs >= nativeOrder[i - 1].atMs),
    ),
    'unbound or out-of-order native evidence',
  )
  const find = (type) => events.filter(({ kind }) => kind === type)
  const once = (type) => {
    const hits = find(type)
    assert.equal(hits.length, 1, `${engine} ${type} event count`)
    return hits[0]
  }
  const trigger = once('trigger')
  assert.deepEqual(
    [trigger.scene, trigger.owner, trigger.position],
    [spec.scene, spec.owner, spec.contact],
  )
  const [approach, departure] = find('move')
  assert.deepEqual(
    find('move').map(({ from, to, facing }) => [from, to, facing]),
    [
      [spec.start, spec.contact, facing(approachKey)],
      [returnedAt, departureAt, facing(exitKey)],
    ],
  )
  assert(approach.order < trigger.order)
  const script = find('script-op')
  const launch = script.filter((event) => (game ? event.opcode === 7 : event.op === 'startBattle'))
  assert.equal(launch.length, 1)
  if (game) {
    assert.equal(trigger.ip, spec.disk.entry)
    assert.deepEqual([launch[0].ip, launch[0].operands], [spec.disk.battle, [spec.team, 41075, 0]])
    const caller = once('battle-caller')
    assert.deepEqual(
      [caller.enemyTeamId, caller.battleFieldId, caller.isBoss],
      [spec.team, spec.field, true],
    )
  } else {
    assert.deepEqual(launch[0].path, [
      'initial',
      source.canonical.findIndex(({ kind }) => kind === 'startBattle'),
    ])
    assert.equal(once('script-result').arm, 'none')
  }
  const prepared = once('prepared')
  assert.deepEqual(
    [
      game ? prepared.field : once('field').fieldId,
      game ? prepared.music : Number(prepared.music.split('.').at(-1)),
      prepared.boss,
      prepared.auto,
    ],
    [spec.field, spec.music, true, false],
  )
  if (!game) assert.equal(prepared.team, `team-${spec.team}`)
  assert.deepEqual(
    prepared.players.map(({ id, roleId, hp, mp }) => [id ?? roleId, hp, mp]),
    party.map(({ role, hp, mp }) => [role, hp, mp]),
  )
  const actualSlots = game ? prepared.slots : find('action')[0]?.slots
  assert(Array.isArray(actualSlots))
  assert.deepEqual(
    Array.from({ length: 5 }, (_, i) => actualSlots[i]?.id ?? null),
    source.slots,
  )

  const entry = once('entry-complete')
  assert.deepEqual(
    find('entry-band').map(({ band }) => band),
    [0, 1, 2, 3, 4, 5, 6],
  )
  assert(find('entry-band').every(({ pixels }) => pixels.length === 6))
  const music = find('music-start').filter(({ track }) => track === spec.music)
  const fieldTracks = find('music-start').filter(
    ({ track, context }) => track === fieldMusic && context === 'running',
  )
  assert(
    fieldTracks.some(({ order }) => order < trigger.order),
    'original field music started before contact',
  )
  assert.equal(music.length, 1)
  assert.equal(music[0].context, 'running')
  const menu = once('command-menu-drawn')
  assert(prepared.order < entry.order && entry.order < menu.order, 'menu after the native reveal')
  assert(
    entry.order < music[0].order && music[0].order < find('action')[0]?.order,
    'battle music audible after reveal and before the first executed combat action',
  )
  const commands = find('command').map(({ slot, turn, action }) => ({
    slot,
    turn,
    ...mainAction(action, game),
  }))
  assert.deepEqual(
    commands.filter(({ turn }) => turn === 1).map(({ slot, kind }) => [slot, kind]),
    [
      [0, 'defend'],
      [1, 'defend'],
    ],
  )
  assert(
    commands
      .filter(({ turn }) => turn > 1)
      .every(
        ({ kind, target }) =>
          kind === 'attack' &&
          Number.isInteger(target) &&
          target >= 0 &&
          target < source.slots.length,
      ),
  )
  assert(report.actions.some(({ phase }) => phase === 'battle-select'))

  const actions = find('action').map(({ turn, actor, action, party: members, slots }) => ({
    turn,
    side: game ? (actor.isEnemy ? 'enemy' : 'player') : action.side,
    slot: game ? actor.idx : action.idx,
    ...mainAction(action, game),
    hp: members.map(({ hp }) => hp),
    enemies: Array.from({ length: 5 }, (_, i) => slots[i] ?? null),
  }))
  const enemy = actions.filter(({ side, slot }) => side === 'enemy' && slot === spec.slot)
  const expectedEnemyActions = {
    45: Array(6).fill('attack'),
    44: ['cast', 'cast', 'pass', 'cast'],
    43: ['cast', 'cast', 'cast', 'attack'],
    29: ['cast', 'pass', 'cast'],
  }[spec.team]
  assert.deepEqual(
    enemy.map(({ kind }) => kind),
    expectedEnemyActions,
  )
  if (spec.team === 29)
    assert.deepEqual(
      enemy.map(({ spell }) => spell),
      ['381', null, '343'],
    )
  if (spec.team === 43) {
    assert.deepEqual(
      enemy.filter(({ kind }) => kind === 'cast').map(({ spell }) => spell),
      ['317', '317', '317'],
    )
    const nudges = script.filter(({ op, ip }) =>
      game ? [21678, 21680, 21682, 21684].includes(ip) : op === 'nudgeParty',
    )
    assert.equal(nudges.length, 4, 'four actual pre-battle nudge commands')
    assert(nudges.every(({ order }) => order < launch[0].order))
    assert(
      events.some(
        (e) =>
          e.kind === 'paint' &&
          e.order < launch[0].order &&
          e.actors.some(({ id, state }) => id === 'e2347' && state === 1),
      ),
    )
  }
  if (spec.team === 44) {
    assert.deepEqual(
      enemy.map(({ spell }) => spell),
      ['316', '303', null, '316'],
    )
    const summon = enemy.find(({ kind }) => kind === 'pass')
    assert.deepEqual(
      summon.enemies.map((slot) => slot.id),
      ['enemy-403', 'enemy-469', 'enemy-403', 'enemy-403', 'enemy-403'],
    )
    assert.equal(summon.enemies.filter(({ id, hp }) => id === 'enemy-403' && hp === 32).length, 4)
    assert(
      actions.some(({ side, slot, kind }) => side === 'enemy' && slot !== 1 && kind === 'attack'),
    )
  }
  assert.deepEqual([actions.at(-1).side, actions.at(-1).kind], ['player', 'attack'])
  assert(actions.at(-1).enemies.every((slot) => slot === null || slot.hp === 0))

  const poses = find('boss-frame').filter(
    ({ slot, active }) => slot === spec.slot && active?.side === 'enemy' && active.slot === slot,
  )
  assert(poses.length > 0, 'boss never actually rendered during its action')
  assert(
    poses.every(
      ({ frame, x, y }) => Number.isInteger(frame) && Number.isInteger(x) && Number.isInteger(y),
    ),
  )
  assert(
    new Set(poses.map(({ x, y }) => `${x},${y}`)).size >= 3,
    'boss action never changed its drawn position',
  )
  const effectSounds = find('sfx-start')
  assert(effectSounds.every(({ context, frames }) => context === 'running' && frames > 0))
  const won = once('battle-finished')
  const soundIds = effectSounds
    .filter(({ order }) => !spec.prelude || (order > prepared.order && order < won.order))
    .map(({ asset }) => asset)
  let spiderForeground
  if (spec.team === 45)
    assert.equal(
      soundIds.filter((asset) => asset === source.original.attackSound).length,
      enemy.length,
    )
  else if (spec.team === 44) {
    assert(soundIds.includes(source.original.magicSound), 'fox spell sound did not start')
    assert.equal(soundIds.filter((asset) => asset === 212).length, 1, 'fox summon sound count')
  } else if (spec.team === 43) {
    assert.equal(soundIds.filter((asset) => asset === 182).length, 1)
    assert.equal(soundIds.filter((asset) => asset === 502).length, 1)
    assert.equal(soundIds.filter((asset) => asset === 503).length, 3)
    const worldCue = effectSounds.find(({ asset }) => asset === 182)
    assert(trigger.order < worldCue.order && worldCue.order < launch[0].order)
    spiderForeground = checkSpiderForeground(events, trigger, worldCue, launch[0])
  }
  assert.equal(soundIds.filter((asset) => asset === source.original.deathSound).length, 1)

  assert.equal(won.result, game ? 'won' : 'victory')
  const summary = once('victory-summary-drawn')
  const [exp, cash] = totalReward()
  assert.deepEqual([summary.exp, summary.cash], [exp, cash])
  assert(summary.order < won.order)
  assert.equal(won.cash, cash)
  assert.deepEqual(
    won.inventory,
    game && spec.disk.defeated ? spec.world.inventory : [],
    'hook inventory at the engine-specific battle completion boundary',
  )
  const control = once('world-control')
  assert.deepEqual(control.position, returnedAt)
  assert(won.order < control.order && control.order < departure.order)
  const last = run.departure.state
  assert.deepEqual(
    [last.scene, last.position, last.ready, last.box, last.battle],
    [spec.scene, departureAt, true, null, null],
  )
  assert.deepEqual([last.cash, last.inventory], [cash, spec.world.inventory])
  assert.deepEqual(
    last.party.map(({ id, exp: gained }) => [id, gained]),
    roles.map((role) => [role, exp]),
  )
  assert.deepEqual(control.inventory, spec.world.inventory)
  assert(
    find('music-start').some(
      ({ order, track, context }) =>
        order > won.order && track === returnMusic && context === 'running',
    ),
    'original field music after victory',
  )
  assert.equal(last.music, returnMusic)
  if (!spec.prelude)
    assert.equal(run.returned.owner.state ?? spec.disk.owner[2], spec.world.gameState)
  if (game) {
    assert.equal(won.continuation, spec.disk.battle + 1)
    assert.equal(run.returned.owner.triggerMode, spec.world.triggerMode)
    assert.equal(run.returned.owner.resume, spec.team === 45 ? spec.disk.last + 1 : null)
    assert(script.some(({ ip }) => ip === spec.disk.last))
    if (spec.disk.reward)
      assert.equal(
        script.filter(
          ({ ip, order }) => ip === spec.disk.reward && order > won.order && order < control.order,
        ).length,
        1,
      )
  } else if (spec.team === 45) {
    const { behavior } = run.returned.owner
    assert.deepEqual(behavior.triggerActivation, {
      kind: 'use',
      value: { on: 'interact', range: 2 },
    })
    assert.deepEqual(behavior.trigger.cursor, {
      behavior: 'default',
      at: { kind: 'stage', stage: 'legacy-002' },
    })
  } else {
    if (!spec.prelude) assert.equal(run.returned.owner.hidden, true)
    if (spec.disk.reward)
      assert.equal(
        script.filter(
          ({ op, order }) => op === 'giveItem' && order > won.order && order < control.order,
        ).length,
        1,
      )
  }
  if (spec.disk.defeated) {
    const begun = once('defeated-script-start')
    const granted = once('defeated-script-end')
    const notice = once('defeated-note-drawn')
    assert.deepEqual([begun.id, granted.id], [spec.enemy, spec.enemy])
    assert.deepEqual(granted.inventory, spec.world.inventory)
    assert.equal(subtitle(notice.text), subtitle(source.defeatedNote))
    assert(
      summary.order < begun.order && begun.order < notice.order && notice.order < control.order,
    )
    assert(game ? granted.order < won.order : won.order < begun.order)
  }
  const dialogue = checkDialogue(
    events,
    { trigger: trigger.order, battle: launch[0].order },
    { won: won.order, control: control.order },
    game,
  )
  const foreground = spec.prelude
    ? checkThiefForeground(
        events,
        await read(run.renderedDialogue),
        {
          trigger,
          launch: launch[0],
          won,
          control,
        },
        game,
      )
    : undefined
  if (
    foreground &&
    ((run.returned.owner.state ?? spec.disk.owner[2]) !== spec.world.gameState ||
      (!game && !run.returned.owner.hidden))
  )
    foreground.issues.push({
      rule: 'thief hidden when control returns',
      actual: run.returned.owner,
    })
  const drops = find('drop-sample')
  assert.deepEqual(
    drops.map(({ slot }) => slot),
    spec.team === 44 ? (game ? [0, 2, 3, 4] : [0, 1, 2, 3]) : [],
  )
  assert(
    drops.every(({ id, value }) => id === 'enemy-403' && Math.floor(value * 100) >= 11),
    'summoned bee drop probes must use original failed drop samples',
  )
  const comparable = {
    dialogue: [dialogue.pre, dialogue.post].map((pages) =>
      pages.map(({ text, speaker }) => ({ text: subtitle(text), speaker })),
    ),
    commands,
    actions,
    rng: find('rng').map(({ value }) => value),
    drops: drops.map(({ id, value }) => ({ id, value })),
    sounds: soundIds,
    ...(foreground
      ? {
          contactFormation: foreground.contactFormation,
          visibleChase: foreground.positions,
          formation: foreground.formations,
        }
      : {}),
    ending: {
      party: last.party.map(({ weapon, ...member }) => member),
      cash: last.cash,
      inventory: last.inventory,
      music: last.music,
    },
  }
  return {
    engine,
    report: resolve(path),
    reportSha256: sha256(bytes),
    revision: report.revision,
    profile: report.profile,
    raw: run.raw,
    sourceHashes: report.dependencies.hashes,
    warnings: report.warnings,
    dialogue,
    foreground,
    spiderForeground,
    clips: { contactMs: trigger.atMs, returnMs: control.atMs, exitMs: departure.atMs },
    audioTiming: {
      cueAfterRevealMs: music[0].atMs - entry.atMs,
      cueAfterMenuMs: music[0].atMs - menu.atMs,
    },
    visual: {
      bossFrames: poses.length,
      frameIndexes: [...new Set(poses.map(({ frame }) => frame))],
    },
    comparable,
  }
}

const sides = await Promise.allSettled([inspect(gamePath, 'game'), inspect(reforgePath, 'reforge')])
const failures = sides.flatMap((result, i) =>
  result.status === 'rejected'
    ? [{ engine: i === 0 ? 'game' : 'reforge', error: result.reason.stack }]
    : [],
)
const [game, reforge] = sides.map(({ value }) => value)
if (!failures.length) {
  for (const result of [game, reforge]) {
    for (const issue of result.foreground?.issues ?? [])
      failures.push({ engine: result.engine, ...issue })
  }
  const comparableGame = game.comparable
  assert.equal(difference(comparableGame, structuredClone(comparableGame)), null)
  const changed = structuredClone(comparableGame)
  changed.ending.music += 1
  assert.deepEqual(difference(comparableGame, changed)?.path, ['ending', 'music'])
  if (game.revision !== reforge.revision)
    failures.push({ path: ['revision'], game: game.revision, reforge: reforge.revision })
  if (game.profile !== reforge.profile)
    failures.push({ path: ['profile'], game: game.profile, reforge: reforge.profile })
  for (const key of Object.keys(comparableGame)) {
    const first = difference(comparableGame[key], reforge.comparable[key], [key])
    if (first) failures.push(first)
  }
  const shared = Object.keys(game.sourceHashes).filter((name) => name in reforge.sourceHashes)
  for (const path of shared)
    if (game.sourceHashes[path] !== reforge.sourceHashes[path])
      failures.push({
        path: ['source', path],
        game: game.sourceHashes[path],
        reforge: reforge.sourceHashes[path],
      })
}
console.log(
  JSON.stringify(
    {
      kind: 'world-boss-entrance',
      status: failures.length ? 'failed' : 'passed',
      scenario,
      game,
      reforge,
      failures,
    },
    null,
    2,
  ),
)
if (failures.length) process.exitCode = 1
