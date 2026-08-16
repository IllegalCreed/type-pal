import { isDeepStrictEqual } from 'node:util'
import {
  checkDialogueIdentityV14,
  CURRENT_PROJECT_MINIMUM_SAVE_VERSION,
  type ActorDef,
  type DialogueIdentityV14,
  type ManifestV14,
  validateActors,
} from '@type-pal/content'
import { stableJsonSha256, stableStringCompare } from './experimental/script-v5/stable-json.js'
import {
  type MigrationSnapshot,
  serializeMigrationJson,
  sha256,
} from './migration-baseline.js'
import { C1_DIALOGUE_IDENTITY_TRANSITION_ID, rewindPublishedC1DialogueIdentityIfPresent } from './pal-c1-dialogue-identity.js'
import {
  projectPreparedC1NpcCuration,
  type C1NpcDecisionApprovalV1,
} from './pal-c1-npc-curation-ledger.js'
import {
  buildPalC1NpcFirstBatchAuthority,
  PAL_C1_NPC_FIRST_BATCH_APPROVED_CONTENT_DIGEST,
} from './pal-c1-npc-first-batch.js'
import type { MigrationJson } from './pal-migration.js'
import type { SourceCmd } from './source-facts.js'

export const C1_NPC_CURATION_TRANSITION_ID = 'c1-npc-curation-v1' as const
export const C1_NPC_CURATION_SEAL_PATH = '_transitions/c1-npc-curation-v1.json' as const
export const C1_NPC_CURATION_METHOD = 'pal-c1-npc-curation-transition-v1' as const

interface C1NpcActorAddEditV1 {
  kind: 'actor-add'
  candidateId: string
  actorId: string
  successor: ActorDef
  successorSha256: string
}

interface C1NpcLocaleAddEditV1 {
  kind: 'locale-add'
  candidateId: string
  key: string
  successor: string
  successorSha256: string
}

interface C1NpcEntityEditV1 {
  kind: 'entity-ref'
  candidateId: string
  pointer: string
  parentRef: { kind: 'sprite'; value: string }
  successorRef: { kind: 'actor'; value: string }
  parentLeafSha256: string
  successorLeafSha256: string
}

interface C1NpcDialogueEditV1 {
  kind: 'dialogue-identity'
  candidateId: string
  pointer: string
  identityPointer: string
  parentIdentity: Extract<DialogueIdentityV14, { kind: 'unbound' }>
  successorIdentity: Extract<DialogueIdentityV14, { kind: 'actor' }>
  parentCueSha256: string
  successorCueSha256: string
  parentIdentitySha256: string
  successorIdentitySha256: string
}

type C1NpcFileEditV1 =
  | C1NpcActorAddEditV1
  | C1NpcLocaleAddEditV1
  | C1NpcEntityEditV1
  | C1NpcDialogueEditV1

interface C1NpcFileSealV1 {
  path: string
  parentSha256: string
  successorSha256: string
  edits: C1NpcFileEditV1[]
  editsDigest: string
}

export interface C1NpcCurationTransitionSealV1 {
  kind: 'c1-npc-curation-transition'
  version: 1
  projectId: 'pal'
  transitionId: typeof C1_NPC_CURATION_TRANSITION_ID
  methodVersion: typeof C1_NPC_CURATION_METHOD
  parent: {
    transitionId: typeof C1_DIALOGUE_IDENTITY_TRANSITION_ID
    sealDigest: string
    surfaceDigest: string
  }
  authority: {
    candidateReportDigest: string
    sourceEvidenceDigest: string
    sourceFileSha256: string
    decisionContentDigest: string
    decisionLedgerDigest: string
    approval: C1NpcDecisionApprovalV1
  }
  source: {
    files: C1NpcFileSealV1[]
    filesDigest: string
    summary: {
      actors: 2
      entitySites: 6
      dialogueSites: 163
      accepted: 169
      deferred: 7842
      rejected: 0
    }
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

export interface C1NpcCurationBuildResult {
  parentC1: MigrationSnapshot
  successor: MigrationSnapshot
  seal: C1NpcCurationTransitionSealV1
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
  if (value === undefined) throw new Error(`C1-3 transition: snapshot 缺 ${path}`)
  const actual = fileHash(value, path)
  const recorded = snapshot.hashes?.get(path)
  if (recorded !== undefined && recorded !== actual)
    throw new Error(`C1-3 transition: ${path} 正文与 recorded hash 不符`)
  return value
}

function decodePointer(value: string): string[] {
  if (!value.startsWith('/')) throw new Error(`C1-3 transition: JSON pointer 非法 ${value}`)
  return value
    .slice(1)
    .split('/')
    .map((token) => token.replace(/~1/g, '/').replace(/~0/g, '~'))
}

function leafAt(root: MigrationJson, pointer: string): unknown {
  let current: unknown = root
  for (const token of decodePointer(pointer)) {
    if (Array.isArray(current)) {
      const index = Number(token)
      if (!Number.isSafeInteger(index) || index < 0 || index >= current.length)
        throw new Error(`C1-3 transition: pointer 数组越界 ${pointer}`)
      current = current[index]
    } else if (current && typeof current === 'object')
      current = (current as Record<string, unknown>)[token]
    else throw new Error(`C1-3 transition: pointer 不可解析 ${pointer}`)
  }
  return current
}

function replaceLeaf(root: MigrationJson, pointer: string, successor: unknown): void {
  const tokens = decodePointer(pointer)
  if (!tokens.length) throw new Error('C1-3 transition: 不允许替换文件根')
  let parent: unknown = root
  for (const token of tokens.slice(0, -1)) {
    if (Array.isArray(parent)) parent = parent[Number(token)]
    else if (parent && typeof parent === 'object') parent = (parent as Record<string, unknown>)[token]
    else throw new Error(`C1-3 transition: pointer parent 不可解析 ${pointer}`)
  }
  const key = tokens.at(-1)!
  if (Array.isArray(parent)) parent[Number(key)] = successor
  else if (parent && typeof parent === 'object') (parent as Record<string, unknown>)[key] = successor
  else throw new Error(`C1-3 transition: pointer parent 非容器 ${pointer}`)
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`C1-3 transition: ${path} 期望对象`)
  return value as Record<string, unknown>
}

function exactKeys(value: Record<string, unknown>, allowed: readonly string[], path: string): void {
  const keys = new Set(allowed)
  for (const key of Object.keys(value))
    if (!keys.has(key)) throw new Error(`C1-3 transition: ${path}.${key} 未知字段`)
}

function assertSha(value: unknown, path: string): asserts value is string {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value))
    throw new Error(`C1-3 transition: ${path} 非 sha256`)
}

function manifestAuthority(manifest: ManifestV14, rawText: string): {
  manifestDigest: string
  manifestFileSha256: string
} {
  let parsed: unknown
  try {
    parsed = JSON.parse(rawText)
  } catch {
    throw new Error('C1-3 transition: manifest raw 非 JSON')
  }
  if (!isDeepStrictEqual(parsed, manifest))
    throw new Error('C1-3 transition: manifest raw/parsed 不一致')
  if (
    manifest.contentVersion !== 14 ||
    manifest.minimumSaveVersion !== CURRENT_PROJECT_MINIMUM_SAVE_VERSION
  )
    throw new Error('C1-3 transition: 只接受 content14/SAVE8')
  return {
    manifestDigest: stableJsonSha256(manifest),
    manifestFileSha256: sha256(rawText),
  }
}

function publicationSurfaceDigest(snapshot: MigrationSnapshot): string {
  const managed = [...snapshot.managedFiles]
    .filter((path) => path !== C1_NPC_CURATION_SEAL_PATH)
    .sort(stableStringCompare)
    .map((path) => {
      const body = snapshot.files.get(path)
      const recorded = snapshot.hashes?.get(path)
      if (body !== undefined) {
        const actual = fileHash(body, path)
        if (recorded !== undefined && recorded !== actual)
          throw new Error(`C1-3 transition: publication surface hash 漂移 ${path}`)
        return { path, sha256: actual }
      }
      if (recorded === undefined)
        throw new Error(`C1-3 transition: managed atomic file 缺 hash ${path}`)
      return { path, sha256: recorded }
    })
  const transitions = Object.fromEntries(
    Object.entries(snapshot.baselineMetadata?.transitions ?? {})
      .filter(([id]) => id !== C1_NPC_CURATION_TRANSITION_ID)
      .sort(([left], [right]) => stableStringCompare(left, right)),
  )
  return stableJsonSha256({
    generatorEpoch: snapshot.baselineMetadata?.generatorEpoch,
    transitions,
    managed,
  })
}

function sealBody(
  value: C1NpcCurationTransitionSealV1,
): Omit<C1NpcCurationTransitionSealV1, 'digest'> {
  const { digest: _digest, ...body } = value
  return body
}

function compareEdit(left: C1NpcFileEditV1, right: C1NpcFileEditV1): number {
  const leftPath = 'pointer' in left ? left.pointer : left.kind === 'actor-add' ? left.actorId : left.key
  const rightPath = 'pointer' in right ? right.pointer : right.kind === 'actor-add' ? right.actorId : right.key
  return stableStringCompare(leftPath, rightPath) || stableStringCompare(left.candidateId, right.candidateId)
}

export function assertC1NpcCurationSeal(
  value: C1NpcCurationTransitionSealV1,
  label = 'C1-3 seal',
): void {
  const top = record(value, label)
  exactKeys(
    top,
    ['kind', 'version', 'projectId', 'transitionId', 'methodVersion', 'parent', 'authority', 'source', 'successor', 'digest'],
    label,
  )
  if (
    value.kind !== 'c1-npc-curation-transition' ||
    value.version !== 1 ||
    value.projectId !== 'pal' ||
    value.transitionId !== C1_NPC_CURATION_TRANSITION_ID ||
    value.methodVersion !== C1_NPC_CURATION_METHOD
  )
    throw new Error(`${label}: identity 漂移`)
  exactKeys(record(value.parent, `${label}.parent`), ['transitionId', 'sealDigest', 'surfaceDigest'], `${label}.parent`)
  if (value.parent.transitionId !== C1_DIALOGUE_IDENTITY_TRANSITION_ID)
    throw new Error(`${label}: parent transition 漂移`)
  exactKeys(
    record(value.authority, `${label}.authority`),
    ['candidateReportDigest', 'sourceEvidenceDigest', 'sourceFileSha256', 'decisionContentDigest', 'decisionLedgerDigest', 'approval'],
    `${label}.authority`,
  )
  exactKeys(record(value.authority.approval, `${label}.approval`), ['approver', 'approvedAt', 'ledgerDigest'], `${label}.approval`)
  if (
    value.authority.approval.approver !== 'user' ||
    value.authority.approval.ledgerDigest !== value.authority.decisionContentDigest ||
    value.authority.decisionContentDigest !== PAL_C1_NPC_FIRST_BATCH_APPROVED_CONTENT_DIGEST ||
    new Date(value.authority.approval.approvedAt).toISOString() !== value.authority.approval.approvedAt
  )
    throw new Error(`${label}: 用户批准记录漂移`)
  exactKeys(record(value.source, `${label}.source`), ['files', 'filesDigest', 'summary'], `${label}.source`)
  exactKeys(record(value.source.summary, `${label}.summary`), ['actors', 'entitySites', 'dialogueSites', 'accepted', 'deferred', 'rejected'], `${label}.summary`)
  if (!isDeepStrictEqual(value.source.summary, { actors: 2, entitySites: 6, dialogueSites: 163, accepted: 169, deferred: 7842, rejected: 0 }))
    throw new Error(`${label}: PAL summary 漂移`)
  const paths = value.source.files.map((entry) => entry.path)
  if (
    new Set(paths).size !== paths.length ||
    !isDeepStrictEqual(paths, [...paths].sort(stableStringCompare))
  )
    throw new Error(`${label}: files 未规范排序或重复`)
  const candidateIds: string[] = []
  let actorEdits = 0
  let localeEdits = 0
  let entityEdits = 0
  let dialogueEdits = 0
  for (const file of value.source.files) {
    exactKeys(record(file, `${label}.${file.path}`), ['path', 'parentSha256', 'successorSha256', 'edits', 'editsDigest'], `${label}.${file.path}`)
    assertSha(file.parentSha256, `${label}.${file.path}.parentSha256`)
    assertSha(file.successorSha256, `${label}.${file.path}.successorSha256`)
    assertSha(file.editsDigest, `${label}.${file.path}.editsDigest`)
    if (stableJsonSha256(file.edits) !== file.editsDigest)
      throw new Error(`${label}: edits digest 漂移 ${file.path}`)
    if (!isDeepStrictEqual(file.edits, [...file.edits].sort(compareEdit)))
      throw new Error(`${label}: edits 未规范排序 ${file.path}`)
    for (const edit of file.edits) {
      candidateIds.push(edit.candidateId)
      assertSha(edit.candidateId, `${label}.candidateId`)
      if (edit.kind === 'actor-add') {
        actorEdits += 1
        exactKeys(record(edit, 'actor edit'), ['kind', 'candidateId', 'actorId', 'successor', 'successorSha256'], 'actor edit')
        if (edit.actorId !== edit.successor.id) throw new Error(`${label}: actor id 漂移`)
        validateActors([edit.successor])
        assertSha(edit.successorSha256, `${label}.actor.successorSha256`)
        if (stableJsonSha256(edit.successor) !== edit.successorSha256)
          throw new Error(`${label}: actor payload 漂移`)
      } else if (edit.kind === 'locale-add') {
        localeEdits += 1
        exactKeys(record(edit, 'locale edit'), ['kind', 'candidateId', 'key', 'successor', 'successorSha256'], 'locale edit')
        if (!edit.key || !edit.successor || stableJsonSha256(edit.successor) !== edit.successorSha256)
          throw new Error(`${label}: locale edit 漂移`)
      } else if (edit.kind === 'entity-ref') {
        entityEdits += 1
        exactKeys(record(edit, 'entity edit'), ['kind', 'candidateId', 'pointer', 'parentRef', 'successorRef', 'parentLeafSha256', 'successorLeafSha256'], 'entity edit')
        exactKeys(record(edit.parentRef, 'entity parent ref'), ['kind', 'value'], 'entity parent ref')
        exactKeys(record(edit.successorRef, 'entity successor ref'), ['kind', 'value'], 'entity successor ref')
        if (
          !edit.pointer.startsWith('/') ||
          edit.parentRef.kind !== 'sprite' ||
          !edit.parentRef.value ||
          edit.successorRef.kind !== 'actor' ||
          !edit.successorRef.value
        )
          throw new Error(`${label}: entity ref 漂移`)
        assertSha(edit.parentLeafSha256, `${label}.entity.parentLeafSha256`)
        assertSha(edit.successorLeafSha256, `${label}.entity.successorLeafSha256`)
      } else {
        dialogueEdits += 1
        exactKeys(record(edit, 'dialogue edit'), ['kind', 'candidateId', 'pointer', 'identityPointer', 'parentIdentity', 'successorIdentity', 'parentCueSha256', 'successorCueSha256', 'parentIdentitySha256', 'successorIdentitySha256'], 'dialogue edit')
        checkDialogueIdentityV14(edit.parentIdentity, 'C1-3 parent identity')
        checkDialogueIdentityV14(edit.successorIdentity, 'C1-3 successor identity')
        if (
          !edit.pointer.startsWith('/') ||
          edit.identityPointer !== `${edit.pointer}/identity` ||
          edit.parentIdentity.kind !== 'unbound' ||
          edit.successorIdentity.kind !== 'actor'
        )
          throw new Error(`${label}: dialogue identity kind 漂移`)
        for (const digest of [edit.parentCueSha256, edit.successorCueSha256, edit.parentIdentitySha256, edit.successorIdentitySha256])
          assertSha(digest, `${label}.dialogue digest`)
        if (
          stableJsonSha256(edit.parentIdentity) !== edit.parentIdentitySha256 ||
          stableJsonSha256(edit.successorIdentity) !== edit.successorIdentitySha256
        )
          throw new Error(`${label}: dialogue identity payload 漂移`)
      }
    }
  }
  if (new Set(candidateIds).size !== candidateIds.length)
    throw new Error(`${label}: candidate edit 重复`)
  if (actorEdits !== 2 || localeEdits !== 2 || entityEdits !== 6 || dialogueEdits !== 163)
    throw new Error(`${label}: edit census 漂移`)
  if (stableJsonSha256(value.source.files) !== value.source.filesDigest)
    throw new Error(`${label}: filesDigest 漂移`)
  exactKeys(record(value.successor, `${label}.successor`), ['contentVersion', 'minimumSaveVersion', 'manifestDigest', 'manifestFileSha256', 'surfaceDigest'], `${label}.successor`)
  if (value.successor.contentVersion !== 14 || value.successor.minimumSaveVersion !== 8)
    throw new Error(`${label}: successor version 漂移`)
  for (const digest of [
    value.parent.sealDigest,
    value.parent.surfaceDigest,
    value.authority.candidateReportDigest,
    value.authority.sourceEvidenceDigest,
    value.authority.sourceFileSha256,
    value.authority.decisionContentDigest,
    value.authority.decisionLedgerDigest,
    value.source.filesDigest,
    value.successor.manifestDigest,
    value.successor.manifestFileSha256,
    value.successor.surfaceDigest,
    value.digest,
  ])
    assertSha(digest, `${label}.digest`)
  if (stableJsonSha256(sealBody(value)) !== value.digest)
    throw new Error(`${label}: self digest 漂移`)
}

function hasMarker(snapshot: MigrationSnapshot): boolean {
  return (
    snapshot.baselineMetadata?.transitions[C1_NPC_CURATION_TRANSITION_ID] !== undefined ||
    snapshot.files.has(C1_NPC_CURATION_SEAL_PATH) ||
    snapshot.managedFiles.has(C1_NPC_CURATION_SEAL_PATH) ||
    snapshot.hashes?.has(C1_NPC_CURATION_SEAL_PATH) === true
  )
}

function hasOwnedPayload(snapshot: MigrationSnapshot): boolean {
  const actors = snapshot.files.get('content/actors.json')
  return (
    Array.isArray(actors) &&
    actors.some(
      (actor) =>
        actor &&
        typeof actor === 'object' &&
        !Array.isArray(actor) &&
        (actor.id === 'li-daniang' || actor.id === 'jiu-jianxian'),
    )
  )
}

function replaceEntityRef(
  file: MigrationJson,
  edit: C1NpcEntityEditV1,
  from: C1NpcEntityEditV1['successorRef'],
  to: C1NpcEntityEditV1['parentRef'],
): void {
  const leaf = record(leafAt(file, edit.pointer), edit.pointer)
  if (leaf[from.kind] !== from.value || to.kind in leaf || 'zone' in leaf)
    throw new Error(`C1-3 rewind: entity ref 漂移 ${edit.pointer}`)
  const replacement = Object.fromEntries(
    Object.entries(leaf).map(([key, value]) =>
      key === from.kind ? [to.kind, to.value] : [key, value],
    ),
  )
  replaceLeaf(file, edit.pointer, replacement)
}

function applyRewindEdits(snapshot: MigrationSnapshot, seal: C1NpcCurationTransitionSealV1, baseline: boolean): void {
  for (const fileSeal of seal.source.files) {
    const file = requiredFile(snapshot, fileSeal.path)
    if (baseline && fileHash(file, fileSeal.path) !== fileSeal.successorSha256)
      throw new Error(`C1-3 rewind: successor file 漂移 ${fileSeal.path}`)
    for (const edit of [...fileSeal.edits].reverse()) {
      if (edit.kind === 'actor-add') {
        if (!Array.isArray(file)) throw new Error('C1-3 rewind: actors 非数组')
        const index = file.findIndex(
          (actor) => actor && typeof actor === 'object' && !Array.isArray(actor) && actor.id === edit.actorId,
        )
        if (index < 0 || stableJsonSha256(file[index]) !== edit.successorSha256)
          throw new Error(`C1-3 rewind: Actor 漂移 ${edit.actorId}`)
        file.splice(index, 1)
      } else if (edit.kind === 'locale-add') {
        const locale = record(file, fileSeal.path)
        if (locale[edit.key] !== edit.successor)
          throw new Error(`C1-3 rewind: locale 漂移 ${edit.key}`)
        delete locale[edit.key]
      } else if (edit.kind === 'entity-ref') {
        replaceEntityRef(file, edit, edit.successorRef, edit.parentRef)
      } else {
        const current = leafAt(file, edit.identityPointer)
        if (!isDeepStrictEqual(current, edit.successorIdentity))
          throw new Error(`C1-3 rewind: dialogue identity 漂移 ${edit.identityPointer}`)
        replaceLeaf(file, edit.identityPointer, structuredClone(edit.parentIdentity))
      }
    }
    const rewoundHash = fileHash(file, fileSeal.path)
    if (baseline && rewoundHash !== fileSeal.parentSha256)
      throw new Error(`C1-3 rewind: parent file hash 漂移 ${fileSeal.path}`)
    snapshot.hashes?.set(fileSeal.path, rewoundHash)
  }
}

export function rewindPublishedC1NpcCurationIfPresent(args: {
  source: MigrationSnapshot
  manifest: ManifestV14
  manifestRawText: string
}): MigrationSnapshot {
  if (!hasMarker(args.source)) {
    if (hasOwnedPayload(args.source))
      throw new Error('C1-3 rewind: 无 transition marker 但存在 C1-3 owned Actor')
    return args.source
  }
  const manifestProof = manifestAuthority(args.manifest, args.manifestRawText)
  const metadataDigest = args.source.baselineMetadata?.transitions[C1_NPC_CURATION_TRANSITION_ID]
  const raw = args.source.files.get(C1_NPC_CURATION_SEAL_PATH)
  const recorded = args.source.hashes?.get(C1_NPC_CURATION_SEAL_PATH)
  if (
    metadataDigest === undefined ||
    raw === undefined ||
    recorded === undefined ||
    !args.source.managedFiles.has(C1_NPC_CURATION_SEAL_PATH)
  )
    throw new Error('C1-3 rewind: transition metadata/file/managed/hash 半状态')
  const seal = raw as unknown as C1NpcCurationTransitionSealV1
  assertC1NpcCurationSeal(seal, 'C1-3 rewind seal')
  if (metadataDigest !== seal.digest) throw new Error('C1-3 rewind: metadata digest 不符')
  if (fileHash(asJson(seal), C1_NPC_CURATION_SEAL_PATH) !== recorded)
    throw new Error('C1-3 rewind: seal 文件 hash 不符')
  if (
    manifestProof.manifestDigest !== seal.successor.manifestDigest ||
    manifestProof.manifestFileSha256 !== seal.successor.manifestFileSha256
  )
    throw new Error('C1-3 rewind: manifest authority 不符')
  if (publicationSurfaceDigest(args.source) !== seal.successor.surfaceDigest)
    throw new Error('C1-3 rewind: successor surface 漂移')
  const parent = cloneSnapshot(args.source)
  applyRewindEdits(parent, seal, true)
  parent.files.delete(C1_NPC_CURATION_SEAL_PATH)
  parent.managedFiles.delete(C1_NPC_CURATION_SEAL_PATH)
  parent.hashes?.delete(C1_NPC_CURATION_SEAL_PATH)
  if (parent.baselineMetadata)
    delete parent.baselineMetadata.transitions[C1_NPC_CURATION_TRANSITION_ID]
  if (publicationSurfaceDigest(parent) !== seal.parent.surfaceDigest)
    throw new Error('C1-3 rewind: parent surface 漂移')
  void rewindPublishedC1DialogueIdentityIfPresent(parent, args.manifest)
  if (parent.baselineMetadata?.transitions[C1_DIALOGUE_IDENTITY_TRANSITION_ID] !== seal.parent.sealDigest)
    throw new Error('C1-3 rewind: C1-2 parent seal digest 不符')
  return parent
}

export function rewindPublishedC1NpcProjectAgainstPublishedBaseline(args: {
  project: MigrationSnapshot
  publishedBaseline: MigrationSnapshot
  manifest: ManifestV14
  manifestRawText: string
}): MigrationSnapshot {
  if (!hasMarker(args.publishedBaseline)) {
    if (hasMarker(args.project) || hasOwnedPayload(args.project))
      throw new Error('C1-3 project rewind: orphan marker/payload')
    return args.project
  }
  void rewindPublishedC1NpcCurationIfPresent({
    source: args.publishedBaseline,
    manifest: args.manifest,
    manifestRawText: args.manifestRawText,
  })
  const baselineRaw = args.publishedBaseline.files.get(C1_NPC_CURATION_SEAL_PATH)
  const baselineHash = args.publishedBaseline.hashes?.get(C1_NPC_CURATION_SEAL_PATH)
  const projectRaw = args.project.files.get(C1_NPC_CURATION_SEAL_PATH)
  const projectHash = args.project.hashes?.get(C1_NPC_CURATION_SEAL_PATH)
  if (baselineRaw === undefined || baselineHash === undefined)
    throw new Error('C1-3 project rewind: published seal 四态不完整')
  if (
    projectRaw === undefined ||
    projectHash === undefined ||
    !args.project.managedFiles.has(C1_NPC_CURATION_SEAL_PATH)
  )
    throw new Error('C1-3 project rewind: project seal 四态不完整')
  if (!isDeepStrictEqual(projectRaw, baselineRaw) || projectHash !== baselineHash)
    throw new Error('C1-3 project rewind: project seal 与 published authority 不符')
  if (fileHash(asJson(projectRaw), C1_NPC_CURATION_SEAL_PATH) !== projectHash)
    throw new Error('C1-3 project rewind: project seal hash 不符')
  if (args.project.baselineMetadata?.transitions[C1_NPC_CURATION_TRANSITION_ID] !== undefined)
    throw new Error('C1-3 project rewind: project 不得携 baseline metadata')
  const parent = cloneSnapshot(args.project)
  applyRewindEdits(parent, baselineRaw as unknown as C1NpcCurationTransitionSealV1, false)
  parent.files.delete(C1_NPC_CURATION_SEAL_PATH)
  parent.managedFiles.delete(C1_NPC_CURATION_SEAL_PATH)
  parent.hashes?.delete(C1_NPC_CURATION_SEAL_PATH)
  return parent
}

function snapshotEqual(left: MigrationSnapshot, right: MigrationSnapshot): boolean {
  const leftFiles = [...left.files].sort(([a], [b]) => stableStringCompare(a, b))
  const rightFiles = [...right.files].sort(([a], [b]) => stableStringCompare(a, b))
  return (
    isDeepStrictEqual(leftFiles, rightFiles) &&
    isDeepStrictEqual([...left.managedFiles].sort(stableStringCompare), [...right.managedFiles].sort(stableStringCompare)) &&
    isDeepStrictEqual([...(left.hashes ?? new Map())].sort(([a], [b]) => stableStringCompare(a, b)), [...(right.hashes ?? new Map())].sort(([a], [b]) => stableStringCompare(a, b))) &&
    isDeepStrictEqual(left.baselineMetadata, right.baselineMetadata)
  )
}

export function buildPalC1NpcCurationMigration(args: {
  baseline: MigrationSnapshot
  manifest: ManifestV14
  manifestRawText: string
  sourceCommands: readonly SourceCmd[]
  sourceFileSha256: string
}): C1NpcCurationBuildResult {
  const manifestProof = manifestAuthority(args.manifest, args.manifestRawText)
  const parentC1 = rewindPublishedC1NpcCurationIfPresent({
    source: args.baseline,
    manifest: args.manifest,
    manifestRawText: args.manifestRawText,
  })
  const c1Digest = parentC1.baselineMetadata?.transitions[C1_DIALOGUE_IDENTITY_TRANSITION_ID]
  if (!c1Digest) throw new Error('C1-3 build: parent 缺 C1-2 authority')
  void rewindPublishedC1DialogueIdentityIfPresent(parentC1, args.manifest)
  const approved = buildPalC1NpcFirstBatchAuthority({
    parentC1,
    sourceCommands: args.sourceCommands,
    sourceFileSha256: args.sourceFileSha256,
  })
  const existingActors = new Set(validateActors(requiredFile(parentC1, 'content/actors.json')).map((actor) => actor.id))
  for (const actor of approved.ledger.actors)
    if (existingActors.has(actor.actor.id))
      throw new Error(`C1-3 build: Actor 已存在 ${actor.actor.id}`)
  const projection = projectPreparedC1NpcCuration(parentC1, approved.authority)
  const successor = projection.snapshot
  const reportSites = new Map(approved.report.sites.map((site) => [site.id, site]))
  const editsByFile = new Map<string, C1NpcFileEditV1[]>()
  const addEdit = (path: string, edit: C1NpcFileEditV1): void => {
    const current = editsByFile.get(path)
    if (current) current.push(edit)
    else editsByFile.set(path, [edit])
  }
  for (const actor of approved.ledger.actors) {
    addEdit('content/actors.json', {
      kind: 'actor-add',
      candidateId: stableJsonSha256({ kind: 'actor-add', actorId: actor.actor.id }),
      actorId: actor.actor.id,
      successor: structuredClone(actor.actor),
      successorSha256: stableJsonSha256(actor.actor),
    })
    for (const locale of actor.locale)
      addEdit('content/locale.json', {
        kind: 'locale-add',
        candidateId: stableJsonSha256({ kind: 'locale-add', key: locale.key }),
        key: locale.key,
        successor: locale.successor,
        successorSha256: stableJsonSha256(locale.successor),
      })
    for (const decision of actor.entitySites) {
      const site = reportSites.get(decision.candidateId)
      if (!site || site.kind !== 'entity') throw new Error('C1-3 build: entity site 漂移')
      addEdit(site.file, {
        kind: 'entity-ref',
        candidateId: site.id,
        pointer: site.pointer,
        parentRef: { kind: 'sprite', value: site.spriteId },
        successorRef: { kind: 'actor', value: actor.actor.id },
        parentLeafSha256: stableJsonSha256(leafAt(requiredFile(parentC1, site.file), site.pointer)),
        successorLeafSha256: stableJsonSha256(leafAt(requiredFile(successor, site.file), site.pointer)),
      })
    }
    for (const decision of actor.dialogueSites) {
      const site = reportSites.get(decision.candidateId)
      if (!site || site.kind !== 'dialogue') throw new Error('C1-3 build: dialogue site 漂移')
      const parentIdentity = leafAt(requiredFile(parentC1, site.file), site.identityPointer)
      const successorIdentity = leafAt(requiredFile(successor, site.file), site.identityPointer)
      if (!parentIdentity || typeof parentIdentity !== 'object' || !successorIdentity || typeof successorIdentity !== 'object')
        throw new Error(`C1-3 build: dialogue identity 非对象 ${site.identityPointer}`)
      addEdit(site.file, {
        kind: 'dialogue-identity',
        candidateId: site.id,
        pointer: site.pointer,
        identityPointer: site.identityPointer,
        parentIdentity: structuredClone(parentIdentity) as C1NpcDialogueEditV1['parentIdentity'],
        successorIdentity: structuredClone(successorIdentity) as C1NpcDialogueEditV1['successorIdentity'],
        parentCueSha256: stableJsonSha256(leafAt(requiredFile(parentC1, site.file), site.pointer)),
        successorCueSha256: stableJsonSha256(leafAt(requiredFile(successor, site.file), site.pointer)),
        parentIdentitySha256: stableJsonSha256(parentIdentity),
        successorIdentitySha256: stableJsonSha256(successorIdentity),
      })
    }
  }
  const expectedPaths = [...editsByFile.keys()].sort(stableStringCompare)
  if (!isDeepStrictEqual(expectedPaths, projection.changedFiles))
    throw new Error('C1-3 build: projection changed files 与 decision edits 不闭合')
  const files = expectedPaths.map((path): C1NpcFileSealV1 => {
    const edits = editsByFile.get(path)!.sort(compareEdit)
    return {
      path,
      parentSha256: fileHash(requiredFile(parentC1, path), path),
      successorSha256: fileHash(requiredFile(successor, path), path),
      edits,
      editsDigest: stableJsonSha256(edits),
    }
  })
  const body: Omit<C1NpcCurationTransitionSealV1, 'digest'> = {
    kind: 'c1-npc-curation-transition',
    version: 1,
    projectId: 'pal',
    transitionId: C1_NPC_CURATION_TRANSITION_ID,
    methodVersion: C1_NPC_CURATION_METHOD,
    parent: {
      transitionId: C1_DIALOGUE_IDENTITY_TRANSITION_ID,
      sealDigest: c1Digest,
      surfaceDigest: publicationSurfaceDigest(parentC1),
    },
    authority: {
      candidateReportDigest: approved.report.digest,
      sourceEvidenceDigest: approved.evidence.digest,
      sourceFileSha256: approved.evidence.sourceFileSha256,
      decisionContentDigest: approved.ledger.contentDigest,
      decisionLedgerDigest: approved.ledger.digest,
      approval: structuredClone(approved.ledger.approval),
    },
    source: {
      files,
      filesDigest: stableJsonSha256(files),
      summary: { actors: 2, entitySites: 6, dialogueSites: 163, accepted: 169, deferred: 7842, rejected: 0 },
    },
    successor: {
      contentVersion: 14,
      minimumSaveVersion: 8,
      ...manifestProof,
      surfaceDigest: publicationSurfaceDigest(successor),
    },
  }
  const seal = { ...body, digest: stableJsonSha256(body) }
  assertC1NpcCurationSeal(seal, 'C1-3 build seal')
  successor.files.set(C1_NPC_CURATION_SEAL_PATH, asJson(seal))
  successor.managedFiles.add(C1_NPC_CURATION_SEAL_PATH)
  successor.hashes?.set(
    C1_NPC_CURATION_SEAL_PATH,
    fileHash(asJson(seal), C1_NPC_CURATION_SEAL_PATH),
  )
  if (!successor.baselineMetadata) throw new Error('C1-3 build: baseline metadata 缺失')
  successor.baselineMetadata.transitions[C1_NPC_CURATION_TRANSITION_ID] = seal.digest
  const rewound = rewindPublishedC1NpcCurationIfPresent({
    source: successor,
    manifest: args.manifest,
    manifestRawText: args.manifestRawText,
  })
  if (!snapshotEqual(rewound, parentC1))
    throw new Error('C1-3 build: install→rewind 非 byte-exact parent')
  return { parentC1, successor, seal, manifest: structuredClone(args.manifest) }
}
