import { getPalAuthoredMapName } from '@type-pal/shared/pal-authored-map-names'

/** mapNum → 人读地名；缺名保持一阶段工具既有的 `地图N` 回退。 */
export function getMapName(mapNum: number): string {
  return getPalAuthoredMapName(mapNum) ?? `地图${mapNum}`
}

/** 是否有考据地名（缺名时调用方可决定显隐/样式）。 */
export function hasMapName(mapNum: number): boolean {
  return getPalAuthoredMapName(mapNum) !== undefined
}
