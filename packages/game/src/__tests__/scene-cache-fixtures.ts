/** Independent cache fetchers: different defaults and failure policies stay explicit. */
import { vi } from 'vitest'
import type { SceneAssets } from '../assets/loader.js'
import { legalPalette, legalSceneAssets, legalTilemap } from './asset-fixtures.js'

export function makeLruSceneFetcher() {
  return vi.fn(
    async (sceneId: number): Promise<SceneAssets> => ({
      sceneId,
      mapNum: sceneId + 10,
      tilemap: legalTilemap(`tileset/${sceneId + 10}.rle`),
      palette: legalPalette(),
      eventObjects: [],
      npcSprites: new Map(),
      eventCommands: [],
      labelMap: {},
    }),
  )
}

export function countingSceneFetcher(rejectId?: number, message = 'scene down') {
  const calls: number[] = []
  const fetcher = async (sceneId: number): Promise<SceneAssets> => {
    calls.push(sceneId)
    if (sceneId === rejectId) throw new Error(message)
    return legalSceneAssets(sceneId)
  }
  const count = (sceneId: number) => calls.filter((id) => id === sceneId).length
  return { fetcher, count }
}
