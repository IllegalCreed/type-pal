import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'

const root = fileURLToPath(new URL('../../../../../', import.meta.url))
const directory = fileURLToPath(new URL('./', import.meta.url))
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const json = (path) => JSON.parse(readFileSync(path, 'utf8'))
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim()
function stale(message) {
  const error = new Error(`STALE: ${message}`)
  error.code = 'STALE'
  throw error
}
function local(base, name) {
  const path = resolve(base, name)
  assert(path.startsWith(`${resolve(base)}${sep}`), 'path outside evidence/repository')
  return path
}
function verify() {
  assert.equal(process.argv.length, 2, 'usage: node cli-slice-closeout/verify.mjs (read only)')
  const review = json(resolve(directory, 'review.json'))
  if (review.gateState !== 'passed') stale('window gates not yet sealed')
  assert.match(review.codeCommit, /^[a-f\d]{40}$/)
  const changed = git(
    'diff',
    '--name-only',
    review.codeCommit,
    '--',
    'packages',
    'scripts',
    'package.json',
    'pnpm-lock.yaml',
    'pnpm-workspace.yaml',
    '.github/workflows',
  )
  const untracked = git('ls-files', '--others', '--exclude-standard', '--', 'packages', 'scripts')
  if (changed || untracked) stale(`code/dependency/gate inputs changed: ${changed}\n${untracked}`)
  for (const file of [...review.files, ...review.contextPins]) {
    if (hash(readFileSync(local(root, file.path))) !== file.sha256) stale(file.path)
    if (file.dimensions) assert.deepEqual(Object.keys(file.dimensions).sort(), [...'ABCDEFGH'])
  }
  const members = {}
  for (const artifact of review.artifacts) {
    const bytes = readFileSync(local(directory, artifact.member))
    assert.equal(hash(bytes), artifact.sha256, artifact.member)
    const unpacked = JSON.parse(gunzipSync(bytes)).members
    assert.deepEqual(Object.keys(unpacked).sort(), artifact.members.map((m) => m.name).sort())
    for (const item of artifact.members) {
      const value = unpacked[item.name]
      assert.equal(typeof value, 'string')
      assert.equal(Buffer.byteLength(value), item.bytes, item.name)
      assert.equal(hash(value), item.sha256, item.name)
      assert(!Object.hasOwn(members, item.name), 'duplicate member')
      members[item.name] = value
    }
  }
  const nativeIdentities = (id) =>
    JSON.parse(members[`${id}.native.json`]).testResults.flatMap((f) =>
      f.assertionResults.map((t) => ({
        file: relative(JSON.parse(members[`${id}.execution.json`]).cwd, f.name),
        fullName: t.fullName,
        status: t.status,
        messages: t.failureMessages,
      })),
    )
  for (const expected of review.runs) {
    const run = JSON.parse(members[`${expected.id}.execution.json`])
    assert.equal(run.exit, expected.exit, expected.id)
    assert.equal(run.signal, null)
    assert.equal(run.spawnError, null)
    if (run.stdout?.member) {
      for (const stream of ['stdout', 'stderr']) {
        assert.equal(hash(members[run[stream].member]), run[stream].sha256)
        assert.equal(Buffer.byteLength(members[run[stream].member]), run[stream].bytes)
      }
    }
    if (expected.passed !== undefined) {
      const n = JSON.parse(members[`${expected.id}.native.json`])
      assert.equal(n.numPassedTests, expected.passed)
      assert.equal(n.numFailedTests, expected.failed)
      assert.equal(n.numPendingTests, 0)
      const failures = nativeIdentities(expected.id).filter((t) => t.status === 'failed')
      assert.deepEqual(
        failures.map(({ file, fullName }) => ({ file, fullName })),
        expected.failures,
      )
      if (expected.failed)
        assert(failures.every((t) => t.messages.every((m) => /AssertionError/.test(m))))
    }
  }
  const baseline = nativeIdentities('baseline')
    .map(({ file, fullName }) => `${file}\0${fullName}`)
    .sort()
  const restored = [
    ...nativeIdentities('directed-final').filter(
      (t) => !t.file.endsWith('cli-global-entries.glm-q.test.ts'),
    ),
    ...nativeIdentities('hooks-recovery'),
  ]
  const keys = restored.map(({ file, fullName }) => `${file}\0${fullName}`)
  assert.equal(new Set(keys).size, keys.length)
  assert(
    baseline.every((key) => keys.includes(key)),
    'old business identity disappeared',
  )
  for (const id of review.gates) {
    const diag = JSON.parse(members[`${id}.diagnostics.json`])
    assert.equal(diag.exit, 0)
    assert(
      Object.values(diag.diagnostics).every((n) => n === 0),
      `diagnostics ${id}`,
    )
  }
  const proof = JSON.parse(members['refactor-proof.json'])
  assert(
    proof.collectorMovedStatementsExact && proof.remainingCliJsEqualAfterExactlyTwoDeadMapWrites,
  )
  assert.equal(proof.collectorRuntimeImports, 0)
  assert(
    proof.raw.legacyCollectionEqual &&
      proof.raw.exactRecompile &&
      proof.raw.labelInstrumentationOutputEqual,
  )
  assert.equal(proof.raw.sites.length, 17)
  assert(JSON.parse(members['fixture-proof.json']).exact)
  const ledger = readFileSync(resolve(root, 'docs/ops/audits/code-quality-file-ledger.md'), 'utf8')
    .split('| 文件 | 类别 | 状态 | 证据 / 验证 | 备注 |')[1]
    .split('\n\n')[0]
  for (const path of review.acceptedAfterGates)
    assert(
      ledger
        .split('\n')
        .some((line) => line.startsWith(`| \`${path}\` |`) && line.includes('| 已验证 |')),
      path,
    )
  console.log(
    `MATCH: ${review.acceptedAfterGates.length} accepted file scopes, native failures/recovery and ${review.gates.length} zero-diagnostic gates; CODE3/3g remain partial. Semantic decisions are the recorded review, not certified by hashes.`,
  )
}
try {
  verify()
} catch (error) {
  console.error(error.message)
  process.exitCode = error.code === 'STALE' ? 2 : 1
}
