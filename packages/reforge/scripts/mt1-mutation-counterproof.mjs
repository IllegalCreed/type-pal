#!/usr/bin/env node
// TEST-GLM-REFORGE-MOTION-TRANSITION-1 — world-motion-runtime.ts 三针变异反控驱动。
//
// 与 rs1/hl1 判例一致的硬保证:
//   - 前置强制工作树 clean(排除:本卡测试/脚本/证据目录);
//   - 执行集 = reforge 全量套件(约 8767 测试),红相位全包恰一 failed;
//   - 唯一业务 AssertionError 按 file×fullName 前缀+消息片段指定匹配(拒收 pending/skip/额外错误);
//   - 不用 vitest -t 过滤,天然免疫 -t 零匹配 exit0 假绿;仍保留 numTotalTests vacuous 硬防;
//   - stdout/stderr 全量 raw 落盘(entry 只存路径+字节+sha256),EOF 纪律:剥尾随空白补恰一换行;
//   - 每针四态:original(基线绿)/mutant(指定红)/restored(字节恢复绿)/rebuilt(磁盘重读 hash);
//   - 进程内 mkdtemp 临时树 finally 全清(用 throw 不用 process.exit)。
//
// 干净 checkout 重建:node packages/reforge/scripts/mt1-mutation-counterproof.mjs(约 15 分钟)。
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

const runSuite = (args) => {
  const env = { ...process.env }
  delete env.NODE_COMPILE_CACHE // 判例口径:env -u NODE_COMPILE_CACHE
  // 判例口径(rs1):cwd=pkgRoot + 裸 pnpm exec。不得用 --filter 递归形态——红相位(exit≠0)
  // 时 pnpm 会把 ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL banner 追加进 stdout,污染 json 解析。
  return spawnSync('pnpm', ['exec', 'vitest', 'run', ...args], {
    cwd: pkgRoot,
    encoding: 'buffer',
    maxBuffer: 512 * 1024 * 1024,
    env,
  })
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

function parseIdentity(proc) {
  let parsed
  try {
    parsed = JSON.parse(proc.stdout.toString('utf8'))
  } catch {
    throw new Error('vitest json 输出不可解析')
  }
  const executed = []
  const failed = []
  const skipped = []
  const failDetails = []
  for (const suite of parsed.testResults ?? []) {
    for (const tc of suite.assertionResults ?? []) {
      const row = { file: suite.name, fullName: tc.fullName, status: tc.status }
      if (tc.status === 'passed') executed.push(row)
      else if (tc.status === 'failed') {
        failed.push(row)
        failDetails.push({
          file: suite.name,
          fullName: tc.fullName,
          messages: (tc.failureMessages ?? []).map((m) => m.split('\n').slice(0, 4).join(' | ')),
        })
      } else skipped.push(row)
    }
  }
  if (!parsed.numTotalTests) throw new Error('vacuous 运行:零测试被收集/执行')
  return {
    executed,
    failed,
    skipped,
    failDetails,
    numTotalTests: parsed.numTotalTests,
    success: parsed.success,
  }
}

let here = null
try {
  assertTreeClean('pre')
  await mkdir(rawDir, { recursive: true })
  here = await mkdtemp(path.join(tmpdir(), 'mt1-counterproof-'))
  const writeRaw = async (file, text) => {
    const normalized = `${text.replace(/[\r\n \t]+$/, '')}\n`
    await writeFile(file, normalized)
    return {
      bytes: Buffer.byteLength(normalized, 'utf8'),
      sha256: sha256(Buffer.from(normalized, 'utf8')),
    }
  }
  const stage = async (label, extraArgs) => {
    const base = path.join(rawDir, label)
    const proc = runSuite(extraArgs)
    const stat = await writeRaw(
      `${base}.console`,
      `${proc.stdout?.toString('utf8') ?? ''}\n${proc.stderr?.toString('utf8') ?? ''}`,
    )
    return { proc, stat, base }
  }
  const greenRun = async (label) => {
    const { proc, stat, base } = await stage(label, [])
    const text = (await readFile(`${base}.console`, 'utf8')).trim()
    const summary =
      text
        .split('\n')
        .filter((l) => /Tests\s+\d+/.test(l))
        .pop() ?? ''
    if (proc.status !== 0) throw new Error(`[${label}] 绿相位非绿(exit ${proc.status}): ${summary}`)
    if (!/passed/.test(summary) || /(failed|skipped)/.test(summary))
      throw new Error(`[${label}] 绿相位汇总异常: ${summary}`)
    return {
      exitCode: proc.status,
      summary,
      artifacts: { console: stat },
      consolePath: `${base}.console`,
    }
  }

  const targetFile = 'packages/reforge/src/world-motion-runtime.ts'
  const abs = path.join(repoRoot, targetFile)
  const original = await readFile(abs, 'utf8')
  const originalHash = sha256(Buffer.from(original, 'utf8'))

  // 基线绿(第一态):全量套件含本卡新测试文件。
  const baseline = await greenRun('baseline')

  const receipts = []
  for (const injection of injections) {
    const lines = original.split('\n')
    const hits = lines.filter((line) => line.includes(injection.anchor))
    if (hits.length !== 1) throw new Error(`[${injection.id}] 锚点命中 ${hits.length} 行,拒绝注入`)
    const mutant = lines
      .map((line) => (line.includes(injection.anchor) ? injection.mutate(line) : line))
      .join('\n')
    if (mutant === original) throw new Error(`[${injection.id}] 变异未生效`)

    // 第二态:指定业务红(json 精确分账 + console 原文取证),两个 run 串行(判例:反控批不并发)。
    // json run 的 stdout 只用于机器分账不落盘(全量 json 约 30MB);人读证据用默认 reporter 原文。
    // 红相位任何异常都在 finally 先字节恢复源文件,不留变异残留。
    const mutantHash = sha256(Buffer.from(mutant, 'utf8'))
    let redJsonRun = null
    let redConsoleRun = null
    let identity = null
    try {
      await writeFile(abs, mutant)
      redJsonRun = await stage(`${injection.id}.mutant-json`, ['--reporter=json'])
      redConsoleRun = await stage(`${injection.id}.mutant`, [])
      identity = parseIdentity(redJsonRun.proc)
      await rm(`${redJsonRun.base}.console`, { force: true })
    } finally {
      await writeFile(abs, original)
    }
    const consoleStat = redConsoleRun.stat
    const failures = identity.failDetails

    // 第三态:字节恢复绿。恢复态源文件 hash 一并入账(四态 hash 完整可复核)。
    await writeFile(abs, original)
    const restoredHash = sha256(Buffer.from(await readFile(abs, 'utf8'), 'utf8'))
    if (restoredHash !== originalHash) throw new Error(`[${injection.id}] 恢复字节与原始不一致`)
    const restored = await greenRun(`${injection.id}.restored`)

    // 第四态:磁盘重读 hash(恢复即当前源)。
    const rebuiltHash = sha256(Buffer.from(await readFile(abs, 'utf8'), 'utf8'))
    if (rebuiltHash !== originalHash) throw new Error(`[${injection.id}] rebuilt hash 不一致`)

    const issues = []
    if (identity.failed.length !== 1) issues.push(`红相位 failed=${identity.failed.length} ≠ 1`)
    if (identity.skipped.length !== 0) issues.push(`红相位 skipped=${identity.skipped.length} ≠ 0`)
    const red = identity.failed[0]
    if (!red?.fullName.includes(injection.expectedTest))
      issues.push(`唯一失败不是指定用例: ${red?.fullName ?? '无'}`)
    const expected = failures.find((f) => f.fullName.includes(injection.expectedTest))
    if (!expected) issues.push('失败集不含指定用例')
    else if (!expected.messages.some((m) => m.includes('AssertionError')))
      issues.push('指定失败非 AssertionError')
    else {
      const part = injection.expectedErrorPart.replace(/["']/g, '')
      const hay = failures
        .map((f) => f.messages.join('\n'))
        .join('\n')
        .replace(/["']/g, '')
      if (!hay.includes(part)) issues.push(`失败消息不含指定片段 ${injection.expectedErrorPart}`)
    }
    receipts.push({
      id: injection.id,
      file: targetFile,
      anchor: injection.anchor,
      expectedTest: injection.expectedTest,
      expectedErrorPart: injection.expectedErrorPart,
      original: { hash: originalHash, baseline },
      mutant: {
        hash: mutantHash,
        exitCode: redJsonRun.proc.status,
        numTotalTests: identity.numTotalTests,
        executedCount: identity.executed.length,
        failedCount: identity.failed.length,
        failed: failures,
        artifacts: { console: { ...consoleStat, path: `${redConsoleRun.base}.console` } },
      },
      restored: { ...restored, sourceHash: restoredHash },
      rebuilt: { hash: rebuiltHash },
      issues,
      pass: issues.length === 0,
    })
    assertTreeClean(`post-${injection.id}`)
  }

  const allPass = receipts.every((r) => r.pass)
  const receipt = {
    generatedAt: new Date().toISOString(),
    nodeVersion: process.version,
    executionSet: 'pnpm exec vitest run（cwd=packages/reforge，全量，无 -t 过滤）',
    baseline,
    injections: receipts,
    allPass,
    ownNewPathsExcluded: ownNewPaths,
    tmpTree: { created: here, removedInFinally: true },
  }
  const outPath = path.join(evidenceDir, 'counterproof.json')
  await writeFile(outPath, `${JSON.stringify(receipt, null, 2)}\n`)
  if (!allPass)
    throw new Error(
      `反控存在未过项: ${JSON.stringify(receipts.filter((r) => !r.pass).map((r) => ({ id: r.id, issues: r.issues })))}`,
    )
  console.log(`mt1 counterproof: ${receipts.length}/${receipts.length} PASS → ${outPath}`)
} finally {
  if (here) await rm(here, { recursive: true, force: true })
}
