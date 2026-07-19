import { describe, expect, test } from 'vitest'
import type { EditorState } from '../core/edit-session.js'
import { editorObjectTargetMissing } from './editor-target.js'

function makeState(overrides: Partial<EditorState> = {}): EditorState {
  return {
    manifest: { entryScene: 'start' },
    scenes: [],
    actors: [],
    sprites: [],
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
    const location = (objectId: string) => ({
      module: 'asset' as const,
      subpage: 'sprite' as const,
      objectId,
    })
    expect(editorObjectTargetMissing(state, location('hero'))).toBe(false)
    expect(editorObjectTargetMissing(state, location('sprite.unused'))).toBe(false)
    expect(editorObjectTargetMissing(state, location('music.not-sprite'))).toBe(true)
    expect(editorObjectTargetMissing(state, location('missing'))).toBe(true)
  })
})
