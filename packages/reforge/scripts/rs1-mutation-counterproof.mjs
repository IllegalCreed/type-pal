#!/usr/bin/env node
// TEST-GLM-REFORGE-RUNTIME-SESSION-1 — 三态变异反控驱动。
//
// 每个注入:原始绿 → 指定业务红(唯一 AssertionError) → 恢复绿,并额外重建(rebuilt)hash
// 证明恢复即当前源。硬保证(与 hl1 判例一致):
//   - 前置强制工作树 clean(排除:本驱动证据输出目录与 docs 证据目录);
//   - stdout/stderr 全量 raw 落盘(entry 只存路径),executedSet/skippedSet 分账;
//   - 唯一业务 AssertionError 按 file×fullName+message 指定匹配(拒收 pending/skip/额外错误);
//   - vitest -t 零匹配 exit0 的 vacuous 假绿硬防(执行集为空即 FAIL);
//   - 每运行独立 mkdtemp,进程内临时文件 finally 全清(用 throw 不用 process.exit)。
//
// 干净 checkout 重建:node scripts/rs1-mutation-counterproof.mjs(约 2 分钟)。
import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = path.resolve(pkgRoot, '..', '..')
const evidenceDir = path.join(pkgRoot, 'src', '__tests__', 'runtime-session-1')
const rawDir = path.join(evidenceDir, 'counterproof-raw')

const foreignDirty = []

// anchor 里的 ${...} 是被匹配源码的字面文本,不是模板插值;转义 \${ 让它按字面落入
// 模板串,既满足 useTemplate 又不触发 noTemplateCurlyInString。
const placeholder = (name) => `\${${name}}`

const injections = [
  {
    id: 'ROUTER-MENU-PREFILTER',
    file: 'packages/reforge/src/runtime-input-router.ts',
    anchor: 'else if (ports.menu.active()) ports.menu.input(pressed)',
    mutate: (line) =>
      line.replace(
        'ports.menu.input(pressed)',
        "ports.menu.input(new Set([...pressed].filter((k) => k !== 'Escape' && k !== 'F5' && k !== '[')))",
      ),
    testFile: 'src/runtime-input-router.runtime-session-1.test.ts',
    testName: '菜单层原样接收完整按键集合,路由器不预滤也不旁路派发任何键',
    expectedErrorPart: 'Escape',
  },
  {
    id: 'FRAME-FADE-REALTIME',
    file: 'packages/reforge/src/runtime-frame-session.ts',
    anchor: 'if (!stepping) ports.advanceFade(this.#now)',
    mutate: (line) =>
      line.replace(
        'if (!stepping) ports.advanceFade(this.#now)',
        'if (!stepping) ports.advanceFade(realNow)',
      ),
    testFile: 'src/runtime-frame-session.runtime-session-1.test.ts',
    testName: '暂停后恢复的淡入从 gameplay 时间推进,不采用墙钟时间',
    expectedErrorPart: '5100',
  },
  {
    id: 'MOTION-MOVE-ABORT-MSG',
    file: 'packages/reforge/src/world-motion-runtime.ts',
    anchor: `const abort = (): void => entry.cancel(\`实体 ${placeholder('id')} ${placeholder('source')} 走位所属 runner 已取消\`)`,
    mutate: (line) => line.replace('走位所属 runner 已取消`', '走位已中止`'),
    testFile: 'src/world-motion-runtime.runtime-session-1.test.ts',
    testName: '中止在途实体走位按来源署名拒绝并清空注册表',
    expectedErrorPart: '走位所属 runner 已取消',
  },
  {
    id: 'MOTION-TOKEN-SNAPSHOT',
    file: 'packages/reforge/src/world-motion-runtime.ts',
    anchor: 'sceneSessionId: this.currentSceneSessionId(input.sceneId),',
    mutate: (line) => line.replace('this.currentSceneSessionId(input.sceneId)', "'mutated-token'"),
    firstOnly: true,
    testFile: 'src/world-motion-runtime.runtime-session-1.test.ts',
    testName: 'scene token 在注册时快照,teardown 失效后旧槽保持旧 token 而新注册取新 token',
    expectedErrorPart: 'mutated-token',
  },
  {
    id: 'VIEW-HOSTILE-ONLOSE-KEEP',
    file: 'packages/reforge/src/runtime-project-view.ts',
    anchor: '? { ...structuredClone(entity.hostile), onLose: [] }',
    mutate: (line) =>
      line.replace('onLose: [] }', 'onLose: structuredClone(entity.hostile?.onLose) }'),
    testFile: 'src/runtime-project-view.runtime-session-1.test.ts',
    testName: '运行时视图剥离 hostile onLose 命令体,gameOver 与其余 hostile 字段逐字保留',
    expectedErrorPart: 'setFlag',
  },
]

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')
const runVitest = (testFile, testName, outFile, errFile) => {
  const proc = spawnSync(
    'pnpm',
    ['exec', 'vitest', 'run', testFile, ...(testName ? ['-t', testName] : []), '--reporter=json'],
    { cwd: pkgRoot, encoding: 'buffer', maxBuffer: 256 * 1024 * 1024 },
  )
  return { proc, outFile, errFile, stdout: proc.stdout, stderr: proc.stderr }
}
// 默认 reporter 的断言 diff 不进 json failureMessages;补一份 console 原文用于片段匹配与取证。
const runVitestConsole = (testFile, testName, outFile) => {
  const proc = spawnSync(
    'pnpm',
    ['exec', 'vitest', 'run', testFile, ...(testName ? ['-t', testName] : [])],
    { cwd: pkgRoot, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 },
  )
  return { text: `${proc.stdout ?? ''}\n${proc.stderr ?? ''}`, outFile }
}

function assertTreeClean(tag) {
  const out = execFileSync('git', ['status', '--porcelain'], { cwd: repoRoot, encoding: 'utf8' })
  // porcelain 行格式 'XY path':不 trim,固定 slice(3) 取路径(避免位移)。
  const rows = out
    .split('\n')
    .filter((row) => row.trim().length > 3)
    .filter((row) => {
      const p = row.slice(3).split(' -> ')[0]
      if (p.startsWith('packages/reforge/src/__tests__/runtime-session-1')) return false
      if (p.startsWith('docs/ops/evidence/TEST-GLM-REFORGE-RUNTIME-SESSION-1')) return false
      return !foreignDirty.includes(p)
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
  // executedSet = passed ∪ failed(真实执行);skippedSet = skipped/todo(未执行)。
  const executed = []
  const failed = []
  const skipped = []
  for (const suite of parsed.testResults ?? []) {
    for (const tc of suite.assertionResults ?? []) {
      const row = { file: suite.name, fullName: tc.fullName, status: tc.status }
      if (tc.status === 'passed') executed.push(row)
      else if (tc.status === 'failed') failed.push(row)
      else skipped.push(row)
    }
  }
  if (!parsed.numTotalTests) throw new Error('vacuous 运行:零测试被收集/执行')
  return { executed, failed, skipped, parsed }
}

let here = null
try {
  assertTreeClean('pre')
  await mkdir(rawDir, { recursive: true })
  here = await mkdtemp(path.join(tmpdir(), 'rs1-counterproof-'))
  const receipts = []
  for (const injection of injections) {
    const abs = path.join(repoRoot, injection.file)
    const original = await readFile(abs, 'utf8')
    const lines = original.split('\n')
    const hits = lines.filter((line) =>
      injection.anchor.split(' ').every((tok) => line.includes(tok)),
    )
    // firstOnly:同形语句多处出现时,只把首个匹配行计入变异(源内行序确定,可复现)。
    const allowed = injection.firstOnly ? Math.max(1, hits.length) : 1
    if (hits.length < 1 || hits.length > allowed)
      throw new Error(`[${injection.id}] 锚点命中 ${hits.length} 行,拒绝注入`)
    let mutatedOnce = false
    const mutant = lines
      .map((line) => {
        if (injection.firstOnly && mutatedOnce) return line
        const next = injection.mutate(line)
        if (next !== line) mutatedOnce = true
        return next
      })
      .join('\n')
    if (mutant === original) throw new Error(`[${injection.id}] 变异未生效`)
    const receipt = { id: injection.id, file: injection.file, anchor: injection.anchor }
    // raw 证据落盘统一 EOF 纪律:剥净尾随空白后补恰好一个换行(git diff --check 零告警,
    // 与 cov85/hl1 判例一致);bytes/sha256 按落盘字节记入回执。
    const writeRaw = async (file, text) => {
      const normalized = `${text.replace(/[\r\n \t]+$/, '')}\n`
      await writeFile(file, normalized)
      return {
        bytes: Buffer.byteLength(normalized, 'utf8'),
        sha256: sha256(Buffer.from(normalized, 'utf8')),
      }
    }
    const stage = async (label, source) => {
      await writeFile(abs, source)
      const base = path.join(rawDir, `${injection.id}.${label}`)
      const { proc, stdout, stderr } = runVitest(
        injection.testFile,
        injection.testName,
        `${base}.stdout`,
        `${base}.stderr`,
      )
      const stdoutStat = await writeRaw(`${base}.stdout`, stdout.toString('utf8'))
      const stderrStat = await writeRaw(`${base}.stderr`, stderr.toString('utf8'))
      const consoleRun = runVitestConsole(injection.testFile, injection.testName, `${base}.console`)
      const consoleStat = await writeRaw(consoleRun.outFile, consoleRun.text)
      const identity = parseIdentity(proc)
      return {
        exitCode: proc.status,
        signal: proc.signal,
        hash: sha256(Buffer.from(source, 'utf8')),
        executed: identity.executed,
        failed: identity.failed,
        skipped: identity.skipped,
        numTotalTests: identity.parsed.numTotalTests,
        stdoutPath: `${base}.stdout`,
        stderrPath: `${base}.stderr`,
        consolePath: consoleRun.outFile,
        consoleText: consoleRun.text,
        artifacts: { stdout: stdoutStat, stderr: stderrStat, console: consoleStat },
        raw: identity.parsed,
      }
    }
    const originalRun = await stage('original', original)
    const mutantRun = await stage('mutant', mutant)
    const restoredRun = await stage('restored', original)
    // 与磁盘当前源逐字节等价(重建证明)。
    await writeFile(abs, original)
    const rebuiltRun = await stage('rebuilt', await readFile(abs, 'utf8'))
    const failures = (mutantRun.raw.testResults ?? []).flatMap((suite) =>
      (suite.assertionResults ?? [])
        .filter((tc) => tc.status === 'failed')
        .map((tc) => ({
          file: suite.name,
          fullName: tc.fullName,
          messages: tc.failureMessages ?? [],
          messagePreview: (tc.failureMessages ?? []).map((m) =>
            m.split('\n').slice(0, 3).join(' | '),
          ),
        })),
    )
    const assertionFailures = failures.filter(
      (f) =>
        f.messages.some((m) => m.includes('AssertionError') || m.includes('__VITEST_')) ||
        f.messages.length === 0,
    )
    receipts.push({
      ...receipt,
      command: `pnpm exec vitest run ${injection.testFile} -t ${JSON.stringify(injection.testName)} --reporter=json`,
      cwd: pkgRoot,
      testFile: injection.testFile,
      expectedTest: injection.testName,
      expectedErrorPart: injection.expectedErrorPart,
      original: originalRun,
      mutant: mutantRun,
      restored: restoredRun,
      rebuilt: { hash: rebuiltRun.hash, executedCount: rebuiltRun.executed.length },
      failures,
      assertionFailures,
    })
    assertTreeClean(`post-${injection.id}`)
  }
  const verdicts = receipts.map((r) => {
    const issues = []
    if (r.original.exitCode !== 0) issues.push('原始非绿')
    if (r.mutant.exitCode === 0) issues.push('变异未红')
    if (r.restored.exitCode !== 0) issues.push('恢复非绿')
    if (!r.rebuilt.hash || r.rebuilt.hash !== r.restored.hash) issues.push('重建 hash 不一致')
    if (r.original.executed.length !== 1)
      issues.push(`原始执行数 ${r.original.executed.length} ≠ 1`)
    if (r.mutant.executed.length !== 0 || r.mutant.failed.length !== 1)
      issues.push(
        `变异执行分账异常: passed=${r.mutant.executed.length} failed=${r.mutant.failed.length}`,
      )
    const red = r.mutant.failed[0]
    if (!red) issues.push('指定用例未红(可能 vacuous,核对 executedSet)')
    const expectedFailure = r.failures.find((f) => f.fullName.includes(r.expectedTest.slice(0, 12)))
    if (!expectedFailure) issues.push('失败集不含指定用例')
    else if (!expectedFailure.messages.some((m) => m.includes('AssertionError')))
      issues.push('指定失败非 AssertionError')
    else {
      const part = r.expectedErrorPart.replace(/["']/g, '')
      const hay = `${r.mutant.consoleText ?? ''}\n${expectedFailure.messages.join('\n')}`.replace(
        /["']/g,
        '',
      )
      if (!hay.includes(part)) issues.push(`失败消息不含指定片段 ${r.expectedErrorPart}`)
    }
    return { id: r.id, issues, pass: issues.length === 0 }
  })
  const receipt = {
    generatedAt: new Date().toISOString(),
    nodeVersion: process.version,
    injections: receipts.map((r) => ({
      id: r.id,
      file: r.file,
      anchor: r.anchor,
      command: r.command,
      cwd: r.cwd,
      testFile: r.testFile,
      expectedTest: r.expectedTest,
      expectedErrorPart: r.expectedErrorPart,
      original: {
        exitCode: r.original.exitCode,
        hash: r.original.hash,
        executed: r.original.executed,
        skipped: r.original.skipped,
        artifacts: r.original.artifacts,
        stdoutPath: r.original.stdoutPath,
        stderrPath: r.original.stderrPath,
        consolePath: r.original.consolePath,
      },
      mutant: {
        exitCode: r.mutant.exitCode,
        signal: r.mutant.signal,
        hash: r.mutant.hash,
        executed: r.mutant.executed,
        failed: r.mutant.failed,
        skipped: r.mutant.skipped,
        artifacts: r.mutant.artifacts,
        stdoutPath: r.mutant.stdoutPath,
        stderrPath: r.mutant.stderrPath,
        failures: r.failures.map((f) => ({ ...f, messages: f.messagePreview })),
        consolePath: r.mutant.consolePath,
      },
      restored: {
        exitCode: r.restored.exitCode,
        hash: r.restored.hash,
        executed: r.restored.executed,
        skipped: r.restored.skipped,
        artifacts: r.restored.artifacts,
        stdoutPath: r.restored.stdoutPath,
        stderrPath: r.restored.stderrPath,
        consolePath: r.restored.consolePath,
      },
      rebuilt: r.rebuilt,
    })),
    verdicts,
    allPass: verdicts.every((v) => v.pass),
    foreignDirtyPathsExcluded: foreignDirty,
  }
  const outPath = path.join(evidenceDir, 'rs1-mutation-counterproof.json')
  await writeFile(outPath, `${JSON.stringify(receipt, null, 2)}\n`)
  if (!receipt.allPass)
    throw new Error(`反控存在未过项: ${JSON.stringify(verdicts.filter((v) => !v.pass))}`)
  console.log(`rs1 counterproof: ${receipts.length}/${receipts.length} PASS → ${outPath}`)
} finally {
  if (here) await rm(here, { recursive: true, force: true })
}
