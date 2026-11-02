import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'

const dir = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(dir, '../../../../..')
const read = (p) => fs.readFileSync(path.join(root, p))
const hash = (b) => crypto.createHash('sha256').update(b).digest('hex')
const report = JSON.parse(fs.readFileSync(path.join(dir, 'review.json')))
const pins = [
  ...report.files,
  ...report.hostAcceptanceInputs,
  ...report.reusedEvidence,
  ...report.dependencyPins,
]
const stale = pins.filter((p) => hash(read(p.path)) !== p.sha256)
if (stale.length) {
  console.log(JSON.stringify({ state: 'STALE', files: stale.map((p) => p.path) }))
  process.exitCode = 2
} else {
  const packed = fs.readFileSync(path.join(dir, report.receipts.path))
  assert.equal(hash(packed), report.receipts.sha256)
  const archive = JSON.parse(gunzipSync(packed))
  assert.equal(Object.keys(archive).length, report.receipts.entries)
  const raw = (name) => {
    const record = archive[name]
    assert(record, name)
    const bytes = Buffer.from(record.base64, 'base64')
    assert.equal(hash(bytes), record.sha256, name)
    assert.equal(bytes.length, record.bytes, name)
    return bytes
  }
  for (const name of Object.keys(archive)) raw(name)
  const json = (name) => JSON.parse(raw(name))
  const execution = (id, expectedExit) => {
    const r = json(`${id}.execution.json`)
    assert.equal(r.exit, expectedExit, id)
    assert.equal(r.signal, null, id)
    assert.equal(r.spawnError, null, id)
    assert.equal(raw(`${id}.stdout.raw`).length, r.stdoutBytes, id)
    assert.equal(raw(`${id}.stderr.raw`).length, r.stderrBytes, id)
  }
  const statics = JSON.parse(fs.readFileSync(path.join(dir, 'static.json')))
  const staticPacked = fs.readFileSync(path.join(dir, statics.receipts.path))
  assert.equal(hash(staticPacked), statics.receipts.sha256)
  const staticRaw = JSON.parse(gunzipSync(staticPacked))
  assert.equal(Object.keys(staticRaw).length, statics.receipts.entries)
  for (const [name, record] of Object.entries(staticRaw)) {
    const bytes = Buffer.from(record.base64, 'base64')
    assert.equal(bytes.length, record.bytes, name)
    assert.equal(hash(bytes), record.sha256, name)
  }
  for (const r of statics.checks) {
    assert.equal(r.exit, r.id === 'docs-final' ? 1 : 0, r.id)
    if (r.exit === 0) assert.equal(r.stderrBytes, 0, r.id)
  }
  const lintOutput = Buffer.from(staticRaw['lint-final.stdout.raw'].base64, 'base64').toString()
  assert(lintOutput.includes('0 errors / 0 warnings / 0 infos'))
  const native = json('final-adjacent.vitest.json')
  execution('final-adjacent', 0)
  execution('final-types', 0)
  assert.equal(raw('final-adjacent.stderr.raw').length, 0)
  assert.equal(raw('final-types.stderr.raw').length, 0)
  assert.equal(native.numPassedTests, 241)
  assert.equal(native.numFailedTests, 0)
  assert.equal(native.numPendingTests, 0)
  assert.equal(native.testResults.length, 5)
  const baseline = json('baseline-reused-opcode-adjacent.vitest.json')
  const ordered = (result) => result.testResults.toSorted((a, b) => a.name.localeCompare(b.name))
  const identities = ordered(baseline).map((a, i) => {
    const b = ordered(native)[i]
    assert.equal(a.name, b.name)
    assert.equal(a.assertionResults.length, b.assertionResults.length)
    return {
      path: a.name.split('/type-pal/').at(-1),
      count: a.assertionResults.length,
      renames: a.assertionResults.flatMap((x, j) => {
        const y = b.assertionResults[j]
        return x.fullName === y.fullName ? [] : [{ before: x.fullName, after: y.fullName }]
      }),
    }
  })
  // Python's bytewise path order and localeCompare agree for these five ASCII paths.
  assert.deepEqual(identities, report.identity)
  const require = createRequire(import.meta.url)
  const ts = createRequire(path.join(root, 'package.json'))('typescript')
  const { runtime } = require('./prove-runtime.cjs')
  const proof = JSON.parse(
    execFileSync(process.execPath, [path.join(dir, 'prove-runtime.cjs')], { cwd: root }),
  )
  assert.deepEqual(proof, report.sourceProof)
  const source = report.files[0].path
  const git = (rev, p) =>
    execFileSync('git', ['show', `${rev}:${p}`], { cwd: root, maxBuffer: 4 * 1024 * 1024 })
  for (const summary of report.counterSummary) {
    const counter = json(summary)
    assert.equal(counter.sourceRestored, true)
    assert.equal(counter.testRestored, true)
    const rev =
      summary === 'counters.json' ? report.base : 'd8bd3ec81bc2dfb41894c2a54ab7da5038302608'
    const bytes = git(rev, source)
    assert.equal(hash(bytes), counter.sourceSha256)
    assert.equal(runtime(bytes.toString()), runtime(read(source).toString()))
  }
  for (const id of report.counters) {
    execution(`${id}-old`, 0)
    execution(`${id}-new`, 1)
    const before = json(`${id}-old.vitest.json`)
    const after = json(`${id}-new.vitest.json`)
    assert.equal(before.numPassedTests, 1, id)
    assert.equal(before.numFailedTests, 0, id)
    assert.equal(after.numPassedTests, 0, id)
    assert.equal(after.numFailedTests, 1, id)
    const failures = after.testResults
      .flatMap((r) => r.assertionResults)
      .filter((r) => r.status === 'failed')
    assert.equal(failures.length, 1, id)
    assert(
      failures[0].failureMessages.every((m) => m.startsWith('AssertionError:')),
      id,
    )
    assert.equal(
      raw(`${id}.patch`)
        .toString()
        .split('\n')
        .filter((l) => l.startsWith('@@')).length,
      1,
      id,
    )
  }
  const currentMain = read(report.files[1].path).toString()
  const exactAdditionalAssertion =
    '    expect(roster[0]!.e).toMatchObject({ id: 100, health: 200 })\n'
  assert.equal(currentMain.split(exactAdditionalAssertion).length, 2)
  assert.equal(
    currentMain.replace(exactAdditionalAssertion, ''),
    raw('counter-candidate.test.ts').toString(),
  )
  const tokens = (source) => {
    const scan = ts.createScanner(ts.ScriptTarget.Latest, true, ts.LanguageVariant.Standard, source)
    const result = []
    for (;;) {
      const k = scan.scan()
      if (k === ts.SyntaxKind.EndOfFileToken) return JSON.stringify(result)
      result.push([k, scan.getTokenText()])
    }
  }
  const withoutStatusCase = (source) => {
    const ast = ts.createSourceFile('f.ts', source, ts.ScriptTarget.Latest, true)
    let count = 0
    const transformed = ts.transform(ast, [
      (context) => (node) => {
        function visit(n) {
          if (
            ts.isExpressionStatement(n) &&
            ts.isCallExpression(n.expression) &&
            n.expression.expression.getText(ast) === 'test' &&
            ts.isStringLiteral(n.expression.arguments[0]) &&
            n.expression.arguments[0].text.startsWith('复用槽非空毒')
          ) {
            count++
            return undefined
          }
          return ts.visitEachChild(n, visit, context)
        }
        return ts.visitNode(node, visit)
      },
    ])
    const printed = ts.createPrinter({ removeComments: true }).printFile(transformed.transformed[0])
    transformed.dispose()
    assert.equal(count, 1)
    return tokens(printed)
  }
  const currentSlot = read(report.files[2].path).toString()
  assert.equal(
    withoutStatusCase(currentSlot),
    withoutStatusCase(raw('counter-candidate.summon.test.ts').toString()),
  )
  assert.equal(currentSlot, raw('counter-status-candidate.summon.test.ts').toString())
  const host = JSON.parse(
    execFileSync(
      process.execPath,
      ['docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/battle-main-quality/verify.mjs'],
      { cwd: root },
    ),
  )
  assert.equal(host.state, 'MATCH')
  for (const f of report.files) assert.deepEqual(Object.keys(f.dimensions), [...'ABCDEFGH'])
  console.log(
    JSON.stringify({
      state: 'MATCH',
      codeAcceptedCards: report.codeAcceptance.cards,
      finalAdjacent: 241,
      mainIdentities: 160,
      slotIdentities: 4,
      mappedTitles: 8,
      businessCounters: 6,
      hostEvidence: host.state,
      unifiedGates: 'DEFERRED',
    }),
  )
}
