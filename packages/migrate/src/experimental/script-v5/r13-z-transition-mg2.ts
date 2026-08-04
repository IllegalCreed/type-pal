import { isDeepStrictEqual } from 'node:util'
import {
  type MigrationSnapshot,
  serializeMigrationJson,
  sha256,
  snapshotFileHash,
} from '../../migration-baseline.js'
import { createMigrationPlan, type MigrationPlan } from '../../migration-plan.js'
import type { MigrationJson } from '../../pal-migration.js'
import { appendOnlyTransitionState } from './append-only-transition-state.js'
import {
  assertR13ExistingSchemaAugmentationEvidence,
  assertR13ExistingSchemaFinalTargetClosure,
  type R13ExistingSchemaAugmentationEvidenceV1,
} from './r13-existing-schema-augmentation.js'
import {
  R13_SOURCE_SEMANTICS_SEAL_PATH,
  R13_SOURCE_SEMANTICS_TRANSITION_ID,
  type R13SourceSemanticsTransitionSealV1,
} from './r13-source-semantics-mg2.js'
import {
  buildAndAssertR13RuntimeCapabilityAuditV3,
  type R13RuntimeCapabilityAuditV3,
} from './runtime-capability-audit-v3.js'
import {
  assertR13NoOpenSourceDebt,
  buildAndAssertR13SourceInstructionDispositionV3,
  type R13SourceInstructionDispositionBuildArgs,
  type R13SourceInstructionDispositionV3,
} from './source-instruction-disposition.js'
import { stableJsonSha256 } from './stable-json.js'

export const R13_Z_TRANSITION_ID = 'r13-z-source-closure-v1' as const
export const R13_Z_SEAL_PATH = '_transitions/r13-z-source-closure-v1.json' as const

interface R13ZSourceControlV1 {
  version: 1
  methodVersion: R13SourceInstructionDispositionV3['methodVersion']
  sourceDigest: string
  auditDigest: string
  reportDigest: string
  finalDigest: string
  options: {
    bindItemThrowSourceSites: true
    bindItemUnusableUseSourceSites: true
    bindDomainProjectionSourceSites: true
    bindOwnerSourceSites: true
    bindSpriteActionSourceSites: true
  }
  summary: {
    executionSites: number
    openDebtSites: 0
    openObservations: 0
  }
}

interface R13ZRuntimeControlV1 {
  version: 1
  methodVersion: R13RuntimeCapabilityAuditV3['methodVersion']
  reportDigest: string
  corpusDigest: string
  summary: R13RuntimeCapabilityAuditV3['summary']
}

export interface R13ZTransitionSealV1 {
  kind: 'r13-z-source-closure-transition'
  version: 1
  projectId: 'pal'
  transitionId: typeof R13_Z_TRANSITION_ID
  parent: {
    transitionId: typeof R13_SOURCE_SEMANTICS_TRANSITION_ID
    digest: string
  }
  sourceControl: R13ZSourceControlV1
  runtimeControl: R13ZRuntimeControlV1
  digest: string
}

export interface PreparedR13ZAuthority {
  readonly sourceDisposition: R13SourceInstructionDispositionV3
  readonly runtimeCapability: R13RuntimeCapabilityAuditV3
  readonly sourceDispositionBuild: R13SourceInstructionDispositionBuildArgs
  readonly runtimeFinal: MigrationSnapshot
  readonly digest: string
}

export interface R13ZMigrationPlan {
  plan: MigrationPlan
  target: MigrationSnapshot
  nextBaseline: MigrationSnapshot
  seal: R13ZTransitionSealV1
  sealMode: 'initialize' | 'replay'
  authority: PreparedR13ZAuthority
}

export interface R13ZSourceSemanticsClosure {
  readonly augmentationEvidence: R13ExistingSchemaAugmentationEvidenceV1
  readonly augmentationSnapshot: MigrationSnapshot
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

function asMigrationJson(value: unknown): MigrationJson {
  return JSON.parse(JSON.stringify(value)) as MigrationJson
}

function recordDigest(value: MigrationJson | undefined, path: string): string {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`R13-Z MG2: ${path} 无效`)
  const { digest, ...body } = value as Record<string, unknown>
  if (typeof digest !== 'string' || !/^[a-f0-9]{64}$/.test(digest))
    throw new Error(`R13-Z MG2: ${path}.digest 无效`)
  if (stableJsonSha256(body) !== digest) throw new Error(`R13-Z MG2: ${path} 自摘要不符`)
  return digest
}

function publishedParentDigest(base: MigrationSnapshot): string {
  const expected = base.baselineMetadata?.transitions[R13_SOURCE_SEMANTICS_TRANSITION_ID]
  if (!expected) throw new Error('R13-Z MG2: baseline 缺 R13 source-semantics metadata')
  const actual = recordDigest(
    base.files.get(R13_SOURCE_SEMANTICS_SEAL_PATH),
    R13_SOURCE_SEMANTICS_SEAL_PATH,
  )
  if (actual !== expected) throw new Error('R13-Z MG2: R13 source-semantics seal 与 metadata 不符')
  return actual
}

function contentSnapshot(source: MigrationSnapshot): MigrationSnapshot {
  const snapshot = cloneSnapshot(source)
  for (const path of [...snapshot.files.keys()])
    if (path.startsWith('_transitions/')) snapshot.files.delete(path)
  for (const path of [...snapshot.managedFiles])
    if (path.startsWith('_transitions/')) snapshot.managedFiles.delete(path)
  for (const path of [...(snapshot.hashes?.keys() ?? [])])
    if (path.startsWith('_transitions/')) snapshot.hashes?.delete(path)
  delete snapshot.baselineMetadata
  return snapshot
}

/**
 * Recover the published 6A existing-schema bridge without rebuilding the full historical source
 * authority. The R13-Z source ledger rebuild below replays every evidence leaf against live source,
 * so this only unwraps the byte-pinned parent seal and its content-only successor snapshot.
 */
export function resolveR13ZSourceSemanticsClosure(
  sourceFinal: MigrationSnapshot,
): R13ZSourceSemanticsClosure {
  const digest = publishedParentDigest(sourceFinal)
  const raw = sourceFinal.files.get(R13_SOURCE_SEMANTICS_SEAL_PATH)
  const seal = structuredClone(raw) as unknown as R13SourceSemanticsTransitionSealV1
  if (
    seal.kind !== 'r13-source-semantics-transition' ||
    seal.version !== 1 ||
    seal.projectId !== 'pal' ||
    seal.transitionId !== R13_SOURCE_SEMANTICS_TRANSITION_ID ||
    seal.digest !== digest
  )
    throw new Error('R13-Z MG2: R13 source-semantics parent envelope 无效')
  assertR13ExistingSchemaAugmentationEvidence(seal.augmentation)
  const augmentationSnapshot = contentSnapshot(sourceFinal)
  assertR13ExistingSchemaFinalTargetClosure(augmentationSnapshot, seal.augmentation)
  return {
    augmentationEvidence: seal.augmentation,
    augmentationSnapshot,
  }
}

function assertNoProjectSeal(snapshot: MigrationSnapshot): void {
  if (
    snapshot.files.has(R13_Z_SEAL_PATH) ||
    (snapshot.managedFiles.has(R13_Z_SEAL_PATH) && snapshot.files.has(R13_Z_SEAL_PATH)) ||
    snapshot.hashes?.has(R13_Z_SEAL_PATH)
  )
    throw new Error('R13-Z MG2: project 不得携带 R13-Z seal')
}

function sourceControl(
  report: R13SourceInstructionDispositionV3,
  build: R13SourceInstructionDispositionBuildArgs,
): R13ZSourceControlV1 {
  const options = report.generator.options
  if (
    options?.bindItemThrowSourceSites !== true ||
    options?.bindItemUnusableUseSourceSites !== true ||
    options?.bindDomainProjectionSourceSites !== true ||
    options?.bindOwnerSourceSites !== true ||
    options?.bindSpriteActionSourceSites !== true
  )
    throw new Error('R13-Z MG2: source report 缺 R13-Z source-site 自描述选项')
  if (report.summary.openDebtSites !== 0 || report.summary.openObservations !== 0)
    throw new Error(
      `R13-Z MG2: source disposition 未闭合 ` +
        `sites=${report.summary.openDebtSites} observations=${report.summary.openObservations}`,
    )
  return {
    version: 1,
    methodVersion: report.methodVersion,
    sourceDigest: report.generator.sourceDigest,
    auditDigest: build.audit.digest,
    reportDigest: report.digest,
    finalDigest: report.generator.finalDigest,
    options: {
      bindItemThrowSourceSites: true,
      bindItemUnusableUseSourceSites: true,
      bindDomainProjectionSourceSites: true,
      bindOwnerSourceSites: true,
      bindSpriteActionSourceSites: true,
    },
    summary: {
      executionSites: report.summary.executionSites,
      openDebtSites: 0,
      openObservations: 0,
    },
  }
}

function buildSeal(
  parentDigest: string,
  source: R13SourceInstructionDispositionV3,
  sourceBuild: R13SourceInstructionDispositionBuildArgs,
  runtime: R13RuntimeCapabilityAuditV3,
): R13ZTransitionSealV1 {
  const body = {
    kind: 'r13-z-source-closure-transition' as const,
    version: 1 as const,
    projectId: 'pal' as const,
    transitionId: R13_Z_TRANSITION_ID,
    parent: {
      transitionId: R13_SOURCE_SEMANTICS_TRANSITION_ID,
      digest: parentDigest,
    },
    sourceControl: sourceControl(source, sourceBuild),
    runtimeControl: {
      version: 1 as const,
      methodVersion: runtime.methodVersion,
      reportDigest: runtime.digest,
      corpusDigest: runtime.generator.corpusDigest,
      summary: structuredClone(runtime.summary),
    },
  }
  return { ...body, digest: stableJsonSha256(body) }
}

export function prepareR13ZAuthority(args: {
  sourceDispositionBuild: R13SourceInstructionDispositionBuildArgs
  /** Runtime audit may target the current successor while source closure replays its 6A view. */
  runtimeFinal?: MigrationSnapshot
}): PreparedR13ZAuthority {
  if (args.sourceDispositionBuild.bindItemThrowSourceSites !== true)
    throw new Error('R13-Z MG2: authority 必须显式开启 bindItemThrowSourceSites')
  if (args.sourceDispositionBuild.bindItemUnusableUseSourceSites !== true)
    throw new Error('R13-Z MG2: authority 必须显式开启 bindItemUnusableUseSourceSites')
  if (args.sourceDispositionBuild.bindDomainProjectionSourceSites !== true)
    throw new Error('R13-Z MG2: authority 必须显式开启 bindDomainProjectionSourceSites')
  if (args.sourceDispositionBuild.bindOwnerSourceSites !== true)
    throw new Error('R13-Z MG2: authority 必须显式开启 bindOwnerSourceSites')
  if (args.sourceDispositionBuild.bindSpriteActionSourceSites !== true)
    throw new Error('R13-Z MG2: authority 必须显式开启 bindSpriteActionSourceSites')
  if (args.sourceDispositionBuild.bindIndirectEntityBodies !== true)
    throw new Error('R13-Z MG2: authority 必须显式开启 bindIndirectEntityBodies')
  const sourceDisposition = buildAndAssertR13SourceInstructionDispositionV3(
    args.sourceDispositionBuild,
  )
  // This is deliberately after the source-backed build. It is the single hard publication gate,
  // so a report that is structurally valid but still carries any open debt cannot be sealed.
  assertR13NoOpenSourceDebt(sourceDisposition, args.sourceDispositionBuild)
  const runtimeFinal = args.runtimeFinal ?? args.sourceDispositionBuild.final
  const runtimeCapability = buildAndAssertR13RuntimeCapabilityAuditV3(runtimeFinal)
  return Object.freeze({
    sourceDisposition,
    runtimeCapability,
    sourceDispositionBuild: args.sourceDispositionBuild,
    runtimeFinal,
    digest: stableJsonSha256({
      source: sourceDisposition.digest,
      runtime: runtimeCapability.digest,
      final: sourceDisposition.generator.finalDigest,
    }),
  })
}

function assertPreparedAuthority(
  authority: PreparedR13ZAuthority,
  sourceDispositionBuild: R13SourceInstructionDispositionBuildArgs,
  runtimeFinal: MigrationSnapshot,
): void {
  if (authority.sourceDispositionBuild !== sourceDispositionBuild)
    throw new Error('R13-Z MG2: prepared authority 输入身份漂移')
  if (authority.runtimeFinal !== runtimeFinal)
    throw new Error('R13-Z MG2: prepared runtime 输入身份漂移')
  if (
    authority.sourceDisposition.generator.options?.bindItemThrowSourceSites !== true ||
    authority.sourceDisposition.generator.options?.bindItemUnusableUseSourceSites !== true ||
    authority.sourceDisposition.generator.options?.bindDomainProjectionSourceSites !== true ||
    authority.sourceDisposition.generator.options?.bindOwnerSourceSites !== true ||
    authority.sourceDisposition.generator.options?.bindSpriteActionSourceSites !== true
  )
    throw new Error('R13-Z MG2: prepared source report 选项漂移')
  assertR13NoOpenSourceDebt(authority.sourceDisposition, sourceDispositionBuild)
  const expectedDigest = stableJsonSha256({
    source: authority.sourceDisposition.digest,
    runtime: authority.runtimeCapability.digest,
    final: authority.sourceDisposition.generator.finalDigest,
  })
  if (authority.digest !== expectedDigest) throw new Error('R13-Z MG2: prepared authority 摘要漂移')
}

function installSeal(baseline: MigrationSnapshot, seal: R13ZTransitionSealV1): void {
  const value = asMigrationJson(seal)
  baseline.files.set(R13_Z_SEAL_PATH, value)
  baseline.managedFiles.add(R13_Z_SEAL_PATH)
  baseline.hashes?.set(R13_Z_SEAL_PATH, sha256(serializeMigrationJson(value, R13_Z_SEAL_PATH)))
  if (!baseline.baselineMetadata) throw new Error('R13-Z MG2: baseline 缺 metadata')
  baseline.baselineMetadata.transitions[R13_Z_TRANSITION_ID] = seal.digest
}

function assertHistoricalControlsPinned(before: MigrationSnapshot, after: MigrationSnapshot): void {
  for (const path of before.managedFiles) {
    if (!path.startsWith('_transitions/') || path === R13_Z_SEAL_PATH) continue
    if (
      !isDeepStrictEqual(before.files.get(path), after.files.get(path)) ||
      before.managedFiles.has(path) !== after.managedFiles.has(path) ||
      snapshotFileHash(before, path) !== snapshotFileHash(after, path)
    )
      throw new Error(`R13-Z MG2: 历史 transition 漂移 ${path}`)
  }
  const beforeTransitions = before.baselineMetadata?.transitions ?? {}
  const afterTransitions = after.baselineMetadata?.transitions ?? {}
  for (const [id, digest] of Object.entries(beforeTransitions))
    if (id !== R13_Z_TRANSITION_ID && afterTransitions[id] !== digest)
      throw new Error(`R13-Z MG2: 历史 metadata 漂移 ${id}`)
}

export function assertR13ZPublishedSealMatchesAuthority(
  published: unknown,
  expected: R13ZTransitionSealV1,
): void {
  if (!isDeepStrictEqual(published, expected))
    throw new Error('R13-Z MG2: published seal 与 authority 不符')
}

/**
 * R13-Z is an evidence-only append-only publication. It never merges or rewrites project
 * content; a dirty project is rejected before the seal can be added to the baseline.
 */
export function createR13ZMigrationPlan(args: {
  base: MigrationSnapshot
  ours: MigrationSnapshot
  preparedAuthority?: PreparedR13ZAuthority
  sourceDispositionBuild: R13SourceInstructionDispositionBuildArgs
  runtimeFinal?: MigrationSnapshot
}): R13ZMigrationPlan {
  const sealMode = appendOnlyTransitionState(args.base, {
    transitionId: R13_Z_TRANSITION_ID,
    sealPath: R13_Z_SEAL_PATH,
    errorPrefix: 'R13-Z MG2',
  })
  const parentDigest = publishedParentDigest(args.base)
  assertNoProjectSeal(args.ours)
  const runtimeFinal = args.runtimeFinal ?? args.sourceDispositionBuild.final
  if (args.preparedAuthority)
    assertPreparedAuthority(args.preparedAuthority, args.sourceDispositionBuild, runtimeFinal)
  const authority =
    args.preparedAuthority ??
    prepareR13ZAuthority({ sourceDispositionBuild: args.sourceDispositionBuild, runtimeFinal })
  const expectedSeal = buildSeal(
    parentDigest,
    authority.sourceDisposition,
    authority.sourceDispositionBuild,
    authority.runtimeCapability,
  )
  let publishedSeal: R13ZTransitionSealV1 | undefined
  if (sealMode === 'replay') {
    const raw = args.base.files.get(R13_Z_SEAL_PATH)
    const digest = recordDigest(raw, R13_Z_SEAL_PATH)
    if (args.base.baselineMetadata?.transitions[R13_Z_TRANSITION_ID] !== digest)
      throw new Error('R13-Z MG2: seal 与 transition metadata 不符')
    publishedSeal = structuredClone(raw) as unknown as R13ZTransitionSealV1
    assertR13ZPublishedSealMatchesAuthority(publishedSeal, expectedSeal)
  }

  // A publication authority must not smuggle author edits into the release. Using the normal
  // three-way planner gives us the same conflict semantics as every other MG2, then the strict
  // empty-plan assertion makes the publication boundary fail closed.
  const plan = createMigrationPlan(args.base, args.ours, args.base)
  if (plan.conflicts.length)
    throw new Error(`R13-Z MG2: project 三方状态冲突 ${plan.conflicts.length}`)
  if (plan.writes.size || plan.deletes.length)
    throw new Error(
      `R13-Z MG2: project 非干净，拒绝发布 writes=${plan.writes.size} ` +
        `deletes=${plan.deletes.length}`,
    )
  const target: MigrationSnapshot = {
    files: new Map(plan.target),
    managedFiles: new Set([...args.ours.managedFiles, ...plan.target.keys()]),
  }
  const seal = publishedSeal ?? expectedSeal
  const nextBaseline = cloneSnapshot(args.base)
  installSeal(nextBaseline, seal)
  assertHistoricalControlsPinned(args.base, nextBaseline)
  if (!nextBaseline.baselineMetadata) throw new Error('R13-Z MG2: nextBaseline 缺 metadata')
  const expectedManaged = new Set([...args.base.managedFiles, R13_Z_SEAL_PATH])
  if (!isDeepStrictEqual(nextBaseline.managedFiles, expectedManaged))
    throw new Error('R13-Z MG2: nextBaseline managed set 漂移')
  return { plan, target, nextBaseline, seal, sealMode, authority }
}
