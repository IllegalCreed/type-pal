import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '../../../../..')
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const report = JSON.parse(fs.readFileSync(path.join(here, 'observation.json')))
const archive = fs.readFileSync(path.join(here, report.native.path))
assert.equal(hash(archive), report.native.sha256)
const packed = JSON.parse(gunzipSync(archive))
assert.deepEqual(Object.keys(packed.members).sort(), Object.keys(report.native.members).sort())
for (const [name, pin] of Object.entries(report.native.members)) {
  const value = packed.members[name]
  assert.equal(value.encoding, 'base64', name)
  const bytes = Buffer.from(value.data, 'base64')
  assert.equal(bytes.length, pin.bytes, name)
  assert.equal(hash(bytes), pin.sha256, name)
}
for (const pin of report.sources) {
  const frozen = execFileSync('git', ['show', `${report.base}:${pin.path}`], {
    cwd: root,
    maxBuffer: 2 * 1024 * 1024,
  })
  assert.equal(hash(frozen), pin.sha256, `observation baseline: ${pin.path}`)
}
assert.equal(report.runs.length, 4)
for (const run of report.runs) {
  assert.equal(run.ready.parserAccepted, true)
  assert.equal(run.ready.memorySlotRoundtrip, true)
  assert.equal(run.ready.actualStartBattle, true)
  assert.equal(run.ready.table99, 32000)
  if (run.id.endsWith('-word')) {
    assert.equal(run.timedOutAfterReady, false)
    assert.equal(run.done.remainder, 1535)
    assert.equal(run.exit, 0)
  } else {
    assert.equal(run.timedOutAfterReady, true)
    assert.equal(run.done, null)
    assert.equal(run.ready.amount, Number.MAX_VALUE)
    assert.equal(run.ready.nonprogress, true)
  }
}
const local = JSON.parse(fs.readFileSync(path.join(here, 'review.json')))
const localBytes = fs.readFileSync(path.join(here, local.native.path))
assert.equal(hash(localBytes), local.native.sha256)
const localArchive = JSON.parse(gunzipSync(localBytes))
assert.deepEqual(Object.keys(localArchive.members).sort(), Object.keys(local.native.members).sort())
for (const [name, pin] of Object.entries(local.native.members)) {
  const member = localArchive.members[name]
  assert.equal(member.encoding, 'base64', name)
  const bytes = Buffer.from(member.data, 'base64')
  assert.equal(bytes.length, pin.bytes, name)
  assert.equal(hash(bytes), pin.sha256, name)
}
for (const pin of local.pins) {
  assert.equal(hash(fs.readFileSync(path.join(root, pin.path))), pin.sha256, pin.path)
}
const native = (id) =>
  JSON.parse(Buffer.from(localArchive.members[`${id}.native.json`].data, 'base64'))
const red = native('exp-domain-red')
assert.equal(red.numFailedTests, 1)
assert.equal(red.numPassedTests, 28)
assert.deepEqual(
  red.testResults.flatMap((file) =>
    file.assertionResults.filter((test) => test.status === 'failed').map((test) => test.fullName),
  ),
  local.outcomes.red.failedFullName,
)
for (const [id, count, files] of [
  ['exp-domain-adjacent', 66, 6],
  ['progression-final', 16, 2],
]) {
  const run = native(id)
  assert.equal(run.numPassedTests, count, id)
  assert.equal(run.numFailedTests, 0, id)
  assert.equal(run.testResults.length, files, id)
  assert.equal(run.numPendingTests, 0, id)
  assert.equal(localArchive.members[`${id}.stderr.raw`].data, '', id)
}
function bundle(folder, name) {
  const receipt = JSON.parse(fs.readFileSync(path.join(folder, name)))
  const compressed = fs.readFileSync(path.join(folder, receipt.native.path))
  assert.equal(hash(compressed), receipt.native.sha256, name)
  const content = JSON.parse(gunzipSync(compressed))
  assert.deepEqual(Object.keys(content.members).sort(), Object.keys(receipt.native.members).sort())
  for (const [member, pin] of Object.entries(receipt.native.members)) {
    assert.equal(content.members[member].encoding, 'base64', member)
    const bytes = Buffer.from(content.members[member].data, 'base64')
    assert.equal(bytes.length, pin.bytes, member)
    assert.equal(hash(bytes), pin.sha256, member)
  }
  return {
    receipt,
    read: (member) => Buffer.from(content.members[member].data, 'base64').toString('utf8'),
  }
}
const role = bundle(path.dirname(here), 'game-item-role-context-review.json')
for (const pin of role.receipt.sources) {
  assert.equal(hash(fs.readFileSync(path.join(root, pin.path))), pin.sha256, pin.path)
}
const itemGreen = JSON.parse(role.read('item-context-green-r2.native.json'))
assert.equal(itemGreen.numPassedTests, 289)
assert.equal(itemGreen.numFailedTests, 0)
assert.equal(role.read('item-context-green-r2.stderr.raw'), '')
const itemCases = itemGreen.testResults.find((file) =>
  file.name.endsWith('/actions/item-poison-boundary.test.ts'),
).assertionResults
assert.equal(itemCases.length, 8)
assert.equal(new Set(itemCases.map((test) => test.fullName)).size, 8)
const itemRed = JSON.parse(role.read('item-context-red.native.json'))
assert.equal(itemRed.numPassedTests, 4)
assert.equal(itemRed.numFailedTests, 4)
const contextOnly = JSON.parse(role.read('item-context-only.native.json'))
assert.equal(contextOnly.numPassedTests, 7)
assert.equal(contextOnly.numFailedTests, 1)
assert.equal(JSON.parse(role.read('final-game-check.execution.json')).exit, 2)
assert.match(role.read('final-game-check.stdout.raw'), /error TS2552/)
const gates = bundle(here, 'gates.json')
for (const pin of gates.receipt.sourceBindings) {
  assert.equal(hash(fs.readFileSync(path.join(root, pin.path))), pin.sha256, pin.path)
}
for (const run of gates.receipt.gateRuns) {
  assert.equal(run.exit, 0, run.id)
  assert.equal(run.stderr.bytes, 0, run.id)
}
for (const id of ['exp-progression-window-check', 'final-game-check-r2', 'exp-item-window-fast']) {
  const diagnosis = JSON.parse(gates.read(`${id}.diagnostics.json`))
  assert(
    Object.values(diagnosis.diagnostics).every((count) => count === 0),
    id,
  )
}
assert.equal(gates.receipt.coverage.actualCollections, 1)
const protectedProof = JSON.parse(gates.read('protected-proof.json'))
assert.equal(protectedProof.testCount, 20040)
assert.equal(protectedProof.sourceFileCount, 758)
assert.deepEqual(protectedProof.strictAgainstFinalBaseline.regressions, [])
assert.deepEqual(protectedProof.strictScope.changes, [])
assert.deepEqual(protectedProof.rawAgainstMain.regressions, [])
assert.deepEqual(protectedProof.protectedScope.removals, [])
if (gates.receipt.pendingRuns.length === 0) {
  assert.deepEqual(JSON.parse(gates.read('final-progress-native.stdout.raw')).issues, [])
  assert.match(
    gates.read('final-ledger-r2.stdout.raw'),
    /3355 files; 374 closed \/ 112 review \/ 2869 pending/,
  )
}
console.log(
  JSON.stringify({
    observationBaselineBindings: report.sources.length,
    currentSourceBindings: local.pins.length,
    wordControlsComplete: 2,
    largeInputsDidNotComplete: 2,
    policy: local.approval.policy,
    currentStatus: local.status,
    formalRed: '28 passed / 1 business test failed',
    adjacent: '66 passed / 6 files; post-refactor16 passed /2 files',
    item: '4 old passed /4 new failed ->7 passed /1 projection failed ->8 passed;289 adjacent',
    wholeCheck: 'Actual20434 plus affected game TC/full3724 refresh; no second full check claim',
    official: 'One20040/758 collection; strict/protected0regressions',
    finalStaticsPending: gates.receipt.pendingRuns,
    limits:
      'Read-only frozen observation and current local evidence integrity. No tests, writes or automatic acceptance promotion.',
  }),
)
