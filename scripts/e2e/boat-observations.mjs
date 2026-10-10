import assert from 'node:assert/strict'
import { canonicalPosition } from './coordinate-evidence.mjs'

const compact = (values) =>
  values.filter(
    (value, index) => index === 0 || JSON.stringify(value) !== JSON.stringify(values[index - 1]),
  )

/** Boarding/disembarkation are separate story obligations. Inside the first-to-last
 * boat movement interval, a stationary boat frame must not hide a rider drift or turn.
 */
export function boatRideSamples(samples) {
  assert(Array.isArray(samples) && samples.length >= 3, 'missing boat motion observations')
  const moved = samples.flatMap((sample, index) => {
    const point = canonicalPosition(sample.e116),
      previous = index ? canonicalPosition(samples[index - 1].e116) : null
    assert(point, 'missing boat position')
    return previous && point.some((value, axis) => value !== previous[axis]) ? [index] : []
  })
  assert(moved.length >= 3, 'boat never moved through three observed positions')
  return samples.slice(moved[0], moved.at(-1) + 1)
}

/** Summarize actual observed motion, without a desired offset/facing baked into the oracle. */
export function summarizeBoatMotion(samples) {
  assert(Array.isArray(samples) && samples.length >= 3, 'missing boat motion observations')
  const origin = canonicalPosition(samples[0].e116)
  assert(origin, 'missing initial boat position')
  const ride = boatRideSamples(samples)
  const relative = (sample, key) => {
    const actor = canonicalPosition(sample[key]),
      boat = canonicalPosition(sample.e116)
    assert(actor && boat, `missing ${key}/boat position during ride`)
    return actor.map((value, index) => value - boat[index])
  }
  return {
    samples: ride.length,
    start: origin,
    end: canonicalPosition(ride.at(-1).e116),
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
  compare('boat.route-start', game.motion.start, reforge.motion.start)
  compare('boat.route-end', game.motion.end, reforge.motion.end)
  compare('boat.arrival-scene', game.arrivalScene, reforge.arrivalScene)
  return {
    status: findings.length ? 'needs-review' : 'passed',
    findings,
    observations: { game, reforge },
  }
}
