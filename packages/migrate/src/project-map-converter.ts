import { formatProjectMapV2, type MapLayerV2, type ProjectMapV2 } from '@type-pal/content'
import type { Tilemap } from '@type-pal/shared'

export const SOURCE_MAP_RESIDUAL_MASK = 0xe000c000
export const SOURCE_MAP_MODELED_MASK = 0x1fff3fff

export function mapIdFromSourceNumber(mapNum: number): string {
  if (!Number.isInteger(mapNum) || mapNum <= 0)
    throw new Error(`mapNum: 期望正整数，收到 ${mapNum}`)
  return `map-${String(mapNum).padStart(3, '0')}`
}

export function tilesetIdFromSourceNumber(mapNum: number): string {
  if (!Number.isInteger(mapNum) || mapNum <= 0)
    throw new Error(`mapNum: 期望正整数，收到 ${mapNum}`)
  return `tileset-${String(mapNum).padStart(3, '0')}`
}

export interface DecodedSourceWord {
  layer0Tile: number
  layer0Height: number
  layer1Tile: number | null
  layer1Height: number
  collision: number
  residualBits: number
  /** 原始上层编码值；0 表示空瓦片。 */
  encodedLayer1Tile: number
}

/** 旧 packed word 的唯一解码边界。 */
export function decodeSourceMapWord(word: number): DecodedSourceWord {
  const value = word >>> 0
  const encodedLayer1Tile = ((value >>> 16) & 0xff) | ((value >>> 20) & 0x100)
  return {
    layer0Tile: (value & 0xff) | ((value >>> 4) & 0x100),
    layer0Height: (value >>> 8) & 0x0f,
    layer1Tile: encodedLayer1Tile === 0 ? null : encodedLayer1Tile - 1,
    layer1Height: encodedLayer1Tile === 0 ? 0 : (value >>> 24) & 0x0f,
    collision: value & 0x2000 ? 1 : 0,
    residualBits: (value & SOURCE_MAP_RESIDUAL_MASK) >>> 0,
    encodedLayer1Tile,
  }
}

export function encodeProjectMapWord(
  layer0Tile: number,
  layer0Height: number,
  layer1Tile: number | null,
  layer1Height: number,
  collision: number,
): number {
  const encodedLayer1 = layer1Tile === null ? 0 : layer1Tile + 1
  if (layer0Tile < 0 || layer0Tile > 0x1ff)
    throw new Error(`layer0 tile 超出旧格式可回编码范围: ${layer0Tile}`)
  if (encodedLayer1 < 0 || encodedLayer1 > 0x1ff)
    throw new Error(`layer1 tile 超出旧格式可回编码范围: ${String(layer1Tile)}`)
  if (layer0Height < 0 || layer0Height > 0x0f || layer1Height < 0 || layer1Height > 0x0f)
    throw new Error('height 超出旧格式可回编码范围 0..15')
  let word = layer0Tile & 0xff
  word |= (layer0Tile & 0x100) << 4
  word |= (layer0Height & 0x0f) << 8
  if (collision !== 0) word |= 0x2000
  word |= (encodedLayer1 & 0xff) << 16
  word |= (layer1Height & 0x0f) << 24
  word |= (encodedLayer1 & 0x100) << 20
  return word >>> 0
}

function matrix<T>(rows: number, cols: number, value: T): T[][] {
  return Array.from({ length: rows }, () => Array<T>(cols).fill(value))
}

function assertSourceShape(source: Tilemap): void {
  if (!Number.isInteger(source.width) || source.width <= 0)
    throw new Error('tilemap.width 非正整数')
  if (!Number.isInteger(source.height) || source.height <= 0)
    throw new Error('tilemap.height 非正整数')
  if (source.cells.length !== source.height)
    throw new Error(`tilemap.cells: 期望 ${source.height} 行，收到 ${source.cells.length}`)
  source.cells.forEach((row, index) => {
    if (row.length !== source.width)
      throw new Error(`tilemap.cells[${index}]: 期望 ${source.width} 列，收到 ${row.length}`)
  })
}

/** 把一张旧源图无损展开为工程唯一 ProjectMapV2。 */
export function convertSourceTilemap(mapNum: number, source: Tilemap): ProjectMapV2 {
  assertSourceShape(source)
  const rows = source.height * 2
  const layer0Tiles = matrix<number | null>(rows, source.width, null)
  const layer0Heights = matrix(rows, source.width, 0)
  const layer1Tiles = matrix<number | null>(rows, source.width, null)
  const layer1Heights = matrix(rows, source.width, 0)
  const collision = matrix(rows, source.width, 0)

  for (let row = 0; row < source.height; row++) {
    for (let col = 0; col < source.width; col++) {
      const cell = source.cells[row]![col]!
      for (let sub = 0; sub < 2; sub++) {
        const targetRow = row * 2 + sub
        const decoded = decodeSourceMapWord(sub === 0 ? cell.lower : cell.upper)
        layer0Tiles[targetRow]![col] = decoded.layer0Tile
        layer0Heights[targetRow]![col] = decoded.layer0Height
        layer1Tiles[targetRow]![col] = decoded.layer1Tile
        layer1Heights[targetRow]![col] = decoded.layer1Height
        collision[targetRow]![col] = decoded.collision
      }
    }
  }

  const layers: MapLayerV2[] = [
    {
      id: 'layer-0',
      name: '下层',
      depthMode: 'height',
      tiles: layer0Tiles,
      heights: layer0Heights,
    },
    {
      id: 'layer-1',
      name: '上层',
      depthMode: 'height',
      tiles: layer1Tiles,
      heights: layer1Heights,
    },
  ]
  return {
    version: 2,
    width: source.width,
    height: source.height,
    tilesetId: tilesetIdFromSourceNumber(mapNum),
    layers,
    collision,
  }
}

export function sourceWordFromProjectMap(
  map: ProjectMapV2,
  latticeRow: number,
  col: number,
): number {
  const lower = map.layers[0]
  const upper = map.layers[1]
  if (!lower || !upper) throw new Error('源图回编码要求 layer-0/layer-1 两层')
  return encodeProjectMapWord(
    lower.tiles[latticeRow]![col]!,
    lower.heights![latticeRow]![col]!,
    upper.tiles[latticeRow]![col]!,
    upper.heights![latticeRow]![col]!,
    map.collision[latticeRow]![col]!,
  )
}

export function formattedProjectMapBytes(map: ProjectMapV2): number {
  return Buffer.byteLength(formatProjectMapV2(map), 'utf8')
}
