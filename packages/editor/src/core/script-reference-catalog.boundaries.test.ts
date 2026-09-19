/**
 * TEST-EDITOR-SCRIPT-HELPERS-1 S04：script-reference-catalog authorScripts 轴。
 * 既有 script-reference-catalog.test 已覆盖全 kind label/path/未知——不重复。
 * 本文件：authorScripts 同名不同 ID 稳定序（zh-CN + id tie-break）、名字 trim、
 * 显式空数组不退 library、输入对象保真。
 */
import { describe, expect, test } from 'vitest'
import {
  createScriptReferenceCatalog,
  type ScriptReferenceCatalogInput,
} from './script-reference-catalog.js'

function baseInput(authorScripts?: Array<{ id: string; name: string }>) {
  return {
    locale: {},
    items: [],
    skills: [],
    actors: [],
    poisons: [],
    sprites: [],
    battleSprites: [],
    ambiences: [],
    mapIndex: { version: 1 as const, maps: [] },
    assetCatalog: { version: 1 as const, assets: {} },
    scriptIndex: {
      version: 1 as const,
      shards: { shared: 16, global: {} },
      chunks: {},
      library: {
        'shared/legacy/a': { name: '旧库脚本', self: 'none' },
      },
    },
    ...(authorScripts === undefined ? {} : { authorScripts }),
  } as ScriptReferenceCatalogInput
}

describe('S04 authorScripts 优先与稳定序', () => {
  test('同名不同 ID 按 zh-CN 名称序 + id tie-break 稳定；名字 trim 生效', () => {
    const catalog = createScriptReferenceCatalog(
      baseInput([
        { id: 'shared/b', name: '  白魔法  ' },
        { id: 'shared/c', name: '白魔法' },
        { id: 'shared/a', name: '暗器' },
      ]),
    )
    expect(catalog.choices('authorScript')).toEqual([
      { id: 'shared/a', name: '暗器' },
      { id: 'shared/b', name: '白魔法' },
      { id: 'shared/c', name: '白魔法' }, // 同名按 id 稳定 tie-break
    ])
    expect(catalog.label('authorScript', 'shared/b')).toBe('白魔法（shared/b）')
    expect(catalog.has('authorScript', 'shared/a')).toBe(true)
  })
  test('显式空数组不退 library（库脚本不泄漏）；缺省时才用 library', () => {
    const empty = createScriptReferenceCatalog(baseInput([]))
    expect(empty.choices('authorScript')).toEqual([])
    expect(empty.has('authorScript', 'shared/legacy/a')).toBe(false)
    const fallback = createScriptReferenceCatalog(baseInput())
    expect(fallback.choices('authorScript')).toEqual([{ id: 'shared/legacy/a', name: '旧库脚本' }])
  })
})
