#!/usr/bin/env node
// TEST-REFORGE-OPENING-IO-LIFECYCLE-1 — 变异反控驱动（mkdtemp 树内变异，活动工作树零改动；r3 判据窄返工）。
//
// r3（Codex 二审 O-R2-01）相对 r2 的修正——其余 r2 口径（身份/status 分离、四相位同一
// 声明集合、N1 退役、相位 JSON 落盘、frozen 树、清理举证）全部保留：
//   - 每相位改为「同一次子进程」双 reporter 联判：--reporter=json --reporter=default
//     + --outputFile.json=<evidence>。native JSON（身份/状态/计数/suite.message）与
//     完整原始诊断（stdout+stderr）来自同一进程，杜绝两个进程互证。
//   - 解析器保留 suite.message：任何非空 suite.message（afterAll/hook/collection 层
//     错误，二审反例 CODEX_EXTRA_HOOK_ERROR 实测落此字段）一律拒收。
//   - 诊断污染检测不再只搜 Unhandled Rejection：Uncaught Exception（二审反例
//     CODEX_EXTRA_RUNTIME_ERROR 实测只出现在默认 reporter，json 全隐藏）、
//     Failed Suites、Unhandled Errors 头、stdout 任意 "Errors  N" 摘要行——业务相位
//     （baseline/mutant/restored/final）出现任一即拒收。
//   - 上述两种真实 Vitest 污染红入自测（合成相位按实测 json/console 形态构造），
//     纯业务单红仍接受。
//
// 干净重建：node docs/ops/evidence/TEST-REFORGE-OPENING-IO-LIFECYCLE-1/tools/run-counterproof.mjs
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { prepareTree } from './prepare-tree.mjs'

const evidenceDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const rawDir = path.join(evidenceDir, 'counterproof-raw')
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..')
const TEST_FILE = 'src/opening-menu.io-lifecycle.test.ts'
const PRODUCT = 'packages/reforge/src/opening-menu.ts'
const DISCOVER = process.argv.includes('--discover')
const EXPECTED_ROWS = 3

// r2 退役注入（O-R1-01）：不再执行，仅留历史身份与原因。
const retiredInjections = [
  {
    id: 'N1-duplicate-load-deduped',
    retiredAt: '2026-10-07',
    reason:
      'O-R1-01：该针把 single-flight 去重当"错误"注入，其目标合同（O4 重复输入产生两份 meta/thumb IO 与两张位图）是把产品缺陷写成绿预期，且与本包 R4 重复 IO/旧结果覆盖诊断矛盾。r2 已删除该合同（O4 单次正常读档归 flows H2 existing-proof），针随之退役，不计有效。',
  },
]

// 钉死锚（--discover 提取并人工核对后回填；正式门按此校验）。
const injections = [
  {
    id: 'N2-exit-raf-not-cancelled',
    edits: [
      [
        '    const cleanup = (): void => {\n      cancelAnimationFrame(raf)\n',
        '    const cleanup = (): void => {\n',
      ],
    ],
    expectedTest: 'O5 读档IO在途时选新局退出',
    expectedErrorPart: 'expected 1 to be +0 // Object.is equality',
  },
  {
    id: 'N3-selection-requires-thumb',
    edits: [
      [
        "        if (r.action?.kind === 'load') {",
        "        if (r.action?.kind === 'load' && thumbs.has(r.action.slotId)) {",
      ],
    ],
    expectedTest: 'O8 一槽有图一槽无图',
    expectedErrorPart: "expected undefined to deeply equal { kind: 'load', slotId: 'm01' }",
  },
  {
    id: 'N4-escape-no-longer-exits-load',
    edits: [
      [
        "        phase = 'menu' // 退回菜单列表(空槽/改主意)",
        "        phase = 'load' // io1-mutant: escape no longer exits load",
      ],
    ],
    expectedTest: 'O6 退出读档相位后重新进入',
    expectedErrorPart: "expected 'load' to be 'menu' // Object.is equality",
  },
]

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')
const ANSI_RE = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g')
const stripNoise = (s) => s.replace(ANSI_RE, '').replace(/["']/g, '')

// ── 判据函数（自测与真针共用同一实现） ────────────────────────────────────────────

const countsIssues = (phase) => {
  const issues = []
  const c = phase.counts ?? {}
  if (c.numPendingTests !== 0) issues.push(`numPendingTests=${c.numPendingTests} ≠ 0`)
  if (c.numTodoTests !== 0) issues.push(`numTodoTests=${c.numTodoTests} ≠ 0`)
  if (phase.signal !== null) issues.push(`signal=${phase.signal}`)
  if (phase.spawnError !== null) issues.push(`spawnError=${phase.spawnError}`)
  return issues
}

// 逐行 status 校验：执行集内只允许 passed/failed，隐藏 skip/todo 行拒收；计数与行数互核。
const rowStatusIssues = (phase) => {
  const issues = []
  const rowsList = phase.identity?.rowsList ?? []
  if (rowsList.length === 0) issues.push('identity 执行集为空（vacuous）')
  if (rowsList.length !== (phase.counts?.numTotalTests ?? -1))
    issues.push(`行数 ${rowsList.length} 与 numTotalTests=${phase.counts?.numTotalTests} 不一致`)
  const bad = rowsList.filter((row) => row.status !== 'passed' && row.status !== 'failed')
  if (bad.length)
    issues.push(`执行集含非 passed/failed 状态行（隐藏 skip/todo 拒收）: ${bad.length} 行`)
  const failedRows = rowsList.filter((row) => row.status === 'failed')
  if ((phase.counts?.numFailedTests ?? -1) !== failedRows.length)
    issues.push(
      `failed 计数 ${phase.counts?.numFailedTests} 与行级 failed ${failedRows.length} 不一致`,
    )
  return { issues, failedRows }
}

// suite 层核（O-R2-01）：零断言失败套件 + 任何非空 suite.message（hook/collection 层错误，
// 实测 afterAll throw 落 suite.message='CODEX_EXTRA_HOOK_ERROR'）一律拒收。
const suiteIssues = (phase) => {
  const issues = []
  for (const suite of phase.suites ?? []) {
    if (suite.status === 'failed' && suite.assertionCount === 0)
      issues.push(`collection/runtime error suite（零断言失败套件）: ${suite.name}`)
    if (suite.message)
      issues.push(
        `suite.message 非空（hook/collection 层额外错误，拒收）: ${suite.name} → ${suite.message.slice(0, 80)}`,
      )
  }
  return issues
}

// 同次子进程完整原始诊断核（O-R2-01）：业务相位出现任何全局/hook 运行错误形态即拒收，
// 不能只搜 Unhandled Rejection。实测形态：
//   afterAll throw → stderr 'Failed Suites' 段 + json suite.message；
//   异步 uncaught → stdout 'Errors  N error' 摘要行 + stderr 'Unhandled Errors'/'Uncaught Exception' 段，
//   native JSON 对后者完全隐藏。
const diagnosticsIssues = (text) => {
  const issues = []
  const hay = stripNoise(text)
  if (hay.includes('Failed Suites')) issues.push("诊断含 'Failed Suites'（hook 层错误）")
  if (hay.includes('Unhandled Rejection')) issues.push("诊断含 'Unhandled Rejection'")
  if (hay.includes('Uncaught Exception')) issues.push("诊断含 'Uncaught Exception'")
  if (hay.includes('Unhandled Errors'))
    issues.push("诊断含 'Unhandled Errors' 段（进程级错误存在）")
  if (/(^|\n)\s*Errors\s+\d/.test(hay))
    issues.push("stdout 含 'Errors  N' 摘要行（进程级错误存在）")
  return issues
}

const rowsOf = (phase) => phase.identity?.rowsList?.length ?? -1

const validateRedPhase = (phase, baselineIdentitySha, expectedFullName, expectedErrorPart) => {
  const issues = [
    ...countsIssues(phase),
    ...suiteIssues(phase),
    ...diagnosticsIssues(phase.diagnostics ?? ''),
  ]
  if (phase.exitCode === 0) issues.push('exit 0（未红/假绿）')
  if (phase.success !== false) issues.push('success≠false')
  if (phase.counts?.numFailedTests !== 1)
    issues.push(`numFailedTests=${phase.counts?.numFailedTests} ≠ 1`)
  if (phase.identity?.identitySha256 !== baselineIdentitySha)
    issues.push(
      `红相位执行集身份与 baseline 不一致（同数不同身份/漏跑拒收）: ${phase.identity?.identitySha256?.slice(0, 12)} ≠ ${baselineIdentitySha.slice(0, 12)}`,
    )
  const { issues: rowIssues, failedRows } = rowStatusIssues(phase)
  issues.push(...rowIssues)
  if (rowsOf(phase) !== EXPECTED_ROWS)
    issues.push(`identity 执行集 ${rowsOf(phase)} 行 ≠ ${EXPECTED_ROWS}（整文件定向）`)
  const failedFromIdentity = phase.identity?.failedRows ?? []
  if (failedFromIdentity.length !== failedRows.length)
    issues.push(
      `identity.failedRows ${failedFromIdentity.length} 与行级 failed ${failedRows.length} 不一致`,
    )
  if (failedRows.length === 1 && failedRows[0].fullName !== expectedFullName)
    issues.push(
      `唯一失败 fullName 不精确等于目标合同：got ${JSON.stringify(failedRows[0].fullName)}`,
    )
  const red =
    failedRows.length === 1
      ? (failedFromIdentity.find((row) => row.fullName === failedRows[0].fullName) ?? failedRows[0])
      : undefined
  if (red) {
    const messages = red.messages ?? []
    if (messages.length === 0) issues.push('失败无 failureMessages')
    else if (!messages.some((m) => m.includes('AssertionError')))
      issues.push('指定失败非 AssertionError')
    else if (!stripNoise(messages.join('\n')).includes(stripNoise(expectedErrorPart)))
      issues.push(`失败消息不含指定片段 ${expectedErrorPart}`)
    if (!stripNoise(phase.diagnostics ?? '').includes('AssertionError'))
      issues.push('同次诊断原文无 AssertionError 旁证')
    else if (!stripNoise(phase.diagnostics ?? '').includes(stripNoise(expectedErrorPart)))
      issues.push('同次诊断原文不含指定片段旁证')
  }
  return issues
}

const validateGreenPhase = (phase, baselineIdentitySha) => {
  const issues = [
    ...countsIssues(phase),
    ...suiteIssues(phase),
    ...diagnosticsIssues(phase.diagnostics ?? ''),
  ]
  if (phase.exitCode !== 0) issues.push(`exit=${phase.exitCode} ≠ 0`)
  if (phase.success !== true) issues.push('success≠true')
  if (phase.counts?.numFailedTests !== 0)
    issues.push(`numFailedTests=${phase.counts?.numFailedTests} ≠ 0`)
  if (phase.identity?.identitySha256 !== baselineIdentitySha)
    issues.push(
      `绿相位执行集身份与 baseline 不一致: ${phase.identity?.identitySha256?.slice(0, 12)} ≠ ${baselineIdentitySha.slice(0, 12)}`,
    )
  const { issues: rowIssues, failedRows } = rowStatusIssues(phase)
  issues.push(...rowIssues)
  if (failedRows.length) issues.push('identity 含 failed 行')
  if (rowsOf(phase) !== EXPECTED_ROWS)
    issues.push(`identity 执行集 ${rowsOf(phase)} 行 ≠ ${EXPECTED_ROWS}`)
  return issues
}

// ── runner 自测：合成 phase 必须被同一判据正确拒收/放行 ──────────────────────────

const selfTest = () => {
  const targetFullName = 'DESC O5 读档IO在途时选新局退出：菜单退休后迟到IO不复活帧键与绘制'
  const otherFullName = 'DESC 其它合同'
  const thirdFullName = 'DESC 第三条合同'
  const part = 'expected 1 to be +0 // Object.is equality'
  const identityOf = (rowsList) => {
    const names = rowsList.map((row) => `${row.file}\t${row.fullName}`).sort()
    return { rowsList, identitySha256: sha256(Buffer.from(`${names.join('\n')}\n`, 'utf8')) }
  }
  const baseCounts = (over = {}) => ({
    numTotalTests: 3,
    numFailedTests: 1,
    numPendingTests: 0,
    numTodoTests: 0,
    ...over,
  })
  const redRow = {
    file: 'x.test.ts',
    fullName: targetFullName,
    status: 'failed',
    messages: [`AssertionError: ${part}`],
  }
  const okRows = (failed) => [
    failed ? redRow : { file: 'x.test.ts', fullName: targetFullName, status: 'passed' },
    { file: 'x.test.ts', fullName: otherFullName, status: 'passed' },
    { file: 'x.test.ts', fullName: thirdFullName, status: 'passed' },
  ]
  const cleanConsole = (failed) =>
    failed
      ? `Test Files  1 failed (1)\nTests  1 failed | 2 passed (3)\nAssertionError: ${part}`
      : 'Test Files  1 passed (1)\nTests  3 passed (3)'
  const mkPhase = (rowsList, suites, consoleText, over = {}) => ({
    exitCode: 1,
    signal: null,
    spawnError: null,
    success: false,
    counts: baseCounts(),
    suites,
    identity: {
      ...identityOf(rowsList),
      failedRows: rowsList.filter((r) => r.status === 'failed'),
    },
    diagnostics: consoleText,
    ...over,
  })
  const okRed = mkPhase(
    okRows(true),
    [{ name: 'x.test.ts', status: 'failed', assertionCount: 3, message: '' }],
    cleanConsole(true),
  )
  const greenBase = mkPhase(
    okRows(false),
    [{ name: 'x.test.ts', status: 'passed', assertionCount: 3, message: '' }],
    cleanConsole(false),
    {
      exitCode: 0,
      success: true,
      counts: baseCounts({ numFailedTests: 0 }),
    },
  )
  const baselineSha = greenBase.identity.identitySha256
  // 二审两种真实 Vitest 污染形态（按实测 json/console 构造）：
  const hookSuites = [
    {
      name: 'x.test.ts',
      status: 'failed',
      assertionCount: 3,
      message: 'Error: CODEX_EXTRA_HOOK_ERROR',
    },
  ]
  const uncaughtConsole = `Test Files  1 failed (1)\nTests  1 failed | 2 passed (3)\n     Errors  1 error\nUnhandled Errors ⎯⎯\n⎯⎯ Uncaught Exception ⎯⎯\nError: CODEX_EXTRA_RUNTIME_ERROR\n ❯ Timeout._onTimeout x.test.ts:13:11`
  const cases = [
    {
      case: 'valid-red-accept',
      expect: 'accept',
      issues: validateRedPhase(okRed, baselineSha, targetFullName, part),
    },
    {
      case: 'red-hook-error-via-suite-message-reject',
      expect: 'reject',
      issues: validateRedPhase(
        mkPhase(okRows(true), hookSuites, cleanConsole(true)),
        baselineSha,
        targetFullName,
        part,
      ),
    },
    {
      case: 'red-runtime-uncaught-via-diagnostics-reject',
      expect: 'reject',
      issues: validateRedPhase(
        mkPhase(
          okRows(true),
          [{ name: 'x.test.ts', status: 'failed', assertionCount: 3, message: '' }],
          uncaughtConsole,
        ),
        baselineSha,
        targetFullName,
        part,
      ),
    },
    {
      case: 'green-hook-error-reject',
      expect: 'reject',
      issues: validateGreenPhase(
        mkPhase(okRows(false), hookSuites, cleanConsole(false), {
          exitCode: 1,
          success: false,
          counts: baseCounts({ numFailedTests: 0 }),
        }),
        baselineSha,
      ),
    },
    {
      case: 'green-runtime-uncaught-reject',
      expect: 'reject',
      issues: validateGreenPhase(
        mkPhase(
          okRows(false),
          [{ name: 'x.test.ts', status: 'passed', assertionCount: 3, message: '' }],
          uncaughtConsole
            .replace('1 failed | 2 passed', '3 passed')
            .replace('Test Files  1 failed', 'Test Files  1 passed'),
          {
            exitCode: 1,
            success: false,
            counts: baseCounts({ numFailedTests: 0 }),
          },
        ),
        baselineSha,
      ),
    },
    {
      case: 'red-unhandled-rejection-reject',
      expect: 'reject',
      issues: validateRedPhase(
        mkPhase(
          okRows(true),
          [{ name: 'x.test.ts', status: 'failed', assertionCount: 3, message: '' }],
          `${cleanConsole(true)}\nUnhandled Rejection\nError: simulated IO failure`,
        ),
        baselineSha,
        targetFullName,
        part,
      ),
    },
    {
      case: 'same-count-different-identity-reject',
      expect: 'reject',
      issues: validateRedPhase(
        mkPhase(
          [
            redRow,
            { file: 'x.test.ts', fullName: otherFullName, status: 'passed' },
            { file: 'x.test.ts', fullName: 'DESC 被换掉的合同', status: 'passed' },
          ],
          [{ name: 'x.test.ts', status: 'failed', assertionCount: 3, message: '' }],
          cleanConsole(true),
        ),
        baselineSha,
        targetFullName,
        part,
      ),
    },
    {
      case: 'red-hidden-skipped-reject',
      expect: 'reject',
      issues: validateRedPhase(
        mkPhase(
          [
            redRow,
            { file: 'x.test.ts', fullName: otherFullName, status: 'skipped' },
            { file: 'x.test.ts', fullName: thirdFullName, status: 'passed' },
          ],
          [{ name: 'x.test.ts', status: 'failed', assertionCount: 3, message: '' }],
          cleanConsole(true),
        ),
        baselineSha,
        targetFullName,
        part,
      ),
    },
    {
      case: 'green-hidden-skipped-reject',
      expect: 'reject',
      issues: validateGreenPhase(
        mkPhase(
          [
            { file: 'x.test.ts', fullName: targetFullName, status: 'skipped' },
            { file: 'x.test.ts', fullName: otherFullName, status: 'passed' },
            { file: 'x.test.ts', fullName: thirdFullName, status: 'passed' },
          ],
          [{ name: 'x.test.ts', status: 'passed', assertionCount: 3, message: '' }],
          cleanConsole(false),
          { counts: baseCounts({ numFailedTests: 0 }) },
        ),
        baselineSha,
      ),
    },
    {
      case: 'two-failures-reject',
      expect: 'reject',
      issues: validateRedPhase(
        mkPhase(
          okRows(true),
          [{ name: 'x.test.ts', status: 'failed', assertionCount: 3, message: '' }],
          cleanConsole(true),
          {
            counts: baseCounts({ numFailedTests: 2 }),
          },
        ),
        baselineSha,
        targetFullName,
        part,
      ),
    },
    {
      case: 'wrong-fullname-reject',
      expect: 'reject',
      issues: validateRedPhase(
        mkPhase(
          [
            { ...redRow, fullName: otherFullName },
            { file: 'x.test.ts', fullName: targetFullName, status: 'passed' },
            { file: 'x.test.ts', fullName: thirdFullName, status: 'passed' },
          ],
          [{ name: 'x.test.ts', status: 'failed', assertionCount: 3, message: '' }],
          cleanConsole(true),
        ),
        baselineSha,
        targetFullName,
        part,
      ),
    },
    {
      case: 'exit-zero-reject',
      expect: 'reject',
      issues: validateRedPhase(
        { ...okRed, exitCode: 0, success: true },
        baselineSha,
        targetFullName,
        part,
      ),
    },
    {
      case: 'pending-reject',
      expect: 'reject',
      issues: validateRedPhase(
        { ...okRed, counts: baseCounts({ numPendingTests: 1 }) },
        baselineSha,
        targetFullName,
        part,
      ),
    },
    {
      case: 'collection-error-reject',
      expect: 'reject',
      issues: validateRedPhase(
        {
          ...okRed,
          suites: [
            { name: 'broken.test.ts', status: 'failed', assertionCount: 0, message: '' },
            { name: 'x.test.ts', status: 'passed', assertionCount: 3, message: '' },
          ],
        },
        baselineSha,
        targetFullName,
        part,
      ),
    },
    {
      case: 'non-assertion-error-reject',
      expect: 'reject',
      issues: validateRedPhase(
        {
          ...okRed,
          identity: {
            ...okRed.identity,
            failedRows: [
              { fullName: targetFullName, messages: ['TypeError: cannot read props of undefined'] },
            ],
          },
        },
        baselineSha,
        targetFullName,
        part,
      ),
    },
    {
      case: 'signal-failure-reject',
      expect: 'reject',
      issues: validateRedPhase({ ...okRed, signal: 'SIGKILL' }, baselineSha, targetFullName, part),
    },
    {
      case: 'spawn-failure-reject',
      expect: 'reject',
      issues: validateRedPhase(
        { ...okRed, spawnError: 'spawn pnpm ENOENT' },
        baselineSha,
        targetFullName,
        part,
      ),
    },
    {
      case: 'count-row-mismatch-reject',
      expect: 'reject',
      issues: validateRedPhase(
        { ...okRed, counts: baseCounts({ numTotalTests: 2 }) },
        baselineSha,
        targetFullName,
        part,
      ),
    },
    {
      case: 'green-valid-accept',
      expect: 'accept',
      issues: validateGreenPhase(greenBase, baselineSha),
    },
    {
      case: 'green-identity-mismatch-reject',
      expect: 'reject',
      issues: validateGreenPhase(
        {
          ...greenBase,
          identity: {
            ...identityOf([
              { file: 'x.test.ts', fullName: targetFullName, status: 'passed' },
              { file: 'x.test.ts', fullName: otherFullName, status: 'passed' },
              { file: 'x.test.ts', fullName: 'DESC 被换掉的合同', status: 'passed' },
            ]),
          },
        },
        baselineSha,
      ),
    },
  ]
  return cases.map((c) => ({
    case: c.case,
    expect: c.expect,
    ok: c.expect === 'accept' ? c.issues.length === 0 : c.issues.length > 0,
    issues: c.issues,
  }))
}

// ── vitest 相位驱动（全部在 mkdtemp 树内；每相位一次子进程双 reporter 联判） ──────

const envSummary = () => ({ nodeVersion: process.version, NODE_COMPILE_CACHE: 'deleted' })

const runDual = (pkgRoot, args, jsonOutAbs) => {
  const env = { ...process.env }
  delete env.NODE_COMPILE_CACHE
  const argv = [
    'exec',
    'vitest',
    'run',
    ...args,
    '--reporter=json',
    '--reporter=default',
    `--outputFile.json=${jsonOutAbs}`,
  ]
  const proc = spawnSync('pnpm', argv, {
    cwd: pkgRoot,
    encoding: 'utf8',
    maxBuffer: 512 * 1024 * 1024,
    env,
    timeout: 600_000,
  })
  return { argv: ['pnpm', ...argv], proc }
}

const writeRaw = async (file, text) => {
  const normalized = `${text.replace(/[\r\n \t]+$/, '')}\n`
  await writeFile(file, normalized)
  // JSON 证据落盘即过 biome（回执 hash 按格式化后字节计，保证 lint 零诊断且账实一致）。
  if (file.endsWith('.json')) {
    const fmt = spawnSync(
      'pnpm',
      ['exec', 'biome', 'check', '--write', path.relative(repoRoot, file)],
      {
        cwd: repoRoot,
        encoding: 'utf8',
        timeout: 120_000,
      },
    )
    if (fmt.status !== 0)
      throw new Error(`raw json biome 格式化失败 ${file}: ${fmt.stdout ?? ''}${fmt.stderr ?? ''}`)
  }
  const onDisk = await readFile(file)
  return {
    bytes: onDisk.length,
    sha256: sha256(onDisk),
    path: path.relative(evidenceDir, file),
  }
}

// 同一次子进程：native JSON（outputFile）+ 完整原始诊断（stdout+stderr）联判材料。
const dualPhase = async (label, pkgRoot, args, artifactStem) => {
  const jsonAbs = path.join(rawDir, `${artifactStem}.json`)
  const { argv, proc } = runDual(pkgRoot, args, jsonAbs)
  let rawJson = null
  try {
    rawJson = await readFile(jsonAbs, 'utf8')
  } catch {
    throw new Error(`[${label}] native JSON 未写出（子进程崩溃/超时，harness 错误拒收）`)
  }
  let parsed
  try {
    parsed = JSON.parse(rawJson)
  } catch {
    throw new Error(`[${label}] native JSON 不可解析（harness 错误拒收）`)
  }
  const rowsList = []
  const failedRows = []
  const suites = []
  for (const suite of parsed.testResults ?? []) {
    const assertionCount = (suite.assertionResults ?? []).length
    suites.push({
      name: suite.name,
      status: suite.status,
      assertionCount,
      message: suite.message ?? '',
    })
    for (const tc of suite.assertionResults ?? []) {
      rowsList.push({ file: suite.name, fullName: tc.fullName, status: tc.status })
      if (tc.status === 'failed')
        failedRows.push({
          file: suite.name,
          fullName: tc.fullName,
          messages: tc.failureMessages ?? [],
        })
    }
  }
  if (!parsed.numTotalTests) throw new Error(`[${label}] vacuous 运行:零测试被收集/执行`)
  // 身份 = 规范化 file×fullName 多重集合（排序），不含 status；status 只入人工 TSV。
  const names = rowsList.map((row) => `${row.file}\t${row.fullName}`).sort()
  const identitySha256 = sha256(Buffer.from(`${names.join('\n')}\n`, 'utf8'))
  const tsvText = `${rowsList
    .map((row) => `${row.file}\t${row.fullName}\t${row.status}`)
    .sort()
    .join('\n')}\n`
  const diagnostics = `${proc.stdout ?? ''}\n${proc.stderr ?? ''}`
  const jsonStat = await writeRaw(jsonAbs, rawJson)
  const tsvStat = await writeRaw(path.join(rawDir, `${artifactStem}.identity.tsv`), tsvText)
  const consoleStat = await writeRaw(path.join(rawDir, `${artifactStem}.console`), diagnostics)
  return {
    label,
    subprocess: 'single（--reporter=json --reporter=default --outputFile.json，JSON 与诊断同进程）',
    argv,
    env: envSummary(),
    exitCode: proc.status,
    signal: proc.signal,
    spawnError: proc.error ? String(proc.error.message) : null,
    success: parsed.success,
    counts: {
      numTotalTests: parsed.numTotalTests,
      numPassedTests: parsed.numPassedTests,
      numFailedTests: parsed.numFailedTests,
      numPendingTests: parsed.numPendingTests,
      numTodoTests: parsed.numTodoTests,
      numTotalTestSuites: parsed.numTotalTestSuites,
      numFailedTestSuites: parsed.numFailedTestSuites,
    },
    suites,
    diagnostics,
    identity: {
      rowsList,
      identitySha256,
      failedRows,
      format:
        'identitySha256 = sha256(sorted "file\\tfullName" rows, status 不参与);人工 TSV 另含 status 列',
      artifacts: { phaseJson: jsonStat, identityTsv: tsvStat, console: consoleStat },
    },
  }
}

const extractAnchor = (message, tag) => {
  const clean = message.split('\n')[0]?.trim() ?? ''
  const m = /^AssertionError: (.*)$/.exec(clean)
  const line = (m ? m[1] : clean).slice(0, 120)
  if (!line || line.length < 8)
    throw new Error(`[${tag}] 无法从失败消息提取锚: ${message.slice(0, 200)}`)
  return line
}

// ── 主流程 ─────────────────────────────────────────────────────────────────────

let tree = null
try {
  const selfTestResults = selfTest()
  if (!selfTestResults.every((c) => c.ok))
    throw new Error(
      `runner 自测未过: ${JSON.stringify(selfTestResults.filter((c) => !c.ok).map((c) => c.case))}`,
    )

  await rm(rawDir, { recursive: true, force: true })
  await mkdir(rawDir, { recursive: true })
  tree = await prepareTree('counterproof')
  const sourceAbs = path.join(tree.tree, PRODUCT)
  const original = await readFile(sourceAbs, 'utf8')
  const originalHash = sha256(Buffer.from(original, 'utf8'))

  // 真实形态自检（O-R2-01）：把二审两例真实 Vitest 污染探针 + 纯业务红探针在同一
  // mkdtemp 树里跑过同一 dualPhase+validateRedPhase 管线——纯红必须接受、两种污染
  // 必须拒收（合成自测之外的最强证明；探针 = 2 绿 + 1 指定 AssertionError 红，
  // 叠加 afterAll throw / 异步 uncaught）。
  const probeDir = path.join(tree.pkgRoot, 'src/__tests__/opening-io-lifecycle')
  await mkdir(probeDir, { recursive: true })
  const probeCases = [
    {
      id: 'realshape-pure-red',
      imports: 'expect, test',
      body: '',
    },
    {
      id: 'realshape-afterall-hook-error',
      imports: 'afterAll, expect, test',
      body: "afterAll(() => {\n  throw new Error('CODEX_EXTRA_HOOK_ERROR')\n})",
    },
    {
      id: 'realshape-async-uncaught',
      imports: 'afterAll, expect, test',
      body: "afterAll(async () => {\n  setTimeout(() => {\n    throw new Error('CODEX_EXTRA_RUNTIME_ERROR')\n  }, 0)\n  await new Promise((resolve) => setTimeout(resolve, 30))\n})",
    },
  ]
  const probeRel = (id) => `src/__tests__/opening-io-lifecycle/${id}.test.ts`
  const probeSource = (c) =>
    [
      `import { ${c.imports} } from 'vitest'`,
      "test('green one', () => {",
      '  expect(1).toBe(1)',
      '})',
      "test('target red', () => {",
      '  expect(1).toBe(0)',
      '})',
      "test('green two', () => {",
      '  expect(2).toBe(2)',
      '})',
      c.body,
    ].join('\n')
  const probeResults = []
  for (const c of probeCases) {
    await writeFile(path.join(tree.pkgRoot, probeRel(c.id)), probeSource(c))
  }
  const purePhase = await dualPhase(
    'realshape.pure-red',
    tree.pkgRoot,
    [probeRel(probeCases[0].id)],
    'realshape-pure-red',
  )
  const pureSha = purePhase.identity.identitySha256
  const pureAnchor = extractAnchor(
    purePhase.identity.failedRows[0]?.messages?.[0] ?? '',
    'realshape',
  )
  const probeFullName = purePhase.identity.rowsList.find((row) =>
    row.fullName.includes('target red'),
  )?.fullName
  if (!probeFullName) throw new Error('[realshape] 探针目标红未找到')
  const pureIssues = validateRedPhase(purePhase, pureSha, probeFullName, pureAnchor)
  probeResults.push({
    id: probeCases[0].id,
    expect: 'accept',
    issues: pureIssues,
    ok: pureIssues.length === 0,
  })
  for (const c of [probeCases[1], probeCases[2]]) {
    const phase = await dualPhase(`realshape.${c.id}`, tree.pkgRoot, [probeRel(c.id)], c.id)
    const issues = validateRedPhase(phase, pureSha, probeFullName, pureAnchor)
    probeResults.push({ id: c.id, expect: 'reject', issues, ok: issues.length > 0 })
    if (!issues.length)
      throw new Error(`[realshape] 真实污染探针被误收: ${c.id}（O-R2-01 判据失效）`)
  }
  if (pureIssues.length)
    throw new Error(`[realshape] 纯业务红探针被误拒: ${JSON.stringify(pureIssues)}`)
  for (const c of probeCases) await rm(path.join(tree.pkgRoot, probeRel(c.id)), { force: true })

  const receipts = []
  const baselineShas = []
  for (const injection of injections) {
    const tag = injection.id
    const args = [TEST_FILE]
    // 第一态：baseline（pristine 树）。
    const baseline = await dualPhase(`${tag}.baseline`, tree.pkgRoot, args, `${tag}.baseline`)
    const baselineSha = baseline.identity.identitySha256
    const baselineIssues = validateGreenPhase(baseline, baselineSha)
    if (baselineIssues.length)
      throw new Error(`[${tag}.baseline] 基线非绿: ${baselineIssues.join('; ')}`)
    if (baseline.identity.rowsList.length !== EXPECTED_ROWS)
      throw new Error(
        `[${tag}] 定向基线执行集 ${baseline.identity.rowsList.length} 行 ≠ ${EXPECTED_ROWS}`,
      )
    const matched = baseline.identity.rowsList.filter((row) =>
      row.fullName.includes(injection.expectedTest),
    )
    if (matched.length !== 1)
      throw new Error(`[${tag}] 基线执行集中目标合同匹配 ${matched.length} 条 ≠ 1`)
    const expectedFullName = matched[0].fullName
    baselineShas.push(baselineSha)

    // 第二态：mutant 红（树内变异）——身份仍须与 baseline 同一集合。
    let mutant = original
    for (const [oldText, newText] of injection.edits) {
      if (mutant.split(oldText).length !== 2)
        throw new Error(`[${tag}] 变异锚点不唯一: ${JSON.stringify(oldText.slice(0, 60))}`)
      mutant = mutant.replace(oldText, newText)
    }
    if (mutant === original) throw new Error(`[${tag}] 变异未生效`)
    const mutantHash = sha256(Buffer.from(mutant, 'utf8'))
    await writeFile(sourceAbs, mutant)
    let red
    try {
      red = await dualPhase(`${tag}.mutant`, tree.pkgRoot, args, `${tag}.mutant`)
    } finally {
      await writeFile(sourceAbs, original)
    }
    const anchor = extractAnchor(red.identity.failedRows[0]?.messages?.[0] ?? '', tag)
    const pinned = !injection.expectedErrorPart.startsWith('ANCHOR-')
    const effectivePart = pinned ? injection.expectedErrorPart : anchor
    const redIssues = validateRedPhase(red, baselineSha, expectedFullName, effectivePart)

    // 第三态：restored 绿（身份与 baseline 集合级一致）。
    const restoredHash = sha256(Buffer.from(await readFile(sourceAbs, 'utf8'), 'utf8'))
    if (restoredHash !== originalHash) throw new Error(`[${tag}] 恢复字节与原始不一致`)
    const restored = await dualPhase(`${tag}.restored`, tree.pkgRoot, args, `${tag}.restored`)
    const restoredIssues = validateGreenPhase(restored, baselineSha)

    receipts.push({
      id: tag,
      file: PRODUCT,
      anchor: injection.edits.map(([oldText]) => oldText),
      expectedTest: injection.expectedTest,
      expectedFullName,
      expectedErrorPart: anchor,
      pinnedErrorPartMatch: pinned ? effectivePart === anchor : null,
      directed: args,
      original: { hash: originalHash },
      mutant: { hash: mutantHash, phase: red, issues: redIssues },
      restored: { sourceHash: restoredHash, phase: restored, issues: restoredIssues },
      pass:
        redIssues.length === 0 &&
        restoredIssues.length === 0 &&
        (!pinned || effectivePart === anchor),
    })
    if (pinned && effectivePart !== anchor)
      throw new Error(`[${tag}] 钉死锚与实际红消息不一致：pinned=${effectivePart} actual=${anchor}`)
  }
  if (new Set(baselineShas).size !== 1)
    throw new Error(
      `各 needle baseline 身份不一致: ${baselineShas.map((s) => s.slice(0, 12)).join(', ')}`,
    )
  const declaredSetSha = baselineShas[0]

  // 第四态：末次整文件重放——与同一声明集合比较。
  const finalReplay = await dualPhase('final-replay', tree.pkgRoot, [TEST_FILE], 'final-replay')
  const finalIssues = validateGreenPhase(finalReplay, declaredSetSha)
  if (finalReplay.identity.rowsList.length !== EXPECTED_ROWS)
    throw new Error(
      `[final-replay] 整文件执行集 ${finalReplay.identity.rowsList.length} 行 ≠ ${EXPECTED_ROWS}`,
    )
  const endHash = sha256(Buffer.from(await readFile(sourceAbs, 'utf8'), 'utf8'))
  if (endHash !== originalHash) throw new Error('[final] 树内源与原始不一致')

  // 最终删树举证 → 回执在清理之后写入。
  const cleanupProof = await tree.removeTree()
  tree = null

  const realShapeAllOk = probeResults.every((c) => c.ok)
  const allPass =
    receipts.every((r) => r.pass) &&
    finalIssues.length === 0 &&
    selfTestResults.every((c) => c.ok) &&
    realShapeAllOk
  const receipt = {
    generatedAt: new Date().toISOString(),
    nodeVersion: process.version,
    mode: DISCOVER ? 'discover（锚提取，供回填）' : 'pinned（正式门）',
    executionSet: `pnpm exec vitest run（cwd=mkdtemp 树 packages/reforge，定向整文件 ${TEST_FILE}，--reporter=json --reporter=default --outputFile.json；-t 过滤会致 pending/skip，不用）`,
    identityPolicy:
      '四相位（baseline/mutant/restored/final-replay）与同一非空声明集合（= baseline 身份 sha）比较；identitySha256 只含 file×fullName 多重集合，status 逐行分列校验',
    subprocessPolicy:
      '每相位一次子进程双 reporter 联判：native JSON（outputFile）与完整原始诊断（stdout+stderr）同进程采集（O-R2-01；JSON 单跑隐藏全局错误，双进程互证无效）',
    pollutionPolicy:
      '拒收 suite.message 非空（afterAll/hook 错误实测落此字段）、Failed Suites、Unhandled Rejection、Uncaught Exception、Unhandled Errors 段、stdout Errors N 摘要行——不能只搜 Unhandled Rejection（O-R2-01；异步 uncaught 实测只出现在默认 reporter）',
    treePolicy: 'mkdtemp 拷贝树内变异/还原；活动工作树产品零触碰；回执在最终删树取证后写入',
    selfTest: { cases: selfTestResults, allOk: selfTestResults.every((c) => c.ok) },
    realShapeSelfCheck: {
      policy:
        '真实 Vitest 探针（2 绿+1 指定 AssertionError 红，叠加 afterAll throw / 异步 uncaught）在同一 mkdtemp 树经同一 dualPhase+validateRedPhase 管线实跑：纯红须接受、两种污染须拒收（O-R2-01）',
      cases: probeResults,
      allOk: realShapeAllOk,
    },
    source: { file: PRODUCT, sha256: originalHash },
    declaredSet: { identitySha256: declaredSetSha, rows: EXPECTED_ROWS },
    retiredInjections,
    injections: receipts,
    finalReplay: { phase: finalReplay, issues: finalIssues },
    cleanup: {
      ...cleanupProof,
      policy:
        '成功路径删树后 existsSync=false 取证；准备失败路径在 prepareTree 内部清理并在异常信息携带证明',
    },
    allPass,
  }
  const outPath = path.join(evidenceDir, 'counterproof.json')
  await writeFile(outPath, `${JSON.stringify(receipt, null, 2)}\n`)
  const fmt = spawnSync('pnpm', ['exec', 'biome', 'check', '--write', outPath], {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 120_000,
  })
  if (fmt.status !== 0)
    throw new Error(`counterproof.json biome 格式化失败: ${fmt.stdout ?? ''}${fmt.stderr ?? ''}`)
  if (!allPass)
    throw new Error(
      `反控存在未过项: ${JSON.stringify(
        receipts
          .filter((r) => !r.pass)
          .map((r) => ({ id: r.id, red: r.mutant.issues, restored: r.restored.issues }))
          .concat(finalIssues.length ? [{ id: 'final-replay', issues: finalIssues }] : []),
      )}`,
    )
  console.log(
    `opening-io counterproof: ${receipts.length}/${receipts.length} PASS (${DISCOVER ? 'discover' : 'pinned'}, retired ${retiredInjections.length}) → ${outPath}`,
  )
  if (DISCOVER)
    for (const r of receipts)
      console.log(`  anchor ${r.id}: ${JSON.stringify(r.expectedErrorPart)}`)
} finally {
  // 失败路径清理：回执未写时也不留树（异常信息已带树路径与清理证明）。
  if (tree) await tree.removeTree()
}
