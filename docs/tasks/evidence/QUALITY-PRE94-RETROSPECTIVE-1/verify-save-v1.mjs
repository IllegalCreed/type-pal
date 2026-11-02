// Read-only identity/raw-result check. This does not certify semantic quality or run any tests.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'

const dir = dirname(fileURLToPath(import.meta.url))
const root = resolve(dir, '../../../..')
const hash = (value) => createHash('sha256').update(value).digest('hex')
try {
  const r = JSON.parse(fs.readFileSync(resolve(dir, 'save-v1-local.json'), 'utf8'))
  for (const f of [...r.files, ...r.pins, ...r.images]) {
    assert.equal(hash(fs.readFileSync(resolve(root, f.path))), f.sha256, `STALE ${f.path}`)
  }
  assert.equal(hash(fs.readFileSync(resolve(root, r.evidenceTool.path))), r.evidenceTool.sha256)
  assert.equal(
    hash(fs.readFileSync(resolve(root, r.baselineReview.path))),
    r.baselineReview.afterSha256,
  )
  const archive = fs.readFileSync(resolve(root, r.artifact.path))
  assert.equal(hash(archive), r.artifact.sha256, 'FAIL archive hash')
  const { members } = JSON.parse(gunzipSync(archive))
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
        .map((t) => ({ file: f.name, fullName: t.fullName })),
    )
    assert.deepEqual(
      failed,
      run.failures.map(({ file, fullName }) => ({ file, fullName })),
      run.id,
    )
    for (const f of n.testResults) {
      for (const t of f.assertionResults.filter((t) => t.status === 'failed')) {
        assert(
          t.failureMessages[0]?.startsWith('AssertionError:'),
          'Counter must fail at a business assertion',
        )
      }
    }
  }
  assert.equal(r.counter.beforeSha256, r.counter.restoredSha256)
  assert.equal(hash(fs.readFileSync(resolve(root, r.counter.path))), r.counter.restoredSha256)
  const report = JSON.parse(members['native-browser-report.json'])
  assert.deepEqual(report.browser, r.browser.record)
  assert.deepEqual(report.cleanup, r.browser.cleanup)
  assert.deepEqual(report.browser.initialDatabases, [])
  assert.deepEqual(report.browser.errors, [])
  assert.deepEqual(
    report.browser.results.map((v) => v.kind),
    ['cash', 'hp', 'legacy'],
  )
  assert(report.browser.results.every((v) => v.pass && v.inputValueReset))
  assert.equal(report.cleanup.pass, true)
  assert.deepEqual(report.cleanup.after, [])
  const nested = JSON.parse(members['native-nested-report.json'])
  assert.deepEqual(nested.browser, r.nestedBrowser.record)
  assert.deepEqual(nested.cleanup, r.nestedBrowser.cleanup)
  assert.deepEqual(nested.browser.initialDatabases, [])
  assert.deepEqual(nested.browser.errors, [])
  assert.deepEqual(
    nested.browser.results.map((v) => v.kind),
    ['dialog', 'battle'],
  )
  assert(nested.browser.results.every((v) => v.pass && v.inputValueReset))
  assert.equal(nested.browser.results[0].slot.dialogHasLineCount, false)
  assert.equal(nested.browser.results[1].slot.battleHasMenuState, false)
  assert.equal(nested.browser.results[1].slot.storedHaste, false)
  assert.equal(nested.cleanup.owner, nested.cleanup.marker)
  assert.equal(nested.cleanup.pass, true)
  assert.deepEqual(nested.cleanup.after, [])
  for (const f of r.files) {
    assert.equal(hash(members[`frozen-candidate/${f.path}`]), f.sha256, f.path)
  }
  const history = JSON.parse(
    gunzipSync(
      execFileSync(
        'git',
        [
          'show',
          `${r.historyCompatibility.evidence.split('@')[1]}:docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/save-wire-contract-native.json.gz`,
        ],
        { cwd: root },
      ),
    ),
  )
  const parts = history.members['v2-nested-parts.json']
  assert.equal(hash(parts), r.historyCompatibility.nativePartsSha256)
  assert.deepEqual(
    JSON.parse(parts),
    JSON.parse(fs.readFileSync(resolve(root, r.historyCompatibility.fixture), 'utf8')),
  )
  for (const e of r.priorEvidence) {
    execFileSync('git', ['cat-file', '-e', `${e.commit}:${e.path}`], { cwd: root, stdio: 'pipe' })
  }
  console.log(
    JSON.stringify({
      status: 'MATCH',
      scope:
        'Current identities, complete raw members, native run claims and owned browser observation only',
      files: r.files.length,
      gates: r.gates.state,
      note: 'No tests, mutations, network, writes or semantic acceptance performed',
      receipt: relative(root, resolve(dir, 'save-v1-local.json')),
    }),
  )
} catch (error) {
  console.error(error.code === 'ENOENT' ? `MISSING: ${error.message}` : error.message)
  process.exitCode = 1
}
