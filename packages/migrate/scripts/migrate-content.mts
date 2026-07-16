/**
 * MG2 PAL 内容迁移 IO 壳。默认只生成 plan；只有 --write 会改工程与 baseline。
 * 首次无 baseline 时必须先 --bootstrap 逐项闭合差异，禁止将当前工程冒充 base。
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isDeepStrictEqual } from 'node:util'
import type { AssetCatalogV1, LoadedManifest } from '@type-pal/content'
import { validateAssetCatalog } from '@type-pal/content'
import {
  isAtomicProjectMapPath,
  loadPalBaseline,
  type MigrationSnapshot,
  snapshotFileHash,
  snapshotFilePresent,
} from '../src/migration-baseline.js'
import {
  applyBootstrapReport,
  type BootstrapReportV1,
  createBootstrapReport,
  verifyBootstrapReport,
} from '../src/migration-bootstrap.js'
import {
  createInitialMigrationPlan,
  createMigrationPlan,
  type MigrationPlan,
  snapshotOf,
} from '../src/migration-plan.js'
import {
  assertHashMapsEqual,
  assertProjectSnapshotCurrent,
  discoverProjectManagedFiles,
  hashUnmanagedProjectFiles,
  loadProjectMigrationSnapshot,
  type ProjectMigrationSnapshot,
} from '../src/migration-project-io.js'
import {
  commitMigrationTransaction,
  recoverMigrationTransaction,
} from '../src/migration-transaction.js'
import { validatePalMigrationTarget } from '../src/migration-validate.js'
import { buildMigrationTransactionChanges } from '../src/migration-write-plan.js'
import { materializePalAssets, type PalBinaryAssetSource } from '../src/pal-assets.js'
import { buildPalMigration, type MigrationFileSet } from '../src/pal-migration.js'
import { loadPalMigrationSources } from '../src/pal-migration-io.js'
import { normalizeMigrationScriptFiles } from '../src/script-library-normalize.js'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const BOOTSTRAP_REL = 'packages/migrate/bootstrap/pal.json'
const CONFLICT_REL = '.type-pal-migrate/pal-conflicts.json'

const readJson = <T,>(path: string): T => JSON.parse(readFileSync(resolve(repo, path), 'utf8')) as T
const writeJson = (path: string, value: unknown): void => {
  const full = resolve(repo, path)
  mkdirSync(dirname(full), { recursive: true })
  writeFileSync(full, `${JSON.stringify(value, null, 2)}\n`)
}

function usage(): void {
  console.log(`PAL 内容迁移(MG2)

  pnpm --filter @type-pal/migrate run migrate:content
      有 baseline 时只生成三方合并 plan，不写盘。

  pnpm --filter @type-pal/migrate run migrate:content -- --write
      plan 无冲突且门禁全过后，同事务写工程与纯 theirs baseline。

  pnpm --filter @type-pal/migrate run migrate:content -- --bootstrap
      首次无 baseline 时生成/校验 ${BOOTSTRAP_REL}，不写工程。

  pnpm --filter @type-pal/migrate run migrate:content -- --bootstrap --write
      bootstrap 差异全部分类闭合后，建立首份 baseline 并事务写盘。`)
}

function sameSnapshot(expected: MigrationSnapshot, actual: MigrationSnapshot, label: string): void {
  const managed = new Set([...expected.managedFiles, ...actual.managedFiles])
  for (const path of managed) {
    if (isAtomicProjectMapPath(path)) {
      if (
        snapshotFilePresent(expected, path) !== snapshotFilePresent(actual, path) ||
        snapshotFileHash(expected, path) !== snapshotFileHash(actual, path)
      )
        throw new Error(`${label}不符: ${path}`)
      continue
    }
    if (
      expected.files.has(path) !== actual.files.has(path) ||
      !isDeepStrictEqual(expected.files.get(path), actual.files.get(path))
    )
      throw new Error(`${label}不符: ${path}`)
  }
}

function reportGeneration(theirs: MigrationFileSet): void {
  const audit = theirs.report.audit
  console.log(
    `[纯生成] 托管文件 ${theirs.managedFiles.size} · 场景 ${theirs.report.scenes.scenes} · ` +
      `chunk ${[...theirs.managedFiles].filter((path) => path.startsWith('content/scripts/') && path !== 'content/scripts/index.json').length} ` +
      `· boss overlay ${theirs.report.bossOverlay.attached}`,
  )
  const entryNormalization = theirs.report.scenes.entryNormalization
  if (entryNormalization)
    console.log(
      `[落点归一化] 静态坐标 ${entryNormalization.staticCommands} · 唯一组 ${entryNormalization.uniqueTargets} · ` +
        `默认 ${entryNormalization.defaultTargets} · 命名 ${entryNormalization.namedTargets} · ` +
        `缺目标 ${entryNormalization.unresolvedCommands}`,
    )
  console.log(
    `[脚本门禁] compact ${audit.ratios.normalized.toFixed(2)}x · pretty ${audit.ratios.pretty.toFixed(2)}x · ` +
      `commands ${audit.ratios.commands.toFixed(2)}x · closure ${audit.maxDependencyClosureBytes}B`,
  )
  console.log(
    `[过场资产] videos=${theirs.report.assets.videos} ` +
      `frame-animations=${theirs.report.assets.frameAnimations} frames=${theirs.report.assets.frames} ` +
      `legacy-palette-map=${JSON.stringify(theirs.report.assets.legacyPaletteByFrameAnimation)}`,
  )
}

function reportPlan(
  plan: Pick<MigrationPlan, 'writes' | 'deletes' | 'conflicts'> & {
    summary?: MigrationPlan['summary']
  },
): void {
  console.log(
    `[迁移 plan] writes=${plan.writes.size} deletes=${plan.deletes.length} conflicts=${plan.conflicts.length}`,
  )
  if (plan.summary)
    console.log(
      `[合并分类] generated=${plan.summary.generated} kept=${plan.summary.kept} merged=${plan.summary.merged}`,
    )
}

function reportValidation(validation: ReturnType<typeof validatePalMigrationTarget>): void {
  const refs = validation.spriteReferences.channels
  console.log(
    `[写前门禁] scenes=${validation.scenes} ref-warnings=${validation.referenceWarnings} script-issues=0 ` +
      `sprite-defs=${refs.definitions.total}/${refs.definitions.migrated} ` +
      `sprite-refs=entities:${refs.entities.total}/${refs.entities.migrated},` +
      `actors:${refs.actors.total}/${refs.actors.migrated},` +
      `setActorSprite:${refs.setActorSprite.total}/${refs.setActorSprite.migrated},` +
      `setActorAppearance:${refs.setActorAppearance.total}/${refs.setActorAppearance.migrated} ` +
      `asset-refs=${validation.assetReferences} asset-warnings=${validation.assetWarnings}`,
  )
}

function writeConflictReport(plan: MigrationPlan): void {
  writeJson(CONFLICT_REL, {
    version: 1,
    summary: plan.summary,
    conflicts: plan.conflicts,
  })
  console.error(`[冲突] 完整三值报告已写入 ${CONFLICT_REL}`)
  for (const conflict of plan.conflicts.slice(0, 20))
    console.error(`  ${conflict.file}${conflict.path} (${conflict.type})`)
}

async function commitAndVerify(args: {
  ours: ProjectMigrationSnapshot
  target: MigrationSnapshot
  plan: Pick<MigrationPlan, 'writes' | 'deletes'>
  previousBaseline?: MigrationSnapshot
  theirs: MigrationFileSet
  binaryAssets: readonly PalBinaryAssetSource[]
}): Promise<void> {
  const { ours, target, plan, previousBaseline, theirs } = args
  const nextBaseline = snapshotOf(theirs)
  const transactionManaged = new Set([...ours.managedFiles, ...target.managedFiles])
  assertProjectSnapshotCurrent(repo, ours, transactionManaged)
  const unmanagedBefore = hashUnmanagedProjectFiles(repo, transactionManaged)
  const changes = buildMigrationTransactionChanges({
    repo,
    plan,
    previousBaseline,
    nextBaseline,
  })
  if (changes.length) commitMigrationTransaction(repo, changes)
  console.log(`[事务] ${changes.length ? `已提交 ${changes.length} 项操作` : '无需写盘'}`)

  const unmanagedAfter = hashUnmanagedProjectFiles(repo, transactionManaged)
  assertHashMapsEqual(unmanagedBefore, unmanagedAfter, '非托管工程文件')
  const baselineAfter = loadPalBaseline(repo)
  if (!baselineAfter) throw new Error('事务完成后 baseline 缺失')
  sameSnapshot(nextBaseline, baselineAfter, 'baseline 与纯 theirs')

  const postManaged = discoverProjectManagedFiles(repo, target.managedFiles)
  const projectAfter = loadProjectMigrationSnapshot(repo, postManaged)
  sameSnapshot(target, projectAfter, '写盘工程与合并 target')

  const catalog = validateAssetCatalog(
    target.files.get('assets/index.json') as AssetCatalogV1,
    'PAL 迁移 target assets/index.json',
  )
  const materialized = materializePalAssets({
    repo,
    catalog,
    binaries: args.binaryAssets,
  })
  console.log(
    `[资源物化] files=${materialized.files} bytes=${materialized.bytes} ` +
      `writes=${materialized.written} unchanged=${materialized.unchanged} authored=${materialized.authored}`,
  )

  // 真正重读提取源并重跑纯生成，不用上一轮内存结果冒充幂等。
  const sources2 = loadPalMigrationSources(repo)
  const theirs2 = buildPalMigration(sources2)
  sameSnapshot(nextBaseline, snapshotOf(theirs2), '二次纯生成')
  const secondManaged = discoverProjectManagedFiles(
    repo,
    new Set([...baselineAfter.managedFiles, ...theirs2.managedFiles]),
  )
  const ours2 = loadProjectMigrationSnapshot(repo, secondManaged)
  const second = createMigrationPlan(baselineAfter, ours2, theirs2)
  if (second.writes.size || second.deletes.length || second.conflicts.length)
    throw new Error(
      `二次迁移非空计划: writes=${second.writes.size} deletes=${second.deletes.length} conflicts=${second.conflicts.length}`,
    )
  console.log('[幂等] 二次迁移 writes=0 deletes=0 conflicts=0')
}

async function main(): Promise<void> {
  const flags = new Set(process.argv.slice(2).filter((flag) => flag !== '--'))
  if (flags.has('--help') || flags.has('-h')) {
    usage()
    return
  }
  const unknown = [...flags].filter((flag) => flag !== '--write' && flag !== '--bootstrap')
  if (unknown.length) throw new Error(`未知参数: ${unknown.join(', ')}`)
  const write = flags.has('--write')
  const bootstrap = flags.has('--bootstrap')

  if (recoverMigrationTransaction(repo)) console.log('[恢复] 已完成上次中断的同一迁移事务')
  const sources = loadPalMigrationSources(repo)
  const theirs = buildPalMigration(sources)
  reportGeneration(theirs)
  const baseline = loadPalBaseline(repo)
  if (baseline && bootstrap) throw new Error('已存在 baseline，不得重跑首次 bootstrap')

  const seed = new Set([...(baseline?.managedFiles ?? []), ...theirs.managedFiles])
  const managed = discoverProjectManagedFiles(repo, seed)
  const ours = loadProjectMigrationSnapshot(repo, managed)
  const manifest = readJson<LoadedManifest>('projects/pal/manifest.json')

  if (!baseline) {
    if (!bootstrap)
      throw new Error(`PAL baseline 不存在；请先运行 --bootstrap 并审查 ${BOOTSTRAP_REL}`)
    if (!existsSync(resolve(repo, BOOTSTRAP_REL))) {
      const report = createBootstrapReport(ours, theirs)
      writeJson(BOOTSTRAP_REL, report)
      console.log(`[bootstrap] 已生成 ${report.differences.length} 项差异: ${BOOTSTRAP_REL}`)
      console.log('[bootstrap] 请逐项填写 resolution + reason；未闭合前不会写工程或 baseline')
      return
    }
    const report = readJson<BootstrapReportV1>(BOOTSTRAP_REL)
    const status = verifyBootstrapReport(ours, theirs, report)
    console.log(
      `[bootstrap] differences=${status.differences} unresolved=${status.unresolved} upstream-overlay=${status.upstreamOverlays}`,
    )
    if (!write) return

    const applied = applyBootstrapReport(ours, theirs, report)
    const normalizedFiles = normalizeMigrationScriptFiles(applied.files)
    const target: MigrationSnapshot = {
      files: normalizedFiles,
      managedFiles: new Set([...applied.managedFiles, ...normalizedFiles.keys()]),
    }
    const validation = validatePalMigrationTarget({
      files: target.files,
      managedFiles: target.managedFiles,
      sources,
      startWorld: manifest.startWorld,
      assets: manifest.assets,
      entryPoints: manifest.entryPoints,
    })
    reportValidation(validation)
    const plan = createInitialMigrationPlan(ours, target)
    reportPlan({ ...plan, conflicts: [] })
    await commitAndVerify({
      ours,
      target,
      plan,
      theirs,
      binaryAssets: sources.binaryAssets,
    })
    return
  }

  const plan = createMigrationPlan(baseline, ours, theirs)
  reportPlan(plan)
  if (plan.conflicts.length) {
    writeConflictReport(plan)
    process.exitCode = 1
    return
  }
  const target: MigrationSnapshot = {
    files: plan.target,
    managedFiles: new Set([...managed, ...plan.target.keys()]),
  }
  const validation = validatePalMigrationTarget({
    files: target.files,
    managedFiles: target.managedFiles,
    sources,
    startWorld: manifest.startWorld,
    assets: manifest.assets,
    entryPoints: manifest.entryPoints,
  })
  reportValidation(validation)
  if (!write) {
    console.log('[dry-run] 未写盘；确认 plan 后加 --write')
    return
  }
  await commitAndVerify({
    ours,
    target,
    plan,
    previousBaseline: baseline,
    theirs,
    binaryAssets: sources.binaryAssets,
  })
}

main().catch((error: unknown) => {
  console.error(`[migrate:content] 失败: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
