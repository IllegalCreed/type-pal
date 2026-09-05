import type { AuthorCommand, AuthorSceneDef, ShopDef } from '@type-pal/content'
import { describe, expect, test, vi } from 'vitest'
import {
  AddShopCommand,
  DeleteShopCommand,
  DuplicateShopCommand,
  nextShopId,
  UpdateShopCommand,
} from './commands.js'
import { type EditorState, EditSession } from './edit-session.js'
import { collectCurrentProjectReferenceIndex } from './project-reference-adapters.js'

function state(shops: ShopDef[] = []): EditorState {
  return {
    manifest: {
      id: 'test',
      contentVersion: 20,
      content: {},
      entryPoints: [],
      assets: { catalog: 'assets/index.json', roles: {} },
    },
    shops,
    scenes: canonical([]).scenes,
    sceneIndex: {
      version: 1,
      scenes: [{ id: 'scene', name: '场景', path: 'content/scenes/scene.json' }],
    },
    mapIndex: { version: 1, maps: [] },
    actors: [],
    skills: [],
    levelUp: {},
    items: [],
    locale: {},
    sprites: [],
    battleSprites: [],
    enemies: [],
    maps: {},
    tilesets: [],
    stamps: [],
    worldVariables: {},
    tilesetBlobs: {},
    scriptChunks: {},
    sharedScripts: {},
    assetCatalog: { version: 1, assets: {} },
    assetBlobs: {},
  } as unknown as EditorState
}

function canonical(body: AuthorCommand[]) {
  const scene: AuthorSceneDef = {
    id: 'scene',
    mapId: 'map',
    entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
    entities: [
      {
        id: 'npc',
        zone: true,
        pos: { col: 0, row: 0, height: 0 },
        behaviors: {
          trigger: {
            main: {
              label: '商店',
              order: 0,
              flow: { kind: 'stages', initial: 'start', stages: [{ id: 'start', body }] },
            },
          },
        },
      },
    ],
  }
  return { scenes: [scene], items: [], sharedScripts: {} }
}

describe('shop lifecycle commands', () => {
  test('first shop0 registers persistence path, add undo/redo and invalid identities', () => {
    const initial = state()
    const session = new EditSession(initial)
    expect(nextShopId([])).toBe(0)
    session.dispatch(new AddShopCommand(0))
    expect(session.getState().manifest.content.shops).toBe('content/shops.json')
    expect(session.getState().shops).toEqual([{ id: 0, items: [] }])
    expect(() => session.dispatch(new AddShopCommand(0))).toThrow(/重复/)
    session.undo()
    expect(session.getState().manifest).toEqual(initial.manifest)
    session.redo()
    expect(session.getState().shops).toEqual([{ id: 0, items: [] }])
    expect(() => nextShopId([{ id: Number.MAX_SAFE_INTEGER, items: [] }])).toThrow()
    expect(() => new AddShopCommand(-1).apply(initial)).toThrow()
  })
  test('copy snapshots occurrences and fixed identity; redo survives changed or deleted source', () => {
    const initial = state([{ id: 7, items: ['a', 'b', 'a'] }])
    const command = new DuplicateShopCommand(7, nextShopId(initial.shops!))
    const copied = command.apply(initial)
    expect(copied.shops?.[1]).toEqual({ id: 8, items: ['a', 'b', 'a'] })
    expect(copied.shops?.[1]?.items).not.toBe(initial.shops?.[0]?.items)
    const undone = command.invert(copied)
    const edited = new UpdateShopCommand(7, ['b']).apply(undone)
    expect(command.apply(edited).shops?.[1]).toEqual({ id: 8, items: ['a', 'b', 'a'] })
    expect(command.apply({ ...undone, shops: [] }).shops).toEqual([
      { id: 8, items: ['a', 'b', 'a'] },
    ])
    expect(() => command.apply(copied)).toThrow(/重复/)
    expect(initial.shops).toEqual([{ id: 7, items: ['a', 'b', 'a'] }])
  })
  test('delete restores original occurrence/order, supports last shop, and redo rechecks canonical buy', () => {
    let script = canonical([
      { kind: 'openShop', mode: 'sell', shop: 999 },
      { kind: 'openShop', mode: 'sell', shop: 0 },
    ])
    const provider = vi.fn((s: EditorState) => collectCurrentProjectReferenceIndex(s, script))
    const session = new EditSession(
      state([
        { id: 0, items: [] },
        { id: 7, items: ['a', 'a'] },
        { id: 9, items: [] },
      ]),
    )
    session.dispatch(new DeleteShopCommand(7, provider))
    expect(session.getState().shops?.map(({ id }) => id)).toEqual([0, 9])
    session.undo()
    expect(session.getState().shops?.map(({ id }) => id)).toEqual([0, 7, 9])
    script = canonical([{ kind: 'openShop', mode: 'buy', shop: 7 }])
    expect(() => session.redo()).toThrow(/买入脚本引用/)
    expect(session.getState().shops?.[1]).toEqual({ id: 7, items: ['a', 'a'] })
    expect(provider).toHaveBeenCalledTimes(2)
    script = canonical([])
    session.redo()
    session.dispatch(new DeleteShopCommand(0, provider))
    session.dispatch(new DeleteShopCommand(9, provider))
    expect(session.getState().shops).toEqual([])
  })
  test('provider failure and a live unsaved buy never authorize deletion', () => {
    const initial = state([{ id: 0, items: [] }])
    expect(() =>
      new DeleteShopCommand(0, () => {
        throw new Error('index failed')
      }).apply(initial),
    ).toThrow('index failed')
    const provider = (s: EditorState) =>
      collectCurrentProjectReferenceIndex(
        s,
        canonical([{ kind: 'openShop', mode: 'buy', shop: 0 }]),
      )
    expect(() => new DeleteShopCommand(0, provider).apply(initial)).toThrow(/买入脚本引用/)
    expect(initial.shops).toHaveLength(1)
  })
})
