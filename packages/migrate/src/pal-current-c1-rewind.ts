import type { ManifestV14, ManifestV15 } from '@type-pal/content'
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
  manifest: ManifestV14 | ManifestV15
  manifestRawText: string
}

/** ED-ENEMY-1 的无损机械 successor 回卷，只供历史发布 seal 复验。 */
function rewindEnemyTeamReferenceV15(args: CurrentRewindArgs): {
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
      if (!match) throw new Error(`content15 historical rewind: 非 PAL 敌队 ${current.enemyTeamId}`)
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
          throw new Error(`content15 historical rewind: 非 PAL 敌队 ${hostile.enemyTeamId}`)
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
  for (const [path, value] of files) {
    const next = reverse(value) as typeof value
    if (JSON.stringify(next) === JSON.stringify(value)) continue
    files.set(path, next)
    if (hashes.has(path)) hashes.set(path, sha256(serializeMigrationJson(next, path)))
  }
  const manifest = { ...args.manifest, contentVersion: 14 } as ManifestV14
  const manifestRawText = args.manifestRawText.replace(
    /("contentVersion"\s*:\s*)15/,
    (_match, prefix: string) => `${prefix}14`,
  )
  return {
    source: { ...args.source, files, ...(args.source.hashes ? { hashes } : {}) },
    manifest,
    manifestRawText,
  }
}

/** Remove the current B2 outer successor and C1-3, yielding the exact published C1-2 surface. */
export function rewindCurrentC1PublicationToDialogueParent(args: {
  source: MigrationSnapshot
  manifest: ManifestV14 | ManifestV15
  manifestRawText: string
}): MigrationSnapshot {
  const parent = rewindEnemyTeamReferenceV15(args)
  const c1Current = rewindPublishedB2BattleFieldDomainIfPresent(parent)
  return rewindPublishedC1NpcCurationIfPresent({ ...parent, source: c1Current })
}

/** Current historical choke point: C1-3 → C1-2 → W9. */
export function rewindCurrentC1PublicationToW9(args: {
  source: MigrationSnapshot
  manifest: ManifestV14 | ManifestV15
  manifestRawText: string
}): MigrationSnapshot {
  const dialogueParent = rewindCurrentC1PublicationToDialogueParent(args)
  const parent = rewindEnemyTeamReferenceV15(args)
  return rewindPublishedC1DialogueIdentityIfPresent(dialogueParent, parent.manifest)
}

/** Fold B2 and C1-3-owned project leaves while preserving unrelated authored changes. */
export function rewindCurrentC1ProjectToDialogueParent(args: {
  project: MigrationSnapshot
  publishedBaseline: MigrationSnapshot
  manifest: ManifestV14 | ManifestV15
  manifestRawText: string
}): MigrationSnapshot {
  const current = rewindEnemyTeamReferenceV15({
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
  manifest: ManifestV14 | ManifestV15
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
