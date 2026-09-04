import type { AssetRecordV1, ItemData } from '@type-pal/content'
import { describe, expect, test, vi } from 'vitest'
import {
  AddItemCommand,
  CompositeCommand,
  DeleteItemCommand,
  ItemInUseError,
  UpdateItemCommand,
  UpsertAssetCommand,
} from './commands.js'
import type { EditorState } from './edit-session.js'
import { EditSession } from './edit-session.js'
import { collectCurrentProjectReferenceIndex } from './project-reference-adapters.js'
import type { ScriptEditorState } from './script-editor.js'

const item = (id: string): ItemData => ({
  id,
  name: id,
  desc: [],
  buyPrice: 0,
  sellPrice: 0,
  sellable: false,
})

function state(items: ItemData[] = []): EditorState {
  return {
    items,
    scenes: [],
    actors: [],
    skills: [],
    levelUp: {},
    manifest: {
      id: 'items',
      name: 'items',
      contentVersion: 19,
      defaultEntryId: 'main',
      content: {},
      assets: { catalog: 'assets/index.json', roles: {} },
      entryPoints: [
        {
          id: 'main',
          label: '主要入口',
          scene: 's',
          startWorld: { party: [], money: 0, inventory: [] },
        },
      ],
    },
    locale: {},
    sprites: [],
    battleSprites: [],
    maps: {},
    mapIndex: { version: 1, maps: [] },
    stamps: [],
    tilesetBlobs: {},
    scriptChunks: {},
    assetCatalog: { version: 1, assets: {} },
    assetBlobs: {},
  } as unknown as EditorState
}

describe('物品 CRUD 命令', () => {
  const references = (current: EditorState, canonical?: ScriptEditorState) =>
    collectCurrentProjectReferenceIndex(current, canonical)

  test('AddItem 深拷贝、按位置插入并拒绝 id 冲突', () => {
    const source: ItemData = {
      ...item('new'),
      use: { target: 'oneAlly', consuming: true, effects: [{ kind: 'healHp', amount: 5 }] },
    }
    const command = new AddItemCommand(source, 1)
    const next = command.apply(state([item('a'), item('b')]))

    source.use!.effects[0] = { kind: 'healHp', amount: 99 }
    expect(next.items.map((entry) => entry.id)).toEqual(['a', 'new', 'b'])
    expect(next.items[1]!.use!.effects[0]).toEqual({ kind: 'healHp', amount: 5 })
    expect(() => new AddItemCommand(item('a')).apply(next)).toThrow(/id 已存在/)
    expect(command.invert(next).items.map((entry) => entry.id)).toEqual(['a', 'b'])
  })

  test('DeleteItem 有外部引用时 fail-loud，不会产生半删除状态', () => {
    const current = state([item('used')])
    current.manifest.entryPoints[0].startWorld.inventory = [{ itemId: 'used', count: 1 }]

    expect(() => new DeleteItemCommand('used', references).apply(current)).toThrow(ItemInUseError)
    expect(current.items.map((entry) => entry.id)).toEqual(['used'])
  })

  test.each([
    {
      name: '炼蛊材料',
      owner: {
        ...item('vessel'),
        use: {
          target: 'scene' as const,
          consuming: false,
          effects: [
            {
              kind: 'craftRecipe' as const,
              recipes: [
                {
                  ingredients: [{ itemId: 'used', count: 1 }],
                  products: [{ itemId: 'product', count: 1 }],
                },
              ],
            },
          ],
        },
      },
    },
    {
      name: '炼蛊产物',
      owner: {
        ...item('vessel'),
        use: {
          target: 'scene' as const,
          consuming: false,
          effects: [
            {
              kind: 'craftRecipe' as const,
              recipes: [
                {
                  ingredients: [{ itemId: 'material', count: 1 }],
                  products: [{ itemId: 'used', count: 1 }],
                },
              ],
            },
          ],
        },
      },
    },
    {
      name: '灵葫奖励',
      owner: {
        ...item('gourd'),
        use: {
          target: 'scene' as const,
          consuming: false,
          effects: [
            {
              kind: 'drawFromResourcePool' as const,
              resource: 'collectValue',
              maxRoll: 1,
              rewards: [{ itemId: 'used', count: 1 }],
            },
          ],
        },
      },
    },
  ])('DeleteItem 会阻断 $name 引用', ({ owner }) => {
    const current = state([item('used'), item('material'), item('product'), owner])
    expect(() => new DeleteItemCommand('used', references).apply(current)).toThrow(ItemInUseError)
    expect(current.items.some((entry) => entry.id === 'used')).toBe(true)
  })

  test('DeleteItem 每次从 canonical provider 重算脚本引用', () => {
    const current = state([item('used')])
    const canonical: ScriptEditorState = {
      scenes: [],
      items: [],
      sharedScripts: {
        'shared/user/reward': {
          name: '奖励',
          self: 'none',
          body: [{ kind: 'giveItem', itemId: 'used' }],
        },
      },
    }
    const command = new DeleteItemCommand('used', (state) => references(state, canonical))

    expect(() => command.apply(current)).toThrow(ItemInUseError)
    canonical.sharedScripts['shared/user/reward']!.body = []
    expect(command.apply(current).items).toHaveLength(0)
  })

  test('DeleteItem 缺目标不调用 oracle，provider 失败不产生半删除', () => {
    const current = state([item('used')])
    const provider = vi.fn(() => {
      throw new Error('reference oracle unavailable')
    })

    expect(new DeleteItemCommand('missing', provider).apply(current)).toBe(current)
    expect(provider).not.toHaveBeenCalled()
    expect(() => new DeleteItemCommand('used', provider).apply(current)).toThrow(
      /reference oracle unavailable/,
    )
    expect(current.items.map((entry) => entry.id)).toEqual(['used'])
  })

  test('DeleteItem 的物品内部边随 owner 删除，不会造成自锁', () => {
    const owner = {
      ...item('vessel'),
      use: {
        target: 'scene' as const,
        consuming: false,
        effects: [
          {
            kind: 'craftRecipe' as const,
            recipes: [
              {
                ingredients: [{ itemId: 'vessel', count: 1 }],
                products: [{ itemId: 'vessel', count: 1 }],
              },
            ],
          },
        ],
      },
    }
    expect(new DeleteItemCommand('vessel', references).apply(state([owner])).items).toEqual([])
  })

  test('DeleteItem redo 会按最新 canonical oracle 重验并保留 redo', () => {
    const canonical: ScriptEditorState = {
      scenes: [],
      items: [],
      sharedScripts: {
        reward: { name: '奖励', self: 'none', body: [] },
      },
    }
    const session = new EditSession(state([item('a'), item('b')]))
    const command = new DeleteItemCommand('b', (current) => references(current, canonical))

    expect(session.dispatch(command)).toBe(true)
    expect(session.undo()).toBe(true)
    canonical.sharedScripts.reward!.body = [{ kind: 'giveItem', itemId: 'b' }]
    expect(() => session.redo()).toThrow(ItemInUseError)
    expect(session.getState().items.map((entry) => entry.id)).toEqual(['a', 'b'])
    expect(session.canRedo()).toBe(true)
  })

  test('EditSession 删除、撤销和重做保持原位置与内容', () => {
    const session = new EditSession(state([item('a'), item('b'), item('c')]))
    expect(session.dispatch(new DeleteItemCommand('b', references))).toBe(true)
    expect(session.getState().items.map((entry) => entry.id)).toEqual(['a', 'c'])
    expect(session.undo()).toBe(true)
    expect(session.getState().items.map((entry) => entry.id)).toEqual(['a', 'b', 'c'])
    expect(session.redo()).toBe(true)
    expect(session.getState().items.map((entry) => entry.id)).toEqual(['a', 'c'])
  })

  test('删除物品会同步移除其迁移诊断，撤销和重做精确恢复 sidecar', () => {
    const current = state([item('a'), item('b')])
    current.migrationDiagnostics = {
      version: 1,
      diagnostics: [
        {
          id: 'item-use:a',
          severity: 'warn',
          target: {
            domain: 'item',
            objectId: 'a',
            capability: 'use',
            label: 'a',
          },
          category: 'manual-review',
          reason: 'a 待迁移',
          source: { kind: 'legacy-script', label: 'L_1', address: 1 },
        },
        {
          id: 'item-use:b',
          severity: 'warn',
          target: {
            domain: 'item',
            objectId: 'b',
            capability: 'use',
            label: 'b',
          },
          category: 'story-script',
          reason: 'b 待迁移',
          source: { kind: 'legacy-script', label: 'L_2', address: 2 },
        },
      ],
    }
    const before = structuredClone(current.migrationDiagnostics)
    const session = new EditSession(current)

    expect(session.dispatch(new DeleteItemCommand('b', references))).toBe(true)
    expect(session.getState().items.map((entry) => entry.id)).toEqual(['a'])
    expect(session.getState().migrationDiagnostics?.diagnostics.map((row) => row.id)).toEqual([
      'item-use:a',
    ])

    expect(session.undo()).toBe(true)
    expect(session.getState().items.map((entry) => entry.id)).toEqual(['a', 'b'])
    expect(session.getState().migrationDiagnostics).toEqual(before)

    expect(session.redo()).toBe(true)
    expect(session.getState().items.map((entry) => entry.id)).toEqual(['a'])
    expect(session.getState().migrationDiagnostics?.diagnostics.map((row) => row.id)).toEqual([
      'item-use:a',
    ])
  })

  test('导入图标并绑定是一个撤销单元', () => {
    const current = state([{ ...item('a'), icon: 'item-icon.old' }])
    const bytes = new Uint8Array([137, 80, 78, 71]).buffer
    const record: AssetRecordV1 = {
      kind: 'item-icon',
      path: 'assets/authored/item-icon/new.png',
      mediaType: 'image/png',
      bytes: bytes.byteLength,
      sha256: 'a'.repeat(64),
      origin: { kind: 'authored', ref: 'new.png' },
    }
    const session = new EditSession(current)

    session.dispatch(
      new CompositeCommand('导入并设置物品图标', [
        new UpsertAssetCommand('item-icon.new', record, bytes),
        new UpdateItemCommand('a', { icon: 'item-icon.new' }),
      ]),
    )
    expect(session.getState().items[0]?.icon).toBe('item-icon.new')
    expect(session.getState().assetCatalog.assets['item-icon.new']).toEqual(record)
    expect(session.getState().assetBlobs[record.path]).toEqual(bytes)

    expect(session.undo()).toBe(true)
    expect(session.getState().items[0]?.icon).toBe('item-icon.old')
    expect(session.getState().assetCatalog.assets['item-icon.new']).toBeUndefined()
    expect(session.getState().assetBlobs[record.path]).toBeUndefined()
    expect(session.canUndo()).toBe(false)

    expect(session.redo()).toBe(true)
    expect(session.getState().items[0]?.icon).toBe('item-icon.new')
    expect(session.getState().assetCatalog.assets['item-icon.new']).toEqual(record)
  })
})
