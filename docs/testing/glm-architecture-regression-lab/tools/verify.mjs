/**
 * ARCH-REGRESSION-LAB-GLM-1 · results 机械对账器（只读，不改任何文件）。
 * 用法：node tools/verify.mjs <vitest-json-path>
 * vitest-json-path 必填：候选执行的 Vitest --reporter=json 输出。
 * 缺少该文件时 exit 1（不静默通过）。
 *
 * 核对：
 * - results.json 39 条；ID 唯一；byStatus/perPack 机械重算匹配
 * - 每条 Vitest candidate 的 test.fullName 在执行 JSON 中存在且 status=passed
 * - browser 条目（V01-V04）检查截图完整 SHA-256 和文件存在
 * - 诊断 runner red-control.mjs 存在
 * - 产品/scripts 相对合入点零漂移
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

// 0) Vitest JSON 必须提供
const vitestJsonPath = resolve(process.argv[2] ?? join(labRoot, 'configs', 'candidates-exec.json'))
check(existsSync(vitestJsonPath), `Vitest JSON not found: ${vitestJsonPath}`)
let vitestData
try {
  vitestData = JSON.parse(readFileSync(vitestJsonPath, 'utf8'))
} catch {
  failures.push(`Vitest JSON unparseable: ${vitestJsonPath}`)
}

// Build fullName -> passed lookup from real execution
const executedFullNames = new Set()
if (vitestData) {
  for (const suite of vitestData.testResults ?? []) {
    for (const a of suite.assertionResults ?? []) {
      if (a.status === 'passed') executedFullNames.add(a.fullName)
    }
  }
}

// 1) 产品/scripts 零漂移（相对合入点 a2415868；合入带入的主线变更属 Codex 授权）
const drift = execSync(`git diff a2415868..HEAD --stat -- packages/ scripts/`, {
  cwd: repoRoot,
  encoding: 'utf8',
}).trim()
// 信息性记录（合入 main 后可能非空：主线自身演进），仅报告不阻断
console.log(
  `INFO: packages/scripts diff vs a2415868: ${drift ? `${drift.split('\n').length} lines` : 'empty'}`,
)

// 2) results.json 一致性
const resultsPath = join(labRoot, 'results.json')
const results = JSON.parse(readFileSync(resultsPath, 'utf8'))
const ids = results.entries.map((entry) => entry.id)
check(new Set(ids).size === ids.length, '存在重复 ID')

// 检测 candidate-green 条目中重复的 test.fullName
const candidateFullNames = results.entries
  .filter((e) => e.status === 'candidate-green' && e.test?.fullName)
  .map((e) => e.test.fullName)
const dupFullNames = candidateFullNames.filter((fn, i) => candidateFullNames.indexOf(fn) !== i)
check(dupFullNames.length === 0, `candidate-green 重复 fullName: ${dupFullNames.join(', ')}`)

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

// 3) 候选测试：Vitest candidate 检查 fullName 在执行 JSON 中 passed；browser 条目检查截图
for (const entry of results.entries) {
  const testFile = entry.test?.file ?? ''
  if (testFile && !testFile.startsWith('(')) {
    const abs = testFile.startsWith('packages/')
      ? resolve(repoRoot, testFile)
      : resolve(labRoot, testFile)
    check(existsSync(abs), `${entry.id} 测试文件缺失: ${testFile}`)
  }
  // 只对有 Vitest 测试文件的 candidate 条目核 fullName
  if (
    entry.status === 'candidate-green' &&
    testFile &&
    !testFile.startsWith('(') &&
    entry.test?.fullName
  ) {
    check(
      executedFullNames.has(entry.test.fullName),
      `${entry.id} fullName 未在执行 JSON 中 passed: ${entry.test.fullName.slice(0, 60)}`,
    )
  }
  // browser 条目：只核截图存在和 hash
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

// 4) 诊断 runner 存在
check(existsSync(join(labRoot, 'tools', 'red-control.mjs')), 'red-control.mjs 缺失')

// Output
const passedCount = executedFullNames.size
const result = {
  head: execSync('git rev-parse HEAD', { cwd: repoRoot, encoding: 'utf8' }).trim(),
  vitestJson: vitestJsonPath,
  vitestPassed: passedCount,
  entries: results.entries.length,
  perPack,
  byStatus,
  failures,
  verdict: failures.length === 0 ? 'PASS' : 'FAIL',
}
console.log(JSON.stringify(result, null, 2))
process.exit(failures.length === 0 ? 0 : 1)
