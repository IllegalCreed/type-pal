import { createHash } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'
import type { SceneDefV5, SkillData } from '@type-pal/content'
import {
  isAtomicProjectMapPath,
  type MigrationSnapshot,
  serializeMigrationJson,
  sha256,
  snapshotFileHash,
} from '../../migration-baseline.js'
import type { MigrationPlan } from '../../migration-plan.js'
import { createMigrationPlan } from '../../migration-plan.js'
import type { MigrationFileSet, MigrationJson, PalMigrationSources } from '../../pal-migration.js'
import {
  collectSourceEntrySites,
  type ScriptControlFlowAuditV1,
} from '../../script-control-flow-audit.js'
import { appendOnlyTransitionState } from './append-only-transition-state.js'
import { R13_ENEMY_SCRIPT_SUCCESSOR_CONTENT_DIGEST } from './r13-enemy-script-augmentation.js'
import {
  R13_ENEMY_SCRIPT_SEAL_PATH,
  R13_ENEMY_SCRIPT_TRANSITION_ID,
} from './r13-enemy-script-mg2.js'
import {
  assertR13ExistingSchemaAugmentationEvidence,
  assertR13ExistingSchemaFinalTargetClosure,
  augmentR13ExistingSchemaAfterEnemy,
  digestR13ExistingSchemaContentSnapshot,
  R13_EXISTING_SCHEMA_CHANGED_PATHS,
  R13_EXISTING_SCHEMA_COMMAND_ORACLE,
  R13_EXISTING_SCHEMA_PARENT_CONTENT_DIGEST,
  type R13ExistingSchemaAugmentation,
  type R13ExistingSchemaAugmentationEvidenceV1,
  rewindR13ExistingSchemaAugmentation,
} from './r13-existing-schema-augmentation.js'
import type { PreparedR13SourceExecutionCensus } from './source-execution-census.js'
import {
  assertR13SourceInstructionDispositionV3,
  digestR13ContentSnapshot,
  R13_EXISTING_SCHEMA_SKILL_LOSSY_NOTES,
  type R13DispositionEvidence,
  type R13EnemyClosureAuthority,
  type R13MigrationObservation,
  type R13SourceDispositionGeneratedInput,
  type R13SourceExecutionDisposition,
  type R13SourceInstructionDispositionV3,
  sealR13SourceInstructionDispositionV3,
} from './source-instruction-disposition.js'
import { fastJsonSha256, stableJsonSha256, stableStringCompare } from './stable-json.js'

export const R13_SOURCE_SEMANTICS_TRANSITION_ID = 'r13-source-semantics-v1' as const
export const R13_SOURCE_SEMANTICS_SEAL_PATH = '_transitions/r13-source-semantics-v1.json' as const
/** Published R13-5 source-ledger digest. 6A may only append its explicit allowlist delta. */
export const R13_SOURCE_SEMANTICS_PARENT_SOURCE_REPORT_DIGEST =
  '86bbb33f5ad670c6f290737475a828bdfe00aa25a777d469d89d7f97e7d256e5' as const
export const R13_SOURCE_SEMANTICS_PARENT_ENEMY_DIGEST =
  '54804a6c69e644e9c44fd98fd489d0f73eee6580c4ffc3c3753322074361fab6' as const
export const R13_SOURCE_SEMANTICS_PARENT_ENEMY_FILE_SHA256 =
  'e913123d9f01b6b1caf530bb168c9e78abc7339d4ac5dbcd55b731433c39f9c9' as const

/** R13-6A does not own this legacy save sidecar; keep it opaque like an atomic map. */
const R13_UNOWNED_OPAQUE_PATHS = Object.freeze([
  'content/migrations/script-v4-v5-save.json',
] as const)

interface R13SourceSemanticsSealBodyV1 {
  kind: 'r13-source-semantics-transition'
  version: 1
  projectId: 'pal'
  transitionId: typeof R13_SOURCE_SEMANTICS_TRANSITION_ID
  parent: {
    transitionId: typeof R13_ENEMY_SCRIPT_TRANSITION_ID
    digest: typeof R13_SOURCE_SEMANTICS_PARENT_ENEMY_DIGEST
  }
  augmentation: R13ExistingSchemaAugmentationEvidenceV1
  merge: {
    changedPaths: string[]
    commandSites: 22
    skillCosts: 3
  }
  externalPrerequisites: R13ExistingSchemaAugmentationEvidenceV1['externalPrerequisites']
  sourceControl: R13SourceSemanticsSourceControlV1
}

export interface R13SourceSemanticsSourceControlV1 {
  version: 3
  methodVersion: 'n3-p7-r13-source-instruction-disposition-v3'
  sourceDigest: string
  auditDigest: string
  reportDigest: string
  finalDigest: string
  summary: {
    executionSites: number
    openDebtSites: number
    openObservations: number
    existingSchemaSites: 22
    existingSchemaSkillCosts: 3
  }
  parentReportDigest: typeof R13_SOURCE_SEMANTICS_PARENT_SOURCE_REPORT_DIGEST
}

export interface R13SourceSemanticsTransitionSealV1 extends R13SourceSemanticsSealBodyV1 {
  digest: string
}

export interface PreparedR13SourceSemanticsAuthority {
  readonly parentContent: MigrationSnapshot
  readonly currentSources: PalMigrationSources
  readonly currentMigration: MigrationFileSet
  readonly preparedCurrentSourceCensus?: PreparedR13SourceExecutionCensus
  readonly augmentation: R13ExistingSchemaAugmentation
  readonly sourceDisposition: R13SourceInstructionDispositionV3
  readonly sourceDispositionInput: R13SourceSemanticsDispositionInput
  /** Content identity of every mutable input used to build the source ledger. */
  readonly sourceDispositionInputDigest: string
  /** Process-local fast sentinel used to validate prepared replay without canonical re-hashing. */
  readonly sourceDispositionInputFastDigest: string
  readonly sourceControl: R13SourceSemanticsSourceControlV1
  readonly digest: string
}

/**
 * The R13-6A ledger only consumes this P7 projection after the full R13-5 parent report has
 * already been built. Keeping the narrower shape prevents a prepared R13-6A authority from
 * retaining unrelated historical snapshots and feature evidence.
 */
export type R13SourceSemanticsGeneratedInput = Pick<
  R13SourceDispositionGeneratedInput,
  | 'snapshot'
  | 'ir'
  | 'ledgerDraft'
  | 'c8Evidence'
  | 'autoLifecycleRepairEvidence'
  | 'sceneSemanticRepairEvidence'
  | 'triggerActivationEvidence'
  | 'autoIdleGateEvidence'
>

export function projectR13SourceSemanticsGenerated(
  generated: R13SourceDispositionGeneratedInput,
): R13SourceSemanticsGeneratedInput {
  return Object.freeze({
    snapshot: generated.snapshot,
    ir: generated.ir,
    ledgerDraft: generated.ledgerDraft,
    c8Evidence: generated.c8Evidence,
    autoLifecycleRepairEvidence: generated.autoLifecycleRepairEvidence,
    sceneSemanticRepairEvidence: generated.sceneSemanticRepairEvidence,
    triggerActivationEvidence: generated.triggerActivationEvidence,
    autoIdleGateEvidence: generated.autoIdleGateEvidence,
  })
}

/** Historical R13-5 authority plus the current source/migration needed to rebuild
 * the R13-6A source ledger. The generated snapshot must be the published R13-5
 * successor; the new augmentation is supplied by the enclosing authority. */
export interface R13SourceSemanticsDispositionInput {
  historicalSources: PalMigrationSources
  historicalMigration: MigrationFileSet
  historicalAudit: ScriptControlFlowAuditV1
  generated: R13SourceSemanticsGeneratedInput
  /** The complete, published R13-5 ledger. No 6A report may be built without it. */
  parentSourceDisposition: R13SourceInstructionDispositionV3
  r13EnemyClosure: R13EnemyClosureAuthority
  preparedHistoricalSourceCensus?: PreparedR13SourceExecutionCensus
}

export interface R13SourceSemanticsV5MigrationPlan {
  plan: MigrationPlan
  target: MigrationSnapshot
  nextBaseline: MigrationSnapshot
  augmentation: R13ExistingSchemaAugmentation
  seal: R13SourceSemanticsTransitionSealV1
  sealMode: 'initialize' | 'replay'
  authority: PreparedR13SourceSemanticsAuthority
}

const preparedAuthorities = new WeakSet<PreparedR13SourceSemanticsAuthority>()
const preparedInputReports = new WeakSet<object>()
/**
 * A canary may discard a full current-v10 MigrationFileSet after hashing it once, while keeping
 * a narrow read-only view for the enemy/schema closure. The digest is process-local and branded
 * to that view; a plain JSON object cannot claim the full migration identity.
 */
const trustedMigrationInputDigests = new WeakMap<
  MigrationFileSet,
  { stable: string; fast?: string }
>()

function allowsTrustedMigrationInputDigest(): boolean {
  return (
    process.env.TYPE_PAL_MIGRATE_TEST_GATE === 'canary' ||
    process.env.TYPE_PAL_MIGRATE_INTERNAL_PHASE === '1'
  )
}

function deepFreezeReport<T>(value: T, active = new WeakSet<object>()): T {
  if (!value || typeof value !== 'object') return value
  if (active.has(value)) throw new Error('R13 source semantics MG2: report cycle')
  active.add(value)
  for (const nested of Object.values(value as Record<string, unknown>))
    deepFreezeReport(nested, active)
  active.delete(value)
  return Object.freeze(value)
}

type InputDigest = (value: unknown) => string

function digestSourceRoots(sources: PalMigrationSources, digest: InputDigest): string {
  const roots = collectSourceEntrySites(sources)
  // The census generator uses this exact payload. Hashing it here is intentionally much
  // cheaper than rebuilding the 81k-site source disposition, while still catching mutation of
  // commands or any source object that contributes an entry root.
  return digest({
    commands: sources.migrate.commands,
    entries: roots.sites,
    emptyPointers: roots.emptyPointers,
  })
}

function digestMigrationInput(
  migration: MigrationFileSet,
  digest: InputDigest,
  snapshotDigest: (snapshot: MigrationSnapshot) => string,
  mode: 'stable' | 'fast',
): string {
  const report =
    mode === 'fast'
      ? {
          // Keep the process-local sentinel compact: these are the migration report branches
          // consumed by the source ledger.
          rawContent: {
            pendingUse: migration.report.rawContent.pendingUse,
            pendingEquip: migration.report.rawContent.pendingEquip,
            pendingThrow: migration.report.rawContent.pendingThrow,
            pendingSkills: migration.report.rawContent.pendingSkills,
          },
          rawProjection: migration.report.rawProjection,
          content: {
            pendingUse: migration.report.content.pendingUse,
            pendingThrow: migration.report.content.pendingThrow,
            pendingSkills: migration.report.content.pendingSkills,
            lossySkills: migration.report.content.lossySkills,
          },
          enemies: migration.report.enemies?.pendingScripts ?? [],
          scripts: {
            knownNoOpDetails: migration.report.scripts.knownNoOpDetails,
            instructionOutcomes: migration.report.scripts.instructionOutcomes,
            notes: migration.report.scripts.notes,
          },
          foldedHostileRoots: migration.report.foldedHostileRoots,
          spriteActionMaterialization: migration.report.spriteActionMaterialization,
        }
      : {
          rawContent: migration.report.rawContent,
          rawProjection: migration.report.rawProjection,
          content: migration.report.content,
          enemies: migration.report.enemies,
          // R13-6A source ledger 只消费这三片 report 叶(Kimi R1:segmentTransferDetails
          // 是 6D append-only 字段,不得进入冻结 6A 父账 digest —— stable/fast 对齐
          // allowlist,冻结 pin 86bbb33f 不重写)。
          scripts: {
            knownNoOpDetails: migration.report.scripts.knownNoOpDetails,
            instructionOutcomes: migration.report.scripts.instructionOutcomes,
            notes: migration.report.scripts.notes,
          },
          foldedHostileRoots: migration.report.foldedHostileRoots,
          spriteActionMaterialization: migration.report.spriteActionMaterialization,
        }
  return digest({
    snapshot: snapshotDigest({
      files: migration.files,
      managedFiles: migration.managedFiles,
    }),
    ...report,
  })
}

export function digestR13SourceSemanticsMigrationInput(migration: MigrationFileSet): string {
  return digestMigrationInput(migration, stableJsonSha256, digestR13ContentSnapshot, 'stable')
}

export function digestR13SourceSemanticsMigrationInputFast(migration: MigrationFileSet): string {
  return digestMigrationInput(migration, fastJsonSha256, fastDigestR13ContentSnapshot, 'fast')
}

export function registerR13SourceSemanticsMigrationInputDigest(
  migration: MigrationFileSet,
  digest: string,
  fastDigest?: string,
): void {
  if (!allowsTrustedMigrationInputDigest())
    throw new Error('R13 source semantics MG2: compact migration brand 仅允许 canary/内部迁移')
  if (!/^[0-9a-f]{64}$/.test(digest))
    throw new Error('R13 source semantics MG2: migration input digest 无效')
  if (fastDigest !== undefined && !/^[0-9a-f]{64}$/.test(fastDigest))
    throw new Error('R13 source semantics MG2: migration fast input digest 无效')
  trustedMigrationInputDigests.set(migration, {
    stable: digest,
    ...(fastDigest ? { fast: fastDigest } : {}),
  })
}

/** Backward-compatible name retained for the source-backed canary. */
export const registerR13SourceSemanticsCanaryMigrationInputDigest =
  registerR13SourceSemanticsMigrationInputDigest

/**
 * Once the full current-v10 migration has been content-hashed, R13-6A only consumes these
 * three files and report leaves. The caller must register the full stable/fast digests on the
 * returned process-local view before using it as an authority input.
 */
export function compactCurrentMigrationForR13SourceSemantics(
  migration: MigrationFileSet,
): MigrationFileSet {
  const files = new Map<string, MigrationJson>()
  for (const path of ['content/enemies.json', 'content/skills.json', 'content/locale.json']) {
    const value = migration.files.get(path)
    if (value === undefined)
      throw new Error(`R13 source semantics MG2: current migration 缺 ${path}`)
    files.set(path, value)
  }
  const report = {
    rawContent: {},
    rawProjection: { enemies: migration.report.rawProjection.enemies },
    content: {
      pendingSkills: migration.report.content.pendingSkills,
      lossySkills: migration.report.content.lossySkills,
    },
    enemies: {
      pendingScripts: migration.report.enemies?.pendingScripts ?? [],
      hookSources: migration.report.enemies?.hookSources ?? [],
    },
    enemyTeams: {},
    scenes: {},
    scripts: {},
    graph: {},
    scriptRegistry: {},
    foldedHostileRoots: [],
    foldedSpriteRoots: [],
    audit: {},
    spriteActions: {},
    spriteActionMaterialization: {},
    bossOverlay: { attached: 0, clearedEnemies: [] },
    maps: {},
    assets: {},
  } as unknown as MigrationFileSet['report']
  return { files, managedFiles: new Set(files.keys()), report }
}

function fastDigestR13ContentSnapshot(snapshot: MigrationSnapshot): string {
  return fastJsonSha256(
    [...snapshot.managedFiles]
      .filter((path) => snapshot.files.has(path))
      .sort(stableStringCompare)
      .map((path) => ({ path, value: snapshot.files.get(path)! })),
  )
}

function digestSourceDispositionInputs(args: {
  input: R13SourceSemanticsDispositionInput
  currentSources: PalMigrationSources
  currentMigration: MigrationFileSet
  preparedCurrentSourceCensus?: PreparedR13SourceExecutionCensus
  mode?: 'stable' | 'fast'
}): string {
  const { input } = args
  const mode = args.mode ?? 'stable'
  const digest = mode === 'fast' ? fastJsonSha256 : stableJsonSha256
  const snapshotDigest = mode === 'fast' ? fastDigestR13ContentSnapshot : digestR13ContentSnapshot
  // This cache lives for one identity calculation only. It removes repeated whole-source and
  // migration serializations when the R13-5 closure and R13-6A current input share the same
  // object, without allowing a mutation to survive into a later authority check.
  const sourceRootDigests = new WeakMap<PalMigrationSources, string>()
  const migrationDigests = new WeakMap<MigrationFileSet, string>()
  const digestSources = (sources: PalMigrationSources): string => {
    const cached = sourceRootDigests.get(sources)
    if (cached !== undefined) return cached
    const value = digestSourceRoots(sources, digest)
    sourceRootDigests.set(sources, value)
    return value
  }
  const digestMigration = (migration: MigrationFileSet): string => {
    const cached = migrationDigests.get(migration)
    if (cached !== undefined) return cached
    const trusted = trustedMigrationInputDigests.get(migration)
    const trustedDigest = mode === 'stable' ? trusted?.stable : trusted?.fast
    if (trustedDigest !== undefined) {
      migrationDigests.set(migration, trustedDigest)
      return trustedDigest
    }
    const value = digestMigrationInput(migration, digest, snapshotDigest, mode)
    migrationDigests.set(migration, value)
    return value
  }
  const historicalSources = digestSources(input.historicalSources)
  const historicalMigration = digestMigration(input.historicalMigration)
  const generatedSnapshot = snapshotDigest(input.generated.snapshot)
  const generatedIr = digest(input.generated.ir)
  const c8Evidence = digest(input.generated.c8Evidence)
  const sceneRepairEvidence = digest(input.generated.sceneSemanticRepairEvidence)
  const triggerActivationEvidence = digest(input.generated.triggerActivationEvidence)
  const enemyCurrentSources = digestSources(input.r13EnemyClosure.currentSources)
  const enemyCurrentMigration = digestMigration(input.r13EnemyClosure.currentMigration)
  const currentSources = digestSources(args.currentSources)
  const currentMigration = digestMigration(args.currentMigration)
  return digest({
    historicalSources,
    historicalMigration,
    historicalAudit: input.historicalAudit.digest,
    generated: {
      snapshot: generatedSnapshot,
      ir: generatedIr,
      ledger: input.generated.ledgerDraft.digest,
      c8: c8Evidence,
      autoLifecycleRepair: input.generated.autoLifecycleRepairEvidence.digest,
      sceneRepair: sceneRepairEvidence,
      triggerActivation: triggerActivationEvidence,
      autoIdleGate: input.generated.autoIdleGateEvidence.digest,
    },
    parentSourceDisposition: input.parentSourceDisposition.digest,
    r13EnemyClosure: {
      sourceDisposition: input.r13EnemyClosure.sourceDisposition.digest,
      currentSources: enemyCurrentSources,
      currentMigration: enemyCurrentMigration,
      augmentationEvidence: input.r13EnemyClosure.augmentationEvidence.digest,
    },
    currentSources,
    currentMigration,
    ...(input.preparedHistoricalSourceCensus
      ? { preparedHistoricalSourceCensus: input.preparedHistoricalSourceCensus.censusDigest }
      : {}),
    ...(args.preparedCurrentSourceCensus
      ? { preparedCurrentSourceCensus: args.preparedCurrentSourceCensus.censusDigest }
      : {}),
  })
}

function cloneSnapshot(source: MigrationSnapshot): MigrationSnapshot {
  return {
    files: new Map(source.files),
    managedFiles: new Set(source.managedFiles),
    ...(source.hashes ? { hashes: new Map(source.hashes) } : {}),
    ...(source.baselineMetadata
      ? { baselineMetadata: structuredClone(source.baselineMetadata) }
      : {}),
  }
}

function asJson(value: unknown): MigrationJson {
  return JSON.parse(JSON.stringify(value)) as MigrationJson
}

/**
 * The isolated canary only needs the historical migration's identity and enemy pending-script
 * count after the source disposition has been built. Keep a small read-only view instead of
 * retaining the full R13-5 report/files graph through authority construction. Normal release
 * callers never enter this representation-only path.
 */
function compactHistoricalMigrationForAuthority(migration: MigrationFileSet): MigrationFileSet {
  const files = new Map<string, MigrationJson>()
  for (const path of ['content/enemies.json', 'content/skills.json', 'content/locale.json']) {
    const value = migration.files.get(path)
    if (value !== undefined) files.set(path, value)
  }
  const report = {
    rawContent: {},
    rawProjection: { enemies: migration.report.rawProjection.enemies },
    content: {
      pendingUse: migration.report.content.pendingUse,
      pendingThrow: migration.report.content.pendingThrow,
      pendingSkills: migration.report.content.pendingSkills,
      lossySkills: migration.report.content.lossySkills,
    },
    enemies: { pendingScripts: migration.report.enemies?.pendingScripts ?? [] },
    scripts: {},
    foldedHostileRoots: [],
    spriteActionMaterialization: {},
  } as unknown as MigrationFileSet['report']
  return { files, managedFiles: new Set(files.keys()), report }
}

function digestRecord<T>(value: Omit<T, 'digest'>): T {
  return { ...value, digest: stableJsonSha256(value) } as T
}

function recordDigest(value: MigrationJson | undefined, path: string): string {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`R13 source semantics MG2: ${path} 无效`)
  const digest = value.digest
  if (typeof digest !== 'string' || !/^[a-f0-9]{64}$/.test(digest))
    throw new Error(`R13 source semantics MG2: ${path}.digest 无效`)
  const { digest: _ignored, ...body } = value
  if (stableJsonSha256(body) !== digest)
    throw new Error(`R13 source semantics MG2: ${path} 自摘要不符`)
  return digest
}

function contentView(source: MigrationSnapshot): MigrationSnapshot {
  const result = cloneSnapshot(source)
  for (const path of [...result.files.keys()])
    if (path.startsWith('_transitions/')) result.files.delete(path)
  for (const path of [...result.managedFiles])
    if (path.startsWith('_transitions/')) result.managedFiles.delete(path)
  for (const path of [...(result.hashes?.keys() ?? [])])
    if (path.startsWith('_transitions/')) result.hashes?.delete(path)
  delete result.baselineMetadata
  return result
}

function assertNoTransitionControls(snapshot: MigrationSnapshot, label: string): void {
  const leaked = [
    ...[...snapshot.files.keys()].filter((path) => path.startsWith('_transitions/')),
    ...[...snapshot.managedFiles].filter((path) => path.startsWith('_transitions/')),
    ...[...(snapshot.hashes?.keys() ?? [])].filter((path) => path.startsWith('_transitions/')),
  ]
  if (leaked.length)
    throw new Error(`R13 source semantics MG2: ${label} 泄漏 control ${leaked.join(',')}`)
}

/** A checked-out project may inherit baseline control paths in its managed seed, but it
 * must never carry the actual transition JSON/hash. The seed-only entries are removed by
 * contentView later and are therefore harmless. */
function assertProjectHasNoTransitionFiles(snapshot: MigrationSnapshot, label: string): void {
  const leaked = [
    ...[...snapshot.files.keys()].filter((path) => path.startsWith('_transitions/')),
    ...[...(snapshot.hashes?.keys() ?? [])].filter((path) => path.startsWith('_transitions/')),
  ]
  if (leaked.length)
    throw new Error(`R13 source semantics MG2: ${label} 携带 transition file ${leaked.join(',')}`)
}

function assertWarmAmbiencePrerequisite(args: {
  ours: MigrationSnapshot
  currentMigration: MigrationFileSet
  projectPrerequisites?: ReadonlyMap<string, MigrationJson>
}): void {
  const path = 'content/ambiences.json'
  const value =
    args.projectPrerequisites?.get(path) ??
    args.ours.files.get(path) ??
    args.currentMigration.files.get(path)
  const record = Array.isArray(value)
    ? value.find(
        (entry) =>
          !!entry &&
          typeof entry === 'object' &&
          !Array.isArray(entry) &&
          (entry as Record<string, MigrationJson>).id === 'warm',
      )
    : undefined
  if (
    !record ||
    !Array.isArray((record as { tint?: unknown }).tint) ||
    !isDeepStrictEqual((record as { tint: unknown }).tint, [255, 230, 102])
  )
    throw new Error(
      'R13 source semantics MG2: 外部 prerequisite content/ambiences.json 缺 warm/[255,230,102]',
    )
}

function assertPublishedEnemyParent(base: MigrationSnapshot): void {
  const raw = base.files.get(R13_ENEMY_SCRIPT_SEAL_PATH)
  const digest = recordDigest(raw, R13_ENEMY_SCRIPT_SEAL_PATH)
  if (
    digest !== R13_SOURCE_SEMANTICS_PARENT_ENEMY_DIGEST ||
    base.baselineMetadata?.transitions[R13_ENEMY_SCRIPT_TRANSITION_ID] !== digest ||
    !base.managedFiles.has(R13_ENEMY_SCRIPT_SEAL_PATH) ||
    base.hashes?.get(R13_ENEMY_SCRIPT_SEAL_PATH) !==
      R13_SOURCE_SEMANTICS_PARENT_ENEMY_FILE_SHA256 ||
    sha256(serializeMigrationJson(raw!, R13_ENEMY_SCRIPT_SEAL_PATH)) !==
      R13_SOURCE_SEMANTICS_PARENT_ENEMY_FILE_SHA256
  )
    throw new Error('R13 source semantics MG2: published enemy parent byte-pin 漂移')
}

const R13_6A_SKILL_IDS = ['352', '372', '373'] as const
const R13_6A_SITE_ID_COUNT = 22

function evidenceMap(
  report: R13SourceInstructionDispositionV3,
): Map<string, R13DispositionEvidence> {
  return new Map(report.evidence.map((entry) => [entry.id, entry]))
}

function observationMap(
  report: R13SourceInstructionDispositionV3,
): Map<string, R13MigrationObservation> {
  return new Map(report.observations.map((entry) => [entry.id, entry]))
}

function dispositionMap(
  report: R13SourceInstructionDispositionV3,
): Map<string, R13SourceExecutionDisposition> {
  return new Map(report.dispositions.map((entry) => [entry.siteId, entry]))
}

function sortedJson(value: unknown): string {
  return stableJsonSha256(value)
}

function assertOnlyAllowedEvidenceDelta(
  parent: R13SourceInstructionDispositionV3,
  successor: R13SourceInstructionDispositionV3,
  parentAllowed: ReadonlySet<string>,
  successorAllowed: ReadonlySet<string>,
  parentAllowedOwners: ReadonlySet<string>,
  successorAllowedOwners: ReadonlySet<string>,
  parentEvidence: ReadonlyMap<string, R13DispositionEvidence>,
  successorEvidence: ReadonlyMap<string, R13DispositionEvidence>,
): void {
  const parentOutside = [...parentEvidence.keys()].filter((id) => !parentAllowed.has(id)).sort()
  const successorOutside = [...successorEvidence.keys()]
    .filter((id) => !successorAllowed.has(id))
    .sort()
  if (sortedJson(parentOutside) !== sortedJson(successorOutside))
    throw new Error('R13 source semantics MG2: 6A evidence 白名单外集合漂移')
  for (const id of parentOutside) {
    const before = parentEvidence.get(id)
    const after = successorEvidence.get(id)
    if (!before || !after || !isDeepStrictEqual(before, after))
      throw new Error(`R13 source semantics MG2: 6A 非白名单 evidence 漂移 ${id}`)
  }

  // An allowlisted proof may legitimately be referenced by the same object more than once
  // (for example, a disposition's aggregate evidence and each of its layer entries). What
  // must be rejected is a reference from an untouched object: otherwise excluding the proof
  // from the equality check could hide a cross-object semantic change.
  const references = (
    report: R13SourceInstructionDispositionV3,
    allowed: ReadonlySet<string>,
  ): Map<string, Set<string>> => {
    const owners = new Map<string, Set<string>>()
    const add = (id: string, owner: string): void => {
      if (!allowed.has(id)) return
      const set = owners.get(id) ?? new Set<string>()
      set.add(owner)
      owners.set(id, set)
    }
    for (const disposition of report.dispositions) {
      const owner = `site:${disposition.siteId}`
      for (const id of disposition.evidenceIds) add(id, owner)
      for (const layer of Object.values(disposition.layers))
        for (const id of layer.evidenceIds) add(id, owner)
    }
    for (const observation of report.observations) {
      const owner = `observation:${observation.id}`
      for (const id of observation.evidenceIds) add(id, owner)
    }
    return owners
  }
  for (const [id, owners] of references(parent, parentAllowed))
    for (const owner of owners)
      if (!parentAllowedOwners.has(owner))
        throw new Error(`R13 source semantics MG2: parent allowlist proof 被跨对象复用 ${id}`)
  for (const [id, owners] of references(successor, successorAllowed))
    for (const owner of owners)
      if (!successorAllowedOwners.has(owner))
        throw new Error(`R13 source semantics MG2: successor allowlist proof 被跨对象复用 ${id}`)
}

function assertR13SourceDisposition6AParentDelta(args: {
  parent: R13SourceInstructionDispositionV3
  successor: R13SourceInstructionDispositionV3
  ownedSiteIds: readonly string[]
}): void {
  const { parent, successor } = args
  if (parent.digest !== R13_SOURCE_SEMANTICS_PARENT_SOURCE_REPORT_DIGEST)
    throw new Error('R13 source semantics MG2: R13-5 parent source report digest 漂移')
  // buildSourceDisposition has already source-backed validated the parent immediately before
  // constructing this successor. Keep this pass structural-only so the 81k-site closure is not
  // rebuilt a second time while both parent and successor indexes are resident.
  assertR13SourceInstructionDispositionV3(successor, undefined, {
    allowExistingSchemaAuthority: true,
  })
  // This validator is private to buildSourceDisposition6AFromParent, which passes the already
  // source-backed parent census through by identity. Comparing two 81k-site canonical copies
  // here would only recreate temporary graphs; identity is the stronger invariant for this
  // append-only bridge.
  if (parent.census !== successor.census)
    throw new Error('R13 source semantics MG2: 6A census 漂移')
  for (const key of ['sourceDigest', 'rawDigest'] as const)
    if (parent.generator[key] !== successor.generator[key])
      throw new Error(`R13 source semantics MG2: 6A generator.${key} 漂移`)
  // augmentedDigest intentionally binds the R13-6A closure evidence even though the
  // generated snapshot remains the published R13-5 successor. The allowlist checks below
  // prove that this metadata delta closes only the 22 owned source sites.
  if (parent.generator.augmentedDigest === successor.generator.augmentedDigest)
    throw new Error('R13 source semantics MG2: 6A augmented generator 未体现 closure 增量')
  if (parent.generator.finalDigest === successor.generator.finalDigest)
    throw new Error('R13 source semantics MG2: 6A final generator 未体现增量')

  const ownedSiteIds = [...new Set(args.ownedSiteIds)].sort()
  if (ownedSiteIds.length !== R13_6A_SITE_ID_COUNT)
    throw new Error(`R13 source semantics MG2: 6A owned site 数=${ownedSiteIds.length}`)
  const ownedSites = new Set(ownedSiteIds)
  const censusAddressesById = new Map(parent.census.sites.map((site) => [site.id, site.address]))
  const beforeSites = dispositionMap(parent)
  const afterSites = dispositionMap(successor)
  const ownedAddresses = new Set(
    ownedSiteIds
      .map((siteId) => censusAddressesById.get(siteId))
      .filter((address): address is number => address !== undefined),
  )
  if (beforeSites.size !== afterSites.size || beforeSites.size !== parent.census.sites.length)
    throw new Error('R13 source semantics MG2: 6A disposition cardinality 漂移')
  const parentAllowedEvidence = new Set<string>()
  const successorAllowedEvidence = new Set<string>()
  const parentAllowedEvidenceOwners = new Set<string>()
  const successorAllowedEvidenceOwners = new Set<string>()
  const parentEvidence = evidenceMap(parent)
  const successorEvidence = evidenceMap(successor)

  for (const [siteId, before] of beforeSites) {
    const after = afterSites.get(siteId)
    if (!after) throw new Error(`R13 source semantics MG2: 6A site 缺失 ${siteId}`)
    if (!ownedSites.has(siteId)) {
      if (!isDeepStrictEqual(before, after))
        throw new Error(`R13 source semantics MG2: 6A 非 owned site 漂移 ${siteId}`)
      continue
    }
    if (
      before.disposition !== 'open-debt' ||
      before.layers.raw.state !== 'open' ||
      before.layers.augmented.state !== 'open' ||
      before.layers.final.state !== 'open' ||
      after.layers.raw.state !== 'open' ||
      after.layers.augmented.state !== 'open' ||
      after.layers.final.state !== 'accounted' ||
      after.disposition !== 'structured' ||
      sortedJson(before.candidateEvidenceIds) !== sortedJson(after.candidateEvidenceIds)
    )
      throw new Error(`R13 source semantics MG2: 6A owned site 状态非法 ${siteId}`)
    for (const id of before.evidenceIds) parentAllowedEvidence.add(id)
    for (const id of after.evidenceIds) successorAllowedEvidence.add(id)
    parentAllowedEvidenceOwners.add(`site:${siteId}`)
    successorAllowedEvidenceOwners.add(`site:${siteId}`)
    const closure = after.evidenceIds
      .map((id) => successorEvidence.get(id))
      .find((entry) => entry?.kind === 'r13-existing-schema-site')
    if (
      !closure ||
      closure.kind !== 'r13-existing-schema-site' ||
      !after.layers.final.evidenceIds.includes(closure.id) ||
      closure.appliesToLayers.length !== 1 ||
      closure.appliesToLayers[0] !== 'final'
    )
      throw new Error(`R13 source semantics MG2: 6A owned site closure 漂移 ${siteId}`)
    const openProofs = after.evidenceIds
      .map((id) => successorEvidence.get(id))
      .filter(
        (entry): entry is Extract<R13DispositionEvidence, { kind: 'open-debt' }> =>
          entry?.kind === 'open-debt',
      )
    if (
      openProofs.length !== 1 ||
      openProofs[0]!.batch !== 'R13-6' ||
      sortedJson(openProofs[0]!.appliesToLayers) !== sortedJson(['raw', 'augmented'])
    )
      throw new Error(`R13 source semantics MG2: 6A owned site open proof 漂移 ${siteId}`)
    const parentProofs = before.evidenceIds
      .map((id) => parentEvidence.get(id))
      .filter(
        (entry): entry is Extract<R13DispositionEvidence, { kind: 'open-debt' }> =>
          entry?.kind === 'open-debt',
      )
    if (
      parentProofs.length !== 1 ||
      parentProofs[0]!.batch !== 'R13-6' ||
      sortedJson(parentProofs[0]!.appliesToLayers) !== sortedJson(['raw', 'augmented', 'final'])
    )
      throw new Error(`R13 source semantics MG2: R13-5 owned site 前态漂移 ${siteId}`)
  }

  const beforeObservations = observationMap(parent)
  const afterObservations = observationMap(successor)
  const sourceObservationAddress = (id: string): number | undefined => {
    const match = /^source:(\d+):/.exec(id)
    return match ? Number(match[1]) : undefined
  }
  const parentOwnedSourceObservations = [...beforeObservations.values()].filter((observation) => {
    const address = sourceObservationAddress(observation.id)
    return address !== undefined && ownedAddresses.has(address)
  })
  const successorOwnedSourceObservations = [...afterObservations.values()].filter((observation) => {
    const address = sourceObservationAddress(observation.id)
    return address !== undefined && ownedAddresses.has(address)
  })
  for (const observation of parentOwnedSourceObservations)
    parentAllowedEvidenceOwners.add(`observation:${observation.id}`)
  for (const observation of successorOwnedSourceObservations)
    successorAllowedEvidenceOwners.add(`observation:${observation.id}`)
  for (const observation of [...parentOwnedSourceObservations, ...successorOwnedSourceObservations])
    if (
      observation.domain !== 'source-command' ||
      !observation.kind.startsWith('R13-6:') ||
      observation.final !== 'open'
    )
      throw new Error(
        `R13 source semantics MG2: 6A owned source observation 状态漂移 ${observation.id}`,
      )
  for (const skillId of R13_6A_SKILL_IDS) {
    const pendingId = `skill:${skillId}:pending`
    const lossyId = `skill:${skillId}:lossy`
    const costId = `skill:${skillId}:item-cost`
    const pending = beforeObservations.get(pendingId)
    const lossy = afterObservations.get(lossyId)
    const cost = afterObservations.get(costId)
    if (!pending || !lossy || !cost)
      throw new Error(`R13 source semantics MG2: 6A skill observation 缺失 ${skillId}`)
    for (const id of pending.evidenceIds) parentAllowedEvidence.add(id)
    for (const id of [...lossy.evidenceIds, ...cost.evidenceIds]) successorAllowedEvidence.add(id)
    parentAllowedEvidenceOwners.add(`observation:${pendingId}`)
    successorAllowedEvidenceOwners.add(`observation:${lossyId}`)
    successorAllowedEvidenceOwners.add(`observation:${costId}`)
    if (
      pending.domain !== 'skill' ||
      pending.kind !== 'pending' ||
      pending.raw !== 'open' ||
      pending.augmented !== 'open' ||
      pending.final !== 'open'
    )
      throw new Error(`R13 source semantics MG2: 6A skill pending 前态漂移 ${skillId}`)
    if (
      lossy.domain !== 'skill' ||
      lossy.kind !== 'lossy' ||
      lossy.raw !== 'open' ||
      lossy.augmented !== 'open' ||
      lossy.final !== 'open' ||
      sortedJson(lossy.sourceRootIds) !==
        sortedJson(
          [`global/skills/${skillId}/scriptOnUse`, `global/skills/${skillId}/scriptOnSuccess`].sort(
            stableStringCompare,
          ),
        )
    )
      throw new Error(`R13 source semantics MG2: 6A skill lossy 状态漂移 ${skillId}`)
    if (
      cost.domain !== 'skill' ||
      cost.kind !== 'item-cost' ||
      cost.raw !== 'open' ||
      cost.augmented !== 'open' ||
      cost.final !== 'accounted' ||
      sortedJson(cost.sourceRootIds) !== sortedJson([`global/skills/${skillId}/scriptOnUse`])
    )
      throw new Error(`R13 source semantics MG2: 6A skill cost 状态漂移 ${skillId}`)
    const lossyProofs = lossy.evidenceIds
      .map((id) => successorEvidence.get(id))
      .filter(
        (entry): entry is Extract<R13DispositionEvidence, { kind: 'open-debt' }> =>
          entry?.kind === 'open-debt',
      )
    if (
      lossyProofs.length !== 1 ||
      lossyProofs[0]!.reason !== `skill-lossy:${R13_EXISTING_SCHEMA_SKILL_LOSSY_NOTES[skillId]}` ||
      lossyProofs[0]!.batch !== 'R13-6' ||
      sortedJson(lossyProofs[0]!.appliesToLayers) !== sortedJson(['raw', 'augmented', 'final'])
    )
      throw new Error(`R13 source semantics MG2: 6A skill lossy proof 漂移 ${skillId}`)
    const costOpenProofs = cost.evidenceIds
      .map((id) => successorEvidence.get(id))
      .filter(
        (entry): entry is Extract<R13DispositionEvidence, { kind: 'open-debt' }> =>
          entry?.kind === 'open-debt',
      )
    if (
      costOpenProofs.length !== 1 ||
      costOpenProofs[0]!.batch !== 'R13-6' ||
      sortedJson(costOpenProofs[0]!.appliesToLayers) !== sortedJson(['raw', 'augmented'])
    )
      throw new Error(`R13 source semantics MG2: 6A skill cost open proof 漂移 ${skillId}`)
  }
  for (const [id, observation] of beforeObservations) {
    if (
      id.endsWith(':pending') &&
      R13_6A_SKILL_IDS.some((skillId) => id === `skill:${skillId}:pending`)
    )
      continue
    if (parentOwnedSourceObservations.some((entry) => entry.id === id)) continue
    const after = afterObservations.get(id)
    if (!after || !isDeepStrictEqual(observation, after))
      throw new Error(`R13 source semantics MG2: 6A 非白名单 observation 漂移 ${id}`)
  }
  for (const [id, observation] of afterObservations) {
    if (
      R13_6A_SKILL_IDS.some(
        (skillId) => id === `skill:${skillId}:lossy` || id === `skill:${skillId}:item-cost`,
      )
    )
      continue
    if (successorOwnedSourceObservations.some((entry) => entry.id === id)) continue
    if (!beforeObservations.has(id))
      throw new Error(`R13 source semantics MG2: 6A 新增非白名单 observation ${id}`)
    if (!isDeepStrictEqual(beforeObservations.get(id), observation))
      throw new Error(`R13 source semantics MG2: 6A observation 内容漂移 ${id}`)
  }
  const sourceObservationDelta =
    successorOwnedSourceObservations.length - parentOwnedSourceObservations.length
  const expectedObservations =
    parent.summary.observations + sourceObservationDelta + R13_6A_SKILL_IDS.length
  if (successor.summary.observations !== expectedObservations)
    throw new Error('R13 source semantics MG2: 6A observation cardinality delta 漂移')
  const parentOwnedOpenObservations = parentOwnedSourceObservations.filter(
    (observation) => observation.final === 'open',
  ).length
  const successorOwnedOpenObservations = successorOwnedSourceObservations.filter(
    (observation) => observation.final === 'open',
  ).length
  const expectedOpenObservations =
    parent.summary.openObservations - parentOwnedOpenObservations + successorOwnedOpenObservations
  if (successor.summary.openObservations !== expectedOpenObservations)
    throw new Error('R13 source semantics MG2: 6A open observation delta 漂移')

  const expectedByDisposition = structuredClone(parent.summary.byDisposition)
  expectedByDisposition['open-debt'] -= R13_6A_SITE_ID_COUNT
  expectedByDisposition.structured += R13_6A_SITE_ID_COUNT
  if (!isDeepStrictEqual(successor.summary.byDisposition, expectedByDisposition))
    throw new Error('R13 source semantics MG2: 6A disposition summary delta 漂移')
  const expectedByLayer = structuredClone(parent.summary.byLayer)
  expectedByLayer.final.open -= R13_6A_SITE_ID_COUNT
  expectedByLayer.final.accounted += R13_6A_SITE_ID_COUNT
  if (
    expectedByLayer.raw.open !== successor.summary.byLayer.raw.open ||
    expectedByLayer.raw.accounted !== successor.summary.byLayer.raw.accounted ||
    expectedByLayer.augmented.open !== successor.summary.byLayer.augmented.open ||
    expectedByLayer.augmented.accounted !== successor.summary.byLayer.augmented.accounted ||
    !isDeepStrictEqual(expectedByLayer.final, successor.summary.byLayer.final)
  )
    throw new Error('R13 source semantics MG2: 6A layer summary delta 漂移')
  for (const key of [
    'instructions',
    'reachableInstructions',
    'executionSites',
    'dispositionSites',
  ] as const)
    if (parent.summary[key] !== successor.summary[key])
      throw new Error(`R13 source semantics MG2: 6A summary.${key} 漂移`)
  if (successor.summary.openDebtSites !== parent.summary.openDebtSites - R13_6A_SITE_ID_COUNT)
    throw new Error('R13 source semantics MG2: 6A openDebtSites delta 漂移')

  const openAddresses = (report: R13SourceInstructionDispositionV3): Set<number> => {
    return new Set(
      report.dispositions
        .filter((entry) => entry.layers.final.state === 'open')
        .map((entry) => censusAddressesById.get(entry.siteId))
        .filter((address): address is number => address !== undefined),
    )
  }
  const beforeOpenAddresses = openAddresses(parent)
  const afterOpenAddresses = openAddresses(successor)
  for (const address of afterOpenAddresses)
    if (!beforeOpenAddresses.has(address))
      throw new Error(`R13 source semantics MG2: 6A 新增 open source address ${address}`)
  for (const address of beforeOpenAddresses)
    if (!afterOpenAddresses.has(address) && !ownedAddresses.has(address))
      throw new Error(`R13 source semantics MG2: 6A 非白名单 open address 关闭 ${address}`)
  if (successor.summary.openDebtSourceAddresses !== afterOpenAddresses.size)
    throw new Error('R13 source semantics MG2: 6A open source address summary 漂移')

  assertOnlyAllowedEvidenceDelta(
    parent,
    successor,
    parentAllowedEvidence,
    successorAllowedEvidence,
    parentAllowedEvidenceOwners,
    successorAllowedEvidenceOwners,
    parentEvidence,
    successorEvidence,
  )
}

function r13DispositionEvidenceId(kind: R13DispositionEvidence['kind'], identity: unknown): string {
  return `${kind}:${createHash('sha256').update(JSON.stringify(identity)).digest('hex').slice(0, 20)}`
}

function buildR13SourceDisposition6AFromParent(args: {
  input: R13SourceSemanticsDispositionInput
  currentSources: PalMigrationSources
  currentMigration: MigrationFileSet
  augmentation: R13ExistingSchemaAugmentation
  generatedSnapshotDigest: string
}): R13SourceInstructionDispositionV3 {
  const parent = args.input.parentSourceDisposition
  assertR13ExistingSchemaAugmentationEvidence(args.augmentation.evidence)
  if (
    digestSourceRoots(args.currentSources, stableJsonSha256) !==
    digestSourceRoots(args.input.historicalSources, stableJsonSha256)
  )
    throw new Error('R13 source semantics MG2: 6A historical/current source roots 漂移')

  const evidence = evidenceMap(parent)
  const dispositions = dispositionMap(parent)
  const ownedSiteIds = new Set(args.augmentation.evidence.sites.map((site) => site.siteId))
  const openDebtSiteIds = new Set(
    [...dispositions.values()]
      .filter((disposition) => disposition.disposition === 'open-debt')
      .map((disposition) => disposition.siteId),
  )
  for (const siteId of ownedSiteIds) openDebtSiteIds.add(siteId)
  // 6A mutates exactly 22 owned sites, while the later observation summary needs only the
  // open-debt sites. Indexing this required subset avoids duplicating every 81,674-site census
  // entry; the structural parent-delta validator below still walks the full report afterward.
  const sites = new Map(
    parent.census.sites
      .filter((site) => openDebtSiteIds.has(site.id))
      .map((site) => [site.id, site] as const),
  )
  const ownedContextIds = new Set([...sites.values()].map((site) => site.contextId))
  const contexts = new Map(
    parent.census.contexts
      .filter((context) => ownedContextIds.has(context.id))
      .map((context) => [context.id, context] as const),
  )
  const addEvidence = (entry: R13DispositionEvidence): void => {
    const previous = evidence.get(entry.id)
    if (previous && !isDeepStrictEqual(previous, entry))
      throw new Error(`R13 source semantics MG2: 6A evidence id collision ${entry.id}`)
    evidence.set(entry.id, entry)
  }

  for (const sourceSite of args.augmentation.evidence.sites) {
    const site = sites.get(sourceSite.siteId)
    const context = site ? contexts.get(site.contextId) : undefined
    const instruction = parent.census.instructions[sourceSite.address]
    const before = dispositions.get(sourceSite.siteId)
    if (
      !site ||
      !context ||
      !instruction ||
      !before ||
      site.address !== sourceSite.address ||
      site.contextId !== sourceSite.contextId ||
      instruction.sourceCommandSha256 !== sourceSite.sourceCommandSha256 ||
      context.entrySiteId !== sourceSite.sourceEntrySiteId ||
      stableJsonSha256(context.host) !== stableJsonSha256(sourceSite.sourceHost) ||
      before.disposition !== 'open-debt'
    )
      throw new Error(`R13 source semantics MG2: 6A parent site 漂移 ${sourceSite.siteId}`)

    const commands = collectCommandsAtOwner(args.augmentation.snapshot, sourceSite.owner)
    const matches = commands
      .map((command, index) => ({ command, index }))
      .filter(({ command }) => stableJsonSha256(command) === sourceSite.commandDigest)
      .filter(({ index }) => {
        const previous = commands[index - 1]
        const next = commands[index + 1]
        return (
          (sourceSite.beforeDigest === undefined
            ? index === 0
            : previous !== undefined && stableJsonSha256(previous) === sourceSite.beforeDigest) &&
          (sourceSite.afterDigest === undefined
            ? index === commands.length - 1
            : next !== undefined && stableJsonSha256(next) === sourceSite.afterDigest)
        )
      })
    if (matches.length !== 1)
      throw new Error(`R13 source semantics MG2: 6A final command 不唯一 ${sourceSite.siteId}`)
    const selector = `${sourceSite.owner}#command/${matches[0]!.index}`
    const closureIdentity = {
      siteId: sourceSite.siteId,
      contextId: sourceSite.contextId,
      address: sourceSite.address,
      sourceCommandSha256: sourceSite.sourceCommandSha256,
      augmentationEvidenceDigest: args.augmentation.evidence.digest,
      owner: sourceSite.owner,
      parentContainerDigest: sourceSite.parentContainerDigest,
      successorContainerDigest: sourceSite.successorContainerDigest,
      commandDigest: sourceSite.commandDigest,
      finalIndex: sourceSite.finalIndex,
      beforeDigest: sourceSite.beforeDigest,
      afterDigest: sourceSite.afterDigest,
      targetSelectors: [selector],
      targetDigests: [sourceSite.commandDigest],
    }
    const closureId = r13DispositionEvidenceId('r13-existing-schema-site', closureIdentity)
    addEvidence({
      id: closureId,
      scope: 'site-closure',
      kind: 'r13-existing-schema-site',
      proves: 'structured',
      siteId: sourceSite.siteId,
      contextId: sourceSite.contextId,
      addresses: [sourceSite.address],
      sourceCommandSha256: sourceSite.sourceCommandSha256,
      appliesToLayers: ['final'],
      augmentationEvidenceDigest: args.augmentation.evidence.digest,
      owner: sourceSite.owner,
      parentContainerDigest: sourceSite.parentContainerDigest,
      successorContainerDigest: sourceSite.successorContainerDigest,
      commandDigest: sourceSite.commandDigest,
      finalIndex: sourceSite.finalIndex,
      ...(sourceSite.beforeDigest !== undefined ? { beforeDigest: sourceSite.beforeDigest } : {}),
      ...(sourceSite.afterDigest !== undefined ? { afterDigest: sourceSite.afterDigest } : {}),
      targetSelectors: [selector],
      targetDigests: [sourceSite.commandDigest],
      layerTargets: { final: { selectors: [selector], digests: [sourceSite.commandDigest] } },
    })
    const openIdentity = {
      siteId: sourceSite.siteId,
      sourceRootId: context.entrySiteId,
      appliesToLayers: ['raw', 'augmented'],
      batch: 'R13-6',
      reason: 'pre-r13-6-existing-schema-site',
    }
    const openId = r13DispositionEvidenceId('open-debt', openIdentity)
    addEvidence({
      id: openId,
      scope: 'open-debt',
      kind: 'open-debt',
      addresses: [site.address],
      siteId: site.id,
      contextId: site.contextId,
      sourceRootId: context.entrySiteId,
      sourceCommandSha256: instruction.sourceCommandSha256,
      appliesToLayers: ['raw', 'augmented'],
      batch: 'R13-6',
      reason: 'pre-r13-6-existing-schema-site',
    })
    for (const id of before.evidenceIds) evidence.delete(id)
    dispositions.set(sourceSite.siteId, {
      siteId: sourceSite.siteId,
      disposition: 'structured',
      evidenceIds: [closureId, openId].sort(stableStringCompare),
      candidateEvidenceIds: [...before.candidateEvidenceIds],
      layers: {
        raw: { state: 'open', evidenceIds: [openId] },
        augmented: { state: 'open', evidenceIds: [openId] },
        final: { state: 'accounted', evidenceIds: [closureId] },
      },
    })
  }

  const rootByContext = new Map(
    parent.census.contexts.map((context) => [context.id, context.entrySiteId] as const),
  )
  const addressesForRoot = (rootId: string): number[] => {
    const addresses = new Set<number>()
    for (const site of parent.census.sites)
      if (rootByContext.get(site.contextId) === rootId) addresses.add(site.address)
    return [...addresses].sort((left, right) => left - right)
  }
  const skillCosts = new Map<'352' | '372' | '373', string>()
  const finalSkillsValue = args.augmentation.snapshot.files.get('content/skills.json') as
    | { skills?: SkillData[] }
    | undefined
  const finalSkills = new Map(
    (finalSkillsValue?.skills ?? []).map((skill) => [String(skill.id), skill] as const),
  )
  for (const skill of args.augmentation.evidence.skills) {
    const finalSkill = finalSkills.get(skill.skillId)
    if (
      !finalSkill ||
      !isDeepStrictEqual(finalSkill.cost?.items, skill.items) ||
      stableJsonSha256(finalSkill.cost) !== skill.successorCostDigest
    )
      throw new Error(`R13 source semantics MG2: 6A skill cost 漂移 ${skill.skillId}`)
    const sourceRootIds = [`global/skills/${skill.skillId}/scriptOnUse`]
    const sourceRoots = sourceRootIds.map((rootId) => ({
      rootId,
      addresses: addressesForRoot(rootId),
      commands: addressesForRoot(rootId).map(
        (address) => parent.census.instructions[address]?.sourceCommandSha256,
      ),
    }))
    const addresses = [...new Set(sourceRoots.flatMap((root) => root.addresses))].sort(
      (left, right) => left - right,
    )
    const selector = `content/skills.json#${skill.skillId}/cost/items`
    const itemsDigest = stableJsonSha256(finalSkill.cost.items)
    const identity = {
      skillId: skill.skillId,
      sourceRootIds,
      sourceClosureDigest: stableJsonSha256(sourceRoots),
      augmentationEvidenceDigest: args.augmentation.evidence.digest,
      parentCostDigest: skill.parentCostDigest,
      successorCostDigest: skill.successorCostDigest,
      items: skill.items,
      targetSelectors: [selector],
      targetDigests: [itemsDigest],
    }
    const id = r13DispositionEvidenceId('r13-existing-schema-skill-cost', identity)
    addEvidence({
      id,
      scope: 'observation-closure',
      kind: 'r13-existing-schema-skill-cost',
      addresses,
      skillId: skill.skillId,
      sourceRootIds,
      sourceClosureDigest: identity.sourceClosureDigest,
      augmentationEvidenceDigest: args.augmentation.evidence.digest,
      parentCostDigest: skill.parentCostDigest,
      successorCostDigest: skill.successorCostDigest,
      items: structuredClone(skill.items),
      layerTargets: { final: { selectors: [selector], digests: [itemsDigest] } },
      appliesToLayers: ['final'],
    })
    skillCosts.set(skill.skillId, id)
  }
  if (skillCosts.size !== 3)
    throw new Error(`R13 source semantics MG2: 6A skill cost cardinality=${skillCosts.size}`)

  const observations = new Map(
    parent.observations
      // Source-debt observations are regenerated from successor dispositions below;
      // translation-note observations are independent report metadata and must retain
      // the exact parent entry (including its count-bearing reason).
      .filter((entry) => entry.domain !== 'source-command' || entry.id.startsWith('source-note:'))
      .filter(
        (entry) => !R13_6A_SKILL_IDS.some((skillId) => entry.id === `skill:${skillId}:pending`),
      )
      .map((entry) => [entry.id, entry] as const),
  )
  for (const skillId of R13_6A_SKILL_IDS) {
    const pending = parent.observations.find((entry) => entry.id === `skill:${skillId}:pending`)
    if (!pending) throw new Error(`R13 source semantics MG2: 6A parent skill 缺失 ${skillId}`)
    for (const id of pending.evidenceIds) evidence.delete(id)
    const rootIds = [
      `global/skills/${skillId}/scriptOnUse`,
      `global/skills/${skillId}/scriptOnSuccess`,
    ].sort(stableStringCompare)
    const lossyAddresses = [...new Set(rootIds.flatMap(addressesForRoot))].sort(
      (left, right) => left - right,
    )
    const lossyId = `skill:${skillId}:lossy`
    const lossyReason = `skill-lossy:${R13_EXISTING_SCHEMA_SKILL_LOSSY_NOTES[skillId]}`
    const lossyProofId = r13DispositionEvidenceId('open-debt', {
      observationId: lossyId,
      domain: 'skill',
      objectId: skillId,
      rootIds,
      addresses: lossyAddresses,
      batch: 'R13-6',
      reason: lossyReason,
      appliesToLayers: ['raw', 'augmented', 'final'],
    })
    addEvidence({
      id: lossyProofId,
      scope: 'open-debt',
      kind: 'open-debt',
      addresses: lossyAddresses,
      batch: 'R13-6',
      reason: lossyReason,
      appliesToLayers: ['raw', 'augmented', 'final'],
    })
    observations.set(lossyId, {
      id: lossyId,
      domain: 'skill',
      kind: 'lossy',
      objectId: skillId,
      sourceAddresses: lossyAddresses,
      sourceRootIds: rootIds,
      raw: 'open',
      augmented: 'open',
      final: 'open',
      evidenceIds: [lossyProofId],
    })

    const costId = `skill:${skillId}:item-cost`
    const costRootIds = [`global/skills/${skillId}/scriptOnUse`]
    const costAddresses = addressesForRoot(costRootIds[0]!)
    const costProofId = skillCosts.get(skillId)!
    const costOpenId = r13DispositionEvidenceId('open-debt', {
      observationId: costId,
      domain: 'skill',
      objectId: skillId,
      rootIds: costRootIds,
      addresses: costAddresses,
      batch: 'R13-6',
      reason: 'r13-6a-skill-item-cost',
      appliesToLayers: ['raw', 'augmented'],
    })
    addEvidence({
      id: costOpenId,
      scope: 'open-debt',
      kind: 'open-debt',
      addresses: costAddresses,
      sourceRootId: costRootIds[0],
      batch: 'R13-6',
      reason: 'r13-6a-skill-item-cost',
      appliesToLayers: ['raw', 'augmented'],
    })
    observations.set(costId, {
      id: costId,
      domain: 'skill',
      kind: 'item-cost',
      objectId: skillId,
      sourceAddresses: costAddresses,
      sourceRootIds: costRootIds,
      raw: 'open',
      augmented: 'open',
      final: 'accounted',
      evidenceIds: [costProofId, costOpenId].sort(stableStringCompare),
    })
  }

  const sourceDebtGroups = new Map<
    string,
    {
      address: number
      batch: string
      reason: string
      raw: 'open' | 'accounted'
      augmented: 'open' | 'accounted'
      final: 'open' | 'accounted'
      rootIds: Set<string>
      evidenceIds: Set<string>
    }
  >()
  for (const disposition of dispositions.values()) {
    if (disposition.disposition !== 'open-debt') continue
    const site = sites.get(disposition.siteId)!
    const context = contexts.get(site.contextId)!
    for (const id of disposition.evidenceIds) {
      const entry = evidence.get(id)
      if (entry?.kind !== 'open-debt') continue
      const states = {
        raw: disposition.layers.raw.state,
        augmented: disposition.layers.augmented.state,
        final: disposition.layers.final.state,
      }
      const observationId =
        `source:${site.address}:${entry.batch}:${entry.reason}:` +
        `${states.raw}-${states.augmented}-${states.final}`
      const group = sourceDebtGroups.get(observationId) ?? {
        address: site.address,
        batch: entry.batch,
        reason: entry.reason,
        ...states,
        rootIds: new Set<string>(),
        evidenceIds: new Set<string>(),
      }
      group.rootIds.add(context.entrySiteId)
      for (const evidenceId of disposition.evidenceIds) group.evidenceIds.add(evidenceId)
      sourceDebtGroups.set(observationId, group)
    }
  }
  for (const [id, group] of sourceDebtGroups)
    observations.set(id, {
      id,
      domain: 'source-command',
      kind: `${group.batch}:${group.reason}`,
      objectId: String(group.address),
      sourceAddresses: [group.address],
      sourceRootIds: [...group.rootIds].sort(stableStringCompare),
      raw: group.raw,
      augmented: group.augmented,
      final: group.final,
      evidenceIds: [...group.evidenceIds].sort(stableStringCompare),
    })

  const dispositionEntries = [...dispositions.values()].sort((left, right) =>
    stableStringCompare(left.siteId, right.siteId),
  )
  const observationEntries = [...observations.values()].sort((left, right) =>
    stableStringCompare(left.id, right.id),
  )
  const byDisposition = structuredClone(parent.summary.byDisposition)
  byDisposition['open-debt'] -= R13_6A_SITE_ID_COUNT
  byDisposition.structured += R13_6A_SITE_ID_COUNT
  const byLayer = structuredClone(parent.summary.byLayer)
  byLayer.final.open -= R13_6A_SITE_ID_COUNT
  byLayer.final.accounted += R13_6A_SITE_ID_COUNT
  const openAddresses = new Set(
    dispositionEntries
      .filter((entry) => entry.disposition === 'open-debt')
      .map((entry) => sites.get(entry.siteId)?.address)
      .filter((address): address is number => address !== undefined),
  )
  const report = sealR13SourceInstructionDispositionV3({
    kind: 'r13-source-instruction-disposition',
    version: 3,
    methodVersion: parent.methodVersion,
    generator: {
      sourceDigest: parent.generator.sourceDigest,
      rawDigest: parent.generator.rawDigest,
      augmentedDigest: stableJsonSha256({
        snapshot: args.generatedSnapshotDigest,
        report: args.input.historicalMigration.report.content,
        c8: args.input.generated.c8Evidence,
        autoLifecycleRepair: args.input.generated.autoLifecycleRepairEvidence,
        sceneRepair: args.input.generated.sceneSemanticRepairEvidence,
        triggerActivation: args.input.generated.triggerActivationEvidence,
        autoIdleGate: args.input.generated.autoIdleGateEvidence,
        r13EnemyClosure: {
          sourceDispositionDigest: args.input.r13EnemyClosure.sourceDisposition.digest,
          augmentationEvidenceDigest: args.input.r13EnemyClosure.augmentationEvidence.digest,
        },
        r13ExistingSchemaClosure: {
          augmentationEvidenceDigest: args.augmentation.evidence.digest,
          siteCount: 22,
          skillCostCount: 3,
        },
      }),
      finalDigest:
        args.input.generated.snapshot === args.augmentation.snapshot
          ? args.generatedSnapshotDigest
          : digestR13ContentSnapshot(args.augmentation.snapshot),
    },
    census: parent.census,
    evidence: [...evidence.values()].sort((left, right) => stableStringCompare(left.id, right.id)),
    dispositions: dispositionEntries,
    observations: observationEntries,
    summary: {
      ...parent.summary,
      dispositionSites: dispositionEntries.length,
      byDisposition,
      byLayer,
      openDebtSites: byDisposition['open-debt'],
      openDebtSourceAddresses: openAddresses.size,
      observations: observationEntries.length,
      openObservations: observationEntries.filter((entry) => entry.final === 'open').length,
    },
  })
  return report
}

function buildSourceControl(
  report: R13SourceInstructionDispositionV3,
  audit: ScriptControlFlowAuditV1,
  parentReportDigest: typeof R13_SOURCE_SEMANTICS_PARENT_SOURCE_REPORT_DIGEST,
): R13SourceSemanticsSourceControlV1 {
  const existingSchemaSites = report.evidence.filter(
    (proof) => proof.kind === 'r13-existing-schema-site',
  ).length
  const existingSchemaSkillCosts = report.evidence.filter(
    (proof) => proof.kind === 'r13-existing-schema-skill-cost',
  ).length
  if (existingSchemaSites !== 22 || existingSchemaSkillCosts !== 3)
    throw new Error(
      `R13 source semantics MG2: source ledger 6A proof=${existingSchemaSites}/` +
        existingSchemaSkillCosts,
    )
  return {
    version: 3,
    methodVersion: report.methodVersion,
    sourceDigest: report.generator.sourceDigest,
    auditDigest: audit.digest,
    reportDigest: report.digest,
    finalDigest: report.generator.finalDigest,
    summary: {
      executionSites: report.summary.executionSites,
      openDebtSites: report.summary.openDebtSites,
      openObservations: report.summary.openObservations,
      existingSchemaSites: 22,
      existingSchemaSkillCosts: 3,
    },
    parentReportDigest,
  }
}

function buildSourceDisposition(args: {
  input: R13SourceSemanticsDispositionInput
  currentSources: PalMigrationSources
  currentMigration: MigrationFileSet
  preparedCurrentSourceCensus?: PreparedR13SourceExecutionCensus
  augmentation: R13ExistingSchemaAugmentation
}): {
  report: R13SourceInstructionDispositionV3
  control: R13SourceSemanticsSourceControlV1
} {
  if (
    args.input.parentSourceDisposition.digest !== R13_SOURCE_SEMANTICS_PARENT_SOURCE_REPORT_DIGEST
  )
    throw new Error(
      `R13 source semantics MG2: source ledger parent report 漂移 ` +
        `${args.input.parentSourceDisposition.digest} != ` +
        R13_SOURCE_SEMANTICS_PARENT_SOURCE_REPORT_DIGEST,
    )
  const generatedSnapshotDigest = digestR13ExistingSchemaContentSnapshot(
    args.input.generated.snapshot,
  )
  if (generatedSnapshotDigest !== R13_ENEMY_SCRIPT_SUCCESSOR_CONTENT_DIGEST)
    throw new Error('R13 source semantics MG2: source ledger R13-5 generated successor 漂移')
  // Validate the immutable published parent before constructing a successor from it. The
  // following delta validator may therefore focus on the successor and the explicit 6A delta.
  assertR13SourceInstructionDispositionV3(args.input.parentSourceDisposition)
  const report = buildR13SourceDisposition6AFromParent({
    input: args.input,
    currentSources: args.currentSources,
    currentMigration: args.currentMigration,
    augmentation: args.augmentation,
    generatedSnapshotDigest,
  })
  // Run the fail-closed parent-delta validator only after the builder's large working maps
  // have gone out of scope; the validator creates its own indexes and must not overlap them.
  assertR13SourceDisposition6AParentDelta({
    parent: args.input.parentSourceDisposition,
    successor: report,
    ownedSiteIds: args.augmentation.evidence.sites.map((entry) => entry.siteId),
  })
  return {
    report,
    control: buildSourceControl(
      report,
      args.input.historicalAudit,
      R13_SOURCE_SEMANTICS_PARENT_SOURCE_REPORT_DIGEST,
    ),
  }
}

function buildSeal(
  evidence: R13ExistingSchemaAugmentationEvidenceV1,
  changedPaths: readonly string[],
  sourceControl: R13SourceSemanticsSourceControlV1,
): R13SourceSemanticsTransitionSealV1 {
  assertR13ExistingSchemaAugmentationEvidence(evidence)
  return digestRecord<R13SourceSemanticsTransitionSealV1>({
    kind: 'r13-source-semantics-transition',
    version: 1,
    projectId: 'pal',
    transitionId: R13_SOURCE_SEMANTICS_TRANSITION_ID,
    parent: {
      transitionId: R13_ENEMY_SCRIPT_TRANSITION_ID,
      digest: R13_SOURCE_SEMANTICS_PARENT_ENEMY_DIGEST,
    },
    augmentation: structuredClone(evidence),
    merge: {
      changedPaths: [...changedPaths],
      commandSites: 22,
      skillCosts: 3,
    },
    externalPrerequisites: structuredClone(evidence.externalPrerequisites),
    sourceControl: structuredClone(sourceControl),
  })
}

function targetSnapshot(plan: MigrationPlan, managedFiles: ReadonlySet<string>): MigrationSnapshot {
  return {
    files: new Map(plan.target),
    managedFiles: new Set(managedFiles),
  }
}

function withoutAtomicMaps(source: MigrationSnapshot): MigrationSnapshot {
  const result = cloneSnapshot(source)
  for (const path of [...result.files.keys()])
    if (isAtomicProjectMapPath(path) || R13_UNOWNED_OPAQUE_PATHS.includes(path as never))
      result.files.delete(path)
  for (const path of [...result.managedFiles])
    if (isAtomicProjectMapPath(path) || R13_UNOWNED_OPAQUE_PATHS.includes(path as never))
      result.managedFiles.delete(path)
  for (const path of [...(result.hashes?.keys() ?? [])])
    if (isAtomicProjectMapPath(path) || R13_UNOWNED_OPAQUE_PATHS.includes(path as never))
      result.hashes?.delete(path)
  return result
}

function mergeUnownedOpaqueRepresentation(
  target: MigrationSnapshot,
  base: MigrationSnapshot,
  ours: MigrationSnapshot,
  generated: MigrationSnapshot,
): void {
  for (const path of R13_UNOWNED_OPAQUE_PATHS) {
    const basePresent = base.files.has(path) || base.hashes?.has(path) === true
    const generatedPresent = generated.files.has(path) || generated.hashes?.has(path) === true
    const baseHash = snapshotFileHash(base, path)
    const generatedHash = snapshotFileHash(generated, path)
    if (basePresent !== generatedPresent || baseHash !== generatedHash)
      throw new Error(`R13 source semantics MG2: generated 改动非 owned opaque path ${path}`)

    target.files.delete(path)
    target.hashes?.delete(path)
    if (ours.files.has(path)) target.files.set(path, ours.files.get(path)!)
    target.managedFiles.add(path)
    const hash = ours.hashes?.get(path)
    if (hash && ours.files.has(path)) {
      target.hashes ??= new Map()
      target.hashes.set(path, hash)
    } else if (!ours.files.has(path) && ours.hashes?.has(path)) {
      target.hashes ??= new Map()
      target.hashes.set(path, ours.hashes.get(path)!)
    }
  }
}

function mergeUnownedAtomicMapRepresentation(
  target: MigrationSnapshot,
  base: MigrationSnapshot,
  ours: MigrationSnapshot,
  generated: MigrationSnapshot,
): void {
  const paths = new Set<string>()
  for (const view of [base, ours, generated])
    for (const path of view.managedFiles) if (isAtomicProjectMapPath(path)) paths.add(path)
  for (const view of [base, ours, generated])
    for (const path of [...view.files.keys(), ...(view.hashes?.keys() ?? [])])
      if (isAtomicProjectMapPath(path)) paths.add(path)
  for (const path of paths) {
    // The generated successor must not alter maps in this transition. Compare the
    // canonical atomic state (presence + hash), then preserve the checked-out project
    // state verbatim, including an intentional author deletion.
    const basePresent = base.files.has(path) || base.hashes?.has(path) === true
    const generatedPresent = generated.files.has(path) || generated.hashes?.has(path) === true
    const baseHash = snapshotFileHash(base, path)
    const generatedHash = snapshotFileHash(generated, path)
    if (basePresent !== generatedPresent || baseHash !== generatedHash)
      throw new Error(`R13 source semantics MG2: generated 改动非 owned map ${path}`)

    target.files.delete(path)
    target.hashes?.delete(path)
    if (ours.files.has(path)) target.files.set(path, ours.files.get(path)!)
    target.managedFiles.add(path)
    const hash = ours.hashes?.get(path)
    if (hash && ours.files.has(path)) {
      target.hashes ??= new Map()
      target.hashes.set(path, hash)
    } else if (!ours.files.has(path) && ours.hashes?.has(path)) {
      target.hashes ??= new Map()
      target.hashes.set(path, ours.hashes.get(path)!)
    }
  }
}

function assertTargetShape(target: MigrationSnapshot, label: string): void {
  assertNoTransitionControls(target, label)
  for (const path of R13_EXISTING_SCHEMA_CHANGED_PATHS)
    if (!target.files.has(path) || !target.managedFiles.has(path))
      throw new Error(`R13 source semantics MG2: ${label} 缺 owned path ${path}`)
}

function commandClosureSnapshot(
  target: MigrationSnapshot,
  evidence: R13ExistingSchemaAugmentationEvidenceV1,
): void {
  // The pure closure is intentionally strict on the generated side. The merged target uses
  // the same command/skill selectors below, but permits unrelated author leaves in the file.
  assertR13ExistingSchemaFinalTargetClosure(target, evidence)
}

function assertMergedOwnedClosure(
  target: MigrationSnapshot,
  evidence: R13ExistingSchemaAugmentationEvidenceV1,
): void {
  assertR13ExistingSchemaAugmentationEvidence(evidence)
  assertTargetShape(target, 'merged target')
  const owners = [...new Set(evidence.sites.map((entry) => entry.owner))].sort(stableStringCompare)
  for (const owner of owners) {
    const ownerSites = evidence.sites.filter((entry) => entry.owner === owner)
    const site = ownerSites[0]
    if (!site) throw new Error(`R13 source semantics MG2: owner evidence 缺失 ${owner}`)
    const scenePath = `content/scenes/${owner.split('/')[0]}.json`
    const sceneValue = target.files.get(scenePath)
    if (!sceneValue || typeof sceneValue !== 'object' || Array.isArray(sceneValue))
      throw new Error(`R13 source semantics MG2: merged scene 缺失 ${scenePath}`)
    const commandValues = collectCommandsAtOwner(target, owner)
    for (const owned of ownerSites) {
      const matches = commandValues
        .map((command, index) => ({ command, index }))
        .filter((entry) => stableJsonSha256(entry.command) === owned.commandDigest)
      const anchored = matches.filter(({ index }) => {
        const before = commandValues[index - 1]
        const after = commandValues[index + 1]
        return (
          (owned.beforeDigest === undefined
            ? index === 0
            : before !== undefined && stableJsonSha256(before) === owned.beforeDigest) &&
          (owned.afterDigest === undefined
            ? index === commandValues.length - 1
            : after !== undefined && stableJsonSha256(after) === owned.afterDigest)
        )
      })
      if (anchored.length !== 1)
        throw new Error(
          `R13 source semantics MG2: merged owned command 不唯一 ${owner}/${owned.commandDigest}`,
        )
    }
    if (site.parentContainerDigest === site.successorContainerDigest)
      throw new Error(`R13 source semantics MG2: owner parent/successor evidence 未变化 ${owner}`)
  }
  const skills = target.files.get('content/skills.json')
  if (!skills || typeof skills !== 'object' || Array.isArray(skills))
    throw new Error('R13 source semantics MG2: merged skills 缺失')
  const rawSkills = (skills as { skills?: unknown }).skills
  const indexed = new Map(
    (Array.isArray(rawSkills) ? (rawSkills as SkillData[]) : []).map((skill) => [
      String(skill.id),
      skill,
    ]),
  )
  for (const expected of evidence.skills) {
    if (!isDeepStrictEqual(indexed.get(expected.skillId)?.cost?.items, expected.items))
      throw new Error(`R13 source semantics MG2: merged skill cost 漂移 ${expected.skillId}`)
  }
}

/**
 * Resolve all commands below one owned flow from a canonical scene file. This deliberately
 * returns values, not mutable references: author edits are allowed, but an owned inserted
 * command must still occur exactly once.
 */
function collectCommandsAtOwner(target: MigrationSnapshot, owner: string): unknown[] {
  const oracle = R13_EXISTING_SCHEMA_COMMAND_ORACLE.find((entry) => entry.id === owner)
  if (!oracle) return []
  const sceneId = oracle.owner.sceneId
  const scene = target.files.get(`content/scenes/${sceneId}.json`) as unknown as
    | SceneDefV5
    | undefined
  if (!scene) return []
  const ownerDef = oracle.owner
  const flow =
    ownerDef.kind === 'entity'
      ? scene.entities.find((candidate) => candidate.id === ownerDef.entityId)?.behaviors?.[
          ownerDef.channel
        ]?.[ownerDef.behaviorId]?.flow
      : scene.hooks?.[ownerDef.channel]?.variants?.[ownerDef.behaviorId]?.flow
  if (!flow) return []
  const nodeId = oracle.node.id
  const node =
    oracle.node.kind === 'stage'
      ? flow.kind === 'stages'
        ? flow.stages.find((candidate) => candidate.id === nodeId)
        : undefined
      : flow.kind === 'stateMachine'
        ? flow.machine?.states?.[nodeId]
        : undefined
  if (!node) return []
  return oracle.segment === 'body' ? [...(node.body ?? [])] : [...(node.entry?.prepare ?? [])]
}

function assertOldControlsBytePinned(before: MigrationSnapshot, after: MigrationSnapshot): void {
  const controls = [...before.managedFiles].filter((path) => path.startsWith('_transitions/'))
  for (const path of controls) {
    if (
      !isDeepStrictEqual(before.files.get(path), after.files.get(path)) ||
      before.managedFiles.has(path) !== after.managedFiles.has(path) ||
      snapshotFileHash(before, path) !== snapshotFileHash(after, path)
    )
      throw new Error(`R13 source semantics MG2: historical control 漂移 ${path}`)
  }
  const beforeTransitions = before.baselineMetadata?.transitions ?? {}
  const afterTransitions = after.baselineMetadata?.transitions ?? {}
  for (const [id, digest] of Object.entries(beforeTransitions))
    if (id !== R13_SOURCE_SEMANTICS_TRANSITION_ID && afterTransitions[id] !== digest)
      throw new Error(`R13 source semantics MG2: historical metadata 漂移 ${id}`)
}

function installSeal(baseline: MigrationSnapshot, seal: R13SourceSemanticsTransitionSealV1): void {
  baseline.files.set(R13_SOURCE_SEMANTICS_SEAL_PATH, asJson(seal))
  baseline.managedFiles.add(R13_SOURCE_SEMANTICS_SEAL_PATH)
  baseline.hashes?.set(
    R13_SOURCE_SEMANTICS_SEAL_PATH,
    sha256(serializeMigrationJson(asJson(seal), R13_SOURCE_SEMANTICS_SEAL_PATH)),
  )
  if (!baseline.baselineMetadata) throw new Error('R13 source semantics MG2: baseline 缺 metadata')
  baseline.baselineMetadata.transitions[R13_SOURCE_SEMANTICS_TRANSITION_ID] = seal.digest
}

function installAuthorityIntoBaseline(
  baseline: MigrationSnapshot,
  authoritySnapshot: MigrationSnapshot,
): void {
  for (const path of R13_EXISTING_SCHEMA_CHANGED_PATHS) {
    const value = authoritySnapshot.files.get(path)
    if (value === undefined) throw new Error(`R13 source semantics MG2: target 缺 ${path}`)
    baseline.files.set(path, structuredClone(value))
    baseline.managedFiles.add(path)
    baseline.hashes?.set(path, sha256(serializeMigrationJson(value, path)))
  }
}

function prepareAuthority(args: {
  parent: MigrationSnapshot
  currentSources: PalMigrationSources
  currentMigration: MigrationFileSet
  preparedCurrentSourceCensus?: PreparedR13SourceExecutionCensus
  sourceDispositionInput: R13SourceSemanticsDispositionInput
}): PreparedR13SourceSemanticsAuthority {
  const parentContent = contentView(args.parent)
  const augmentation = augmentR13ExistingSchemaAfterEnemy({
    parent: parentContent,
    currentSources: args.currentSources,
    currentMigration: args.currentMigration,
    ...(args.preparedCurrentSourceCensus
      ? { preparedCurrentSourceCensus: args.preparedCurrentSourceCensus }
      : {}),
  })
  const sourceDisposition = buildSourceDisposition({
    input: args.sourceDispositionInput,
    currentSources: args.currentSources,
    currentMigration: args.currentMigration,
    augmentation,
    ...(args.preparedCurrentSourceCensus
      ? { preparedCurrentSourceCensus: args.preparedCurrentSourceCensus }
      : {}),
  })
  if (allowsTrustedMigrationInputDigest()) {
    const historicalMigration = args.sourceDispositionInput.historicalMigration
    const historicalDigest = digestR13SourceSemanticsMigrationInput(historicalMigration)
    const historicalFastDigest = digestR13SourceSemanticsMigrationInputFast(historicalMigration)
    const compactHistoricalMigration = compactHistoricalMigrationForAuthority(historicalMigration)
    registerR13SourceSemanticsCanaryMigrationInputDigest(
      compactHistoricalMigration,
      historicalDigest,
      historicalFastDigest,
    )
    args.sourceDispositionInput.historicalMigration = compactHistoricalMigration
    ;(globalThis as { gc?: () => void }).gc?.()
  }
  // The full source-backed build above validates both inherited reports. Freeze and brand those
  // large external authorities once; rescanning ~81k dispositions on every prepared replay made
  // the supposedly fast path slower than rebuilding the migration plan. A caller replacing either
  // report loses the brand, while in-place edits are prevented by the recursive freeze.
  const frozenParentSourceDisposition = deepFreezeReport(
    args.sourceDispositionInput.parentSourceDisposition,
  )
  const frozenEnemySourceDisposition = deepFreezeReport(
    args.sourceDispositionInput.r13EnemyClosure.sourceDisposition,
  )
  preparedInputReports.add(frozenParentSourceDisposition)
  preparedInputReports.add(frozenEnemySourceDisposition)
  const frozenSourceDisposition = deepFreezeReport(sourceDisposition.report)
  const frozenSourceControl = deepFreezeReport(sourceDisposition.control)
  const sourceDispositionInputDigest = digestSourceDispositionInputs({
    input: args.sourceDispositionInput,
    currentSources: args.currentSources,
    currentMigration: args.currentMigration,
    ...(args.preparedCurrentSourceCensus
      ? { preparedCurrentSourceCensus: args.preparedCurrentSourceCensus }
      : {}),
  })
  const sourceDispositionInputFastDigest = digestSourceDispositionInputs({
    input: args.sourceDispositionInput,
    currentSources: args.currentSources,
    currentMigration: args.currentMigration,
    mode: 'fast',
    ...(args.preparedCurrentSourceCensus
      ? { preparedCurrentSourceCensus: args.preparedCurrentSourceCensus }
      : {}),
  })
  const digest = stableJsonSha256({
    parent: R13_EXISTING_SCHEMA_PARENT_CONTENT_DIGEST,
    evidence: augmentation.evidence.digest,
    sourceControl: frozenSourceControl,
    sourceDispositionInputDigest,
    sourceDispositionInputFastDigest,
  })
  const prepared = Object.freeze({
    parentContent,
    currentSources: args.currentSources,
    currentMigration: args.currentMigration,
    ...(args.preparedCurrentSourceCensus
      ? { preparedCurrentSourceCensus: args.preparedCurrentSourceCensus }
      : {}),
    augmentation,
    sourceDispositionInput: args.sourceDispositionInput,
    sourceDispositionInputDigest,
    sourceDispositionInputFastDigest,
    sourceDisposition: frozenSourceDisposition,
    sourceControl: frozenSourceControl,
    digest,
  })
  preparedAuthorities.add(prepared)
  return prepared
}

function assertPreparedAuthority(
  authority: PreparedR13SourceSemanticsAuthority,
  args: {
    parent: MigrationSnapshot
    currentSources: PalMigrationSources
    currentMigration: MigrationFileSet
    preparedCurrentSourceCensus?: PreparedR13SourceExecutionCensus
    sourceDispositionInput: R13SourceSemanticsDispositionInput
  },
): void {
  if (!preparedAuthorities.has(authority))
    throw new Error('R13 source semantics MG2: prepared authority 不是本模块构建')
  if (
    authority.currentSources !== args.currentSources ||
    authority.currentMigration !== args.currentMigration ||
    authority.preparedCurrentSourceCensus !== args.preparedCurrentSourceCensus ||
    authority.sourceDispositionInput !== args.sourceDispositionInput
  )
    throw new Error('R13 source semantics MG2: prepared authority 输入身份漂移')
  // The initial source-backed build validated, recursively froze, and branded these reports.
  // Rechecking the brand is both mutation-safe and intentionally O(1) on prepared replay.
  if (
    !preparedInputReports.has(args.sourceDispositionInput.parentSourceDisposition) ||
    !preparedInputReports.has(args.sourceDispositionInput.r13EnemyClosure.sourceDisposition)
  )
    throw new Error('R13 source semantics MG2: prepared source report 身份漂移')
  const expectedSourceDispositionInputFastDigest = digestSourceDispositionInputs({
    input: args.sourceDispositionInput,
    currentSources: args.currentSources,
    currentMigration: args.currentMigration,
    mode: 'fast',
    ...(args.preparedCurrentSourceCensus
      ? { preparedCurrentSourceCensus: args.preparedCurrentSourceCensus }
      : {}),
  })
  if (authority.sourceDispositionInputFastDigest !== expectedSourceDispositionInputFastDigest)
    throw new Error('R13 source semantics MG2: prepared source input 内容漂移')
  if (authority.parentContent !== contentView(args.parent)) {
    // contentView creates a new shell, so compare the immutable parent identity by digest rather
    // than object identity. The expensive source-backed augmentation itself remains branded.
    if (
      digestR13ExistingSchemaContentSnapshot(contentView(args.parent)) !==
      digestR13ExistingSchemaContentSnapshot(authority.parentContent)
    )
      throw new Error('R13 source semantics MG2: prepared parent 漂移')
  }
  assertR13ExistingSchemaFinalTargetClosure(
    authority.augmentation.snapshot,
    authority.augmentation.evidence,
  )
  // `authority` is module-branded and its successor report was recursively frozen before the
  // brand was installed. Repeating the full structural scan here defeats the prepared fast path.
  if (
    args.sourceDispositionInput.parentSourceDisposition.digest !==
    R13_SOURCE_SEMANTICS_PARENT_SOURCE_REPORT_DIGEST
  )
    throw new Error('R13 source semantics MG2: prepared parent source ledger 漂移')
  const expectedControl = buildSourceControl(
    authority.sourceDisposition,
    args.sourceDispositionInput.historicalAudit,
    R13_SOURCE_SEMANTICS_PARENT_SOURCE_REPORT_DIGEST,
  )
  if (!isDeepStrictEqual(expectedControl, authority.sourceControl))
    throw new Error('R13 source semantics MG2: prepared source ledger 摘要漂移')
  const expectedDigest = stableJsonSha256({
    parent: R13_EXISTING_SCHEMA_PARENT_CONTENT_DIGEST,
    evidence: authority.augmentation.evidence.digest,
    sourceControl: authority.sourceControl,
    sourceDispositionInputDigest: authority.sourceDispositionInputDigest,
    sourceDispositionInputFastDigest: authority.sourceDispositionInputFastDigest,
  })
  if (authority.digest !== expectedDigest)
    throw new Error('R13 source semantics MG2: prepared authority 摘要漂移')
}

export function createR13SourceSemanticsV5MigrationPlan(args: {
  base: MigrationSnapshot
  ours: MigrationSnapshot
  currentSources: PalMigrationSources
  currentMigration: MigrationFileSet
  projectPrerequisites?: ReadonlyMap<string, MigrationJson>
  preparedCurrentSourceCensus?: PreparedR13SourceExecutionCensus
  sourceDispositionInput: R13SourceSemanticsDispositionInput
  preparedAuthority?: PreparedR13SourceSemanticsAuthority
}): R13SourceSemanticsV5MigrationPlan {
  assertPublishedEnemyParent(args.base)
  const sealMode = appendOnlyTransitionState(args.base, {
    transitionId: R13_SOURCE_SEMANTICS_TRANSITION_ID,
    sealPath: R13_SOURCE_SEMANTICS_SEAL_PATH,
    errorPrefix: 'R13 source semantics MG2',
  })
  assertProjectHasNoTransitionFiles(args.ours, 'project')
  assertWarmAmbiencePrerequisite(args)

  let authority: PreparedR13SourceSemanticsAuthority
  let publishedSeal: R13SourceSemanticsTransitionSealV1 | undefined
  let expectedSeal: R13SourceSemanticsTransitionSealV1
  if (sealMode === 'replay') {
    const raw = args.base.files.get(R13_SOURCE_SEMANTICS_SEAL_PATH)
    const digest = recordDigest(raw, R13_SOURCE_SEMANTICS_SEAL_PATH)
    if (args.base.baselineMetadata?.transitions[R13_SOURCE_SEMANTICS_TRANSITION_ID] !== digest)
      throw new Error('R13 source semantics MG2: seal 与 metadata 不符')
    publishedSeal = structuredClone(raw) as unknown as R13SourceSemanticsTransitionSealV1
    assertR13ExistingSchemaAugmentationEvidence(publishedSeal.augmentation)
    if (
      publishedSeal.kind !== 'r13-source-semantics-transition' ||
      publishedSeal.version !== 1 ||
      publishedSeal.projectId !== 'pal' ||
      publishedSeal.transitionId !== R13_SOURCE_SEMANTICS_TRANSITION_ID
    )
      throw new Error('R13 source semantics MG2: published seal envelope 无效')
    const successorContent = contentView(args.base)
    assertR13ExistingSchemaFinalTargetClosure(successorContent, publishedSeal.augmentation)
    const parentContent = rewindR13ExistingSchemaAugmentation(
      successorContent,
      publishedSeal.augmentation,
    )
    const authorityArgs = {
      parent: parentContent,
      currentSources: args.currentSources,
      currentMigration: args.currentMigration,
      ...(args.preparedCurrentSourceCensus
        ? { preparedCurrentSourceCensus: args.preparedCurrentSourceCensus }
        : {}),
      sourceDispositionInput: args.sourceDispositionInput,
    }
    if (args.preparedAuthority) {
      assertPreparedAuthority(args.preparedAuthority, authorityArgs)
      authority = args.preparedAuthority
    } else authority = prepareAuthority(authorityArgs)
    expectedSeal = buildSeal(
      authority.augmentation.evidence,
      R13_EXISTING_SCHEMA_CHANGED_PATHS,
      authority.sourceControl,
    )
    assertR13SourceSemanticsPublishedSealMatchesAuthority(publishedSeal, expectedSeal)
  } else {
    const parentContent = contentView(args.base)
    if (args.preparedAuthority) {
      assertPreparedAuthority(args.preparedAuthority, {
        parent: parentContent,
        currentSources: args.currentSources,
        currentMigration: args.currentMigration,
        ...(args.preparedCurrentSourceCensus
          ? { preparedCurrentSourceCensus: args.preparedCurrentSourceCensus }
          : {}),
        sourceDispositionInput: args.sourceDispositionInput,
      })
      authority = args.preparedAuthority
    } else {
      authority = prepareAuthority({
        parent: parentContent,
        currentSources: args.currentSources,
        currentMigration: args.currentMigration,
        ...(args.preparedCurrentSourceCensus
          ? { preparedCurrentSourceCensus: args.preparedCurrentSourceCensus }
          : {}),
        sourceDispositionInput: args.sourceDispositionInput,
      })
    }
    expectedSeal = buildSeal(
      authority.augmentation.evidence,
      R13_EXISTING_SCHEMA_CHANGED_PATHS,
      authority.sourceControl,
    )
  }
  const baseContent = contentView(args.base)
  const oursContent = contentView(args.ours)
  const generated = authority.augmentation.snapshot
  const generatedContent = contentView(generated)
  assertNoTransitionControls(baseContent, 'base content')
  assertNoTransitionControls(oursContent, 'ours content')
  assertNoTransitionControls(generatedContent, 'generated content')
  const mergeBase = withoutAtomicMaps(baseContent)
  const mergeOurs = withoutAtomicMaps(oursContent)
  const mergeGenerated = withoutAtomicMaps(generatedContent)
  const plan = createMigrationPlan(mergeBase, mergeOurs, mergeGenerated)
  if (plan.conflicts.length)
    throw new Error(`R13 source semantics MG2: 三方 merge 冲突 ${JSON.stringify(plan.conflicts)}`)
  if (
    plan.target.has(R13_SOURCE_SEMANTICS_SEAL_PATH) ||
    plan.writes.has(R13_SOURCE_SEMANTICS_SEAL_PATH) ||
    plan.deletes.includes(R13_SOURCE_SEMANTICS_SEAL_PATH)
  )
    throw new Error('R13 source semantics MG2: control 泄漏到 plan')
  const unexpectedWrites = [...plan.writes.keys()].filter(
    (path) =>
      !R13_EXISTING_SCHEMA_CHANGED_PATHS.includes(
        path as (typeof R13_EXISTING_SCHEMA_CHANGED_PATHS)[number],
      ),
  )
  const unexpectedDeletes = plan.deletes.filter(
    (path) =>
      !R13_EXISTING_SCHEMA_CHANGED_PATHS.includes(
        path as (typeof R13_EXISTING_SCHEMA_CHANGED_PATHS)[number],
      ),
  )
  if (unexpectedWrites.length || unexpectedDeletes.length)
    throw new Error(
      `R13 source semantics MG2: 非 owned delta writes=${unexpectedWrites.join(',')} ` +
        `deletes=${unexpectedDeletes.join(',')}`,
    )
  const targetManaged = new Set([
    ...mergeBase.managedFiles,
    ...mergeOurs.managedFiles,
    ...mergeGenerated.managedFiles,
    ...plan.target.keys(),
  ])
  const target = targetSnapshot(plan, targetManaged)
  mergeUnownedAtomicMapRepresentation(target, baseContent, oursContent, generatedContent)
  mergeUnownedOpaqueRepresentation(target, baseContent, oursContent, generatedContent)
  assertTargetShape(target, 'target')
  commandClosureSnapshot(generatedContent, authority.augmentation.evidence)
  assertMergedOwnedClosure(target, authority.augmentation.evidence)

  const nextBaseline = cloneSnapshot(args.base)
  installAuthorityIntoBaseline(nextBaseline, authority.augmentation.snapshot)
  const seal = publishedSeal ?? expectedSeal
  installSeal(nextBaseline, seal)
  assertOldControlsBytePinned(args.base, nextBaseline)
  const expectedManaged = new Set([...args.base.managedFiles, R13_SOURCE_SEMANTICS_SEAL_PATH])
  if (!isDeepStrictEqual(nextBaseline.managedFiles, expectedManaged))
    throw new Error('R13 source semantics MG2: nextBaseline managed set 漂移')
  if (!nextBaseline.baselineMetadata)
    throw new Error('R13 source semantics MG2: nextBaseline metadata 缺失')
  if (nextBaseline.baselineMetadata.transitions[R13_SOURCE_SEMANTICS_TRANSITION_ID] !== seal.digest)
    throw new Error('R13 source semantics MG2: nextBaseline transition digest 漂移')
  return {
    plan,
    target,
    nextBaseline,
    augmentation: authority.augmentation,
    seal,
    sealMode,
    authority,
  }
}

export function assertR13SourceSemanticsPublishedSealMatchesAuthority(
  published: unknown,
  expected: R13SourceSemanticsTransitionSealV1,
): void {
  if (!isDeepStrictEqual(published, expected))
    throw new Error('R13 source semantics MG2: published seal 与 authority 不符')
}
