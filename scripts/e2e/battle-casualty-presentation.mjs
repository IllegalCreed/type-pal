import { isDeepStrictEqual as same } from 'node:util'

const BATTLE_FRAME_MS = 40
const FEEDBACK_MS = 8 * BATTLE_FRAME_MS
const DIALOGUE_LEAD_MS = 10 * BATTLE_FRAME_MS
const drawSource = { game: 'game:drawDialogBox', reforge: 'reforge:DialogBox.renderSlot' }
const confirmSource = {
  game: 'game:advanceBattleDialog:confirmDialog',
  reforge: 'reforge:DialogBox.advance',
}
const waitsForKey = new Set(['waiting-page-key', 'waiting-end-key', 'waiting-input'])
const cueKinds = new Set(['player-dying', 'player-death'])
const stamp = (frame) =>
  frame && { frame: frame.seq, order: frame.order, clockMs: frame.clockMs, atMs: frame.atMs }
const player = (frame, slot) => frame?.payload.players.find((draw) => draw.slot === slot)
const atHome = (draw, home) => draw?.x === home.x && draw?.y === home.y
const mark = (frame, slot) => frame && { ...stamp(frame), player: player(frame, slot) }
const activePage = (frame) => frame.payload.dialogue?.find((draw) => draw.active)

function drawnPages(frames) {
  const pages = []
  let current
  for (const frame of frames) {
    const draw = activePage(frame)
    if (current && current.slot !== draw?.slot) {
      current.cleared = frame
      current = undefined
    }
    if (!draw) continue
    if (!current) {
      current = { slot: draw.slot, draws: [] }
      pages.push(current)
    }
    current.draws.push({ frame, draw })
  }
  return pages
}

export function compareCasualtyDialogue(trace, frames, expected, probe, motion, fail) {
  const { actionIndex, nextActionIndex, pages: wanted } = probe
  const next = trace.actions?.[nextActionIndex]
  const nextExpected = expected.actions[nextActionIndex]
  if (
    !Array.isArray(wanted) ||
    !wanted.length ||
    !Number.isSafeInteger(nextActionIndex) ||
    nextActionIndex <= actionIndex ||
    !nextExpected ||
    wanted.some(
      (page) =>
        !['top', 'bottom', 'narration', 'center'].includes(page?.slot) ||
        !Array.isArray(page.lines) ||
        !page.lines.length ||
        page.lines.some((line) => typeof line !== 'string' || !line) ||
        !(page.portraitId === null || Number.isSafeInteger(page.portraitId)) ||
        !['auto', 'confirm'].includes(page.advance) ||
        (page.advance === 'auto' && !(page.holdMs > 0)),
    )
  ) {
    fail('oracle', 'casualty-dialogue-expectation', { probe })
    return undefined
  }
  const identity = { actionIndex, turn: motion.action.turn, targetId: motion.action.targetId }
  if (!next || next.actorId !== nextExpected.actorId || next.kind !== nextExpected.kind) {
    fail('integrity', 'casualty-dialogue-next-action', { ...identity, nextActionIndex, next })
    return undefined
  }
  const nextPaint = frames.find(({ order }) => order >= Math.min(next.order, motion.next.order))
  if (!nextPaint) {
    fail('integrity', 'casualty-dialogue-next-draw-missing', identity)
    return undefined
  }
  const visible = frames.filter(({ seq }) => seq >= motion.start.seq && seq <= nextPaint.seq)
  const pages = drawnPages(visible)
  const first = pages[0]?.draws[0].frame
  if (first && first.seq <= motion.observed.returned.frame)
    fail('business', 'casualty-dialogue-before-return', {
      ...identity,
      first: stamp(first),
      returned: motion.observed.returned,
    })
  const finished = visible.find(({ payload }) => !payload.animation)
  const leadMs = first && finished ? first.clockMs - finished.clockMs : undefined
  // CLASSIC refreshes the completed attack scene for ten frames before opening either script.
  if (first && (leadMs === undefined || Math.abs(leadMs - DIALOGUE_LEAD_MS) > BATTLE_FRAME_MS))
    fail('business', 'casualty-dialogue-lead', {
      ...identity,
      finished: stamp(finished),
      first: stamp(first),
      leadMs,
      expectedMs: DIALOGUE_LEAD_MS,
    })
  if (pages.length !== wanted.length)
    fail('business', 'casualty-dialogue-page-count', {
      ...identity,
      expected: wanted.map(({ slot }) => slot),
      actual: pages.map(({ slot }) => slot),
    })
  const observed = pages.map((page, pageIndex) => {
    const definition = wanted[pageIndex]
    const first = page.draws[0]
    const last = page.draws.at(-1)
    const complete = page.draws.find(({ draw }) => same(draw.lines, definition?.lines))
    const confirmations = trace.presentations.filter(
      ({ kind, order, payload }) =>
        kind === 'battle-dialogue-confirm' &&
        order > first.frame.order &&
        order < (page.cleared?.order ?? next.order) &&
        payload.turn === identity.turn &&
        payload.slot === page.slot,
    )
    const holdMs =
      complete && page.cleared ? page.cleared.clockMs - complete.frame.clockMs : undefined
    const result = {
      ...identity,
      pageIndex,
      slot: page.slot,
      first: stamp(first.frame),
      complete: stamp(complete?.frame),
      last: { ...stamp(last.frame), draw: last.draw },
      cleared: stamp(page.cleared),
      confirmations,
      holdMs,
    }
    if (
      page.draws.some(({ draw }) => draw.source !== drawSource[trace.engine]) ||
      confirmations.some(({ source }) => source !== confirmSource[trace.engine])
    )
      fail('integrity', 'casualty-dialogue-native-source', result)
    if (!definition) return result
    if (page.slot !== definition.slot || !complete || !same(last.draw.lines, definition.lines))
      fail('business', 'casualty-dialogue-text', { ...result, expected: definition.lines })
    const portrait = (complete ?? last).draw.portrait
    if ((portrait?.id ?? null) !== definition.portraitId)
      fail('business', 'casualty-dialogue-portrait', {
        ...result,
        portrait,
        expected: definition.portraitId,
      })
    const waited = page.draws.some(({ draw }) => waitsForKey.has(draw.phase))
    if (definition.advance === 'auto' ? waited || confirmations.length : confirmations.length !== 1)
      fail('business', 'casualty-dialogue-confirm', { ...result, expected: definition.advance })
    // Game reveals lines on its 100 ms typing clock. Full text and removal are actual draws.
    if (
      definition.advance === 'auto' &&
      holdMs !== undefined &&
      Math.abs(holdMs - definition.holdMs) > 100
    )
      fail('business', 'casualty-dialogue-hold', { ...result, expectedMs: definition.holdMs })
    return result
  })
  if (!pages.at(-1)?.cleared || nextPaint.payload.dialogue?.length)
    fail('business', 'casualty-dialogue-clear', { ...identity, next: stamp(nextPaint) })
  return {
    ...identity,
    pages: observed,
    leadMs,
    next: { order: next.order, atMs: next.atMs, actorId: next.actorId },
  }
}

const MAGIC_HURT = [
  [0, 0, 6],
  [4, 2, 6],
  [6, 3, 6],
  [7, 3, 0],
]

export function compareMagicCasualty(trace, frames, numbers, expected, animations, probe, fail) {
  const { actionIndex, targetId, damage, recoveryFrame, soundKind } = probe
  const action = expected.actions[actionIndex]
  const target = action?.before.players.find(({ id }) => id === targetId)
  if (
    action?.actorSide !== 'enemy' ||
    action.kind !== 'cast' ||
    action.targetId !== targetId ||
    !target ||
    !cueKinds.has(soundKind) ||
    ![1, 2].includes(recoveryFrame) ||
    !(damage > 0)
  ) {
    fail('oracle', 'magic-casualty-expectation', { probe })
    return undefined
  }
  const { slot } = target
  const identity = { actionIndex, turn: action.turn, actorId: action.actorId, targetId, soundKind }
  const start = animations[actionIndex]
  const nextAction = trace.actions?.[actionIndex + 1]
  const nextAnimation = animations.slice(actionIndex + 1).find(Boolean)
  const next =
    nextAction && (!nextAnimation || nextAction.order < nextAnimation.order)
      ? nextAction
      : nextAnimation
  const selection =
    start &&
    frames.findLast(
      (frame) =>
        frame.seq < start.seq && frame.payload.turn === action.turn && frame.payload.selecting,
    )
  const base = player(selection, slot)
  if (!start || !next || !base) {
    fail('integrity', 'magic-casualty-window-missing', identity)
    return undefined
  }
  const active = frames.filter(({ order }) => order >= start.order && order < next.order)
  const hit = active.find((frame) => player(frame, slot)?.frameIndex === 4)
  const returned =
    hit &&
    active.find(
      (frame) =>
        frame.seq > hit.seq &&
        atHome(player(frame, slot), base) &&
        player(frame, slot)?.frameIndex !== 4,
    )
  const firstNumber = numbers.find(
    ({ frame, number }) =>
      frame.payload.turn === action.turn &&
      frame.order < next.order &&
      number.side === 'player' &&
      number.slot === slot &&
      number.tone === 'blue',
  )
  const recoil = []
  for (const frame of active) {
    if (!hit || frame.seq < hit.seq || (returned && frame.seq >= returned.seq)) continue
    const pose = player(frame, slot)
    if (pose?.frameIndex !== 4) continue
    const shift = [pose.x - base.x, pose.y - base.y, pose.colorShift]
    if (!same(recoil.at(-1)?.shift, shift)) recoil.push({ ...mark(frame, slot), shift })
  }
  const result = {
    ...identity,
    home: mark(selection, slot),
    hit: mark(hit, slot),
    number: firstNumber && { ...mark(firstNumber.frame, slot), number: firstNumber.number },
    recoil,
    returned: mark(returned, slot),
    next: { order: next.order, atMs: next.atMs },
    recoveryMs: returned && next.atMs - returned.atMs,
  }
  if (
    !hit ||
    !firstNumber ||
    firstNumber.number.value !== damage ||
    Math.abs(firstNumber.frame.clockMs - hit.clockMs) > BATTLE_FRAME_MS ||
    !atHome(player(firstNumber.frame, slot), base) ||
    player(firstNumber.frame, slot)?.colorShift !== 6
  )
    fail('business', 'magic-casualty-number-edge', { ...result, expectedDamage: damage })
  if (
    !same(
      recoil.map(({ shift }) => shift),
      MAGIC_HURT,
    )
  )
    fail('business', 'magic-casualty-recoil', { ...result, expected: MAGIC_HURT })
  if (!returned || player(returned, slot)?.frameIndex !== recoveryFrame)
    fail('business', 'magic-casualty-recovery', { ...result, expectedFrame: recoveryFrame })
  if (
    result.recoveryMs !== undefined &&
    (result.recoveryMs < FEEDBACK_MS - BATTLE_FRAME_MS ||
      result.recoveryMs > FEEDBACK_MS + 3 * BATTLE_FRAME_MS)
  )
    fail('business', 'magic-casualty-recovery-hold', result)
  return result
}

export function comparePoisonCasualty(trace, frames, numbers, probe, fail) {
  const { turn, targetId, damage, holdFrame, recoveryFrame, forbiddenSounds } = probe
  if (
    !Number.isSafeInteger(turn) ||
    typeof targetId !== 'string' ||
    !(damage > 0) ||
    ![1, 3].includes(holdFrame) ||
    ![1, 2].includes(recoveryFrame) ||
    !Array.isArray(forbiddenSounds) ||
    !forbiddenSounds.length
  ) {
    fail('oracle', 'poison-casualty-expectation', { probe })
    return undefined
  }
  const round = trace.rounds?.find((entry) => entry.turn === turn)
  const target = round?.before.players.find(({ id }) => id === targetId)
  const identity = { turn, targetId }
  const lastAction = trace.actions?.findLast((action) => action.turn === turn)
  const ready =
    round &&
    frames.find(
      ({ order, payload }) => order > round.order && payload.turn === turn + 1 && payload.selecting,
    )
  if (!round || !target || !lastAction || !ready || !Number.isFinite(round.clockMs)) {
    fail('integrity', 'poison-casualty-window-missing', identity)
    return undefined
  }
  const { slot } = target
  const before = frames.findLast((frame) => frame.order < round.order && player(frame, slot))
  const home = player(before, slot)
  const draws = numbers.filter(
    ({ frame, number }) =>
      frame.order > round.order &&
      frame.order <= ready.order &&
      number.side === 'player' &&
      number.slot === slot &&
      number.tone === 'blue',
  )
  const first = draws[0]
  const held = first ? frames.filter(({ seq }) => seq >= first.frame.seq && seq <= ready.seq) : []
  const recovery = held.find((frame) => player(frame, slot)?.frameIndex === recoveryFrame)
  const wrong = held.find((frame) => {
    const pose = player(frame, slot)
    return (
      (!recovery || frame.seq < recovery.seq) &&
      (!home || !atHome(pose, home) || pose?.frameIndex !== holdFrame || pose?.colorShift !== 0)
    )
  })
  const holdMs = recovery && recovery.clockMs - first.frame.clockMs
  const result = {
    ...identity,
    round: {
      order: round.order,
      clockMs: round.clockMs,
      hpBefore: target.hp,
      hpAfter: round.after.players[slot]?.hp,
    },
    before: mark(before, slot),
    draws: draws.map(({ frame, number }) => ({ ...mark(frame, slot), number })),
    recovery: mark(recovery, slot),
    ready: mark(ready, slot),
    holdMs,
  }
  if (
    draws.length !== 1 ||
    first.number.value !== damage ||
    target.hp - result.round.hpAfter !== damage
  )
    fail('business', 'poison-casualty-number', { ...result, expectedDamage: damage })
  if (
    home?.frameIndex !== holdFrame ||
    wrong ||
    !recovery ||
    !atHome(player(recovery, slot), home) ||
    player(recovery, slot)?.colorShift !== 0 ||
    holdMs < FEEDBACK_MS - BATTLE_FRAME_MS ||
    holdMs > FEEDBACK_MS + 2 * BATTLE_FRAME_MS ||
    player(ready, slot)?.frameIndex !== recoveryFrame
  )
    fail('business', 'poison-casualty-pose-hold', {
      ...result,
      wrong: mark(wrong, slot),
      expected: { holdFrame, recoveryFrame, holdMs: FEEDBACK_MS },
    })
  const extraSound = trace.audioEvents?.find(
    ({ kind, assetId, order }) =>
      kind !== 'sfx-decoded' &&
      forbiddenSounds.includes(assetId) &&
      order > lastAction.order &&
      order <= ready.order,
  )
  const extraDialogue = held.find(({ payload }) => payload.dialogue?.length)
  if (extraSound || extraDialogue)
    fail('business', 'poison-casualty-extra-reaction', {
      ...result,
      extraSound,
      extraDialogue: extraDialogue && {
        ...stamp(extraDialogue),
        slots: extraDialogue.payload.dialogue,
      },
    })
  return result
}
