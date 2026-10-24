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
const hash = (b) => crypto.createHash('sha256').update(b).digest('hex')
const report = JSON.parse(fs.readFileSync(path.join(here, 'review.json')))
for (const entry of report.context) {
  const bytes = fs.readFileSync(path.join(root, entry.path))
  assert.equal(hash(bytes), entry.sha256, `STALE context: ${entry.path}`)
  assert.equal(bytes.toString().split('\n').length - 1, entry.lines)
}
const packed = fs.readFileSync(path.join(here, report.receipts.path))
assert.equal(hash(packed), report.receipts.sha256)
const members = new Map()
for (const member of JSON.parse(zlib.gunzipSync(packed)).members) {
  assert(!members.has(member.name))
  const bytes = Buffer.from(member.base64, 'base64')
  assert.equal(bytes.length, member.bytes)
  assert.equal(hash(bytes), member.sha256)
  members.set(member.name, bytes)
}
assert.equal(members.size, report.receipts.members)
const json = (name) => JSON.parse(members.get(name))
const tests = (name) => json(name).testResults.flatMap((f) => f.assertionResults)
const execution = (id, expected) => {
  const row = json(`${id}.execution.json`)
  assert.equal(row.exit, expected)
  assert.equal(row.signal, null)
  assert.equal(row.spawnError, null)
  if (expected === 0) assert.equal(members.get(`${id}.stderr.raw`).length, 0)
}
execution('formal-red', 1)
const red = tests('formal-red.native.json').filter((t) => t.status === 'failed')
assert.equal(red.length, 1)
assert.equal(red[0].fullName, report.executions.formalRed.failedFullName)
assert(red[0].failureMessages.join('').includes('AssertionError'))
for (const [id, count] of [
  ['fixed-directed', 7],
  ['adjacent', 102],
]) {
  execution(id, 0)
  const results = tests(`${id}.native.json`)
  assert.equal(results.length, count)
  assert(results.every((t) => t.status === 'passed'))
}
for (const id of report.executions.typecheck) execution(id, 0)
const browserRed = json(report.executions.browser.validRed)
assert.equal(browserRed.failure.name, 'AssertionError')
assert.equal(browserRed.reader.find((r) => r.type === 'error').error.name, 'NotFoundError')
assert.equal(browserRed.writes.length, 0)
assert.equal(browserRed.slotAfter, null)
assert.equal(browserRed.ui.error, null)
for (const name of [report.executions.browser.green, report.executions.browser.final]) {
  const row = json(name)
  assert(!row.failure)
  assert.equal(row.reader.filter((e) => e.type === 'load').length, 0)
  assert.equal(row.writes.length, 0)
  assert.equal(row.slotBefore, null)
  assert.equal(row.slotAfter, null)
  assert.equal(
    row.ui.error,
    `✗ 导入失败:${row.reader.find((e) => e.type === 'error').error.message}`,
  )
  assert.equal(row.ui.success, null)
  assert.equal(row.inputValue, '')
  assert.deepEqual(row.retry.value, {
    dwCash: 87,
    wNumScene: 1,
    party: { x: 160, y: 80, facing: 'left' },
  })
  assert.equal(row.retry.writes.length, 1)
  assert.equal(row.retry.readers.filter((e) => e.type === 'load').length, 1)
  assert.deepEqual(row.diagnostics, [])
  assert.equal(row.browserClosed, true)
}
assert.equal(browserRed.browserClosed, true)
assert.equal(
  hash(fs.readFileSync(path.join(here, 'import-reader-error.png'))),
  hash(members.get('browser-r5/import-reader-error.png')),
)
const ts = createRequire(path.join(root, 'package.json'))('typescript')
const print = (text) => {
  const ast = ts.createSourceFile('x.ts', text, ts.ScriptTarget.Latest, true)
  assert.equal(ast.parseDiagnostics.length, 0)
  return ts.createPrinter({ removeComments: true }).printFile(ast)
}
const git = (rev, p) =>
  execFileSync('git', ['show', `${rev}:${p}`], { cwd: root, encoding: 'utf8' })
const panel = 'packages/game/src/tools/tools-panel.ts'
const added = `      reader.onerror = (): void => {
        showToast(\`${'${'}localize('导入失败:', 'Import failed: ')}${'${'}reader.error?.message ?? ''}\`, {
          type: 'error',
        })
      }
`
const fixed = git(report.fixedBehaviorCommit, panel)
assert.equal(fixed.split(added).length, 2)
assert.equal(
  print(fixed.replace(added, '')),
  print(git(report.base, panel)),
  'Behavior commit must only add approved error handler',
)
const test = 'packages/game/src/tools/tools-panel.save-io.test.ts'
const current = fs.readFileSync(path.join(root, test), 'utf8')
assert.equal(
  print(
    current
      .slice(0, current.indexOf('function importFile'))
      .replace("import { serializeSave } from './save-io.js'\n", ''),
  ),
  print(git(report.base, test)),
  'All four export tests preserved',
)
execFileSync(process.execPath, [path.join(here, 'prove-refactor.cjs')], {
  cwd: root,
  stdio: 'pipe',
})
const statics = JSON.parse(fs.readFileSync(path.join(here, 'static.json')))
const staticBytes = fs.readFileSync(path.join(here, statics.archive.path))
assert.equal(hash(staticBytes), statics.archive.sha256)
const staticMembers = new Map()
for (const entry of JSON.parse(zlib.gunzipSync(staticBytes)).members) {
  const b = Buffer.from(entry.base64, 'base64')
  assert.equal(hash(b), entry.sha256)
  assert.equal(b.length, entry.bytes)
  staticMembers.set(entry.name, b)
}
for (const gate of statics.gates) {
  const result = JSON.parse(staticMembers.get(`${gate.id}.execution.json`))
  assert.equal(result.exit, 0)
  assert.equal(result.signal, null)
  assert.equal(result.spawnError, null)
  assert.equal(staticMembers.get(`${gate.id}.stderr.raw`).length, 0)
}
assert(
  staticMembers
    .get('final-lint.stdout.raw')
    .toString()
    .includes('0 errors / 0 warnings / 0 infos; complete report'),
)
for (const input of statics.inputs)
  assert.equal(
    hash(fs.readFileSync(path.join(root, input.path))),
    input.sha256,
    `STALE static input: ${input.path}`,
  )
console.log(
  'PASS: CODE58 scoped A–H evidence applicability, complete receipts, one formal business red→7 green/102 adjacent, native disk failure+retry, exact refactor and static diagnostics; no unified-gate claim.',
)
