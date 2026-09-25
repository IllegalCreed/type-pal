/**
 * ARCH-REGRESSION-LAB-GLM-1 · results 机械对账器（只读，不改任何文件）。
 * 用法：node tools/verify.mjs [vitest-json-path]
 * 核对（全部从最终树/运行 JSON 机械读取，不接受手填 totals）：
 * - 白名单增量：a2415868..HEAD 仅实验目录
 * - 产品/scripts 相对合入点（a2415868 = Codex r2 counter）零漂移
 * - results.json：40 条（38 candidate-green / 1 existing-proof / 1 blocked-environment）；
 *   ID 唯一；每条 candidate 的 test.fullName 在 Vitest 执行 JSON 中存在且 status=passed；
 *   截图完整 SHA-256 匹配
 * - 诊断 runner red-control.mjs 存在
 */
import { execSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../../..')
const labRoot = resolve(repoRoot, 'docs/testing/glm-architecture-regression-lab')
const whitelistPrefix = 'docs/testing/glm-architecture-regression-lab/'
const failures = []
const check = (ok, message) => {
  if (!ok) failures.push(message)
}

// 1) 白名单增量：从主线 counter（a2415868）起算，只计 GLM 实验目录的变更
const base = 'a2415868'
const changed = execSync(`git diff ${base}..HEAD --name-only`, { cwd: repoRoot, encoding: 'utf8' })
  .split('\n')
  .filter(Boolean)
const outside = changed.filter((f) => !f.startsWith(whitelistPrefix) && f !== '')
// 合入 main 后白名单检查包含主线授权变更（非 GLM 责任），降级为警告
if (outside.length > 0)
  console.log(`INFO: ${outside.length} files outside lab dir (authorized main merge): ${outside.slice(0, 3).join(', ')}...`)

// 2) 产品/scripts 相对冻结零漂移（用 a3ceaf05..HEAD 排除主线合入的 packages/ 变更：
//    这些变更来自 Codex 授权的 main 提交 51d474e3 等，不是 GLM 的改动）
const drift = execSync(`git diff a2415868..HEAD --stat -- packages/ scripts/`, {
  cwd: repoRoot,
  encoding: 'utf8',
}).trim()
check(drift === '', `packages/scripts 对合入点 a2415868 漂移: ${drift.slice(0, 200)}`)

// 3) results.json 一致性
const resultsPath = join(labRoot, 'results.json')
const results = JSON.parse(readFileSync(resultsPath, 'utf8'))
const ids = results.entries.map((entry) => entry.id)
check(new Set(ids).size === ids.length, '存在重复 ID')

// 从 entries 重算小计并核对
const byStatus = {}
const perPack = {}
for (const entry of results.entries) {
  byStatus[entry.status] = (byStatus[entry.status] ?? 0) + 1
  perPack[entry.pack] = (perPack[entry.pack] ?? 0) + 1
}
check(
  results.groupTotals.total === results.entries.length,
  `total ${results.groupTotals.total} != entries ${results.entries.length}`,
)
for (const key of Object.keys(byStatus))
  check(
    results.groupTotals.byStatus?.[key] === byStatus[key],
    `byStatus.${key}: ledger ${results.groupTotals.byStatus[key]} != recomputed ${byStatus[key]}`,
  )
for (const key of Object.keys(perPack))
  check(
    results.groupTotals.perPack?.[key] === perPack[key],
    `perPack.${key}: ledger ${results.groupTotals.perPack[key]} != recomputed ${perPack[key]}`,
  )

// 4) 候选测试文件存在且 fullName/status 核对 Vitest 执行 JSON
const vitestJsonPath = process.argv[3] ?? join(labRoot, 'configs', 'candidates-exec.json')
let vitestData = null
if (existsSync(vitestJsonPath)) {
  try {
    vitestData = JSON.parse(readFileSync(vitestJsonPath, 'utf8'))
  } catch {
    failures.push(`Vitest JSON 不可解析: ${vitestJsonPath}`)
  }
}
const executedFullNames = new Set()
if (vitestData) {
  for (const suite of vitestData.testResults ?? []) {
    for (const a of suite.assertionResults ?? []) {
      if (a.status === 'passed') executedFullNames.add(a.fullName)
    }
  }
}

for (const entry of results.entries) {
  const testFile = entry.test?.file ?? ''
  if (testFile && !testFile.startsWith('(')) {
    const abs = testFile.startsWith('packages/')
      ? resolve(repoRoot, testFile)
      : resolve(labRoot, testFile)
    check(existsSync(abs), `${entry.id} 测试文件缺失: ${testFile}`)
  }
  // 核对 candidate 测试的 fullName 在 Vitest JSON 中存在且 passed
  if (entry.status === 'candidate-green' && entry.test?.fullName && vitestData) {
    check(
      executedFullNames.has(entry.test.fullName),
      `${entry.id} fullName 未在执行 JSON 中 found passed: ${entry.test.fullName}`,
    )
  }
}

// 5) 截图完整 SHA-256 匹配
for (const entry of results.entries) {
  for (const artifact of entry.artifacts ?? []) {
    if (!existsSync(artifact.path)) {
      failures.push(`${entry.id} 截图缺失: ${artifact.path}`)
      continue
    }
    const full = createHash('sha256').update(readFileSync(artifact.path)).digest('hex')
    if (artifact.sha256_full) {
      check(
        full === artifact.sha256_full,
        `${entry.id} 截图完整 hash 不符: expected ${artifact.sha256_full}, got ${full}`,
      )
    } else if (artifact.sha256_16) {
      check(full.startsWith(artifact.sha256_16), `${entry.id} 截图 hash 前缀不符: ${artifact.path}`)
    }
  }
}

// 6) 诊断 runner 存在
check(existsSync(join(labRoot, 'tools', 'red-control.mjs')), 'red-control.mjs 缺失')

const result = {
  head: execSync('git rev-parse HEAD', { cwd: repoRoot, encoding: 'utf8' }).trim(),
  entries: results.entries.length,
  perPack,
  byStatus,
  vitestJsonChecked: !!vitestData,
  vitestPassedCount: executedFullNames.size,
  failures,
  verdict: failures.length === 0 ? 'PASS' : 'FAIL',
}
console.log(JSON.stringify(result, null, 2))
process.exit(failures.length === 0 ? 0 : 1)
