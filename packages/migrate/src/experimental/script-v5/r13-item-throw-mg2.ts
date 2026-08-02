import { isDeepStrictEqual } from 'node:util'
import type { MigrationSnapshot } from '../../migration-baseline.js'
import type { MigrationFileSet, MigrationJson, PalMigrationSources } from '../../pal-migration.js'
import type { ScriptControlFlowAuditV1 } from '../../script-control-flow-audit.js'
import { appendOnlyTransitionState } from './append-only-transition-state.js'
import type { P7GeneratedCanonical } from './p7-generated.js'
import type { PreparedR13CadenceAuthority } from './r13-cadence-mg2.js'
import {
  createR13CrossActivationV5MigrationPlan,
  type PreparedR13CrossActivationAuthority,
  R13_CROSS_ACTIVATION_SEAL_PATH,
  R13_CROSS_ACTIVATION_TRANSITION_ID,
  type R13CrossActivationV5MigrationPlan,
} from './r13-cross-activation-mg2.js'
import {
  assertR13ItemThrowAugmentationEvidence,
  assertR13ItemThrowDispositionBacked,
  assertR13ItemThrowFinalTargetClosure,
  type R13ItemThrowAugmentationEvidenceV1,
} from './r13-item-throw-augmentation.js'
import type { PreparedR13SourceExecutionCensus } from './source-execution-census.js'
import { digestRecord, stableJsonSha256 } from './stable-json.js'

export const R13_ITEM_THROW_TRANSITION_ID = 'r13-item-throw-v1' as const
export const R13_ITEM_THROW_SEAL_PATH = '_transitions/r13-item-throw-v1.json' as const

interface R13ItemThrowTransitionSealBodyV1 {
  kind: 'r13-item-throw-transition'
  version: 1
  projectId: 'pal'
  transitionId: typeof R13_ITEM_THROW_TRANSITION_ID
  parent: {
    transitionId: typeof R13_CROSS_ACTIVATION_TRANSITION_ID
    digest: string
  }
  evidence: R13ItemThrowAugmentationEvidenceV1
}

export interface R13ItemThrowTransitionSealV1 extends R13ItemThrowTransitionSealBodyV1 {
  digest: string
}

export interface R13ItemThrowV5MigrationPlan extends R13CrossActivationV5MigrationPlan {
  itemThrowEvidence: R13ItemThrowAugmentationEvidenceV1
  itemThrowSeal: R13ItemThrowTransitionSealV1
  itemThrowSealMode: 'initialize' | 'replay'
}

export interface PreparedR13ItemThrowAuthority {
  readonly generated: P7GeneratedCanonical
  readonly successorSnapshot: MigrationSnapshot
  readonly parentSnapshot: MigrationSnapshot
  readonly evidence: R13ItemThrowAugmentationEvidenceV1
  readonly evidenceDigest: string
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
    throw new Error(`R13 item throw MG2: ${path} 无效`)
  const { digest, ...body } = value
  if (typeof digest !== 'string' || !/^[a-f0-9]{64}$/.test(digest))
    throw new Error(`R13 item throw MG2: ${path}.digest 无效`)
  if (stableJsonSha256(body) !== digest) throw new Error(`R13 item throw MG2: ${path} 自摘要不符`)
  return digest
}

function publishedCrossActivationDigest(base: MigrationSnapshot): string {
  const expected = base.baselineMetadata?.transitions[R13_CROSS_ACTIVATION_TRANSITION_ID]
  if (!expected) throw new Error('R13 item throw MG2: baseline 缺 R13 cross-activation metadata')
  const actual = recordDigest(
    base.files.get(R13_CROSS_ACTIVATION_SEAL_PATH),
    R13_CROSS_ACTIVATION_SEAL_PATH,
  )
  if (actual !== expected)
    throw new Error('R13 item throw MG2: R13 cross-activation seal 与 metadata 不符')
  return actual
}

function stripControl(
  source: MigrationSnapshot,
  options: { removeMetadata: boolean },
): MigrationSnapshot {
  const result = cloneSnapshot(source)
  result.files.delete(R13_ITEM_THROW_SEAL_PATH)
  result.managedFiles.delete(R13_ITEM_THROW_SEAL_PATH)
  result.hashes?.delete(R13_ITEM_THROW_SEAL_PATH)
  if (options.removeMetadata && result.baselineMetadata)
    delete result.baselineMetadata.transitions[R13_ITEM_THROW_TRANSITION_ID]
  return result
}

function buildSeal(
  evidence: R13ItemThrowAugmentationEvidenceV1,
  parentDigest: string,
): R13ItemThrowTransitionSealV1 {
  assertR13ItemThrowAugmentationEvidence(evidence)
  return digestRecord<R13ItemThrowTransitionSealV1>({
    kind: 'r13-item-throw-transition',
    version: 1,
    projectId: 'pal',
    transitionId: R13_ITEM_THROW_TRANSITION_ID,
    parent: {
      transitionId: R13_CROSS_ACTIVATION_TRANSITION_ID,
      digest: parentDigest,
    },
    evidence: structuredClone(evidence),
  })
}

function asMigrationJson(value: R13ItemThrowTransitionSealV1): MigrationJson {
  return JSON.parse(JSON.stringify(value)) as MigrationJson
}

export function prepareR13ItemThrowAuthority(
  generated: P7GeneratedCanonical,
): PreparedR13ItemThrowAuthority {
  assertR13ItemThrowAugmentationEvidence(generated.itemThrowEvidence)
  assertR13ItemThrowDispositionBacked(
    generated.r13CrossActivationParentSnapshot,
    generated.r13ConfirmParentSnapshot,
    generated.itemThrowEvidence,
  )
  assertR13ItemThrowFinalTargetClosure(
    generated.r13ConfirmParentSnapshot,
    generated.itemThrowEvidence,
  )
  return Object.freeze({
    generated,
    successorSnapshot: generated.r13ConfirmParentSnapshot,
    parentSnapshot: generated.r13CrossActivationParentSnapshot,
    evidence: generated.itemThrowEvidence,
    evidenceDigest: generated.itemThrowEvidence.digest,
  })
}

function assertPreparedAuthority(
  prepared: PreparedR13ItemThrowAuthority,
  generated: P7GeneratedCanonical,
): void {
  if (
    prepared.generated !== generated ||
    prepared.successorSnapshot !== generated.r13ConfirmParentSnapshot ||
    prepared.parentSnapshot !== generated.r13CrossActivationParentSnapshot ||
    prepared.evidence !== generated.itemThrowEvidence
  )
    throw new Error('R13 item throw MG2: prepared authority 输入身份漂移')
  if (
    prepared.evidenceDigest !== prepared.evidence.digest ||
    prepared.evidenceDigest !== generated.itemThrowEvidence.digest
  )
    throw new Error('R13 item throw MG2: prepared authority 摘要漂移')
  assertR13ItemThrowAugmentationEvidence(prepared.evidence)
  assertR13ItemThrowDispositionBacked(
    prepared.parentSnapshot,
    prepared.successorSnapshot,
    prepared.evidence,
  )
  assertR13ItemThrowFinalTargetClosure(prepared.successorSnapshot, prepared.evidence)
}

export function assertR13ItemThrowPublishedSealMatchesAuthority(
  publishedSeal: unknown,
  expectedSeal: R13ItemThrowTransitionSealV1,
): void {
  if (!isDeepStrictEqual(publishedSeal, expectedSeal))
    throw new Error('R13 item throw MG2: 权威重建证据与已发布 seal 不符')
}

/**
 * R13-3 append-only outer wrapper。内层完整 replay R13-2 immutable authority，
 * 但三方合并的 generated target 仍是 R13-3 successor；这样 writes/deletes 始终
 * 相对原始 base/ours 计算，作者冲突语义不会被“先合父层、再合子层”扭曲。
 */
export function createR13ItemThrowV5MigrationPlan(args: {
  base: MigrationSnapshot
  ours: MigrationSnapshot
  generated: P7GeneratedCanonical
  sources: PalMigrationSources
  migration: MigrationFileSet
  audit: ScriptControlFlowAuditV1
  preparedSourceCensus?: PreparedR13SourceExecutionCensus
  preparedCadenceAuthority?: PreparedR13CadenceAuthority
  preparedCrossActivationAuthority?: PreparedR13CrossActivationAuthority
  preparedAuthority?: PreparedR13ItemThrowAuthority
}): R13ItemThrowV5MigrationPlan {
  const itemThrowSealMode = appendOnlyTransitionState(args.base, {
    transitionId: R13_ITEM_THROW_TRANSITION_ID,
    sealPath: R13_ITEM_THROW_SEAL_PATH,
    errorPrefix: 'R13 item throw MG2',
  })
  const parentDigest = publishedCrossActivationDigest(args.base)
  if (
    args.generated.snapshot.files.has(R13_ITEM_THROW_SEAL_PATH) ||
    args.generated.snapshot.managedFiles.has(R13_ITEM_THROW_SEAL_PATH) ||
    args.generated.snapshot.hashes?.has(R13_ITEM_THROW_SEAL_PATH)
  )
    throw new Error('R13 item throw MG2: generated 不得携带 item-throw seal')
  if (
    args.ours.files.has(R13_ITEM_THROW_SEAL_PATH) ||
    args.ours.hashes?.has(R13_ITEM_THROW_SEAL_PATH)
  )
    throw new Error('R13 item throw MG2: project 不得携带 item-throw seal')
  if (args.preparedAuthority) assertPreparedAuthority(args.preparedAuthority, args.generated)
  const authority = args.preparedAuthority ?? prepareR13ItemThrowAuthority(args.generated)
  const expectedSeal = buildSeal(authority.evidence, parentDigest)
  let publishedSeal: R13ItemThrowTransitionSealV1 | undefined
  if (itemThrowSealMode === 'replay') {
    const raw = args.base.files.get(R13_ITEM_THROW_SEAL_PATH)
    const digest = recordDigest(raw, R13_ITEM_THROW_SEAL_PATH)
    if (args.base.baselineMetadata?.transitions[R13_ITEM_THROW_TRANSITION_ID] !== digest)
      throw new Error('R13 item throw MG2: seal 与 transition metadata 不符')
    publishedSeal = structuredClone(raw) as unknown as R13ItemThrowTransitionSealV1
    assertR13ItemThrowPublishedSealMatchesAuthority(publishedSeal, expectedSeal)
  }

  const cross = createR13CrossActivationV5MigrationPlan({
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
      ? { preparedAuthority: args.preparedCrossActivationAuthority }
      : {}),
  })
  if (
    cross.crossActivationSealMode !== 'replay' ||
    cross.crossActivationSeal.digest !== parentDigest
  )
    throw new Error('R13 item throw MG2: R13 cross-activation parent 未按已发布 seal 回放')
  if (
    cross.target.files.has(R13_ITEM_THROW_SEAL_PATH) ||
    cross.target.managedFiles.has(R13_ITEM_THROW_SEAL_PATH) ||
    cross.plan.target.has(R13_ITEM_THROW_SEAL_PATH)
  )
    throw new Error('R13 item throw MG2: item-throw seal 泄漏到工程 target')
  assertR13ItemThrowFinalTargetClosure(cross.target, authority.evidence)

  const itemThrowSeal = publishedSeal ?? expectedSeal
  cross.nextBaseline.files.set(R13_ITEM_THROW_SEAL_PATH, asMigrationJson(itemThrowSeal))
  cross.nextBaseline.managedFiles.add(R13_ITEM_THROW_SEAL_PATH)
  cross.nextBaseline.hashes?.delete(R13_ITEM_THROW_SEAL_PATH)
  if (!cross.nextBaseline.baselineMetadata)
    throw new Error('R13 item throw MG2: nextBaseline 丢失 metadata')
  cross.nextBaseline.baselineMetadata.transitions[R13_ITEM_THROW_TRANSITION_ID] =
    itemThrowSeal.digest
  return {
    ...cross,
    itemThrowEvidence: authority.evidence,
    itemThrowSeal,
    itemThrowSealMode,
  }
}
