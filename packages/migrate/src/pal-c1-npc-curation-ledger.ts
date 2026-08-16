import { isDeepStrictEqual } from 'node:util'
import {
  checkDialogueIdentityV14,
  resolveDialogueIdentityV14,
  validateActors,
  type ActorDef,
  type DialogueIdentityV14,
} from '@type-pal/content'
import { stableJsonSha256, stableStringCompare } from './experimental/script-v5/stable-json.js'
import {
  type MigrationSnapshot,
  serializeMigrationJson,
  sha256,
} from './migration-baseline.js'
import {
  assertC1NpcCandidateReport,
  type C1NpcCandidateReportV1,
  type C1NpcCandidateSiteV1,
  type C1NpcDialogueCandidateSiteV1,
  type C1NpcEntityCandidateSiteV1,
} from './pal-c1-npc-candidate-report.js'
import {
  assertPreparedC1NpcSourceEvidence,
  type C1NpcDialogueSourceSequenceV1,
  type PreparedC1NpcSourceEvidence,
} from './pal-c1-npc-source-evidence.js'
import type { MigrationJson } from './pal-migration.js'

export const C1_NPC_CURATION_LEDGER_METHOD = 'pal-c1-npc-curation-ledger-v1' as const

export type C1NpcActorDecisionMode =
  | 'actor-only'
  | 'entity-sites'
  | 'dialogue-sites'
  | 'entity-and-dialogue-sites'

export interface C1NpcLocaleDecisionV1 {
  key: string
  parent: string | null
  successor: string
}

export interface C1NpcEntitySourceLocatorV1 {
  sceneId: string
  eventObjectId: number
}

export interface C1NpcEntitySiteDecisionV1 {
  candidateId: string
  source: C1NpcEntitySourceLocatorV1
}

export interface C1NpcDialogueSiteDecisionV1 {
  candidateId: string
  source: C1NpcDialogueSourceSequenceV1
  successorIdentity: Extract<DialogueIdentityV14, { kind: 'actor' }>
}

export interface C1NpcActorDecisionV1 {
  mode: C1NpcActorDecisionMode
  actor: ActorDef
  locale: C1NpcLocaleDecisionV1[]
  entitySites: C1NpcEntitySiteDecisionV1[]
  dialogueSites: C1NpcDialogueSiteDecisionV1[]
}

export interface C1NpcRejectedCandidateV1 {
  candidateId: string
  reason: string
}

export interface C1NpcCandidateClosureV1 {
  total: number
  accepted: { count: number; digest: string }
  rejected: { count: number; digest: string }
  deferred: { count: number; digest: string }
}

interface C1NpcDecisionLedgerContentV1 {
  kind: 'pal-c1-npc-curation-ledger'
  version: 1
  projectId: 'pal'
  methodVersion: typeof C1_NPC_CURATION_LEDGER_METHOD
  batchId: string
  parent: { candidateReportDigest: string; sourceEvidenceDigest: string; c1SealDigest: string }
  actors: C1NpcActorDecisionV1[]
  rejected: C1NpcRejectedCandidateV1[]
  candidateClosure: C1NpcCandidateClosureV1
}

export interface C1NpcDecisionLedgerDraftV1 extends C1NpcDecisionLedgerContentV1 {
  contentDigest: string
}

export interface C1NpcDecisionApprovalV1 {
  approver: 'user'
  approvedAt: string
  ledgerDigest: string
}

export interface C1NpcDecisionLedgerV1 extends C1NpcDecisionLedgerDraftV1 {
  approval: C1NpcDecisionApprovalV1
  digest: string
}

export interface PreparedC1NpcDecisionAuthority {
  readonly report: C1NpcCandidateReportV1
  readonly ledger: C1NpcDecisionLedgerV1
  readonly sourceEvidence: PreparedC1NpcSourceEvidence
}

export interface C1NpcProjectionResult {
  snapshot: MigrationSnapshot
  changedFiles: string[]
  authorityDigest: string
}

const preparedAuthorities = new WeakMap<
  object,
  { reportDigest: string; sourceEvidenceDigest: string; ledgerDigest: string; contentDigest: string }
>()

function record(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`C1-3 ledger: ${path} 期望对象`)
  return value as Record<string, unknown>
}

function exactKeys(value: Record<string, unknown>, allowed: readonly string[], path: string): void {
  const keys = new Set(allowed)
  for (const key of Object.keys(value))
    if (!keys.has(key)) throw new Error(`C1-3 ledger: ${path}.${key} 未知字段`)
}

function string(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim().length === 0 || value !== value.trim())
    throw new Error(`C1-3 ledger: ${path} 期望非空且无首尾空格 string`)
  return value
}

function sha(value: unknown, path: string): string {
  const result = string(value, path)
  if (!/^[a-f0-9]{64}$/.test(result)) throw new Error(`C1-3 ledger: ${path} 非 sha256`)
  return result
}

function safeInt(value: unknown, path: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0)
    throw new Error(`C1-3 ledger: ${path} 期望非负 safe integer`)
  return value as number
}

function sortedUnique(values: readonly string[], path: string): void {
  if (
    new Set(values).size !== values.length ||
    !isDeepStrictEqual(values, [...values].sort(stableStringCompare))
  )
    throw new Error(`C1-3 ledger: ${path} 未规范排序或重复`)
}

function modeFor(decision: Pick<C1NpcActorDecisionV1, 'entitySites' | 'dialogueSites'>): C1NpcActorDecisionMode {
  if (decision.entitySites.length && decision.dialogueSites.length)
    return 'entity-and-dialogue-sites'
  if (decision.entitySites.length) return 'entity-sites'
  if (decision.dialogueSites.length) return 'dialogue-sites'
  return 'actor-only'
}

function contentBody(
  value: C1NpcDecisionLedgerDraftV1 | C1NpcDecisionLedgerV1,
): C1NpcDecisionLedgerContentV1 {
  const {
    contentDigest: _contentDigest,
    ...withPossibleApproval
  } = value
  const { approval: _approval, digest: _digest, ...body } = withPossibleApproval as typeof withPossibleApproval & {
    approval?: C1NpcDecisionApprovalV1
    digest?: string
  }
  return body
}

function ledgerBody(value: C1NpcDecisionLedgerV1): Omit<C1NpcDecisionLedgerV1, 'digest'> {
  const { digest: _digest, ...body } = value
  return body
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child)
  return Object.freeze(value)
}

function assertLocaleDecision(value: C1NpcLocaleDecisionV1, path: string): void {
  const item = record(value, path)
  exactKeys(item, ['key', 'parent', 'successor'], path)
  string(item.key, `${path}.key`)
  if (item.parent !== null) string(item.parent, `${path}.parent`)
  string(item.successor, `${path}.successor`)
}

function assertEntitySite(value: C1NpcEntitySiteDecisionV1, path: string): void {
  const item = record(value, path)
  exactKeys(item, ['candidateId', 'source'], path)
  sha(item.candidateId, `${path}.candidateId`)
  const source = record(item.source, `${path}.source`)
  exactKeys(source, ['sceneId', 'eventObjectId'], `${path}.source`)
  string(source.sceneId, `${path}.source.sceneId`)
  safeInt(source.eventObjectId, `${path}.source.eventObjectId`)
}

function assertDialogueSite(value: C1NpcDialogueSiteDecisionV1, path: string): void {
  const item = record(value, path)
  exactKeys(item, ['candidateId', 'source', 'successorIdentity'], path)
  sha(item.candidateId, `${path}.candidateId`)
  const source = record(item.source, `${path}.source`)
  exactKeys(source, ['kind', 'rows', 'rowsDigest'], `${path}.source`)
  if (source.kind !== 'pal-dialogue-message-sequence' || !Array.isArray(source.rows) || !source.rows.length)
    throw new Error(`C1-3 ledger: ${path}.source 非 dialogue message sequence`)
  source.rows.forEach((rawRow, index) => {
    const row = record(rawRow, `${path}.source.rows[${index}]`)
    exactKeys(
      row,
      ['textId', 'localeTextSha256', 'messageIndex', 'sourceAddress', 'sourceCommandSha256'],
      `${path}.source.rows[${index}]`,
    )
    string(row.textId, `${path}.source.rows[${index}].textId`)
    sha(row.localeTextSha256, `${path}.source.rows[${index}].localeTextSha256`)
    safeInt(row.messageIndex, `${path}.source.rows[${index}].messageIndex`)
    safeInt(row.sourceAddress, `${path}.source.rows[${index}].sourceAddress`)
    sha(row.sourceCommandSha256, `${path}.source.rows[${index}].sourceCommandSha256`)
  })
  sha(source.rowsDigest, `${path}.source.rowsDigest`)
  if (stableJsonSha256(source.rows) !== source.rowsDigest)
    throw new Error(`C1-3 ledger: ${path}.source.rowsDigest 不符`)
  checkDialogueIdentityV14(item.successorIdentity, `${path}.successorIdentity`)
  if (item.successorIdentity.kind !== 'actor')
    throw new Error(`C1-3 ledger: ${path}.successorIdentity 必须是 actor`)
}

function assertActorDecision(value: C1NpcActorDecisionV1, path: string): void {
  const item = record(value, path)
  exactKeys(item, ['mode', 'actor', 'locale', 'entitySites', 'dialogueSites'], path)
  if (
    item.mode !== 'actor-only' &&
    item.mode !== 'entity-sites' &&
    item.mode !== 'dialogue-sites' &&
    item.mode !== 'entity-and-dialogue-sites'
  )
    throw new Error(`C1-3 ledger: ${path}.mode 非法`)
  validateActors([item.actor])
  if (!Array.isArray(item.locale) || !Array.isArray(item.entitySites) || !Array.isArray(item.dialogueSites))
    throw new Error(`C1-3 ledger: ${path} site/locale 期望数组`)
  item.locale.forEach((entry, index) => assertLocaleDecision(entry as C1NpcLocaleDecisionV1, `${path}.locale[${index}]`))
  item.entitySites.forEach((entry, index) => assertEntitySite(entry as C1NpcEntitySiteDecisionV1, `${path}.entitySites[${index}]`))
  item.dialogueSites.forEach((entry, index) => assertDialogueSite(entry as C1NpcDialogueSiteDecisionV1, `${path}.dialogueSites[${index}]`))
  const decision = value
  if (decision.mode !== modeFor(decision))
    throw new Error(`C1-3 ledger: ${path}.mode 与 site 集不符`)
  sortedUnique(decision.locale.map((entry) => entry.key), `${path}.locale`)
  sortedUnique(decision.entitySites.map((entry) => entry.candidateId), `${path}.entitySites`)
  sortedUnique(decision.dialogueSites.map((entry) => entry.candidateId), `${path}.dialogueSites`)
  for (const site of decision.dialogueSites)
    if (site.successorIdentity.actor !== decision.actor.id)
      throw new Error(`C1-3 ledger: ${path} dialogue actor 与 decision actor 不符`)
}

function assertClosure(value: C1NpcCandidateClosureV1, path: string): void {
  const closure = record(value, path)
  exactKeys(closure, ['total', 'accepted', 'rejected', 'deferred'], path)
  safeInt(closure.total, `${path}.total`)
  for (const key of ['accepted', 'rejected', 'deferred'] as const) {
    const group = record(closure[key], `${path}.${key}`)
    exactKeys(group, ['count', 'digest'], `${path}.${key}`)
    safeInt(group.count, `${path}.${key}.count`)
    sha(group.digest, `${path}.${key}.digest`)
  }
  if (
    value.accepted.count + value.rejected.count + value.deferred.count !== value.total
  )
    throw new Error(`C1-3 ledger: ${path} candidate universe 未闭合`)
}

function assertDraft(value: C1NpcDecisionLedgerDraftV1): void {
  const ledger = record(value, 'ledger')
  exactKeys(
    ledger,
    [
      'kind',
      'version',
      'projectId',
      'methodVersion',
      'batchId',
      'parent',
      'actors',
      'rejected',
      'candidateClosure',
      'contentDigest',
    ],
    'ledger',
  )
  if (
    ledger.kind !== 'pal-c1-npc-curation-ledger' ||
    ledger.version !== 1 ||
    ledger.projectId !== 'pal' ||
    ledger.methodVersion !== C1_NPC_CURATION_LEDGER_METHOD
  )
    throw new Error('C1-3 ledger: identity 漂移')
  string(ledger.batchId, 'ledger.batchId')
  const parent = record(ledger.parent, 'ledger.parent')
  exactKeys(
    parent,
    ['candidateReportDigest', 'sourceEvidenceDigest', 'c1SealDigest'],
    'ledger.parent',
  )
  sha(parent.candidateReportDigest, 'ledger.parent.candidateReportDigest')
  sha(parent.sourceEvidenceDigest, 'ledger.parent.sourceEvidenceDigest')
  sha(parent.c1SealDigest, 'ledger.parent.c1SealDigest')
  if (!Array.isArray(ledger.actors) || ledger.actors.length < 1 || ledger.actors.length > 8)
    throw new Error('C1-3 ledger: 第一批 actors 必须为 1–8')
  ledger.actors.forEach((entry, index) => assertActorDecision(entry as C1NpcActorDecisionV1, `ledger.actors[${index}]`))
  const actorIds = value.actors.map((entry) => entry.actor.id)
  sortedUnique(actorIds, 'ledger.actors')
  if (!Array.isArray(ledger.rejected)) throw new Error('C1-3 ledger: rejected 期望数组')
  ledger.rejected.forEach((entry, index) => {
    const item = record(entry, `ledger.rejected[${index}]`)
    exactKeys(item, ['candidateId', 'reason'], `ledger.rejected[${index}]`)
    sha(item.candidateId, `ledger.rejected[${index}].candidateId`)
    string(item.reason, `ledger.rejected[${index}].reason`)
  })
  sortedUnique(value.rejected.map((entry) => entry.candidateId), 'ledger.rejected')
  assertClosure(value.candidateClosure, 'ledger.candidateClosure')
  sha(value.contentDigest, 'ledger.contentDigest')
  if (stableJsonSha256(contentBody(value)) !== value.contentDigest)
    throw new Error('C1-3 ledger: content digest 不符')
}

export function assertC1NpcDecisionLedger(value: C1NpcDecisionLedgerV1): void {
  const ledger = record(value, 'ledger')
  exactKeys(
    ledger,
    [
      'kind',
      'version',
      'projectId',
      'methodVersion',
      'batchId',
      'parent',
      'actors',
      'rejected',
      'candidateClosure',
      'contentDigest',
      'approval',
      'digest',
    ],
    'ledger',
  )
  const { approval: _approval, digest: _digest, ...draft } = value
  assertDraft(draft)
  const approval = record(value.approval, 'ledger.approval')
  exactKeys(approval, ['approver', 'approvedAt', 'ledgerDigest'], 'ledger.approval')
  if (approval.approver !== 'user') throw new Error('C1-3 ledger: approval.approver 必须为 user')
  const approvedAt = string(approval.approvedAt, 'ledger.approval.approvedAt')
  if (new Date(approvedAt).toISOString() !== approvedAt)
    throw new Error('C1-3 ledger: approval.approvedAt 必须为规范 ISO 时间')
  sha(approval.ledgerDigest, 'ledger.approval.ledgerDigest')
  if (value.approval.ledgerDigest !== value.contentDigest)
    throw new Error('C1-3 ledger: 用户批准 digest 与当前 ledger 不符')
  sha(value.digest, 'ledger.digest')
  if (stableJsonSha256(ledgerBody(value)) !== value.digest)
    throw new Error('C1-3 ledger: self digest 不符')
}

function acceptedCandidateIds(actors: readonly C1NpcActorDecisionV1[]): string[] {
  return actors
    .flatMap((decision) => [
      ...decision.entitySites.map((site) => site.candidateId),
      ...decision.dialogueSites.map((site) => site.candidateId),
    ])
    .sort(stableStringCompare)
}

function closureFor(
  report: C1NpcCandidateReportV1,
  actors: readonly C1NpcActorDecisionV1[],
  rejected: readonly C1NpcRejectedCandidateV1[],
): C1NpcCandidateClosureV1 {
  const universe = report.sites.map((site) => site.id).sort(stableStringCompare)
  const accepted = acceptedCandidateIds(actors)
  const rejectedIds = rejected.map((entry) => entry.candidateId).sort(stableStringCompare)
  sortedUnique(accepted, 'accepted candidate ids')
  sortedUnique(rejectedIds, 'rejected candidate ids')
  const universeSet = new Set(universe)
  for (const id of [...accepted, ...rejectedIds])
    if (!universeSet.has(id)) throw new Error(`C1-3 ledger: candidate 不在 report ${id}`)
  const rejectedSet = new Set(rejectedIds)
  if (accepted.some((id) => rejectedSet.has(id)))
    throw new Error('C1-3 ledger: candidate 同时 accepted 与 rejected')
  const decided = new Set([...accepted, ...rejectedIds])
  const deferred = universe.filter((id) => !decided.has(id))
  return {
    total: universe.length,
    accepted: { count: accepted.length, digest: stableJsonSha256(accepted) },
    rejected: { count: rejectedIds.length, digest: stableJsonSha256(rejectedIds) },
    deferred: { count: deferred.length, digest: stableJsonSha256(deferred) },
  }
}

export function buildC1NpcDecisionLedgerDraft(args: {
  report: C1NpcCandidateReportV1
  sourceEvidence: PreparedC1NpcSourceEvidence
  batchId: string
  actors: C1NpcActorDecisionV1[]
  rejected?: C1NpcRejectedCandidateV1[]
}): C1NpcDecisionLedgerDraftV1 {
  assertC1NpcCandidateReport(args.report)
  assertPreparedC1NpcSourceEvidence(args.sourceEvidence, args.report.digest)
  const actors = cloneJson(args.actors).sort((left, right) =>
    stableStringCompare(left.actor.id, right.actor.id),
  )
  for (const actor of actors) {
    actor.locale.sort((left, right) => stableStringCompare(left.key, right.key))
    actor.entitySites.sort((left, right) =>
      stableStringCompare(left.candidateId, right.candidateId),
    )
    actor.dialogueSites.sort((left, right) =>
      stableStringCompare(left.candidateId, right.candidateId),
    )
  }
  const rejected = cloneJson(args.rejected ?? []).sort((left, right) =>
    stableStringCompare(left.candidateId, right.candidateId),
  )
  const body: C1NpcDecisionLedgerContentV1 = {
    kind: 'pal-c1-npc-curation-ledger',
    version: 1,
    projectId: 'pal',
    methodVersion: C1_NPC_CURATION_LEDGER_METHOD,
    batchId: string(args.batchId, 'batchId'),
    parent: {
      candidateReportDigest: args.report.digest,
      sourceEvidenceDigest: args.sourceEvidence.evidence.digest,
      c1SealDigest: args.report.source.c1SealDigest,
    },
    actors,
    rejected,
    candidateClosure: closureFor(args.report, actors, rejected),
  }
  const draft = { ...body, contentDigest: stableJsonSha256(body) }
  assertDraft(draft)
  return draft
}

export function attachC1NpcDecisionApproval(args: {
  draft: C1NpcDecisionLedgerDraftV1
  approvedLedgerDigest: string
  approvedAt: string
}): C1NpcDecisionLedgerV1 {
  assertDraft(args.draft)
  if (args.approvedLedgerDigest !== args.draft.contentDigest)
    throw new Error('C1-3 ledger: 用户批准的是其他 ledger digest')
  const approval: C1NpcDecisionApprovalV1 = {
    approver: 'user',
    approvedAt: args.approvedAt,
    ledgerDigest: args.approvedLedgerDigest,
  }
  const body = { ...cloneJson(args.draft), approval }
  const ledger = { ...body, digest: stableJsonSha256(body) }
  assertC1NpcDecisionLedger(ledger)
  return ledger
}

function localeRecord(value: MigrationJson, path: string): Record<string, string> {
  const raw = record(value, path)
  for (const [key, entry] of Object.entries(raw))
    if (typeof entry !== 'string') throw new Error(`C1-3 ledger: ${path}.${key} 非 string`)
  return raw as Record<string, string>
}

function speakerText(locale: Readonly<Record<string, string>>, key: string | undefined): string | undefined {
  if (key === undefined) return undefined
  const value = locale[key]
  if (value === undefined) throw new Error(`C1-3 ledger: locale 缺 ${key}`)
  return value
}

function siteMap(report: C1NpcCandidateReportV1): Map<string, C1NpcCandidateSiteV1> {
  return new Map(report.sites.map((site) => [site.id, site]))
}

function assertEntityDecision(
  decision: C1NpcEntitySiteDecisionV1,
  site: C1NpcCandidateSiteV1 | undefined,
  actor: ActorDef,
): asserts site is C1NpcEntityCandidateSiteV1 {
  if (!site || site.kind !== 'entity')
    throw new Error(`C1-3 ledger: entity candidate 不存在 ${decision.candidateId}`)
  if (site.spriteId !== actor.spriteId)
    throw new Error(`C1-3 ledger: entity sprite 与 Actor.spriteId 不等 ${decision.candidateId}`)
  if (decision.source.sceneId !== site.sceneId)
    throw new Error(`C1-3 ledger: entity source scene 漂移 ${decision.candidateId}`)
  if (site.entityId !== `e${decision.source.eventObjectId}`)
    throw new Error(`C1-3 ledger: entity EventObject identity 漂移 ${decision.candidateId}`)
}

function assertDialogueDecision(
  decision: C1NpcDialogueSiteDecisionV1,
  site: C1NpcCandidateSiteV1 | undefined,
  parentActors: Readonly<Record<string, ActorDef>>,
  successorActors: Readonly<Record<string, ActorDef>>,
  parentLocale: Readonly<Record<string, string>>,
  successorLocale: Readonly<Record<string, string>>,
): asserts site is C1NpcDialogueCandidateSiteV1 {
  if (!site || site.kind !== 'dialogue')
    throw new Error(`C1-3 ledger: dialogue candidate 不存在 ${decision.candidateId}`)
  const before = resolveDialogueIdentityV14(site.identity, parentActors, `${site.file}#${site.pointer}`)
  const after = resolveDialogueIdentityV14(
    decision.successorIdentity,
    successorActors,
    `${site.file}#${site.pointer}`,
  )
  const visibleBefore = {
    ...(before.speaker !== undefined
      ? { speaker: speakerText(parentLocale, before.speaker) }
      : {}),
    ...(before.portrait !== undefined ? { portrait: before.portrait } : {}),
  }
  const visibleAfter = {
    ...(after.speaker !== undefined
      ? { speaker: speakerText(successorLocale, after.speaker) }
      : {}),
    ...(after.portrait !== undefined ? { portrait: after.portrait } : {}),
  }
  if (!isDeepStrictEqual(visibleBefore, visibleAfter))
    throw new Error(`C1-3 ledger: dialogue resolved speaker/portrait/side 漂移 ${decision.candidateId}`)
}

function requiredFile(snapshot: MigrationSnapshot, path: string): MigrationJson {
  const value = snapshot.files.get(path)
  if (value === undefined) throw new Error(`C1-3 ledger: snapshot 缺 ${path}`)
  const actual = sha256(serializeMigrationJson(value, path))
  const recorded = snapshot.hashes?.get(path)
  if (recorded !== undefined && recorded !== actual)
    throw new Error(`C1-3 ledger: ${path} 正文与 recorded hash 不符`)
  return value
}

function validateDecisionAgainstParent(args: {
  report: C1NpcCandidateReportV1
  sourceEvidence: PreparedC1NpcSourceEvidence
  decision: C1NpcDecisionLedgerDraftV1
  parent: MigrationSnapshot
}): void {
  assertC1NpcCandidateReport(args.report)
  assertPreparedC1NpcSourceEvidence(args.sourceEvidence, args.report.digest)
  if (
    args.decision.parent.candidateReportDigest !== args.report.digest ||
    args.decision.parent.sourceEvidenceDigest !== args.sourceEvidence.evidence.digest ||
    args.decision.parent.c1SealDigest !== args.report.source.c1SealDigest
  )
    throw new Error('C1-3 ledger: parent candidate/C1 authority 不符')
  if (
    args.parent.baselineMetadata?.transitions['c1-dialogue-identity-v1'] !==
    args.report.source.c1SealDigest
  )
    throw new Error('C1-3 ledger: parent 未携 exact C1-2 published authority')
  for (const [path, expected] of [
    ['content/scenes/index.json', args.report.source.sceneIndexSha256],
    ['content/actors.json', args.report.source.actorsSha256],
    ['content/locale.json', args.report.source.localeSha256],
    ['content/items.json', args.report.source.itemsSha256],
    ['content/shared-scripts.json', args.report.source.sharedScriptsSha256],
    ['content/enemies.json', args.report.source.enemiesSha256],
  ] as const) {
    const actual = sha256(serializeMigrationJson(requiredFile(args.parent, path), path))
    if (actual !== expected) throw new Error(`C1-3 ledger: report source 漂移 ${path}`)
  }
  const expectedClosure = closureFor(args.report, args.decision.actors, args.decision.rejected)
  if (!isDeepStrictEqual(expectedClosure, args.decision.candidateClosure))
    throw new Error('C1-3 ledger: candidate closure 漂移')

  const parentActorsList = validateActors(requiredFile(args.parent, 'content/actors.json'))
  const parentActors = Object.fromEntries(parentActorsList.map((actor) => [actor.id, actor]))
  const finalActorsList = cloneJson(parentActorsList)
  const actorIndex = new Map(finalActorsList.map((actor, index) => [actor.id, index]))
  for (const decision of args.decision.actors) {
    const index = actorIndex.get(decision.actor.id)
    if (index === undefined) {
      actorIndex.set(decision.actor.id, finalActorsList.length)
      finalActorsList.push(cloneJson(decision.actor))
    } else finalActorsList[index] = cloneJson(decision.actor)
  }
  validateActors(finalActorsList)
  const successorActors = Object.fromEntries(finalActorsList.map((actor) => [actor.id, actor]))
  const parentLocale = localeRecord(requiredFile(args.parent, 'content/locale.json'), 'content/locale.json')
  const successorLocale = { ...parentLocale }
  const localeKeys = new Set<string>()
  for (const decision of args.decision.actors) {
    for (const entry of decision.locale) {
      if (localeKeys.has(entry.key)) throw new Error(`C1-3 ledger: locale 重复写 ${entry.key}`)
      localeKeys.add(entry.key)
      const parentValue = parentLocale[entry.key] ?? null
      if (parentValue !== entry.parent)
        throw new Error(`C1-3 ledger: locale parent 漂移 ${entry.key}`)
      successorLocale[entry.key] = entry.successor
    }
    if (successorLocale[decision.actor.name] === undefined)
      throw new Error(`C1-3 ledger: Actor.name locale 缺 ${decision.actor.name}`)
  }

  const sites = siteMap(args.report)
  const sourceEntries = new Map(
    args.sourceEvidence.evidence.entries.map((entry) => [entry.candidateId, entry]),
  )
  for (const actor of args.decision.actors) {
    actor.entitySites.forEach((decision) => {
      const site = sites.get(decision.candidateId)
      assertEntityDecision(decision, site, actor.actor)
      const leaf = leafAt(requiredFile(args.parent, site.file), site.pointer)
      if (stableJsonSha256(leaf) !== site.leafSha256)
        throw new Error(`C1-3 ledger: entity canonical leaf 漂移 ${site.file}#${site.pointer}`)
    })
    actor.dialogueSites.forEach((decision) => {
      const site = sites.get(decision.candidateId)
      const sourceEntry = sourceEntries.get(decision.candidateId)
      if (!sourceEntry || !isDeepStrictEqual(sourceEntry.source, decision.source))
        throw new Error(`C1-3 ledger: dialogue source evidence 漂移 ${decision.candidateId}`)
      assertDialogueDecision(
        decision,
        site,
        parentActors,
        successorActors,
        parentLocale,
        successorLocale,
      )
      const leaf = leafAt(requiredFile(args.parent, site.file), site.pointer)
      if (stableJsonSha256(leaf) !== site.leafSha256)
        throw new Error(`C1-3 ledger: dialogue canonical leaf 漂移 ${site.file}#${site.pointer}`)
      const identity = leafAt(requiredFile(args.parent, site.file), site.identityPointer)
      if (stableJsonSha256(identity) !== site.identitySha256)
        throw new Error(`C1-3 ledger: dialogue identity leaf 漂移 ${site.file}#${site.identityPointer}`)
    })
  }
}

export function validateC1NpcDecisionDraftAgainstParent(args: {
  report: C1NpcCandidateReportV1
  sourceEvidence: PreparedC1NpcSourceEvidence
  draft: C1NpcDecisionLedgerDraftV1
  parent: MigrationSnapshot
}): void {
  assertDraft(args.draft)
  validateDecisionAgainstParent({
    report: args.report,
    sourceEvidence: args.sourceEvidence,
    decision: args.draft,
    parent: args.parent,
  })
}

export function prepareC1NpcDecisionAuthority(args: {
  report: C1NpcCandidateReportV1
  sourceEvidence: PreparedC1NpcSourceEvidence
  ledger: C1NpcDecisionLedgerV1
  parent: MigrationSnapshot
}): PreparedC1NpcDecisionAuthority {
  assertC1NpcDecisionLedger(args.ledger)
  validateDecisionAgainstParent({
    report: args.report,
    sourceEvidence: args.sourceEvidence,
    decision: args.ledger,
    parent: args.parent,
  })

  const prepared = deepFreeze({
    report: cloneJson(args.report),
    ledger: cloneJson(args.ledger),
    sourceEvidence: args.sourceEvidence,
  })
  preparedAuthorities.set(prepared, {
    reportDigest: args.report.digest,
    sourceEvidenceDigest: args.sourceEvidence.evidence.digest,
    ledgerDigest: args.ledger.digest,
    contentDigest: args.ledger.contentDigest,
  })
  return prepared
}

function assertPreparedAuthority(value: PreparedC1NpcDecisionAuthority): void {
  const expected = preparedAuthorities.get(value)
  if (!expected) throw new Error('C1-3 ledger: 未经 prepare 的 decision authority')
  assertC1NpcCandidateReport(value.report)
  assertPreparedC1NpcSourceEvidence(value.sourceEvidence, value.report.digest)
  assertC1NpcDecisionLedger(value.ledger)
  if (
    value.report.digest !== expected.reportDigest ||
    value.sourceEvidence.evidence.digest !== expected.sourceEvidenceDigest ||
    value.ledger.digest !== expected.ledgerDigest ||
    value.ledger.contentDigest !== expected.contentDigest
  )
    throw new Error('C1-3 ledger: prepared authority 漂移')
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

function decodePointer(value: string): string[] {
  if (!value.startsWith('/')) throw new Error(`C1-3 projector: JSON pointer 非法 ${value}`)
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
        throw new Error(`C1-3 projector: pointer 数组越界 ${pointer}`)
      current = current[index]
    } else if (current && typeof current === 'object')
      current = (current as Record<string, unknown>)[token]
    else throw new Error(`C1-3 projector: pointer 不可解析 ${pointer}`)
  }
  return current
}

function replaceLeaf(root: MigrationJson, pointer: string, successor: unknown): void {
  const tokens = decodePointer(pointer)
  if (!tokens.length) throw new Error('C1-3 projector: 不允许替换文件根')
  let parent: unknown = root
  for (const token of tokens.slice(0, -1)) {
    if (Array.isArray(parent)) parent = parent[Number(token)]
    else if (parent && typeof parent === 'object')
      parent = (parent as Record<string, unknown>)[token]
    else throw new Error(`C1-3 projector: pointer parent 不可解析 ${pointer}`)
  }
  const key = tokens.at(-1)!
  if (Array.isArray(parent)) parent[Number(key)] = successor
  else if (parent && typeof parent === 'object')
    (parent as Record<string, unknown>)[key] = successor
  else throw new Error(`C1-3 projector: pointer parent 非容器 ${pointer}`)
}

function setFile(snapshot: MigrationSnapshot, path: string, value: MigrationJson): void {
  snapshot.files.set(path, value)
  snapshot.managedFiles.add(path)
  snapshot.hashes?.set(path, sha256(serializeMigrationJson(value, path)))
}

export function projectPreparedC1NpcCuration(
  parent: MigrationSnapshot,
  authority: PreparedC1NpcDecisionAuthority,
): C1NpcProjectionResult {
  assertPreparedAuthority(authority)
  // Re-prepare against this exact parent before any clone/write. This closes stale parent reuse.
  prepareC1NpcDecisionAuthority({
    report: authority.report,
    sourceEvidence: authority.sourceEvidence,
    ledger: authority.ledger,
    parent,
  })
  const successor = cloneSnapshot(parent)
  const reportSites = siteMap(authority.report)
  const changed = new Set<string>()

  const actorPath = 'content/actors.json'
  const actors = validateActors(requiredFile(successor, actorPath)).map((actor) => cloneJson(actor))
  const actorIndex = new Map(actors.map((actor, index) => [actor.id, index]))
  for (const decision of authority.ledger.actors) {
    const index = actorIndex.get(decision.actor.id)
    if (index === undefined) {
      actorIndex.set(decision.actor.id, actors.length)
      actors.push(cloneJson(decision.actor))
    } else actors[index] = cloneJson(decision.actor)
  }
  validateActors(actors)
  const actorBefore = stableJsonSha256(requiredFile(parent, actorPath))
  if (stableJsonSha256(actors) !== actorBefore) {
    setFile(successor, actorPath, actors as unknown as MigrationJson)
    changed.add(actorPath)
  }

  const localePath = 'content/locale.json'
  const locale = { ...localeRecord(requiredFile(successor, localePath), localePath) }
  for (const decision of authority.ledger.actors)
    for (const entry of decision.locale) locale[entry.key] = entry.successor
  if (stableJsonSha256(locale) !== stableJsonSha256(requiredFile(parent, localePath))) {
    setFile(successor, localePath, locale as unknown as MigrationJson)
    changed.add(localePath)
  }

  for (const actor of authority.ledger.actors) {
    for (const decision of actor.entitySites) {
      const site = reportSites.get(decision.candidateId)
      assertEntityDecision(decision, site, actor.actor)
      const file = requiredFile(successor, site.file)
      const parentLeaf = leafAt(file, site.pointer)
      if (stableJsonSha256(parentLeaf) !== site.leafSha256)
        throw new Error(`C1-3 projector: entity parent leaf 漂移 ${site.file}#${site.pointer}`)
      const entity = record(parentLeaf, `${site.file}#${site.pointer}`)
      if (entity.sprite !== site.spriteId || 'actor' in entity || 'zone' in entity)
        throw new Error(`C1-3 projector: entity ref 漂移 ${site.file}#${site.pointer}`)
      const replacement = Object.fromEntries(
        Object.entries(entity).map(([key, value]) =>
          key === 'sprite' ? ['actor', actor.actor.id] : [key, value],
        ),
      )
      replaceLeaf(file, site.pointer, replacement)
      setFile(successor, site.file, file)
      changed.add(site.file)
    }
    for (const decision of actor.dialogueSites) {
      const site = reportSites.get(decision.candidateId)
      if (!site || site.kind !== 'dialogue')
        throw new Error(`C1-3 projector: dialogue candidate 不存在 ${decision.candidateId}`)
      const file = requiredFile(successor, site.file)
      const parentLeaf = leafAt(file, site.pointer)
      if (stableJsonSha256(parentLeaf) !== site.leafSha256)
        throw new Error(`C1-3 projector: dialogue parent leaf 漂移 ${site.file}#${site.pointer}`)
      replaceLeaf(file, site.identityPointer, cloneJson(decision.successorIdentity))
      setFile(successor, site.file, file)
      changed.add(site.file)
    }
  }

  return {
    snapshot: successor,
    changedFiles: [...changed].sort(stableStringCompare),
    authorityDigest: authority.ledger.digest,
  }
}
