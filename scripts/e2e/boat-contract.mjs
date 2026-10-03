import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { repoRoot, sha256 } from './browser-journey.mjs'

export const BOAT_DIALOGUE_ROWS = Object.freeze([
  342, 343, 345, 346, 347, 349, 350, 352, 353, 354, 356, 357, 359, 360, 362, 363, 364, 307, 308,
  310, 311, 312, 314, 316, 318, 319, 321, 322, 323, 325, 327, 328, 330, 331, 332, 334, 336, 337,
  339, 340, 533, 534, 535, 536, 538, 539, 540, 542, 543, 544, 546,
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
  assert.equal(report.boatMotion.partyBoatRelative, 'zero-through-ride')
  assert.equal(report.boatMotion.rideFacing, 'down')
}

export function assertBoatMotion(samples) {
  assert(samples.length >= 3, 'boat motion trace too short')
  const origin = samples[0].e116
  const ride = samples.filter(
    (sample) =>
      sample.e116 &&
      origin &&
      Math.hypot(sample.e116[0] - origin[0], sample.e116[1] - origin[1]) > 0.01,
  )
  assert(ride.length >= 3, 'boat never committed a multi-sample ride')
  for (const sample of ride) {
    assert(sample.position && sample.e116, 'ride sample missing party/boat position')
    assert(
      Math.hypot(sample.position[0] - sample.e116[0], sample.position[1] - sample.e116[1]) < 0.05,
      'party detached from boat during ride',
    )
    assert.equal(sample.facing, 'down', 'party facing changed during ride')
  }
  return { samples: ride.length, partyBoatRelative: 'zero-through-ride', rideFacing: 'down' }
}
