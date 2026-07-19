import type { MapIndexV1, ProjectMap, StampTemplateV1, TilesetDef } from '@type-pal/content'
import type { EditorState } from './edit-session.js'

export interface TilesetMapScanEntry {
  mapId: string
  mapName: string
  path: string
  tilesetId: string
  maxTileId: number
}

export interface TilesetReferenceScanFailure {
  mapId: string
  mapName: string
  path: string
  message: string
}

export interface TilesetReferenceScan {
  tilesetId: string
  tilesetIds: string[]
  completed: number
  total: number
  maps: TilesetMapScanEntry[]
  mapReferences: TilesetMapScanEntry[]
  stampReferences: Array<Pick<StampTemplateV1, 'id' | 'name' | 'tilesetId'> & { maxTileId: number }>
  failures: TilesetReferenceScanFailure[]
  done: boolean
}

export interface ScanTilesetReferencesInput {
  tilesetId: string
  tilesetIds?: readonly string[]
  mapIndex: MapIndexV1
  stamps: readonly StampTemplateV1[]
  loadMap: (mapId: string) => Promise<ProjectMap>
  onProgress?: (scan: TilesetReferenceScan) => void
}

function snapshot(scan: TilesetReferenceScan): TilesetReferenceScan {
  return {
    ...scan,
    tilesetIds: [...scan.tilesetIds],
    maps: [...scan.maps],
    mapReferences: [...scan.mapReferences],
    stampReferences: [...scan.stampReferences],
    failures: [...scan.failures],
  }
}

function maxMapTileId(map: ProjectMap): number {
  let maximum = -1
  for (const layer of map.layers)
    for (const row of layer.tiles)
      for (const tileId of row) if (tileId !== null && tileId > maximum) maximum = tileId
  return maximum
}

/**
 * 完整 mapIndex 的 fail-closed 瓦片集引用扫描；未加载地图也必须经 loadMap 确认。
 */
export async function scanTilesetReferences(
  input: ScanTilesetReferencesInput,
): Promise<TilesetReferenceScan> {
  const targetIds = [...new Set(input.tilesetIds ?? [input.tilesetId])]
  if (!targetIds.includes(input.tilesetId)) targetIds.unshift(input.tilesetId)
  const targetSet = new Set(targetIds)
  const scan: TilesetReferenceScan = {
    tilesetId: input.tilesetId,
    tilesetIds: targetIds,
    completed: 0,
    total: input.mapIndex.maps.length,
    maps: [],
    mapReferences: [],
    stampReferences: input.stamps
      .filter((stamp) => targetSet.has(stamp.tilesetId))
      .map(({ id, name, tilesetId, visual }) => ({
        id,
        name,
        tilesetId,
        maxTileId: Math.max(...visual.map((member) => member.tileId)),
      })),
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
        maxTileId: maxMapTileId(map),
      }
      scan.maps.push(entry)
      if (targetSet.has(map.tilesetId)) scan.mapReferences.push(entry)
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

/** 完整扫描后生成的缩帧替换许可。 */
export class TilesetReplacementProof {
  readonly tilesetId: string
  readonly frameCount: number
  readonly mapIndex: ReadonlyArray<{ id: string; path: string }>
  readonly asset: string
  readonly previousSha256: string
  readonly definitions: ReadonlyArray<{ id: string; asset: string }>

  private constructor(
    scan: TilesetReferenceScan,
    mapIndex: MapIndexV1,
    frameCount: number,
    options: { asset: string; previousSha256: string; definitions: readonly TilesetDef[] },
  ) {
    this.tilesetId = scan.tilesetId
    this.frameCount = frameCount
    this.mapIndex = mapIndex.maps.map(({ id, path }) => ({ id, path }))
    this.asset = options.asset
    this.previousSha256 = options.previousSha256
    this.definitions = options.definitions.map(({ id, asset }) => ({ id, asset }))
  }

  static fromScan(
    scan: TilesetReferenceScan,
    mapIndex: MapIndexV1,
    frameCount: number,
    options: { asset: string; previousSha256: string; definitions: readonly TilesetDef[] },
  ): TilesetReplacementProof {
    if (!Number.isInteger(frameCount) || frameCount <= 0) throw new Error('替换瓦片集必须含帧')
    if (
      !scan.done ||
      scan.completed !== scan.total ||
      scan.total !== mapIndex.maps.length ||
      scan.failures.length ||
      scan.maps.length !== mapIndex.maps.length ||
      scan.maps.some(
        (entry, index) =>
          entry.mapId !== mapIndex.maps[index]?.id || entry.path !== mapIndex.maps[index]?.path,
      )
    )
      throw new Error('瓦片集引用扫描不完整，不能替换。')
    const badMaps = scan.mapReferences.filter((entry) => entry.maxTileId >= frameCount)
    const badStamps = scan.stampReferences.filter((entry) => entry.maxTileId >= frameCount)
    if (badMaps.length || badStamps.length)
      throw new Error(
        `新瓦片集仅 ${frameCount} 帧，越界引用：${[
          ...badMaps.map((entry) => `地图“${entry.mapName}” #${entry.maxTileId}`),
          ...badStamps.map((entry) => `组合“${entry.name}” #${entry.maxTileId}`),
        ].join('、')}`,
      )
    const expectedIds = options.definitions.map((entry) => entry.id).sort()
    if (expectedIds.join('\0') !== [...scan.tilesetIds].sort().join('\0'))
      throw new Error('共享瓦片集影响范围与引用扫描不一致。')
    if (options.definitions.some((entry) => entry.asset !== options.asset))
      throw new Error('共享瓦片集定义的 AssetId 不一致。')
    return new TilesetReplacementProof(scan, mapIndex, frameCount, options)
  }
}

export function assertTilesetReplacementAllowed(
  state: EditorState,
  tilesetId: string,
  asset: string,
  proof: TilesetReplacementProof | undefined,
): asserts proof is TilesetReplacementProof {
  if (
    !(proof instanceof TilesetReplacementProof) ||
    proof.tilesetId !== tilesetId ||
    proof.asset !== asset
  )
    throw new Error('替换瓦片集前必须完成全工程引用扫描。')
  const record = state.assetCatalog.assets[asset]
  if (!record || record.sha256 !== proof.previousSha256)
    throw new Error('瓦片集资源已变化；请重新扫描。')
  const actualDefinitions = (state.tilesets ?? [])
    .filter((entry) => entry.asset === asset)
    .map(({ id, asset }) => ({ id, asset }))
  if (
    actualDefinitions.length !== proof.definitions.length ||
    actualDefinitions.some(
      (entry, index) =>
        entry.id !== proof.definitions[index]?.id ||
        entry.asset !== proof.definitions[index]?.asset,
    )
  )
    throw new Error('共享瓦片集影响范围已变化；请重新扫描。')
  const currentIndex = state.mapIndex.maps.map(({ id, path }) => ({ id, path }))
  if (!sameIndex(currentIndex, proof.mapIndex)) throw new Error('地图索引已变化；请重新扫描。')
  for (const [mapId, map] of Object.entries(state.maps)) {
    if (
      proof.definitions.some((definition) => definition.id === map.tilesetId) &&
      maxMapTileId(map) >= proof.frameCount
    )
      throw new Error(`地图“${mapId}”出现新的越界瓦片；请重新扫描。`)
  }
  const stamp = state.stamps.find(
    (candidate) =>
      proof.definitions.some((definition) => definition.id === candidate.tilesetId) &&
      candidate.visual.some((member) => member.tileId >= proof.frameCount),
  )
  if (stamp) throw new Error(`组合“${stamp.name}”出现新的越界瓦片；请重新扫描。`)
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
