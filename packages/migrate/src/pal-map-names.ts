import { getPalAuthoredMapName } from '@type-pal/shared/pal-authored-map-names'

const PAL_UNNAMED_MAP_NUMBERS = new Set<number>([104, 164])

/** PAL 物理地图的人读标题；只有已核准的 104/164 可以保留中性占位。 */
export function mapNameFromSourceNumber(mapNum: number): string {
  if (!Number.isInteger(mapNum) || mapNum <= 0)
    throw new Error(`mapNum: 期望正整数，收到 ${mapNum}`)
  const authoredName = getPalAuthoredMapName(mapNum)
  if (authoredName !== undefined) return authoredName
  if (PAL_UNNAMED_MAP_NUMBERS.has(mapNum)) return `PAL 地图 ${mapNum}`
  throw new Error(`PAL 地图 ${mapNum} 缺少一阶段考据名称，且不在未命名 allowlist`)
}
