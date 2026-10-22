import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'

// Receipt verification only: no replay, network request or file write.
const folder = dirname(fileURLToPath(import.meta.url))
const root = resolve(folder, '../../../../..')
const read = (path) => readFileSync(resolve(root, path))
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim()
const receipt = JSON.parse(readFileSync(resolve(folder, 'extra-reachability.json'), 'utf8'))
const fix = receipt.currentResolution ? JSON.parse(read(receipt.currentResolution)) : undefined

for (const source of receipt.sourceTrees) {
  const revision = fix ? receipt.base : 'HEAD'
  assert.equal(
    git('rev-parse', `${revision}:${source.path}`),
    source.gitTree,
    `STALE ${source.path}`,
  )
  if (!fix) assert.equal(git('diff', 'HEAD', '--', source.path), '', `MODIFIED ${source.path}`)
}
for (const pin of receipt.pins) {
  const bytes = read(pin.path)
  assert.equal(bytes.length, pin.bytes, pin.path)
  assert.equal(hash(bytes), pin.sha256, `STALE ${pin.path}`)
}
function readArchive(artifact) {
  const bytes = read(artifact.path)
  assert.equal(hash(bytes), artifact.sha256)
  const { members } = JSON.parse(gunzipSync(bytes))
  assert.deepEqual(Object.keys(members).sort(), artifact.members.map((m) => m.name).sort())
  for (const member of artifact.members) {
    assert.equal(Buffer.byteLength(members[member.name]), member.bytes, member.name)
    assert.equal(hash(members[member.name]), member.sha256, member.name)
  }
  return members
}
function verifyRuns(runs, members) {
  for (const run of runs) {
    assert.deepEqual(JSON.parse(members[`${run.id}.execution.json`]), run)
    assert.equal(run.head, receipt.base)
    assert.equal(run.exit, 0)
    assert.equal(run.signal, null)
    assert.equal(run.spawnError, null)
    assert.equal(run.observerTimeout, false)
    assert.equal(Buffer.byteLength(members[`${run.id}.stdout.raw`]), run.stdoutBytes)
    assert.equal(members[`${run.id}.stderr.raw`], '')
    assert.equal(run.stderrBytes, 0)
  }
}
const members = readArchive(receipt.artifact)
verifyRuns(receipt.runs, members)
const result = JSON.parse(members['imported-party-v2.stdout.raw'])
assert.deepEqual(result, receipt.observed)
assert.deepEqual(JSON.parse(members['imported-party-v1.stdout.raw']), result)
assert.deepEqual(result.before, { party: [0, 4], fighters: [0, 4], extra: 0 })
assert.deepEqual(result.afterScript.party, [0])
assert.deepEqual(result.afterScript.fighters, [0, 4])
assert.equal(result.afterScript.extra, 0)
assert.equal(result.afterItem.extra, 30)
assert.equal(result.afterItem.effective, 30)
assert.deepEqual(result.afterItem.inventory, [{ itemId: 84, count: 0 }])
assert.deepEqual(result.afterExit, {
  mode: 'explore',
  party: [0],
  extra: 30,
  effective: 30,
  exitTicks: 18,
  phase: 'fleed',
})
assert.equal(result.exportedExtra, 30)
assert.deepEqual(JSON.parse(members['graph-immediate.json']).battle.setParty, [])
const gates = JSON.parse(read(receipt.staticGateReceipt))
const gateMembers = readArchive(gates.artifact)
verifyRuns(gates.runs, gateMembers)
assert.match(gateMembers['docs-final.stdout.raw'], /# tests 125\b/)
assert.match(gateMembers['docs-final.stdout.raw'], /# fail 0\b/)
assert.match(gateMembers['docs-final.stdout.raw'], /0 integrity issues; not full acceptance/)
assert.match(
  gateMembers['lint-final.stdout.raw'],
  /0 errors \/ 0 warnings \/ 0 infos; complete report/,
)
if (fix) {
  const paths = receipt.sourceTrees.map((source) => source.path)
  const changed = git('diff', '--name-only', receipt.base, '--', ...paths)
  const untracked = git('ls-files', '--others', '--exclude-standard', '--', ...paths)
  const actualPaths = [...new Set(`${changed}\n${untracked}`.split('\n').filter(Boolean))].sort()
  assert.deepEqual(actualPaths, [...fix.changedSourcePaths].sort())
  for (const pin of fix.pins) assert.equal(hash(read(pin.path)), pin.sha256, `STALE ${pin.path}`)
  const current = readArchive(fix.artifact)
  assert.equal(hash(read(fix.changedSourcePaths[0])), hash(current['finalization-after.ts']))
  assert.equal(hash(read(fix.changedSourcePaths[1])), hash(current['extra-formal-tested.ts']))
  assert.equal(
    hash(
      execFileSync('git', ['show', `${receipt.base}:${fix.changedSourcePaths[0]}`], { cwd: root }),
    ),
    hash(current['finalization-before.ts']),
  )
  for (const run of fix.runs) {
    assert.deepEqual(JSON.parse(current[`${run.id}.execution.json`]), run)
    assert.equal(run.signal, null)
    assert.equal(run.spawnError, null)
    assert.equal(run.exit, run.id === 'extra-official-red' ? 1 : 0)
    assert.equal(Buffer.byteLength(current[`${run.id}.stdout.raw`]), run.stdoutBytes)
    assert.equal(Buffer.byteLength(current[`${run.id}.stderr.raw`]), run.stderrBytes)
    if (run.id !== 'extra-official-red') assert.equal(run.stderrBytes, 0)
  }
  for (const test of fix.tests) {
    const native = JSON.parse(current[`${test.id}.native.json`])
    assert.equal(native.numPassedTests, test.passed)
    assert.equal(native.numFailedTests, test.failed)
    assert.equal(native.numPendingTests, 0)
    const identities = native.testResults.flatMap((file) =>
      file.assertionResults.map((item) => ({
        file: `packages/${file.name.split('/packages/')[1]}`,
        fullName: item.fullName,
        status: item.status,
      })),
    )
    assert.deepEqual(identities, test.identities)
    if (test.id === 'extra-official-red') {
      assert.equal(test.failed, 1)
      assert.equal(test.passed, 0)
      assert.match(
        native.testResults[0].assertionResults[0].failureMessages[0],
        /^AssertionError: expected .*30/,
      )
    }
  }
}
console.log(
  'MATCH: frozen input counter and approved current cleanup fix; whole gates deferred; no file acceptance',
)
