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
})
