import type { CharacterInstance, Facing, WorldState } from '@type-pal/content'
import { SAVE_VERSION, type SaveMeta, type SavePayload, type SlotId, slotKind } from './types.js'

/** 队伍显示快照：名字(已解析,nameOf 注入)+ 等级。now 注入(Date.now())。 */
export function buildMeta(
  slotId: SlotId,
  world: WorldState,
  mapName: string,
  nameOf: (c: CharacterInstance) => string,
  now: number,
): SaveMeta {
  return {
    slotId,
    kind: slotKind(slotId),
    party: world.party.map((c) => ({ name: nameOf(c), level: c.level })),
    mapName,
    savedAt: now,
  }
}

export function buildPayload(
  world: WorldState,
  position: { sceneId: string; x: number; y: number; facing: Facing },
): SavePayload {
  return { version: SAVE_VERSION, world, position }
}
