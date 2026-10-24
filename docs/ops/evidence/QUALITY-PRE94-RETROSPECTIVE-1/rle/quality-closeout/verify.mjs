import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import zlib from 'node:zlib'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = execFileSync('git', ['rev-parse', '--show-toplevel'], {
  cwd: here,
  encoding: 'utf8',
}).trim()
const hash = (b) => crypto.createHash('sha256').update(b).digest('hex')
const report = JSON.parse(fs.readFileSync(path.join(here, 'review.json')))
for (const row of report.context)
  assert.equal(hash(fs.readFileSync(path.join(root, row.path))), row.sha256, `STALE ${row.path}`)
const packed = fs.readFileSync(path.join(here, report.receipts.path))
assert.equal(hash(packed), report.receipts.sha256)
const members = new Map()
for (const row of JSON.parse(zlib.gunzipSync(packed)).members) {
  assert(!members.has(row.name))
  const b = Buffer.from(row.base64, 'base64')
  assert.equal(b.length, row.bytes)
  assert.equal(hash(b), row.sha256)
  members.set(row.name, b)
}
assert.equal(members.size, report.receipts.members)
const json = (n) => JSON.parse(members.get(n))
const tests = (n) => json(`${n}.native.json`).testResults.flatMap((f) => f.assertionResults)
function execution(n, exit, clean = true) {
  const e = json(`${n}.execution.json`)
  assert.equal(e.exit, exit, n)
  assert.equal(e.signal, null)
  assert.equal(e.spawnError, null)
  if (clean) assert.equal(members.get(`${n}.stderr.raw`).length, 0, n)
}
function green(n, count) {
  execution(n, 0)
  assert.equal(tests(n).length, count)
  assert(tests(n).every((t) => t.status === 'passed'))
}
green('baseline', 59)
for (const [n, count] of Object.entries(report.gates)) {
  if (n.startsWith('adjacent-') || n === 'atomic-directed') green(n, count)
  else execution(n, 0)
}
assert(
  members
    .get('atomic-retirement-test.stdout.raw')
    .toString()
    .includes(`# tests ${report.gates['atomic-retirement-test']}`),
)
const mappingBytes = fs.readFileSync(path.join(here, report.identityMapping.path))
assert.equal(hash(mappingBytes), report.identityMapping.sha256)
const { mapping, snapshots } = JSON.parse(mappingBytes)
assert.equal(mapping.length, 59)
assert.equal(mapping.filter((m) => m.decision.startsWith('retired')).length, 9)
const oldIdentities = json('baseline.native.json').testResults.flatMap((f) =>
  f.assertionResults.map((t) => ({
    file: `packages/shared/src/${path.basename(f.name)}`,
    fullName: t.fullName,
  })),
)
const currentIdentities = json('atomic-directed.native.json').testResults.flatMap((f) =>
  f.assertionResults.map((t) => ({
    file: `packages/shared/src/${path.basename(f.name)}`,
    fullName: t.fullName,
  })),
)
const key = (v) => JSON.stringify(v)
assert.deepEqual(mapping.map((m) => key(m.old)).sort(), oldIdentities.map(key).sort())
assert.deepEqual(
  [...new Set(mapping.flatMap((m) => m.targets.map(key)))].sort(),
  currentIdentities.map(key).sort(),
)
for (const c of report.controls.records) {
  execution(`${c.id}-before`, 0)
  execution(`${c.id}-after`, 1, false)
  const selected = (n) => tests(n).filter((t) => ['passed', 'failed'].includes(t.status))
  const before = selected(`${c.id}-before`)
  const after = selected(`${c.id}-after`)
  assert.equal(before.length, 1)
  assert.equal(after.length, 1)
  assert.equal(before[0].status, 'passed')
  assert.equal(after[0].status, 'failed')
  assert.equal(before[0].fullName, c.runs[0].fullName)
  assert.equal(after[0].fullName, c.runs[1].fullName)
  assert(after[0].failureMessages.join('').includes('AssertionError'))
  assert(members.get(`${c.id}-after.stderr.raw`).toString().includes('Failed Tests 1'))
}
assert(report.controls.officialSourceUnchanged && report.controls.temporaryDirectoryRemoved)
assert.equal(
  hash(fs.readFileSync(path.join(root, 'packages/shared/src/rle.ts'))),
  hash(members.get('rle.ts.before')),
)
assert.equal(
  hash(fs.readFileSync(path.join(root, 'packages/shared/src/rle-encode.ts'))),
  hash(members.get('rle-encode.ts.before')),
)
const { isApprovedTestRetirement } = await import(
  pathToFileURL(path.join(root, 'scripts/coverage/approved-test-retirements.mjs'))
)
const baseline = JSON.parse(fs.readFileSync(path.join(root, 'scripts/coverage/baseline.fast.json')))
  .packages.shared.fastTests.fileEntries
for (const s of snapshots) {
  assert.equal(hash(fs.readFileSync(path.join(root, s.file))), s.fileSha256)
  assert(
    isApprovedTestRetirement({
      removal: { kind: 'test-count', value: s.file, previous: s.previous, current: s.current },
      previous: baseline.find((e) => e.file === s.file),
      current: { file: s.file, testCount: s.current, identityDigest: s.currentIdentityDigest },
      fileSha256: s.fileSha256,
    }),
  )
}
execution('census', 0)
const census = json('census.json')
assert.equal(census.commands, 4662630)
assert.deepEqual(census.divergences, [])
assert.deepEqual(census.rejections, [])
assert.equal(census.specialOffsets.length, 1)
assert.deepEqual(census.specialOffsets[0], {
  family: 'MGO',
  chunk: 571,
  slot: 1,
  word: 49698,
  tsOffset: 99396,
  sdlOffset: 33860,
  bytes: 59516,
})
execution('native571', 0)
const native = json('native571.json')
assert(native.rawUnchanged)
assert(native.runs.every((r) => r.exit === 0 && r.signal === null))
assert.equal(native.native.frames.length, 2)
assert.equal(native.native.frames[1].nativeOffset, 33860)
execution('ending-counter', 1, false)
const ending = json('ending-counter.json')
assert.equal(ending.failure.name, 'AssertionError')
assert.equal(ending.results.actualFrames, 1)
assert.equal(ending.results.referenceFrames, 2)
assert.equal(ending.results.actual.nonZero, 0)
assert.equal(ending.results.reference.sha256, native.native.frames[1].pixelsSha256)
assert.equal(ending.results.reference.nonZero, 23036)
assert.deepEqual(ending.diagnostics, [])
assert(ending.browserClosed)
for (const s of report.screenshots)
  assert.equal(hash(fs.readFileSync(path.join(here, s.path))), s.sha256)
for (const row of report.rawInputs) {
  const p = path.join(root, row.path)
  if (!fs.existsSync(p)) {
    console.error(`UNAVAILABLE current raw cohort ${row.path}; historical receipts remain frozen`)
    process.exit(2)
  }
  assert.equal(hash(fs.readFileSync(p)), row.sha256, `STALE ${row.path}`)
}
const staticReport = JSON.parse(fs.readFileSync(path.join(here, 'static.json')))
assert.equal(staticReport.state, 'complete')
const staticBytes = fs.readFileSync(path.join(here, staticReport.archive.path))
assert.equal(hash(staticBytes), staticReport.archive.sha256)
const staticMembers = new Map(
  JSON.parse(zlib.gunzipSync(staticBytes)).members.map((m) => {
    const b = Buffer.from(m.base64, 'base64')
    assert.equal(b.length, m.bytes)
    assert.equal(hash(b), m.sha256)
    return [m.name, b]
  }),
)
for (const name of staticReport.gates) {
  const e = JSON.parse(staticMembers.get(`${name}.execution.json`))
  assert.equal(e.exit, 0)
  assert.equal(e.signal, null)
  assert.equal(e.spawnError, null)
  assert.equal(staticMembers.get(`${name}.stderr.raw`).length, 0)
}
assert(
  staticMembers
    .get('static-lint.stdout.raw')
    .toString()
    .includes('0 errors / 0 warnings / 0 infos; complete report'),
)
for (const row of staticReport.inputs)
  assert.equal(hash(fs.readFileSync(path.join(root, row.path))), row.sha256, `STALE ${row.path}`)
console.log(
  'PASS:6 code test scopes,59→59 complete identity destinations,9 duplicates retired and independent inputs split,3 old-green/new-single-red controls,52 adjacent,TC/static/82 retirement checks. Product unchanged. MGO571 actual native/ending counter remains stopped for user decision; CODE1/3m/42 and final gates remain open.',
)
