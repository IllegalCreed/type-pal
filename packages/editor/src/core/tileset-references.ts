import type {
  IsometricMapContent,
  MapIndexV1,
  ProjectMap,
  StampTemplate,
  TilesetDef,
} from '@type-pal/content'
import type { EditorState } from './edit-session.js'

export interface TilesetMapScanEntry {
  mapId: string
  mapName: string
  path: string
  tilesetIds: string[]
  maxTileIdByTileset: Record<string, number>
}

export interface TilesetReferenceEntry {
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
  mapReferences: TilesetReferenceEntry[]
  stampReferences: Array<{ id: string; name: string; tilesetId: string; maxTileId: number }>
  failures: TilesetReferenceScanFailure[]
  done: boolean
}

export interface ScanTilesetReferencesInput {
  tilesetId: string
  tilesetIds?: readonly string[]
  mapIndex: MapIndexV1
  stamps: readonly StampTemplate[]
  loadMap: (mapId: string) => Promise<ProjectMap>
  onProgress?: (scan: TilesetReferenceScan) => void
}

function snapshot(scan: TilesetReferenceScan): TilesetReferenceScan {
  return {
    ...scan,
    tilesetIds: [...scan.tilesetIds],
    maps: scan.maps.map((entry) => ({
      ...entry,
      tilesetIds: [...entry.tilesetIds],
      maxTileIdByTileset: { ...entry.maxTileIdByTileset },
    })),
    mapReferences: [...scan.mapReferences],
    stampReferences: [...scan.stampReferences],
    failures: [...scan.failures],
  }
}

function maxTileIds(
  content: Pick<IsometricMapContent<number | null>, 'tilesetRefs' | 'layers'>,
): Record<string, number> {
  const result = Object.fromEntries(content.tilesetRefs.map((tilesetId) => [tilesetId, -1]))
  for (const layer of content.layers)
    for (let row = 0; row < layer.tiles.length; row++)
      for (let col = 0; col < (layer.tiles[row]?.length ?? 0); col++) {
        const tileId = layer.tiles[row]?.[col]
        const source = layer.sources[row]?.[col]
        if (tileId === null || tileId === undefined || source === null || source === undefined)
          continue
        const tilesetId = content.tilesetRefs[source]
        if (tilesetId) result[tilesetId] = Math.max(result[tilesetId] ?? -1, tileId)
      }
  return result
}

function stampReferences(
  stamps: readonly StampTemplate[],
  targetSet: ReadonlySet<string>,
): TilesetReferenceScan['stampReferences'] {
  return stamps.flatMap((stamp) => {
    const maxima = maxTileIds(stamp)
    return stamp.tilesetRefs.flatMap((tilesetId) =>
      targetSet.has(tilesetId)
        ? [{ id: stamp.id, name: stamp.name, tilesetId, maxTileId: maxima[tilesetId] ?? -1 }]
        : [],
    )
  })
}

/** 完整 mapIndex 的 fail-closed 瓦片集引用扫描；每个格子的来源都参与。 */
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
    stampReferences: stampReferences(input.stamps, targetSet),
    failures: [],
    done: false,
  }
  input.onProgress?.(snapshot(scan))
  for (const asset of input.mapIndex.maps) {
    try {
      const map = await input.loadMap(asset.id)
      const maxima = maxTileIds(map)
      const entry: TilesetMapScanEntry = {
        mapId: asset.id,
        mapName: asset.name,
        path: asset.path,
        tilesetIds: [...map.tilesetRefs],
        maxTileIdByTileset: maxima,
      }
      scan.maps.push(entry)
      for (const tilesetId of map.tilesetRefs)
        if (targetSet.has(tilesetId))
          scan.mapReferences.push({
            mapId: asset.id,
            mapName: asset.name,
            path: asset.path,
            tilesetId,
            maxTileId: maxima[tilesetId] ?? -1,
          })
    } catch (cause) {
      scan.failures.push({
        mapId: asset.id,
        mapName: asset.name,
        path: asset.path,
        message: cause instanceof Error ? cause.message : String(cause),
      })
    }
    scan.completed++
    input.onProgress?.(snapshot(scan))
  }
  scan.done = true
  const result = snapshot(scan)
  input.onProgress?.(result)
  return result
}

export class TilesetRemovalProof {
  readonly tilesetId: string
  readonly mapIndex: ReadonlyArray<{ id: string; path: string }>
  readonly scannedMaps: ReadonlyArray<{ id: string; path: string; tilesetIds: string[] }>

  private constructor(scan: TilesetReferenceScan, mapIndex: MapIndexV1) {
    this.tilesetId = scan.tilesetId
    this.mapIndex = mapIndex.maps.map(({ id, path }) => ({ id, path }))
    this.scannedMaps = scan.maps.map(({ mapId: id, path, tilesetIds }) => ({
      id,
      path,
      tilesetIds: [...tilesetIds],
    }))
  }

  static fromScan(scan: TilesetReferenceScan, mapIndex: MapIndexV1): TilesetRemovalProof {
    if (!scan.done || scan.completed !== scan.total || scan.failures.length)
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
    if (scan.mapReferences.length || scan.stampReferences.length)
      throw new Error('瓦片集仍被地图或组合模板引用，不能移除。')
    return new TilesetRemovalProof(scan, mapIndex)
  }
}

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
      scan.maps.length !== mapIndex.maps.length
    )
      throw new Error('瓦片集引用扫描不完整，不能替换。')
    const badMaps = scan.mapReferences.filter(({ maxTileId }) => maxTileId >= frameCount)
    const badStamps = scan.stampReferences.filter(({ maxTileId }) => maxTileId >= frameCount)
    if (badMaps.length || badStamps.length)
      throw new Error(
        `新瓦片集仅 ${frameCount} 帧，越界引用：${[
          ...badMaps.map((entry) => `地图“${entry.mapName}” #${entry.maxTileId}`),
          ...badStamps.map((entry) => `组合“${entry.name}” #${entry.maxTileId}`),
        ].join('、')}`,
      )
    const expectedIds = options.definitions.map(({ id }) => id).sort()
    if (expectedIds.join('\0') !== [...scan.tilesetIds].sort().join('\0'))
      throw new Error('共享瓦片集影响范围与引用扫描不一致。')
    if (options.definitions.some((entry) => entry.asset !== options.asset))
      throw new Error('共享瓦片集定义的 AssetId 不一致。')
    return new TilesetReplacementProof(scan, mapIndex, frameCount, options)
  }
}

function sameIndex(
  actual: readonly { id: string; path: string }[],
  expected: readonly { id: string; path: string }[],
): boolean {
  return (
    actual.length === expected.length &&
    actual.every(
      (entry, index) => entry.id === expected[index]?.id && entry.path === expected[index]?.path,
    )
  )
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
    throw new Error('替换瓦片集前必须完成全项目引用扫描。')
  const record = state.assetCatalog.assets[asset]
  if (!record || record.sha256 !== proof.previousSha256)
    throw new Error('瓦片集资源已变化；请重新扫描。')
  const actualDefinitions = (state.tilesets ?? [])
    .filter((entry) => entry.asset === asset)
    .map(({ id, asset: definitionAsset }) => ({ id, asset: definitionAsset }))
  if (JSON.stringify(actualDefinitions) !== JSON.stringify(proof.definitions))
    throw new Error('共享瓦片集影响范围已变化；请重新扫描。')
  if (!sameIndex(state.mapIndex.maps, proof.mapIndex))
    throw new Error('地图索引已变化；请重新扫描。')
  const definitionIds = new Set(proof.definitions.map(({ id }) => id))
  for (const [mapId, map] of Object.entries(state.maps)) {
    const maxima = maxTileIds(map)
    const bad = map.tilesetRefs.find(
      (id) => definitionIds.has(id) && (maxima[id] ?? -1) >= proof.frameCount,
    )
    if (bad) throw new Error(`地图“${mapId}”出现新的越界瓦片；请重新扫描。`)
  }
  const stamp = state.stamps.find((candidate) => {
    const maxima = maxTileIds(candidate)
    return candidate.tilesetRefs.some(
      (id) => definitionIds.has(id) && (maxima[id] ?? -1) >= proof.frameCount,
    )
  })
  if (stamp) throw new Error(`组合“${stamp.name}”出现新的越界瓦片；请重新扫描。`)
}

export function assertTilesetRemovalAllowed(
  state: EditorState,
  tilesetId: string,
  proof: TilesetRemovalProof | undefined,
): asserts proof is TilesetRemovalProof {
  if (!(proof instanceof TilesetRemovalProof) || proof.tilesetId !== tilesetId)
    throw new Error('移除瓦片集前必须完成全项目引用扫描。')
  if (!sameIndex(state.mapIndex.maps, proof.mapIndex))
    throw new Error('地图索引已变化；请重新扫描瓦片集引用。')
  if (
    proof.scannedMaps.length !== proof.mapIndex.length ||
    proof.scannedMaps.some(
      (entry, index) =>
        entry.id !== proof.mapIndex[index]?.id ||
        entry.path !== proof.mapIndex[index]?.path ||
        entry.tilesetIds.includes(tilesetId),
    )
  )
    throw new Error('瓦片集删除许可不完整或仍含地图引用。')
  const stamp = state.stamps.find(({ tilesetRefs }) => tilesetRefs.includes(tilesetId))
  if (stamp) throw new Error(`瓦片集仍被组合模板“${stamp.name}”（${stamp.id}）引用。`)
  const loadedMap = Object.entries(state.maps).find(([, map]) =>
    map.tilesetRefs.includes(tilesetId),
  )
  if (loadedMap) throw new Error(`瓦片集仍被地图“${loadedMap[0]}”引用。`)
}
