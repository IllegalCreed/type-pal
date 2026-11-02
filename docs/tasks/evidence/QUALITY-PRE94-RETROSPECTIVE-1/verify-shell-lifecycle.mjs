import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'

const dir = dirname(fileURLToPath(import.meta.url)),
  root = resolve(dir, '../../../..'),
  receiptPath = resolve(dir, 'shell-lifecycle-local.json'),
  hash = (b) => createHash('sha256').update(b).digest('hex'),
  read = (p) => readFileSync(resolve(root, p)),
  json = (p) => JSON.parse(read(p))
class Stale extends Error {}
function pin(p, sha) {
  if (!existsSync(resolve(root, p))) throw new Stale(`missing ${p}`)
  const b = read(p)
  if (hash(b) !== sha) throw new Stale(`version changed ${p}`)
  return b
}
function native(m, id, passed, failed = 0) {
  const n = JSON.parse(m[`${id}.native.json`])
  assert.equal(n.numPassedTests, passed, id)
  assert.equal(n.numFailedTests, failed, id)
  assert.equal(n.numPendingTests, 0, id)
  return n
}
function execution(m, id, exit = 0) {
  const e = JSON.parse(m[`${id}.execution.json`])
  assert.equal(e.exit, exit, id)
  assert.equal(e.signal, null, id)
  assert.equal(e.spawnError, null, id)
  for (const stream of ['stdout', 'stderr']) {
    const s = e[stream],
      b = Buffer.from(m[s.member])
    assert.equal(b.length, s.bytes, id)
    assert.equal(hash(b), s.sha256, id)
  }
  return e
}
try {
  if (!existsSync(receiptPath)) {
    console.log('INCOMPLETE: shell receipt not recorded')
    process.exitCode = 3
  } else {
    const r = JSON.parse(readFileSync(receiptPath))
    if (!r.artifact) {
      console.log('INCOMPLETE: local review is not yet frozen with complete native evidence')
      process.exitCode = 3
    } else {
      const data = pin(r.artifact.path, r.artifact.sha256)
      assert.equal(data.length, r.artifact.bytes)
      const members = JSON.parse(gunzipSync(data)).members
      assert.deepEqual(Object.keys(members).sort(), r.artifact.members.map((x) => x.name).sort())
      for (const item of r.artifact.members) {
        const b = Buffer.from(members[item.name])
        assert.equal(hash(b), item.sha256, item.name)
        assert.equal(b.length, item.bytes, item.name)
      }
      assert.equal(r.files.length, 18)
      for (const file of [...r.files, ...r.bindings]) {
        pin(file.path, file.sha256)
        if (file.dimensions)
          for (const axis of 'ABCDEFGH') assert(file.dimensions[axis], `${file.path} ${axis}`)
      }
      for (const a of r.reuseAssets) {
        const b = pin(a.path, a.sha256)
        assert.equal(b.length, a.bytes, a.path)
      }
      pin(r.browserScreenshot.path, r.browserScreenshot.sha256)
      const browser = JSON.parse(members['midi-functional.json'])
      assert.equal(browser.status, 'passed')
      assert.deepEqual(browser.diagnostics, [])
      assert.deepEqual(
        browser.checks.map((x) => x.track),
        [1, 2, 2, 0, 1],
      )
      for (const c of browser.checks) {
        assert.equal(c.context, 'running')
        assert.equal(c.paused, c.track === 0)
        if (c.track !== 0) {
          assert.equal(c.fileName, `${c.track}.mid`)
          assert.equal(c.loop, 'Infinity')
        }
      }
      const a = native(members, 'shell-final-directed', 76),
        b = native(members, 'shell-avi-final', 26),
        ids = [a, b].flatMap((n) =>
          n.testResults.flatMap((f) => f.assertionResults.map((t) => `${f.name}::${t.fullName}`)),
        )
      assert.equal(ids.length, 102)
      assert.equal(new Set(ids).size, 102)
      for (const id of ['shell-final-directed', 'shell-avi-final'])
        assert.equal(execution(members, id).stderr.bytes, 0, id)
      native(members, 'audio-injected-loop-false-old', 20)
      const counter = native(members, 'audio-injected-loop-false-new', 19, 1)
      execution(members, 'audio-injected-loop-false-old')
      execution(members, 'audio-injected-loop-false-new', 1)
      const failed = counter.testResults.flatMap((f) =>
        f.assertionResults.filter((t) => t.status === 'failed'),
      )
      assert.equal(failed.length, 1)
      assert(failed[0].failureMessages.some((x) => x.includes('AssertionError')))
      assert(failed[0].fullName.includes('setMusicBackend 注入时若已有当前 track'))
      const marker = "JSON.parse(fs.readFileSync(__dirname+'/window.json')).base"
      for (const name of ['prove-shell.cjs', 'build-test-proof.cjs']) {
        const source = members[name]
        assert.equal(source.split(marker).length, 2, name)
        const result = JSON.parse(
          execFileSync(process.execPath, ['-e', source.replace(marker, JSON.stringify(r.base))], {
            cwd: root,
            encoding: 'utf8',
          }),
        )
        if (result.files) {
          assert.equal(result.files.length, 7)
          assert(result.files.every((x) => x.programMatch))
        } else assert.equal(result.programMatch, true)
      }
      const adjustment = r.coverageAdjustment
      assert.equal(adjustment.approval.sources.length, 9)
      for (const p of adjustment.approval.sources) pin(p.path, p.sha256)
      assert.equal(
        hash(JSON.stringify(JSON.parse(members['baseline-before.json']))),
        adjustment.approval.baselineSha256,
      )
      let dataProof = members['prove-shell-recount.cjs']
      assert.equal(dataProof.split(marker).length, 2)
      dataProof = dataProof.replace(marker, JSON.stringify(r.base))
      const entryMarker =
        "JSON.parse(fs.readFileSync(__dirname+'/recount-approval.candidate.json'))"
      assert.equal(dataProof.split(entryMarker).length, 2)
      dataProof = dataProof.replace(entryMarker, JSON.stringify(adjustment.approval))
      const proven = JSON.parse(
        execFileSync(process.execPath, ['-e', dataProof], { cwd: root, encoding: 'utf8' }),
      )
      assert.deepEqual(proven, adjustment.program)
      const normal = JSON.parse(members['shell-normalizer.stdout.raw'])
      assert.deepEqual(normal.applied, [adjustment.approval.id])
      assert.equal(normal.regressionsBefore, 2)
      assert.equal(normal.regressionsAfter, 0)
      assert.equal(normal.sourceDriftRejected, true)
      assert.equal(normal.originalBaselineUnchanged, true)
      assert.equal(execution(members, 'shell-coverage-tools').stderr.bytes, 0)
      assert(/# pass 91\b/.test(members['shell-coverage-tools.stdout.raw']))
      assert(/# fail 0\b/.test(members['shell-coverage-tools.stdout.raw']))
      const projectionRecord = r.coverageAdjustment.projection
      pin(projectionRecord.projectionSource, projectionRecord.runnerSha256)
      assert.equal(
        hash(read('scripts/coverage/baseline.fast.json')),
        projectionRecord.afterBaselineSha256,
      )
      assert.equal(execution(members, 'shell-baseline-projection').stderr.bytes, 0)
      assert.equal(JSON.parse(members['shell-baseline-projection.stdout.raw']).match, true)
      const previous = json(
        'docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/codex-pending27-acceptance.json',
      )
      const oldMembers = JSON.parse(
        gunzipSync(pin(previous.nativeArtifact.path, previous.nativeArtifact.sha256)),
      ).members
      for (const [id, p, f] of [
        ['audioBaseline', 20, 0],
        ['audioDm29', 19, 1],
        ['audioEnabled', 19, 1],
        ['audioBackend', 19, 1],
        ['audioRecovery', 20, 0],
        ['rngOldCounter', 14, 0],
        ['rngNewCounter', 13, 1],
        ['rngBudgetCounter', 13, 1],
        ['rngRecovery', 14, 0],
      ]) {
        const n = native(oldMembers, id, p, f)
        if (f)
          assert(
            n.testResults
              .flatMap((x) => x.assertionResults.filter((t) => t.status === 'failed'))
              .every((t) => t.failureMessages.some((m) => m.includes('AssertionError'))),
          )
      }
      const midi = json('docs/ops/evidence/CODE-QUALITY-3Y-CLOSEOUT-1/midi-review/counter.json')
      assert.deepEqual(
        midi.runs.map((x) => [x.exit, x.passed, x.failed, x.pending]),
        [
          [0, 12, 0, 0],
          [1, 11, 1, 0],
          [0, 12, 0, 0],
        ],
      )
      for (const run of midi.runs) {
        const prefix = `docs/ops/evidence/CODE-QUALITY-3Y-CLOSEOUT-1/midi-review/${run.label}`
        const raw = gunzipSync(read(`${prefix}.raw.gz`)),
          nativeBytes = gunzipSync(read(`${prefix}-tests.json.gz`))
        assert.equal(hash(raw), run.rawSha256, run.label)
        assert.equal(hash(nativeBytes), run.runnerSha256, run.label)
        const n = JSON.parse(nativeBytes)
        assert.equal(n.numPassedTests, run.passed)
        assert.equal(n.numFailedTests, run.failed)
        assert.equal(n.numPendingTests, 0)
        if (run.failed)
          assert(
            n.testResults
              .flatMap((f) => f.assertionResults.filter((t) => t.status === 'failed'))
              .every((t) => t.failureMessages.some((m) => m.includes('AssertionError'))),
          )
      }
      if (process.argv.includes('--local'))
        console.log(
          'LOCAL MATCH:18 per-file review records,102 current tests,loop business counter,finite AST proofs and real MIDI UI evidence; no uniform-gate acceptance',
        )
      else if (r.status !== 'accepted') {
        console.log('INCOMPLETE: local evidence matches; final unified/static decision pending')
        process.exitCode = 3
      } else {
        const changes = execFileSync(
          'git',
          ['diff', '--name-only', r.base, '--', 'packages', 'scripts'],
          { cwd: root, encoding: 'utf8' },
        )
          .trim()
          .split('\n')
          .filter(Boolean)
          .sort()
        if (JSON.stringify(changes) !== JSON.stringify(r.sourceBindings.map((x) => x.path).sort()))
          throw new Stale(
            'candidate code set changed; current whole-repository gates need scoped reconciliation,not automatic revocation of unchanged file review',
          )
        assert.equal(
          execFileSync(
            'git',
            ['ls-files', '--others', '--exclude-standard', '--', 'packages', 'scripts'],
            { cwd: root, encoding: 'utf8' },
          ).trim(),
          '',
        )
        for (const f of r.sourceBindings) pin(f.path, f.sha256)
        for (const role of ['check', 'ratchet', 'protected', 'docs', 'lint', 'ledger', 'diff'])
          assert(
            r.runs.some((x) => x.role === role),
            role,
          )
        for (const run of r.runs) {
          const e = execution(members, run.id)
          assert.equal(e.stderr.bytes, 0, run.id)
          assert(
            Object.values(run.diagnostics).every((x) => x === 0),
            run.id,
          )
          for (const f of r.sourceBindings) {
            if (f.path === 'scripts/coverage/baseline.fast.json') continue
            const from =
              e.codeChanges.find((x) => x.path === f.path)?.sha256 ??
              hash(execFileSync('git', ['show', `${e.head}:${f.path}`], { cwd: root }))
            if (
              run.role === 'check' &&
              f.path === 'scripts/coverage/approved-baseline-adjustments.mjs'
            ) {
              assert.equal(from, adjustment.program.beforeSha256)
              assert.equal(f.sha256, adjustment.program.afterSha256)
            } else assert.equal(from, f.sha256, `${run.id} ${f.path}`)
          }
        }
        const baseline = json('scripts/coverage/baseline.fast.json'),
          measurement = JSON.parse(members[r.coverage.measurement]),
          protectedResult = JSON.parse(members[r.coverage.protected])
        assert.equal(measurement.sourceFileCount, 744)
        assert.equal(measurement.testCount, 19968)
        assert.deepEqual(measurement.total, protectedResult.total)
        assert.deepEqual(baseline.total, measurement.total)
        for (const [name, p] of Object.entries(baseline.packages)) {
          assert.deepEqual(p.metrics, measurement.packages[name].metrics, name)
          assert.equal(p.scopeDigest, measurement.packages[name].scopeDigest, name)
          assert.deepEqual(
            p.fastTests.fileEntries,
            measurement.packages[name].fastTests.fileEntries,
            name,
          )
        }
        const q = json('docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/all-cards.json')
        for (const c of r.cards) assert(q.cards.some((x) => x.id === c.id && x.currentAcceptance))
        assert.equal(q.cards.find((x) => x.id === '73').currentAcceptance, false)
        assert.equal(q.cards.find((x) => x.id === '74').currentAcceptance, false)
        assert.equal(r.acceptedFiles.length, 14)
        console.log(
          'MATCH: five original/migrated card scopes,14accepted and4review files and complete zero-diagnostic gates; readonly,no tests/coverage rerun;73/74 remain unaccepted',
        )
      }
    }
  }
} catch (e) {
  console.error((e instanceof Stale ? 'STALE: ' : 'FAIL: ') + e.message)
  process.exitCode = e instanceof Stale ? 2 : 1
}
