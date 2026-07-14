import { describe, expect, it } from 'vitest'
import {
  DATA_PAGE_IDS,
  decodeEditorLocation,
  EDITOR_MODULE_IDS,
  EDITOR_MODULES,
  editorLinks,
  editorLocationHref,
  normalizeEditorLocation,
  sameEditorLocation,
} from './editor-navigation.js'

describe('编辑器模块注册表', () => {
  it('只登记八个一级模块，且每模块子页不超过五个', () => {
    expect(EDITOR_MODULES.map((module) => module.id)).toEqual(EDITOR_MODULE_IDS)
    expect(EDITOR_MODULES).toHaveLength(8)
    for (const module of EDITOR_MODULES) {
      expect(module.subpages.length).toBeGreaterThan(0)
      expect(module.subpages.length).toBeLessThanOrEqual(5)
      expect(module.subpages.some((subpage) => subpage.id === module.defaultSubpage)).toBe(true)
    }
  })

  it('十五个旧数据页恰好各登记一次', () => {
    const registered = EDITOR_MODULES.flatMap((module) =>
      module.subpages.flatMap((subpage) => (subpage.dataPage ? [subpage.dataPage] : [])),
    )
    expect([...registered].sort()).toEqual([...DATA_PAGE_IDS].sort())
    expect(new Set(registered).size).toBe(DATA_PAGE_IDS.length)
  })
})

describe('EditorLocation URL 契约', () => {
  it('解码合法位置和包含保留字符的对象 id', () => {
    const objectId = 'shared/user/剧情 #1?'
    const href = editorLocationHref(
      { module: 'story', subpage: 'scripts', objectId },
      'http://localhost:6010/editor?project=pal#main',
    )
    expect(href).toContain('project=pal')
    expect(decodeEditorLocation(new URL(href, 'http://localhost:6010').search)).toEqual({
      module: 'story',
      subpage: 'scripts',
      objectId,
    })
  })

  it('非法 module 回场景，合法 module 的非法 page 回本模块默认页', () => {
    expect(decodeEditorLocation('?module=unknown&page=oops&object=x')).toEqual({
      module: 'scene',
      subpage: 'workspace',
      objectId: 'x',
    })
    expect(decodeEditorLocation('?module=battle&page=oops')).toEqual({
      module: 'battle',
      subpage: 'skill',
    })
  })

  it('归一化空对象 id，位置比较不受对象字面量身份影响', () => {
    const normalized = normalizeEditorLocation({
      module: 'asset',
      subpage: 'sprite',
      objectId: '   ',
    })
    expect(normalized).toEqual({ module: 'asset', subpage: 'sprite' })
    expect(sameEditorLocation(normalized, { module: 'asset', subpage: 'sprite' })).toBe(true)
  })
})

describe('跨模块唯一链接', () => {
  it('场景脚本、角色精灵和场景地图都使用 EditorLocation', () => {
    expect(editorLinks.sharedScript('shared/user/intro')).toEqual({
      module: 'story',
      subpage: 'scripts',
      objectId: 'shared/user/intro',
    })
    expect(editorLinks.actorSprite('sprite-li')).toEqual({
      module: 'asset',
      subpage: 'sprite',
      objectId: 'sprite-li',
    })
    expect(editorLinks.map('map-home')).toEqual({
      module: 'map',
      subpage: 'workspace',
      objectId: 'map-home',
    })
  })
})
