import type { DialogueIdentityV14 } from '@type-pal/content'
import type { MigrationSnapshot } from './migration-baseline.js'
import {
  buildC1NpcCandidateReport,
  PAL_C1_NPC_CANDIDATE_CENSUS,
  type C1NpcCandidateGroupV1,
  type C1NpcCandidateReportV1,
  type C1NpcDialogueCandidateSiteV1,
} from './pal-c1-npc-candidate-report.js'
import {
  attachC1NpcDecisionApproval,
  buildC1NpcDecisionLedgerDraft,
  prepareC1NpcDecisionAuthority,
  validateC1NpcDecisionDraftAgainstParent,
  type C1NpcActorDecisionV1,
  type C1NpcDecisionLedgerDraftV1,
  type C1NpcDecisionLedgerV1,
  type C1NpcDialogueSiteDecisionV1,
  type PreparedC1NpcDecisionAuthority,
} from './pal-c1-npc-curation-ledger.js'
import {
  buildC1NpcSourceEvidence,
  prepareC1NpcSourceEvidence,
  type C1NpcSourceEvidenceV1,
  type PreparedC1NpcSourceEvidence,
} from './pal-c1-npc-source-evidence.js'
import type { MigrationJson } from './pal-migration.js'
import type { SourceCmd } from './source-facts.js'

export const PAL_C1_NPC_FIRST_BATCH_ID = 'pal-npc-first-batch-li-daniang-jiu-jianxian' as const
export const PAL_C1_NPC_FIRST_BATCH_APPROVED_CONTENT_DIGEST =
  '3b797613f508ebee9d0464f4185a59eaa3b3760a6c4ad5dbb33c09008f373c0f' as const
export const PAL_C1_NPC_FIRST_BATCH_APPROVED_AT = '2026-08-14T07:45:56.000Z' as const

interface ProposedActor {
  id: string
  nameKey: string
  nameText: string
  spriteId: string
  portrait: string
  entityCandidateIds: readonly string[]
  dialogueGroups: ReadonlyArray<{ id: string; count: number; sitesDigest: string }>
}

const PROPOSAL: readonly ProposedActor[] = [
  {
    id: 'li-daniang',
    nameKey: 'name.li-daniang',
    nameText: '李大娘',
    spriteId: 'sprite-21',
    portrait: 'portrait.pal.055',
    entityCandidateIds: [
      '0ddd149f970cca57281298de1528f2089e85c3287717eade801b5d809a18780e',
      '78dbbfc589553ee97a2140fe2dbedb8b8467a6ed18f7e8657357f9db0a7cf579',
      'fd1c776a1bba2004313a593b5eb1967a7147be5d1a3c99797d558a29eb6ee961',
    ],
    dialogueGroups: [
      { id: 'candidate-group-15bdd508f8278b2b973f7c7f2f0cf2eb43ab2fb3c1e0d6e3e078db884145fdd4', count: 35, sitesDigest: 'cd1e69d8cc5cf4d20a34b3634ac24555e37c73a4331a07f2f385568a9155033b' },
      { id: 'candidate-group-199620b7f20f39da6825751500d90ba2d67059eb174f5473a8ea4e8d0d49dd80', count: 40, sitesDigest: '50fa305c5ebe91917c6d1f56dbd012fb85417898294a2b8e603ff55af987e934' },
      { id: 'candidate-group-30f2473453ed59eac8f2a11aab920460236afffd70ff42f60eb5b00ae36d2e2b', count: 6, sitesDigest: '96c677b7413a9ee7315d23316c1871f88e05a21e7a6beb08b2bd0b6ad7d161c8' },
    ],
  },
  {
    id: 'jiu-jianxian',
    nameKey: 'name.jiu-jianxian',
    nameText: '酒剑仙',
    spriteId: 'sprite-16',
    portrait: 'portrait.pal.037',
    entityCandidateIds: [
      '18cb17517cd2de4f0a2d8e39e6f237c8ed1dc7b6e0976f2d7f91432df4258b59',
      '30c5a7f409c7d5a54c02a26731516710181d2a13e7ed5524d679f1be66a4ff7a',
      '819605aaf2255e736580dcf9c26eeaf34210e92e821fc2c56377da00186fbe2c',
    ],
    dialogueGroups: [
      { id: 'candidate-group-4e33b4d53d95fbefbdd1a51304a0b8299bc659815128c3abb93e27bd36d3c449', count: 32, sitesDigest: '635c2411f13e53e1d927a8791afe2f8b3b9507be4c339cfeb946eec7ec0336a8' },
      { id: 'candidate-group-51edcb0a41c02f48c3d0fef95b4c55fad30e8bdfa7708921279fae4324d3a365', count: 1, sitesDigest: '679ec44b1283ebd6e0fd00679d9d68c51da8354c40a001e8ef4aca510f0b1f42' },
      { id: 'candidate-group-97bd6524a75bf1b88dc46204bc36e3751d4c8c7bf67cccb7a104fe61a0022614', count: 12, sitesDigest: '11f1c835a872044681c94bfdefe4250c18eb322895d8fbb38d1dadff483fd26c' },
      { id: 'candidate-group-bf23e53ca89243cd3bc802803ce9778d5c701fbdcbf149a5e1301212f048a575', count: 25, sitesDigest: '0dbfd3e82de2554ffd2ece5ede68b4773b525f3a57287072e304c14b747aff41' },
      { id: 'candidate-group-f98b47f9bfb6557ea533fdcc05a57f6ef523e496a327fbdcc29df37c7b2f548e', count: 12, sitesDigest: '63f31c334e07f00557b5336338c5d1ef326f15be466562b5e2577246d1ed16c1' },
    ],
  },
] as const

function requiredLocale(parent: MigrationSnapshot): Readonly<Record<string, string>> {
  const raw = parent.files.get('content/locale.json') as MigrationJson
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    throw new Error('C1-3 first batch: 缺 locale')
  for (const [key, value] of Object.entries(raw))
    if (typeof value !== 'string') throw new Error(`C1-3 first batch: locale.${key} 非 string`)
  return raw as Record<string, string>
}

function requiredGroup(
  report: C1NpcCandidateReportV1,
  expected: ProposedActor['dialogueGroups'][number],
): C1NpcCandidateGroupV1 {
  const group = report.groups.find((entry) => entry.id === expected.id)
  if (!group || group.kind !== 'dialogue-display')
    throw new Error(`C1-3 first batch: dialogue group 缺失 ${expected.id}`)
  if (group.siteIds.length !== expected.count || group.sitesDigest !== expected.sitesDigest)
    throw new Error(`C1-3 first batch: dialogue group 漂移 ${expected.id}`)
  return group
}

function dialogueDecision(args: {
  site: C1NpcDialogueCandidateSiteV1
  actor: ProposedActor
  locale: Readonly<Record<string, string>>
  sourceAuthority: PreparedC1NpcSourceEvidence
}): C1NpcDialogueSiteDecisionV1 {
  const source = args.sourceAuthority.evidence.entries.find(
    (entry) => entry.candidateId === args.site.id,
  )
  if (!source) throw new Error(`C1-3 first batch: dialogue source 缺失 ${args.site.id}`)
  const speakerText =
    args.site.identity.speaker === undefined
      ? undefined
      : args.locale[args.site.identity.speaker]
  if (speakerText === undefined)
    throw new Error(`C1-3 first batch: dialogue speaker 缺失 ${args.site.id}`)
  const successorIdentity: Extract<DialogueIdentityV14, { kind: 'actor' }> = {
    kind: 'actor',
    actor: args.actor.id,
    ...(speakerText === args.actor.nameText
      ? {}
      : { speakerOverride: args.site.identity.speaker }),
    ...(args.site.identity.portrait === undefined
      ? {}
      : { portrait: { kind: 'default' as const, side: args.site.identity.portrait.side } }),
  }
  return {
    candidateId: args.site.id,
    source: structuredClone(source.source),
    successorIdentity,
  }
}

function actorDecision(args: {
  proposal: ProposedActor
  report: C1NpcCandidateReportV1
  locale: Readonly<Record<string, string>>
  sourceAuthority: PreparedC1NpcSourceEvidence
}): C1NpcActorDecisionV1 {
  const sites = new Map(args.report.sites.map((site) => [site.id, site]))
  const entitySites = args.proposal.entityCandidateIds.map((candidateId) => {
    const site = sites.get(candidateId)
    if (!site || site.kind !== 'entity')
      throw new Error(`C1-3 first batch: entity candidate 缺失 ${candidateId}`)
    if (site.spriteId !== args.proposal.spriteId)
      throw new Error(`C1-3 first batch: entity sprite 漂移 ${candidateId}`)
    const eventObject = /^e(0|[1-9]\d*)$/.exec(site.entityId)
    if (!eventObject) throw new Error(`C1-3 first batch: entity id 非 PAL source id ${site.entityId}`)
    return {
      candidateId,
      source: { sceneId: site.sceneId, eventObjectId: Number(eventObject[1]) },
    }
  })
  const dialogueIds = args.proposal.dialogueGroups.flatMap(
    (expected) => requiredGroup(args.report, expected).siteIds,
  )
  if (new Set(dialogueIds).size !== dialogueIds.length)
    throw new Error(`C1-3 first batch: ${args.proposal.id} dialogue group overlap`)
  const dialogueSites = dialogueIds.map((candidateId) => {
    const site = sites.get(candidateId)
    if (!site || site.kind !== 'dialogue')
      throw new Error(`C1-3 first batch: dialogue candidate 缺失 ${candidateId}`)
    return dialogueDecision({
      site,
      actor: args.proposal,
      locale: args.locale,
      sourceAuthority: args.sourceAuthority,
    })
  })
  return {
    mode: 'entity-and-dialogue-sites',
    actor: {
      id: args.proposal.id,
      name: args.proposal.nameKey,
      spriteId: args.proposal.spriteId,
      portraits: { default: args.proposal.portrait },
    },
    locale: [{ key: args.proposal.nameKey, parent: null, successor: args.proposal.nameText }],
    entitySites,
    dialogueSites,
  }
}

export interface PalC1NpcFirstBatchDraftResult {
  report: C1NpcCandidateReportV1
  evidence: C1NpcSourceEvidenceV1
  sourceAuthority: PreparedC1NpcSourceEvidence
  actors: C1NpcActorDecisionV1[]
  draft: C1NpcDecisionLedgerDraftV1
}

export function buildPalC1NpcFirstBatchDraft(args: {
  parentC1: MigrationSnapshot
  sourceCommands: readonly SourceCmd[]
  sourceFileSha256: string
}): PalC1NpcFirstBatchDraftResult {
  const c1SealDigest = args.parentC1.baselineMetadata?.transitions['c1-dialogue-identity-v1']
  if (!c1SealDigest) throw new Error('C1-3 first batch: 缺 C1-2 published authority')
  const report = buildC1NpcCandidateReport({
    snapshot: args.parentC1,
    c1SealDigest,
    expectedCensus: PAL_C1_NPC_CANDIDATE_CENSUS,
  })
  const locale = requiredLocale(args.parentC1)
  const evidence = buildC1NpcSourceEvidence({
    report,
    sourceCommands: args.sourceCommands,
    locale,
    sourceFileSha256: args.sourceFileSha256,
    expectedDialogueCandidates: PAL_C1_NPC_CANDIDATE_CENSUS.cues.unbound,
  })
  const sourceAuthority = prepareC1NpcSourceEvidence({ report, evidence })
  const actors = PROPOSAL.map((proposal) =>
    actorDecision({ proposal, report, locale, sourceAuthority }),
  )
  const draft = buildC1NpcDecisionLedgerDraft({
    report,
    sourceEvidence: sourceAuthority,
    batchId: PAL_C1_NPC_FIRST_BATCH_ID,
    actors,
  })
  validateC1NpcDecisionDraftAgainstParent({
    report,
    sourceEvidence: sourceAuthority,
    draft,
    parent: args.parentC1,
  })
  if (draft.contentDigest !== PAL_C1_NPC_FIRST_BATCH_APPROVED_CONTENT_DIGEST)
    throw new Error(
      `C1-3 first batch: 用户批准 digest 漂移 ${draft.contentDigest} != ${PAL_C1_NPC_FIRST_BATCH_APPROVED_CONTENT_DIGEST}`,
    )
  return { report, evidence, sourceAuthority, actors, draft }
}

export interface PalC1NpcFirstBatchAuthorityResult extends PalC1NpcFirstBatchDraftResult {
  ledger: C1NpcDecisionLedgerV1
  authority: PreparedC1NpcDecisionAuthority
}

export function buildPalC1NpcFirstBatchAuthority(args: {
  parentC1: MigrationSnapshot
  sourceCommands: readonly SourceCmd[]
  sourceFileSha256: string
}): PalC1NpcFirstBatchAuthorityResult {
  const result = buildPalC1NpcFirstBatchDraft(args)
  const ledger = attachC1NpcDecisionApproval({
    draft: result.draft,
    approvedLedgerDigest: PAL_C1_NPC_FIRST_BATCH_APPROVED_CONTENT_DIGEST,
    approvedAt: PAL_C1_NPC_FIRST_BATCH_APPROVED_AT,
  })
  const authority = prepareC1NpcDecisionAuthority({
    report: result.report,
    sourceEvidence: result.sourceAuthority,
    ledger,
    parent: args.parentC1,
  })
  return { ...result, ledger, authority }
}
