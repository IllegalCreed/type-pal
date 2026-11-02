/**
 * TEST-GLM-EDITOR-PERSISTENCE-RECOVERY-1 · 饱和档案复现脚本。
 *
 * 重跑两项取证并落盘到本目录（覆盖 directed-fresh.json / coverage-family.json /
 * branch-inventory.json）：
 *   1. 定向+相邻家族测试 fresh 执行集（52 文件，JSON reporter，file×fullName×status）；
 *   2. 仅家族测试对 19 个范围源文件的 v8 分支覆盖率（summary + 0 计数臂清单）。
 *
 * 用法：node docs/ops/evidence/TEST-GLM-EDITOR-PERSISTENCE-RECOVERY-1/run-evidence.mjs
 * （须在仓库根执行；editor 包须已 pnpm install。）
 */
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const editorDir = resolve(here, '../../../../packages/editor')
const outDir = here
mkdirSync(outDir, { recursive: true })

const SCOPE_FILES = [
  'project-io.ts',
  'project-diagnostics.ts',
  'author-save-plan.ts',
  'author-save-prefix.ts',
  'author-save-journal.ts',
  'author-save-store.ts',
  'editor-history-coordinator.ts',
  'editor-history-participant.ts',
  'edit-session.ts',
  'project-copy-source.ts',
  'export-zip.ts',
  'file-system-access.ts',
  'fsa-copy.ts',
  'project-read-lock.ts',
  'open-actions.ts',
  'load-play-project.ts',
  'workspace-persistence.ts',
  'handle-store.ts',
  'author-disk-baseline.ts',
]

const FAMILY_TESTS = [
  'project-io.test.ts',
  'project-io.glm-p.test.ts',
  'project-io-admission.test.ts',
  'project-serialization-boundaries.test.ts',
  'project-open-workflows.test.ts',
  'project-read-admission.test.ts',
  'project-save-route.test.ts',
  'project-diagnostics.test.ts',
  'project-diagnostics.glm-p.test.ts',
  'author-save-plan.test.ts',
  'author-save-prefix.test.ts',
  'author-save-journal.test.ts',
  'author-save-store.test.ts',
  'author-save-conflict.test.ts',
  'save-batch-baseline.test.ts',
  'save-batch-open.test.ts',
  'save-batch-policy.test.ts',
  'save-batch-recovery.test.ts',
  'save-batch-storage.test.ts',
  'save-batch-writer.test.ts',
  'editor-history-coordinator.test.ts',
  'editor-history-foundations.test.ts',
  'editor-history-timeline.test.ts',
  'editor-history-paired-workflows.test.ts',
  'edit-session.test.ts',
  'project-copy.test.ts',
  'project-transfer-validation.test.ts',
  'zip.test.ts',
  'fsa-copy.test.ts',
  'file-system-access.test.ts',
  'project-leave-guard.test.ts',
  'open-actions.test.ts',
  'load-play-project.test.ts',
  'workspace-persistence.test.ts',
  'workspace-save-admission.test.ts',
  'workspace-open-identity.test.ts',
  'workspace-capability-lifecycle.test.ts',
  'workspace-final-boundaries.test.ts',
  'workspace-local-record.test.ts',
  'pal-save-identity.test.ts',
  'handle-store.test.ts',
  'handle-store-capability.test.ts',
  'save-as-boundaries.test.ts',
  'save-readback-boundaries.test.ts',
  'save-preflight-boundaries.test.ts',
  'clone.test.ts',
]

const ADJACENT_TESTS = [
  'open-local.test.ts',
  'item-authoring-workflows.test.ts',
  'battle-simulator-persistence.test.ts',
  'author-project-check.test.ts',
  'author-disk-baseline.pal.test.ts',
  'editor-asset-io.glm-p.test.ts',
]

function runVitest(args) {
  // 经登录 shell 中转解析 pnpm/node 的实际安装路径（nvm/corepack shim 不在受限 PATH 上）。
  const command = `pnpm exec vitest run ${args.join(' ')}`
  return execFileSync('/bin/zsh', ['-lc', command], {
    cwd: editorDir,
    env: { ...process.env, NODE_COMPILE_CACHE: '' },
    maxBuffer: 256 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}

function condenseDirected(rawJsonPath) {
  const report = JSON.parse(readFileSync(rawJsonPath, 'utf8'))
  const out = {
    numTotalTests: report.numTotalTests,
    numPassedTests: report.numPassedTests,
    numFailedTests: report.numFailedTests,
    numPendingTests: report.numPendingTests,
    success: report.success,
    files: [],
  }
  for (const file of report.testResults ?? []) {
    const entry = {
      file: file.name.split('editor/src/').at(-1) ?? file.name,
      status: file.status,
      tests: [],
    }
    for (const assertion of file.assertionResults ?? [])
      entry.tests.push({ fullName: assertion.fullName, status: assertion.status })
    out.files.push(entry)
  }
  return out
}

console.log('[1/2] directed fresh run (52 family+adjacent files)')
const directedRaw = join(outDir, '.directed-raw.json')
runVitest([
  '--maxWorkers=1',
  '--reporter=json',
  `--outputFile=${directedRaw}`,
  ...[...FAMILY_TESTS, ...ADJACENT_TESTS].map((name) => `src/core/${name}`),
])
const directed = condenseDirected(directedRaw)
const counts = {
  total: directed.numTotalTests,
  passed: directed.numPassedTests,
  failed: directed.numFailedTests,
}
writeFileSync(join(outDir, 'directed-fresh.json'), `${JSON.stringify(directed, null, 2)}\n`)
console.log('  directed:', JSON.stringify(counts))

console.log('[2/2] family-tests coverage over 19 scope files')
runVitest([
  '--coverage',
  '--maxWorkers=1',
  '--coverage.provider=v8',
  '--coverage.reporter=json',
  '--coverage.reporter=json-summary',
  ...SCOPE_FILES.map((name) => `--coverage.include=src/core/${name}`),
  ...FAMILY_TESTS.map((name) => `src/core/${name}`),
])
const final = JSON.parse(readFileSync(join(editorDir, 'coverage/coverage-final.json'), 'utf8'))
const summary = JSON.parse(readFileSync(join(editorDir, 'coverage/coverage-summary.json'), 'utf8'))
const perFile = {}
const arms = {}
for (const [path, cov] of Object.entries(final)) {
  const name = path.split('src/core/').at(-1) ?? path
  if (!SCOPE_FILES.some((scope) => name === scope)) continue
  const branchMap = cov.branchMap ?? {}
  // v8/istanbul 输出里 b 可能是数组或以 id 为键的对象；统一成 id -> 计数数组。
  const rawGroups = Array.isArray(cov.b) ? cov.b : Object.values(cov.b ?? {})
  const groups = rawGroups.map((counts) => counts.map((value) => Number(value)))
  const summaryBranches = summary[path]?.branches ?? {}
  perFile[name] = {
    branchGroups: groups.length,
    coveredTotal: `${summaryBranches.covered}/${summaryBranches.total}`,
    summaryPct: summaryBranches.pct,
  }
  const gaps = []
  for (let index = 0; index < groups.length; index += 1) {
    const counts = groups[index]
    if (!counts.some((value) => value === 0)) continue
    const loc = branchMap[String(index)] ?? branchMap[index]
    if (!loc) continue
    const start = loc.loc?.start
    if (!start || start.line === null || start.line === undefined) continue
    gaps.push({
      line: start.line,
      col: start.column,
      type: loc.type,
      kind: counts.every((value) => value === 0) ? 'unc' : 'prt',
      counts,
    })
  }
  if (gaps.length) arms[name] = gaps
}
const coverage = {
  kind: 'family-tests branch coverage (46 family test files)',
  provider: 'v8',
  scopeFiles: SCOPE_FILES.length,
  perFile,
  conclusion:
    '0-count arms are classified in dedup-ledger.md (existing proofs elsewhere / v8 artifacts / defense layers)',
}
writeFileSync(join(outDir, 'coverage-family.json'), `${JSON.stringify(coverage, null, 2)}\n`)
const inventory = {
  kind: '0-count branch arms under family-tests-only coverage',
  note: 'see dedup-ledger.md section 3 and coverage-fullsuite.json for the whole-suite appendix',
  arms,
}
writeFileSync(join(outDir, 'branch-inventory.json'), `${JSON.stringify(inventory, null, 2)}\n`)
console.log(
  '  scope files:',
  Object.keys(perFile).length,
  'files with 0-count arms:',
  Object.keys(arms).length,
)

for (const name of ['directed-fresh.json', 'coverage-family.json', 'branch-inventory.json']) {
  const bytes = readFileSync(join(outDir, name))
  console.log(`  sha256(${name}) = ${createHash('sha256').update(bytes).digest('hex')}`)
}
console.log('done.')
