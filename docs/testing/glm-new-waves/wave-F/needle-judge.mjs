/**
 * TEST-GLM-NEW-F-1 共用反控判据（本 wave 专用，判据隔离于 wave-F 目录）。
 *
 * 用法：
 *   node needle-judge.mjs --file <相对 repo 根的测试文件> --name <完整失败名子串>
 *        --find <精确注入点> --replace <注入串> [--package editor] [--timeout-ms <毫秒>]
 *
 * 严格判据（全部满足才 VALID，否则非零退出）：
 *   ① 候选原文件整体运行（无 -t 过滤）exit 0，且 executed>0、skipped=0；
 *   ② --find 在候选文件中恰好出现 1 次（唯一注入）；
 *   ③ 同目录临时副本注入后整体运行：恰 exit 1、恰 1 条 FAIL、FAIL 行确为该临时文件、
 *      完整失败名含 --name、失败为 AssertionError、executed 与基线一致、无 skip/timeout；
 *   ④ 注入前后生产源（packages/editor/src，剔除测试与 __tests__）SHA256 完全一致。
 * 临时副本跑完即删，不进提交。
 */

import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative as relative0, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

function arg(name) {
  const index = process.argv.indexOf(`--${name}`)
  return index === -1 ? undefined : process.argv[index + 1]
}

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')
const fileRel = arg('file')
const name = arg('name')
const find = arg('find')
const replace = arg('replace')
const packageName = arg('package') ?? 'editor'
const timeoutMs = Number(arg('timeout-ms') ?? 420_000)
const packageDir = join(repoRoot, 'packages', packageName)

function invalid(reason, extra = {}) {
  console.log(JSON.stringify({ verdict: 'INVALID', reason, ...extra }, null, 2))
  if (process.env.F_JUDGE_DEBUG) console.error(`DEBUG OUTPUT:\n${extra.__output ?? '(none)'}`)
  process.exit(2)
}

if (!fileRel || !name || !find || replace === undefined)
  invalid('missing required args: --file/--name/--find/--replace')
const file = resolve(repoRoot, fileRel)
if (!existsSync(file)) invalid(`candidate file not found: ${file}`)

function hashSources(dir) {
  const digest = createHash('sha256')
  const walk = (current) => {
    for (const entry of readdirSync(current).sort()) {
      const full = join(current, entry)
      const stat = statSync(full)
      if (stat.isDirectory()) {
        if (entry === 'node_modules' || entry === '__tests__') continue
        walk(full)
      } else if (/\.(ts|tsx|mjs|mts|css)$/.test(entry) && !/\.test\.(ts|tsx)$/.test(entry)) {
        digest.update(entry)
        digest.update(readFileSync(full))
      }
    }
  }
  walk(join(dir, 'src'))
  return digest.digest('hex')
}

function runVitest(targetFile) {
  // vitest 把 CLI 路径参数当 include 过滤器：必须用相对 cwd 的路径，绝对路径匹配不到任何文件。
  const relative = join(relative0(packageDir, targetFile))
  const result = spawnSync('npx', ['vitest', 'run', '--no-file-parallelism', relative], {
    cwd: packageDir,
    encoding: 'utf8',
    timeout: timeoutMs,
  })
  return {
    code: result.status,
    timedOut: result.error?.code === 'ETIMEDOUT' || result.signal === 'SIGTERM',
    output: `${result.stdout ?? ''}\n${result.stderr ?? ''}`,
  }
}

function summary(output) {
  const line = /^[ \t]*Tests[ \t]+(.+)$/m.exec(output)?.[1] ?? ''
  const passed = Number(/(\d+)[ \t]+passed/.exec(line)?.[1] ?? 0)
  const failed = Number(/(\d+)[ \t]+failed\b/.exec(line)?.[1] ?? 0)
  const skipped = Number(/\b(\d+)[ \t]+skipped\b/.exec(line)?.[1] ?? 0)
  return { executed: passed + failed, skipped }
}

function failures(output) {
  const result = []
  for (const match of output.matchAll(/^[ \t]*FAIL[ \t]+(\S+)[ \t]+>[ \t]*(.+)$/gm)) {
    result.push({ file: match[1], fullName: match[2] })
  }
  return result
}

const beforeHash = hashSources(packageDir)

// ① 候选原文件对照：整体 exit0、真实执行、无 skip。
const baseline = runVitest(file)
if (baseline.timedOut) invalid('baseline run timed out')
if (baseline.code !== 0) invalid('baseline run did not exit 0', { code: baseline.code })
const baselineStats = summary(baseline.output)
if (baselineStats.executed < 1) invalid('baseline executed zero tests')
if (baselineStats.skipped !== 0)
  invalid('baseline contains skipped tests', { skipped: baselineStats.skipped })

// ② 注入点唯一。
const source = readFileSync(file, 'utf8')
const occurrences = source.split(find).length - 1
if (occurrences !== 1) invalid(`injection site occurs ${occurrences} times (require exactly 1)`)

// ③ 临时副本注入后整体运行。
const needleFile = file.replace(/(\.test\.(?:ts|tsx))$/, '.needle-tmp$1')
const needleBasename = needleFile.split('/').at(-1)
let verdict
try {
  writeFileSync(needleFile, source.replace(find, replace))
  const injected = runVitest(needleFile)
  if (injected.timedOut) invalid('injected run timed out')
  if (injected.code === 0)
    invalid('injected run still exits 0: assertion has no discriminating power')
  if (injected.code !== 1) invalid(`injected run exit ${injected.code} (require exactly 1)`)
  const injectedStats = summary(injected.output)
  if (injectedStats.skipped !== 0)
    invalid('injected run contains skipped tests', { skipped: injectedStats.skipped })
  if (injectedStats.executed !== baselineStats.executed)
    invalid('executed count changed between baseline and injected run', {
      baseline: baselineStats.executed,
      injected: injectedStats.executed,
      __output: `${injected.output.slice(-2500)}\n=====BASELINE=====\n${baseline.output.slice(-2500)}`,
    })
  const failed = failures(injected.output)
  if (failed.length !== 1)
    invalid('failure set is not exactly one test', { failures: failed.map((f) => f.fullName) })
  if (!failed[0].file.includes(needleBasename))
    invalid('failure did not come from the injected needle file', { failedFile: failed[0].file })
  if (!failed[0].fullName.includes(name))
    invalid('full failure name does not contain --name', { fullName: failed[0].fullName })
  if (!/AssertionError/.test(injected.output))
    invalid('failure is not an AssertionError (suspect thrown error/timeout)')
  const afterHash = hashSources(packageDir)
  if (afterHash !== beforeHash)
    invalid('production source hash drifted during the needle run', {
      file: needleFile,
      fullName: failed[0].fullName,
    })
  verdict = {
    verdict: 'VALID',
    file: needleFile,
    fullName: failed[0].fullName,
    baselineExecuted: baselineStats.executed,
    injectedExecuted: injectedStats.executed,
    productHashUnchanged: true,
  }
} finally {
  rmSync(needleFile, { force: true })
}

console.log(JSON.stringify(verdict, null, 2))
process.exit(verdict.verdict === 'VALID' ? 0 : 2)
