/**
 * PAL current-only publication command.
 *
 * Default is a read-only plan. `--write` publishes content19/SAVE8, assets and the
 * current baseline in one recoverable transaction, then proves the same publication
 * produces a zero-diff plan. There is no bootstrap, intermediate epoch or old-project route.
 */

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateAssetCatalog } from '@type-pal/content'
import { assertPalBaselineSnapshotCurrent, loadPalBaseline } from '../src/migration-baseline.js'
import { createMigrationPlan, snapshotOf } from '../src/migration-plan.js'
import {
  assertProjectSnapshotCurrent,
  discoverProjectManagedFiles,
  loadProjectMigrationSnapshot,
} from '../src/migration-project-io.js'
import {
  commitMigrationTransaction,
  recoverMigrationTransaction,
} from '../src/migration-transaction.js'
import { buildMigrationTransactionChanges } from '../src/migration-write-plan.js'
import { materializePalAssets, planPalAssetRetirements } from '../src/pal-assets.js'
import {
  buildPalCurrentPublication,
  palAssetPreconditions,
  validatePalCurrentPublication,
} from '../src/pal-current-publication.js'
import { buildPalCurrentManifest } from '../src/pal-manifest.js'
import { loadPalMigrationSources } from '../src/pal-migration-io.js'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

function usage(): void {
  console.log(`Usage: pnpm --filter @type-pal/migrate migrate:content [--write]

No arguments  Build and validate the current publication plan without writing.
--write       Materialize assets and publish current content + baseline atomically.
--help        Show this help.`)
}

const args = new Set(process.argv.slice(2))
if (args.has('--help')) {
  usage()
  process.exit(0)
}
const unknown = [...args].filter((arg) => arg !== '--write')
if (unknown.length) throw new Error(`未知参数: ${unknown.join(', ')}`)
const write = args.has('--write')

recoverMigrationTransaction(repo)
const baseline = loadPalBaseline(repo)
if (!baseline)
  throw new Error(
    '缺 current PAL baseline；开发期不支持从历史工程 bootstrap，请重新生成 current baseline',
  )

console.log('读取 PAL 原始源并构建 current publication…')
const sources = loadPalMigrationSources(repo)
const publication = buildPalCurrentPublication(baseline, sources)
const manifest = buildPalCurrentManifest(sources.assetCatalog)

const projectManaged = discoverProjectManagedFiles(
  repo,
  new Set([...baseline.managedFiles, ...publication.managedFiles]),
)
const project = loadProjectMigrationSnapshot(repo, projectManaged)
const plan = createMigrationPlan(baseline, project, publication)
if (plan.conflicts.length) {
  const sample = plan.conflicts.slice(0, 20).map((conflict) => `${conflict.file}${conflict.path}`)
  throw new Error(
    `current publication 有 ${plan.conflicts.length} 个三方合并冲突:\n${sample.join('\n')}`,
  )
}

const targetPublication = {
  ...publication,
  files: plan.target,
  managedFiles: new Set(plan.target.keys()),
}
const currentCatalog = validateAssetCatalog(project.files.get('assets/index.json'))
const targetCatalog = validateAssetCatalog(plan.target.get('assets/index.json'))
const retiredAssets = planPalAssetRetirements({
  repo,
  previousCatalog: currentCatalog,
  targetCatalog,
})
const validation = validatePalCurrentPublication({
  publication: targetPublication,
  manifest,
  sources,
})
console.log(
  `current plan: managed=${plan.summary.managed} writes=${plan.summary.writes} ` +
    `deletes=${plan.summary.deletes} conflicts=0 asset-deletes=${retiredAssets.length}`,
)
console.log(
  `closure: scenes=${validation.scenes} maps=${validation.maps} assets=${validation.assets} ` +
    `reference-warnings=${validation.referenceWarnings} asset-warnings=${validation.assetWarnings}`,
)
if (!write) {
  console.log('dry-run 完成；使用 --write 发布。')
  process.exit(0)
}

assertPalBaselineSnapshotCurrent(repo, baseline)
assertProjectSnapshotCurrent(repo, project, publication.managedFiles)
const assetResult = materializePalAssets({
  repo,
  catalog: targetCatalog,
  binaries: sources.binaryAssets,
})
const nextBaseline = snapshotOf(publication)
const changes = buildMigrationTransactionChanges({
  repo,
  plan,
  previousBaseline: baseline,
  nextBaseline,
  retiredAssets,
  nextManifest: manifest,
  manifestPreconditions: palAssetPreconditions(targetPublication),
})
commitMigrationTransaction(repo, changes)

const publishedManifest = JSON.parse(
  readFileSync(resolve(repo, 'projects/pal/manifest.json'), 'utf8'),
) as unknown
if (JSON.stringify(publishedManifest) !== JSON.stringify(manifest))
  throw new Error('发布后 manifest 与 canonical generator 输出不一致')

const publishedBaseline = loadPalBaseline(repo)
if (!publishedBaseline) throw new Error('发布后 current baseline 丢失')
const publishedManaged = discoverProjectManagedFiles(
  repo,
  new Set([...publishedBaseline.managedFiles, ...publication.managedFiles]),
)
const publishedProject = loadProjectMigrationSnapshot(repo, publishedManaged)
const replay = createMigrationPlan(publishedBaseline, publishedProject, publication)
const replayRetiredAssets = planPalAssetRetirements({
  repo,
  previousCatalog: validateAssetCatalog(publishedProject.files.get('assets/index.json')),
  targetCatalog: validateAssetCatalog(replay.target.get('assets/index.json')),
})
if (
  replay.conflicts.length ||
  replay.writes.size ||
  replay.deletes.length ||
  replayRetiredAssets.length
)
  throw new Error(
    `发布后非零差异: writes=${replay.writes.size} deletes=${replay.deletes.length} ` +
      `conflicts=${replay.conflicts.length} asset-deletes=${replayRetiredAssets.length}`,
  )
console.log(
  `assets: files=${assetResult.files} written=${assetResult.written} unchanged=${assetResult.unchanged} bytes=${assetResult.bytes}`,
)
console.log(
  `published: transaction-changes=${changes.length}; replay writes=0 deletes=0 conflicts=0 asset-deletes=0`,
)
