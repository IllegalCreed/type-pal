#!/usr/bin/env node
// TEST-GLM-REFORGE-MAIN-HOST-BOUNDARIES-1 — main.ts 五针变异反控驱动（mt1 r2 严格口径）。
//
// 每个 phase（baseline / 每针 mutant / 每针 restored / final-replay）以 vitest JSON reporter
// 解析完整 file×fullName×status 执行集，排序落盘 counterproof-raw/*.identity.tsv（字节流即
// identitySha256）。红相位硬门：exit≠0、signal/spawnError null、numFailedTests===1、零
// pending/todo、无零断言失败 suite（collection/runtime 形态）、唯一 failed 行 fullName 与目标
// 合同精确相等、failureMessages 含指定 AssertionError 片段（console 原文旁证同查）。绿相位
// 硬门：exit 0、全 passed、identitySha256 与 baseline 集合级一致。runner 自测 11 例先行。
//
// 判例沿用：cwd=pkgRoot 裸 pnpm exec（--filter 红相位污染 JSON stdout）；运行期间不并发编辑
// 任何 tracked 交付文件。
//
// 干净 checkout 重建：node packages/reforge/scripts/mhb1-mutation-counterproof.mjs
import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = path.resolve(pkgRoot, '..', '..')
const evidenceDir = path.join(repoRoot, 'docs/ops/evidence/TEST-GLM-REFORGE-MAIN-HOST-BOUNDARIES-1')
const rawDir = path.join(evidenceDir, 'counterproof-raw')

// 本卡交付改动(测试/脚本/证据/卡面)不参与 clean 判定;变异目标 main.ts 运行前必须 clean
// 且恢复后逐字节等于原始。
const ownNewPaths = [
  'packages/reforge/src/main.host-boundaries-1.test.ts',
  'packages/reforge/scripts/mhb1-mutation-counterproof.mjs',
  'docs/ops/evidence/TEST-GLM-REFORGE-MAIN-HOST-BOUNDARIES-1',
  'docs/ops/tasks/TEST-GLM-REFORGE-MAIN-HOST-BOUNDARIES-1.md',
]

const injections = [
  {
    id: 'MHB-ENTRY-REVEAL',
    anchor: '    if (!entry) return',
    // 入场揭示被跳过：entry fade-out 后无人 fade-in，终态幕布卡在全黑。
    mutate: (line) =>
      line.replace(
        '    if (!entry) return',
        '    if (entry) return /* mhb1-mutant: reveal skipped */',
      ),
    expectedTest: 'MHB-ENTRY-REVEAL-1',
    expectedErrorPart: 'expected 1 to be +0',
  },
  {
    id: 'MHB-SCRIPT-ERR',
    anchor: 'showToast(`脚本错误: ',
    // 脚本错误公开回执被移除：错误仍被吞掉但用户无感知。
    mutate: () => '            /* mhb1-mutant: script error receipt removed */',
    expectedTest: 'MHB-SCRIPT-ERR-1',
    expectedErrorPart: 'expected false to be true',
  },
  {
    id: 'MHB-TRIAL-DONE',
    anchor: '.then((r) => showToast(`试打结束:',
    // 试打终局回执被移除。
    mutate: () => '        .then((r) => void r /* mhb1-mutant: trial done receipt removed */)',
    expectedTest: 'MHB-TRIAL-DONE-1',
    expectedErrorPart: 'expected false to be true',
  },
  {
    id: 'MHB-TRIAL-ERROR',
    anchor: 'if (!isAbortError(error)) showToast(`试打失败:',
    // 试打失败回执被移除。
    mutate: () => '          /* mhb1-mutant: trial failure receipt removed */',
    expectedTest: 'MHB-TRIAL-ERROR-1',
    expectedErrorPart: 'expected false to be true',
  },
  {
    id: 'MHB-SAVE-FAIL',
    anchor: "showToast('存档失败')",
    // 存档失败公开回执被移除。注：写队列毒化变异(saveWriteQueue = scheduled)会连带打红
    // checkpoint-export.chain 的两条既有合同(共享写序/计数面)，不满足恰一红口径；本针独占
    // 打红本卡回执腿，队列/计数腿由测试断言本身与该预核记录共同覆盖。
    mutate: () => "  /* mhb1-mutant: save failure receipt removed */",
    expectedTest: 'MHB-SAVE-FAIL-1',
    expectedErrorPart: 'expected false to be true',
  },
]

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')

// ── 判据函数（自测与真针共用同一实现） ────────────────────────────────────────────

const countsIssues = (phase) => {
  const issues = []
  const c = phase.counts ?? {}
  if (phase.exitCode === 0) issues.push('exit 0（未红/假绿）')
  if (phase.signal !== null) issues.push(`signal=${phase.signal}`)
  if (phase.spawnError !== null) issues.push(`spawnError=${phase.spawnError}`)
  if (c.numFailedTests !== 1) issues.push(`numFailedTests=${c.numFailedTests} ≠ 1`)
  if (c.numPendingTests !== 0) issues.push(`numPendingTests=${c.numPendingTests} ≠ 0`)
  if (c.numTodoTests !== 0) issues.push(`numTodoTests=${c.numTodoTests} ≠ 0`)
  if (phase.success !== false) issues.push('success≠false')
  return issues
}

const validateRedPhase = (phase, expectedFullName, expectedErrorPart, consoleText = '') => {
  const issues = [...countsIssues(phase)]
  if (!Number.isFinite(phase.identity?.rows) || phase.identity.rows <= 0)
    issues.push('identity 执行集为空（vacuous）')
  for (const suite of phase.suites ?? [])
    if (suite.status === 'failed' && suite.assertionCount === 0)
      issues.push(`collection/runtime error suite: ${suite.name}`)
  const failedRows = phase.identity?.failedRows ?? []
  if (failedRows.length !== 1) {
    issues.push(`failed 行数 ${failedRows.length} ≠ 1`)
  } else if (failedRows[0].fullName !== expectedFullName) {
    issues.push(
      `唯一失败 fullName 不精确等于目标合同：got ${JSON.stringify(failedRows[0].fullName)}`,
    )
  }
  const red = failedRows[0]
  if (red) {
    const messages = red.messages ?? []
    if (messages.length === 0) issues.push('失败无 failureMessages')
    else if (!messages.some((m) => m.includes('AssertionError')))
      issues.push('指定失败非 AssertionError')
    else {
      const part = expectedErrorPart.replace(/["']/g, '')
      const hay = messages.join('\n').replace(/["']/g, '')
      if (!hay.includes(part)) issues.push(`失败消息不含指定片段 ${expectedErrorPart}`)
    }
    const consoleHay = consoleText.replace(/["']/g, '')
    if (!consoleHay.includes('AssertionError')) issues.push('console 原文无 AssertionError 旁证')
    else if (!consoleHay.includes(expectedErrorPart.replace(/["']/g, '')))
      issues.push('console 原文不含指定片段旁证')
  }
  return issues
}

const validateGreenPhase = (phase, baselineIdentitySha) => {
  const issues = []
  if (phase.exitCode !== 0) issues.push(`exit=${phase.exitCode} ≠ 0`)
  if (phase.signal !== null) issues.push(`signal=${phase.signal}`)
  if (phase.spawnError !== null) issues.push(`spawnError=${phase.spawnError}`)
  const c = phase.counts ?? {}
  if (c.numFailedTests !== 0) issues.push(`numFailedTests=${c.numFailedTests} ≠ 0`)
  if (c.numPendingTests !== 0) issues.push(`numPendingTests=${c.numPendingTests} ≠ 0`)
  if (c.numTodoTests !== 0) issues.push(`numTodoTests=${c.numTodoTests} ≠ 0`)
  if (phase.success !== true) issues.push('success≠true')
  if (phase.identity?.failedRows?.length) issues.push('identity 含 failed 行')
  for (const suite of phase.suites ?? [])
    if (suite.status === 'failed' || suite.assertionCount === 0)
      issues.push(`异常 suite: ${suite.name}(${suite.status}/${suite.assertionCount})`)
  if (phase.identity?.identitySha256 !== baselineIdentitySha)
    issues.push(
      `identity 集合与 baseline 不一致：${phase.identity?.identitySha256?.slice(0, 12)} ≠ ${baselineIdentitySha.slice(0, 12)}`,
    )
  return issues
}

// ── runner 自测：合成 phase 必须被同一判据正确拒收/放行 ──────────────────────────

const selfTest = () => {
  const targetFullName =
    'MHB-SAVE-FAIL-1 F5 缩略图外部 IO 失败：存档失败公开回执、savedTimes 不消费、写队列不毒化，重试成功得首号'
  const otherFullName = 'MHB-OTHER-1 其它合同'
  const baseIdentity = (failedRows) => ({
    rows: 8778,
    identitySha256: 'a'.repeat(64),
    failedRows,
  })
  const redRow = (fullName, messages) => ({ file: 'x.test.ts', fullName, messages })
  const baseCounts = (over = {}) => ({
    numFailedTests: 1,
    numPendingTests: 0,
    numTodoTests: 0,
    ...over,
  })
  const greenBase = {
    exitCode: 0,
    signal: null,
    spawnError: null,
    success: true,
    counts: baseCounts({ numFailedTests: 0 }),
    suites: [{ name: 'x.test.ts', status: 'passed', assertionCount: 3 }],
    identity: baseIdentity([]),
  }
  const okRed = {
    exitCode: 1,
    signal: null,
    spawnError: null,
    success: false,
    counts: baseCounts(),
    suites: [{ name: 'x.test.ts', status: 'failed', assertionCount: 6 }],
    identity: baseIdentity([
      redRow(targetFullName, ['AssertionError: expected null not to be null']),
    ]),
  }
  const cases = [
    {
      case: 'valid-red-accept',
      expect: 'accept',
      issues: validateRedPhase(
        okRed,
        targetFullName,
        'expected null not to be null',
        'AssertionError: expected null not to be null',
      ),
    },
    {
      case: 'two-failures-reject',
      expect: 'reject',
      issues: validateRedPhase(
        {
          ...okRed,
          counts: baseCounts({ numFailedTests: 2 }),
          identity: baseIdentity([
            redRow(targetFullName, ['AssertionError: expected null not to be null']),
            redRow(otherFullName, ['AssertionError: expected 1 to be 2']),
          ]),
        },
        targetFullName,
        'expected null not to be null',
        'AssertionError: expected null not to be null',
      ),
    },
    {
      case: 'wrong-fullname-reject',
      expect: 'reject',
      issues: validateRedPhase(
        {
          ...okRed,
          identity: baseIdentity([
            redRow(otherFullName, ['AssertionError: expected null not to be null']),
          ]),
        },
        targetFullName,
        'expected null not to be null',
        'AssertionError: expected null not to be null',
      ),
    },
    {
      case: 'exit-zero-reject',
      expect: 'reject',
      issues: validateRedPhase(
        { ...okRed, exitCode: 0, success: true },
        targetFullName,
        'expected null not to be null',
        'AssertionError: expected null not to be null',
      ),
    },
    {
      case: 'pending-reject',
      expect: 'reject',
      issues: validateRedPhase(
        { ...okRed, counts: baseCounts({ numPendingTests: 1 }) },
        targetFullName,
        'expected null not to be null',
        'AssertionError: expected null not to be null',
      ),
    },
    {
      case: 'collection-error-reject',
      expect: 'reject',
      issues: validateRedPhase(
        {
          ...okRed,
          suites: [
            { name: 'broken.test.ts', status: 'failed', assertionCount: 0 },
            { name: 'x.test.ts', status: 'passed', assertionCount: 3 },
          ],
        },
        targetFullName,
        'expected null not to be null',
        'AssertionError: expected null not to be null',
      ),
    },
    {
      case: 'non-assertion-error-reject',
      expect: 'reject',
      issues: validateRedPhase(
        {
          ...okRed,
          identity: baseIdentity([
            redRow(targetFullName, ['TypeError: cannot read props of undefined']),
          ]),
        },
        targetFullName,
        'expected null not to be null',
        'AssertionError: expected null not to be null',
      ),
    },
    {
      case: 'signal-failure-reject',
      expect: 'reject',
      issues: validateRedPhase(
        { ...okRed, signal: 'SIGKILL' },
        targetFullName,
        'expected null not to be null',
        'AssertionError: expected null not to be null',
      ),
    },
    {
      case: 'spawn-failure-reject',
      expect: 'reject',
      issues: validateRedPhase(
        { ...okRed, spawnError: 'spawn pnpm ENOENT' },
        targetFullName,
        'expected null not to be null',
        'AssertionError: expected null not to be null',
      ),
    },
    {
      case: 'green-identity-mismatch-reject',
      expect: 'reject',
      issues: validateGreenPhase(
        { ...greenBase, identity: { ...greenBase.identity, identitySha256: 'b'.repeat(64) } },
        'a'.repeat(64),
      ),
    },
    {
      case: 'valid-green-accept',
      expect: 'accept',
      issues: validateGreenPhase(greenBase, greenBase.identity.identitySha256),
    },
  ]
  return cases.map((c) => ({
    case: c.case,
    expect: c.expect,
    issueCount: c.issues.length,
    ok: c.expect === 'accept' ? c.issues.length === 0 : c.issues.length > 0,
    issues: c.issues,
  }))
}

// ── vitest 相位驱动 ────────────────────────────────────────────────────────────

const envSummary = () => ({
  nodeVersion: process.version,
  NODE_COMPILE_CACHE: 'deleted',
  cwd: pkgRoot,
})

const runVitest = (args) => {
  const env = { ...process.env }
  delete env.NODE_COMPILE_CACHE
  const argv = ['exec', 'vitest', 'run', ...args]
  const proc = spawnSync('pnpm', argv, {
    cwd: pkgRoot,
    encoding: 'buffer',
    maxBuffer: 512 * 1024 * 1024,
    env,
    timeout: 600_000,
  })
  return { argv, proc }
}

const writeRaw = async (file, text) => {
  const normalized = `${text.replace(/[\r\n \t]+$/, '')}\n`
  await writeFile(file, normalized)
  return {
    bytes: Buffer.byteLength(normalized, 'utf8'),
    sha256: sha256(Buffer.from(normalized, 'utf8')),
  }
}

const parseJson = (proc, label) => {
  let parsed
  try {
    parsed = JSON.parse(proc.stdout?.toString('utf8') ?? '')
  } catch {
    throw new Error(`[${label}] vitest json 输出不可解析`)
  }
  return parsed
}

const identityPhase = async (label, args, artifactName) => {
  const { argv, proc } = runVitest([...args, '--reporter=json'])
  const parsed = parseJson(proc, label)
  const rows = []
  const failedRows = []
  const suites = []
  for (const suite of parsed.testResults ?? []) {
    const assertionCount = (suite.assertionResults ?? []).length
    suites.push({ name: suite.name, status: suite.status, assertionCount })
    for (const tc of suite.assertionResults ?? []) {
      rows.push({ file: suite.name, fullName: tc.fullName, status: tc.status })
      if (tc.status === 'failed')
        failedRows.push({
          file: suite.name,
          fullName: tc.fullName,
          messages: tc.failureMessages ?? [],
        })
    }
  }
  if (!parsed.numTotalTests) throw new Error(`[${label}] vacuous 运行:零测试被收集/执行`)
  rows.sort((a, b) =>
    a.file < b.file ? -1 : a.file > b.file ? 1 : a.fullName < b.fullName ? -1 : 1,
  )
  const identityText = `${rows.map((r) => `${r.file}\t${r.fullName}\t${r.status}`).join('\n')}\n`
  const identityBytes = Buffer.from(identityText, 'utf8')
  const identitySha256 = sha256(identityBytes)
  const artifactPath = path.join(rawDir, artifactName)
  await writeFile(artifactPath, identityBytes)
  const counts = {
    numTotalTests: parsed.numTotalTests,
    numPassedTests: parsed.numPassedTests,
    numFailedTests: parsed.numFailedTests,
    numPendingTests: parsed.numPendingTests,
    numTodoTests: parsed.numTodoTests,
    numTotalTestSuites: parsed.numTotalTestSuites,
    numFailedTestSuites: parsed.numFailedTestSuites,
  }
  return {
    label,
    argv: ['pnpm', ...argv],
    env: envSummary(),
    exitCode: proc.status,
    signal: proc.signal,
    spawnError: proc.error ? String(proc.error.message) : null,
    success: parsed.success,
    counts,
    suites,
    identity: {
      rows: rows.length,
      identitySha256,
      failedRows,
      artifact: {
        path: path.relative(evidenceDir, artifactPath),
        format: 'tsv: file<TAB>fullName<TAB>status per row, sorted by (file, fullName)',
        bytes: identityBytes.length,
        sha256: identitySha256,
      },
    },
  }
}

const consolePhase = async (label, args) => {
  const { argv, proc } = runVitest(args)
  const text = `${proc.stdout?.toString('utf8') ?? ''}\n${proc.stderr?.toString('utf8') ?? ''}`
  const base = path.join(rawDir, label)
  const stat = await writeRaw(`${base}.console`, text)
  return {
    label,
    argv: ['pnpm', ...argv],
    exitCode: proc.status,
    signal: proc.signal,
    spawnError: proc.error ? String(proc.error.message) : null,
    artifacts: { console: { ...stat, path: path.relative(evidenceDir, `${base}.console`) } },
    text,
  }
}

function assertTreeClean(tag) {
  const out = execFileSync('git', ['status', '--porcelain'], { cwd: repoRoot, encoding: 'utf8' })
  const rows = out
    .split('\n')
    .filter((row) => row.trim().length > 3)
    .filter((row) => {
      const p = row.slice(3).split(' -> ')[0]
      return !ownNewPaths.some((own) => p === own || p.startsWith(`${own}/`))
    })
  if (rows.length) throw new Error(`[${tag}] 工作树非 clean: ${JSON.stringify(rows)}`)
}

let here = null
try {
  assertTreeClean('pre')
  const selfTestResults = selfTest()
  const selfTestAllOk = selfTestResults.every((c) => c.ok)
  if (!selfTestAllOk)
    throw new Error(
      `runner 自测未过: ${JSON.stringify(selfTestResults.filter((c) => !c.ok).map((c) => c.case))}`,
    )

  await rm(rawDir, { recursive: true, force: true })
  await mkdir(rawDir, { recursive: true })
  here = await mkdtemp(path.join(tmpdir(), 'mhb1-counterproof-'))

  const targetFile = 'packages/reforge/src/main.ts'
  const abs = path.join(repoRoot, targetFile)
  const original = await readFile(abs, 'utf8')
  const originalHash = sha256(Buffer.from(original, 'utf8'))

  const baseline = await identityPhase('baseline', [], 'baseline.identity.tsv')
  const baselineIssues = validateGreenPhase(baseline, baseline.identity.identitySha256)
  if (baselineIssues.length) throw new Error(`[baseline] 基线非绿: ${baselineIssues.join('; ')}`)

  const baselineTsv = await readFile(path.join(rawDir, 'baseline.identity.tsv'), 'utf8')
  const expectedFullNames = {}
  for (const injection of injections) {
    const matches = baselineTsv
      .split('\n')
      .filter((line) => line.split('\t')[1]?.includes(injection.expectedTest))
    if (matches.length !== 1)
      throw new Error(
        `[${injection.id}] 基线执行集中 ${injection.expectedTest} 匹配 ${matches.length} 条 ≠ 1`,
      )
    expectedFullNames[injection.id] = matches[0].split('\t')[1]
  }

  const receipts = []
  for (const injection of injections) {
    const lines = original.split('\n')
    const hits = lines.filter((line) => line.includes(injection.anchor))
    if (hits.length !== 1) throw new Error(`[${injection.id}] 锚点命中 ${hits.length} 行,拒绝注入`)
    const mutant = lines
      .map((line) => (line.includes(injection.anchor) ? injection.mutate(line) : line))
      .join('\n')
    if (mutant === original) throw new Error(`[${injection.id}] 变异未生效`)

    const mutantHash = sha256(Buffer.from(mutant, 'utf8'))
    let redJson = null
    let redConsole = null
    try {
      await writeFile(abs, mutant)
      redJson = await identityPhase(
        `${injection.id}.mutant`,
        [],
        `${injection.id}.mutant.identity.tsv`,
      )
      redConsole = await consolePhase(`${injection.id}.mutant`, [])
    } finally {
      await writeFile(abs, original)
    }
    const redIssues = validateRedPhase(
      redJson,
      expectedFullNames[injection.id],
      injection.expectedErrorPart,
      redConsole.text,
    )

    const restoredHash = sha256(Buffer.from(await readFile(abs, 'utf8'), 'utf8'))
    if (restoredHash !== originalHash) throw new Error(`[${injection.id}] 恢复字节与原始不一致`)
    const restored = await identityPhase(
      `${injection.id}.restored`,
      [],
      `${injection.id}.restored.identity.tsv`,
    )
    const restoredIssues = validateGreenPhase(restored, baseline.identity.identitySha256)

    const rebuiltHash = sha256(Buffer.from(await readFile(abs, 'utf8'), 'utf8'))
    if (rebuiltHash !== originalHash) throw new Error(`[${injection.id}] rebuilt hash 不一致`)

    receipts.push({
      id: injection.id,
      file: targetFile,
      anchor: injection.anchor,
      expectedTest: injection.expectedTest,
      expectedFullName: expectedFullNames[injection.id],
      expectedErrorPart: injection.expectedErrorPart,
      original: { hash: originalHash },
      mutant: {
        hash: mutantHash,
        phase: redJson,
        consolePhase: { ...redConsole, text: undefined },
        issues: redIssues,
      },
      restored: { sourceHash: restoredHash, phase: restored, issues: restoredIssues },
      rebuilt: { hash: rebuiltHash },
      pass: redIssues.length === 0 && restoredIssues.length === 0,
    })
    assertTreeClean(`post-${injection.id}`)
  }

  const finalReplay = await identityPhase('final-replay', [], 'final-replay.identity.tsv')
  const finalIssues = validateGreenPhase(finalReplay, baseline.identity.identitySha256)

  const allPass = receipts.every((r) => r.pass) && finalIssues.length === 0 && selfTestAllOk
  const receipt = {
    generatedAt: new Date().toISOString(),
    nodeVersion: process.version,
    executionSet: 'pnpm exec vitest run（cwd=packages/reforge，全量，无 -t 过滤，--reporter=json）',
    selfTest: { cases: selfTestResults, allOk: selfTestAllOk },
    baseline,
    injections: receipts,
    finalReplay: { phase: finalReplay, issues: finalIssues },
    allPass,
    ownNewPathsExcluded: ownNewPaths,
    tmpTree: { created: here, removedInFinally: true },
  }
  const outPath = path.join(evidenceDir, 'counterproof.json')
  await writeFile(outPath, `${JSON.stringify(receipt, null, 2)}\n`)
  if (!allPass)
    throw new Error(
      `反控存在未过项: ${JSON.stringify(
        receipts
          .filter((r) => !r.pass)
          .map((r) => ({ id: r.id, red: r.mutant.issues, restored: r.restored.issues }))
          .concat(finalIssues.length ? [{ id: 'final-replay', issues: finalIssues }] : []),
      )}`,
    )
  console.log(`mhb1 counterproof: ${receipts.length}/${receipts.length} PASS → ${outPath}`)
} finally {
  if (here) await rm(here, { recursive: true, force: true })
}
