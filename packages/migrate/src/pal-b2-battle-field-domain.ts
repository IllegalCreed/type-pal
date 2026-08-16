import { isDeepStrictEqual } from 'node:util'
import {
  CURRENT_PROJECT_MINIMUM_SAVE_VERSION,
  type BattleFieldDef,
  type ManifestV14,
  separateLegacyPalBattleFieldDomain,
  validateBattleFields,
} from '@type-pal/content'
import { stableJsonSha256, stableStringCompare } from './experimental/script-v5/stable-json.js'
import {
  type MigrationSnapshot,
  serializeMigrationJson,
  sha256,
} from './migration-baseline.js'
import {
  C1_NPC_CURATION_TRANSITION_ID,
  rewindPublishedC1NpcCurationIfPresent,
} from './pal-c1-npc-curation-transition.js'
import type { MigrationJson } from './pal-migration.js'

export const B2_BATTLE_FIELD_DOMAIN_TRANSITION_ID = 'b2-battle-field-domain-v1' as const
export const B2_BATTLE_FIELD_DOMAIN_SEAL_PATH =
  '_transitions/b2-battle-field-domain-v1.json' as const
export const B2_BATTLE_FIELD_DOMAIN_METHOD = 'pal-b2-battle-field-domain-v1' as const
export const PAL_B2_BATTLE_FIELD_PATH = 'content/battle-fields.json' as const

export interface B2BattleFieldDomainSealV1 {
  kind: 'b2-battle-field-domain-transition'
  version: 1
  projectId: 'pal'
  transitionId: typeof B2_BATTLE_FIELD_DOMAIN_TRANSITION_ID
  methodVersion: typeof B2_BATTLE_FIELD_DOMAIN_METHOD
  parent: {
    transitionId: typeof C1_NPC_CURATION_TRANSITION_ID
    sealDigest: string
    surfaceDigest: string
  }
  source: {
    rawBattleFieldsDigest: string
    path: typeof PAL_B2_BATTLE_FIELD_PATH
    parentFileSha256: string
    successorFileSha256: string
    removed: BattleFieldDef[]
    removedDigest: string
    retainedIds: number[]
    retainedIdsDigest: string
  }
  successor: {
    contentVersion: 14
    minimumSaveVersion: 8
    manifestDigest: string
    manifestFileSha256: string
    surfaceDigest: string
  }
  digest: string
}

export interface B2BattleFieldDomainBuildResult {
  parentC1: MigrationSnapshot
  successor: MigrationSnapshot
  seal: B2BattleFieldDomainSealV1
  manifest: ManifestV14
}

function asJson(value: unknown): MigrationJson {
  return JSON.parse(JSON.stringify(value)) as MigrationJson
}

function cloneSnapshot(source: MigrationSnapshot): MigrationSnapshot {
  return {
    files: new Map([...source.files].map(([path, value]) => [path, structuredClone(value)])),
    managedFiles: new Set(source.managedFiles),
    ...(source.hashes ? { hashes: new Map(source.hashes) } : {}),
    ...(source.baselineMetadata
      ? { baselineMetadata: structuredClone(source.baselineMetadata) }
      : {}),
  }
}

function fileHash(value: MigrationJson, path: string): string {
  return sha256(serializeMigrationJson(value, path))
}

function requiredFile(snapshot: MigrationSnapshot, path: string): MigrationJson {
  const value = snapshot.files.get(path)
  if (value === undefined) throw new Error(`B2 battlefield transition: snapshot 缺 ${path}`)
  const actual = fileHash(value, path)
  const recorded = snapshot.hashes?.get(path)
  if (recorded !== undefined && recorded !== actual)
    throw new Error(`B2 battlefield transition: ${path} 正文与 recorded hash 不符`)
  return value
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`B2 battlefield transition: ${path} 期望对象`)
  return value as Record<string, unknown>
}

function exactKeys(value: Record<string, unknown>, allowed: readonly string[], path: string): void {
  const keys = new Set(allowed)
  for (const key of Object.keys(value))
    if (!keys.has(key)) throw new Error(`B2 battlefield transition: ${path}.${key} 未知字段`)
}

function assertSha(value: unknown, path: string): asserts value is string {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value))
    throw new Error(`B2 battlefield transition: ${path} 非 sha256`)
}

function manifestAuthority(manifest: ManifestV14, rawText: string): {
  manifestDigest: string
  manifestFileSha256: string
} {
  let parsed: unknown
  try {
    parsed = JSON.parse(rawText)
  } catch {
    throw new Error('B2 battlefield transition: manifest raw 非 JSON')
  }
  if (!isDeepStrictEqual(parsed, manifest))
    throw new Error('B2 battlefield transition: manifest raw/parsed 不一致')
  if (
    manifest.contentVersion !== 14 ||
    manifest.minimumSaveVersion !== CURRENT_PROJECT_MINIMUM_SAVE_VERSION
  )
    throw new Error('B2 battlefield transition: 只接受 content14/SAVE8')
  return {
    manifestDigest: stableJsonSha256(manifest),
    manifestFileSha256: sha256(rawText),
  }
}

function publicationSurfaceDigest(snapshot: MigrationSnapshot): string {
  const managed = [...snapshot.managedFiles]
    .filter((path) => path !== B2_BATTLE_FIELD_DOMAIN_SEAL_PATH)
    .sort(stableStringCompare)
    .map((path) => {
      const body = snapshot.files.get(path)
      const recorded = snapshot.hashes?.get(path)
      if (body !== undefined) {
        const actual = fileHash(body, path)
        if (recorded !== undefined && recorded !== actual)
          throw new Error(`B2 battlefield transition: publication surface hash 漂移 ${path}`)
        return { path, sha256: actual }
      }
      if (recorded === undefined)
        throw new Error(`B2 battlefield transition: managed atomic file 缺 hash ${path}`)
      return { path, sha256: recorded }
    })
  const transitions = Object.fromEntries(
    Object.entries(snapshot.baselineMetadata?.transitions ?? {})
      .filter(([id]) => id !== B2_BATTLE_FIELD_DOMAIN_TRANSITION_ID)
      .sort(([left], [right]) => stableStringCompare(left, right)),
  )
  return stableJsonSha256({
    generatorEpoch: snapshot.baselineMetadata?.generatorEpoch,
    transitions,
    managed,
  })
}

function sealBody(
  value: B2BattleFieldDomainSealV1,
): Omit<B2BattleFieldDomainSealV1, 'digest'> {
  const { digest: _digest, ...body } = value
  return body
}

function canonicalSourceFields(source: readonly BattleFieldDef[]): BattleFieldDef[] {
  const normalized = separateLegacyPalBattleFieldDomain(structuredClone(source))
  const fields = validateBattleFields(normalized)
  const expectedIds = Array.from({ length: 52 }, (_, index) => index + 6)
  if (!isDeepStrictEqual(fields.map(({ id }) => id), expectedIds))
    throw new Error('B2 battlefield transition: PAL 源规范化后必须恰为 ids 6..57')
  for (const field of fields) {
    const expected = `battle-background.pal.${String(field.id).padStart(3, '0')}`
    if (field.background !== expected)
      throw new Error(
        `B2 battlefield transition: field ${field.id} background 期望 ${expected}`,
      )
  }
  return fields
}

function parentFields(snapshot: MigrationSnapshot): BattleFieldDef[] {
  const fields = validateBattleFields(requiredFile(snapshot, PAL_B2_BATTLE_FIELD_PATH))
  const expectedIds = Array.from({ length: 58 }, (_, index) => index)
  if (!isDeepStrictEqual(fields.map(({ id }) => id), expectedIds))
    throw new Error('B2 battlefield transition: C1 parent 必须恰为旧 PAL ids 0..57')
  return fields
}

export function assertB2BattleFieldDomainSeal(
  value: B2BattleFieldDomainSealV1,
  label = 'B2 battlefield seal',
): void {
  exactKeys(
    record(value, label),
    ['kind', 'version', 'projectId', 'transitionId', 'methodVersion', 'parent', 'source', 'successor', 'digest'],
    label,
  )
  if (
    value.kind !== 'b2-battle-field-domain-transition' ||
    value.version !== 1 ||
    value.projectId !== 'pal' ||
    value.transitionId !== B2_BATTLE_FIELD_DOMAIN_TRANSITION_ID ||
    value.methodVersion !== B2_BATTLE_FIELD_DOMAIN_METHOD
  )
    throw new Error(`${label}: identity 漂移`)
  exactKeys(
    record(value.parent, `${label}.parent`),
    ['transitionId', 'sealDigest', 'surfaceDigest'],
    `${label}.parent`,
  )
  if (value.parent.transitionId !== C1_NPC_CURATION_TRANSITION_ID)
    throw new Error(`${label}: parent transition 漂移`)
  exactKeys(
    record(value.source, `${label}.source`),
    ['rawBattleFieldsDigest', 'path', 'parentFileSha256', 'successorFileSha256', 'removed', 'removedDigest', 'retainedIds', 'retainedIdsDigest'],
    `${label}.source`,
  )
  if (value.source.path !== PAL_B2_BATTLE_FIELD_PATH)
    throw new Error(`${label}: source path 漂移`)
  const removed = validateBattleFields(value.source.removed)
  if (!isDeepStrictEqual(removed.map(({ id }) => id), [0, 1, 2, 3, 4, 5]))
    throw new Error(`${label}: removed ids 漂移`)
  if (stableJsonSha256(removed) !== value.source.removedDigest)
    throw new Error(`${label}: removed digest 漂移`)
  const expectedRetained = Array.from({ length: 52 }, (_, index) => index + 6)
  if (!isDeepStrictEqual(value.source.retainedIds, expectedRetained))
    throw new Error(`${label}: retained ids 漂移`)
  if (stableJsonSha256(value.source.retainedIds) !== value.source.retainedIdsDigest)
    throw new Error(`${label}: retained ids digest 漂移`)
  exactKeys(
    record(value.successor, `${label}.successor`),
    ['contentVersion', 'minimumSaveVersion', 'manifestDigest', 'manifestFileSha256', 'surfaceDigest'],
    `${label}.successor`,
  )
  if (value.successor.contentVersion !== 14 || value.successor.minimumSaveVersion !== 8)
    throw new Error(`${label}: successor version 漂移`)
  for (const [path, digest] of Object.entries({
    parentSeal: value.parent.sealDigest,
    parentSurface: value.parent.surfaceDigest,
    rawBattleFields: value.source.rawBattleFieldsDigest,
    parentFile: value.source.parentFileSha256,
    successorFile: value.source.successorFileSha256,
    removed: value.source.removedDigest,
    retainedIds: value.source.retainedIdsDigest,
    manifest: value.successor.manifestDigest,
    manifestFile: value.successor.manifestFileSha256,
    successorSurface: value.successor.surfaceDigest,
    digest: value.digest,
  }))
    assertSha(digest, `${label}.${path}`)
  if (stableJsonSha256(sealBody(value)) !== value.digest)
    throw new Error(`${label}: self digest 漂移`)
}

function hasMarker(snapshot: MigrationSnapshot): boolean {
  return (
    snapshot.baselineMetadata?.transitions[B2_BATTLE_FIELD_DOMAIN_TRANSITION_ID] !== undefined ||
    snapshot.files.has(B2_BATTLE_FIELD_DOMAIN_SEAL_PATH) ||
    snapshot.managedFiles.has(B2_BATTLE_FIELD_DOMAIN_SEAL_PATH) ||
    snapshot.hashes?.has(B2_BATTLE_FIELD_DOMAIN_SEAL_PATH) === true
  )
}

function hasOwnedPayload(snapshot: MigrationSnapshot): boolean {
  const value = snapshot.files.get(PAL_B2_BATTLE_FIELD_PATH)
  return (
    Array.isArray(value) &&
    value.length === 52 &&
    value.every(
      (field, index) =>
        field &&
        typeof field === 'object' &&
        !Array.isArray(field) &&
        field.id === index + 6,
    )
  )
}

export function rewindPublishedB2BattleFieldDomainIfPresent(args: {
  source: MigrationSnapshot
  manifest: ManifestV14
  manifestRawText: string
}): MigrationSnapshot {
  if (!hasMarker(args.source)) {
    if (hasOwnedPayload(args.source))
      throw new Error('B2 battlefield rewind: 无 transition marker 但存在 52-field successor payload')
    return args.source
  }
  const manifestProof = manifestAuthority(args.manifest, args.manifestRawText)
  const metadataDigest =
    args.source.baselineMetadata?.transitions[B2_BATTLE_FIELD_DOMAIN_TRANSITION_ID]
  const raw = args.source.files.get(B2_BATTLE_FIELD_DOMAIN_SEAL_PATH)
  const recorded = args.source.hashes?.get(B2_BATTLE_FIELD_DOMAIN_SEAL_PATH)
  if (
    metadataDigest === undefined ||
    raw === undefined ||
    recorded === undefined ||
    !args.source.managedFiles.has(B2_BATTLE_FIELD_DOMAIN_SEAL_PATH)
  )
    throw new Error('B2 battlefield rewind: transition metadata/file/managed/hash 半状态')
  const seal = raw as unknown as B2BattleFieldDomainSealV1
  assertB2BattleFieldDomainSeal(seal, 'B2 battlefield rewind seal')
  if (metadataDigest !== seal.digest)
    throw new Error('B2 battlefield rewind: metadata digest 不符')
  if (fileHash(asJson(seal), B2_BATTLE_FIELD_DOMAIN_SEAL_PATH) !== recorded)
    throw new Error('B2 battlefield rewind: seal 文件 hash 不符')
  if (
    manifestProof.manifestDigest !== seal.successor.manifestDigest ||
    manifestProof.manifestFileSha256 !== seal.successor.manifestFileSha256
  )
    throw new Error('B2 battlefield rewind: manifest authority 不符')
  if (publicationSurfaceDigest(args.source) !== seal.successor.surfaceDigest)
    throw new Error('B2 battlefield rewind: successor surface 漂移')
  const successorFile = requiredFile(args.source, PAL_B2_BATTLE_FIELD_PATH)
  if (fileHash(successorFile, PAL_B2_BATTLE_FIELD_PATH) !== seal.source.successorFileSha256)
    throw new Error('B2 battlefield rewind: successor battle-fields 漂移')
  const successorFields = validateBattleFields(successorFile)
  if (!isDeepStrictEqual(successorFields.map(({ id }) => id), seal.source.retainedIds))
    throw new Error('B2 battlefield rewind: successor ids 漂移')

  const parent = cloneSnapshot(args.source)
  const restored = [...structuredClone(seal.source.removed), ...structuredClone(successorFields)]
  validateBattleFields(restored)
  const restoredJson = asJson(restored)
  if (fileHash(restoredJson, PAL_B2_BATTLE_FIELD_PATH) !== seal.source.parentFileSha256)
    throw new Error('B2 battlefield rewind: parent battle-fields hash 漂移')
  parent.files.set(PAL_B2_BATTLE_FIELD_PATH, restoredJson)
  parent.hashes?.set(
    PAL_B2_BATTLE_FIELD_PATH,
    fileHash(restoredJson, PAL_B2_BATTLE_FIELD_PATH),
  )
  parent.files.delete(B2_BATTLE_FIELD_DOMAIN_SEAL_PATH)
  parent.managedFiles.delete(B2_BATTLE_FIELD_DOMAIN_SEAL_PATH)
  parent.hashes?.delete(B2_BATTLE_FIELD_DOMAIN_SEAL_PATH)
  if (parent.baselineMetadata)
    delete parent.baselineMetadata.transitions[B2_BATTLE_FIELD_DOMAIN_TRANSITION_ID]
  if (publicationSurfaceDigest(parent) !== seal.parent.surfaceDigest)
    throw new Error('B2 battlefield rewind: parent surface 漂移')
  if (parent.baselineMetadata?.transitions[C1_NPC_CURATION_TRANSITION_ID] !== seal.parent.sealDigest)
    throw new Error('B2 battlefield rewind: C1-3 parent seal digest 不符')
  void rewindPublishedC1NpcCurationIfPresent({
    source: parent,
    manifest: args.manifest,
    manifestRawText: args.manifestRawText,
  })
  return parent
}

export function rewindPublishedB2BattleFieldProjectAgainstPublishedBaseline(args: {
  project: MigrationSnapshot
  publishedBaseline: MigrationSnapshot
  manifest: ManifestV14
  manifestRawText: string
}): MigrationSnapshot {
  if (!hasMarker(args.publishedBaseline)) {
    if (hasMarker(args.project) || hasOwnedPayload(args.project))
      throw new Error('B2 battlefield project rewind: orphan marker/payload')
    return args.project
  }
  void rewindPublishedB2BattleFieldDomainIfPresent({
    source: args.publishedBaseline,
    manifest: args.manifest,
    manifestRawText: args.manifestRawText,
  })
  const baselineRaw = args.publishedBaseline.files.get(B2_BATTLE_FIELD_DOMAIN_SEAL_PATH)
  const baselineHash = args.publishedBaseline.hashes?.get(B2_BATTLE_FIELD_DOMAIN_SEAL_PATH)
  const projectRaw = args.project.files.get(B2_BATTLE_FIELD_DOMAIN_SEAL_PATH)
  const projectHash = args.project.hashes?.get(B2_BATTLE_FIELD_DOMAIN_SEAL_PATH)
  if (baselineRaw === undefined || baselineHash === undefined)
    throw new Error('B2 battlefield project rewind: published seal 四态不完整')
  if (
    projectRaw === undefined ||
    projectHash === undefined ||
    !args.project.managedFiles.has(B2_BATTLE_FIELD_DOMAIN_SEAL_PATH)
  )
    throw new Error('B2 battlefield project rewind: project seal 四态不完整')
  if (!isDeepStrictEqual(projectRaw, baselineRaw) || projectHash !== baselineHash)
    throw new Error('B2 battlefield project rewind: project seal 与 published authority 不符')
  if (fileHash(asJson(projectRaw), B2_BATTLE_FIELD_DOMAIN_SEAL_PATH) !== projectHash)
    throw new Error('B2 battlefield project rewind: project seal hash 不符')
  if (args.project.baselineMetadata?.transitions[B2_BATTLE_FIELD_DOMAIN_TRANSITION_ID] !== undefined)
    throw new Error('B2 battlefield project rewind: project 不得携 baseline metadata')

  const seal = baselineRaw as unknown as B2BattleFieldDomainSealV1
  const projectFields = validateBattleFields(requiredFile(args.project, PAL_B2_BATTLE_FIELD_PATH))
  if (projectFields.some(({ id }) => id >= 0 && id <= 5))
    throw new Error('B2 battlefield project rewind: authored id 0..5 与历史 PAL 占位冲突')
  const restored = [...structuredClone(seal.source.removed), ...structuredClone(projectFields)]
  validateBattleFields(restored)
  const parent = cloneSnapshot(args.project)
  const restoredJson = asJson(restored)
  parent.files.set(PAL_B2_BATTLE_FIELD_PATH, restoredJson)
  parent.hashes?.set(
    PAL_B2_BATTLE_FIELD_PATH,
    fileHash(restoredJson, PAL_B2_BATTLE_FIELD_PATH),
  )
  parent.files.delete(B2_BATTLE_FIELD_DOMAIN_SEAL_PATH)
  parent.managedFiles.delete(B2_BATTLE_FIELD_DOMAIN_SEAL_PATH)
  parent.hashes?.delete(B2_BATTLE_FIELD_DOMAIN_SEAL_PATH)
  return parent
}

function snapshotEqual(left: MigrationSnapshot, right: MigrationSnapshot): boolean {
  const leftFiles = [...left.files].sort(([a], [b]) => stableStringCompare(a, b))
  const rightFiles = [...right.files].sort(([a], [b]) => stableStringCompare(a, b))
  return (
    isDeepStrictEqual(leftFiles, rightFiles) &&
    isDeepStrictEqual(
      [...left.managedFiles].sort(stableStringCompare),
      [...right.managedFiles].sort(stableStringCompare),
    ) &&
    isDeepStrictEqual(
      [...(left.hashes ?? new Map())].sort(([a], [b]) => stableStringCompare(a, b)),
      [...(right.hashes ?? new Map())].sort(([a], [b]) => stableStringCompare(a, b)),
    ) &&
    isDeepStrictEqual(left.baselineMetadata, right.baselineMetadata)
  )
}

export function buildPalB2BattleFieldDomainMigration(args: {
  baseline: MigrationSnapshot
  manifest: ManifestV14
  manifestRawText: string
  sourceBattleFields: readonly BattleFieldDef[]
}): B2BattleFieldDomainBuildResult {
  const manifestProof = manifestAuthority(args.manifest, args.manifestRawText)
  const parentC1 = rewindPublishedB2BattleFieldDomainIfPresent({
    source: args.baseline,
    manifest: args.manifest,
    manifestRawText: args.manifestRawText,
  })
  const c1Digest = parentC1.baselineMetadata?.transitions[C1_NPC_CURATION_TRANSITION_ID]
  if (!c1Digest) throw new Error('B2 battlefield build: parent 缺 C1-3 authority')
  void rewindPublishedC1NpcCurationIfPresent({
    source: parentC1,
    manifest: args.manifest,
    manifestRawText: args.manifestRawText,
  })

  const rawBattleFieldsDigest = stableJsonSha256(args.sourceBattleFields)
  const canonical = canonicalSourceFields(args.sourceBattleFields)
  const parent = parentFields(parentC1)
  const projectedParent = separateLegacyPalBattleFieldDomain(parent)
  if (!isDeepStrictEqual(projectedParent, canonical))
    throw new Error('B2 battlefield build: C1 parent 与 extracted PAL 规范化结果不一致')

  const successor = cloneSnapshot(parentC1)
  const successorJson = asJson(canonical)
  successor.files.set(PAL_B2_BATTLE_FIELD_PATH, successorJson)
  successor.hashes?.set(
    PAL_B2_BATTLE_FIELD_PATH,
    fileHash(successorJson, PAL_B2_BATTLE_FIELD_PATH),
  )
  const removed = structuredClone(parent.slice(0, 6))
  const retainedIds = canonical.map(({ id }) => id)
  const body: Omit<B2BattleFieldDomainSealV1, 'digest'> = {
    kind: 'b2-battle-field-domain-transition',
    version: 1,
    projectId: 'pal',
    transitionId: B2_BATTLE_FIELD_DOMAIN_TRANSITION_ID,
    methodVersion: B2_BATTLE_FIELD_DOMAIN_METHOD,
    parent: {
      transitionId: C1_NPC_CURATION_TRANSITION_ID,
      sealDigest: c1Digest,
      surfaceDigest: publicationSurfaceDigest(parentC1),
    },
    source: {
      rawBattleFieldsDigest,
      path: PAL_B2_BATTLE_FIELD_PATH,
      parentFileSha256: fileHash(requiredFile(parentC1, PAL_B2_BATTLE_FIELD_PATH), PAL_B2_BATTLE_FIELD_PATH),
      successorFileSha256: fileHash(successorJson, PAL_B2_BATTLE_FIELD_PATH),
      removed,
      removedDigest: stableJsonSha256(removed),
      retainedIds,
      retainedIdsDigest: stableJsonSha256(retainedIds),
    },
    successor: {
      contentVersion: 14,
      minimumSaveVersion: 8,
      ...manifestProof,
      surfaceDigest: publicationSurfaceDigest(successor),
    },
  }
  const seal = { ...body, digest: stableJsonSha256(body) }
  assertB2BattleFieldDomainSeal(seal, 'B2 battlefield build seal')
  successor.files.set(B2_BATTLE_FIELD_DOMAIN_SEAL_PATH, asJson(seal))
  successor.managedFiles.add(B2_BATTLE_FIELD_DOMAIN_SEAL_PATH)
  successor.hashes?.set(
    B2_BATTLE_FIELD_DOMAIN_SEAL_PATH,
    fileHash(asJson(seal), B2_BATTLE_FIELD_DOMAIN_SEAL_PATH),
  )
  if (!successor.baselineMetadata)
    throw new Error('B2 battlefield build: baseline metadata 缺失')
  successor.baselineMetadata.transitions[B2_BATTLE_FIELD_DOMAIN_TRANSITION_ID] = seal.digest

  const rewound = rewindPublishedB2BattleFieldDomainIfPresent({
    source: successor,
    manifest: args.manifest,
    manifestRawText: args.manifestRawText,
  })
  if (!snapshotEqual(rewound, parentC1))
    throw new Error('B2 battlefield build: install→rewind 非 byte-exact parent')
  return {
    parentC1,
    successor,
    seal,
    manifest: structuredClone(args.manifest),
  }
}
