import type { ProjectMap } from '@type-pal/content'
import { validateCurrentManifestStartup, validateProjectMap } from '@type-pal/content'
import {
  buildBlankProjectMap,
  buildProjectMapLayer,
  fsaSource,
  insertProjectMapLayer,
  loadAllAuthorScenes,
  loadCurrentProjectFrom,
  paintProjectMapCollision,
  paintProjectMapTiles,
  withProjectMapStampPlacements,
} from '@type-pal/reforge'
import type { EditorState } from '../edit-session.js'
import type { ProjectMapPatch } from '../map-patch.js'
import { applyPreparedProjectMapPatch, prepareProjectMapPatch } from '../map-patch.js'
import { toEditorState } from '../project-io.js'
import { buildBlankProject } from '../seed.js'
import { memoryAuthorDirectory } from './author-save-fixture.js'

export const TILES = 'tiles'

export function inputSnap<T>(value: T): T {
  return structuredClone(value)
}

export function legalBlankMap(width = 5, height = 4): ProjectMap {
  return validateProjectMap(buildBlankProjectMap(width, height, TILES))
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

/** 双组图上另有未选普通格，不属于任一 placement。 */
export function legalGroupMapWithOrdinarySentinel(): ProjectMap {
  const map = paintProjectMapCollision(
    paintProjectMapTiles(legalGroupMap(true), [
      { layerId: 'floor', row: 2, col: 2, tileId: 9, tilesetId: TILES, height: 1 },
    ]),
    [{ row: 2, col: 2, value: 6 }],
  )
  return validateProjectMap(map)
}

let blankEditorState: EditorState | undefined

/**
 * 正式 blank-project loader → toEditorState，再挂入合法地图。
 * 只核启动 manifest，不宣称作者保存闭包。
 */
export async function editorStateWithMap(mapId: string, map: ProjectMap): Promise<EditorState> {
  if (!blankEditorState) {
    const disk = memoryAuthorDirectory(await buildBlankProject('map-logic'))
    const project = await loadCurrentProjectFrom(fsaSource(disk.dir))
    const scenes = await loadAllAuthorScenes(project)
    const loaded = toEditorState(project, scenes, {}, {}, [])
    validateCurrentManifestStartup(loaded.manifest)
    blankEditorState = loaded
  }
  const state = structuredClone(blankEditorState)
  state.maps[mapId] = map
  state.mapIndex = {
    version: 1,
    maps: [
      ...state.mapIndex.maps.filter((entry) => entry.id !== mapId),
      { id: mapId, name: mapId, path: `content/maps/${mapId}.json` },
    ],
  }
  return state
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
