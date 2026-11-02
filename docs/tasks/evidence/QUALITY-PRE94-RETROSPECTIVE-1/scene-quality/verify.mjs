import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'

const dir = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(dir, '../../../../..')
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const report = JSON.parse(fs.readFileSync(path.join(dir, 'review.json')))
const stale = [
  ...report.files,
  ...report.context,
  ...report.primary,
  ...report.controlledMetadataDelta,
].filter(
  (pin) =>
    !fs.existsSync(path.join(root, pin.path)) ||
    hash(fs.readFileSync(path.join(root, pin.path))) !== pin.sha256,
)
if (stale.length) {
  console.log(JSON.stringify({ state: 'STALE', affected: stale.map((pin) => pin.path) }))
  process.exitCode = 2
} else {
  for (const file of report.files) assert.deepEqual(Object.keys(file.dimensions), [...'ABCDEFGH'])
  const packed = fs.readFileSync(path.join(dir, report.rawArchive.path))
  assert.equal(hash(packed), report.rawArchive.sha256)
  const archive = new Map()
  for (const [name, item] of Object.entries(JSON.parse(gunzipSync(packed)))) {
    const bytes = Buffer.from(item.base64, 'base64')
    assert.equal(bytes.length, item.bytes, name)
    assert.equal(hash(bytes), item.sha256, name)
    archive.set(name, bytes)
  }
  assert.equal(archive.size, report.rawArchive.entries)
  const raw = (name) => {
    assert(archive.has(name), name)
    return archive.get(name)
  }
  const json = (name) => JSON.parse(raw(name))
  const execution = (id, code) => {
    const result = json(`${id}.execution.json`)
    assert.equal(result.exit, code, id)
    assert.equal(result.signal, null)
    assert.equal(result.spawnError, null)
    assert.equal(raw(`${id}.stdout.raw`).length, result.stdoutBytes)
    assert.equal(raw(`${id}.stderr.raw`).length, result.stderrBytes)
    return result
  }
  const native = (id, passed, failed, pending, files) => {
    execution(id, failed ? 1 : 0)
    const result = json(`${id}.vitest.json`)
    assert.equal(result.numPassedTests, passed)
    assert.equal(result.numFailedTests, failed)
    assert.equal(result.numPendingTests, pending)
    assert.equal(result.numTodoTests, 0)
    assert.equal(result.testResults.length, files)
    const cases = result.testResults.flatMap((file) => file.assertionResults)
    assert.equal(cases.filter((item) => item.status === 'failed').length, failed)
    for (const item of cases.filter((item) => item.status === 'failed')) {
      assert(item.failureMessages.length > 0)
      assert(item.failureMessages.every((message) => message.startsWith('AssertionError:')))
    }
    if (!failed) {
      assert.equal(raw(`${id}.stderr.raw`).length, 0)
      assert(!/\b(?:stdout|stderr)\s*\|/.test(raw(`${id}.stdout.raw`).toString()))
    }
    return cases
  }
  native('baseline', 111, 0, 0, 1)
  native('split-baseline', 111, 0, 0, 1)
  native('adjacent', 478, 0, 0, 10)
  for (const id of ['threshold', 'tile', 'on-enter']) {
    const before = native(`${id}-old`, 1, 0, 110, 1)
    const after = native(`${id}-new`, 0, 1, id === 'on-enter' ? 22 : 74, 1)
    assert.equal(before.filter((test) => test.status === 'passed').length, 1)
    assert.equal(after.filter((test) => test.status === 'failed').length, 1)
    assert.equal(
      raw(`${id}.patch`)
        .toString()
        .split('\n')
        .filter((line) => line.startsWith('@@')).length,
      1,
    )
  }
  const old = json('old-inventory.json'),
    current = json('new-inventory.json')
  assert.equal(old.length, 111)
  assert.equal(current.length, 107)
  const mapping = report.identityMapping.mapping
  assert.equal(mapping.length, old.length)
  assert.equal(new Set(mapping.map((item) => item.before.name)).size, old.length)
  assert.equal(new Set(mapping.map((item) => item.after.name)).size, current.length)
  for (const item of old)
    assert(
      mapping.some((row) => row.before.name === item.name && item.file.endsWith(row.before.file)),
    )
  for (const item of current)
    assert(
      mapping.some((row) => row.after.name === item.name && item.file.endsWith(row.after.file)),
    )
  const ts = createRequire(path.join(root, 'package.json'))('typescript')
  const tokens = (source) => {
    const scanner = ts.createScanner(
      ts.ScriptTarget.Latest,
      true,
      ts.LanguageVariant.Standard,
      source,
    )
    const values = []
    for (;;) {
      const kind = scanner.scan()
      if (kind === ts.SyntaxKind.EndOfFileToken) break
      values.push([kind, scanner.getTokenText()])
    }
    return JSON.stringify(values)
  }
  const node = (source, name) => {
    const ast = ts.createSourceFile('file.ts', source, ts.ScriptTarget.Latest, true)
    const value = ast.statements.find((item) => item.name?.getText(ast) === name)
    assert(value, name)
    return value.getText(ast)
  }
  const before = raw('scene-system.before.ts').toString()
  for (const move of report.continuity.movedBodiesAndTypes) {
    const original = tokens(node(before, move.name))
    const current = tokens(
      node(
        fs.readFileSync(path.join(root, 'packages/game/src/core', move.file), 'utf8'),
        move.name,
      ),
    )
    assert.equal(hash(original), move.tokensSha256)
    assert.equal(current, original, move.name)
  }
  const facade = fs.readFileSync(path.join(root, 'packages/game/src/core/scene-system.ts'), 'utf8')
  for (const name of report.continuity.unchangedFunctions)
    assert.equal(tokens(node(facade, name)), tokens(node(before, name)), name)
  for (const id of [
    'final-typecheck',
    'scoped-static',
    'retirement-tools',
    'docs-final',
    'docs-inputs-final',
    'lint-final',
    'ledger-final',
    'diff-final',
  ]) {
    execution(id, 0)
    assert.equal(raw(`${id}.stderr.raw`).length, 0, id)
  }
  assert.match(raw('lint-final.stdout.raw').toString(), /0 errors \/ 0 warnings \/ 0 infos/)
  assert.match(
    raw('ledger-final.stdout.raw').toString(),
    /3420 files; 414 closed \/ 115 review \/ 2891 pending/,
  )
  assert.match(raw('docs-final.stdout.raw').toString(), /0 issues/)
  assert.equal(raw('diff-final.stdout.raw').length, 0)
  console.log(
    JSON.stringify({
      state: 'MATCH',
      files: report.files.length,
      rawEntries: archive.size,
      identityMapping: '111→107',
      businessCounters: 3,
      unifiedGates: 'DEFERRED',
    }),
  )
}
