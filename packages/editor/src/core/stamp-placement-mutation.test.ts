import { type ProjectMap, type StampPlacementGroupV1, validateProjectMap } from '@type-pal/content'
import { buildBlankProjectMap, withProjectMapStampPlacements } from '@type-pal/reforge'
import { describe, expect, test } from 'vitest'
import { buildStampPlacementIndex } from './stamp-ownership.js'
import { applyStampPlacementMutation } from './stamp-placement-mutation.js'

function filledMap(width = 5, height = 4): ProjectMap {
  const map = buildBlankProjectMap(width, height, 'tiles-a')
  return {
    ...map,
    layers: map.layers.map((layer) => ({
      ...layer,
      tiles: layer.tiles.map((row) => row.map(() => 1)),
      sources: layer.sources.map((row) => row.map(() => 0)),
    })),
  }
}

function placement(
  id: string,
  row: number,
  col: number,
  patch: Partial<StampPlacementGroupV1> = {},
): StampPlacementGroupV1 {
  return {
    id,
    anchor: { row, col },
    visualSlots: [{ layerId: 'floor', row, col }],
    gridPoints: [{ row, col }],
    ...patch,
  }
}

describe('applyStampPlacementMutation', () => {
  test('add/replace/remove-last 都生成 content validator 接受的 canonical v4', () => {
    const base = filledMap()
    const added = applyStampPlacementMutation(base, base, {
      upsertPlacements: [
        placement('b', 2, 1, {
          sourceStampId: 'source-b',
          visualSlots: [
            { layerId: 'floor', row: 2, col: 1 },
            { layerId: 'floor', row: 1, col: 1 },
          ],
          gridPoints: [
            { row: 2, col: 1 },
            { row: 1, col: 1 },
          ],
        }),
      ],
    })
    expect(validateProjectMap(added)).toEqual(added)
    expect(added.version).toBe(4)
    expect(added.authoring!.stampPlacements[0]?.visualSlots).toEqual([
      { layerId: 'floor', row: 1, col: 1 },
      { layerId: 'floor', row: 2, col: 1 },
    ])

    const replaced = applyStampPlacementMutation(added, added, {
      removedPlacementIds: ['b'],
      upsertPlacements: [placement('b', 3, 2)],
    })
    expect(validateProjectMap(replaced)).toEqual(replaced)
    expect(replaced.authoring!.stampPlacements[0]?.anchor).toEqual({ row: 3, col: 2 })

    const removed = applyStampPlacementMutation(replaced, replaced, {
      removedPlacementIds: ['b'],
    })
    expect(removed.version).toBe(4)
    expect(removed.authoring).toBeUndefined()
    expect(validateProjectMap(removed)).toEqual(removed)
  })

  test('两个 upsert 互抢成员、或 upsert 抢 unchanged owner 都 fail-loud', () => {
    const base = filledMap()
    const owned = withProjectMapStampPlacements(base, [placement('owned', 0, 0)])

    expect(() =>
      applyStampPlacementMutation(owned, owned, {
        upsertPlacements: [placement('new', 0, 0)],
      }),
    ).toThrow(/已属于组合 placement "owned"/)

    expect(() =>
      applyStampPlacementMutation(base, base, {
        upsertPlacements: [placement('a', 1, 1), placement('b', 1, 1)],
      }),
    ).toThrow(/同时属于组合 "a" 与 "b"/)
  })

  test('collision ownership 与视觉 ownership 分通道独立校验', () => {
    const base = filledMap()
    const owned = withProjectMapStampPlacements(base, [placement('owned', 0, 0)])
    expect(() =>
      applyStampPlacementMutation(owned, owned, {
        upsertPlacements: [
          placement('new', 1, 1, {
            gridPoints: [{ row: 0, col: 0 }],
          }),
        ],
      }),
    ).toThrow(/碰撞格点.*已属于组合 placement "owned"/)

    expect(() =>
      applyStampPlacementMutation(base, base, {
        upsertPlacements: [
          placement('a', 1, 1, { gridPoints: [{ row: 3, col: 3 }] }),
          placement('b', 2, 2, { gridPoints: [{ row: 3, col: 3 }] }),
        ],
      }),
    ).toThrow(/碰撞格点.*同时属于组合 "a" 与 "b"/)
  })

  test('局部 canonicalizer 对齐 placement 的关键 schema 不变量', () => {
    const base = filledMap()
    const invalid: Array<[string, StampPlacementGroupV1, RegExp]> = [
      ['空来源', placement('a', 0, 0, { sourceStampId: '' }), /sourceStampId.*不能为空/],
      [
        '缺图层',
        placement('a', 0, 0, {
          visualSlots: [{ layerId: 'missing', row: 0, col: 0 }],
        }),
        /不存在的图层 "missing"/,
      ],
      ['零视觉成员', placement('a', 0, 0, { visualSlots: [] }), /至少拥有一个视觉槽/],
      [
        '重复视觉成员',
        placement('a', 0, 0, {
          visualSlots: [
            { layerId: 'floor', row: 0, col: 0 },
            { layerId: 'floor', row: 0, col: 0 },
          ],
        }),
        /重复视觉槽/,
      ],
      [
        '重复碰撞成员',
        placement('a', 0, 0, {
          gridPoints: [
            { row: 0, col: 0 },
            { row: 0, col: 0 },
          ],
        }),
        /重复碰撞格点/,
      ],
      ['越界', placement('a', 99, 0), /超出地图边界/],
    ]
    for (const [_name, candidate, message] of invalid)
      expect(() =>
        applyStampPlacementMutation(base, base, { upsertPlacements: [candidate] }),
      ).toThrow(message)

    const empty = buildBlankProjectMap(5, 4, 'tiles-a')
    expect(() =>
      applyStampPlacementMutation(empty, empty, {
        upsertPlacements: [placement('a', 0, 0)],
      }),
    ).toThrow(/不得指向空瓦片/)
  })

  test('拒绝把无关地图伪装成普通矩阵 patch，避免复用 stale authoring', () => {
    const before = withProjectMapStampPlacements(filledMap(), [placement('owned', 0, 0)])
    const unrelated = filledMap()
    expect(() => applyStampPlacementMutation(before, unrelated, {})).toThrow(
      /只接受保留结构与原 authoring 的矩阵 patch 派生地图/,
    )
  })

  test('缓存命中后新增一组不读取 unchanged placement 的成员数组', () => {
    const placements = Array.from({ length: 20 }, (_, index) =>
      placement(`placement-${index.toString().padStart(2, '0')}`, index, 0),
    )
    const before = withProjectMapStampPlacements(filledMap(5, 12), placements)
    buildStampPlacementIndex(before)
    expect(before.version).toBe(4)

    let memberReads = 0
    const observed = before.authoring!.stampPlacements[10]!
    const originalVisualSlots = observed.visualSlots
    const originalGridPoints = observed.gridPoints
    Object.defineProperties(observed, {
      visualSlots: {
        enumerable: true,
        get: () => {
          memberReads++
          return originalVisualSlots
        },
      },
      gridPoints: {
        enumerable: true,
        get: () => {
          memberReads++
          return originalGridPoints
        },
      },
    })

    const after = applyStampPlacementMutation(before, before, {
      upsertPlacements: [placement('placement-new', 21, 1)],
    })
    expect(memberReads).toBe(0)
    expect(validateProjectMap(after)).toEqual(after)
    expect(buildStampPlacementIndex(after).byId.get('placement-new')).toBeDefined()
  })
})
