/**
 * 与 run-counters.mjs 共用 judge.mjs。
 * 用 G01-A 存档构造审核里的四个误收，并重判 40 组三态。
 * 另起真实 Vitest 进程，确认单红叠未处理异常被拒。
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { canonicalTestPath, judgeClean, judgeMutant, judgeTriple } from './judge.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '../../../..')
const mainInstall = '/Users/zhangxu/illegal/type-pal'
const vitest = join(mainInstall, 'node_modules/vitest/vitest.mjs')
const evidence = join(here, 'counters')
const WRONG = 'G01-A loadAll 合法装配 G01-A07 错误完整标题仍含子串'

const text = (path) => readFileSync(path, 'utf8')
const clone = (value) => JSON.parse(JSON.stringify(value))
const fail = (message) => {
  throw new Error(message)
}

function loadTriple(id) {
  const dir = join(evidence, id)
  const load = (label) => ({
    report: JSON.parse(text(join(dir, `${label}.json`))),
    run: {
      exitCode: null,
      signal: null,
      stdout: text(join(dir, `${label}.stdout`)),
      stderr: text(join(dir, `${label}.stderr`)),
    },
  })
  return { original: load('original'), mutant: load('mutant'), restored: load('restored') }
}

function applyExit(states, counter) {
  for (const label of ['original', 'mutant', 'restored']) {
    states[label].run.exitCode = counter.exitCode[label]
    states[label].run.signal = counter.signal[label]
  }
  return states
}

function rewriteTitle(report, from, to) {
  const next = clone(report)
  let hits = 0
  for (const file of next.testResults ?? []) {
    for (const assertion of file.assertionResults ?? []) {
      if (assertion.fullName === from) {
        assertion.fullName = to
        hits += 1
      }
    }
  }
  if (hits !== 1) fail(`rewrite hits ${hits}`)
  return next
}

function legacyFailed(report) {
  const failed = []
  for (const file of report.testResults ?? []) {
    for (const assertion of file.assertionResults ?? []) {
      if (assertion.status !== 'passed') failed.push(assertion)
    }
  }
  return failed
}

function legacyClean(report, run) {
  const reasons = []
  if (run.signal) reasons.push('signal')
  if (run.exitCode !== 0) reasons.push('exit')
  if (
    /Unhandled Errors|Uncaught Exception|Unhandled Rejection/i.test(`${run.stdout}\n${run.stderr}`)
  ) {
    reasons.push('unhandled')
  }
  if ((report.numTotalTests ?? 0) === 0) reasons.push('zero')
  if ((report.numPendingTests ?? 0) !== 0 || (report.numTodoTests ?? 0) !== 0)
    reasons.push('pending')
  if (legacyFailed(report).length !== 0) reasons.push('failed')
  if ((report.numPassedTests ?? 0) === 0) reasons.push('no passed')
  return reasons
}

function legacyMutant(report, run, target) {
  const reasons = []
  if (run.signal) reasons.push('signal')
  if (run.exitCode !== 1) reasons.push('exit')
  if (
    /Unhandled Errors|Uncaught Exception|Unhandled Rejection/i.test(`${run.stdout}\n${run.stderr}`)
  ) {
    reasons.push('unhandled')
  }
  if ((report.numTotalTests ?? 0) === 0) reasons.push('zero')
  if ((report.numPendingTests ?? 0) !== 0 || (report.numTodoTests ?? 0) !== 0)
    reasons.push('pending')
  const failed = legacyFailed(report)
  if (failed.length !== 1) reasons.push('count')
  else {
    const only = failed[0]
    const message = (only.failureMessages ?? []).join('\n')
    if (!String(only.fullName).includes(target)) reasons.push('target')
    if (!message.includes('AssertionError')) reasons.push('assert')
    if (/^\s*(TypeError|ReferenceError|SyntaxError)/m.test(message)) reasons.push('exception')
  }
  return reasons
}

function names(report) {
  const rows = []
  for (const file of report.testResults ?? []) {
    for (const assertion of file.assertionResults ?? []) {
      rows.push(`${file.name}\t${assertion.fullName}`)
    }
  }
  rows.sort()
  return JSON.stringify(rows)
}

function registeredOf(counter) {
  return {
    file: counter.testFile,
    fullName: counter.targetFullName,
    identities: counter.executions.map((row) => ({ file: row.file, fullName: row.fullName })),
  }
}

function mustReject(label, reasons, needle, legacyAccepted) {
  if (!legacyAccepted) fail(`${label} legacy fixture was not accepted`)
  if (reasons.length === 0) fail(`${label} was accepted`)
  if (!reasons.some((reason) => reason.includes(needle)))
    fail(`${label} missing ${needle}: ${reasons}`)
  return { id: label, rejected: true, legacyAccepted: true, reasons }
}

function copyTree(destination) {
  mkdirSync(join(destination, 'packages'), { recursive: true })
  const rsync = spawnSync(
    'rsync',
    [
      '-a',
      '--exclude',
      'node_modules',
      `${join(root, 'packages/game')}/`,
      `${join(destination, 'packages/game')}/`,
    ],
    { encoding: 'utf8' },
  )
  if (rsync.status !== 0) fail(rsync.stderr || 'rsync failed')
  writeFileSync(
    join(destination, 'tsconfig.base.json'),
    readFileSync(join(root, 'tsconfig.base.json')),
  )
  spawnSync('ln', ['-s', join(mainInstall, 'node_modules'), join(destination, 'node_modules')])
  spawnSync('ln', [
    '-s',
    join(mainInstall, 'packages/game/node_modules'),
    join(destination, 'packages/game/node_modules'),
  ])
}

function runRealProbe() {
  const tree = mkdtempSync(join(tmpdir(), 'grok-r1-judge-selftest-'))
  try {
    copyTree(tree)
    writeFileSync(
      join(tree, 'packages/game/src/probe-unhandled.grok-r1.test.ts'),
      [
        "import { expect, test } from 'vitest'",
        '',
        "test('probe single red plus unhandled', async () => {",
        '  setTimeout(() => {',
        "    throw new Error('probe-unhandled-exception')",
        '  }, 15)',
        '  await new Promise((resolve) => setTimeout(resolve, 40))',
        '  expect(1).toBe(2)',
        '})',
        '',
      ].join('\n'),
    )
    const jsonPath = join(tree, 'probe.json')
    const child = spawnSync(
      process.execPath,
      [
        vitest,
        'run',
        'src/probe-unhandled.grok-r1.test.ts',
        '--reporter=verbose',
        '--reporter=json',
        `--outputFile=${jsonPath}`,
      ],
      {
        cwd: join(tree, 'packages/game'),
        encoding: 'utf8',
        env: { ...process.env, CI: '1', NO_COLOR: '1' },
      },
    )
    const report = JSON.parse(text(jsonPath))
    const run = {
      exitCode: child.status,
      signal: child.signal,
      stdout: child.stdout ?? '',
      stderr: child.stderr ?? '',
    }
    const judgement = judgeMutant(
      report,
      run,
      { file: 'src/probe-unhandled.grok-r1.test.ts', fullName: 'probe single red plus unhandled' },
      { tempRoot: tree },
    )
    if (!judgement.reasons.some((reason) => reason.includes('unhandled'))) {
      fail(`real vitest probe was not rejected: ${judgement.reasons.join('; ')}`)
    }
    return {
      id: 'real-vitest-single-red-plus-unhandled',
      rejected: true,
      exitCode: run.exitCode,
      signal: run.signal,
      reasons: judgement.reasons,
    }
  } finally {
    rmSync(tree, { recursive: true, force: true })
  }
}

const runnerSource = text(join(here, 'run-counters.mjs'))
if (!runnerSource.includes("from './judge.mjs'")) fail('runner does not import judge.mjs')
if (!runnerSource.includes('judgeTriple(') || !runnerSource.includes('judgeMutant(')) {
  fail('runner does not call the shared judge')
}

const counters = JSON.parse(text(join(here, 'counters.json')))
const g01Counter = counters.counters.find((counter) => counter.id === 'G01-A')
if (!g01Counter) fail('missing G01-A')
const g01 = applyExit(loadTriple('G01-A'), g01Counter)
const registered = registeredOf(g01Counter)
const kept = judgeTriple(g01, registered)
if (kept.reasons.length !== 0) fail(`G01-A rejudge ${kept.reasons.join('; ')}`)

const wrongName = 'G01-A07'
const wrongStates = {
  original: {
    report: rewriteTitle(g01.original.report, g01Counter.targetFullName, WRONG),
    run: g01.original.run,
  },
  mutant: {
    report: rewriteTitle(g01.mutant.report, g01Counter.targetFullName, WRONG),
    run: g01.mutant.run,
  },
  restored: {
    report: rewriteTitle(g01.restored.report, g01Counter.targetFullName, WRONG),
    run: g01.restored.run,
  },
}
if (names(wrongStates.original.report) !== names(wrongStates.mutant.report)) {
  fail('wrong-title fixture changed the name multiset')
}
const wrong = judgeTriple(wrongStates, registered)
if (wrong.reasons.includes('execution identity multiset changed')) {
  fail('wrong-title fixture was supposed to keep sameNames')
}
const wrongCase = mustReject(
  'wrong-complete-title-still-contains-short-id',
  wrong.reasons,
  'wrong target',
  legacyClean(wrongStates.original.report, wrongStates.original.run).length === 0 &&
    legacyMutant(wrongStates.mutant.report, wrongStates.mutant.run, wrongName).length === 0,
)

const runtimeReport = clone(g01.mutant.report)
runtimeReport.numRuntimeErrorTestSuites = 1
runtimeReport.testResults.push({
  name: '/tmp/grok-r1-G01-A/packages/game/src/empty-runtime.grok-r1.test.ts',
  status: 'failed',
  assertionResults: [],
  message: 'TypeError: suite runtime',
})
const runtime = judgeTriple(
  {
    original: g01.original,
    mutant: { report: runtimeReport, run: g01.mutant.run },
    restored: g01.restored,
  },
  registered,
)
const runtimeCase = mustReject(
  'single-red-plus-empty-failed-suite-and-runtime-error',
  runtime.reasons,
  'runtime error suite',
  legacyMutant(runtimeReport, g01.mutant.run, wrongName).length === 0,
)
if (!runtime.reasons.some((reason) => reason.includes('collection failure'))) {
  fail(`runtime fixture missed collection failure: ${runtime.reasons}`)
}

const inflated = clone(g01.mutant.report)
inflated.numTotalTests += 1
const inflatedJudgement = judgeTriple(
  {
    original: g01.original,
    mutant: { report: inflated, run: g01.mutant.run },
    restored: g01.restored,
  },
  registered,
)
const inflatedCase = mustReject(
  'numTotalTests-increased-without-new-leaf',
  inflatedJudgement.reasons,
  'numTotalTests does not close',
  legacyMutant(inflated, g01.mutant.run, wrongName).length === 0,
)

const emptyClean = {
  numTotalTests: 1,
  numPassedTests: 1,
  numFailedTests: 0,
  numPendingTests: 0,
  numTodoTests: 0,
  numRuntimeErrorTestSuites: 0,
  success: true,
  testResults: [],
}
const emptyRun = { exitCode: 0, signal: null, stdout: '', stderr: '' }
const emptyReasons = judgeClean(emptyClean, emptyRun)
const emptyCase = mustReject(
  'clean-claims-one-pass-with-empty-testResults',
  emptyReasons,
  'zero leaf executions',
  legacyClean(emptyClean, emptyRun).length === 0,
)

const collected = clone(g01.original.report)
collected.testResults.push({
  name: '/tmp/grok-r1-G01-A/packages/game/src/collect-fail.grok-r1.test.ts',
  status: 'failed',
  assertionResults: [],
  message: 'Transform failed',
})
const collectedReasons = judgeClean(collected, g01.original.run)
const collectedCase = mustReject(
  'collection-failure-empty-suite',
  collectedReasons,
  'collection failure',
  legacyClean(collected, g01.original.run).length === 0,
)

const spawnReasons = judgeClean(g01.original.report, {
  exitCode: null,
  signal: null,
  stdout: '',
  stderr: '',
})
if (!spawnReasons.some((reason) => reason.includes('spawn error'))) fail(`spawn ${spawnReasons}`)
const signalReasons = judgeMutant(
  g01.mutant.report,
  { exitCode: null, signal: 'SIGTERM', stdout: '', stderr: '' },
  registered,
)
if (!signalReasons.reasons.some((reason) => reason.includes('signal SIGTERM'))) {
  fail(`signal ${signalReasons.reasons}`)
}
const rawReasons = judgeClean(g01.original.report, {
  exitCode: 0,
  signal: null,
  stdout: '',
  stderr: 'Unhandled Errors\n',
})
if (!rawReasons.some((reason) => reason.includes('unhandled error'))) fail(`raw ${rawReasons}`)

const samplePath = g01.original.report.testResults[0].name
const sampleRoot = samplePath.slice(0, samplePath.indexOf('/packages/game/'))
const canonical = 'packages/game/src/assets/load-all-assemble.grok-r1.test.ts'
if (canonicalTestPath(samplePath, sampleRoot) !== canonical)
  fail('temp root strip dropped package path')
if (canonicalTestPath(g01Counter.testFile) !== canonical)
  fail('registered src path did not keep package')
if (canonicalTestPath(samplePath) !== canonical) fail('absolute report path did not keep package')
if (canonicalTestPath(samplePath).endsWith('/load-all-assemble.grok-r1.test.ts') === false) {
  fail('canonical path lost the test file')
}

const rejudge = []
for (const counter of counters.counters) {
  if (counter.id === 'probe-reject') continue
  const states = applyExit(loadTriple(counter.id), counter)
  const judgement = judgeTriple(states, registeredOf(counter))
  rejudge.push({
    id: counter.id,
    accepted: judgement.reasons.length === 0,
    reasons: judgement.reasons,
  })
  if (judgement.reasons.length !== 0) fail(`${counter.id} rejudge ${judgement.reasons.join('; ')}`)
}
if (rejudge.length !== 40) fail(`rejudged ${rejudge.length}`)

const probe = runRealProbe()
const output = {
  judgeModule: 'docs/testing/grok-cursor-large/grok/judge.mjs',
  sharedBy: [
    'docs/testing/grok-cursor-large/grok/run-counters.mjs',
    'docs/testing/grok-cursor-large/grok/judge.selftest.mjs',
  ],
  pathPolicy: 'strip temp root only; keep packages/game subpath',
  falseAcceptsRejected: [wrongCase, runtimeCase, inflatedCase, emptyCase],
  extraGatesRejected: [
    collectedCase,
    { id: 'spawn-error', rejected: true, reasons: spawnReasons },
    { id: 'signal', rejected: true, reasons: signalReasons.reasons },
    { id: 'raw-unhandled-on-clean', rejected: true, reasons: rawReasons },
  ],
  rejudge: { accepted: rejudge.length, rejected: 0, ids: rejudge.map((row) => row.id) },
  realVitestProbe: probe,
}
writeFileSync(join(here, 'judge-selftest.json'), `${JSON.stringify(output, null, 2)}\n`)
console.log(
  JSON.stringify({
    falseAcceptsRejected: 4,
    rejudged: rejudge.length,
    probeRejected: probe.rejected,
    probeExit: probe.exitCode,
  }),
)
