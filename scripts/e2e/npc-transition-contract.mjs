import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const ACTOR_FIELDS = [
    'position',
    'visible',
    'state',
    'facing',
    'frame',
    'sprite',
    'walking',
    'stepFrame',
    'trigger',
    'resume',
    'auto',
    'autoIp',
    'triggerMode',
  ],
  compact = (values) =>
    values.filter((value, index) => index === 0 || stable(value) !== stable(values[index - 1])),
  stable = (value) => JSON.stringify(value),
  defined = (values) => values.filter((value) => value !== undefined && value !== null),
  normalizeText = (value) => String(value ?? '').replace(/\s+/gu, ''),
  sign = (value) => (value === 0 ? 0 : value > 0 ? 1 : -1)

export async function readNpcTrace(reportPath) {
  const report = JSON.parse(await readFile(reportPath, 'utf8')),
    dir = dirname(reportPath),
    traceName =
      report.contextTraces?.[0]?.path ?? (report.fragment === '002' ? 'inn-trace.json' : null)
  assert(traceName, `missing NPC trace registration in ${reportPath}`)
  const tracePath = resolve(dir, traceName)
  return { report, trace: JSON.parse(await readFile(tracePath, 'utf8')), tracePath }
}

/** First-stage coordinates are pixels; Reforge coordinates are tile columns/rows. */
export function canonicalPosition(position) {
  if (!Array.isArray(position) || position.length < 2) return null
  if (position.length >= 3) return [Number(position[0]), Number(position[1])]
  return [
    (Number(position[0]) / 16 + Number(position[1]) / 8) / 2,
    (Number(position[1]) / 8 - Number(position[0]) / 16) / 2,
  ]
}

export function actorTransitions(trace, id) {
  return (trace.events ?? [])
    .filter((event) => event.kind === 'actor' && event.id === id && event.state)
    .sort((a, b) => a.order - b.order)
    .map((event) => ({
      order: event.order,
      atMs: event.atMs,
      scene: event.scene,
      source: event.source,
      before: event.before ?? null,
      state: event.state,
    }))
}

export function movementTransitions(trace, id) {
  let previous = null
  return actorTransitions(trace, id).flatMap((event) => {
    const before = event.before ?? previous,
      from = canonicalPosition(before?.position),
      to = canonicalPosition(event.state.position)
    previous = event.state
    if (!from || !to || stable(from) === stable(to)) return []
    return [
      {
        order: event.order,
        atMs: event.atMs,
        source: event.source,
        from,
        to,
        delta: [to[0] - from[0], to[1] - from[1]],
      },
    ]
  })
}

function stateTimeline(trace, id) {
  const events = actorTransitions(trace, id),
    states = Object.fromEntries(ACTOR_FIELDS.map((field) => [field, []]))
  for (const event of events)
    for (const field of ACTOR_FIELDS) {
      const value = event.state[field]
      states[field].push(
        field === 'sprite' && value !== null && value !== undefined
          ? String(value).replace(/^sprite-/u, '')
          : value,
      )
    }
  return states
}

function movementSummary(trace, id) {
  const movement = movementTransitions(trace, id),
    intervals = movement
      .slice(1)
      .map((event, index) => event.atMs - movement[index].atMs)
      .filter((ms) => Number.isFinite(ms) && ms > 0),
    sorted = intervals.slice().sort((a, b) => a - b),
    medianIntervalMs = sorted.length ? sorted[Math.floor(sorted.length / 2)] : null
  return {
    count: movement.length,
    directions: compact(movement.map((event) => [sign(event.delta[0]), sign(event.delta[1])])),
    intervalsMs: intervals,
    minIntervalMs: intervals.length ? Math.min(...intervals) : null,
    medianIntervalMs,
    burstFraction: intervals.length
      ? intervals.filter((interval) => interval < 20).length / intervals.length
      : 0,
    transitions: movement,
  }
}

export function facingSequence(trace, id) {
  return compact(defined(stateTimeline(trace, id).facing))
}

export function movementCadence(trace, id) {
  return movementSummary(trace, id)
}

function controlSequence(trace) {
  return compact(
    (trace.events ?? [])
      .filter((event) => event.kind === 'control')
      .sort((a, b) => a.order - b.order)
      .map((event) => event.state),
  )
}

function dialogueLines(trace) {
  const lines = [],
    previousByInstance = new Map()
  for (const entry of trace.pages ?? []) {
    const page = entry.page ?? entry
    if (!page) continue
    const value = page.pageText ?? (Array.isArray(page.lines) ? page.lines.join('\n') : '')
    const current = String(value).split('\n').map(normalizeText).filter(Boolean)
    if (!current.length) continue
    const instance =
        page.instance ??
        `${page.dialogueId ?? 'page'}:${page.cueIndex ?? ''}:${page.pageIndex ?? ''}`,
      previous = previousByInstance.get(instance) ?? []
    const grows = previous.every((line, index) => current[index] === line),
      appended = grows ? current.slice(previous.length) : current
    previousByInstance.set(instance, current)
    for (const line of appended) {
      const normalized = normalizeText(line)
      if (normalized) lines.push(normalized)
    }
  }
  return compact(lines)
}

function snapshotsBefore(trace, targetOrder) {
  const actors = new Map()
  for (const event of (trace.events ?? []).slice().sort((a, b) => a.order - b.order)) {
    if (event.order >= targetOrder) break
    if (event.kind === 'scene') actors.clear()
    if (event.kind === 'actor' && event.state) actors.set(event.id, event.state)
  }
  return actors
}

/** Infer contact from observed party displacement and an adjacent visible NPC. */
export function tracePartyContactEvents(trace) {
  return (trace.events ?? [])
    .filter((event) => event.kind === 'actor' && event.id === 'party' && event.state?.position)
    .flatMap((event) => {
      const from = canonicalPosition(event.before?.position),
        to = canonicalPosition(event.state.position)
      if (!from || !to || stable(from) === stable(to)) return []
      const delta = [to[0] - from[0], to[1] - from[1]],
        distance = Math.hypot(...delta)
      if (distance > 2.5) return []
      const previousPartyMoves = (trace.events ?? []).filter(
          (candidate) =>
            candidate.kind === 'actor' &&
            candidate.id === 'party' &&
            candidate.state?.position &&
            candidate.order < event.order &&
            candidate.before?.position,
        ),
        previousPartyMove = previousPartyMoves.at(-1),
        // Walking past an NPC produces the same small displacement. A contact
        // response is the displacement after a stable dwell at the spot.
        dwellMs = previousPartyMove ? event.atMs - previousPartyMove.atMs : Infinity
      if (dwellMs < 1000) return []
      const candidates = [...snapshotsBefore(trace, event.order).entries()]
        .filter(([id, state]) => id !== 'party' && state.visible !== false && state.position)
        .map(([id, state]) => {
          const position = canonicalPosition(state.position)
          return position
            ? { id, position, distance: Math.hypot(position[0] - from[0], position[1] - from[1]) }
            : null
        })
        .filter(Boolean)
        .sort((a, b) => a.distance - b.distance)
      const nearest = candidates[0]
      if (!nearest || nearest.distance > 1.75) return []
      return [
        {
          order: event.order,
          atMs: event.atMs,
          source: event.source,
          npc: nearest.id,
          npcDistance: nearest.distance,
          from,
          to,
          delta,
        },
      ]
    })
}

export function observeNpcState(trace, ids) {
  const actors = Object.fromEntries(
    ids.map((id) => {
      const transitions = actorTransitions(trace, id),
        states = stateTimeline(trace, id)
      return [
        id,
        {
          observed: transitions.length > 0,
          transitions,
          fields: Object.fromEntries(
            ACTOR_FIELDS.map((field) => [field, compact(defined(states[field]))]),
          ),
          movement: movementSummary(trace, id),
        },
      ]
    }),
  )
  return {
    actors,
    control: controlSequence(trace),
    dialogue: dialogueLines(trace),
    partyContacts: tracePartyContactEvents(trace),
  }
}

function fieldDifference(game, reforge, id, field) {
  const left = game.actors[id]?.fields[field] ?? [],
    right = reforge.actors[id]?.fields[field] ?? []
  if (!left.length && !right.length) return null
  if (stable(left) === stable(right)) return null
  return { type: 'actor-field', id, field, game: left, reforge: right }
}

function compareObservedState(game, reforge, ids, fragment) {
  const findings = []
  for (const id of ids) {
    const left = game.actors[id],
      right = reforge.actors[id]
    if (!left?.observed || !right?.observed) {
      findings.push({
        type: 'missing-actor-observation',
        id,
        game: left?.observed ?? false,
        reforge: right?.observed ?? false,
      })
      continue
    }
    for (const field of ['visible', 'facing', ...(id === 'party' ? [] : ['state'])]) {
      const difference = fieldDifference(game, reforge, id, field)
      if (difference) findings.push(difference)
    }
    // Missing telemetry is an evidence gap, never proof of an unchanged NPC.
    for (const field of ['frame', 'sprite']) {
      if (id === 'party') continue
      if (left.fields[field].length && right.fields[field].length) {
        const difference = fieldDifference(game, reforge, id, field)
        if (difference) findings.push(difference)
      } else
        findings.push({
          type: 'evidence-gap',
          id,
          field,
          game: left.fields[field].length > 0,
          reforge: right.fields[field].length > 0,
        })
    }
    const movement = left.movement,
      otherMovement = right.movement
    if (id !== 'party' && movement.count !== otherMovement.count)
      findings.push({
        type: 'movement-count',
        id,
        game: movement.count,
        reforge: otherMovement.count,
      })
    if (
      id !== 'party' &&
      movement.directions.length &&
      otherMovement.directions.length &&
      stable(movement.directions) !== stable(otherMovement.directions)
    )
      findings.push({
        type: 'movement-path',
        id,
        game: movement.directions,
        reforge: otherMovement.directions,
      })
    if (
      id !== 'party' &&
      movement.medianIntervalMs !== null &&
      otherMovement.medianIntervalMs !== null &&
      (Math.max(movement.medianIntervalMs, otherMovement.medianIntervalMs) /
        Math.max(1, Math.min(movement.medianIntervalMs, otherMovement.medianIntervalMs)) >
        2.5 ||
        Math.abs(movement.burstFraction - otherMovement.burstFraction) > 0.2)
    )
      findings.push({
        type: 'movement-cadence',
        id,
        game: {
          medianIntervalMs: movement.medianIntervalMs,
          burstFraction: movement.burstFraction,
        },
        reforge: {
          medianIntervalMs: otherMovement.medianIntervalMs,
          burstFraction: otherMovement.burstFraction,
        },
      })
  }
  if (!game.control.length || !reforge.control.length)
    findings.push({
      type: 'evidence-gap',
      field: 'control',
      game: game.control.length > 0,
      reforge: reforge.control.length > 0,
    })
  else if (
    game.control.length &&
    reforge.control.length &&
    stable(game.control) !== stable(reforge.control)
  )
    findings.push({ type: 'control', game: game.control, reforge: reforge.control })
  if (!game.dialogue.length || !reforge.dialogue.length)
    findings.push({
      type: 'evidence-gap',
      field: 'dialogue',
      game: game.dialogue.length > 0,
      reforge: reforge.dialogue.length > 0,
    })
  else if (stable(game.dialogue) !== stable(reforge.dialogue))
    findings.push({ type: 'dialogue', game: game.dialogue, reforge: reforge.dialogue })
  if (
    fragment === '002' &&
    stable(game.partyContacts.map((event) => [event.npc, event.delta])) !==
      stable(reforge.partyContacts.map((event) => [event.npc, event.delta]))
  )
    findings.push({
      type: 'party-contact-response',
      game: game.partyContacts,
      reforge: reforge.partyContacts,
    })
  return findings
}

export function compareNpcStateTraces(gameTrace, reforgeTrace, fragment) {
  const ids = [
    ...new Set(
      [...gameTrace.events, ...reforgeTrace.events]
        .filter((event) => event.kind === 'actor')
        .map((event) => event.id),
    ),
  ].sort()
  assert(ids.length, 'no actor observations; cannot compare an empty tape')
  const game = observeNpcState(gameTrace, ids),
    reforge = observeNpcState(reforgeTrace, ids),
    findings = compareObservedState(game, reforge, ids, fragment),
    // Every observed mismatch is unresolved until the report explains why it
    // is an intentional engine difference or fixes the responsible layer.
    violations = findings
  return { fragment, actors: ids, game, reforge, findings, violations }
}

export async function assertNpcTransitionParity({ gameReportPath, reforgeReportPath, fragment }) {
  const [gameReport, reforgeReport] = await Promise.all([
    readNpcTrace(gameReportPath),
    readNpcTrace(reforgeReportPath),
  ])
  assert.equal(gameReport.report.status, 'passed')
  assert.equal(reforgeReport.report.status, 'passed')
  const comparison = compareNpcStateTraces(gameReport.trace, reforgeReport.trace, fragment)
  if (comparison.violations.length) {
    const error = new Error(
      `observed NPC state differs in ${fragment}: ${JSON.stringify(comparison.violations, null, 2)}`,
    )
    error.comparison = comparison
    throw error
  }
  return { ...comparison, gameTrace: gameReport.tracePath, reforgeTrace: reforgeReport.tracePath }
}
