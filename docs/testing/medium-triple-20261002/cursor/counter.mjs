#!/usr/bin/env node
/**
 * Cursor script-preview medium 反控取证（白名单 docs/testing/medium-triple-20261002/cursor/**）。
 *
 * 三态：positive → mutated（mkdtemp 隔离树单针）→ restored。
 * 可选 --grep 限定单例 fullName 前缀，保证恰一业务红；可选 --old 跑旧测证明 old-green/new-red。
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

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')

function buildPatch(original, mutated) {
  const tmp = mkdtempSync(join(tmpdir(), 'cursor-mid-patch-'))
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
    return text
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
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

function runVitest(tree, spec) {
  const bin = join(candidateRoot, 'node_modules', '.bin', 'vitest')
  const vitestArgs = ['run', spec, '--maxWorkers=1', '--reporter=json', '--reporter=default']
  if (grep) vitestArgs.push('-t', grep)
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

/** When --grep is set, drop skipped siblings so judge sees only the target leaf set. */
function focusJson(json) {
  if (!json || !grep) return json
  const testResults = (json.testResults ?? [])
    .map((fileResult) => {
      const assertionResults = (fileResult.assertionResults ?? []).filter(
        (leaf) => leaf.status === 'passed' || leaf.status === 'failed',
      )
      return { ...fileResult, assertionResults }
    })
    .filter((fileResult) => fileResult.assertionResults.length > 0)
  const numPassed = testResults.reduce(
    (sum, fileResult) =>
      sum + fileResult.assertionResults.filter((leaf) => leaf.status === 'passed').length,
    0,
  )
  const numFailed = testResults.reduce(
    (sum, fileResult) =>
      sum + fileResult.assertionResults.filter((leaf) => leaf.status === 'failed').length,
    0,
  )
  const numTotalTests = numPassed + numFailed
  return {
    ...json,
    testResults,
    numPassedTests: numPassed,
    numFailedTests: numFailed,
    numPendingTests: 0,
    numTodoTests: 0,
    numTotalTests,
    success: numFailed === 0,
  }
}

const collect = (run) => {
  const json = focusJson(run.json)
  if (!json) return { executed: null, failed: [], names: [] }
  const failed = []
  const names = []
  for (const fileResult of json.testResults ?? [])
    for (const leaf of fileResult.assertionResults ?? []) {
      names.push(leaf.fullName)
      if (leaf.status === 'failed')
        failed.push({
          fullName: leaf.fullName,
          message: leaf.failureMessages?.[0]?.split('\n')[0] ?? '',
          file: fileResult.name.replace(/^.*packages\/editor\//, ''),
        })
    }
  return { executed: names.length, failed, names, json }
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

  counterTree = mkdtempSync(join(tmpdir(), `cursor-mid-counter-${id}-`))
  execFileSync('git', ['worktree', 'add', '--detach', counterTree, 'HEAD'], {
    cwd: candidateRoot,
  })
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
    candidateHead: execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: candidateRoot,
      encoding: 'utf8',
    }).trim(),
    productSha256Candidate: sha256(readFileSync(join(candidateRoot, productFile))),
    patch,
  }

  const positive = runVitest(candidateRoot, testSpec)
  const positiveStats = collect(positive)
  const positiveJson = positiveStats.json
  const positiveJudge = judgeClean({
    exitCode: positive.exit,
    json: positiveJson,
    expectedExecuted: null,
    expectedIdentitySet: null,
    label: 'positive',
    spawnError: positive.spawnError,
    signal: positive.signal,
    rawOutput: positive.output,
  })
  if (!positiveJudge.valid) throw new Error(`positive invalid: ${positiveJudge.reasons.join(',')}`)
  writeFileSync(join(outDir, 'positive.json'), JSON.stringify(positiveJson, null, 2))
  writeFileSync(join(outDir, 'positive.raw.txt'), `${positive.output.replace(/\n+$/, '')}\n`)
  record.positive = {
    exitCode: positive.exit,
    executed: positiveStats.executed,
    executedFullNames: positiveStats.names,
    judge: positiveJudge,
  }

  writeFileSync(rel(productFile), mutated)
  record.productSha256MutatedTree = sha256(readFileSync(rel(productFile)))
  const mutatedRun = runVitest(counterTree, testSpec)
  const mutatedStats = collect(mutatedRun)
  const mutatedJson = mutatedStats.json
  writeFileSync(join(outDir, 'mutated.json'), JSON.stringify(mutatedJson, null, 2))
  writeFileSync(join(outDir, 'mutated.raw.txt'), `${mutatedRun.output.replace(/\n+$/, '')}\n`)
  // Focused single-leaf runs still surface vitest exit 1 when the target fails.
  const mutantJudge = judgeMutant({
    exitCode: mutatedRun.exit,
    json: mutatedJson,
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

  if (oldSpec) {
    const oldOnMutant = runVitest(counterTree, oldSpec)
    const oldStats = collect(oldOnMutant)
    writeFileSync(join(outDir, 'old-on-mutated.json'), JSON.stringify(oldOnMutant.json, null, 2))
    writeFileSync(
      join(outDir, 'old-on-mutated.raw.txt'),
      `${oldOnMutant.output.replace(/\n+$/, '')}\n`,
    )
    record.oldOnMutated = {
      exitCode: oldOnMutant.exit,
      executed: oldStats.executed,
      failed: oldStats.failed,
      oldGreenNewRed: oldOnMutant.exit === 0 && mutatedStats.failed.length === 1,
    }
    if (oldOnMutant.exit !== 0)
      throw new Error(`old suite not green on mutant: exit ${oldOnMutant.exit}`)
  }

  writeFileSync(rel(productFile), original)
  const restoredSha = sha256(readFileSync(rel(productFile)))
  if (restoredSha !== record.productSha256Candidate)
    throw new Error('restored file does not match candidate bytes')
  const restored = runVitest(counterTree, testSpec)
  const restoredStats = collect(restored)
  const restoredJson = restoredStats.json
  writeFileSync(join(outDir, 'restored.json'), JSON.stringify(restoredJson, null, 2))
  writeFileSync(join(outDir, 'restored.raw.txt'), `${restored.output.replace(/\n+$/, '')}\n`)
  const restoredJudge = judgeClean({
    exitCode: restored.exit,
    json: restoredJson,
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
      oldOnMutated: record.oldOnMutated ?? null,
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
