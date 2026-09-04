import type { AssetRecordV1, TilesetDef } from '@type-pal/content'
import type { CurrentMapReferenceBatchProvider, EditorState } from './edit-session.js'
import type { MapReferenceCoverageEntry, MapReferenceEdgeBatch } from './map-reference-facts.js'
import {
  createProjectReferenceIndex,
  type ProjectReferenceEdge,
  type ProjectReferenceIndex,
} from './project-reference.js'

const batchIndexes = new WeakMap<MapReferenceEdgeBatch, ProjectReferenceIndex>()

function referenceIndexForBatch(batch: MapReferenceEdgeBatch): ProjectReferenceIndex {
  const current = batchIndexes.get(batch)
  if (current) return current
  const created = createProjectReferenceIndex(batch.projectReferences)
  batchIndexes.set(batch, created)
  return created
}

function completeCoverage(batch: MapReferenceEdgeBatch): readonly MapReferenceCoverageEntry[] {
  if (
    batch.running ||
    !batch.done ||
    batch.failures.length > 0 ||
    batch.completed !== batch.total ||
    batch.facts.length !== batch.total ||
    batch.coverage.length !== batch.total ||
    batch.stampCompleted !== batch.stampTotal ||
    batch.stampFacts.length !== batch.stampTotal
  )
    throw new Error('地图引用扫描不完整，不能生成许可。')
  const seen = new Set<string>()
  const factsByMapId = new Map(batch.facts.map((fact) => [fact.mapId, fact] as const))
  for (const entry of batch.coverage) {
    if (seen.has(entry.mapId)) throw new Error(`地图引用扫描重复覆盖 ${entry.mapId}。`)
    seen.add(entry.mapId)
    const fact = factsByMapId.get(entry.mapId)
    if (!fact || fact.path !== entry.path || fact.mapRevision !== entry.mapRevision)
      throw new Error(`地图引用扫描事实与覆盖不一致：${entry.mapId}。`)
  }
  return batch.coverage.map((entry) => ({ ...entry }))
}

function sameCoverage(
  left: readonly MapReferenceCoverageEntry[],
  right: readonly MapReferenceCoverageEntry[],
): boolean {
  return (
    left.length === right.length &&
    left.every(
      (entry, index) =>
        entry.mapId === right[index]?.mapId &&
        entry.path === right[index]?.path &&
        entry.mapRevision === right[index]?.mapRevision,
    )
  )
}

function assertCurrentProof(
  state: EditorState,
  batch: MapReferenceEdgeBatch,
  generation: number | undefined,
  coverage: readonly MapReferenceCoverageEntry[],
): void {
  const currentCoverage = completeCoverage(batch)
  if (
    (generation !== undefined && batch.generation !== generation) ||
    !sameCoverage(currentCoverage, coverage)
  )
    throw new Error('地图引用事实已变化；请重新检查。')
  if (
    state.mapIndex.maps.length !== coverage.length ||
    state.mapIndex.maps.some(
      (entry, index) => entry.id !== coverage[index]?.mapId || entry.path !== coverage[index]?.path,
    )
  )
    throw new Error('地图索引已变化；请重新检查。')
}

export function tilesetUsageReferences(
  batch: MapReferenceEdgeBatch,
  tilesetId: string,
): ProjectReferenceEdge[] {
  return referenceIndexForBatch(batch)
    .referencesTo({ kind: 'tileset', id: tilesetId })
    .filter((reference) => reference.relation.kind === 'tileset-use')
}

export function stampPlacementReferences(
  batch: MapReferenceEdgeBatch,
  stampId: string,
): ProjectReferenceEdge[] {
  return referenceIndexForBatch(batch)
    .referencesTo({ kind: 'stamp', id: stampId })
    .filter((reference) => reference.relation.kind === 'stamp-placement-source')
}

export class TilesetRemovalProof {
  readonly tilesetId: string
  readonly generation: number
  readonly coverage: readonly MapReferenceCoverageEntry[]
  readonly asset: string
  readonly recordPath: string
  readonly recordSha256: string
  readonly definitionIds: readonly string[]

  private constructor(batch: MapReferenceEdgeBatch, state: EditorState, tilesetId: string) {
    const definition = (state.tilesets ?? []).find((entry) => entry.id === tilesetId)
    if (!definition) throw new Error(`瓦片集定义 ${tilesetId} 已不存在。`)
    const record = state.assetCatalog.assets[definition.asset]
    if (!record || record.kind !== 'tileset')
      throw new Error(`瓦片集资源 ${definition.asset} 已不存在。`)
    this.tilesetId = tilesetId
    this.generation = batch.generation
    this.coverage = completeCoverage(batch)
    this.asset = definition.asset
    this.recordPath = record.path
    this.recordSha256 = record.sha256
    this.definitionIds = (state.tilesets ?? [])
      .filter((entry) => entry.asset === definition.asset)
      .map((entry) => entry.id)
  }

  static fromBatch(
    batch: MapReferenceEdgeBatch,
    state: EditorState,
    tilesetId: string,
  ): TilesetRemovalProof {
    completeCoverage(batch)
    const references = tilesetUsageReferences(batch, tilesetId)
    if (references.length)
      throw new Error(`瓦片集仍被 ${references.length} 个地图或组合模板引用，不能移除。`)
    return new TilesetRemovalProof(batch, state, tilesetId)
  }
}

export class TilesetReplacementProof {
  readonly tilesetId: string
  readonly frameCount: number
  readonly generation: number
  readonly coverage: readonly MapReferenceCoverageEntry[]
  readonly asset: string
  readonly previousSha256: string
  readonly previousRecord: AssetRecordV1
  readonly definitions: ReadonlyArray<{ id: string; asset: string }>

  private constructor(
    batch: MapReferenceEdgeBatch,
    tilesetId: string,
    frameCount: number,
    options: {
      asset: string
      previousRecord: AssetRecordV1
      definitions: readonly Pick<TilesetDef, 'id' | 'asset'>[]
    },
  ) {
    this.tilesetId = tilesetId
    this.frameCount = frameCount
    this.generation = batch.generation
    this.coverage = completeCoverage(batch)
    this.asset = options.asset
    this.previousRecord = structuredClone(options.previousRecord)
    this.previousSha256 = options.previousRecord.sha256
    this.definitions = options.definitions.map(({ id, asset }) => ({ id, asset }))
  }

  static fromBatch(
    batch: MapReferenceEdgeBatch,
    tilesetId: string,
    frameCount: number,
    options: {
      asset: string
      previousRecord: AssetRecordV1
      definitions: readonly Pick<TilesetDef, 'id' | 'asset'>[]
    },
  ): TilesetReplacementProof {
    if (!Number.isInteger(frameCount) || frameCount <= 0) throw new Error('替换瓦片集必须含帧')
    completeCoverage(batch)
    const definitions = options.definitions.map(({ id }) => id)
    if (!definitions.includes(tilesetId)) throw new Error('共享瓦片集影响范围不含当前定义。')
    if (new Set(definitions).size !== definitions.length)
      throw new Error('共享瓦片集影响范围包含重复定义。')
    if (options.previousRecord.kind !== 'tileset') throw new Error('待替换资源不是瓦片集。')
    if (options.definitions.some((entry) => entry.asset !== options.asset))
      throw new Error('共享瓦片集定义的 AssetId 不一致。')
    const targets = new Set(definitions)
    const badMaps = batch.facts.flatMap((fact) =>
      fact.tilesetIds.flatMap((id) =>
        targets.has(id) && (fact.maxTileIdByTileset[id] ?? -1) >= frameCount
          ? [{ mapId: fact.mapId, maxTileId: fact.maxTileIdByTileset[id] ?? -1 }]
          : [],
      ),
    )
    const badStamps = batch.stampFacts.flatMap((stamp) =>
      stamp.tilesetIds.flatMap((id) =>
        targets.has(id) && (stamp.maxTileIdByTileset[id] ?? -1) >= frameCount
          ? [
              {
                stampId: stamp.stampId,
                stampName: stamp.stampName,
                maxTileId: stamp.maxTileIdByTileset[id] ?? -1,
              },
            ]
          : [],
      ),
    )
    if (badMaps.length || badStamps.length)
      throw new Error(
        `新瓦片集仅 ${frameCount} 帧，越界引用：${[
          ...badMaps.map((entry) => `地图“${entry.mapId}” #${entry.maxTileId}`),
          ...badStamps.map((entry) => `组合“${entry.stampName}” #${entry.maxTileId}`),
        ].join('、')}`,
      )
    return new TilesetReplacementProof(batch, tilesetId, frameCount, options)
  }
}

export class StampDeletionProof {
  readonly stampId: string
  readonly referenceCount: number
  readonly generation: number
  readonly coverage: readonly MapReferenceCoverageEntry[]

  private constructor(batch: MapReferenceEdgeBatch, stampId: string) {
    this.stampId = stampId
    this.referenceCount = stampPlacementReferences(batch, stampId).length
    this.generation = batch.generation
    this.coverage = completeCoverage(batch)
  }

  static fromBatch(batch: MapReferenceEdgeBatch, stampId: string): StampDeletionProof {
    completeCoverage(batch)
    return new StampDeletionProof(batch, stampId)
  }
}

export function assertTilesetRemovalAllowed(
  state: EditorState,
  tilesetId: string,
  proof: TilesetRemovalProof | undefined,
  currentBatch: CurrentMapReferenceBatchProvider,
  persistedBytes?: ArrayBuffer,
): asserts proof is TilesetRemovalProof {
  if (!(proof instanceof TilesetRemovalProof) || proof.tilesetId !== tilesetId)
    throw new Error('移除瓦片集前必须完成全项目引用扫描。')
  const batch = currentBatch(state)
  assertCurrentProof(state, batch, proof.generation, proof.coverage)
  const definition = (state.tilesets ?? []).find((entry) => entry.id === tilesetId)
  const record = definition ? state.assetCatalog.assets[definition.asset] : undefined
  const definitionIds = (state.tilesets ?? [])
    .filter((entry) => entry.asset === proof.asset)
    .map((entry) => entry.id)
  if (
    definition?.asset !== proof.asset ||
    record?.kind !== 'tileset' ||
    record.path !== proof.recordPath ||
    record.sha256 !== proof.recordSha256 ||
    JSON.stringify(definitionIds) !== JSON.stringify(proof.definitionIds)
  )
    throw new Error('瓦片集定义或源资源已变化；请重新检查。')
  if (proof.definitionIds.length === 1 && !state.assetBlobs[proof.recordPath] && !persistedBytes)
    throw new Error('删除最后一个瓦片集定义前必须读取可恢复的源资源。')
  const references = tilesetUsageReferences(batch, tilesetId)
  if (references.length)
    throw new Error(`瓦片集仍被 ${references.length} 个地图或组合模板引用，不能移除。`)
}

export function assertTilesetReplacementAllowed(
  state: EditorState,
  tilesetId: string,
  asset: string,
  proof: TilesetReplacementProof | undefined,
  currentBatch: CurrentMapReferenceBatchProvider,
): asserts proof is TilesetReplacementProof {
  if (
    !(proof instanceof TilesetReplacementProof) ||
    proof.tilesetId !== tilesetId ||
    proof.asset !== asset
  )
    throw new Error('替换瓦片集前必须完成全项目引用扫描。')
  const batch = currentBatch(state)
  assertCurrentProof(state, batch, proof.generation, proof.coverage)
  const record = state.assetCatalog.assets[asset]
  if (!record || JSON.stringify(record) !== JSON.stringify(proof.previousRecord))
    throw new Error('瓦片集资源已变化；请重新扫描。')
  const actualDefinitions = (state.tilesets ?? [])
    .filter((entry) => entry.asset === asset)
    .map(({ id, asset: definitionAsset }) => ({ id, asset: definitionAsset }))
  if (JSON.stringify(actualDefinitions) !== JSON.stringify(proof.definitions))
    throw new Error('共享瓦片集影响范围已变化；请重新扫描。')
  TilesetReplacementProof.fromBatch(batch, tilesetId, proof.frameCount, {
    asset,
    previousRecord: proof.previousRecord,
    definitions: actualDefinitions,
  })
}

export function assertStampDeletionAllowed(
  state: EditorState,
  stampId: string,
  proof: StampDeletionProof | undefined,
  currentBatch: CurrentMapReferenceBatchProvider,
): asserts proof is StampDeletionProof {
  if (!(proof instanceof StampDeletionProof) || proof.stampId !== stampId)
    throw new Error('删除组合前必须完成全项目引用扫描。')
  const batch = currentBatch(state)
  assertCurrentProof(state, batch, undefined, proof.coverage)
  if (stampPlacementReferences(batch, stampId).length !== proof.referenceCount)
    throw new Error('组合来源引用已变化；请重新确认删除。')
}
