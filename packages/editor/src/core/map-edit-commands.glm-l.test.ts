import type { ProjectMap } from '@type-pal/content'
import {
  buildBlankProjectMap,
  buildProjectMapLayer,
  insertProjectMapLayer,
  paintProjectMapTiles,
  withProjectMapStampPlacements,
} from '@type-pal/reforge'
import { describe, expect, test } from 'vitest'
import { waveLEditorState } from '../__tests__/glm-l/editor-state.js'
import type { EditorState } from './edit-session.js'
import {
  AddProjectMapLayerCommand,
  ApplyProjectMapPatchCommand,
  MoveProjectMapLayerCommand,
  PaintCollisionCommand,
  PaintTilesCommand,
  RemoveProjectMapLayerCommand,
  ResizeProjectMapCommand,
  UpdateProjectMapLayerCommand,
} from './map-edit-commands.js'
import { ProjectMapPatchError } from './map-patch.js'

function fixtureMap(): ProjectMap {
  let map = buildBlankProjectMap(3, 2, 'tiles')
  map = insertProjectMapLayer(map, buildProjectMapLayer(map, 'objects', '物件'))
  map = paintProjectMapTiles(map, [
    { layerId: 'floor', row: 0, col: 0, tileId: 1, tilesetId: 'tiles', height: 0 },
  ])
  return withProjectMapStampPlacements(map, [
    {
      id: 'tree-1',
      anchor: { row: 0, col: 0 },
      visualSlots: [{ layerId: 'floor', row: 0, col: 0 }],
      gridPoints: [{ row: 1, col: 0 }],
    },
  ])
}

function state(map: ProjectMap = fixtureMap()): EditorState {
  return waveLEditorState({ maps: { 'map-a': map } })
}

const writable = { hiddenLayerIds: [] as string[], lockedLayerIds: [] as string[] }

describe('TEST-GLM-WAVE-L-1 L03 map edit command guards', () => {
  test('普通画笔在命令层拒绝写入图章归属槽，且失败零写', () => {
    const map = fixtureMap()
    const command = new PaintTilesCommand('map-a', [
      { layerId: 'floor', row: 0, col: 0, tileId: 7, tilesetId: 'tiles', height: 0 },
    ])
    const base = state(map)
    expect(() => command.apply(base)).toThrow(ProjectMapPatchError)
    expect(() => command.apply(base)).toThrow(/请进入组内编辑或先解组/)
    expect(base.maps['map-a']?.layers[0]?.tiles[0]?.[0]).toBe(1)
  })

  test('碰撞画笔同样被 ownership 门拦截；未 apply 的 invert 是零写早退', () => {
    const map = fixtureMap()
    const blocked = new PaintCollisionCommand('map-a', [{ row: 1, col: 0, value: 0 }])
    expect(() => blocked.apply(state(map))).toThrow(/碰撞格点 .* 属于图章放置组/)
    const plain = new PaintCollisionCommand('map-a', [{ row: 0, col: 2, value: 1 }])
    const untouched = state(map)
    expect(plain.invert(untouched)).toBe(untouched)
  })

  test('画笔未 apply 时 invert 原样返回；状态里缺图也是零写', () => {
    const command = new PaintTilesCommand('map-a', [
      { layerId: 'floor', row: 2, col: 2, tileId: 3, tilesetId: 'tiles', height: 0 },
    ])
    const base = state()
    expect(command.invert(base)).toBe(base)
    const missingMap = { ...base, maps: {} }
    expect(command.apply(missingMap)).toBe(missingMap)
  })

  test('删除最后一个图层是无操作；resize/patch 命令未 apply 的 invert 零写', () => {
    let single = buildBlankProjectMap(2, 1, 'tiles')
    single = insertProjectMapLayer(single, buildProjectMapLayer(single, 'only', '唯一'))
    single = { ...single, layers: single.layers.slice(0, 1) }
    const remove = new RemoveProjectMapLayerCommand('map-a', 'floor')
    const base = state(single)
    expect(remove.apply(base)).toBe(base)
    expect(single.layers).toHaveLength(1)

    const resize = new ResizeProjectMapCommand('map-a', 4, 2)
    expect(resize.invert(base)).toBe(base)
    const patch = new ApplyProjectMapPatchCommand(
      'map-a',
      {
        visual: [{ channel: 'tileId', ref: { layerId: 'floor', row: 1, col: 1 }, value: 3 }],
        collision: [],
      },
      { ...writable, requiredWritableLayerIds: ['floor'] },
    )
    expect(patch.invert(base)).toBe(base)
  })

  test('移动命令对缺失层 apply/invert 双零写；新增层索引越界被夹回', () => {
    const map = fixtureMap()
    const move = new MoveProjectMapLayerCommand('map-a', 'ghost', 0)
    const base = state(map)
    expect(move.apply(base)).toBe(base)
    expect(move.invert(base)).toBe(base)

    const beyond = new AddProjectMapLayerCommand(
      'map-a',
      buildProjectMapLayer(map, 'extra', '额外'),
      99,
    )
    const applied = beyond.apply(state(map)).maps['map-a']!
    expect(applied.layers).toHaveLength(3)
    expect(applied.layers[2]?.id).toBe('extra')
    const undo = beyond.invert({ ...base, maps: { 'map-a': applied } })
    expect(undo.maps['map-a']?.layers).toHaveLength(2)

    const head = new AddProjectMapLayerCommand(
      'map-a',
      buildProjectMapLayer(map, 'head', '顶层'),
      -3,
    )
    const headed = head.apply(state(map)).maps['map-a']!
    expect(headed.layers[0]?.id).toBe('head')
  })

  test('更新与改尺寸命令对缺失目标零写', () => {
    const base = state()
    expect(new UpdateProjectMapLayerCommand('map-a', 'ghost', { name: 'x' }).apply(base)).toBe(base)
    expect(new ResizeProjectMapCommand('ghost-map', 2, 2).apply(base)).toBe(base)
  })
})
