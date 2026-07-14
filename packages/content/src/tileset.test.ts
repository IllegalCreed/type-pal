import { describe, expect, test } from 'vitest'
import { resolveTilesetPath, validateTilesets } from './tileset.js'

describe('validateTilesets(W7B)', () => {
  test('合法条目原样返回', () => {
    const v = validateTilesets([
      { id: 'grass', name: '草地', category: 'outdoor', path: 'assets/tilesets/grass.rle' },
      { id: 'pal-20', name: '原版·仙灵岛', category: 'builtin', path: 'tileset/20.rle' },
    ])
    expect(v.length).toBe(2)
    expect(v[1]!.path).toBe('tileset/20.rle')
  })
  test('重复 id / id 含斜杠 / 空字段 / 退役 tiles 字段 → 各自报错', () => {
    const base = { name: 'n', category: 'c', path: 'p.rle' }
    expect(() =>
      validateTilesets([
        { id: 'a', ...base },
        { id: 'a', ...base },
      ]),
    ).toThrow('重复 id')
    expect(() => validateTilesets([{ id: 'a/b', ...base }])).toThrow("不得含 '/'")
    expect(() => validateTilesets([{ id: 'a', name: '', category: 'c', path: 'p' }])).toThrow(
      'name',
    )
    expect(() => validateTilesets([{ id: 'a', ...base, tiles: [{}] }])).toThrow('已退役')
    expect(() => validateTilesets({})).toThrow('期望数组')
  })
})

describe('resolveTilesetPath', () => {
  const reg = [{ id: 'grass', name: '草', category: 'outdoor', path: 'assets/tilesets/grass.rle' }]
  test('注册表 id → 条目 path；路径直通与未知 id 均报错', () => {
    expect(resolveTilesetPath('grass', reg)).toBe('assets/tilesets/grass.rle')
    expect(() => resolveTilesetPath('tileset/20.rle', reg)).toThrow('不在注册表')
    expect(() => resolveTilesetPath('nope', reg)).toThrow('不在注册表')
  })
})
