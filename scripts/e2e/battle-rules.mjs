import { isDeepStrictEqual as same } from 'node:util'
import { firstNumberDraws } from './battle-presentation.mjs'

const equipmentSpeed = { 'li-xiaoyao': 3, 'wu-hou': 9, anu: 0 }
const speedMultiplier = { defend: 5, cast: 3, item: 3 }
// CLASSIC physical formula, evaluated for the fixed raw data and seeds independently of either engine.
const ordinaryStrikes = {
  'solo-lantern': [252],
  'party-lanterns': [242, 340, 857],
  'herb-settlement': [305],
  'two-round-commands': [350],
}

function expectedDraws(scenario) {
  const { expected, party } = scenario
  if (expected.ruleDraws) return expected.ruleDraws
  const draws = []
  for (const turn of new Set(expected.actions.map(({ turn }) => turn))) {
    const actions = expected.actions.filter((action) => action.turn === turn)
    const { enemies, players } = actions[0].before
    for (const unit of enemies)
      if (unit?.alive)
        draws.push({
          purpose: 'queue-dexterity',
          queue: { turn, side: 'enemy', slot: unit.slot, speed: 21, extra: false },
        })
    for (const { id, slot } of players) {
      const command = expected.commands.find((entry) => entry.turn === turn && entry.actorId === id)
      const speed = (party[slot].speed + equipmentSpeed[id]) * (speedMultiplier[command.kind] ?? 1)
      draws.push({
        purpose: 'queue-dexterity',
        queue: { turn, side: 'player', slot, speed, extra: false },
      })
    }
    for (const action of actions) {
      if (action.actorSide === 'enemy') {
        for (const purpose of [
          'enemy-target',
          'enemy-block',
          'enemy-attack-bonus',
          'enemy-damage-bonus',
          'enemy-equivalent-item',
        ])
          draws.push({ purpose })
      } else if (action.kind === 'attack') {
        draws.push({ purpose: 'strike-bonus' }, { purpose: 'strike-critical' })
        if (action.actorId === 'li-xiaoyao') draws.push({ purpose: 'strike-hero-critical' })
        draws.push({ purpose: 'strike-variance' }, { purpose: 'attack-growth' })
      } else if (action.kind === 'cast') {
        draws.push({ purpose: 'cast-growth' })
      }
    }
  }
  return draws
}

const isDrawnAction = ({ payload }, action) =>
  payload.turn === action.turn &&
  payload.animation?.actorId === action.actorId &&
  payload.animation.kind === action.kind &&
  payload.animation.targetId === action.targetId

function observedRawStrike(engine, native, side) {
  if (engine === 'game') {
    const blue = native.animationEffects
      .flatMap((effect) => [effect.damageNum, ...(effect.damageNums ?? [])])
      .filter((number) => number?.color === 'blue' && number.target.kind === side)
    return { value: blue.length === 1 ? blue[0].value : null, source: 'game-animation-effect' }
  }
  if (side === 'player' && Number.isSafeInteger(native.lastAction?.damage))
    return { value: native.lastAction.damage, source: 'reforge-lastAction-damage' }
  if (Number.isSafeInteger(native.lastAction?.firstDamage))
    return { value: native.lastAction.firstDamage, source: 'reforge-lastAction-firstDamage' }
  // Earlier captures expose the unbounded hit in the native action log.
  const entries = native.actionLog.flatMap((line) => {
    const match = / 造成 (\d+)$/u.exec(line)
    return match ? [Number(match[1])] : []
  })
  return { value: entries.length === 1 ? entries[0] : null, source: 'reforge-action-log' }
}

function growthDelta(native) {
  if (!native.growthBefore || !native.growthAfter) return null
  const keys = new Set([...Object.keys(native.growthBefore), ...Object.keys(native.growthAfter)])
  return Object.fromEntries(
    [...keys].flatMap((key) => {
      const delta = (native.growthAfter[key] ?? 0) - (native.growthBefore[key] ?? 0)
      return delta === 0 ? [] : [[key, delta]]
    }),
  )
}

function enemyDamageNumbers(engine, native, kind) {
  if (engine === 'game') {
    if (!Array.isArray(native?.animationEffects)) return null
    return native.animationEffects
      .flatMap((effect) => [
        effect?.damageNum,
        ...(Array.isArray(effect?.damageNums) ? effect.damageNums : []),
      ])
      .concat(Array.isArray(native.pendingDamageNums) ? native.pendingDamageNums : [])
      .flatMap((number) =>
        number?.target?.kind === 'enemy' && number.color === 'blue'
          ? [{ slot: number.target.idx, value: number.value }]
          : [],
      )
  }
  const action = native?.lastAction
  const hits = kind === 'throw' ? action?.throwHits : action?.magicHits
  return Array.isArray(hits) &&
    hits.every((hit) => Number.isSafeInteger(hit?.idx) && Number.isSafeInteger(hit?.value))
    ? hits.map(({ idx: slot, value }) => ({ slot, value }))
    : null
}

/** Finite rule oracle for the declared PAL fixtures and their physical display boundaries. */
export function validateBattleRules(trace, scenario) {
  const planned = expectedDraws(scenario)
  const findings = []
  const strikes = []
  const damageActions = []
  const fail = (rule, facts) => findings.push({ domain: 'business', rule, ...facts })
  for (let i = 0; i < Math.max(planned.length, trace.randomDraws.length); i++) {
    const draw = trace.randomDraws[i]
    const actual = draw && {
      purpose: draw.purpose,
      ...(draw.queue ? { queue: draw.queue } : {}),
      ...(draw.target ? { target: draw.target } : {}),
      ...(Object.hasOwn(planned[i] ?? {}, 'value') ? { value: draw.value } : {}),
    }
    if (!same(planned[i], actual)) {
      fail('random-draw-purpose', {
        index: i,
        expected: planned[i] ?? null,
        actual: actual ?? null,
        ...(draw ? { atMs: draw.atMs, source: draw.source } : {}),
      })
      break
    }
  }
  const frames = trace.presentations.filter(({ kind }) => kind === 'battle-frame')
  const numberDraws = firstNumberDraws(frames)
  const animationStarts = trace.actions.map((action) =>
    frames.find((frame) => isDrawnAction(frame, action)),
  )
  const damages = ordinaryStrikes[scenario.id]
  let strikeIndex = 0
  for (const [index, action] of trace.actions.entries()) {
    const isEnemy = action.actorSide === 'enemy'
    const before = (isEnemy ? action.before.players : action.before.enemies).find(
      (unit) => unit?.id === action.targetId,
    )
    const after = (isEnemy ? action.after.players : action.after.enemies).find(
      (unit) => unit?.id === action.targetId,
    )
    const wanted = scenario.expected.actions[index]
    if (wanted.enemyDamage) {
      const targets = action.before.enemies.filter(
        (unit) => unit?.alive && (action.targetSide === 'enemy' || unit.id === action.targetId),
      )
      const expected = targets.map(({ slot }, i) => ({ slot, value: wanted.enemyDamage[i] }))
      const start = animationStarts[index]
      const next = animationStarts.slice(index + 1).find(Boolean)
      const drawn = numberDraws.flatMap(({ frame, number }) =>
        start &&
        frame.seq >= start.seq &&
        (!next || frame.seq < next.seq) &&
        number.tone === 'blue' &&
        number.side === 'enemy'
          ? [{ slot: number.slot, value: number.value }]
          : [],
      )
      const native = enemyDamageNumbers(trace.engine, action.native, action.kind)
      const observed = { actionIndex: index, actorId: action.actorId, expected, native, drawn }
      damageActions.push(observed)
      if (!same(expected, native)) fail('native-enemy-damage', observed)
      if (!same(expected, drawn)) fail('rendered-enemy-damage', observed)
      if (wanted.suppressPlayerDamageNumbers) {
        // CLASSIC fight.c:3980 snapshots the party after paying the co-op HP cost.
        const shownCost = numberDraws.filter(
          ({ frame, number }) =>
            start &&
            frame.seq >= start.seq &&
            (!next || frame.seq < next.seq) &&
            number.tone === 'blue' &&
            number.side === 'player',
        )
        if (shownCost.length)
          fail('rendered-cooperative-hp-cost', { actionIndex: index, shownCost })
      }
    }
    if (action.kind === 'attack') {
      const expectedRaw = wanted.rawDamage ?? (isEnemy ? 1 : damages?.[strikeIndex++])
      const expectsBlock = wanted.blocked === true
      const expectedHpLost = wanted.effectiveHpLoss ?? Math.min(before.hp, expectedRaw)
      const targetSide = isEnemy ? 'player' : 'enemy'
      const raw = observedRawStrike(trace.engine, action.native, targetSide)
      const start = animationStarts[index]
      const next = animationStarts.slice(index + 1).find(Boolean)
      const matches = ({ tone, side, slot }) =>
        tone === 'blue' && side === targetSide && slot === before.slot
      const drawing =
        start &&
        numberDraws.find(
          ({ frame, number }) =>
            frame.seq >= start.seq && (!next || frame.seq < next.seq) && matches(number),
        )
      const { frame: drawFrame, number: visible } = drawing ?? {}
      const observed = {
        actionIndex: index,
        actorId: action.actorId,
        targetId: action.targetId,
        expectedRaw,
        raw: raw.value,
        rawSource: raw.source,
        drawn: visible?.value ?? null,
        firstDraw: visible
          ? { frame: drawFrame.seq, clockMs: drawFrame.clockMs, right: visible.right, y: visible.y }
          : null,
        hpLost: before.hp - after.hp,
        ...(wanted.effectiveHpLoss !== undefined ? { expectedHpLost } : {}),
      }
      if (wanted.effectiveHpLoss !== undefined) {
        const round = trace.rounds?.find(({ turn }) => turn === action.turn)
        const extra =
          start &&
          round &&
          numberDraws.find(
            ({ frame, number }) =>
              frame.seq >= start.seq &&
              frame.order < round.order &&
              matches(number) &&
              number.value !== expectedRaw,
          )
        if (extra)
          fail('extra-blue-number-before-poison-round', {
            actionIndex: index,
            actorId: action.actorId,
            targetId: action.targetId,
            frame: extra.frame.seq,
            clockMs: extra.frame.clockMs,
            number: extra.number,
          })
        if (round) {
          const tickDamage =
            round.before.players[before.slot].hp - round.after.players[before.slot].hp
          const tickFrame = numberDraws.find(
            ({ frame, number }) =>
              frame.order > round.order &&
              (!next || frame.seq < next.seq) &&
              matches(number) &&
              number.value === tickDamage,
          )?.frame
          const nextSelection = frames.find(
            ({ order, payload }) =>
              order > round.order && payload.turn === round.turn + 1 && payload.selecting,
          )
          observed.poisonRound = {
            turn: round.turn,
            hpLost: tickDamage,
            draw: tickFrame
              ? {
                  frame: tickFrame.seq,
                  clockMs: tickFrame.clockMs,
                  afterRoundMs: tickFrame.atMs - round.atMs,
                  untilSelectionMs: nextSelection
                    ? nextSelection.clockMs - tickFrame.clockMs
                    : null,
                }
              : null,
          }
        }
      }
      strikes.push(observed)
      if (expectsBlock) {
        const cue = scenario.expected.audioCues?.find(
          ({ actionIndex, kind }) => actionIndex === index && kind === 'enemy-impact',
        )
        const blockSound = Number(cue?.assetId.slice(-3))
        observed.blocked =
          trace.engine === 'game'
            ? action.native.animationEffects.some(({ sound }) => sound === blockSound)
            : action.native.lastAction?.blocked === true
        if (!observed.blocked || raw.value !== null) fail('physical-block-outcome', observed)
      } else if (raw.value !== expectedRaw) fail('physical-raw-damage', observed)
      if (observed.drawn !== (expectsBlock ? null : expectedRaw))
        fail('physical-damage-number', observed)
      if (observed.hpLost !== expectedHpLost) fail('physical-effective-hp', observed)
    }
    if (isEnemy) continue
    const growthDraw = trace.randomDraws
      .filter((draw) => draw.order < action.order)
      .findLast(
        ({ purpose, order }) =>
          purpose === (action.kind === 'cast' ? 'cast-growth' : 'attack-growth') &&
          (index === 0 || order > trace.actions[index - 1].order),
      )
    // Reforge applies rule state before rendering. Game records completion after the animation.
    const weight = growthDraw ? 2 + Math.floor(growthDraw.value * 2) : null
    const expectedGrowth =
      wanted.growth ??
      (action.kind === 'attack'
        ? { attack: 1, maxHP: weight }
        : action.kind === 'cast'
          ? { maxMP: weight, magicAttack: 1 }
          : action.kind === 'defend'
            ? { defense: 2 }
            : {})
    const actual = growthDelta(action.native)
    if (!same(expectedGrowth, actual))
      fail('hidden-growth-weight', {
        actionIndex: index,
        actorId: action.actorId,
        expected: expectedGrowth,
        actual,
      })
  }
  return {
    engine: trace.engine,
    status: findings.length ? 'rejected' : 'passed',
    draws: trace.randomDraws.length,
    strikes,
    ...(damageActions.length ? { damageActions } : {}),
    findings,
  }
}
