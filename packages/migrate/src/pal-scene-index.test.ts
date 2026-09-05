import type { MapIndexV1 } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { assertPalSceneIndexOwnership, buildPalSceneIndex } from './pal-scene-index.js'

const maps: MapIndexV1 = {
  version: 1,
  maps: [
    { id: 'm1', name: '客栈', path: 'content/maps/m1.json' },
    { id: 'm2', name: '野外', path: 'content/maps/m2.json' },
  ],
}

describe('PAL SceneIndex content20 seed/ownership', () => {
  test('按稳定场景顺序用地图名确定性消歧', () => {
    expect(
      buildPalSceneIndex(
        [
          { id: 's1', mapId: 'm1' },
          { id: 's2', mapId: 'm1' },
          { id: 's3', mapId: 'missing' },
        ],
        maps,
      ),
    ).toEqual({
      version: 1,
      scenes: [
        { id: 's1', name: '客栈', path: 'content/scenes/s1.json' },
        { id: 's2', name: '客栈（2）', path: 'content/scenes/s2.json' },
        { id: 's3', name: '场景 s3', path: 'content/scenes/s3.json' },
      ],
    })
  })

  test('允许作者名称/路径与新增场景，但 raw-owned id 缺失会 fail-loud', () => {
    const generated = buildPalSceneIndex([{ id: 's1', mapId: 'm1' }], maps)
    expect(() =>
      assertPalSceneIndexOwnership({
        generated,
        current: {
          version: 1,
          scenes: [
            { id: 's1', name: '作者命名', path: 'content/authored/home.json' },
            { id: 'extra', name: '新增', path: 'content/scenes/extra.json' },
          ],
        },
      }),
    ).not.toThrow()
    expect(() =>
      assertPalSceneIndexOwnership({ generated, current: { version: 1, scenes: [] } }),
    ).toThrow('raw-owned')
  })
})
