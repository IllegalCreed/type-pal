/** Supply explicitly authored additions while preserving every existing event object's state. */
import type { SceneEventObject } from '@type-pal/shared'
import { type GameState, type NpcState, npcFromEventObject } from './game-state.js'

function sameDefinition(npc: NpcState, definition: SceneEventObject): boolean {
  return (
    npc.id === definition.id &&
    npc.spriteNum === definition.spriteNum &&
    npc.triggerLabel === definition.triggerLabel &&
    npc.autoLabel === definition.autoLabel &&
    npc.triggerMode === definition.triggerMode &&
    npc.nSpriteFrames === definition.nSpriteFrames
  )
}

/** Native ranges remain unchanged. A scene's supplemental definitions are merged after slicing;
 * old saves receive missing tail objects, and current saves retain the existing global reference.
 * Unknown ID collisions and gaps are never overwritten or filled with invented native objects.
 */
export function supplySupplementalSceneObjects(
  gs: Pick<GameState, 'npcs' | 'allEventObjects'>,
  definitions: readonly SceneEventObject[],
): void {
  for (const definition of definitions) {
    if (!definition.supplemental || gs.npcs.some((npc) => npc.id === definition.id)) continue
    let object = gs.allEventObjects?.[definition.id]
    if (object && !sameDefinition(object, definition)) continue
    if (!object) {
      if (gs.allEventObjects && definition.id !== gs.allEventObjects.length) continue
      object = npcFromEventObject(definition)
      gs.allEventObjects?.push(object)
    }
    gs.npcs.push(object)
  }
}
