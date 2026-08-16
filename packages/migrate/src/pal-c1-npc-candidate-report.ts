import {
  checkDialogueCueV14,
  validateActors,
  validateEnemiesV14,
  validateItemsV14,
  validateScenesV14,
  validateSharedScriptsV14,
  type DialogueIdentityV14,
} from '@type-pal/content'
import { isDeepStrictEqual } from 'node:util'
import { stableJsonSha256, stableStringCompare } from './experimental/script-v5/stable-json.js'
import {
  type MigrationSnapshot,
  serializeMigrationJson,
  sha256,
} from './migration-baseline.js'
import type { MigrationJson } from './pal-migration.js'

export const C1_NPC_CANDIDATE_REPORT_METHOD = 'pal-c1-npc-candidate-report-v1' as const

export const C1_NPC_CANDIDATE_PARTITIONS = [
  'scene-entry',
  'scene-hooks-onEnter',
  'scene-hooks-onTeleport',
  'scene-entity-pages',
  'scene-entity-trigger',
  'scene-entity-auto',
  'scene-entity-hostile',
  'item-private',
  'shared-body',
  'enemy-ai-hooks',
  'enemy-onDefeated',
  'enemy-choreography',
] as const

export type C1NpcCandidatePartition = (typeof C1_NPC_CANDIDATE_PARTITIONS)[number]

export interface C1NpcCandidateCensus {
  entities: { total: number; actor: number; sprite: number; zone: number }
  cues: { total: number; narration: number; unbound: number; actor: number }
  sources: { scenes: number; items: number; sharedScripts: number; enemies: number }
  partitions: Record<C1NpcCandidatePartition, number>
}

export const PAL_C1_NPC_CANDIDATE_CENSUS: C1NpcCandidateCensus = {
  entities: { total: 5077, actor: 0, sprite: 3695, zone: 1382 },
  cues: { total: 6235, narration: 1919, unbound: 4316, actor: 0 },
  sources: { scenes: 5995, items: 23, sharedScripts: 0, enemies: 217 },
  partitions: {
    'scene-entry': 0,
    'scene-hooks-onEnter': 1011,
    'scene-hooks-onTeleport': 49,
    'scene-entity-pages': 0,
    'scene-entity-trigger': 4935,
    'scene-entity-auto': 0,
    'scene-entity-hostile': 0,
    'item-private': 23,
    'shared-body': 0,
    'enemy-ai-hooks': 202,
    'enemy-onDefeated': 15,
    'enemy-choreography': 0,
  },
}

export interface C1NpcEntityCandidateSiteV1 {
  kind: 'entity'
  id: string
  file: string
  pointer: string
  leafSha256: string
  sceneId: string
  entityId: string
  spriteId: string
}

export interface C1NpcDialogueCandidateSiteV1 {
  kind: 'dialogue'
  id: string
  file: string
  pointer: string
  leafSha256: string
  identityPointer: string
  identitySha256: string
  rowTextIds: string[]
  partition: C1NpcCandidatePartition
  /** Script host/context only. It is explicitly not accepted as speaker identity. */
  ownerEvidence:
    | {
        kind: 'scene-entity-script'
        sceneId: string
        entityId: string
        entityRef: { kind: 'actor' | 'sprite' | 'zone'; value: string }
      }
    | { kind: 'scene-hook'; sceneId: string; slot: 'onEnter' | 'onTeleport' }
    | { kind: 'scene-entry'; sceneId: string }
    | { kind: 'item-private'; itemId: string }
    | { kind: 'shared-script'; scriptId: string }
    | { kind: 'enemy-script'; enemyId: string }
  identity: Extract<DialogueIdentityV14, { kind: 'unbound' }>
}

export type C1NpcCandidateSiteV1 =
  | C1NpcEntityCandidateSiteV1
  | C1NpcDialogueCandidateSiteV1

export interface C1NpcCandidateGroupV1 {
  kind: 'entity-sprite' | 'dialogue-display'
  id: string
  evidence:
    | { spriteId: string }
    | {
        speaker?: string
        speakerText?: string
        portrait?: { asset: string; side: 'left' | 'right' }
      }
  siteIds: string[]
  sitesDigest: string
}

export interface C1NpcCandidateReportV1 {
  kind: 'pal-c1-npc-candidate-report'
  version: 1
  projectId: 'pal'
  methodVersion: typeof C1_NPC_CANDIDATE_REPORT_METHOD
  /** This is an audit artifact only. It is never accepted as write authority. */
  authority: 'read-only-candidate-evidence'
  source: {
    c1SealDigest: string
    sceneIndexSha256: string
    actorsSha256: string
    localeSha256: string
    itemsSha256: string
    sharedScriptsSha256: string
    enemiesSha256: string
  }
  sites: C1NpcCandidateSiteV1[]
  groups: C1NpcCandidateGroupV1[]
  cueCoverageDigest: string
  summary: C1NpcCandidateCensus & {
    candidates: { entities: number; dialogues: number; total: number }
    groups: { entitySprites: number; dialogueDisplays: number; total: number }
  }
  digest: string
}

interface CueCoverageEntry {
  file: string
  pointer: string
  leafSha256: string
  identityKind: DialogueIdentityV14['kind']
  partition: C1NpcCandidatePartition
}

interface BuildReportArgs {
  snapshot: MigrationSnapshot
  c1SealDigest: string
  expectedCensus: C1NpcCandidateCensus
}

function asRecord(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`C1-3 candidate: ${path} 期望对象`)
  return value as Record<string, unknown>
}

function nonEmptyString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim().length === 0 || value !== value.trim())
    throw new Error(`C1-3 candidate: ${path} 期望非空且无首尾空格 string`)
  return value
}

function pointerToken(value: string): string {
  return value.replace(/~/g, '~0').replace(/\//g, '~1')
}

function pointer(tokens: readonly string[]): string {
  return tokens.length ? `/${tokens.map(pointerToken).join('/')}` : ''
}

function requiredFile(snapshot: MigrationSnapshot, path: string): MigrationJson {
  const value = snapshot.files.get(path)
  if (value === undefined) throw new Error(`C1-3 candidate: snapshot 缺 ${path}`)
  const actual = sha256(serializeMigrationJson(value, path))
  const recorded = snapshot.hashes?.get(path)
  if (recorded !== undefined && recorded !== actual)
    throw new Error(`C1-3 candidate: ${path} 正文与 recorded hash 不符`)
  return value
}

function fileSha256(snapshot: MigrationSnapshot, path: string): string {
  const value = requiredFile(snapshot, path)
  return sha256(serializeMigrationJson(value, path))
}

function sceneIds(value: MigrationJson): string[] {
  if (!Array.isArray(value)) throw new Error('C1-3 candidate: scene index 期望数组')
  const result = value.map((entry, index) => nonEmptyString(entry, `scene index[${index}]`))
  if (new Set(result).size !== result.length)
    throw new Error('C1-3 candidate: scene index 重复')
  const sorted = [...result].sort(stableStringCompare)
  if (!isDeepStrictEqual(result, sorted))
    throw new Error('C1-3 candidate: scene index 未规范排序')
  return result
}

function scenePartition(tokens: readonly string[]): C1NpcCandidatePartition {
  if (tokens[0] === 'entry') return 'scene-entry'
  if (tokens[0] === 'hooks') {
    if (tokens[1] === 'onEnter') return 'scene-hooks-onEnter'
    if (tokens[1] === 'onTeleport') return 'scene-hooks-onTeleport'
  }
  if (tokens[0] === 'entities') {
    if (tokens[2] === 'pages') return 'scene-entity-pages'
    if (tokens[2] === 'hostile') return 'scene-entity-hostile'
    if (tokens[2] === 'behaviors' && tokens[3] === 'trigger')
      return 'scene-entity-trigger'
    if (tokens[2] === 'behaviors' && tokens[3] === 'auto') return 'scene-entity-auto'
  }
  throw new Error(`C1-3 candidate: 未分类 scene dialogue ${pointer(tokens)}`)
}

function itemPartition(tokens: readonly string[]): C1NpcCandidatePartition {
  const script = tokens.indexOf('script')
  if (script >= 0 && tokens[script + 1] === 'body') return 'item-private'
  throw new Error(`C1-3 candidate: 未分类 item dialogue ${pointer(tokens)}`)
}

function sharedPartition(tokens: readonly string[]): C1NpcCandidatePartition {
  if (tokens[1] === 'body') return 'shared-body'
  throw new Error(`C1-3 candidate: 未分类 shared dialogue ${pointer(tokens)}`)
}

function enemyPartition(tokens: readonly string[]): C1NpcCandidatePartition {
  if (tokens.includes('choreography')) return 'enemy-choreography'
  if (tokens[1] === 'ai' && tokens[2] === 'hooks') return 'enemy-ai-hooks'
  if (tokens[1] === 'onDefeated') return 'enemy-onDefeated'
  throw new Error(`C1-3 candidate: 未分类 enemy dialogue ${pointer(tokens)}`)
}

function partitionSource(
  partition: C1NpcCandidatePartition,
): keyof C1NpcCandidateCensus['sources'] {
  if (partition.startsWith('scene-')) return 'scenes'
  if (partition === 'item-private') return 'items'
  if (partition === 'shared-body') return 'sharedScripts'
  return 'enemies'
}

function compareSite(left: C1NpcCandidateSiteV1, right: C1NpcCandidateSiteV1): number {
  return (
    stableStringCompare(left.file, right.file) ||
    stableStringCompare(left.pointer, right.pointer) ||
    stableStringCompare(left.id, right.id)
  )
}

function reportBody(report: C1NpcCandidateReportV1): Omit<C1NpcCandidateReportV1, 'digest'> {
  const { digest: _digest, ...body } = report
  return body
}

function emptyPartitionCounts(): Record<C1NpcCandidatePartition, number> {
  return Object.fromEntries(C1_NPC_CANDIDATE_PARTITIONS.map((key) => [key, 0])) as Record<
    C1NpcCandidatePartition,
    number
  >
}

function collectDialogueSites(args: {
  root: unknown
  file: string
  partitionOf: (tokens: readonly string[]) => C1NpcCandidatePartition
  ownerOf: (tokens: readonly string[]) => C1NpcDialogueCandidateSiteV1['ownerEvidence']
  sites: C1NpcDialogueCandidateSiteV1[]
  coverage: CueCoverageEntry[]
  census: C1NpcCandidateCensus
}): void {
  const visit = (node: unknown, tokens: string[]): void => {
    if (Array.isArray(node)) {
      node.forEach((entry, index) => visit(entry, [...tokens, String(index)]))
      return
    }
    if (!node || typeof node !== 'object') return
    const record = node as Record<string, unknown>
    if (record.kind === 'dialog') {
      const cue = record.cue
      checkDialogueCueV14(cue, `${args.file}${pointer([...tokens, 'cue'])}`)
      const partition = args.partitionOf(tokens)
      const ownerEvidence = args.ownerOf(tokens)
      const cuePointer = pointer([...tokens, 'cue'])
      const identityPointer = pointer([...tokens, 'cue', 'identity'])
      const leafSha256 = stableJsonSha256(cue)
      const identitySha256 = stableJsonSha256(cue.identity)
      const coverage: CueCoverageEntry = {
        file: args.file,
        pointer: cuePointer,
        leafSha256,
        identityKind: cue.identity.kind,
        partition,
      }
      args.coverage.push(coverage)
      args.census.cues.total += 1
      args.census.cues[cue.identity.kind] += 1
      args.census.sources[partitionSource(partition)] += 1
      args.census.partitions[partition] += 1
      if (cue.identity.kind === 'unbound') {
        const body = {
          kind: 'dialogue' as const,
          file: args.file,
          pointer: cuePointer,
          leafSha256,
          identityPointer,
          identitySha256,
          rowTextIds: cue.rows.map((row) => row.text),
          partition,
          ownerEvidence,
          identity: structuredClone(cue.identity),
        }
        args.sites.push({ ...body, id: stableJsonSha256(body) })
      }
    }
    for (const [key, child] of Object.entries(record)) visit(child, [...tokens, key])
  }
  visit(args.root, [])
}

function groupSites(
  sites: readonly C1NpcCandidateSiteV1[],
  locale: Readonly<Record<string, string>>,
): C1NpcCandidateGroupV1[] {
  const groups = new Map<string, { kind: C1NpcCandidateGroupV1['kind']; evidence: C1NpcCandidateGroupV1['evidence']; siteIds: string[] }>()
  for (const site of sites) {
    const kind = site.kind === 'entity' ? 'entity-sprite' : 'dialogue-display'
    const evidence =
      site.kind === 'entity'
        ? { spriteId: site.spriteId }
        : {
            ...(site.identity.speaker !== undefined ? { speaker: site.identity.speaker } : {}),
            ...(site.identity.speaker !== undefined
              ? {
                  speakerText:
                    locale[site.identity.speaker] ??
                    (() => {
                      throw new Error(
                        `C1-3 candidate: locale 缺 speaker ${site.identity.speaker}`,
                      )
                    })(),
                }
              : {}),
            ...(site.identity.portrait !== undefined
              ? { portrait: structuredClone(site.identity.portrait) }
              : {}),
          }
    const key = stableJsonSha256({ kind, evidence })
    const current = groups.get(key)
    if (current) current.siteIds.push(site.id)
    else groups.set(key, { kind, evidence, siteIds: [site.id] })
  }
  return [...groups.entries()]
    .map(([key, group]) => {
      const siteIds = [...group.siteIds].sort(stableStringCompare)
      return {
        kind: group.kind,
        id: `candidate-group-${key}`,
        evidence: group.evidence,
        siteIds,
        sitesDigest: stableJsonSha256(siteIds),
      }
    })
    .sort((left, right) => stableStringCompare(left.id, right.id))
}

export function buildC1NpcCandidateReport(args: BuildReportArgs): C1NpcCandidateReportV1 {
  if (!/^[a-f0-9]{64}$/.test(args.c1SealDigest))
    throw new Error('C1-3 candidate: c1SealDigest 非 sha256')
  const sceneIndexPath = 'content/scenes/index.json'
  const actorPath = 'content/actors.json'
  const localePath = 'content/locale.json'
  const itemPath = 'content/items.json'
  const sharedPath = 'content/shared-scripts.json'
  const enemyPath = 'content/enemies.json'
  const ids = sceneIds(requiredFile(args.snapshot, sceneIndexPath))
  const sceneFiles = ids.map((id) => `content/scenes/${id}.json`)
  const scenes = validateScenesV14(sceneFiles.map((path) => requiredFile(args.snapshot, path)))
  const actors = validateActors(requiredFile(args.snapshot, actorPath))
  const rawLocale = asRecord(requiredFile(args.snapshot, localePath), localePath)
  const locale = Object.fromEntries(
    Object.entries(rawLocale).map(([key, value]) => {
      if (typeof value !== 'string')
        throw new Error(`C1-3 candidate: ${localePath}.${key} 期望 string`)
      return [key, value]
    }),
  )
  const items = validateItemsV14(requiredFile(args.snapshot, itemPath))
  const shared = validateSharedScriptsV14(requiredFile(args.snapshot, sharedPath))
  const enemies = validateEnemiesV14(requiredFile(args.snapshot, enemyPath))
  void actors

  const census: C1NpcCandidateCensus = {
    entities: { total: 0, actor: 0, sprite: 0, zone: 0 },
    cues: { total: 0, narration: 0, unbound: 0, actor: 0 },
    sources: { scenes: 0, items: 0, sharedScripts: 0, enemies: 0 },
    partitions: emptyPartitionCounts(),
  }
  const entitySites: C1NpcEntityCandidateSiteV1[] = []
  const dialogueSites: C1NpcDialogueCandidateSiteV1[] = []
  const coverage: CueCoverageEntry[] = []

  scenes.forEach((scene, sceneIndex) => {
    const file = sceneFiles[sceneIndex]
    if (!file) throw new Error(`C1-3 candidate: scene file index ${sceneIndex} 丢失`)
    scene.entities.forEach((entity, entityIndex) => {
      census.entities.total += 1
      if ('actor' in entity) census.entities.actor += 1
      else if ('sprite' in entity) {
        census.entities.sprite += 1
        const entityPointer = pointer(['entities', String(entityIndex)])
        const leafSha256 = stableJsonSha256(entity)
        const body = {
          kind: 'entity' as const,
          file,
          pointer: entityPointer,
          leafSha256,
          sceneId: scene.id,
          entityId: entity.id,
          spriteId: entity.sprite,
        }
        entitySites.push({ ...body, id: stableJsonSha256(body) })
      } else census.entities.zone += 1
    })
    collectDialogueSites({
      root: scene,
      file,
      partitionOf: scenePartition,
      ownerOf: (tokens) => {
        if (tokens[0] === 'entry') return { kind: 'scene-entry', sceneId: scene.id }
        if (tokens[0] === 'hooks') {
          const slot = tokens[1]
          if (slot !== 'onEnter' && slot !== 'onTeleport')
            throw new Error(`C1-3 candidate: scene hook slot 非法 ${pointer(tokens)}`)
          return { kind: 'scene-hook', sceneId: scene.id, slot }
        }
        if (tokens[0] !== 'entities')
          throw new Error(`C1-3 candidate: scene dialogue owner 不可解析 ${pointer(tokens)}`)
        const entityIndex = Number(tokens[1])
        const entity = scene.entities[entityIndex]
        if (!Number.isSafeInteger(entityIndex) || entityIndex < 0 || !entity)
          throw new Error(`C1-3 candidate: scene entity owner 越界 ${pointer(tokens)}`)
        const entityRef =
          'actor' in entity
            ? { kind: 'actor' as const, value: entity.actor }
            : 'sprite' in entity
              ? { kind: 'sprite' as const, value: entity.sprite }
              : { kind: 'zone' as const, value: 'zone' }
        return {
          kind: 'scene-entity-script',
          sceneId: scene.id,
          entityId: entity.id,
          entityRef,
        }
      },
      sites: dialogueSites,
      coverage,
      census,
    })
  })
  collectDialogueSites({
    root: items,
    file: itemPath,
    partitionOf: itemPartition,
    ownerOf: (tokens) => {
      const index = Number(tokens[0])
      const item = items[index]
      if (!Number.isSafeInteger(index) || index < 0 || !item)
        throw new Error(`C1-3 candidate: item owner 越界 ${pointer(tokens)}`)
      return { kind: 'item-private', itemId: item.id }
    },
    sites: dialogueSites,
    coverage,
    census,
  })
  collectDialogueSites({
    root: shared,
    file: sharedPath,
    partitionOf: sharedPartition,
    ownerOf: (tokens) => ({
      kind: 'shared-script',
      scriptId: nonEmptyString(tokens[0], `shared script owner ${pointer(tokens)}`),
    }),
    sites: dialogueSites,
    coverage,
    census,
  })
  collectDialogueSites({
    root: enemies,
    file: enemyPath,
    partitionOf: enemyPartition,
    ownerOf: (tokens) => {
      const index = Number(tokens[0])
      const enemy = enemies[index]
      if (!Number.isSafeInteger(index) || index < 0 || !enemy)
        throw new Error(`C1-3 candidate: enemy owner 越界 ${pointer(tokens)}`)
      return { kind: 'enemy-script', enemyId: enemy.id }
    },
    sites: dialogueSites,
    coverage,
    census,
  })

  if (!isDeepStrictEqual(census, args.expectedCensus))
    throw new Error(
      `C1-3 candidate: census 漂移 expected=${JSON.stringify(args.expectedCensus)} actual=${JSON.stringify(census)}`,
    )

  const sites: C1NpcCandidateSiteV1[] = [...entitySites, ...dialogueSites].sort(compareSite)
  const siteIds = sites.map((site) => site.id)
  if (new Set(siteIds).size !== siteIds.length)
    throw new Error('C1-3 candidate: candidate site identity 重复')
  const locations = sites.map((site) => `${site.file}#${site.pointer}`)
  if (new Set(locations).size !== locations.length)
    throw new Error('C1-3 candidate: candidate canonical locator 重复')
  coverage.sort(
    (left, right) =>
      stableStringCompare(left.file, right.file) || stableStringCompare(left.pointer, right.pointer),
  )
  const groups = groupSites(sites, locale)
  const entityGroups = groups.filter((group) => group.kind === 'entity-sprite').length
  const dialogueGroups = groups.length - entityGroups
  const report = {
    kind: 'pal-c1-npc-candidate-report' as const,
    version: 1 as const,
    projectId: 'pal' as const,
    methodVersion: C1_NPC_CANDIDATE_REPORT_METHOD,
    authority: 'read-only-candidate-evidence' as const,
    source: {
      c1SealDigest: args.c1SealDigest,
      sceneIndexSha256: fileSha256(args.snapshot, sceneIndexPath),
      actorsSha256: fileSha256(args.snapshot, actorPath),
      localeSha256: fileSha256(args.snapshot, localePath),
      itemsSha256: fileSha256(args.snapshot, itemPath),
      sharedScriptsSha256: fileSha256(args.snapshot, sharedPath),
      enemiesSha256: fileSha256(args.snapshot, enemyPath),
    },
    sites,
    groups,
    cueCoverageDigest: stableJsonSha256(coverage),
    summary: {
      ...census,
      candidates: {
        entities: entitySites.length,
        dialogues: dialogueSites.length,
        total: sites.length,
      },
      groups: {
        entitySprites: entityGroups,
        dialogueDisplays: dialogueGroups,
        total: groups.length,
      },
    },
  }
  return { ...report, digest: stableJsonSha256(report) }
}

export function assertC1NpcCandidateReport(report: C1NpcCandidateReportV1): void {
  if (
    report.kind !== 'pal-c1-npc-candidate-report' ||
    report.version !== 1 ||
    report.projectId !== 'pal' ||
    report.methodVersion !== C1_NPC_CANDIDATE_REPORT_METHOD ||
    report.authority !== 'read-only-candidate-evidence'
  )
    throw new Error('C1-3 candidate report: identity 漂移')
  for (const digest of [
    report.source.c1SealDigest,
    report.source.sceneIndexSha256,
    report.source.actorsSha256,
    report.source.localeSha256,
    report.source.itemsSha256,
    report.source.sharedScriptsSha256,
    report.source.enemiesSha256,
    report.cueCoverageDigest,
    report.digest,
  ])
    if (!/^[a-f0-9]{64}$/.test(digest))
      throw new Error('C1-3 candidate report: digest 非 sha256')
  const sortedSites = [...report.sites].sort(compareSite)
  if (!isDeepStrictEqual(report.sites, sortedSites))
    throw new Error('C1-3 candidate report: sites 未规范排序')
  const ids = report.sites.map((site) => site.id)
  if (new Set(ids).size !== ids.length)
    throw new Error('C1-3 candidate report: site id 重复')
  const locations = report.sites.map((site) => `${site.file}#${site.pointer}`)
  if (new Set(locations).size !== locations.length)
    throw new Error('C1-3 candidate report: canonical locator 重复')
  if (stableJsonSha256(reportBody(report)) !== report.digest)
    throw new Error('C1-3 candidate report: self digest 不符')
}
