import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import zlib from 'node:zlib'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = execFileSync('git', ['rev-parse', '--show-toplevel'], {
  cwd: here,
  encoding: 'utf8',
}).trim()
const hash = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex')
const report = JSON.parse(fs.readFileSync(path.join(here, 'review.json')))
for (const entry of report.context) {
  const bytes = fs.readFileSync(path.join(root, entry.path))
  assert.equal(hash(bytes), entry.sha256, `STALE input: ${entry.path}`)
  assert.equal(bytes.toString().split('\n').length - 1, entry.lines)
}
const source = 'packages/game/src/core/event-system.ts'
const sourceBefore = execFileSync('git', ['show', `${report.base}:${source}`], {
  cwd: root,
  encoding: 'utf8',
})
const sourceCurrent = fs.readFileSync(path.join(root, source), 'utf8')
const ts = createRequire(path.join(root, 'package.json'))('typescript')
const parse = (text) =>
  ts.createSourceFile(source, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
const beforeAst = parse(sourceBefore),
  currentAst = parse(sourceCurrent)
assert.equal(beforeAst.parseDiagnostics.length, 0)
assert.equal(currentAst.parseDiagnostics.length, 0)
function identifierCount(ast) {
  let count = 0
  function visit(node) {
    if (ts.isIdentifier(node) && node.text === '_fadeSec') count++
    ts.forEachChild(node, visit)
  }
  visit(ast)
  return count
}
assert.equal(identifierCount(beforeAst), 1)
assert.equal(identifierCount(currentAst), 0)
let removed = 0
const transformation = ts.transform(beforeAst, [
  (context) => (node) => {
    function visit(child) {
      if (
        ts.isVariableStatement(child) &&
        child.declarationList.declarations.length === 1 &&
        ts.isIdentifier(child.declarationList.declarations[0].name) &&
        child.declarationList.declarations[0].name.text === '_fadeSec'
      ) {
        assert.equal(
          child.getText(beforeAst),
          'const _fadeSec = (operands[0] ?? 0) === 0 ? 2.0 : (operands[0] ?? 0) * 3',
        )
        removed++
        return undefined
      }
      return ts.visitEachChild(child, visit, context)
    }
    return ts.visitNode(node, visit)
  },
])
const printer = ts.createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed })
const expected = printer.printFile(transformation.transformed[0])
const actual = printer.printFile(currentAst)
assert.equal(removed, 1)
assert.equal(actual, expected, 'More than the admitted unused declaration changed')
assert.equal(hash(actual), report.sourceBridge.normalizedSha256)
transformation.dispose()

const bytes = fs.readFileSync(path.join(here, report.receipts.path))
assert.equal(hash(bytes), report.receipts.sha256)
const archive = JSON.parse(zlib.gunzipSync(bytes))
const members = new Map()
for (const entry of archive.members) {
  assert(!members.has(entry.name))
  const raw = Buffer.from(entry.base64, 'base64')
  assert.equal(raw.length, entry.bytes)
  assert.equal(hash(raw), entry.sha256)
  members.set(entry.name, raw)
}
const json = (name) => JSON.parse(members.get(name))
const tests = (name) => json(name).testResults.flatMap((f) => f.assertionResults)
const execution = (id, exit) => {
  const result = json(`${id}.execution.json`)
  assert.equal(result.exit, exit)
  assert.equal(result.signal, null)
  assert.equal(result.spawnError, null)
  if (exit === 0) assert.equal(members.get(`${id}.stderr.raw`).length, 0, `${id} stderr`)
}
execution('baseline', 1)
assert.equal(tests('baseline.native.json').filter((r) => r.status === 'failed').length, 1)
execution('legacy-repaired', 0)
assert.equal(tests('legacy-repaired.native.json').length, 21)
execution('strengthened', 1)
assert.equal(tests('strengthened.native.json').filter((r) => r.status === 'failed').length, 1)
for (const [id, count, files] of [
  ['adjacent', 502, 8],
  ['poison-adjacent', 16, 1],
]) {
  execution(id, 0)
  const native = json(`${id}.native.json`)
  assert.equal(native.testResults.filter((f) => f.assertionResults.length).length, files)
  assert.equal(tests(`${id}.native.json`).length, count)
  assert(tests(`${id}.native.json`).every((r) => r.status === 'passed'))
}
execution('current-typecheck', 0)
execution('current-adjacent', 0)
assert.equal(tests('current-adjacent.native.json').length, 518)
assert(tests('current-adjacent.native.json').every((r) => r.status === 'passed'))
const old = tests('baseline.native.json').map((r) => r.fullName)
const current = json('adjacent.native.json')
  .testResults.filter((f) => f.name.endsWith('/packages/game/src/core/event-opcodes.cov85.test.ts'))
  .flatMap((f) => f.assertionResults.map((r) => r.fullName))
assert.deepEqual(
  report.mapping.map((r) => r.oldFullName),
  old,
)
assert.deepEqual(report.mapping.flatMap((r) => r.newFullNames).sort(), current.sort())
assert.equal(
  report.mapping.filter((r) => r.decision === 'retire-weak-no-business-observation').length,
  1,
)
assert.equal(report.controls.records.length, 3)
for (const record of report.controls.records) {
  execution(`${record.id}-old`, 0)
  execution(`${record.id}-new`, 1)
  assert.equal(record.legacy.passed, 21)
  const red = tests(`${record.id}-new.native.json`).filter((r) => r.status === 'failed')
  assert.equal(red.length, 1)
  assert(red[0].failureMessages.join('').includes('AssertionError'))
  assert.equal(red[0].fullName, record.current.failed[0].fullName)
  assert.equal(record.sourceBefore, record.restoreSha256)
  assert.equal(hash(fs.readFileSync(path.join(root, source))), record.restoreSha256)
  assert.equal(hash(fs.readFileSync(path.join(root, report.files[0].path))), record.newTest)
}
assert(report.controls.sourceRestored && report.controls.testRestored)
const statics = JSON.parse(fs.readFileSync(path.join(here, 'static.json')))
const staticArchive = fs.readFileSync(path.join(here, statics.archive.path))
assert.equal(hash(staticArchive), statics.archive.sha256)
const staticMembers = new Map()
for (const entry of JSON.parse(zlib.gunzipSync(staticArchive)).members) {
  const raw = Buffer.from(entry.base64, 'base64')
  assert.equal(raw.length, entry.bytes)
  assert.equal(hash(raw), entry.sha256)
  staticMembers.set(entry.name, raw)
}
for (const gate of statics.gates) {
  const execution = JSON.parse(staticMembers.get(`${gate.id}.execution.json`))
  assert.equal(execution.exit, 0)
  assert.equal(execution.signal, null)
  assert.equal(execution.spawnError, null)
  assert.equal(staticMembers.get(`${gate.id}.stderr.raw`).length, 0)
}
assert(
  staticMembers
    .get('published-lint.stdout.raw')
    .toString()
    .includes('0 errors / 0 warnings / 0 infos; complete report'),
)
for (const entry of statics.inputs)
  assert.equal(
    hash(fs.readFileSync(path.join(root, entry.path))),
    entry.sha256,
    `STALE static input: ${entry.path}`,
  )

console.log(
  'PASS: readonly scoped source/context, exact unused-declaration AST bridge and full receipts;21→32 identity map, three old-green/new-single-red controls,502+16 recovery, typecheck0. No unified-gate/visual claim.',
)
