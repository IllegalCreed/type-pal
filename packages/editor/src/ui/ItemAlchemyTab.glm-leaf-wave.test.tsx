// @vitest-environment jsdom
import type { ItemData } from '@type-pal/content'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { EditorState } from '../core/edit-session.js'
import { EditSession } from '../core/edit-session.js'
import type { CraftRecipeEffect } from '../core/item-alchemy.js'
import { appendCraftRecipe } from './ItemAlchemyEditors.js'
import { CraftingAlchemyTab, SpiritGourdAlchemyTab } from './ItemAlchemyTab.js'

function plain(id: string, name = id): ItemData {
  return { id, name, desc: [], buyPrice: 0, sellPrice: 0, sellable: false }
}

function palItems(): ItemData[] {
  return [
    plain('117', '毒蛇卵'),
    plain('148', '蛊'),
    {
      ...plain('268', '炼蛊皿'),
      use: {
        target: 'scene',
        consuming: false,
        effects: [
          {
            kind: 'craftRecipe',
            recipes: [
              {
                ingredients: [{ itemId: '117', count: 1 }],
                products: [{ itemId: '148', count: 1 }],
              },
            ],
          },
        ],
      },
    },
    {
      ...plain('270', '紫金葫芦'),
      use: {
        target: 'scene',
        consuming: false,
        effects: [
          {
            kind: 'drawFromResourcePool',
            resource: 'collectValue',
            maxRoll: 9,
            rewards: [{ itemId: '117', count: 1 }],
          },
        ],
      },
    },
  ]
}

function session(items = palItems()): EditSession {
  return new EditSession({
    items,
    maps: {},
    sceneIndex: { version: 1, scenes: [] },
    mapIndex: { version: 1, maps: [] },
    assetCatalog: { version: 1, assets: {} },
    assetBlobs: {},
  } as unknown as EditorState)
}

let root: Root
let host: HTMLDivElement

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0)
    return 1
  })
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.unstubAllGlobals()
})

describe('ItemAlchemyTab 双入口剩余合同', () => {
  test('crafting surface renders the canonical owner and its single recipe', async () => {
    const alchemySession = session()
    await act(async () =>
      root.render(
        <CraftingAlchemyTab
          items={alchemySession.getState().items ?? []}
          session={alchemySession}
        />,
      ),
    )
    expect(host.textContent).toContain('炼蛊皿')
    expect(host.textContent).toContain('毒蛇卵')
    expect(host.textContent).not.toContain('紫金葫芦机制')
  })

  test('spirit-gourd surface renders the gourd owner and collectValue rewards', async () => {
    const alchemySession = session()
    await act(async () =>
      root.render(
        <SpiritGourdAlchemyTab
          items={alchemySession.getState().items ?? []}
          session={alchemySession}
        />,
      ),
    )
    expect(host.textContent).toContain('紫金葫芦')
    expect(host.textContent).toContain('灵葫值')
  })

  test('a surface without its owner item renders a readable empty state, not the other surface', async () => {
    const alchemySession = session([plain('117', '毒蛇卵')])
    await act(async () =>
      root.render(
        <SpiritGourdAlchemyTab
          items={alchemySession.getState().items ?? []}
          session={alchemySession}
        />,
      ),
    )
    expect(host.textContent).not.toContain('炼蛊皿机制')
    expect(host.textContent).toContain('紫金葫芦')
  })
})

describe('ItemAlchemyEditors 纯导出剩余合同', () => {
  test('appendCraftRecipe picks a non-owner ingredient and the first listed product', () => {
    const items = palItems()
    const base: CraftRecipeEffect = {
      kind: 'craftRecipe',
      recipes: [],
    }
    const next = appendCraftRecipe(base, items, '268', true)
    expect(next?.recipes).toHaveLength(1)
    expect(next?.recipes[0]).toEqual({
      ingredients: [{ itemId: '117', count: 1 }],
      products: [{ itemId: '117', count: 1 }],
    })
    // 空物品列表拿不到产物 → 明确返回 undefined。
    expect(appendCraftRecipe(base, [], '268', true)).toBeUndefined()
  })
})
