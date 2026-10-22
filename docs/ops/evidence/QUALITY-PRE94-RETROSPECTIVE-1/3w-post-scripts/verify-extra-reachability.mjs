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
const playerFixPath = resolve(folder, 'post-player-state-fix.json')
const playerFix = JSON.parse(readFileSync(playerFixPath, 'utf8'))
const roleFix = JSON.parse(readFileSync(resolve(folder, 'role-context-fix.json'), 'utf8'))
const atRoleBase = (path) =>
  path.startsWith('data/')
    ? read(path)
    : execFileSync('git', ['show', `${roleFix.base}:${path}`], { cwd: root })

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
  // The successor has two additional approved paths. Verify each revision's exact delta,
  // rather than letting a historical receipt silently accept arbitrary newer source.
  assert.deepEqual(
    git('diff', '--name-only', receipt.base, playerFix.base, '--', ...paths)
      .split('\n')
      .filter(Boolean)
      .sort(),
    [...fix.changedSourcePaths].sort(),
  )
  assert.deepEqual(actualPaths, [...fix.changedSourcePaths, ...playerFix.changedSourcePaths].sort())
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
const playerCounter = JSON.parse(read(playerFix.counter))
const counterMembers = readArchive(playerCounter.artifact)
const playerMembers = readArchive(playerFix.artifact)
for (const pin of playerCounter.pins) {
  const historical = pin.path.startsWith('data/')
    ? read(pin.path)
    : execFileSync('git', ['show', `${playerCounter.base}:${pin.path}`], { cwd: root })
  assert.equal(hash(historical), pin.sha256, `STALE counter ${pin.path}`)
}
for (const pin of playerFix.pins) {
  assert.equal(hash(atRoleBase(pin.path)), pin.sha256, `STALE player fix ${pin.path}`)
}
assert.deepEqual(
  git('diff', '--name-only', playerFix.base, '--', 'packages', 'scripts')
    .split('\n')
    .filter(Boolean)
    .sort(),
  [...playerFix.changedSourcePaths].sort(),
)
assert.equal(git('ls-files', '--others', '--exclude-standard', '--', 'packages', 'scripts'), '')
for (const run of [...playerCounter.runs, ...playerFix.runs]) {
  const native = playerCounter.runs.includes(run) ? counterMembers : playerMembers
  assert.deepEqual(JSON.parse(native[`${run.id}.execution.json`]), run)
  assert.equal(run.head, playerFix.base)
  assert.equal(run.signal, null)
  assert.equal(run.spawnError, null)
  assert.equal(run.observerTimeout, false)
  assert.equal(run.exit, run.id === 'post-context-red' ? 1 : 0)
  assert.equal(Buffer.byteLength(native[`${run.id}.stdout.raw`]), run.stdoutBytes)
  assert.equal(Buffer.byteLength(native[`${run.id}.stderr.raw`]), run.stderrBytes)
  if (run.id !== 'post-context-red') assert.equal(run.stderrBytes, 0)
}
for (const test of playerFix.tests) {
  const native = JSON.parse(playerMembers[`${test.id}.vitest.json`])
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
  const failures = native.testResults.flatMap((file) =>
    file.assertionResults.filter((item) => item.status === 'failed'),
  )
  assert.deepEqual(
    failures.map((item) => item.fullName),
    test.failedFullNames,
  )
  for (const failure of failures) assert.match(failure.failureMessages[0], /^AssertionError:/)
}
assert.equal(
  hash(atRoleBase(playerFix.changedSourcePaths[0])),
  hash(playerMembers['settlement-after.ts']),
)
assert.equal(
  hash(atRoleBase(playerFix.changedSourcePaths[1])),
  hash(playerMembers['settlement-test.red.ts']),
)
const before = JSON.parse(counterMembers['post-heal-actual.stdout.raw'])
const rolesOnly = JSON.parse(counterMembers['post-heal-roles-only.stdout.raw'])
const after = JSON.parse(playerMembers['post-heal-fixed.stdout.raw'])
assert.equal(before.final.runtimeHP, 394)
assert.equal(rolesOnly.final.liveHP, 500)
assert.equal(rolesOnly.final.runtimeHP, 394)
assert.equal(after.ticks, before.ticks)
assert.deepEqual(after.defeated, [true, true])
assert.deepEqual(after.final, {
  runtimeHP: 500,
  liveHP: 500,
  mode: 'explore',
  resourcesReleased: true,
})
assert.equal(after.observations[0].runtime, 289)
assert.ok(after.observations.every((item) => item.hasRoles))
assert.deepEqual(JSON.parse(playerMembers['c-state-run.stdout.raw']), {
  heals: [500, 30],
  mixed: [325, 23],
})
assert.equal(playerMembers['post-context-typecheck.stdout.raw'], '')
assert.match(
  playerMembers['local-lint.stdout.raw'],
  /0 errors \/ 0 warnings \/ 0 infos; complete report/,
)
assert.match(playerMembers['local-docs.stdout.raw'], /docs: PASS \(0 issues\)/)
assert.match(playerMembers['local-docs.stdout.raw'], /0 integrity issues; not full acceptance/)
assert.match(playerMembers['local-ledger.stdout.raw'], /372 closed \/ 115 review \/ 2869 pending/)
// The next approved caller repair has its own frozen before/after and valid-input red.
const roleMembers = readArchive(roleFix.artifact)
assert.deepEqual(
  git('diff', '--name-only', roleFix.base, '--', 'packages', 'scripts')
    .split('\n')
    .filter(Boolean)
    .sort(),
  [...roleFix.changedSourcePaths].sort(),
)
for (const pin of roleFix.pins) {
  assert.equal(hash(read(pin.path)), pin.sha256, `STALE role fix ${pin.path}`)
}
assert.equal(
  hash(atRoleBase(roleFix.changedSourcePaths[0])),
  hash(roleMembers['role-settlement.before.ts']),
)
assert.equal(
  hash(read(roleFix.changedSourcePaths[0])),
  hash(roleMembers['role-settlement.after.ts']),
)
assert.equal(
  hash(read(roleFix.changedSourcePaths[1])),
  hash(roleMembers['role-settlement-test.red-valid.ts']),
)
for (const run of roleFix.runs) {
  assert.deepEqual(JSON.parse(roleMembers[`${run.id}.execution.json`]), run)
  assert.equal(run.head, roleFix.base)
  assert.equal(run.exit, run.id.startsWith('role-context-red') ? 1 : 0)
  assert.equal(run.signal, null)
  assert.equal(run.spawnError, null)
  assert.equal(run.observerTimeout, false)
  assert.equal(Buffer.byteLength(roleMembers[`${run.id}.stdout.raw`]), run.stdoutBytes)
  assert.equal(Buffer.byteLength(roleMembers[`${run.id}.stderr.raw`]), run.stderrBytes)
  if (!run.id.startsWith('role-context-red')) assert.equal(run.stderrBytes, 0)
}
for (const test of roleFix.tests) {
  const native = JSON.parse(roleMembers[`${test.id}.vitest.json`])
  assert.equal(native.numPassedTests, test.passed)
  assert.equal(native.numFailedTests, test.failed)
  assert.equal(native.numPendingTests, 0)
  assert.equal(native.numTodoTests, 0)
  const identities = native.testResults.flatMap((file) =>
    file.assertionResults.map((item) => ({
      file: `packages/${file.name.split('/packages/')[1]}`,
      fullName: item.fullName,
      status: item.status,
    })),
  )
  assert.equal(hash(JSON.stringify(identities)), test.identitySetSha256)
  const failures = native.testResults.flatMap((file) =>
    file.assertionResults.filter((item) => item.status === 'failed'),
  )
  assert.deepEqual(
    failures.map((item) => item.fullName),
    test.failedFullNames,
  )
  for (const failure of failures) assert.match(failure.failureMessages[0], /^AssertionError:/)
}
assert.match(roleMembers['role-context-red-valid.stdout.raw'], /"sourceRestored":true/)
assert.equal(roleMembers['role-context-typecheck-final.stdout.raw'], '')
const legacy = JSON.parse(playerMembers['post-context-green.vitest.json'])
const current = JSON.parse(roleMembers['role-context-green-final.vitest.json'])
const keys = (native) =>
  native.testResults
    .flatMap((file) =>
      file.assertionResults.map((item) => `${file.name.split('/packages/')[1]}#${item.fullName}`),
    )
    .sort()
assert.deepEqual(
  keys(current).filter((key) => !key.endsWith(roleFix.newTestFullName)),
  keys(legacy),
)
assert.deepEqual(
  JSON.parse(roleMembers['post-order-after-role.stdout.raw']).firstDialog.inventory,
  [{ itemId: 104, count: 2 }],
)
console.log(
  'MATCH: frozen counters and approved Extra/HP-MP/default-role repairs; whole gates deferred; no file acceptance',
)
