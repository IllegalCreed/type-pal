import { isDeepStrictEqual } from 'node:util'
import {
  type MigrationSnapshot,
  serializeMigrationJson,
  sha256,
  snapshotFileHash,
} from '../../migration-baseline.js'
import type { MigrationFileSet, MigrationJson, PalMigrationSources } from '../../pal-migration.js'
import type { ScriptControlFlowAuditV1 } from '../../script-control-flow-audit.js'
import { C8_ITEM_USE_SEAL_PATH } from './c8-item-use-mg2.js'
import type { P7GeneratedCanonical } from './p7-generated.js'
import { P7_FULL_LEDGER_PATH } from './p7-mg2.js'
import {
  type PreparedR13CadenceAuthority,
  prepareR13CadenceAuthority,
  R13_CADENCE_SEAL_PATH,
} from './r13-cadence-mg2.js'
import {
  createR13ConfirmV5MigrationPlan,
  type PreparedR13ConfirmAuthority,
  type PreparedR13ConfirmControlAuditAuthority,
  prepareR13ConfirmAuthority,
  prepareR13ConfirmControlAuditAuthority,
  R13_CONFIRM_SEAL_PATH,
  R13_CONFIRM_TRANSITION_ID,
  type R13ConfirmV5MigrationPlan,
} from './r13-confirm-mg2.js'
import {
  type PreparedR13CrossActivationAuthority,
  prepareR13CrossActivationAuthority,
  R13_CROSS_ACTIVATION_SEAL_PATH,
} from './r13-cross-activation-mg2.js'
import {
  assertPreparedR13EnemyScriptMergedTargetClosure,
  assertR13EnemyScriptAugmentationEvidence,
  assertR13EnemyScriptFinalTargetClosure,
  augmentR13EnemyScriptsAfterConfirm,
  type PreparedR13EnemyScriptMergedTargetClosure,
  prepareR13EnemyScriptMergedTargetClosure,
  type R13EnemyScriptAugmentation,
  type R13EnemyScriptAugmentationEvidenceV1,
} from './r13-enemy-script-augmentation.js'
import {
  type PreparedR13ItemThrowAuthority,
  prepareR13ItemThrowAuthority,
  R13_ITEM_THROW_SEAL_PATH,
} from './r13-item-throw-mg2.js'
import {
  assertHistoricalR13_5RuntimeCapabilityAuditReportV3,
  assertHistoricalR13_5RuntimeCapabilityAuditV3,
  buildAndAssertR13RuntimeCapabilityAuditV3,
  type R13_RUNTIME_CAPABILITY_V3_METHOD,
  type R13RuntimeCapabilityAuditV3,
} from './runtime-capability-audit-v3.js'
import type { PreparedR13SourceExecutionCensus } from './source-execution-census.js'
import {
  buildAndAssertR13SourceInstructionDispositionV3,
  type R13_SOURCE_DISPOSITION_METHOD_V3,
  type R13DebtBatch,
  type R13SourceInstructionDispositionBuildArgs,
  type R13SourceInstructionDispositionV3,
} from './source-instruction-disposition.js'
import { digestRecord, stableJsonSha256 } from './stable-json.js'

export const R13_ENEMY_SCRIPT_TRANSITION_ID = 'r13-enemy-script-v1' as const
export const R13_ENEMY_SCRIPT_SEAL_PATH = '_transitions/r13-enemy-script-v1.json' as const

const HISTORICAL_CONTROLS = [
  {
    path: P7_FULL_LEDGER_PATH,
    transitionId: 'script-v4-v5',
    fileSha256: '41263ba1fa216af014bf8b880405a587938be38938449f77ccec84ed40da6b12',
    transitionDigest: '9b01dea89f4d567663ad64e03017d1ecdbdb01fb1540e6798a931f47900f4901',
  },
  {
    path: C8_ITEM_USE_SEAL_PATH,
    transitionId: 'c8-item-use-v5-v1',
    fileSha256: '325d52ed750e29ab5757002821037a270498b2f8c3af5158a79d568a27df3a24',
    transitionDigest: 'fbdbd50f5e47b924c8bf4dcfb0700d5b08a04afa0d3cc2bff0711b4b9da627a3',
  },
  {
    path: R13_CADENCE_SEAL_PATH,
    transitionId: 'r13-cadence-v1',
    fileSha256: '2b1e71b018ffba8aecd4adea628c325dd4f67e338508b22f6ed06f4517683453',
    transitionDigest: '794659488a19cd131e2b5f7db235b62607264c9b77978edd36318119937dd80a',
  },
  {
    path: R13_CROSS_ACTIVATION_SEAL_PATH,
    transitionId: 'r13-cross-activation-v1',
    fileSha256: '723e4fd29f7d69aa861d67d5188038d242c1f5ff619d5c7fdce2854bdf50db12',
    transitionDigest: 'd20c06c821a044a6f6be2430da1d660d801a00b03b210082ba954e76b09bc686',
  },
  {
    path: R13_ITEM_THROW_SEAL_PATH,
    transitionId: 'r13-item-throw-v1',
    fileSha256: '2c74122277d724f77dfb3e0375bf88188a90bbf73541c872fad77a0a99f62b08',
    transitionDigest: 'c8df75a51de4c71ae5e71d43583b749736aecd61b0fd65e9b2568f2e1324502b',
  },
  {
    path: R13_CONFIRM_SEAL_PATH,
    transitionId: R13_CONFIRM_TRANSITION_ID,
    fileSha256: '38d129fbe45fe9815ba2623b62283a290c302b3a816a4d58c2e6418f833f49b6',
    transitionDigest: '8909257867ff6873e17ea4534d183b325e908615bdc2c8630cfc7174efce313d',
  },
] as const

export interface R13EnemyScriptAuditSealV1 {
  sourceControl: {
    version: 3
    methodVersion: typeof R13_SOURCE_DISPOSITION_METHOD_V3
    sourceDigest: string
    auditDigest: string
    reportDigest: string
    finalDigest: string
    summary: {
      executionSites: number
      openDebtSites: number
      openObservations: number
      finalOpenR13_5Sites: number
      finalOpenR13_5Observations: number
      finalOpenR13_6Sites: number
      finalOpenR13_6Observations: number
    }
  }
  runtimeExecution: {
    version: 3
    methodVersion: typeof R13_RUNTIME_CAPABILITY_V3_METHOD
    reportDigest: string
    corpusDigest: string
    summary: R13RuntimeCapabilityAuditV3['summary']
  }
}

interface R13EnemyScriptTransitionSealBodyV1 {
  kind: 'r13-enemy-script-transition'
  version: 1
  projectId: 'pal'
  transitionId: typeof R13_ENEMY_SCRIPT_TRANSITION_ID
  parent: {
    transitionId: typeof R13_CONFIRM_TRANSITION_ID
    digest: string
  }
  augmentation: R13EnemyScriptAugmentationEvidenceV1
  audits: R13EnemyScriptAuditSealV1
}

export interface R13EnemyScriptTransitionSealV1 extends R13EnemyScriptTransitionSealBodyV1 {
  digest: string
}

export interface R13EnemyScriptV5MigrationPlan extends R13ConfirmV5MigrationPlan {
  enemyScriptEvidence: R13EnemyScriptAugmentationEvidenceV1
  enemyScriptSeal: R13EnemyScriptTransitionSealV1
  enemyScriptSealMode: 'initialize' | 'replay'
  enemyScriptAuthoritySourceDisposition: R13SourceInstructionDispositionV3
  enemyScriptAuthorityRuntimeCapability: R13RuntimeCapabilityAuditV3
  enemyScriptSourceDisposition: R13SourceInstructionDispositionV3
  enemyScriptRuntimeCapability: R13RuntimeCapabilityAuditV3
}

export interface PreparedR13EnemyScriptAuthority {
  readonly generated: P7GeneratedCanonical
  readonly historicalSources: PalMigrationSources
  readonly historicalMigration: MigrationFileSet
  readonly historicalAudit: ScriptControlFlowAuditV1
  readonly currentSources: PalMigrationSources
  readonly currentMigration: MigrationFileSet
  readonly currentAudit: ScriptControlFlowAuditV1
  readonly preparedHistoricalSourceCensus?: PreparedR13SourceExecutionCensus
  readonly preparedCurrentSourceCensus?: PreparedR13SourceExecutionCensus
  readonly augmentation: R13EnemyScriptAugmentation
  readonly mergedTargetClosure: PreparedR13EnemyScriptMergedTargetClosure
  readonly successorGenerated: P7GeneratedCanonical
  readonly sourceDisposition: R13SourceInstructionDispositionV3
  readonly runtimeCapability: R13RuntimeCapabilityAuditV3
  readonly auditSeal: R13EnemyScriptAuditSealV1
  readonly cadenceAuthority: PreparedR13CadenceAuthority
  readonly crossActivationAuthority: PreparedR13CrossActivationAuthority
  readonly itemThrowAuthority: PreparedR13ItemThrowAuthority
  readonly confirmAuthority: PreparedR13ConfirmAuthority
  readonly confirmControlAuditAuthority: PreparedR13ConfirmControlAuditAuthority
  readonly digest: string
}

const preparedAuthorities = new WeakSet<PreparedR13EnemyScriptAuthority>()

function deepFreezeReport<T>(value: T, seen = new WeakSet<object>()): T {
  if (!value || typeof value !== 'object' || seen.has(value)) return value
  seen.add(value)
  for (const nested of Object.values(value as Record<string, unknown>))
    deepFreezeReport(nested, seen)
  return Object.freeze(value)
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

function asMigrationJson(value: R13EnemyScriptTransitionSealV1): MigrationJson {
  return JSON.parse(JSON.stringify(value)) as MigrationJson
}

function recordDigest(value: MigrationJson | undefined, path: string): string {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`R13 enemy script MG2: ${path} 无效`)
  const { digest, ...body } = value
  if (typeof digest !== 'string' || !/^[a-f0-9]{64}$/.test(digest))
    throw new Error(`R13 enemy script MG2: ${path}.digest 无效`)
  if (stableJsonSha256(body) !== digest) throw new Error(`R13 enemy script MG2: ${path} 自摘要不符`)
  return digest
}

function publishedConfirmDigest(base: MigrationSnapshot): string {
  const expected = base.baselineMetadata?.transitions[R13_CONFIRM_TRANSITION_ID]
  if (!expected) throw new Error('R13 enemy script MG2: baseline 缺 R13 confirm metadata')
  const actual = recordDigest(base.files.get(R13_CONFIRM_SEAL_PATH), R13_CONFIRM_SEAL_PATH)
  if (actual !== expected)
    throw new Error('R13 enemy script MG2: R13 confirm seal 与 metadata 不符')
  return actual
}

function transitionState(base: MigrationSnapshot): 'initialize' | 'replay' {
  const metadata = base.baselineMetadata?.transitions[R13_ENEMY_SCRIPT_TRANSITION_ID] !== undefined
  const file = base.files.has(R13_ENEMY_SCRIPT_SEAL_PATH)
  const managed = base.managedFiles.has(R13_ENEMY_SCRIPT_SEAL_PATH)
  const hash = base.hashes?.has(R13_ENEMY_SCRIPT_SEAL_PATH) === true
  if (!metadata && !file && !managed && !hash) return 'initialize'
  if (metadata && file && managed && hash) return 'replay'
  throw new Error(
    `R13 enemy script MG2: transition 半状态 metadata=${metadata} file=${file} ` +
      `managed=${managed} hash=${hash}`,
  )
}

function stripControl(
  source: MigrationSnapshot,
  options: { removeMetadata: boolean },
): MigrationSnapshot {
  const result = cloneSnapshot(source)
  result.files.delete(R13_ENEMY_SCRIPT_SEAL_PATH)
  result.managedFiles.delete(R13_ENEMY_SCRIPT_SEAL_PATH)
  result.hashes?.delete(R13_ENEMY_SCRIPT_SEAL_PATH)
  if (options.removeMetadata && result.baselineMetadata)
    delete result.baselineMetadata.transitions[R13_ENEMY_SCRIPT_TRANSITION_ID]
  return result
}

function finalOpenSitesForBatch(
  report: R13SourceInstructionDispositionV3,
  batch: R13DebtBatch,
): number {
  const evidence = new Map(report.evidence.map((entry) => [entry.id, entry]))
  return report.dispositions.filter(
    (entry) =>
      entry.layers.final.state === 'open' &&
      entry.layers.final.evidenceIds.some((id) => {
        const proof = evidence.get(id)
        return (
          proof?.scope === 'open-debt' &&
          proof.kind === 'open-debt' &&
          proof.batch === batch &&
          proof.appliesToLayers.includes('final')
        )
      }),
  ).length
}

function finalOpenObservationsForBatch(
  report: R13SourceInstructionDispositionV3,
  batch: R13DebtBatch,
): number {
  const evidence = new Map(report.evidence.map((entry) => [entry.id, entry]))
  return report.observations.filter(
    (entry) =>
      entry.final === 'open' &&
      entry.evidenceIds.some((id) => {
        const proof = evidence.get(id)
        return (
          proof?.scope === 'open-debt' &&
          proof.kind === 'open-debt' &&
          proof.batch === batch &&
          proof.appliesToLayers.includes('final')
        )
      }),
  ).length
}

function buildAuditSeal(
  sourceDisposition: R13SourceInstructionDispositionV3,
  runtimeCapability: R13RuntimeCapabilityAuditV3,
  sourceAudit: ScriptControlFlowAuditV1,
): R13EnemyScriptAuditSealV1 {
  const finalOpenR13_5Sites = finalOpenSitesForBatch(sourceDisposition, 'R13-5')
  const finalOpenR13_5Observations = finalOpenObservationsForBatch(sourceDisposition, 'R13-5')
  const finalOpenR13_6Sites = finalOpenSitesForBatch(sourceDisposition, 'R13-6')
  const finalOpenR13_6Observations = finalOpenObservationsForBatch(sourceDisposition, 'R13-6')
  if (
    sourceDisposition.summary.executionSites !== 81_674 ||
    sourceDisposition.summary.openDebtSites !== 27_826 ||
    sourceDisposition.summary.openObservations !== 7_259 ||
    finalOpenR13_5Sites !== 0 ||
    finalOpenR13_5Observations !== 0 ||
    finalOpenR13_6Sites !== 215 ||
    finalOpenR13_6Observations !== 197
  )
    throw new Error(
      `R13 enemy script MG2: final open=${sourceDisposition.summary.openDebtSites}/` +
        `${sourceDisposition.summary.openObservations}, R13-5=${finalOpenR13_5Sites}/` +
        `${finalOpenR13_5Observations}, R13-6=${finalOpenR13_6Sites}/` +
        `${finalOpenR13_6Observations}`,
    )
  if (
    runtimeCapability.summary.refusedUses !== 0 ||
    runtimeCapability.summary.openIssues !== 0 ||
    runtimeCapability.issues.length !== 0
  )
    throw new Error(
      `R13 enemy script MG2: runtime debt=${runtimeCapability.summary.openIssues}/` +
        `${runtimeCapability.summary.refusedUses}`,
    )
  return {
    sourceControl: {
      version: 3,
      methodVersion: sourceDisposition.methodVersion,
      sourceDigest: sourceDisposition.generator.sourceDigest,
      auditDigest: sourceAudit.digest,
      reportDigest: sourceDisposition.digest,
      finalDigest: sourceDisposition.generator.finalDigest,
      summary: {
        executionSites: sourceDisposition.summary.executionSites,
        openDebtSites: sourceDisposition.summary.openDebtSites,
        openObservations: sourceDisposition.summary.openObservations,
        finalOpenR13_5Sites,
        finalOpenR13_5Observations,
        finalOpenR13_6Sites,
        finalOpenR13_6Observations,
      },
    },
    runtimeExecution: {
      version: 3,
      methodVersion: runtimeCapability.methodVersion,
      reportDigest: runtimeCapability.digest,
      corpusDigest: runtimeCapability.generator.corpusDigest,
      summary: structuredClone(runtimeCapability.summary),
    },
  }
}

function buildSeal(
  evidence: R13EnemyScriptAugmentationEvidenceV1,
  audits: R13EnemyScriptAuditSealV1,
  parentDigest: string,
): R13EnemyScriptTransitionSealV1 {
  assertR13EnemyScriptAugmentationEvidence(evidence)
  return digestRecord<R13EnemyScriptTransitionSealV1>({
    kind: 'r13-enemy-script-transition',
    version: 1,
    projectId: 'pal',
    transitionId: R13_ENEMY_SCRIPT_TRANSITION_ID,
    parent: {
      transitionId: R13_CONFIRM_TRANSITION_ID,
      digest: parentDigest,
    },
    augmentation: structuredClone(evidence),
    audits: structuredClone(audits),
  })
}

function assertSuccessorGeneratedIdentity(
  parent: P7GeneratedCanonical,
  successor: P7GeneratedCanonical,
  snapshot: MigrationSnapshot,
): void {
  const parentRecord = parent as unknown as Record<string, unknown>
  const successorRecord = successor as unknown as Record<string, unknown>
  const parentKeys = Object.keys(parentRecord).sort()
  const successorKeys = Object.keys(successorRecord).sort()
  if (
    successor === parent ||
    parent.snapshot === successor.snapshot ||
    successor.snapshot !== snapshot ||
    !isDeepStrictEqual(parentKeys, successorKeys) ||
    Object.keys(parentRecord).some(
      (key) => key !== 'snapshot' && successorRecord[key] !== parentRecord[key],
    )
  )
    throw new Error('R13 enemy script MG2: successor generated 身份漂移')
}

export function assertR13EnemyScriptPublishedSealMatchesAuthority(
  publishedSeal: unknown,
  expectedSeal: R13EnemyScriptTransitionSealV1,
): void {
  if (!isDeepStrictEqual(publishedSeal, expectedSeal))
    throw new Error('R13 enemy script MG2: 权威重建证据与已发布 seal 不符')
}

export function prepareR13EnemyScriptAuthority(args: {
  generated: P7GeneratedCanonical
  historicalSources: PalMigrationSources
  historicalMigration: MigrationFileSet
  historicalAudit: ScriptControlFlowAuditV1
  currentSources: PalMigrationSources
  currentMigration: MigrationFileSet
  currentAudit: ScriptControlFlowAuditV1
  preparedHistoricalSourceCensus?: PreparedR13SourceExecutionCensus
  preparedCurrentSourceCensus?: PreparedR13SourceExecutionCensus
}): PreparedR13EnemyScriptAuthority {
  const augmentation = augmentR13EnemyScriptsAfterConfirm({
    parent: args.generated.snapshot,
    historicalMigration: args.historicalMigration,
    currentSources: args.currentSources,
    currentMigration: args.currentMigration,
  })
  const mergedTargetClosure = prepareR13EnemyScriptMergedTargetClosure(
    args.generated.snapshot,
    augmentation.snapshot,
    augmentation.evidence,
  )
  const successorGenerated: P7GeneratedCanonical = Object.freeze({
    ...args.generated,
    snapshot: augmentation.snapshot,
  })
  assertSuccessorGeneratedIdentity(args.generated, successorGenerated, augmentation.snapshot)
  const r13EnemyClosure = {
    sourceDisposition: augmentation.enemySourceDisposition,
    currentSources: args.currentSources,
    currentMigration: args.currentMigration,
    augmentationEvidence: augmentation.evidence,
  }
  const sourceArgs: R13SourceInstructionDispositionBuildArgs = {
    sources: args.historicalSources,
    migration: args.historicalMigration,
    audit: args.historicalAudit,
    generated: successorGenerated,
    final: augmentation.snapshot,
    r13EnemyClosure,
    ...(args.preparedHistoricalSourceCensus
      ? { preparedSourceCensus: args.preparedHistoricalSourceCensus }
      : {}),
  }
  const sourceDisposition = buildAndAssertR13SourceInstructionDispositionV3(sourceArgs)
  const runtimeCapability = augmentation.runtimeCapability
  assertHistoricalR13_5RuntimeCapabilityAuditReportV3(runtimeCapability)
  const auditSeal = buildAuditSeal(sourceDisposition, runtimeCapability, args.historicalAudit)

  const cadenceAuthority = prepareR13CadenceAuthority(successorGenerated)
  const crossActivationAuthority = prepareR13CrossActivationAuthority({
    generated: successorGenerated,
    sources: args.historicalSources,
    migration: args.historicalMigration,
    audit: args.historicalAudit,
    ...(args.preparedHistoricalSourceCensus
      ? { preparedSourceCensus: args.preparedHistoricalSourceCensus }
      : {}),
  })
  const itemThrowAuthority = prepareR13ItemThrowAuthority(successorGenerated)
  const confirmAuthority = prepareR13ConfirmAuthority(successorGenerated)
  const confirmControlAuditAuthority = prepareR13ConfirmControlAuditAuthority({
    generated: successorGenerated,
    sources: args.historicalSources,
    migration: args.historicalMigration,
    audit: args.historicalAudit,
    ...(args.preparedHistoricalSourceCensus
      ? { preparedSourceCensus: args.preparedHistoricalSourceCensus }
      : {}),
  })
  const prepared = Object.freeze({
    ...args,
    augmentation,
    mergedTargetClosure,
    successorGenerated,
    sourceDisposition: deepFreezeReport(sourceDisposition),
    runtimeCapability: deepFreezeReport(runtimeCapability),
    auditSeal: deepFreezeReport(auditSeal),
    cadenceAuthority,
    crossActivationAuthority,
    itemThrowAuthority,
    confirmAuthority,
    confirmControlAuditAuthority,
    digest: stableJsonSha256({
      augmentation: augmentation.evidence.digest,
      sourceDisposition: sourceDisposition.digest,
      runtimeCapability: runtimeCapability.digest,
      auditSeal,
    }),
  })
  preparedAuthorities.add(prepared)
  return prepared
}

function assertPreparedAuthority(
  prepared: PreparedR13EnemyScriptAuthority,
  args: Parameters<typeof prepareR13EnemyScriptAuthority>[0],
): void {
  if (!preparedAuthorities.has(prepared))
    throw new Error('R13 enemy script MG2: prepared authority 非本进程完整构建 authority')
  if (
    prepared.generated !== args.generated ||
    prepared.historicalSources !== args.historicalSources ||
    prepared.historicalMigration !== args.historicalMigration ||
    prepared.historicalAudit !== args.historicalAudit ||
    prepared.currentSources !== args.currentSources ||
    prepared.currentMigration !== args.currentMigration ||
    prepared.currentAudit !== args.currentAudit ||
    prepared.preparedHistoricalSourceCensus !== args.preparedHistoricalSourceCensus ||
    prepared.preparedCurrentSourceCensus !== args.preparedCurrentSourceCensus
  )
    throw new Error('R13 enemy script MG2: prepared authority 输入身份漂移')
  assertR13EnemyScriptFinalTargetClosure(
    prepared.augmentation.snapshot,
    prepared.augmentation.evidence,
  )
  assertPreparedR13EnemyScriptMergedTargetClosure(
    prepared.mergedTargetClosure,
    prepared.augmentation.snapshot,
  )
  // prepared 只接受本模块完整构建并登记在 WeakSet 的 authority。每次复用都重验 pure
  // successor 全闭包、R13-5 owned target closure 与摘要，防止签后 Map 内容漂移；但不再
  // 遍历 81,674 个 execution sites。未提供 prepared 的生产路径仍会完整重建并断言源账。
  assertHistoricalR13_5RuntimeCapabilityAuditV3(
    prepared.runtimeCapability,
    prepared.augmentation.snapshot,
  )
  const auditSeal = buildAuditSeal(
    prepared.sourceDisposition,
    prepared.runtimeCapability,
    args.historicalAudit,
  )
  const digest = stableJsonSha256({
    augmentation: prepared.augmentation.evidence.digest,
    sourceDisposition: prepared.sourceDisposition.digest,
    runtimeCapability: prepared.runtimeCapability.digest,
    auditSeal,
  })
  if (
    !isDeepStrictEqual(auditSeal, prepared.auditSeal) ||
    digest !== prepared.digest ||
    prepared.successorGenerated.snapshot !== prepared.augmentation.snapshot
  )
    throw new Error('R13 enemy script MG2: prepared authority 摘要漂移')
  assertSuccessorGeneratedIdentity(
    args.generated,
    prepared.successorGenerated,
    prepared.augmentation.snapshot,
  )
}

export function createR13EnemyScriptV5MigrationPlan(args: {
  base: MigrationSnapshot
  ours: MigrationSnapshot
  generated: P7GeneratedCanonical
  historicalSources: PalMigrationSources
  historicalMigration: MigrationFileSet
  historicalAudit: ScriptControlFlowAuditV1
  currentSources: PalMigrationSources
  currentMigration: MigrationFileSet
  currentAudit: ScriptControlFlowAuditV1
  preparedHistoricalSourceCensus?: PreparedR13SourceExecutionCensus
  preparedCurrentSourceCensus?: PreparedR13SourceExecutionCensus
  preparedAuthority?: PreparedR13EnemyScriptAuthority
}): R13EnemyScriptV5MigrationPlan {
  const enemyScriptSealMode = transitionState(args.base)
  const parentDigest = publishedConfirmDigest(args.base)
  if (
    args.ours.files.has(R13_ENEMY_SCRIPT_SEAL_PATH) ||
    args.ours.hashes?.has(R13_ENEMY_SCRIPT_SEAL_PATH)
  )
    throw new Error('R13 enemy script MG2: project 不得携带 enemy-script seal')
  if (
    args.generated.snapshot.files.has(R13_ENEMY_SCRIPT_SEAL_PATH) ||
    args.generated.snapshot.managedFiles.has(R13_ENEMY_SCRIPT_SEAL_PATH) ||
    args.generated.snapshot.hashes?.has(R13_ENEMY_SCRIPT_SEAL_PATH)
  )
    throw new Error('R13 enemy script MG2: generated 不得携带 enemy-script seal')

  const authorityArgs = {
    generated: args.generated,
    historicalSources: args.historicalSources,
    historicalMigration: args.historicalMigration,
    historicalAudit: args.historicalAudit,
    currentSources: args.currentSources,
    currentMigration: args.currentMigration,
    currentAudit: args.currentAudit,
    ...(args.preparedHistoricalSourceCensus
      ? { preparedHistoricalSourceCensus: args.preparedHistoricalSourceCensus }
      : {}),
    ...(args.preparedCurrentSourceCensus
      ? { preparedCurrentSourceCensus: args.preparedCurrentSourceCensus }
      : {}),
  }
  if (args.preparedAuthority) assertPreparedAuthority(args.preparedAuthority, authorityArgs)
  const authority = args.preparedAuthority ?? prepareR13EnemyScriptAuthority(authorityArgs)
  const expectedSeal = buildSeal(authority.augmentation.evidence, authority.auditSeal, parentDigest)
  let publishedSeal: R13EnemyScriptTransitionSealV1 | undefined
  if (enemyScriptSealMode === 'replay') {
    const raw = args.base.files.get(R13_ENEMY_SCRIPT_SEAL_PATH)
    const digest = recordDigest(raw, R13_ENEMY_SCRIPT_SEAL_PATH)
    if (args.base.baselineMetadata?.transitions[R13_ENEMY_SCRIPT_TRANSITION_ID] !== digest)
      throw new Error('R13 enemy script MG2: seal 与 transition metadata 不符')
    publishedSeal = structuredClone(raw) as unknown as R13EnemyScriptTransitionSealV1
    assertR13EnemyScriptPublishedSealMatchesAuthority(publishedSeal, expectedSeal)
  }

  const confirm = createR13ConfirmV5MigrationPlan({
    base: stripControl(args.base, { removeMetadata: true }),
    ours: stripControl(args.ours, { removeMetadata: false }),
    generated: authority.successorGenerated,
    sources: args.historicalSources,
    migration: args.historicalMigration,
    audit: args.historicalAudit,
    ...(args.preparedHistoricalSourceCensus
      ? { preparedSourceCensus: args.preparedHistoricalSourceCensus }
      : {}),
    preparedCadenceAuthority: authority.cadenceAuthority,
    preparedCrossActivationAuthority: authority.crossActivationAuthority,
    preparedItemThrowAuthority: authority.itemThrowAuthority,
    preparedAuthority: authority.confirmAuthority,
    preparedControlAuditAuthority: authority.confirmControlAuditAuthority,
  })
  if (confirm.confirmSealMode !== 'replay' || confirm.confirmSeal.digest !== parentDigest)
    throw new Error('R13 enemy script MG2: R13 confirm parent 未按已发布 seal 回放')
  if (
    confirm.target.files.has(R13_ENEMY_SCRIPT_SEAL_PATH) ||
    confirm.target.managedFiles.has(R13_ENEMY_SCRIPT_SEAL_PATH) ||
    confirm.plan.target.has(R13_ENEMY_SCRIPT_SEAL_PATH)
  )
    throw new Error('R13 enemy script MG2: enemy-script seal 泄漏到工程 target')
  assertPreparedR13EnemyScriptMergedTargetClosure(authority.mergedTargetClosure, confirm.target)
  // 全量源账属于确定性的 successor authority；作者三方合并后的 target 由上面的逐字段 owned
  // delta closure 独立校验。把 81,674-site 报告重新绑定到作者 target 既不会增加 R13-5
  // 证明力，又会让每次 replay 重做数分钟全表扫描。target 自身仍须跑完整 runtime capability。
  const finalSourceDisposition = authority.sourceDisposition
  // authority report 重放发布时的 R13-5 matrix；合并后的作者 target 面向当前 runtime，
  // 因此必须独立按 current matrix（scene-entry prepare 可执行 wait）验证。
  const finalRuntimeCapability = buildAndAssertR13RuntimeCapabilityAuditV3(confirm.target)
  buildAuditSeal(finalSourceDisposition, finalRuntimeCapability, args.historicalAudit)

  const leakedControlPaths = new Set([
    ...[...confirm.target.files.keys()].filter((path) => path.startsWith('_transitions/')),
    ...[...confirm.target.managedFiles].filter((path) => path.startsWith('_transitions/')),
    ...[...(confirm.target.hashes?.keys() ?? [])].filter((path) =>
      path.startsWith('_transitions/'),
    ),
    ...[...confirm.plan.target.keys()].filter((path) => path.startsWith('_transitions/')),
  ])
  if (leakedControlPaths.size)
    throw new Error(
      `R13 enemy script MG2: historical control 泄漏到工程 target ` +
        `${[...leakedControlPaths].join(',')}`,
    )

  for (const control of HISTORICAL_CONTROLS) {
    const baseValue = args.base.files.get(control.path)
    const nextValue = confirm.nextBaseline.files.get(control.path)
    if (
      baseValue === undefined ||
      nextValue === undefined ||
      !isDeepStrictEqual(baseValue, nextValue) ||
      !args.base.managedFiles.has(control.path) ||
      !confirm.nextBaseline.managedFiles.has(control.path) ||
      sha256(serializeMigrationJson(baseValue, control.path)) !== control.fileSha256 ||
      sha256(serializeMigrationJson(nextValue, control.path)) !== control.fileSha256 ||
      args.base.baselineMetadata?.transitions[control.transitionId] !== control.transitionDigest ||
      confirm.nextBaseline.baselineMetadata?.transitions[control.transitionId] !==
        control.transitionDigest
    )
      throw new Error(`R13 enemy script MG2: 历史 control 漂移 ${control.path}`)
  }

  const enemyScriptSeal = publishedSeal ?? expectedSeal
  confirm.nextBaseline.files.set(R13_ENEMY_SCRIPT_SEAL_PATH, asMigrationJson(enemyScriptSeal))
  confirm.nextBaseline.managedFiles.add(R13_ENEMY_SCRIPT_SEAL_PATH)
  confirm.nextBaseline.hashes?.delete(R13_ENEMY_SCRIPT_SEAL_PATH)
  if (!confirm.nextBaseline.baselineMetadata)
    throw new Error('R13 enemy script MG2: nextBaseline 丢失 metadata')
  confirm.nextBaseline.baselineMetadata.transitions[R13_ENEMY_SCRIPT_TRANSITION_ID] =
    enemyScriptSeal.digest
  const expectedManagedFiles = new Set([...args.base.managedFiles, R13_ENEMY_SCRIPT_SEAL_PATH])
  const expectedTransitions = {
    ...args.base.baselineMetadata?.transitions,
    [R13_ENEMY_SCRIPT_TRANSITION_ID]: enemyScriptSeal.digest,
  }
  const changedPaths = new Set(authority.augmentation.evidence.files.changedPaths)
  const baselineDrifts = [...args.base.managedFiles].filter((path) => {
    if (changedPaths.has(path)) {
      const expected = authority.augmentation.snapshot.files.get(path)
      const actual = confirm.nextBaseline.files.get(path)
      return expected === undefined || actual === undefined || !isDeepStrictEqual(actual, expected)
    }
    const expected = snapshotFileHash(args.base, path)
    return expected === undefined || snapshotFileHash(confirm.nextBaseline, path) !== expected
  })
  const unmanagedBaselineFile = [...confirm.nextBaseline.files.keys()].find(
    (path) => !confirm.nextBaseline.managedFiles.has(path),
  )
  if (
    args.base.baselineMetadata === undefined ||
    confirm.nextBaseline.baselineMetadata.generatorEpoch !==
      args.base.baselineMetadata.generatorEpoch ||
    !isDeepStrictEqual(confirm.nextBaseline.managedFiles, expectedManagedFiles) ||
    !isDeepStrictEqual(confirm.nextBaseline.baselineMetadata.transitions, expectedTransitions) ||
    baselineDrifts.length > 0 ||
    unmanagedBaselineFile !== undefined
  )
    throw new Error(
      `R13 enemy script MG2: append-only baseline 形状漂移` +
        (baselineDrifts.length ? ` paths=${baselineDrifts.join(',')}` : '') +
        (unmanagedBaselineFile ? ` unmanaged=${unmanagedBaselineFile}` : ''),
    )
  return {
    ...confirm,
    enemyScriptEvidence: authority.augmentation.evidence,
    enemyScriptSeal,
    enemyScriptSealMode,
    enemyScriptAuthoritySourceDisposition: authority.sourceDisposition,
    enemyScriptAuthorityRuntimeCapability: authority.runtimeCapability,
    enemyScriptSourceDisposition: finalSourceDisposition,
    enemyScriptRuntimeCapability: finalRuntimeCapability,
  }
}
