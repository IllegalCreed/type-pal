import type { MapIndexV1 } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { assertPalSceneIndexOwnership, buildPalSceneIndex } from './pal-scene-index.js'

const maps: MapIndexV1 = {
  version: 1,
  maps: [
    { id: 'map-001', name: '客栈', path: 'content/maps/map-001.json' },
    { id: 'map-002', name: '野外', path: 'content/maps/map-002.json' },
  ],
}

describe('PAL 场景目录初始命名', () => {
  test('按来源顺序为共用地图名的场景分配确定后缀', () => {
    expect(
      buildPalSceneIndex(
        [
          { id: 's002', mapId: 'map-001' },
          { id: 's004', mapId: 'map-001' },
          { id: 's011', mapId: 'map-002' },
        ],
        maps,
      ),
    ).toEqual({
      version: 1,
      scenes: [
        { id: 's002', name: '客栈', path: 'content/scenes/s002.json' },
        { id: 's004', name: '客栈（2）', path: 'content/scenes/s004.json' },
        { id: 's011', name: '野外', path: 'content/scenes/s011.json' },
      ],
    })
  })

  test('没有地图标题时用稳定场景 id 播种目录显示名', () => {
    const { scenes } = buildPalSceneIndex([{ id: 's042', mapId: 'map-042' }], maps)
    expect(scenes).toEqual([{ id: 's042', name: '场景 s042', path: 'content/scenes/s042.json' }])
  })
})

describe('PAL 原始场景目录归属', () => {
  const generated = buildPalSceneIndex([{ id: 's002', mapId: 'map-001' }], maps)

  test('保留原始场景 id 时允许作者改名、改路径及增添场景', () => {
    expect(() =>
      assertPalSceneIndexOwnership({
        generated,
        current: {
          version: 1,
          scenes: [
            { id: 's002', name: '作者命名', path: 'content/authored/home.json' },
            { id: 'extra', name: '新增', path: 'content/scenes/extra.json' },
          ],
        },
      }),
    ).not.toThrow()
  })

  test('作者同名且同路径的场景不能替代原始场景 id', () => {
    expect(() =>
      assertPalSceneIndexOwnership({
        generated,
        current: {
          version: 1,
          scenes: [{ id: 'authored', name: '客栈', path: 'content/scenes/s002.json' }],
        },
      }),
    ).toThrow('PAL SceneIndex 缺 raw-owned 场景: s002')
  })
})
