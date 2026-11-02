// TEST-REFORGE-CURRENT-SAVE-TEST-PRECISION-1 隔离树与严格判据库(按需证据工具,非测试,不进默认 runner)。
// 判据整体移植自 docs/ops/evidence/TEST-GAME-MEDIA-LIFECYCLE-1/lib-isolated-tree.mjs(r2 定稿,
// 含 Codex 打穿的 signal/额外 collection suite/异步 uncaught 双 reporter 联判反例),仅替换
// 包路径/冻结源/测试文件;判据逻辑未放宽,先跑 judgeSelfTest + 真实 Vitest 探针自证拒收。
//
// 隔离树:mkdtemp /tmp 树复制 packages/reforge 的 src/配置,node_modules 软链本仓安装
// (只读复用,不复制,绝不 install 共享 node_modules)。建树后逐文件校验冻结源 sha256 与
// 任务卡一致,证明树内执行的是逐字节产品本体;建树任一步失败也先删本次树再抛。
// 变异只落在树内,每个针用独立新树,用后整树删除并落清理证明,贡献者工作树产品零改动。
//
// 唯一判据(绿/红/还原绿/末次重放四态同判据,任何偏离即拒收,不靠 exit/count 单项):
//  - 进程层:exit 与状态一致、signal 必须为 null、spawnError 必须为 null;
//  - 执行身份:非空完整 file×fullName 多重集合逐字锁定——每个期望文件恰一条 suite、无意外
//    文件、无重复条目;report 计数与 assertionResults 明细一致;
//  - suite 健康:非空 suite.message = 额外 hook/runtime 错误,拒收;零断言失败的 failed
//    suite = collection/runtime 错误,同拒;绿态所有 suite status=passed;
//  - 输出层:同进程 default reporter 的 stdout/stderr 无 unhandled rejection/error 字样;
//  - 红态附加:恰一 failed、fullName 精确相等、failureMessages 含指定 marker 且以
//    AssertionError 起头。
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

export const REPO = path.resolve(import.meta.dirname, '../../../..')
export const REFORGE = path.join(REPO, 'packages/reforge')
export const VITEST_CLI = path.join(REPO, 'node_modules/vitest/vitest.mjs')

// 任务卡冻结源(五源之四在 reforge 包内;content/entity-lifecycle.ts 由 runner 在工作树直接核)。
export const FROZEN_SOURCES = {
  'src/save/current-codec.ts': '690491b7c584db3e628f6d590dfe238b45a56ea6eee78d14624fd392347083de',
  'src/save/current-structure.ts':
    'fd69938c815f33728a5fc7003b34d562a0f533900faf48acaf3135ae0680c331',
  'src/save/types.ts': '856ba7ac63a7d0a314ac6189b4c2ec9b3e5c8130b03485e700a0ec38566f41bf',
  'src/save/ops.ts': 'dca51545dedd6da907e12f57f4c5d8793562dfb1b33b19afed68b44cdde82d80',
}

export const TEST_FILES = [
  'src/save/current-structure.test.ts',
  'src/save/current-save.current-characterization.test.ts',
  'src/save/current-codec.contracts.test.ts',
]

export function sha256Bytes(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
}

export function sha256Of(file) {
  return sha256Bytes(readFileSync(file))
}

/** raw 落盘统一 trimEof(恰一终止换行),sha 按落盘字节计。 */
export function writeRaw(file, text) {
  writeFileSync(file, `${String(text).replace(/\n+$/, '')}\n`)
  return sha256Of(file)
}

const BIOME_BIN = path.join(REPO, 'node_modules', '.bin', 'biome')

/** 持久 JSON 落盘:写 stringify 文本后经 biome format 定稿,sha 按定稿后最终字节计。 */
export function persistJson(file, text) {
  writeRaw(file, text)
  const formatted = spawnSync(BIOME_BIN, ['format', '--write', file], { encoding: 'utf8' })
  if (formatted.status !== 0) {
    throw new Error(`biome format failed on ${file}: ${formatted.stderr ?? ''}`)
  }
  return sha256Of(file)
}

export function buildIsolatedTree(tag) {
  // 树根固定 /tmp(macOS os.tmpdir=/var/folders 下 vite server.fs.allow 拒软链 node_modules,
  // 与 worktree 软链同坑,表现为静默 0 tests;/tmp 实测正常)。
  const treeRoot = existsSync('/tmp') ? '/tmp' : tmpdir()
  const tmp = mkdtempSync(path.join(treeRoot, `tp-save-precision-${tag}.`))
  try {
    const pkg = path.join(tmp, 'packages/reforge')
    mkdirSync(pkg, { recursive: true })
    cpSync(path.join(REFORGE, 'src'), path.join(pkg, 'src'), { recursive: true })
    for (const name of ['vite.config.ts', 'package.json', 'tsconfig.json', 'index.html']) {
      const from = path.join(REFORGE, name)
      if (existsSync(from)) cpSync(from, path.join(pkg, name))
    }
    symlinkSync(path.join(REFORGE, 'node_modules'), path.join(pkg, 'node_modules'), 'dir')
    // 镜像仓库布局:vitest 是根级依赖,temp 根同样软链;tsconfig.base.json 断链会让
    // vitest 静默发现 0 个测试。
    symlinkSync(path.join(REPO, 'node_modules'), path.join(tmp, 'node_modules'), 'dir')
    const baseTsconfig = path.join(REPO, 'tsconfig.base.json')
    if (existsSync(baseTsconfig)) cpSync(baseTsconfig, path.join(tmp, 'tsconfig.base.json'))
    for (const [rel, expected] of Object.entries(FROZEN_SOURCES)) {
      const got = sha256Of(path.join(pkg, rel))
      if (got !== expected) {
        throw new Error(`isolated tree is not the frozen product: ${rel} sha256=${got}`)
      }
    }
    return {
      tmp,
      pkg,
      cleanup: () => {
        rmSync(tmp, { recursive: true, force: true })
        return `removed=${!existsSync(tmp)} path=${tmp}`
      },
    }
  } catch (error) {
    rmSync(tmp, { recursive: true, force: true })
    throw error
  }
}

/** 全局未捕获/钩子异常的原始诊断模式:JSON reporter 对这些静默,必须靠同进程 default
 * reporter 的完整 stdout 揭示;suite.message 由 native JSON 的 testResults[].message 携带。 */
const GLOBAL_FAULT_RE =
  /Unhandled (Errors?|Rejection)|unhandledRejection|Uncaught Exception|uncaughtException/i

/** 树内以双 reporter 跑执行集:native JSON 落持久位置(身份/计数),default reporter 走
 * stdout(完整诊断),两者同进程联判,不以 JSON reporter 静默证明零 unhandled。 */
export function runVitestJson(pkg, testFiles, rawOut, jsonOut) {
  const argv = [
    'node',
    VITEST_CLI,
    'run',
    ...testFiles,
    '--reporter=json',
    '--reporter=default',
    `--outputFile.json=${jsonOut}`,
  ]
  const envSnapshot = {
    inherited: true,
    node: process.version,
    NODE_OPTIONS: process.env.NODE_OPTIONS ?? null,
    NODE_ENV: process.env.NODE_ENV ?? null,
    TZ: process.env.TZ ?? null,
  }
  const spawned = spawnSync('node', argv.slice(1), {
    cwd: pkg,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    timeout: 240_000,
    env: { ...process.env, NODE_COMPILE_CACHE: '' },
  })
  const stdout = `${spawned.stdout ?? ''}${spawned.stderr ?? ''}`
  const rawSha256 = writeRaw(rawOut, stdout)
  const report = JSON.parse(readFileSync(jsonOut, 'utf8'))
  const jsonSha256 = persistJson(jsonOut, JSON.stringify(report, null, 2))
  const suites = report.testResults ?? []
  const tests = suites.flatMap((t) => t.assertionResults)
  return {
    exit: spawned.status ?? 1,
    signal: spawned.signal,
    pid: spawned.pid,
    spawnError: spawned.error ? `${spawned.error.message}` : null,
    argv,
    cwd: pkg,
    env: envSnapshot,
    rawFile: rawOut,
    rawSha256,
    jsonFile: jsonOut,
    jsonSha256,
    report,
    suites,
    tests,
    unhandledInOutput: GLOBAL_FAULT_RE.test(stdout),
  }
}

/** 执行集行 = `file :: fullName`,排序后四态逐字比对。 */
export function executionSetOf(run, expectedFiles) {
  const rows = []
  for (const suite of run.suites) {
    const file = expectedFiles.find((f) => suite.name.endsWith(f)) ?? `<unexpected:${suite.name}>`
    for (const a of suite.assertionResults) rows.push(`${file} :: ${a.fullName}`)
  }
  return rows.sort()
}

function judgeCommon(run, expectedRows, expectedFiles) {
  const problems = []
  if (run.signal) problems.push(`signal=${run.signal}`)
  if (run.spawnError) problems.push(`spawnError=${run.spawnError}`)
  if (run.unhandledInOutput) problems.push('unhandled-rejection-in-output')
  if ((run.report.numPendingTests ?? 0) !== 0) problems.push('pending>0')
  if ((run.report.numTodoTests ?? 0) !== 0) problems.push('todo>0')
  for (const file of expectedFiles) {
    const hits = run.suites.filter((s) => s.name.endsWith(file))
    if (hits.length !== 1) problems.push(`suite entries for ${file}: ${hits.length}`)
  }
  if (run.suites.length !== expectedFiles.length) {
    problems.push(`suite entries=${run.suites.length} != expected files=${expectedFiles.length}`)
  }
  const rows = executionSetOf(run, expectedFiles)
  if (rows.length === 0) problems.push('execution set is empty')
  if (rows.join('\n') !== expectedRows.join('\n')) {
    problems.push(
      `execution-set drift: got=[${rows.join(' | ')}] want=[${expectedRows.join(' | ')}]`,
    )
  }
  const passed = run.tests.filter((t) => t.status === 'passed').length
  const failed = run.tests.filter((t) => t.status === 'failed').length
  if (run.report.numTotalTests !== run.tests.length) {
    problems.push(`numTotalTests=${run.report.numTotalTests} != details=${run.tests.length}`)
  }
  if (run.report.numPassedTests !== passed) {
    problems.push(`numPassedTests=${run.report.numPassedTests} != details=${passed}`)
  }
  if (run.report.numFailedTests !== failed) {
    problems.push(`numFailedTests=${run.report.numFailedTests} != details=${failed}`)
  }
  for (const suite of run.suites) {
    const message = typeof suite.message === 'string' ? suite.message.trim() : ''
    if (message !== '') {
      problems.push(
        `suite.message non-empty (extra hook/runtime error): ${suite.name}: ${message.slice(0, 80)}`,
      )
    }
    const suiteFailedTests = suite.assertionResults.filter((a) => a.status === 'failed').length
    if (suite.status === 'failed' && suiteFailedTests === 0) {
      problems.push(`suite failed without failed tests (collection/runtime error): ${suite.name}`)
    }
  }
  return problems
}

/** 绿态判据。 */
export function judgeGreen(run, expectedRows, expectedFiles) {
  const problems = judgeCommon(run, expectedRows, expectedFiles)
  if (run.exit !== 0) problems.push(`exit=${run.exit}`)
  if (run.report.success !== true) problems.push('success!=true')
  if ((run.report.numFailedTestSuites ?? 0) !== 0) {
    problems.push(`numFailedTestSuites=${run.report.numFailedTestSuites}`)
  }
  for (const suite of run.suites) {
    if (suite.status !== 'passed') problems.push(`suite status=${suite.status}: ${suite.name}`)
  }
  for (const t of run.tests) {
    if (t.status !== 'passed') problems.push(`non-passed: ${t.fullName} (${t.status})`)
  }
  return problems
}

/** 红态判据:恰一指定业务 AssertionError,其余全绿,执行集与进程层不变。 */
export function judgeRed(run, expectedRows, expectedFiles, failedFullName, marker) {
  const problems = judgeCommon(run, expectedRows, expectedFiles)
  if (run.exit === 0) problems.push('exit=0 (mutant not red)')
  if (run.report.success === true) problems.push('success=true with red run')
  if (!((run.report.numFailedTestSuites ?? 0) >= 1)) {
    problems.push(`numFailedTestSuites=${run.report.numFailedTestSuites} (expect >=1)`)
  }
  const failed = run.tests.filter((t) => t.status === 'failed')
  if (failed.length !== 1) {
    problems.push(`failed=${failed.length}: ${failed.map((t) => t.fullName).join(' | ')}`)
    return problems
  }
  if (failed[0].fullName !== failedFullName) {
    problems.push(`failed fullName mismatch: ${failed[0].fullName}`)
  }
  const messages = failed[0].failureMessages ?? []
  const hit = messages.find((m) => m.includes(marker))
  if (!hit) problems.push(`marker not in failureMessages: ${marker}`)
  else if (!hit.startsWith('AssertionError')) {
    problems.push(`failure not AssertionError: ${hit.slice(0, 80)}`)
  }
  for (const t of run.tests) {
    if (t.status !== 'passed' && t.status !== 'failed') {
      problems.push(`bad status: ${t.fullName} (${t.status})`)
    }
  }
  return problems
}

/** 判据自测:合成 run 证明 judge 真实拒收反例,先于真实针。 */
export function judgeSelfTest(expectedFiles) {
  const files = [expectedFiles[0]]
  const rows = [`${files[0]} :: A t1`, `${files[0]} :: A t2`]
  const mkSuites = (tests, extraSuites = [], suiteMessage = '') => {
    const main = {
      name: `/tmp/x/${expectedFiles[0]}`,
      status: tests.some(([, s]) => s === 'failed') ? 'failed' : 'passed',
      message: suiteMessage,
      assertionResults: tests.map(([fullName, status]) => ({
        fullName,
        status,
        ...(status === 'failed'
          ? { failureMessages: ['AssertionError: MK: expected 1 to be 0'] }
          : {}),
      })),
    }
    return [main, ...extraSuites]
  }
  const withSet = (tests, exit, extra = {}) => {
    const suites = extra.suites ?? mkSuites(tests, extra.extraSuites ?? [])
    const suiteTests = suites.flatMap((s) => s.assertionResults)
    return {
      exit,
      signal: extra.signal ?? null,
      pid: 4242,
      spawnError: extra.spawnError ?? null,
      argv: ['synthetic'],
      cwd: '/tmp/x',
      env: {},
      rawFile: 'synthetic',
      rawSha256: '0'.repeat(64),
      jsonFile: 'synthetic',
      jsonSha256: '0'.repeat(64),
      unhandledInOutput: extra.unhandledInOutput ?? false,
      tests: suiteTests,
      suites,
      report: {
        numPendingTests: suiteTests.some((t) => t.status === 'pending') ? 1 : 0,
        numTodoTests: 0,
        success: exit === 0,
        numTotalTests: suiteTests.length,
        numPassedTests: suiteTests.filter((t) => t.status === 'passed').length,
        numFailedTests: suiteTests.filter((t) => t.status === 'failed').length,
        numTotalTestSuites: suites.length,
        numFailedTestSuites: suites.filter((s) => s.status === 'failed').length,
        testResults: suites,
      },
    }
  }
  const cases = []
  const check = (name, problems, wantAccepted) => {
    cases.push({ name, accepted: problems.length === 0, want: wantAccepted })
  }
  check(
    'accepts clean green',
    judgeGreen(
      withSet(
        [
          ['A t1', 'passed'],
          ['A t2', 'passed'],
        ],
        0,
      ),
      rows,
      files,
    ),
    true,
  )
  check(
    'rejects green exit!=0',
    judgeGreen(
      withSet(
        [
          ['A t1', 'passed'],
          ['A t2', 'passed'],
        ],
        1,
      ),
      rows,
      files,
    ),
    false,
  )
  const oneRed = withSet(
    [
      ['A t1', 'passed'],
      ['A t2', 'failed'],
    ],
    1,
  )
  check('accepts single exact red', judgeRed(oneRed, rows, files, 'A t2', 'MK'), true)
  check(
    'rejects non-empty suite.message (hook error alongside target red)',
    judgeRed(
      withSet(
        [
          ['A t1', 'passed'],
          ['A t2', 'failed'],
        ],
        1,
        {
          suites: mkSuites(
            [
              ['A t1', 'passed'],
              ['A t2', 'failed'],
            ],
            [],
            'Error: CODEX_EXTRA_HOOK_ERROR',
          ),
        },
      ),
      rows,
      files,
      'A t2',
      'MK',
    ),
    false,
  )
  check(
    'rejects green with non-empty suite.message',
    judgeGreen(
      withSet(
        [
          ['A t1', 'passed'],
          ['A t2', 'passed'],
        ],
        0,
        {
          suites: mkSuites(
            [
              ['A t1', 'passed'],
              ['A t2', 'passed'],
            ],
            [],
            'Error: CODEX_EXTRA_HOOK_ERROR',
          ),
        },
      ),
      rows,
      files,
    ),
    false,
  )
  check(
    'rejects red with signal SIGTERM',
    judgeRed({ ...oneRed, signal: 'SIGTERM' }, rows, files, 'A t2', 'MK'),
    false,
  )
  check(
    'rejects green with signal SIGTERM',
    judgeGreen(
      {
        ...withSet(
          [
            ['A t1', 'passed'],
            ['A t2', 'passed'],
          ],
          0,
        ),
        signal: 'SIGTERM',
      },
      rows,
      expectedFiles,
    ),
    false,
  )
  check(
    'rejects extra failed collection suite',
    judgeRed(
      withSet(
        [
          ['A t1', 'passed'],
          ['A t2', 'failed'],
        ],
        1,
        {
          extraSuites: [
            { name: '/tmp/x/other-suite.test.ts', status: 'failed', assertionResults: [] },
          ],
        },
      ),
      rows,
      expectedFiles,
      'A t2',
      'MK',
    ),
    false,
  )
  check(
    'rejects spawnError',
    judgeGreen(
      {
        ...withSet(
          [
            ['A t1', 'passed'],
            ['A t2', 'passed'],
          ],
          0,
        ),
        spawnError: 'spawn ENOENT',
      },
      rows,
      expectedFiles,
    ),
    false,
  )
  check(
    'rejects count/detail drift (numTotalTests != details)',
    judgeGreen(
      (() => {
        const run = withSet(
          [
            ['A t1', 'passed'],
            ['A t2', 'passed'],
          ],
          0,
        )
        return { ...run, tests: run.tests.slice(0, 1) }
      })(),
      rows,
      expectedFiles,
    ),
    false,
  )
  check(
    'rejects duplicate suite entry for same file',
    judgeGreen(
      withSet(
        [
          ['A t1', 'passed'],
          ['A t2', 'passed'],
        ],
        0,
        {
          suites: [
            {
              name: `/tmp/x/${expectedFiles[0]}`,
              status: 'passed',
              assertionResults: [{ fullName: 'A t1', status: 'passed' }],
            },
            {
              name: `/tmp/x/${expectedFiles[0]}`,
              status: 'passed',
              assertionResults: [{ fullName: 'A t2', status: 'passed' }],
            },
          ],
        },
      ),
      rows,
      expectedFiles,
    ),
    false,
  )
  check(
    'rejects two failed',
    judgeRed(
      withSet(
        [
          ['A t1', 'failed'],
          ['A t2', 'failed'],
        ],
        1,
      ),
      rows,
      files,
      'A t2',
      'MK',
    ),
    false,
  )
  check('rejects wrong fullName', judgeRed(oneRed, rows, files, 'A t1', 'MK'), false)
  check('rejects missing marker', judgeRed(oneRed, rows, files, 'A t2', 'MISSING'), false)
  check(
    'rejects non-AssertionError failure',
    judgeRed(
      withSet(
        [
          ['A t1', 'passed'],
          ['A t2', 'failed'],
        ],
        1,
        {
          suites: [
            {
              name: `/tmp/x/${expectedFiles[0]}`,
              status: 'failed',
              assertionResults: [
                { fullName: 'A t1', status: 'passed' },
                { fullName: 'A t2', status: 'failed', failureMessages: ['TypeError: oops'] },
              ],
            },
          ],
        },
      ),
      rows,
      expectedFiles,
      'A t2',
      'TypeError',
    ),
    false,
  )
  check('rejects exit=0 red', judgeRed({ ...oneRed, exit: 0 }, rows, files, 'A t2', 'MK'), false)
  check(
    'rejects execution-set drift',
    judgeRed(oneRed, [...rows, `${expectedFiles[0]} :: A t3`], files, 'A t2', 'MK'),
    false,
  )
  check(
    'rejects empty execution set',
    judgeRed(
      {
        ...oneRed,
        suites: [],
        tests: [],
        report: {
          ...oneRed.report,
          testResults: [],
          numTotalTests: 0,
          numPassedTests: 0,
          numFailedTests: 0,
          numTotalTestSuites: 0,
          numFailedTestSuites: 0,
        },
      },
      [],
      expectedFiles,
      'A t2',
      'MK',
    ),
    false,
  )
  check(
    'rejects pending test',
    judgeGreen(
      withSet(
        [
          ['A t1', 'passed'],
          ['A t2', 'pending'],
        ],
        0,
      ),
      rows,
      files,
    ),
    false,
  )
  check(
    'rejects unhandled in output',
    judgeGreen(
      {
        ...withSet(
          [
            ['A t1', 'passed'],
            ['A t2', 'passed'],
          ],
          0,
        ),
        unhandledInOutput: true,
      },
      rows,
      expectedFiles,
    ),
    false,
  )
  for (const c of cases) {
    if (c.accepted !== c.want) {
      throw new Error(`judge self-test failed: ${c.name} accepted=${c.accepted} want=${c.want}`)
    }
  }
  return cases.map(({ name, accepted, want }) => ({ name, accepted, want }))
}

/** 真实 Vitest 判据探针(只在隔离树生成、用后删除):证明「目标单红 + afterAll 同步抛错」
 * 「目标单红 + afterAll 内异步 uncaught」均被唯一判据拒收,「纯业务目标红」仍被接受。 */
const JUDGE_PROBE_DIR = 'src/save/__judge_probe__'
const PROBE_TARGET_FULL_NAME = 'judge probe probe target'
const PROBE_MARKER = 'PROBE: expected 1 to be 0'
const PROBE_TARGET_TEST = `import { afterAll, describe, expect, it } from 'vitest'

describe('judge probe', () => {
  it('probe target', () => {
    expect(1, 'PROBE: expected 1 to be 0').toBe(0)
  })
})
`
const JUDGE_PROBE_CASES = [
  { id: 'probe-pure-business-red-accepted', expect: 'accept', code: PROBE_TARGET_TEST },
  {
    id: 'probe-red-plus-afterall-hook-error-rejected',
    expect: 'reject',
    code: `${PROBE_TARGET_TEST}afterAll(() => {
  throw new Error('CODEX_EXTRA_HOOK_ERROR')
})
`,
  },
  {
    id: 'probe-red-plus-async-uncaught-rejected',
    expect: 'reject',
    code: `${PROBE_TARGET_TEST}afterAll(async () => {
  setTimeout(() => {
    throw new Error('CODEX_EXTRA_RUNTIME_ERROR')
  }, 0)
  await new Promise((resolve) => setTimeout(resolve, 30))
})
`,
  },
]

export function runJudgeProbes(tree, logsDir) {
  const probeDirAbs = path.join(tree.pkg, JUDGE_PROBE_DIR)
  mkdirSync(probeDirAbs, { recursive: true })
  const results = []
  try {
    for (const probe of JUDGE_PROBE_CASES) {
      const file = `${JUDGE_PROBE_DIR}/${probe.id}.test.ts`
      writeFileSync(path.join(tree.pkg, file), probe.code)
      const run = runVitestJson(
        tree.pkg,
        [file],
        path.join(logsDir, `${probe.id}.raw`),
        path.join(logsDir, `${probe.id}.json`),
      )
      const rows = [`${file} :: ${PROBE_TARGET_FULL_NAME}`]
      const problems = judgeRed(run, rows, [file], PROBE_TARGET_FULL_NAME, PROBE_MARKER)
      const rejected = problems.length > 0
      const wantRejected = probe.expect === 'reject'
      if (rejected !== wantRejected) {
        throw new Error(
          `judge probe ${probe.id}: expect=${probe.expect} rejected=${rejected} problems=[${problems.join('; ')}]`,
        )
      }
      results.push({
        id: probe.id,
        expect: probe.expect,
        rejected,
        process: {
          exit: run.exit,
          signal: run.signal,
          spawnError: run.spawnError,
          unhandledInOutput: run.unhandledInOutput,
        },
        suiteMessages: run.suites.map((s) => ({
          suite: path.basename(s.name),
          message: typeof s.message === 'string' ? s.message.slice(0, 120) : '',
        })),
        rejectionProblems: problems,
        raw: { file: path.relative(path.dirname(logsDir), run.rawFile), sha256: run.rawSha256 },
        json: { file: path.relative(path.dirname(logsDir), run.jsonFile), sha256: run.jsonSha256 },
      })
    }
  } finally {
    rmSync(probeDirAbs, { recursive: true, force: true })
  }
  return results
}
