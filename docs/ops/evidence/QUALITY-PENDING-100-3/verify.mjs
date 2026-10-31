import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { readBeforePolicy } from '../TESTING-EVIDENCE-REVISION-1/verify.mjs'
import { readNativeArchives } from './native-archives.mjs'
import { verifyCloseout } from './verify-closeout.mjs'
import { verifyCurrentOrganization } from './verify-current-organization.mjs'
import { verifyFixtureOrganization } from './verify-fixture-organization.mjs'
import { moduleFrozenInputs, verifyModuleOrganization } from './verify-module-organization.mjs'
import { verifyOrganization } from './verify-organization.mjs'
import { verifySharedOrganization } from './verify-shared-organization.mjs'

const folder = new URL('./', import.meta.url)
const root = new URL('../../../../', import.meta.url)
const json = (name) => JSON.parse(readFileSync(new URL(name, folder), 'utf8'))
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')
const review = json('review.json')
const { files: native, entries } = readNativeArchives(folder)
const index = { files: entries }
const currentOrganization = json('organization-current.json')
const movedSources = new Map(currentOrganization.inputs.map((x) => [x.path, x]))
// Old review/counter checkpoints retain old filenames and bytes. Current relocated
// files are checked directly by verifyCurrentOrganization, including all closures/results.
const readSourceAtRecordedBoundary = (path, encoding) => {
  if (!movedSources.has(path)) return readFileSync(new URL(path, root), encoding)
  assert.equal(existsSync(new URL(path, root)), false, `Duplicate retired path: ${path}`)
  const entry = movedSources.get(path),
    body = native[entry.member]
  assert.equal(sha(body), entry.sha256, path)
  return encoding ? body : Buffer.from(body, 'utf8')
}

const organization = json('organization.json')
const oldOrganizationPaths = new Set(
  organization.inputs.map((x) => `packages/migrate/src/${x.file}`),
)
// Deleted current paths are read only at their frozen checkpoint. The relocation verifier
// below connects all callbacks, contexts and helper bodies to the current files/results.
const organizationCheckpoint = (path) =>
  oldOrganizationPaths.has(path)
    ? native[`naming/${path.split('/').at(-1)}.before`]
    : readSourceAtRecordedBoundary(path, 'utf8')
assert.deepEqual(Object.keys(native).sort(), index.files.map((file) => file.name).sort())
for (const file of index.files) {
  const original = Buffer.from(native[file.name], 'utf8')
  assert.equal(original.length, file.bytes, file.name)
  assert.equal(sha(original), file.sha256, file.name)
}
// The live table may change. This window's historical fenced snapshot must not.
const archiveRepair = JSON.parse(native['organization-extract-scene-sprite/archive-repair.json'])
const ledger = readFileSync(new URL(archiveRepair.path, root), 'utf8')
const archiveStart = ledger.indexOf(archiveRepair.start)
const archiveEnd = ledger.indexOf(archiveRepair.end)
assert.ok(archiveStart >= 0 && archiveEnd > archiveStart)
const ledgerArchive = ledger.slice(archiveStart, archiveEnd + archiveRepair.end.length)
assert.equal(sha(native[archiveRepair.member]), archiveRepair.sha256)
assert.equal(ledgerArchive, native[archiveRepair.member], 'historical ledger snapshot changed')
for (const file of [...review.files, ...review.auxiliary]) {
  assert.equal(sha(readSourceAtRecordedBoundary(file.path)), file.sha256, file.path)
  assert.deepEqual(Object.keys(file.axes), [...'ABCDEFGH'], file.path)
}
for (const tool of review.toolDeltas ?? []) {
  assert.equal(sha(readFileSync(new URL(tool.path, root))), tool.sha256, tool.path)
  assert.deepEqual(Object.keys(tool.axes), [...'ABCDEFGH'], tool.path)
}
for (const dependency of review.dependencies) {
  assert.equal(
    sha(readSourceAtRecordedBoundary(dependency.path)),
    dependency.sha256,
    `stale dependency: ${dependency.path}`,
  )
}
for (const file of review.reopened ?? []) {
  assert.equal(sha(readSourceAtRecordedBoundary(file.path)), file.sha256, file.path)
  assert.equal(file.notCountedAsOriginalPending, true)
  assert.deepEqual(Object.keys(file.axes), [...'ABCDEFGH'], file.path)
}
for (const delta of review.documentDeltas) {
  assert.equal(sha(readSourceAtRecordedBoundary(delta.path)), delta.afterSha256, delta.path)
}
assert.equal(review.files.length, review.progress.originalPendingPrimariesRead)
assert.equal(
  review.files.filter((file) => !file.acceptance?.startsWith('blocked')).length,
  review.progress.originalPendingPrimariesCompleted,
)
assert.equal(
  review.progress.originalPendingPrimariesCompleted + review.progress.blockedPrimaries,
  review.files.length,
)
const result = (name) => JSON.parse(native[`${name}.native.json`])
const failures = (report) =>
  report.testResults
    .flatMap((file) => file.assertionResults)
    .filter((test) => test.status === 'failed')
for (const [name, passed] of [
  ['path-before', 9],
  ['path-after', 11],
  ['control-formal-green', 4],
  ['control-format-final', 4],
  ['control-neighbors', 89],
  ['baseline/before', 18],
  ['baseline/tests-reworked', 18],
  ['baseline/after', 18],
  ['baseline/neighbors', 160],
  ['baseline/final-directed', 18],
  ['baseline/domain-current-green', 10],
  ['baseline/current-neighbors', 170],
  ['plan/before', 20],
  ['plan/tests-reworked', 22],
  ['plan/after-neighbors', 99],
  ['plan/final-neighbors', 99],
  ['project-io/before', 21],
  ['project-io/tests-reworked', 24],
  ['project-io/current-neighbors', 77],
  ['project-io/final-neighbors', 73],
  ['write-plan/before', 18],
  ['write-plan/after', 24],
  ['write-plan/neighbors', 104],
  ['write-plan/final-neighbors', 104],
  ['transaction-core/before', 10],
  ['transaction-core/after', 20],
  ['transaction-core/neighbors', 114],
  ['transaction-core/final-neighbors', 114],
  ['transaction-remaining/before', 35],
  ['transaction-remaining/after', 34],
  ['transaction-remaining/neighbors', 113],
  ['plan-write-guard/before', 15],
  ['plan-write-guard/after-r2', 14],
  ['plan-write-guard/neighbors', 112],
]) {
  const report = result(name)
  assert.equal(report.numPassedTests, passed, name)
  assert.equal(report.numFailedTests, 0, name)
  assert.equal(report.numPendingTests, 0, name)
  const execution = JSON.parse(native[`${name}.execution.json`])
  assert.equal(execution.exit, 0, name)
  assert.equal(execution.signal, null, name)
  assert.equal(execution.spawnError, null, name)
  assert.equal(native[`${name}.stderr.raw`], '', name)
}
const red = result('control-formal-red')
assert.equal(red.numFailedTests, 4)
assert.equal(red.numPassedTests, 0)
assert.equal(red.numPendingTests, 0)
const redExecution = JSON.parse(native['control-formal-red.execution.json'])
assert.equal(redExecution.exit, 1)
assert.equal(redExecution.signal, null)
assert.equal(redExecution.spawnError, null)
assert.ok(failures(red).every((test) => test.failureMessages[0].startsWith('AssertionError:')))
const names = (report) =>
  report.testResults.flatMap((file) => file.assertionResults.map((t) => t.fullName))
assert.deepEqual(names(red), names(result('control-format-final')))
assert.equal(result('path-counter-old').numFailedTests, 0)
const counter = failures(result('path-counter-new'))
assert.equal(counter.length, 1)
assert.equal(
  counter[0].fullName,
  'inspects missing hierarchy and regular targets without creating or changing files',
)
assert.match(counter[0].failureMessages[0], /^AssertionError:/)
const restored = JSON.parse(native['path-counter.json'])
assert.equal(restored.restoration.sourceExact, true)
assert.equal(restored.restoration.candidateTestExact, true)
assert.equal(
  sha(readSourceAtRecordedBoundary('packages/migrate/src/migration-path.ts')),
  restored.sourceSha256,
)
assert.equal(
  sha(readSourceAtRecordedBoundary('packages/migrate/src/migration-path.test.ts')),
  restored.candidateTestSha256,
)
const before = Buffer.from(native['transaction-before.ts'])
const blob = createHash('sha1').update(`blob ${before.length}\0`).update(before).digest('hex')
assert.equal(blob, review.repair.beforeGitBlobSha1)
assert.equal(sha(before), review.repair.beforeSha256)
const bridge = JSON.parse(native['control-format-proof.json'])
const ts = createRequire(new URL('package.json', root))('typescript')
assert.equal(ts.version, bridge.typescript, 'format proof tool changed')
function syntaxTree(text) {
  const source = ts.createSourceFile(
    'test.ts',
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  )
  function visit(node) {
    const children = []
    ts.forEachChild(node, (child) => {
      children.push(visit(child))
    })
    return [node.kind, children.length ? children : node.getText(source)]
  }
  return JSON.stringify(visit(source))
}
const oldTest = native['control-formal-red.test.ts']
const currentTest = readSourceAtRecordedBoundary(review.auxiliary[0].path, 'utf8')
assert.equal(sha(oldTest), bridge.beforeSha256)
assert.equal(sha(currentTest), bridge.afterSha256)
assert.equal(sha(syntaxTree(oldTest)), bridge.beforeAstSha256)
assert.equal(sha(syntaxTree(currentTest)), bridge.afterAstSha256)
assert.equal(bridge.beforeAstSha256, bridge.afterAstSha256)
for (const name of ['baseline/formatter-map', 'baseline/formatter-stamps']) {
  const report = result(name)
  assert.equal(report.numFailedTests, 1, name)
  assert.equal(report.numPassedTests, 0, name)
  assert.equal(report.numPendingTests, 3, name)
  assert.match(failures(report)[0].failureMessages[0], /^AssertionError:/, name)
}
assert.equal(result('baseline/formatter-old').numPassedTests, 1)
assert.equal(result('baseline/formatter-old').numFailedTests, 0)
const formatterCounter = JSON.parse(native['baseline/formatter-counter.json'])
assert.equal(formatterCounter.restoration.sourceExact, true)
assert.equal(formatterCounter.restoration.candidateTestExact, true)
const mainSpec = readSourceAtRecordedBoundary(
  'packages/migrate/src/migration-baseline.test.ts',
  'utf8',
)
const counterSpec = native['baseline/counter-candidate.test.ts']
const ioCase = "  test('唯一 state v1"
assert.ok(mainSpec.includes(ioCase) && counterSpec.includes(ioCase))
assert.equal(
  mainSpec.slice(0, mainSpec.indexOf(ioCase)),
  counterSpec.slice(0, counterSpec.indexOf(ioCase)),
)
const structural = JSON.parse(native['baseline/structure-proof.json'])
const pureCheckpoint = native['baseline/baseline-refactored.ts']
assert.equal(
  sha(pureCheckpoint),
  structural.hashes.after,
  'frozen baseline pure-refactor checkpoint',
)
for (const [beforeName, currentName] of structural.wrappers.map((pair) => [
  pair.old,
  pair.current,
])) {
  const beforeSource = ts.createSourceFile(
    'before.ts',
    native['baseline/migration-baseline.ts.before'],
    ts.ScriptTarget.Latest,
    true,
  )
  const afterSource = ts.createSourceFile('after.ts', pureCheckpoint, ts.ScriptTarget.Latest, true)
  const oldFn = beforeSource.statements.find(
    (node) => ts.isFunctionDeclaration(node) && node.name.text === beforeName,
  )
  const newFn = afterSource.statements.find(
    (node) => ts.isFunctionDeclaration(node) && node.name.text === currentName,
  )
  assert.ok(oldFn && newFn)
  assert.equal(oldFn.body.getText(beforeSource), newFn.body.getText(afterSource))
}
const domainRepair = review.baselineDomainRepair
assert.equal(sha(pureCheckpoint), domainRepair.beforePureCheckpointSha256)
assert.equal(
  sha(readSourceAtRecordedBoundary('packages/migrate/src/migration-baseline.ts')),
  domainRepair.afterSha256,
)
assert.equal(
  sha(readSourceAtRecordedBoundary('packages/migrate/src/migration-baseline-paths.test.ts')),
  domainRepair.testSha256,
)
const domainReplay = JSON.parse(native['baseline/domain-current-replay.json'])
assert.equal(domainReplay.sourceRestoredExactly, true)
assert.equal(domainReplay.beforeSha256, domainRepair.beforePureCheckpointSha256)
assert.equal(domainReplay.candidateSha256, domainRepair.afterSha256)
assert.equal(domainReplay.testSha256, domainRepair.testSha256)
const domainRed = result(domainRepair.red)
assert.equal(domainRed.numFailedTests, 10)
assert.equal(domainRed.numPassedTests, 0)
assert.equal(domainRed.numPendingTests, 0)
assert.ok(
  failures(domainRed).every((test) => test.failureMessages[0].startsWith('AssertionError:')),
)
assert.deepEqual(names(domainRed), names(result(domainRepair.green)))
const domainRedExecution = JSON.parse(native[`${domainRepair.red}.execution.json`])
assert.equal(domainRedExecution.exit, 1)
assert.equal(domainRedExecution.signal, null)
assert.equal(domainRedExecution.spawnError, null)
const typecheck = JSON.parse(native['baseline/current-typecheck.execution.json'])
assert.equal(typecheck.exit, 0)
assert.equal(typecheck.signal, null)
assert.equal(typecheck.spawnError, null)
assert.equal(native['baseline/current-typecheck.stdout.raw'], '')
assert.equal(native['baseline/current-typecheck.stderr.raw'], '')
const traversal = JSON.parse(native['baseline/path-domain-observe.stdout.raw'])
assert.equal(traversal.error, null)
assert.equal(traversal.files[0][1].outsideOwned, 'sentinel')
assert.equal(JSON.parse(native['baseline/path-domain-contract.execution.json']).exit, 1)
assert.match(native['baseline/path-domain-contract.stderr.raw'], /AssertionError/)
const planProof = JSON.parse(native['plan/structure-proof.json'])
assert.equal(ts.version, planProof.typescript)
const planBefore = native['plan/migration-plan.ts.before']
const planAfter = readSourceAtRecordedBoundary(planProof.path, 'utf8')
assert.equal(sha(planBefore), planProof.beforeSha256)
assert.equal(sha(planAfter), planProof.afterSha256)
let expectedPlan = planBefore.replaceAll('canonicalSnapshot', 'copySnapshotIndexes')
for (const [from, to] of [
  ['  const normalized = target\n', ''],
  ['of normalized)', 'of target)'],
  ['!normalized.has(file)', '!target.has(file)'],
  ['    target: normalized,', '    target,'],
]) {
  assert.equal(expectedPlan.split(from).length, 2, from)
  expectedPlan = expectedPlan.replace(from, to)
}
const printCode = (text) =>
  ts
    .createPrinter({ removeComments: true })
    .printFile(ts.createSourceFile('plan.ts', text, ts.ScriptTarget.Latest, true))
assert.equal(printCode(expectedPlan), printCode(planAfter), 'allowlisted pure plan refactor')
const planCounter = JSON.parse(native['plan/counter-r2.json'])
assert.equal(planCounter.sourceSha256, planProof.beforeSha256)
assert.deepEqual(planCounter.restoration, { sourceExact: true, testExact: true })
const counterSpecFrozen = native['plan/counter-candidate.test.ts']
assert.equal(sha(counterSpecFrozen), planCounter.testSha256)
const planSpec = readSourceAtRecordedBoundary(
  'packages/migrate/src/migration-plan.glm-o.test.ts',
  'utf8',
)
assert.equal(
  counterSpecFrozen.slice(0, counterSpecFrozen.indexOf('describe(')),
  planSpec.slice(0, planSpec.indexOf('describe(')),
  'counter fixture/helper prelude unchanged',
)
function selectedTest(text, prefix) {
  const source = ts.createSourceFile('spec.ts', text, ts.ScriptTarget.Latest, true)
  const selected = []
  function visit(node) {
    if (
      ts.isCallExpression(node) &&
      node.expression.getText(source) === 'test' &&
      ts.isStringLiteral(node.arguments[0]) &&
      node.arguments[0].text.startsWith(prefix)
    )
      selected.push(node.getText(source))
    ts.forEachChild(node, visit)
  }
  visit(source)
  assert.equal(selected.length, 1, prefix)
  return selected[0]
}
for (const definition of planCounter.definitions) {
  assert.equal(
    selectedTest(counterSpecFrozen, definition.test),
    selectedTest(planSpec, definition.test),
    'selected counter body/identity unchanged',
  )
  const oldName = `plan/${definition.id}-r2-old`
  const newName = `plan/${definition.id}-r2-new`
  assert.equal(result(oldName).numPassedTests, 1)
  assert.equal(result(oldName).numFailedTests, 0)
  assert.equal(result(newName).numPassedTests, 0)
  assert.equal(result(newName).numFailedTests, 1)
  assert.equal(result(newName).numPendingTests, 11)
  assert.deepEqual(
    names(result(oldName)).filter((name) => name.includes(definition.test)),
    names(result(newName)).filter((name) => name.includes(definition.test)),
  )
  assert.match(failures(result(newName))[0].failureMessages[0], /^AssertionError:/)
  for (const [name, exit] of [
    [oldName, 0],
    [newName, 1],
  ]) {
    const execution = JSON.parse(native[`${name}.execution.json`])
    assert.equal(execution.exit, exit)
    assert.equal(execution.signal, null)
    assert.equal(execution.spawnError, null)
  }
}
const planOracle = JSON.parse(native['plan/hash-oracle.json'])
for (const entry of [...planOracle.map, planOracle.ordinary]) {
  assert.equal(sha(entry.canonicalBytes ?? entry.bytes), entry.sha256)
}
const mapped = review.testContractMapping.plan.identities
assert.deepEqual(mapped.map((entry) => entry.old).sort(), names(result('plan/before')).sort())
const finalNames = names(result('plan/final-neighbors'))
for (const entry of mapped)
  for (const target of entry.to) assert.ok(finalNames.includes(target), target)
const planTypecheck = JSON.parse(native['plan/final-typecheck.execution.json'])
assert.equal(planTypecheck.exit, 0)
assert.equal(planTypecheck.signal, null)
assert.equal(planTypecheck.spawnError, null)
assert.equal(native['plan/final-typecheck.stdout.raw'], '')
assert.equal(native['plan/final-typecheck.stderr.raw'], '')
const ioProof = JSON.parse(native['project-io/retirement-proof.json'])
const ioBefore = native['project-io/migration-project-io.ts.before']
const ioAfter = readSourceAtRecordedBoundary(ioProof.sourcePath, 'utf8')
assert.equal(sha(ioBefore), ioProof.beforeSha256)
assert.equal(sha(ioAfter), ioProof.afterSha256)
const cutoff = ioBefore.indexOf('\nfunction walkFiles')
assert.ok(cutoff > 0)
const expectedIO = ioBefore
  .slice(0, cutoff)
  .replace('existsSync, readdirSync, readFileSync', 'existsSync, readFileSync')
  .replace('isAbsolute, relative, resolve, sep', 'isAbsolute, resolve, sep')
assert.equal(printCode(expectedIO), printCode(ioAfter), 'exact approved IO retirement')
const ioCounter = JSON.parse(native['project-io/counter.json'])
assert.equal(ioCounter.sourceSha256, ioProof.beforeSha256)
assert.deepEqual(ioCounter.restoration, { sourceExact: true, testsExact: true })
for (const definition of ioCounter.definitions) {
  const checkpoint = native[`project-io/${definition.spec}.counter-candidate`]
  const current = readSourceAtRecordedBoundary(`packages/migrate/src/${definition.spec}`, 'utf8')
  assert.equal(selectedTest(checkpoint, definition.test), selectedTest(current, definition.test))
  assert.equal(
    checkpoint.slice(checkpoint.indexOf('const roots:'), checkpoint.indexOf('describe(')),
    current.slice(current.indexOf('const roots:'), current.indexOf('describe(')),
    'counter setup and helper bodies unchanged',
  )
  assert.equal(ioBefore.split(definition.from).length, 2)
  const mutant = ioBefore.replace(definition.from, definition.to)
  for (const [version, exit] of [
    ['old', 0],
    ['new', 1],
  ]) {
    const id = `${definition.id}-${version}`
    const report = ioCounter.reports.find((entry) => entry.id === id)
    const runName = `project-io/${id}`
    const execution = JSON.parse(native[`${runName}.execution.json`])
    assert.equal(execution.exit, exit)
    assert.equal(execution.signal, null)
    assert.equal(execution.spawnError, null)
    assert.equal(sha(mutant), report.mutantSha256)
    const spec = version === 'old' ? native[`project-io/${definition.spec}.before`] : checkpoint
    assert.equal(sha(spec), report.testSha256)
    const selected = result(runName)
      .testResults.flatMap((file) => file.assertionResults)
      .filter((test) => test.status === 'passed' || test.status === 'failed')
    assert.equal(selected.length, 1)
    assert.equal(selected[0].fullName, report.fullName)
    assert.equal(selected[0].status, version === 'old' ? 'passed' : 'failed')
    if (version === 'new') assert.match(selected[0].failureMessages[0], /^AssertionError:/)
  }
}
const ioMapping = review.testContractMapping.projectIO
assert.deepEqual(
  ioMapping.identities.map((entry) => entry.old).sort(),
  names(result('project-io/before')).sort(),
)
assert.deepEqual(
  ioMapping.identities
    .filter((entry) => !entry.to.length)
    .map((entry) => entry.old)
    .sort(),
  [...ioMapping.retired].sort(),
)
assert.equal(ioMapping.retired.length, 6)
const ioFinalNames = names(result('project-io/final-neighbors'))
for (const mapping of ioMapping.identities)
  for (const target of mapping.to) assert.ok(ioFinalNames.includes(target), target)
assert.equal(new Set(ioMapping.identities.flatMap((entry) => entry.to)).size, 20)
for (const target of ioMapping.writePlan.to) assert.ok(ioFinalNames.includes(target), target)
const ioTypecheck = JSON.parse(native['project-io/final-typecheck.execution.json'])
assert.equal(ioTypecheck.exit, 0)
assert.equal(ioTypecheck.signal, null)
assert.equal(ioTypecheck.spawnError, null)
assert.equal(native['project-io/final-typecheck.stdout.raw'], '')
assert.equal(native['project-io/final-typecheck.stderr.raw'], '')
const writePlanMapping = review.testContractMapping.writePlan
const identities = (report) =>
  report.testResults.flatMap((file) =>
    file.assertionResults.map((test) => ({
      file: file.name.split('/').at(-1),
      fullName: test.fullName,
    })),
  )
const sortedIdentities = (entries) => entries.map((entry) => JSON.stringify(entry)).sort()
assert.deepEqual(
  sortedIdentities(writePlanMapping.identities.map((entry) => entry.old)),
  sortedIdentities(identities(result('write-plan/before'))),
)
const mappedCurrent = writePlanMapping.identities.flatMap((entry) => entry.to)
assert.equal(new Set(sortedIdentities(mappedCurrent)).size, 22)
assert.equal(writePlanMapping.added.length, 2)
assert.equal(writePlanMapping.retired.length, 0)
const acceptedIdentities = sortedIdentities([...mappedCurrent, ...writePlanMapping.added])
assert.deepEqual(acceptedIdentities, sortedIdentities(identities(result('write-plan/after'))))
const finalWritePlanIdentities = sortedIdentities(identities(result('write-plan/final-neighbors')))
for (const identity of acceptedIdentities) assert.ok(finalWritePlanIdentities.includes(identity))
const writePlanProduction = JSON.parse(native['write-plan/production-unchanged.json'])
for (const entry of writePlanProduction.checked) {
  const frozen = native[`write-plan/${entry.path.split('/').at(-1)}.before`]
  assert.equal(sha(frozen), entry.sha256)
  assert.equal(sha(readSourceAtRecordedBoundary(entry.path)), entry.sha256)
}
const writePlanCounter = JSON.parse(native['write-plan/counters.json'])
assert.deepEqual(writePlanCounter.restoration, { sourcesExact: true, testsExact: true })
for (const definition of writePlanCounter.definitions) {
  const source = native[`write-plan/${definition.source}.before`]
  assert.equal(source.split(definition.from).length, 2)
  const mutant = source.replace(definition.from, definition.to)
  for (const [version, expectedExit] of [
    ['old', 0],
    ['new', 1],
  ]) {
    const id = `${definition.id}-${version}`
    const recorded = writePlanCounter.reports.find((entry) => entry.id === id)
    assert.equal(sha(source), recorded.sourceBeforeSha256)
    assert.equal(sha(mutant), recorded.mutantSha256)
    const spec =
      version === 'old'
        ? native[`write-plan/${definition.old}.before`]
        : native[`write-plan/${definition.current}.counter-candidate`]
    assert.equal(sha(spec), recorded.testSha256)
    const run = result(`write-plan/${id}`)
    assert.equal(
      run.numPassedTests,
      version === 'old' ? definition.oldPassed : definition.newPassed,
    )
    assert.equal(run.numFailedTests, version === 'old' ? 0 : 1)
    const failed = failures(run)
    assert.deepEqual(
      failed.map((test) => test.fullName),
      recorded.failedFullNames,
    )
    if (version === 'new') assert.match(failed[0].failureMessages[0], /^AssertionError:/)
    const execution = JSON.parse(native[`write-plan/${id}.execution.json`])
    assert.equal(execution.exit, expectedExit)
    assert.equal(execution.signal, null)
    assert.equal(execution.spawnError, null)
  }
}
const writePlanProbe = JSON.parse(native['write-plan/fixture-probe.json'])
assert.equal(writePlanProbe.restoredExactly, true)
assert.equal(
  sha(native['write-plan/migration-write-plan.glm-o.test.ts.before']),
  writePlanProbe.sourceTestSha256,
)
const probeFailures = failures(result('write-plan/old-fixture-exact-guard'))
assert.equal(probeFailures.length, 1)
assert.match(probeFailures[0].failureMessages[0], /^AssertionError:/)
assert.match(probeFailures[0].failureMessages[0], /write hash 无效/)
assert.equal(JSON.parse(native['write-plan/old-fixture-exact-guard.execution.json']).exit, 1)
// Only two non-counter cases gained stronger observations after the counter checkpoint.
for (const entry of JSON.parse(native['write-plan/final-tests.json'])) {
  const checkpoint = native[`write-plan/${entry.path.split('/').at(-1)}.counter-candidate`]
  const current = readSourceAtRecordedBoundary(entry.path, 'utf8')
  assert.equal(sha(current), entry.sha256)
  if (entry.path.endsWith('migration-transaction-ownership.test.ts')) {
    let expected = checkpoint
    for (const prefix of ['the shared valid journal seed', 'afterOperation observes applied']) {
      const from = selectedTest(checkpoint, prefix)
      assert.equal(expected.split(from).length, 2)
      expected = expected.replace(from, selectedTest(current, prefix))
    }
    assert.equal(printCode(expected), printCode(current))
    const linkPrefix = 'manifest 前置条件指向 symlink'
    assert.equal(selectedTest(checkpoint, linkPrefix), selectedTest(current, linkPrefix))
  } else assert.equal(checkpoint, current)
}
const writePlanTypecheck = JSON.parse(native['write-plan/final-typecheck.execution.json'])
assert.equal(writePlanTypecheck.exit, 0)
assert.equal(writePlanTypecheck.signal, null)
assert.equal(writePlanTypecheck.spawnError, null)
assert.equal(native['write-plan/final-typecheck.stdout.raw'], '')
assert.equal(native['write-plan/final-typecheck.stderr.raw'], '')
for (const id of ['docs', 'content-review', 'lint', 'ledger', 'diff', 'final-fetch']) {
  const execution = JSON.parse(native[`write-plan/${id}.execution.json`])
  assert.equal(execution.exit, 0, id)
  assert.equal(execution.signal, null, id)
  assert.equal(execution.spawnError, null, id)
  assert.equal(native[`write-plan/${id}.stderr.raw`], '', id)
}
assert.match(native['write-plan/docs.stdout.raw'], /PASS \(0 issues\)/)
assert.match(native['write-plan/content-review.stdout.raw'], /^content review: PASS/)
assert.match(native['write-plan/lint.stdout.raw'], /0 errors \/ 0 warnings \/ 0 infos/)
assert.match(native['write-plan/ledger.stdout.raw'], /795 closed \/ 24 review \/ 2649 pending/)
const transactionCoreMapping = review.testContractMapping.transactionCore
assert.deepEqual(
  sortedIdentities(transactionCoreMapping.identities.map((entry) => entry.old)),
  sortedIdentities(identities(result('transaction-core/before'))),
)
assert.equal(transactionCoreMapping.added.length, 0)
assert.equal(transactionCoreMapping.retired.length, 0)
const transactionCoreNames = [
  ...new Set(sortedIdentities(transactionCoreMapping.identities.flatMap((entry) => entry.to))),
]
assert.equal(transactionCoreNames.length, 20)
assert.deepEqual(
  transactionCoreNames.sort(),
  sortedIdentities(identities(result('transaction-core/after'))),
)
const finalCoreIdentities = identities(result('transaction-core/final-neighbors')).filter((entry) =>
  ['migration-transaction.test.ts', 'migration-transaction.boundaries.test.ts'].includes(
    entry.file,
  ),
)
assert.deepEqual(transactionCoreNames.sort(), sortedIdentities(finalCoreIdentities))
const coreSource = native['transaction-core/migration-transaction.ts.before']
assert.equal(sha(coreSource), review.transactionCoreReview.source.sha256)
assert.equal(
  sha(readSourceAtRecordedBoundary(review.transactionCoreReview.source.path)),
  sha(coreSource),
)
const coreCounter = JSON.parse(native['transaction-core/counters-r2.json'])
assert.deepEqual(coreCounter.restoration, { sourcesExact: true, testsExact: true })
for (const definition of coreCounter.definitions) {
  assert.equal(coreSource.split(definition.from).length, 2)
  const mutant = coreSource.replace(definition.from, definition.to)
  const currentSpec = native[`transaction-core/${definition.current}.counter-candidate-r2`]
  assert.equal(
    currentSpec,
    readSourceAtRecordedBoundary(`packages/migrate/src/${definition.current}`, 'utf8'),
  )
  for (const [version, exit] of [
    ['old', 0],
    ['new', 1],
  ]) {
    const id = `${definition.id}-r2-${version}`
    const recorded = coreCounter.reports.find((entry) => entry.id === id)
    assert.equal(sha(coreSource), recorded.sourceBeforeSha256)
    assert.equal(sha(mutant), recorded.mutantSha256)
    const spec =
      version === 'old' ? native[`transaction-core/${definition.old}.before`] : currentSpec
    assert.equal(sha(spec), recorded.testSha256)
    const report = result(`transaction-core/${id}`)
    assert.equal(report.numPassedTests, version === 'old' ? 1 : 0)
    assert.equal(report.numFailedTests, version === 'old' ? 0 : 1)
    const failed = failures(report)
    assert.deepEqual(
      failed.map((entry) => entry.fullName),
      recorded.failedFullNames,
    )
    if (version === 'new') assert.match(failed[0].failureMessages[0], /^AssertionError:/)
    const execution = JSON.parse(native[`transaction-core/${id}.execution.json`])
    assert.equal(execution.exit, exit)
    assert.equal(execution.signal, null)
    assert.equal(execution.spawnError, null)
  }
}
for (const path of ['migration-transaction.test.ts', 'migration-transaction.boundaries.test.ts']) {
  assert.equal(
    native[`transaction-core/${path}.counter-candidate-r2`],
    readSourceAtRecordedBoundary(`packages/migrate/src/${path}`, 'utf8'),
  )
}
const coreTypecheck = JSON.parse(native['transaction-core/final-typecheck.execution.json'])
assert.equal(coreTypecheck.exit, 0)
assert.equal(coreTypecheck.signal, null)
assert.equal(coreTypecheck.spawnError, null)
assert.equal(native['transaction-core/final-typecheck.stdout.raw'], '')
assert.equal(native['transaction-core/final-typecheck.stderr.raw'], '')
for (const id of ['docs', 'content-review', 'lint', 'ledger', 'diff', 'fetch-r2']) {
  const execution = JSON.parse(native[`transaction-core/${id}.execution.json`])
  assert.equal(execution.exit, 0, id)
  assert.equal(execution.signal, null, id)
  assert.equal(execution.spawnError, null, id)
  assert.equal(native[`transaction-core/${id}.stderr.raw`], '', id)
}
assert.match(native['transaction-core/docs.stdout.raw'], /PASS \(0 issues\)/)
assert.match(native['transaction-core/content-review.stdout.raw'], /^content review: PASS/)
assert.match(native['transaction-core/lint.stdout.raw'], /0 errors \/ 0 warnings \/ 0 infos/)
assert.match(
  native['transaction-core/ledger.stdout.raw'],
  /795 closed \/ 26 review \/ 2647 pending/,
)
assert.equal(JSON.parse(native['transaction-core/fetch.execution.json']).exit, 128)
assert.equal(JSON.parse(native['transaction-core/verify.execution.json']).exit, 1)
const remainingMapping = review.testContractMapping.transactionRemaining
assert.deepEqual(
  sortedIdentities(remainingMapping.identities.map((entry) => entry.old)),
  sortedIdentities(identities(result('transaction-remaining/before'))),
)
const remainingNeighbors = sortedIdentities(identities(result('transaction-remaining/neighbors')))
const remainingMapped = new Set(
  sortedIdentities(remainingMapping.identities.flatMap((entry) => entry.to)),
)
for (const target of remainingMapped) assert.ok(remainingNeighbors.includes(target))
assert.equal(remainingMapping.added.length, 1)
for (const target of sortedIdentities(identities(result('transaction-remaining/after'))))
  assert.ok(
    remainingMapped.has(target) || sortedIdentities(remainingMapping.added).includes(target),
  )
assert.deepEqual(remainingMapping.typeDestinations, [
  'packages/migrate/src/__tests__/transaction-contracts.ts',
])
const remainingSource = native['transaction-remaining/migration-transaction.ts.before']
assert.equal(sha(remainingSource), review.transactionRemainingReview.source.sha256)
assert.equal(
  sha(readSourceAtRecordedBoundary(review.transactionRemainingReview.source.path)),
  sha(remainingSource),
)
const remainingCounter = JSON.parse(native['transaction-remaining/counters.json'])
assert.deepEqual(remainingCounter.restoration, { sourcesExact: true, testsExact: true })
for (const definition of remainingCounter.definitions) {
  assert.equal(remainingSource.split(definition.from).length, 2)
  const mutant = remainingSource.replace(definition.from, definition.to)
  for (const [version, exit] of [
    ['old', 0],
    ['new', 1],
  ]) {
    const id = `${definition.id}-${version}`,
      recorded = remainingCounter.reports.find((entry) => entry.id === id)
    assert.equal(sha(remainingSource), recorded.sourceBeforeSha256)
    assert.equal(sha(mutant), recorded.mutantSha256)
    const file = version === 'old' ? definition.old : definition.current
    const spec =
      native[`transaction-remaining/${file}.${version === 'old' ? 'before' : 'counter-candidate'}`]
    assert.equal(sha(spec), recorded.testSha256)
    if (version === 'new')
      assert.equal(spec, readSourceAtRecordedBoundary(`packages/migrate/src/${file}`, 'utf8'))
    const report = result(`transaction-remaining/${id}`),
      failed = failures(report)
    assert.equal(report.numPassedTests, version === 'old' ? 1 : 0)
    assert.equal(report.numFailedTests, version === 'old' ? 0 : 1)
    assert.deepEqual(
      failed.map((entry) => entry.fullName),
      recorded.failedFullNames,
    )
    if (version === 'new') assert.match(failed[0].failureMessages[0], /^AssertionError:/)
    const execution = JSON.parse(native[`transaction-remaining/${id}.execution.json`])
    assert.equal(execution.exit, exit)
    assert.equal(execution.signal, null)
    assert.equal(execution.spawnError, null)
  }
}
for (const file of ['migration-journal-fixture.ts', 'transaction-contracts.ts'])
  assert.equal(
    native[`transaction-remaining/${file}.counter-candidate`],
    readSourceAtRecordedBoundary(`packages/migrate/src/__tests__/${file}`, 'utf8'),
  )
const remainingTypecheck = JSON.parse(
  native['transaction-remaining/final-typecheck.execution.json'],
)
assert.equal(remainingTypecheck.exit, 0)
assert.equal(remainingTypecheck.signal, null)
assert.equal(remainingTypecheck.spawnError, null)
assert.equal(native['transaction-remaining/final-typecheck.stdout.raw'], '')
assert.equal(native['transaction-remaining/final-typecheck.stderr.raw'], '')
assert.equal(remainingMapping.runtimeValuesRetired.length, 2)
for (const id of [
  'docs',
  'content-review',
  'lint',
  'ledger',
  'diff',
  'final-fetch',
  'scoped-format-r2',
]) {
  const execution = JSON.parse(native[`transaction-remaining/${id}.execution.json`])
  assert.equal(execution.exit, 0, id)
  assert.equal(execution.signal, null, id)
  assert.equal(execution.spawnError, null, id)
  assert.equal(native[`transaction-remaining/${id}.stderr.raw`], '', id)
}
assert.match(native['transaction-remaining/docs.stdout.raw'], /PASS \(0 issues\)/)
assert.match(native['transaction-remaining/content-review.stdout.raw'], /^content review: PASS/)
assert.match(native['transaction-remaining/lint.stdout.raw'], /0 errors \/ 0 warnings \/ 0 infos/)
assert.match(
  native['transaction-remaining/ledger.stdout.raw'],
  /795 closed \/ 30 review \/ 2645 pending/,
)
assert.match(native['transaction-remaining/scoped-format.stdout.raw'], /Found 1 warning/)
assert.match(native['transaction-remaining/scoped-format.stdout.raw'], /Found 3 infos/)
const guardMapping = review.testContractMapping.planWriteGuard
assert.deepEqual(
  sortedIdentities(guardMapping.identities.map((entry) => entry.old)),
  sortedIdentities(identities(result('plan-write-guard/before'))),
)
assert.equal(guardMapping.added.length, 0)
assert.equal(guardMapping.runtimeValuesRetired.length, 1)
const guardNeighbors = sortedIdentities(identities(result('plan-write-guard/neighbors')))
const guardMapped = new Set(sortedIdentities(guardMapping.identities.flatMap((entry) => entry.to)))
for (const target of guardMapped) assert.ok(guardNeighbors.includes(target))
for (const target of sortedIdentities(identities(result('plan-write-guard/after-r2'))))
  assert.ok(guardMapped.has(target))
for (const entry of review.planWriteGuardReview.production) {
  const frozen = native[entry.before]
  assert.equal(sha(frozen), entry.sha256)
  assert.equal(sha(readSourceAtRecordedBoundary(entry.path)), entry.sha256)
}
const guardCounter = JSON.parse(native['plan-write-guard/counters-r2.json'])
assert.deepEqual(guardCounter.restoration, { sourcesExact: true, testsExact: true })
for (const definition of guardCounter.definitions) {
  const source = native[`plan-write-guard/${definition.source}.before`]
  assert.equal(source.split(definition.from).length, 2)
  const mutant = source.replace(definition.from, definition.to)
  for (const [version, exit] of [
    ['old', 0],
    ['new', 1],
  ]) {
    const id = `${definition.id}-r2-${version}`
    const recorded = guardCounter.reports.find((entry) => entry.id === id)
    assert.equal(sha(source), recorded.sourceBeforeSha256)
    assert.equal(sha(mutant), recorded.mutantSha256)
    const file = version === 'old' ? definition.old : definition.current
    const spec =
      native[`plan-write-guard/${file}.${version === 'old' ? 'before' : 'counter-candidate-r2'}`]
    assert.equal(sha(spec), recorded.testSha256)
    if (version === 'new')
      assert.equal(spec, readSourceAtRecordedBoundary(`packages/migrate/src/${file}`, 'utf8'))
    const report = result(`plan-write-guard/${id}`),
      failed = failures(report)
    assert.equal(report.numPassedTests, version === 'old' ? 1 : 0)
    assert.equal(report.numFailedTests, version === 'old' ? 0 : 1)
    assert.deepEqual(
      failed.map((entry) => entry.fullName),
      recorded.failedFullNames,
    )
    if (version === 'new') assert.match(failed[0].failureMessages[0], /^AssertionError:/)
    const execution = JSON.parse(native[`plan-write-guard/${id}.execution.json`])
    assert.equal(execution.exit, exit)
    assert.equal(execution.signal, null)
    assert.equal(execution.spawnError, null)
  }
}
for (const file of ['migration-plan-transaction.glm-r1.test.ts', 'migration-write-guard.test.ts'])
  assert.equal(
    native[`plan-write-guard/${file}.counter-candidate-r2`],
    readSourceAtRecordedBoundary(`packages/migrate/src/${file}`, 'utf8'),
  )
const guardTypecheck = JSON.parse(native['plan-write-guard/typecheck.execution.json'])
assert.equal(guardTypecheck.exit, 0)
assert.equal(guardTypecheck.signal, null)
assert.equal(guardTypecheck.spawnError, null)
assert.equal(native['plan-write-guard/typecheck.stdout.raw'], '')
assert.equal(native['plan-write-guard/typecheck.stderr.raw'], '')
const initialGuardAttempt = result('plan-write-guard/after')
assert.equal(initialGuardAttempt.numFailedTests, 1)
assert.equal(initialGuardAttempt.numPassedTests, 13)
assert.match(failures(initialGuardAttempt)[0].failureMessages[0], /expected 3 to be 1/)
for (const id of ['docs', 'content-review', 'lint', 'ledger', 'diff', 'final-fetch']) {
  const execution = JSON.parse(native[`plan-write-guard/${id}.execution.json`])
  assert.equal(execution.exit, 0, id)
  assert.equal(execution.signal, null, id)
  assert.equal(execution.spawnError, null, id)
  assert.equal(native[`plan-write-guard/${id}.stderr.raw`], '', id)
}
assert.match(native['plan-write-guard/docs.stdout.raw'], /PASS \(0 issues\)/)
assert.match(native['plan-write-guard/content-review.stdout.raw'], /^content review: PASS/)
assert.match(native['plan-write-guard/lint.stdout.raw'], /0 errors \/ 0 warnings \/ 0 infos/)
assert.match(
  native['plan-write-guard/ledger.stdout.raw'],
  /795 closed \/ 32 review \/ 2643 pending/,
)
const mergeSourcePath = 'packages/migrate/src/migration-merge.ts'
const mergeSpecPath = 'packages/migrate/src/migration-merge.test.ts'
const mergeBefore = native['merge/migration-merge.ts.before']
const mergePrivate = native['merge/migration-merge.ts.private-cleanup']
const mergeSpecFrozen = native['merge-approved/migration-merge.test.ts.before']
const mergeProof = JSON.parse(native['merge/private-cleanup.json'])
assert.equal(sha(mergeBefore), mergeProof.beforeSha256)
assert.equal(sha(mergePrivate), mergeProof.afterSha256)
const mergeParsed = ts.createSourceFile('merge.ts', mergeBefore, ts.ScriptTarget.Latest, true)
const mergeCalls = []
function collectMergeCalls(node) {
  if (ts.isCallExpression(node) && node.expression.getText(mergeParsed) === 'mergeIdentityArray')
    mergeCalls.push(node)
  ts.forEachChild(node, collectMergeCalls)
}
collectMergeCalls(mergeParsed)
assert.equal(mergeCalls.length, 7)
assert.ok(mergeCalls.every((node) => node.arguments[5].kind === ts.SyntaxKind.FalseKeyword))
assert.equal(
  mergeCalls.filter((node) => node.arguments[6]?.kind === ts.SyntaxKind.TrueKeyword).length,
  2,
)
const removedMergeReader = mergeParsed.statements.find(
  (node) => ts.isFunctionDeclaration(node) && node.name?.text === 'primitiveIdentityMaps',
)
assert.ok(removedMergeReader && !removedMergeReader.modifiers)
let expectedMerge =
  mergeBefore.slice(0, removedMergeReader.pos) + mergeBefore.slice(removedMergeReader.end)
expectedMerge = expectedMerge.replace(
  '  primitive: boolean,\n  strictOrder = primitive,',
  '  strictOrder = false,',
)
expectedMerge = expectedMerge.replace(
  '  const read = primitive ? primitiveIdentityMaps : identityMaps\n',
  '',
)
for (const side of ['base', 'ours', 'theirs'])
  expectedMerge = expectedMerge.replace(`read(${side}.value)`, `identityMaps(${side}.value)`)
let mergeChangedCalls = 0
expectedMerge = expectedMerge.replace(
  /mergeIdentityArray\((empty|base), ours, theirs, path, ctx, false(, true)?\)/g,
  (_all, head, strict) => {
    mergeChangedCalls++
    return `mergeIdentityArray(${head}, ours, theirs, path, ctx${strict ?? ''})`
  },
)
assert.equal(mergeChangedCalls, 7)
assert.equal(
  printCode(expectedMerge),
  printCode(mergePrivate),
  'only the approved private cleanup, no policy fix yet',
)
for (const [id, passed] of [
  ['before', 68],
  ['tests-reworked', 77],
  ['neighbors', 168],
]) {
  const report = result(`merge/${id}`)
  assert.equal(report.numPassedTests, passed)
  assert.equal(report.numFailedTests, 0)
  assert.equal(report.numPendingTests, 0)
  const execution = JSON.parse(native[`merge/${id}.execution.json`])
  assert.equal(execution.exit, 0)
  assert.equal(execution.signal, null)
  assert.equal(execution.spawnError, null)
  assert.equal(native[`merge/${id}.stderr.raw`], '')
}
const mergeCounter = JSON.parse(native['merge/counter-snapshot.json'])
assert.equal(mergeCounter.mutation.sourceSha256, sha(mergePrivate))
assert.equal(
  sha(mergePrivate.replace(mergeCounter.mutation.from, mergeCounter.mutation.to)),
  mergeCounter.mutation.mutatedSha256,
)
assert.deepEqual(mergeCounter.restoration, { sourceExact: true, candidateTestExact: true })
const mergeCounterSpec = native['merge/migration-merge.test.ts.counter-candidate']
assert.equal(sha(mergeCounterSpec), mergeCounter.candidateTestSha256)
const expectedMergeSpec = mergeCounterSpec
  .replace(
    "const sceneFlow = (text: string, pageLabel = '默认'): MigrationJson => ({",
    'const sceneFlow = (text: string): MigrationJson => ({',
  )
  .replace(
    "pages: [{ id: 'default', label: pageLabel }],",
    "pages: [{ id: 'default', label: '默认' }],",
  )
assert.equal(
  expectedMergeSpec,
  mergeSpecFrozen,
  'only remove unused fixture parameter after counter',
)
for (const [version, exit] of [
  ['old', 0],
  ['new', 1],
]) {
  const id = `merge/counter-snapshot-${version}-r2`
  const report = result(id)
  assert.equal(report.numPassedTests, version === 'old' ? 1 : 0)
  assert.equal(report.numFailedTests, version === 'old' ? 0 : 1)
  if (version === 'new') {
    assert.equal(failures(report)[0].fullName, mergeCounter.failedFullName)
    assert.match(failures(report)[0].failureMessages[0], /^AssertionError:/)
  }
  const execution = JSON.parse(native[`${id}.execution.json`])
  assert.equal(execution.exit, exit)
  assert.equal(execution.signal, null)
  assert.equal(execution.spawnError, null)
}
const mainMergeNames = (report) =>
  report.testResults
    .find((file) => file.name.endsWith('/migration-merge.test.ts'))
    .assertionResults.map((test) => test.fullName)
const mergeMapping = review.testContractMapping.merge.identities
assert.deepEqual(
  mergeMapping.map((mapping) => mapping.old).sort(),
  mainMergeNames(result('merge/before')).sort(),
)
assert.deepEqual(
  [...new Set(mergeMapping.flatMap((mapping) => mapping.to))].sort(),
  mainMergeNames(result('merge/neighbors')).sort(),
)
for (const id of [
  'final-typecheck',
  'scoped-biome',
  'docs',
  'content-review',
  'lint',
  'ledger',
  'diff',
  'final-fetch',
]) {
  const execution = JSON.parse(native[`merge/${id}.execution.json`])
  assert.equal(execution.exit, 0, id)
  assert.equal(execution.signal, null, id)
  assert.equal(execution.spawnError, null, id)
  assert.equal(native[`merge/${id}.stderr.raw`], '', id)
}
assert.equal(native['merge/final-typecheck.stdout.raw'], '')
assert.match(native['merge/docs.stdout.raw'], /PASS \(0 issues\)/)
assert.match(native['merge/content-review.stdout.raw'], /^content review: PASS/)
assert.match(native['merge/lint.stdout.raw'], /0 errors \/ 0 warnings \/ 0 infos/)
assert.match(native['merge/ledger.stdout.raw'], /795 closed \/ 34 review \/ 2641 pending/)
const mergeObservations = native['merge/observe.stdout.raw']
  .trim()
  .split('\n')
  .map((line) => JSON.parse(line))
assert.equal(mergeObservations[0].error.name, 'DataCloneError')
assert.deepEqual(mergeObservations[1].result.ownKeys, ['other'])
assert.deepEqual(mergeObservations[2].result.writes, [['content/locale.json', { other: 1 }]])
assert.equal(
  mergeObservations[3].result.result.value.value.assets.music.origin.kind,
  'legacy-migrated',
)
assert.equal(
  JSON.parse(native['merge-approved/review-before.json']).files.find(
    (file) => file.path === mergeSourcePath,
  ).acceptance,
  'blocked-user-decision',
)
const mergeRepair = JSON.parse(native['merge-approved/repair-proof.json'])
assert.equal(mergeRepair.tool, ts.version)
const mergeRepairBefore = native['merge-approved/migration-merge.ts.before']
const mergeJsonCheckpoint = native['merge-approved/migration-merge.ts.json-fixed']
const mergeFinalSource = readSourceAtRecordedBoundary(mergeSourcePath, 'utf8')
const mergeFinalSpec = readSourceAtRecordedBoundary(mergeSpecPath, 'utf8')
assert.equal(mergeRepairBefore, mergePrivate)
assert.equal(sha(mergeRepairBefore), mergeRepair.sourceBeforeSha256)
assert.equal(sha(mergeJsonCheckpoint), mergeRepair.jsonOnlyCheckpointSha256)
assert.equal(sha(mergeFinalSource), mergeRepair.sourceFinalSha256)
assert.equal(sha(mergeFinalSpec), mergeRepair.testFinalSha256)
let mergeExpectedRepair = mergeRepairBefore
for (const change of mergeRepair.changes) {
  assert.equal(mergeExpectedRepair.split(change.from).length, 2, 'one repair site')
  mergeExpectedRepair = mergeExpectedRepair.replace(change.from, change.to)
}
assert.equal(
  printCode(mergeExpectedRepair),
  printCode(mergeJsonCheckpoint),
  'only approved JSON field repair',
)
assert.equal(
  printCode(
    mergeJsonCheckpoint.replace(
      "file === 'content/assets/index.json'",
      "file === 'assets/index.json'",
    ),
  ),
  printCode(mergeFinalSource),
  'only approved canonical asset path plus comments',
)
assert.equal(mergeFinalSource, native['merge-approved/migration-merge.ts.final'])
assert.equal(
  mergeFinalSpec,
  native['merge-approved/migration-merge.test.ts.formal'],
  'formal red-green byte identity',
)
const nonImportStatements = (text) =>
  ts
    .createSourceFile('spec.ts', text, ts.ScriptTarget.Latest, true)
    .statements.filter((node) => !ts.isImportDeclaration(node))
const mergePriorStatements = nonImportStatements(mergeSpecFrozen)
const mergeNewStatements = nonImportStatements(mergeFinalSpec)
assert.equal(mergeNewStatements.length, mergePriorStatements.length + 1)
for (let i = 0; i < mergePriorStatements.length; i++)
  assert.equal(
    printCode(mergePriorStatements[i].getText()),
    printCode(mergeNewStatements[i].getText()),
    'old helper/test unchanged',
  )
for (const [id, passed, failed] of [
  ['formal-red', 31, 6],
  ['json-fixed', 36, 1],
  ['formal-green', 37, 0],
  ['neighbors', 215, 0],
]) {
  const name = `merge-approved/${id}`,
    report = result(name)
  assert.equal(report.numPassedTests, passed)
  assert.equal(report.numFailedTests, failed)
  assert.equal(report.numPendingTests, 0)
  if (failed)
    assert.ok(
      failures(report).every((test) => test.failureMessages[0].startsWith('AssertionError:')),
    )
  const execution = JSON.parse(native[`${name}.execution.json`])
  assert.equal(execution.exit, failed ? 1 : 0)
  assert.equal(execution.signal, null)
  assert.equal(execution.spawnError, null)
  if (!failed) assert.equal(native[`${name}.stderr.raw`], '')
}
const formalRedNames = names(result('merge-approved/formal-red')).sort()
assert.deepEqual(formalRedNames, names(result('merge-approved/formal-green')).sort())
assert.deepEqual(formalRedNames, names(result('merge-approved/json-fixed')).sort())
assert.deepEqual(
  failures(result('merge-approved/formal-red'))
    .map((test) => test.fullName)
    .sort(),
  [...mergeRepair.jsonRedNames, mergeRepair.assetRedName].sort(),
)
assert.deepEqual(
  failures(result('merge-approved/json-fixed')).map((test) => test.fullName),
  [mergeRepair.assetRedName],
)
assert.deepEqual(
  formalRedNames,
  [
    ...mainMergeNames(result('merge/neighbors')),
    ...review.testContractMapping.merge.approvedAdditions.names,
  ].sort(),
)
assert.equal(review.files.find((file) => file.path === mergeSourcePath).acceptance, 'accepted-code')
assert.equal(JSON.parse(native['naming/window-review.before.json']).progress.blockedPrimaries, 0)
const priorOrganizationReview = JSON.parse(native['organization-current/review.json.before'])
assert.equal(priorOrganizationReview.progress.blockedPrimaries, 9)
assert.equal(priorOrganizationReview.progress.originalPendingPrimariesCompleted, 20)
assert.equal(review.progress.blockedPrimaries, 0)
assert.equal(review.progress.originalPendingPrimariesCompleted, 29)
assert.deepEqual(
  review.files
    .filter((x) => x.acceptance === 'blocked-FG-organization')
    .map((x) => x.path)
    .sort(),
  review.organizationRevision.currentWindowOrganizationPending.slice().sort(),
)
for (const id of [
  'typecheck',
  'scoped',
  'docs',
  'content-review',
  'lint',
  'ledger',
  'diff',
  'final-fetch',
]) {
  const execution = JSON.parse(native[`merge-approved/${id}.execution.json`])
  assert.equal(execution.exit, 0, id)
  assert.equal(execution.signal, null, id)
  assert.equal(execution.spawnError, null, id)
  assert.equal(native[`merge-approved/${id}.stderr.raw`], '', id)
}
assert.equal(native['merge-approved/typecheck.stdout.raw'], '')
assert.match(native['merge-approved/docs.stdout.raw'], /PASS \(0 issues\)/)
assert.match(native['merge-approved/content-review.stdout.raw'], /^content review: PASS/)
assert.match(native['merge-approved/lint.stdout.raw'], /0 errors \/ 0 warnings \/ 0 infos/)
assert.match(native['merge-approved/ledger.stdout.raw'], /795 closed \/ 34 review \/ 2641 pending/)
const mergeSpecPreservation = JSON.parse(native['merge-specs/preservation.json'])
for (const entry of mergeSpecPreservation.preserved) {
  const before = native[entry.before]
  assert.equal(sha(before), entry.sha256)
  assert.equal(
    entry.path === 'packages/migrate/src/migration-merge.kimi-r1.test.ts'
      ? native['merge-kimi/migration-merge.kimi-r1.test.ts.before']
      : organizationCheckpoint(entry.path),
    before,
    `unchanged at the prior merge-specs checkpoint: ${entry.path}`,
  )
}
const mergeSpecCurrentResult = result('merge-specs/neighbors')
assert.equal(mergeSpecCurrentResult.numPassedTests, 214)
assert.equal(mergeSpecCurrentResult.numFailedTests, 0)
assert.equal(mergeSpecCurrentResult.numPendingTests, 0)
const mergeSpecFiles = ['migration-merge.boundaries.test.ts', 'migration-merge.glm-o.test.ts']
const fileIdentities = (report, file) =>
  report.testResults
    .find((entry) => entry.name.endsWith(`/${file}`))
    .assertionResults.map((test) => ({ file, fullName: test.fullName }))
const oldMergeIdentities = mergeSpecFiles.flatMap((file) =>
  fileIdentities(result('merge-approved/neighbors'), file),
)
const newMergeIdentities = mergeSpecFiles.flatMap((file) =>
  fileIdentities(mergeSpecCurrentResult, file),
)
assert.equal(oldMergeIdentities.length, 36)
assert.equal(newMergeIdentities.length, 35)
const identityKey = (entry) => `${entry.file}\0${entry.fullName}`
const specMapping = review.testContractMapping.mergeSpecs.identities
assert.deepEqual(
  specMapping.map((entry) => identityKey(entry.old)).sort(),
  oldMergeIdentities.map(identityKey).sort(),
)
const allCurrentMergeIdentities = mergeSpecCurrentResult.testResults.flatMap((file) =>
  file.assertionResults.map((test) => ({
    file: file.name.split('/').at(-1),
    fullName: test.fullName,
  })),
)
const allCurrentKeys = new Set(allCurrentMergeIdentities.map(identityKey))
for (const mapping of specMapping) {
  assert.ok(mapping.to.length > 0)
  for (const target of mapping.to)
    assert.ok(allCurrentKeys.has(identityKey(target)), identityKey(target))
}
const mappedCurrentKeys = new Set(specMapping.flatMap((mapping) => mapping.to.map(identityKey)))
for (const identity of newMergeIdentities) assert.ok(mappedCurrentKeys.has(identityKey(identity)))
const mergeSpecCounters = JSON.parse(native['merge-specs/counters.json'])
const mergeSpecSource = readSourceAtRecordedBoundary(mergeSourcePath, 'utf8')
const mergeSpecCandidate = organizationCheckpoint(
  'packages/migrate/src/migration-merge.glm-o.test.ts',
)
assert.equal(sha(mergeSpecSource), mergeSpecCounters.sourceSha256)
assert.equal(sha(mergeSpecCandidate), mergeSpecCounters.candidateTestSha256)
assert.equal(
  mergeSpecCandidate,
  native['merge-specs/migration-merge.glm-o.test.ts.counter-candidate'],
)
assert.deepEqual(mergeSpecCounters.restoration, { sourceExact: true, candidateTestExact: true })
for (const definition of mergeSpecCounters.definitions) {
  assert.equal(mergeSpecSource.split(definition.from).length, 2)
  const mutant = mergeSpecSource.replace(definition.from, definition.to)
  for (const [version, exit] of [
    ['old', 0],
    ['new', 1],
  ]) {
    const id = `${definition.id}-${version}`,
      entry = mergeSpecCounters.reports.find((item) => item.id === id)
    const spec =
      version === 'old'
        ? native['merge-specs/migration-merge.glm-o.test.ts.before']
        : mergeSpecCandidate
    assert.equal(sha(mutant), entry.mutantSha256)
    assert.equal(sha(spec), entry.testSha256)
    assert.equal(entry.sourceBeforeSha256, mergeSpecCounters.sourceSha256)
    const report = result(`merge-specs/${id}`)
    assert.equal(report.numPassedTests, version === 'old' ? 1 : 0)
    assert.equal(report.numFailedTests, version === 'old' ? 0 : 1)
    const selected = report.testResults
      .flatMap((file) => file.assertionResults)
      .filter((test) => test.status === 'passed' || test.status === 'failed')
    assert.equal(selected.length, 1)
    assert.equal(selected[0].fullName, entry.fullName)
    assert.deepEqual(
      failures(report).map((test) => test.fullName),
      entry.failedFullNames,
    )
    if (version === 'new') assert.match(selected[0].failureMessages[0], /^AssertionError:/)
    const execution = JSON.parse(native[`merge-specs/${id}.execution.json`])
    assert.equal(execution.exit, exit)
    assert.equal(execution.signal, null)
    assert.equal(execution.spawnError, null)
  }
}
for (const id of [
  'scoped',
  'typecheck',
  'neighbors',
  'docs',
  'content-review',
  'lint-r2',
  'ledger',
  'diff',
  'final-fetch-r2',
]) {
  const execution = JSON.parse(native[`merge-specs/${id}.execution.json`])
  assert.equal(execution.exit, 0, id)
  assert.equal(execution.signal, null, id)
  assert.equal(execution.spawnError, null, id)
  assert.equal(native[`merge-specs/${id}.stderr.raw`], '', id)
}
assert.equal(native['merge-specs/typecheck.stdout.raw'], '')
assert.match(native['merge-specs/docs.stdout.raw'], /PASS \(0 issues\)/)
assert.match(native['merge-specs/content-review.stdout.raw'], /^content review: PASS/)
assert.match(native['merge-specs/lint-r2.stdout.raw'], /0 errors \/ 0 warnings \/ 0 infos/)
assert.match(native['merge-specs/ledger.stdout.raw'], /795 closed \/ 36 review \/ 2639 pending/)
assert.equal(JSON.parse(native['merge-specs/lint.execution.json']).exit, 1)
assert.match(native['merge-specs/lint.stderr.raw'], /infos: 5; diagnostics: 5/)
assert.equal(JSON.parse(native['merge-specs/final-fetch.execution.json']).exit, 128)
assert.match(native['merge-specs/final-fetch.stderr.raw'], /SSL_ERROR_SYSCALL/)
const kimiPreservation = JSON.parse(native['merge-kimi/preservation.json'])
for (const entry of kimiPreservation.preserved) {
  assert.equal(sha(native[entry.before]), entry.sha256)
  assert.equal(organizationCheckpoint(entry.path), native[entry.before], entry.path)
}
const kimiSource = readSourceAtRecordedBoundary(mergeSourcePath, 'utf8')
const kimiSpecPath = 'packages/migrate/src/migration-merge.kimi-r1.test.ts'
const kimiSpec = organizationCheckpoint(kimiSpecPath)
const kimiResult = result('merge-kimi/neighbors')
assert.equal(kimiResult.numPassedTests, 213)
assert.equal(kimiResult.numFailedTests, 0)
assert.equal(kimiResult.numPendingTests, 0)
const oldKimiNames = fileIdentities(
  result('merge-specs/neighbors'),
  'migration-merge.kimi-r1.test.ts',
)
const newKimiNames = fileIdentities(kimiResult, 'migration-merge.kimi-r1.test.ts')
assert.equal(oldKimiNames.length, 10)
assert.equal(newKimiNames.length, 9)
const kimiMappings = review.testContractMapping.mergeKimi.identities
assert.deepEqual(
  kimiMappings.map((entry) => identityKey(entry.old)).sort(),
  oldKimiNames.map(identityKey).sort(),
)
const kimiAllNames = new Set(
  kimiResult.testResults.flatMap((file) =>
    file.assertionResults.map((test) =>
      identityKey({ file: file.name.split('/').at(-1), fullName: test.fullName }),
    ),
  ),
)
for (const mapping of kimiMappings)
  for (const target of mapping.to) assert.ok(kimiAllNames.has(identityKey(target)), target.fullName)
const kimiMappedNames = new Set(kimiMappings.flatMap((mapping) => mapping.to.map(identityKey)))
for (const identity of newKimiNames) assert.ok(kimiMappedNames.has(identityKey(identity)))
assert.equal(kimiMappings.filter((mapping) => mapping.evidenceOnly).length, 1)
assert.equal(review.testContractMapping.mergeKimi.retiredBadOutputOracles, 1)
const kimiObservation = JSON.parse(native['merge-kimi/legacy-observe.stdout.raw'])
assert.deepEqual(kimiObservation.ownIndices, ['0', '1', '3'])
assert.equal(kimiObservation.ownSlot2, false)
assert.equal(kimiObservation.length, 4)
assert.equal(kimiPreservation.oldSparseDefectFixed, false)
assert.equal(kimiPreservation.oldSparseOracleLive, false)
const kimiCounter = JSON.parse(native['merge-kimi/counter.json'])
assert.equal(sha(kimiSource), kimiCounter.sourceSha256)
assert.equal(sha(kimiSpec), kimiCounter.candidateTestSha256)
assert.equal(kimiSpec, native['merge-kimi/migration-merge.kimi-r1.test.ts.counter-candidate'])
assert.equal(kimiSource.split(kimiCounter.from).length, 2)
assert.equal(sha(kimiSource.replace(kimiCounter.from, kimiCounter.to)), kimiCounter.mutantSha256)
assert.deepEqual(kimiCounter.restoration, { sourceExact: true, candidateTestExact: true })
for (const [version, exit] of [
  ['old', 0],
  ['new', 1],
]) {
  const id = `retain-author-${version}`,
    recorded = kimiCounter.reports.find((entry) => entry.id === id)
  const spec =
    version === 'old' ? native['merge-kimi/migration-merge.kimi-r1.test.ts.before'] : kimiSpec
  assert.equal(sha(spec), recorded.testSha256)
  const report = result(`merge-kimi/${id}`)
  assert.equal(report.numPassedTests, version === 'old' ? 1 : 0)
  assert.equal(report.numFailedTests, version === 'old' ? 0 : 1)
  const selected = report.testResults
    .flatMap((file) => file.assertionResults)
    .filter((test) => test.status === 'passed' || test.status === 'failed')
  assert.equal(selected.length, 1)
  assert.equal(selected[0].fullName, recorded.fullName)
  assert.deepEqual(
    failures(report).map((test) => test.fullName),
    recorded.failedFullNames,
  )
  if (version === 'new') assert.match(selected[0].failureMessages[0], /^AssertionError:/)
  const execution = JSON.parse(native[`merge-kimi/${id}.execution.json`])
  assert.equal(execution.exit, exit)
  assert.equal(execution.signal, null)
  assert.equal(execution.spawnError, null)
}
for (const id of [
  'scoped',
  'legacy-observe',
  'typecheck',
  'neighbors',
  'docs',
  'content-review',
  'lint',
  'ledger',
  'diff',
  'final-fetch',
]) {
  const execution = JSON.parse(native[`merge-kimi/${id}.execution.json`])
  assert.equal(execution.exit, 0, id)
  assert.equal(execution.signal, null, id)
  assert.equal(execution.spawnError, null, id)
  assert.equal(native[`merge-kimi/${id}.stderr.raw`], '', id)
}
assert.equal(native['merge-kimi/typecheck.stdout.raw'], '')
assert.match(native['merge-kimi/docs.stdout.raw'], /PASS \(0 issues\)/)
assert.match(native['merge-kimi/content-review.stdout.raw'], /^content review: PASS/)
assert.match(native['merge-kimi/lint.stdout.raw'], /0 errors \/ 0 warnings \/ 0 infos/)
assert.match(native['merge-kimi/ledger.stdout.raw'], /795 closed \/ 37 review \/ 2638 pending/)
const moduleDefinitions = (review.organizationModules ?? []).map((name) => json(name))
const frozenStages = moduleDefinitions.map(moduleFrozenInputs)
// Only a later verified module may supply an exact intermediate version. This
// chronological edge cannot turn an output into its own frozen substitute.
const readAtStage = (index) => (path, expectedSha256) => {
  const url = new URL(path, root)
  if (existsSync(url)) {
    const body = readFileSync(url, 'utf8')
    if (sha(body) === expectedSha256) return body
  }
  const successor = frozenStages
    .slice(index + 1)
    .flat()
    .find((entry) => entry.path === path && entry.sha256 === expectedSha256)
  return successor ? native[successor.member] : readFileSync(url, 'utf8')
}
const moduleResults = moduleDefinitions.map((module, index) =>
  module.kind === 'fixture'
    ? verifyFixtureOrganization(root, native, module, readAtStage(index))
    : verifyModuleOrganization(root, native, module, readAtStage(index)),
)
// Unresolved import-only consumers retain the original cohort identity; no F/G
// completion is granted by an intermediate-version bridge.
const organizationResult = verifyOrganization(
  root,
  native,
  organization,
  json('naming-review.json'),
  json('naming-resolutions.json'),
  readAtStage(-1),
  review.unifiedCloseout
    ? () => native['unified-closeout/ledger.before-code-acceptance.md']
    : undefined,
)
const closeoutResult = review.unifiedCloseout
  ? verifyCloseout(json(review.unifiedCloseout), native, (path) =>
      readFileSync(new URL(path, root), 'utf8'),
    )
  : undefined
const currentOrganizationResult = verifyCurrentOrganization(
  root,
  native,
  currentOrganization,
  review.currentOrganizationProfiles,
)
const sharedOrganizationResult = verifySharedOrganization(
  root,
  native,
  json('organization-shared.json'),
)
const resolutions = json('naming-resolutions.json')
assert.equal(review.historicalNaming.completedFG, resolutions.completedFG)
assert.equal(review.historicalNaming.remainingFG, resolutions.remainingFG)
assert.deepEqual(review.historicalNaming.moduleEvidence, review.organizationModules)
const allCohort = json('naming-review.json').files
const resolvedSubjects = [
  ...allCohort.filter((x) => x.path.startsWith('packages/shared/')).map((x) => x.path),
  ...moduleDefinitions.flatMap((x) => x.cohortSubjects.map((x) => x.path)),
]
assert.equal(new Set(resolvedSubjects).size, resolvedSubjects.length)
assert.deepEqual(resolutions.files.map((x) => x.oldPath).sort(), resolvedSubjects.slice().sort())
for (const subject of moduleDefinitions.flatMap((x) => x.cohortSubjects))
  assert.equal(allCohort.find((x) => x.path === subject.path)?.sha256, subject.sha256)
// This historical publication boundary precedes the user-authorized retirement of calendar expiry.
const readPublicationBoundary = (path) =>
  ['docs/testing/catalog.json', 'docs/testing/e2e/stages/001-opening/README.md'].includes(path)
    ? readBeforePolicy(path)
    : readFileSync(new URL(path, root), 'utf8')
const publication = json('e2e001-publication-review.json')
for (const entry of publication.inputs)
  assert.equal(sha(native[entry.member]), entry.sha256, entry.path)
for (const entry of [
  ...publication.outputs,
  ...publication.separateConcurrentDelta.publicationOutputs,
])
  assert.equal(sha(readPublicationBoundary(entry.path)), entry.sha256, entry.path)
const oldCatalog = JSON.parse(native[publication.inputs[0].member])
const catalog = JSON.parse(readPublicationBoundary('docs/testing/catalog.json'))
const opening = catalog.entries.find((x) => x.id === 'e2e-001')
const oldOpening = oldCatalog.entries.find((x) => x.id === 'e2e-001')
assert.equal(opening.reviewBy, publication.reviewBy)
for (const key of ['status', 'lastVerified', 'revision', 'sourceRefs'])
  assert.deepEqual(opening[key], oldOpening[key], `001 historical ${key}`)
assert.deepEqual(
  catalog.entries.find((x) => x.id === 'e2e-006'),
  oldCatalog.entries.find((x) => x.id === 'e2e-006'),
)
const oldEvidence = JSON.parse(native[publication.inputs[3].member])
const openingEvidence = JSON.parse(readFileSync(new URL(publication.inputs[3].path, root), 'utf8'))
for (const key of [
  'history',
  'runtimeExecution',
  'versions',
  'candidateSha',
  'sourceRefs',
  'claims',
  'status',
])
  assert.deepEqual(openingEvidence[key], oldEvidence[key], `001 evidence ${key}`)
assert.equal(publication.runtimeExecution.performed, false)
const publicationGate = publication.fullDocumentationGate
assert.equal(JSON.parse(native[publicationGate.execution]).exit, 0)
assert.equal(sha(native[publicationGate.stdout]), publicationGate.stdoutSha256)
assert.match(native[publicationGate.stdout], /testing docs: PASS \(0 issues\)/)
assert.equal(native[publicationGate.execution.replace('.execution.json', '.stderr.raw')], '')
assert.equal(sha(native[publication.sourceAudit.member]), publication.sourceAudit.sha256)
for (const reference of publication.sourceAudit.result.refs)
  assert.equal(sha(readFileSync(new URL(reference.path, root))), reference.sha256, reference.path)
const ci = json('base-main-ci.json')
assert.equal(ci.head, review.base)
assert.ok(
  ['documentation', 'fast-coverage'].every((name) => ci.checkRuns.some((run) => run.name === name)),
)
for (const run of ci.checkRuns) {
  assert.equal(run.head_sha, ci.head)
  assert.equal(run.status, 'completed')
  assert.equal(run.conclusion, 'success')
  assert.equal(run.output.annotations_count, 0)
}
for (const log of ci.completeLogs) {
  assert.equal(sha(readFileSync(new URL(log.path, folder))), log.sha256, log.path)
  assert.ok(Object.values(log.counts).every((count) => count === 0))
}
console.log(
  JSON.stringify({
    primaryFiles: review.files.length,
    supportedPrimaries: review.progress.originalPendingPrimariesCompleted,
    blockedPrimaries: review.progress.blockedPrimaries,
    auxiliaryFiles: review.auxiliary.length,
    reopenedFiles: review.reopened?.length ?? 0,
    rawMembers: index.files.length,
    organization: organizationResult,
    currentOrganization: currentOrganizationResult,
    sharedOrganization: sharedOrganizationResult,
    currentPrimaryFiles: review.progress.currentPrimaryFilesCompleted,
    historicalModules: moduleResults,
    openingPublicationReview: {
      historicalReviewBy: publication.reviewBy,
      supersededBy: 'TESTING-EVIDENCE-REVISION-1',
      runtimeRenewed: false,
    },
    semanticMeaning:
      'Identity, raw results and format bridge only; A-H judgments remain the recorded review.',
    heavyGates: closeoutResult ?? 'not run for this window',
  }),
)
