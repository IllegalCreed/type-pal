import type { ProjectMap } from '@type-pal/content'
import { validateProjectMap } from '@type-pal/content'
import {
  buildBlankProjectMap,
  buildProjectMapLayer,
  insertProjectMapLayer,
  paintProjectMapCollision,
  paintProjectMapTiles,
  withProjectMapStampPlacements,
} from '@type-pal/reforge'
import type { EditorState } from '../edit-session.js'
import type { ProjectMapPatch } from '../map-patch.js'
import { applyPreparedProjectMapPatch, prepareProjectMapPatch } from '../map-patch.js'

export const TILES = 'tiles'

export function legalBlankMap(width = 5, height = 4): ProjectMap {
  const map = validateProjectMap(buildBlankProjectMap(width, height, TILES))
  return map
}

export function legalPaintedMap(): ProjectMap {
  let map = buildBlankProjectMap(5, 4, TILES)
  map = insertProjectMapLayer(map, buildProjectMapLayer(map, 'objects', '物件'))
  map = paintProjectMapTiles(map, [
    { layerId: 'objects', row: 0, col: 0, tileId: 2, tilesetId: TILES, height: 1 },
    { layerId: 'objects', row: 1, col: 0, tileId: 3, tilesetId: TILES, height: 2 },
    { layerId: 'objects', row: 4, col: 3, tileId: 9, tilesetId: TILES, height: 4 },
  ])
  map = paintProjectMapCollision(map, [
    { row: 0, col: 0, value: 5 },
    { row: 1, col: 0, value: 0 },
  ])
  return validateProjectMap(map)
}

export function legalGroupMap(withOther = true): ProjectMap {
  let map: ProjectMap = buildBlankProjectMap(5, 3, TILES)
  map = insertProjectMapLayer(map, buildProjectMapLayer(map, 'objects', '物件'))
  map = paintProjectMapTiles(map, [
    { layerId: 'floor', row: 0, col: 0, tileId: 1, tilesetId: TILES, height: 0 },
    { layerId: 'objects', row: 1, col: 0, tileId: 2, tilesetId: TILES, height: 3 },
    ...(withOther
      ? [
          { layerId: 'floor', row: 4, col: 3, tileId: 4, tilesetId: TILES, height: 0 },
          { layerId: 'objects', row: 5, col: 3, tileId: 5, tilesetId: TILES, height: 2 },
        ]
      : []),
  ])
  map = paintProjectMapCollision(map, [
    { row: 1, col: 0, value: 0 },
    ...(withOther ? [{ row: 5, col: 3, value: 2 }] : []),
  ])
  return withProjectMapStampPlacements(map, [
    {
      id: 'tree-a',
      sourceStampId: 'tree',
      sourceStampName: '树 A',
      anchor: { row: 0, col: 0 },
      visualSlots: [
        { layerId: 'floor', row: 0, col: 0 },
        { layerId: 'objects', row: 1, col: 0 },
      ],
      gridPoints: [{ row: 1, col: 0 }],
    },
    ...(withOther
      ? [
          {
            id: 'tree-b',
            sourceStampId: 'tree',
            sourceStampName: '树 B',
            anchor: { row: 4, col: 3 },
            visualSlots: [
              { layerId: 'floor', row: 4, col: 3 },
              { layerId: 'objects', row: 5, col: 3 },
            ],
            gridPoints: [{ row: 5, col: 3 }],
          },
        ]
      : []),
  ])
}

export function editorStateWithMap(mapId: string, map: ProjectMap): EditorState {
  return {
    manifest: { content: { maps: 'content/maps.json' } },
    scenes: [],
    actors: [],
    skills: [],
    levelUp: {},
    items: [],
    locale: {},
    sprites: [],
    maps: { [mapId]: map },
    sceneIndex: { version: 1, scenes: [] },
    mapIndex: {
      version: 1,
      maps: [{ id: mapId, name: mapId, path: `content/maps/${mapId}.json` }],
    },
    tilesets: [],
    tilesetBlobs: {},
    stamps: [],
    assetCatalog: { version: 1, assets: {} },
    assetBlobs: {},
    scriptChunks: {},
  } as unknown as EditorState
}

export function applyPlanPatch(
  map: ProjectMap,
  patch: ProjectMapPatch,
  requiredWritableLayerIds: readonly string[],
): ProjectMap {
  const prepared = prepareProjectMapPatch(map, patch, {
    hiddenLayerIds: [],
    lockedLayerIds: [],
    requiredWritableLayerIds: [...requiredWritableLayerIds],
  })
  return applyPreparedProjectMapPatch(map, prepared)
}
