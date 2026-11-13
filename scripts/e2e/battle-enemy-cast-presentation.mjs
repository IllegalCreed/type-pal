const PAL_TICK_MS = 40
// The browser records changed draws rather than a sample of every display refresh.
const DRAW_EDGE_MS = 30
const sample = ({ seq, order, atMs, clockMs }) => ({ frame: seq, order, atMs, clockMs })
const enemy = (frame, slot) => frame?.payload.enemies.find((draw) => draw.slot === slot)
const player = (frame, slot) => frame?.payload.players.find((draw) => draw.slot === slot)
const samePose = (draw, x, y, index) => draw?.x === x && draw.y === y && draw.frameIndex === index

/** The CLASSIC two-step cast, MAGIC release and five-tick reaction from actual draws. */
export function compareEnemyCast(frames, animations, expected, audio, numberDraws, probe, fail) {
  const {
    actionIndex,
    slot,
    poses: [idle, magic, attack, wait],
    fire,
  } = probe
  const [chunk, count, speed, delay, repeats] = fire
  const action = expected.actions[actionIndex]
  const start = animations[actionIndex]
  const next = animations.slice(actionIndex + 1).find(Boolean)
  const window = start
    ? frames.filter(({ seq }) => seq >= start.seq && (!next || seq < next.seq))
    : []
  const home =
    start &&
    enemy(
      frames.findLast(({ seq }) => seq < start.seq),
      slot,
    )
  const entry = enemy(start, slot)?.frameIndex
  const released = window.filter(({ payload }) => payload.magicOverlays?.length)
  const first = released[0]
  const last = released.at(-1)
  const reaction = last && window.find(({ seq }) => seq > last.seq)
  const second =
    home &&
    window.find((frame) => {
      const caster = enemy(frame, slot)
      return caster?.x === home.x + 16 && caster.y === home.y + 8
    })
  const restored =
    reaction &&
    home &&
    window.find(
      (frame) => frame.seq > reaction.seq && samePose(enemy(frame, slot), home.x, home.y, 0),
    )
  const observed = {
    actionIndex,
    caster: action.actorId,
    home,
    entry,
    firstStep: start && sample(start),
    secondStep: second && sample(second),
    firstFire: first && sample(first),
    lastFire: last && sample(last),
    reaction: reaction && sample(reaction),
    restored: restored && sample(restored),
  }
  if (!home || !start || !second || !first || !reaction) {
    fail('business', 'enemy-cast-render-edges', observed)
    return observed
  }

  // SDLPal fight.c:4681–4717. The first two delays move the caster without changing its pose.
  const intro = [
    { index: entry, dx: 12, dy: 6, ticks: 1 },
    { index: entry, dx: 16, dy: 8, ticks: 1 },
  ]
  for (let index = 0; index < magic; index++)
    intro.push({ index: idle + index, dx: 16, dy: 8, ticks: wait })
  if (!magic) intro.push({ ...intro[1], ticks: 1 })
  if (delay === 0)
    for (let index = 0; index <= attack; index++)
      intro.push({ index: idle + magic - 1 + index, dx: 16, dy: 8, ticks: wait })

  let elapsed = 0
  const expectedIntro = intro.flatMap((beat, index) => {
    const prior = intro[index - 1]
    const time = elapsed
    elapsed += beat.ticks * PAL_TICK_MS
    if (prior && prior.index === beat.index && prior.dx === beat.dx) return []
    return [{ x: home.x + beat.dx, y: home.y + beat.dy, index: beat.index, time }]
  })
  const approach = window.filter(({ seq }) => seq < first.seq)
  const introDraws = approach.flatMap((frame, index) => {
    const caster = enemy(frame, slot)
    const previous = enemy(approach[index - 1], slot)
    if (caster && previous && samePose(previous, caster.x, caster.y, caster.frameIndex)) return []
    return [
      {
        x: caster?.x,
        y: caster?.y,
        index: caster?.frameIndex,
        time: frame.clockMs - start.clockMs,
      },
    ]
  })
  const introMs = first.clockMs - start.clockMs
  if (
    !(entry >= 0 && entry < idle) ||
    introDraws.length !== expectedIntro.length ||
    expectedIntro.some(
      ({ x, y, index, time }, i) =>
        x !== introDraws[i]?.x ||
        y !== introDraws[i].y ||
        index !== introDraws[i].index ||
        Math.abs(time - introDraws[i].time) > DRAW_EDGE_MS,
    ) ||
    Math.abs(introMs - elapsed) > DRAW_EDGE_MS
  )
    fail('business', 'enemy-cast-windup-poses', {
      ...observed,
      introMs,
      elapsed,
      expectedIntro,
      introDraws,
    })

  // These original spells have zero shake. Repeats return to fireDelay without replaying the cue.
  const fireIndices = Array.from({ length: count + (count - delay) * repeats }, (_, i) =>
    i < count ? i : ((i - delay) % (count - delay)) + delay,
  )
  const fireDraws = released.filter(
    (frame, i) =>
      i === 0 ||
      frame.payload.magicOverlays[0].frameIndex !==
        released[i - 1].payload.magicOverlays[0].frameIndex,
  )
  const fireMs = reaction.clockMs - first.clockMs
  const expectedFireMs = fireIndices.length * (speed + 5) * 10
  if (
    fireDraws.length !== fireIndices.length ||
    fireDraws.some((frame, i) =>
      frame.payload.magicOverlays.some(
        (draw) => draw.spriteChunk !== chunk || draw.frameIndex !== fireIndices[i],
      ),
    ) ||
    Math.abs(fireMs - expectedFireMs) > DRAW_EDGE_MS
  )
    fail('business', 'enemy-cast-fire-frames', {
      ...observed,
      fireMs,
      expectedFireMs,
      fireIndices,
      drawn: fireDraws.map((frame) => frame.payload.magicOverlays[0].frameIndex),
    })

  let lastPose = intro.at(-1).index
  let effectFrame = -1
  let priorFire
  let wrongCaster
  for (const frame of released) {
    const index = frame.payload.magicOverlays[0].frameIndex
    if (index !== priorFire) {
      effectFrame++
      priorFire = index
    }
    if (delay > 0 && effectFrame >= delay && effectFrame < delay + attack)
      lastPose = idle + magic + effectFrame - delay
    if (!wrongCaster && !samePose(enemy(frame, slot), home.x + 16, home.y + 8, lastPose))
      wrongCaster = { ...sample(frame), draw: enemy(frame, slot), expectedIndex: lastPose }
  }
  if (wrongCaster)
    fail('business', 'enemy-cast-fire-pose', {
      ...observed,
      ...wrongCaster,
    })

  const recoveryMs = restored && restored.clockMs - reaction.clockMs
  const earlyReturn = window.find(
    (frame) =>
      frame.seq >= reaction.seq &&
      (!restored || frame.seq < restored.seq) &&
      !samePose(enemy(frame, slot), home.x + 16, home.y + 8, lastPose),
  )
  if (!restored || earlyReturn || Math.abs(recoveryMs - 5 * PAL_TICK_MS) > DRAW_EDGE_MS)
    fail('business', 'enemy-cast-five-tick-recovery', {
      ...observed,
      recoveryMs,
      earlyReturn: earlyReturn && sample(earlyReturn),
    })

  const targets = action.before.players.filter(
    (before) =>
      action.targetId === before.id ||
      (action.targetSide === 'player' && before.hp !== action.after.players[before.slot].hp),
  )
  const expectedNumbers = targets.flatMap(({ slot, hp }) => {
    const damage = hp - action.after.players[slot].hp
    return damage > 0 ? [{ slot, value: damage }] : []
  })
  const damageDraws = numberDraws.filter(
    ({ frame, number }) =>
      frame.seq >= start.seq &&
      (!restored || frame.seq < restored.seq) &&
      number.side === 'player' &&
      number.tone === 'blue',
  )
  if (
    damageDraws.length !== expectedNumbers.length ||
    expectedNumbers.some(({ slot, value }) => {
      const actual = damageDraws.find(({ number }) => number.slot === slot)
      const foot = player(reaction, slot)
      return (
        !actual ||
        actual.frame.seq < reaction.seq ||
        // Game can draw the zero-duration death cue and the damage blit on adjacent refreshes.
        actual.frame.clockMs - reaction.clockMs > PAL_TICK_MS ||
        actual.number.value !== value ||
        actual.number.right !== foot?.x + 6 ||
        actual.number.y + actual.number.age !== Math.max(foot?.y - 75, 10)
      )
    })
  )
    fail('business', 'enemy-cast-damage-at-fire-end', {
      ...observed,
      expectedNumbers,
      damageDraws: damageDraws.map(({ frame, number }) => ({ ...sample(frame), number })),
    })
  for (const { slot: targetSlot } of targets) {
    const foot = player(last, targetSlot)
    const hurt = player(reaction, targetSlot)
    const finish = player(restored, targetSlot)
    // The last two reaction ticks can be identical draws. SDLPal resets the caster
    // first, so either the final hurt pose or the player's base can share that edge.
    const recoiled = window.some((frame) => {
      if (frame.seq <= reaction.seq || !restored || frame.seq >= restored.seq) return false
      const draw = player(frame, targetSlot)
      return samePose(draw, foot?.x + 7, foot?.y + 3, 4) && draw.colorShift === 0
    })
    if (
      !foot ||
      !hurt ||
      !samePose(hurt, foot.x, foot.y, 4) ||
      hurt.colorShift !== 6 ||
      !finish ||
      !recoiled
    )
      fail('business', 'enemy-cast-target-reaction', {
        ...observed,
        targetSlot,
        foot,
        hurt,
        finish,
        recoiled,
      })
  }
  for (const targetSlot of action.spellGuards ?? []) {
    const early = approach.find((frame) => player(frame, targetSlot)?.frameIndex === 3)
    const absent = released.find((frame) => player(frame, targetSlot)?.frameIndex !== 3)
    if (early || absent)
      fail('business', 'enemy-cast-auto-defend-fire-edge', {
        ...observed,
        targetSlot,
        early: early && sample(early),
        absent: absent && sample(absent),
      })
  }

  for (const cue of audio?.cues ?? []) {
    const { kind, request, start: sound } = cue
    if (cue.actionIndex !== actionIndex || !['cast-windup', 'spell-effect'].includes(kind)) continue
    const release = kind === 'spell-effect'
    const edge = release ? first : second
    const expectedCueMs = edge.atMs + (release ? 0 : PAL_TICK_MS)
    const through = Math.min(first.atMs + DRAW_EDGE_MS, expectedCueMs + DRAW_EDGE_MS)
    if (
      request.atMs < expectedCueMs - DRAW_EDGE_MS ||
      (!release && request.order <= second.order) ||
      request.atMs > through ||
      !sound
    )
      fail('business', 'enemy-cast-sound-edge', { ...observed, kind, request, sound, through })
  }
  return { ...observed, introMs, fireMs, recoveryMs }
}
