import {
  getPalAuthoredMapName,
  hasPalAuthoredMapName,
} from '@type-pal/shared/pal-authored-map-names'

import { localize } from '../localization/language.js'
import { ENGLISH_MAP_NAMES } from '../localization/map-names-en.js'

/** mapNum → 人读地名；缺名保持一阶段工具既有的 `地图N` 回退。 */
export function getMapName(mapNum: number): string {
  return localize(
    getPalAuthoredMapName(mapNum) ?? `地图${mapNum}`,
    ENGLISH_MAP_NAMES[mapNum] ?? `Map ${mapNum}`,
  )
}

/** 是否有考据地名（缺名时调用方可决定显隐/样式）。 */
export function hasMapName(mapNum: number): boolean {
  return hasPalAuthoredMapName(mapNum)
}
