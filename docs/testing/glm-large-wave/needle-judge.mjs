/**
 * TEST-GLM-LARGE-WAVE-4 共用反控判据（五批共用）。
 * 用法：node needle-judge.mjs --file <候选测试文件> --name <测试名子串>
 *       --find <精确注入点> --replace <注入串> [--package editor|reforge|migrate|content]
 * 步骤：① 候选原文件按 -t 过滤运行必须 exit 0 且至少执行 1 条测试；
 *       ② 同目录临时副本注入（--find 恰好一处）后运行必须恰 exit 1，
 *          且失败 fullName 含 --name；timeout/多失败/零执行/exit2 判 invalid；
 *       ③ 全程前后对生产源码目录做 SHA256 快照，产品 hash 必须不变。
 * 临时副本跑完即删，不进提交。
 */
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

function arg(name) {
  const index = process.argv.indexOf(`--${name}`)
  return index === -1 ? undefined : process.argv[index + 1]
}

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const file = resolve(repoRoot, arg('file'))
const name = arg('name')
const find = arg('find')
const replace = arg('replace')
const packageName = arg('package') ?? 'editor'
const packageDir = join(repoRoot, 'packages', packageName)

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

function runVitest(targetFile, filter) {
  const result = spawnSync(
    'npx',
    [
      'vitest',
      'run',
      '--no-file-parallelism',
      targetFile,
      ...(filter ? ['-t', filter] : []),
    ],
    { cwd: packageDir, encoding: 'utf8', timeout: 420_000 },
  )
  return { code: result.status, output: `${result.stdout ?? ''}\n${result.stderr ?? ''}` }
}

function failedTestNames(output) {
  return [...output.matchAll(/FAIL[^\n]*?> ([^\n]+)$/gm)].map((match) => match[1])
}

const beforeHash = hashSources(packageDir)

// ① 候选原文件对照：必须 exit 0 且真实执行。
const baseline = runVitest(file, name)
if (baseline.code !== 0) {
  console.error('JUDGE INVALID: 候选原文件未 exit 0（对照失败）\n' + baseline.output.slice(-3000))
  process.exit(2)
}
const executed = /Tests\s+(\d+)\s+passed/.exec(baseline.output)
const executedCount = executed ? Number(executed[1]) : 0
if (executedCount < 1) {
  console.error('JUDGE INVALID: 对照运行零执行')
  process.exit(2)
}

// ② 临时副本注入：必须恰 exit 1 且失败测试名匹配。
const source = readFileSync(file, 'utf8')
const occurrences = source.split(find).length - 1
if (occurrences !== 1) {
  console.error(`JUDGE INVALID: 注入点出现 ${occurrences} 次（要求恰好 1 次）`)
  process.exit(2)
}
const needleFile = file.replace(/(\.(test\.[jt]sx?))$/, '.needle-tmp$1')
writeFileSync(needleFile, source.replace(find, replace))
let verdict
try {
  const injected = runVitest(needleFile, name)
  if (injected.code === 1) {
    const failures = failedTestNames(injected.output)
    const matched = failures.filter((failure) => failure.includes(name))
    const asserted = /AssertionError/.test(injected.output)
    if (matched.length === 1 && failures.length === 1 && asserted) {
      verdict = {
        verdict: 'VALID',
        fullName: matched[0],
        baselineTests: executedCount,
        productHashUnchanged: hashSources(packageDir) === beforeHash,
      }
    } else {
      verdict = {
        verdict: 'INVALID',
        reason: asserted ? '失败集合不唯一' : '失败非 AssertionError（疑似 timeout/错误抛出）',
        failures,
      }
    }
  } else if (injected.code === 0) {
    verdict = { verdict: 'INVALID', reason: '注入后仍 exit 0：断言无鉴别力' }
  } else {
    verdict = { verdict: 'INVALID', reason: `注入后 exit ${injected.code}（非恰 1）` }
  }
} finally {
  rmSync(needleFile, { force: true })
}

console.log(JSON.stringify(verdict, null, 2))
process.exit(verdict.verdict === 'VALID' ? 0 : 1)
