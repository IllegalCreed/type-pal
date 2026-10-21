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
function verifyIoWindow(parent) {
  if (!parent.ioWindow) return false
  const reference = local(parent.ioWindow.path)
  const bytes = readFileSync(reference)
  assert.equal(hash(bytes), parent.ioWindow.sha256)
  const io = JSON.parse(bytes)
  for (const file of [...io.files, ...io.contextPins]) {
    assert(!file.path.includes('..') && !file.path.startsWith('/'))
    if (hash(readFileSync(new URL(file.path, `file://${root}`))) !== file.sha256) stale(file.path)
    if (file.dimensions) assert.deepEqual(Object.keys(file.dimensions).sort(), [...'ABCDEFGH'])
  }
  const archive = readFileSync(new URL(io.artifact.member, reference))
  assert.equal(hash(archive), io.artifact.sha256)
  const members = JSON.parse(gunzipSync(archive)).members
  assert.deepEqual(Object.keys(members).sort(), io.artifact.members.map((m) => m.name).sort())
  for (const item of io.artifact.members) {
    assert.equal(hash(members[item.name]), item.sha256)
    assert.equal(Buffer.byteLength(members[item.name]), item.bytes)
  }
  const from = (name) => JSON.parse(members[name])
  const businessCounters = [
    'music-empty-strong-test',
    'boundary-errno-counter',
    'default-path-counter-restored',
  ]
  for (const expected of io.runs) {
    const run = from(`${expected.id}.execution.json`)
    assert.equal(run.exit, expected.exit, expected.id)
    assert.equal(run.signal, null)
    assert.equal(run.spawnError, null)
    if (expected.passed === undefined) continue
    const native = from(`${expected.id}.native.json`)
    assert.equal(native.numPassedTests, expected.passed)
    assert.equal(native.numFailedTests, expected.failed)
    assert.equal(native.numPendingTests, 0)
    const failed = native.testResults
      .flatMap((f) => f.assertionResults)
      .filter((t) => t.status === 'failed')
    assert.deepEqual(
      failed.map((t) => t.fullName),
      expected.failedNames,
    )
    if (businessCounters.includes(expected.id)) {
      assert.equal(failed.length, 1)
      assert(failed.every((t) => t.failureMessages.every((m) => /AssertionError/.test(m))))
    }
  }
  const proof = from('move-proof-frozen.json')
  assert(
    proof.writerBodiesExact &&
      proof.musicBodyExactAfterRootAlphaRename &&
      proof.remainingCliBodyExact,
  )
  assert.equal(proof.beforeSha256, parent.ioWindow.previousCliSha256)
  for (const file of io.files) {
    if (file.path.endsWith('/cli.ts')) assert.equal(file.sha256, proof.afterSha256)
    if (proof.moduleSha256[file.path]) assert.equal(file.sha256, proof.moduleSha256[file.path])
  }
  if (io.gateState !== 'passed') return false
  assert.equal(io.gates.length, 3)
  for (const id of io.gates) {
    assert.equal(from(`${id}.execution.json`).exit, 0)
    const diagnostics = from(`${id}.diagnostics.json`)
    assert.equal(diagnostics.exit, 0)
    assert(Object.values(diagnostics.diagnostics).every((value) => value === 0))
  }
  const ledger = readFileSync(
    new URL('docs/ops/audits/code-quality-file-ledger.md', `file://${root}`),
    'utf8',
  )
    .split('| 文件 | 类别 | 状态 | 证据 / 验证 | 备注 |')[1]
    .split('\n\n')[0]
  for (const path of io.acceptedAfterGates)
    assert(
      ledger
        .split('\n')
        .some((line) => line.startsWith(`| \`${path}\` |`) && line.includes('| 已验证 |')),
    )
  return true
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
  const ioPassed = verifyIoWindow(review)
  console.log(
    ioPassed
      ? 'MATCH: slice red/recovery and IO scope/proofs/native counters match; three unified gates zero diagnostics. Only named IO file scopes accepted; CODE3/P3 remain open.'
      : 'LOCAL MATCH: slice/IO source, proofs and native counter records match. Unified gates remain pending; no new file acceptance.',
  )
}
try {
  verify()
} catch (error) {
  console.error(error.message)
  process.exitCode = error.code === 'STALE' ? 2 : 1
}
