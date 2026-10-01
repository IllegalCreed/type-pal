#!/usr/bin/env node
/** Wave O 反控 runner（rework 版）：在一次性 detached worktree 副本树注入单轴变异，
 *  执行完整三态——control（候选全绿）→ injected（恰一目标业务 AssertionError 红）→
 *  restored（恢复原源后重跑全绿）；patch 以零上下文 unified diff 交付并做
 *  「checkout → apply --unidiff-zero → hash 等于 mutatedSha」重建自校验。
 *  候选树永不被改。用法：node run-counter.mjs <spec.json> [evidenceDir]
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'

const repoRoot = resolve(resolve(import.meta.dirname), '../../../..')
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')
let ownerPackage = 'migrate'
const git = (args, cwd = repoRoot, options = {}) =>
  execFileSync('git', args, { cwd, encoding: 'utf8', ...options })

function runVitest(worktree, testFile, outputFile, rawFile) {
  const result = spawnSync(
    'pnpm',
    [
      '--filter',
      `@type-pal/${ownerPackage}`,
      'exec',
      'vitest',
      'run',
      testFile,
      ...(ownerPackage === 'migrate' ? ['--project', 'unit'] : []),
      '--reporter=json',
      `--outputFile=${outputFile}`,
    ],
    { cwd: worktree, encoding: 'utf8', env: { ...process.env, NODE_COMPILE_CACHE: '' } },
  )
  if (rawFile) writeFileSync(rawFile, result.stdout ?? '')
  let json
  try {
    json = JSON.parse(readFileSync(outputFile, 'utf8'))
  } catch (error) {
    throw new Error(`vitest JSON 不可读: ${String(error)}\nstdout:${result.stdout?.slice(0, 2000)}`)
  }
  return { exitCode: result.status, json, stdout: result.stdout ?? '' }
}

const flatten = (results) =>
  results.flatMap((file) =>
    (file.assertionResults ?? []).map((entry) => ({
      fullName: entry.fullName,
      status: entry.status,
      failureMessages: entry.failureMessages ?? [],
    })),
  )

const phaseSummary = (run) => {
  const tests = flatten(run.json.testResults)
  return {
    exitCode: run.exitCode,
    executed: tests.length,
    passed: tests.filter((entry) => entry.status === 'passed').length,
    failed: tests.filter((entry) => entry.status === 'failed').length,
  }
}

function assertPhase(run, expectedTitle, phase) {
  const tests = flatten(run.json.testResults)
  const failed = tests.filter((entry) => entry.status === 'failed')
  if (phase !== 'injected') {
    if (run.exitCode !== 0 || failed.length !== 0)
      throw new Error(`${phase} 须全绿：exit=${run.exitCode} failed=${failed.length}`)
    return undefined
  }
  if (run.exitCode === 0 || failed.length !== 1)
    throw new Error(`injected 须恰一红：exit=${run.exitCode} failed=${failed.length}`)
  const target = failed[0]
  if (!target.fullName.includes(expectedTitle))
    throw new Error(`红例 fullName 不符: ${target.fullName}`)
  const message = target.failureMessages[0] ?? ''
  if (!/^AssertionError|^expect\(/.test(message))
    throw new Error(`红例非业务 AssertionError: ${message.slice(0, 200)}`)
  return target
}

function main() {
  const spec = JSON.parse(readFileSync(process.argv[2], 'utf8'))
  ownerPackage = spec.package ?? 'migrate'
  const evidenceDir = process.argv[3] ? resolve(process.argv[3], spec.id) : undefined
  const productPath = resolve(repoRoot, 'packages', ownerPackage, spec.mutation.file)
  const originalSha = sha256(readFileSync(productPath))
  const candidateFile = resolve(repoRoot, 'packages', ownerPackage, spec.test.file)
  const controlShaBefore = sha256(readFileSync(candidateFile))
  const productRel = `packages/${ownerPackage}/${spec.mutation.file}`

  const controlDir = mkdtempSync(resolve(tmpdir(), 'glm-o-cc-control-'))
  const injectedDir = mkdtempSync(resolve(tmpdir(), 'glm-o-cc-injected-'))
  let patch
  try {
    git(['worktree', 'add', '--detach', controlDir, 'HEAD'])
    git(['worktree', 'add', '--detach', injectedDir, 'HEAD'])
    for (const dir of [controlDir, injectedDir])
      execFileSync('pnpm', ['install', '--frozen-lockfile', '--prefer-offline'], {
        cwd: dir,
        encoding: 'utf8',
        stdio: 'pipe',
      })

    // ── phase 1: control（候选树全绿）──
    const control = runVitest(
      controlDir,
      spec.test.file,
      resolve(controlDir, 'vitest-control.json'),
      resolve(controlDir, 'vitest-control.txt'),
    )
    assertPhase(control, spec.test.title, 'control')

    // ── phase 2: injected（单轴变异 → 恰一业务红）──
    const source = readFileSync(resolve(injectedDir, productRel), 'utf8')
    const occurrences = source.split(spec.mutation.find).length - 1
    if (occurrences !== 1)
      throw new Error(`变异锚点必须唯一，实际 ${occurrences}: ${spec.mutation.find.slice(0, 80)}`)
    writeFileSync(
      resolve(injectedDir, productRel),
      source.replace(spec.mutation.find, spec.mutation.replace),
    )
    const mutatedSha = sha256(readFileSync(resolve(injectedDir, productRel)))
    patch = git(['diff', '--unified=0', '--', productRel], injectedDir)

    const injected = runVitest(
      injectedDir,
      spec.test.file,
      resolve(injectedDir, 'vitest-injected.json'),
      resolve(injectedDir, 'vitest-injected.txt'),
    )
    const target = assertPhase(injected, spec.test.title, 'injected')

    // ── 重建自校验：checkout 后应用零上下文 patch，必须重建出同一变异字节 ──
    git(['checkout', '--', productRel], injectedDir)
    const patchFile = resolve(injectedDir, 'mutation.patch')
    writeFileSync(patchFile, patch)
    git(['apply', '--unidiff-zero', 'mutation.patch'], injectedDir)
    const rebuiltSha = sha256(readFileSync(resolve(injectedDir, productRel)))
    if (rebuiltSha !== mutatedSha)
      throw new Error(`patch 重建字节不符: rebuilt=${rebuiltSha} mutated=${mutatedSha}`)

    // ── phase 3: restored（恢复原源后重跑全绿）──
    git(['checkout', '--', productRel], injectedDir)
    const restoredSha = sha256(readFileSync(resolve(injectedDir, productRel)))
    if (restoredSha !== originalSha)
      throw new Error(`恢复源 hash 不符: restored=${restoredSha} original=${originalSha}`)
    const restored = runVitest(
      injectedDir,
      spec.test.file,
      resolve(injectedDir, 'vitest-restored.json'),
      resolve(injectedDir, 'vitest-restored.txt'),
    )
    assertPhase(restored, spec.test.title, 'restored')

    if (controlShaBefore !== sha256(readFileSync(candidateFile)))
      throw new Error('候选树测试文件被意外修改')
    if (originalSha !== sha256(readFileSync(productPath))) throw new Error('候选树产品源被意外修改')

    const result = {
      id: spec.id,
      contract: spec.contract,
      target: { file: spec.test.file, title: spec.test.title },
      control: phaseSummary(control),
      injected: {
        ...phaseSummary(injected),
        failedFullName: target.fullName,
        failureMessageHead: (target.failureMessages[0] ?? '').split('\n')[0],
      },
      restored: phaseSummary(restored),
      hashes: {
        original: originalSha,
        mutated: mutatedSha,
        restored: restoredSha,
        rebuilt: rebuiltSha,
      },
      patchRebuiltAndVerified: true,
    }
    if (evidenceDir) {
      execFileSync('mkdir', ['-p', evidenceDir])
      writeFileSync(resolve(evidenceDir, 'spec.json'), JSON.stringify(spec, null, 2))
      const phaseDirs = { control: controlDir, injected: injectedDir, restored: injectedDir }
      for (const phase of ['control', 'injected', 'restored']) {
        writeFileSync(
          resolve(evidenceDir, `vitest-${phase}.json`),
          readFileSync(resolve(phaseDirs[phase], `vitest-${phase}.json`)),
        )
        writeFileSync(
          resolve(evidenceDir, `vitest-${phase}.txt`),
          readFileSync(resolve(phaseDirs[phase], `vitest-${phase}.txt`)),
        )
      }
      writeFileSync(resolve(evidenceDir, 'mutation.patch'), patch)
      writeFileSync(resolve(evidenceDir, 'result.json'), JSON.stringify(result, null, 2))
    }
    console.log(JSON.stringify({ ...result, patch }, null, 2))
  } finally {
    for (const dir of [controlDir, injectedDir]) {
      try {
        git(['worktree', 'remove', '--force', dir])
      } catch {
        rmSync(dir, { recursive: true, force: true })
        try {
          git(['worktree', 'prune'])
        } catch {
          // already pruned
        }
      }
    }
  }
}

try {
  main()
} catch (error) {
  console.error(String(error))
  process.exitCode = 1
}
