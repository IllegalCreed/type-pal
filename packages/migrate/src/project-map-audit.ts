import { formatProjectMapV2, type ProjectMapV2 } from '@type-pal/content'
import type { Tilemap } from '@type-pal/shared'
import {
  convertSourceTilemap,
  decodeSourceMapWord,
  SOURCE_MAP_MODELED_MASK,
  sourceWordFromProjectMap,
} from './project-map-converter.js'

export interface SourceMapAuditEntry {
  mapNum: number
  source: Tilemap
  sourceJsonBytes: number
}

export interface ProjectMapAuditReport {
  mapCount: number
  latticeInstances: number
  residualWordCount: number
  emptyLayer1NonzeroHeightCount: number
  emptyLayer1NonzeroHeightWords: Array<{
    mapNum: number
    row: number
    col: number
    sub: 0 | 1
    word: number
    height: number
  }>
  layer0NonzeroHeightCount: number
  layer1NonzeroHeightCount: number
  collisionInstanceCount: number
  multiHeightTilesetTileCount: number
  /** 原始引擎从不读取的 bits 14-15/29-31；仅报告，不写入作者态 schema。 */
  residualWords: Array<{
    mapNum: number
    row: number
    col: number
    sub: 0 | 1
    word: number
    residualBits: number
  }>
  rawRoundTripMismatchCount: number
  semanticRoundTripMismatchCount: number
  sourceJsonBytes: number
  projectMapJsonBytes: number
  sizeRatio: number
}

export interface ProjectMapAuditResult {
  maps: Map<number, ProjectMapV2>
  report: ProjectMapAuditReport
}

/** 全量、逐 word 的可复现迁移审计。 */
export function auditAndConvertSourceMaps(
  entries: readonly SourceMapAuditEntry[],
): ProjectMapAuditResult {
  const maps = new Map<number, ProjectMapV2>()
  const heightsByTilesetTile = new Map<string, Set<number>>()
  let latticeInstances = 0
  let residualWordCount = 0
  let emptyLayer1NonzeroHeightCount = 0
  const emptyLayer1NonzeroHeightWords: ProjectMapAuditReport['emptyLayer1NonzeroHeightWords'] = []
  let layer0NonzeroHeightCount = 0
  let layer1NonzeroHeightCount = 0
  let collisionInstanceCount = 0
  const residualWords: ProjectMapAuditReport['residualWords'] = []
  let rawRoundTripMismatchCount = 0
  let semanticRoundTripMismatchCount = 0
  let sourceJsonBytes = 0
  let projectMapJsonBytes = 0

  for (const entry of entries) {
    if (maps.has(entry.mapNum)) throw new Error(`重复源地图编号 ${entry.mapNum}`)
    const map = convertSourceTilemap(entry.mapNum, entry.source)
    maps.set(entry.mapNum, map)
    sourceJsonBytes += entry.sourceJsonBytes
    projectMapJsonBytes += Buffer.byteLength(formatProjectMapV2(map), 'utf8')

    for (let row = 0; row < entry.source.height; row++) {
      for (let col = 0; col < entry.source.width; col++) {
        const cell = entry.source.cells[row]![col]!
        for (let sub = 0; sub < 2; sub++) {
          latticeInstances++
          const latticeRow = row * 2 + sub
          const sourceWord = (sub === 0 ? cell.lower : cell.upper) >>> 0
          const decoded = decodeSourceMapWord(sourceWord)
          if (decoded.residualBits !== 0) {
            residualWordCount++
            residualWords.push({
              mapNum: entry.mapNum,
              row,
              col,
              sub: sub as 0 | 1,
              word: sourceWord,
              residualBits: decoded.residualBits,
            })
          }
          if (decoded.encodedLayer1Tile === 0 && ((sourceWord >>> 24) & 0x0f) !== 0) {
            emptyLayer1NonzeroHeightCount++
            emptyLayer1NonzeroHeightWords.push({
              mapNum: entry.mapNum,
              row,
              col,
              sub: sub as 0 | 1,
              word: sourceWord,
              height: (sourceWord >>> 24) & 0x0f,
            })
          }
          if (decoded.layer0Height !== 0) layer0NonzeroHeightCount++
          if (decoded.layer1Height !== 0) layer1NonzeroHeightCount++
          if (decoded.collision !== 0) collisionInstanceCount++
          const lowerKey = `${map.tilesetId}:0:${decoded.layer0Tile}`
          const lowerHeights = heightsByTilesetTile.get(lowerKey) ?? new Set<number>()
          lowerHeights.add(decoded.layer0Height)
          heightsByTilesetTile.set(lowerKey, lowerHeights)
          if (decoded.layer1Tile !== null) {
            const upperKey = `${map.tilesetId}:1:${decoded.layer1Tile}`
            const upperHeights = heightsByTilesetTile.get(upperKey) ?? new Set<number>()
            upperHeights.add(decoded.layer1Height)
            heightsByTilesetTile.set(upperKey, upperHeights)
          }
          const encoded = sourceWordFromProjectMap(map, latticeRow, col)
          if (encoded !== sourceWord) rawRoundTripMismatchCount++
          const encodedDecoded = decodeSourceMapWord(encoded)
          if (
            encodedDecoded.layer0Tile !== decoded.layer0Tile ||
            encodedDecoded.layer0Height !== decoded.layer0Height ||
            encodedDecoded.layer1Tile !== decoded.layer1Tile ||
            encodedDecoded.layer1Height !== decoded.layer1Height ||
            encodedDecoded.collision !== decoded.collision ||
            ((encoded ^ sourceWord) & SOURCE_MAP_MODELED_MASK & ~0x0f000000) !== 0
          )
            semanticRoundTripMismatchCount++
        }
      }
    }
  }

  const multiHeightTilesetTileCount = [...heightsByTilesetTile.values()].filter(
    (heights) => heights.size > 1,
  ).length
  const report: ProjectMapAuditReport = {
    mapCount: entries.length,
    latticeInstances,
    residualWordCount,
    emptyLayer1NonzeroHeightCount,
    emptyLayer1NonzeroHeightWords,
    layer0NonzeroHeightCount,
    layer1NonzeroHeightCount,
    collisionInstanceCount,
    multiHeightTilesetTileCount,
    residualWords,
    rawRoundTripMismatchCount,
    semanticRoundTripMismatchCount,
    sourceJsonBytes,
    projectMapJsonBytes,
    sizeRatio: sourceJsonBytes === 0 ? 0 : projectMapJsonBytes / sourceJsonBytes,
  }
  if (semanticRoundTripMismatchCount !== 0)
    throw new Error(`地图审计失败：${semanticRoundTripMismatchCount} 个源 word 无法语义位往返`)
  return { maps, report }
}
