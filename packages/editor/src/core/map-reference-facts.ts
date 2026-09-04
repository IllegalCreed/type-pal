import type { IsometricMapContent, MapIndexV1, ProjectMap, StampTemplate } from '@type-pal/content'
import {
  buildProjectReferenceSnapshot,
  createProjectReferenceSource,
  type ProjectReferenceEdgeInput,
  type ProjectReferenceSnapshotV1,
} from './project-reference.js'

export interface MapReferenceCoverageEntry {
  mapId: string
  path: string
  mapRevision: number
}

export interface ProjectMapReferenceFacts extends MapReferenceCoverageEntry {
  tilesetIds: readonly string[]
  maxTileIdByTileset: Readonly<Record<string, number>>
  stampSources: readonly { placementId: string; sourceStampId: string }[]
}

export interface ProjectStampReferenceFacts {
  stampId: string
  stampName: string
  tilesetIds: readonly string[]
  maxTileIdByTileset: Readonly<Record<string, number>>
}

export interface MapReferenceScanFailure extends MapReferenceCoverageEntry {
  message: string
}

export interface MapReferenceEdgeBatch {
  version: 1
  generation: number
  completed: number
  total: number
  running: boolean
  done: boolean
  coverage: readonly MapReferenceCoverageEntry[]
  facts: readonly ProjectMapReferenceFacts[]
  stampFacts: readonly ProjectStampReferenceFacts[]
  stampCompleted: number
  stampTotal: number
  failures: readonly MapReferenceScanFailure[]
  projectReferences: ProjectReferenceSnapshotV1
}

export function maxTileIdsByTileset(
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

export function extractProjectMapReferenceFacts(
  map: ProjectMap,
  coverage: MapReferenceCoverageEntry,
): ProjectMapReferenceFacts {
  return {
    ...coverage,
    tilesetIds: [...map.tilesetRefs],
    maxTileIdByTileset: maxTileIdsByTileset(map),
    stampSources: (map.authoring?.stampPlacements ?? []).flatMap((placement) =>
      placement.sourceStampId
        ? [{ placementId: placement.id, sourceStampId: placement.sourceStampId }]
        : [],
    ),
  }
}

export function extractProjectStampReferenceFacts(
  stamps: readonly StampTemplate[],
): ProjectStampReferenceFacts[] {
  return stamps.map((stamp) => ({
    stampId: stamp.id,
    stampName: stamp.name,
    tilesetIds: [...stamp.tilesetRefs],
    maxTileIdByTileset: maxTileIdsByTileset(stamp),
  }))
}

function mapReferenceEdges(
  mapIndex: MapIndexV1,
  facts: readonly ProjectMapReferenceFacts[],
): ProjectReferenceEdgeInput[] {
  const names = new Map(mapIndex.maps.map((entry) => [entry.id, entry.name] as const))
  return facts.flatMap((fact) => {
    const sourceOwner = { kind: 'map' as const, id: fact.mapId }
    const label = `地图 ${names.get(fact.mapId) ?? fact.mapId}`
    const mapTarget = { kind: 'map' as const, id: fact.mapId }
    return [
      ...fact.tilesetIds.map((tilesetId) => ({
        target: { kind: 'tileset' as const, id: tilesetId },
        source: createProjectReferenceSource(sourceOwner, label, {
          deletedWith: [mapTarget],
          section: `tileset:${tilesetId}`,
        }),
        relation: { kind: 'tileset-use' as const, use: 'map' as const },
        where: `maps.${fact.mapId}.tilesetRefs.${tilesetId}`,
        detail: `最高使用 #${fact.maxTileIdByTileset[tilesetId] ?? -1}`,
        locator: { kind: 'object' as const, object: mapTarget },
        deletePolicy: 'replace-suggest' as const,
      })),
      ...fact.stampSources.map((placement) => ({
        target: { kind: 'stamp' as const, id: placement.sourceStampId },
        source: createProjectReferenceSource(sourceOwner, label, {
          deletedWith: [mapTarget],
          section: `stamp-placement:${placement.placementId}`,
        }),
        relation: { kind: 'stamp-placement-source' as const },
        where: `maps.${fact.mapId}.authoring.stampPlacements.${placement.placementId}.sourceStampId`,
        detail: `放置组 ${placement.placementId}`,
        locator: { kind: 'object' as const, object: mapTarget },
        deletePolicy: 'warn' as const,
      })),
    ]
  })
}

function stampReferenceEdges(
  stampFacts: readonly ProjectStampReferenceFacts[],
): ProjectReferenceEdgeInput[] {
  return stampFacts.flatMap((stamp) => {
    const stampTarget = { kind: 'stamp' as const, id: stamp.stampId }
    return stamp.tilesetIds.map((tilesetId) => ({
      target: { kind: 'tileset' as const, id: tilesetId },
      source: createProjectReferenceSource(
        { kind: 'stamp' as const, id: stamp.stampId },
        `组合 ${stamp.stampName}`,
        { deletedWith: [stampTarget], section: `tileset:${tilesetId}` },
      ),
      relation: { kind: 'tileset-use' as const, use: 'stamp' as const },
      where: `stamps.${stamp.stampId}.tilesetRefs.${tilesetId}`,
      detail: `最高使用 #${stamp.maxTileIdByTileset[tilesetId] ?? -1}`,
      locator: { kind: 'object' as const, object: stampTarget },
      deletePolicy: 'replace-suggest' as const,
    }))
  })
}

export function buildMapReferenceEdgeBatch(input: {
  generation: number
  running: boolean
  mapIndex: MapIndexV1
  facts: readonly ProjectMapReferenceFacts[]
  failures: readonly MapReferenceScanFailure[]
  stampFacts: readonly ProjectStampReferenceFacts[]
  stampTotal: number
}): MapReferenceEdgeBatch {
  const completed = input.facts.length + input.failures.length
  return {
    version: 1,
    generation: input.generation,
    completed,
    total: input.mapIndex.maps.length,
    running: input.running,
    done:
      !input.running &&
      completed === input.mapIndex.maps.length &&
      input.stampFacts.length === input.stampTotal,
    coverage: input.facts.map(({ mapId, path, mapRevision }) => ({
      mapId,
      path,
      mapRevision,
    })),
    facts: input.facts,
    stampFacts: input.stampFacts,
    stampCompleted: input.stampFacts.length,
    stampTotal: input.stampTotal,
    failures: input.failures,
    projectReferences: buildProjectReferenceSnapshot(
      [...mapReferenceEdges(input.mapIndex, input.facts), ...stampReferenceEdges(input.stampFacts)],
      { assumeUnique: true },
    ),
  }
}
