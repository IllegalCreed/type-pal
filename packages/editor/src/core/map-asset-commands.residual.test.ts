/**
 * TEST-CURSOR-COMMAND-BOUNDARIES-3：地图资产命令残项。
 */
import type { MapAssetDefV1 } from '@type-pal/content'
import type { ProjectMap } from '@type-pal/reforge'
import { describe, expect, test } from 'vitest'
import { loadBoundaryProject } from './__tests__/cursor-command-boundary-fixtures.js'
import type { EditorState } from './edit-session.js'
import { EditSession } from './edit-session.js'
import { CreateMapAssetCommand } from './map-asset-commands.js'

function expectRejected(
  command: { apply(state: EditorState): EditorState },
  input: EditorState,
  pattern: RegExp,
): void {
  const snapshot = structuredClone(input)
  expect(() => command.apply(input)).toThrow(pattern)
  expect(input).toEqual(snapshot)
}

function mapCatalogSlice(state: EditorState) {
  return {
    manifest: state.manifest,
    mapIndex: state.mapIndex,
    maps: state.maps,
    actors: state.actors,
    scenes: state.scenes,
    sprites: state.sprites,
    assetCatalog: state.assetCatalog,
  }
}

describe('地图资产命令残项', () => {
  test('CreateMapAssetCommand id=start（已在 mapIndex）→ 地图 id "start" 已存在', async () => {
    const { source, state } = await loadBoundaryProject('map-residual-dup')
    const def: MapAssetDefV1 = { id: 'start', name: '重复地图', path: 'content/maps/dup.json' }
    const map = await source.readJson<ProjectMap>('content/maps/start.json')
    expect(map.version).toBe(4)
    expectRejected(new CreateMapAssetCommand(def, map), state, /地图 id "start" 已存在/)
  })

  test('CreateMapAsset 构造后改 def.name / map.width，catalog 仍用 clone，且可 undo/redo', async () => {
    const { source, state } = await loadBoundaryProject('map-residual-clone')
    const session = new EditSession(state)
    const neighborActor = state.actors[0]
    const neighborScene = state.scenes[0]
    const originalCatalog = structuredClone(mapCatalogSlice(state))
    const def: MapAssetDefV1 = { id: 'yard', name: '院子', path: 'content/maps/yard.json' }
    const map = await source.readJson<ProjectMap>('content/maps/start.json')
    const expectedDef = structuredClone(def)
    const expectedMap = structuredClone(map)
    const command = new CreateMapAssetCommand(def, map)
    def.name = 'mutated-after-construct'
    map.width = 3
    expect(session.dispatch(command)).toBe(true)
    const after = session.getState()
    expect(after.mapIndex.maps.find((asset) => asset.id === 'yard')).toEqual(expectedDef)
    expect(after.maps.yard).toEqual(expectedMap)
    expect(after.maps.start).toEqual(originalCatalog.maps.start)
    expect(after.manifest).toEqual(originalCatalog.manifest)
    expect(after.mapIndex.maps.filter((asset) => asset.id !== 'yard')).toEqual(
      originalCatalog.mapIndex.maps,
    )
    expect(after.actors).toEqual(originalCatalog.actors)
    expect(after.scenes).toEqual(originalCatalog.scenes)
    expect(after.sprites).toEqual(originalCatalog.sprites)
    expect(after.assetCatalog).toEqual(originalCatalog.assetCatalog)
    expect(after.actors[0]).toBe(neighborActor)
    expect(after.scenes[0]).toBe(neighborScene)
    expect(session.undo()).toBe(true)
    expect(mapCatalogSlice(session.getState())).toEqual(originalCatalog)
    expect(session.redo()).toBe(true)
    const redone = session.getState()
    expect(redone.mapIndex.maps.find((asset) => asset.id === 'yard')).toEqual(expectedDef)
    expect(redone.maps.yard).toEqual(expectedMap)
    expect(redone.maps.start).toEqual(originalCatalog.maps.start)
    expect(redone.manifest).toEqual(originalCatalog.manifest)
    expect(redone.actors).toEqual(originalCatalog.actors)
    expect(redone.scenes).toEqual(originalCatalog.scenes)
  })
})
