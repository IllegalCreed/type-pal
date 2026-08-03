import { isDeepStrictEqual } from 'node:util'
import type { MigrationSnapshot } from '../../migration-baseline.js'
import type { MigrationFileSet, MigrationJson, PalMigrationSources } from '../../pal-migration.js'
import type { ScriptControlFlowAuditV1 } from '../../script-control-flow-audit.js'
import { appendOnlyTransitionState } from './append-only-transition-state.js'
import {
  assertEquipBattleSpriteFinalTargetClosure,
  assertEquipBattleSpriteUpgradeBacked,
  type EquipBattleSpriteUpgradeEvidenceV1,
} from './equip-battle-sprite-v8-authority.js'
import type { P7GeneratedCanonical } from './p7-generated.js'
import type { PreparedR13CadenceAuthority } from './r13-cadence-mg2.js'
import {
  assertR13ConfirmControlFlowEvidence,
  assertR13ConfirmDispositionBacked,
  assertR13ConfirmFinalTargetClosure,
  type R13ConfirmControlFlowEvidenceV1,
} from './r13-confirm-control-flow.js'
import type { PreparedR13CrossActivationAuthority } from './r13-cross-activation-mg2.js'
import {
  createR13ItemThrowV5MigrationPlan,
  type PreparedR13ItemThrowAuthority,
  R13_ITEM_THROW_SEAL_PATH,
  R13_ITEM_THROW_TRANSITION_ID,
  type R13ItemThrowV5MigrationPlan,
} from './r13-item-throw-mg2.js'
import {
  assertHistoricalR13ConfirmRuntimeCapabilityAudit,
  auditHistoricalR13ConfirmRuntimeCapabilities,
  type R13_RUNTIME_CAPABILITY_METHOD,
  type R13RuntimeCapabilityAuditV2,
} from './runtime-capability-audit.js'
import type { PreparedR13SourceExecutionCensus } from './source-execution-census.js'
import {
  buildAndAssertR13SourceInstructionDispositionV3,
  type R13_SOURCE_DISPOSITION_METHOD_V3,
  type R13SourceInstructionDispositionBuildArgs,
  type R13SourceInstructionDispositionV3,
} from './source-instruction-disposition.js'
import { digestRecord, stableJsonSha256 } from './stable-json.js'

export const R13_CONFIRM_TRANSITION_ID = 'r13-confirm-v1' as const
export const R13_CONFIRM_SEAL_PATH = '_transitions/r13-confirm-v1.json' as const

export interface R13ConfirmControlAuditSealV1 {
  sourceControl: {
    version: 3
    methodVersion: typeof R13_SOURCE_DISPOSITION_METHOD_V3
    sourceDigest: string
    censusDigest: string
    reportDigest: string
    confirmEvidenceDigest: string
    confirmProofDigest: string
    confirmDispositionDigest: string
    summary: {
      executionSites: number
      confirmSites: number
      physicalTargets: number
      finalAccountedConfirmSites: number
      finalOpenR13_4Sites: number
    }
  }
  runtimeExecution: {
    version: 2
    methodVersion: typeof R13_RUNTIME_CAPABILITY_METHOD
    reportDigest: string
    matrixDigest: string
    confirmCells: Array<{
      context: 'world-interactive' | 'world-auto' | 'item-private-world'
      status: 'executed'
      evidenceId: 'reforge:v5-script-confirm-modal'
    }>
    confirmCellsDigest: string
    confirmUsesDigest: string
    evidenceIds: string[]
    summary: {
      confirmUses: number
      executedConfirmUses: number
      refusedConfirmUses: number
      openConfirmDebts: number
    }
  }
}

interface R13ConfirmTransitionSealBodyV1 {
  kind: 'r13-confirm-transition'
  version: 1
  projectId: 'pal'
  transitionId: typeof R13_CONFIRM_TRANSITION_ID
  parent: {
    transitionId: typeof R13_ITEM_THROW_TRANSITION_ID
    digest: string
  }
  evidence: R13ConfirmControlFlowEvidenceV1
  audits: R13ConfirmControlAuditSealV1
}

export interface R13ConfirmTransitionSealV1 extends R13ConfirmTransitionSealBodyV1 {
  digest: string
}

export interface R13ConfirmV5MigrationPlan extends R13ItemThrowV5MigrationPlan {
  confirmEvidence: R13ConfirmControlFlowEvidenceV1
  confirmSeal: R13ConfirmTransitionSealV1
  confirmSealMode: 'initialize' | 'replay'
  confirmSourceDisposition: R13SourceInstructionDispositionV3
  confirmRuntimeCapability: R13RuntimeCapabilityAuditV2
  equipBattleSpriteEvidence: EquipBattleSpriteUpgradeEvidenceV1
}

export interface PreparedR13ConfirmAuthority {
  readonly generated: P7GeneratedCanonical
  readonly successorSnapshot: MigrationSnapshot
  readonly parentSnapshot: MigrationSnapshot
  readonly evidence: R13ConfirmControlFlowEvidenceV1
  readonly evidenceDigest: string
}

export interface PreparedR13ConfirmControlAuditAuthority {
  readonly sources: PalMigrationSources
  readonly migration: MigrationFileSet
  readonly audit: ScriptControlFlowAuditV1
  readonly generated: P7GeneratedCanonical
  readonly preparedSourceCensus?: PreparedR13SourceExecutionCensus
  readonly final: MigrationSnapshot
  readonly sourceDisposition: R13SourceInstructionDispositionV3
  readonly runtimeCapability: R13RuntimeCapabilityAuditV2
  readonly sealEvidence: R13ConfirmControlAuditSealV1
  readonly digest: string
}

const preparedControlAuditAuthorities = new WeakSet<PreparedR13ConfirmControlAuditAuthority>()

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

function recordDigest(value: MigrationJson | undefined, path: string): string {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`R13 confirm MG2: ${path} 无效`)
  const { digest, ...body } = value
  if (typeof digest !== 'string' || !/^[a-f0-9]{64}$/.test(digest))
    throw new Error(`R13 confirm MG2: ${path}.digest 无效`)
  if (stableJsonSha256(body) !== digest) throw new Error(`R13 confirm MG2: ${path} 自摘要不符`)
  return digest
}

function publishedItemThrowDigest(base: MigrationSnapshot): string {
  const expected = base.baselineMetadata?.transitions[R13_ITEM_THROW_TRANSITION_ID]
  if (!expected) throw new Error('R13 confirm MG2: baseline 缺 R13 item-throw metadata')
  const actual = recordDigest(base.files.get(R13_ITEM_THROW_SEAL_PATH), R13_ITEM_THROW_SEAL_PATH)
  if (actual !== expected) throw new Error('R13 confirm MG2: R13 item-throw seal 与 metadata 不符')
  return actual
}

function stripControl(
  source: MigrationSnapshot,
  options: { removeMetadata: boolean },
): MigrationSnapshot {
  const result = cloneSnapshot(source)
  result.files.delete(R13_CONFIRM_SEAL_PATH)
  result.managedFiles.delete(R13_CONFIRM_SEAL_PATH)
  result.hashes?.delete(R13_CONFIRM_SEAL_PATH)
  if (options.removeMetadata && result.baselineMetadata)
    delete result.baselineMetadata.transitions[R13_CONFIRM_TRANSITION_ID]
  return result
}

function buildSeal(
  evidence: R13ConfirmControlFlowEvidenceV1,
  parentDigest: string,
  controlAudits: PreparedR13ConfirmControlAuditAuthority,
): R13ConfirmTransitionSealV1 {
  assertR13ConfirmControlFlowEvidence(evidence)
  return digestRecord<R13ConfirmTransitionSealV1>({
    kind: 'r13-confirm-transition',
    version: 1,
    projectId: 'pal',
    transitionId: R13_CONFIRM_TRANSITION_ID,
    parent: {
      transitionId: R13_ITEM_THROW_TRANSITION_ID,
      digest: parentDigest,
    },
    evidence: structuredClone(evidence),
    audits: structuredClone(controlAudits.sealEvidence),
  })
}

function asMigrationJson(value: R13ConfirmTransitionSealV1): MigrationJson {
  return JSON.parse(JSON.stringify(value)) as MigrationJson
}

export function prepareR13ConfirmAuthority(
  generated: P7GeneratedCanonical,
): PreparedR13ConfirmAuthority {
  assertR13ConfirmControlFlowEvidence(generated.confirmEvidence)
  assertR13ConfirmDispositionBacked(
    generated.r13ConfirmParentSnapshot,
    generated.r13ConfirmSuccessorSnapshot,
    generated.confirmEvidence,
  )
  assertR13ConfirmFinalTargetClosure(
    generated.r13ConfirmSuccessorSnapshot,
    generated.confirmEvidence,
  )
  assertEquipBattleSpriteUpgradeBacked(
    generated.r13ConfirmSuccessorSnapshot,
    generated.snapshot,
    generated.equipBattleSpriteEvidence,
  )
  return Object.freeze({
    generated,
    successorSnapshot: generated.r13ConfirmSuccessorSnapshot,
    parentSnapshot: generated.r13ConfirmParentSnapshot,
    evidence: generated.confirmEvidence,
    evidenceDigest: generated.confirmEvidence.digest,
  })
}

function assertPreparedAuthority(
  prepared: PreparedR13ConfirmAuthority,
  generated: P7GeneratedCanonical,
): void {
  if (
    prepared.generated !== generated ||
    prepared.successorSnapshot !== generated.r13ConfirmSuccessorSnapshot ||
    prepared.parentSnapshot !== generated.r13ConfirmParentSnapshot ||
    prepared.evidence !== generated.confirmEvidence
  )
    throw new Error('R13 confirm MG2: prepared authority 输入身份漂移')
  if (
    prepared.evidenceDigest !== prepared.evidence.digest ||
    prepared.evidenceDigest !== generated.confirmEvidence.digest
  )
    throw new Error('R13 confirm MG2: prepared authority 摘要漂移')
  assertR13ConfirmDispositionBacked(
    prepared.parentSnapshot,
    prepared.successorSnapshot,
    prepared.evidence,
  )
  assertR13ConfirmFinalTargetClosure(prepared.successorSnapshot, prepared.evidence)
}

function buildConfirmControlAuditSealEvidence(
  sourceDisposition: R13SourceInstructionDispositionV3,
  runtimeCapability: R13RuntimeCapabilityAuditV2,
  confirmEvidenceDigest: string,
): R13ConfirmControlAuditSealV1 {
  const dispositionBySite = new Map(
    sourceDisposition.dispositions.map((entry) => [entry.siteId, entry]),
  )
  const evidenceById = new Map(sourceDisposition.evidence.map((entry) => [entry.id, entry]))
  const confirmProofs = sourceDisposition.evidence.filter(
    (entry) => entry.kind === 'r13-confirm-site',
  )
  const confirmDispositions = confirmProofs.map((proof) => dispositionBySite.get(proof.siteId)!)
  const physicalTargets = confirmProofs.reduce(
    (total, proof) => total + proof.targetSelectors.length,
    0,
  )
  const finalOpenR13_4Sites = sourceDisposition.dispositions.filter(
    (entry) =>
      entry.layers.final.state === 'open' &&
      entry.evidenceIds.some((id) => {
        const proof = evidenceById.get(id)
        return proof?.kind === 'open-debt' && proof.batch === 'R13-4'
      }),
  ).length
  if (
    confirmProofs.length !== 28 ||
    physicalTargets !== 31 ||
    confirmProofs.some((proof) => proof.confirmEvidenceDigest !== confirmEvidenceDigest) ||
    confirmProofs.some(
      (proof) =>
        dispositionBySite.get(proof.siteId)?.layers.augmented.state !== 'accounted' ||
        dispositionBySite.get(proof.siteId)?.layers.final.state !== 'accounted',
    ) ||
    finalOpenR13_4Sites !== 0
  )
    throw new Error(`R13 confirm MG2: source confirm closure=${confirmProofs.length}/28`)

  const confirmContexts = new Set(['world-interactive', 'world-auto', 'item-private-world'])
  const confirmCells = runtimeCapability.matrix.commandCells.filter(
    (cell) => cell.kind === 'confirm' && confirmContexts.has(cell.context),
  )
  const confirmUses = runtimeCapability.uses.filter(
    (use) => use.domain === 'command' && use.kind === 'confirm',
  )
  const evidenceIds = [
    ...new Set([...confirmCells, ...confirmUses].map((entry) => entry.evidenceId)),
  ].sort()
  const executedConfirmUses = confirmUses.filter((use) => use.status === 'executed').length
  const refusedConfirmUses = confirmUses.filter((use) => use.status === 'refused').length
  const openConfirmDebts = runtimeCapability.debts.reduce(
    (total, debt) => total + debt.sites.length,
    0,
  )
  if (
    confirmCells.length !== 3 ||
    new Set(confirmCells.map((cell) => cell.context)).size !== 3 ||
    confirmCells.some(
      (cell) => cell.status !== 'executed' || cell.evidenceId !== 'reforge:v5-script-confirm-modal',
    ) ||
    confirmUses.length !== 31 ||
    executedConfirmUses !== 31 ||
    refusedConfirmUses !== 0 ||
    evidenceIds.length !== 1 ||
    evidenceIds[0] !== 'reforge:v5-script-confirm-modal' ||
    runtimeCapability.summary.openDebts !== 0 ||
    openConfirmDebts !== 0 ||
    runtimeCapability.debts.length !== 0
  )
    throw new Error(`R13 confirm MG2: runtime confirm debt=${runtimeCapability.summary.openDebts}`)
  return {
    sourceControl: {
      version: 3,
      methodVersion: sourceDisposition.methodVersion,
      sourceDigest: sourceDisposition.generator.sourceDigest,
      censusDigest: sourceDisposition.census.digest,
      reportDigest: sourceDisposition.digest,
      confirmEvidenceDigest,
      confirmProofDigest: stableJsonSha256(confirmProofs),
      confirmDispositionDigest: stableJsonSha256(confirmDispositions),
      summary: {
        executionSites: sourceDisposition.summary.executionSites,
        confirmSites: confirmProofs.length,
        physicalTargets,
        finalAccountedConfirmSites: confirmDispositions.filter(
          (entry) => entry.layers.final.state === 'accounted',
        ).length,
        finalOpenR13_4Sites,
      },
    },
    runtimeExecution: {
      version: 2,
      methodVersion: runtimeCapability.methodVersion,
      reportDigest: runtimeCapability.digest,
      matrixDigest: stableJsonSha256(runtimeCapability.matrix),
      confirmCells: confirmCells.map((cell) => ({
        context: cell.context as 'world-interactive' | 'world-auto' | 'item-private-world',
        status: 'executed',
        evidenceId: 'reforge:v5-script-confirm-modal',
      })),
      confirmCellsDigest: stableJsonSha256(confirmCells),
      confirmUsesDigest: stableJsonSha256(confirmUses),
      evidenceIds,
      summary: {
        confirmUses: confirmUses.length,
        executedConfirmUses,
        refusedConfirmUses,
        openConfirmDebts,
      },
    },
  }
}

export function prepareR13ConfirmControlAuditAuthority(args: {
  sources: PalMigrationSources
  migration: MigrationFileSet
  audit: ScriptControlFlowAuditV1
  generated: P7GeneratedCanonical
  preparedSourceCensus?: PreparedR13SourceExecutionCensus
}): PreparedR13ConfirmControlAuditAuthority {
  const final = args.generated.r13ConfirmSuccessorSnapshot
  const authorityGenerated: P7GeneratedCanonical = {
    ...args.generated,
    snapshot: final,
  }
  const sourceArgs: R13SourceInstructionDispositionBuildArgs = {
    ...args,
    generated: authorityGenerated,
    final,
    bindIndirectEntityBodies: false,
  }
  const sourceDisposition = buildAndAssertR13SourceInstructionDispositionV3(sourceArgs)
  const runtimeCapability = auditHistoricalR13ConfirmRuntimeCapabilities(final)
  assertHistoricalR13ConfirmRuntimeCapabilityAudit(runtimeCapability, final)
  const sealEvidence = buildConfirmControlAuditSealEvidence(
    sourceDisposition,
    runtimeCapability,
    args.generated.confirmEvidence.digest,
  )
  const prepared = Object.freeze({
    ...args,
    final,
    sourceDisposition: deepFreezeReport(sourceDisposition),
    runtimeCapability: deepFreezeReport(runtimeCapability),
    sealEvidence: deepFreezeReport(sealEvidence),
    digest: stableJsonSha256({
      sourceDisposition: sourceDisposition.digest,
      runtimeCapability: runtimeCapability.digest,
      sealEvidence,
    }),
  })
  preparedControlAuditAuthorities.add(prepared)
  return prepared
}

function assertPreparedControlAuditAuthority(
  prepared: PreparedR13ConfirmControlAuditAuthority,
  args: {
    sources: PalMigrationSources
    migration: MigrationFileSet
    audit: ScriptControlFlowAuditV1
    generated: P7GeneratedCanonical
    preparedSourceCensus?: PreparedR13SourceExecutionCensus
  },
): void {
  if (!preparedControlAuditAuthorities.has(prepared))
    throw new Error('R13 confirm MG2: prepared control audit 非本进程完整构建 authority')
  if (
    prepared.sources !== args.sources ||
    prepared.migration !== args.migration ||
    prepared.audit !== args.audit ||
    prepared.generated !== args.generated ||
    prepared.preparedSourceCensus !== args.preparedSourceCensus ||
    prepared.final !== args.generated.r13ConfirmSuccessorSnapshot
  )
    throw new Error('R13 confirm MG2: prepared control audit 输入身份漂移')
  // prepared 只接受本模块完整构建并深冻结的 capability object；这里只重验输入身份、
  // 已签摘要与 R13-4 自己拥有的 confirm slice，避免每个 half-state/tamper 用例重扫
  // 81,674 个 execution sites。未提供 prepared 的 release/生产路径仍完整重建。
  if (
    prepared.sourceDisposition.digest !== prepared.sealEvidence.sourceControl.reportDigest ||
    prepared.runtimeCapability.digest !== prepared.sealEvidence.runtimeExecution.reportDigest
  )
    throw new Error('R13 confirm MG2: prepared control audit report 摘要漂移')
  const sealEvidence = buildConfirmControlAuditSealEvidence(
    prepared.sourceDisposition,
    prepared.runtimeCapability,
    args.generated.confirmEvidence.digest,
  )
  if (stableJsonSha256(sealEvidence) !== stableJsonSha256(prepared.sealEvidence))
    throw new Error('R13 confirm MG2: prepared control audit seal evidence 漂移')
  const digest = stableJsonSha256({
    sourceDisposition: prepared.sourceDisposition.digest,
    runtimeCapability: prepared.runtimeCapability.digest,
    sealEvidence: prepared.sealEvidence,
  })
  if (prepared.digest !== digest)
    throw new Error('R13 confirm MG2: prepared control audit 摘要漂移')
}

export function assertR13ConfirmPublishedSealMatchesAuthority(
  publishedSeal: unknown,
  expectedSeal: R13ConfirmTransitionSealV1,
): void {
  if (!isDeepStrictEqual(publishedSeal, expectedSeal)) {
    const published = publishedSeal as Partial<R13ConfirmTransitionSealV1> | undefined
    throw new Error(
      'R13 confirm MG2: 权威重建证据与已发布 seal 不符 ' +
        JSON.stringify({
          publishedDigest: typeof published?.digest === 'string' ? published.digest : undefined,
          expectedDigest: expectedSeal.digest,
          publishedEvidenceDigest: (published?.evidence as { digest?: unknown } | undefined)?.digest,
          expectedEvidenceDigest: expectedSeal.evidence.digest,
          publishedAuditDigest:
            published?.audits === undefined ? undefined : stableJsonSha256(published.audits),
          expectedAuditDigest: stableJsonSha256(expectedSeal.audits),
          publishedSourceReportDigest: published?.audits?.sourceControl?.reportDigest,
          expectedSourceReportDigest: expectedSeal.audits.sourceControl.reportDigest,
          publishedRuntimeReportDigest: published?.audits?.runtimeExecution?.reportDigest,
          expectedRuntimeReportDigest: expectedSeal.audits.runtimeExecution.reportDigest,
          publishedRuntimeMatrixDigest: published?.audits?.runtimeExecution?.matrixDigest,
          expectedRuntimeMatrixDigest: expectedSeal.audits.runtimeExecution.matrixDigest,
        }),
    )
  }
}

export interface R13ConfirmSealAuthorityArgs {
  base: MigrationSnapshot
  generated: P7GeneratedCanonical
  sources: PalMigrationSources
  migration: MigrationFileSet
  audit: ScriptControlFlowAuditV1
  preparedSourceCensus?: PreparedR13SourceExecutionCensus
  preparedAuthority?: PreparedR13ConfirmAuthority
  preparedControlAuditAuthority?: PreparedR13ConfirmControlAuditAuthority
}

export interface RebuiltR13ConfirmSealAuthority {
  seal: R13ConfirmTransitionSealV1
  parentDigest: string
  authority: PreparedR13ConfirmAuthority
  controlAudits: PreparedR13ConfirmControlAuditAuthority
}

/**
 * 从 immutable source authority 重建 expected seal。它不信任已发布 confirm seal 正文，
 * 因而也可供“state 已签、单个正文被外部清理”的显式恢复路径做双摘要核验。
 */
export function rebuildR13ConfirmSealAuthority(
  args: R13ConfirmSealAuthorityArgs,
): RebuiltR13ConfirmSealAuthority {
  const parentDigest = publishedItemThrowDigest(args.base)
  if (
    args.generated.snapshot.files.has(R13_CONFIRM_SEAL_PATH) ||
    args.generated.snapshot.managedFiles.has(R13_CONFIRM_SEAL_PATH) ||
    args.generated.snapshot.hashes?.has(R13_CONFIRM_SEAL_PATH)
  )
    throw new Error('R13 confirm MG2: generated 不得携带 confirm seal')
  if (args.preparedAuthority) assertPreparedAuthority(args.preparedAuthority, args.generated)
  const authority = args.preparedAuthority ?? prepareR13ConfirmAuthority(args.generated)
  const controlAuditArgs = {
    sources: args.sources,
    migration: args.migration,
    audit: args.audit,
    generated: args.generated,
    ...(args.preparedSourceCensus ? { preparedSourceCensus: args.preparedSourceCensus } : {}),
  }
  if (args.preparedControlAuditAuthority)
    assertPreparedControlAuditAuthority(args.preparedControlAuditAuthority, controlAuditArgs)
  const controlAudits =
    args.preparedControlAuditAuthority ?? prepareR13ConfirmControlAuditAuthority(controlAuditArgs)
  return {
    seal: buildSeal(authority.evidence, parentDigest, controlAudits),
    parentDigest,
    authority,
    controlAudits,
  }
}

/**
 * R13-4 append-only outer wrapper。内层完整 replay R13-3 immutable authority；
 * confirm seal 只签 content8 parent→successor，E1 content9 target 另以独立 evidence 验真。
 */
export function createR13ConfirmV5MigrationPlan(args: {
  base: MigrationSnapshot
  ours: MigrationSnapshot
  generated: P7GeneratedCanonical
  sources: PalMigrationSources
  migration: MigrationFileSet
  audit: ScriptControlFlowAuditV1
  preparedSourceCensus?: PreparedR13SourceExecutionCensus
  preparedCadenceAuthority?: PreparedR13CadenceAuthority
  preparedCrossActivationAuthority?: PreparedR13CrossActivationAuthority
  preparedItemThrowAuthority?: PreparedR13ItemThrowAuthority
  preparedAuthority?: PreparedR13ConfirmAuthority
  preparedControlAuditAuthority?: PreparedR13ConfirmControlAuditAuthority
}): R13ConfirmV5MigrationPlan {
  const confirmSealMode = appendOnlyTransitionState(args.base, {
    transitionId: R13_CONFIRM_TRANSITION_ID,
    sealPath: R13_CONFIRM_SEAL_PATH,
    errorPrefix: 'R13 confirm MG2',
  })
  if (args.ours.files.has(R13_CONFIRM_SEAL_PATH) || args.ours.hashes?.has(R13_CONFIRM_SEAL_PATH))
    throw new Error('R13 confirm MG2: project 不得携带 confirm seal')

  assertEquipBattleSpriteUpgradeBacked(
    args.generated.r13ConfirmSuccessorSnapshot,
    args.generated.snapshot,
    args.generated.equipBattleSpriteEvidence,
  )
  const rebuilt = rebuildR13ConfirmSealAuthority({
    base: args.base,
    generated: args.generated,
    sources: args.sources,
    migration: args.migration,
    audit: args.audit,
    ...(args.preparedSourceCensus ? { preparedSourceCensus: args.preparedSourceCensus } : {}),
    ...(args.preparedAuthority ? { preparedAuthority: args.preparedAuthority } : {}),
    ...(args.preparedControlAuditAuthority
      ? { preparedControlAuditAuthority: args.preparedControlAuditAuthority }
      : {}),
  })
  const { authority, controlAudits, parentDigest, seal: expectedSeal } = rebuilt
  let publishedSeal: R13ConfirmTransitionSealV1 | undefined
  if (confirmSealMode === 'replay') {
    const raw = args.base.files.get(R13_CONFIRM_SEAL_PATH)
    const digest = recordDigest(raw, R13_CONFIRM_SEAL_PATH)
    if (args.base.baselineMetadata?.transitions[R13_CONFIRM_TRANSITION_ID] !== digest)
      throw new Error('R13 confirm MG2: seal 与 transition metadata 不符')
    publishedSeal = structuredClone(raw) as unknown as R13ConfirmTransitionSealV1
    assertR13ConfirmPublishedSealMatchesAuthority(publishedSeal, expectedSeal)
  }

  const itemThrow = createR13ItemThrowV5MigrationPlan({
    base: stripControl(args.base, { removeMetadata: true }),
    ours: stripControl(args.ours, { removeMetadata: false }),
    generated: args.generated,
    sources: args.sources,
    migration: args.migration,
    audit: args.audit,
    ...(args.preparedSourceCensus ? { preparedSourceCensus: args.preparedSourceCensus } : {}),
    ...(args.preparedCadenceAuthority
      ? { preparedCadenceAuthority: args.preparedCadenceAuthority }
      : {}),
    ...(args.preparedCrossActivationAuthority
      ? { preparedCrossActivationAuthority: args.preparedCrossActivationAuthority }
      : {}),
    ...(args.preparedItemThrowAuthority
      ? { preparedAuthority: args.preparedItemThrowAuthority }
      : {}),
  })
  if (itemThrow.itemThrowSealMode !== 'replay' || itemThrow.itemThrowSeal.digest !== parentDigest)
    throw new Error('R13 confirm MG2: R13 item-throw parent 未按已发布 seal 回放')
  if (
    itemThrow.target.files.has(R13_CONFIRM_SEAL_PATH) ||
    itemThrow.target.managedFiles.has(R13_CONFIRM_SEAL_PATH) ||
    itemThrow.plan.target.has(R13_CONFIRM_SEAL_PATH)
  )
    throw new Error('R13 confirm MG2: confirm seal 泄漏到工程 target')
  assertR13ConfirmFinalTargetClosure(itemThrow.target, authority.evidence)
  assertEquipBattleSpriteFinalTargetClosure(
    itemThrow.target,
    args.generated.equipBattleSpriteEvidence,
  )

  const confirmSeal = publishedSeal ?? expectedSeal
  itemThrow.nextBaseline.files.set(R13_CONFIRM_SEAL_PATH, asMigrationJson(confirmSeal))
  itemThrow.nextBaseline.managedFiles.add(R13_CONFIRM_SEAL_PATH)
  itemThrow.nextBaseline.hashes?.delete(R13_CONFIRM_SEAL_PATH)
  if (!itemThrow.nextBaseline.baselineMetadata)
    throw new Error('R13 confirm MG2: nextBaseline 丢失 metadata')
  itemThrow.nextBaseline.baselineMetadata.transitions[R13_CONFIRM_TRANSITION_ID] =
    confirmSeal.digest
  return {
    ...itemThrow,
    confirmEvidence: authority.evidence,
    confirmSeal,
    confirmSealMode,
    confirmSourceDisposition: controlAudits.sourceDisposition,
    confirmRuntimeCapability: controlAudits.runtimeCapability,
    equipBattleSpriteEvidence: args.generated.equipBattleSpriteEvidence,
  }
}
