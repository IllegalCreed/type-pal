import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { stripVTControlCharacters } from 'node:util'
import { gunzipSync } from 'node:zlib'
import ts from 'typescript'

const dir = dirname(fileURLToPath(import.meta.url))
const root = resolve(dir, '../../../..')
const hash = (b) => createHash('sha256').update(b).digest('hex')
const read = (p) => readFileSync(resolve(root, p))
const json = (p) => JSON.parse(read(p))
class Stale extends Error {}
function pin(p, sha) {
  if (!existsSync(resolve(root, p))) throw new Stale(`missing ${p}`)
  const bytes = read(p)
  if (hash(bytes) !== sha) throw new Stale(`version changed ${p}`)
  return bytes
}
const emit = (source) =>
  ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      removeComments: true,
    },
  }).outputText
function shape(source, name) {
  const ast = ts.createSourceFile('input.ts', source, ts.ScriptTarget.Latest, true)
  const declaration = ast.statements.find(
    (n) => ts.isInterfaceDeclaration(n) && n.name.text === name,
  )
  assert(declaration, name)
  return declaration.members.map((m) => ({
    name: m.name.getText(ast),
    optional: !!m.questionToken,
    type: m.type.getText(ast),
  }))
}
function native(members, id, passed, failed = 0) {
  const result = JSON.parse(members[`${id}.native.json`])
  assert.equal(result.numPassedTests, passed, id)
  assert.equal(result.numFailedTests, failed, id)
  assert.equal(result.numPendingTests, 0, id)
  const failures = result.testResults.flatMap((f) =>
    f.assertionResults
      .filter((t) => t.status === 'failed')
      .map((t) => ({ file: f.name, fullName: t.fullName, messages: t.failureMessages })),
  )
  assert.equal(failures.length, failed, id)
  for (const f of failures) assert(f.messages.some((message) => message.includes('AssertionError')))
  return failures
}
function execution(members, id, exit = 0) {
  const e = JSON.parse(members[`${id}.execution.json`])
  assert.equal(e.exit, exit, id)
  assert.equal(e.signal, null, id)
  assert.equal(e.spawnError, null, id)
  for (const stream of ['stdout', 'stderr']) {
    const bytes = Buffer.from(members[e[stream].member])
    assert.equal(bytes.length, e[stream].bytes, id)
    assert.equal(hash(bytes), e[stream].sha256, id)
  }
  return e
}

try {
  const path = resolve(dir, 'analytics-closeout.json')
  if (!existsSync(path)) {
    console.log('INCOMPLETE: analytics receipt missing')
    process.exitCode = 3
  } else {
    const r = JSON.parse(readFileSync(path))
    const bytes = pin(r.artifact.path, r.artifact.sha256)
    assert.equal(bytes.length, r.artifact.bytes)
    const members = JSON.parse(gunzipSync(bytes)).members
    assert.deepEqual(Object.keys(members).sort(), r.artifact.members.map((m) => m.name).sort())
    for (const m of r.artifact.members) {
      assert.equal(Buffer.byteLength(members[m.name]), m.bytes, m.name)
      assert.equal(hash(members[m.name]), m.sha256, m.name)
    }
    assert.equal(r.files.length, 12)
    for (const f of r.files) {
      pin(f.path, f.sha256)
      for (const axis of 'ABCDEFGH') assert(f.dimensions[axis], `${f.path} ${axis}`)
    }
    for (const asset of r.reuseAssets)
      assert.equal(pin(asset.path, asset.sha256).length, asset.bytes)
    const caller = read(r.caller.path)
      .toString()
      .split('\n')
      .slice(0, r.caller.firstLines)
      .join('\n')
    if (hash(caller) !== r.caller.sha256) throw new Stale('production install caller changed')
    for (const f of r.productProof.files) {
      const before = execFileSync('git', ['show', `${r.base}:${f.path}`], { cwd: root })
      const after = pin(f.path, f.afterSha256)
      assert.equal(hash(before), f.beforeSha256)
      assert.equal(emit(before.toString()), emit(after.toString()), f.path)
      assert.equal(hash(emit(after.toString())), f.emittedSha256)
    }
    const installer = 'packages/game/src/analytics/install-analytics.ts'
    const old = execFileSync('git', ['show', `${r.base}:${installer}`], {
      cwd: root,
      encoding: 'utf8',
    })
    assert.deepEqual(
      shape(old, 'AnalyticsNavigator'),
      shape(
        read('packages/game/src/analytics/analytics-consent.ts').toString(),
        'BrowserPrivacySignals',
      ),
    )
    native(members, 'analytics-before', 5)
    native(members, 'analytics-directed', 30)
    assert.equal(execution(members, 'analytics-directed').stderr.bytes, 0)
    assert.equal(r.tests.identityMapping.length, 1)
    for (const c of r.counters) {
      for (const run of c.runs) {
        execution(members, run.id, run.exit)
        const failures = native(members, run.id, run.passed, run.failed.length)
        assert.deepEqual(
          failures.map(({ file, fullName }) => ({ file, fullName })),
          run.failed,
        )
      }
      const [before, after] = c.runs
      if (c.owner) {
        assert.equal(before.failed.length, 2)
        assert.equal(after.failed.length, 0)
        assert.equal(after.passed, 7)
      } else {
        assert.equal(before.failed.length, 0)
        assert.equal(after.failed.length, 1)
        assert.equal(after.passed, 2)
        const source = read('packages/game/src/analytics/analytics-consent-ui.ts').toString()
        assert.equal(source.split(c.find).length, 2)
        assert.equal(source.replace(c.find, c.replace), members[`${c.id}.mutant.ts`])
      }
    }
    for (const folder of ['3y-analytics-consent', '3z-google-analytics']) {
      const base = `docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/${folder}`
      const controls = json(`${base}/controls.json`)
      assert.equal(controls.controls.length, 5)
      for (const c of controls.controls) {
        for (const [mode, run] of Object.entries(c.runs)) {
          assert.equal(hash(gunzipSync(read(`${base}/${run.raw}`))), run.rawSha256)
          const bytes = gunzipSync(read(`${base}/${run.nativeReport}`))
          assert.equal(hash(bytes), run.nativeSha256)
          const n = JSON.parse(bytes)
          assert.equal(n.numPendingTests, 0)
          assert.equal(n.numFailedTests, mode === 'old' ? 0 : 1)
        }
      }
    }
    const failureDir = 'docs/ops/evidence/GAME-ANALYTICS-FAILED-INSTALL-OWNERSHIP-1'
    const red = json(`${failureDir}/red-before-fix.json`)
    const redNative = gunzipSync(read(`${failureDir}/red-final.vitest.json.gz`))
    assert.equal(hash(redNative), red.nativeSha256)
    assert.equal(JSON.parse(redNative).numFailedTests, 5)
    assert.equal(JSON.parse(redNative).numPendingTests, 0)
    const restored = json(`${failureDir}/controls.json`)
    for (const run of restored.rows) {
      const bytes = gunzipSync(read(`${failureDir}/${run.nativeReport}`))
      assert.equal(hash(bytes), run.nativeSha256)
      assert.equal(hash(gunzipSync(read(`${failureDir}/${run.raw}`))), run.rawSha256)
      const n = JSON.parse(bytes)
      assert.equal(n.numFailedTests, run.expectedFailed)
      assert.equal(n.numPendingTests, 0)
      for (const f of n.testResults)
        for (const t of f.assertionResults.filter((t) => t.status === 'failed'))
          assert(t.failureMessages.some((m) => m.includes('AssertionError')))
    }
    pin(r.browser.screenshot.path, r.browser.screenshot.sha256)
    assert.deepEqual(r.browser.diagnostics, [])
    for (const stage of r.browser.stages) {
      const text = members[stage.member].match(/\{\n\s*"choice"[\s\S]*?\n\}/)
      assert(text, stage.stage)
      assert.deepEqual(JSON.parse(text[0]), stage.observation)
      assert.equal(stage.observation.gaScripts, 0)
    }
    assert.equal(r.browser.stages.at(-1).observation.restored, true)
    assert.equal(r.browser.stages.at(-1).observation.rootCount, 0)
    for (const attempt of r.failedAttempts ?? []) {
      const e = execution(members, attempt.id, attempt.exit)
      assert.equal(e.exit, 1)
      assert.equal(e.stderr.bytes, attempt.stderr.bytes)
      assert(e.stderr.bytes > 0)
      assert(members['protected-power-events.raw'].includes('Clamshell Sleep'))
      for (const name of attempt.actualFailedTests)
        assert(members[e.stderr.member].includes(name), name)
    }
    if (process.argv.includes('--local'))
      console.log(
        'LOCAL MATCH: twelve file reviews,unchanged emitted JS,30 tests,two UI business counters and external-owner recovery; use default mode for the frozen unified-gate decision',
      )
    else if (r.status !== 'accepted') {
      console.log('INCOMPLETE: local evidence matches; unified/static closure pending')
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
      if (JSON.stringify(changes) !== JSON.stringify(r.sourceBindings.map((f) => f.path).sort()))
        throw new Stale('code change set differs from gate candidate')
      for (const f of r.sourceBindings) pin(f.path, f.sha256)
      for (const role of ['check', 'ratchet', 'protected', 'docs', 'lint', 'ledger', 'diff'])
        assert(
          r.runs.some((run) => run.role === role),
          role,
        )
      for (const run of r.runs) {
        const e = execution(members, run.id)
        assert.equal(e.stderr.bytes, 0)
        assert(
          Object.values(run.diagnostics).every((n) => n === 0),
          run.id,
        )
        const stdout = stripVTControlCharacters(members[e.stdout.member])
        assert(
          !/not wrapped in act\(|not configured to support act|event-system: skip raw opcode|\bWarning:|\[warn(?:ing)?\]|error TS\d+|Unhandled (?:Error|Rejection)|^\s*stderr \|/im.test(
            stdout,
          ),
          run.id,
        )
        for (const f of r.sourceBindings) {
          if (f.path === 'scripts/coverage/baseline.fast.json') continue
          const captured =
            e.codeChanges.find((c) => c.path === f.path)?.sha256 ??
            hash(execFileSync('git', ['show', `${e.head}:${f.path}`], { cwd: root }))
          assert.equal(captured, f.sha256, `${run.id} ${f.path}`)
        }
      }
      const baseline = json('scripts/coverage/baseline.fast.json')
      for (const run of r.runs.filter((run) => ['ratchet', 'protected'].includes(run.role))) {
        const actual = JSON.parse(members[`${run.id}.coverage-summary.json`])
        assert.deepEqual(baseline.total, actual.total)
        for (const [name, p] of Object.entries(baseline.packages)) {
          assert.deepEqual(p.metrics, actual.packages[name].metrics, name)
          assert.equal(p.scopeDigest, actual.packages[name].scopeDigest, name)
          assert.deepEqual(
            p.fastTests.fileEntries,
            actual.packages[name].fastTests.fileEntries,
            name,
          )
        }
      }
      const queue = json('docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/all-cards.json')
      for (const id of r.cards) assert(queue.cards.some((c) => c.id === id && c.currentAcceptance))
      console.log(
        'MATCH: four pre94 analytics cards,twelve files and complete zero-diagnostic gates; readonly,no tests/coverage rerun; original scope preserved',
      )
    }
  }
} catch (error) {
  console.error(`${error instanceof Stale ? 'STALE' : 'FAIL'}: ${error.message}`)
  process.exitCode = error instanceof Stale ? 2 : 1
}
