/**
 * 场景地图分流(W7D)—— 复用原版走旧 Tilemap,自有地图走 OwnMap v1。
 * tileset 统一从 map.tileset 字段解析,两支汇成 {map: Tilemap | OwnMap, tiles}。
 * 引擎(main.getMapAssets)+ 编辑器(useSceneAssets)共用此分流,避免各写一遍地图加载。
 */
import type { SceneMap } from '@type-pal/content'
import { isReuseMap } from '@type-pal/content'
import type { OwnMap } from '@type-pal/content'
import type { RleFrame, Tilemap } from '@type-pal/shared'
import { type AssetBase, loadOwnMap, loadTilemap, loadTilesetByPath } from './assets.js'

export interface SceneMapAssets {
  map: Tilemap | OwnMap
  tiles: Map<number, RleFrame>
}

/** 复用图保持旧 Tilemap；自有图走 OwnMap v1。两路只在此处汇成渲染联合。 */
export async function loadSceneMap(base: AssetBase, sceneMap: SceneMap): Promise<SceneMapAssets> {
  const map = isReuseMap(sceneMap)
    ? await loadTilemap(base, sceneMap.reuseOriginalMap)
    : await loadOwnMap(base, sceneMap.ownMap)
  const tiles = await loadTilesetByPath(base, map.tileset)
  return { map, tiles }
}
