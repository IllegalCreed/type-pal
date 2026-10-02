#!/usr/bin/env node
/**
 * Cursor asset UI large 反控取证（白名单 docs/testing/grok-cursor-large/cursor/**）。
 *
 * 用法（在候选 worktree 根执行）：
 *   node docs/testing/grok-cursor-large/cursor/counter.mjs \
 *     --id P01-C01 --file packages/editor/src/core/project-io.ts \
 *     --find '<exact old line>' --replace '<exact mutated line>' \
 *     --test 'src/core/project-io.glm-p.test.ts' \
 *     --expect-fullname '<target fullName>' \
 *     --out docs/testing/grok-cursor-large/cursor/counters/C05-C01
 *
 * 三态：positive（候选树原样）→ mutated（隔离树单针替换）→ restored（同树还原）。
 * r3.5 / CURSOR-R1-02：
 * - 失败用 throw，外层 exitCode；建树/复制/三相全部纳入 try，finally 只清本次 mkdtemp。
 * - 禁止 process.exit 跳过 finally；禁止全局 prune。
 * - 三态都过同一 counter-judge：完整 file×fullName 身份、恰 exit 1、raw 未处理异常门。
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
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

function buildPatch(original, mutated) {
  const tmp = mkdtempSync(join(tmpdir(), 'cursor-patch-'))
  try {
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
    if (!text.trim()) throw new Error('empty patch')
    const verifyDir = mkdtempSync(join(tmpdir(), 'cursor-patchverify-'))
    try {
      const targetPath = join(verifyDir, productFile)
      mkdirSync(dirname(targetPath), { recursive: true })
      writeFileSync(targetPath, original)
      const apply = spawnSync('git', ['apply', '--unidiff-zero'], {
        input: text,
        cwd: verifyDir,
        encoding: 'utf8',
      })
      if (apply.status !== 0)
        throw new Error(`patch not applicable: ${apply.stderr ?? apply.stdout}`)
      const applied = readFileSync(targetPath, 'utf8')
      if (applied !== mutated) throw new Error('patch applied bytes differ from mutated content')
    } finally {
      rmSync(verifyDir, { recursive: true, force: true })
    }
    return text
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
}

/** 候选树里未提交的 .cursor-r1 测例不会进 worktree；从候选同步到隔离树。 */
function syncCursorR1Tests(fromRoot, toRoot) {
  const editorFrom = join(fromRoot, 'packages', 'editor', 'src')
  const editorTo = join(toRoot, 'packages', 'editor', 'src')
  const walk = (dir) => {
    if (!existsSync(dir)) return
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, name.name)
      if (name.isDirectory()) {
        if (name.name === 'node_modules') continue
        walk(p)
      } else if (/\.cursor-r1\.test\.(ts|tsx)$/.test(name.name)) {
        const relPath = p.slice(editorFrom.length + 1)
        const dest = join(editorTo, relPath)
        mkdirSync(dirname(dest), { recursive: true })
        cpSync(p, dest)
      }
    }
  }
  walk(editorFrom)
  const fixtureFrom = join(editorFrom, '__tests__', 'cursor-asset-r1')
  const fixtureTo = join(editorTo, '__tests__', 'cursor-asset-r1')
  if (existsSync(fixtureFrom)) {
    mkdirSync(dirname(fixtureTo), { recursive: true })
    cpSync(fixtureFrom, fixtureTo, { recursive: true })
  }
}

const linkNodeModules = (from, to) => {
  if (existsSync(from)) {
    rmSync(to, { recursive: true, force: true })
    cpSync(from, to, { recursive: true, verbatimSymlinks: true, dereference: false })
  }
}

function cleanup(counterTree) {
  if (!counterTree) return
  try {
    execFileSync('git', ['worktree', 'remove', '--force', counterTree], { cwd: candidateRoot })
  } catch {
    rmSync(counterTree, { recursive: true, force: true })
  }
}

function runVitest(tree) {
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

let exitCode = 0
let counterTree = null
try {
  if (!existsSync(join(candidateRoot, productFile)))
    throw new Error(`product file missing: ${productFile}`)
  const original = readFileSync(join(candidateRoot, productFile), 'utf8')
  const occurrences = original.split(findText).length - 1
  if (occurrences !== 1)
    throw new Error(`--find must match exactly once in ${productFile}, got ${occurrences}`)
  const mutated = original.replace(findText, replaceText)
  const patch = buildPatch(original, mutated)

  counterTree = mkdtempSync(join(tmpdir(), `cursor-counter-${id}-`))
  execFileSync('git', ['worktree', 'add', '--detach', counterTree, 'HEAD'], {
    cwd: candidateRoot,
  })
  const rel = (p) => join(counterTree, p)
  syncCursorR1Tests(candidateRoot, counterTree)
  linkNodeModules(join(candidateRoot, 'node_modules'), rel('node_modules'))
  for (const pkg of ['editor', 'content', 'reforge', 'game', 'shared', 'pal-extract', 'migrate']) {
    const from = join(candidateRoot, 'packages', pkg, 'node_modules')
    if (existsSync(from)) linkNodeModules(from, join(counterTree, 'packages', pkg, 'node_modules'))
  }

  mkdirSync(outDir, { recursive: true })
  const record = {
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

  const positive = runVitest(candidateRoot)
  const positiveStats = collect(positive)
  const positiveJudge = judgeClean({
    exitCode: positive.exit,
    json: positive.json,
    expectedExecuted: null,
    expectedIdentitySet: null,
    label: 'positive',
    spawnError: positive.spawnError,
    signal: positive.signal,
    rawOutput: positive.output,
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

  writeFileSync(rel(productFile), mutated)
  record.productSha256MutatedTree = sha256(readFileSync(rel(productFile)))
  const mutatedRun = runVitest(counterTree)
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
    spawnError: mutatedRun.spawnError,
    signal: mutatedRun.signal,
    rawOutput: mutatedRun.output,
  })
  record.mutated = {
    exitCode: mutatedRun.exit,
    executed: mutatedStats.executed,
    executedFullNames: mutatedStats.names,
    failed: mutatedStats.failed,
    judge: {
      valid: mutantJudge.valid,
      reasons: mutantJudge.reasons,
      identitySet: mutantJudge.identitySet,
    },
    target: mutantJudge.target,
  }
  if (!mutantJudge.valid) throw new Error(`mutated invalid: ${mutantJudge.reasons.join(',')}`)

  writeFileSync(rel(productFile), original)
  const restoredSha = sha256(readFileSync(rel(productFile)))
  if (restoredSha !== record.productSha256Candidate)
    throw new Error('restored file does not match candidate bytes')
  const restored = runVitest(counterTree)
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
    rawOutput: restored.output,
  })
  record.restored = {
    exitCode: restored.exit,
    executed: restoredStats.executed,
    executedFullNames: restoredStats.names,
    judge: restoredJudge,
  }
  if (!restoredJudge.valid) throw new Error(`restored invalid: ${restoredJudge.reasons.join(',')}`)

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
} catch (error) {
  exitCode = 2
  console.error(`[${id}] ${error instanceof Error ? error.message : String(error)}`)
} finally {
  cleanup(counterTree)
}

process.exit(exitCode)
