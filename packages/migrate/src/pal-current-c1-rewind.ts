import type { ManifestV14, ManifestV16 } from '@type-pal/content'
import { projectCurrentMapHashesToPublishedPreV4Surface } from './historical-map-surface-authority.js'
import { type MigrationSnapshot, serializeMigrationJson, sha256 } from './migration-baseline.js'
import {
  rewindPublishedB2BattleFieldDomainIfPresent,
  rewindPublishedB2BattleFieldProjectAgainstPublishedBaseline,
} from './pal-b2-battle-field-domain.js'
import {
  rewindPublishedC1DialogueIdentityIfPresent,
  rewindPublishedC1ProjectAgainstPublishedBaseline,
} from './pal-c1-dialogue-identity.js'
import {
  rewindPublishedC1NpcCurationIfPresent,
  rewindPublishedC1NpcProjectAgainstPublishedBaseline,
} from './pal-c1-npc-curation-transition.js'

type CurrentRewindArgs = {
  source: MigrationSnapshot
  manifest: ManifestV14 | ManifestV16
  manifestRawText: string
}

/** 当前清单到已发布 v14 权威面的字节级回卷；只供 seal 审计与测试复用。 */
export function rewindCurrentManifestToV14(
  manifest: ManifestV14 | ManifestV16,
  manifestRawText: string,
): { manifest: ManifestV14; manifestRawText: string } {
  if (manifest.contentVersion === 14) return { manifest, manifestRawText }
  const content = { ...manifest.content } as Record<string, unknown>
  delete content.worldVariables
  return {
    manifest: { ...manifest, contentVersion: 14, content } as ManifestV14,
    manifestRawText: manifestRawText
      .replace(/,\r?\n[ \t]*"worldVariables"[ \t]*:[ \t]*"[^"]+"[ \t]*\r?\n/, '\n')
      .replace(/("contentVersion"\s*:\s*)16/, (_match, prefix: string) => `${prefix}14`),
  }
}

/** 从当前工程剥离变量表与敌队稳定引用，只供历史发布 seal 复验，不是产品 loader/upgrader。 */
function rewindCurrentSuccessorsToV14(args: CurrentRewindArgs): {
  source: MigrationSnapshot
  manifest: ManifestV14
  manifestRawText: string
} {
  if (args.manifest.contentVersion === 14) return args as never
  const reverse = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(reverse)
    if (!value || typeof value !== 'object') return value
    const current = value as Record<string, unknown>
    if (current.kind === 'startBattle' && typeof current.enemyTeamId === 'string') {
      const match = /^team-(\d+)$/.exec(current.enemyTeamId)
      if (!match)
        throw new Error(`enemy-team historical rewind: 非 PAL 敌队 ${current.enemyTeamId}`)
      const entries = Object.entries(current)
        .filter(([key]) => key !== 'enemyTeamId')
        .map(([key, child]) => [key, reverse(child)] as const)
      // Published v14 has two authored insertion-order exceptions; every generated form put team last.
      // Recreate those exact byte-level parents so historical C1 seals remain independently verifiable.
      const signature = entries.map(([key]) => key).join(',')
      const teamIndex =
        signature === 'kind,boss' || signature === 'kind,onLose,boss,fieldId,music'
          ? 1
          : entries.length
      entries.splice(teamIndex, 0, ['team', Number(match[1])])
      return Object.fromEntries(entries)
    }
    const next = Object.fromEntries(
      Object.entries(current).map(([key, child]) => [key, reverse(child)]),
    )
    if (next.hostile && typeof next.hostile === 'object') {
      const hostile = next.hostile as Record<string, unknown>
      if (typeof hostile.enemyTeamId === 'string') {
        const match = /^team-(\d+)$/.exec(hostile.enemyTeamId)
        if (!match)
          throw new Error(`enemy-team historical rewind: 非 PAL 敌队 ${hostile.enemyTeamId}`)
        next.hostile = {
          team: Number(match[1]),
          ...Object.fromEntries(Object.entries(hostile).filter(([key]) => key !== 'enemyTeamId')),
        }
      }
    }
    return next
  }
  const files = new Map(args.source.files)
  const hashes = new Map(args.source.hashes)
  const managedFiles = new Set(args.source.managedFiles)
  files.delete('content/world-variables.json')
  hashes.delete('content/world-variables.json')
  managedFiles.delete('content/world-variables.json')
  for (const [path, value] of files) {
    const next = reverse(value) as typeof value
    if (JSON.stringify(next) === JSON.stringify(value)) continue
    files.set(path, next)
    if (hashes.has(path)) hashes.set(path, sha256(serializeMigrationJson(next, path)))
  }
  const { manifest, manifestRawText } = rewindCurrentManifestToV14(
    args.manifest,
    args.manifestRawText,
  )
  return {
    source: projectCurrentMapHashesToPublishedPreV4Surface({
      ...args.source,
      files,
      managedFiles,
      ...(args.source.hashes ? { hashes } : {}),
    }),
    manifest,
    manifestRawText,
  }
}

/** Remove the current B2 outer successor and C1-3, yielding the exact published C1-2 surface. */
export function rewindCurrentC1PublicationToDialogueParent(args: {
  source: MigrationSnapshot
  manifest: ManifestV14 | ManifestV16
  manifestRawText: string
}): MigrationSnapshot {
  const parent = rewindCurrentSuccessorsToV14(args)
  const c1Current = rewindPublishedB2BattleFieldDomainIfPresent(parent)
  return rewindPublishedC1NpcCurationIfPresent({ ...parent, source: c1Current })
}

/** Current historical choke point: C1-3 → C1-2 → W9. */
export function rewindCurrentC1PublicationToW9(args: {
  source: MigrationSnapshot
  manifest: ManifestV14 | ManifestV16
  manifestRawText: string
}): MigrationSnapshot {
  const dialogueParent = rewindCurrentC1PublicationToDialogueParent(args)
  const parent = rewindCurrentSuccessorsToV14(args)
  return rewindPublishedC1DialogueIdentityIfPresent(dialogueParent, parent.manifest)
}

/** Fold B2 and C1-3-owned project leaves while preserving unrelated authored changes. */
export function rewindCurrentC1ProjectToDialogueParent(args: {
  project: MigrationSnapshot
  publishedBaseline: MigrationSnapshot
  manifest: ManifestV14 | ManifestV16
  manifestRawText: string
}): MigrationSnapshot {
  const current = rewindCurrentSuccessorsToV14({
    source: args.project,
    manifest: args.manifest,
    manifestRawText: args.manifestRawText,
  })
  const normalized = {
    ...args,
    project: current.source,
    manifest: current.manifest,
    manifestRawText: current.manifestRawText,
  }
  const projectC1 = rewindPublishedB2BattleFieldProjectAgainstPublishedBaseline(normalized)
  const baselineC1 = rewindPublishedB2BattleFieldDomainIfPresent({
    source: args.publishedBaseline,
    manifest: current.manifest,
    manifestRawText: current.manifestRawText,
  })
  return rewindPublishedC1NpcProjectAgainstPublishedBaseline({
    ...normalized,
    project: projectC1,
    publishedBaseline: baselineC1,
  })
}

/** Current project choke point: project/baseline C1-3 pair → C1-2 pair → W9 project. */
export function rewindCurrentC1ProjectToW9(args: {
  project: MigrationSnapshot
  publishedBaseline: MigrationSnapshot
  manifest: ManifestV14 | ManifestV16
  manifestRawText: string
}): MigrationSnapshot {
  const projectC1 = rewindCurrentC1ProjectToDialogueParent(args)
  const baselineC1 = rewindCurrentC1PublicationToDialogueParent({
    source: args.publishedBaseline,
    manifest: args.manifest,
    manifestRawText: args.manifestRawText,
  })
  return rewindPublishedC1ProjectAgainstPublishedBaseline(projectC1, baselineC1)
}
