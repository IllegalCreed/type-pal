#!/usr/bin/env node
/**
 * Wave-P 反控取证工具（白名单 docs/testing/glm-tenfold-triple/wave-P/tools/**）。
 *
 * 用法（在候选 worktree 根执行）：
 *   node docs/testing/glm-tenfold-triple/wave-P/tools/counter.mjs \
 *     --id P01-C01 --file packages/editor/src/core/project-io.ts \
 *     --find '<exact old line>' --replace '<exact mutated line>' \
 *     --test 'src/core/project-io.glm-p.test.ts' \
 *     --expect-fullname '<target fullName>' \
 *     --out docs/testing/glm-tenfold-triple/wave-P/counters/P01-C01
 *
 * 三态：positive（候选树原样）→ mutated（隔离树单针替换）→ restored（同树还原）。
 * r3.5 复核收紧：
 * - 所有失败路径 throw，外层 catch 设 exitCode；finally 覆盖建树/依赖复制/
 *   各拒收分支，只回收本次 mkdtemp 树（无全局 prune）。
 * - 三态过同一 judge；mutant 传入完整 positive 身份集合与 raw 输出
 *   （真实未处理异常/Vitest caught 区段），无效退出（负值/未知）拒收。
 */
import { execFileSync, spawnSync } from 'node:child_process'
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

// patch 先于建树生成（纯本地 diff + git apply 实测），失败直接 throw。
function buildPatch() {
  const original = readFileSync(join(candidateRoot, productFile), 'utf8')
  const occurrences = original.split(findText).length - 1
  if (occurrences !== 1)
    throw new Error(`--find must match exactly once in ${productFile}, got ${occurrences}`)
  const mutated = original.replace(findText, replaceText)
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
      { encoding: 'utf8' },
    )
  } catch (error) {
    text = error.stdout ?? ''
  }
  rmSync(tmp, { recursive: true, force: true })
  if (!text.trim()) throw new Error('empty patch')
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
  return { patch: text, original, mutated }
}

function runVitest(tree, testSpec) {
  const bin = join(candidateRoot, 'node_modules', '.bin', 'vitest')
  const result = spawnSync(
    bin,
    ['run', testSpec, '--maxWorkers=1', '--reporter=json', '--reporter=default'],
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
  if (result.error)
    return {
      exit: -1,
      signal: result.signal ?? null,
      spawnError: result.error.message,
      output: `${output}\nSPAWN-ERROR: ${result.error.message}`,
      json,
    }
  return {
    exit: result.status ?? -1,
    signal: result.signal ?? null,
    spawnError: null,
    output,
    json,
  }
}

const collect = (run) => {
  if (!run.json) return { executed: null, failed: [], names: [] }
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
  return { executed: names.length, failed, names }
}

function linkNodeModules(from, to) {
  if (existsSync(from)) {
    rmSync(to, { recursive: true, force: true })
    cpSync(from, to, { recursive: true, verbatimSymlinks: true, dereference: false })
  }
}

// ---- 主流程：一切失败 throw，finally 只回收本次资源，exitCode 在 catch 设定 ----
let record
let exitCode = 0
let counterTree

try {
  const { patch, original, mutated } = buildPatch()
  record = {
    id,
    productFile,
    findText,
    replaceText,
    testSpec,
    expectFullname,
    candidateHead: execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: candidateRoot,
      encoding: 'utf8',
    }).trim(),
    productSha256Candidate: sha256(readFileSync(join(candidateRoot, productFile))),
    patch,
  }

  // 建树 + 依赖复制都在 try 内（失败由 finally 回收并上抛）。
  counterTree = mkdtempSync(join(tmpdir(), `glm-p-counter-${id}-`))
  execFileSync('git', ['worktree', 'add', '--detach', counterTree, 'HEAD'], {
    cwd: candidateRoot,
  })
  const rel = (p) => join(counterTree, p)
  linkNodeModules(join(candidateRoot, 'node_modules'), rel('node_modules'))
  for (const pkg of ['editor', 'content', 'reforge', 'game', 'shared', 'pal-extract', 'migrate']) {
    const from = join(candidateRoot, 'packages', pkg, 'node_modules')
    if (existsSync(from)) linkNodeModules(from, join(counterTree, 'packages', pkg, 'node_modules'))
  }

  mkdirSync(outDir, { recursive: true })

  // ---- positive ----
  const positive = runVitest(candidateRoot, testSpec)
  const positiveStats = collect(positive)
  const positiveJudge = judgeClean({
    exitCode: positive.exit,
    json: positive.json,
    expectedExecuted: null,
    expectedIdentitySet: null,
    label: 'positive',
    spawnError: positive.spawnError,
    signal: positive.signal,
  })
  if (!positiveJudge.valid) throw new Error(`positive invalid: ${positiveJudge.reasons.join(',')}`)
  writeFileSync(join(outDir, 'positive.json'), JSON.stringify(positive.json, null, 2))
  writeFileSync(join(outDir, 'positive.raw.txt'), `${positive.output.replace(/\n+$/, '')}\n`)
  record.positive = {
    exitCode: positive.exit,
    executed: positiveStats.executed,
    executedFullNames: positiveStats.names,
    judge: positiveJudge,
  }

  // ---- mutated：完整 positive 身份集合与 raw 传入 judge ----
  writeFileSync(rel(productFile), mutated)
  record.productSha256MutatedTree = sha256(readFileSync(rel(productFile)))
  const mutatedRun = runVitest(counterTree, testSpec)
  const mutatedStats = collect(mutatedRun)
  writeFileSync(join(outDir, 'mutated.json'), JSON.stringify(mutatedRun.json, null, 2))
  writeFileSync(join(outDir, 'mutated.raw.txt'), `${mutatedRun.output.replace(/\n+$/, '')}\n`)
  const mutantJudge = judgeMutant({
    exitCode: mutatedRun.exit,
    json: mutatedRun.json,
    targetFile: testSpec,
    targetFullName: expectFullname,
    positiveExecuted: positiveStats.executed,
    expectedIdentitySet: positiveJudge.identitySet,
    rawOutput: mutatedRun.output,
    spawnError: mutatedRun.spawnError,
    signal: mutatedRun.signal,
  })
  record.mutated = {
    exitCode: mutatedRun.exit,
    executed: mutatedStats.executed,
    executedFullNames: mutatedStats.names,
    failed: mutatedStats.failed,
    judge: { valid: mutantJudge.valid, reasons: mutantJudge.reasons },
    target: mutantJudge.target,
  }
  if (!mutantJudge.valid) throw new Error(`mutated invalid: ${mutantJudge.reasons.join(',')}`)

  // ---- restored：同一 judgeClean（执行数=mutated、身份集=positive）----
  writeFileSync(rel(productFile), original)
  const restoredSha = sha256(readFileSync(rel(productFile)))
  if (restoredSha !== record.productSha256Candidate)
    throw new Error('restored file does not match candidate bytes')
  const restored = runVitest(counterTree, testSpec)
  const restoredStats = collect(restored)
  writeFileSync(join(outDir, 'restored.json'), JSON.stringify(restored.json, null, 2))
  writeFileSync(join(outDir, 'restored.raw.txt'), `${restored.output.replace(/\n+$/, '')}\n`)
  const restoredJudge = judgeClean({
    exitCode: restored.exit,
    json: restored.json,
    expectedExecuted: mutatedStats.executed,
    expectedIdentitySet: positiveJudge.identitySet,
    label: 'restored',
    spawnError: restored.spawnError,
    signal: restored.signal,
  })
  record.restored = {
    exitCode: restored.exit,
    executed: restoredStats.executed,
    executedFullNames: restoredStats.names,
    judge: restoredJudge,
  }
  if (!restoredJudge.valid) throw new Error(`restored invalid: ${restoredJudge.reasons.join(',')}`)
} catch (error) {
  exitCode = 2
  console.error(`[${id}] ${error?.message ?? error}`)
} finally {
  // 只回收本次 mkdtemp 树与其登记；无全局 prune、不动其他 Owner 数据。
  if (counterTree) {
    try {
      execFileSync('git', ['worktree', 'remove', '--force', counterTree], { cwd: candidateRoot })
    } catch {
      rmSync(counterTree, { recursive: true, force: true })
    }
  }
}

if (exitCode !== 0 || !record) process.exitCode = exitCode
else {
  writeFileSync(join(outDir, 'receipt.json'), JSON.stringify(record, null, 2))
  console.log(
    JSON.stringify({
      id,
      ok: true,
      positive: { exitCode: record.positive.exitCode, executed: record.positive.executed },
      mutated: {
        exitCode: record.mutated.exitCode,
        target: record.mutated.target?.fullName,
        message: record.mutated.target?.message,
        judge: record.mutated.judge,
      },
      restored: { exitCode: record.restored.exitCode, executed: record.restored.executed },
      outDir,
    }),
  )
}
