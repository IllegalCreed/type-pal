#!/usr/bin/env node
/** Wave O 反控 runner：在一次性 detached worktree 副本树注入单轴变异，
 *  要求定向测试恰有一个目标 fullName 以业务 AssertionError 变红；候选树永不被改。
 *  用法：node run-counter.mjs <spec.json>，spec 见 counters/*.json；输出 JSON 到 stdout。
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

function runVitest(worktree, testFile, outputFile) {
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

function assertTarget(run, expectedTitle, phase) {
  const tests = flatten(run.json.testResults)
  const failed = tests.filter((entry) => entry.status === 'failed')
  if (phase === 'control') {
    if (run.exitCode !== 0 || failed.length !== 0)
      throw new Error(`control 须全绿：exit=${run.exitCode} failed=${failed.length}`)
    return
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

    const control = runVitest(
      controlDir,
      spec.test.file,
      resolve(controlDir, 'vitest-control.json'),
    )
    assertTarget(control, spec.test.title, 'control')

    const source = readFileSync(
      resolve(injectedDir, 'packages', ownerPackage, spec.mutation.file),
      'utf8',
    )
    const occurrences = source.split(spec.mutation.find).length - 1
    if (occurrences !== 1)
      throw new Error(`变异锚点必须唯一，实际 ${occurrences}: ${spec.mutation.find.slice(0, 80)}`)
    writeFileSync(
      resolve(injectedDir, 'packages', ownerPackage, spec.mutation.file),
      source.replace(spec.mutation.find, spec.mutation.replace),
    )
    const mutatedSha = sha256(
      readFileSync(resolve(injectedDir, 'packages', ownerPackage, spec.mutation.file)),
    )
    patch = git(['diff', '--', `packages/${ownerPackage}/${spec.mutation.file}`], injectedDir)

    const injected = runVitest(
      injectedDir,
      spec.test.file,
      resolve(injectedDir, 'vitest-injected.json'),
    )
    const target = assertTarget(injected, spec.test.title, 'injected')

    const restoredSha = sha256(readFileSync(productPath))
    if (restoredSha !== originalSha) throw new Error('候选树源文件被意外修改')
    if (controlShaBefore !== sha256(readFileSync(candidateFile)))
      throw new Error('候选树测试文件被意外修改')

    if (evidenceDir) {
      execFileSync('mkdir', ['-p', evidenceDir])
      writeFileSync(resolve(evidenceDir, 'spec.json'), JSON.stringify(spec, null, 2))
      writeFileSync(
        resolve(evidenceDir, 'vitest-control.json'),
        readFileSync(resolve(controlDir, 'vitest-control.json')),
      )
      writeFileSync(
        resolve(evidenceDir, 'vitest-injected.json'),
        readFileSync(resolve(injectedDir, 'vitest-injected.json')),
      )
      writeFileSync(resolve(evidenceDir, 'mutation.patch'), patch)
      writeFileSync(
        resolve(evidenceDir, 'result.json'),
        JSON.stringify(
          {
            id: spec.id,
            control: {
              exitCode: control.exitCode,
              tests: flatten(control.json.testResults).length,
            },
            injected: {
              exitCode: injected.exitCode,
              failedFullName: target.fullName,
              failureMessageHead: (target.failureMessages[0] ?? '').split('\n')[0],
              executed: flatten(injected.json.testResults).length,
            },
            hashes: { original: originalSha, mutated: mutatedSha, restored: restoredSha },
          },
          null,
          2,
        ),
      )
    }
    console.log(
      JSON.stringify(
        {
          id: spec.id,
          contract: spec.contract,
          mutation: {
            file: spec.mutation.file,
            find: spec.mutation.find,
            replace: spec.mutation.replace,
          },
          target: { file: spec.test.file, title: spec.test.title },
          control: { exitCode: control.exitCode, tests: flatten(control.json.testResults).length },
          injected: {
            exitCode: injected.exitCode,
            failedFullName: target.fullName,
            failureMessageHead: (target.failureMessages[0] ?? '').split('\n')[0],
            executed: flatten(injected.json.testResults).length,
          },
          hashes: { original: originalSha, mutated: mutatedSha, restored: restoredSha },
          patch,
        },
        null,
        2,
      ),
    )
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
