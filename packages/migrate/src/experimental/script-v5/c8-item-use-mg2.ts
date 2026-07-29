import { isDeepStrictEqual } from 'node:util'
import { SCRIPT_V4_V5_TRANSITION_ID } from '@type-pal/content'
import type { MigrationSnapshot } from '../../migration-baseline.js'
import type { MigrationJson } from '../../pal-migration.js'
import {
  assertC8ItemUseFinalTargetClosure,
  C8_ITEM_IDS,
  C8_ITEM_SOURCE_ROOTS,
  C8_STORY_ITEM_ROOTS,
  type C8ItemTransitionEvidenceV1,
  type C8ItemUseAugmentationEvidenceV1,
  type C8OwnedTargetEvidenceV1,
} from './c8-item-use-augmentation.js'
import { createP7V5MigrationPlan, P7_FULL_LEDGER_PATH, type P7V5MigrationPlan } from './p7-mg2.js'
import { digestRecord, stableJson, stableJsonSha256 } from './stable-json.js'

export const C8_ITEM_USE_TRANSITION_ID = 'c8-item-use-v5-v1' as const
export const C8_ITEM_USE_SEAL_PATH = '_transitions/c8-item-use-v5-v1.json' as const

interface C8ItemUseTransitionSealBodyV1 {
  kind: 'c8-item-use-transition'
  version: 1
  projectId: 'pal'
  transitionId: typeof C8_ITEM_USE_TRANSITION_ID
  generator: C8ItemUseAugmentationEvidenceV1['generator']
  parent: {
    transitionId: typeof SCRIPT_V4_V5_TRANSITION_ID
    fullLedgerDigest: string
  }
  items: C8ItemTransitionEvidenceV1[]
  ownedTargets: C8OwnedTargetEvidenceV1[]
  diagnostics: C8ItemUseAugmentationEvidenceV1['diagnostics']
  gates: C8ItemUseAugmentationEvidenceV1['gates']
}

export interface C8ItemUseTransitionSealV1 extends C8ItemUseTransitionSealBodyV1 {
  digest: string
}

export interface C8ItemUseV5MigrationPlan extends P7V5MigrationPlan {
  seal: C8ItemUseTransitionSealV1
  sealMode: 'initialize' | 'replay'
}

function cloneSnapshot(source: MigrationSnapshot): MigrationSnapshot {
  return {
    // This shell only changes map membership/representation. P7 owns the deep copies
    // used by the merge, and preservePublishedSnapshotRepresentation replaces map
    // values instead of mutating their shared JSON objects.
    files: new Map(source.files),
    managedFiles: new Set(source.managedFiles),
    ...(source.hashes ? { hashes: new Map(source.hashes) } : {}),
    ...(source.baselineMetadata
      ? { baselineMetadata: structuredClone(source.baselineMetadata) }
      : {}),
  }
}

/**
 * MG2 compares JSON values semantically, but the transaction writer serializes the
 * selected value in its current property order. Reusing the published representation
 * for equal subtrees keeps a small post-P7 augmentation from rewriting every canonical
 * scene only because the projector constructed equivalent objects in a different order.
 */
function preservePublishedRepresentation(
  published: MigrationJson,
  generated: MigrationJson,
): MigrationJson {
  if (isDeepStrictEqual(published, generated)) return published
  if (Array.isArray(generated)) {
    if (!Array.isArray(published)) return generated
    return generated.map((entry, index) => {
      const previous = published[index]
      return previous === undefined ? entry : preservePublishedRepresentation(previous, entry)
    })
  }
  if (!generated || typeof generated !== 'object') return generated
  if (!published || typeof published !== 'object' || Array.isArray(published)) return generated

  const result: Record<string, MigrationJson> = {}
  for (const key of Object.keys(published))
    if (Object.hasOwn(generated, key))
      result[key] = preservePublishedRepresentation(published[key]!, generated[key]!)
  for (const key of Object.keys(generated))
    if (!Object.hasOwn(published, key)) result[key] = generated[key]!
  return result
}

function preservePublishedSnapshotRepresentation(
  published: MigrationSnapshot,
  generated: MigrationSnapshot,
): void {
  for (const [path, value] of generated.files) {
    const previous = published.files.get(path)
    if (previous !== undefined)
      generated.files.set(path, preservePublishedRepresentation(previous, value))
  }
}

function digestFromRecord(value: MigrationJson | undefined, path: string): string {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`C8 item use MG2: ${path} 无效`)
  const { digest, ...body } = value
  if (typeof digest !== 'string' || !/^[a-f0-9]{64}$/.test(digest))
    throw new Error(`C8 item use MG2: ${path}.digest 无效`)
  if (stableJsonSha256(body) !== digest) throw new Error(`C8 item use MG2: ${path} 自摘要不符`)
  return digest
}

function publishedP7Digest(base: MigrationSnapshot): string {
  const metadata = base.baselineMetadata
  if (!metadata) throw new Error('C8 item use MG2: baseline 必须是 v2')
  const expected = metadata.transitions[SCRIPT_V4_V5_TRANSITION_ID]
  if (!expected) throw new Error('C8 item use MG2: baseline 缺 P7 transition metadata')
  const actual = digestFromRecord(base.files.get(P7_FULL_LEDGER_PATH), P7_FULL_LEDGER_PATH)
  if (actual !== expected) throw new Error('C8 item use MG2: P7 full ledger 与 metadata 不符')
  return actual
}

function validateEvidence(evidence: C8ItemUseAugmentationEvidenceV1): void {
  if (evidence.generator.id !== 'c8-item-use-augmentation' || evidence.generator.version !== 1)
    throw new Error('C8 item use MG2: generator 版本无效')
  const expectedIds = C8_ITEM_IDS.map(String)
  const actualIds = evidence.items.map((entry) => entry.itemId)
  if (
    actualIds.length !== expectedIds.length ||
    actualIds.some((id, index) => id !== expectedIds[index])
  )
    throw new Error(`C8 item use MG2: item evidence 必须是固定 20 件数字升序`)
  for (const entry of evidence.items) {
    const expectedRoots = C8_ITEM_SOURCE_ROOTS.filter(
      (root) => String(root.itemId) === entry.itemId,
    )
    const expectedRootChannels = expectedRoots.map((root) => root.channel)
    const rootChannels = entry.sourceRoots.map((root) => root.channel)
    const targetChannels = entry.targets.map((target) => target.channel)
    if (
      rootChannels.length !== expectedRootChannels.length ||
      rootChannels.some((channel, index) => channel !== expectedRootChannels[index]) ||
      targetChannels.length !== expectedRootChannels.length ||
      targetChannels.some((channel, index) => channel !== expectedRootChannels[index])
    )
      throw new Error(`C8 item use MG2: 物品 ${entry.itemId} channel 证据不闭合`)
    for (const root of entry.sourceRoots)
      if (
        !Number.isInteger(root.address) ||
        root.address <= 0 ||
        !/^[a-f0-9]{64}$/.test(root.closureDigest)
      )
        throw new Error(`C8 item use MG2: 物品 ${entry.itemId} source root 无效`)
    entry.sourceRoots.forEach((root, index) => {
      const expected = expectedRoots[index]
      if (!expected || root.channel !== expected.channel || root.address !== expected.address)
        throw new Error(`C8 item use MG2: 物品 ${entry.itemId} source root 漂移`)
    })
    for (const target of entry.targets) {
      const expectedKind = target.channel === 'use' ? 'item-use' : 'item-throw'
      if (
        target.identity.kind !== expectedKind ||
        target.identity.itemId !== entry.itemId ||
        !/^[a-f0-9]{64}$/.test(target.digest)
      )
        throw new Error(`C8 item use MG2: 物品 ${entry.itemId} target digest 无效`)
    }
  }
  const ownedKeys = evidence.ownedTargets.map((entry) => {
    if (!/^[a-f0-9]{64}$/.test(entry.digest))
      throw new Error('C8 item use MG2: owned target digest 无效')
    return stableJson(entry.identity)
  })
  if (
    ownedKeys.length === 0 ||
    new Set(ownedKeys).size !== ownedKeys.length ||
    ownedKeys.some((key, index) => index > 0 && ownedKeys[index - 1]!.localeCompare(key) > 0)
  )
    throw new Error('C8 item use MG2: owned target identity 必须唯一且稳定排序')
  const expectedRemoved = C8_STORY_ITEM_ROOTS.map((entry) => String(entry.itemId)).sort(
    (left, right) => Number(left) - Number(right),
  )
  if (
    evidence.diagnostics.removedItemIds.length !== expectedRemoved.length ||
    evidence.diagnostics.removedItemIds.some((id, index) => id !== expectedRemoved[index]) ||
    !/^[a-f0-9]{64}$/.test(evidence.diagnostics.sourceDigest)
  )
    throw new Error('C8 item use MG2: diagnostics 证据无效')
  if (
    evidence.diagnostics.remainingItemUseIds.length !== 0 ||
    evidence.gates.itemUseDiagnosticCount !== 0 ||
    evidence.gates.sourceUsableItemIds.length !== 100 ||
    evidence.gates.targetRunnableUseItemIds.length !== 100 ||
    new Set(evidence.gates.sourceUsableItemIds).size !== 100 ||
    evidence.gates.sourceUsableItemIds.some(
      (id, index) => id !== evidence.gates.targetRunnableUseItemIds[index],
    ) ||
    evidence.gates.sourceUsableItemIds.some(
      (id, index) =>
        index > 0 && Number(evidence.gates.sourceUsableItemIds[index - 1]) >= Number(id),
    )
  )
    throw new Error('C8 item use MG2: 100/0 门禁未闭合')
}

function buildSeal(
  evidence: C8ItemUseAugmentationEvidenceV1,
  p7Digest: string,
): C8ItemUseTransitionSealV1 {
  validateEvidence(evidence)
  return digestRecord<C8ItemUseTransitionSealV1>({
    kind: 'c8-item-use-transition',
    version: 1,
    projectId: 'pal',
    transitionId: C8_ITEM_USE_TRANSITION_ID,
    generator: structuredClone(evidence.generator),
    parent: {
      transitionId: SCRIPT_V4_V5_TRANSITION_ID,
      fullLedgerDigest: p7Digest,
    },
    items: structuredClone(evidence.items),
    ownedTargets: structuredClone(evidence.ownedTargets),
    diagnostics: structuredClone(evidence.diagnostics),
    gates: structuredClone(evidence.gates),
  })
}

function c8State(base: MigrationSnapshot): 'initialize' | 'replay' {
  const metadata = base.baselineMetadata?.transitions[C8_ITEM_USE_TRANSITION_ID] !== undefined
  const file = base.files.has(C8_ITEM_USE_SEAL_PATH)
  const managed = base.managedFiles.has(C8_ITEM_USE_SEAL_PATH)
  const hash = base.hashes?.has(C8_ITEM_USE_SEAL_PATH) === true
  if (!metadata && !file && !managed && !hash) return 'initialize'
  if (metadata && file && managed && hash) return 'replay'
  throw new Error(
    `C8 item use MG2: transition 半状态 metadata=${metadata} file=${file} managed=${managed} hash=${hash}`,
  )
}

function stripC8Control(
  source: MigrationSnapshot,
  options: { removeMetadata: boolean },
): MigrationSnapshot {
  const result = cloneSnapshot(source)
  result.files.delete(C8_ITEM_USE_SEAL_PATH)
  result.managedFiles.delete(C8_ITEM_USE_SEAL_PATH)
  result.hashes?.delete(C8_ITEM_USE_SEAL_PATH)
  if (options.removeMetadata && result.baselineMetadata)
    delete result.baselineMetadata.transitions[C8_ITEM_USE_TRANSITION_ID]
  return result
}

/**
 * Append-only C8 control wrapper. The historical P7 ledger remains the immutable parent;
 * the C8 seal only exists in the baseline and is removed from all three MG2 project inputs.
 */
export function createC8ItemUseV5MigrationPlan(args: {
  base: MigrationSnapshot
  ours: MigrationSnapshot
  generated: MigrationSnapshot
  evidence: C8ItemUseAugmentationEvidenceV1
}): C8ItemUseV5MigrationPlan {
  const p7Digest = publishedP7Digest(args.base)
  const expectedSeal = buildSeal(args.evidence, p7Digest)
  const sealMode = c8State(args.base)

  if (
    args.generated.files.has(C8_ITEM_USE_SEAL_PATH) ||
    args.generated.managedFiles.has(C8_ITEM_USE_SEAL_PATH) ||
    args.generated.hashes?.has(C8_ITEM_USE_SEAL_PATH)
  )
    throw new Error('C8 item use MG2: generated 不得携带 C8 seal')
  if (args.ours.files.has(C8_ITEM_USE_SEAL_PATH) || args.ours.hashes?.has(C8_ITEM_USE_SEAL_PATH))
    throw new Error('C8 item use MG2: project 不得携带 C8 seal')

  let publishedSeal: C8ItemUseTransitionSealV1 | undefined
  if (sealMode === 'replay') {
    const raw = args.base.files.get(C8_ITEM_USE_SEAL_PATH)
    const digest = digestFromRecord(raw, C8_ITEM_USE_SEAL_PATH)
    if (args.base.baselineMetadata?.transitions[C8_ITEM_USE_TRANSITION_ID] !== digest)
      throw new Error('C8 item use MG2: seal 与 transition metadata 不符')
    publishedSeal = structuredClone(raw) as unknown as C8ItemUseTransitionSealV1
    if (!isDeepStrictEqual(publishedSeal, expectedSeal))
      throw new Error('C8 item use MG2: 权威重建证据与已发布 seal 不符')
  }

  const base = stripC8Control(args.base, { removeMetadata: true })
  const ours = stripC8Control(args.ours, { removeMetadata: false })
  const generated = stripC8Control(args.generated, { removeMetadata: false })
  preservePublishedSnapshotRepresentation(base, generated)
  const p7 = createP7V5MigrationPlan({ base, ours, generated })
  if (
    p7.target.files.has(C8_ITEM_USE_SEAL_PATH) ||
    p7.target.managedFiles.has(C8_ITEM_USE_SEAL_PATH) ||
    p7.plan.target.has(C8_ITEM_USE_SEAL_PATH)
  )
    throw new Error('C8 item use MG2: C8 seal 泄漏到工程 target')
  assertC8ItemUseFinalTargetClosure(p7.target, args.evidence)

  const seal = publishedSeal ?? expectedSeal
  p7.nextBaseline.files.set(C8_ITEM_USE_SEAL_PATH, asMigrationJson(seal))
  p7.nextBaseline.managedFiles.add(C8_ITEM_USE_SEAL_PATH)
  p7.nextBaseline.hashes?.delete(C8_ITEM_USE_SEAL_PATH)
  if (!p7.nextBaseline.baselineMetadata)
    throw new Error('C8 item use MG2: P7 nextBaseline 丢失 metadata')
  p7.nextBaseline.baselineMetadata.transitions[C8_ITEM_USE_TRANSITION_ID] = seal.digest
  return { ...p7, seal, sealMode }
}

function asMigrationJson(value: C8ItemUseTransitionSealV1): MigrationJson {
  return JSON.parse(JSON.stringify(value)) as MigrationJson
}
