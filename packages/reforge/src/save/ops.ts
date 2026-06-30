import type { CharacterInstance, Facing, GridPos, WorldState } from '@type-pal/content'
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
  position: { sceneId: string; pos: GridPos; facing: Facing },
  projectId: string,
  contentVersion: number,
): SavePayload {
  return { version: SAVE_VERSION, projectId, contentVersion, world, position }
}

/** 截当前画面 → 缩到 w×h → PNG Blob(浏览器;离屏 canvas)。source 应为干净游戏帧(无 UI 层)。 */
export function captureThumbnail(source: HTMLCanvasElement, w = 64, h = 40): Promise<Blob> {
  const off = document.createElement('canvas')
  off.width = w
  off.height = h
  const c = off.getContext('2d')
  if (!c) return Promise.reject(new Error('thumbnail: no 2d context'))
  c.imageSmoothingEnabled = true
  c.drawImage(source, 0, 0, w, h)
  return new Promise((resolve, reject) => {
    off.toBlob((b) => (b ? resolve(b) : reject(new Error('thumbnail: toBlob null'))), 'image/png')
  })
}
