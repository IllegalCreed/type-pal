import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'

const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim()
const dir = dirname(fileURLToPath(import.meta.url))
const hash = (data) => createHash('sha256').update(data).digest('hex')
const read = (path) => readFileSync(resolve(root, path))
const json = (name) => JSON.parse(readFileSync(resolve(dir, name)))
const receipt = json('present-leaves-local.json')
assert(process.argv.length === 2 || process.argv.slice(2).join(' ') === '--local')

for (const file of [...receipt.files, ...receipt.bindings]) {
  assert.equal(hash(read(file.path)), file.sha256, `STALE: ${file.path}; inspect this delta`)
}
assert.equal(receipt.files.length, 17)
for (const file of receipt.files) {
  for (const axis of 'ABCDEFGH') assert(file.dimensions[axis], `${file.path}/${axis}`)
}

function unpack(artifact) {
  const data = read(artifact.path)
  assert.equal(hash(data), artifact.sha256, artifact.path)
  const { members } = JSON.parse(gunzipSync(data))
  assert.equal(Object.keys(members).length, artifact.members.length)
  for (const entry of artifact.members) {
    assert.equal(Buffer.byteLength(members[entry.name]), entry.bytes, entry.name)
    assert.equal(hash(members[entry.name]), entry.sha256, entry.name)
  }
  return members
}

function run(members, id, exit) {
  const execution = JSON.parse(members[`${id}.execution.json`])
  assert.equal(execution.exit, exit, id)
  assert.equal(execution.signal, null, id)
  assert.equal(execution.spawnError, null, id)
  for (const stream of [execution.stdout, execution.stderr]) {
    assert.equal(Buffer.byteLength(members[stream.member]), stream.bytes, id)
    assert.equal(hash(members[stream.member]), stream.sha256, id)
  }
  return execution
}

function tests(members, id, passed, failed) {
  run(members, id, failed ? 1 : 0)
  const result = JSON.parse(members[`${id}.native.json`])
  assert.equal(result.numPassedTests, passed, id)
  assert.equal(result.numFailedTests, failed, id)
  assert.equal(result.numPendingTests, 0, id)
  const failures = result.testResults.flatMap((file) =>
    file.assertionResults.filter((test) => test.status === 'failed'),
  )
  assert.equal(failures.length, failed, id)
  for (const test of failures) {
    assert(
      test.failureMessages.some((message) => message.includes('AssertionError')),
      id,
    )
  }
  return result
}

const originals = unpack(receipt.nativeArtifact)
tests(originals, 'leaves-baseline', 89, 0)
const final = tests(originals, 'leaves-final', 365, 0)
assert.equal(run(originals, 'leaves-final', 0).stderr.bytes, 0)
for (const pair of receipt.counters) {
  tests(originals, pair.old.id, pair.old.passed, 0)
  const result = tests(originals, pair.new.id, pair.new.passed, 1)
  const names = result.testResults.flatMap((file) =>
    file.assertionResults.filter((test) => test.status === 'failed').map((test) => test.fullName),
  )
  assert.deepEqual(names, [pair.new.failure])
}
const snapshot = run(originals, 'leaves-final', 0)
for (const file of receipt.files) {
  const changed = snapshot.codeChanges.find((entry) => entry.path === file.path)
  const sha =
    changed?.sha256 ?? hash(execFileSync('git', ['show', `${snapshot.head}:${file.path}`]))
  assert.equal(sha, file.sha256, `final run input: ${file.path}`)
  assert(
    final.testResults.some((result) => result.name === resolve(root, file.path)) ||
      !file.path.endsWith('.test.ts'),
  )
}

// The archived, reviewed producer only reads Git/current code and prints its result.
// Replace its temporary input location with this receipt; no extraction or file writes.
const prefix = "const out=__dirname,w=JSON.parse(fs.readFileSync(out+'/window.json')),root=w.root"
const producer = originals['prove-leaves.cjs']
assert.equal(producer.split(prefix).length, 2)
const input = {
  base: receipt.base,
  root,
  products: receipt.files
    .filter((file) => !file.path.endsWith('.test.ts'))
    .map((file) => file.path),
}
const proof = JSON.parse(
  execFileSync(
    process.execPath,
    ['-e', producer.replace(prefix, `const w=${JSON.stringify(input)},root=w.root`)],
    { cwd: root, encoding: 'utf8' },
  ),
)
assert.equal(proof.files.length, 5)
assert(proof.files.every((file) => file.programMatch))
const recount = json('present-leaves-recount.json')
assert.equal(hash(read(receipt.coverageAdjustment.path)), receipt.coverageAdjustment.sha256)
const recountProof = JSON.parse(
  execFileSync(process.execPath, ['-e', originals['prove-leaves-recount.cjs']], {
    cwd: root,
    encoding: 'utf8',
  }),
)
assert.equal(recountProof.programMatch, true)
assert.equal(recountProof.sourcePins, 19)
assert.equal(recountProof.afterSha256, recount.programInvariance.afterSha256)
assert.equal(run(originals, 'leaves-normalizer', 0).stderr.bytes, 0)
const normalized = JSON.parse(originals['leaves-normalizer.stdout.raw'])
assert.deepEqual(normalized.applied, [recount.approval.id])
assert.equal(normalized.sourceDriftRejected, true)
assert.equal(normalized.originalBaselineUnchanged, true)
assert.equal(hash(read(receipt.shellEvidence.path)), receipt.shellEvidence.sha256)
const shell = json('present-shell-readonly.json')
assert.equal(shell.files.length, 4)
for (const file of [...shell.files, ...shell.bindings]) {
  assert.equal(hash(read(file.path)), file.sha256, file.path)
  if (file.dimensions) for (const axis of 'ABCDEFGH') assert(file.dimensions[axis], file.path)
}
for (const asset of shell.evidenceAssets) {
  const data = read(asset.path)
  assert.equal(hash(data), asset.sha256, asset.path)
  if (asset.expandedSha256) assert.equal(hash(gunzipSync(data)), asset.expandedSha256)
}
for (const native of shell.nativeRuns) {
  const result = JSON.parse(gunzipSync(read(native.path)))
  assert.equal(result.numPassedTests, native.passed, native.path)
  assert.equal(result.numFailedTests, native.failed, native.path)
  assert.equal(result.numPendingTests, 0, native.path)
  for (const test of result.testResults.flatMap((file) =>
    file.assertionResults.filter((test) => test.status === 'failed'),
  )) {
    assert(
      test.failureMessages.some((message) => message.includes('AssertionError')),
      native.path,
    )
  }
}

if (process.argv.includes('--local')) {
  console.log(
    'LOCAL MATCH: 17 changed-file reviews plus4 read-only scopes, 365 restored tests, six counters and same-byte reused native evidence; no uniform-gate acceptance',
  )
} else if (!existsSync(resolve(dir, 'present-leaves-gates.json'))) {
  console.log('INCOMPLETE: local evidence matches; current unified gates are not recorded')
  process.exitCode = 2
} else {
  const gate = json('present-leaves-gates.json')
  assert.equal(gate.status, 'accepted')
  const members = unpack(gate.artifact)
  const changedPaths = execFileSync(
    'git',
    ['diff', '--name-only', receipt.base, '--', 'packages', 'scripts'],
    { encoding: 'utf8' },
  )
    .trim()
    .split('\n')
    .filter(Boolean)
    .sort()
  assert.deepEqual(changedPaths, gate.sourceBindings.map((file) => file.path).sort())
  assert.equal(
    execFileSync(
      'git',
      ['ls-files', '--others', '--exclude-standard', '--', 'packages', 'scripts'],
      { encoding: 'utf8' },
    ).trim(),
    '',
  )
  for (const file of gate.sourceBindings)
    assert.equal(hash(read(file.path)), file.sha256, file.path)
  for (const entry of gate.runs) {
    const execution = run(members, entry.id, 0)
    assert.equal(execution.stderr.bytes, 0, entry.id)
    assert(
      Object.values(entry.diagnostics).every((count) => count === 0),
      entry.id,
    )
    for (const file of gate.sourceBindings) {
      if (file.path === 'scripts/coverage/baseline.fast.json') continue
      const changed = execution.codeChanges.find((change) => change.path === file.path)
      const sha =
        changed?.sha256 ?? hash(execFileSync('git', ['show', `${execution.head}:${file.path}`]))
      assert.equal(sha, file.sha256, `${entry.id}: ${file.path}`)
    }
  }
  for (const role of ['check', 'ratchet', 'protected', 'docs', 'lint', 'ledger', 'diff']) {
    assert(
      gate.runs.some((run) => run.role === role),
      role,
    )
  }
  const baseline = JSON.parse(read('scripts/coverage/baseline.fast.json'))
  const measured = JSON.parse(
    members[`${gate.runs.find((run) => run.role === 'ratchet').id}.coverage-summary.json`],
  )
  assert.deepEqual(baseline.total, measured.total)
  assert.equal(baseline.sourceFileCount, measured.sourceFileCount)
  assert.equal(baseline.testCount, measured.testCount)
  for (const [id, pkg] of Object.entries(baseline.packages)) {
    assert.deepEqual(pkg.metrics, measured.packages[id].metrics, id)
    assert.equal(pkg.scopeDigest, measured.packages[id].scopeDigest, id)
    assert.deepEqual(pkg.fastTests.fileEntries, measured.packages[id].fastTests.fileEntries, id)
  }
  const queue = json('all-cards.json')
  for (const id of receipt.cards.map((card) => card.id))
    assert(queue.cards.some((card) => card.id === id && card.currentAcceptance))
  console.log(
    'MATCH: seven original card scopes and complete zero-diagnostic module gates; read-only, no test/coverage rerun',
  )
}
