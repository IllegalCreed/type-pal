import { execFileSync } from 'node:child_process'
import { createHash, randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { arch, cpus, loadavg, platform, totalmem } from 'node:os'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { performance } from 'node:perf_hooks'
import { fileURLToPath } from 'node:url'
import {
  assertIsolatedChildSpecs,
  GIB,
  type ReleaseChildGroupResult,
  type ReleaseChildSpec,
  releaseRuntimeTmpDir,
  runReleaseChildGroup,
} from '../src/release-runner-core.js'
import {
  type ListedVitestTest,
  normalizeTestList,
  summarizeTestList,
  type TestListSummary,
} from '../src/test-manifest.js'

type RunnerMode = 'parallel' | 'serial-control'

interface ManifestGate {
  files: number
  tests: number
  sha256: string
  routeSha256: string
}

interface TestManifestV1 {
  kind: 'migrate-test-manifest'
  version: 1
  gates: { fast: ManifestGate; release: ManifestGate; canary: ManifestGate }
}

interface VitestJsonReport {
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

interface TestOutcome {
  file: string
  name: string
  status: 'passed' | 'failed' | 'skipped'
  listed: boolean
}

interface ParsedVitestReport {
  files: number
  tests: number
  assertions: number
  passed: number
  skipped: number
  unlistedSkipped: number
  failed: number
  outcomes: TestOutcome[]
  outcomeSha256: string
}

interface ProtectedSnapshot {
  sha256: string
  files: Map<string, string>
  conflicts: string[]
}

interface MutationSummary {
  writes: number
  deletes: number
  conflicts: number
  writePaths: string[]
  deletePaths: string[]
  conflictPaths: string[]
  beforeSha256: string
  afterSha256: string
}

interface PhaseReport {
  id: string
  command: string[]
  group: ReleaseChildGroupResult
  expected: {
    files: number
    tests: number
    sha256: string
    routeSha256: string
  } | null
  result: ParsedVitestReport | null
  logPath: string
  reportPath: string | null
  tmpDir: string
  transactionRoot: string | null
  gate: string
  error: string | null
}

interface CoverageSummary {
  files: number
  tests: number
  assertions: number
  passed: number
  skipped: number
  unlistedSkipped: number
  failed: number
  outcomeSha256: string
  testListSha256: string
  routeSha256: string
}

interface ReleaseRunnerSummary {
  schemaVersion: 1
  runId: string
  mode: RunnerMode
  success: boolean
  startedAt: string
  finishedAt: string
  durationMs: number
  runRoot: string
  git: { head: string; statusSha256: string }
  host: {
    platform: string
    arch: string
    node: string
    cpuCount: number
    cpuModel: string
    totalMemoryBytes: number
    loadAverageStart: number[]
    loadAverageBeforeParallel: number[] | null
    loadAverageEnd: number[]
  }
  budgets: {
    minimumHostMemoryBytes: number
    sharedRssBytes: number
    freshRssBytes: number
    combinedRssBytes: number
  }
  manifest: ManifestGate | null
  coverage: CoverageSummary | null
  protectedWorkspace: MutationSummary | null
  maxCombinedParallelRssBytes: number | null
  phases: PhaseReport[]
  errors: string[]
}

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = resolve(packageRoot, '../..')
const manifestPath = resolve(packageRoot, 'test-fixtures/test-manifest-v1.json')
const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
const MIN_HOST_MEMORY_BYTES = 12 * GIB
const SHARED_RSS_LIMIT_BYTES = Math.floor(4.5 * GIB)
const FRESH_RSS_LIMIT_BYTES = Math.floor(3.5 * GIB)
const COMBINED_RSS_LIMIT_BYTES = Math.floor(7.5 * GIB)
const SERIAL_PHASE_TIMEOUT_MS = 30 * 60 * 1_000
const PAL_PHASE_TIMEOUT_MS = 60 * 60 * 1_000
// serial-control runs preflight/unit/shared/fresh inside one canonical Vitest process. Its outer
// timeout must cover the same per-phase budget that parallel mode enforces on separate children.
const CANONICAL_RELEASE_TIMEOUT_MS = SERIAL_PHASE_TIMEOUT_MS + 2 * PAL_PHASE_TIMEOUT_MS
const PROTECTED_PATHS = [
  'projects/pal',
  'packages/migrate/test-fixtures',
  'packages/migrate/bootstrap',
] as const

function parseArgs(): { mode: RunnerMode; runRoot: string } {
  let mode: RunnerMode | undefined
  let requestedRunRoot: string | undefined
  for (const arg of process.argv.slice(2)) {
    if (arg === '--mode=parallel') mode = 'parallel'
    else if (arg === '--mode=serial-control') mode = 'serial-control'
    else if (arg.startsWith('--run-root=')) requestedRunRoot = arg.slice('--run-root='.length)
    else if (arg !== '--') throw new Error(`release runner: unknown argument ${arg}`)
  }
  if (!mode) throw new Error('release runner: 缺少 --mode=parallel|serial-control')
  const runId = `${new Date().toISOString().replaceAll(':', '').replaceAll('.', '')}-${randomBytes(4).toString('hex')}`
  const runRoot = requestedRunRoot
    ? resolve(requestedRunRoot)
    : resolve(repoRoot, 'build/release-runs', `${mode}-${runId}`)
  if (!isAbsolute(runRoot)) throw new Error('release runner: run root 必须是绝对路径')
  if (existsSync(runRoot)) throw new Error(`release runner: run root 已存在 ${runRoot}`)
  return { mode, runRoot }
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
      left.localeCompare(right),
    )
    return `{${entries.map(([key, child]) => `${JSON.stringify(key)}:${stableJson(child)}`).join(',')}}`
  }
  return JSON.stringify(value)
}

function integerAt(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0)
    throw new Error(`release runner: ${label} 不是非负安全整数`)
  return value
}

function readManifest(): TestManifestV1 {
  const value: unknown = JSON.parse(readFileSync(manifestPath, 'utf8'))
  if (!value || typeof value !== 'object') throw new Error('release runner: manifest 不是对象')
  const manifest = value as Partial<TestManifestV1>
  if (manifest.kind !== 'migrate-test-manifest' || manifest.version !== 1 || !manifest.gates)
    throw new Error('release runner: manifest 版本不受支持')
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
      throw new Error(`release runner: manifest ${name} pin 非法`)
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
  return summarizeTestList(normalizeTestList(JSON.parse(raw) as ListedVitestTest[], packageRoot))
}

function assertManifestAndLists(
  manifest: TestManifestV1,
  expected: {
    preflightUnit: TestListSummary
    shared: TestListSummary
    fresh: TestListSummary
    canary: TestListSummary
    release: TestListSummary
  },
): void {
  for (const [label, actual, pinned] of [
    ['release', expected.release, manifest.gates.release],
    ['canary', expected.canary, manifest.gates.canary],
  ] as const) {
    if (
      actual.files !== pinned.files ||
      actual.tests !== pinned.tests ||
      actual.sha256 !== pinned.sha256 ||
      actual.routeSha256 !== pinned.routeSha256
    )
      throw new Error(`release runner: ${label} list 与 manifest pin 不一致`)
  }
  const stagedEntries = [
    ...expected.preflightUnit.entries,
    ...expected.shared.entries,
    ...expected.fresh.entries,
  ]
  if (new Set(stagedEntries.map((entry) => entry.key)).size !== stagedEntries.length)
    throw new Error('release runner: staged release union 存在重复 test')
  const staged = summarizeTestList(stagedEntries)
  if (
    staged.files !== expected.release.files ||
    staged.tests !== expected.release.tests ||
    staged.sha256 !== expected.release.sha256 ||
    staged.routeSha256 !== expected.release.routeSha256
  )
    throw new Error('release runner: preflight/unit/shared/fresh union 与 canonical release 不闭合')
}

function parseManifestLog(path: string): ManifestGate {
  const output = readFileSync(path, 'utf8')
  const match =
    /test manifest verified: fast (\d+)\/(\d+), release (\d+)\/(\d+), canary (\d+)\/(\d+)/.exec(
      output,
    )
  if (!match) throw new Error('release runner: manifest log 缺稳定摘要')
  const manifest = readManifest()
  const releaseFiles = Number(match[3])
  const releaseTests = Number(match[4])
  if (
    releaseFiles !== manifest.gates.release.files ||
    releaseTests !== manifest.gates.release.tests
  )
    throw new Error('release runner: manifest log 与 release pin 不一致')
  return manifest.gates.release
}

function parseVitestReport(path: string, expected: TestListSummary): ParsedVitestReport {
  if (!existsSync(path)) throw new Error(`release runner: Vitest JSON report 缺失 ${path}`)
  const report = JSON.parse(readFileSync(path, 'utf8')) as VitestJsonReport
  if (!Array.isArray(report.testResults)) throw new Error('release runner: testResults 不是数组')
  const expectedByFile = new Map<string, Set<string>>()
  for (const entry of expected.entries) {
    const names = expectedByFile.get(entry.file) ?? new Set<string>()
    if (names.has(entry.name))
      throw new Error(`release runner: expected test 重复 ${entry.file} :: ${entry.name}`)
    names.add(entry.name)
    expectedByFile.set(entry.file, names)
  }
  const actualByFile = new Map<string, Map<string, TestOutcome['status']>>()
  for (const value of report.testResults as VitestJsonFileResult[]) {
    if (typeof value.name !== 'string' || !value.name)
      throw new Error('release runner: Vitest result 缺文件名')
    const file = relative(packageRoot, value.name).split(sep).join('/')
    if (!file || file === '..' || file.startsWith('../') || file.startsWith('/'))
      throw new Error(`release runner: report 文件越界 ${value.name}`)
    if (actualByFile.has(file)) throw new Error(`release runner: report 文件重复 ${file}`)
    if (value.status !== 'passed')
      throw new Error(
        `release runner: 文件 status 非 passed ${file}: ${String(value.message ?? '')}`,
      )
    if (!Array.isArray(value.assertionResults))
      throw new Error(`release runner: assertionResults 不是数组 ${file}`)
    const assertions = new Map<string, TestOutcome['status']>()
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
        throw new Error(`release runner: assertion identity 缺失 ${file}`)
      const name = [...(assertion.ancestorTitles as string[]), assertion.title]
        .map((part) => part.trim().replace(/\s+/g, ' '))
        .join(' > ')
      if (assertions.has(name)) throw new Error(`release runner: assertion 重复 ${file} :: ${name}`)
      const status: TestOutcome['status'] | undefined =
        assertion.status === 'passed'
          ? 'passed'
          : assertion.status === 'failed'
            ? 'failed'
            : assertion.status === 'pending' ||
                assertion.status === 'todo' ||
                assertion.status === 'skipped'
              ? 'skipped'
              : undefined
      if (!status) throw new Error(`release runner: assertion status 非法 ${file} :: ${name}`)
      assertions.set(name, status)
    }
    actualByFile.set(file, assertions)
  }

  const outcomes: TestOutcome[] = []
  for (const [file, names] of expectedByFile) {
    const actual = actualByFile.get(file)
    if (!actual) throw new Error(`release runner: Vitest 文件缺失 ${file}`)
    for (const name of names) {
      const status = actual.get(name)
      if (!status) throw new Error(`release runner: listed test 缺失 ${file} :: ${name}`)
      if (status === 'skipped')
        throw new Error(`release runner: listed test 执行期 skipped ${file} :: ${name}`)
    }
    for (const [name, status] of actual)
      outcomes.push({ file, name, status, listed: names.has(name) })
    if (![...names].some((name) => actual.get(name) === 'passed'))
      throw new Error(`release runner: 文件全量 skipIf ${file}`)
  }
  for (const file of actualByFile.keys())
    if (!expectedByFile.has(file)) throw new Error(`release runner: 未知文件 ${file}`)

  outcomes.sort((left, right) =>
    `${left.file}\0${left.name}`.localeCompare(`${right.file}\0${right.name}`),
  )
  const passed = outcomes.filter((entry) => entry.status === 'passed').length
  const failed = outcomes.filter((entry) => entry.status === 'failed').length
  const skipped = outcomes.filter((entry) => entry.status === 'skipped').length
  const unlistedSkipped = outcomes.filter(
    (entry) => !entry.listed && entry.status === 'skipped',
  ).length
  const assertions = integerAt(report.numTotalTests, 'numTotalTests')
  const reportedPassed = integerAt(report.numPassedTests, 'numPassedTests')
  const reportedFailed = integerAt(report.numFailedTests, 'numFailedTests')
  const reportedSkipped =
    integerAt(report.numPendingTests, 'numPendingTests') +
    integerAt(report.numTodoTests, 'numTodoTests')
  if (
    report.success !== true ||
    actualByFile.size !== expected.files ||
    passed !== reportedPassed ||
    failed !== reportedFailed ||
    skipped !== reportedSkipped ||
    passed + failed + skipped !== assertions ||
    assertions !== expected.tests + unlistedSkipped ||
    skipped !== unlistedSkipped
  )
    throw new Error(
      `release runner: report census mismatch actual=${passed}/${failed}/${skipped}/${assertions} expected=${expected.files}/${expected.tests}+${unlistedSkipped}`,
    )
  return {
    files: expected.files,
    tests: expected.tests,
    assertions,
    passed,
    skipped,
    unlistedSkipped,
    failed,
    outcomes,
    outcomeSha256: sha256(stableJson(outcomes)),
  }
}

function snapshotProtectedWorkspace(): ProtectedSnapshot {
  const raw = execFileSync(
    'git',
    ['ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', ...PROTECTED_PATHS],
    { cwd: repoRoot, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 },
  )
  const paths = raw.split('\0').filter(Boolean).sort()
  const files = new Map<string, string>()
  for (const path of paths) {
    const absolute = resolve(repoRoot, path)
    if (!existsSync(absolute) || !statSync(absolute).isFile()) continue
    files.set(path, createHash('sha256').update(readFileSync(absolute)).digest('hex'))
  }
  const status = execFileSync(
    'git',
    ['status', '--porcelain=v1', '-z', '--untracked-files=all', '--', ...PROTECTED_PATHS],
    { cwd: repoRoot, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 },
  )
  const conflicts = status
    .split('\0')
    .filter((entry) => /^(DD|AU|UD|UA|DU|AA|UU) /.test(entry))
    .map((entry) => entry.slice(3))
    .sort()
  return {
    sha256: sha256(stableJson([...files])),
    files,
    conflicts,
  }
}

function compareProtectedSnapshots(
  before: ProtectedSnapshot,
  after: ProtectedSnapshot,
): MutationSummary {
  const writePaths = [...after.files]
    .filter(([path, digest]) => before.files.get(path) !== digest)
    .map(([path]) => path)
    .sort()
  const deletePaths = [...before.files.keys()].filter((path) => !after.files.has(path)).sort()
  return {
    writes: writePaths.length,
    deletes: deletePaths.length,
    conflicts: after.conflicts.length,
    writePaths,
    deletePaths,
    conflictPaths: after.conflicts,
    beforeSha256: before.sha256,
    afterSha256: after.sha256,
  }
}

function childSpec(args: {
  runId: string
  runRoot: string
  id: string
  commandArgs: string[]
  gate: string
  report: boolean
  timeoutMs: number
  rssLimitBytes?: number | null
  transaction: boolean
}): ReleaseChildSpec {
  const childRoot = resolve(args.runRoot, 'children', args.id)
  // Keep logs/reports under the proof root, but keep runtime TMP short. macOS truncates long
  // Unix-domain socket paths; tsx appends its IPC path below TMPDIR and otherwise collides.
  const tmpDir = releaseRuntimeTmpDir(args.runId, args.id)
  const transactionRoot = args.transaction ? resolve(childRoot, 'transaction') : null
  const reportPath = args.report ? resolve(childRoot, 'report.vitest.json') : null
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    TYPE_PAL_MIGRATE_TEST_GATE: args.gate,
    TYPE_PAL_RELEASE_RUN_ID: args.runId,
    TYPE_PAL_RELEASE_CHILD_ID: args.id,
    TMPDIR: tmpDir,
    TMP: tmpDir,
    TEMP: tmpDir,
  }
  if (transactionRoot) env.TYPE_PAL_MIGRATE_TRANSACTION_ROOT = transactionRoot
  else delete env.TYPE_PAL_MIGRATE_TRANSACTION_ROOT
  return {
    id: args.id,
    command: pnpmCommand,
    args: args.commandArgs,
    cwd: packageRoot,
    env,
    logPath: resolve(childRoot, 'raw.log'),
    reportPath,
    tmpDir,
    transactionRoot,
    gate: args.gate,
    timeoutMs: args.timeoutMs,
    rssLimitBytes: args.rssLimitBytes ?? null,
  }
}

function vitestArgs(config: string, projects: string[], reportPath: string): string[] {
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
  return args
}

async function executePhase(
  spec: ReleaseChildSpec,
  expected: TestListSummary | null,
  abortSignal: AbortSignal,
): Promise<PhaseReport> {
  const group = await runReleaseChildGroup([spec], {
    abortSignal,
    combinedRssLimitBytes: null,
  })
  let result: ParsedVitestReport | null = null
  let error = group.error
  if (!error && expected && spec.reportPath) {
    try {
      result = parseVitestReport(spec.reportPath, expected)
    } catch (caught) {
      error = caught instanceof Error ? caught.message : String(caught)
    }
  }
  if (!error && !expected) {
    try {
      parseManifestLog(spec.logPath)
    } catch (caught) {
      error = caught instanceof Error ? caught.message : String(caught)
    }
  }
  return {
    id: spec.id,
    command: [spec.command, ...spec.args],
    group,
    expected: expected
      ? {
          files: expected.files,
          tests: expected.tests,
          sha256: expected.sha256,
          routeSha256: expected.routeSha256,
        }
      : null,
    result,
    logPath: spec.logPath,
    reportPath: spec.reportPath,
    tmpDir: spec.tmpDir,
    transactionRoot: spec.transactionRoot,
    gate: spec.gate,
    error,
  }
}

function combineCoverage(
  reports: readonly ParsedVitestReport[],
  expected: TestListSummary,
): CoverageSummary {
  const outcomes = reports.flatMap((report) => report.outcomes)
  outcomes.sort((left, right) =>
    `${left.file}\0${left.name}`.localeCompare(`${right.file}\0${right.name}`),
  )
  const identities = outcomes.map((entry) => `${entry.file}\0${entry.name}`)
  if (new Set(identities).size !== identities.length)
    throw new Error('release runner: combined coverage 存在重复 assertion identity')
  const listed = outcomes.filter((entry) => entry.listed)
  if (listed.length !== expected.tests)
    throw new Error(`release runner: combined listed ${listed.length} != ${expected.tests}`)
  const files = new Set(listed.map((entry) => entry.file)).size
  if (files !== expected.files)
    throw new Error(`release runner: combined files ${files} != ${expected.files}`)
  return {
    files,
    tests: listed.length,
    assertions: outcomes.length,
    passed: outcomes.filter((entry) => entry.status === 'passed').length,
    skipped: outcomes.filter((entry) => entry.status === 'skipped').length,
    unlistedSkipped: outcomes.filter((entry) => !entry.listed && entry.status === 'skipped').length,
    failed: outcomes.filter((entry) => entry.status === 'failed').length,
    outcomeSha256: sha256(stableJson(outcomes)),
    testListSha256: expected.sha256,
    routeSha256: expected.routeSha256,
  }
}

async function main(): Promise<void> {
  const { mode, runRoot } = parseArgs()
  mkdirSync(runRoot, { recursive: true })
  const runId = `${mode}-${new Date().toISOString().replaceAll(':', '').replaceAll('.', '')}-${randomBytes(4).toString('hex')}`
  const startedAt = new Date().toISOString()
  const monotonicStart = performance.now()
  const errors: string[] = []
  const phases: PhaseReport[] = []
  const abortController = new AbortController()
  for (const signal of ['SIGINT', 'SIGTERM'] as const)
    process.once(signal, () => abortController.abort(signal))
  const hostMemory = totalmem()
  const loadAverageStart = loadavg()
  const protectedBefore = snapshotProtectedWorkspace()
  let protectedWorkspace: MutationSummary | null = null
  let manifestGate: ManifestGate | null = null
  let coverage: CoverageSummary | null = null
  let loadAverageBeforeParallel: number[] | null = null
  let maxCombinedParallelRssBytes: number | null = null

  try {
    if (mode === 'parallel' && hostMemory < MIN_HOST_MEMORY_BYTES)
      throw new Error(
        `release runner: host memory ${hostMemory} 低于并行门槛 ${MIN_HOST_MEMORY_BYTES}`,
      )

    const manifestSpec = childSpec({
      runId,
      runRoot,
      id: 'manifest',
      commandArgs: ['run', 'test:manifest'],
      gate: 'release',
      report: false,
      timeoutMs: SERIAL_PHASE_TIMEOUT_MS,
      transaction: false,
    })
    const manifestPhase = await executePhase(manifestSpec, null, abortController.signal)
    phases.push(manifestPhase)
    if (manifestPhase.error) throw new Error(manifestPhase.error)
    manifestGate = parseManifestLog(manifestSpec.logPath)

    const expected = {
      preflightUnit: listTests('vitest.release.config.ts', ['release-preflight', 'release-unit']),
      shared: listTests('vitest.release.config.ts', ['release-pal-shared']),
      fresh: listTests('vitest.release.config.ts', ['release-pal-fresh']),
      canary: listTests('vitest.canary.config.ts', []),
      release: listTests('vitest.release.config.ts', []),
    }
    const manifest = readManifest()
    assertManifestAndLists(manifest, expected)

    const canarySpec = childSpec({
      runId,
      runRoot,
      id: 'canary',
      commandArgs: [],
      gate: 'canary',
      report: true,
      timeoutMs: SERIAL_PHASE_TIMEOUT_MS,
      transaction: false,
    })
    canarySpec.args = vitestArgs('vitest.canary.config.ts', [], canarySpec.reportPath!)
    const canaryPhase = await executePhase(canarySpec, expected.canary, abortController.signal)
    phases.push(canaryPhase)
    if (canaryPhase.error) throw new Error(canaryPhase.error)

    if (mode === 'serial-control') {
      const releaseSpec = childSpec({
        runId,
        runRoot,
        id: 'canonical-release',
        commandArgs: [],
        gate: 'release',
        report: true,
        timeoutMs: CANONICAL_RELEASE_TIMEOUT_MS,
        transaction: true,
      })
      releaseSpec.args = vitestArgs('vitest.release.config.ts', [], releaseSpec.reportPath!)
      const releasePhase = await executePhase(releaseSpec, expected.release, abortController.signal)
      phases.push(releasePhase)
      if (releasePhase.error || !releasePhase.result)
        throw new Error(releasePhase.error ?? 'release runner: canonical release result 缺失')
      coverage = combineCoverage([releasePhase.result], expected.release)
    } else {
      const preflightUnitSpec = childSpec({
        runId,
        runRoot,
        id: 'release-preflight-unit',
        commandArgs: [],
        gate: 'release',
        report: true,
        timeoutMs: SERIAL_PHASE_TIMEOUT_MS,
        transaction: false,
      })
      preflightUnitSpec.args = vitestArgs(
        'vitest.release.config.ts',
        ['release-preflight', 'release-unit'],
        preflightUnitSpec.reportPath!,
      )
      const preflightUnitPhase = await executePhase(
        preflightUnitSpec,
        expected.preflightUnit,
        abortController.signal,
      )
      phases.push(preflightUnitPhase)
      if (preflightUnitPhase.error || !preflightUnitPhase.result)
        throw new Error(preflightUnitPhase.error ?? 'release runner: preflight/unit result 缺失')

      const sharedSpec = childSpec({
        runId,
        runRoot,
        id: 'release-pal-shared',
        commandArgs: [],
        gate: 'release-shared',
        report: true,
        timeoutMs: PAL_PHASE_TIMEOUT_MS,
        rssLimitBytes: SHARED_RSS_LIMIT_BYTES,
        transaction: false,
      })
      sharedSpec.args = vitestArgs(
        'vitest.release.config.ts',
        ['release-pal-shared'],
        sharedSpec.reportPath!,
      )
      const freshSpec = childSpec({
        runId,
        runRoot,
        id: 'release-pal-fresh',
        commandArgs: [],
        gate: 'release',
        report: true,
        timeoutMs: PAL_PHASE_TIMEOUT_MS,
        rssLimitBytes: FRESH_RSS_LIMIT_BYTES,
        transaction: true,
      })
      freshSpec.args = vitestArgs(
        'vitest.release.config.ts',
        ['release-pal-fresh'],
        freshSpec.reportPath!,
      )
      assertIsolatedChildSpecs([sharedSpec, freshSpec])
      loadAverageBeforeParallel = loadavg()
      const group = await runReleaseChildGroup([sharedSpec, freshSpec], {
        abortSignal: abortController.signal,
        combinedRssLimitBytes: COMBINED_RSS_LIMIT_BYTES,
      })
      maxCombinedParallelRssBytes = group.maxCombinedRssBytes
      const parallelReports: PhaseReport[] = []
      for (const [spec, list] of [
        [sharedSpec, expected.shared],
        [freshSpec, expected.fresh],
      ] as const) {
        let result: ParsedVitestReport | null = null
        let error = group.error
        if (!error && spec.reportPath) {
          try {
            result = parseVitestReport(spec.reportPath, list)
          } catch (caught) {
            error = caught instanceof Error ? caught.message : String(caught)
          }
        }
        parallelReports.push({
          id: spec.id,
          command: [spec.command, ...spec.args],
          group: {
            ...group,
            children: group.children.filter((child) => child.id === spec.id),
          },
          expected: {
            files: list.files,
            tests: list.tests,
            sha256: list.sha256,
            routeSha256: list.routeSha256,
          },
          result,
          logPath: spec.logPath,
          reportPath: spec.reportPath,
          tmpDir: spec.tmpDir,
          transactionRoot: spec.transactionRoot,
          gate: spec.gate,
          error,
        })
      }
      phases.push(...parallelReports)
      const parallelError = parallelReports.find((report) => report.error)?.error
      if (parallelError) throw new Error(parallelError)
      const sharedResult = parallelReports[0]?.result
      const freshResult = parallelReports[1]?.result
      if (!sharedResult || !freshResult) throw new Error('release runner: parallel result 缺失')
      coverage = combineCoverage(
        [preflightUnitPhase.result, sharedResult, freshResult],
        expected.release,
      )
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error))
  } finally {
    try {
      protectedWorkspace = compareProtectedSnapshots(protectedBefore, snapshotProtectedWorkspace())
      if (protectedWorkspace.writes || protectedWorkspace.deletes || protectedWorkspace.conflicts)
        errors.push(
          `release runner: protected workspace 发生变化 writes=${protectedWorkspace.writes} deletes=${protectedWorkspace.deletes} conflicts=${protectedWorkspace.conflicts}`,
        )
    } catch (error) {
      errors.push(
        `release runner: protected workspace 快照失败: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  const status = execFileSync('git', ['status', '--porcelain=v1', '-z'], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  })
  const cpu = cpus()
  const summary: ReleaseRunnerSummary = {
    schemaVersion: 1,
    runId,
    mode,
    success:
      errors.length === 0 &&
      phases.every((phase) => !phase.error && phase.group.success) &&
      coverage !== null &&
      coverage.failed === 0 &&
      protectedWorkspace !== null &&
      protectedWorkspace.writes === 0 &&
      protectedWorkspace.deletes === 0 &&
      protectedWorkspace.conflicts === 0,
    startedAt,
    finishedAt: new Date().toISOString(),
    durationMs: performance.now() - monotonicStart,
    runRoot,
    git: {
      head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim(),
      statusSha256: sha256(status),
    },
    host: {
      platform: platform(),
      arch: arch(),
      node: process.version,
      cpuCount: cpu.length,
      cpuModel: cpu[0]?.model ?? 'unknown',
      totalMemoryBytes: hostMemory,
      loadAverageStart,
      loadAverageBeforeParallel,
      loadAverageEnd: loadavg(),
    },
    budgets: {
      minimumHostMemoryBytes: MIN_HOST_MEMORY_BYTES,
      sharedRssBytes: SHARED_RSS_LIMIT_BYTES,
      freshRssBytes: FRESH_RSS_LIMIT_BYTES,
      combinedRssBytes: COMBINED_RSS_LIMIT_BYTES,
    },
    manifest: manifestGate,
    coverage,
    protectedWorkspace,
    maxCombinedParallelRssBytes,
    phases,
    errors,
  }
  const summaryPath = resolve(runRoot, 'summary.json')
  writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`)
  console.log(`\n[release runner] ${summary.success ? 'PASS' : 'FAIL'} mode=${mode}`)
  console.log(`[release runner] summary=${summaryPath}`)
  if (!summary.success) process.exitCode = 1
}

await main()
