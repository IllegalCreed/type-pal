import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'
import { analyzeOrganization } from '../QUALITY-PENDING-100-3/organization-program.mjs'

const directory = dirname(fileURLToPath(import.meta.url))
const root = resolve(directory, '../../../..')
const read = (name) => readFileSync(resolve(directory, name))
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')
const proof = JSON.parse(read('proof.json'))
const ts = createRequire(resolve(root, 'package.json'))('typescript')
const printer = ts.createPrinter({ removeComments: true })
const syntax = (source) => {
  const file = ts.createSourceFile('x.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  assert.equal(file.parseDiagnostics.length, 0)
  return printer.printFile(file)
}
const equal = (a, b) => syntax(a) === syntax(b)
assert.ok(equal('const a = 1 // comment', 'const a=1'))
assert.ok(!equal('const a = {first: 1, last: 2}', 'const a = {first: 1, last: 3}'))
assert.ok(!equal('expect(1).toBe(1)', 'expect(1).toBe'))
const before = {},
  after = {}
for (const entry of proof.inputs) {
  const bytes = execFileSync('git', ['show', `${proof.base}:${entry.path}`], { cwd: root })
  assert.equal(sha(bytes), entry.sha256, entry.path)
  before[entry.path] = bytes.toString()
}
for (const entry of [...proof.outputs, ...proof.context]) {
  const bytes = readFileSync(resolve(root, entry.path))
  assert.equal(sha(bytes), entry.sha256, `STALE ${entry.path}`)
  after[entry.path] = bytes.toString()
}
for (const entry of proof.products) {
  assert.ok(equal(before[entry.path], after[entry.path]), `Executable delta ${entry.path}`)
  assert.equal(sha(syntax(before[entry.path])), entry.before)
  assert.equal(sha(syntax(after[entry.path])), entry.after)
}
const specs = (sources) =>
  Object.fromEntries(Object.entries(sources).filter(([p]) => p.endsWith('.test.ts')))
const closure = read('dependency-closures.json.gz')
assert.equal(sha(closure), proof.closureSha256)
assert.deepEqual(
  {
    before: analyzeOrganization(root, specs(before)),
    after: analyzeOrganization(root, specs(after)),
  },
  JSON.parse(gunzipSync(closure)),
)
const archive = JSON.parse(gunzipSync(read('raw.json.gz')))
for (const [name, entry] of Object.entries(archive.members)) {
  const bytes = Buffer.from(entry.base64, 'base64')
  assert.equal(bytes.length, entry.bytes, name)
  assert.equal(sha(bytes), entry.sha256, name)
}
const native = (name) => JSON.parse(Buffer.from(archive.members[name].base64, 'base64'))
const recordedRoot = resolve(native('before-command.json').cwd, '../..')
const identities = (name) =>
  native(name).testResults.flatMap((f) =>
    f.assertionResults.map((t) => ({ ...t, file: f.name.replace(`${recordedRoot}/`, '') })),
  )
const oldCases = identities('before.json'),
  newCases = identities('directed-final.json')
const seenOld = new Set(),
  seenNew = new Set()
function match(report, entry, seen) {
  const key = `${entry.file}#${entry.fullName}`
  assert.ok(!seen.has(key), `duplicate identity ${key}`)
  seen.add(key)
  const matches = report.filter((x) => x.file === entry.file && x.fullName === entry.fullName)
  assert.equal(matches.length, 1, key)
  assert.equal(matches[0].status, 'passed', key)
}
for (const mapping of proof.mapping) {
  match(oldCases, mapping.from, seenOld)
  match(newCases, mapping.to, seenNew)
}
for (const entry of proof.added) match(newCases, entry, seenNew)
assert.equal(seenOld.size, oldCases.length)
assert.equal(
  seenNew.size,
  newCases.filter((x) => proof.outputs.some((p) => p.path === x.file)).length,
)
assert.equal(native('counter-old.json').numFailedTests, 0)
assert.equal(native('counter-old.json').numPassedTests, 1)
const failed = identities('counter-new.json').filter((t) => t.status === 'failed')
assert.equal(failed.length, 1)
assert.equal(
  failed[0].title,
  'renders the full-width separators in a real English attribute description as blank space',
)
assert.ok(failed[0].failureMessages.some((x) => x.includes('AssertionError') && x.includes('60')))
assert.equal(native('counter-restore.json').restored, true)
assert.equal(native('directed-final-command.json').exit, 0)
assert.equal(native('extraction-adjacent-command.json').exit, 0)
assert.equal(archive.members['directed-final.stderr'].bytes, 0)
assert.equal(archive.members['extraction-adjacent.stderr'].bytes, 0)
const gates = JSON.parse(read('gates.json'))
assert.equal(gates.complete, true, 'Unified gates incomplete: no integration credit')
for (const name of gates.required) {
  assert.equal(native(`${name}-command.json`).exit, 0, name)
  assert.equal(archive.members[`${name}.stderr`].bytes, 0, name)
}
for (const entry of gates.controls) {
  assert.equal(sha(readFileSync(resolve(root, entry.path))), entry.sha256, `STALE ${entry.path}`)
}
const report = native('official-summary.json')
assert.equal(report.testCount, 20205)
assert.equal(report.sourceFileCount, 816)
assert.equal(native('official-coverage-recovered-command.json').exit, 1)
assert.equal(native('full-check-command.json').exit, 1)
console.log(
  JSON.stringify({
    inputs: 14,
    outputs: 21,
    mapped: seenOld.size,
    currentCases: seenNew.size,
    newCases: proof.added.length,
    productExecutableChanges: 0,
    readOnly: true,
    scope:
      'Version/identity/raw evidence matched. Semantic acceptance and limits remain in review.json.',
  }),
)
