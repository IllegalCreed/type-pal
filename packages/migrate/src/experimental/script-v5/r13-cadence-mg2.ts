import { isDeepStrictEqual } from 'node:util'
import type { SceneDefV5 } from '@type-pal/content'
import { validateHistoricalScenesForCurrentSchema } from '../../historical-enemy-team-authority.js'
import type { MigrationSnapshot } from '../../migration-baseline.js'
import type { MigrationJson } from '../../pal-migration.js'
import { appendOnlyTransitionState } from './append-only-transition-state.js'
import {
  C8_ITEM_USE_SEAL_PATH,
  C8_ITEM_USE_TRANSITION_ID,
  type C8ItemUseV5MigrationPlan,
  createC8ItemUseV5MigrationPlan,
} from './c8-item-use-mg2.js'
import type { P7GeneratedCanonical } from './p7-generated.js'
import {
  assertPalR13CadenceEvidence,
  buildPalR13CadenceEvidence,
  type R13CadenceEvidenceV1,
} from './r13-cadence-evidence.js'
import { digestRecord, stableJsonSha256 } from './stable-json.js'

export const R13_CADENCE_TRANSITION_ID = 'r13-cadence-v1' as const
export const R13_CADENCE_SEAL_PATH = '_transitions/r13-cadence-v1.json' as const

interface R13CadenceTransitionSealBodyV1 {
  kind: 'r13-cadence-transition'
  version: 1
  projectId: 'pal'
  transitionId: typeof R13_CADENCE_TRANSITION_ID
  parent: {
    transitionId: typeof C8_ITEM_USE_TRANSITION_ID
    digest: string
  }
  evidence: R13CadenceEvidenceV1
}

export interface R13CadenceTransitionSealV1 extends R13CadenceTransitionSealBodyV1 {
  digest: string
}

export interface R13CadenceV5MigrationPlan extends C8ItemUseV5MigrationPlan {
  cadenceEvidence: R13CadenceEvidenceV1
  cadenceSeal: R13CadenceTransitionSealV1
  cadenceSealMode: 'initialize' | 'replay'
}

/**
 * Expensive PAL cadence authority prepared for one immutable generated input.
 *
 * This is explicit caller-owned state rather than a module-global cache. The
 * exact object identities are part of the proof: callers must not mutate the
 * generated canonical or evidence while the prepared context is in use.
 */
export interface PreparedR13CadenceAuthority {
  readonly generated: P7GeneratedCanonical
  readonly cadenceParentSnapshot: MigrationSnapshot
  readonly autoLifecycle: P7GeneratedCanonical['project']['autoLifecycle']
  readonly autoLifecycleRepairEvidence: P7GeneratedCanonical['autoLifecycleRepairEvidence']
  readonly sceneSemanticRepairEvidence: P7GeneratedCanonical['sceneSemanticRepairEvidence']
  readonly evidence: R13CadenceEvidenceV1
  readonly evidenceDigest: string
}

function cloneSnapshot(source: MigrationSnapshot): MigrationSnapshot {
  return {
    // The control shell only removes a map entry. C8/P7 clone values before merge,
    // so cloning the complete PAL tree again at this layer is redundant and can
    // multiply peak memory for every append-only successor wrapper.
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
    throw new Error(`R13 cadence MG2: ${path} 无效`)
  const { digest, ...body } = value
  if (typeof digest !== 'string' || !/^[a-f0-9]{64}$/.test(digest))
    throw new Error(`R13 cadence MG2: ${path}.digest 无效`)
  if (stableJsonSha256(body) !== digest) throw new Error(`R13 cadence MG2: ${path} 自摘要不符`)
  return digest
}

function publishedC8Digest(base: MigrationSnapshot): string {
  const expected = base.baselineMetadata?.transitions[C8_ITEM_USE_TRANSITION_ID]
  if (!expected) throw new Error('R13 cadence MG2: baseline 缺 C8 transition metadata')
  const actual = recordDigest(base.files.get(C8_ITEM_USE_SEAL_PATH), C8_ITEM_USE_SEAL_PATH)
  if (actual !== expected) throw new Error('R13 cadence MG2: C8 seal 与 metadata 不符')
  return actual
}

function stripCadenceControl(
  source: MigrationSnapshot,
  options: { removeMetadata: boolean },
): MigrationSnapshot {
  const result = cloneSnapshot(source)
  result.files.delete(R13_CADENCE_SEAL_PATH)
  result.managedFiles.delete(R13_CADENCE_SEAL_PATH)
  result.hashes?.delete(R13_CADENCE_SEAL_PATH)
  if (options.removeMetadata && result.baselineMetadata)
    delete result.baselineMetadata.transitions[R13_CADENCE_TRANSITION_ID]
  return result
}

function asMigrationJson(value: R13CadenceTransitionSealV1): MigrationJson {
  return JSON.parse(JSON.stringify(value)) as MigrationJson
}

function buildSeal(
  evidence: R13CadenceEvidenceV1,
  parentDigest: string,
): R13CadenceTransitionSealV1 {
  return digestRecord<R13CadenceTransitionSealV1>({
    kind: 'r13-cadence-transition',
    version: 1,
    projectId: 'pal',
    transitionId: R13_CADENCE_TRANSITION_ID,
    parent: { transitionId: C8_ITEM_USE_TRANSITION_ID, digest: parentDigest },
    evidence: structuredClone(evidence),
  })
}

export function assertR13CadencePublishedSealMatchesAuthority(
  publishedSeal: unknown,
  expectedSeal: R13CadenceTransitionSealV1,
): void {
  if (!isDeepStrictEqual(publishedSeal, expectedSeal))
    throw new Error('R13 cadence MG2: 权威重建证据与已发布 seal 不符')
}

function targetScenes(snapshot: MigrationSnapshot): Map<string, SceneDefV5> {
  const ids = snapshot.files.get('content/scenes/index.json')
  if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'string'))
    throw new Error('R13 cadence MG2: target scene index 无效')
  const scenes = validateHistoricalScenesForCurrentSchema(
    ids.map((id) => {
      const scene = snapshot.files.get(`content/scenes/${String(id)}.json`)
      if (!scene) throw new Error(`R13 cadence MG2: target 缺 scene ${String(id)}`)
      return scene
    }),
  )
  return new Map(scenes.map((scene) => [scene.id, scene]))
}

function assertCadenceTargets(target: MigrationSnapshot, evidence: R13CadenceEvidenceV1): void {
  const scenes = targetScenes(target)
  for (const owner of evidence.owners) {
    const match = /^entity:([^:]+):([^:]+):auto:([^:]+)$/.exec(owner.ownerKey)
    if (!match) throw new Error(`R13 cadence MG2: owner key 无效 ${owner.ownerKey}`)
    const flow = scenes.get(match[1]!)?.entities.find((entity) => entity.id === match[2])?.behaviors
      ?.auto?.[match[3]!]?.flow
    if (
      flow?.kind !== 'stateMachine' ||
      flow.machine.cadence !== 'transition' ||
      stableJsonSha256(flow) !== owner.flowDigest
    )
      throw new Error(`R13 cadence MG2: target cadence owner 漂移 ${owner.ownerKey}`)
  }
}

export function prepareR13CadenceAuthority(
  generated: P7GeneratedCanonical,
): PreparedR13CadenceAuthority {
  const evidence = buildPalR13CadenceEvidence({
    snapshot: generated.r13CadenceParentSnapshot,
    // R13-1 的 compatibility oracle 必须永远从 immutable parent 重建。
    // successor baseline 已包含 R13-2 flow，不能反向喂给旧 seal 的 K6 对照。
    compatibilityBase: generated.r13CadenceParentSnapshot,
    autoLifecycle: generated.project.autoLifecycle,
    autoLifecycleRepairEvidence: generated.autoLifecycleRepairEvidence,
    sceneSemanticRepairEvidence: generated.sceneSemanticRepairEvidence,
  })
  assertCadenceTargets(generated.r13CadenceParentSnapshot, evidence)
  return Object.freeze({
    generated,
    cadenceParentSnapshot: generated.r13CadenceParentSnapshot,
    autoLifecycle: generated.project.autoLifecycle,
    autoLifecycleRepairEvidence: generated.autoLifecycleRepairEvidence,
    sceneSemanticRepairEvidence: generated.sceneSemanticRepairEvidence,
    evidence,
    evidenceDigest: evidence.digest,
  })
}

function assertPreparedR13CadenceAuthority(
  prepared: PreparedR13CadenceAuthority,
  generated: P7GeneratedCanonical,
): void {
  if (
    prepared.generated !== generated ||
    prepared.cadenceParentSnapshot !== generated.r13CadenceParentSnapshot ||
    prepared.autoLifecycle !== generated.project.autoLifecycle ||
    prepared.autoLifecycleRepairEvidence !== generated.autoLifecycleRepairEvidence ||
    prepared.sceneSemanticRepairEvidence !== generated.sceneSemanticRepairEvidence
  )
    throw new Error('R13 cadence MG2: prepared authority 输入身份漂移')
  if (prepared.evidence.digest !== prepared.evidenceDigest)
    throw new Error('R13 cadence MG2: prepared authority 摘要漂移')
  assertPalR13CadenceEvidence(prepared.evidence)
  assertCadenceTargets(generated.r13CadenceParentSnapshot, prepared.evidence)
}

/**
 * R13-1 最外层 append-only wrapper。R13 控制文件在进入 C8/P7 三方合并前从
 * base/ours/generated 全部剥离，只在 nextBaseline 恢复，绝不进入工程或 manifest。
 */
export function createR13CadenceV5MigrationPlan(args: {
  base: MigrationSnapshot
  ours: MigrationSnapshot
  generated: P7GeneratedCanonical
  preparedAuthority?: PreparedR13CadenceAuthority
}): R13CadenceV5MigrationPlan {
  const parentDigest = publishedC8Digest(args.base)
  const cadenceSealMode = appendOnlyTransitionState(args.base, {
    transitionId: R13_CADENCE_TRANSITION_ID,
    sealPath: R13_CADENCE_SEAL_PATH,
    errorPrefix: 'R13 cadence MG2',
  })
  if (
    args.generated.snapshot.files.has(R13_CADENCE_SEAL_PATH) ||
    args.generated.snapshot.managedFiles.has(R13_CADENCE_SEAL_PATH) ||
    args.generated.snapshot.hashes?.has(R13_CADENCE_SEAL_PATH)
  )
    throw new Error('R13 cadence MG2: generated 不得携带 R13 seal')
  if (args.ours.files.has(R13_CADENCE_SEAL_PATH) || args.ours.hashes?.has(R13_CADENCE_SEAL_PATH))
    throw new Error('R13 cadence MG2: project 不得携带 R13 seal')

  let cadenceEvidence: R13CadenceEvidenceV1
  if (args.preparedAuthority) {
    assertPreparedR13CadenceAuthority(args.preparedAuthority, args.generated)
    cadenceEvidence = args.preparedAuthority.evidence
  } else cadenceEvidence = prepareR13CadenceAuthority(args.generated).evidence
  const expectedSeal = buildSeal(cadenceEvidence, parentDigest)
  let publishedSeal: R13CadenceTransitionSealV1 | undefined
  if (cadenceSealMode === 'replay') {
    const raw = args.base.files.get(R13_CADENCE_SEAL_PATH)
    const digest = recordDigest(raw, R13_CADENCE_SEAL_PATH)
    if (args.base.baselineMetadata?.transitions[R13_CADENCE_TRANSITION_ID] !== digest)
      throw new Error('R13 cadence MG2: seal 与 transition metadata 不符')
    publishedSeal = structuredClone(raw) as unknown as R13CadenceTransitionSealV1
    assertR13CadencePublishedSealMatchesAuthority(publishedSeal, expectedSeal)
  }

  const c8 = createC8ItemUseV5MigrationPlan({
    base: stripCadenceControl(args.base, { removeMetadata: true }),
    ours: stripCadenceControl(args.ours, { removeMetadata: false }),
    generated: stripCadenceControl(args.generated.snapshot, { removeMetadata: false }),
    evidence: args.generated.c8Evidence,
  })
  if (
    c8.target.files.has(R13_CADENCE_SEAL_PATH) ||
    c8.target.managedFiles.has(R13_CADENCE_SEAL_PATH) ||
    c8.plan.target.has(R13_CADENCE_SEAL_PATH)
  )
    throw new Error('R13 cadence MG2: R13 seal 泄漏到工程 target')
  const cadenceSeal = publishedSeal ?? expectedSeal
  c8.nextBaseline.files.set(R13_CADENCE_SEAL_PATH, asMigrationJson(cadenceSeal))
  c8.nextBaseline.managedFiles.add(R13_CADENCE_SEAL_PATH)
  c8.nextBaseline.hashes?.delete(R13_CADENCE_SEAL_PATH)
  if (!c8.nextBaseline.baselineMetadata)
    throw new Error('R13 cadence MG2: nextBaseline 丢失 metadata')
  c8.nextBaseline.baselineMetadata.transitions[R13_CADENCE_TRANSITION_ID] = cadenceSeal.digest
  return {
    ...c8,
    cadenceEvidence,
    cadenceSeal,
    cadenceSealMode,
  }
}
