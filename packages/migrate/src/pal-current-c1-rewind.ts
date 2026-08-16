import type { ManifestV14 } from '@type-pal/content'
import type { MigrationSnapshot } from './migration-baseline.js'
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

/** Remove the current B2 outer successor and C1-3, yielding the exact published C1-2 surface. */
export function rewindCurrentC1PublicationToDialogueParent(args: {
  source: MigrationSnapshot
  manifest: ManifestV14
  manifestRawText: string
}): MigrationSnapshot {
  const c1Current = rewindPublishedB2BattleFieldDomainIfPresent(args)
  return rewindPublishedC1NpcCurationIfPresent({ ...args, source: c1Current })
}

/** Current historical choke point: C1-3 → C1-2 → W9. */
export function rewindCurrentC1PublicationToW9(args: {
  source: MigrationSnapshot
  manifest: ManifestV14
  manifestRawText: string
}): MigrationSnapshot {
  const dialogueParent = rewindCurrentC1PublicationToDialogueParent(args)
  return rewindPublishedC1DialogueIdentityIfPresent(dialogueParent, args.manifest)
}

/** Fold B2 and C1-3-owned project leaves while preserving unrelated authored changes. */
export function rewindCurrentC1ProjectToDialogueParent(args: {
  project: MigrationSnapshot
  publishedBaseline: MigrationSnapshot
  manifest: ManifestV14
  manifestRawText: string
}): MigrationSnapshot {
  const projectC1 = rewindPublishedB2BattleFieldProjectAgainstPublishedBaseline(args)
  const baselineC1 = rewindPublishedB2BattleFieldDomainIfPresent({
    source: args.publishedBaseline,
    manifest: args.manifest,
    manifestRawText: args.manifestRawText,
  })
  return rewindPublishedC1NpcProjectAgainstPublishedBaseline({
    ...args,
    project: projectC1,
    publishedBaseline: baselineC1,
  })
}

/** Current project choke point: project/baseline C1-3 pair → C1-2 pair → W9 project. */
export function rewindCurrentC1ProjectToW9(args: {
  project: MigrationSnapshot
  publishedBaseline: MigrationSnapshot
  manifest: ManifestV14
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
