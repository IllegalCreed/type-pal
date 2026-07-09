/**
 * 场景地图分流(W7a-4)—— 复用原版 ⊕ 自有地图,渲染/碰撞下游共用一套代码。
 * 唯一分歧:Tilemap 从哪读(复用→assets/maps/<原版号>.json;自有→工程内 content 路径,经 source)。
 * tileset 统一从 map.tileset 字段解析,故两支返回同形 {map, tiles}。
 * 引擎(main.getMapAssets)+ 编辑器(useSceneAssets)共用此分流,避免各写一遍地图加载。
 */
import type { SceneMap } from '@type-pal/content'
import { isReuseMap } from '@type-pal/content'
import type { RleFrame, Tilemap } from '@type-pal/shared'
import { type AssetBase, loadOwnMap, loadTilemap, loadTilesetByPath } from './assets.js'

export interface SceneMapAssets {
  map: Tilemap
  tiles: Map<number, RleFrame>
}

/** 按 SceneMap 类型加载地图 + tileset。复用→原版号取图;自有→工程 content 路径取图;tileset 皆自 map.tileset。 */
export async function loadSceneMap(base: AssetBase, sceneMap: SceneMap): Promise<SceneMapAssets> {
  const map = isReuseMap(sceneMap)
    ? await loadTilemap(base, sceneMap.reuseOriginalMap)
    : await loadOwnMap(base, sceneMap.ownMap)
  const tiles = await loadTilesetByPath(base, map.tileset)
  return { map, tiles }
}
