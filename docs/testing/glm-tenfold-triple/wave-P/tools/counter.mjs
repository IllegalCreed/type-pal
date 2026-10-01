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
 * 判定（r2 P-R2-01 严格化，judge 实现在 counter-judge.mjs，自测 counter-judge.test.mjs）：
 * mutated 恰一 failed 且 file/fullName 逐字等于 --test/--expect-fullname 登记目标；
 * 拒收零红/多红/错目标/skipped/collection/超时/未处理异常/执行集漂移；
 * positive 与 restored exit=0、零失败、执行 fullName 集与 mutated 一致。
 * patch 由 diff -u 生成真实可应用 unified diff，并以 git apply --check 复核。
 */
import { createHash } from 'node:crypto'
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { judgeClean, judgeMutant } from './counter-judge.mjs'

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
const expectFullname = need('expect-fullname')
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
// 真实可应用 unified diff：临时目录内 diff -u，前缀改写为 a/ b/，git apply --check 复核。
function buildPatch() {
  const tmp = mkdtempSync(join(tmpdir(), 'glm-p-patch-'))
  const aPath = join(tmp, 'a')
  const bPath = join(tmp, 'b')
  writeFileSync(aPath, original)
  writeFileSync(bPath, mutated)
  let text
  try {
    text = execFileSync(
      'diff',
      ['-u', '--label', `a/${productFile}`, '--label', `b/${productFile}`, aPath, bPath],
      {
        encoding: 'utf8',
      },
    )
  } catch (error) {
    // diff -u 在文件不同时退出码为 1，输出即 patch。
    text = error.stdout ?? ''
  }
  rmSync(tmp, { recursive: true, force: true })
  if (!text.trim()) throw new Error('empty patch')
  // git apply 实测：-p1 去掉 a/ 前缀 → 临时目录按完整相对路径放原文件，
  // 应用后必须逐字节等于变异内容（可应用且可重建双重证明）。
  const verifyDir = mkdtempSync(join(tmpdir(), 'glm-p-patchverify-'))
  const targetPath = join(verifyDir, productFile)
  mkdirSync(dirname(targetPath), { recursive: true })
  writeFileSync(targetPath, original)
  const apply = spawnSync('git', ['apply', '--unidiff-zero'], {
    input: text,
    cwd: verifyDir,
    encoding: 'utf8',
  })
  if (apply.status !== 0) {
    rmSync(verifyDir, { recursive: true, force: true })
    throw new Error(`patch not applicable: ${apply.stderr ?? apply.stdout}`)
  }
  const applied = readFileSync(targetPath, 'utf8')
  rmSync(verifyDir, { recursive: true, force: true })
  if (applied !== mutated) throw new Error('patch applied bytes differ from mutated content')
  return text
}
const patch = buildPatch()

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
  if (!run.json) return { executed: null, failed: [], firstFailure: null, names: [] }
  const failed = []
  const names = []
  for (const fileResult of run.json.testResults ?? [])
    for (const leaf of fileResult.assertionResults ?? []) {
      names.push(leaf.fullName)
      if (leaf.status === 'failed')
        failed.push({
          fullName: leaf.fullName,
          message: leaf.failureMessages?.[0]?.split('\n')[0] ?? '',
          file: fileResult.name.replace(/^.*packages\/editor\//, ''),
        })
    }
  return { executed: names.length, failed, firstFailure: failed[0] ?? null, names }
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

// ---- positive：候选树原样（judge 清洁相）----
const positive = runVitest(candidateRoot)
const positiveStats = collect(positive)
const positiveJudge = judgeClean({
  exitCode: positive.exit,
  json: positive.json,
  expectedExecuted: null,
  label: 'positive',
})
if (!positiveJudge.valid) die(`positive invalid: ${positiveJudge.reasons.join(',')}`)
writeFileSync(join(outDir, 'positive.json'), JSON.stringify(positive.json, null, 2))
writeFileSync(join(outDir, 'positive.raw.txt'), `${positive.output.replace(/\n+$/, '')}\n`)
record.positive = {
  exitCode: positive.exit,
  executed: positiveStats.executed,
  executedFullNames: positiveStats.names,
  judge: positiveJudge,
}

// ---- mutated：隔离树单针替换 ----
writeFileSync(rel(productFile), mutated)
record.productSha256MutatedTree = sha256(readFileSync(rel(productFile)))
const mutatedRun = runVitest(counterTree)
const mutatedStats = collect(mutatedRun)
writeFileSync(join(outDir, 'mutated.json'), JSON.stringify(mutatedRun.json, null, 2))
writeFileSync(join(outDir, 'mutated.raw.txt'), `${mutatedRun.output.replace(/\n+$/, '')}\n`)
// 严格单目标 judge（counter-judge.mjs）：恰一红、file/fullName 逐字匹配、
// 拒收 skipped/collection/超时/环境红/执行集漂移。不过滤邻居。
const mutantJudge = judgeMutant({
  exitCode: mutatedRun.exit,
  json: mutatedRun.json,
  targetFile: testSpec.replace(/^src\//, 'src/'),
  targetFullName: expectFullname,
  positiveExecuted: positiveStats.executed,
})
record.mutated = {
  exitCode: mutatedRun.exit,
  executed: mutatedStats.executed,
  executedFullNames: mutatedStats.names,
  failed: mutatedStats.failed,
  judge: { valid: mutantJudge.valid, reasons: mutantJudge.reasons },
  target: mutantJudge.target,
}
if (!mutantJudge.valid) die(`mutated invalid: ${mutantJudge.reasons.join(',')}`)

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
      target: record.mutated.target?.fullName,
      message: record.mutated.target?.message,
    },
    restored: record.restored,
    outDir,
  }),
)
