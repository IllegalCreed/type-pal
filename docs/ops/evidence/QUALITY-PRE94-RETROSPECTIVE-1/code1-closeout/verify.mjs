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
for (const p of report.context)
  assert.equal(hash(fs.readFileSync(path.join(root, p.path))), p.sha256, `STALE ${p.path}`)
const fixture = fs.readFileSync(path.join(here, report.fixtureInputs.path))
assert.equal(hash(fixture), report.fixtureInputs.sha256)
const inputs = JSON.parse(fixture)
assert.equal(inputs.length, report.fixtureInputs.count)
const current = execFileSync('rg', ['--files', 'projects/pal', '-g', '*.json'], {
  cwd: root,
  encoding: 'utf8',
})
  .trim()
  .split('\n')
  .sort()
assert.deepEqual(
  current,
  inputs.map((p) => p.path),
)
for (const p of inputs)
  assert.equal(
    hash(fs.readFileSync(path.join(root, p.path))),
    p.sha256,
    `STALE PAL input ${p.path}`,
  )
const packed = fs.readFileSync(path.join(here, report.receipts.path))
assert.equal(hash(packed), report.receipts.sha256)
const members = new Map()
for (const m of JSON.parse(zlib.gunzipSync(packed)).members) {
  assert(!members.has(m.name))
  const b = Buffer.from(m.base64, 'base64')
  assert.equal(b.length, m.bytes)
  assert.equal(hash(b), m.sha256)
  members.set(m.name, b)
}
assert.equal(members.size, report.receipts.members)
const json = (name) => JSON.parse(members.get(name))
function execution(name, exit) {
  const e = json(`${name}.execution.json`)
  assert.equal(e.exit, exit)
  assert.equal(e.signal, null)
  assert.equal(e.spawnError, null)
  if (exit === 0) assert.equal(members.get(`${name}.stderr.raw`).length, 0)
}
const tests = (n) => json(`q1b/${n}.native.json`).testResults.flatMap((f) => f.assertionResults)
for (const [name, count] of Object.entries(report.gates)) {
  execution(`q1b/${name}`, 0)
  if (count) {
    assert.equal(tests(name).length, count)
    assert(tests(name).every((t) => t.status === 'passed'))
  }
}
const mapping = fs.readFileSync(path.join(here, report.proof.mapping))
assert.equal(hash(mapping), report.proof.mappingSha256)
const groups = JSON.parse(mapping).groups
assert.equal(
  tests('baseline')[0].fullName,
  'ED-3 PAL project reference index keeps blocker parity, named-entry/shop/map facts and compact worker payload',
)
const expected = groups.map((g) => `ED-3 PAL project reference index ${g.name}`).sort()
assert.deepEqual(
  tests('directed')
    .map((t) => t.fullName)
    .sort(),
  expected,
)
assert.deepEqual(
  tests('shuffled')
    .map((t) => t.fullName)
    .sort(),
  expected,
)
execFileSync(process.execPath, [path.join(here, report.proof.path)], { cwd: root, stdio: 'pipe' })
const reuse = report.engineeringReuse
for (const [key, shaKey] of [
  ['acceptance', 'acceptanceSha256'],
  ['dimensions', 'dimensionsSha256'],
])
  assert.equal(hash(fs.readFileSync(path.join(root, reuse[key]))), reuse[shaKey])
for (const p of reuse.files) assert.equal(hash(fs.readFileSync(path.join(root, p.path))), p.sha256)
assert.equal(
  hash(fs.readFileSync(path.join(root, report.previousRle.review))),
  report.previousRle.sha256,
)
const priorRle = JSON.parse(fs.readFileSync(path.join(root, report.previousRle.review)))
const commentBridge = JSON.parse(fs.readFileSync(path.join(root, report.rleCommentBridge.path)))
execFileSync(process.execPath, [path.join(root, report.rleCommentBridge.proof)], {
  cwd: root,
  stdio: 'pipe',
})
function checkRetainedSource(p, scope) {
  const changed = commentBridge.files.find((f) => f.path === p.path)
  if (changed) assert.equal(changed.beforeSha256, p.sha256, `WRONG comment bridge base ${p.path}`)
  assert.equal(
    hash(fs.readFileSync(path.join(root, p.path))),
    changed?.afterSha256 ?? p.sha256,
    `STALE ${scope} ${p.path}`,
  )
}
for (const p of priorRle.context) checkRetainedSource(p, 'prior RLE code')
execution('domain/domain-typed', 0)
const domain = json(report.domainProbe.report)
for (const p of domain.pins) checkRetainedSource(p, 'domain probe')
assert.equal(domain.authored.offset, 99396)
assert.equal(domain.authored.nativeOffset, 33860)
assert.equal(domain.authored.strictFrames, 2)
assert.equal(domain.authored.lenientFrames, 2)
assert.equal(domain.authored.overbroadPatchFrames, 1)
assert(domain.authored.strictFailure.includes('frame 0'))
assert(domain.runs.every((r) => r.exit === 0 && r.signal === null && r.spawnError === null))
assert.equal(domain.raw571.originalLegacyFrames, 1)
assert.equal(domain.raw571.normalizedOnlyInMemoryFrames, 2)
assert.equal(domain.raw571.normalizedSkippedTail, 0)
assert.equal(domain.raw571.reforgeCurrentFrames, 1)
assert.equal(domain.raw571.reforgeMemoryCandidateFrames, 2)
const priorPacked = fs.readFileSync(
  path.join(root, path.dirname(report.previousRle.review), priorRle.receipts.path),
)
assert.equal(hash(priorPacked), priorRle.receipts.sha256)
const priorNativeMember = JSON.parse(zlib.gunzipSync(priorPacked)).members.find(
  (m) => m.name === 'native571.json',
)
assert(priorNativeMember)
const priorNativeBytes = Buffer.from(priorNativeMember.base64, 'base64')
assert.equal(hash(priorNativeBytes), priorNativeMember.sha256)
const originalCFrames = JSON.parse(priorNativeBytes).native.frames
assert.deepEqual(
  domain.raw571.frames,
  originalCFrames.map(({ width, height, pixelsSha256, opaqueSha256 }) => ({
    width,
    height,
    pixelsSha256,
    opaqueSha256,
  })),
)
assert.equal(hash(fs.readFileSync(path.join(root, 'data/raw/MGO.MKF'))), domain.raw571.sourceHash)
assert.equal(
  hash(fs.readFileSync(path.join(root, 'data/extracted/data/sprite/571.rle'))),
  domain.raw571.blobHash,
)
const statics = JSON.parse(fs.readFileSync(path.join(here, 'static.json')))
assert.equal(statics.state, 'complete')
const staticBytes = fs.readFileSync(path.join(here, statics.archive.path))
assert.equal(hash(staticBytes), statics.archive.sha256)
const raw = new Map(
  JSON.parse(zlib.gunzipSync(staticBytes)).members.map((m) => {
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
const lintJobs = statics.gates.filter((id) => {
  const e = JSON.parse(raw.get(`${id}.execution.json`))
  return (
    e.command === 'node' && e.args.length === 1 && e.args[0] === 'scripts/quality/lint-zero.mjs'
  )
})
assert.equal(lintJobs.length, 1, 'Exactly one actual lint-zero command is required')
assert(
  raw
    .get(`${lintJobs[0]}.stdout.raw`)
    .toString()
    .includes('0 errors / 0 warnings / 0 infos; complete report'),
)
for (const p of statics.inputs)
  assert.equal(hash(fs.readFileSync(path.join(root, p.path))), p.sha256, `STALE static ${p.path}`)
console.log(
  'PASS:Q1b whole-file A–H with119 unchanged statements/84 assertion ASTs,1→9 mapped contracts/shuffle/78adjacent/TC0;four engineering scopes reused unchanged. Native offset-domain counter and actual Reforge input preserved. CODE1 format/3m/42 remain open;no unified gates.',
)
