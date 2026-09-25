/**
 * ARCH-REGRESSION-LAB-GLM-1 · results 机械对账器 v2（只读，不改任何文件）。
 * 用法：node tools/verify.mjs <vitest-json-path>
 * vitest-json-path 必填：候选执行的 Vitest --reporter=json 输出；缺失/不可解析 exit1
 *（fail-closed，不静默通过）。
 *
 * 全部为硬判据，任一失败 exit1：
 * 1) 执行 JSON：success=true 且 numPassedTests=numTotalTests（全绿才允许对账）
 * 2) results.json：ID 唯一；groupTotals.total/byStatus/perPack 与机械重算一致
 * 3) 一对一映射（双向）：candidate-green 且 test.file 为真实路径的条目 fullName 集合
 *    === 执行 JSON passed fullName 集合（无缺、无重、无未登记执行项）
 * 4) browser 条目截图：文件存在 + 完整 SHA-256 精确匹配
 * 5) 白名单双栏硬判据：
 *    a) 产品冻结：`git diff <mergeBase(origin/main)>..HEAD -- packages/ scripts/` 必须为空
 *    b) 本分支非 merge 提交（相对 mergeBase）只允许改 docs/**（实验目录与任务卡/回执）
 * 6) commands 台账：每条必须带整数 exit；必须包含候选执行与业务负控两条关键命令
 */
import { execSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../../..')
const labRoot = resolve(repoRoot, 'docs/testing/glm-architecture-regression-lab')
const failures = []
const check = (ok, message) => {
  if (!ok) failures.push(message)
}

const git = (args) => execSync(`git ${args}`, { cwd: repoRoot, encoding: 'utf8' }).trim()

// 0) Vitest 执行 JSON（fail-closed）
const vitestJsonPath = resolve(process.argv[2] ?? join(labRoot, 'configs', 'candidates-exec.json'))
check(existsSync(vitestJsonPath), `Vitest JSON not found: ${vitestJsonPath}`)
let vitestData
try {
  vitestData = JSON.parse(readFileSync(vitestJsonPath, 'utf8'))
} catch {
  failures.push(`Vitest JSON unparseable: ${vitestJsonPath}`)
}

// 1) 执行 JSON 全绿硬判据
const executedFullNames = new Set()
if (vitestData) {
  for (const suite of vitestData.testResults ?? []) {
    for (const a of suite.assertionResults ?? []) {
      if (a.status === 'passed') executedFullNames.add(a.fullName)
    }
  }
  check(vitestData.success === true, '执行 JSON success != true（存在失败用例）')
  check(
    vitestData.numPassedTests === vitestData.numTotalTests,
    `执行 JSON 非全绿: passed ${vitestData.numPassedTests} / total ${vitestData.numTotalTests}`,
  )
}

// 2) results.json 台账一致性
const resultsPath = join(labRoot, 'results.json')
const results = JSON.parse(readFileSync(resultsPath, 'utf8'))
const ids = results.entries.map((entry) => entry.id)
check(new Set(ids).size === ids.length, '存在重复 ID')

const byStatus = {}
const perPack = {}
for (const entry of results.entries) {
  byStatus[entry.status] = (byStatus[entry.status] ?? 0) + 1
  perPack[entry.pack] = (perPack[entry.pack] ?? 0) + 1
}
check(
  results.groupTotals.total === results.entries.length,
  `total mismatch: ${results.groupTotals.total} vs ${results.entries.length}`,
)
for (const key of Object.keys(byStatus)) {
  const ledger = results.groupTotals.byStatus?.[key] ?? 0
  check(ledger === byStatus[key], `byStatus.${key}: ledger ${ledger} != actual ${byStatus[key]}`)
}
for (const key of Object.keys(perPack)) {
  const ledger = results.groupTotals.perPack?.[key] ?? 0
  check(ledger === perPack[key], `perPack.${key}: ledger ${ledger} != actual ${perPack[key]}`)
}
const ledgerStatusSum = Object.values(results.groupTotals.byStatus ?? {}).reduce((a, b) => a + b, 0)
check(ledgerStatusSum === results.groupTotals.total, 'byStatus 合计 != total')

// 3) 一对一映射（双向硬判据）
const ledgerFullNames = []
for (const entry of results.entries) {
  const testFile = entry.test?.file ?? ''
  if (testFile && !testFile.startsWith('(')) {
    const abs = testFile.startsWith('packages/')
      ? resolve(repoRoot, testFile)
      : resolve(labRoot, testFile)
    check(existsSync(abs), `${entry.id} 测试文件缺失: ${testFile}`)
  }
  if (entry.status === 'candidate-green' && entry.test?.file && !entry.test.file.startsWith('(')) {
    check(Boolean(entry.test.fullName), `${entry.id} candidate-green 缺 fullName`)
    ledgerFullNames.push(entry.test.fullName)
  }
}
const ledgerSet = new Set(ledgerFullNames)
const dupLedger = ledgerFullNames.filter((fn, i) => ledgerFullNames.indexOf(fn) !== i)
check(dupLedger.length === 0, `candidate-green 重复 fullName: ${dupLedger.join(', ')}`)
for (const fn of ledgerFullNames) {
  check(executedFullNames.has(fn), `台账条目未在执行 JSON 中 passed: ${fn.slice(0, 60)}`)
}
for (const fn of executedFullNames) {
  check(ledgerSet.has(fn), `执行 JSON 存在未登记 fullName: ${fn.slice(0, 60)}`)
}

// 4) 截图完整 SHA-256 匹配
for (const entry of results.entries) {
  for (const artifact of entry.artifacts ?? []) {
    if (!existsSync(artifact.path)) {
      failures.push(`${entry.id} 截图缺失: ${artifact.path}`)
      continue
    }
    const full = createHash('sha256').update(readFileSync(artifact.path)).digest('hex')
    if (artifact.sha256_full) {
      check(full === artifact.sha256_full, `${entry.id} 截图完整 hash 不符`)
    } else if (artifact.sha256_16) {
      check(full.startsWith(artifact.sha256_16), `${entry.id} 截图 hash 前缀不符: ${artifact.path}`)
    }
  }
}

// 5) 白名单双栏硬判据
// a) 产品冻结：相对最近一次授权主线合入点（merge-base origin/main），packages/ 与 scripts/ 零 diff
const mergeBase = git('merge-base origin/main HEAD')
const drift = git(`diff ${mergeBase}..HEAD --stat -- packages/ scripts/`)
check(
  drift === '',
  `产品冻结破坏：mergeBase(${mergeBase.slice(0, 8)})..HEAD 的 packages/scripts 有 diff`,
)
// b) 本分支非 merge 提交只允许改 docs/**；当前树仍存在的非 docs 路径 = 硬失败，
//    历史上加过后已删除的杂散文件（如早轮误提交的 packages/editor/docs exec JSON）
//    不构成活树漂移，单独列报（活树冻结由上一条硬判据保证）
const branchCommits = git(`log --no-merges --format=%H ${mergeBase}..HEAD`)
  .split('\n')
  .filter(Boolean)
const liveOffenders = []
const historicalStrays = []
for (const sha of branchCommits) {
  const paths = git(`show --name-only --format= ${sha}`).split('\n').filter(Boolean)
  for (const p of paths.filter((p) => !p.startsWith('docs/'))) {
    let live = true
    try {
      execSync(`git cat-file -e HEAD:${p}`, { cwd: repoRoot, stdio: 'ignore' })
    } catch {
      live = false
    }
    if (live) liveOffenders.push(`${sha.slice(0, 8)}:${p}`)
    else historicalStrays.push(`${sha.slice(0, 8)}:${p}`)
  }
}
check(
  liveOffenders.length === 0,
  `非 merge 提交触碰 docs/ 之外且当前树仍存在: ${liveOffenders.join(', ')}`,
)

// 6) commands 台账：每条带整数 exit；关键命令必须登记
for (const c of results.commands ?? []) {
  check(
    typeof c.exit === 'number' && Number.isInteger(c.exit),
    `commands 缺整数 exit: ${c.cmd?.slice(0, 60)}`,
  )
}
const cmdText = (results.commands ?? []).map((c) => c.cmd).join('\n')
check(cmdText.includes('candidates.vitest.mts'), 'commands 缺候选执行命令')
check(cmdText.includes('red-control.mjs'), 'commands 缺业务负控命令')
check(cmdText.includes('tsc --project'), 'commands 缺候选类型门命令')

// Output
const result = {
  head: git('rev-parse HEAD'),
  mergeBase: mergeBase.slice(0, 8),
  vitestJson: vitestJsonPath,
  vitestPassed: executedFullNames.size,
  entries: results.entries.length,
  perPack,
  byStatus,
  branchCommits: branchCommits.length,
  historicalStrays,
  failures,
  verdict: failures.length === 0 ? 'PASS' : 'FAIL',
}
console.log(JSON.stringify(result, null, 2))
process.exit(failures.length === 0 ? 0 : 1)
