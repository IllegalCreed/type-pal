import { describe, expect, test } from 'vitest'
import type { EditorState } from '../core/edit-session.js'
import { editorObjectTargetMissing } from './editor-target.js'

function makeState(overrides: Partial<EditorState> = {}): EditorState {
  return {
    manifest: {
      id: 'test',
      name: 'Test',
      contentVersion: 20,
      minimumSaveVersion: 8,
      defaultEntryId: 'main',
      entryPoints: [
        {
          id: 'main',
          label: '主要入口',
          scene: 'start',
          startWorld: { party: [], money: 0, inventory: [] },
        },
      ],
      content: {},
      assets: { catalog: 'assets/index.json', roles: {} },
    },
    scenes: [],
    actors: [],
    sprites: [],
    battleSprites: [],
    tilesets: [],
    stamps: [],
    ambiences: [],
    sceneIndex: { version: 1, scenes: [] },
    mapIndex: { version: 1, maps: [] },
    assetCatalog: { version: 1, assets: {} },
    ...overrides,
  } as unknown as EditorState
}

describe('editorObjectTargetMissing', () => {
  test('入口点深链只接受真实稳定入口 id', () => {
    const state = makeState()
    expect(
      editorObjectTargetMissing(state, {
        module: 'project',
        subpage: 'entrypoint',
        objectId: 'main',
      }),
    ).toBe(false)
    expect(
      editorObjectTargetMissing(state, {
        module: 'project',
        subpage: 'entrypoint',
        objectId: 'removed-entry',
      }),
    ).toBe(true)
  })

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

  test('氛围深链只接受现存稳定 id', () => {
    const state = makeState({
      ambiences: [{ id: 'night', name: '夜晚', tint: [117, 229, 255] }],
    })
    expect(
      editorObjectTargetMissing(state, {
        module: 'scene',
        subpage: 'ambience',
        objectId: 'night',
      }),
    ).toBe(false)
    expect(
      editorObjectTargetMissing(state, {
        module: 'scene',
        subpage: 'ambience',
        objectId: 'removed',
      }),
    ).toBe(true)
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

  test('物品引用可深链到具体商店和毒定义', () => {
    const state = makeState({
      shops: [{ id: 7, items: [] }],
      poisons: [{ id: 13, name: '赤毒', color: 0, curability: 'common' }],
    })
    expect(
      editorObjectTargetMissing(state, { module: 'item', subpage: 'shop', objectId: '7' }),
    ).toBe(false)
    expect(
      editorObjectTargetMissing(state, { module: 'item', subpage: 'shop', objectId: '8' }),
    ).toBe(true)
    expect(
      editorObjectTargetMissing(state, { module: 'battle', subpage: 'poison', objectId: '13' }),
    ).toBe(false)
    expect(
      editorObjectTargetMissing(state, { module: 'battle', subpage: 'poison', objectId: '99' }),
    ).toBe(true)
  })

  test('炼蛊皿与紫金葫芦深链以 owner 物品存在为准，effect 缺席交给页面空态', () => {
    const state = makeState({
      items: [
        {
          id: '268',
          name: '炼蛊皿',
          desc: [],
          buyPrice: 0,
          sellPrice: 0,
          sellable: false,
          use: { target: 'scene', consuming: false, effects: [] },
        },
      ],
    })
    expect(
      editorObjectTargetMissing(state, {
        module: 'item',
        subpage: 'crafting',
        objectId: '268',
      }),
    ).toBe(false)
    expect(
      editorObjectTargetMissing(state, {
        module: 'item',
        subpage: 'spirit-gourd',
        objectId: '270',
      }),
    ).toBe(true)
  })

  test('战场深链以显式数值 id 判断存在与撤销残留', () => {
    const state = makeState({
      battleFields: [
        {
          id: 24,
          screenWave: 0,
          magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
        },
      ],
    })
    expect(
      editorObjectTargetMissing(state, {
        module: 'battle',
        subpage: 'battlefield',
        objectId: '24',
      }),
    ).toBe(false)
    expect(
      editorObjectTargetMissing(state, {
        module: 'battle',
        subpage: 'battlefield',
        objectId: '25',
      }),
    ).toBe(true)
  })

  test('脚本库深链同时识别 canonical 作者脚本与 runtime script index', () => {
    const state = makeState({
      scriptIndex: {
        version: 1,
        shards: { shared: 16, global: {} },
        chunks: {},
        library: {
          'legacy/story': {
            name: '运行时脚本',
            self: 'none',
          },
        },
      },
    })
    const canonicalSharedScripts = {
      'shared/user/canonical': {
        name: 'Canonical 脚本',
        self: 'none',
        body: [],
      },
    }

    expect(
      editorObjectTargetMissing(
        state,
        {
          module: 'story',
          subpage: 'scripts',
          objectId: 'shared/user/canonical',
        },
        canonicalSharedScripts,
      ),
    ).toBe(false)
    expect(
      editorObjectTargetMissing(state, {
        module: 'story',
        subpage: 'scripts',
        objectId: 'legacy/story',
      }),
    ).toBe(false)
    expect(
      editorObjectTargetMissing(state, {
        module: 'story',
        subpage: 'scripts',
        objectId: 'missing',
      }),
    ).toBe(true)
  })
})
