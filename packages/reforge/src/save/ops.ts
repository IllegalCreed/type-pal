import type { AssetId, CharacterInstance, Facing, GridPos, WorldState } from '@type-pal/content'
import { CONTENT_VERSION } from '@type-pal/content'
import {
  type CurrentSavePayload,
  SAVE_VERSION,
  type SaveMeta,
  type SlotId,
  slotKind,
} from './types.js'

/** 队伍显示快照：名字、等级、地图和时间均由调用方提供，不读取全局状态。 */
export function buildMeta(
  slotId: SlotId,
  world: { party: readonly CharacterInstance[] },
  mapName: string,
  nameOf: (character: CharacterInstance) => string,
  now: number,
  savedTimes?: number,
): SaveMeta {
  return {
    slotId,
    kind: slotKind(slotId),
    party: world.party.map((character) => ({
      name: nameOf(character),
      level: character.level,
    })),
    mapName,
    savedAt: now,
    ...(savedTimes !== undefined ? { savedTimes } : {}),
  }
}

/** 当前产品唯一存档 builder。 */
export function buildCurrentSavePayload(
  world: WorldState,
  position: { sceneId: string; pos: GridPos; facing: Facing },
  projectId: string,
): CurrentSavePayload {
  return { version: SAVE_VERSION, projectId, contentVersion: CONTENT_VERSION, world, position }
}

export interface RestoredMusicDecision {
  currentMusic: AssetId | null | undefined
  action: 'play' | 'stop'
}

/** 读档不能继承读档前世界的曲目：存档值优先，其次目标场景，否则明确停止。 */
export function resolveRestoredMusic(
  saved: AssetId | null | undefined,
  sceneDefault: AssetId | null | undefined,
): RestoredMusicDecision {
  const currentMusic = saved !== undefined ? saved : sceneDefault
  return currentMusic === undefined || currentMusic === null
    ? { currentMusic, action: 'stop' }
    : { currentMusic, action: 'play' }
}

/** 截当前画面并生成存档缩略图。 */
export function captureThumbnail(source: HTMLCanvasElement, w = 64, h = 40): Promise<Blob> {
  const offscreen = document.createElement('canvas')
  offscreen.width = w
  offscreen.height = h
  const context = offscreen.getContext('2d')
  if (!context) return Promise.reject(new Error('thumbnail: no 2d context'))
  context.imageSmoothingEnabled = true
  context.drawImage(source, 0, 0, w, h)
  return new Promise((resolve, reject) => {
    offscreen.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('thumbnail: toBlob null'))),
      'image/png',
    )
  })
}
