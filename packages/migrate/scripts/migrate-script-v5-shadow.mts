/**
 * N3-1 experimental script-v5 shadow runner.
 *
 * 只从权威 v4 纯迁移构建 P2 IR，默认写入 gitignored shadow 根；
 * --check 使用临时目录并验证首次写入后第二次文件计划为 0/0/0。
 */

import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseP2ShadowCliArgs } from '../src/experimental/script-v5/shadow-cli.js'
import {
  assertP2ShadowBundle,
  buildDeterministicP2ShadowBundle,
} from '../src/experimental/script-v5/shadow-harness.js'
import {
  applyShadowFilePlan,
  planShadowFileWrite,
} from '../src/experimental/script-v5/shadow-writer.js'
import { loadPalBaseline } from '../src/migration-baseline.js'
import {
  assertProjectSnapshotCurrent,
  discoverProjectManagedFiles,
  loadProjectMigrationSnapshot,
} from '../src/migration-project-io.js'
import { buildPalMigration } from '../src/pal-migration.js'
import { loadPalMigrationSources } from '../src/pal-migration-io.js'
import {
  assertScriptControlFlowAudit,
  auditPalScriptControlFlow,
  type ScriptControlFlowAuditV1,
} from '../src/script-control-flow-audit.js'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const baselinePath = resolve(repo, 'packages/migrate/baselines/script-control-flow/pal-v1.json')
const fixedShadowRoot = resolve(repo, 'packages/migrate/.shadow/N3-1/v5/p2')
const args = process.argv.slice(2).filter((argument) => argument !== '--')
const options = parseP2ShadowCliArgs(args)
if (!existsSync(baselinePath)) throw new Error(`P0 基线不存在: ${baselinePath}`)

const sources = loadPalMigrationSources(repo)
const migration = buildPalMigration(sources)
const base = loadPalBaseline(repo)
if (!base) throw new Error('PAL v4 migration baseline 不存在')
const managed = discoverProjectManagedFiles(
  repo,
  new Set([...base.managedFiles, ...migration.managedFiles]),
)
const ours = loadProjectMigrationSnapshot(repo, managed)
const currentAudit = auditPalScriptControlFlow(sources, migration)
assertScriptControlFlowAudit(currentAudit)
const frozenAudit = JSON.parse(readFileSync(baselinePath, 'utf8')) as ScriptControlFlowAuditV1
const bundle = buildDeterministicP2ShadowBundle({
  migration,
  base,
  ours,
  currentAudit,
  frozenAudit,
})
assertP2ShadowBundle(bundle)

const check = options.check
const root = check ? mkdtempSync(resolve(tmpdir(), 'type-pal-script-v5-p2-')) : fixedShadowRoot
try {
  assertProjectSnapshotCurrent(repo, ours)
  assertP2ShadowBundle(bundle)
  const first = planShadowFileWrite(root, bundle.files)
  assertProjectSnapshotCurrent(repo, ours)
  assertP2ShadowBundle(bundle)
  applyShadowFilePlan(root, bundle.files, first)
  const second = planShadowFileWrite(root, bundle.files)
  if (second.summary.writes !== 0 || second.summary.deletes !== 0 || second.summary.conflicts !== 0)
    throw new Error(`P2 shadow second file plan is not zero: ${JSON.stringify(second.summary)}`)
  console.log(
    `[N3 P2 shadow] ${check ? 'check' : 'write'} artifacts=${bundle.files.size} ` +
      `first=${first.summary.writes}/${first.summary.deletes}/${first.summary.conflicts} ` +
      `second=0/0/0 digest=${bundle.digest}`,
  )
  if (!check) console.log(`[shadow] ${root}`)
} finally {
  if (check) rmSync(root, { recursive: true, force: true })
}
