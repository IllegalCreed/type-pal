import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'
import { analyzeOrganization } from '../../QUALITY-PENDING-100-3/organization-program.mjs'

// Read-only receipt/identity verifier. Design judgments remain the explicit review, not a hash claim.
const root = fileURLToPath(new URL('../../../../../', import.meta.url))
const here = new URL('./', import.meta.url)
const read = (path) => readFileSync(new URL(path, here))
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')
const mapping = JSON.parse(read('mapping.json'))
const ts = createRequire(`${root}/package.json`)('typescript')
const printer = ts.createPrinter({ removeComments: true })
const renames = {
  menuInput: 'snap',
  createMenuGameState: 'mkGs',
  menuItem: 'mkItem',
  menuRoleRecords: 'typedRoles',
  installNoopMenuScripts: 'installGlobalScripts',
  defaultMenuCatalogs: 'DEFAULT_CATALOGS',
  menuSpell: 'mkSpell',
  menuMagic: 'mkMagic',
}
function callback(text) {
  const sf = ts.createSourceFile('case.ts', text, ts.ScriptTarget.Latest, true)
  assert.equal(sf.parseDiagnostics.length, 0)
  const cb = sf.statements[0].expression.arguments[1]
  const transformed = ts.transform(cb, [
    (ctx) => {
      const visit = (node) =>
        ts.isIdentifier(node) && Object.hasOwn(renames, node.text)
          ? ts.factory.createIdentifier(renames[node.text])
          : ts.visitEachChild(node, visit, ctx)
      return (node) => ts.visitNode(node, visit)
    },
  ])
  try {
    return printer.printNode(ts.EmitHint.Unspecified, transformed.transformed[0], sf)
  } finally {
    transformed.dispose()
  }
}
const sameCallback = (a, b) => callback(a) === callback(b)
assert.ok(
  sameCallback("it('a', () => { expect(1).toBe(1) })", "it('b', () => { expect(1).toBe(1) })"),
)
assert.ok(
  !sameCallback(
    "it('a', () => { expect({ a: 1, z: 2 }).toEqual({ a: 1, z: 2 }) })",
    "it('a', () => { expect({ a: 1, z: 2 }).toEqual({ a: 1, z: 3 }) })",
  ),
)
assert.ok(
  !sameCallback("it('a', () => { expect(1).toBe(1) })", "it('a', () => { expect(1).toBe })"),
)
const before = {},
  after = {}
for (const entry of mapping.inputs) {
  const source = execFileSync('git', ['show', `${mapping.base}:${entry.path}`], { cwd: root })
  assert.equal(sha(source), entry.sha256, entry.path)
  assert.ok(!existsSync(`${root}/${entry.path}`), `Old mixed file must be retired: ${entry.path}`)
  before[entry.path] = source.toString()
}
for (const entry of mapping.outputs) {
  const source = readFileSync(`${root}/${entry.path}`)
  assert.equal(sha(source), entry.sha256, `STALE output ${entry.path}`)
  if (entry.path.endsWith('.test.ts')) after[entry.path] = source.toString()
}
for (const entry of JSON.parse(read('context-pins.json')).files)
  assert.equal(
    sha(readFileSync(`${root}/${entry.path}`)),
    entry.sha256,
    `STALE context ${entry.path}`,
  )
const old = analyzeOrganization(root, before),
  now = analyzeOrganization(root, after)
const closure = JSON.parse(gunzipSync(read('dependency-closures.json.gz')))
assert.deepEqual(
  { before: old, after: now },
  closure,
  'declarations/imports/hooks/registrations drift',
)
const seenOld = new Set(),
  seenNew = new Set()
for (const entry of mapping.mapped) {
  const a = `${entry.from}:${entry.ordinal}`,
    b = `${entry.to}:${entry.targetOrdinal}`
  assert.ok(!seenOld.has(a) && !seenNew.has(b), `duplicate mapping ${a} ${b}`)
  seenOld.add(a)
  seenNew.add(b)
  const original = old[entry.from].tests[entry.ordinal],
    current = now[entry.to].tests[entry.targetOrdinal]
  assert.equal(original.statementSyntaxSha256, entry.beforeStatementSha256)
  assert.equal(current.statementSyntaxSha256, entry.afterStatementSha256)
  assert.equal(sameCallback(original.text, current.text), entry.callbackEqualAfterPrivateRename, a)
  assert.ok(entry.reason && !entry.reason.includes('UNREVIEWED'))
}
for (const entry of mapping.retired) {
  const key = `${entry.from}:${entry.ordinal}`
  assert.ok(!seenOld.has(key))
  seenOld.add(key)
  assert.equal(
    old[entry.from].tests[entry.ordinal].statementSyntaxSha256,
    entry.beforeStatementSha256,
  )
  const source = readFileSync(`${root}/${entry.survivor}`, 'utf8')
  assert.equal(sha(source), entry.survivorFileSha256)
  const survivor = analyzeOrganization(root, { [entry.survivor]: source })[entry.survivor].tests[
    entry.survivorOrdinal
  ]
  assert.equal(survivor.statementSyntaxSha256, entry.survivorStatementSha256)
  assert.equal(survivor.template, entry.title)
}
assert.equal(
  seenOld.size,
  Object.values(old).reduce((n, x) => n + x.tests.length, 0),
)
assert.equal(
  seenNew.size,
  Object.values(now).reduce((n, x) => n + x.tests.length, 0),
)
const raw = JSON.parse(gunzipSync(read('raw.json.gz')))
for (const [name, entry] of Object.entries(raw.members))
  assert.equal(sha(Buffer.from(entry.base64, 'base64')), entry.sha256, name)
const native = (name) => JSON.parse(Buffer.from(raw.members[name].base64, 'base64'))
const fullName = (entry) => [...entry.titles, entry.template].join(' ')
const identities = (report) =>
  report.testResults.flatMap((file) =>
    file.assertionResults.map((test) => ({ file: file.name, ...test })),
  )
for (const [reportName, analysis] of [
  ['baseline.json', old],
  ['directed-final.json', now],
]) {
  const executed = identities(native(reportName))
  for (const [path, entry] of Object.entries(analysis)) {
    for (const test of entry.tests) {
      const matching = executed.filter(
        (x) =>
          x.file.endsWith(`/${path.replace('packages/game/', '')}`) &&
          x.fullName === fullName(test),
      )
      assert.equal(matching.length, 1, `${reportName}: ${path}: ${fullName(test)}`)
      assert.equal(matching[0].status, 'passed')
    }
  }
}
assert.equal(native('flee-mutant-old.json').numFailedTests, 0)
const red = native('flee-mutant-new-r2.json')
assert.equal(red.numFailedTests, 1)
const failures = red.testResults
  .flatMap((x) => x.assertionResults)
  .filter((x) => x.status === 'failed')
assert.equal(failures.length, 1)
const flee = mapping.mapped.find(
  (x) => x.from.endsWith('battle-system.cov85.test.ts') && x.ordinal === 13,
)
assert.equal(failures[0].fullName, fullName(now[flee.to].tests[flee.targetOrdinal]))
assert.ok(
  failures[0].failureMessages.some(
    (x) => x.includes('AssertionError') && x.includes('undefined') && x.includes('true'),
  ),
)
assert.equal(native('flee-mutant-r2-restore.json').restored, true)
assert.equal(native('directed-final.command.json').exit, 0)
assert.equal(native('directed-final.json').numFailedTests, 0)
assert.equal(Buffer.from(raw.members['directed-final.stderr.raw'].base64, 'base64').length, 0)
// Three live review projections moved between existing ledgers. Preserve every
// historical/semantic field; only append current byte-identity metadata afterwards.
const move = JSON.parse(read('projection-move.json'))
const frozenDocuments = JSON.parse(gunzipSync(read('pre-projection-move.json.gz')))
const recordMap = (documents) => {
  const records = documents.flatMap((x) => x.entries)
  const result = new Map(records.map((x) => [x.path, x]))
  assert.equal(result.size, records.length)
  return result
}
const oldRecords = recordMap([move.from, move.to].map((p) => JSON.parse(frozenDocuments[p])))
const currentRecords = recordMap(
  [move.from, move.to].map((p) => JSON.parse(readFileSync(`${root}/${p}`))),
)
assert.deepEqual([...oldRecords.keys()].sort(), [...currentRecords.keys()].sort())
function stableReviewFields(row) {
  const copy = structuredClone(row)
  delete copy.afterSha256
  delete copy.reviewedLines
  delete copy.evidence.afterSha256
  delete copy.revision.implementationSha
  delete copy.revision.history
  return copy
}
for (const [path, original] of oldRecords) {
  const current = currentRecords.get(path)
  assert.deepEqual(stableReviewFields(current), stableReviewFields(original), path)
  assert.deepEqual(
    current.revision.history.slice(0, original.revision.history.length),
    original.revision.history,
    path,
  )
  assert.equal(current.afterSha256, sha(readFileSync(`${root}/${path}`)), path)
}
const probe = structuredClone([...currentRecords.values()].at(-1))
probe.businessOracle = 'deliberately corrupted last field'
assert.notDeepEqual(
  stableReviewFields(probe),
  stableReviewFields([...currentRecords.values()].at(-1)),
)
const registryPath = 'docs/phase-governance/document-registry.json'
const expectedRegistry = JSON.parse(frozenDocuments[registryPath])
for (const entry of expectedRegistry.entries)
  if (move.paths.includes(entry.path)) entry.reviewRecord = move.to.split('/').at(-1)
assert.deepEqual(JSON.parse(readFileSync(`${root}/${registryPath}`)), expectedRegistry)
const gates = JSON.parse(read('gates.json'))
const gateArchiveBytes = read(gates.archive.path)
assert.equal(sha(gateArchiveBytes), gates.archive.sha256)
const gateArchive = JSON.parse(gunzipSync(gateArchiveBytes))
for (const [name, entry] of Object.entries(gateArchive.members)) {
  const bytes = Buffer.from(entry.base64, 'base64')
  assert.equal(bytes.length, entry.bytes, name)
  assert.equal(sha(bytes), entry.sha256, name)
  assert.deepEqual(gates.archive.members[name], { sha256: entry.sha256, bytes: entry.bytes })
}
const gateNative = (name) => JSON.parse(Buffer.from(gateArchive.members[name].base64, 'base64'))
assert.equal(gateNative('full-check.command.json').exit, 1)
for (const name of ['official-coverage', 'protected-fast', 'lint-repaired-r2', 'docs-repaired']) {
  assert.equal(gateNative(`${name}.command.json`).exit, 0, name)
  assert.equal(gateArchive.members[`${name}.stderr.raw`].bytes, 0, name)
}
assert.equal(gateNative('official-summary.json').testCount, 20195)
assert.equal(gateNative('official-summary.json').sourceFileCount, 815)
assert.equal(
  sha(readFileSync(`${root}/scripts/coverage/baseline.fast.json`)),
  gateArchive.members['after-baseline.json'].sha256,
)
console.log(
  JSON.stringify({
    inputs: 5,
    outputs: 17,
    mapped: seenNew.size,
    retired: mapping.retired.length,
    original: seenOld.size,
    callbackExact: mapping.mapped.filter((x) => x.callbackEqualAfterPrivateRename).length,
    parserGuards: 3,
    readOnly: true,
    note: 'Version/identity/evidence matched; eight-dimensional semantic judgment is in review.json.',
  }),
)
