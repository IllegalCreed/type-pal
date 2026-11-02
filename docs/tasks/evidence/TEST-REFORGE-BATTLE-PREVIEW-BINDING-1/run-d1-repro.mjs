// TEST-REFORGE-BATTLE-PREVIEW-BINDING-1 — D-1 隔离正向红反例 repro 工具 r3（证据再生用，非测试）。
// r3 按 Codex 二审 B-R2-01 重铸：唯一判据 judgeReproRun 纳入「该次子进程完整全局错误诊断」。
//  - JSON reporter 不暴露 Unhandled/Uncaught Exception（二审实证：afterAll setTimeout 异步抛错后
//    native JSON 仍 total2/pass1/fail1、suite.message 空），故判据必须消费同一子进程的完整 raw
//    （同次双 reporter：default→stdout/stderr 完整诊断，json→outputFile 原生 JSON，身份仍以
//    native JSON 为准）并拒收额外 uncaught/unhandled/harness 全局错误。
//  - 拒收能力用真实 Vitest 污染样本证明：复制树内第二组临时测试（同 CONTROL/REPRO fullName，
//    CONTROL 1=1、REPRO `expect(['actual']).toContain(needle)`、afterAll setTimeout 异步抛
//    CODEX_EXTRA_RUNTIME_ERROR）——该样本其余条件全部满足、唯全局错误被新判据拒收。
//  - 正确纯两例形状（CONTROL 绿 + REPRO 恰一指定 AssertionError 红）仍须接受（主 D-1 诊断即此形状）。
//  - r1/r2 已核能力保留：parse 失败/spawn/signal/退出码/冻结漂移/身份多重集/状态计数/needle/
//    todo·pending/suite.message 拒收 + 同判据自测；仓库外 mkdtemp 完整产品复制树 + finally 清理
//    + 成功/提前失败清理演练；B4 已降级源码域证据（dedup-ledger）。
// 期望结果本身是红（产品缺陷 D-1）：runner 以「红形状正确 + 污染形状拒收 + 自测/演练全过 +
// 清理干净」为通过判据，形状不对即非零退出。尾步自动 biome format 回执（MHB 先例）。
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import process from 'node:process'

const root = path.resolve(import.meta.dirname, '../../../..')
const ev = path.join(root, 'docs/ops/evidence/TEST-REFORGE-BATTLE-PREVIEW-BINDING-1')

const CONTROL_NAME = 'CONTROL 作者 startBattle.choreography 经正常脚本 caller 呈现遭遇音效日志'
const REPRO_NAME =
  'REPRO ?battle=encounter&battle-scene=b 试打消费场景 canonical startBattle.choreography'
const NEEDLE = "to include '♪ 音效 sfx-encounter'"
// 卡面冻结 SHA（TEST-REFORGE-BATTLE-PREVIEW-BINDING-1.md「前提真值与直接锚点」表）。
const FROZEN_PIN = [
  [
    'packages/reforge/src/main.ts',
    'b7c50edd82faa26bb710dfdb814ea07cff4183bb1729b9738f840707ea303c28',
  ],
  [
    'packages/reforge/src/runtime-project-view.ts',
    '1c7ed7ca473734f1bc12f6c4b6b2f14cf5bff8dad96a9674398e9eb24022b1e2',
  ],
  [
    'packages/reforge/src/project-loader.ts',
    'ec07b4e235d13df2b6945870b3994eb2b3ab0031b4d80bbb0a6bf7ffe20bff1f',
  ],
  [
    'packages/content/src/author-script-core.ts',
    '7ae6f77a42739a2b7343c4a58177f349b024db39b0e1a52a783cb7e7ba510058',
  ],
]
const PACKAGES = ['content', 'editor', 'game', 'migrate', 'pal-extract', 'reforge', 'shared']
const ROOT_FILES = ['package.json', 'pnpm-workspace.yaml', 'pnpm-lock.yaml', 'tsconfig.base.json']

// 同次子进程完整输出（stdout+stderr）中的全局错误标志。JSON reporter 对这些静默（二审实证），
// 只能从 default reporter 的完整 raw 取证；两个真实样本（干净主诊断 / 污染样本）双向验证。
const GLOBAL_ERROR_PATTERNS = [
  [/Unhandled Errors?/, 'unhandled-errors-section'],
  [/Unhandled Rejection/i, 'unhandled-rejection'],
  [/Uncaught Exception/i, 'uncaught-exception'],
  [/^\s*Errors\s+[1-9]\d*\s+errors?\b/im, 'errors-summary-line'],
]

// D-1 业务反例临时测试（写进复制树 packages/reforge/repro-d1-r3/；相对导入按该深度固定 ../src/…）。
// CONTROL＝同一合法工程内作者 startBattle 命令自带同一 choreography 经正常脚本 caller 走真实
// boot 呈现遭遇音效日志（正向可控，排除「fixture 形状错/不可呈现」替代解释）；
// REPRO＝?battle=encounter&battle-scene=b 试打：先以公开 loadScene 作 test 侧独立验证（装载器
// 校验通过、canonical stage 正文确有匹配命令；非试打 IO 归因，B4 见 dedup-ledger 源码域证据），
// 再断言试打绑定的遭遇演出被真实战斗消费 —— D-1 下该断言恰一红。
const TEST_SOURCE = `// @vitest-environment jsdom
// TEST-REFORGE-BATTLE-PREVIEW-BINDING-1 — D-1 隔离正向红反例 r3（复制树内按需 repro，不入默认 suite）。
import { afterEach, expect, test } from 'vitest'
import { installShellHost, type ShellHost } from '../src/__tests__/runtime-shell/dom-host.js'
import { drain, key } from '../src/__tests__/runtime-shell/driver.js'
import { sceneWithCommands } from '../src/__tests__/runtime-shell/project.js'
import { advance, bootScenario, session, state } from '../src/__tests__/runtime-shell/scenarios.js'

const CHOREO_LINE = '♪ 音效 sfx-encounter'
const encounterChoreo = [{ at: 'battleStart', body: [{ kind: 'playSound', asset: 'sfx-encounter' }] }]

let host: ShellHost | undefined
afterEach(async () => {
  try {
    if (host && state().renderDebug.inBattle) {
      const active = session()
      active.cancel()
      await active.done.catch(() => undefined)
      await drain()
    }
  } catch {
    // boot 未完成时无观测面可收口。
  }
  host?.close()
  host = undefined
})

/** 收集整场战斗期间的 battleLog 并集（session 结束后 active 为空，必须战内快照）。 */
async function collectBattleLog(limit = 100): Promise<string[]> {
  const observed = new Set<string>()
  for (let i = 0; i < limit && state().renderDebug.inBattle; i++) {
    for (const line of state().battleLog) observed.add(line)
    await key(host!, 'Enter', 100)
  }
  return [...observed]
}

test('${CONTROL_NAME}', async () => {
  host = await installShellHost()
  const first = sceneWithCommands('a', [
    {
      kind: 'startBattle',
      enemyTeamId: 'encounter',
      auto: true,
      choreography: [{ at: 'battleStart', body: [{ kind: 'playSound', asset: 'sfx-encounter' }] }],
    },
  ])
  await bootScenario(host, { first })
  await advance(host, () => state().renderDebug.inBattle)
  const observed = await collectBattleLog()
  expect(observed).toContain(CHOREO_LINE)
})

test('${REPRO_NAME}', async () => {
  host = await installShellHost('?battle=encounter&battle-scene=b')
  const second = sceneWithCommands('b', [
    {
      kind: 'startBattle',
      enemyTeamId: 'encounter',
      choreography: [{ at: 'battleStart', body: [{ kind: 'playSound', asset: 'sfx-encounter' }] }],
    },
  ])
  const h = await bootScenario(host, { second })
  await advance(host, () => state().renderDebug.inBattle)
  // test 侧独立 canonical 验证（非试打 IO 归因——boot 期 references() 预载全部场景，读取记录
  // 无法按 caller 归因，B4 见 dedup-ledger 源码域证据）：同一 fixture 工程经公开 loadScene
  // 读取并校验 b（装载器逐命令校验含 startBattle.choreography），onEnter stage 正文确有匹配
  // encounter 的命令。
  const { loadScene } = await import('../src/project-loader.js')
  const canonicalB = await loadScene(h.fixture.project, 'b')
  const stageBody = canonicalB.hooks?.onEnter?.variants.main?.flow.stages[0]?.body ?? []
  expect(stageBody).toEqual([
    {
      kind: 'startBattle',
      enemyTeamId: 'encounter',
      choreography: [{ at: 'battleStart', body: [{ kind: 'playSound', asset: 'sfx-encounter' }] }],
    },
  ])
  // D-1 目标合同（红）：试打绑定的遭遇演出应被真实战斗消费。
  const observed = await collectBattleLog()
  expect(observed, \`battleLog 观测=\${JSON.stringify(observed)}\`).toContain(CHOREO_LINE)
})
`

// 判据最小输入（二审指定，非 D-1 业务 repro、非新增绿测）：同 CONTROL/REPRO fullName，CONTROL
// 1=1；REPRO expect(['actual']).toContain(needle) 产生指定 AssertionError；afterAll setTimeout
// 异步抛 CODEX_EXTRA_RUNTIME_ERROR —— native JSON 完全干净（两例一绿一目标红、suite.message 空），
// 只有同次完整 raw 暴露全局错误，用于证明新判据拒收污染形状。
const POLLUTION_SOURCE = `// TEST-REFORGE-BATTLE-PREVIEW-BINDING-1 — 判据污染样本（复制树内按需，不入默认 suite）。
import { afterAll, expect, test } from 'vitest'

test('${CONTROL_NAME}', () => {
  expect(1).toBe(1)
})

test('${REPRO_NAME}', () => {
  expect(['actual']).toContain('♪ 音效 sfx-encounter')
})

afterAll(async () => {
  setTimeout(() => {
    throw new Error('CODEX_EXTRA_RUNTIME_ERROR')
  }, 0)
  await new Promise((resolve) => setTimeout(resolve, 30))
})
`

const trimEof = (text) => `${text.replace(/\n+$/, '')}\n`
const sha256File = (file) => createHash('sha256').update(readFileSync(file)).digest('hex')
const sha256Text = (text) => createHash('sha256').update(text, 'utf8').digest('hex')
const clone = (value) => structuredClone(value)

// ── 唯一严格判据（实跑、污染样本与自测共用；任何 reject 即整体非通过） ──
function judgeReproRun(input) {
  const reasons = []
  const reject = (reason) => reasons.push(reason)
  if (input.spawnError) reject(`spawn-error:${input.spawnError}`)
  if (input.signal !== null) reject(`signal:${input.signal}`)
  if (input.exitCode !== 1) reject(`exit-code:${input.exitCode}`)
  for (const frozen of input.frozen)
    if (frozen.actual !== frozen.expected) reject(`frozen-drift:${frozen.path}`)
  // B-R2-01：同次子进程完整输出里的全局错误（JSON reporter 对这些静默）。
  const raw = input.raw ?? ''
  for (const [pattern, label] of GLOBAL_ERROR_PATTERNS)
    if (pattern.test(raw)) reject(`global-error:${label}`)
  if (!input.parseOk) {
    reject('json-unparseable')
    return { accept: false, reasons }
  }
  const report = input.report
  if ((report.numPendingTests ?? 0) !== 0) reject(`pending:${report.numPendingTests}`)
  if ((report.numTodoTests ?? 0) !== 0) reject(`todo:${report.numTodoTests}`)
  if (report.numTotalTests !== 2) reject(`total:${report.numTotalTests}`)
  if (report.numPassedTests !== 1) reject(`passed:${report.numPassedTests}`)
  if (report.numFailedTests !== 1) reject(`failed:${report.numFailedTests}`)
  const suites = report.testResults ?? []
  if (suites.length !== 1) {
    reject(`suite-count:${suites.length}`)
    return { accept: false, reasons }
  }
  const suite = suites[0]
  const expectedFile = input.expectedFile
  if (typeof suite.name !== 'string' || suite.name.trim() === '') reject('suite-file-empty')
  else if (expectedFile !== undefined && suite.name !== expectedFile) reject('suite-file-mismatch')
  if (typeof suite.message === 'string' && suite.message.trim() !== '')
    reject('suite-runtime-error')
  const entries = (suite.assertionResults ?? []).map((entry) => ({
    file: suite.name,
    fullName: entry.fullName,
    status: entry.status,
    failureMessages: entry.failureMessages ?? [],
  }))
  if (entries.length !== 2) reject(`assertion-count:${entries.length}`)
  for (const entry of entries) {
    if (typeof entry.fullName !== 'string' || entry.fullName.trim() === '') reject('fullname-empty')
    if (entry.status !== 'passed' && entry.status !== 'failed') {
      reject(`assertion-status:${entry.status}`)
    }
  }
  const named = entries.filter(
    (entry) => entry.fullName === CONTROL_NAME || entry.fullName === REPRO_NAME,
  )
  if (named.length !== entries.length || named.length !== 2) reject('identity-multiset')
  const control = entries.find((entry) => entry.fullName === CONTROL_NAME)
  const repro = entries.find((entry) => entry.fullName === REPRO_NAME)
  if (control === undefined) reject('control-missing')
  else {
    if (control.status !== 'passed') reject(`control-status:${control.status}`)
    if (control.failureMessages.length !== 0) reject('control-failure-messages')
  }
  if (repro === undefined) reject('repro-missing')
  else {
    if (repro.status !== 'failed') reject(`repro-status:${repro.status}`)
    if (repro.failureMessages.length !== 1)
      reject(`repro-failure-count:${repro.failureMessages.length}`)
    else {
      if (!repro.failureMessages[0].startsWith('AssertionError'))
        reject('repro-not-assertion-error')
      if (!repro.failureMessages[0].includes(NEEDLE)) reject('repro-needle-missing')
    }
  }
  return { accept: reasons.length === 0, reasons }
}

// ── 判据拒收自测（同函数喂畸形形状；正确形状必须 accept，防恒拒） ──
function selftestJudgment() {
  const goodFrozen = FROZEN_PIN.map(([p, expected]) => ({ path: p, expected, actual: expected }))
  const cleanRaw = [
    ' RUN  v4.1.7 copy/packages/reforge',
    ' ❯ repro-d1-r3/d1-repro.test.ts (2 tests | 1 failed) 100ms',
    '   ✓ CONTROL 作者 …',
    '   × REPRO ?battle=encounter&battle-scene=b …',
    `AssertionError: battleLog 观测=["胜利"]: expected … ${NEEDLE}`,
    ' ⎯ Failed Tests 1 ⎯',
    '',
    ' Test Files  1 failed (1)',
    '      Tests  1 failed | 1 passed (2)',
    '',
  ].join('\n')
  const goodReport = {
    numTotalTests: 2,
    numPassedTests: 1,
    numFailedTests: 1,
    numPendingTests: 0,
    numTodoTests: 0,
    testResults: [
      {
        name: '/copy/packages/reforge/repro-d1-r3/d1-repro.test.ts',
        status: 'failed',
        message: '',
        assertionResults: [
          { fullName: CONTROL_NAME, status: 'passed', failureMessages: [] },
          {
            fullName: REPRO_NAME,
            status: 'failed',
            failureMessages: [`AssertionError: battleLog 观测=["胜利"]: expected … ${NEEDLE}`],
          },
        ],
      },
    ],
  }
  const base = () => ({
    parseOk: true,
    report: clone(goodReport),
    exitCode: 1,
    signal: null,
    spawnError: null,
    frozen: clone(goodFrozen),
    raw: cleanRaw,
    expectedFile: goodReport.testResults[0].name,
  })
  const cases = []
  const case_ = (name, mutate, expectAccept) => {
    const input = base()
    mutate(input)
    cases.push({ name, expectAccept, verdict: judgeReproRun(input) })
  }
  case_('正确形状（含干净 raw）必须 accept', () => {}, true)
  case_(
    'json 解析失败拒收',
    (i) => {
      i.parseOk = false
    },
    false,
  )
  case_(
    'spawn 错误拒收',
    (i) => {
      i.spawnError = 'ENOENT'
    },
    false,
  )
  case_(
    'signal 非空拒收',
    (i) => {
      i.signal = 'SIGTERM'
    },
    false,
  )
  case_(
    'raw 含 Unhandled Errors 段拒收',
    (i) => {
      i.raw += '\n ⎯⎯⎯⎯⎯ Unhandled Errors ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯\n'
    },
    false,
  )
  case_(
    'raw 含 Uncaught Exception 拒收',
    (i) => {
      i.raw += '\n Uncaught Exception: boom\n'
    },
    false,
  )
  case_(
    'raw 含 Unhandled Rejection 拒收',
    (i) => {
      i.raw += '\n Unhandled Rejection: later\n'
    },
    false,
  )
  case_(
    'raw 含 Errors 汇总行拒收',
    (i) => {
      i.raw += '\n Errors  1 error\n'
    },
    false,
  )
  case_(
    'exit 0 拒收',
    (i) => {
      i.exitCode = 0
      i.report.numFailedTests = 0
      i.report.numPassedTests = 2
      i.report.testResults[0].status = 'passed'
      i.report.testResults[0].assertionResults[1].status = 'passed'
      i.report.testResults[0].assertionResults[1].failureMessages = []
    },
    false,
  )
  case_(
    '缺 CONTROL 拒收',
    (i) => {
      i.report.testResults[0].assertionResults[0].fullName = '其它名字'
    },
    false,
  )
  case_(
    'CONTROL 红拒收',
    (i) => {
      i.report.testResults[0].assertionResults[0].status = 'failed'
      i.report.testResults[0].assertionResults[0].failureMessages = ['AssertionError: x']
      i.report.numPassedTests = 0
      i.report.numFailedTests = 2
    },
    false,
  )
  case_(
    'REPRO 绿拒收',
    (i) => {
      i.report.testResults[0].assertionResults[1].status = 'passed'
      i.report.testResults[0].assertionResults[1].failureMessages = []
      i.report.numPassedTests = 2
      i.report.numFailedTests = 0
    },
    false,
  )
  case_(
    '额外第三例拒收',
    (i) => {
      i.report.testResults[0].assertionResults.push({
        fullName: 'EXTRA',
        status: 'passed',
        failureMessages: [],
      })
      i.report.numTotalTests = 3
      i.report.numPassedTests = 2
    },
    false,
  )
  case_(
    'needle 不符拒收',
    (i) => {
      i.report.testResults[0].assertionResults[1].failureMessages = [
        'AssertionError: expected … to include 别的东西',
      ]
    },
    false,
  )
  case_(
    '双 failureMessages 拒收',
    (i) => {
      i.report.testResults[0].assertionResults[1].failureMessages = [
        `AssertionError: ${NEEDLE}`,
        'Error: extra',
      ]
    },
    false,
  )
  case_(
    '非 AssertionError 拒收',
    (i) => {
      i.report.testResults[0].assertionResults[1].failureMessages = [`Error: ${NEEDLE}`]
    },
    false,
  )
  case_(
    'todo 状态拒收',
    (i) => {
      i.report.testResults[0].assertionResults[0].status = 'todo'
    },
    false,
  )
  case_(
    'suite 级 runtime 错误拒收',
    (i) => {
      i.report.testResults[0].message = 'Unhandled error outside test suite'
    },
    false,
  )
  case_(
    '计数不符拒收',
    (i) => {
      i.report.numTotalTests = 3
    },
    false,
  )
  case_(
    '冻结漂移拒收',
    (i) => {
      i.frozen[0].actual = 'deadbeef'
    },
    false,
  )
  case_(
    'file 与 expectedFile 不符拒收',
    (i) => {
      i.report.testResults[0].name = '/elsewhere/x.test.ts'
    },
    false,
  )
  return {
    cases: cases.map((c) => ({
      name: c.name,
      expectAccept: c.expectAccept,
      actualAccept: c.verdict.accept,
      reasons: c.verdict.reasons,
      pass: c.verdict.accept === c.expectAccept,
    })),
    allPass: cases.every((c) => c.verdict.accept === c.expectAccept),
  }
}

// ── 仓库外完整产品复制树（r2 已核；node_modules 软链回真树安装） ──
function buildProductCopy(dest) {
  for (const file of ROOT_FILES) copyFileSync(path.join(root, file), path.join(dest, file))
  for (const pkg of PACKAGES) {
    cpSync(path.join(root, 'packages', pkg), path.join(dest, 'packages', pkg), {
      recursive: true,
      filter: (source) => !source.includes(`${path.sep}node_modules`),
    })
  }
  symlinkSync(path.join(root, 'node_modules'), path.join(dest, 'node_modules'), 'dir')
  for (const pkg of PACKAGES) {
    const real = path.join(root, 'packages', pkg, 'node_modules')
    if (existsSync(real)) symlinkSync(real, path.join(dest, 'packages', pkg, 'node_modules'), 'dir')
  }
}

/** 建树起即有 finally 清理保护；成功与提前失败都核清理，只删本次树。 */
function guardedTreeRun(label, body) {
  const tree = mkdtempSync(path.join(tmpdir(), 'reforge-d1-repro-r3-'))
  let ok = false
  let failure = null
  let phase = 'init'
  try {
    const outcome = body(tree, (next) => {
      phase = next
    })
    ok = true
    return { label, ok, failure: null, phase, tree, ...outcome }
  } catch (error) {
    failure = String(error)
    return { label, ok, failure, phase, tree }
  } finally {
    rmSync(tree, { recursive: true, force: true })
  }
}

const cleanupProofOf = (run) => ({ ...run, treeRemovedAfterRun: !existsSync(run.tree) })

/** 同次双 reporter 采集：default→stdout/stderr 完整诊断（判据 raw），json→文件（native 身份）。 */
function runVitestDualReporter(testFilter, cwd, jsonPath) {
  const argv = [
    path.join(root, 'node_modules/.bin/vitest'),
    'run',
    testFilter,
    '--reporter=default',
    '--reporter=json',
    `--outputFile.json=${jsonPath}`,
  ]
  const spawned = spawnSync(argv[0], argv.slice(1), {
    cwd,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    timeout: 300_000,
    env: { ...process.env, NODE_COMPILE_CACHE: '' },
  })
  const stdout = `${spawned.stdout ?? ''}`
  const stderr = `${spawned.stderr ?? ''}`
  let parseOk = false
  let report = null
  if (existsSync(jsonPath)) {
    try {
      report = JSON.parse(readFileSync(jsonPath, 'utf8'))
      parseOk = true
    } catch {
      parseOk = false
    }
  }
  return {
    argv,
    cwd,
    stdout,
    stderr,
    raw: `${stdout}\n${stderr}`,
    parseOk,
    report,
    exitCode: spawned.status,
    signal: spawned.signal,
    spawnError: spawned.error ? String(spawned.error.code ?? spawned.error) : null,
  }
}

const identityOf = (report) =>
  (report?.testResults ?? []).flatMap((suite) =>
    (suite.assertionResults ?? []).map((entry) => ({
      file: suite.name,
      fullName: entry.fullName,
      status: entry.status,
    })),
  )

// ── 主流程 ──
const selftest = selftestJudgment()
const drillFail = cleanupProofOf(
  guardedTreeRun('prep-failure-drill', () => {
    throw new Error('simulated preparation failure')
  }),
)
const drillSuccess = cleanupProofOf(
  guardedTreeRun('success-cleanup-drill', (tree) => {
    writeFileSync(path.join(tree, 'marker.txt'), 'x')
    return {}
  }),
)

const mainRun = cleanupProofOf(
  guardedTreeRun('main', (tree, phase) => {
    phase('build-copy')
    buildProductCopy(tree)
    phase('write-tests')
    const mainDir = path.join(tree, 'packages/reforge', 'repro-d1-r3')
    const pollutionDir = path.join(tree, 'packages/reforge', 'repro-d1-r3-pollution')
    mkdirSync(mainDir, { recursive: true })
    mkdirSync(pollutionDir, { recursive: true })
    const testFile = path.join(mainDir, 'd1-repro.test.ts')
    writeFileSync(testFile, TEST_SOURCE)
    const pollutionFile = path.join(pollutionDir, 'pollution.test.ts')
    writeFileSync(pollutionFile, POLLUTION_SOURCE)
    // macOS tmpdir 是 /var → /private/var 符号链；vitest 按 realpath 报告，判据按同基准比较。
    const expectedMainSuite = realpathSync(testFile)
    const expectedPollutionSuite = realpathSync(pollutionFile)
    phase('verify-frozen')
    const frozen = FROZEN_PIN.map(([rel, expected]) => ({
      path: rel,
      expected,
      actual: sha256File(path.join(tree, rel)),
    }))
    const cwd = path.join(tree, 'packages/reforge')
    phase('execute-main')
    const mainJson = path.join(tree, 'd1.vitest.json')
    const main = runVitestDualReporter('repro-d1-r3/d1-repro.test.ts', cwd, mainJson)
    writeFileSync(path.join(ev, 'd1-repro.raw'), trimEof(main.stdout))
    writeFileSync(path.join(ev, 'd1-repro.stderr.raw'), trimEof(main.stderr))
    if (parseOkSafe(main))
      writeFileSync(path.join(ev, 'd1-repro.vitest.json'), trimEof(readFileSync(mainJson, 'utf8')))
    phase('judge-main')
    const mainJudgment = judgeReproRun({
      parseOk: main.parseOk,
      report: main.report,
      exitCode: main.exitCode,
      signal: main.signal,
      spawnError: main.spawnError,
      frozen,
      raw: main.raw,
      expectedFile: expectedMainSuite,
    })
    phase('execute-pollution')
    const pollutionJson = path.join(tree, 'pollution.vitest.json')
    const pollution = runVitestDualReporter(
      'repro-d1-r3-pollution/pollution.test.ts',
      cwd,
      pollutionJson,
    )
    writeFileSync(path.join(ev, 'd1-pollution.raw'), trimEof(pollution.stdout))
    writeFileSync(path.join(ev, 'd1-pollution.stderr.raw'), trimEof(pollution.stderr))
    if (parseOkSafe(pollution)) {
      writeFileSync(
        path.join(ev, 'd1-pollution.vitest.json'),
        trimEof(readFileSync(pollutionJson, 'utf8')),
      )
    }
    phase('judge-pollution')
    const pollutionJudgment = judgeReproRun({
      parseOk: pollution.parseOk,
      report: pollution.report,
      exitCode: pollution.exitCode,
      signal: pollution.signal,
      spawnError: pollution.spawnError,
      frozen,
      raw: pollution.raw,
      expectedFile: expectedPollutionSuite,
    })
    const envFingerprint = sha256Text(
      Object.entries(process.env)
        .filter(([key]) => key !== 'NODE_COMPILE_CACHE')
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('\n'),
    )
    const describeRun = (run) => ({
      argv: run.argv,
      cwd: run.cwd,
      env: {
        NODE_COMPILE_CACHE: "''（空串，禁用编译缓存）",
        nodeVersion: process.version,
        envFingerprint,
      },
      exitCode: run.exitCode,
      signal: run.signal,
      spawnError: run.spawnError,
      stdoutSha256: sha256Text(run.stdout),
      stderrSha256: sha256Text(run.stderr),
      nativeJson: parseOkSafe(run)
        ? {
            totals: {
              files: run.report.numTotalTestSuites,
              tests: run.report.numTotalTests,
              passed: run.report.numPassedTests,
              failed: run.report.numFailedTests,
            },
            identity: identityOf(run.report),
          }
        : null,
    })
    return {
      judgment: mainJudgment,
      details: {
        run: describeRun(main),
        pollution: {
          ...describeRun(pollution),
          judgment: pollutionJudgment,
          // 污染样本的证明形态：其余条件全过，唯一拒收原因就是同次 raw 的全局错误。
          soleReasonGlobalError:
            !pollutionJudgment.accept &&
            pollutionJudgment.reasons.length > 0 &&
            pollutionJudgment.reasons.every((reason) => reason.startsWith('global-error:')),
        },
        productCopy: {
          tree: path.basename(tree),
          mode: '仓库外 mkdtemp：根配置+全 packages/* 真实拷贝（去 node_modules）+根/包级 node_modules 软链',
          frozen: frozen.map((f) => ({ ...f, match: f.actual === f.expected })),
          testFile: 'packages/reforge/repro-d1-r3/d1-repro.test.ts',
          testSha256: sha256File(testFile),
          pollutionFile: 'packages/reforge/repro-d1-r3-pollution/pollution.test.ts',
          pollutionSha256: sha256File(pollutionFile),
        },
      },
    }
  }),
)

function parseOkSafe(run) {
  return run.parseOk && run.report !== null
}

const verdict = {
  tool: 'run-d1-repro.mjs (r3)',
  expected:
    'D-1 red shape: CONTROL green + REPRO exactly-one AssertionError red, with same-run global-error diagnostics (out-of-repo copy tree)',
  r3Rework: [
    'B-R2-01 判据纳入同次子进程完整全局错误诊断（default reporter raw），拒收叠加的异步 uncaught/unhandled',
    '同次双 reporter：native JSON（身份）+ 完整 raw（全局错误）',
    '真实 Vitest 污染样本（afterAll setTimeout 异步抛）被唯一拒收，且唯一拒收原因即全局错误',
  ],
  gitHead: spawnSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout?.trim(),
  mainRun: {
    label: mainRun.label,
    ok: mainRun.ok,
    failure: mainRun.failure,
    phaseReached: mainRun.phase,
    treeRemovedAfterRun: mainRun.treeRemovedAfterRun,
    judgment: mainRun.judgment,
    details: mainRun.details,
  },
  selftest,
  cleanupDrills: [drillFail, drillSuccess].map((d) => ({
    label: d.label,
    ok: d.ok,
    failure: d.failure,
    phaseReached: d.phase,
    treeRemovedAfterRun: d.treeRemovedAfterRun,
  })),
}
const drillsClean =
  mainRun.treeRemovedAfterRun &&
  drillFail.treeRemovedAfterRun &&
  drillSuccess.treeRemovedAfterRun &&
  !drillFail.ok &&
  drillSuccess.ok
const allChecksPass =
  mainRun.ok &&
  mainRun.judgment?.accept === true &&
  mainRun.details?.pollution.soleReasonGlobalError === true &&
  selftest.allPass &&
  drillsClean

writeFileSync(path.join(ev, 'd1-repro.json'), `${JSON.stringify(verdict, null, 2)}\n`)
// 尾步自动 biome format 回执（MHB 先例）：再生输出原样过根 lint 零诊断硬门。
const biome = spawnSync(path.join(root, 'node_modules/.bin/biome'), [
  'format',
  '--write',
  path.join(ev, 'd1-repro.json'),
  path.join(ev, 'd1-repro.vitest.json'),
  path.join(ev, 'd1-pollution.vitest.json'),
])
if (biome.status !== 0) throw new Error(`biome format 回执失败: ${biome.stderr}`)

console.log(
  JSON.stringify(
    {
      allChecksPass,
      mainJudgment: mainRun.judgment,
      pollutionJudgment: mainRun.details?.pollution.judgment,
      pollutionSoleReasonGlobalError: mainRun.details?.pollution.soleReasonGlobalError,
      mainTotals: mainRun.details?.run.nativeJson?.totals,
      pollutionTotals: mainRun.details?.pollution.nativeJson?.totals,
      selftestAllPass: selftest.allPass,
      drillsClean,
    },
    null,
    2,
  ),
)
process.exit(allChecksPass ? 0 : 1)
