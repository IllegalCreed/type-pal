import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'

const root = fileURLToPath(new URL('../../../../../', import.meta.url))
const local = (name) => new URL(name, import.meta.url)
const hash = (value) => createHash('sha256').update(value).digest('hex')
const json = (name) => JSON.parse(readFileSync(local(name), 'utf8'))
function stale(message) {
  const error = new Error(`STALE: ${message}`)
  error.code = 'STALE'
  throw error
}
function verify() {
  assert.equal(process.argv.length, 2, 'default verification is read only; no arguments')
  const review = json('review.json')
  const changed = execFileSync(
    'git',
    [
      'diff',
      '--name-only',
      review.sourceCommit,
      '--',
      'packages',
      'scripts',
      'package.json',
      'pnpm-lock.yaml',
      'pnpm-workspace.yaml',
      '.github/workflows',
    ],
    { cwd: root, encoding: 'utf8' },
  ).trim()
  if (changed) stale(`source/gate inputs changed: ${changed}`)
  const untracked = execFileSync(
    'git',
    ['ls-files', '--others', '--exclude-standard', '--', 'packages', 'scripts'],
    { cwd: root, encoding: 'utf8' },
  ).trim()
  if (untracked) stale(`untracked source/gate inputs: ${untracked}`)
  for (const file of [...review.files, ...review.contextPins]) {
    assert(!file.path.includes('..') && !file.path.startsWith('/'))
    if (hash(readFileSync(new URL(file.path, `file://${root}`))) !== file.sha256) stale(file.path)
    if (file.dimensions) assert.deepEqual(Object.keys(file.dimensions).sort(), [...'ABCDEFGH'])
  }
  const bytes = readFileSync(local(review.artifact.member))
  assert.equal(hash(bytes), review.artifact.sha256)
  const members = JSON.parse(gunzipSync(bytes)).members
  assert.deepEqual(Object.keys(members).sort(), review.artifact.members.map((m) => m.name).sort())
  for (const item of review.artifact.members) {
    assert.equal(hash(members[item.name]), item.sha256)
    assert.equal(Buffer.byteLength(members[item.name]), item.bytes)
  }
  const from = (name) => JSON.parse(members[name])
  const assertions = (id) =>
    from(`${id}.native.json`).testResults.flatMap((f) => f.assertionResults)
  for (const expected of review.runs) {
    const execution = from(`${expected.id}.execution.json`)
    assert.equal(execution.exit, expected.exit, expected.id)
    assert.equal(execution.signal, null)
    assert.equal(execution.spawnError, null)
    for (const stream of ['stdout', 'stderr']) {
      assert.equal(hash(members[execution[stream].member]), execution[stream].sha256)
      assert.equal(Buffer.byteLength(members[execution[stream].member]), execution[stream].bytes)
    }
    if (expected.exit === 0) assert.equal(execution.stderr.bytes, 0)
    if (expected.passed === undefined) continue
    const native = from(`${expected.id}.native.json`)
    assert.equal(native.numPassedTests, expected.passed)
    assert.equal(native.numFailedTests, expected.failed)
    assert.equal(native.numPendingTests, 0)
    if (expected.exit === 0) assert.equal(execution.stderr.bytes, 0)
  }
  const red = assertions('approved-red').filter((t) => t.status === 'failed')
  assert.deepEqual(
    red.map((t) => t.fullName),
    review.failedIdentities,
  )
  assert(red.every((t) => t.failureMessages.every((m) => /AssertionError/.test(m))))
  const restored = assertions('module-recovery')
  assert(
    review.failedIdentities.every((name) =>
      restored.some((t) => t.fullName === name && t.status === 'passed'),
    ),
  )
  const pure = from('refactor-proof.json')
  assert(
    pure.oldBodiesEqualAfterVisitedAlphaRename &&
      pure.newBodyEqualsEitherFixedOldBody &&
      pure.remainingEmittedJavaScriptIdentical,
  )
  assert.equal(pure.newLoopCount, 1)
  assert.equal(pure.newSource, review.files[0].sha256)
  const raw = from('raw-impact.json')
  assert(raw.exactRecompile && raw.beforeAfterRefactorExact && raw.labelInstrumentationOutputEqual)
  assert.equal(raw.newUnionSize - raw.oldUnionSize, 301)
  assert.equal(raw.removedIps.length, 0)
  assert.equal(raw.sites.length, 17)
  assert.equal(review.newClosures, 0)
  console.log(
    'LOCAL MATCH: six business reds restored; full module452 green; pure traversal proof and raw impact match. Unified gates remain pending; no new file acceptance.',
  )
}
try {
  verify()
} catch (error) {
  console.error(error.message)
  process.exitCode = error.code === 'STALE' ? 2 : 1
}
