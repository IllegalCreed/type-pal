/**
 * TEST-GLM-NEW-F-1 共用反控判据 r2（本 wave 专用，判据隔离于 wave-F 目录）。
 *
 * 用法：
 *   node needle-judge.mjs --file <相对 repo 根的测试文件> --name <完整失败名（精确相等）>
 *        --find <精确注入点> --replace <注入串> [--package editor] [--timeout-ms <毫秒>]
 *   node needle-judge.mjs --selftest   # 用同一判据跑反例自测（INVALID 路径 + 清理证明）
 *
 * 严格判据（全部满足才 VALID，任何不满足=INVALID，且临时针文件在任何路径下都被清理）：
 *   ① 候选原文件整体运行（无 -t 过滤）恰 exit 0，executed>0、failed=0、skipped=0；
 *   ② --find 在候选文件中恰好出现 1 次（唯一注入）；
 *   ③ 临时副本注入后整体运行：恰 exit 1（混错/skip/timeout/exit2 均 INVALID）、
 *      汇总 failed 恰 1 且 FAIL 行恰 1、FAIL 文件与临时副本**绝对路径相等**、
 *      fullName 与 --name **精确相等**、executed 与基线一致、失败为 AssertionError；
 *   ④ 注入前后生产源（packages/<pkg>/src，剔除测试与 __tests__）SHA256 完全一致。
 * 临时副本在 finally 中清理；--selftest 另用磁盘断言证明无遗留。
 */

import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, relative as relative0, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../../../..')

function arg(name) {
  const index = process.argv.indexOf(`--${name}`)
  return index === -1 ? undefined : process.argv[index + 1]
}

class JudgeInvalid extends Error {
  constructor(reason, extra = {}) {
    super(reason)
    this.reason = reason
    this.extra = extra
  }
}

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

function runVitest(packageDir, targetFile, timeoutMs) {
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
  return { executed: passed + failed, passed, failed, skipped }
}

/** FAIL 行 → { file, fullName }；vitest 打印形如 "FAIL  path > a > b"。 */
function failLines(output) {
  const result = []
  for (const match of output.matchAll(/^[ \t]*FAIL[ \t]+(\S+)[ \t]+>[ \t]*(.+)$/gm)) {
    result.push({ file: match[1], fullName: match[2].trim() })
  }
  return result
}

/**
 * 对单个候选执行完整判据。返回 VALID 结论对象；任何不满足抛 JudgeInvalid。
 * 注入的临时针文件在任何退出路径（VALID/INVALID/异常）都会被 finally 清理。
 */
export function judgeOne(options) {
  const {
    file, // 绝对路径
    name, // 期望的完整失败名（精确相等）
    find,
    replace,
    packageName = 'editor',
    timeoutMs = 420_000,
  } = options
  const packageDir = join(repoRoot, 'packages', packageName)
  if (!existsSync(file)) throw new JudgeInvalid(`candidate file not found: ${file}`)
  if (!find || replace === undefined || !name)
    throw new JudgeInvalid('missing required options: file/name/find/replace')
  const beforeHash = hashSources(packageDir)

  // ① 候选原文件对照。
  const baseline = runVitest(packageDir, file, timeoutMs)
  if (baseline.timedOut) throw new JudgeInvalid('baseline run timed out')
  if (baseline.code !== 0)
    throw new JudgeInvalid('baseline run did not exit 0', { code: baseline.code })
  const baselineStats = summary(baseline.output)
  if (baselineStats.executed < 1) throw new JudgeInvalid('baseline executed zero tests')
  if (baselineStats.failed !== 0)
    throw new JudgeInvalid('baseline has failed tests', { failed: baselineStats.failed })
  if (baselineStats.skipped !== 0)
    throw new JudgeInvalid('baseline contains skipped tests', { skipped: baselineStats.skipped })

  // ② 注入点唯一。
  const source = readFileSync(file, 'utf8')
  const occurrences = source.split(find).length - 1
  if (occurrences !== 1)
    throw new JudgeInvalid(`injection site occurs ${occurrences} times (require exactly 1)`)

  // ③ 临时副本注入后整体运行；finally 保证任何路径都清理。
  const needleFile = file.replace(/(\.test\.(?:ts|tsx))$/, '.needle-tmp$1')
  if (needleFile === file) throw new JudgeInvalid('candidate file does not match *.test.ts(x)')
  try {
    writeFileSync(needleFile, source.replace(find, replace))
    const injected = runVitest(packageDir, needleFile, timeoutMs)
    if (injected.timedOut) throw new JudgeInvalid('injected run timed out')
    if (injected.code === 0)
      throw new JudgeInvalid('injected run still exits 0: assertion has no discriminating power')
    if (injected.code !== 1)
      throw new JudgeInvalid(`injected run exit ${injected.code} (require exactly 1)`, {
        code: injected.code,
      })
    const injectedStats = summary(injected.output)
    if (injectedStats.failed !== 1)
      throw new JudgeInvalid('injected summary failed count is not exactly 1', {
        failed: injectedStats.failed,
      })
    if (injectedStats.skipped !== 0)
      throw new JudgeInvalid('injected run contains skipped tests', {
        skipped: injectedStats.skipped,
      })
    if (injectedStats.executed !== baselineStats.executed)
      throw new JudgeInvalid('executed count changed between baseline and injected run', {
        baseline: baselineStats.executed,
        injected: injectedStats.executed,
        __output: `${injected.output.slice(-2500)}\n=====BASELINE=====\n${baseline.output.slice(-2500)}`,
      })
    const failed = failLines(injected.output)
    if (failed.length !== 1)
      throw new JudgeInvalid('failure set is not exactly one test', {
        failures: failed.map((entry) => entry.fullName),
      })
    // 绝对路径精确相等（否定 basename/子串匹配）。
    const failedAbsolute = resolve(packageDir, failed[0].file)
    if (failedAbsolute !== resolve(needleFile))
      throw new JudgeInvalid('failure did not come from the injected needle file', {
        expected: resolve(needleFile),
        actual: failedAbsolute,
      })
    if (failed[0].fullName !== name)
      throw new JudgeInvalid('full failure name does not exactly match --name', {
        expected: name,
        actual: failed[0].fullName,
      })
    if (!/AssertionError/.test(injected.output))
      throw new JudgeInvalid('failure is not an AssertionError (suspect thrown error/timeout)')
    // ④ 生产源 hash 恒定。
    const afterHash = hashSources(packageDir)
    if (afterHash !== beforeHash)
      throw new JudgeInvalid('production source hash drifted during the needle run', {
        file: needleFile,
        fullName: failed[0].fullName,
      })
    return {
      verdict: 'VALID',
      file: needleFile,
      absoluteFile: resolve(needleFile),
      fullName: failed[0].fullName,
      baselineExecuted: baselineStats.executed,
      injectedExecuted: injectedStats.executed,
      productHashUnchanged: true,
    }
  } finally {
    rmSync(needleFile, { force: true })
  }
}

function runCli() {
  const fileRel = arg('file')
  const name = arg('name')
  const find = arg('find')
  const replace = arg('replace')
  const packageName = arg('package') ?? 'editor'
  const timeoutMs = Number(arg('timeout-ms') ?? 420_000)
  if (!fileRel || !name || !find || replace === undefined) {
    console.log(
      JSON.stringify(
        { verdict: 'INVALID', reason: 'missing required args: --file/--name/--find/--replace' },
        null,
        2,
      ),
    )
    process.exit(2)
  }
  try {
    const verdict = judgeOne({
      file: resolve(repoRoot, fileRel),
      name,
      find,
      replace,
      packageName,
      timeoutMs,
    })
    console.log(JSON.stringify(verdict, null, 2))
    process.exit(0)
  } catch (error) {
    if (error instanceof JudgeInvalid) {
      console.log(
        JSON.stringify({ verdict: 'INVALID', reason: error.reason, ...error.extra }, null, 2),
      )
      process.exit(2)
    }
    console.log(
      JSON.stringify({ verdict: 'INVALID', reason: `unexpected: ${String(error)}` }, null, 2),
    )
    process.exit(2)
  }
}

/** 自测：用一次性 scratch 测试文件证明各 INVALID 反例、清理与一条 VALID。 */
function selftest() {
  const packageDir = join(repoRoot, 'packages', 'editor')
  const scratch = join(packageDir, 'src', '__glm-judge-selftest__')
  const results = []
  const scenario = (label, run) => {
    try {
      results.push({ label, outcome: run() })
    } catch (error) {
      results.push({
        label,
        outcome:
          error instanceof JudgeInvalid
            ? { verdict: 'INVALID', reason: error.reason }
            : { verdict: 'ERROR', reason: String(error) },
      })
    }
  }

  try {
    rmSync(scratch, { recursive: true, force: true })
    mkdirSync(scratch, { recursive: true })
    writeFileSync(
      join(scratch, 'healthy.glm-judge-selftest.test.ts'),
      "import { expect, test } from 'vitest'\n" +
        "test('selftest healthy case passes', () => {\n  expect(1 + 1).toBe(2)\n})\n",
    )
    const healthy = {
      file: join(scratch, 'healthy.glm-judge-selftest.test.ts'),
      name: 'selftest healthy case passes',
      find: 'expect(1 + 1).toBe(2)',
      timeoutMs: 300_000,
    }
    scenario('healthy candidate is VALID', () =>
      judgeOne({ ...healthy, replace: 'expect(1 + 1).toBe(3)' }),
    )
    scenario('no-discrimination injection is INVALID', () =>
      judgeOne({ ...healthy, replace: 'expect(1 + 1).toBe(2)' }),
    )
    scenario('exact-name mismatch is INVALID', () =>
      judgeOne({
        ...healthy,
        name: 'selftest healthy case passes but name differs',
        replace: 'expect(1 + 1).toBe(3)',
      }),
    )
    writeFileSync(
      join(scratch, 'duplicated.glm-judge-selftest.test.ts'),
      "import { expect, test } from 'vitest'\n" +
        '// expect(1 + 1).toBe(2) —— 同串注释制造非唯一注入点反例\n' +
        "test('selftest duplicated site passes', () => {\n  expect(1 + 1).toBe(2)\n})\n",
    )
    scenario('non-unique injection site is INVALID', () =>
      judgeOne({
        file: join(scratch, 'duplicated.glm-judge-selftest.test.ts'),
        name: 'selftest duplicated site passes',
        find: 'expect(1 + 1).toBe(2)',
        replace: 'expect(1 + 1).toBe(3)',
        timeoutMs: 300_000,
      }),
    )
    writeFileSync(
      join(scratch, 'broken.glm-judge-selftest.test.ts'),
      "import { expect, test } from 'vitest'\n" +
        "test('selftest broken case fails', () => {\n  expect(1).toBe(2)\n})\n",
    )
    scenario('failing baseline is INVALID', () =>
      judgeOne({
        file: join(scratch, 'broken.glm-judge-selftest.test.ts'),
        name: 'selftest broken case fails',
        find: 'expect(1).toBe(2)',
        replace: 'expect(1).toBe(3)',
        timeoutMs: 300_000,
      }),
    )
    scenario('missing candidate file is INVALID', () =>
      judgeOne({
        file: join(scratch, 'absent.glm-judge-selftest.test.ts'),
        name: 'whatever',
        find: 'x',
        replace: 'y',
        timeoutMs: 300_000,
      }),
    )
    const leftovers = readdirSync(scratch).filter((entry) => entry.includes('needle-tmp'))
    results.push({
      label: 'no needle-tmp leftovers on any INVALID path',
      outcome: leftovers.length === 0 ? { verdict: 'CLEAN' } : { verdict: 'DIRTY', leftovers },
    })
  } finally {
    rmSync(scratch, { recursive: true, force: true })
  }

  const expectations = [
    ['healthy candidate is VALID', 'VALID'],
    ['no-discrimination injection is INVALID', 'INVALID'],
    ['non-unique injection site is INVALID', 'INVALID'],
    ['exact-name mismatch is INVALID', 'INVALID'],
    ['failing baseline is INVALID', 'INVALID'],
    ['missing candidate file is INVALID', 'INVALID'],
    ['no needle-tmp leftovers on any INVALID path', 'CLEAN'],
  ]
  const failures = expectations.filter(([label, expected]) => {
    const row = results.find((candidate) => candidate.label === label)
    return !row || row.outcome.verdict !== expected
  })
  const invalidReasons = Object.fromEntries(
    results
      .filter((row) => row.outcome.verdict === 'INVALID')
      .map((row) => [row.label, row.outcome.reason]),
  )
  console.log(
    JSON.stringify(
      {
        verdict: failures.length === 0 ? 'SELFTEST-PASS' : 'SELFTEST-FAIL',
        results,
        invalidReasons,
      },
      null,
      2,
    ),
  )
  process.exit(failures.length === 0 ? 0 : 2)
}

if (process.argv.includes('--selftest')) selftest()
else runCli()
