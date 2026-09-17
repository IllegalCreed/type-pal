/**
 * TEST-EDITOR-LOGIC-COVERAGE-1 A4/A5：场景目录与地图数据边界（commands.ts:770-1307/2948-3072）。
 * 既有 scene-lifecycle/map 命令测试覆盖主体；本文件补：缺目标 no-op/抛错分界、
 * 同值 no-op、invert 恢复、深快照与未触域。地图数据只比较合法 ProjectMap 值。
 */

import type { ProjectMap } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { baseState, deepSnapshot } from './__tests__/glm-editor-logic-fixtures.js'
import {
  AddProjectMapLayerCommand,
  BindSceneMapCommand,
  CreateProjectMapCommand,
  MoveProjectMapLayerCommand,
  PaintTilesCommand,
  RemoveProjectMapLayerCommand,
  RenameMapAssetCommand,
  ResizeProjectMapCommand,
  UpdateSceneNameCommand,
} from './commands.js'
import type { EditorState } from './edit-session.js'

const tinyMap = (): ProjectMap => ({
  version: 4,
  width: 2,
  height: 1,
  tilesetRefs: ['t'],
  layers: [
    {
      id: 'L1',
      name: '底',
      tiles: [
        [1, 1],
        [1, 1],
      ],
      sources: [
        [0, 0],
        [0, 0],
      ],
    },
    {
      id: 'L2',
      name: '顶',
      tiles: [
        [null, null],
        [null, null],
      ],
      sources: [
        [null, null],
        [null, null],
      ],
    },
  ],
  collision: [
    [0, 0],
    [0, 0],
  ],
})

const mapState = (): EditorState =>
  baseState({
    maps: { 'map-s': tinyMap() },
    mapIndex: { version: 1, maps: [{ id: 'map-s', name: '地图', path: 'assets/maps/s.map.json' }] },
  })

describe('tinyMap 合法性正控（R1）', () => {
  test('受测 tinyMap 与新增层经现行 validateProjectMap 正控通过', async () => {
    const { validateProjectMap } = await import('@type-pal/content')
    expect(() => validateProjectMap(tinyMap())).not.toThrow()
    const withLayer = new AddProjectMapLayerCommand('map-s', {
      id: 'L3',
      name: '新层',
      tiles: [
        [2, 2],
        [2, 2],
      ],
      sources: [
        [0, 0],
        [0, 0],
      ],
    }).apply(mapState())
    expect(() => validateProjectMap(withLayer.maps['map-s']!)).not.toThrow()
  })
})

describe('UpdateSceneNameCommand · 边界', () => {
  test('同值 no-op；缺目标抛错（现行合同：场景不存在显式拒绝）', () => {
    const s0 = mapState()
    expect(new UpdateSceneNameCommand('s', '场景').apply(s0)).toBe(s0)
    expect(() => new UpdateSceneNameCommand('ghost', '新名').apply(s0)).toThrow(/场景不存在 ghost/)
    const command = new UpdateSceneNameCommand('s', '新名')
    const s1 = command.apply(s0)
    expect(s1.sceneIndex.scenes[0]!.name).toBe('新名')
    const s2 = command.invert(s1)
    expect(s2.sceneIndex.scenes[0]!.name).toBe('场景')
  })
})

describe('BindSceneMapCommand · 边界', () => {
  test('缺场景/缺地图/同值均 no-op（现行合同）', () => {
    const s0 = mapState()
    expect(new BindSceneMapCommand('ghost', 'map-s').apply(s0)).toBe(s0)
    expect(new BindSceneMapCommand('s', 'map-missing').apply(s0)).toBe(s0)
    expect(new BindSceneMapCommand('s', 'map-s').apply(s0)).toBe(s0)
  })
})

describe('RenameMapAssetCommand · 边界', () => {
  test('缺目标/同名/空白名 no-op；改名可 invert 恢复', () => {
    const s0 = mapState()
    expect(new RenameMapAssetCommand('ghost', '新').apply(s0)).toBe(s0)
    expect(new RenameMapAssetCommand('map-s', '地图').apply(s0)).toBe(s0)
    expect(new RenameMapAssetCommand('map-s', ' ').apply(s0)).toBe(s0)
    const command = new RenameMapAssetCommand('map-s', '新名')
    const s1 = command.apply(s0)
    expect(s1.mapIndex.maps[0]!.name).toBe('新名')
    const s2 = command.invert(s1)
    expect(s2.mapIndex.maps[0]!.name).toBe('地图')
  })
})

describe('CreateProjectMapCommand · 边界', () => {
  test('缺场景 no-op（现行合同）', () => {
    const s0 = mapState()
    expect(
      new CreateProjectMapCommand('ghost', 'assets/maps/new.json', tinyMap(), {
        col: 0,
        row: 0,
        height: 0,
      }).apply(s0),
    ).toBe(s0)
  })
})

describe('ProjectMap 数据命令 · 图层与尺寸', () => {
  test('AddProjectMapLayer 在末尾插入且 invert 移除；缺图 no-op', () => {
    const s0 = mapState()
    const command = new AddProjectMapLayerCommand('map-s', {
      id: 'L3',
      name: '新层',
      tiles: [
        [2, 2],
        [2, 2],
      ],
      sources: [
        [null, null],
        [null, null],
      ],
    })
    const s1 = command.apply(s0)
    expect(s1.maps['map-s']!.layers.map((l) => l.id)).toEqual(['L1', 'L2', 'L3'])
    const s2 = command.invert(s1)
    expect(s2.maps['map-s']!.layers.map((l) => l.id)).toEqual(['L1', 'L2'])
    expect(
      new AddProjectMapLayerCommand('ghost', {
        id: 'X',
        name: 'x',
        tiles: [[1], [1]],
        sources: [[null], [null]],
      }).apply(s0),
    ).toBe(s0)
  })
  test('RemoveProjectMapLayer 保留其余层且 invert 回原位；缺层 no-op', () => {
    const s0 = mapState()
    const before = deepSnapshot(s0.maps['map-s'])
    const command = new RemoveProjectMapLayerCommand('map-s', 'L1')
    const s1 = command.apply(s0)
    expect(s1.maps['map-s']!.layers.map((l) => l.id)).toEqual(['L2'])
    expect(new RemoveProjectMapLayerCommand('map-s', 'ghost').apply(s0)).toBe(s0)
    const s2 = command.invert(s1)
    expect(s2.maps['map-s']!.layers).toEqual(before!.layers)
  })
  test('MoveProjectMapLayer 重排且 invert 恢复原序', () => {
    const s0 = mapState()
    const command = new MoveProjectMapLayerCommand('map-s', 'L2', 0)
    const s1 = command.apply(s0)
    expect(s1.maps['map-s']!.layers.map((l) => l.id)).toEqual(['L2', 'L1'])
    const s2 = command.invert(s1)
    expect(s2.maps['map-s']!.layers.map((l) => l.id)).toEqual(['L1', 'L2'])
  })
  test('ResizeProjectMapCommand 尺寸变更可逆且未触域保持', () => {
    const s0 = mapState()
    const mapBefore = deepSnapshot(s0.maps['map-s'])
    const stateBefore = deepSnapshot(s0)
    const command = new ResizeProjectMapCommand('map-s', 3, 2)
    const s1 = command.apply(s0)
    expect(s1.maps['map-s']!.width).toBe(3)
    expect(s1.maps['map-s']!.layers[0]!.tiles.every((row) => row.length === 3)).toBe(true)
    expect(s1.sceneIndex).toEqual(stateBefore.sceneIndex)
    const s2 = command.invert(s1)
    expect(s2.maps['map-s']!.width).toBe(2)
    expect(s2.maps['map-s']!.layers[0]!.tiles).toEqual(mapBefore!.layers[0]!.tiles)
  })
})

describe('PaintTilesCommand · 边界', () => {
  test('真实绘制改目标格且 invert 精确恢复；未触格保持（纯数据比较）', () => {
    const s0 = mapState()
    const stateBefore = deepSnapshot(s0)
    const before = deepSnapshot(s0.maps['map-s'])
    const command = new PaintTilesCommand('map-s', [
      { layerId: 'L1', row: 0, col: 0, tileId: 9, tilesetId: 't', height: 0 },
      { layerId: 'L1', row: 1, col: 1, tileId: 8, tilesetId: 't', height: 0 },
    ])
    const s1 = command.apply(s0)
    expect(s1.maps['map-s']!.layers[0]!.tiles[0]![0]).toBe(9)
    expect(s1.maps['map-s']!.layers[0]!.tiles[1]![1]).toBe(8)
    expect(s1.maps['map-s']!.layers[0]!.tiles[0]![1]).toBe(before!.layers[0]!.tiles[0]![1]) // 未触格
    expect(s1.maps['map-s']!.layers[1]).toEqual(before!.layers[1]) // 未触层
    expect(s1.sceneIndex).toEqual(stateBefore.sceneIndex)
    // R2 输入不可变：apply 后原输入与整状态深快照逐域相等（任何污染含 locale 侧漏在此红）
    expect(s0).toEqual(stateBefore)
    expect(s0.maps['map-s']!.layers[0]!.tiles).toEqual(before!.layers[0]!.tiles)
    expect(s0.maps['map-s']!.layers[1]).toEqual(before!.layers[1])
    const s2 = command.invert(s1)
    expect(s2.maps['map-s']!.layers[0]!.tiles).toEqual(before!.layers[0]!.tiles)
  })
})
