import assert from 'node:assert/strict'
import test from 'node:test'
import { compareBoatObservations, summarizeBoatMotion } from './boat-observations.mjs'

const sample = (x, y, facing = 'up') => ({
  position: [x + 32, y - 48],
  e116: [x, y],
  e117: [x - 68, y + 2],
  facing,
})

test('boat observations normalize both coordinate models and expose every relative drift', () => {
  const game = [sample(0, 0), sample(16, -8), sample(32, -16), sample(48, -24)]
  const reforge = game.map((s) => {
    const grid = (p) => [(p[0] / 16 + p[1] / 8) / 2, (p[1] / 8 - p[0] / 16) / 2, 0]
    return { position: grid(s.position), e116: grid(s.e116), e117: grid(s.e117), facing: s.facing }
  })
  assert.deepEqual(summarizeBoatMotion(game), summarizeBoatMotion(reforge))
  assert.deepEqual(summarizeBoatMotion(game).partyOffsets, [[-2, -4]])
  reforge[2].e117[0] += 1
  assert.deepEqual(summarizeBoatMotion(reforge).rowerOffsets, [
    [-2, 2.25],
    [-1, 2.25],
    [-2, 2.25],
  ])
  assert.throws(
    () => summarizeBoatMotion([sample(0, 0), sample(0, 0), sample(0, 0)]),
    /never moved/,
  )
  assert.throws(() => summarizeBoatMotion(game.map((s) => ({ ...s, e117: null }))), /missing e117/)
})

test('independent pass labels cannot hide missing counsel, rower drift or wrong ride facing', () => {
  const left = {
    rows: ['dlg.342', 'dlg.366', 'dlg.546'],
    arrivalScene: 's014',
    motion: summarizeBoatMotion([sample(0, 0), sample(16, -8), sample(32, -16), sample(48, -24)]),
  }
  assert.equal(compareBoatObservations(left, structuredClone(left)).status, 'passed')
  const right = structuredClone(left)
  right.rows.splice(1, 1)
  right.motion.rowerOffsets.push([0, 0])
  right.motion.facings = ['down']
  assert.deepEqual(
    compareBoatObservations(left, right).findings.map((f) => f.id),
    ['dialogue.sequence', 'boat.rower-relative-offset', 'boat.ride-facing'],
  )
})
