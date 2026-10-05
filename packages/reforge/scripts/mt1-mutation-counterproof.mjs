#!/usr/bin/env node
// TEST-GLM-REFORGE-MOTION-TRANSITION-1 — world-motion-runtime.ts 三针变异反控驱动（r2）。
//
// r2 按 Codex 一审返工令重铸证据口径：
//   - 每个 phase（baseline / 每针 mutant / 每针 restored / final）以 vitest JSON reporter 解析
//     完整 file×fullName×status 执行集，排序后落盘 identity artifact（counterproof-raw/*.identity.tsv），
//     回执记录 artifact 路径/字节/文件 sha256 与集合 sha256（identitySha256）；不再只存计数。
//   - 红相位硬门：exitCode!==0、signal===null、spawnError===null、numFailedTests===1、
//     numPendingTests===0、numTodoTests===0、success===false、无空断言集的失败 suite
//     （collection/runtime error 形态）、identity 中 failed 行恰 1 且 fullName 与目标合同
//     **精确相等**、failureMessages 恰含指定 AssertionError 片段（console 原文作旁证）。
//   - 绿相位（baseline/restored/final）硬门：exit 0、signal/spawnError null、全 passed、
//     零 pending/todo、identitySha256 与 baseline **完全一致**（集合级比较，非计数）。
//   - 完整 argv/cwd/env 摘要、JSON/raw/exit/signal/spawnError、四态源 hash、mkdtemp finally。
//   - runner 自测（先于真针运行）：正例 + 多失败/错 fullName/exit0/pending/collection error/
//     非断言错误/signal/spawn 失败共 9 反例，全部必须被同一判据函数正确拒收/放行。
//
// 判例沿用：cwd=pkgRoot 裸 pnpm exec（--filter 递归形态红相位把 ERR_PNPM banner 追加进 stdout
// 污染 JSON）；运行期间不并发编辑任何 tracked 交付文件（clean 前置会拦截）。
//
// 干净 checkout 重建：node packages/reforge/scripts/mt1-mutation-counterproof.mjs（约 15 分钟）。
import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = path.resolve(pkgRoot, '..', '..')
const evidenceDir = path.join(repoRoot, 'docs/ops/evidence/TEST-GLM-REFORGE-MOTION-TRANSITION-1')
const rawDir = path.join(evidenceDir, 'counterproof-raw')

// 本卡交付改动(新文件 + 导航行/卡面回执/stamp 机械刷新等 tracked 编辑)不参与 clean 判定;
// 变异目标源文件必须在运行前 clean 且恢复后逐字节等于原始。运行期间不得再并发编辑这些文件。
const ownNewPaths = [
  'packages/reforge/src/world-motion-runtime.motion-transition-1.test.ts',
  'packages/reforge/scripts/mt1-mutation-counterproof.mjs',
  'docs/ops/evidence/TEST-GLM-REFORGE-MOTION-TRANSITION-1',
  'docs/ops/tasks/TEST-GLM-REFORGE-MOTION-TRANSITION-1.md',
  'docs/ops/evidence/README.md',
  'docs/phase-governance/reviews/20261004-semantic-current-batch.json',
]

const injections = [
  {
    id: 'MT-CADENCE-CLAMP',
    anchor: 'if (this.moveAccumulator > this.stepMs) this.moveAccumulator = 0',
    // 删除钳行本体:停顿帧的剩余 150ms 结转,下一帧 99ms 即提前成拍。
    mutate: (line) =>
      line.replace(
        'if (this.moveAccumulator > this.stepMs) this.moveAccumulator = 0',
        '/* mt1-mutant: backlog clamp removed */',
      ),
    expectedTest: 'MT-CADENCE-CLAMP-1',
    expectedErrorPart: 'expected true to be false',
  },
  {
    id: 'MT-PARTY-COMPLETE-STALE',
    anchor: 'if (this.partySlot === slot) this.partySlot.resolve()',
    // 去掉身份守卫:陈旧槽完成会兑现新等待者。
    mutate: (line) =>
      line.replace(
        'if (this.partySlot === slot) this.partySlot.resolve()',
        'this.partySlot?.resolve() /* mt1-mutant: identity guard removed */',
      ),
    expectedTest: 'MT-PARTY-COMPLETE-STALE-1',
    expectedErrorPart: 'expected true to be false',
  },
  {
    id: 'MT-PARTY-RESOLVE-RELEASE',
    anchor: 'resolvePartyMove(): void {',
    // 强停兑现收口被禁用:悬挂等待者保持 pending。
    mutate: (line) =>
      line.replace(
        'resolvePartyMove(): void {',
        'resolvePartyMove(): void { return /* mt1-mutant: graceful release disabled */',
      ),
    expectedTest: 'MT-PARTY-RESOLVE-RELEASE-1',
    expectedErrorPart: "to be 'fulfilled'",
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
  // collection/runtime error 形态：失败的 suite 没有任何断言行（收集/导入失败）。
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
    'TEST-GLM-REFORGE-MOTION-TRANSITION-1 world-motion-runtime 残余合同 > MT-CADENCE-CLAMP-1 真积压被钳掉：一帧至多一拍，丢弃的余数不得结转成下一帧的提前拍'
  const otherFullName =
    'TEST-GLM-REFORGE-MOTION-TRANSITION-1 world-motion-runtime 残余合同 > 其它合同'
  const baseIdentity = (failedRows) => ({
    rows: 8767,
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
    suites: [{ name: 'x.test.ts', status: 'failed', assertionCount: 3 }],
    identity: baseIdentity([
      redRow(targetFullName, ['AssertionError: expected true to be false // Object.is equality']),
    ]),
  }
  const cases = [
    {
      case: 'valid-red-accept',
      expect: 'accept',
      issues: validateRedPhase(
        okRed,
        targetFullName,
        'expected true to be false',
        'AssertionError: expected true to be false',
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
            redRow(targetFullName, ['AssertionError: expected true to be false']),
            redRow(otherFullName, ['AssertionError: expected 1 to be 2']),
          ]),
        },
        targetFullName,
        'expected true to be false',
        'AssertionError: expected true to be false',
      ),
    },
    {
      case: 'wrong-fullname-reject',
      expect: 'reject',
      issues: validateRedPhase(
        {
          ...okRed,
          identity: baseIdentity([
            redRow(otherFullName, ['AssertionError: expected true to be false']),
          ]),
        },
        targetFullName,
        'expected true to be false',
        'AssertionError: expected true to be false',
      ),
    },
    {
      case: 'exit-zero-reject',
      expect: 'reject',
      issues: validateRedPhase(
        { ...okRed, exitCode: 0, success: true },
        targetFullName,
        'expected true to be false',
        'AssertionError: expected true to be false',
      ),
    },
    {
      case: 'pending-reject',
      expect: 'reject',
      issues: validateRedPhase(
        { ...okRed, counts: baseCounts({ numPendingTests: 1 }) },
        targetFullName,
        'expected true to be false',
        'AssertionError: expected true to be false',
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
        'expected true to be false',
        'AssertionError: expected true to be false',
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
        'expected true to be false',
        'AssertionError: expected true to be false',
      ),
    },
    {
      case: 'signal-failure-reject',
      expect: 'reject',
      issues: validateRedPhase(
        { ...okRed, signal: 'SIGKILL' },
        targetFullName,
        'expected true to be false',
        'AssertionError: expected true to be false',
      ),
    },
    {
      case: 'spawn-failure-reject',
      expect: 'reject',
      issues: validateRedPhase(
        { ...okRed, spawnError: 'spawn pnpm ENOENT' },
        targetFullName,
        'expected true to be false',
        'AssertionError: expected true to be false',
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
  delete env.NODE_COMPILE_CACHE // 判例口径:env -u NODE_COMPILE_CACHE
  // 判例口径(rs1):cwd=pkgRoot + 裸 pnpm exec。不得用 --filter 递归形态——红相位(exit≠0)
  // 时 pnpm 会把 ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL banner 追加进 stdout,污染 json 解析。
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

// 以 JSON reporter 解析完整 file×fullName×status 执行集；排序后写 identity artifact。
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
  // identity artifact 用 TSV（file<TAB>fullName<TAB>status 每行一条，按 (file, fullName) 排序）：
  // 字节流即 identitySha256 的输入，可直接复核；且不进 biome 的 JSON 检查域（2.3MB 执行集
  // 会触发 files.maxSize 告警）。counts/suites/argv 摘要入回执，不入 artifact。
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

// 默认 reporter 人读原文（红相位 AssertionError 旁证）。
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

  // 重建 phase 全套 identity artifact：先清旧 raw，避免新旧口径混存。
  await rm(rawDir, { recursive: true, force: true })
  await mkdir(rawDir, { recursive: true })
  here = await mkdtemp(path.join(tmpdir(), 'mt1-counterproof-'))

  const targetFile = 'packages/reforge/src/world-motion-runtime.ts'
  const abs = path.join(repoRoot, targetFile)
  const original = await readFile(abs, 'utf8')
  const originalHash = sha256(Buffer.from(original, 'utf8'))

  // 基线绿（第一态）：全量套件完整执行集。
  const baseline = await identityPhase('baseline', [], 'baseline.identity.tsv')
  const baselineIssues = validateGreenPhase(baseline, baseline.identity.identitySha256)
  if (baselineIssues.length) throw new Error(`[baseline] 基线非绿: ${baselineIssues.join('; ')}`)

  // 目标合同精确 fullName 取自基线执行集（恰一匹配），红相位按全名精确相等判。
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

    // 第二态:指定业务红。红相位任何异常都在 finally 先字节恢复源文件,不留变异残留。
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

    // 第三态:字节恢复绿（完整执行集与 baseline 集合级一致）。
    const restoredHash = sha256(Buffer.from(await readFile(abs, 'utf8'), 'utf8'))
    if (restoredHash !== originalHash) throw new Error(`[${injection.id}] 恢复字节与原始不一致`)
    const restored = await identityPhase(
      `${injection.id}.restored`,
      [],
      `${injection.id}.restored.identity.tsv`,
    )
    const restoredIssues = validateGreenPhase(restored, baseline.identity.identitySha256)

    // 第四态:磁盘重读 hash(恢复即当前源)。
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

  // 末次全套重放:identity 集合与 baseline 完全一致。
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
  console.log(`mt1 counterproof: ${receipts.length}/${receipts.length} PASS → ${outPath}`)
} finally {
  if (here) await rm(here, { recursive: true, force: true })
}
