// TEST-EDITOR-AUTHOR-COMMAND-FORM-CONTRACTS-1 隔离树与严格判据库(按需证据工具,非测试,不进默认
// runner)。判据四态同判、suite.message/双 reporter 联判、计数/明细一致、身份漂移拒收等全部逐条
// 复用 TEST-GAME-MEDIA-LIFECYCLE-1/lib-isolated-tree.mjs 的已验收版本(复用前以 judgeSelfTest +
// 真实 hook/uncaught 探针重新自证,见 run-counterproof.mjs);本文件只替换包路径与冻结源清单,
// 不放宽任何判据。
//
// 隔离树:mkdtemp 临时目录(/tmp 根,vite fs.allow 拒绝 /var/folders 软链的坑沿用参考结论)复制
// packages/editor 的 src/配置,node_modules 软链到贡献者工作树安装(只读复用,不复制、不 install)。
// 建树后逐文件校验冻结源 sha256 与任务卡一致,变异只落在树内,用后整树删除并落清理证明。
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
export const EDITOR = path.join(REPO, 'packages/editor')
export const VITEST_CLI = path.join(REPO, 'node_modules/vitest/vitest.mjs')

/** 冻结源 = 任务卡 7 个产品源(卡面 SHA256) + 本卡 3 个新测试侧文件(树内逐字节一致)。 */
export const FROZEN_SOURCES = {
  'src/ui/CommandForm.tsx': 'be02bf5a67b18e9f92901ec25013f4c7e16b36a24aeadc608d0b057bb042c3bb',
  'src/ui/ScriptEditor.tsx': '880e1af383d3ee45c02b66d7b51bc62ff3fa65f12f9606697f399d6d1b8cf441',
  'src/ui/command-form-control.tsx':
    'e38402d7fc20ccb842c69aa95fef4237ec508a227e7d1f5f36e18e95156c88df',
  'src/ui/command-form-world.tsx':
    '49246a679b5c8f532bcdbc26cf70ccd0e5aba7c8cb7c0468c8e03fa3463cd4a7',
  'src/ui/command-form-contract.ts':
    '26494bbaa2c026946ab52478df97367121f123329b414f417d9485b1964c7062',
  'src/ui/command-form-controls.tsx':
    'fa8df924864a6d423e4276ad4ed7c0bd2c81cca2e3b05202d197e3c755c094bd',
  'src/core/script-reference-catalog.ts':
    '4673a96d9f85574136174d25f17051ffcd46e174743e3c1e0c712cf71a524601',
}
export const TEST_FILES = [
  'src/ui/CommandForm.author-control-contracts.test.tsx',
  'src/ui/CommandForm.author-world-contracts.test.tsx',
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

/** 持久 JSON 落盘:写 stringify 文本后经 biome format 定稿,sha 按定稿后的最终字节计。 */
export function persistJson(file, text) {
  writeRaw(file, text)
  const formatted = spawnSync(BIOME_BIN, ['format', '--write', file], { encoding: 'utf8' })
  if (formatted.status !== 0) {
    throw new Error(`biome format failed on ${file}: ${formatted.stderr ?? ''}`)
  }
  return sha256Of(file)
}

export function buildIsolatedTree(tag) {
  const treeRoot = existsSync('/tmp') ? '/tmp' : tmpdir()
  const tmp = mkdtempSync(path.join(treeRoot, `tp-editor-author-contracts-${tag}.`))
  try {
    const editor = path.join(tmp, 'packages/editor')
    mkdirSync(editor, { recursive: true })
    cpSync(path.join(EDITOR, 'src'), path.join(editor, 'src'), { recursive: true })
    for (const name of ['vite.config.ts', 'package.json', 'tsconfig.json']) {
      cpSync(path.join(EDITOR, name), path.join(editor, name))
    }
    symlinkSync(path.join(EDITOR, 'node_modules'), path.join(editor, 'node_modules'), 'dir')
    // 与参考库同构:根 node_modules 软链(vitest 是根级 devDep) + tsconfig.base.json 防
    // extends 断链静默 0 测试。
    symlinkSync(path.join(REPO, 'node_modules'), path.join(tmp, 'node_modules'), 'dir')
    const baseTsconfig = path.join(REPO, 'tsconfig.base.json')
    if (existsSync(baseTsconfig)) cpSync(baseTsconfig, path.join(tmp, 'tsconfig.base.json'))
    // vitest 的模块转换走 vite server.fs.allow:node_modules 软链把 @type-pal/* 解析回贡献者
    // 仓库真实路径,超出树根会被拒(实测 Denied ID → suite failed 零断言)。树内生成 wrapper
    // config 放行树根+贡献者根;产品 vite.config.ts 原样复用,不改任何字节。
    writeFileSync(
      path.join(editor, 'vitest.isolated.config.ts'),
      `import base from './vite.config.js'

export default {
  ...base,
  server: {
    ...(base.server ?? {}),
    fs: {
      ...(base.server?.fs ?? {}),
      allow: [${JSON.stringify(tmp)}, ${JSON.stringify(REPO)}],
    },
  },
}
`,
    )
    for (const [rel, expected] of Object.entries(FROZEN_SOURCES)) {
      const got = sha256Of(path.join(editor, rel))
      if (got !== expected) {
        throw new Error(`isolated tree is not the frozen product: ${rel} sha256=${got}`)
      }
    }
    return {
      tmp,
      editor,
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

/** 最小变异:find 在树内文件必须恰命中一次,防静默 no-op;保留原文用于字节级恢复。 */
export function applyNeedle(editorDir, relFile, find, replace) {
  const file = path.join(editorDir, relFile)
  const before = sha256Of(file)
  const originalText = readFileSync(file, 'utf8')
  const hits = originalText.split(find).length - 1
  if (hits !== 1) {
    throw new Error(`needle find must hit exactly once (${hits} hits): ${relFile}: ${find}`)
  }
  writeFileSync(file, originalText.replace(find, replace))
  const mutant = sha256Of(file)
  return { file, before, mutant, originalText }
}

export function restoreNeedle(entry) {
  const { file, before, originalText } = entry
  writeFileSync(file, originalText)
  const restored = sha256Of(file)
  if (restored !== before) {
    throw new Error(`restore is not byte-identical: ${file}`)
  }
  return restored
}

// —— 以下判据与参考库逐条一致(未改语义):双 reporter 联判、进程层、执行身份、suite 健康。 ——

const GLOBAL_FAULT_RE =
  /Unhandled (Errors?|Rejection)|unhandledRejection|Uncaught Exception|uncaughtException/i

/** 树内以双 reporter 跑执行集(-t 可选):native JSON 落持久位置,default reporter 走 stdout,
 * 两者同进程联判,不以 JSON reporter 静默证明零 unhandled。 */
export function runVitestJson(editorDir, testFiles, rawOut, jsonOut, testNamePattern) {
  const argv = [
    VITEST_CLI,
    'run',
    ...testFiles,
    '--config=vitest.isolated.config.ts',
    '--reporter=json',
    '--reporter=default',
    `--outputFile.json=${jsonOut}`,
    ...(testNamePattern ? ['--testNamePattern', testNamePattern] : []),
  ]
  const envSnapshot = {
    inherited: true,
    node: process.version,
    NODE_OPTIONS: process.env.NODE_OPTIONS ?? null,
    NODE_ENV: process.env.NODE_ENV ?? null,
    TZ: process.env.TZ ?? null,
  }
  const spawned = spawnSync('node', argv, {
    cwd: editorDir,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    timeout: 240_000,
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
    cwd: editorDir,
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

/** 判据自测(合成反例):与参考库一致的拒收面,先于任何真实针。 */
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
              status: 'passed',
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

/** 真实 Vitest 判据探针(复用前自证,只在隔离树生成、用后删除):目标单红 + afterAll 同步抛错 /
 * 异步 uncaught 均被唯一判据拒收,纯业务目标红仍被接受。 */
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
  const probeDirAbs = path.join(tree.editor, JUDGE_PROBE_DIR)
  mkdirSync(probeDirAbs, { recursive: true })
  const results = []
  try {
    for (const probe of JUDGE_PROBE_CASES) {
      const file = `${JUDGE_PROBE_DIR}/${probe.id}.test.ts`
      writeFileSync(path.join(tree.editor, file), probe.code)
      const run = runVitestJson(
        tree.editor,
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
      })
    }
  } finally {
    rmSync(probeDirAbs, { recursive: true, force: true })
  }
  return results
}
