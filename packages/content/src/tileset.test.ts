import { describe, expect, test } from 'vitest'
import { resolveTilesetPath, tileHeightsOf, validateTilesets } from './tileset.js'

describe('validateTilesets(W7B)', () => {
  test('合法条目(含 tiles 元数据留字段)→ 原样返回', () => {
    const v = validateTilesets([
      { id: 'grass', name: '草地', category: 'outdoor', path: 'assets/tilesets/grass.rle' },
      { id: 'pal-20', name: '原版·仙灵岛', category: 'builtin', path: 'tileset/20.rle', tiles: [{ height: 2 }, {}] },
    ])
    expect(v.length).toBe(2)
    expect(v[1]!.tiles).toEqual([{ height: 2 }, {}])
  })
  test('重复 id / id 含斜杠 / 空字段 / height 负数 → 各自报错', () => {
    const base = { name: 'n', category: 'c', path: 'p.rle' }
    expect(() => validateTilesets([{ id: 'a', ...base }, { id: 'a', ...base }])).toThrow('重复 id')
    expect(() => validateTilesets([{ id: 'a/b', ...base }])).toThrow("不得含 '/'")
    expect(() => validateTilesets([{ id: 'a', name: '', category: 'c', path: 'p' }])).toThrow('name')
    expect(() => validateTilesets([{ id: 'a', ...base, tiles: [{ height: -1 }] }])).toThrow('非负整数')
    expect(() => validateTilesets({})).toThrow('期望数组')
  })
})

describe('resolveTilesetPath', () => {
  const reg = [{ id: 'grass', name: '草', category: 'outdoor', path: 'assets/tilesets/grass.rle' }]
  test('注册表 id → 条目 path;路径形态直通(原版借用);未知裸 id 报错', () => {
    expect(resolveTilesetPath('grass', reg)).toBe('assets/tilesets/grass.rle')
    expect(resolveTilesetPath('tileset/20.rle', reg)).toBe('tileset/20.rle')
    expect(() => resolveTilesetPath('nope', reg)).toThrow('不在注册表')
  })
})

describe('tileHeightsOf(W7 高度补全)', () => {
  const reg = [
    { id: 'wall', name: '墙', category: 'indoor', path: 'assets/tilesets/wall.rle',
      tiles: [{}, { height: 1 }, { height: 2 }, { height: 3 }, { height: 0 }] },
    { id: 'plain', name: '素', category: 'misc', path: 'assets/tilesets/plain.rle' },
  ]
  test('按 id 或 path 命中;只收显式标注;0 也收(纯地面语义)', () => {
    const h = tileHeightsOf(reg, 'wall')
    expect(h?.get(1)).toBe(1)
    expect(h?.get(3)).toBe(3)
    expect(h?.get(0)).toBeUndefined() // 未标注(空对象)不入表 → 渲染缺省 1
    expect(h?.get(4)).toBe(0) // 显式 0 = 不遮挡
    expect(tileHeightsOf(reg, 'assets/tilesets/wall.rle')?.get(2)).toBe(2) // path 匹配
    expect(tileHeightsOf(reg, 'plain')).toBeUndefined() // 无元数据
    expect(tileHeightsOf(reg, 'nope')).toBeUndefined()
  })
})
