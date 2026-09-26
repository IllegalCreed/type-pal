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
    const def: MapAssetDefV1 = { id: 'yard', name: '院子', path: 'content/maps/yard.json' }
    const map = await source.readJson<ProjectMap>('content/maps/start.json')
    const command = new CreateMapAssetCommand(def, map)
    def.name = 'mutated-after-construct'
    map.width = 3
    expect(session.dispatch(command)).toBe(true)
    const after = session.getState()
    const created = after.mapIndex.maps.find((asset) => asset.id === 'yard')
    expect(created).toMatchObject({ id: 'yard', name: '院子', path: 'content/maps/yard.json' })
    expect(after.maps.yard?.width).toBe(12)
    expect(after.maps.yard?.height).toBe(12)
    expect(after.maps.yard?.tilesetRefs).toEqual(['starter'])
    expect(after.maps.yard?.layers[0]?.id).toBe('floor')
    expect(after.maps.yard?.collision.length).toBe(24)
    expect(after.actors[0]).toBe(neighborActor)
    expect(after.scenes[0]).toBe(neighborScene)
    expect(session.undo()).toBe(true)
    expect(session.getState().mapIndex.maps.some((asset) => asset.id === 'yard')).toBe(false)
    expect(session.getState().maps.yard).toBeUndefined()
    expect(session.redo()).toBe(true)
    expect(session.getState().mapIndex.maps.find((asset) => asset.id === 'yard')?.name).toBe('院子')
    expect(session.getState().maps.yard?.width).toBe(12)
  })
})
