#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process'
/**
 * Wave-P 反控取证工具（白名单 docs/testing/glm-tenfold-triple/wave-P/tools/**）。
 *
 * 用法（在候选 worktree 根执行）：
 *   node docs/testing/glm-tenfold-triple/wave-P/tools/counter.mjs \
 *     --id P01-C01 --file packages/editor/src/core/project-io.ts \
 *     --find '<exact old line>' --replace '<exact mutated line>' \
 *     --test 'src/core/project-io.glm-p.test.ts' --out docs/testing/glm-tenfold-triple/wave-P/counters/P01-C01
 *
 * 三态：positive（候选树原样定向跑）→ mutated（隔离 git worktree 单针替换后定向跑）→
 * restored（同一隔离树还原后再跑）。全部从最终树/重跑产物取证：
 * - positive/mutated/restored 各自 exitCode、执行 fullName 计数、Vitest JSON、原始输出。
 * - mutated 树的产品源 SHA256、restored 后与候选树逐字节一致的复核 SHA256。
 * - 可重建变异 patch（unified diff）。
 *
 * 判定：mutated 必须 exit≠0 且 JSON 中恰有目标测试标题 failed，
 * failureMessages 首行匹配 AssertionError/^expect(；positive 与 restored 必须 exit=0。
 */
import { createHash } from 'node:crypto'
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const args = process.argv.slice(2)
function need(name) {
  const i = args.indexOf(`--${name}`)
  if (i < 0 || !args[i + 1]) throw new Error(`missing --${name}`)
  return args[i + 1]
}
const id = need('id')
const productFile = need('file')
const findText = need('find')
const replaceText = need('replace')
const testSpec = need('test')
const outDir = resolve(need('out'))
const candidateRoot = process.cwd()

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')
const _title = (s) => s
const die = (msg) => {
  console.error(`[${id}] ${msg}`)
  process.exit(2)
}

if (!existsSync(join(candidateRoot, productFile))) die(`product file missing: ${productFile}`)
const original = readFileSync(join(candidateRoot, productFile), 'utf8')
const occurrences = original.split(findText).length - 1
if (occurrences !== 1) die(`--find must match exactly once in ${productFile}, got ${occurrences}`)
const mutated = original.replace(findText, replaceText)
const patch = [
  `--- a/${productFile}`,
  `+++ b/${productFile}`,
  `@@ -1 +1 @@`,
  ...original.split('\n').map((line, index) => {
    const mutatedLine = mutated.split('\n')[index] ?? ''
    if (line !== mutatedLine) return `-${line}\n+${mutatedLine}`
    return ` ${line}`
  }),
].join('\n')

/** 隔离树：git worktree（共享对象库，独立检出）。node_modules 硬链接候选树。 */
const counterTree = `/tmp/glm-p-counter-${id}`
rmSync(counterTree, { recursive: true, force: true })
try {
  execFileSync('git', ['worktree', 'prune'], { cwd: candidateRoot })
} catch {}
execFileSync('git', ['worktree', 'add', '--detach', counterTree, 'HEAD'], { cwd: candidateRoot })
const rel = (p) => join(counterTree, p)
const linkNodeModules = (from, to) => {
  if (existsSync(from)) {
    rmSync(to, { recursive: true, force: true })
    cpSync(from, to, { recursive: true, verbatimSymlinks: true, dereference: false })
  }
}
// vitest/工具链与 workspace 依赖全部借用候选树的 node_modules（含 workspace 符号链接）。
linkNodeModules(join(candidateRoot, 'node_modules'), rel('node_modules'))
for (const pkg of ['editor', 'content', 'reforge', 'game', 'shared', 'pal-extract', 'migrate']) {
  const from = join(candidateRoot, 'packages', pkg, 'node_modules')
  if (existsSync(from)) linkNodeModules(from, join(counterTree, 'packages', pkg, 'node_modules'))
}

function cleanup() {
  try {
    execFileSync('git', ['worktree', 'remove', '--force', counterTree], { cwd: candidateRoot })
  } catch {
    rmSync(counterTree, { recursive: true, force: true })
    try {
      execFileSync('git', ['worktree', 'prune'], { cwd: candidateRoot })
    } catch {}
  }
}

/** 在指定树跑定向 vitest；返回 {exit, stdout, json}。 */
function runVitest(tree, extraArgs = []) {
  const bin = join(candidateRoot, 'node_modules', '.bin', 'vitest')
  const result = spawnSync(
    bin,
    ['run', testSpec, '--maxWorkers=1', '--reporter=json', '--reporter=default', ...extraArgs],
    {
      cwd: join(tree, 'packages', 'editor'),
      encoding: 'utf8',
      maxBuffer: 512 * 1024 * 1024,
      env: { ...process.env, NODE_COMPILE_CACHE: '' },
    },
  )
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`
  const start = output.lastIndexOf('{"numTotalTestSuites"')
  let json = null
  if (start >= 0) {
    // JSON 后还跟着 default reporter 文本：按括号配平截取完整 JSON 文档。
    let depth = 0
    let inString = false
    let escaped = false
    let end = -1
    for (let index = start; index < output.length; index++) {
      const char = output[index]
      if (inString) {
        if (escaped) escaped = false
        else if (char === '\\') escaped = true
        else if (char === '"') inString = false
        continue
      }
      if (char === '"') inString = true
      else if (char === '{') depth += 1
      else if (char === '}') {
        depth -= 1
        if (depth === 0) {
          end = index + 1
          break
        }
      }
    }
    if (end > 0) {
      try {
        json = JSON.parse(output.slice(start, end))
      } catch {
        json = null
      }
    }
  }
  if (result.error) {
    return {
      exit: -1,
      output: `${output}\nSPAWN-ERROR: ${result.error.message}`,
      json,
    }
  }
  return { exit: result.status ?? 0, output, json }
}

const collect = (run) => {
  if (!run.json) return { executed: null, failed: [], firstFailure: null }
  const failed = []
  let executed = 0
  // vitest JSON: testResults[] → assertionResults[] 叶子测试。
  for (const file of run.json.testResults ?? [])
    for (const leaf of file.assertionResults ?? []) {
      executed += 1
      if (leaf.status === 'failed')
        failed.push({
          fullName: leaf.fullName,
          message: leaf.failureMessages?.[0]?.split('\n')[0] ?? '',
        })
    }
  return { executed, failed, firstFailure: failed[0] ?? null }
}

mkdirSync(outDir, { recursive: true })
const record = {
  id,
  productFile,
  findText,
  replaceText,
  testSpec,
  candidateHead: execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: candidateRoot,
    encoding: 'utf8',
  }).trim(),
  productSha256Candidate: sha256(readFileSync(join(candidateRoot, productFile))),
  patch,
}

// ---- positive：候选树原样 ----
const positive = runVitest(candidateRoot)
const positiveStats = collect(positive)
if (positive.exit !== 0) die(`positive run must exit 0, got ${positive.exit}`)
writeFileSync(join(outDir, 'positive.json'), JSON.stringify(positive.json, null, 2))
writeFileSync(join(outDir, 'positive.raw.txt'), `${positive.output.replace(/\n+$/, '')}\n`)
record.positive = { exitCode: positive.exit, executed: positiveStats.executed }

// ---- mutated：隔离树单针替换 ----
writeFileSync(rel(productFile), mutated)
record.productSha256MutatedTree = sha256(readFileSync(rel(productFile)))
const mutatedRun = runVitest(counterTree)
const mutatedStats = collect(mutatedRun)
writeFileSync(join(outDir, 'mutated.json'), JSON.stringify(mutatedRun.json, null, 2))
writeFileSync(join(outDir, 'mutated.raw.txt'), `${mutatedRun.output.replace(/\n+$/, '')}\n`)
const first = mutatedStats.firstFailure
// vitest rejects 断言红的两种既定首行格式：AssertionError / Error: promise resolved…。
const assertionRed =
  first !== null && /^(AssertionError|expect\(|Error: promise resolved)/i.test(first.message)
record.mutated = {
  exitCode: mutatedRun.exit,
  executed: mutatedStats.executed,
  failed: mutatedStats.failed,
  targetAssertionRed: assertionRed,
}
const validMutant = mutatedRun.exit !== 0 && assertionRed && mutatedStats.failed.length >= 1
if (!validMutant)
  die(
    `mutated run invalid: exit=${mutatedRun.exit} assertionRed=${assertionRed} failed=${JSON.stringify(mutatedStats.failed)}`,
  )

// ---- restored：同树还原后必须回到绿 ----
writeFileSync(rel(productFile), original)
const restoredSha = sha256(readFileSync(rel(productFile)))
if (restoredSha !== record.productSha256Candidate)
  die('restored file does not match candidate bytes')
const restored = runVitest(counterTree)
writeFileSync(join(outDir, 'restored.json'), JSON.stringify(restored.json, null, 2))
writeFileSync(join(outDir, 'restored.raw.txt'), `${restored.output.replace(/\n+$/, '')}\n`)
record.restored = { exitCode: restored.exit, executed: collect(restored).executed }
if (restored.exit !== 0) die(`restored run must exit 0, got ${restored.exit}`)

cleanup()
writeFileSync(join(outDir, 'receipt.json'), JSON.stringify(record, null, 2))
console.log(
  JSON.stringify({
    id,
    ok: true,
    positive: record.positive,
    mutated: {
      exitCode: record.mutated.exitCode,
      target: first?.fullName,
      message: first?.message,
    },
    restored: record.restored,
    outDir,
  }),
)
