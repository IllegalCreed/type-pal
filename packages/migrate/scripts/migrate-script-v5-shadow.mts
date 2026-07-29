/**
 * N3-1 experimental script-v5 shadow runner.
 *
 * 只从权威 v4 纯迁移构建累计 P2-P7，默认构建最新 P7 canonical 发布目标并写入 gitignored shadow 根；
 * --check 使用临时目录并验证首次写入后第二次文件计划为 0/0/0。
 */

import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { planP7ShadowReleaseTransaction } from '../src/experimental/script-v5/p7-publish.js'
import {
  assertP7ShadowBundle,
  buildDeterministicP7ShadowBundle,
} from '../src/experimental/script-v5/p7-shadow.js'
import { reconstructPublishedV4TransitionSnapshots } from '../src/experimental/script-v5/published-v4-snapshot.js'
import { parseScriptV5ShadowCliArgs } from '../src/experimental/script-v5/shadow-cli.js'
import {
  assertP2ShadowBundle,
  assertP3ShadowBundle,
  assertP4ShadowBundle,
  assertP5ShadowBundle,
  assertP6ShadowBundle,
  buildDeterministicP2ShadowBundle,
  buildDeterministicP3ShadowBundle,
  buildDeterministicP4ShadowBundle,
  buildDeterministicP5ShadowBundle,
  buildDeterministicP6ShadowBundle,
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
import {
  commitMigrationTransaction,
  recoverMigrationTransaction,
} from '../src/migration-transaction.js'
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
if (options.publish) recoverMigrationTransaction(repo)
const phase = options.through.toUpperCase() as 'P2' | 'P3' | 'P4' | 'P5' | 'P6' | 'P7'
const fixedShadowRoot = resolve(repo, `packages/migrate/.shadow/N3-1/v5/${options.through}`)
if (!existsSync(baselinePath)) throw new Error(`P0 基线不存在: ${baselinePath}`)

const sources = loadPalMigrationSources(repo)
const migration = buildPalMigration(sources)
const publishedBase = loadPalBaseline(repo)
if (!publishedBase) throw new Error('PAL migration baseline 不存在')
const managed = discoverProjectManagedFiles(
  repo,
  new Set([...publishedBase.managedFiles, ...migration.managedFiles]),
)
const publishedOurs = loadProjectMigrationSnapshot(repo, managed)
const snapshots = options.rebuildPublished
  ? reconstructPublishedV4TransitionSnapshots(repo, migration, publishedBase)
  : { base: publishedBase, ours: publishedOurs }
const { base, ours } = snapshots
const currentAudit = auditPalScriptControlFlow(sources, migration)
assertScriptControlFlowAudit(currentAudit)
const frozenAudit = JSON.parse(readFileSync(baselinePath, 'utf8')) as ScriptControlFlowAuditV1
const common = { migration, base, ours, currentAudit, frozenAudit }
const sourceCommands = sources.allJson.segments.flatMap((segment) => segment.commands)
const currentManifest = JSON.parse(
  readFileSync(resolve(repo, 'projects/pal/manifest.json'), 'utf8'),
) as
  | import('@type-pal/content').LegacyManifestV4
  | import('@type-pal/content').ProjectManifest<5>
  | import('@type-pal/content').ProjectManifest<6>
  | import('@type-pal/content').ProjectManifest<7>
  | import('@type-pal/content').ProjectManifest<8>
if (options.publish && currentManifest.contentVersion !== 4)
  throw new Error('P7 historical publish 只接受真实 contentVersion 4 源工程')
if (
  options.rebuildPublished &&
  ((currentManifest.contentVersion !== 5 &&
    currentManifest.contentVersion !== 6 &&
    currentManifest.contentVersion !== 7 &&
    currentManifest.contentVersion !== 8) ||
    !publishedBase.baselineMetadata?.transitions['script-v4-v5'])
)
  throw new Error(
    '--rebuild-published 只接受已发布且带 script-v4-v5 transition 的 v5/v6/v7/v8 工程',
  )
const manifest = options.rebuildPublished
  ? ({
      ...structuredClone(currentManifest),
      contentVersion: 4,
      content: {
        ...structuredClone(currentManifest.content),
        scripts: 'content/scripts/',
        sharedScripts: undefined,
      },
      migrations: undefined,
    } as unknown as import('@type-pal/content').LegacyManifestV4)
  : (currentManifest as import('@type-pal/content').LegacyManifestV4)
const bundle =
  options.through === 'p2'
    ? buildDeterministicP2ShadowBundle(common)
    : options.through === 'p3'
      ? buildDeterministicP3ShadowBundle({ ...common, sourceCommands })
      : options.through === 'p4'
        ? buildDeterministicP4ShadowBundle({ ...common, sourceCommands })
        : options.through === 'p5'
          ? buildDeterministicP5ShadowBundle({ ...common, sourceCommands })
          : options.through === 'p6'
            ? buildDeterministicP6ShadowBundle({ ...common, sourceCommands })
            : buildDeterministicP7ShadowBundle({ ...common, sourceCommands, manifest })
const assertBundle =
  options.through === 'p2'
    ? assertP2ShadowBundle
    : options.through === 'p3'
      ? assertP3ShadowBundle
      : options.through === 'p4'
        ? assertP4ShadowBundle
        : options.through === 'p5'
          ? assertP5ShadowBundle
          : options.through === 'p6'
            ? assertP6ShadowBundle
            : assertP7ShadowBundle
assertBundle(bundle)

const check = options.check
const root = check
  ? mkdtempSync(resolve(tmpdir(), `type-pal-script-v5-${options.through}-`))
  : fixedShadowRoot
try {
  assertProjectSnapshotCurrent(repo, publishedOurs)
  assertBundle(bundle)
  const first = planShadowFileWrite(root, bundle.files)
  assertProjectSnapshotCurrent(repo, publishedOurs)
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
  if (check && options.rebuildPublished) {
    const release = planP7ShadowReleaseTransaction({
      repo,
      bundle: bundle as import('../src/experimental/script-v5/p7-shadow.js').P7ShadowBundle,
      currentProjectManaged: managed,
      currentBaselineManaged: publishedBase.managedFiles,
    })
    console.log(
      `[N3 P7 rebuild plan] project=${release.summary.projectWrites}/${release.summary.projectDeletes} ` +
        `baseline=${release.summary.baselineWrites}/${release.summary.baselineDeletes} ` +
        `manifest=${release.summary.manifestWrites} changes=${release.changes.length}`,
    )
    console.log(
      `[N3 P7 rebuild targets] ${release.changes
        .slice(0, 20)
        .map((change) => `${change.content === undefined ? 'D' : 'W'}:${change.target}`)
        .join(' ')}`,
    )
  }
  if (!check) console.log(`[shadow] ${root}`)
  if (options.publish) {
    if (options.through !== 'p7') throw new Error('P7 publish: 非 P7 bundle')
    assertProjectSnapshotCurrent(repo, publishedOurs)
    const release = planP7ShadowReleaseTransaction({
      repo,
      bundle: bundle as import('../src/experimental/script-v5/p7-shadow.js').P7ShadowBundle,
      currentProjectManaged: managed,
      currentBaselineManaged: publishedBase.managedFiles,
    })
    commitMigrationTransaction(repo, release.changes)
    const repeated = planP7ShadowReleaseTransaction({
      repo,
      bundle: bundle as import('../src/experimental/script-v5/p7-shadow.js').P7ShadowBundle,
      currentProjectManaged: managed,
      currentBaselineManaged: publishedBase.managedFiles,
    })
    if (repeated.changes.length !== 0)
      throw new Error(`P7 publish: 提交后二次计划非零 ${repeated.changes.length}`)
    console.log(
      `[N3 P7 publish] project=${release.summary.projectWrites}/${release.summary.projectDeletes} ` +
        `baseline=${release.summary.baselineWrites}/${release.summary.baselineDeletes} ` +
        `manifest=${release.summary.manifestWrites} repeat=0`,
    )
  }
} finally {
  if (check) rmSync(root, { recursive: true, force: true })
}
