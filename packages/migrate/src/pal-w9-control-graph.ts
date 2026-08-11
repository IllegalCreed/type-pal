import { isDeepStrictEqual } from 'node:util'
import {
  assertR13ExistingSchemaAugmentationEvidence,
  type R13ExistingSchemaAugmentationEvidenceV1,
} from './experimental/script-v5/r13-existing-schema-augmentation.js'
import {
  R13_SOURCE_SEMANTICS_PARENT_ENEMY_DIGEST,
  R13_SOURCE_SEMANTICS_SEAL_PATH,
  R13_SOURCE_SEMANTICS_TRANSITION_ID,
  type R13SourceSemanticsTransitionSealV1,
} from './experimental/script-v5/r13-source-semantics-mg2.js'
import { stableJsonSha256, stableStringCompare } from './experimental/script-v5/stable-json.js'
import {
  resolveR13ZSourceSemanticsClosure,
  R13_Z_SEAL_PATH,
  R13_Z_TRANSITION_ID,
  rewindPublishedR13ZPublicationIfPresent,
  type R13ZTransitionSealV1,
} from './experimental/script-v5/r13-z-transition-mg2.js'
import {
  isAtomicProjectMapPath,
  type MigrationSnapshot,
  serializeMigrationJson,
  sha256,
} from './migration-baseline.js'
import {
  assertB10PublishedAuthority,
  B10_ENEMY_TEAM_SLOTS_SEAL_PATH,
  B10_ENEMY_TEAM_SLOTS_TRANSITION_ID,
  b10PublishTimeSurfaceDigest,
  rewindB10PublicationIfPresent,
  type B10EnemyTeamSlotsSealV1,
} from './pal-b10-enemy-team-slots.js'
import {
  R13_SIX_C_SEAL_PATH,
  R13_SIX_C_TRANSITION_ID,
  rewindPalR13SixCPublicationIfPresent,
  type R13SixCTransitionSealV1,
} from './pal-r13-six-c.js'
import { rewindPalR13SixBPublication } from './pal-r13-six-b-rewind.js'
import type { MigrationJson } from './pal-migration.js'

type HistoricalTransitionId =
  | typeof B10_ENEMY_TEAM_SLOTS_TRANSITION_ID
  | typeof R13_Z_TRANSITION_ID
  | typeof R13_SIX_C_TRANSITION_ID
  | typeof R13_SOURCE_SEMANTICS_TRANSITION_ID

export interface W9HistoricalControlNodeV1 {
  transitionId: HistoricalTransitionId
  metadataDigest: string
  sealDigest: string
  fileSha256: string
  nonSelfPublishSurfaceDigest: string
}

export interface W9B10ControlGraphProjectionV1 {
  version: 1
  rewindOrder: [
    typeof B10_ENEMY_TEAM_SLOTS_TRANSITION_ID,
    typeof R13_Z_TRANSITION_ID,
    typeof R13_SIX_C_TRANSITION_ID,
    typeof R13_SOURCE_SEMANTICS_TRANSITION_ID,
  ]
  b10: W9HistoricalControlNodeV1 & {
    transitionId: typeof B10_ENEMY_TEAM_SLOTS_TRANSITION_ID
    successorContentDigest: string
  }
  r13Z: W9HistoricalControlNodeV1 & {
    transitionId: typeof R13_Z_TRANSITION_ID
    parentDigest: string
    finalContentDigest: string
  }
  r13SixC: W9HistoricalControlNodeV1 & {
    transitionId: typeof R13_SIX_C_TRANSITION_ID
    parentDigest: string
    finalContentDigest: string
  }
  sourceSemantics: W9HistoricalControlNodeV1 & {
    transitionId: typeof R13_SOURCE_SEMANTICS_TRANSITION_ID
    parentTransitionId: 'r13-enemy-script-v1'
    parentDigest: string
    finalContentDigest: string
  }
  digest: string
}

export interface W9B10PublishedAuthorityGraph {
  b10: B10EnemyTeamSlotsSealV1
  r13Z: R13ZTransitionSealV1
  r13SixC: R13SixCTransitionSealV1
  sourceSemantics: R13SourceSemanticsTransitionSealV1
  projection: W9B10ControlGraphProjectionV1
}

interface StrictTransitionTuple<T> {
  seal: T
  metadataDigest: string
  sealDigest: string
  fileSha256: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function asJson(value: unknown): MigrationJson {
  return JSON.parse(JSON.stringify(value)) as MigrationJson
}

function assertHexDigest(value: unknown, path: string): asserts value is string {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value))
    throw new Error(`${path}: 期望 sha256 digest`)
}

function assertExactKeys(value: Record<string, unknown>, expected: readonly string[], path: string): void {
  const actual = Object.keys(value).sort(stableStringCompare)
  const wanted = [...expected].sort(stableStringCompare)
  if (!isDeepStrictEqual(actual, wanted))
    throw new Error(`${path}: 字段集合漂移 actual=${JSON.stringify(actual)} expected=${JSON.stringify(wanted)}`)
}

function assertSafeNonNegativeInteger(value: unknown, path: string): asserts value is number {
  if (!Number.isSafeInteger(value) || Number(value) < 0)
    throw new Error(`${path}: 期望非负安全整数`)
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

function stripTransitionTuple(
  source: MigrationSnapshot,
  transitionId: HistoricalTransitionId,
  sealPath: string,
): MigrationSnapshot {
  const snapshot = cloneSnapshot(source)
  snapshot.files.delete(sealPath)
  snapshot.managedFiles.delete(sealPath)
  snapshot.hashes?.delete(sealPath)
  if (snapshot.baselineMetadata) delete snapshot.baselineMetadata.transitions[transitionId]
  return snapshot
}

function nonSelfPublishSurfaceDigest(
  source: MigrationSnapshot,
  transitionId: HistoricalTransitionId,
  sealPath: string,
): string {
  const snapshot = stripTransitionTuple(source, transitionId, sealPath)
  const managed = new Set(snapshot.managedFiles)
  for (const path of [...snapshot.files.keys()])
    if (!managed.has(path) || isAtomicProjectMapPath(path)) snapshot.files.delete(path)
  if (snapshot.hashes)
    for (const path of [...snapshot.hashes.keys()])
      if (!managed.has(path)) snapshot.hashes.delete(path)
  return stableJsonSha256({
    files: Object.fromEntries(
      [...snapshot.files.entries()].sort(([left], [right]) => stableStringCompare(left, right)),
    ),
    managedFiles: [...snapshot.managedFiles].sort(stableStringCompare),
    hashes: Object.fromEntries(
      [...(snapshot.hashes ?? new Map())].sort(([left], [right]) =>
        stableStringCompare(left, right),
      ),
    ),
    ...(snapshot.baselineMetadata
      ? {
          generatorEpoch: snapshot.baselineMetadata.generatorEpoch,
          transitions: structuredClone(snapshot.baselineMetadata.transitions),
        }
      : {}),
  })
}

function readStrictTransitionTuple<T>(
  source: MigrationSnapshot,
  transitionId: HistoricalTransitionId,
  sealPath: string,
  label: string,
): StrictTransitionTuple<T> {
  const metadataDigest = source.baselineMetadata?.transitions[transitionId]
  const raw = source.files.get(sealPath)
  const managed = source.managedFiles.has(sealPath)
  const recordedHash = source.hashes?.get(sealPath)
  if (metadataDigest === undefined || raw === undefined || !managed || recordedHash === undefined)
    throw new Error(`${label}: transition 半状态 metadata/file/managed/hash 不齐`)
  if (!isRecord(raw)) throw new Error(`${label}: seal 期望对象`)
  assertHexDigest(raw.digest, `${label}.digest`)
  const { digest: _digest, ...body } = raw
  if (stableJsonSha256(body) !== raw.digest)
    throw new Error(`${label}: seal body 重算 digest 与自摘要不符`)
  if (metadataDigest !== raw.digest)
    throw new Error(`${label}: transition metadata 与 seal digest 不符`)
  const actualHash = sha256(serializeMigrationJson(asJson(raw), sealPath))
  if (recordedHash !== actualHash) throw new Error(`${label}: seal 文件 hash 不符`)
  return {
    seal: structuredClone(raw) as unknown as T,
    metadataDigest,
    sealDigest: raw.digest,
    fileSha256: actualHash,
  }
}

function assertR13SixCIdentity(seal: R13SixCTransitionSealV1): void {
  const raw = seal as unknown as Record<string, unknown>
  assertExactKeys(raw, ['kind', 'version', 'projectId', 'transitionId', 'parent', 'closure', 'digest'], 'W9 graph R13-6C')
  if (
    seal.kind !== 'r13-6c-lossy-closure-transition' ||
    seal.version !== 1 ||
    seal.projectId !== 'pal' ||
    seal.transitionId !== R13_SIX_C_TRANSITION_ID
  )
    throw new Error('W9 graph R13-6C: seal identity 漂移')
  if (!isRecord(seal.parent)) throw new Error('W9 graph R13-6C.parent: 期望对象')
  assertExactKeys(seal.parent, ['transitionId', 'digest'], 'W9 graph R13-6C.parent')
  if (seal.parent.transitionId !== R13_SOURCE_SEMANTICS_TRANSITION_ID)
    throw new Error('W9 graph R13-6C.parent.transitionId: 期望 source-semantics')
  assertHexDigest(seal.parent.digest, 'W9 graph R13-6C.parent.digest')
  if (!isRecord(seal.closure)) throw new Error('W9 graph R13-6C.closure: 期望对象')
  assertExactKeys(
    seal.closure as unknown as Record<string, unknown>,
    ['version', 'methodVersion', 'closures', 'finalContentDigest', 'summary'],
    'W9 graph R13-6C.closure',
  )
  if (seal.closure.version !== 1 || seal.closure.methodVersion !== 'n3-p7-r13-6c-lossy-closure-v1')
    throw new Error('W9 graph R13-6C.closure: identity 漂移')
  if (!Array.isArray(seal.closure.closures) || seal.closure.closures.length !== 3)
    throw new Error('W9 graph R13-6C.closure.closures: 期望三条')
  const expectedSkills = ['352', '372', '373']
  seal.closure.closures.forEach((entry, index) => {
    if (!isRecord(entry)) throw new Error(`W9 graph R13-6C.closure.closures[${index}]: 期望对象`)
    assertExactKeys(
      entry,
      ['skillId', 'evidenceDigest', 'sourceClosureDigest', 'finalTargetDigest'],
      `W9 graph R13-6C.closure.closures[${index}]`,
    )
    if (entry.skillId !== expectedSkills[index])
      throw new Error(`W9 graph R13-6C.closure.closures[${index}].skillId: 漂移`)
    for (const key of ['evidenceDigest', 'sourceClosureDigest', 'finalTargetDigest'] as const)
      assertHexDigest(entry[key], `W9 graph R13-6C.closure.closures[${index}].${key}`)
  })
  assertHexDigest(seal.closure.finalContentDigest, 'W9 graph R13-6C.closure.finalContentDigest')
  if (!isRecord(seal.closure.summary)) throw new Error('W9 graph R13-6C.closure.summary: 期望对象')
  assertExactKeys(seal.closure.summary, ['lossyClosed', 'openObservations'], 'W9 graph R13-6C.closure.summary')
  if (seal.closure.summary.lossyClosed !== 3 || seal.closure.summary.openObservations !== 0)
    throw new Error('W9 graph R13-6C.closure.summary: closure 未闭合')
}

function assertR13ZIdentity(seal: R13ZTransitionSealV1): void {
  const raw = seal as unknown as Record<string, unknown>
  assertExactKeys(raw, ['kind', 'version', 'projectId', 'transitionId', 'parent', 'sourceControl', 'runtimeControl', 'digest'], 'W9 graph R13-Z')
  if (
    seal.kind !== 'r13-z-source-closure-transition' ||
    seal.version !== 1 ||
    seal.projectId !== 'pal' ||
    seal.transitionId !== R13_Z_TRANSITION_ID
  )
    throw new Error('W9 graph R13-Z: seal identity 漂移')
  if (!isRecord(seal.parent)) throw new Error('W9 graph R13-Z.parent: 期望对象')
  assertExactKeys(seal.parent, ['transitionId', 'digest'], 'W9 graph R13-Z.parent')
  if (seal.parent.transitionId !== R13_SOURCE_SEMANTICS_TRANSITION_ID)
    throw new Error('W9 graph R13-Z.parent.transitionId: 期望 source-semantics')
  assertHexDigest(seal.parent.digest, 'W9 graph R13-Z.parent.digest')

  const source = seal.sourceControl as unknown as Record<string, unknown>
  if (!isRecord(source)) throw new Error('W9 graph R13-Z.sourceControl: 期望对象')
  assertExactKeys(source, ['version', 'methodVersion', 'sourceDigest', 'auditDigest', 'reportDigest', 'finalDigest', 'options', 'summary'], 'W9 graph R13-Z.sourceControl')
  if (source.version !== 1 || source.methodVersion !== 'n3-p7-r13-source-instruction-disposition-v3')
    throw new Error('W9 graph R13-Z.sourceControl: identity 漂移')
  for (const key of ['sourceDigest', 'auditDigest', 'reportDigest', 'finalDigest'] as const)
    assertHexDigest(source[key], `W9 graph R13-Z.sourceControl.${key}`)
  if (!isRecord(source.options)) throw new Error('W9 graph R13-Z.sourceControl.options: 期望对象')
  const optionKeys = [
    'bindItemThrowSourceSites',
    'bindItemUnusableUseSourceSites',
    'bindDomainProjectionSourceSites',
    'bindOwnerSourceSites',
    'bindSpriteActionSourceSites',
  ] as const
  assertExactKeys(source.options, optionKeys, 'W9 graph R13-Z.sourceControl.options')
  for (const key of optionKeys)
    if (source.options[key] !== true)
      throw new Error(`W9 graph R13-Z.sourceControl.options.${key}: 期望 true`)
  if (!isRecord(source.summary)) throw new Error('W9 graph R13-Z.sourceControl.summary: 期望对象')
  assertExactKeys(source.summary, ['executionSites', 'openDebtSites', 'openObservations'], 'W9 graph R13-Z.sourceControl.summary')
  assertSafeNonNegativeInteger(source.summary.executionSites, 'W9 graph R13-Z.sourceControl.summary.executionSites')
  if (source.summary.openDebtSites !== 0 || source.summary.openObservations !== 0)
    throw new Error('W9 graph R13-Z.sourceControl.summary: source closure 未闭合')

  const runtime = seal.runtimeControl as unknown as Record<string, unknown>
  if (!isRecord(runtime)) throw new Error('W9 graph R13-Z.runtimeControl: 期望对象')
  assertExactKeys(runtime, ['version', 'methodVersion', 'reportDigest', 'corpusDigest', 'summary'], 'W9 graph R13-Z.runtimeControl')
  if (runtime.version !== 1 || runtime.methodVersion !== 'n3-p7-r13-runtime-capability-v3')
    throw new Error('W9 graph R13-Z.runtimeControl: identity 漂移')
  assertHexDigest(runtime.reportDigest, 'W9 graph R13-Z.runtimeControl.reportDigest')
  assertHexDigest(runtime.corpusDigest, 'W9 graph R13-Z.runtimeControl.corpusDigest')
  if (!isRecord(runtime.summary)) throw new Error('W9 graph R13-Z.runtimeControl.summary: 期望对象')
  const runtimeSummaryKeys = [
    'domains',
    'cells',
    'uses',
    'refusedUses',
    'openIssues',
    'enemySkillReferences',
    'enemyDistinctSkillIds',
    'enemyEffectUses',
  ] as const
  assertExactKeys(runtime.summary, runtimeSummaryKeys, 'W9 graph R13-Z.runtimeControl.summary')
  for (const key of runtimeSummaryKeys)
    assertSafeNonNegativeInteger(runtime.summary[key], `W9 graph R13-Z.runtimeControl.summary.${key}`)
  if (runtime.summary.refusedUses !== 0 || runtime.summary.openIssues !== 0)
    throw new Error('W9 graph R13-Z.runtimeControl.summary: runtime closure 未闭合')
}

function assertSourceSemanticsIdentity(seal: R13SourceSemanticsTransitionSealV1): void {
  const raw = seal as unknown as Record<string, unknown>
  assertExactKeys(raw, ['kind', 'version', 'projectId', 'transitionId', 'parent', 'augmentation', 'merge', 'externalPrerequisites', 'sourceControl', 'digest'], 'W9 graph source-semantics')
  if (
    seal.kind !== 'r13-source-semantics-transition' ||
    seal.version !== 1 ||
    seal.projectId !== 'pal' ||
    seal.transitionId !== R13_SOURCE_SEMANTICS_TRANSITION_ID
  )
    throw new Error('W9 graph source-semantics: seal identity 漂移')
  if (!isRecord(seal.parent)) throw new Error('W9 graph source-semantics.parent: 期望对象')
  assertExactKeys(seal.parent, ['transitionId', 'digest'], 'W9 graph source-semantics.parent')
  if (
    seal.parent.transitionId !== 'r13-enemy-script-v1' ||
    seal.parent.digest !== R13_SOURCE_SEMANTICS_PARENT_ENEMY_DIGEST
  )
    throw new Error('W9 graph source-semantics.parent: 历史 parent 漂移')

  const evidence = seal.augmentation as R13ExistingSchemaAugmentationEvidenceV1
  assertR13ExistingSchemaAugmentationEvidence(evidence)
  if (!isRecord(seal.merge)) throw new Error('W9 graph source-semantics.merge: 期望对象')
  assertExactKeys(seal.merge, ['changedPaths', 'commandSites', 'skillCosts'], 'W9 graph source-semantics.merge')
  if (
    !isDeepStrictEqual(seal.merge.changedPaths, evidence.changedPaths) ||
    seal.merge.commandSites !== 22 ||
    seal.merge.skillCosts !== 3
  )
    throw new Error('W9 graph source-semantics.merge: augmentation closure 漂移')
  if (!isDeepStrictEqual(seal.externalPrerequisites, evidence.externalPrerequisites))
    throw new Error('W9 graph source-semantics.externalPrerequisites: augmentation 漂移')

  const control = seal.sourceControl as unknown as Record<string, unknown>
  if (!isRecord(control)) throw new Error('W9 graph source-semantics.sourceControl: 期望对象')
  assertExactKeys(control, ['version', 'methodVersion', 'sourceDigest', 'auditDigest', 'reportDigest', 'finalDigest', 'summary', 'parentReportDigest'], 'W9 graph source-semantics.sourceControl')
  if (control.version !== 3 || control.methodVersion !== 'n3-p7-r13-source-instruction-disposition-v3')
    throw new Error('W9 graph source-semantics.sourceControl: identity 漂移')
  for (const key of ['sourceDigest', 'auditDigest', 'reportDigest', 'finalDigest', 'parentReportDigest'] as const)
    assertHexDigest(control[key], `W9 graph source-semantics.sourceControl.${key}`)
  if (control.finalDigest !== evidence.successorContentDigest)
    throw new Error('W9 graph source-semantics.sourceControl.finalDigest: content closure 漂移')
  if (!isRecord(control.summary)) throw new Error('W9 graph source-semantics.sourceControl.summary: 期望对象')
  const summaryKeys = [
    'executionSites',
    'openDebtSites',
    'openObservations',
    'existingSchemaSites',
    'existingSchemaSkillCosts',
  ] as const
  assertExactKeys(control.summary, summaryKeys, 'W9 graph source-semantics.sourceControl.summary')
  for (const key of summaryKeys)
    assertSafeNonNegativeInteger(control.summary[key], `W9 graph source-semantics.sourceControl.summary.${key}`)
  if (control.summary.existingSchemaSites !== 22 || control.summary.existingSchemaSkillCosts !== 3)
    throw new Error('W9 graph source-semantics.sourceControl.summary: existing-schema census 漂移')
}

function projectionBody(
  projection: W9B10ControlGraphProjectionV1,
): Omit<W9B10ControlGraphProjectionV1, 'digest'> {
  const { digest: _digest, ...body } = projection
  return body
}

export function assertW9ControlGraphProjectionSelfConsistent(
  projection: W9B10ControlGraphProjectionV1,
): void {
  assertExactKeys(
    projection as unknown as Record<string, unknown>,
    ['version', 'rewindOrder', 'b10', 'r13Z', 'r13SixC', 'sourceSemantics', 'digest'],
    'W9 control graph projection',
  )
  if (projection.version !== 1)
    throw new Error('W9 control graph projection: version 漂移')
  const expectedOrder = [
    B10_ENEMY_TEAM_SLOTS_TRANSITION_ID,
    R13_Z_TRANSITION_ID,
    R13_SIX_C_TRANSITION_ID,
    R13_SOURCE_SEMANTICS_TRANSITION_ID,
  ]
  if (!isDeepStrictEqual(projection.rewindOrder, expectedOrder))
    throw new Error('W9 control graph projection: rewind order 漂移')
  assertHexDigest(projection.digest, 'W9 control graph projection.digest')
  if (stableJsonSha256(projectionBody(projection)) !== projection.digest)
    throw new Error('W9 control graph projection: 自摘要不符')
}

/**
 * Verify the historical B10 control graph before W9 is allowed to mint a successor seal.
 * Validation and stripping follow the frozen rewind order B10 → Z → 6C → source-semantics.
 */
export function assertB10PublishedAuthorityGraph(
  source: MigrationSnapshot,
): W9B10PublishedAuthorityGraph {
  const b10 = assertB10PublishedAuthority(source)
  if (!b10) throw new Error('W9 graph: 缺 published B10 authority')
  const b10Tuple = readStrictTransitionTuple<B10EnemyTeamSlotsSealV1>(
    source,
    B10_ENEMY_TEAM_SLOTS_TRANSITION_ID,
    B10_ENEMY_TEAM_SLOTS_SEAL_PATH,
    'W9 graph B10',
  )
  const b10Surface = b10PublishTimeSurfaceDigest(source)
  if (b10Surface !== b10.content.publishTimeSurfaceDigest)
    throw new Error('W9 graph B10: publish-time surface digest 漂移')

  // The graph is checked on the published surface first, then each outer successor body is
  // rewound before the next layer's non-self surface is computed.  This mirrors the frozen
  // historical order; deleting only seal bytes would leave B10/6B successor bodies in the
  // source-semantics surface and produce a false digest drift.
  const afterB10 = rewindB10PublicationIfPresent(source)
  const zTuple = readStrictTransitionTuple<R13ZTransitionSealV1>(
    afterB10,
    R13_Z_TRANSITION_ID,
    R13_Z_SEAL_PATH,
    'W9 graph R13-Z',
  )
  const sixCTuple = readStrictTransitionTuple<R13SixCTransitionSealV1>(
    afterB10,
    R13_SIX_C_TRANSITION_ID,
    R13_SIX_C_SEAL_PATH,
    'W9 graph R13-6C',
  )
  const sourceTuple = readStrictTransitionTuple<R13SourceSemanticsTransitionSealV1>(
    afterB10,
    R13_SOURCE_SEMANTICS_TRANSITION_ID,
    R13_SOURCE_SEMANTICS_SEAL_PATH,
    'W9 graph source-semantics',
  )
  assertR13ZIdentity(zTuple.seal)
  assertR13SixCIdentity(sixCTuple.seal)
  assertSourceSemanticsIdentity(sourceTuple.seal)

  if (
    b10.parent.metadataDigest !== sixCTuple.metadataDigest ||
    b10.parent.sealDigest !== sixCTuple.sealDigest
  )
    throw new Error('W9 graph: B10 parent 与 R13-6C 四元组不符')
  const required = b10.requiredControls[0]
  if (
    !required ||
    required.metadataDigest !== zTuple.metadataDigest ||
    required.sealDigest !== zTuple.sealDigest
  )
    throw new Error('W9 graph: B10 required control 与 R13-Z 四元组不符')
  if (
    zTuple.seal.parent.digest !== sourceTuple.sealDigest ||
    sixCTuple.seal.parent.digest !== sourceTuple.sealDigest
  )
    throw new Error('W9 graph: R13-Z / R13-6C 未绑定同一 source-semantics parent')
  if (
    zTuple.seal.sourceControl.finalDigest !== sourceTuple.seal.sourceControl.finalDigest ||
    sixCTuple.seal.closure.finalContentDigest !== sourceTuple.seal.sourceControl.finalDigest
  )
    throw new Error('W9 graph: R13-Z / R13-6C / source-semantics content closure 漂移')

  const zSurface = nonSelfPublishSurfaceDigest(afterB10, R13_Z_TRANSITION_ID, R13_Z_SEAL_PATH)
  const afterZ = rewindPublishedR13ZPublicationIfPresent(afterB10)
  const sixCSurface = nonSelfPublishSurfaceDigest(
    afterZ,
    R13_SIX_C_TRANSITION_ID,
    R13_SIX_C_SEAL_PATH,
  )
  const afterSixC = rewindPalR13SixBPublication(
    rewindPalR13SixCPublicationIfPresent(afterZ),
  )
  const sourceSurface = nonSelfPublishSurfaceDigest(
    afterSixC,
    R13_SOURCE_SEMANTICS_TRANSITION_ID,
    R13_SOURCE_SEMANTICS_SEAL_PATH,
  )
  // Replays the published augmentation against the exact 6A content surface, not the outer
  // B10/6B successor. This catches a self-consistent but semantically stale source seal.
  const sourceClosureInput = cloneSnapshot(afterSixC)
  // Baseline snapshots intentionally keep project maps hash-only; generated replay snapshots
  // may materialize the same atomic map bodies. Normalize both forms before invoking the
  // historical source-semantics content closure, exactly as the publish-surface digest does.
  for (const path of [...sourceClosureInput.files.keys()])
    if (isAtomicProjectMapPath(path)) sourceClosureInput.files.delete(path)
  for (const path of [...(sourceClosureInput.hashes?.keys() ?? [])])
    if (isAtomicProjectMapPath(path)) sourceClosureInput.hashes?.delete(path)
  try {
    resolveR13ZSourceSemanticsClosure(sourceClosureInput)
  } catch (error) {
    const content = cloneSnapshot(sourceClosureInput)
    for (const path of [...content.files.keys()])
      if (path.startsWith('_transitions/')) content.files.delete(path)
    for (const path of [...content.managedFiles])
      if (path.startsWith('_transitions/')) content.managedFiles.delete(path)
    for (const path of [...(content.hashes?.keys() ?? [])])
      if (path.startsWith('_transitions/')) content.hashes?.delete(path)
    delete content.baselineMetadata
    const actualContentDigest = stableJsonSha256(
      [...content.managedFiles]
        .filter((path) => content.files.has(path))
        .sort(stableStringCompare)
        .map((path) => ({ path, value: content.files.get(path)! })),
    )
    const expectedContentDigest = (sourceTuple.seal.augmentation as unknown as Record<string, unknown>)
      .successorContentDigest
    throw new Error(
      `W9 graph source-semantics closure: ${error instanceof Error ? error.message : String(error)} ` +
        `actual=${String(actualContentDigest)} expected=${String(expectedContentDigest)}`,
    )
  }
  const body: Omit<W9B10ControlGraphProjectionV1, 'digest'> = {
    version: 1,
    rewindOrder: [
      B10_ENEMY_TEAM_SLOTS_TRANSITION_ID,
      R13_Z_TRANSITION_ID,
      R13_SIX_C_TRANSITION_ID,
      R13_SOURCE_SEMANTICS_TRANSITION_ID,
    ],
    b10: {
      transitionId: B10_ENEMY_TEAM_SLOTS_TRANSITION_ID,
      metadataDigest: b10Tuple.metadataDigest,
      sealDigest: b10Tuple.sealDigest,
      fileSha256: b10Tuple.fileSha256,
      nonSelfPublishSurfaceDigest: b10Surface,
      successorContentDigest: b10.content.successorDigest,
    },
    r13Z: {
      transitionId: R13_Z_TRANSITION_ID,
      metadataDigest: zTuple.metadataDigest,
      sealDigest: zTuple.sealDigest,
      fileSha256: zTuple.fileSha256,
      nonSelfPublishSurfaceDigest: zSurface,
      parentDigest: zTuple.seal.parent.digest,
      finalContentDigest: zTuple.seal.sourceControl.finalDigest,
    },
    r13SixC: {
      transitionId: R13_SIX_C_TRANSITION_ID,
      metadataDigest: sixCTuple.metadataDigest,
      sealDigest: sixCTuple.sealDigest,
      fileSha256: sixCTuple.fileSha256,
      nonSelfPublishSurfaceDigest: sixCSurface,
      parentDigest: sixCTuple.seal.parent.digest,
      finalContentDigest: sixCTuple.seal.closure.finalContentDigest,
    },
    sourceSemantics: {
      transitionId: R13_SOURCE_SEMANTICS_TRANSITION_ID,
      metadataDigest: sourceTuple.metadataDigest,
      sealDigest: sourceTuple.sealDigest,
      fileSha256: sourceTuple.fileSha256,
      nonSelfPublishSurfaceDigest: sourceSurface,
      parentTransitionId: 'r13-enemy-script-v1',
      parentDigest: sourceTuple.seal.parent.digest,
      finalContentDigest: sourceTuple.seal.sourceControl.finalDigest,
    },
  }
  const projection = { ...body, digest: stableJsonSha256(body) }
  assertW9ControlGraphProjectionSelfConsistent(projection)
  return {
    b10,
    r13Z: zTuple.seal,
    r13SixC: sixCTuple.seal,
    sourceSemantics: sourceTuple.seal,
    projection,
  }
}
