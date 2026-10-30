import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import zlib from 'node:zlib'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = execFileSync('git', ['rev-parse', '--show-toplevel'], {
  cwd: here,
  encoding: 'utf8',
}).trim()
const hash = (b) => crypto.createHash('sha256').update(b).digest('hex')
const report = JSON.parse(fs.readFileSync(path.join(here, 'review.json')))
for (const entry of report.context)
  assert.equal(
    hash(fs.readFileSync(path.join(root, entry.path))),
    entry.sha256,
    `STALE code/context: ${entry.path}`,
  )
for (const entry of report.assetInputs) {
  const p = path.join(root, entry.path)
  if (!fs.existsSync(p)) {
    console.error(`UNAVAILABLE runtime asset: ${entry.path}; historical receipt remains recorded`)
    process.exit(2)
  }
  assert.equal(hash(fs.readFileSync(p)), entry.sha256, `STALE runtime asset: ${entry.path}`)
}
const packed = fs.readFileSync(path.join(here, report.receipts.path))
assert.equal(hash(packed), report.receipts.sha256)
const members = new Map()
for (const member of JSON.parse(zlib.gunzipSync(packed)).members) {
  assert(!members.has(member.name))
  const b = Buffer.from(member.base64, 'base64')
  assert.equal(b.length, member.bytes)
  assert.equal(hash(b), member.sha256)
  members.set(member.name, b)
}
const json = (name) => JSON.parse(members.get(name))
const tests = (name) => json(name).testResults.flatMap((f) => f.assertionResults)
function execution(id, expected) {
  const e = json(`${id}.execution.json`)
  assert.equal(e.exit, expected)
  assert.equal(e.signal, null)
  assert.equal(e.spawnError, null)
  if (expected === 0) assert.equal(members.get(`${id}.stderr.raw`).length, 0)
}
for (const id of ['baseline', 'strengthened']) {
  execution(id, 0)
  assert.equal(tests(`${id}.native.json`).length, 3)
  assert(tests(`${id}.native.json`).every((t) => t.status === 'passed'))
}
assert.deepEqual(
  tests('baseline.native.json')
    .map((t) => t.fullName)
    .sort(),
  tests('strengthened.native.json')
    .map((t) => t.fullName)
    .sort(),
)
assert.equal(report.controls.records.length, 3)
for (const c of report.controls.records) {
  execution(`${c.id}-old`, 0)
  execution(`${c.id}-new`, 1)
  const all = tests(`${c.id}-new.native.json`),
    red = all.filter((t) => t.status === 'failed')
  assert.equal(all.length, 3)
  assert.equal(red.length, 1)
  assert(red[0].failureMessages.join('').includes('AssertionError'))
  assert.equal(red[0].fullName, c.new.failed[0].fullName)
}
assert(report.controls.sourceRestored && report.controls.testsRestored)
execution('seam-formal-red', 1)
const seamRed = tests('seam-formal-red.native.json').filter((t) => t.status === 'failed')
assert.equal(seamRed.length, 1)
assert(
  seamRed[0].fullName.endsWith(
    'fills an uncovered edge before downsampling the actual 640px minimap image',
  ),
)
assert(seamRed[0].failureMessages.join('').includes('AssertionError'))
execution('seam-directed', 0)
execution('adjacent', 0)
execution('final-typecheck', 0)
assert.equal(tests('seam-directed.native.json').length, 5)
assert(tests('seam-directed.native.json').every((t) => t.status === 'passed'))
const adjacent = json('adjacent.native.json')
assert.equal(adjacent.testResults.filter((f) => f.assertionResults.length).length, 11)
assert.equal(tests('adjacent.native.json').length, 57)
assert(tests('adjacent.native.json').every((t) => t.status === 'passed'))
execution('native-seam-red', 1)
execution('native-seam-green', 0)
const before = json('native-red/thumbnail-probe.json'),
  after = json('native-green/thumbnail-probe.json')
assert.equal(before.failure.name, 'AssertionError')
assert.deepEqual(before.edgePixel, [0, 0, 0, 255])
assert(!after.failure)
assert.deepEqual(after.edgePixel, [116, 12, 8, 255])
assert.deepEqual(after.diagnostics, [])
assert(before.browserClosed && after.browserClosed)
assert(after.cases.every((c) => c.productionMatchesSourceClone && c.differentPixels === 0))
const startup = json('bootstrap-smoke/browser-read-failure.json')
assert(!startup.failure)
assert.deepEqual(startup.state.party, [4, 1])
assert.equal(startup.state.scene, 2)
assert.deepEqual(startup.diagnostics, [])
assert(startup.browserClosed)
for (const [id, p] of [
  ['map-reload-probe', 'map-reload-probe'],
  ['map-tiles-failure', 'map-reload-tiles-failure'],
  ['map-tiles-r2', 'map-reload-tiles-r2'],
]) {
  execution(id, 1)
  const row = json(`${p}/browser-read-failure.json`)
  assert.equal(row.failure.name, 'AssertionError')
  assert(row.unhandled.some((e) => e.type === 'pageerror'))
  assert(row.browserClosed)
  if (id !== 'map-reload-probe') {
    assert.equal(row.tileBefore, true)
    assert.equal(row.tileAfter, false)
  }
}
assert.equal(report.files.filter((f) => f.decision.startsWith('accept')).length, 9)
assert(report.stops.mapFailure.status.startsWith('Approved and code repaired'))
execution('map-caller-red', 1)
const mapRed = tests('map-caller-red.native.json').filter((t) => t.status === 'failed')
assert.equal(mapRed.length, 1)
assert(mapRed[0].failureMessages.join('').includes('AssertionError'))
assert(
  mapRed[0].fullName.endsWith(
    'logs a rejected map replacement without interrupting the remaining script or owning its state',
  ),
)
for (const id of [
  'map-adjacent-r2',
  'map-typecheck',
  'consistency-typecheck',
  'consistency-helpers',
  'consistency-proof',
  'map-control',
  'consistency-red-replay',
])
  execution(id, 0)
assert.equal(tests('map-adjacent-r2.native.json').length, 391)
assert(tests('map-adjacent-r2.native.json').every((t) => t.status === 'passed'))
assert.equal(tests('consistency-helpers.native.json').length, 3)
assert(tests('consistency-helpers.native.json').every((t) => t.status === 'passed'))
execution('map-consistency-final', 0)
const finalMap = json('map-consistency-final/report.json')
assert.equal(finalMap.cases.length, 7)
assert(finalMap.browserClosed && finalMap.cases.every((c) => c.passed && c.contextClosed))
for (const row of finalMap.cases) {
  assert.deepEqual(
    row.replacementEvents.filter((e) => e.type === 'pageerror'),
    [],
  )
  const diagnostics = row.replacementEvents.filter(
    (e) => e.type === 'console' && ['warning', 'error'].includes(e.level),
  )
  if (row.name.endsWith('failure')) {
    assert.equal(diagnostics.length, 2)
    assert.equal(
      diagnostics.filter((e) => e.text.startsWith('event-system: mapReloader(12) failed:')).length,
      1,
    )
  } else assert.deepEqual(diagnostics, [])
}
execution('map-browser-control', 1)
const control = json('map-browser-control/report.json')
assert.deepEqual(
  control.cases.filter((c) => !c.passed).map((c) => c.name),
  ['latest-request', 'scene-reload'],
)
assert(control.cases.filter((c) => !c.passed).every((c) => c.failure.name === 'AssertionError'))
assert(control.browserClosed && control.cases.every((c) => c.contextClosed))
const restored = json('map-control-restored.json')
assert(restored.sourceRestored && restored.originalSha256 === restored.restoredSha256)
const delta = JSON.parse(fs.readFileSync(path.join(here, 'approved-map-consistency-delta.json')))
assert.equal(restored.restoredSha256, delta.beforeSha256)
execution('map-consistency-red-r2', 1)
const oldMap = json('map-consistency-red-r2/report.json')
assert.deepEqual(
  oldMap.cases.filter((c) => !c.passed).map((c) => c.name),
  ['changed-map-revisit', 'named-map-override'],
)
assert(oldMap.cases.filter((c) => !c.passed).every((c) => c.failure.name === 'AssertionError'))
assert(oldMap.browserClosed && oldMap.cases.every((c) => c.contextClosed))
const replay = json('consistency-red-restored.json')
assert(replay.restored && replay.finalSourceSha256 === replay.restoredSha256)
assert.equal(
  replay.restoredSha256,
  report.context.find((c) => c.path === 'packages/game/src/shell/bootstrap.ts').sha256,
)
execFileSync(process.execPath, [path.join(here, 'prove-refactor.cjs')], {
  cwd: root,
  stdio: 'pipe',
})
const statics = JSON.parse(fs.readFileSync(path.join(here, 'static.json'))),
  archive = fs.readFileSync(path.join(here, statics.archive.path))
assert.equal(hash(archive), statics.archive.sha256)
const raw = new Map(
  JSON.parse(zlib.gunzipSync(archive)).members.map((m) => {
    const b = Buffer.from(m.base64, 'base64')
    assert.equal(hash(b), m.sha256)
    assert.equal(b.length, m.bytes)
    return [m.name, b]
  }),
)
for (const id of statics.gates) {
  const e = JSON.parse(raw.get(`${id}.execution.json`))
  assert.equal(e.exit, 0)
  assert.equal(e.signal, null)
  assert.equal(e.spawnError, null)
  assert.equal(raw.get(`${id}.stderr.raw`).length, 0)
}
assert(
  raw
    .get('lint-final.stdout.raw')
    .toString()
    .includes('0 errors / 0 warnings / 0 infos; complete report'),
)
for (const entry of statics.inputs)
  assert.equal(
    hash(fs.readFileSync(path.join(root, entry.path))),
    entry.sha256,
    `STALE static input: ${entry.path}`,
  )
console.log(
  'PASS:9 accepted code scopes/7 new closures, retained helper controls and native seam red-green; approved map ownership/identity repair with7 real-browser contracts,391 adjacent tests and valid restoration/controls. CODE57/3r/53 code accepted; unified pre94 integration and CODE1/3m/42 remain open.',
)
