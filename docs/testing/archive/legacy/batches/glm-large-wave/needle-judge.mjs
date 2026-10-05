/**
 * TEST-GLM-LARGE-WAVE-4 共用反控判据（五批共用，R3 严格版）。
 *
 * 用法：
 *   node needle-judge.mjs --file <相对 repo 根的测试文件> --name <完整失败测试名（精确相等）>
 *        --find <精确注入点> --replace <注入串> [--package editor|reforge|migrate|content]
 *        [--repo-root <沙箱根，selftest 用>] [--timeout-ms <毫秒>]
 *
 * 严格判据（全部满足才 VALID，否则非零退出）：
 *   ① 候选原文件整体运行（无 -t 过滤）exit 0，且 executed>0、failed=0、skipped=0；
 *   ② --find 在候选文件中恰好出现 1 次；
 *   ③ 同目录临时副本注入后整体运行：恰 exit 1、汇总 failed 恰 1、FAIL 行解析出的
 *      测试文件经 resolve 后与被注入的绝对临时文件全等、失败名与 --name 完整相等、
 *      失败为 AssertionError、executed 与基线一致、无 skip/timeout；
 *   ④ 注入前后生产源（<package>/src，剔除测试与 __tests__）SHA256 完全一致，
 *      漂移即 INVALID（此门不满足绝不判 VALID）。
 * 所有 INVALID/异常路径（含注入 try 内的任何失败与进程异常）都先删除临时副本再退出；
 * 临时副本不进提交。--repo-root 仅供 selftest 在 /tmp 沙箱复跑同一判据。
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

const defaultRepoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../../..')
const repoRoot = resolve(arg('repo-root') ?? defaultRepoRoot)
const fileRel = arg('file')
const name = arg('name')
const find = arg('find')
const replace = arg('replace')
const packageName = arg('package') ?? 'editor'
const timeoutMs = Number(arg('timeout-ms') ?? 420_000)
const packageDir = join(repoRoot, 'packages', packageName)

/** 当前已写出的临时针文件；任何退出路径都必须先清掉它。 */
let needleFile
function cleanupNeedle() {
  if (needleFile) {
    rmSync(needleFile, { force: true })
    needleFile = undefined
  }
}

function invalid(reason, extra = {}) {
  cleanupNeedle()
  console.log(JSON.stringify({ verdict: 'INVALID', reason, ...extra }, null, 2))
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
  // 只解析 "Tests" 汇总行（形如 "Tests  2 passed (2)" / "Tests  1 failed | 1 passed (2)"）；
  // "Test Files" 行同样是 N passed/failed，抢先匹配会把文件数当测试数。
  const line = /^[ \t]*Tests[ \t]+(.+)$/m.exec(output)?.[1] ?? ''
  const passed = Number(/(\d+)[ \t]+passed/.exec(line)?.[1] ?? 0)
  const failed = Number(/(\d+)[ \t]+failed\b/.exec(line)?.[1] ?? 0)
  const skipped = Number(/\b(\d+)[ \t]+skipped\b/.exec(line)?.[1] ?? 0)
  return { passed, failed, skipped, executed: passed + failed }
}

/** FAIL 行 → { file, fullName }；格式形如 "FAIL [tag] path > a > b"（tag 可省）。 */
function failures(output) {
  const result = []
  for (const match of output.matchAll(/^[ \t]*FAIL[ \t]+(.+)$/gm)) {
    const tokens = match[1].split(/[ \t]+/)
    const fileIndex = tokens.findIndex((token) => /\.test\.(ts|tsx)$/.test(token))
    if (fileIndex === -1) continue
    const rest = tokens.slice(fileIndex + 1).join(' ')
    if (!rest.startsWith('> ')) continue
    result.push({ file: tokens[fileIndex], fullName: rest.slice(2) })
  }
  return result
}

const beforeHash = hashSources(packageDir)

// ① 候选原文件对照：整体 exit0、真实执行、零失败、零 skip。
const baseline = runVitest(file)
if (baseline.timedOut) invalid('baseline run timed out')
if (baseline.code !== 0) invalid('baseline run did not exit 0', { code: baseline.code })
const baselineStats = summary(baseline.output)
if (baselineStats.executed < 1) invalid('baseline executed zero tests')
if (baselineStats.failed !== 0) invalid('baseline run already has failing tests')
if (baselineStats.skipped !== 0)
  invalid('baseline contains skipped tests', { skipped: baselineStats.skipped })

// ② 注入点唯一。
const source = readFileSync(file, 'utf8')
const occurrences = source.split(find).length - 1
if (occurrences !== 1) invalid(`injection site occurs ${occurrences} times (require exactly 1)`)

// ③ 临时副本注入后整体运行；任何 INVALID/异常路径都先清理再退出。
const needlePath = file.replace(/(\.test\.(?:ts|tsx))$/, '.needle-tmp$1')
let verdict
try {
  needleFile = needlePath
  writeFileSync(needleFile, source.replace(find, replace))
  const injected = runVitest(needleFile)
  if (injected.timedOut) invalid('injected run timed out')
  if (injected.code === 0)
    invalid('injected run still exits 0: assertion has no discriminating power')
  if (injected.code !== 1) invalid(`injected run exit ${injected.code} (require exactly 1)`)
  const injectedStats = summary(injected.output)
  if (injectedStats.failed !== 1)
    invalid('injected run must fail exactly one test', { failed: injectedStats.failed })
  if (injectedStats.skipped !== 0)
    invalid('injected run contains skipped tests', { skipped: injectedStats.skipped })
  if (injectedStats.executed !== baselineStats.executed)
    invalid('executed count changed between baseline and injected run', {
      baseline: baselineStats.executed,
      injected: injectedStats.executed,
    })
  const failed = failures(injected.output)
  if (failed.length !== 1)
    invalid('failure set is not exactly one test', { failures: failed.map((f) => f.fullName) })
  // 精确核验：FAIL 行的相对路径必须解析为被注入的绝对临时文件本身。
  const failedFile = resolve(packageDir, failed[0].file)
  if (failedFile !== needlePath)
    invalid('failure did not come from the injected needle file', {
      failedFile,
      expectedFile: needlePath,
    })
  // 完整失败名精确相等，不做子串匹配。
  if (failed[0].fullName !== name)
    invalid('full failure name does not equal --name', {
      fullName: failed[0].fullName,
      expectedName: name,
    })
  if (!/AssertionError/.test(injected.output))
    invalid('failure is not an AssertionError (suspect thrown error/timeout)')
  const afterHash = hashSources(packageDir)
  if (afterHash !== beforeHash)
    invalid('production source hash drifted during the needle run', {
      file: needlePath,
      fullName: failed[0].fullName,
    })
  verdict = {
    verdict: 'VALID',
    file: needlePath,
    fullName: failed[0].fullName,
    baselineExecuted: baselineStats.executed,
    injectedExecuted: injectedStats.executed,
    productHashUnchanged: true,
  }
} catch (error) {
  cleanupNeedle()
  throw error
}
cleanupNeedle()

console.log(JSON.stringify(verdict, null, 2))
process.exit(0)
