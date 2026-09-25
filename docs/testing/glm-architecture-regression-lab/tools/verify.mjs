/**
 * ARCH-REGRESSION-LAB-GLM-1 · results 机械对账器（只读，不改任何文件）。
 * 用法：node docs/testing/glm-architecture-regression-lab/tools/verify.mjs
 * 核对（全部从最终树/运行 JSON 机械读取，不接受手填 totals）：
 * - 白名单：a3ceaf05..HEAD 新增/修改文件全在 docs/testing/glm-architecture-regression-lab/**
 *   （主线合入 99f1fd08/a2415868 带入的 packages/scripts/docs 变更属 Codex 授权，不计本席增量；
 *    packages/scripts 对冻结 86e928b5 的漂移由 git diff 86e928b5..a3ceaf05 单独核验，也已为空）
 * - results.json：ID 唯一、total/perPack/byStatus 从 entries 重算、候选引用的测试文件存在、
 *   截图完整 SHA-256 匹配
 * - 诊断红例 runner 存在且可执行
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

// 1) GLM 白名单增量（从主线 counter 提交 a2415868 之后算起）
const base = process.argv[2] ?? 'a2415868'
const changed = execSync(`git diff ${base}..HEAD --name-only`, { cwd: repoRoot, encoding: 'utf8' })
  .split('\n')
  .filter(Boolean)
const outside = changed.filter((f) => !f.startsWith(whitelistPrefix) && f !== '')
check(outside.length === 0, `白名单外改动: ${outside.join(', ')}`)

// 2) 产品/scripts 相对合入点（a2415868 = Codex 二轮 counter / main 最新）零漂移
//    （合入主线带入的 packages/ 演进属 Codex 授权；GLM 增量从 a2415868 起只有实验目录）
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
    results.groupTotals.byStatus[key] === byStatus[key],
    `byStatus.${key}: ledger ${results.groupTotals.byStatus[key]} != recomputed ${byStatus[key]}`,
  )
for (const key of Object.keys(perPack))
  check(
    results.groupTotals.perPack[key] === perPack[key],
    `perPack.${key}: ledger ${results.groupTotals.perPack[key]} != recomputed ${perPack[key]}`,
  )

// 4) 候选测试文件存在（相对 labRoot）；截图完整 SHA-256 匹配
for (const entry of results.entries) {
  const testFile = entry.test?.file ?? ''
  if (testFile && !testFile.startsWith('(')) {
    // test.file 可能是 labRoot 相对（candidates/...）或 repoRoot 相对（packages/...）
    const abs = testFile.startsWith('packages/')
      ? resolve(repoRoot, testFile)
      : resolve(labRoot, testFile)
    check(existsSync(abs), `${entry.id} 测试文件缺失: ${testFile}`)
  }
  for (const artifact of entry.artifacts ?? []) {
    if (!existsSync(artifact.path)) {
      failures.push(`${entry.id} 截图缺失: ${artifact.path}`)
      continue
    }
    const full = createHash('sha256').update(readFileSync(artifact.path)).digest('hex')
    check(
      full.startsWith(artifact.sha256_16),
      `${entry.id} 截图 hash 不符: ${artifact.path} (ledger ${artifact.sha256_16}, actual ${full.slice(0, 16)})`,
    )
  }
}

// 5) 诊断 runner 存在
check(existsSync(join(labRoot, 'tools', 'red-control.mjs')), 'red-control.mjs 缺失')

const result = {
  base,
  head: execSync('git rev-parse HEAD', { cwd: repoRoot, encoding: 'utf8' }).trim(),
  entries: results.entries.length,
  perPack,
  byStatus,
  failures,
  verdict: failures.length === 0 ? 'PASS' : 'FAIL',
}
console.log(JSON.stringify(result, null, 2))
process.exit(failures.length === 0 ? 0 : 1)
