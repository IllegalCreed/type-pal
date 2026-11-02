// Read-only evidence/identity check. This does not certify semantic design or rerun tests.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'
import ts from 'typescript'

const dir = dirname(fileURLToPath(import.meta.url))
const root = resolve(dir, '../../../../..')
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const read = (path) => fs.readFileSync(resolve(root, path))
try {
  const r = JSON.parse(fs.readFileSync(resolve(dir, 'evidence.json'), 'utf8'))
  for (const f of [...r.files, ...r.pins, ...r.priorEvidence, ...r.tools]) {
    assert.equal(hash(read(f.path)), f.sha256, `STALE ${f.path}`)
  }
  const packed = read(r.artifact.path)
  assert.equal(hash(packed), r.artifact.sha256, 'archive')
  const { members } = JSON.parse(gunzipSync(packed))
  assert.deepEqual(Object.keys(members).sort(), r.artifact.members.map((m) => m.name).sort())
  for (const m of r.artifact.members) {
    assert.equal(Buffer.byteLength(members[m.name]), m.bytes, m.name)
    assert.equal(hash(members[m.name]), m.sha256, m.name)
  }
  for (const run of r.runs) {
    const e = JSON.parse(members[`${run.id}.execution.json`])
    assert.equal(e.exit, run.exit, run.id)
    assert.equal(e.signal, null, run.id)
    assert.equal(e.spawnError, null, run.id)
    for (const stream of ['stdout', 'stderr']) {
      assert.equal(hash(members[e[stream].member]), e[stream].sha256, run.id)
    }
    if (run.passed === undefined) continue
    const n = JSON.parse(members[`${run.id}.native.json`])
    assert.equal(n.numPassedTests, run.passed, run.id)
    assert.equal(n.numFailedTests, run.failed, run.id)
    assert.equal(n.numPendingTests, run.pending, run.id)
    const failed = n.testResults.flatMap((f) =>
      f.assertionResults
        .filter((t) => t.status === 'failed')
        .map((t) => {
          assert(t.failureMessages[0]?.startsWith('AssertionError:'), run.id)
          return { file: f.name, fullName: t.fullName }
        }),
    )
    assert.deepEqual(failed, run.failures, run.id)
  }
  for (const name of ['fullCheck', 'ratchet', 'protectedFast']) {
    const id = r.gates[name]?.id
    if (!id) continue
    const run = JSON.parse(members[`${id}.execution.json`])
    const scan = JSON.parse(members[`${id}.diagnostics.json`])
    assert.equal(run.exit, 0, id)
    assert.equal(run.stderr.bytes, 0, id)
    assert(
      Object.values(scan.diagnostics).every((count) => count === 0),
      id,
    )
    assert.equal(scan.vitestTotal, r.gates[name].tests, id)
  }
  if (r.baseline) assert.equal(hash(read(r.baseline.path)), r.baseline.sha256, 'STALE baseline')
  const printer = ts.createPrinter({ removeComments: true })
  const print = (s) =>
    printer.printFile(
      ts.createSourceFile('file.ts', s, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS),
    )
  for (const [path, claim] of Object.entries(r.reuse.sourceProof)) {
    if (!claim.originalEvidence) continue
    const previous = gunzipSync(
      fs.readFileSync(resolve(dir, '..', claim.originalEvidence)),
    ).toString()
    assert.equal(print(read(path).toString()), print(previous), path)
    assert.equal(hash(print(previous)), claim.printedSha256, path)
  }
  for (const f of r.reuse.sourceProof.inputs) assert.equal(hash(read(f.path)), f.sha256, f.path)
  assert.equal(r.newCounter.beforeSha256, r.newCounter.restoredSha256)
  assert.equal(hash(read(r.newCounter.path)), r.newCounter.restoredSha256)
  assert.equal(r.retirement.beforeSha256, r.retirement.restoredSha256)
  assert.equal(hash(read(r.retirement.source)), r.retirement.restoredSha256)
  assert.deepEqual(
    r.retirement.beforeFailures.filter((n) => !r.retirement.afterFailures.includes(n)),
    [r.retirement.removedIdentity],
  )
  const native = JSON.parse(members['rescale-native.json'])
  assert(native.runs.every((e) => e.exit === 0 && e.stderr === ''))
  assert.equal(native.fixture.reductions, 1)
  const fixture = JSON.parse(read('packages/shared/src/__tests__/yj2-rescale.json'))
  assert.equal(fixture.compressedHex, native.fixture.hex)
  assert.equal(hash(Buffer.from(fixture.compressedHex, 'hex')), native.compressedSha256)
  const expected = Buffer.from(
    Array.from({ length: 33024 }, (_, i) => (i < 32600 ? 0x41 : (i * 17 + 23) & 255)),
  )
  assert.equal(hash(expected), native.expectedSha256)
  const current = read('scripts/coverage/approved-test-retirements.mjs').toString()
  const previous = execFileSync(
    'git',
    ['show', `${r.base}:scripts/coverage/approved-test-retirements.mjs`],
    { cwd: root, encoding: 'utf8' },
  )
  const matcher = (text) => {
    const ast = ts.createSourceFile('x.ts', text, ts.ScriptTarget.Latest, true)
    const fn = ast.statements.find(
      (n) => ts.isFunctionDeclaration(n) && n.name?.text === 'isApprovedTestRetirement',
    )
    assert(fn)
    return printer.printNode(ts.EmitHint.Unspecified, fn, ast)
  }
  assert.equal(matcher(current), matcher(previous), 'retirement predicate')
  console.log(
    JSON.stringify({
      status: 'MATCH',
      files: r.files.length,
      gates: r.gates.state,
      scope:
        'Current fingerprints, raw result sets, reused native inputs and explicit counter/fixture provenance. No tests, compiler, mutations, network or semantic certification.',
    }),
  )
} catch (error) {
  console.error(error.code === 'ENOENT' ? `MISSING: ${error.message}` : error.message)
  process.exitCode = 1
}
