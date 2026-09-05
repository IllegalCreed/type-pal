import { describe, expect, test } from 'vitest'
import { nextSceneAssetIdentity, normalizeSceneAssetPath, validateSceneIndex } from './index.js'

describe('SceneIndexV1', () => {
  test('规范化并保持稳定 id、作者名称与显式路径', () => {
    expect(
      validateSceneIndex({
        version: 1,
        scenes: [{ id: 'home', name: ' 家 ', path: 'content/scenes/./home.json' }],
      }),
    ).toEqual({
      version: 1,
      scenes: [{ id: 'home', name: '家', path: 'content/scenes/home.json' }],
    })
  })

  test('拒绝非法版本、id、名称、重复路径和危险路径', () => {
    expect(() => validateSceneIndex({ version: 2, scenes: [] })).toThrow('仅支持 1')
    expect(() =>
      validateSceneIndex({
        version: 1,
        scenes: [{ id: '../bad', name: '坏', path: 'content/scenes/bad.json' }],
      }),
    ).toThrow('非法稳定 id')
    expect(() =>
      validateSceneIndex({
        version: 1,
        scenes: [{ id: 'a', name: ' ', path: 'content/scenes/a.json' }],
      }),
    ).toThrow('非空字符串')
    expect(() =>
      validateSceneIndex({
        version: 1,
        scenes: [
          { id: 'same', name: '甲', path: 'content/scenes/a.json' },
          { id: 'same', name: '乙', path: 'content/scenes/b.json' },
        ],
      }),
    ).toThrow('重复')
    expect(() =>
      validateSceneIndex({
        version: 1,
        scenes: [
          { id: 'a', name: '甲', path: 'content/scenes/a.json' },
          { id: 'b', name: '乙', path: 'content/scenes/./a.json' },
        ],
      }),
    ).toThrow('规范化后重复')
    expect(() => normalizeSceneAssetPath('../outside.json')).toThrow('禁止')
    expect(() => normalizeSceneAssetPath('/tmp/a.json')).toThrow('相对路径')
    expect(() =>
      validateSceneIndex({
        version: 1,
        scenes: [{ id: 'index', name: '错误', path: 'content/scenes/index.json' }],
      }),
    ).toThrow('不得覆盖')
  })

  test('新身份同时避开 id 与默认 path 冲突', () => {
    const index = validateSceneIndex({
      version: 1,
      scenes: [
        { id: 'home', name: '家', path: 'content/scenes/custom.json' },
        { id: 'other', name: '别处', path: 'content/scenes/home-2.json' },
      ],
    })
    expect(nextSceneAssetIdentity(index, 'Home', 'content/scenes/')).toEqual({
      id: 'home-3',
      path: 'content/scenes/home-3.json',
    })
  })
})
