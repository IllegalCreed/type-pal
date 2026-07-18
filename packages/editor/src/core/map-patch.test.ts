import {
  buildBlankProjectMap,
  buildProjectMapLayer,
  insertProjectMapLayer,
  paintProjectMapCollision,
  paintProjectMapTiles,
} from '@type-pal/reforge'
import { describe, expect, test } from 'vitest'
import { ApplyProjectMapPatchCommand } from './commands.js'
import type { EditorState } from './edit-session.js'
import {
  applyPreparedProjectMapPatch,
  type MapPatchPermissionSnapshot,
  type ProjectMapPatch,
  ProjectMapPatchError,
  prepareProjectMapPatch,
} from './map-patch.js'

function fixtureMap() {
  let map = buildBlankProjectMap(3, 2, 'tiles')
  map = insertProjectMapLayer(map, buildProjectMapLayer(map, 'objects', '物件', 'height'))
  map = paintProjectMapTiles(map, [
    { layerId: 'floor', row: 0, col: 0, tileId: 1, height: 0 },
    { layerId: 'objects', row: 1, col: 1, tileId: 5, height: 3 },
    { layerId: 'objects', row: 2, col: 1, tileId: 6, height: 7 },
  ])
  return paintProjectMapCollision(map, [{ row: 1, col: 1, value: 2 }])
}

const writable = (
  requiredWritableLayerIds: string[] = ['objects'],
): MapPatchPermissionSnapshot => ({
  hiddenLayerIds: [],
  lockedLayerIds: [],
  requiredWritableLayerIds,
})

describe('W8 atomic map patch', () => {
  test('tileId-only / height-only / collision-only 各自保持其他通道', () => {
    const map = fixtureMap()
    const tilePrepared = prepareProjectMapPatch(
      map,
      {
        visual: [
          {
            channel: 'tileId',
            ref: { layerId: 'objects', row: 1, col: 1 },
            value: 9,
          },
        ],
        collision: [],
      },
      writable(),
    )
    const tiled = applyPreparedProjectMapPatch(map, tilePrepared)
    expect(tiled.layers[1]?.tiles[1]?.[1]).toBe(9)
    expect(tiled.layers[1]?.heights?.[1]?.[1]).toBe(3)
    expect(tiled.collision[1]?.[1]).toBe(2)

    const heightPrepared = prepareProjectMapPatch(
      map,
      {
        visual: [
          {
            channel: 'height',
            ref: { layerId: 'objects', row: 1, col: 1 },
            value: 4,
          },
        ],
        collision: [],
      },
      writable(),
    )
    const raised = applyPreparedProjectMapPatch(map, heightPrepared)
    expect(raised.layers[1]?.tiles[1]?.[1]).toBe(5)
    expect(raised.layers[1]?.heights?.[1]?.[1]).toBe(4)
    expect(raised.collision[1]?.[1]).toBe(2)

    const collisionPrepared = prepareProjectMapPatch(
      map,
      { visual: [], collision: [{ ref: { row: 1, col: 1 }, value: 8 }] },
      writable(['floor']),
    )
    const blocked = applyPreparedProjectMapPatch(map, collisionPrepared)
    expect(blocked.collision[1]?.[1]).toBe(8)
    expect(blocked.layers).toBe(map.layers)
  })

  test('mixed 批量高度保留各 tile；跨通道 apply/invert 双 prev 精确往返', () => {
    const map = fixtureMap()
    const patch: ProjectMapPatch = {
      visual: [
        {
          channel: 'height',
          ref: { layerId: 'objects', row: 1, col: 1 },
          value: 2,
        },
        {
          channel: 'height',
          ref: { layerId: 'objects', row: 2, col: 1 },
          value: 2,
        },
      ],
      collision: [{ ref: { row: 1, col: 1 }, value: 0 }],
    }
    const prepared = prepareProjectMapPatch(map, patch, writable())
    const next = applyPreparedProjectMapPatch(map, prepared)
    expect(next.layers[1]?.tiles[1]?.[1]).toBe(5)
    expect(next.layers[1]?.tiles[2]?.[1]).toBe(6)
    expect(next.layers[1]?.heights?.[1]?.[1]).toBe(2)
    expect(next.layers[1]?.heights?.[2]?.[1]).toBe(2)
    expect(next.collision[1]?.[1]).toBe(0)
    expect(applyPreparedProjectMapPatch(next, prepared, 'prev')).toEqual(map)
  })

  test.each([
    [
      'missing layer',
      {
        visual: [{ channel: 'tileId', ref: { layerId: 'ghost', row: 0, col: 0 }, value: 1 }],
        collision: [],
      },
      writable(),
      'layer-missing',
    ],
    [
      'out of bounds',
      {
        visual: [{ channel: 'tileId', ref: { layerId: 'objects', row: 99, col: 0 }, value: 1 }],
        collision: [],
      },
      writable(),
      'out-of-bounds',
    ],
    [
      'flat height',
      {
        visual: [{ channel: 'height', ref: { layerId: 'floor', row: 0, col: 0 }, value: 0 }],
        collision: [],
      },
      writable(['floor']),
      'flat-height',
    ],
    [
      'null height',
      {
        visual: [{ channel: 'height', ref: { layerId: 'objects', row: 0, col: 0 }, value: 1 }],
        collision: [],
      },
      writable(),
      'null-height',
    ],
    [
      'hidden',
      {
        visual: [{ channel: 'tileId', ref: { layerId: 'objects', row: 1, col: 1 }, value: 8 }],
        collision: [],
      },
      { ...writable(), hiddenLayerIds: ['objects'] },
      'hidden-layer',
    ],
    [
      'locked',
      {
        visual: [{ channel: 'tileId', ref: { layerId: 'objects', row: 1, col: 1 }, value: 8 }],
        collision: [],
      },
      { ...writable(), lockedLayerIds: ['objects'] },
      'locked-layer',
    ],
  ] as const)('%s 任一错误整笔零写', (_name, patch, permission, code) => {
    const map = fixtureMap()
    try {
      prepareProjectMapPatch(map, patch as ProjectMapPatch, permission)
      throw new Error('应拒绝')
    } catch (error) {
      expect(error).toBeInstanceOf(ProjectMapPatchError)
      expect((error as ProjectMapPatchError).issues.some((issue) => issue.code === code)).toBe(true)
    }
    expect(map).toEqual(fixtureMap())
  })

  test('非整数/负值/重复 channel/collision 无权限均预检拒绝', () => {
    const map = fixtureMap()
    const cases: [ProjectMapPatch, MapPatchPermissionSnapshot, string][] = [
      [
        {
          visual: [
            {
              channel: 'tileId',
              ref: { layerId: 'objects', row: 1.5, col: 1 },
              value: 2,
            },
          ],
          collision: [],
        },
        writable(),
        'invalid-coordinate',
      ],
      [
        {
          visual: [{ channel: 'tileId', ref: { layerId: 'objects', row: 1, col: 1 }, value: -1 }],
          collision: [],
        },
        writable(),
        'invalid-value',
      ],
      [
        {
          visual: [
            { channel: 'height', ref: { layerId: 'objects', row: 1, col: 1 }, value: 2 },
            { channel: 'height', ref: { layerId: 'objects', row: 1, col: 1 }, value: 3 },
          ],
          collision: [],
        },
        writable(),
        'duplicate-channel',
      ],
      [
        { visual: [], collision: [{ ref: { row: 0, col: 0 }, value: 1 }] },
        writable([]),
        'collision-authority-missing',
      ],
    ]
    for (const [patch, permission, code] of cases) {
      expect(() => prepareProjectMapPatch(map, patch, permission)).toThrow(ProjectMapPatchError)
      try {
        prepareProjectMapPatch(map, patch, permission)
      } catch (error) {
        expect((error as ProjectMapPatchError).issues.some((issue) => issue.code === code)).toBe(
          true,
        )
      }
    }
  })

  test.each([
    'hiddenLayerIds',
    'lockedLayerIds',
  ] as const)('collision-only 仍受权限归属层 %s 门禁，失败零写入', (blockedKey) => {
    const map = fixtureMap()
    const permission = {
      ...writable(['floor']),
      [blockedKey]: ['floor'],
    }
    expect(() =>
      prepareProjectMapPatch(
        map,
        { visual: [], collision: [{ ref: { row: 0, col: 0 }, value: 9 }] },
        permission,
      ),
    ).toThrow(ProjectMapPatchError)
    expect(map.collision[0]?.[0]).toBe(0)
  })

  test('空/no-op patch 返回原 map；Command 防御复制权限并对缺图显式失败', () => {
    const map = fixtureMap()
    const prepared = prepareProjectMapPatch(
      map,
      {
        visual: [{ channel: 'tileId', ref: { layerId: 'objects', row: 1, col: 1 }, value: 5 }],
        collision: [],
      },
      writable(),
    )
    expect(applyPreparedProjectMapPatch(map, prepared)).toBe(map)

    const hidden: string[] = []
    const command = new ApplyProjectMapPatchCommand(
      'map-a',
      {
        visual: [{ channel: 'height', ref: { layerId: 'objects', row: 1, col: 1 }, value: 4 }],
        collision: [],
      },
      { ...writable(), hiddenLayerIds: hidden },
    )
    hidden.push('objects')
    const state = { maps: { 'map-a': map } } as never as EditorState
    expect(command.apply(state).maps['map-a']?.layers[1]?.heights?.[1]?.[1]).toBe(4)
    expect(() => command.apply({ maps: {} } as never as EditorState)).toThrow(/尚未加载/)
  })

  test('Command 跨层视觉+collision 一次 apply/invert，旁 map 保持同引用', () => {
    const map = fixtureMap()
    const other = buildBlankProjectMap(1, 1, 'other')
    const state = { maps: { target: map, other } } as never as EditorState
    const command = new ApplyProjectMapPatchCommand(
      'target',
      {
        visual: [
          { channel: 'tileId', ref: { layerId: 'floor', row: 0, col: 0 }, value: 8 },
          { channel: 'height', ref: { layerId: 'objects', row: 1, col: 1 }, value: 9 },
        ],
        collision: [{ ref: { row: 1, col: 1 }, value: 0 }],
      },
      writable(['floor', 'objects']),
    )
    const changed = command.apply(state)
    expect(changed.maps.other).toBe(other)
    expect(changed.maps.target?.layers[0]?.tiles[0]?.[0]).toBe(8)
    expect(changed.maps.target?.layers[1]?.heights?.[1]?.[1]).toBe(9)
    expect(changed.maps.target?.collision[1]?.[1]).toBe(0)
    expect(command.invert(changed).maps.target).toEqual(map)
  })
})
