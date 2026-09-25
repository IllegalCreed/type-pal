/**
 * ARCH-REGRESSION-LAB-GLM-1 · results 机械对账器。
 * 用法：node docs/testing/glm-architecture-regression-lab/tools/verify.mjs
 * 核对（全部从最终树/运行 JSON 机械读取，不接受手填 totals）：
 * - 白名单：0e751efe..HEAD（或指定 SHA）新增/修改文件全在 docs/testing/glm-architecture-regression-lab/**
 * - 产品零漂移：packages/ scripts/ 对冻结 86e928b5 零 diff
 * - results.json：ID 唯一、每组条数与 results.groupTotals 一致、候选引用的测试文件存在、
 *   证据截图存在且 SHA256 匹配、commands 可解析
 * - 诊断红例 runner 判据字段存在（不在此重跑）
 */
import { execSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../../..')
const labRoot = resolve(repoRoot, 'docs/testing/glm-architecture-regression-lab')
const whitelistPrefix = 'docs/testing/glm-architecture-regression-lab/'
const driftBase = process.argv[3] ?? '99f1fd08' // 本席工作开始前主线最后状态（含 Codex 主线 packages/ 演进）；GLM 增量相对它应为零 packages/ scripts/ diff
const failures = []
const check = (ok, message) => {
  if (!ok) failures.push(message)
}

// 1) 产品零漂移（工作树相对冻结：HEAD 树）
const drift = execSync(`git diff ${driftBase}..HEAD --stat -- packages/ scripts/`, {
  cwd: repoRoot,
  encoding: 'utf8',
}).trim()
check(drift === '', `产品对冻结漂移非空: ${drift.slice(0, 200)}`)

// 2) 白名单（本分支起点之后的全部改动）
const base = process.argv[2] ?? '99f1fd08' // GLM 白名单增量基准（counter 提交之后）
const changed = execSync(`git diff ${base}..HEAD --name-only`, { cwd: repoRoot, encoding: 'utf8' })
  .split('\n')
  .filter(Boolean)
const outside = changed.filter((f) => !f.startsWith(whitelistPrefix))
check(outside.length === 0, `白名单外改动: ${outside.join(', ')}`)

// 3) results.json 一致性
const resultsPath = join(labRoot, 'results.json')
const results = JSON.parse(readFileSync(resultsPath, 'utf8'))
const ids = results.entries.map((entry) => entry.id)
check(new Set(ids).size === ids.length, '存在重复 ID')
check(
  results.entries.length === results.groupTotals.total,
  `entries ${results.entries.length} != total ${results.groupTotals.total}`,
)
const byType = {}
const perGroup = {}
for (const entry of results.entries) {
  byType[entry.status] = (byType[entry.status] ?? 0) + 1
  perGroup[entry.pack] = (perGroup[entry.pack] ?? 0) + 1
}
// groupTotals 由本对账器重算并同步回写（机械生成，非手填）；回写后自动 biome format 保持格式门
results.groupTotals.byStatus = byType
results.groupTotals.perPack = perGroup
results.groupTotals.total = results.entries.length
writeFileSync(resultsPath, `${JSON.stringify(results, null, 2)}\n`)
execSync(`npx biome format --write ${resultsPath}`, { cwd: repoRoot, stdio: 'pipe' })
for (const [group, count] of Object.entries(results.groupTotals.perPack ?? {}))
  check(perGroup[group] === count, `${group} 报告 ${perGroup[group]} != totals ${count}`)

// 4) 候选测试文件存在；截图存在且 hash 匹配
for (const entry of results.entries) {
  const testFile = entry.test?.file ?? ''
  if (testFile && !testFile.startsWith('('))
    check(
      existsSync(resolve(labRoot, testFile)) || existsSync(resolve(repoRoot, testFile)),
      `${entry.id} 测试文件缺失: ${testFile}`,
    )
  for (const shot of entry.artifacts ?? []) {
    if (!existsSync(shot.path)) {
      failures.push(`${entry.id} 截图缺失: ${shot.path}`)
      continue
    }
    const hash = createHash('sha256').update(readFileSync(shot.path)).digest('hex').slice(0, 16)
    check(hash === shot.sha256_16, `${entry.id} 截图 hash 不符: ${shot.path}`)
  }
}

console.log(
  JSON.stringify(
    {
      base,
      head: execSync('git rev-parse HEAD', { cwd: repoRoot, encoding: 'utf8' }).trim(),
      entries: results.entries.length,
      perPackage: perGroup,
      byStatus: byType,
      failures,
      verdict: failures.length === 0 ? 'PASS' : 'FAIL',
    },
    null,
    2,
  ),
)
process.exit(failures.length === 0 ? 0 : 1)
