import assert from 'node:assert/strict'
import { canonicalPosition } from './npc-transition-contract.mjs'

const compact = (values) =>
  values.filter(
    (value, index) => index === 0 || JSON.stringify(value) !== JSON.stringify(values[index - 1]),
  )

/** Summarize actual observed motion, without a desired offset/facing baked into the oracle. */
export function summarizeBoatMotion(samples) {
  assert(Array.isArray(samples) && samples.length >= 3, 'missing boat motion observations')
  const origin = canonicalPosition(samples[0].e116)
  assert(origin, 'missing initial boat position')
  const ride = samples.filter((sample) => {
    const point = canonicalPosition(sample.e116)
    return point && Math.hypot(point[0] - origin[0], point[1] - origin[1]) > 0.01
  })
  assert(ride.length >= 3, 'boat never moved through three observed positions')
  const relative = (sample, key) => {
    const actor = canonicalPosition(sample[key]),
      boat = canonicalPosition(sample.e116)
    assert(actor && boat, `missing ${key}/boat position during ride`)
    return actor.map((value, index) => Math.round((value - boat[index]) * 10000) / 10000)
  }
  return {
    samples: ride.length,
    partyOffsets: compact(ride.map((sample) => relative(sample, 'position'))),
    rowerOffsets: compact(ride.map((sample) => relative(sample, 'e117'))),
    facings: compact(ride.map((sample) => sample.facing)),
  }
}

/** Two independently successful stories can still fail their observed-behavior comparison. */
export function compareBoatObservations(game, reforge) {
  const findings = []
  const compare = (id, left, right) => {
    if (JSON.stringify(left) !== JSON.stringify(right))
      findings.push({ id, disposition: 'unreviewed', game: left, reforge: right })
  }
  compare('dialogue.sequence', game.rows, reforge.rows)
  compare('boat.party-relative-offset', game.motion.partyOffsets, reforge.motion.partyOffsets)
  compare('boat.rower-relative-offset', game.motion.rowerOffsets, reforge.motion.rowerOffsets)
  compare('boat.ride-facing', game.motion.facings, reforge.motion.facings)
  compare('boat.arrival-scene', game.arrivalScene, reforge.arrivalScene)
  return {
    status: findings.length ? 'needs-review' : 'passed',
    findings,
    observations: { game, reforge },
  }
}
