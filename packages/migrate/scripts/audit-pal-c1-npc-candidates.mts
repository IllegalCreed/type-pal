import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadPalBaseline, sha256 } from '../src/migration-baseline.js'
import {
  buildC1NpcCandidateReport,
  PAL_C1_NPC_CANDIDATE_CENSUS,
} from '../src/pal-c1-npc-candidate-report.js'
import { buildC1NpcSourceEvidence } from '../src/pal-c1-npc-source-evidence.js'
import type { SourceCmd } from '../src/source-facts.js'

const repo = fileURLToPath(new URL('../../..', import.meta.url))
const published = loadPalBaseline(repo)
if (!published) throw new Error('C1-3 candidate audit: 缺 PAL published baseline')
const c1SealDigest = published.baselineMetadata?.transitions['c1-dialogue-identity-v1']
if (!c1SealDigest) throw new Error('C1-3 candidate audit: 缺 C1-2 published authority')

const report = buildC1NpcCandidateReport({
  snapshot: published,
  c1SealDigest,
  expectedCensus: PAL_C1_NPC_CANDIDATE_CENSUS,
})
const sourceText = readFileSync(resolve(repo, 'data/extracted/events/all.json'), 'utf8')
const sourceJson = JSON.parse(sourceText) as { segments: { commands: SourceCmd[] }[] }
const locale = published.files.get('content/locale.json')
if (!locale || typeof locale !== 'object' || Array.isArray(locale))
  throw new Error('C1-3 candidate audit: 缺 locale')
const sourceEvidence = buildC1NpcSourceEvidence({
  report,
  sourceCommands: sourceJson.segments.flatMap((segment) => segment.commands),
  locale: locale as Record<string, string>,
  sourceFileSha256: sha256(sourceText),
  expectedDialogueCandidates: PAL_C1_NPC_CANDIDATE_CENSUS.cues.unbound,
})

const requestedSpeakers = new Set(
  (process.argv.find((arg) => arg.startsWith('--speaker='))?.slice('--speaker='.length) ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
)

const dialogueGroups = report.groups
  .filter((group) => group.kind === 'dialogue-display')
  .map((group) => ({
    id: group.id,
    count: group.siteIds.length,
    evidence: group.evidence as {
      speaker?: string
      speakerText?: string
      portrait?: { asset: string; side: 'left' | 'right' }
    },
    sitesDigest: group.sitesDigest,
  }))
  .filter(
    (group) =>
      requestedSpeakers.size === 0 ||
      (group.evidence.speakerText !== undefined &&
        requestedSpeakers.has(group.evidence.speakerText)),
  )
  .sort((left, right) => right.count - left.count || (left.id < right.id ? -1 : left.id > right.id ? 1 : 0))

const entityGroups = report.groups
  .filter((group) => group.kind === 'entity-sprite')
  .map((group) => ({
    id: group.id,
    count: group.siteIds.length,
    spriteId: (group.evidence as { spriteId: string }).spriteId,
    sitesDigest: group.sitesDigest,
  }))
  .sort((left, right) => right.count - left.count || (left.id < right.id ? -1 : left.id > right.id ? 1 : 0))

const siteById = new Map(report.sites.map((site) => [site.id, site]))
const requestedSpeakerOwners = [...requestedSpeakers]
  .sort()
  .map((speaker) => {
    const groups = dialogueGroups.filter((group) => group.evidence.speakerText === speaker)
    const owners = new Map<string, { count: number; evidence: object }>()
    for (const group of groups) {
      for (const siteId of report.groups.find((entry) => entry.id === group.id)?.siteIds ?? []) {
        const site = siteById.get(siteId)
        if (!site || site.kind !== 'dialogue') continue
        const key = JSON.stringify(site.ownerEvidence)
        const current = owners.get(key)
        if (current) current.count += 1
        else owners.set(key, { count: 1, evidence: site.ownerEvidence })
      }
    }
    return {
      speaker,
      cues: groups.reduce((sum, group) => sum + group.count, 0),
      owners: [...owners.values()].sort(
        (left, right) =>
          right.count - left.count ||
          (JSON.stringify(left.evidence) < JSON.stringify(right.evidence) ? -1 : 1),
      ),
    }
  })

const summary = {
  kind: report.kind,
  authority: report.authority,
  reportDigest: report.digest,
  cueCoverageDigest: report.cueCoverageDigest,
  sourceEvidenceDigest: sourceEvidence.digest,
  sourceEvidenceSummary: sourceEvidence.summary,
  c1SealDigest,
  summary: report.summary,
  topDialogueDisplayGroups:
    requestedSpeakers.size === 0 ? dialogueGroups.slice(0, 40) : dialogueGroups,
  topEntitySpriteGroups: entityGroups.slice(0, 40),
  requestedSpeakerOwners,
}

if (process.argv.includes('--json')) console.log(JSON.stringify(summary, null, 2))
else {
  console.log('# C1-3 PAL NPC candidate audit')
  console.log('')
  console.log(`- authority: ${summary.authority}`)
  console.log(`- report digest: \`${summary.reportDigest}\``)
  console.log(`- cue coverage digest: \`${summary.cueCoverageDigest}\``)
  console.log(`- source evidence digest: \`${summary.sourceEvidenceDigest}\``)
  console.log(
    `- source rows: ${summary.sourceEvidenceSummary.rowOccurrences} across ${summary.sourceEvidenceSummary.dialogueCandidates} dialogue candidates`,
  )
  console.log(
    `- candidates: ${summary.summary.candidates.total} = entity ${summary.summary.candidates.entities} + dialogue ${summary.summary.candidates.dialogues}`,
  )
  console.log(
    `- groups: ${summary.summary.groups.total} = sprite ${summary.summary.groups.entitySprites} + dialogue display ${summary.summary.groups.dialogueDisplays}`,
  )
  console.log('')
  console.log('## Top dialogue display groups (evidence only; not Actor identity)')
  console.log('')
  console.log('| count | speaker | portrait | group id | members digest |')
  console.log('|---:|---|---|---|---|')
  for (const group of summary.topDialogueDisplayGroups) {
    const portrait = group.evidence.portrait
      ? `${group.evidence.portrait.asset}@${group.evidence.portrait.side}`
      : '—'
    console.log(
      `| ${group.count} | ${group.evidence.speakerText ?? '—'} (${group.evidence.speaker ?? '—'}) | ${portrait} | \`${group.id}\` | \`${group.sitesDigest}\` |`,
    )
  }
  if (summary.requestedSpeakerOwners.length) {
    console.log('')
    console.log('## Requested speaker script-host evidence (not speaker identity)')
    console.log('')
    console.log('| speaker | cues | host evidence | host cue count |')
    console.log('|---|---:|---|---:|')
    for (const speaker of summary.requestedSpeakerOwners)
      for (const owner of speaker.owners)
        console.log(
          `| ${speaker.speaker} | ${speaker.cues} | \`${JSON.stringify(owner.evidence)}\` | ${owner.count} |`,
        )
  }
  console.log('')
  console.log('## Top entity sprite groups (evidence only; not Actor identity)')
  console.log('')
  console.log('| count | sprite | group id | members digest |')
  console.log('|---:|---|---|---|')
  for (const group of summary.topEntitySpriteGroups)
    console.log(
      `| ${group.count} | ${group.spriteId} | \`${group.id}\` | \`${group.sitesDigest}\` |`,
    )
}
