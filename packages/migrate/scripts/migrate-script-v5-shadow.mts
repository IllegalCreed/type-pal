/**
 * N3-1 experimental script-v5 shadow runner.
 *
 * 只从权威 v4 纯迁移构建累计 P2/P3/P4 IR，默认构建最新 P4 并写入 gitignored shadow 根；
 * --check 使用临时目录并验证首次写入后第二次文件计划为 0/0/0。
 */

import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseScriptV5ShadowCliArgs } from '../src/experimental/script-v5/shadow-cli.js'
import {
  assertP2ShadowBundle,
  assertP3ShadowBundle,
  assertP4ShadowBundle,
  buildDeterministicP2ShadowBundle,
  buildDeterministicP3ShadowBundle,
  buildDeterministicP4ShadowBundle,
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
const args = process.argv.slice(2).filter((argument) => argument !== '--')
const options = parseScriptV5ShadowCliArgs(args)
const phase = options.through.toUpperCase() as 'P2' | 'P3' | 'P4'
const fixedShadowRoot = resolve(repo, `packages/migrate/.shadow/N3-1/v5/${options.through}`)
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
const common = { migration, base, ours, currentAudit, frozenAudit }
const sourceCommands = sources.allJson.segments.flatMap((segment) => segment.commands)
const bundle =
  options.through === 'p2'
    ? buildDeterministicP2ShadowBundle(common)
    : options.through === 'p3'
      ? buildDeterministicP3ShadowBundle({ ...common, sourceCommands })
      : buildDeterministicP4ShadowBundle({ ...common, sourceCommands })
const assertBundle =
  options.through === 'p2'
    ? assertP2ShadowBundle
    : options.through === 'p3'
      ? assertP3ShadowBundle
      : assertP4ShadowBundle
assertBundle(bundle)

const check = options.check
const root = check
  ? mkdtempSync(resolve(tmpdir(), `type-pal-script-v5-${options.through}-`))
  : fixedShadowRoot
try {
  assertProjectSnapshotCurrent(repo, ours)
  assertBundle(bundle)
  const first = planShadowFileWrite(root, bundle.files)
  assertProjectSnapshotCurrent(repo, ours)
  assertBundle(bundle)
  applyShadowFilePlan(root, bundle.files, first)
  const second = planShadowFileWrite(root, bundle.files)
  if (second.summary.writes !== 0 || second.summary.deletes !== 0 || second.summary.conflicts !== 0)
    throw new Error(
      `${phase} shadow second file plan is not zero: ${JSON.stringify(second.summary)}`,
    )
  console.log(
    `[N3 ${phase} shadow] ${check ? 'check' : 'write'} artifacts=${bundle.files.size} ` +
      `first=${first.summary.writes}/${first.summary.deletes}/${first.summary.conflicts} ` +
      `second=0/0/0 digest=${bundle.digest}`,
  )
  if (!check) console.log(`[shadow] ${root}`)
} finally {
  if (check) rmSync(root, { recursive: true, force: true })
}
