import { describe, expect, test } from 'vitest'
import type { EditorState } from '../core/edit-session.js'
import { editorObjectTargetMissing } from './editor-target.js'

function makeState(overrides: Partial<EditorState> = {}): EditorState {
  return {
    manifest: { entryScene: 'start' },
    scenes: [],
    actors: [],
    sprites: [],
    battleSprites: [],
    tilesets: [],
    stamps: [],
    mapIndex: { version: 1, maps: [] },
    assetCatalog: { version: 1, assets: {} },
    ...overrides,
  } as unknown as EditorState
}

describe('editorObjectTargetMissing', () => {
  test('瓦片集撤销新增后识别 URL 残留；现存对象保持有效', () => {
    const state = makeState({
      tilesets: [
        {
          id: 'starter',
          name: '起始地形',
          category: 'outdoor',
          asset: 'tileset.generated.starter',
        },
      ],
    })
    expect(
      editorObjectTargetMissing(state, {
        module: 'map',
        subpage: 'tileset',
        objectId: 'starter',
      }),
    ).toBe(false)
    expect(
      editorObjectTargetMissing(state, {
        module: 'map',
        subpage: 'tileset',
        objectId: 'undone-import',
      }),
    ).toBe(true)
  })

  test('没有 object 的页面和不接收 object 的页面不误报', () => {
    const state = makeState()
    expect(editorObjectTargetMissing(state, { module: 'map', subpage: 'tileset' })).toBe(false)
    expect(
      editorObjectTargetMissing(state, {
        module: 'project',
        subpage: 'overview',
        objectId: 'ignored',
      }),
    ).toBe(false)
  })

  test('精灵页同时接受语义定义 id 与 sprite AssetId，拒绝其它资源和缺失目标', () => {
    const state = makeState({
      sprites: [
        {
          id: 'hero',
          asset: 'sprite.hero',
          label: 'Hero',
          layout: { kind: 'static' },
        },
      ],
      assetCatalog: {
        version: 1,
        assets: {
          'sprite.hero': { kind: 'sprite' } as never,
          'sprite.unused': { kind: 'sprite' } as never,
          'music.not-sprite': { kind: 'music' } as never,
        },
      },
    })
    const definitionLocation = (objectId: string) => ({
      module: 'asset' as const,
      subpage: 'sprite' as const,
      objectId,
      domain: 'world' as const,
      view: 'definition' as const,
    })
    const assetLocation = (objectId: string) => ({
      ...definitionLocation(objectId),
      view: 'asset' as const,
    })
    expect(editorObjectTargetMissing(state, definitionLocation('hero'))).toBe(false)
    expect(editorObjectTargetMissing(state, definitionLocation('sprite.unused'))).toBe(true)
    expect(editorObjectTargetMissing(state, assetLocation('sprite.unused'))).toBe(false)
    expect(editorObjectTargetMissing(state, assetLocation('music.not-sprite'))).toBe(true)
    expect(editorObjectTargetMissing(state, definitionLocation('missing'))).toBe(true)
  })

  test('同名 object 完全由 domain + view 决定语义，不按 id 推断', () => {
    const state = makeState({
      sprites: [
        { id: 'shared', asset: 'sprite.world', label: 'World', layout: { kind: 'static' } },
      ],
      battleSprites: [
        {
          id: 'shared',
          asset: 'shared',
          label: 'Battle',
          profile: { kind: 'summon' },
        },
      ],
      assetCatalog: {
        version: 1,
        assets: {
          'sprite.world': { kind: 'sprite' } as never,
          shared: { kind: 'battle-sprite' } as never,
        },
      },
    })
    const base = { module: 'asset' as const, subpage: 'sprite' as const, objectId: 'shared' }
    expect(editorObjectTargetMissing(state, { ...base, domain: 'world', view: 'definition' })).toBe(
      false,
    )
    expect(
      editorObjectTargetMissing(state, { ...base, domain: 'battle', view: 'definition' }),
    ).toBe(false)
    expect(editorObjectTargetMissing(state, { ...base, domain: 'battle', view: 'asset' })).toBe(
      false,
    )
    expect(editorObjectTargetMissing(state, { ...base, domain: 'world', view: 'asset' })).toBe(true)
  })
})
