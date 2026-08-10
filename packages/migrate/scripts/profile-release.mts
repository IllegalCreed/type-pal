import { type ChildProcess, execFileSync, spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir, totalmem } from 'node:os'
import { dirname, relative, resolve, sep } from 'node:path'
import { performance } from 'node:perf_hooks'
import { fileURLToPath } from 'node:url'
import {
  type ListedVitestTest,
  normalizeTestList,
  summarizeTestList,
  type TestListSummary,
} from '../src/test-manifest.js'

/**
 * Read-only release profiler.
 *
 * This command deliberately launches each stage in a fresh child process. It does not import a
 * PAL producer, read an authority, or alter a baseline/project. The profiler is diagnostic only;
 * the normal `test:release` command remains the release gate.
 */

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const manifestPath = resolve(packageRoot, 'test-fixtures/test-manifest-v1.json')
const runId = `${new Date().toISOString().replaceAll(':', '').replaceAll('.', '')}-${randomBytes(4).toString('hex')}`
const runRoot = resolve(tmpdir(), `type-pal-release-profile-${runId}`)
const reportRoot = resolve(runRoot, 'reports')
const logRoot = resolve(runRoot, 'logs')
mkdirSync(reportRoot, { recursive: true })
mkdirSync(logRoot, { recursive: true })

const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
const RSS_SAMPLE_MS = 1_000
const mode: 'full' | 'smoke' = process.argv.includes('--smoke') ? 'smoke' : 'full'
const unknownArgs = process.argv.slice(2).filter((arg) => arg !== '--smoke' && arg !== '--')

let activeChild: ChildProcess | undefined
let interruptedBy: NodeJS.Signals | undefined

function terminateChild(child: ChildProcess, signal: NodeJS.Signals): void {
  try {
    if (process.platform !== 'win32' && child.pid) process.kill(-child.pid, signal)
    else child.kill(signal)
  } catch {
    try {
      child.kill(signal)
    } catch {
      // The child may have exited between signal delivery and the fallback.
    }
  }
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    interruptedBy ??= signal
    if (activeChild) terminateChild(activeChild, signal)
  })
}

interface ManifestGate {
  files: number
  tests: number
  sha256: string
  routeSha256: string
}

interface TestManifestV1 {
  kind: 'migrate-test-manifest'
  version: 1
  baseline: { files: number; tests: number }
  gates: { fast: ManifestGate; release: ManifestGate; canary: ManifestGate }
}

interface ProcessRssSample {
  bytes: number
  pids: number[]
}

interface ChildResult {
  durationMs: number
  exitCode: number | null
  signal: NodeJS.Signals | null
  stdout: string
  stderr: string
  maxRssBytes: number | null
  rssSamples: number
}

interface PhaseReport {
  schemaVersion: 1
  runId: string
  phase: string
  execution: 'manifest' | 'vitest'
  command: string[]
  startedAt: string
  durationMs: number
  exitCode: number | null
  signal: NodeJS.Signals | null
  files: number | null
  tests: number | null
  assertions: number | null
  passed: number | null
  skipped: number | null
  unlistedSkipped: number | null
  failed: number | null
  maxRssBytes: number | null
  rssSampleIntervalMs: number
  rssScope: 'process-tree' | 'not-applicable' | 'unavailable'
  logPath: string
  reportPath: string | null
  expected?: {
    files: number
    tests: number
    sha256: string
    routeSha256: string
  }
  error?: string
}

interface ProfileSummary {
  schemaVersion: 1
  runId: string
  mode: 'full' | 'smoke'
  complete: boolean
  startedAt: string
  finishedAt: string
  durationMs: number
  runRoot: string
  host: { platform: string; arch: string; node: string; totalMemoryBytes: number }
  success: boolean
  interruptedBy?: NodeJS.Signals
  phases: PhaseReport[]
}

interface VitestJsonReport {
  numTotalTestSuites?: unknown
  numTotalTests?: unknown
  numPassedTests?: unknown
  numFailedTests?: unknown
  numPendingTests?: unknown
  numTodoTests?: unknown
  success?: unknown
  testResults?: unknown
}

interface VitestJsonFileResult {
  name?: unknown
  status?: unknown
  message?: unknown
  assertionResults?: unknown
}

interface VitestJsonAssertionResult {
  ancestorTitles?: unknown
  fullName?: unknown
  status?: unknown
  title?: unknown
}

function integerAt(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0)
    throw new Error(`release profiler: ${label} 不是非负安全整数`)
  return value
}

function readManifest(): TestManifestV1 {
  const value: unknown = JSON.parse(readFileSync(manifestPath, 'utf8'))
  if (!value || typeof value !== 'object')
    throw new Error('release profiler: test manifest 不是对象')
  const manifest = value as Partial<TestManifestV1>
  if (manifest.kind !== 'migrate-test-manifest' || manifest.version !== 1 || !manifest.gates)
    throw new Error('release profiler: test manifest 版本不受支持')
  for (const name of ['fast', 'release', 'canary'] as const) {
    const gate = manifest.gates[name]
    if (
      !gate ||
      !Number.isSafeInteger(gate.files) ||
      !Number.isSafeInteger(gate.tests) ||
      typeof gate.sha256 !== 'string' ||
      !/^[0-9a-f]{64}$/.test(gate.sha256) ||
      typeof gate.routeSha256 !== 'string' ||
      !/^[0-9a-f]{64}$/.test(gate.routeSha256)
    )
      throw new Error(`release profiler: test manifest ${name} pin 非法`)
  }
  return manifest as TestManifestV1
}

function listTests(config: string, projects: string[]): TestListSummary {
  const args = ['exec', 'vitest', 'list', '--config', config, '--json']
  for (const project of projects) args.push('--project', project)
  const raw = execFileSync(pnpmCommand, args, {
    cwd: packageRoot,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
    env: { ...process.env, TYPE_PAL_MIGRATE_TEST_GATE: 'release' },
  })
  const entries = JSON.parse(raw) as ListedVitestTest[]
  return summarizeTestList(normalizeTestList(entries, packageRoot))
}

function parseManifestOutput(output: string): {
  fast: ManifestGate
  release: ManifestGate
  canary: ManifestGate
} {
  const match =
    /test manifest verified: fast (\d+)\/(\d+), release (\d+)\/(\d+), canary (\d+)\/(\d+)/.exec(
      output,
    )
  if (!match) throw new Error('release profiler: test:manifest 输出缺少稳定摘要')
  const values = match.slice(1).map((value) => Number(value))
  if (values.some((value) => !Number.isSafeInteger(value) || value < 0))
    throw new Error('release profiler: test:manifest 摘要不是整数')
  const [fastFiles, fastTests, releaseFiles, releaseTests, canaryFiles, canaryTests] = values as [
    number,
    number,
    number,
    number,
    number,
    number,
  ]
  const manifest = readManifest()
  const gate = (
    name: keyof TestManifestV1['gates'],
    files: number,
    tests: number,
  ): ManifestGate => {
    const pinned = manifest.gates[name]
    if (pinned.files !== files || pinned.tests !== tests)
      throw new Error(`release profiler: ${name} manifest 摘要与 pin 不一致`)
    return pinned
  }
  return {
    fast: gate('fast', fastFiles, fastTests),
    release: gate('release', releaseFiles, releaseTests),
    canary: gate('canary', canaryFiles, canaryTests),
  }
}

function parsePsTable(raw: string): Map<number, { parent: number; rssKiB: number }> {
  const processes = new Map<number, { parent: number; rssKiB: number }>()
  for (const line of raw.split('\n')) {
    const fields = line.trim().split(/\s+/)
    if (fields.length < 3) continue
    const pid = Number(fields[0])
    const parent = Number(fields[1])
    const rssKiB = Number(fields[2])
    if (
      Number.isSafeInteger(pid) &&
      Number.isSafeInteger(parent) &&
      Number.isSafeInteger(rssKiB) &&
      pid > 0 &&
      parent >= 0 &&
      rssKiB >= 0
    )
      processes.set(pid, { parent, rssKiB })
  }
  return processes
}

function sampleProcessTreeRss(rootPid: number): ProcessRssSample {
  if (process.platform === 'win32') throw new Error('release profiler: Windows 不支持 ps RSS 采样')
  const raw = execFileSync('ps', ['-axo', 'pid=,ppid=,rss='], {
    encoding: 'utf8',
    maxBuffer: 4 * 1024 * 1024,
  })
  const processes = parsePsTable(raw)
  const descendants = new Set<number>([rootPid])
  let changed = true
  while (changed) {
    changed = false
    for (const [pid, info] of processes) {
      if (descendants.has(info.parent) && !descendants.has(pid)) {
        descendants.add(pid)
        changed = true
      }
    }
  }
  const bytes = [...descendants].reduce(
    (total, pid) => total + (processes.get(pid)?.rssKiB ?? 0) * 1024,
    0,
  )
  if (!bytes) throw new Error(`release profiler: PID ${rootPid} 的进程树 RSS 不可读`)
  return { bytes, pids: [...descendants].sort((left, right) => left - right) }
}

function runChild(args: string[], env: NodeJS.ProcessEnv, logPath: string): Promise<ChildResult> {
  const started = performance.now()
  const child: ChildProcess = spawn(pnpmCommand, args, {
    cwd: packageRoot,
    detached: process.platform !== 'win32',
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  activeChild = child
  let maxRssBytes: number | null = null
  let rssSamples = 0
  let rssUnavailable = false
  const sample = (): void => {
    if (!child.pid) {
      rssUnavailable = true
      return
    }
    try {
      const value = sampleProcessTreeRss(child.pid).bytes
      rssSamples += 1
      maxRssBytes = Math.max(maxRssBytes ?? 0, value)
    } catch {
      // `exit` precedes `close`; an interval may observe that narrow drain window. It is not a
      // telemetry failure once Node already knows the child has exited.
      if (child.exitCode === null && child.signalCode === null) rssUnavailable = true
    }
  }
  sample()
  const timer = setInterval(sample, RSS_SAMPLE_MS)
  child.once('exit', () => clearInterval(timer))
  const stdoutChunks: string[] = []
  const stderrChunks: string[] = []
  const logFile = createWriteStream(logPath, { flags: 'a' })
  child.stdout?.setEncoding('utf8')
  child.stderr?.setEncoding('utf8')
  child.stdout?.on('data', (chunk: string) => {
    stdoutChunks.push(chunk)
    logFile.write(chunk)
    process.stdout.write(chunk)
  })
  child.stderr?.on('data', (chunk: string) => {
    stderrChunks.push(chunk)
    logFile.write(chunk)
    process.stderr.write(chunk)
  })
  return new Promise((resolveResult, rejectResult) => {
    child.once('error', (error) => {
      clearInterval(timer)
      if (activeChild === child) activeChild = undefined
      logFile.end()
      rejectResult(error)
    })
    child.once('close', (exitCode, signal) => {
      clearInterval(timer)
      if (activeChild === child) activeChild = undefined
      logFile.end()
      resolveResult({
        durationMs: performance.now() - started,
        exitCode,
        signal,
        stdout: stdoutChunks.join(''),
        stderr: stderrChunks.join(''),
        maxRssBytes: rssUnavailable ? null : maxRssBytes,
        rssSamples,
      })
    })
  })
}

function parseVitestReport(
  path: string,
  expected: TestListSummary,
): {
  files: number
  tests: number
  assertions: number
  passed: number
  skipped: number
  unlistedSkipped: number
  failed: number
} {
  if (!existsSync(path)) throw new Error(`release profiler: Vitest JSON report 缺失 ${path}`)
  const report = JSON.parse(readFileSync(path, 'utf8')) as VitestJsonReport
  if (!Array.isArray(report.testResults))
    throw new Error('release profiler: Vitest testResults 不是数组')
  const expectedByFile = new Map<string, Set<string>>()
  for (const entry of expected.entries) {
    const names = expectedByFile.get(entry.file) ?? new Set<string>()
    if (names.has(entry.name))
      throw new Error(`release profiler: expected test 重复 ${entry.file} :: ${entry.name}`)
    names.add(entry.name)
    expectedByFile.set(entry.file, names)
  }
  const actualByFile = new Map<string, Map<string, 'passed' | 'failed' | 'skipped'>>()
  for (const value of report.testResults as VitestJsonFileResult[]) {
    if (typeof value.name !== 'string' || !value.name)
      throw new Error('release profiler: Vitest test result 缺文件名')
    const file = relative(packageRoot, value.name).split(sep).join('/')
    if (!file || file === '..' || file.startsWith('../') || file.startsWith('/'))
      throw new Error(`release profiler: Vitest 文件不在 package root ${value.name}`)
    if (actualByFile.has(file)) throw new Error(`release profiler: Vitest 文件重复 ${file}`)
    if (!Array.isArray(value.assertionResults))
      throw new Error(`release profiler: Vitest assertionResults 不是数组 ${file}`)
    if (value.status !== 'passed')
      throw new Error(
        `release profiler: Vitest 文件 status 非 passed ${file}: ${String(value.message ?? '')}`,
      )
    const assertions = new Map<string, 'passed' | 'failed' | 'skipped'>()
    for (const assertion of value.assertionResults as VitestJsonAssertionResult[]) {
      if (
        !Array.isArray(assertion.ancestorTitles) ||
        assertion.ancestorTitles.some(
          (ancestor) => typeof ancestor !== 'string' || !ancestor.trim(),
        ) ||
        typeof assertion.title !== 'string' ||
        !assertion.title.trim() ||
        typeof assertion.fullName !== 'string' ||
        !assertion.fullName.trim()
      )
        throw new Error(`release profiler: Vitest assertion identity 缺失 ${file}`)
      const ancestors = assertion.ancestorTitles as string[]
      const name = [...ancestors, assertion.title]
        .map((part) => part.trim().replace(/\s+/g, ' '))
        .join(' > ')
      if (assertions.has(name))
        throw new Error(`release profiler: Vitest assertion 重复 ${file} :: ${name}`)
      const status =
        assertion.status === 'passed'
          ? 'passed'
          : assertion.status === 'failed'
            ? 'failed'
            : assertion.status === 'pending' ||
                assertion.status === 'todo' ||
                assertion.status === 'skipped'
              ? 'skipped'
              : undefined
      if (!status)
        throw new Error(
          `release profiler: Vitest assertion status 非法 ${file} :: ${name} = ${String(assertion.status)}`,
        )
      assertions.set(name, status)
    }
    actualByFile.set(file, assertions)
  }
  for (const [file, names] of expectedByFile) {
    const actual = actualByFile.get(file)
    if (!actual) throw new Error(`release profiler: Vitest 文件缺失 ${file}`)
    for (const name of names) {
      const status = actual.get(name)
      if (!status) throw new Error(`release profiler: Vitest test 缺失 ${file} :: ${name}`)
      if (status === 'skipped')
        throw new Error(`release profiler: Vitest 已列入 test 在执行期 skipped ${file} :: ${name}`)
    }
    for (const [name, status] of actual) {
      if (!names.has(name) && status !== 'skipped')
        throw new Error(
          `release profiler: Vitest 未列入 test 不是 skipped ${file} :: ${name} = ${status}`,
        )
    }
    if (![...names].some((name) => actual.get(name) === 'passed'))
      throw new Error(`release profiler: Vitest 文件全量 skipIf/无通过断言 ${file}`)
  }
  for (const file of actualByFile.keys()) {
    if (!expectedByFile.has(file)) throw new Error(`release profiler: Vitest 未知文件 ${file}`)
  }
  const files = expected.files
  const tests = expected.tests
  const assertions = integerAt(report.numTotalTests, 'numTotalTests')
  const passed = [...actualByFile.values()].reduce(
    (total, assertions) =>
      total + [...assertions.values()].filter((status) => status === 'passed').length,
    0,
  )
  const failed = [...actualByFile.values()].reduce(
    (total, assertions) =>
      total + [...assertions.values()].filter((status) => status === 'failed').length,
    0,
  )
  const skipped = [...actualByFile.values()].reduce(
    (total, assertions) =>
      total + [...assertions.values()].filter((status) => status === 'skipped').length,
    0,
  )
  const unlistedSkipped = [...actualByFile].reduce((total, [file, assertionsByName]) => {
    const expectedNames = expectedByFile.get(file)
    if (!expectedNames) return total
    return (
      total +
      [...assertionsByName].filter(
        ([name, status]) => !expectedNames.has(name) && status === 'skipped',
      ).length
    )
  }, 0)
  const reportedPassed = integerAt(report.numPassedTests, 'numPassedTests')
  const reportedFailed = integerAt(report.numFailedTests, 'numFailedTests')
  const reportedSkipped =
    integerAt(report.numPendingTests, 'numPendingTests') +
    integerAt(report.numTodoTests, 'numTodoTests')
  if (report.success !== true || actualByFile.size !== expected.files)
    throw new Error(
      `release profiler: Vitest report mismatch files=${actualByFile.size}, expected=${expected.files}`,
    )
  if (
    passed !== reportedPassed ||
    failed !== reportedFailed ||
    skipped !== reportedSkipped ||
    passed + failed + skipped !== assertions ||
    assertions !== tests + unlistedSkipped ||
    skipped !== unlistedSkipped
  )
    throw new Error(
      `release profiler: Vitest status census mismatch actual=${passed}/${failed}/${skipped}/${assertions} listed=${tests} unlistedSkipped=${unlistedSkipped} reported=${reportedPassed}/${reportedFailed}/${reportedSkipped}`,
    )
  const listedSkipped = skipped - unlistedSkipped
  if (tests > 0 && passed === 0 && listedSkipped === tests)
    throw new Error(`release profiler: Vitest phase 全量 skipIf ${listedSkipped}/${tests}`)
  return { files, tests, assertions, passed, skipped, unlistedSkipped, failed }
}

function phaseLogPath(phase: string): string {
  return resolve(logRoot, `${phase}.log`)
}

async function runVitestPhase(
  phase: string,
  config: string,
  projects: string[],
  expected: TestListSummary,
  gate: string,
): Promise<PhaseReport> {
  const reportPath = resolve(reportRoot, `${phase}.vitest.json`)
  const args = [
    'exec',
    'vitest',
    'run',
    '--config',
    config,
    '--reporter=json',
    `--outputFile=${reportPath}`,
  ]
  for (const project of projects) args.push('--project', project)
  const startedAt = new Date().toISOString()
  let child: ChildResult
  try {
    child = await runChild(
      args,
      { ...process.env, TYPE_PAL_MIGRATE_TEST_GATE: gate },
      phaseLogPath(phase),
    )
  } catch (error) {
    return {
      schemaVersion: 1,
      runId,
      phase,
      execution: 'vitest',
      command: [pnpmCommand, ...args],
      startedAt,
      durationMs: 0,
      exitCode: null,
      signal: null,
      files: null,
      tests: null,
      assertions: null,
      passed: null,
      skipped: null,
      unlistedSkipped: null,
      failed: null,
      maxRssBytes: null,
      rssSampleIntervalMs: RSS_SAMPLE_MS,
      rssScope: 'unavailable',
      logPath: phaseLogPath(phase),
      reportPath,
      error: error instanceof Error ? error.message : String(error),
    }
  }
  let counts: ReturnType<typeof parseVitestReport> | undefined
  let reportError: string | undefined
  try {
    counts = parseVitestReport(reportPath, expected)
  } catch (error) {
    reportError = error instanceof Error ? error.message : String(error)
  }
  const childError =
    child.exitCode === 0 && child.signal === null && child.maxRssBytes !== null
      ? undefined
      : `child exit=${String(child.exitCode)} signal=${String(child.signal)} rssSamples=${child.rssSamples}`
  return {
    schemaVersion: 1,
    runId,
    phase,
    execution: 'vitest',
    command: [pnpmCommand, ...args],
    startedAt,
    durationMs: child.durationMs,
    exitCode: child.exitCode,
    signal: child.signal,
    files: counts?.files ?? null,
    tests: counts?.tests ?? null,
    assertions: counts?.assertions ?? null,
    passed: counts?.passed ?? null,
    skipped: counts?.skipped ?? null,
    unlistedSkipped: counts?.unlistedSkipped ?? null,
    failed: counts?.failed ?? null,
    maxRssBytes: child.maxRssBytes,
    rssSampleIntervalMs: RSS_SAMPLE_MS,
    rssScope: child.maxRssBytes === null ? 'unavailable' : 'process-tree',
    logPath: phaseLogPath(phase),
    reportPath,
    expected: {
      files: expected.files,
      tests: expected.tests,
      sha256: expected.sha256,
      routeSha256: expected.routeSha256,
    },
    ...(reportError || childError
      ? { error: [childError, reportError].filter(Boolean).join('; ') }
      : {}),
  }
}

async function runManifestPhase(): Promise<{
  report: PhaseReport
  gates?: TestManifestV1['gates']
}> {
  const startedAt = new Date().toISOString()
  const phase = 'manifest'
  let child: ChildResult
  try {
    child = await runChild(['run', 'test:manifest'], { ...process.env }, phaseLogPath(phase))
  } catch (error) {
    return {
      report: {
        schemaVersion: 1,
        runId,
        phase,
        execution: 'manifest',
        command: [pnpmCommand, 'run', 'test:manifest'],
        startedAt,
        durationMs: 0,
        exitCode: null,
        signal: null,
        files: null,
        tests: null,
        assertions: null,
        passed: null,
        skipped: null,
        unlistedSkipped: null,
        failed: null,
        maxRssBytes: null,
        rssSampleIntervalMs: RSS_SAMPLE_MS,
        rssScope: 'unavailable',
        logPath: phaseLogPath(phase),
        reportPath: null,
        error: error instanceof Error ? error.message : String(error),
      },
    }
  }
  let gates: TestManifestV1['gates'] | undefined
  let parseError: string | undefined
  try {
    gates = parseManifestOutput(`${child.stdout}\n${child.stderr}`)
  } catch (error) {
    parseError = error instanceof Error ? error.message : String(error)
  }
  const childError =
    child.exitCode === 0 && child.signal === null && child.maxRssBytes !== null
      ? undefined
      : `manifest child exit=${String(child.exitCode)} signal=${String(child.signal)} rssSamples=${child.rssSamples}`
  return {
    report: {
      schemaVersion: 1,
      runId,
      phase,
      execution: 'manifest',
      command: [pnpmCommand, 'run', 'test:manifest'],
      startedAt,
      durationMs: child.durationMs,
      exitCode: child.exitCode,
      signal: child.signal,
      files: gates?.release.files ?? null,
      tests: gates?.release.tests ?? null,
      assertions: null,
      passed: null,
      skipped: null,
      unlistedSkipped: null,
      failed: null,
      maxRssBytes: child.maxRssBytes,
      rssSampleIntervalMs: RSS_SAMPLE_MS,
      rssScope: child.maxRssBytes === null ? 'unavailable' : 'process-tree',
      logPath: phaseLogPath(phase),
      reportPath: null,
      ...(gates ? { expected: gates.release } : {}),
      ...(parseError || childError
        ? { error: [childError, parseError].filter(Boolean).join('; ') }
        : {}),
    },
    ...(gates ? { gates } : {}),
  }
}

function assertManifestAndLists(
  manifestGates: TestManifestV1['gates'],
  expected: {
    preflight: TestListSummary
    unit: TestListSummary
    shared: TestListSummary
    fresh: TestListSummary
    canary: TestListSummary
  },
): void {
  const release = listTests('vitest.release.config.ts', [])
  if (
    release.files !== manifestGates.release.files ||
    release.tests !== manifestGates.release.tests ||
    release.sha256 !== manifestGates.release.sha256 ||
    release.routeSha256 !== manifestGates.release.routeSha256
  )
    throw new Error('release profiler: release list 与 manifest pin 不一致')
  const stagedEntries = [
    ...expected.unit.entries,
    ...expected.shared.entries,
    ...expected.fresh.entries,
  ]
  const stagedKeys = new Set(stagedEntries.map((entry) => entry.key))
  if (stagedKeys.size !== stagedEntries.length)
    throw new Error('release profiler: release stage union 存在重复 test')
  const staged = summarizeTestList(stagedEntries)
  if (
    staged.files !== release.files ||
    staged.tests !== release.tests ||
    staged.sha256 !== release.sha256 ||
    staged.routeSha256 !== release.routeSha256
  )
    throw new Error('release profiler: unit/shared/fresh union 与 release manifest 不闭合')
  if (
    expected.canary.files !== manifestGates.canary.files ||
    expected.canary.tests !== manifestGates.canary.tests ||
    expected.canary.sha256 !== manifestGates.canary.sha256 ||
    expected.canary.routeSha256 !== manifestGates.canary.routeSha256
  )
    throw new Error('release profiler: canary list 与 manifest pin 不一致')
}

async function main(): Promise<void> {
  const startedAt = new Date().toISOString()
  const monotonicStartedAt = performance.now()
  const reports: PhaseReport[] = []
  let success = true
  try {
    if (unknownArgs.length)
      throw new Error(`release profiler: unknown arguments ${unknownArgs.join(' ')}`)
    const manifest = await runManifestPhase()
    reports.push(manifest.report)
    if (manifest.report.error) throw new Error(manifest.report.error)
    if (!manifest.gates) throw new Error('release profiler: manifest gates 缺失')

    const expected = {
      preflight: listTests('vitest.release.config.ts', ['release-preflight']),
      unit: listTests('vitest.release.config.ts', ['release-preflight', 'release-unit']),
      shared: listTests('vitest.release.config.ts', ['release-pal-shared']),
      fresh: listTests('vitest.release.config.ts', ['release-pal-fresh']),
      canary: listTests('vitest.canary.config.ts', []),
    }
    assertManifestAndLists(manifest.gates, expected)

    const stages: Array<[string, string, string[], TestListSummary, string]> =
      mode === 'smoke'
        ? [
            [
              'release-preflight',
              'vitest.release.config.ts',
              ['release-preflight'],
              expected.preflight,
              'release',
            ],
          ]
        : [
            ['canary', 'vitest.canary.config.ts', [], expected.canary, 'canary'],
            [
              'release-preflight-unit',
              'vitest.release.config.ts',
              ['release-preflight', 'release-unit'],
              expected.unit,
              'release',
            ],
            [
              'release-pal-shared',
              'vitest.release.config.ts',
              ['release-pal-shared'],
              expected.shared,
              'release-shared',
            ],
            [
              'release-pal-fresh',
              'vitest.release.config.ts',
              ['release-pal-fresh'],
              expected.fresh,
              'release',
            ],
          ]
    for (const [phase, config, projects, list, gate] of stages) {
      const report = await runVitestPhase(phase, config, projects, list, gate)
      reports.push(report)
      if (report.error) {
        success = false
        break
      }
    }
  } catch (error) {
    success = false
    reports.push({
      schemaVersion: 1,
      runId,
      phase: 'profiler',
      execution: 'manifest',
      command: [],
      startedAt: new Date().toISOString(),
      durationMs: 0,
      exitCode: null,
      signal: null,
      files: null,
      tests: null,
      assertions: null,
      passed: null,
      skipped: null,
      unlistedSkipped: null,
      failed: null,
      maxRssBytes: null,
      rssSampleIntervalMs: RSS_SAMPLE_MS,
      rssScope: 'not-applicable',
      logPath: phaseLogPath('manifest'),
      reportPath: null,
      error: error instanceof Error ? error.message : String(error),
    })
  }

  const summary: ProfileSummary = {
    schemaVersion: 1,
    runId,
    mode,
    complete: mode === 'full' && reports.length === 5,
    startedAt,
    finishedAt: new Date().toISOString(),
    durationMs: performance.now() - monotonicStartedAt,
    runRoot,
    host: {
      platform: process.platform,
      arch: process.arch,
      node: process.version,
      totalMemoryBytes: totalmem(),
    },
    success:
      success &&
      reports.every((report) => !report.error) &&
      interruptedBy === undefined &&
      (mode === 'smoke' || reports.length === 5),
    ...(interruptedBy ? { interruptedBy } : {}),
    phases: reports,
  }
  writeFileSync(resolve(runRoot, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`)
  console.log(`\n[release profiler] ${summary.success ? 'PASS' : 'FAIL'} mode=${mode} run=${runId}`)
  console.log(`[release profiler] summary=${resolve(runRoot, 'summary.json')}`)
  if (!summary.success) process.exitCode = 1
}

await main()
