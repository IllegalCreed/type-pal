import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, test } from 'vitest'
import type { ManifestV14 } from '@type-pal/content'
import { loadPalBaseline, sha256, type MigrationSnapshot } from './migration-baseline.js'
import {
  buildC1NpcCandidateReport,
  PAL_C1_NPC_CANDIDATE_CENSUS,
  type C1NpcCandidateReportV1,
} from './pal-c1-npc-candidate-report.js'
import {
  buildC1NpcSourceEvidence,
  prepareC1NpcSourceEvidence,
  type C1NpcSourceEvidenceV1,
} from './pal-c1-npc-source-evidence.js'
import type { SourceCmd } from './source-facts.js'
import type { MigrationJson } from './pal-migration.js'
import { rewindCurrentC1PublicationToDialogueParent } from './pal-current-c1-rewind.js'

const repo = fileURLToPath(new URL('../../..', import.meta.url))
const EXISTING_ACTOR_SPRITES = [
  'anu',
  'gai-luojiao',
  'li-xiaoyao',
  'lin-yueru',
  'wu-hou',
  'zhao-linger',
] as const

let published: MigrationSnapshot
let report: C1NpcCandidateReportV1
let sourceEvidence: C1NpcSourceEvidenceV1

beforeAll(() => {
  const loaded = loadPalBaseline(repo)
  if (!loaded) throw new Error('C1-3 candidate PAL test 缺 published baseline')
  const manifestRawText = readFileSync(resolve(repo, 'projects/pal/manifest.json'), 'utf8')
  published = rewindCurrentC1PublicationToDialogueParent({
    source: loaded,
    manifest: JSON.parse(manifestRawText) as ManifestV14,
    manifestRawText,
  })
  const c1SealDigest =
    published.baselineMetadata?.transitions['c1-dialogue-identity-v1']
  if (!c1SealDigest) throw new Error('C1-3 candidate PAL test 缺 C1-2 authority')
  report = buildC1NpcCandidateReport({
    snapshot: published,
    c1SealDigest,
    expectedCensus: PAL_C1_NPC_CANDIDATE_CENSUS,
  })
  const sourceText = readFileSync(resolve(repo, 'data/extracted/events/all.json'), 'utf8')
  const sourceJson = JSON.parse(sourceText) as { segments: { commands: SourceCmd[] }[] }
  const locale = published.files.get('content/locale.json') as MigrationJson
  if (!locale || typeof locale !== 'object' || Array.isArray(locale))
    throw new Error('C1-3 candidate PAL test 缺 locale')
  sourceEvidence = buildC1NpcSourceEvidence({
    report,
    sourceCommands: sourceJson.segments.flatMap((segment) => segment.commands),
    locale: locale as Record<string, string>,
    sourceFileSha256: sha256(sourceText),
    expectedDialogueCandidates: PAL_C1_NPC_CANDIDATE_CENSUS.cues.unbound,
  })
  prepareC1NpcSourceEvidence({ report, evidence: sourceEvidence })
}, 120_000)

describe('C1-3 PAL read-only NPC candidate census', () => {
  test('closes every content14 source partition without granting write authority', () => {
    expect(report.authority).toBe('read-only-candidate-evidence')
    expect(report.summary.entities).toEqual({ total: 5077, actor: 0, sprite: 3695, zone: 1382 })
    expect(report.summary.cues).toEqual({
      total: 6235,
      narration: 1919,
      unbound: 4316,
      actor: 0,
    })
    expect(report.summary.sources).toEqual({
      scenes: 5995,
      items: 23,
      sharedScripts: 0,
      enemies: 217,
    })
    expect(report.summary.partitions).toEqual(PAL_C1_NPC_CANDIDATE_CENSUS.partitions)
    expect(report.summary.candidates).toEqual({ entities: 3695, dialogues: 4316, total: 8011 })
    expect(report.sites).toHaveLength(8011)
    expect(new Set(report.sites.map((site) => `${site.file}#${site.pointer}`)).size).toBe(8011)
  })

  test('pins the conservative entity boundary for the six existing Actors', () => {
    const sceneSpriteIds = new Set(
      report.sites.filter((site) => site.kind === 'entity').map((site) => site.spriteId),
    )
    expect(EXISTING_ACTOR_SPRITES.filter((spriteId) => sceneSpriteIds.has(spriteId))).toEqual([])
  })

  test('joins every dialogue row to one immutable extracted showDialog command', () => {
    expect(report.digest).toBe('c2bb3bdce36e973ee7d631344afab00e9a114d82fe2a03eecda1cf5091e97e82')
    expect(sourceEvidence.candidateReportDigest).toBe(report.digest)
    expect(sourceEvidence.digest).toBe(
      'c479628b3b9cea83c8397749be60337736ebc4372d41620f992b97a16baefaf6',
    )
    expect(sourceEvidence.summary).toEqual({
      sourceCommands: 43503,
      showDialogCommands: 13513,
      uniqueMessages: 13513,
      dialogueCandidates: 4316,
      rowOccurrences: 8817,
    })
    expect(sourceEvidence.entries).toHaveLength(4316)
  })
})
