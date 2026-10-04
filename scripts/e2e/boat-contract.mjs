import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { repoRoot, sha256 } from './browser-journey.mjs'

export const BOAT_DIALOGUE_ROWS = Object.freeze([
  342, 343, 345, 346, 347, 349, 350, 352, 353, 354, 356, 357, 359, 360, 362, 363, 364, 307, 308,
  310, 311, 312, 314, 316, 318, 319, 321, 322, 323, 325, 327, 328, 330, 331, 332, 334, 336, 337,
  339, 340, 366, 367, 368, 369, 371, 372, 374, 375, 376, 378, 380, 381, 382, 384, 386, 387, 388,
  389, 390, 391, 392, 394, 396, 397, 398, 399, 400, 401, 403, 405, 406, 408, 409, 410, 412, 414,
  415, 417, 418, 419, 533, 534, 535, 536, 538, 539, 540, 542, 543, 544, 546,
])

export async function readBoatContract(root = repoRoot) {
  const scenes = {}
  const maps = {}
  const hashes = {}
  for (const sid of ['s002', 's003', 's004', 's005', 's014']) {
    const scenePath = `projects/pal/content/scenes/${sid}.json`
    scenes[sid] = JSON.parse(await readFile(resolve(root, scenePath), 'utf8'))
    hashes[scenePath] = sha256(await readFile(resolve(root, scenePath)))
    const mapPath = `projects/pal/content/maps/${scenes[sid].mapId}.json`
    if (!maps[scenes[sid].mapId]) {
      maps[scenes[sid].mapId] = JSON.parse(await readFile(resolve(root, mapPath), 'utf8'))
      hashes[mapPath] = sha256(await readFile(resolve(root, mapPath)))
    }
  }
  return { hashes, scenes, maps, rows: BOAT_DIALOGUE_ROWS.map((id) => `dlg.${id}`) }
}

export function assertBoatReport(report) {
  assert.equal(report.fragment, '006')
  assert.equal(report.engine, 'reforge')
  assert.equal(report.kind, 'verify')
  assert.equal(report.status, 'passed')
  assert.equal(report.core.status, 'passed')
  assert.equal(report.route.status, 'passed')
  assert.equal(report.checks.room, 'passed')
  assert.equal(report.checks.doctor, 'passed')
  assert.equal(report.checks.boat, 'passed')
  assert.equal(report.checks.island, 'passed')
  assert.deepEqual(
    report.core.rows,
    BOAT_DIALOGUE_ROWS.map((id) => `dlg.${id}`),
  )
  assert.equal(report.endWorld.position.sceneId, 's014')
  assert(report.endWorld.position.pos)
  assert(report.boatMotion?.samples >= 3)
  assert.equal(report.boatMotion.partyBoatRelative, 'constant-through-ride')
  assert(Array.isArray(report.boatMotion.relativeOffset))
  assert(Array.isArray(report.boatMotion.companionOffset))
  assert(Array.isArray(report.boatMotion.rideFacings) && report.boatMotion.rideFacings.length > 0)
}

export function assertBoatMotion(samples) {
  assert(samples.length >= 3, 'boat motion trace too short')
  const origin = samples[0].e116
  const ride = samples.filter((sample, index) => {
    const previous = samples[index - 1]?.e116
    return (
      index > 0 &&
      sample.e116 &&
      previous &&
      Math.hypot(sample.e116[0] - previous[0], sample.e116[1] - previous[1]) > 0.001 &&
      origin &&
      Math.hypot(sample.e116[0] - origin[0], sample.e116[1] - origin[1]) > 0.01
    )
  })
  assert(ride.length >= 3, 'boat never committed a multi-sample ride')
  const roundedOffset = (values) => values.map((value) => Math.round(value * 10000) / 10000)
  const relativeOffset = roundedOffset(
    ride[0].position.map((value, index) => value - ride[0].e116[index]),
  )
  const companionOffset = roundedOffset(
    ride[0].e117.map((value, index) => value - ride[0].e116[index]),
  )
  for (const sample of ride) {
    assert(sample.position && sample.e116, 'ride sample missing party/boat position')
    assert.deepEqual(
      roundedOffset(sample.position.map((value, index) => value - sample.e116[index])),
      relativeOffset,
      'party detached from boat during ride',
    )
    assert.deepEqual(
      roundedOffset(sample.e117.map((value, index) => value - sample.e116[index])),
      companionOffset,
      'rower detached from boat during ride',
    )
  }
  return {
    samples: ride.length,
    relativeOffset,
    companionOffset,
    rideFacings: [...new Set(ride.map((sample) => sample.facing))],
    partyBoatRelative: 'constant-through-ride',
  }
}
