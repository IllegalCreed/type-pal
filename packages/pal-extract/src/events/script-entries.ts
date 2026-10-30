import type { EnemyObject, Item, ObjectPlayerView, Spell } from '@type-pal/shared'
import type { EventObject, Scene } from '../io/sss.js'
import type { SupplementalEventObject } from './script-corrections.js'

interface ScriptEntrySources {
  scenes: readonly Pick<Scene, 'scriptOnEnter' | 'scriptOnTeleport'>[]
  eventObjects: readonly Pick<EventObject, 'triggerScript' | 'autoScript'>[]
  items: readonly Pick<Item, 'scriptOnUse' | 'scriptOnEquip' | 'scriptOnThrow' | 'scriptDesc'>[]
  spells: readonly Pick<Spell, 'scriptOnUse' | 'scriptOnSuccess' | 'scriptDesc'>[]
  enemyObjects: readonly Pick<
    EnemyObject,
    'scriptOnTurnStart' | 'scriptOnBattleEnd' | 'scriptOnReady'
  >[]
  objectPlayers: readonly Pick<ObjectPlayerView, 'scriptOnFriendDeath' | 'scriptOnDying'>[]
  supplementalObjects?: readonly SupplementalEventObject[]
}

/**
 * Labels must include every parsed script root, including OBJECT hooks outside scenes.
 * Keep source order and aliases: disasm handles labels, while CLI logging counts hook references.
 * Inputs are parsed tables (0 means no entry); returned arrays/root maps are newly caller-owned.
 * Supplemental hooks get labels and explicit scene ownership; they are not global OBJECT hooks.
 * No bytecode traversal, IO or output policy belongs here.
 */
export function collectScriptEntries({
  scenes,
  eventObjects,
  items,
  spells,
  enemyObjects,
  objectPlayers,
  supplementalObjects = [],
}: ScriptEntrySources): {
  entryIps: number[]
  globalScriptEntries: number[]
  sceneExtraRoots: Record<number, number[]>
} {
  const globalScriptEntries: number[] = []
  for (const it of items) {
    if (it.scriptOnUse > 0) globalScriptEntries.push(it.scriptOnUse)
    if (it.scriptOnEquip > 0) globalScriptEntries.push(it.scriptOnEquip)
    if (it.scriptOnThrow > 0) globalScriptEntries.push(it.scriptOnThrow)
    if (it.scriptDesc > 0) globalScriptEntries.push(it.scriptDesc)
  }
  for (const sp of spells) {
    if (sp.scriptOnUse > 0) globalScriptEntries.push(sp.scriptOnUse)
    if (sp.scriptOnSuccess > 0) globalScriptEntries.push(sp.scriptOnSuccess)
    if (sp.scriptDesc > 0) globalScriptEntries.push(sp.scriptDesc)
  }
  for (const eo of enemyObjects) {
    if (eo.scriptOnTurnStart > 0) globalScriptEntries.push(eo.scriptOnTurnStart)
    if (eo.scriptOnBattleEnd > 0) globalScriptEntries.push(eo.scriptOnBattleEnd)
    if (eo.scriptOnReady > 0) globalScriptEntries.push(eo.scriptOnReady)
  }
  for (const op of objectPlayers) {
    if (op.scriptOnFriendDeath > 0) globalScriptEntries.push(op.scriptOnFriendDeath)
    if (op.scriptOnDying > 0) globalScriptEntries.push(op.scriptOnDying)
  }

  const entryIps: number[] = []
  for (const sc of scenes) {
    if (sc.scriptOnEnter > 0) entryIps.push(sc.scriptOnEnter)
    if (sc.scriptOnTeleport > 0) entryIps.push(sc.scriptOnTeleport)
  }
  for (const eo of eventObjects) {
    if (eo.triggerScript > 0) entryIps.push(eo.triggerScript)
    if (eo.autoScript > 0) entryIps.push(eo.autoScript)
  }
  entryIps.push(...globalScriptEntries)

  const sceneExtraRoots: Record<number, number[]> = {}
  for (const entry of supplementalObjects)
    for (const label of [entry.object.triggerLabel, entry.object.autoLabel])
      if (label) {
        const ip = Number(label.slice(2))
        entryIps.push(ip)
        const roots = sceneExtraRoots[entry.sceneId] ?? []
        roots.push(ip)
        sceneExtraRoots[entry.sceneId] = roots
      }

  return { entryIps, globalScriptEntries, sceneExtraRoots }
}
