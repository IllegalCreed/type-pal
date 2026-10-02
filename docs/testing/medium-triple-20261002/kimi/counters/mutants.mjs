/**
 * TEST-KIMI-CURRENT-CONTINUATION-MEDIUM-1 mutation counter-evidence runner (r3 complete judge).
 *
 * One declared execution scope per needle: the exact non-zero file×fullName multiset sampled
 * from the control run, re-required identically at variant and restored. Product mutations live
 * only inside a private mkdtemp copy; the repository is hash-pinned read-only. The single judge
 * (judgedRun) is shared by the collector, the recompute path and the selftest.
 *
 * reportToRun keeps the complete report: runtime-error suite count, per-suite status/leaf
 * closure and the top-level suite/test count closure, so a business red overlaid with a
 * collection/runtime anomaly (failed zero-leaf suite, empty message, runtime count 1) is
 * rejected instead of being read as one clean AssertionError.
 *
 * Modes:
 *   (default)          full collect in a private mkdtemp copy (only when tests/deps/scope change)
 *   --recompute        re-judge the committed evidence JSON/raw bytes without re-running vitest
 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { stripVTControlCharacters } from 'node:util'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../..')
const evidenceDir = resolve(root, 'docs/testing/medium-triple-20261002/kimi/counters/evidence')

const NEW_FILES = [
  'src/script-continuation.kimi-mid-1.test.ts',
  'src/author-stage-organization.kimi-mid-1.test.ts',
]
const OLD_AUTO = 'src/runtime-auto-checkpoint.test.ts'
const OLD_STAGES = 'src/author-flow-stages.test.ts'

const mutations = [
  {
    id: 'machine-id-cursor',
    source: 'packages/reforge/src/script-continuation.ts',
    from: "if (cursor.kind !== 'state' || cursor.machine !== executable.flow.machine.id)",
    to: "if (cursor.kind !== 'state')",
    test: NEW_FILES[0],
    title: 'K1 machine executable refuses a cursor from a foreign machine id',
    scope: [...NEW_FILES, OLD_AUTO],
    sensitivity: true,
  },
  {
    id: 'battle-none-arm',
    source: 'packages/reforge/src/script-continuation.ts',
    from: "if (control?.kind !== 'startBattle' || control.arm === 'none')",
    to: "if (control?.kind !== 'startBattle')",
    test: NEW_FILES[0],
    title: 'K2 a startBattle child without an outcome arm rejects',
    scope: [...NEW_FILES, OLD_AUTO],
    sensitivity: true,
  },
  {
    id: 'none-explicit-self',
    source: 'packages/reforge/src/script-continuation.ts',
    from: "if (script.self === 'none' && command.self)",
    to: 'if (false && command.self)',
    test: NEW_FILES[0],
    title: 'K3 a none-self shared script refuses an explicit command self',
    scope: [...NEW_FILES, OLD_AUTO],
    sensitivity: false,
  },
  {
    id: 'unreachable-tail',
    source: 'packages/content/src/author-flow-stages.ts',
    from: 'for (const [id, state] of entries) ordered.set(id, state)',
    to: 'for (const [id, state] of entries) { if (ordered.has(id)) ordered.set(id, state) }',
    test: NEW_FILES[1],
    title:
      'K6 a multi-state restart cycle stays in reachable order and the unreachable tail keeps its own id and stay mapping',
    scope: [...NEW_FILES, OLD_STAGES],
    sensitivity: true,
  },
]

const clean = (value) => stripVTControlCharacters(value)
const identity = (entry) => `${entry.file}::${entry.fullName}`

/** Complete report→run conversion: nothing the judge needs is dropped. */
function reportToRun({ data, log, exit, signal, spawnError }) {
  const suites = data.testResults.map((file) => ({
    name: file.name,
    status: file.status,
    message: file.message,
    leaves: file.assertionResults.length,
    failedLeaves: file.assertionResults.filter((a) => a.status === 'failed').length,
  }))
  return {
    exit,
    signal,
    spawnError: spawnError ?? null,
    log,
    totals: {
      suites: {
        total: data.numTotalTestSuites,
        passed: data.numPassedTestSuites,
        failed: data.numFailedTestSuites,
        pending: data.numPendingTestSuites,
      },
      tests: {
        total: data.numTotalTests,
        passed: data.numPassedTests,
        failed: data.numFailedTests,
        pending: data.numPendingTests,
        todo: data.numTodoTests,
      },
      runtimeErrorSuites: data.numRuntimeErrorTestSuites ?? 0,
      success: data.success,
    },
    suites,
    entries: data.testResults.flatMap((file) =>
      file.assertionResults.map((entry) => ({ ...entry, file: file.name })),
    ),
  }
}

/** Strict judge shared by collector, recompute and selftest.
 * run: reportToRun output. scope: { identities: string[] } exact non-zero file×fullName
 * multiset declared from control. expectation: { kind: 'allGreen' } | { kind: 'singleRed',
 * file, fullName }. Every state (control/variant/restored) must satisfy the same scope and
 * status rules; collection/runtime anomalies, count-closure breaks and signal/spawn failures
 * reject regardless of how clean the leaf set looks. */
function judgedRun(run, scope, expectation) {
  if (!Number.isInteger(run.exit) || run.signal !== null || run.spawnError !== null) return false
  if (expectation.kind === 'allGreen' && run.exit !== 0) return false
  if (expectation.kind === 'singleRed' && run.exit !== 1) return false
  if (/Unhandled Errors?|Unhandled Rejection|Uncaught Exception/i.test(clean(run.log))) return false
  if (run.suites.some((suite) => suite.message)) return false
  // Runtime/collection layer: counts present and zero, failed suites must be leaf-explained.
  if (run.totals.runtimeErrorSuites !== 0) return false
  const bySuite = { passed: 0, failed: 0, pending: 0 }
  for (const suite of run.suites) {
    if (suite.leaves === 0) return false
    if (suite.status === 'failed' && suite.failedLeaves === 0) return false
    if (!(suite.status in bySuite)) return false
    bySuite[suite.status] += 1
  }
  if (run.totals.suites.total !== run.suites.length) return false
  if (run.totals.suites.passed !== bySuite.passed) return false
  if (run.totals.suites.failed !== bySuite.failed) return false
  if (run.totals.suites.pending !== bySuite.pending) return false
  // Top-level test counts must close with the real leaves.
  const byStatus = {}
  for (const entry of run.entries) byStatus[entry.status] = (byStatus[entry.status] ?? 0) + 1
  if (run.totals.tests.total !== run.entries.length) return false
  if (run.totals.tests.passed !== (byStatus.passed ?? 0)) return false
  if (run.totals.tests.failed !== (byStatus.failed ?? 0)) return false
  if (run.totals.tests.pending !== (byStatus.pending ?? 0) + (byStatus.skipped ?? 0)) return false
  if (run.totals.tests.todo !== (byStatus.todo ?? 0)) return false
  if (run.totals.tests.todo !== 0) return false
  if (
    run.totals.success !==
    (bySuite.failed === 0 && (byStatus.failed ?? 0) === 0 && run.totals.runtimeErrorSuites === 0)
  )
    return false
  // Declared scope: exact identity multiset, only passed plus the one declared red.
  if (scope.identities.length === 0) return false
  const statuses = new Map()
  for (const entry of run.entries) {
    const id = identity(entry)
    if (!statuses.has(id)) statuses.set(id, [])
    statuses.get(id).push(entry)
  }
  const expected = new Map()
  for (const id of scope.identities) expected.set(id, (expected.get(id) ?? 0) + 1)
  if (statuses.size !== expected.size) return false
  for (const [id, count] of expected) if (statuses.get(id)?.length !== count) return false
  const failed = run.entries.filter((entry) => entry.status === 'failed')
  if (run.entries.some((entry) => !['passed', 'failed'].includes(entry.status))) return false
  if (expectation.kind === 'allGreen') return failed.length === 0
  if (failed.length !== 1) return false
  const [red] = failed
  if (red.file !== expectation.file || red.fullName !== expectation.fullName) return false
  return (
    red.failureMessages.length > 0 &&
    red.failureMessages.every(
      (message) =>
        /^AssertionError(?:\b|:)/.test(clean(message).trimStart()) &&
        !/(?:\btimeout\b|\btimed out\b|unhandled|(?:^|\n)\s*(?:Error|TypeError|RangeError):)/i.test(
          clean(message),
        ),
    )
  )
}

/** Faithful synthetic run: derive consistent suites/totals from leaves, then corrupt on demand. */
function mkRun({ exit, entries, log = 'ok', success, signal = null, spawnError = null, patch }) {
  const files = new Map()
  for (const entry of entries) {
    if (!files.has(entry.file)) files.set(entry.file, [])
    files.get(entry.file).push(entry)
  }
  const suites = [...files].map(([name, leaves]) => ({
    name,
    status: leaves.some((l) => l.status === 'failed') ? 'failed' : 'passed',
    message: '',
    assertionResults: leaves,
  }))
  const count = (status) => entries.filter((e) => e.status === status).length
  const data = {
    numTotalTestSuites: suites.length,
    numPassedTestSuites: suites.filter((s) => s.status === 'passed').length,
    numFailedTestSuites: suites.filter((s) => s.status === 'failed').length,
    numPendingTestSuites: 0,
    numTotalTests: entries.length,
    numPassedTests: count('passed'),
    numFailedTests: count('failed'),
    numPendingTests: count('pending') + count('skipped'),
    numTodoTests: count('todo'),
    success: success ?? !suites.some((s) => s.status === 'failed'),
    testResults: suites,
  }
  return reportToRun({ data: patch ? patch(data) : data, log, exit, signal, spawnError })
}

const passed = (file, fullName) => ({ file, fullName, status: 'passed', failureMessages: [] })
const scope2 = { identities: ['/t/a.test.ts::case-a', '/t/a.test.ts::case-b'] }
const greenRun = mkRun({
  exit: 0,
  entries: [passed('/t/a.test.ts', 'case-a'), passed('/t/a.test.ts', 'case-b')],
})
const redTarget = {
  file: '/t/a.test.ts',
  fullName: 'case-a',
  status: 'failed',
  failureMessages: ['AssertionError: business difference'],
}
const redRun = mkRun({ exit: 1, entries: [redTarget, passed('/t/a.test.ts', 'case-b')] })
assert(judgedRun(greenRun, scope2, { kind: 'allGreen' }))
assert(judgedRun(redRun, scope2, { kind: 'singleRed', file: redTarget.file, fullName: 'case-a' }))
const redExpect = { kind: 'singleRed', file: redTarget.file, fullName: 'case-a' }
const rejections = [
  [
    mkRun({ exit: 0, entries: [redTarget, passed('/t/a.test.ts', 'case-b')] }),
    'wrong exit for red',
  ],
  [{ ...redRun, exit: 2 }, 'collection exit for red'],
  [{ ...redRun, signal: 'SIGTERM' }, 'signaled'],
  [{ ...redRun, spawnError: new Error('spawn ENOENT') }, 'spawn failure'],
  [{ ...redRun, log: 'Unhandled Rejection: boom' }, 'runtime marker in log'],
  [
    mkRun({
      exit: 1,
      entries: [redTarget, passed('/t/a.test.ts', 'case-b')],
      patch: (d) => {
        d.testResults[0].message = 'collection exploded'
        return d
      },
    }),
    'suite message',
  ],
  [
    mkRun({
      exit: 1,
      entries: [redTarget, passed('/t/a.test.ts', 'case-b'), passed('/t/c.test.ts', 'case-c')],
      patch: (d) => {
        d.numTodoTests = 1
        return d
      },
    }),
    'todo count',
  ],
  [
    mkRun({
      exit: 1,
      entries: [
        redTarget,
        passed('/t/a.test.ts', 'case-b'),
        { ...redTarget, status: 'pending', failureMessages: [] },
      ],
      patch: (d) => {
        d.numPendingTests = 1
        d.numTotalTests = 3
        return d
      },
    }),
    'declared file×fullName red overlaid with a pending duplicate leaf',
  ],
  [mkRun({ exit: 1, entries: [redTarget] }), 'missing declared leaf'],
  [
    mkRun({
      exit: 1,
      entries: [redTarget, passed('/t/a.test.ts', 'case-b'), passed('/t/a.test.ts', 'case-c')],
    }),
    'extra leaf outside the declared scope',
  ],
  [
    mkRun({
      exit: 1,
      entries: [{ ...redTarget, fullName: 'case-b' }, passed('/t/a.test.ts', 'case-b')],
    }),
    'red with wrong identity',
  ],
  [mkRun({ exit: 1, entries: [redTarget, redTarget] }), 'two reds'],
  [
    mkRun({
      exit: 1,
      entries: [
        { ...redTarget, failureMessages: ['Error: not an assertion'] },
        passed('/t/a.test.ts', 'case-b'),
      ],
    }),
    'non-AssertionError red',
  ],
  [
    mkRun({
      exit: 1,
      entries: [
        { ...redTarget, failureMessages: ['AssertionError: bad\nTypeError: nested'] },
        passed('/t/a.test.ts', 'case-b'),
      ],
    }),
    'embedded runtime error inside the red message',
  ],
  [
    mkRun({
      exit: 1,
      entries: [redTarget, { ...passed('/t/a.test.ts', 'case-b'), status: 'pending' }],
      patch: (d) => {
        d.numPendingTests = 1
        return d
      },
    }),
    'pending leaf inside the declared scope',
  ],
  [mkRun({ exit: 0, entries: [redTarget, passed('/t/a.test.ts', 'case-b')] }), 'red inside green'],
  [{ ...redRun, entries: [] }, 'zero execution'],
  // r2: business red overlaid with a collection/runtime anomaly must never read as clean.
  [
    mkRun({
      exit: 1,
      log: 'JSON report written to /tmp/x.json',
      entries: [redTarget, passed('/t/a.test.ts', 'case-b')],
      patch: (d) => {
        d.testResults.push({
          name: '/t/broken.test.ts',
          status: 'failed',
          message: '',
          assertionResults: [],
        })
        d.numTotalTestSuites = 3
        d.numFailedTestSuites = 2
        d.numRuntimeErrorTestSuites = 1
        return d
      },
    }),
    'target red overlaid with failed zero-leaf collection suite and runtime=1',
  ],
  [
    mkRun({
      exit: 1,
      entries: [redTarget, passed('/t/a.test.ts', 'case-b')],
      patch: (d) => {
        d.numRuntimeErrorTestSuites = 1
        return d
      },
    }),
    'runtime error suite count alone',
  ],
  [
    mkRun({
      exit: 1,
      entries: [redTarget, passed('/t/a.test.ts', 'case-b')],
      patch: (d) => {
        d.testResults.push({
          name: '/t/empty.test.ts',
          status: 'passed',
          message: '',
          assertionResults: [],
        })
        d.numTotalTestSuites = 3
        d.numPassedTestSuites = 3
        return d
      },
    }),
    'zero-leaf passed suite',
  ],
  [
    mkRun({
      exit: 1,
      entries: [redTarget, passed('/t/a.test.ts', 'case-b')],
      patch: (d) => {
        d.numTotalTests = 99
        return d
      },
    }),
    'top-level total count not closing with real leaves',
  ],
  [
    mkRun({
      exit: 1,
      entries: [redTarget, passed('/t/a.test.ts', 'case-b')],
      patch: (d) => {
        d.numPassedTests = 99
        return d
      },
    }),
    'top-level passed count not closing with real leaves',
  ],
  [
    mkRun({
      exit: 1,
      entries: [redTarget, passed('/t/a.test.ts', 'case-b')],
      success: true,
    }),
    'success flag contradicting the failed suite/leaves',
  ],
]
for (const [run, why] of rejections)
  assert(
    !judgedRun(run, scope2, redExpect) && !judgedRun(run, scope2, { kind: 'allGreen' }),
    `judge accepted a dishonest run: ${why}`,
  )

const hash = (file) => createHash('sha256').update(readFileSync(file)).digest('hex')
const repoPinned = [
  ...new Set([...mutations.map((m) => m.source), ...mutations.flatMap((m) => m.scope)]),
].map((f) => (f.startsWith('packages/') ? f : `packages/reforge/${f}`))
const repoHashes = Object.fromEntries(repoPinned.map((f) => [f, hash(resolve(root, f))]))

function recompute() {
  const summary = JSON.parse(readFileSync(resolve(evidenceDir, 'summary.json'), 'utf8'))
  const needles = []
  for (const m of mutations) {
    const row = summary.rows.find((r) => r.id === m.id)
    assert(row, `${m.id}: summary row missing`)
    const states = {}
    let declared
    let targetFile
    for (const state of ['control', 'variant', 'restored']) {
      const data = JSON.parse(readFileSync(resolve(evidenceDir, `${m.id}.${state}.json`), 'utf8'))
      const log = readFileSync(resolve(evidenceDir, `${m.id}.${state}.raw.txt`), 'utf8')
      const run = reportToRun({
        data,
        log,
        exit: row.states[state].exit,
        signal: null,
        spawnError: null,
      })
      if (state === 'control') {
        declared = run.entries.map(identity)
        assert.equal(declared.length, row.scope.declaredLeaves, `${m.id}: scope count drift`)
        assert.equal(
          createHash('sha256').update(declared.join('\n')).digest('hex'),
          row.scope.identitiesSha256,
          `${m.id}: scope identity drift`,
        )
        const candidates = [...new Set(run.entries.map((e) => e.file))].filter((f) =>
          f.endsWith(m.test),
        )
        assert.equal(candidates.length, 1, `${m.id}: ambiguous target file`)
        targetFile = candidates[0]
      }
      const expectation =
        state === 'variant'
          ? { kind: 'singleRed', file: targetFile, fullName: m.title }
          : { kind: 'allGreen' }
      assert(
        judgedRun(run, { identities: declared }, expectation),
        `${m.id}: ${state} rejected by the complete judge on original bytes`,
      )
      states[state] = {
        exit: run.exit,
        sha256: {
          json: hash(resolve(evidenceDir, `${m.id}.${state}.json`)),
          raw: hash(resolve(evidenceDir, `${m.id}.${state}.raw.txt`)),
        },
      }
    }
    needles.push({ id: m.id, scopeLeaves: declared.length, states })
    console.log(`${m.id}: original three-state bytes re-judged clean (${declared.length} leaves)`)
  }
  const receipt = {
    mode: 'recompute',
    judge: { accepted: 2, rejected: rejections.length },
    note: 'original r1 evidence bytes re-judged with the complete judge; no vitest rerun, no artifact rewritten',
    needles,
  }
  writeFileSync(resolve(evidenceDir, 'recompute-r2.json'), `${JSON.stringify(receipt, null, 2)}\n`)
  console.log(`Recompute receipt: ${resolve(evidenceDir, 'recompute-r2.json')}`)
}

function collect() {
  const output = mkdtempSync(join(tmpdir(), 'type-pal-kimi-mid-1-mutants-'))
  const copy = mkdtempSync(join(tmpdir(), 'type-pal-kimi-mid-1-copy-'))
  const rows = []
  try {
    for (const item of ['package.json', 'pnpm-workspace.yaml', 'tsconfig.base.json'])
      cpSync(resolve(root, item), resolve(copy, item))
    for (const item of ['packages/reforge', 'packages/content', 'packages/shared'])
      cpSync(resolve(root, item), resolve(copy, item), { recursive: true, verbatimSymlinks: true })
    // PAL scene JSONs feed the legacy author-flow-stages.test.ts import.meta.glob (read-only data).
    cpSync(
      resolve(root, 'projects/pal/content/scenes'),
      resolve(copy, 'projects/pal/content/scenes'),
      { recursive: true },
    )
    symlinkSync(resolve(root, 'node_modules'), join(copy, 'node_modules'), 'dir')

    const scopeStateFiles = (m) => [m.source, ...m.scope.map((f) => `packages/reforge/${f}`)]
    const stateHashes = (m) =>
      Object.fromEntries(scopeStateFiles(m).map((f) => [f, hash(resolve(copy, f))]))

    const run = (id, files) => {
      const report = resolve(output, `${id}.json`)
      const child = spawnSync(
        'node',
        [
          resolve(copy, 'node_modules/vitest/vitest.mjs'),
          'run',
          '--reporter=json',
          `--outputFile=${report}`,
          ...files,
        ],
        {
          cwd: resolve(copy, 'packages/reforge'),
          env: { ...process.env, FORCE_COLOR: '0' },
          encoding: 'utf8',
        },
      )
      const log = `${child.stdout ?? ''}${child.stderr ?? ''}`
      writeFileSync(resolve(output, `${id}.raw.txt`), log)
      const data = JSON.parse(readFileSync(report, 'utf8'))
      return reportToRun({
        data,
        log,
        exit: child.status,
        signal: child.signal,
        spawnError: child.error ?? null,
      })
    }

    for (const m of mutations) {
      assert.equal(
        readFileSync(resolve(copy, m.source), 'utf8').split(m.from).length,
        2,
        `${m.id}: unique needle`,
      )
      const target = resolve(copy, m.source)
      const pristine = readFileSync(target, 'utf8')
      const targetFile = realpathSync(resolve(copy, 'packages/reforge', m.test))

      const control = run(`${m.id}.control`, m.scope)
      const declared = control.entries.map(identity)
      assert(
        judgedRun(control, { identities: declared }, { kind: 'allGreen' }),
        `${m.id}: control not strictly green; ${output}`,
      )
      const controlHash = stateHashes(m)

      writeFileSync(target, pristine.replace(m.from, m.to))
      const variantHash = stateHashes(m)
      assert.notEqual(variantHash[m.source], controlHash[m.source], `${m.id}: no drift`)
      const variant = run(`${m.id}.variant`, m.scope)
      assert(
        judgedRun(
          variant,
          { identities: declared },
          { kind: 'singleRed', file: targetFile, fullName: m.title },
        ),
        `${m.id}: variant not strictly one declared red; ${output}`,
      )

      writeFileSync(target, pristine)
      const restoredHash = stateHashes(m)
      assert.deepEqual(restoredHash, controlHash, `${m.id}: restore drift`)
      const restored = run(`${m.id}.restored`, m.scope)
      assert(
        judgedRun(restored, { identities: declared }, { kind: 'allGreen' }),
        `${m.id}: restored not strictly green; ${output}`,
      )

      const oldFiles = m.scope.filter((f) => !NEW_FILES.includes(f))
      const oldLeaves = control.entries.filter((entry) =>
        oldFiles.some((f) => entry.file.endsWith(f)),
      )
      if (m.sensitivity) assert(oldLeaves.length > 0, `${m.id}: sensitivity ran zero old leaves`)
      rows.push({
        id: m.id,
        source: m.source,
        needle: { from: m.from, to: m.to },
        target: { file: m.test, fullName: m.title },
        scope: {
          files: m.scope,
          declaredLeaves: declared.length,
          identitiesSha256: createHash('sha256').update(declared.join('\n')).digest('hex'),
          sameAcrossStates: ['control', 'variant', 'restored'],
        },
        sensitivity: m.sensitivity
          ? {
              oldFiles,
              oldLeavesExecuted: oldLeaves.length,
              oldAllGreenVariant: variant.entries
                .filter((entry) => oldLeaves.some((old) => identity(old) === identity(entry)))
                .every((entry) => entry.status === 'passed'),
              onlyNewRed: m.title,
            }
          : null,
        states: {
          control: { exit: control.exit, sha256: controlHash },
          variant: { exit: variant.exit, sha256: variantHash },
          restored: { exit: restored.exit, sha256: restoredHash },
        },
        artifacts: {
          json: [`${m.id}.control.json`, `${m.id}.variant.json`, `${m.id}.restored.json`],
          raw: [`${m.id}.control.raw.txt`, `${m.id}.variant.raw.txt`, `${m.id}.restored.raw.txt`],
        },
      })
      console.log(
        `${m.id}: scope ${declared.length} leaves x3 states; variant strictly one AssertionError; restored green`,
      )
    }
  } finally {
    rmSync(copy, { recursive: true, force: true })
  }
  for (const [file, expected] of Object.entries(repoHashes))
    assert.equal(hash(resolve(root, file)), expected, `repository drift: ${file}`)
  writeFileSync(
    resolve(output, 'summary.json'),
    `${JSON.stringify(
      { repoHashes, judge: { accepted: 2, rejected: rejections.length }, rows },
      null,
      2,
    )}\n`,
  )
  console.log(`Evidence: ${output}`)
}

if (process.argv.includes('--recompute')) recompute()
else collect()
