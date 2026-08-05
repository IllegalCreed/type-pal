/**
 * MG2 PAL 内容迁移 IO 壳。默认只生成 plan；只有 --write 会改工程与 baseline。
 * 首次无 baseline 时必须先 --bootstrap 逐项闭合差异，禁止将当前工程冒充 base。
 */

import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isDeepStrictEqual } from 'node:util'
import { PAL_CASUALTY_LOCALE_KEYS } from '../src/pal-casualty-scripts.js'
import type {
  AssetCatalogV1,
  CurrentManifest,
  LoadedManifest,
  ProjectManifest,
} from '@type-pal/content'
import {
  checkSharedScriptLibraryV5,
  mapAssetById,
  upgradeManifestV9ToV10,
  upgradeManifestV10ToV11,
  validateActors,
  validateAssetCatalog,
  validateBattleFields,
  validateBattleSprites,
  validateEnemies,
  validateItemsV5,
  validateLocale,
  validateManifestAssetConfigV3,
  validateMapIndex,
  validateMigrationDiagnostics,
  validateScenesV5,
  validateSkills,
  validateSprites,
  validateStampTemplates,
  validateStartWorldResources,
  validateTilesets,
} from '@type-pal/content'
import type { FileSource } from '../../reforge/src/file-source.js'
import { loadProjectMigrationRegistryV5 } from '../../reforge/src/save/migration.js'
import { projectMigrationV9ToLegacyV8 } from '../src/experimental/script-v5/equip-battle-sprite-v8-authority.js'
import {
  buildP7GeneratedCanonical,
  type P7GeneratedCanonical,
} from '../src/experimental/script-v5/p7-generated.js'
import {
  createR13ConfirmV5MigrationPlan,
  R13_CONFIRM_SEAL_PATH,
  type R13ConfirmV5MigrationPlan,
  rebuildR13ConfirmSealAuthority,
} from '../src/experimental/script-v5/r13-confirm-mg2.js'
import { repairMissingR13ConfirmSeal } from '../src/experimental/script-v5/r13-confirm-seal-repair.js'
import {
  completeR13EnemyScriptSourceInputs,
  createR13EnemyScriptV5MigrationPlan,
  prepareR13EnemyScriptAuthority,
  prepareR13EnemyScriptSourceAugmentation,
  type R13EnemyScriptV5MigrationPlan,
} from '../src/experimental/script-v5/r13-enemy-script-mg2.js'
import {
  compactCurrentMigrationForR13SourceSemantics,
  createR13SourceSemanticsV5MigrationPlan,
  digestR13SourceSemanticsMigrationInput,
  digestR13SourceSemanticsMigrationInputFast,
  projectR13SourceSemanticsGenerated,
  type R13SourceSemanticsDispositionInput,
  type R13SourceSemanticsV5MigrationPlan,
  registerR13SourceSemanticsMigrationInputDigest,
} from '../src/experimental/script-v5/r13-source-semantics-mg2.js'
import {
  createR13ZMigrationPlan,
  type R13ZMigrationPlan,
  resolveR13ZSourceSemanticsClosure,
} from '../src/experimental/script-v5/r13-z-transition-mg2.js'
import {
  assertR13RuntimeCapabilityAudit,
  auditR13RuntimeCapabilities,
} from '../src/experimental/script-v5/runtime-capability-audit.js'
import { prepareR13SourceExecutionCensus } from '../src/experimental/script-v5/source-execution-census.js'
import {
  assertR13SourceInstructionDispositionV3,
  buildR13SourceInstructionDispositionV3,
  projectR13SourceDispositionGenerated,
  type R13SourceInstructionDispositionBuildArgs,
} from '../src/experimental/script-v5/source-instruction-disposition.js'
import {
  assertPalBaselineSnapshotCurrent,
  isAtomicProjectMapPath,
  loadPalBaseline,
  loadPalBaselineRepairCandidate,
  type MigrationSnapshot,
  serializeMigrationJson,
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
import {
  formatPalBattleSpriteReport,
  formatPalWorldSpriteReport,
  materializePalAssets,
  type PalBinaryAssetSource,
} from '../src/pal-assets.js'
import { preparePalManifest } from '../src/pal-manifest.js'
import {
  buildPalHistoricalR13_4V9Migration,
  buildPalHistoricalR13_5V10Migration,
  buildPalMigration,
  derivePalMigrationFileSet,
  type MigrationFileSet,
  type MigrationJson,
  type PalMigrationSources,
  palSoundAssetForSources,
} from '../src/pal-migration.js'
import { loadPalMigrationSources } from '../src/pal-migration-io.js'
import { applyPalR13SixBLoadSceneTransitions } from '../src/pal-r13-six-b-load-scene.js'
import { applyPalR13SixBSceneOverlays } from '../src/pal-r13-six-b-overlays.js'
import { rewindPalR13SixBPublication } from '../src/pal-r13-six-b-rewind.js'
import {
  buildR13SixCSeal,
  installR13SixCSeal,
  rewindPalR13SixCPublicationIfPresent,
} from '../src/pal-r13-six-c.js'
import { R13_SOURCE_SEMANTICS_TRANSITION_ID } from '../src/experimental/script-v5/r13-source-semantics-mg2.js'
import {
  assertScriptControlFlowAudit,
  auditPalScriptControlFlow,
  type ScriptControlFlowAuditV1,
} from '../src/script-control-flow-audit.js'
import { normalizeMigrationScriptFiles } from '../src/script-library-normalize.js'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const BOOTSTRAP_REL = 'packages/migrate/bootstrap/pal.json'
const CONFLICT_REL = '.type-pal-migrate/pal-conflicts.json'
const SCRIPT_AUDIT_BASELINE_REL = 'packages/migrate/baselines/script-control-flow/pal-v1.json'
const INTERNAL_PHASE_ENV = 'TYPE_PAL_MIGRATE_INTERNAL_PHASE'
const EXPECTED_SOURCE_DIGEST_ENV = 'TYPE_PAL_MIGRATE_EXPECTED_SOURCE_DIGEST'
const EXPECTED_RUNTIME_DIGEST_ENV = 'TYPE_PAL_MIGRATE_EXPECTED_RUNTIME_DIGEST'
const EXPECTED_TARGET_CONTENT_VERSION_ENV = 'TYPE_PAL_MIGRATE_EXPECTED_TARGET_CONTENT_VERSION'
const EXPECTED_TRANSITION_ENV = 'TYPE_PAL_MIGRATE_EXPECTED_TRANSITION'
type CanonicalV5InputManifest =
  | ProjectManifest<5>
  | ProjectManifest<6>
  | ProjectManifest<7>
  | ProjectManifest<8>
  | ProjectManifest<9>
  | ProjectManifest<10>
  | ProjectManifest<11>
type P7V5TargetManifest = ProjectManifest<9> | ProjectManifest<10> | ProjectManifest<11>
type CanonicalV5Transition = 'confirm' | 'r13-enemy' | 'r13-source'

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
      plan 无冲突且门禁全过后，同事务写工程与纯 theirs baseline；随后在全新
      Node 进程中重建并验证二次计划严格为 0/0/0。

  pnpm --filter @type-pal/migrate run migrate:content -- --bootstrap
      首次无 baseline 时生成/校验 ${BOOTSTRAP_REL}，不写工程。

  pnpm --filter @type-pal/migrate run migrate:content -- --bootstrap --write
      bootstrap 差异全部分类闭合后，建立首份 baseline 并事务写盘。

  pnpm --filter @type-pal/migrate run migrate:content -- --repair-r13-confirm-seal
      只在已发布 state 仍完整、r13-confirm seal 正文单独缺失时，从 immutable
      authority 双摘要重建，并以单项 baseline 事务补回正文。

  pnpm --filter @type-pal/migrate run migrate:content -- --r13-z [--write]
      只运行 R13-Z source/runtime 发布闭包；默认只审计，--write 才向 baseline
      append-only 追加 R13-Z seal，不改工程正文或 manifest。`)
}

async function runCanonicalV5Phase(
  flag: '--write-once' | '--verify-idempotence',
  extraEnv: NodeJS.ProcessEnv = {},
): Promise<string> {
  const entry = process.argv[1]
  if (!entry) throw new Error('canonical v5 子进程缺当前脚本入口')
  const child = spawn(process.execPath, [...process.execArgv, entry, flag], {
    cwd: repo,
    env: {
      ...process.env,
      [INTERNAL_PHASE_ENV]: '1',
      ...extraEnv,
    },
    stdio: ['inherit', 'pipe', 'pipe'],
  })
  let output = ''
  child.stdout.setEncoding('utf8')
  child.stderr.setEncoding('utf8')
  child.stdout.on('data', (chunk: string) => {
    process.stdout.write(chunk)
    output = `${output}${chunk}`.slice(-64 * 1024)
  })
  child.stderr.on('data', (chunk: string) => process.stderr.write(chunk))
  return await new Promise<string>((resolvePhase, rejectPhase) => {
    child.once('error', rejectPhase)
    child.once('exit', (code, signal) => {
      if (code === 0) resolvePhase(output)
      else
        rejectPhase(
          new Error(
            `canonical v5 ${flag} 子进程失败: ` +
              (signal ? `signal=${signal}` : `exit=${String(code)}`),
          ),
        )
    })
  })
}

async function writeAndVerifyCanonicalV5Transition(
  transition: CanonicalV5Transition,
  targetContentVersion: 9 | 10,
): Promise<void> {
  const phaseEnv = {
    [EXPECTED_TARGET_CONTENT_VERSION_ENV]: String(targetContentVersion),
    [EXPECTED_TRANSITION_ENV]: transition,
  }
  const writeOutput = await runCanonicalV5Phase('--write-once', phaseEnv)
  const evidence = /\[v5 首轮证据\] source=([0-9a-f]{64}) runtime=([0-9a-f]{64})/.exec(writeOutput)
  if (!evidence) throw new Error(`canonical v5 ${transition} 写入子进程未返回首轮 R13 证据`)
  await runCanonicalV5Phase('--verify-idempotence', {
    ...phaseEnv,
    [EXPECTED_SOURCE_DIGEST_ENV]: evidence[1]!,
    [EXPECTED_RUNTIME_DIGEST_ENV]: evidence[2]!,
  })
  console.log(`[v5 分进程幂等] ${transition} 写入与二次 0/0/0 验证均完成`)
}

/**
 * R13-6B 只改变 canonical skill data 与 contentVersion；不改变 SAVE_VERSION，
 * 也不把 transient screen transaction 写进 world/save。沿用标准三值 merge 事务，
 * 因此作者在 R13-6A 后的内容编辑仍会被保留并在有冲突时停在 plan 门禁。
 */
async function runR13SixBTransition(
  manifest: ProjectManifest<10> | ProjectManifest<11>,
  manifestText: string,
  write: boolean,
): Promise<void> {
  const sources = loadPalMigrationSources(repo)
  const baseline = loadPalBaseline(repo)
  if (!baseline)
    throw new Error('R13-6B 缺 PAL baseline v2；不得绕过 baseline 写 generated content')
  const theirs = buildR13SixBMigration(sources, baseline)
  reportGeneration(theirs)
  const seed = new Set([...baseline.managedFiles, ...theirs.managedFiles])
  const managed = discoverProjectManagedFiles(repo, seed)
  const ours = loadProjectMigrationSnapshot(repo, managed)
  const plan = createMigrationPlan(baseline, ours, theirs)
  reportPlan(plan)
  if (plan.conflicts.length) {
    writeConflictReport(plan)
    throw new Error(`R13-6B plan 存在 conflicts=${plan.conflicts.length}`)
  }
  const target: MigrationSnapshot = {
    files: plan.target,
    managedFiles: new Set([...managed, ...plan.target.keys()]),
  }
  validateAssetCatalog(
    target.files.get('assets/index.json') as unknown as AssetCatalogV1,
    'R13-6B target assets/index.json',
  )
  const nextManifest: CurrentManifest =
    manifest.contentVersion === 10 ? upgradeManifestV10ToV11(manifest) : structuredClone(manifest)
  await validateP7V5Target(target, nextManifest)
  if (!write) {
    assertPalBaselineSnapshotCurrent(repo, baseline)
    assertProjectSnapshotCurrent(repo, ours, target.managedFiles)
    if (readFileSync(resolve(repo, 'projects/pal/manifest.json'), 'utf8') !== manifestText)
      throw new Error('R13-6B dry-run 期间 manifest.json 已变更')
    console.log('[R13-6B dry-run] 未写盘；确认 plan 后加 --write')
    return
  }
  await commitAndVerify({
    ours,
    target,
    plan,
    previousBaseline: baseline,
    theirs,
    binaryAssets: sources.binaryAssets,
    currentManifestText: manifestText,
    nextManifest,
    rebuildTheirs: buildR13SixBMigration,
  })
  console.log(
    manifest.contentVersion === 10
      ? '[R13-6B publication] content10 → content11；SAVE_VERSION 保持 8'
      : '[R13-6B publication] content11 successor refresh；SAVE_VERSION 保持 8',
  )
}

/**
 * R13-Z is an evidence-only publication after the content11 successor.  Rebuild the source
 * disposition from live extracted input with the explicit throw-site gate, then let the new
 * authority append a seal to the baseline.  No project file or manifest is a publication target.
 */
async function runR13ZTransition(
  manifestText: string,
  write: boolean,
  r13SixC: boolean,
): Promise<void> {
  const baseline = loadPalBaseline(repo)
  if (!baseline) throw new Error('R13-Z 缺 PAL baseline v2')
  const sources = loadPalMigrationSources(repo)
  const currentMigration = buildR13SixBMigration(sources, baseline)
  // R13 source semantics was published on the 6A surface. Rewind only the append-only 6B
  // overlay before replaying its existing-schema authority; runtime is audited separately on
  // the live content11 baseline below.
  // R13-6C(零内容叶 successor authority)先剥离,再剥 6B —— 逐字节还原 6A 面。
  const sourceBaseline = rewindPalR13SixBPublication(
    rewindPalR13SixCPublicationIfPresent(baseline),
  )
  const currentManaged = discoverProjectManagedFiles(
    repo,
    new Set([...baseline.managedFiles, ...currentMigration.managedFiles]),
  )
  const ours = loadProjectMigrationSnapshot(repo, currentManaged)

  // The source report deliberately keeps the pre-R13-6B translation input and generated
  // projection, but its final target is the actual 6B successor. Existing-schema evidence
  // rewinds only the published 6A-owned leaves for historical proofs; otherwise the source
  // ledger would report every 6B-authored item/skill/scene target as "missing final target".
  const historicalSources = loadPalMigrationSources(repo)
  const historicalRawMigration = buildPalHistoricalR13_4V9Migration(historicalSources)
  const historicalMigration = projectMigrationV9ToLegacyV8(historicalRawMigration)
  const historicalAudit = auditPalScriptControlFlow(historicalSources, historicalMigration)
  assertScriptControlFlowAudit(historicalAudit)
  const preparedHistoricalSourceCensus = prepareR13SourceExecutionCensus(historicalSources)
  const frozenAudit = readJson<ScriptControlFlowAuditV1>(SCRIPT_AUDIT_BASELINE_REL)
  const generated = buildP7GeneratedCanonical({
    migration: historicalMigration,
    currentAudit: historicalAudit,
    frozenAudit,
    sourceCommands: historicalSources.allJson.segments.flatMap((segment) => segment.commands),
    itemSources: historicalSources.migrate.items,
    magicSources: historicalSources.migrate.magic,
    objectMagicSources: historicalSources.migrate.objectMagics ?? [],
    sourceCensus: preparedHistoricalSourceCensus.census,
    soundAssetForNum: palSoundAssetForSources(historicalSources),
  })

  const r13FiveSources = loadPalMigrationSources(repo)
  const r13FiveMigration = buildPalHistoricalR13_5V10Migration(r13FiveSources)
  const r13Five = prepareR13EnemyScriptSourceAugmentation({
    generated,
    historicalMigration,
    currentSources: r13FiveSources,
    currentMigration: r13FiveMigration,
  })
  const sourceMigration = buildPalMigration(sources)
  const preparedCurrentSourceCensus = prepareR13SourceExecutionCensus(sources)
  const sixAClosure = resolveR13ZSourceSemanticsClosure(sourceBaseline)

  // B11-1/pal-palette-resolution 证据需要引用当前 canonical 的氛围定义(day/warm),
  // 但 ambiences.json 是 authored 文件、不在 baseline managedFiles。把它并入
  // successorFinal 快照,证据才能绑定实际染色定义。
  const successorFiles = new Map(currentMigration.files)
  const ambienceDefsPath = resolve(repo, 'projects/pal/content/ambiences.json')
  successorFiles.set(
    'content/ambiences.json',
    JSON.parse(readFileSync(ambienceDefsPath, 'utf8')) as MigrationJson,
  )
  const sourceDispositionBuild: R13SourceInstructionDispositionBuildArgs = {
    sources: historicalSources,
    migration: historicalMigration,
    audit: historicalAudit,
    generated: projectR13SourceDispositionGenerated(r13Five.successorGenerated),
    final: sixAClosure.augmentationSnapshot,
    successorFinal: {
      files: successorFiles,
      managedFiles: currentMigration.managedFiles,
    },
    r13EnemyClosure: {
      sourceDisposition: r13Five.augmentation.enemySourceDisposition,
      currentSources: sources,
      currentMigration: sourceMigration,
      augmentationEvidence: r13Five.augmentation.evidence,
    },
    r13ExistingSchemaClosure: {
      currentSources: sources,
      currentMigration: sourceMigration,
      augmentationEvidence: sixAClosure.augmentationEvidence,
      augmentationSnapshot: sixAClosure.augmentationSnapshot,
      preparedCurrentSourceCensus,
    },
    preparedSourceCensus: preparedHistoricalSourceCensus,
    bindIndirectEntityBodies: true,
    bindItemThrowSourceSites: true,
    bindItemUnusableUseSourceSites: true,
    bindDomainProjectionSourceSites: true,
    bindOwnerSourceSites: true,
    bindSpriteActionSourceSites: true,
    r13SixCLossyClosure: r13SixC,
  }
  const r13z = createR13ZMigrationPlan({
    base: baseline,
    ours,
    sourceDispositionBuild,
    runtimeFinal: baseline,
  })
  if (r13SixC) {
    // R13-6C 与 R13-Z 同一事务发布:先装 6C seal(记录三条 lossy closure 账务,
    // 零内容叶),再装 R13-Z seal;两 seal 独立 transition、独立 rewind。
    const parentDigest = baseline.baselineMetadata?.transitions[R13_SOURCE_SEMANTICS_TRANSITION_ID]
    if (!parentDigest) throw new Error('R13-6C publication: 缺 R13 source-semantics metadata')
    const sixCSeal = buildR13SixCSeal(parentDigest, r13z.authority.sourceDisposition)
    installR13SixCSeal(r13z.nextBaseline, sixCSeal)
    console.log(`[R13-6C publication] seal=${sixCSeal.digest} lossyClosed=3`)
  }
  reportR13ZPlan(r13z)
  if (!write) {
    assertPalBaselineSnapshotCurrent(repo, baseline)
    assertProjectSnapshotCurrent(repo, ours, currentManaged)
    if (readFileSync(resolve(repo, 'projects/pal/manifest.json'), 'utf8') !== manifestText)
      throw new Error('R13-Z dry-run 期间 manifest.json 已变更')
    console.log('[R13-Z dry-run] 未写盘；确认 authority 后加 --write')
    return
  }
  const changes = buildMigrationTransactionChanges({
    repo,
    plan: r13z.plan,
    previousBaseline: baseline,
    nextBaseline: r13z.nextBaseline,
  })
  if (changes.length) commitMigrationTransaction(repo, changes)
  const after = loadPalBaseline(repo)
  if (!after) throw new Error('R13-Z 事务完成后 baseline 缺失')
  sameSnapshot(r13z.nextBaseline, after, 'R13-Z baseline')
  console.log(
    `[R13-Z publication] mode=${r13z.sealMode} seal=${r13z.seal.digest} ` +
      `writes=${r13z.plan.writes.size} deletes=${r13z.plan.deletes.length}`,
  )
}

function reportR13ZPlan(result: R13ZMigrationPlan): void {
  if (result.plan.writes.size || result.plan.deletes.length || result.plan.conflicts.length)
    throw new Error(
      `R13-Z 正式计划必须为空 writes=${result.plan.writes.size} ` +
        `deletes=${result.plan.deletes.length} conflicts=${result.plan.conflicts.length}`,
    )
  const source = result.authority.sourceDisposition
  const runtime = result.authority.runtimeCapability
  console.log(
    `[R13-Z 源指令账] sites=${source.summary.executionSites} ` +
      `open=${source.summary.openDebtSites}/${source.summary.openObservations} ` +
      `digest=${source.digest}`,
  )
  console.log(
    `[R13-Z 运行时矩阵] cells=${runtime.summary.cells} uses=${runtime.summary.uses} ` +
      `refused=${runtime.summary.refusedUses} issues=${runtime.summary.openIssues} ` +
      `digest=${runtime.digest}`,
  )
}

/**
 * R13-6B 是 R13-6A 已发布 canonical 的 append-only successor。raw build 仍承担
 * 历史父层生成，不能拿它覆盖已发布的 R13-3～6A 场景/脚本；这里只投影本卡拥有的
 * skills.json、经 structural path 再核对的 loadScene source profile，以及四组 0x76 transaction；
 * 其余字段逐字继承已验签 baseline。
 */
function buildR13SixBMigration(
  sources: PalMigrationSources,
  publishedBaseline: MigrationSnapshot,
): MigrationFileSet {
  const raw = buildPalMigration(sources, { r13SixBSourceSemantics: true })
  const skills = raw.files.get('content/skills.json')
  if (skills === undefined) throw new Error('R13-6B raw migration 缺 content/skills.json')
  let files = new Map(publishedBaseline.files)
  for (const path of publishedBaseline.managedFiles) {
    if (files.has(path)) continue
    const generated = raw.files.get(path)
    if (generated === undefined)
      throw new Error(`R13-6B raw migration 无法重建 baseline 托管文件 ${path}`)
    files.set(path, generated)
  }
  files.set('content/skills.json', skills)
  // B11-1 casualty 数据面:actors.json(coveredBy + casualty)与 locale(伤亡台词
  // dlg.13470-13512)是 R13-6B successor 新增的托管文件,必须随 6B 一起投影,
  // 否则 canonical 运行时看不到伤亡脚本。
  const casualtyActors = raw.files.get('content/actors.json')
  const casualtyLocale = raw.files.get('content/locale.json')
  if (casualtyActors === undefined || casualtyLocale === undefined)
    throw new Error('R13-6B raw migration 缺 B11-1 casualty 内容文件')
  files.set('content/actors.json', casualtyActors)
  // locale 是 append-only:以已发布 baseline 的键序为底,只把 casualty 台词键
  // (dlg.13470-13512)追加到末尾;禁止用 raw 覆盖/重排 baseline 键 —— rewind 才能
  // 通过删除这 36 个键逐字节还原 6A locale。
  const baselineLocale = publishedBaseline.files.get('content/locale.json')
  if (!isRecord(baselineLocale) || !isRecord(casualtyLocale))
    throw new Error('R13-6B published baseline 缺 content/locale.json')
  const mergedLocale: Record<string, unknown> = { ...baselineLocale }
  for (const key of PAL_CASUALTY_LOCALE_KEYS) {
    const value = casualtyLocale[key]
    if (value === undefined)
      throw new Error(`R13-6B raw migration 缺 casualty locale 键 ${key}`)
    mergedLocale[key] = value
  }
  files.set('content/locale.json', mergedLocale)
  const loadSceneProfiles = applyPalR13SixBLoadSceneTransitions(files, raw.files)
  files = loadSceneProfiles.files
  const summary = Object.fromEntries(
    ['applied', 'already', 'skipped'].map((status) => [
      status,
      loadSceneProfiles.dispositions.filter((entry) => entry.status === status).length,
    ]),
  )
  console.log(
    `[R13-6B loadScene profile] applied=${summary.applied} already=${summary.already} ` +
      `skipped=${summary.skipped}`,
  )
  files = applyPalR13SixBSceneOverlays(files)
  const successor = derivePalMigrationFileSet(raw, files, new Set(publishedBaseline.managedFiles))
  successor.baselineMetadata = publishedBaseline.baselineMetadata
  return successor
}

function sameSnapshot(expected: MigrationSnapshot, actual: MigrationSnapshot, label: string): void {
  if (!isDeepStrictEqual(expected.baselineMetadata, actual.baselineMetadata))
    throw new Error(`${label} transition metadata 不符`)
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

interface R13ControlAuditSeal {
  sourceDispositionDigest: string
  runtimeCapabilityDigest: string
}

function reportAndAssertR13EnemyScriptPlan(
  result: R13EnemyScriptV5MigrationPlan,
  sourceContentVersion: 9 | 10,
): R13ControlAuditSeal {
  const expectedMode = sourceContentVersion === 9 ? 'initialize' : 'replay'
  if (result.enemyScriptSealMode !== expectedMode)
    throw new Error(
      `R13-5 project/baseline 半状态: content${sourceContentVersion} ` +
        `要求 ${expectedMode}，实际 ${result.enemyScriptSealMode}`,
    )
  const expectedWrites = [...result.enemyScriptEvidence.files.changedPaths].sort()
  const actualWrites = [...result.plan.writes.keys()].sort()
  if (result.plan.deletes.length)
    throw new Error(`R13-5 正式计划不得删除文件: ${result.plan.deletes.join(',')}`)
  if (
    result.enemyScriptSealMode === 'initialize' &&
    !isDeepStrictEqual(actualWrites, expectedWrites)
  )
    throw new Error(
      `R13-5 initialize 写白名单漂移: expected=${expectedWrites.join(',')} ` +
        `actual=${actualWrites.join(',')}`,
    )
  if (
    result.enemyScriptSealMode === 'replay' &&
    (result.plan.writes.size || result.plan.deletes.length)
  )
    throw new Error(
      `R13-5 replay 非空计划: writes=${result.plan.writes.size} ` +
        `deletes=${result.plan.deletes.length}`,
    )

  const source = result.enemyScriptSourceDisposition
  const sourceSeal = result.enemyScriptSeal.audits.sourceControl.summary
  const runtime = result.enemyScriptRuntimeCapability
  console.log(
    `[R13-5 源指令账] sites=${source.summary.executionSites} ` +
      `open=${source.summary.openDebtSites}/${source.summary.openObservations} ` +
      `R13-5=${sourceSeal.finalOpenR13_5Sites}/${sourceSeal.finalOpenR13_5Observations} ` +
      `R13-6=${sourceSeal.finalOpenR13_6Sites}/${sourceSeal.finalOpenR13_6Observations} ` +
      `digest=${source.digest}`,
  )
  console.log(
    `[R13-5 运行时矩阵] cells=${runtime.summary.cells} uses=${runtime.summary.uses} ` +
      `refused=${runtime.summary.refusedUses} issues=${runtime.summary.openIssues} ` +
      `digest=${runtime.digest}`,
  )
  console.log(
    `[R13-5 publication] mode=${result.enemyScriptSealMode} ` +
      `seal=${result.enemyScriptSeal.digest} writes=${result.plan.writes.size} deletes=0`,
  )
  return {
    sourceDispositionDigest: source.digest,
    runtimeCapabilityDigest: runtime.digest,
  }
}

function reportAndAssertR13SourceSemanticsPlan(
  result: R13SourceSemanticsV5MigrationPlan,
): R13ControlAuditSeal {
  const expectedWrites = [...result.augmentation.evidence.changedPaths].sort()
  const actualWrites = [...result.plan.writes.keys()].sort()
  if (result.plan.deletes.length)
    throw new Error(`R13-6A 正式计划不得删除文件: ${result.plan.deletes.join(',')}`)
  if (result.sealMode === 'initialize' && !isDeepStrictEqual(actualWrites, expectedWrites))
    throw new Error(
      `R13-6A initialize 写白名单漂移: expected=${expectedWrites.join(',')} ` +
        `actual=${actualWrites.join(',')}`,
    )
  if (result.sealMode === 'replay' && result.plan.writes.size)
    throw new Error(`R13-6A replay 非空计划: writes=${result.plan.writes.size} deletes=0`)

  const source = result.authority.sourceDisposition
  if (result.authority.sourceControl.reportDigest !== source.digest)
    throw new Error('R13-6A source control/report digest 漂移')
  const runtime = auditR13RuntimeCapabilities(result.target)
  assertR13RuntimeCapabilityAudit(runtime, result.target)
  console.log(
    `[R13-6A 源指令账] sites=${source.summary.executionSites} ` +
      `open=${source.summary.openDebtSites}/${source.summary.openObservations} ` +
      `6A=${result.augmentation.evidence.summary.commandSites}/` +
      `${result.augmentation.evidence.summary.skillCosts} digest=${source.digest}`,
  )
  console.log(
    `[R13-6A 运行时矩阵] cells=${runtime.summary.commandCells + runtime.summary.skillCells} ` +
      `uses=${runtime.summary.uses} refused=${runtime.summary.refusedUses} ` +
      `open=${runtime.summary.openDebts} digest=${runtime.digest}`,
  )
  console.log(
    `[R13-6A publication] mode=${result.sealMode} seal=${result.seal.digest} ` +
      `writes=${result.plan.writes.size} deletes=0`,
  )
  return {
    sourceDispositionDigest: source.digest,
    runtimeCapabilityDigest: runtime.digest,
  }
}

function isR13EnemyScriptPlan(
  result: R13ConfirmV5MigrationPlan,
): result is R13EnemyScriptV5MigrationPlan {
  return 'enemyScriptSeal' in result
}

function isR13SourceSemanticsPlan(
  result: R13ConfirmV5MigrationPlan | R13SourceSemanticsV5MigrationPlan,
): result is R13SourceSemanticsV5MigrationPlan {
  return 'sealMode' in result && 'augmentation' in result
}

function buildAndAssertR13ControlAudits(args: {
  sources: R13SourceInstructionDispositionBuildArgs['sources']
  migration: R13SourceInstructionDispositionBuildArgs['migration']
  audit: ScriptControlFlowAuditV1
  generated: P7GeneratedCanonical
  final: MigrationSnapshot
}): R13ControlAuditSeal {
  const source = buildR13SourceInstructionDispositionV3(args)
  assertR13SourceInstructionDispositionV3(source, args)
  const sourceEvidence = new Map(source.evidence.map((entry) => [entry.id, entry]))
  const crossProofs = source.evidence.filter((entry) => entry.kind === 'r13-cross-activation-site')
  const dispositions = new Map(source.dispositions.map((entry) => [entry.siteId, entry]))
  if (
    crossProofs.length !== 78 ||
    crossProofs.some((proof) => dispositions.get(proof.siteId)?.layers.final.state !== 'accounted')
  )
    throw new Error(`R13-2 source closure 未闭合: exact=${crossProofs.length}/78`)
  const finalOpenR13_2 = source.dispositions.filter(
    (entry) =>
      entry.layers.final.state === 'open' &&
      entry.evidenceIds.some((id) => {
        const proof = sourceEvidence.get(id)
        return proof?.kind === 'open-debt' && proof.batch === 'R13-2'
      }),
  )
  if (finalOpenR13_2.length)
    throw new Error(`R13-2 source debt 未归零: ${finalOpenR13_2.length} sites`)
  const confirmProofs = source.evidence.filter((entry) => entry.kind === 'r13-confirm-site')
  if (
    confirmProofs.length !== 28 ||
    confirmProofs.some(
      (proof) => dispositions.get(proof.siteId)?.layers.final.state !== 'accounted',
    )
  )
    throw new Error(`R13-4 source closure 未闭合: exact=${confirmProofs.length}/28`)
  const finalOpenR13_4 = source.dispositions.filter(
    (entry) =>
      entry.layers.final.state === 'open' &&
      entry.evidenceIds.some((id) => {
        const proof = sourceEvidence.get(id)
        return proof?.kind === 'open-debt' && proof.batch === 'R13-4'
      }),
  )
  if (finalOpenR13_4.length)
    throw new Error(`R13-4 source debt 未归零: ${finalOpenR13_4.length} sites`)
  const throwObservations = source.observations.filter(
    (observation) =>
      observation.domain === 'item' &&
      (observation.kind === 'pending-throw' || observation.kind === 'silent-empty-throw'),
  )
  if (
    throwObservations.length !== 58 ||
    throwObservations.some(
      (observation) =>
        observation.raw !== 'open' ||
        observation.augmented !== 'accounted' ||
        observation.final !== 'accounted',
    )
  )
    throw new Error(`R13-3 source closure 未闭合: observations=${throwObservations.length}/58`)
  const runtime = auditR13RuntimeCapabilities(args.final)
  assertR13RuntimeCapabilityAudit(runtime, args.final)
  console.log(
    `[R13-0 源指令账] instructions=${source.summary.instructions} ` +
      `reachable=${source.summary.reachableInstructions} sites=${source.summary.executionSites} ` +
      `raw=${source.summary.byLayer.raw.accounted}/${source.summary.byLayer.raw.open} ` +
      `augmented=${source.summary.byLayer.augmented.accounted}/${source.summary.byLayer.augmented.open} ` +
      `final=${source.summary.byLayer.final.accounted}/${source.summary.byLayer.final.open} ` +
      `openObservations=${source.summary.openObservations} digest=${source.digest}`,
  )
  console.log(
    `[R13-0 运行时矩阵] commandCells=${runtime.summary.commandCells} ` +
      `skillCells=${runtime.summary.skillCells} uses=${runtime.summary.uses} ` +
      `refused=${runtime.summary.refusedUses} openDebts=${runtime.summary.openDebts} ` +
      `enemyCasts=${runtime.summary.enemyCastRules} ` +
      `enemyEffects=${runtime.summary.enemyEffectUses} digest=${runtime.digest}`,
  )
  return {
    sourceDispositionDigest: source.digest,
    runtimeCapabilityDigest: runtime.digest,
  }
}

function snapshotFileSource(snapshot: MigrationSnapshot, manifest: P7V5TargetManifest): FileSource {
  const body = (path: string): string => {
    if (path === 'manifest.json') return `${JSON.stringify(manifest, null, 2)}\n`
    const value = snapshot.files.get(path)
    if (value === undefined) throw new Error(`v5 target FileSource 缺 ${path}`)
    return serializeMigrationJson(value, path)
  }
  return {
    async readText(path) {
      return body(path)
    },
    async readJson<T>(path: string) {
      return JSON.parse(body(path)) as T
    },
    async readBytes(path) {
      const bytes = new TextEncoder().encode(body(path))
      return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
    },
    async urlFor(path) {
      return `memory://pal/${path}`
    },
  }
}

async function validateP7V5Target(
  target: MigrationSnapshot,
  manifest: P7V5TargetManifest,
): Promise<void> {
  if (
    (manifest.contentVersion !== 9 &&
      manifest.contentVersion !== 10 &&
      manifest.contentVersion !== 11) ||
    manifest.minimumSaveVersion !== 8 ||
    manifest.content.scripts !== undefined
  )
    throw new Error('P7 canonical target manifest 版本、存档门槛或 legacy scripts 字段无效')
  if (!manifest.content.sharedScripts) throw new Error('P7 v5 target manifest 缺 sharedScripts')
  const value = (path: string): MigrationJson => {
    const entry = target.files.get(path)
    if (entry === undefined) throw new Error(`P7 v5 target 缺 ${path}`)
    return entry
  }
  const sceneIndex = value('content/scenes/index.json')
  if (!Array.isArray(sceneIndex) || sceneIndex.some((id) => typeof id !== 'string'))
    throw new Error('P7 v5 target scenes/index.json 无效')
  const sceneIds = sceneIndex as string[]
  const scenes = validateScenesV5(sceneIds.map((id) => value(`content/scenes/${id}.json`)))
  if (
    scenes.length !== sceneIds.length ||
    scenes.some((scene, index) => scene.id !== sceneIds[index])
  )
    throw new Error('P7 v5 target scene index/文件身份不闭合')
  validateStartWorldResources(manifest.startWorld)
  for (const [index, entry] of (manifest.entryPoints ?? []).entries())
    if (entry.startWorld)
      validateStartWorldResources(entry.startWorld, `entryPoints[${index}].startWorld`)
  const catalog = validateAssetCatalog(value(manifest.assets.catalog))
  validateManifestAssetConfigV3(manifest.assets, catalog)
  const mapsPath = manifest.content.maps
  if (!mapsPath) throw new Error('P7 v5 target manifest 缺 maps')
  const maps = validateMapIndex(value(mapsPath))
  for (const scene of scenes)
    if (!mapAssetById(maps, scene.mapId))
      throw new Error(`P7 v5 target ${scene.id}.mapId 未命中 ${scene.mapId}`)
  validateActors(value(manifest.content.actors as string))
  validateSkills(value(manifest.content.skills as string))
  validateItemsV5(value(manifest.content.items as string))
  validateLocale(value(manifest.content.locale as string), { allowLegacySoftWrap: true })
  validateSprites(value(manifest.content.sprites as string), catalog)
  validateBattleSprites(value(manifest.content.battleSprites as string), catalog)
  if (manifest.content.enemies) validateEnemies(value(manifest.content.enemies))
  if (manifest.content.battleFields) validateBattleFields(value(manifest.content.battleFields))
  if (manifest.content.tilesets) validateTilesets(value(manifest.content.tilesets), catalog)
  if (manifest.content.stamps) validateStampTemplates(value(manifest.content.stamps))
  if (manifest.content.migrationDiagnostics)
    validateMigrationDiagnostics(value(manifest.content.migrationDiagnostics))
  const shared = value(manifest.content.sharedScripts)
  checkSharedScriptLibraryV5(shared)
  const registry = await loadProjectMigrationRegistryV5({
    manifest,
    source: snapshotFileSource(target, manifest),
  })
  if (Object.keys(registry).length !== Object.keys(manifest.migrations ?? {}).length)
    throw new Error('P7 v5 target migration registry 未完整验签')
  console.log(
    `[v5 写前门禁] scenes=${scenes.length} pages=${scenes.reduce(
      (total, scene) =>
        total + scene.entities.reduce((count, entity) => count + (entity.pages?.length ?? 0), 0),
      0,
    )} shared=${Object.keys(shared).length} legacy-scripts=0`,
  )
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
  console.log(
    `[瓦片集资源] tilesets=${theirs.report.assets.tilesets} ` +
      `bytes=${theirs.report.assets.tilesetBytes} frames=${theirs.report.assets.tilesetFrames}`,
  )
  console.log(formatPalWorldSpriteReport(theirs.report.assets))
  console.log(formatPalBattleSpriteReport(theirs.report.assets))
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
  const battle = validation.battleSpriteReferences
  console.log(
    `[写前门禁] scenes=${validation.scenes} ref-warnings=${validation.referenceWarnings} script-issues=0 ` +
      `sprite-defs=${refs.definitions.total}/${refs.definitions.migrated} ` +
      `sprite-refs=entities:${refs.entities.total}/${refs.entities.migrated},` +
      `actors:${refs.actors.total}/${refs.actors.migrated},` +
      `setActorSprite:${refs.setActorSprite.total}/${refs.setActorSprite.migrated},` +
      `setActorAppearance:${refs.setActorAppearance.total}/${refs.setActorAppearance.migrated},` +
      `setFollowers:${refs.setFollowers.total}/${refs.setFollowers.migrated} ` +
      `battle-defs=${battle.definitions} battle-refs=${battle.references} ` +
      `battle-used=${battle.usedDefinitions} battle-shared=${battle.sharedDefinitions} ` +
      `battle-unused-assets=${battle.unusedAssets} ` +
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
  currentManifestText: string
  nextManifest: ProjectManifest<number>
  rebuildTheirs?: (
    sources: PalMigrationSources,
    publishedBaseline: MigrationSnapshot,
  ) => MigrationFileSet
}): Promise<void> {
  const { ours, target, plan, previousBaseline, theirs, nextManifest } = args
  const nextBaseline = snapshotOf(theirs)
  const transactionManaged = new Set([...ours.managedFiles, ...target.managedFiles])
  if (previousBaseline) assertPalBaselineSnapshotCurrent(repo, previousBaseline)
  assertProjectSnapshotCurrent(repo, ours, transactionManaged)
  const assertManifestCurrent = (): void => {
    if (
      readFileSync(resolve(repo, 'projects/pal/manifest.json'), 'utf8') !== args.currentManifestText
    )
      throw new Error('迁移计划后 manifest.json 已变更')
  }
  assertManifestCurrent()

  const catalog = validateAssetCatalog(
    target.files.get('assets/index.json') as unknown as AssetCatalogV1,
    'PAL 迁移 target assets/index.json',
  )
  validateManifestAssetConfigV3(nextManifest.assets, catalog, 'PAL 闭环 manifest.assets')

  // 二进制必须在 journal 和 manifest 切换之前完成全量预检、物化与逐文件闭包。
  const materialized = materializePalAssets({
    repo,
    catalog,
    binaries: args.binaryAssets,
  })
  console.log(
    `[资源物化] files=${materialized.files} bytes=${materialized.bytes} ` +
      `writes=${materialized.written} unchanged=${materialized.unchanged} authored=${materialized.authored}`,
  )
  if (previousBaseline) assertPalBaselineSnapshotCurrent(repo, previousBaseline)
  assertProjectSnapshotCurrent(repo, ours, transactionManaged)
  assertManifestCurrent()
  // 物化已完成，此后所有二进制也应保持不变；仅排除本事务最后负责切换的 manifest。
  const excludedFiles = new Set(['manifest.json'])
  const unmanagedBefore = hashUnmanagedProjectFiles(repo, transactionManaged, excludedFiles)
  const catalogHash = snapshotFileHash(target, 'assets/index.json')
  if (!catalogHash) throw new Error('PAL 迁移 target 缺 assets/index.json hash')
  const stampsHash = snapshotFileHash(target, 'content/stamps.json')
  if (!stampsHash) throw new Error('PAL 迁移 target 缺 content/stamps.json hash')
  const manifestPreconditions = [
    { target: 'projects/pal/assets/index.json', hash: catalogHash },
    { target: 'projects/pal/content/stamps.json', hash: stampsHash },
    ...Object.values(catalog.assets).map((record) => ({
      target: `projects/pal/${record.path}`,
      hash: record.sha256,
    })),
  ]
  const changes = buildMigrationTransactionChanges({
    repo,
    plan,
    previousBaseline,
    nextBaseline,
    nextManifest,
    manifestPreconditions,
  })
  if (changes.length) commitMigrationTransaction(repo, changes)
  console.log(`[事务] ${changes.length ? `已提交 ${changes.length} 项操作` : '无需写盘'}`)

  const unmanagedAfter = hashUnmanagedProjectFiles(repo, transactionManaged, excludedFiles)
  assertHashMapsEqual(unmanagedBefore, unmanagedAfter, '非托管工程文件')
  const manifestAfterText = readFileSync(resolve(repo, 'projects/pal/manifest.json'), 'utf8')
  const manifestAfter = JSON.parse(manifestAfterText) as LoadedManifest
  if (!isDeepStrictEqual(nextManifest, manifestAfter))
    throw new Error('事务完成后 manifest 与闭环目标不符')
  validateManifestAssetConfigV3(manifestAfter.assets, catalog, '写盘后 manifest.assets')
  if (
    manifestAfter.assets.legacy?.families.includes('sound') ||
    manifestAfter.assets.legacy?.sounds !== undefined ||
    manifestAfter.assets.legacy?.families.includes('tileset') ||
    manifestAfter.assets.legacy?.tilesets !== undefined ||
    manifestAfter.assets.legacy?.families.includes('sprite') ||
    manifestAfter.assets.legacy?.sprites !== undefined ||
    manifestAfter.assets.legacy?.families.includes('battle-sprite')
  )
    throw new Error('写盘后 manifest 仍含已闭环的 legacy sound/tileset/sprite/battle-sprite')
  const baselineAfter = loadPalBaseline(repo)
  if (!baselineAfter) throw new Error('事务完成后 baseline 缺失')
  sameSnapshot(nextBaseline, baselineAfter, 'baseline 与纯 theirs')

  const postManaged = discoverProjectManagedFiles(repo, target.managedFiles)
  const projectAfter = loadProjectMigrationSnapshot(repo, postManaged)
  sameSnapshot(target, projectAfter, '写盘工程与合并 target')

  // 真正重读提取源并重跑纯生成，不用上一轮内存结果冒充幂等。
  const sources2 = loadPalMigrationSources(repo)
  const theirs2 = args.rebuildTheirs
    ? args.rebuildTheirs(sources2, baselineAfter)
    : buildPalMigration(sources2)
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
  const secondCatalog = validateAssetCatalog(
    projectAfter.files.get('assets/index.json') as unknown as AssetCatalogV1,
    '二次 PAL 工程 assets/index.json',
  )
  validateManifestAssetConfigV3(manifestAfter.assets, secondCatalog, '二次 manifest.assets')
  const secondMaterialized = materializePalAssets({
    repo,
    catalog: secondCatalog,
    binaries: sources2.binaryAssets,
  })
  if (secondMaterialized.written !== 0)
    throw new Error(`二次资源物化非空写入: writes=${secondMaterialized.written}`)
  console.log('[幂等] 二次迁移 writes=0 deletes=0 conflicts=0')
}

async function commitAndVerifyP7V5(args: {
  ours: ProjectMigrationSnapshot
  baseline: MigrationSnapshot
  target: MigrationSnapshot
  nextBaseline: MigrationSnapshot
  plan: Pick<MigrationPlan, 'writes' | 'deletes'>
  sources: ReturnType<typeof loadPalMigrationSources>
  manifest: P7V5TargetManifest
  currentManifestText: string
}): Promise<void> {
  const transactionManaged = new Set([...args.ours.managedFiles, ...args.target.managedFiles])
  const assertManifestCurrent = (): void => {
    if (
      readFileSync(resolve(repo, 'projects/pal/manifest.json'), 'utf8') !== args.currentManifestText
    )
      throw new Error('v5 迁移计划后 manifest.json 已变更')
  }
  assertPalBaselineSnapshotCurrent(repo, args.baseline)
  assertProjectSnapshotCurrent(repo, args.ours, transactionManaged)
  assertManifestCurrent()
  const catalog = validateAssetCatalog(
    args.target.files.get('assets/index.json') as unknown as AssetCatalogV1,
    'PAL v5 迁移 target assets/index.json',
  )
  validateManifestAssetConfigV3(args.manifest.assets, catalog, 'PAL v5 manifest.assets')
  const materialized = materializePalAssets({
    repo,
    catalog,
    binaries: args.sources.binaryAssets,
  })
  console.log(
    `[资源物化] files=${materialized.files} bytes=${materialized.bytes} ` +
      `writes=${materialized.written} unchanged=${materialized.unchanged} authored=${materialized.authored}`,
  )
  assertPalBaselineSnapshotCurrent(repo, args.baseline)
  assertProjectSnapshotCurrent(repo, args.ours, transactionManaged)
  assertManifestCurrent()
  const excludedFiles = new Set(['manifest.json'])
  const unmanagedBefore = hashUnmanagedProjectFiles(repo, transactionManaged, excludedFiles)
  const catalogHash = snapshotFileHash(args.target, 'assets/index.json')
  const stampsHash = snapshotFileHash(args.target, 'content/stamps.json')
  if (!catalogHash || !stampsHash) throw new Error('PAL v5 target 缺 catalog/stamps hash')
  const manifestPreconditions = [
    { target: 'projects/pal/assets/index.json', hash: catalogHash },
    { target: 'projects/pal/content/stamps.json', hash: stampsHash },
    ...[...args.plan.writes.keys()].sort().map((path) => {
      const hash = snapshotFileHash(args.target, path)
      if (!hash) throw new Error(`PAL v5 target 写文件缺 hash: ${path}`)
      return { target: `projects/pal/${path}`, hash }
    }),
    ...Object.values(catalog.assets).map((record) => ({
      target: `projects/pal/${record.path}`,
      hash: record.sha256,
    })),
  ]
  const changes = buildMigrationTransactionChanges({
    repo,
    plan: args.plan,
    previousBaseline: args.baseline,
    nextBaseline: args.nextBaseline,
    nextManifest: args.manifest,
    manifestPreconditions,
  })
  if (changes.length) commitMigrationTransaction(repo, changes)
  console.log(`[v5 事务] ${changes.length ? `已提交 ${changes.length} 项操作` : '无需写盘'}`)

  const unmanagedAfter = hashUnmanagedProjectFiles(repo, transactionManaged, excludedFiles)
  assertHashMapsEqual(unmanagedBefore, unmanagedAfter, 'v5 非托管工程文件')
  const manifestAfterText = readFileSync(resolve(repo, 'projects/pal/manifest.json'), 'utf8')
  const manifestAfter = JSON.parse(manifestAfterText) as P7V5TargetManifest
  if (!isDeepStrictEqual(args.manifest, manifestAfter))
    throw new Error('v5 事务完成后 manifest 发生漂移')

  const baselineAfter = loadPalBaseline(repo)
  if (!baselineAfter) throw new Error('v5 事务完成后 baseline 缺失')
  sameSnapshot(args.nextBaseline, baselineAfter, 'v5 baseline 与纯 theirs')
  const postManaged = discoverProjectManagedFiles(repo, args.target.managedFiles)
  const projectAfter = loadProjectMigrationSnapshot(repo, postManaged)
  sameSnapshot(args.target, projectAfter, 'v5 写盘工程与合并 target')
  await validateP7V5Target(projectAfter, manifestAfter)
}

async function main(): Promise<void> {
  const flags = new Set(process.argv.slice(2).filter((flag) => flag !== '--'))
  if (flags.has('--help') || flags.has('-h')) {
    usage()
    return
  }
  const unknown = [...flags].filter(
    (flag) =>
      flag !== '--write' &&
      flag !== '--bootstrap' &&
      flag !== '--write-once' &&
      flag !== '--verify-idempotence' &&
      flag !== '--repair-r13-confirm-seal' &&
      flag !== '--r13-z' &&
      flag !== '--r13-6c',
  )
  if (unknown.length) throw new Error(`未知参数: ${unknown.join(', ')}`)
  const writeRequested = flags.has('--write')
  const writeOnce = flags.has('--write-once')
  const verifyIdempotence = flags.has('--verify-idempotence')
  const repairR13ConfirmSeal = flags.has('--repair-r13-confirm-seal')
  const publishR13Z = flags.has('--r13-z')
  const r13SixC = flags.has('--r13-6c')
  if ((writeOnce || verifyIdempotence) && process.env[INTERNAL_PHASE_ENV] !== '1')
    throw new Error('内部迁移阶段不得直接调用')
  if (
    Number(writeRequested) +
      Number(writeOnce) +
      Number(verifyIdempotence) +
      Number(repairR13ConfirmSeal) >
      1 ||
    (repairR13ConfirmSeal && flags.has('--bootstrap')) ||
    (publishR13Z &&
      (flags.has('--bootstrap') || writeOnce || verifyIdempotence || repairR13ConfirmSeal)) ||
    (r13SixC && !publishR13Z)
  )
    throw new Error('迁移写入/内部验证/显式修复阶段参数互斥')
  const write = writeRequested || writeOnce
  const bootstrap = flags.has('--bootstrap')

  if (!repairR13ConfirmSeal && recoverMigrationTransaction(repo))
    console.log('[恢复] 已完成上次中断的同一迁移事务')
  const manifestPath = resolve(repo, 'projects/pal/manifest.json')
  const manifestText = readFileSync(manifestPath, 'utf8')
  const rawManifest = JSON.parse(manifestText) as unknown
  if (!rawManifest || typeof rawManifest !== 'object' || Array.isArray(rawManifest))
    throw new Error('PAL manifest 必须是对象')
  const contentVersion = (rawManifest as { contentVersion?: unknown }).contentVersion
  if (
    !Number.isInteger(contentVersion) ||
    (contentVersion !== 4 &&
      contentVersion !== 5 &&
      contentVersion !== 6 &&
      contentVersion !== 7 &&
      contentVersion !== 8 &&
      contentVersion !== 9 &&
      contentVersion !== 10 &&
      contentVersion !== 11)
  )
    throw new Error(
      `PAL migrate:content 只接受 contentVersion 4/5/6/7/8/9/10/11，收到 ${JSON.stringify(contentVersion)}`,
    )
  const canonicalV5 =
    contentVersion === 5 ||
    contentVersion === 6 ||
    contentVersion === 7 ||
    contentVersion === 8 ||
    contentVersion === 9 ||
    contentVersion === 10
  if (repairR13ConfirmSeal && !canonicalV5)
    throw new Error('R13 confirm seal 显式修复只接受 canonical v5+ 工程')

  if (publishR13Z) {
    if (bootstrap || contentVersion !== 11)
      throw new Error(`R13-Z 只接受已发布 content11 工程，收到 content${String(contentVersion)}`)
    await runR13ZTransition(manifestText, writeRequested, r13SixC)
    return
  }

  // R13-6B 是 content10 → content11 的独立迁移边界。内部 v5 子进程仍由
  // EXPECTED_TRANSITION 驱动旧的 R13-5/R13-6A 事务；只有外层命令进入这里。
  if (
    (contentVersion === 10 || contentVersion === 11) &&
    !bootstrap &&
    process.env[EXPECTED_TRANSITION_ENV] === undefined &&
    !writeOnce &&
    !verifyIdempotence &&
    !repairR13ConfirmSeal
  ) {
    await runR13SixBTransition(
      rawManifest as ProjectManifest<10> | ProjectManifest<11>,
      manifestText,
      writeRequested,
    )
    return
  }
  if (writeRequested && canonicalV5 && !bootstrap) {
    if (contentVersion === 9) {
      await writeAndVerifyCanonicalV5Transition('r13-enemy', 10)
      await writeAndVerifyCanonicalV5Transition('r13-source', 10)
    } else if (contentVersion === 10) {
      await writeAndVerifyCanonicalV5Transition('r13-source', 10)
    } else {
      await writeAndVerifyCanonicalV5Transition('confirm', 9)
    }
    return
  }
  const manifest = rawManifest as LoadedManifest | CanonicalV5InputManifest
  const configuredTransition = process.env[EXPECTED_TRANSITION_ENV]
  if (!writeOnce && !verifyIdempotence && configuredTransition !== undefined)
    throw new Error(`${EXPECTED_TRANSITION_ENV} 只允许内部迁移阶段设置`)
  if ((writeOnce || verifyIdempotence) && configuredTransition === undefined)
    throw new Error('canonical v5 内部迁移阶段缺 transition')
  const canonicalTransition: CanonicalV5Transition =
    configuredTransition === undefined
      ? manifest.contentVersion === 10
        ? 'r13-source'
        : manifest.contentVersion === 9
          ? 'r13-enemy'
          : 'confirm'
      : configuredTransition === 'confirm' ||
          configuredTransition === 'r13-enemy' ||
          configuredTransition === 'r13-source'
        ? configuredTransition
        : (() => {
            throw new Error(`canonical v5 transition 无效: ${configuredTransition}`)
          })()
  const sources = loadPalMigrationSources(repo)
  let theirs =
    canonicalTransition === 'r13-enemy'
      ? buildPalHistoricalR13_5V10Migration(sources)
      : buildPalMigration(sources)
  reportGeneration(theirs)
  const baseline = repairR13ConfirmSeal
    ? loadPalBaselineRepairCandidate(repo, R13_CONFIRM_SEAL_PATH)
    : loadPalBaseline(repo)
  if (baseline && bootstrap) throw new Error('已存在 baseline，不得重跑首次 bootstrap')

  const seed = new Set([...(baseline?.managedFiles ?? []), ...theirs.managedFiles])
  const managed = discoverProjectManagedFiles(repo, seed)
  const ours = loadProjectMigrationSnapshot(repo, managed)
  if (
    manifest.contentVersion === 5 ||
    manifest.contentVersion === 6 ||
    manifest.contentVersion === 7 ||
    manifest.contentVersion === 8 ||
    manifest.contentVersion === 9 ||
    manifest.contentVersion === 10
  ) {
    if (bootstrap) throw new Error('canonical v5 工程不得重跑 v4 bootstrap')
    if (!baseline) throw new Error('canonical v5 工程缺 PAL baseline v2')
    const configuredTargetContentVersion = process.env[EXPECTED_TARGET_CONTENT_VERSION_ENV]
    if (!writeOnce && !verifyIdempotence && configuredTargetContentVersion !== undefined)
      throw new Error(`${EXPECTED_TARGET_CONTENT_VERSION_ENV} 只允许内部迁移阶段设置`)
    if ((writeOnce || verifyIdempotence) && configuredTargetContentVersion === undefined)
      throw new Error('canonical v5 内部迁移阶段缺 target contentVersion')
    const expectedTargetContentVersionRaw =
      writeOnce || verifyIdempotence ? configuredTargetContentVersion : undefined
    const expectedTargetContentVersion =
      expectedTargetContentVersionRaw === undefined
        ? undefined
        : expectedTargetContentVersionRaw === '9'
          ? 9
          : expectedTargetContentVersionRaw === '10'
            ? 10
            : (() => {
                throw new Error(
                  `canonical v5 子进程 target contentVersion 无效: ` +
                    `${expectedTargetContentVersionRaw}`,
                )
              })()
    if (
      expectedTargetContentVersion !== undefined &&
      ((canonicalTransition === 'confirm' && expectedTargetContentVersion !== 9) ||
        (canonicalTransition !== 'confirm' && expectedTargetContentVersion !== 10))
    )
      throw new Error(
        `canonical v5 transition/target 不匹配: ${canonicalTransition}/` +
          `content${expectedTargetContentVersion}`,
      )
    if (writeOnce && expectedTargetContentVersion === 9 && manifest.contentVersion > 9)
      throw new Error(`confirm write-once 源版本无效: content${manifest.contentVersion}`)
    if (
      writeOnce &&
      expectedTargetContentVersion === 10 &&
      manifest.contentVersion !== 9 &&
      manifest.contentVersion !== 10
    )
      throw new Error(`enemy write-once 源版本无效: content${manifest.contentVersion}`)
    if (
      verifyIdempotence &&
      expectedTargetContentVersion !== undefined &&
      manifest.contentVersion !== expectedTargetContentVersion
    )
      throw new Error(
        `v5 幂等 target 版本漂移: expected=${expectedTargetContentVersion} ` +
          `actual=${manifest.contentVersion}`,
      )
    if (canonicalTransition === 'r13-source' && (writeOnce || verifyIdempotence)) {
      const stableDigest = digestR13SourceSemanticsMigrationInput(theirs)
      const fastDigest = digestR13SourceSemanticsMigrationInputFast(theirs)
      const compact = compactCurrentMigrationForR13SourceSemantics(theirs)
      registerR13SourceSemanticsMigrationInputDigest(compact, stableDigest, fastDigest)
      theirs = compact
      ;(globalThis as { gc?: () => void }).gc?.()
    }
    // current successor 与 immutable parent 必须独立加载源快照，不能共享被旧 translator
    // 原地展开过的命令数组；v4 bootstrap 不需要付这次历史重放成本。
    const parentSources = loadPalMigrationSources(repo)
    const parentRawMigration = buildPalHistoricalR13_4V9Migration(parentSources)
    const authorityMigration = projectMigrationV9ToLegacyV8(parentRawMigration)
    const advancesEnemyScript =
      (expectedTargetContentVersion ??
        (manifest.contentVersion === 9 || manifest.contentVersion === 10 ? 10 : 9)) === 10
    const targetManifest: P7V5TargetManifest = advancesEnemyScript
      ? manifest.contentVersion === 10
        ? structuredClone(manifest)
        : manifest.contentVersion === 9
          ? upgradeManifestV9ToV10(manifest)
          : (() => {
              throw new Error(`R13-5 只接受 content9/10，收到 ${manifest.contentVersion}`)
            })()
      : ({
          ...structuredClone(manifest),
          contentVersion: 9,
          minimumSaveVersion: 8,
        } as P7V5TargetManifest)
    const historicalAudit = auditPalScriptControlFlow(parentSources, authorityMigration)
    assertScriptControlFlowAudit(historicalAudit)
    const preparedHistoricalSourceCensus = prepareR13SourceExecutionCensus(parentSources)
    const frozenAudit = readJson<ScriptControlFlowAuditV1>(SCRIPT_AUDIT_BASELINE_REL)
    const generated = buildP7GeneratedCanonical({
      migration: authorityMigration,
      currentAudit: historicalAudit,
      frozenAudit,
      sourceCommands: parentSources.allJson.segments.flatMap((segment) => segment.commands),
      itemSources: parentSources.migrate.items,
      magicSources: parentSources.migrate.magic,
      objectMagicSources: parentSources.migrate.objectMagics ?? [],
      sourceCensus: preparedHistoricalSourceCensus.census,
      soundAssetForNum: palSoundAssetForSources(parentSources),
    })
    if (repairR13ConfirmSeal) {
      const rebuilt = rebuildR13ConfirmSealAuthority({
        base: baseline,
        generated,
        sources: parentSources,
        migration: authorityMigration,
        audit: historicalAudit,
        preparedSourceCensus: preparedHistoricalSourceCensus,
      })
      const repaired = repairMissingR13ConfirmSeal({
        repo,
        baseline,
        expectedSeal: rebuilt.seal,
      })
      console.log(
        `[R13 confirm seal 修复] path=${repaired.path} digest=${repaired.digest} ` +
          `sha256=${repaired.fileSha256}`,
      )
      return
    }
    const v5 =
      canonicalTransition === 'r13-source'
        ? (() => {
            if (manifest.contentVersion !== 10)
              throw new Error(`R13-6A 只接受 content10，收到 ${manifest.contentVersion}`)
            const parentR13_5 = (() => {
              const r13_5Sources = loadPalMigrationSources(repo)
              const r13_5Migration = buildPalHistoricalR13_5V10Migration(r13_5Sources)
              return prepareR13EnemyScriptSourceAugmentation({
                generated,
                historicalMigration: authorityMigration,
                currentSources: r13_5Sources,
                currentMigration: r13_5Migration,
              })
            })()
            ;(globalThis as { gc?: () => void }).gc?.()
            const sourceInputs = completeR13EnemyScriptSourceInputs({
              historicalSources: parentSources,
              historicalMigration: authorityMigration,
              historicalAudit,
              preparedHistoricalSourceCensus,
              augmentation: parentR13_5.augmentation,
              successorGenerated: projectR13SourceDispositionGenerated(
                parentR13_5.successorGenerated,
              ),
              currentSources: sources,
              currentMigration: theirs,
            })
            const sourceDispositionInput: R13SourceSemanticsDispositionInput = {
              historicalSources: parentSources,
              historicalMigration: authorityMigration,
              historicalAudit,
              generated: projectR13SourceSemanticsGenerated(sourceInputs.successorGenerated),
              parentSourceDisposition: sourceInputs.sourceDisposition,
              r13EnemyClosure: {
                sourceDisposition: sourceInputs.augmentation.enemySourceDisposition,
                currentSources: sources,
                currentMigration: theirs,
                augmentationEvidence: sourceInputs.augmentation.evidence,
              },
              preparedHistoricalSourceCensus,
            }
            const projectPrerequisites = new Map<string, MigrationJson>([
              [
                'content/ambiences.json',
                readJson<MigrationJson>('projects/pal/content/ambiences.json'),
              ],
            ])
            return createR13SourceSemanticsV5MigrationPlan({
              base: baseline,
              ours,
              currentSources: sources,
              currentMigration: theirs,
              projectPrerequisites,
              sourceDispositionInput,
            })
          })()
        : canonicalTransition === 'r13-enemy'
          ? (() => {
              const successorAudit = auditPalScriptControlFlow(sources, theirs)
              assertScriptControlFlowAudit(successorAudit)
              const preparedAuthority = prepareR13EnemyScriptAuthority({
                generated,
                historicalSources: parentSources,
                historicalMigration: authorityMigration,
                historicalAudit,
                currentSources: sources,
                currentMigration: theirs,
                currentAudit: successorAudit,
                preparedHistoricalSourceCensus,
              })
              return createR13EnemyScriptV5MigrationPlan({
                base: baseline,
                ours,
                generated,
                historicalSources: parentSources,
                historicalMigration: authorityMigration,
                historicalAudit,
                currentSources: sources,
                currentMigration: theirs,
                currentAudit: successorAudit,
                preparedHistoricalSourceCensus,
                preparedAuthority,
              })
            })()
          : createR13ConfirmV5MigrationPlan({
              base: baseline,
              ours,
              generated,
              sources: parentSources,
              migration: authorityMigration,
              audit: historicalAudit,
              preparedSourceCensus: preparedHistoricalSourceCensus,
            })
    reportPlan(v5.plan)
    if (v5.plan.conflicts.length) {
      if (verifyIdempotence)
        throw new Error(`v5 二次迁移存在 conflicts=${v5.plan.conflicts.length}`)
      writeConflictReport(v5.plan)
      process.exitCode = 1
      return
    }
    await validateP7V5Target(v5.target, targetManifest)
    const firstR13 = (() => {
      if (isR13SourceSemanticsPlan(v5)) return reportAndAssertR13SourceSemanticsPlan(v5)
      if (isR13EnemyScriptPlan(v5)) {
        if (manifest.contentVersion !== 9 && manifest.contentVersion !== 10)
          throw new Error(`R13-5 outer 不接受 content${manifest.contentVersion}`)
        return reportAndAssertR13EnemyScriptPlan(v5, manifest.contentVersion)
      }
      return buildAndAssertR13ControlAudits({
        sources: parentSources,
        migration: authorityMigration,
        audit: historicalAudit,
        generated,
        final: v5.target,
      })
    })()
    if (verifyIdempotence) {
      if (v5.plan.writes.size || v5.plan.deletes.length)
        throw new Error(
          `v5 二次迁移非空计划: writes=${v5.plan.writes.size} ` +
            `deletes=${v5.plan.deletes.length} conflicts=0`,
        )
      const expectedSource = process.env[EXPECTED_SOURCE_DIGEST_ENV]
      const expectedRuntime = process.env[EXPECTED_RUNTIME_DIGEST_ENV]
      if (
        !expectedSource ||
        !expectedRuntime ||
        !/^[0-9a-f]{64}$/.test(expectedSource) ||
        !/^[0-9a-f]{64}$/.test(expectedRuntime)
      )
        throw new Error('v5 幂等验证缺首轮 R13 digest')
      if (
        firstR13.sourceDispositionDigest !== expectedSource ||
        firstR13.runtimeCapabilityDigest !== expectedRuntime
      )
        throw new Error(
          'v5 二次迁移 R13-0 digest 漂移: ' +
            `source=${expectedSource}/${firstR13.sourceDispositionDigest} ` +
            `runtime=${expectedRuntime}/${firstR13.runtimeCapabilityDigest}`,
        )
      const catalog = validateAssetCatalog(
        v5.target.files.get('assets/index.json') as unknown as AssetCatalogV1,
        '二次 PAL v5 工程 assets/index.json',
      )
      const materialized = materializePalAssets({
        repo,
        catalog,
        binaries: sources.binaryAssets,
      })
      if (materialized.written !== 0)
        throw new Error(`v5 二次资源物化非空写入: writes=${materialized.written}`)
      assertPalBaselineSnapshotCurrent(repo, baseline)
      assertProjectSnapshotCurrent(repo, ours, managed)
      if (readFileSync(manifestPath, 'utf8') !== manifestText)
        throw new Error('v5 幂等验证期间 manifest.json 已变更')
      console.log('[v5 幂等] 二次迁移 writes=0 deletes=0 conflicts=0')
      return
    }
    if (!write) {
      assertPalBaselineSnapshotCurrent(repo, baseline)
      assertProjectSnapshotCurrent(repo, ours, managed)
      if (readFileSync(manifestPath, 'utf8') !== manifestText)
        throw new Error('v5 dry-run 期间 manifest.json 已变更')
      console.log('[v5 dry-run] 未写盘；确认 plan 后加 --write')
      return
    }
    await commitAndVerifyP7V5({
      ours,
      baseline,
      target: v5.target,
      nextBaseline: v5.nextBaseline,
      plan: v5.plan,
      sources: advancesEnemyScript ? sources : parentSources,
      manifest: targetManifest,
      currentManifestText: manifestText,
    })
    console.log(
      `[v5 首轮证据] source=${firstR13.sourceDispositionDigest} ` +
        `runtime=${firstR13.runtimeCapabilityDigest}`,
    )
    return
  }

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
    const targetCatalog = validateAssetCatalog(
      target.files.get('assets/index.json') as unknown as AssetCatalogV1,
      'PAL bootstrap target assets/index.json',
    )
    const nextManifest = preparePalManifest(manifest, targetCatalog)
    const validation = validatePalMigrationTarget({
      files: target.files,
      managedFiles: target.managedFiles,
      sources,
      startWorld: manifest.startWorld,
      assets: nextManifest.assets,
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
      currentManifestText: manifestText,
      nextManifest,
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
  const targetCatalog = validateAssetCatalog(
    target.files.get('assets/index.json') as unknown as AssetCatalogV1,
    'PAL merge target assets/index.json',
  )
  const nextManifest = preparePalManifest(manifest, targetCatalog)
  const validation = validatePalMigrationTarget({
    files: target.files,
    managedFiles: target.managedFiles,
    sources,
    startWorld: manifest.startWorld,
    assets: nextManifest.assets,
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
    currentManifestText: manifestText,
    nextManifest,
  })
}

main().catch((error: unknown) => {
  console.error(`[migrate:content] 失败: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
