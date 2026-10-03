#!/usr/bin/env node
/**
 * 单轴反控。每枚独立 mkdtemp 复制 game 包，只改一处产品源，
 * 跑 original / mutant / restored。finally 只删本次临时树，之前不 process.exit。
 *
 * 拒收：零执行、pending/todo、多红、非 AssertionError、signal、
 * 退出码不是 0/1、以及「单断言红叠未处理异常」。
 */
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { identityMultiset, judgeMutant, judgeTriple } from './judge.mjs'
import { buildApplicablePatch } from './patch.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '../../../..')
const mainInstall = '/Users/zhangxu/illegal/type-pal'
const vitest = join(mainInstall, 'node_modules/vitest/vitest.mjs')
const evidenceRoot = join(here, 'counters')

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')
const read = (path) => readFileSync(path)
const text = (path) => readFileSync(path, 'utf8')

function copyTree(destination) {
  mkdirSync(join(destination, 'packages'), { recursive: true })
  const rsync = spawnSync(
    'rsync',
    [
      '-a',
      '--exclude',
      'node_modules',
      `${join(root, 'packages/game')}/`,
      `${join(destination, 'packages/game')}/`,
    ],
    { encoding: 'utf8' },
  )
  if (rsync.status !== 0) throw new Error(rsync.stderr || 'rsync failed')
  writeFileSync(join(destination, 'tsconfig.base.json'), read(join(root, 'tsconfig.base.json')))
  spawnSync('ln', ['-s', join(mainInstall, 'node_modules'), join(destination, 'node_modules')])
  spawnSync('ln', [
    '-s',
    join(mainInstall, 'packages/game/node_modules'),
    join(destination, 'packages/game/node_modules'),
  ])
}

function runVitest(tree, testFile, jsonPath) {
  const child = spawnSync(
    process.execPath,
    [vitest, 'run', testFile, '--reporter=verbose', '--reporter=json', `--outputFile=${jsonPath}`],
    {
      cwd: join(tree, 'packages/game'),
      encoding: 'utf8',
      env: { ...process.env, CI: '1', NO_COLOR: '1' },
    },
  )
  return {
    exitCode: child.status,
    signal: child.signal,
    stdout: child.stdout ?? '',
    stderr: child.stderr ?? '',
  }
}

function writeRun(dir, label, run, report) {
  writeFileSync(join(dir, `${label}.json`), `${JSON.stringify(report, null, 2)}\n`)
  writeFileSync(join(dir, `${label}.stdout`), run.stdout)
  writeFileSync(join(dir, `${label}.stderr`), run.stderr)
}

function loadReport(path) {
  return JSON.parse(text(path))
}

function runNeedle(needle) {
  const tree = mkdtempSync(join(tmpdir(), `grok-r1-${needle.id}-`))
  const dir = join(evidenceRoot, needle.id)
  mkdirSync(dir, { recursive: true })
  try {
    copyTree(tree)
    const sourcePath = join(tree, needle.source)
    const original = read(sourcePath)
    const originalSha = sha256(original)
    const sourceText = original.toString('utf8')
    if (!needle.targetFullName) throw new Error(`${needle.id} missing targetFullName`)
    const built = buildApplicablePatch(sourceText, needle.from, needle.to, needle.source)
    const json = (label) => join(tree, `${label}.json`)
    const originalRun = runVitest(tree, needle.testFile, json('original'))
    const originalReport = loadReport(json('original'))
    writeFileSync(sourcePath, built.mutantText)
    const mutantSha = sha256(read(sourcePath))
    const patchText = built.patch
    const mutantRun = runVitest(tree, needle.testFile, json('mutant'))
    const mutantReport = loadReport(json('mutant'))
    writeFileSync(sourcePath, original)
    const restoredSha = sha256(read(sourcePath))
    const restoredRun = runVitest(tree, needle.testFile, json('restored'))
    const restoredReport = loadReport(json('restored'))
    writeRun(dir, 'original', originalRun, originalReport)
    writeRun(dir, 'mutant', mutantRun, mutantReport)
    writeRun(dir, 'restored', restoredRun, restoredReport)
    writeFileSync(join(dir, 'patch.diff'), patchText)
    const judgement = judgeTriple(
      {
        original: { report: originalReport, run: originalRun },
        mutant: { report: mutantReport, run: mutantRun },
        restored: { report: restoredReport, run: restoredRun },
      },
      { file: needle.testFile, fullName: needle.targetFullName },
      { tempRoot: tree },
    )
    const reasons = [...judgement.reasons]
    if (originalSha !== restoredSha) reasons.push('restored bytes differ')
    if (originalSha === mutantSha) reasons.push('mutation did not change bytes')
    const accepted = reasons.length === 0
    const assertion = judgement.assertion
    const meta = {
      id: needle.id,
      batch: needle.batch,
      axis: needle.axis,
      source: needle.source,
      testFile: needle.testFile,
      target: needle.target,
      accepted,
      reasons,
      sha256: { original: originalSha, mutant: mutantSha, restored: restoredSha },
      exitCode: {
        original: originalRun.exitCode,
        mutant: mutantRun.exitCode,
        restored: restoredRun.exitCode,
      },
      signal: {
        original: originalRun.signal,
        mutant: mutantRun.signal,
        restored: restoredRun.signal,
      },
      counts: {
        original: originalReport.numTotalTests,
        mutantFailed: mutantReport.numFailedTests,
        restored: restoredReport.numTotalTests,
      },
      assertionError: assertion ? (assertion.failureMessages ?? []).join('\n') : '',
      fullName: assertion?.fullName ?? '',
      names: identityMultiset(originalReport, tree).length,
    }
    writeFileSync(join(dir, 'meta.json'), `${JSON.stringify(meta, null, 2)}\n`)
    return meta
  } finally {
    rmSync(tree, { recursive: true, force: true })
  }
}

function runProbe() {
  const tree = mkdtempSync(join(tmpdir(), 'grok-r1-probe-'))
  const dir = join(evidenceRoot, 'probe-reject')
  mkdirSync(dir, { recursive: true })
  try {
    copyTree(tree)
    const probeFile = join(tree, 'packages/game/src/probe-unhandled.grok-r1.test.ts')
    writeFileSync(
      probeFile,
      [
        "import { expect, test } from 'vitest'",
        '',
        "test('probe single red plus unhandled', async () => {",
        '  setTimeout(() => {',
        "    throw new Error('probe-unhandled-exception')",
        '  }, 15)',
        '  await new Promise((resolve) => setTimeout(resolve, 40))',
        '  expect(1).toBe(2)',
        '})',
        '',
      ].join('\n'),
    )
    const jsonPath = join(tree, 'probe.json')
    const run = runVitest(tree, 'src/probe-unhandled.grok-r1.test.ts', jsonPath)
    const report = loadReport(jsonPath)
    writeRun(dir, 'probe', run, report)
    const judgement = judgeMutant(
      report,
      run,
      {
        file: 'src/probe-unhandled.grok-r1.test.ts',
        fullName: 'probe single red plus unhandled',
      },
      { tempRoot: tree },
    )
    const rejected = judgement.reasons.some((reason) => reason.includes('unhandled'))
    const meta = {
      id: 'probe-reject',
      purpose: '真实 Vitest：单断言失败叠未处理异常必须被 judge 拒收',
      rejected,
      reasons: judgement.reasons,
      exitCode: run.exitCode,
      signal: run.signal,
    }
    writeFileSync(join(dir, 'meta.json'), `${JSON.stringify(meta, null, 2)}\n`)
    if (!rejected) throw new Error(`probe was not rejected: ${judgement.reasons.join('; ')}`)
    return meta
  } finally {
    rmSync(tree, { recursive: true, force: true })
  }
}

function selectedNeedles() {
  const all = JSON.parse(text(join(here, 'needles.json')))
  const only = process.argv.find((arg) => arg.startsWith('--only='))
  if (!only) return all
  const ids = new Set(only.slice('--only='.length).split(','))
  return all.filter((needle) => ids.has(needle.id))
}

function main() {
  const summaries = []
  let failed = false
  try {
    if (!process.argv.includes('--skip-probe')) summaries.push(runProbe())
    for (const needle of selectedNeedles()) {
      const meta = runNeedle(needle)
      summaries.push({ id: meta.id, accepted: meta.accepted, reasons: meta.reasons })
      if (!meta.accepted) failed = true
    }
    if (existsSync(join(evidenceRoot, 'index.json'))) {
      const previous = JSON.parse(text(join(evidenceRoot, 'index.json')))
      for (const item of previous) {
        if (!summaries.some((summary) => summary.id === item.id)) summaries.push(item)
      }
    }
    writeFileSync(join(evidenceRoot, 'index.json'), `${JSON.stringify(summaries, null, 2)}\n`)
  } catch (error) {
    console.error(error)
    failed = true
  }
  if (failed) process.exitCode = 1
  else console.log(JSON.stringify(summaries, null, 2))
}

const invoked = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (invoked) main()
