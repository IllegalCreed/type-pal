import type { MapIndexV1, ProjectMap, StampTemplateV1 } from '@type-pal/content'
import type { EditorState } from './edit-session.js'

export interface TilesetMapScanEntry {
  mapId: string
  mapName: string
  path: string
  tilesetId: string
}

export interface TilesetReferenceScanFailure {
  mapId: string
  mapName: string
  path: string
  message: string
}

export interface TilesetReferenceScan {
  tilesetId: string
  completed: number
  total: number
  maps: TilesetMapScanEntry[]
  mapReferences: TilesetMapScanEntry[]
  stampReferences: Array<Pick<StampTemplateV1, 'id' | 'name' | 'tilesetId'>>
  failures: TilesetReferenceScanFailure[]
  done: boolean
}

export interface ScanTilesetReferencesInput {
  tilesetId: string
  mapIndex: MapIndexV1
  stamps: readonly StampTemplateV1[]
  loadMap: (mapId: string) => Promise<ProjectMap>
  onProgress?: (scan: TilesetReferenceScan) => void
}

function snapshot(scan: TilesetReferenceScan): TilesetReferenceScan {
  return {
    ...scan,
    maps: [...scan.maps],
    mapReferences: [...scan.mapReferences],
    stampReferences: [...scan.stampReferences],
    failures: [...scan.failures],
  }
}

/**
 * 完整 mapIndex 的 fail-closed 瓦片集引用扫描；未加载地图也必须经 loadMap 确认。
 */
export async function scanTilesetReferences(
  input: ScanTilesetReferencesInput,
): Promise<TilesetReferenceScan> {
  const scan: TilesetReferenceScan = {
    tilesetId: input.tilesetId,
    completed: 0,
    total: input.mapIndex.maps.length,
    maps: [],
    mapReferences: [],
    stampReferences: input.stamps
      .filter((stamp) => stamp.tilesetId === input.tilesetId)
      .map(({ id, name, tilesetId }) => ({ id, name, tilesetId })),
    failures: [],
    done: false,
  }
  input.onProgress?.(snapshot(scan))
  for (const asset of input.mapIndex.maps) {
    try {
      const map = await input.loadMap(asset.id)
      const entry = {
        mapId: asset.id,
        mapName: asset.name,
        path: asset.path,
        tilesetId: map.tilesetId,
      }
      scan.maps.push(entry)
      if (map.tilesetId === input.tilesetId) scan.mapReferences.push(entry)
    } catch (cause) {
      scan.failures.push({
        mapId: asset.id,
        mapName: asset.name,
        path: asset.path,
        message: cause instanceof Error ? cause.message : String(cause),
      })
    }
    scan.completed += 1
    input.onProgress?.(snapshot(scan))
  }
  scan.done = true
  const result = snapshot(scan)
  input.onProgress?.(result)
  return result
}

/** 只能由完整零引用扫描生成；Command 仍会用当前 EditorState 自校验。 */
export class TilesetRemovalProof {
  readonly tilesetId: string
  readonly mapIndex: ReadonlyArray<{ id: string; path: string }>
  readonly scannedMaps: ReadonlyArray<{ id: string; path: string; tilesetId: string }>

  private constructor(scan: TilesetReferenceScan, mapIndex: MapIndexV1) {
    this.tilesetId = scan.tilesetId
    this.mapIndex = mapIndex.maps.map(({ id, path }) => ({ id, path }))
    this.scannedMaps = scan.maps.map(({ mapId: id, path, tilesetId }) => ({
      id,
      path,
      tilesetId,
    }))
  }

  static fromScan(scan: TilesetReferenceScan, mapIndex: MapIndexV1): TilesetRemovalProof {
    if (!scan.done || scan.completed !== scan.total || scan.failures.length > 0)
      throw new Error('瓦片集引用扫描不完整，不能生成删除许可。')
    if (
      scan.total !== mapIndex.maps.length ||
      scan.maps.length !== mapIndex.maps.length ||
      scan.maps.some(
        (entry, index) =>
          entry.mapId !== mapIndex.maps[index]?.id || entry.path !== mapIndex.maps[index]?.path,
      )
    )
      throw new Error('瓦片集引用扫描未覆盖完整地图索引。')
    if (scan.mapReferences.length > 0 || scan.stampReferences.length > 0)
      throw new Error('瓦片集仍被地图或组合模板引用，不能移除。')
    return new TilesetRemovalProof(scan, mapIndex)
  }
}

function sameIndex(
  actual: readonly { id: string; path: string }[],
  expected: readonly { id: string; path: string }[],
): boolean {
  return (
    actual.length === expected.length &&
    actual.every((entry, index) => {
      const other = expected[index]
      return entry.id === other?.id && entry.path === other.path
    })
  )
}

/** Command 层最后防线：许可必须完整，且当前已加载地图/模板不得新增引用。 */
export function assertTilesetRemovalAllowed(
  state: EditorState,
  tilesetId: string,
  proof: TilesetRemovalProof | undefined,
): asserts proof is TilesetRemovalProof {
  if (!(proof instanceof TilesetRemovalProof) || proof.tilesetId !== tilesetId)
    throw new Error('移除瓦片集前必须完成全工程引用扫描。')
  const currentIndex = state.mapIndex.maps.map(({ id, path }) => ({ id, path }))
  if (!sameIndex(currentIndex, proof.mapIndex))
    throw new Error('地图索引已变化；请重新扫描瓦片集引用。')
  if (
    proof.scannedMaps.length !== proof.mapIndex.length ||
    proof.scannedMaps.some(
      (entry, index) =>
        entry.id !== proof.mapIndex[index]?.id ||
        entry.path !== proof.mapIndex[index]?.path ||
        entry.tilesetId === tilesetId,
    )
  )
    throw new Error('瓦片集删除许可不完整或仍含地图引用。')
  const stamp = state.stamps.find((candidate) => candidate.tilesetId === tilesetId)
  if (stamp) throw new Error(`瓦片集仍被组合模板“${stamp.name}”（${stamp.id}）引用。`)
  const loadedMap = Object.entries(state.maps).find(([, map]) => map.tilesetId === tilesetId)
  if (loadedMap) throw new Error(`瓦片集仍被地图“${loadedMap[0]}”引用。`)
}
