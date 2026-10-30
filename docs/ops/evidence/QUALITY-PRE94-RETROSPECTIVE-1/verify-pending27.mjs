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
const recordPath = process.argv[2] ?? resolve(here, 'codex-pending27-acceptance.json')
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex')
const insideRoot = (path) => {
  const absolute = resolve(root, path)
  assert(absolute.startsWith(root + sep), 'attachment/source outside repository')
  return absolute
}
let phase = 'integrity'
try {
  const record = JSON.parse(readFileSync(recordPath, 'utf8'))
  assert(record.nativeArtifact, 'evidence packet is not sealed')
  const bytes = readFileSync(insideRoot(record.nativeArtifact.path))
  assert.equal(digest(bytes), record.nativeArtifact.sha256, 'native archive SHA mismatch')
  const { members } = JSON.parse(gunzipSync(bytes))
  for (const member of record.nativeArtifact.members) {
    assert.equal(typeof members[member.name], 'string', `missing member:${member.name}`)
    const data = Buffer.from(members[member.name])
    assert.equal(data.length, member.bytes, `member bytes:${member.name}`)
    assert.equal(digest(data), member.sha256, `member SHA:${member.name}`)
  }
  const execution = (id) => {
    const run = JSON.parse(members[`${id}.execution.json`])
    assert.equal(run.id, id, `execution identity:${id}`)
    for (const stream of ['stdout', 'stderr']) {
      const data = Buffer.from(members[`${id}.${stream}.raw`])
      assert.equal(data.length, run[stream].bytes, `execution bytes:${id}.${stream}`)
      assert.equal(digest(data), run[stream].sha256, `execution SHA:${id}.${stream}`)
    }
    return run
  }
  const counters = new Set([
    'audioDm29',
    'audioEnabled',
    'audioBackend',
    'rngNewCounter',
    'rngBudgetCounter',
  ])
  const failureTitles = {
    audioDm29: 'pickMusicTrack DM29:入场揭场未完 → 0 静默;非战斗不受 intro 标志影响',
    audioEnabled:
      'L47 补播还原真实 loop:非循环 track 经 setMusicEnabled 开关后仍以 loop=false 重播',
    audioBackend: 'L47 setMusicBackend 注入补播也用记录的 loop=false',
    rngNewCounter: 'Space 按键跳过 → 不到末帧停',
    rngBudgetCounter: '跳过键提前结束 → 未显示帧的递减一次性结清(与完整播完一致)',
  }
  for (const id of [
    ...counters,
    'audioBaseline',
    'audioRecovery',
    'rngOldCounter',
    'rngRecovery',
  ]) {
    const run = execution(id)
    const native = JSON.parse(members[`${id}.native.json`])
    const results = native.testResults.flatMap((file) => file.assertionResults)
    const failed = results.filter((test) => test.status === 'failed')
    assert.equal(results.length, id.startsWith('audio') ? 20 : 14, `case census:${id}`)
    assert.equal(results.length, native.numTotalTests, `native total:${id}`)
    assert.equal(failed.length, counters.has(id) ? 1 : 0, `business failure count:${id}`)
    assert.equal(native.numFailedTests, failed.length, `native failed header:${id}`)
    assert(
      results.every((test) => ['passed', 'failed'].includes(test.status)),
      `skip/runtime:${id}`,
    )
    assert.equal(run.exit, counters.has(id) ? 1 : 0, `process exit:${id}`)
    assert.equal(run.signal, null, `signal:${id}`)
    assert.equal(run.spawnError, null, `spawn:${id}`)
    if (failed.length) {
      assert(failed[0].failureMessages[0].startsWith('AssertionError:'))
      assert(failed[0].fullName.endsWith(failureTitles[id]), `wrong business failure:${id}`)
    } else assert.equal(members[`${id}.stderr.raw`], '', `positive diagnostics:${id}`)
  }
  if (record.integration.gateStatus === 'passed') {
    const required = {
      check: ['pnpm', ['check']],
      ratchet: ['pnpm', ['coverage:ratchet']],
      protected: ['node', ['scripts/coverage/run.mjs', 'fast']],
      docs: ['pnpm', ['check:docs']],
      lint: ['pnpm', ['lint']],
      ledger: ['node', ['scripts/quality/code-quality-ledger.mjs']],
      diff: ['git', ['diff', '--check', 'HEAD']],
    }
    for (const [role, [command, args]] of Object.entries(required)) {
      const id = record.finalGates?.[role]
      assert.equal(typeof id, 'string', `missing final gate:${role}`)
      const run = execution(id)
      assert.equal(run.command, command, `final command:${role}`)
      assert.deepEqual(run.args, args, `final arguments:${role}`)
      if (role === 'protected') {
        assert.equal(run.environment.TYPE_PAL_COVERAGE_BASE_REF, 'origin/main')
        assert.equal(run.targetMain, record.integration.protectedMain)
      }
      assert.equal(run.exit, 0, `final gate exit:${id}`)
      assert.equal(run.signal, null, `final gate signal:${id}`)
      assert.equal(run.spawnError, null, `final gate spawn:${id}`)
      assert.equal(members[`${id}.stderr.raw`], '', `final gate stderr:${id}`)
      const scan = JSON.parse(members[`${id}.scan.json`])
      assert.equal(scan.id, id, `final diagnostic identity:${id}`)
      assert(
        Object.values(scan.diagnostics).every((count) => count === 0),
        `final gate diagnostics:${id}`,
      )
    }
  }
  phase = 'identity'
  assert(/^[a-f\d]{40}$/.test(record.gateSourceCommit), 'invalid stored gate commit')
  for (const file of [...record.fileReviews, ...(record.dependencyBindings ?? [])]) {
    assert.equal(digest(readFileSync(insideRoot(file.path))), file.sha256, `stale:${file.path}`)
  }
  const changedCode = execFileSync(
    'git',
    ['diff', '--name-only', record.gateSourceCommit, '--', 'packages', 'scripts'],
    { cwd: root, encoding: 'utf8', env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' } },
  )
    .trim()
    .split('\n')
    .filter((path) => path && path !== 'scripts/coverage/baseline.fast.json')
  assert.equal(changedCode.length, 0, `tracked gate code changed:${changedCode.join(',')}`)
  const result = {
    status: 'matched',
    files: record.fileReviews.length,
    members: record.nativeArtifact.members.length,
    gates: record.integration.gateStatus,
    limits: 'Identity/native execution only;no whole-file semantic,E2E or visual certification.',
  }
  process.stdout.write(`${JSON.stringify(result)}\n`)
} catch (error) {
  process.stderr.write(`${phase === 'identity' ? 'STALE' : 'FAIL'}:${error.message}\n`)
  process.exitCode = phase === 'identity' ? 2 : 1
}
