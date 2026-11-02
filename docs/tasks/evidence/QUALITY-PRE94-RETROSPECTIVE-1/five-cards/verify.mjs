/** Read-only identity/native verifier; semantic judgments remain in review.json. */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'

const here = dirname(fileURLToPath(import.meta.url))
const root = execFileSync('git', ['rev-parse', '--show-toplevel'], {
  cwd: here,
  encoding: 'utf8',
  env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
}).trim()
const sha = (b) => createHash('sha256').update(b).digest('hex')
const inside = (p) => {
  const absolute = resolve(root, p)
  assert(absolute.startsWith(root + sep), 'path outside repository')
  return absolute
}
let phase = 'integrity'
try {
  const r = JSON.parse(readFileSync(process.argv[2] ?? resolve(here, 'review.json'), 'utf8'))
  assert(r.nativeArtifact, 'unsealed packet')
  const packed = readFileSync(inside(r.nativeArtifact.path))
  assert.equal(sha(packed), r.nativeArtifact.sha256, 'archive SHA')
  const { members } = JSON.parse(gunzipSync(packed))
  for (const m of r.nativeArtifact.members) {
    assert.equal(typeof members[m.name], 'string', `missing member:${m.name}`)
    const b = Buffer.from(members[m.name])
    assert.equal(b.length, m.bytes, `member bytes:${m.name}`)
    assert.equal(sha(b), m.sha256, `member SHA:${m.name}`)
  }
  assert.deepEqual(
    Object.keys(members).sort(),
    r.nativeArtifact.members.map((m) => m.name).sort(),
    'archive member set',
  )
  assert.equal(
    new Set(r.nativeArtifact.members.map((m) => m.name)).size,
    r.nativeArtifact.members.length,
    'duplicate manifest member',
  )
  const critical = {
    'poison-item-before': [1, 2, 2],
    'poison-item-after': [0, 242, 0],
    'magic-poison-old-mutant': [0, 41, 0],
    'magic-use-old-mutant': [0, 41, 0],
    'magic-poison-sealed-mutant': [1, 34, 1],
    'magic-use-sealed-mutant': [1, 34, 1],
    'magic-sealed': [0, 35, 0],
    'dev-dump-old-mutant': [0, 4, 0],
    'dev-dump-new-mutant': [1, 2, 1],
    'dev-five-final': [0, 43, 0],
    'inspect-typed': [0, 15, 0],
    'status-leaf-sealed': [0, 4, 0],
    'status-main-sealed': [0, 5, 0],
  }
  for (const [id, [exit, passed, failed]] of Object.entries(critical)) {
    const check = r.nativeChecks.find((c) => c.id === id)
    assert(check, `missing critical native:${id}`)
    assert.deepEqual(
      [check.exit, check.passed, check.failedFullNames.length],
      [exit, passed, failed],
      `critical native contract:${id}`,
    )
  }
  const execution = (id) => {
    const run = JSON.parse(members[`${id}.execution.json`])
    assert.equal(run.id, id, `run identity:${id}`)
    for (const stream of ['stdout', 'stderr']) {
      const b = Buffer.from(members[`${id}.${stream}.raw`])
      assert.equal(b.length, run[stream].bytes, `run bytes:${id}.${stream}`)
      assert.equal(sha(b), run[stream].sha256, `run SHA:${id}.${stream}`)
    }
    assert.equal(run.signal, null, `signal:${id}`)
    assert.equal(run.spawnError, null, `spawn:${id}`)
    return run
  }
  for (const expected of r.nativeChecks) {
    const run = execution(expected.id)
    const native = JSON.parse(members[`${expected.id}.native.json`])
    const failed = native.testResults
      .flatMap((f) => f.assertionResults)
      .filter((t) => t.status === 'failed')
    assert.equal(run.exit, expected.exit, `exit:${expected.id}`)
    assert.equal(native.numPassedTests, expected.passed, `passed:${expected.id}`)
    assert.deepEqual(
      failed.map((t) => t.fullName).sort(),
      [...expected.failedFullNames].sort(),
      `failure identity:${expected.id}`,
    )
    if (expected.businessRed)
      for (const t of failed)
        assert(t.failureMessages[0].startsWith('AssertionError:'), `nonbusiness red:${expected.id}`)
    if (expected.exit === 0) {
      assert.equal(native.numFailedTests, 0, `failed:${expected.id}`)
      assert.equal(native.numPendingTests, 0, `pending:${expected.id}`)
      assert.equal(run.stderr.bytes, 0, `stderr:${expected.id}`)
    }
  }
  if (r.integration.status === 'passed') {
    const required = ['check', 'ratchet', 'protected', 'docs', 'lint', 'ledger', 'diff']
    assert.deepEqual(
      r.integration.gates.map((g) => g.role).sort(),
      [...required].sort(),
      'missing final gate',
    )
    assert.equal(
      new Set(r.integration.gates.map((g) => g.id)).size,
      required.length,
      'duplicate final gate',
    )
    for (const { id, role } of r.integration.gates) {
      const run = execution(id)
      assert.equal(run.role, role, `gate role:${id}`)
      assert.equal(run.exit, 0, `gate exit:${id}`)
      const scan = JSON.parse(members[`${id}.scan.json`])
      assert(
        Object.values(scan.diagnostics).every((v) => v === 0),
        `gate diagnostics:${id}`,
      )
    }
    for (const role of ['ratchet', 'protected']) {
      const { id } = r.integration.gates.find((g) => g.role === role)
      const summary = JSON.parse(members[`${id}.coverage-summary.json`])
      assert(summary.sourceFileCount > 0 && summary.testCount > 0, `empty coverage:${id}`)
    }
  }
  phase = 'version'
  const files = Object.values(r.slices).flatMap((s) => s.files ?? [])
  for (const f of [
    ...files,
    ...r.currentContext,
    ...(r.gateSupport ?? []),
    ...r.dependencyBindings,
    ...r.reusedArtifacts,
  ])
    assert.equal(sha(readFileSync(inside(f.path))), f.sha256, `stale:${f.path}`)
  phase = 'integrity'
  for (const f of files)
    assert.deepEqual(
      Object.keys(f.dimensions).sort(),
      [...'ABCDEFGH'],
      `missing dimensions:${f.path}`,
    )
  for (const f of files)
    assert(
      Object.values(f.dimensions).every((v) => typeof v === 'string' && v.trim()),
      `blank dimension:${f.path}`,
    )
  for (const path of r.eligibleClosures)
    assert(
      files.some((f) => f.path === path),
      `unreviewed closure:${path}`,
    )
  assert.equal(r.eligibleClosures.length, new Set(r.eligibleClosures).size, 'duplicate closure')
  for (const input of r.externalInputs ?? []) {
    phase = 'integrity'
    const absolute = inside(input.path)
    phase = 'inputs'
    const bytes = readFileSync(absolute)
    phase = 'version'
    assert.equal(sha(bytes), input.sha256, `stale external input:${input.path}`)
  }
  console.log(
    JSON.stringify({
      status: 'matched',
      gates: r.integration.status,
      fileRecords: files.length,
      externalInputs: r.externalInputs?.length ?? 0,
      semantic: 'not-machine-certified',
      limit: 'No browser/story-E2E or whole-card acceptance;see bounded A-H judgments.',
    }),
  )
} catch (e) {
  console.error(
    JSON.stringify({
      status: phase === 'inputs' ? 'input-unavailable' : phase === 'version' ? 'stale' : 'invalid',
      message: e.message,
    }),
  )
  process.exitCode = phase === 'inputs' ? 3 : phase === 'version' ? 2 : 1
}
