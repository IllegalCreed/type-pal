const FRAME_SOURCE = {
  game: 'game:BattlePresent.draw',
  reforge: 'reforge:BattleSession.render',
}

const AUDIO_SOURCE = {
  game: {
    'sfx-decoded': 'game:AudioManager.loadSfx:decodeAudioData',
    'sfx-request': 'game:AudioManager.playSfx',
    'sfx-start': 'game:AudioManager.play:AudioBufferSourceNode.start',
  },
  reforge: {
    'sfx-decoded': 'reforge:SfxPlayer.ensureDecoded:decode',
    'sfx-request': 'reforge:SfxPlayer.play',
    'sfx-start': 'reforge:browserAdapter.play:AudioBufferSourceNode.start',
  },
}
const CASUALTY_SOUNDS = new Set(['player-dying', 'player-death'])
const CUE_KINDS = new Set([
  'player-windup',
  'player-weapon',
  'enemy-windup',
  'enemy-impact',
  'cast-windup',
  'spell-effect',
  'item',
  'enemy-death',
  ...CASUALTY_SOUNDS,
])
const PAL_SOUND_SAMPLE_RATE = 22050

const DEATH_FADE_MS = 72 * 16
// The source duration is measured between rendered edges, with up to two 40 ms Game ticks
// of sampling uncertainty. Reforge's wall time can also include paused gameplay time.
const EDGE_TOLERANCE_MS = 80
// CLASSIC fight.c waits eight battle frames (battle.h: 40 ms per frame) after displaying changes.
const BATTLE_FRAME_MS = 40
const ROUND_FEEDBACK_MS = 8 * BATTLE_FRAME_MS

const at = (frame) => ({ frame: frame.seq, clockMs: frame.clockMs, atMs: frame.atMs })
const pose = (frame, slot) => frame.payload.players.find((player) => player.slot === slot)
const position = ({ slot, x, y }) => ({ slot, x, y })
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

const validFrameIndex = (value) => Number.isSafeInteger(value) && value >= 0
const indexedFighter = (draw) =>
  draw && validFrameIndex(draw.frameIndex) && Number.isFinite(draw.x) && Number.isFinite(draw.y)

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
    p.enemies.every(
      (draw) =>
        typeof draw.fading === 'boolean' && (draw.frameIndex === undefined || indexedFighter(draw)),
    ) &&
    Array.isArray(p.players) &&
    uniqueSlots(
      p.players.map((draw) => draw?.slot),
      playerCount,
    ) &&
    p.players.every(
      (draw) =>
        Number.isFinite(draw.x) &&
        Number.isFinite(draw.y) &&
        (draw.frameIndex === undefined ||
          (validFrameIndex(draw.frameIndex) && Number.isSafeInteger(draw.colorShift))),
    ) &&
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

export function firstNumberDraws(frames) {
  const draws = []
  const seen = new Set()
  for (const frame of frames)
    for (const number of frame.payload.numbers) {
      const { numberId, age } = number
      // Old trace format stored only the initial age of the actual draw.
      if (numberId === undefined ? age !== 0 : seen.has(numberId)) continue
      draws.push({ frame, number })
      if (numberId !== undefined) seen.add(numberId)
    }
  return draws
}

function comparePoisonRoundEnds(trace, frames, scenario, playerCount, fail) {
  const missingId = frames.find(({ payload }) =>
    payload.numbers.some(({ numberId }) => numberId === undefined),
  )
  if (missingId) {
    fail('integrity', 'round-end-number-identity', at(missingId))
    return []
  }
  const numbers = firstNumberDraws(frames)
  return scenario.expected.rounds.flatMap((expected) => {
    const { turn } = expected
    const round = trace.rounds?.find((entry) => entry.turn === turn)
    const boundary = {
      turn,
      order: round?.order,
      clockMs: round?.clockMs,
      atMs: round?.atMs,
      source: round?.source,
    }
    if (!Number.isFinite(boundary.clockMs) || boundary.clockMs < 0) {
      fail('integrity', 'round-end-clock-missing', boundary)
      return []
    }
    const next = frames.find(
      ({ order, payload }) =>
        order > round.order && payload.turn === turn + 1 && payload.panels.length > 0,
    )
    const selection = next && { ...at(next), slots: next.payload.panels }
    if (!next?.payload.selecting || next.payload.panels.length !== playerCount) {
      fail('integrity', 'round-end-selection-frame-missing', { ...boundary, selection })
      return []
    }
    const hpBefore = expected.before.players[0].hp
    const hpAfter = expected.after.players[0].hp
    const lostHp = hpBefore - hpAfter
    const draws = numbers
      .filter(({ frame }) => frame.order > round.order && frame.order <= next.order)
      .map(({ frame, number }) => ({ ...at(frame), ...number }))
    const draw = draws[0]
    const observed = { ...boundary, hpBefore, hpAfter, selection, draws }
    if (
      lostHp > 0
        ? draws.length !== 1 ||
          draw.tone !== 'blue' ||
          draw.side !== 'player' ||
          draw.slot !== 0 ||
          draw.value !== lostHp
        : draws.length !== 0
    ) {
      fail('business', 'round-end-number', observed)
      return [observed]
    }
    if ((draw?.clockMs ?? selection.clockMs) < boundary.clockMs) {
      fail('integrity', 'round-end-clock-order', observed)
      return [observed]
    }
    // The first number and next HUD are sampled at draw time, with up to one tick per edge.
    const delayMs = selection.clockMs - (draw?.clockMs ?? boundary.clockMs)
    const rangeMs = draw
      ? [ROUND_FEEDBACK_MS - BATTLE_FRAME_MS, ROUND_FEEDBACK_MS + EDGE_TOLERANCE_MS]
      : [0, EDGE_TOLERANCE_MS]
    const timing = { ...observed, delayMs, rangeMs }
    if (delayMs < rangeMs[0]) fail('business', 'round-end-selection-early', timing)
    if (delayMs > rangeMs[1]) fail('business', 'round-end-selection-delay', timing)
    return [timing]
  })
}

const hasSpritePose = (draw, frameIndex, colorShift = 0) =>
  draw.frameIndex === frameIndex && draw.colorShift === colorShift
const atOffset = (draw, base, dx, dy) => draw.x === base.x + dx && draw.y === base.y + dy

function enemyPhysicalMotion(frames, expected, animations, probe, fail, subject) {
  const actionIndex = probe?.actionIndex
  const action = expected.actions[actionIndex]
  if (
    !Number.isSafeInteger(actionIndex) ||
    action?.kind !== 'attack' ||
    action.actorSide !== 'enemy'
  ) {
    fail('oracle', `${subject}-pose-expectation`, { probe })
    return undefined
  }
  const target = action.before.players.find(({ id }) => id === action.targetId)
  const attacker = action.before.enemies.find((unit) => unit?.id === action.actorId)
  const start = animations[actionIndex]
  const next = animations.slice(actionIndex + 1).find(Boolean)
  const selection =
    start &&
    frames.findLast(
      (frame) =>
        frame.seq < start.seq && frame.payload.turn === action.turn && frame.payload.selecting,
    )
  const identity = {
    actionIndex,
    turn: action.turn,
    actorId: action.actorId,
    targetId: action.targetId,
  }
  if (!target || !attacker || !selection || !next) {
    fail('integrity', `${subject}-render-window-missing`, identity)
    return undefined
  }
  const visible = frames.filter((frame) => frame.seq >= start.seq && frame.seq < next.seq)
  const player = (frame) => pose(frame, target.slot)
  const foe = (frame) => enemy(frame, attacker.slot)
  const sample = (frame) =>
    frame && { ...at(frame), order: frame.order, player: player(frame), enemy: foe(frame) }
  const missing = [selection, ...visible].find(
    (frame) => !indexedFighter(player(frame)) || !indexedFighter(foe(frame)),
  )
  if (missing) {
    fail('integrity', `${subject}-fighter-pose-missing`, { ...identity, draw: sample(missing) })
    return undefined
  }
  const base = player(selection)
  // CLASSIC positions are relative to the target's feet (fight.c:5007–5125).
  const charge = visible.find((frame) => atOffset(foe(frame), base, -44, -16))
  const knockback =
    charge && visible.find((frame) => frame.seq > charge.seq && atOffset(player(frame), base, 8, 4))
  const returned =
    knockback && visible.find((frame) => frame.seq > knockback.seq && samePose(player(frame), base))
  const recoil =
    returned &&
    visible.find(
      (frame) =>
        frame.seq > knockback.seq &&
        frame.seq < returned.seq &&
        atOffset(player(frame), base, 10, 5),
    )
  const observed = {
    ...identity,
    home: sample(selection),
    charge: sample(charge),
    knockback: sample(knockback),
    recoil: sample(recoil),
    returned: sample(returned),
  }
  if (!charge || !knockback || !recoil || !returned) {
    fail('business', `${subject}-motion-edges`, observed)
    return undefined
  }
  const playerNumbers = firstNumberDraws(frames).filter(
    ({ number }) =>
      number.side === 'player' && number.slot === target.slot && number.tone === 'blue',
  )
  const numbers = playerNumbers.filter(
    ({ frame }) => frame.seq >= start.seq && frame.seq < next.seq,
  )
  return { action, target, start, next, observed, visible, player, sample, numbers, playerNumbers }
}

function guardMotion(frames, expected, animations, probe, fail) {
  if (![probe?.guardFrame, probe?.idleFrame].every(validFrameIndex)) {
    fail('oracle', 'guard-pose-expectation', { probe })
    return undefined
  }
  return enemyPhysicalMotion(frames, expected, animations, probe, fail, 'guard')
}

const DEFEND_CADENCE_SEGMENTS = [
  { key: 'commandToGuard', from: 'command', to: 'guard', rule: 'defend-command-to-guard-cadence' },
  { key: 'guardToEnemy', from: 'guard', to: 'enemyStart', rule: 'defend-guard-to-enemy-cadence' },
  {
    key: 'enemyToDamage',
    from: 'enemyStart',
    to: 'damage',
    rule: 'defend-enemy-to-damage-cadence',
  },
]

function compareDefendCadence(trace, frames, expected, motion, hit, fail) {
  const { action, player, sample, start, playerNumbers } = motion
  const { actionIndex, turn, actorId, targetId } = motion.observed
  const { cadenceMs: rangesMs, guardFrame } = expected.defendRecovery
  const identity = { actionIndex, turn, actorId, targetId }
  const defendActionIndex = actionIndex - 1
  const isDefend = (entry) =>
    entry?.turn === turn &&
    entry.actorId === targetId &&
    entry.actorSide === undefined &&
    entry.kind === 'defend' &&
    entry.targetId === null
  const validRange = (range) =>
    Array.isArray(range) &&
    range.length === 2 &&
    range.every((bound) => Number.isFinite(bound) && bound >= 0) &&
    range[0] <= range[1]
  if (
    !isDefend(expected.actions[defendActionIndex]) ||
    !DEFEND_CADENCE_SEGMENTS.every(({ key }) => validRange(rangesMs?.[key]))
  ) {
    fail('oracle', 'defend-cadence-expectation', { ...identity, rangesMs })
    return undefined
  }
  const commands = trace.commands?.filter(isDefend) ?? []
  const nativeDefend = trace.actions?.[defendActionIndex]
  if (
    commands.length !== 1 ||
    !isDefend(nativeDefend) ||
    nativeDefend.guard?.before !== false ||
    nativeDefend.guard.after !== true
  ) {
    fail('integrity', 'defend-cadence-native-defend-missing', {
      ...identity,
      defendActionIndex,
      commands: commands.length,
      nativeDefend,
    })
    return undefined
  }
  const beforeAttack = frames.filter(
    (frame) => frame.seq <= start.seq && frame.payload.turn === turn,
  )
  const missingPose = beforeAttack.find((frame) => !indexedFighter(player(frame)))
  if (missingPose) {
    fail('integrity', 'defend-cadence-pose-missing', { ...identity, draw: sample(missingPose) })
    return undefined
  }
  // Read the first guard draw even if it was premature or coincides with enemy motion.
  const guard = beforeAttack.find((frame) => player(frame).frameIndex === guardFrame)
  const event = ({ order, atMs, source, kind, actorId, turn }) => ({
    order,
    atMs,
    source,
    kind,
    actorId,
    turn,
  })
  const draw = (frame) => frame && { ...sample(frame), source: frame.source }
  const numberDraw = (entry) => entry && { ...draw(entry.frame), number: entry.number }
  const firstDamage = playerNumbers.find(
    ({ frame, number }) =>
      frame.order > commands[0].order &&
      frame.payload.turn === turn &&
      number.value === action.rawDamage,
  )
  // A later identical numeral must not replace an earlier first draw outside the impact window.
  if (firstDamage !== hit) {
    fail('business', 'defend-cadence-first-damage-draw', {
      ...identity,
      firstDraw: numberDraw(firstDamage),
      impactDraw: numberDraw(hit),
      charge: motion.observed.charge,
      knockback: motion.observed.knockback,
    })
    return undefined
  }
  const points = {
    command: event(commands[0]),
    nativeDefend: { ...event(nativeDefend), guard: nativeDefend.guard },
    guard: draw(guard),
    enemyStart: draw(start),
    damage: numberDraw(firstDamage),
  }
  const ordered = Object.values(points)
  if (
    ordered.some(
      (point) =>
        !Number.isSafeInteger(point?.order) ||
        point.order < 0 ||
        !Number.isFinite(point.atMs) ||
        point.atMs < 0,
    )
  ) {
    fail('integrity', 'defend-cadence-edges-missing', { ...identity, ...points })
    return undefined
  }
  if (ordered.some((point, index) => index > 0 && point.order <= ordered[index - 1].order)) {
    fail('business', 'defend-cadence-render-order', { ...identity, ...points })
    return undefined
  }
  if (ordered.some((point, index) => index > 0 && point.atMs < ordered[index - 1].atMs)) {
    fail('integrity', 'defend-cadence-clock-order', { ...identity, ...points })
    return undefined
  }
  const durationsMs = {}
  // Command, rule completion and actual paint all use the recorder clock for this comparison.
  for (const { key, from, to, rule } of DEFEND_CADENCE_SEGMENTS) {
    const actualMs = points[to].atMs - points[from].atMs
    const rangeMs = rangesMs[key]
    durationsMs[key] = actualMs
    if (actualMs < rangeMs[0] || actualMs > rangeMs[1])
      fail('business', rule, { ...identity, from: points[from], to: points[to], actualMs, rangeMs })
  }
  return { ...points, durationsMs, rangesMs }
}

function compareDefendRecovery(trace, frames, expected, animations, fail) {
  const probe = expected.defendRecovery
  const motion = guardMotion(frames, expected, animations, probe, fail)
  if (!motion) return undefined
  const { action, target, observed, visible, player, sample, numbers } = motion
  const wantedRound = expected.rounds?.find(({ turn }) => turn === action.turn)
  if (!validFrameIndex(probe.hitFrame) || action.guard?.before !== true || !wantedRound) {
    fail('oracle', 'defend-recovery-expectation', { probe })
    return undefined
  }
  const round = trace.rounds?.find(({ turn }) => turn === action.turn)
  const waiting =
    round &&
    visible.filter((frame) => frame.seq >= observed.returned.frame && frame.order < round.order)
  if (!waiting?.length) {
    fail('integrity', 'defend-recovery-round-missing', observed)
    return undefined
  }
  const hit = numbers.find(
    ({ frame, number }) =>
      frame.seq >= observed.charge.frame &&
      frame.seq < observed.knockback.frame &&
      number.value === action.rawDamage,
  )
  const roundDamage =
    wantedRound.before.players[target.slot].hp - wantedRound.after.players[target.slot].hp
  const poison = numbers.find(
    ({ frame, number }) => frame.order > round.order && number.value === roundDamage,
  )
  const through = sample(waiting.at(-1))
  const result = {
    ...observed,
    hit: hit && { ...sample(hit.frame), number: hit.number },
    through,
    waitingFrames: waiting.length,
    round: { order: round.order, clockMs: round.clockMs },
    poison: poison && { ...sample(poison.frame), number: poison.number },
  }
  if (
    !hasSpritePose(observed.charge.player, probe.guardFrame) ||
    !hit ||
    !hasSpritePose(player(hit.frame), probe.hitFrame, 6) ||
    ![observed.knockback, observed.recoil].every(({ player }) =>
      hasSpritePose(player, probe.hitFrame),
    )
  )
    fail('business', 'defend-hit-frame', {
      ...observed,
      hit: result.hit,
      expectedFrame: probe.hitFrame,
      expectedChargeFrame: probe.guardFrame,
    })
  const wrong = waiting.find((frame) => !hasSpritePose(player(frame), probe.guardFrame))
  if (wrong)
    fail('business', 'defend-recovery-frame', {
      ...observed,
      draw: sample(wrong),
      expectedFrame: probe.guardFrame,
    })
  if (!poison || !hasSpritePose(player(poison.frame), probe.idleFrame))
    fail('business', 'defend-round-poison-frame', {
      ...observed,
      poison: result.poison,
      expectedFrame: probe.idleFrame,
    })
  if (probe.cadenceMs !== undefined)
    result.cadence = compareDefendCadence(trace, frames, expected, motion, hit, fail)
  return result
}

function compareAutomaticBlock(frames, expected, animations, fail) {
  const probe = expected.automaticBlock
  const motion = guardMotion(frames, expected, animations, probe, fail)
  if (!motion) return undefined
  const { action, observed, visible, player, sample, numbers } = motion
  if (action.blocked !== true || action.rawDamage !== 0 || action.guard?.before !== false) {
    fail('oracle', 'automatic-block-expectation', { probe })
    return undefined
  }
  const early = visible.find(
    (frame) => frame.seq < observed.charge.frame && !hasSpritePose(player(frame), probe.idleFrame),
  )
  if (early)
    fail('business', 'automatic-block-before-charge', {
      ...observed,
      draw: sample(early),
      expectedFrame: probe.idleFrame,
    })
  const guarding = visible.filter(
    (frame) => frame.seq >= observed.charge.frame && frame.seq < observed.returned.frame,
  )
  const wrong = guarding.find((frame) => !hasSpritePose(player(frame), probe.guardFrame))
  if (wrong)
    fail('business', 'automatic-block-guard-frame', {
      ...observed,
      draw: sample(wrong),
      expectedFrame: probe.guardFrame,
    })
  if (!hasSpritePose(observed.returned.player, probe.idleFrame))
    fail('business', 'automatic-block-recovery-frame', {
      ...observed,
      expectedFrame: probe.idleFrame,
    })
  const extra = numbers[0]
  if (extra)
    fail('business', 'automatic-block-damage-number', {
      ...observed,
      draw: sample(extra.frame),
      number: extra.number,
    })
  return { ...observed, through: sample(guarding.at(-1)), guardFrames: guarding.length }
}

function comparePlayerCasualties(frames, expected, animations, fail) {
  const probes = expected.playerCasualties
  if (
    !Array.isArray(probes) ||
    !probes.length ||
    new Set(probes.map((probe) => probe?.actionIndex)).size !== probes.length
  ) {
    fail('oracle', 'player-casualty-expectation', { probes })
    return []
  }
  return probes.flatMap((probe) => {
    const motion = enemyPhysicalMotion(frames, expected, animations, probe, fail, 'player-casualty')
    if (!motion) return []
    const { action, target, start, next, observed, visible, player, sample, playerNumbers } = motion
    const { actionIndex, turn, targetId } = observed
    const { recoveryFrame, soundKind } = probe
    const dead = soundKind === 'player-death'
    const hpAfter = action.after.players[target.slot]?.hp
    const dyingThreshold = Math.min(100, Math.floor(target.maxHP / 5))
    if (
      !CASUALTY_SOUNDS.has(soundKind) ||
      !validFrameIndex(recoveryFrame) ||
      !(action.rawDamage > 0) ||
      target.hp - hpAfter !== action.rawDamage ||
      (dead
        ? hpAfter !== 0
        : target.hp < dyingThreshold || hpAfter <= 0 || hpAfter >= dyingThreshold)
    ) {
      fail('oracle', 'player-casualty-expectation', { probe, hpBefore: target.hp, hpAfter })
      return []
    }

    const first = playerNumbers.find(({ frame }) => frame.payload.turn === turn)
    const hit = first && { ...sample(first.frame), number: first.number }
    const finish = sample(visible.find((frame) => !animationMatches(frame, action)) ?? next)
    const nextDraw = { ...sample(next), animation: next.payload.animation }
    const afterReturn = visible.filter((frame) => frame.seq >= observed.returned.frame)
    if (dead) afterReturn.push(next)
    const wrong = afterReturn.find((frame) => {
      const draw = player(frame)
      return !draw || !hasSpritePose(draw, recoveryFrame) || !samePose(draw, observed.home.player)
    })
    const result = {
      ...observed,
      soundKind,
      hpBefore: target.hp,
      hpAfter,
      hit,
      finish,
      next: nextDraw,
      through: sample(afterReturn.at(-1)),
    }
    if (
      !hit ||
      hit.number.value !== action.rawDamage ||
      hit.frame < observed.charge.frame ||
      hit.frame >= observed.knockback.frame ||
      !animationMatches(first.frame, action) ||
      !hasSpritePose(hit.player, 4, 6) ||
      !samePose(hit.player, observed.home.player) ||
      ![observed.knockback, observed.recoil].every(({ player }) => hasSpritePose(player, 4)) ||
      finish.frame <= observed.returned.frame ||
      !samePose(observed.returned.enemy, observed.home.enemy)
    )
      fail('business', 'player-casualty-hit-frame', { ...result, rawDamage: action.rawDamage })
    if (wrong)
      fail('business', 'player-casualty-recovery-frame', {
        ...result,
        draw: sample(wrong),
        expectedFrame: recoveryFrame,
      })
    const intervening = visible.find(
      (frame) => frame.payload.animation && !animationMatches(frame, action),
    )
    if (dead) {
      const survivor = action.after.players.find(({ id }) => id === next.payload.animation.actorId)
      const deadAction = frames.find(
        (frame) => frame.seq > start.seq && frame.payload.animation?.actorId === targetId,
      )
      if (deadAction)
        fail('business', 'dead-player-animation', {
          actionIndex,
          targetId,
          draw: sample(deadAction),
        })
      if (!(survivor?.hp > 0) || next.payload.turn !== turn || intervening)
        fail('business', 'player-casualty-survivor-action', {
          ...result,
          intervening: sample(intervening),
        })
    } else if (
      intervening ||
      !afterReturn.some(({ payload }) => payload.turn === turn + 1 && payload.selecting)
    )
      fail('business', 'player-casualty-next-selection', {
        ...result,
        intervening: sample(intervening),
      })
    return [result]
  })
}

function cueRenderWindow(cue, action, animation, frames, deaths) {
  if (cue.kind === 'enemy-death') {
    const death = deaths.find(({ enemyId }) => enemyId === action.targetId)
    return death && { first: death.start, through: death.gone, slot: death.slot }
  }
  if (!animation) return undefined
  // Frame compression can omit an unchanged pose while an animation cue is playing.
  const next = frames.find((frame) => frame.seq > animation.seq && !animationMatches(frame, action))
  return next && { first: at(animation), through: at(next) }
}

function compareAudioCues(trace, expected, frames, animations, deaths, playerCasualties, fail) {
  const { audioCues, audioSourceFrames } = expected
  if (
    !Array.isArray(audioCues) ||
    !audioCues.length ||
    !audioCues.every(
      (cue) =>
        Number.isSafeInteger(cue?.actionIndex) &&
        expected.actions[cue.actionIndex] &&
        CUE_KINDS.has(cue.kind) &&
        typeof cue.assetId === 'string' &&
        /^sound\.pal\.\d{3}$/u.test(cue.assetId) &&
        Number.isSafeInteger(audioSourceFrames?.[cue.assetId]) &&
        audioSourceFrames[cue.assetId] > 0,
    )
  ) {
    fail('oracle', 'audio-cue-expectation')
    return undefined
  }
  const audioEvents = trace.audioEvents
  const firstCommand = trace.commands?.[0]
  if (!Array.isArray(audioEvents) || !audioEvents.length || !firstCommand) {
    fail('integrity', 'audio-evidence-missing')
    return undefined
  }
  const source = AUDIO_SOURCE[trace.engine]
  const badSource = audioEvents.findIndex(
    (entry) => !Object.hasOwn(source, entry?.kind) || entry.source !== source[entry.kind],
  )
  if (badSource !== -1) {
    fail('integrity', 'audio-native-source', { event: audioEvents[badSource] })
    return undefined
  }
  const decoded = audioEvents.filter(({ kind }) => kind === 'sfx-decoded')
  const allRequests = audioEvents.filter(({ kind }) => kind === 'sfx-request')
  const allStarts = audioEvents.filter(({ kind }) => kind === 'sfx-start')
  if (
    !decoded.every(({ bufferId }, index) => bufferId === index) ||
    !allRequests.every(({ cueId }, index) => cueId === index)
  ) {
    fail('integrity', 'audio-native-identities')
    return undefined
  }
  const startsByCue = new Map()
  for (const start of allStarts) {
    const request = allRequests[start.cueId]
    const buffer = decoded[start.bufferId]
    if (!request || !buffer || request.order >= start.order || buffer.order >= start.order) {
      fail('integrity', 'audio-start-provenance', { start, request, buffer })
      return undefined
    }
    if (startsByCue.has(start.cueId)) {
      fail('business', 'audio-cue-start-count', { request, start })
      return undefined
    }
    startsByCue.set(start.cueId, start)
  }
  const requests = allRequests.filter(({ order }) => order > firstCommand.order)
  const starts = allStarts.filter(({ cueId }) => allRequests[cueId].order > firstCommand.order)
  const result = {
    decoded: decoded.length,
    requested: requests.length,
    started: starts.length,
    beforeFirstCommand: allRequests
      .filter(({ order }) => order < firstCommand.order)
      .map((request) => ({ request, start: startsByCue.get(request.cueId) ?? null })),
    cues: [],
  }
  const inspect = (cue, request, window) => {
    const start = startsByCue.get(request.cueId)
    if (!start) {
      fail('business', 'audio-cue-start-missing', { ...cue, request })
      return undefined
    }
    const buffer = decoded[start.bufferId]
    const action = expected.actions[cue.actionIndex]
    const cold = buffer.order > request.order
    const observed = {
      ...cue,
      turn: action.turn,
      actorId: action.actorId,
      targetId: action.targetId,
      request,
      start,
      buffer,
      cold,
      window,
      requestToStartMs: start.atMs - request.atMs,
    }
    const chunk = cue.assetId.slice(-3)
    const path =
      trace.engine === 'game'
        ? `/extracted/sounds/${Number(chunk)}.wav`
        : `assets/migrated/sounds/${chunk}.wav`
    const resampledFrames =
      (audioSourceFrames[cue.assetId] * buffer.sampleRate) / PAL_SOUND_SAMPLE_RATE
    if (
      start.assetId !== cue.assetId ||
      buffer.assetId !== cue.assetId ||
      buffer.path !== path ||
      buffer.channels !== 1 ||
      !(buffer.peak > 0) ||
      Math.abs(buffer.frames - resampledFrames) > 1
    )
      fail('business', 'audio-decoded-source', { ...observed, path, resampledFrames })
    if (start.contextState !== 'running') fail('business', 'audio-start-context', observed)
    return observed
  }
  const casualtyCues = new Map()
  if (playerCasualties !== undefined) {
    result.playerCasualties = playerCasualties.flatMap((motion) => {
      const { actionIndex, turn, actorId, targetId, soundKind } = motion
      const cues = audioCues.filter(
        (cue) => cue.actionIndex === actionIndex && cue.kind === soundKind,
      )
      if (
        cues.length !== 1 ||
        audioCues.filter(({ assetId }) => assetId === cues[0].assetId).length !== 1
      ) {
        fail('oracle', 'player-casualty-sound-expectation', { actionIndex, soundKind })
        return []
      }
      const [cue] = cues
      const dead = soundKind === 'player-death'
      const window = dead
        ? { first: motion.knockback, through: motion.recoil }
        : { first: motion.returned, through: motion.finish }
      const identity = { ...cue, turn, actorId, targetId, window }
      const matching = allRequests.filter(({ assetId }) => assetId === cue.assetId)
      if (matching.length !== 1) {
        fail('business', 'player-casualty-sound-count', { ...identity, requests: matching })
        return [{ ...identity, requests: matching }]
      }
      const [request] = matching
      const observed = inspect(cue, request, window)
      casualtyCues.set(cue, observed)
      // CLASSIC queues the death cue between the two recoil draws, and the dying cue after
      // the actual return pose, during action completion (fight.c:5108–5148, 824–850).
      if (request.order <= window.first.order || request.order >= window.through.order)
        fail('business', 'player-casualty-sound-edge', {
          ...identity,
          request,
          start: observed?.start,
          next: motion.next,
        })
      else if (observed) {
        const { start, cold } = observed
        const lastColdFrame = dead ? motion.returned : motion.finish
        const startThroughMs = (cold ? lastColdFrame.atMs : request.atMs) + BATTLE_FRAME_MS
        if (start.order >= motion.next.order || start.atMs > startThroughMs)
          fail('business', 'player-casualty-sound-start-edge', {
            ...observed,
            startThroughMs,
            next: motion.next,
          })
      }
      return [observed ?? { ...identity, request }]
    })
  }
  for (let i = 0; i < Math.max(audioCues.length, requests.length); i++) {
    const cue = audioCues[i]
    const request = requests[i]
    if (!cue || !request || request.assetId !== cue.assetId) {
      fail('business', 'audio-cue-sequence', {
        cueIndex: i,
        expected: cue ?? null,
        actual: request ?? null,
      })
      break
    }
    const checkedCasualty = casualtyCues.has(cue)
    const window = checkedCasualty
      ? undefined
      : cueRenderWindow(
          cue,
          expected.actions[cue.actionIndex],
          animations[cue.actionIndex],
          frames,
          deaths,
        )
    const observed = checkedCasualty ? casualtyCues.get(cue) : inspect(cue, request, window)
    if (!observed) break
    const { start, cold } = observed
    if (starts[i]?.cueId !== request.cueId) {
      fail('business', 'audio-cue-start-order', { ...cue, request, start, earlier: starts[i] })
      break
    }
    result.cues.push(observed)
    if (checkedCasualty) continue
    if (!window) {
      fail('integrity', 'audio-cue-render-window-missing', observed)
      continue
    }
    const edgeCue = cue.kind === 'enemy-windup' || cue.kind === 'enemy-death'
    // Audio and paint are compared on the same recorder clock. Cold Game decoding may finish
    // after its cue frame, while a ready buffer must start at the frame that requests it.
    const firstMs = window.first.atMs - BATTLE_FRAME_MS
    const requestThroughMs = (edgeCue ? window.first.atMs : window.through.atMs) + BATTLE_FRAME_MS
    const startThroughMs = (cold ? window.through.atMs : request.atMs) + BATTLE_FRAME_MS
    if (request.atMs < firstMs || request.atMs > requestThroughMs || start.atMs > startThroughMs)
      fail('business', 'audio-cue-render-window', {
        ...observed,
        firstMs,
        requestThroughMs,
        startThroughMs,
      })
  }
  return result
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
  let portraits, roundEnds, audio, defendRecovery, automaticBlock, playerCasualties
  const fail = (domain, rule, facts) => findings.push({ domain, rule, ...facts })
  const result = () => ({
    status: findings.length ? 'rejected' : 'passed',
    engine: trace?.engine,
    frames: frames.length,
    deaths,
    heals,
    ...(portraits === undefined ? {} : { portraits }),
    ...(roundEnds === undefined ? {} : { roundEnds }),
    ...(audio === undefined ? {} : { audio }),
    ...(defendRecovery === undefined ? {} : { defendRecovery }),
    ...(automaticBlock === undefined ? {} : { automaticBlock }),
    ...(playerCasualties === undefined ? {} : { playerCasualties }),
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
  if (scenario.id === 'equivalent-poison')
    roundEnds = comparePoisonRoundEnds(trace, frames, scenario, playerCount, fail)

  const settlement = frames.find(({ payload }) => payload.settlement !== null)
  if (!settlement) fail('integrity', 'settlement-draw-missing')
  const animations = scenario.expected.actions.map((action) =>
    ['defend', 'pass'].includes(action.kind)
      ? null
      : frames.find((frame) => animationMatches(frame, action)),
  )
  if (scenario.expected.defendRecovery !== undefined)
    defendRecovery = compareDefendRecovery(trace, frames, scenario.expected, animations, fail)
  if (scenario.expected.automaticBlock !== undefined)
    automaticBlock = compareAutomaticBlock(frames, scenario.expected, animations, fail)
  if (scenario.expected.playerCasualties !== undefined)
    playerCasualties = comparePlayerCasualties(frames, scenario.expected, animations, fail)

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
      casterBase: position(casterBase),
      targetBase: position(targetBase),
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
  if (scenario.expected.audioCues !== undefined || playerCasualties !== undefined)
    audio = compareAudioCues(
      trace,
      scenario.expected,
      frames,
      animations,
      deaths,
      playerCasualties,
      fail,
    )
  if (automaticBlock && audio) {
    const impact = audio.cues.find(
      ({ actionIndex, kind }) =>
        actionIndex === automaticBlock.actionIndex && kind === 'enemy-impact',
    )
    if (
      impact &&
      (impact.request.order < automaticBlock.charge.order ||
        impact.request.order >= automaticBlock.knockback.order)
    )
      fail('business', 'automatic-block-impact-edge', {
        request: impact.request,
        charge: automaticBlock.charge,
        knockback: automaticBlock.knockback,
      })
  }
  return result()
}
