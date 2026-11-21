import assert from 'node:assert/strict'
import { party, turns } from './contract.mjs'

const resource = (id) => Number(String(id).replace(/^sprite-/u, ''))
const pose = (row) => ({ frame: row.frame, world: row.world, resource: resource(row.spriteId) })
const start = (trace, engine, ops) =>
  trace.events.find(
    (event) =>
      event.kind === 'script-op' &&
      (engine === 'game'
        ? event.ip === 24818
        : event.op === 'shakeScreen' && event.atMs < ops[0].atMs),
  )

export function partyTurnEvidence(trace, engine, full) {
  const ops = trace.events.filter(
    (event) =>
      event.kind === 'script-op' &&
      (engine === 'game' ? turns.includes(event.ip) : event.op === 'setPartyFacing'),
  )
  assert.equal(ops.length, turns.length, `${engine} must record all eight hallway turns`)
  if (engine === 'game')
    assert.deepEqual(
      ops.map(({ ip }) => ip),
      turns,
    )
  const anchor = start(trace, engine, ops)
  assert(anchor && anchor.atMs < ops[0].atMs, `${engine} hallway shake before turn missing`)
  const fade = trace.events.find(
    (event) =>
      event.kind === 'script-op' &&
      event.atMs >= ops.at(-1).atMs &&
      (engine === 'game' ? event.ip === 24837 : event.op === 'fade'),
  )
  assert(fade)
  const compressed = trace.events
    .filter(
      (event) =>
        event.kind === 'paint' &&
        event.surface === 'world' &&
        event.geometry?.party.length &&
        event.atMs < fade.atMs + 500,
    )
    .map(({ atMs, geometry }) => ({ atMs, party: geometry.party }))
  const draws = full?.renders ?? compressed
  assert(draws.length && full?.overflow !== true, `${engine} missing or overflowed party evidence`)
  const samples = [anchor, ...ops].map((event, index, phases) => {
    const end = phases[index + 1]?.atMs ?? fade.atMs + 100
    const band = draws.filter(({ atMs }) => event.atMs <= atMs && atMs < end)
    const usable =
      index === phases.length - 1 ? band.filter(({ atMs }) => atMs <= fade.atMs + 34) : band
    const prior = draws.findLast(({ atMs }) => atMs < event.atMs)
    const rows = usable.length ? usable : prior ? [prior] : []
    assert(rows.length, `${engine} has no actual drawing for hallway phase ${index}`)
    const sequences = {}
    const byActor = Object.fromEntries(
      party.map((actor) => {
        const drawn = rows
          .filter((row) => row.party.length === party.length)
          .map(({ party: cast }) => {
            const row = cast.find(({ id }) => id === actor)
            assert(row && row.slot === party.indexOf(actor) && Number.isSafeInteger(row.frame))
            return pose(row)
          })
        assert(drawn.length, `${engine} did not draw ${actor}`)
        sequences[actor] = drawn.filter(
          (item, i) => i === 0 || JSON.stringify(item) !== JSON.stringify(drawn[i - 1]),
        )
        return [actor, drawn.at(-1)]
      }),
    )
    return {
      pc: index === 0 ? 24818 : turns[index - 1],
      scriptAtMs: event.atMs,
      windowMs: end - event.atMs,
      lastLeaderDirection:
        engine === 'game'
          ? (ops.slice(0, index).findLast((op) => op.operands[2] === 0)?.operands[0] ?? null)
          : null,
      maxGapMs: usable.length
        ? Math.max(
            usable[0].atMs - event.atMs,
            ...usable.slice(1).map((draw, i) => draw.atMs - usable[i].atMs),
            (index === phases.length - 1 ? fade.atMs + 34 : end) - usable.at(-1).atMs,
          )
        : null,
      sequences,
      renderCount: usable.length,
      lastDrawAtMs: rows.at(-1).atMs,
      byActor,
    }
  })
  return { source: full ? 'continuous-render' : 'archived-render-changes', samples }
}

export function comparePartyTurns(game, reforge) {
  const findings = []
  const explainedAssets = []
  for (const [index, reference] of game.samples.entries()) {
    const actual = reforge.samples[index]
    for (const id of party) {
      const original = reference.byActor[id]
      const expected = { ...original }
      // Asset 534 has four frames per direction. Original 0x15 always multiplies direction by 3.
      // Preserve the original spoken action's intended direction, not the invalid group boundary.
      if (original.resource === 534) {
        const direction = reference.lastLeaderDirection ?? Math.floor(original.frame / 4)
        expected.frame = direction * 4
        if (expected.frame !== original.frame)
          explainedAssets.push({
            id,
            pc: reference.pc,
            original: original.frame,
            intended: expected.frame,
            direction,
          })
      }
      const candidate = actual.byActor[id]
      const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b)
      if (!equal(candidate, expected))
        findings.push({
          type: 'actor-render-pose',
          scene: 's144',
          id,
          pc: reference.pc,
          game: original,
          expected,
          reforge: candidate,
        })
      const previous = reforge.samples[index - 1]?.byActor[id]
      const sequence = actual.sequences[id]
      const settled = sequence.findIndex((row) => equal(row, expected))
      if (
        reforge.source === 'continuous-render' &&
        settled >= 0 &&
        (sequence.slice(0, settled).some((row) => !equal(row, previous)) ||
          sequence.slice(settled).some((row) => !equal(row, expected)))
      )
        findings.push({
          type: 'actor-unexpected-render-between-turns',
          scene: 's144',
          id,
          pc: reference.pc,
          expected,
          sequence,
        })
    }
  }
  for (const [engine, evidence] of [
    ['game', game],
    ['reforge', reforge],
  ]) {
    if (evidence.source !== 'continuous-render')
      findings.push({
        type: 'evidence-gap',
        engine,
        scene: 's144',
        field: 'continuous-party-draws',
      })
    else
      for (const sample of evidence.samples)
        if (sample.renderCount === 0 || sample.maxGapMs > 150)
          findings.push({
            type: 'evidence-gap',
            engine,
            scene: 's144',
            field: 'party-turn-draw',
            pc: sample.pc,
            maxGapMs: sample.maxGapMs,
          })
  }
  return { findings, explainedAssets }
}
