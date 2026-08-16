import { describe, expect, it } from 'vitest'
import {
  DATA_PAGE_IDS,
  decodeEditorLocation,
  EDITOR_MODULE_IDS,
  EDITOR_MODULES,
  editorLinks,
  editorLocationHref,
  locationForSubpageNavigation,
  normalizeEditorLocation,
  objectIdForSubpageNavigation,
  PROJECT_PAGE_IDS,
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

  it('十七个数据页恰好各登记一次', () => {
    const registered = EDITOR_MODULES.flatMap((module) =>
      module.subpages.flatMap((subpage) => (subpage.dataPage ? [subpage.dataPage] : [])),
    )
    expect([...registered].sort()).toEqual([...DATA_PAGE_IDS].sort())
    expect(new Set(registered).size).toBe(DATA_PAGE_IDS.length)
  })

  it('工程模块只有四个权威子页，入口与开局合并登记', () => {
    const project = EDITOR_MODULES.find((module) => module.id === 'project')!
    expect(project.subpages.map((subpage) => subpage.id)).toEqual(PROJECT_PAGE_IDS)
    expect(project.subpages.find((subpage) => subpage.id === 'entrypoint')?.label).toBe(
      '入口与开局',
    )
    expect(project.subpages.find((subpage) => subpage.id === 'startup')?.label).toBe(
      '全局资源与启动',
    )
    expect(project.subpages.some((subpage) => subpage.id === 'startworld')).toBe(false)
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
    expect(normalized).toEqual({
      module: 'asset',
      subpage: 'sprite',
      domain: 'world',
      view: 'definition',
    })
    expect(sameEditorLocation(normalized, { module: 'asset', subpage: 'sprite' })).toBe(true)
  })

  it('旧默认开局深链归一化到统一入口与开局页', () => {
    expect(decodeEditorLocation('?module=project&page=startworld')).toEqual({
      module: 'project',
      subpage: 'entrypoint',
    })
    expect(decodeEditorLocation('?module=project&page=entrypoint&object=chapter-2')).toEqual({
      module: 'project',
      subpage: 'entrypoint',
      objectId: 'chapter-2',
    })
  })

  it('切换资源子页不携带上一资源族的 objectId', () => {
    const asset = EDITOR_MODULES.find((module) => module.id === 'asset')!
    const music = asset.subpages.find((subpage) => subpage.id === 'music')!
    const sound = asset.subpages.find((subpage) => subpage.id === 'sound')!
    const cutscene = asset.subpages.find((subpage) => subpage.id === 'cutscene')!
    const current = { module: 'asset', subpage: 'music', objectId: 'music.pal.003' } as const

    expect(objectIdForSubpageNavigation(current, music)).toBe('music.pal.003')
    expect(objectIdForSubpageNavigation(current, sound)).toBeUndefined()
    expect(objectIdForSubpageNavigation(current, cutscene)).toBeUndefined()
  })

  it('重点当前精灵库 tab 保留 battle/asset 显式路由真值', () => {
    const sprite = EDITOR_MODULES.find((module) => module.id === 'asset')!.subpages.find(
      (subpage) => subpage.id === 'sprite',
    )!
    expect(
      locationForSubpageNavigation(
        {
          module: 'asset',
          subpage: 'sprite',
          objectId: 'battle-sprite.pal.enemy.001',
          domain: 'battle',
          view: 'asset',
        },
        sprite,
      ),
    ).toEqual({
      module: 'asset',
      subpage: 'sprite',
      objectId: 'battle-sprite.pal.enemy.001',
      domain: 'battle',
      view: 'asset',
    })
  })

  it('大世界精灵动作深链往返保留稳定 ActionId', () => {
    const location = editorLinks.worldSpriteAction('sprite-77', 'whip/loop #1')
    const href = editorLocationHref(location, 'http://localhost:6010/editor?project=pal')

    expect(decodeEditorLocation(new URL(href, 'http://localhost:6010').search)).toEqual(location)
    expect(href).toContain('action=whip%2Floop+%231')
  })

  it('角色工作区分区深链往返并拒绝未知分区', () => {
    const location = editorLinks.actor('li-xiaoyao', 'relationships')
    const href = editorLocationHref(location, 'http://localhost:6010/editor?project=pal')

    expect(decodeEditorLocation(new URL(href, 'http://localhost:6010').search)).toEqual(location)
    expect(href).toContain('action=relationships')
    expect(
      normalizeEditorLocation({
        module: 'actor',
        subpage: 'workspace',
        objectId: 'li-xiaoyao',
        actionId: 'unknown-section',
      }),
    ).toEqual(editorLinks.actor('li-xiaoyao'))
  })

  it('动作深链只属于大世界定义视图，并参与位置比较', () => {
    expect(
      normalizeEditorLocation({
        module: 'asset',
        subpage: 'sprite',
        objectId: 'battle-sprite.pal.enemy.001',
        domain: 'battle',
        view: 'definition',
        actionId: 'idle',
      }),
    ).toEqual({
      module: 'asset',
      subpage: 'sprite',
      objectId: 'battle-sprite.pal.enemy.001',
      domain: 'battle',
      view: 'definition',
    })
    expect(
      normalizeEditorLocation({
        module: 'asset',
        subpage: 'sprite',
        objectId: 'sprite-77',
        domain: 'world',
        view: 'asset',
        actionId: 'idle',
      }),
    ).toEqual({
      module: 'asset',
      subpage: 'sprite',
      objectId: 'sprite-77',
      domain: 'world',
      view: 'asset',
    })
    expect(
      sameEditorLocation(
        editorLinks.worldSpriteAction('sprite-77', 'idle'),
        editorLinks.worldSpriteAction('sprite-77', 'whip'),
      ),
    ).toBe(false)
  })

  it('留在精灵库子页时动作深链不丢失', () => {
    const sprite = EDITOR_MODULES.find((module) => module.id === 'asset')!.subpages.find(
      (subpage) => subpage.id === 'sprite',
    )!
    const location = editorLinks.worldSpriteAction('sprite-77', 'whip')

    expect(locationForSubpageNavigation(location, sprite)).toEqual(location)
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
      domain: 'world',
      view: 'definition',
    })
    expect(editorLinks.worldSpriteAction('sprite-77', 'whip')).toEqual({
      module: 'asset',
      subpage: 'sprite',
      objectId: 'sprite-77',
      domain: 'world',
      view: 'definition',
      actionId: 'whip',
    })
    expect(editorLinks.battleSpriteDefinition('enemy-001')).toEqual({
      module: 'asset',
      subpage: 'sprite',
      objectId: 'enemy-001',
      domain: 'battle',
      view: 'definition',
    })
    expect(editorLinks.battleSpriteAsset('battle-sprite.pal.enemy.001')).toEqual({
      module: 'asset',
      subpage: 'sprite',
      objectId: 'battle-sprite.pal.enemy.001',
      domain: 'battle',
      view: 'asset',
    })
    expect(editorLinks.map('map-home')).toEqual({
      module: 'map',
      subpage: 'workspace',
      objectId: 'map-home',
    })
    expect(editorLinks.stamp('tree-corner')).toEqual({
      module: 'map',
      subpage: 'stamp',
      objectId: 'tree-corner',
    })
    expect(editorLinks.tileset('tileset-forest')).toEqual({
      module: 'map',
      subpage: 'tileset',
      objectId: 'tileset-forest',
    })
    expect(editorLinks.sound('sound.pal.045')).toEqual({
      module: 'asset',
      subpage: 'sound',
      objectId: 'sound.pal.045',
    })
    expect(editorLinks.image('portrait.pal.001')).toEqual({
      module: 'asset',
      subpage: 'image',
      objectId: 'portrait.pal.001',
    })
    expect(editorLinks.shop(7)).toEqual({
      module: 'item',
      subpage: 'shop',
      objectId: '7',
    })
    expect(editorLinks.poison(13)).toEqual({
      module: 'battle',
      subpage: 'poison',
      objectId: '13',
    })
    expect(editorLinks.battleField(24)).toEqual({
      module: 'battle',
      subpage: 'battlefield',
      objectId: '24',
    })
    expect(editorLinks.entryPoint('chapter-2')).toEqual({
      module: 'project',
      subpage: 'entrypoint',
      objectId: 'chapter-2',
    })
  })
})
