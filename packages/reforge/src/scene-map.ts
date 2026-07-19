import type { MapIndexV1, ProjectMap, TilesetDef } from '@type-pal/content'
import { mapAssetById, resolveTilesetAsset } from '@type-pal/content'
import type { RleFrame } from '@type-pal/shared'
import { type AssetBase, loadProjectMap, loadTileset } from './assets.js'

export interface SceneMapAssets {
  map: ProjectMap
  tiles: Map<number, RleFrame>
}

/** 唯一加载链：稳定 map id -> map index -> ProjectMap -> tileset registry。 */
export async function loadSceneMap(
  base: AssetBase,
  mapId: string,
  tilesets: readonly TilesetDef[],
  mapIndex: MapIndexV1,
): Promise<SceneMapAssets> {
  const asset = mapAssetById(mapIndex, mapId)
  if (!asset) throw new Error(`loadSceneMap: mapId "${mapId}" 不在 map index`)
  const map = await loadProjectMap(base, asset.path)
  const tiles = await loadTileset(base, resolveTilesetAsset(map.tilesetId, tilesets))
  return { map, tiles }
}
