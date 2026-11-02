// TEST-REFORGE-BATTLE-HOST-TEST-RELIABILITY-1 隔离树与严格判据库(按需证据工具,非测试,不进默认 runner)。
// 判据复用自 TEST-GAME-MEDIA-LIFECYCLE-1/lib-isolated-tree.mjs(卡面只读参考,判例 r3 版):
// 进程层(exit/signal/spawnError)、执行身份(非空完整 file×fullName 多重集逐字锁定)、
// suite 健康(非空 suite.message / 零断言 failed suite 拒收)、输出层(unhandled 字样)、
// 红态恰一指定业务 AssertionError;自测反例 + 真实 Vitest 探针(hook 错误/异步 uncaught)先于真实针。
// 本卡适配:reforge 包路径、定向命令同款 env -u NODE_COMPILE_CACHE、冻结源为卡面 4 产品源 +
// 本卡交付的测试与 harness。
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

/** 卡面冻结源(建树逐文件校验) + 本卡交付文件(建树时与工作树逐字节一致)。 */
export const FROZEN_SOURCES = {
  'src/battle/battle-host.ts': '38a9dc227a35ac0292ccf25e95cfe59a2f9a8a21686fcef5a6d3e24a52c8cc2b',
  'src/battle/battle-launch-preparation.ts':
    'c13c54d7e6cad926432e810cbd028661fc216b3f04e538e371e792e9710a7c20',
  'src/battle/battle-world-result.ts':
    'ebf23d84f68739fb15a46defde2a3016177d71130ed5a230afda8b827bd92050',
  'src/battle/battle-session.ts':
    'cd4bb233eacac2d2c175d7e1d8b466a90d7c8173dbd0308bf5160b19e6936b19',
}
export const DELIVERED_SOURCES = {
  'src/battle/battle-host.finalization.test.ts':
    'a421eb77c2f84933cb9a20faccf398b4d627fde94a8f2fc7cf8b06e942049574',
  'src/__tests__/battle-finalization-reliability/battle-finalization-host-harness.ts':
    'e27b8bf9a1ffaeca19d76d04cba4ab0b3b070fe9f514a5d9bff149373d481841',
}

export const TEST_FILE = 'src/battle/battle-host.finalization.test.ts'
export const DIRECTED_FILES = [
  TEST_FILE,
  'src/battle/battle-host.test.ts',
  'src/battle/battle-finalization.world-result.test.ts',
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
  // 树根固定 /tmp(macOS os.tmpdir()=/var/folders 下 vite server.fs.allow 拒软链,判例同源)。
  const treeRoot = existsSync('/tmp') ? '/tmp' : tmpdir()
  const tmp = mkdtempSync(path.join(treeRoot, `tp-bhtr-${tag}.`))
  try {
    const reforge = path.join(tmp, 'packages/reforge')
    mkdirSync(reforge, { recursive: true })
    cpSync(path.join(REFORGE, 'src'), path.join(reforge, 'src'), { recursive: true })
    for (const name of ['vite.config.ts', 'package.json', 'tsconfig.json']) {
      const from = path.join(REFORGE, name)
      if (existsSync(from)) cpSync(from, path.join(reforge, name))
    }
    symlinkSync(path.join(REFORGE, 'node_modules'), path.join(reforge, 'node_modules'), 'dir')
    symlinkSync(path.join(REPO, 'node_modules'), path.join(tmp, 'node_modules'), 'dir')
    const baseTsconfig = path.join(REPO, 'tsconfig.base.json')
    if (existsSync(baseTsconfig)) cpSync(baseTsconfig, path.join(tmp, 'tsconfig.base.json'))
    for (const [rel, expected] of Object.entries(FROZEN_SOURCES)) {
      const got = sha256Of(path.join(reforge, rel))
      if (got !== expected) {
        throw new Error(`isolated tree is not the frozen product: ${rel} sha256=${got}`)
      }
    }
    for (const [rel, expected] of Object.entries(DELIVERED_SOURCES)) {
      const got = sha256Of(path.join(reforge, rel))
      if (got !== expected) {
        throw new Error(`isolated tree is not the delivered test source: ${rel} sha256=${got}`)
      }
    }
    return {
      tmp,
      reforge,
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

/** 全局未捕获/钩子异常的原始诊断模式:JSON reporter 对这些静默,同进程 default reporter 揭示。 */
const GLOBAL_FAULT_RE =
  /Unhandled (Errors?|Rejection)|unhandledRejection|Uncaught Exception|uncaughtException/i

/** 树内以双 reporter 跑执行集(与卡面定向命令同款 env:unset NODE_COMPILE_CACHE)。 */
export function runVitestJson(reforge, testFiles, rawOut, jsonOut) {
  const argv = [
    'node',
    VITEST_CLI,
    'run',
    ...testFiles,
    '--reporter=json',
    '--reporter=default',
    `--outputFile.json=${jsonOut}`,
  ]
  const env = { ...process.env }
  delete env.NODE_COMPILE_CACHE
  const envSnapshot = {
    inherited: true,
    unset: ['NODE_COMPILE_CACHE'],
    node: process.version,
    NODE_OPTIONS: process.env.NODE_OPTIONS ?? null,
    NODE_ENV: process.env.NODE_ENV ?? null,
    TZ: process.env.TZ ?? null,
  }
  const spawned = spawnSync('node', argv.slice(1), {
    cwd: reforge,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    timeout: 240_000,
    env,
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
    spawnError: spawned.error ? spawned.error.message : null,
    argv,
    cwd: reforge,
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

/** 级联记录判据(非 needle 验收,如实披露共享 oracle 跨层命中):失败集恰为期望集、
 * 全部 AssertionError、执行集/进程层不变;用于 N3 三文件范围的诚实披露。 */
export function judgeCascade(run, expectedRows, expectedFiles, expectedFailedFullNames) {
  const problems = judgeCommon(run, expectedRows, expectedFiles)
  if (run.exit === 0) problems.push('exit=0 (no red)')
  const failed = run.tests.filter((t) => t.status === 'failed')
  const gotNames = failed.map((t) => t.fullName).sort()
  const wantNames = [...expectedFailedFullNames].sort()
  if (gotNames.join('\n') !== wantNames.join('\n')) {
    problems.push(`failed set: got=[${gotNames.join(' | ')}] want=[${wantNames.join(' | ')}]`)
  }
  for (const t of failed) {
    const first = (t.failureMessages ?? [])[0] ?? ''
    if (!first.startsWith('AssertionError')) {
      problems.push(`non-AssertionError failure: ${t.fullName}: ${first.slice(0, 60)}`)
    }
  }
  return problems
}

/** 判据自测:合成反例证明 judge 真实拒收(signal/spawnError/额外 collection suite/非空
 * suite.message/计数漂移/重复 suite/执行集漂移/pending/unhandled/双红/错名/缺 marker/
 * 非 AssertionError/exit0),先于真实针。 */
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
  const greenPair = () =>
    withSet(
      [
        ['A t1', 'passed'],
        ['A t2', 'passed'],
      ],
      0,
    )
  check('accepts clean green', judgeGreen(greenPair(), rows, files), true)
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
    'rejects non-empty suite.message alongside target red',
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
    judgeGreen({ ...greenPair(), signal: 'SIGTERM' }, rows, files),
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
      files,
      'A t2',
      'MK',
    ),
    false,
  )
  check(
    'rejects spawnError',
    judgeGreen({ ...greenPair(), spawnError: 'spawn ENOENT' }, rows, files),
    false,
  )
  check(
    'rejects count/detail drift (numTotalTests != details)',
    judgeGreen(
      (() => {
        const run = greenPair()
        return { ...run, tests: run.tests.slice(0, 1) }
      })(),
      rows,
      files,
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
      files,
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
      files,
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
    judgeGreen({ ...greenPair(), unhandledInOutput: true }, rows, files),
    false,
  )
  check(
    'cascade: accepts exact expected failed set (all AssertionError)',
    judgeCascade(
      withSet(
        [
          ['A t1', 'failed'],
          ['A t2', 'failed'],
        ],
        1,
      ),
      rows,
      files,
      ['A t1', 'A t2'],
    ),
    true,
  )
  check(
    'cascade: rejects unexpected extra failed',
    judgeCascade(oneRed, rows, files, ['A t1', 'A t2']),
    false,
  )
  for (const c of cases) {
    if (c.accepted !== c.want) {
      throw new Error(`judge self-test failed: ${c.name} accepted=${c.accepted} want=${c.want}`)
    }
  }
  return cases.map(({ name, accepted, want }) => ({ name, accepted, want }))
}

/** 真实 Vitest 判据探针(只在隔离树生成、用后删除):目标单红被接受;红 + afterAll 同步
 * hook 错误被拒(非空 suite.message);红 + afterAll 内异步 uncaught 被拒(诊断层)。 */
const JUDGE_PROBE_DIR = 'src/__judge_probe__'
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
  const probeDirAbs = path.join(tree.reforge, JUDGE_PROBE_DIR)
  mkdirSync(probeDirAbs, { recursive: true })
  const results = []
  try {
    for (const probe of JUDGE_PROBE_CASES) {
      const file = `${JUDGE_PROBE_DIR}/${probe.id}.test.ts`
      writeFileSync(path.join(tree.reforge, file), probe.code)
      const run = runVitestJson(
        tree.reforge,
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

/** 变异工具:精确文本替换,恰一命中才生效;返回变异前/后 sha。 */
export function applyMutation(tree, relFile, find, replace) {
  const abs = path.join(tree.reforge, relFile)
  const before = readFileSync(abs, 'utf8')
  const hits = before.split(find).length - 1
  if (hits !== 1) throw new Error(`mutation anchor hits=${hits} (want 1): ${find}`)
  const after = before.replace(find, replace)
  writeFileSync(abs, after)
  return {
    file: relFile,
    beforeSha256: sha256Bytes(Buffer.from(before, 'utf8')),
    mutantSha256: sha256Bytes(Buffer.from(after, 'utf8')),
  }
}

export function restoreMutation(tree, relFile, find, replace) {
  const abs = path.join(tree.reforge, relFile)
  const mutant = readFileSync(abs, 'utf8')
  const hits = mutant.split(replace).length - 1
  if (hits !== 1) throw new Error(`restore anchor hits=${hits} (want 1): ${replace}`)
  const restored = mutant.replace(replace, find)
  writeFileSync(abs, restored)
  return sha256Bytes(Buffer.from(restored, 'utf8'))
}
