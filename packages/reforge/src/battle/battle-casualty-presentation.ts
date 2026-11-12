import type { ActorDef, AssetId, CasualtyLine, DialogueCue } from '@type-pal/content'
import { expectDefined } from '../defined.js'
import type { CreatePlayerInput } from './battle-core.js'

export function battleCasualtyCues(lines: readonly CasualtyLine[]): DialogueCue[] {
  const cues: DialogueCue[] = []
  for (const line of lines) {
    let cue: DialogueCue
    if (line.sameCue) cue = expectDefined(cues.at(-1))
    else {
      cue = { rows: [], slot: line.style, ...(line.portrait ? { portrait: line.portrait } : {}) }
      cues.push(cue)
    }
    cue.rows.push({ text: line.text })
    if (line.autoAdvance !== undefined) cue.autoAdvance = line.autoAdvance
  }
  return cues
}

/** Ordinary encounters and standalone trials prepare all branches of the participating actors. */
export function collectBattleCasualtyPortraits(
  players: readonly Pick<CreatePlayerInput, 'actorTemplateId'>[],
  actorsById: Record<string, ActorDef>,
): Set<AssetId> {
  const portraits = new Set<AssetId>()
  for (const player of players) {
    const scripts = actorsById[player.actorTemplateId]?.battler?.casualty
    for (const script of Object.values(scripts ?? {})) {
      if (!script) continue
      for (const branch of [...script.gates.map(({ branch }) => branch), script.fallback])
        for (const line of branch.lines) if (line.portrait) portraits.add(line.portrait.asset)
    }
  }
  return portraits
}
