const FRAME_SOURCE = {
  game: 'game:BattlePresent.draw',
  reforge: 'reforge:BattleSession.render',
}

const DEATH_FADE_MS = 72 * 16
// The source duration is measured between rendered edges, with up to two 40 ms Game ticks
// of sampling uncertainty. Reforge's wall time can also include paused gameplay time.
const EDGE_TOLERANCE_MS = 80

const at = (frame) => ({ frame: frame.seq, clockMs: frame.clockMs, atMs: frame.atMs })
const pose = (frame, slot) => frame.payload.players.find((player) => player.slot === slot)
const samePose = (a, b) => a?.x === b?.x && a?.y === b?.y
const enemy = (frame, slot) => frame.payload.enemies.find((draw) => draw.slot === slot)
const animationMatches = (frame, action) =>
  frame.payload.turn === action.turn &&
  frame.payload.animation?.actorId === action.actorId &&
  frame.payload.animation.kind === action.kind &&
  frame.payload.animation.targetId === action.targetId

const byte = (value) => Number.isInteger(value) && value >= 0 && value <= 255
const validChannels = (values, count) =>
  Array.isArray(values) && values.length === count && values.every(byte)
const equalChannels = (left, right) => left.every((value, i) => value === right[i])

function comparePortraitSamples(frames, scenario, engine, fail) {
  const expected = scenario.expected.portraitSamples
  const probe = scenario.portraitProbe
  const size = scenario.expected.portraitSize
  if (
    !Array.isArray(expected) ||
    !expected.length ||
    !Number.isInteger(probe?.slot) ||
    !Array.isArray(probe?.points) ||
    !probe.points.length ||
    !Array.isArray(size) ||
    size.length !== 2 ||
    !size.every((value) => Number.isInteger(value) && value > 0) ||
    !expected.every(
      (entry) =>
        Number.isInteger(entry?.turn) &&
        entry.turn > 0 &&
        Number.isInteger(entry.hp) &&
        entry.hp >= 0 &&
        Array.isArray(entry.rgbs) &&
        entry.rgbs.length === probe.points.length &&
        entry.rgbs.every((rgb) => rgb === null || validChannels(rgb, 3)),
    )
  ) {
    fail('oracle', 'portrait-expectation')
    return []
  }
  const observed = frames.filter(({ payload }) => payload.portrait !== undefined)
  if (observed.length !== expected.length)
    fail('integrity', 'portrait-sample-count', {
      expected: expected.length,
      actual: observed.length,
    })
  const source = engine === 'game' ? 'game:blitPortrait' : 'reforge:drawPlayerInfoBox'
  const pixel = (value) =>
    validChannels(value?.rgba, 4) &&
    (engine === 'game' ? byte(value.index) : value.index === undefined)
  return observed.flatMap((frame, i) => {
    const { portrait, turn, selecting, panels } = frame.payload
    const frameAt = at(frame)
    if (
      portrait?.source !== source ||
      !Number.isInteger(portrait.x) ||
      !Number.isInteger(portrait.y) ||
      !Array.isArray(portrait.samples) ||
      portrait.samples.length !== probe.points.length ||
      !portrait.samples.every(
        (entry, j) =>
          entry?.x === probe.points[j].x &&
          entry.y === probe.points[j].y &&
          pixel(entry.before) &&
          pixel(entry.after),
      ) ||
      !selecting ||
      !panels.includes(portrait.slot)
    ) {
      fail('integrity', 'portrait-native-pixels', { ...frameAt, turn, portrait })
      return []
    }
    const drawn = { ...frameAt, turn, ...portrait }
    const wanted = expected[i]
    if (!wanted) return [drawn]
    if (
      turn !== wanted.turn ||
      portrait.hp !== wanted.hp ||
      portrait.slot !== probe.slot ||
      portrait.width !== size[0] ||
      portrait.height !== size[1]
    )
      fail('business', 'portrait-selection-state', {
        ...frameAt,
        turn,
        hp: portrait.hp,
        slot: portrait.slot,
        size: [portrait.width, portrait.height],
        expected: { turn: wanted.turn, hp: wanted.hp, slot: probe.slot, size },
      })
    const palette = [],
      transparent = []
    for (const [j, sample] of portrait.samples.entries()) {
      const rgb = wanted.rgbs[j]
      const facts = { ...sample, logicalX: portrait.x + sample.x, logicalY: portrait.y + sample.y }
      if (rgb === null) {
        if (
          !equalChannels(sample.before.rgba, sample.after.rgba) ||
          sample.before.index !== sample.after.index
        )
          transparent.push(facts)
      } else if (!equalChannels([...rgb, 255], sample.after.rgba)) {
        palette.push({ ...facts, expected: [...rgb, 255] })
      }
    }
    if (palette.length)
      fail('business', 'portrait-palette', { ...frameAt, turn, hp: portrait.hp, samples: palette })
    if (transparent.length)
      fail('business', 'portrait-transparent-pixel', {
        ...frameAt,
        turn,
        hp: portrait.hp,
        samples: transparent,
      })
    return [drawn]
  })
}

function uniqueSlots(entries, size) {
  return (
    Array.isArray(entries) &&
    entries.every((slot) => Number.isInteger(slot) && slot >= 0 && slot < size) &&
    new Set(entries).size === entries.length
  )
}

function validFrame(entry, source, playerCount) {
  const p = entry.payload
  return (
    entry.source === source &&
    Number.isFinite(entry.clockMs) &&
    typeof p?.phase === 'string' &&
    Number.isSafeInteger(p.turn) &&
    typeof p.selecting === 'boolean' &&
    (p.animation === null ||
      [p.animation?.actorId, p.animation?.kind, p.animation?.targetId].every(
        (value) => typeof value === 'string',
      )) &&
    Array.isArray(p.enemies) &&
    uniqueSlots(
      p.enemies.map((draw) => draw?.slot),
      5,
    ) &&
    p.enemies.every((draw) => typeof draw.fading === 'boolean') &&
    Array.isArray(p.players) &&
    uniqueSlots(
      p.players.map((draw) => draw?.slot),
      playerCount,
    ) &&
    p.players.every(({ x, y }) => Number.isFinite(x) && Number.isFinite(y)) &&
    uniqueSlots(p.panels, playerCount) &&
    (p.settlement === null || typeof p.settlement === 'string') &&
    Array.isArray(p.numbers) &&
    p.numbers.every(
      (draw) =>
        ['yellow', 'blue'].includes(draw?.tone) &&
        uniqueSlots([draw.slot], draw.side === 'player' ? playerCount : 5) &&
        ['player', 'enemy'].includes(draw.side) &&
        (draw.numberId === undefined ||
          (Number.isSafeInteger(draw.numberId) && draw.numberId >= 0)) &&
        [draw.value, draw.right, draw.y, draw.age].every(Number.isFinite) &&
        Number.isInteger(draw.age) &&
        draw.age >= 0 &&
        draw.age <= 10,
    )
  )
}

/** Judge rendered output from the normal battle independently of logical action timestamps. */
export function validateBattlePresentation(trace, scenario) {
  const frames = Array.isArray(trace?.presentations)
    ? trace.presentations.filter((entry) => entry?.kind === 'battle-frame')
    : []
  const playerCount = scenario.expected.start.players.length
  const findings = [],
    deaths = [],
    heals = []
  let portraits
  const fail = (domain, rule, facts) => findings.push({ domain, rule, ...facts })
  const result = () => ({
    status: findings.length ? 'rejected' : 'passed',
    engine: trace?.engine,
    frames: frames.length,
    deaths,
    heals,
    ...(portraits === undefined ? {} : { portraits }),
    findings,
  })
  if (
    !frames.length ||
    frames.some(
      (frame, index) =>
        !validFrame(frame, FRAME_SOURCE[trace.engine], playerCount) ||
        (index > 0 && frame.clockMs < frames[index - 1].clockMs),
    )
  ) {
    fail('integrity', 'rendered-frame-stream', { count: frames.length })
    return result()
  }

  const ready = frames.find(({ payload }) => payload.selecting)
  if (!ready) fail('integrity', 'selection-frame-missing')
  const extraHud =
    frames.find(({ payload }) => payload.panels.length && payload.phase === 'performAction') ??
    frames.find(({ payload }) => payload.panels.length && payload.phase !== 'selectAction')
  if (extraHud)
    fail('business', 'hud-visible-outside-selection', {
      ...at(extraHud),
      phase: extraHud.payload.phase,
      slots: extraHud.payload.panels,
    })
  const missingHud = frames.find(
    ({ payload }) => payload.selecting && payload.panels.length !== playerCount,
  )
  if (missingHud)
    fail('business', 'hud-missing-during-selection', {
      ...at(missingHud),
      slots: missingHud.payload.panels,
    })
  if (scenario.expected.portraitSamples !== undefined)
    portraits = comparePortraitSamples(frames, scenario, trace.engine, fail)

  const settlement = frames.find(({ payload }) => payload.settlement !== null)
  if (!settlement) fail('integrity', 'settlement-draw-missing')
  const animations = scenario.expected.actions.map((action) =>
    ['defend', 'pass'].includes(action.kind)
      ? null
      : frames.find((frame) => animationMatches(frame, action)),
  )

  for (const [index, action] of scenario.expected.actions.entries()) {
    if (['defend', 'pass'].includes(action.kind)) continue
    const current = animations[index]
    if (!current) {
      fail('integrity', 'action-animation-draw-missing', {
        actorId: action.actorId,
        kind: action.kind,
      })
      continue
    }
    const next = animations.slice(index + 1).find(Boolean) ?? settlement
    for (const unit of action.before.enemies) {
      if (!unit?.alive || action.after.enemies[unit.slot]?.alive) continue
      const firstFade = frames.find(
        (frame) => frame.seq > current.seq && enemy(frame, unit.slot)?.fading,
      )
      const gone =
        firstFade && frames.find((frame) => frame.seq > firstFade.seq && !enemy(frame, unit.slot))
      if (enemy(current, unit.slot)?.fading !== false || !firstFade || !gone || !next) {
        fail('integrity', 'death-render-edges-missing', {
          enemyId: unit.id,
          actorId: action.actorId,
        })
        continue
      }
      const observed = {
        enemyId: unit.id,
        slot: unit.slot,
        start: at(firstFade),
        gone: at(gone),
        next: {
          ...at(next),
          ...(next.payload.animation
            ? { actorId: next.payload.animation.actorId }
            : { settlement: next.payload.settlement }),
        },
        durationMs: gone.clockMs - firstFade.clockMs,
        nextDelayMs: next.clockMs - gone.clockMs,
      }
      deaths.push(observed)
      if (Math.abs(observed.durationMs - DEATH_FADE_MS) > EDGE_TOLERANCE_MS)
        fail('business', 'death-fade-duration', observed)
      if (next.seq < gone.seq) fail('business', 'death-fade-overlaps-next-presentation', observed)
      else if (
        scenario.id === 'party-lanterns' &&
        next.payload.animation?.kind === 'attack' &&
        observed.nextDelayMs > EDGE_TOLERANCE_MS
      )
        fail('business', 'death-fade-delays-next-attack', observed)
    }

    if (action.kind !== 'item' || action.itemId !== '99') continue
    const actorSlot = action.before.players.find(({ id }) => id === action.actorId)?.slot
    const targetSlot = action.before.players.find(({ id }) => id === action.targetId)?.slot
    const start = frames.find(
      (frame) =>
        frame.seq <= current.seq && frame.payload.selecting && frame.payload.turn === action.turn,
    )
    const casterBase = start && pose(start, actorSlot)
    const targetBase = start && pose(start, targetSlot)
    const itemFrames = frames.filter(
      (frame) => frame.seq >= current.seq && (next === undefined || frame.seq < next.seq),
    )
    const departed = itemFrames.find(
      (frame) => pose(frame, actorSlot) && !samePose(pose(frame, actorSlot), casterBase),
    )
    const returned =
      departed &&
      itemFrames.find(
        (frame) => frame.seq > departed.seq && samePose(pose(frame, actorSlot), casterBase),
      )
    const herbNumber = ({ tone, value }) => tone === 'yellow' && value === 50
    const visible = itemFrames.find(({ payload }) => payload.numbers.some(herbNumber))
    const number = visible?.payload.numbers.find(herbNumber)
    if (!casterBase || !targetBase || !departed || !returned || !visible || !number) {
      fail('integrity', 'herb-render-edges-missing', {
        actorId: action.actorId,
        targetId: action.targetId,
      })
      continue
    }
    const observed = {
      actorId: action.actorId,
      targetId: action.targetId,
      departed: at(departed),
      returned: at(returned),
      draw: { ...at(visible), ...number, casterPose: pose(visible, actorSlot) },
      casterBase,
      targetBase,
    }
    heals.push(observed)
    if (visible.seq < returned.seq) fail('business', 'herb-number-before-return', observed)
    if (
      number.side !== 'player' ||
      number.slot !== targetSlot ||
      number.right !== targetBase.x + 6 ||
      number.y + number.age !== Math.max(targetBase.y - 75, 10)
    )
      fail('business', 'herb-number-target-or-anchor', observed)
  }
  return result()
}
