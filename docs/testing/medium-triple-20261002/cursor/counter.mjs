#!/usr/bin/env node
/**
 * Cursor script-preview medium 反控取证（白名单 docs/testing/medium-triple-20261002/cursor/**）。
 *
 * 三态：positive → mutated（隔离 worktree + symlink deps）→ restored。
 * 临时树精确登记；失败/异常/可捕获中断均走 finally 回收；禁止 process.exit 跳过 finally。
 * 不递归复制 node_modules；并发与磁盘上限见 counter-lifecycle.mjs。
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
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { judgeClean, judgeMutant, leavesOf } from './counter-judge.mjs'
import {
  cleanupAllOwned,
  cleanupExact,
  createCounterWorktree,
  linkNodeModules,
  listPrefixTempsInTmpdir,
  ownedPaths,
  registerOwned,
} from './counter-lifecycle.mjs'

const args = process.argv.slice(2)
function need(name) {
  const i = args.indexOf(`--${name}`)
  if (i < 0 || !args[i + 1]) throw new Error(`missing --${name}`)
  return args[i + 1]
}
function opt(name) {
  const i = args.indexOf(`--${name}`)
  if (i < 0 || !args[i + 1]) return null
  return args[i + 1]
}

const id = need('id')
const productFile = need('file')
const findText = need('find')
const replaceText = need('replace')
const testSpec = need('test')
const expectFullname = need('expect-fullname')
const outDir = resolve(need('out'))
const grep = opt('grep')
const oldSpec = opt('old')
const candidateRoot = process.cwd()
const declaredFullNames = [expectFullname]

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')

let exitCode = 0
let counterTree = null
let cleanupReport = null
/** Patch mkdtemps also registered for exact cleanup. */
const patchDirs = []

function buildPatch(original, mutated) {
  const tmp = mkdtempSync(join(tmpdir(), 'cursor-mid-patch-'))
  registerOwned(candidateRoot, tmp)
  patchDirs.push(tmp)
  let text = ''
  let buildError = null
  try {
    const aPath = join(tmp, 'a')
    const bPath = join(tmp, 'b')
    writeFileSync(aPath, original)
    writeFileSync(bPath, mutated)
    try {
      text = execFileSync(
        'diff',
        ['-u', '--label', `a/${productFile}`, '--label', `b/${productFile}`, aPath, bPath],
        { encoding: 'utf8' },
      )
    } catch (error) {
      text = error.stdout ?? ''
    }
    if (!text.trim()) buildError = new Error('empty patch')
  } finally {
    const report = cleanupExact(candidateRoot, tmp)
    const idx = patchDirs.indexOf(tmp)
    if (idx >= 0) patchDirs.splice(idx, 1)
    if (report.pathExistsAfter) buildError = new Error(`patch tmp residue: ${tmp}`)
  }
  if (buildError) throw buildError
  return text
}

function syncMid1Tests(fromRoot, toRoot) {
  const editorFrom = join(fromRoot, 'packages', 'editor', 'src')
  const editorTo = join(toRoot, 'packages', 'editor', 'src')
  const walk = (dir) => {
    if (!existsSync(dir)) return
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, name.name)
      if (name.isDirectory()) {
        if (name.name === 'node_modules') continue
        walk(p)
      } else if (/\.cursor-mid-1\.test\.(ts|tsx)$/.test(name.name)) {
        const relPath = p.slice(editorFrom.length + 1)
        const dest = join(editorTo, relPath)
        mkdirSync(dirname(dest), { recursive: true })
        cpSync(p, dest)
      }
    }
  }
  walk(editorFrom)
  const fixtureFrom = join(editorFrom, 'core', '__tests__', 'cursor-preview-mid-1')
  const fixtureTo = join(editorTo, 'core', '__tests__', 'cursor-preview-mid-1')
  if (existsSync(fixtureFrom)) {
    mkdirSync(dirname(fixtureTo), { recursive: true })
    cpSync(fixtureFrom, fixtureTo, { recursive: true })
  }
}

/** @param {string | null} namePattern null = 跑完整文件（旧测专用） */
function runVitest(tree, spec, namePattern) {
  const bin = join(candidateRoot, 'node_modules', '.bin', 'vitest')
  const vitestArgs = ['run', spec, '--maxWorkers=1', '--reporter=json', '--reporter=default']
  if (namePattern) vitestArgs.push('-t', namePattern)
  const result = spawnSync(bin, vitestArgs, {
    cwd: join(tree, 'packages', 'editor'),
    encoding: 'utf8',
    maxBuffer: 512 * 1024 * 1024,
    env: { ...process.env, NODE_COMPILE_CACHE: '' },
  })
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

const collect = (run, scopeNames) => {
  if (!run.json) return { executed: null, failed: [], names: [], scoped: [] }
  const all = leavesOf(run.json)
  const scoped = scopeNames
    ? all.filter((leaf) => scopeNames.includes(leaf.fullName))
    : all.filter((leaf) => leaf.status === 'passed' || leaf.status === 'failed')
  const failed = scoped
    .filter((leaf) => leaf.status === 'failed')
    .map((leaf) => ({
      fullName: leaf.fullName,
      message: leaf.message,
      file: leaf.file,
    }))
  return {
    executed: scoped.length,
    failed,
    names: scoped.map((leaf) => leaf.fullName),
    scoped,
  }
}

const testFileAbs = (tree) => join(tree, 'packages', 'editor', testSpec)

function finalizeCleanup(reason) {
  const reports = []
  if (counterTree) {
    cleanupReport = cleanupExact(candidateRoot, counterTree)
    reports.push(cleanupReport)
    counterTree = null
  }
  for (const patch of [...patchDirs]) {
    reports.push(cleanupExact(candidateRoot, patch))
  }
  patchDirs.length = 0
  if (ownedPaths().length) reports.push(...cleanupAllOwned(candidateRoot))
  const evidenceDir = join(
    candidateRoot,
    'docs/testing/medium-triple-20261002/cursor/cleanup-evidence',
  )
  mkdirSync(evidenceDir, { recursive: true })
  const evidence = {
    id,
    reason,
    at: new Date().toISOString(),
    reports,
    ownedAfter: ownedPaths(),
    prefixTempsInTmpdir: listPrefixTempsInTmpdir(),
    zeroResidue:
      ownedPaths().length === 0 &&
      reports.every((report) => !report.pathExistsAfter && !report.listedInGitWorktreeAfter),
  }
  writeFileSync(
    join(evidenceDir, `last-cleanup-${id}.json`),
    `${JSON.stringify(evidence, null, 2)}\n`,
  )
  return evidence
}

function onSignal(signal) {
  exitCode = signal === 'SIGINT' ? 130 : 143
  try {
    finalizeCleanup(`signal:${signal}`)
  } catch (error) {
    console.error(`[${id}] cleanup on ${signal} failed:`, error)
  }
  // After cleanup only — never skip finalizeCleanup via early process.exit in try body.
  process.exitCode = exitCode
  process.exit(exitCode)
}

process.on('SIGINT', () => onSignal('SIGINT'))
process.on('SIGTERM', () => onSignal('SIGTERM'))

try {
  if (!existsSync(join(candidateRoot, productFile)))
    throw new Error(`product file missing: ${productFile}`)
  const original = readFileSync(join(candidateRoot, productFile), 'utf8')
  const occurrences = original.split(findText).length - 1
  if (occurrences !== 1)
    throw new Error(`--find must match exactly once in ${productFile}, got ${occurrences}`)
  const mutated = original.replace(findText, replaceText)
  const patch = buildPatch(original, mutated)

  counterTree = createCounterWorktree(candidateRoot, id)
  const rel = (p) => join(counterTree, p)
  syncMid1Tests(candidateRoot, counterTree)
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
    grep,
    oldSpec,
    declaredFullNames,
    depsMode: 'symlink-node_modules',
    candidateHead: execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: candidateRoot,
      encoding: 'utf8',
    }).trim(),
    productSha256Candidate: sha256(readFileSync(join(candidateRoot, productFile))),
    testSha256Candidate: sha256(readFileSync(testFileAbs(candidateRoot))),
    patch,
  }

  const positive = runVitest(candidateRoot, testSpec, grep)
  const positiveStats = collect(positive, declaredFullNames)
  writeFileSync(join(outDir, 'positive.json'), JSON.stringify(positive.json, null, 2))
  writeFileSync(join(outDir, 'positive.raw.txt'), `${positive.output.replace(/\n+$/, '')}\n`)
  writeFileSync(
    join(outDir, 'positive.scope.json'),
    `${JSON.stringify({ declaredFullNames, executedFullNames: positiveStats.names }, null, 2)}\n`,
  )
  const positiveJudge = judgeClean({
    exitCode: positive.exit,
    json: positive.json,
    expectedExecuted: null,
    expectedIdentitySet: null,
    declaredFullNames,
    label: 'positive',
    spawnError: positive.spawnError,
    signal: positive.signal,
    rawOutput: positive.output,
  })
  if (!positiveJudge.valid) throw new Error(`positive invalid: ${positiveJudge.reasons.join(',')}`)
  record.positive = {
    exitCode: positive.exit,
    executed: positiveStats.executed,
    executedFullNames: positiveStats.names,
    productSha256: record.productSha256Candidate,
    testSha256: record.testSha256Candidate,
    judge: positiveJudge,
  }

  writeFileSync(rel(productFile), mutated)
  record.productSha256MutatedTree = sha256(readFileSync(rel(productFile)))
  record.testSha256MutatedTree = sha256(readFileSync(testFileAbs(counterTree)))
  const mutatedRun = runVitest(counterTree, testSpec, grep)
  const mutatedStats = collect(mutatedRun, declaredFullNames)
  writeFileSync(join(outDir, 'mutated.json'), JSON.stringify(mutatedRun.json, null, 2))
  writeFileSync(join(outDir, 'mutated.raw.txt'), `${mutatedRun.output.replace(/\n+$/, '')}\n`)
  writeFileSync(
    join(outDir, 'mutated.scope.json'),
    `${JSON.stringify({ declaredFullNames, executedFullNames: mutatedStats.names }, null, 2)}\n`,
  )
  const mutantJudge = judgeMutant({
    exitCode: mutatedRun.exit,
    json: mutatedRun.json,
    targetFile: testSpec,
    targetFullName: expectFullname,
    positiveExecuted: positiveStats.executed,
    expectedIdentitySet: positiveJudge.identitySet,
    declaredFullNames,
    spawnError: mutatedRun.spawnError,
    signal: mutatedRun.signal,
    rawOutput: mutatedRun.output,
  })
  record.mutated = {
    exitCode: mutatedRun.exit,
    executed: mutatedStats.executed,
    executedFullNames: mutatedStats.names,
    failed: mutatedStats.failed,
    productSha256: record.productSha256MutatedTree,
    testSha256: record.testSha256MutatedTree,
    judge: {
      valid: mutantJudge.valid,
      reasons: mutantJudge.reasons,
      identitySet: mutantJudge.identitySet,
    },
    target: mutantJudge.target,
  }
  if (!mutantJudge.valid) throw new Error(`mutated invalid: ${mutantJudge.reasons.join(',')}`)

  if (oldSpec) {
    const oldOnMutant = runVitest(counterTree, oldSpec, null)
    const oldStats = collect(oldOnMutant, null)
    writeFileSync(join(outDir, 'old-on-mutated.json'), JSON.stringify(oldOnMutant.json, null, 2))
    writeFileSync(
      join(outDir, 'old-on-mutated.raw.txt'),
      `${oldOnMutant.output.replace(/\n+$/, '')}\n`,
    )
    const oldJudge = judgeClean({
      exitCode: oldOnMutant.exit,
      json: oldOnMutant.json,
      expectedExecuted: null,
      expectedIdentitySet: null,
      declaredFullNames: null,
      label: 'old-on-mutated',
      spawnError: oldOnMutant.spawnError,
      signal: oldOnMutant.signal,
      rawOutput: oldOnMutant.output,
    })
    record.oldOnMutated = {
      exitCode: oldOnMutant.exit,
      executed: oldStats.executed,
      executedFullNames: oldStats.names,
      failed: oldStats.failed,
      judge: oldJudge,
      oldGreenNewRed:
        oldJudge.valid &&
        oldStats.executed > 0 &&
        mutatedStats.failed.length === 1 &&
        mutantJudge.valid,
    }
    if (!oldJudge.valid || oldStats.executed === 0)
      throw new Error(
        `old suite not green with non-zero execute: ${oldJudge.reasons.join(',') || `executed=${oldStats.executed}`}`,
      )
  }

  writeFileSync(rel(productFile), original)
  const restoredSha = sha256(readFileSync(rel(productFile)))
  if (restoredSha !== record.productSha256Candidate)
    throw new Error('restored product does not match candidate bytes')
  const restoredTestSha = sha256(readFileSync(testFileAbs(counterTree)))
  if (restoredTestSha !== record.testSha256Candidate)
    throw new Error('restored test file does not match candidate bytes')
  record.productSha256Restored = restoredSha
  record.testSha256Restored = restoredTestSha

  const restored = runVitest(counterTree, testSpec, grep)
  const restoredStats = collect(restored, declaredFullNames)
  writeFileSync(join(outDir, 'restored.json'), JSON.stringify(restored.json, null, 2))
  writeFileSync(join(outDir, 'restored.raw.txt'), `${restored.output.replace(/\n+$/, '')}\n`)
  writeFileSync(
    join(outDir, 'restored.scope.json'),
    `${JSON.stringify({ declaredFullNames, executedFullNames: restoredStats.names }, null, 2)}\n`,
  )
  const restoredJudge = judgeClean({
    exitCode: restored.exit,
    json: restored.json,
    expectedExecuted: mutatedStats.executed,
    expectedIdentitySet: positiveJudge.identitySet,
    declaredFullNames,
    label: 'restored',
    spawnError: restored.spawnError,
    signal: restored.signal,
    rawOutput: restored.output,
  })
  record.restored = {
    exitCode: restored.exit,
    executed: restoredStats.executed,
    executedFullNames: restoredStats.names,
    productSha256: record.productSha256Restored,
    testSha256: record.testSha256Restored,
    judge: restoredJudge,
  }
  if (!restoredJudge.valid) throw new Error(`restored invalid: ${restoredJudge.reasons.join(',')}`)

  writeFileSync(join(outDir, 'receipt.json'), JSON.stringify(record, null, 2))
  console.log(
    JSON.stringify({
      id,
      ok: true,
      positive: {
        exitCode: record.positive.exitCode,
        executed: record.positive.executed,
        productSha256: record.positive.productSha256,
        testSha256: record.positive.testSha256,
      },
      mutated: {
        exitCode: record.mutated.exitCode,
        target: record.mutated.target?.fullName,
        message: record.mutated.target?.message,
        productSha256: record.mutated.productSha256,
        testSha256: record.mutated.testSha256,
        judge: record.mutated.judge,
      },
      restored: {
        exitCode: record.restored.exitCode,
        executed: record.restored.executed,
        productSha256: record.restored.productSha256,
        testSha256: record.restored.testSha256,
      },
      oldOnMutated: record.oldOnMutated
        ? {
            executed: record.oldOnMutated.executed,
            oldGreenNewRed: record.oldOnMutated.oldGreenNewRed,
          }
        : null,
      outDir,
    }),
  )
} catch (error) {
  exitCode = 2
  console.error(`[${id}] ${error instanceof Error ? error.message : String(error)}`)
} finally {
  const evidence = finalizeCleanup(exitCode === 0 ? 'success' : 'failure')
  if (!evidence.zeroResidue) {
    exitCode = exitCode === 0 ? 3 : exitCode
    console.error(`[${id}] cleanup residue: ${JSON.stringify(evidence.ownedAfter)}`)
  }
}

process.exitCode = exitCode
