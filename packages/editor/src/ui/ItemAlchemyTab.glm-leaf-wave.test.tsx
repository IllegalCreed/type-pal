import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { CraftRecipeEffect, ResourcePoolEffect } from '../core/item-alchemy.js'
import { appendCraftRecipe, CraftRecipeList, ResourceRewardTierList } from './ItemAlchemyEditors.js'

// @vitest-environment jsdom
// G20 去重说明：双入口 surface 渲染（炼蛊皿/紫金葫芦工作台、灵葫值行、消耗值增删命令）
// 已由 ItemAlchemyTab.test.tsx:241/353/434/501 的更强旧例覆盖（existing-proof）；
// 本文件只补 ItemAlchemyEditors 行级列表与纯函数的剩余合同，不再挂 Tab surface。

function item(id: string, name = id) {
  return { id, name, desc: [], buyPrice: 0, sellPrice: 0, sellable: false }
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

describe('appendCraftRecipe 纯函数剩余合同', () => {
  test('picks a non-owner ingredient and the first listed product', () => {
    const items = [item('117', '毒蛇卵'), item('148', '蛊')]
    const base: CraftRecipeEffect = { kind: 'craftRecipe', recipes: [] }
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

describe('CraftRecipeList 行级剩余合同', () => {
  const effect: CraftRecipeEffect = {
    kind: 'craftRecipe',
    recipes: [
      {
        ingredients: [{ itemId: '117', count: 2 }],
        products: [{ itemId: '148', count: 1 }],
      },
    ],
  }

  test('renders ingredient/product rows with counts and reports change on edit', async () => {
    const onChange = vi.fn()
    await act(async () =>
      root.render(
        <CraftRecipeList
          effect={effect}
          items={[item('117', '毒蛇卵'), item('148', '蛊')]}
          ownerItemId="268"
          consuming
          scopeKey="scope-a"
          revision={0}
          onChange={onChange}
        />,
      ),
    )
    expect(host.textContent).toContain('毒蛇卵')
    expect(host.textContent).toContain('蛊')
    expect(host.querySelector<HTMLInputElement>('input[type="number"]')?.value).toBe('2')
  })

  test('consuming=false keeps the owner item eligible as an ingredient candidate', async () => {
    // 消耗面排除 owner 作材料；非消耗面（consuming=false）保留 owner 候选。
    await act(async () =>
      root.render(
        <CraftRecipeList
          effect={{
            kind: 'craftRecipe',
            recipes: [
              {
                ingredients: [{ itemId: '268', count: 1 }],
                products: [{ itemId: '148', count: 1 }],
              },
            ],
          }}
          items={[item('268', '炼蛊皿'), item('148', '蛊')]}
          ownerItemId="268"
          consuming={false}
          scopeKey="scope-b"
          revision={0}
          onChange={() => undefined}
        />,
      ),
    )
    const materialSelect = host.querySelector<HTMLButtonElement>(
      'button[aria-label="配方 1 材料物品"]',
    )!
    expect(materialSelect.textContent).toContain('炼蛊皿')
  })
})

describe('ResourceRewardTierList 行级剩余合同', () => {
  const effect: ResourcePoolEffect = {
    kind: 'drawFromResourcePool',
    resource: 'collectValue',
    maxRoll: 9,
    rewards: [
      { itemId: '117', count: 1 },
      { itemId: '148', count: 3 },
    ],
  }

  test('renders one tier per reward with ids and counts in order', async () => {
    await act(async () =>
      root.render(
        <ResourceRewardTierList
          effect={effect}
          items={[item('117', '毒蛇卵'), item('148', '蛊')]}
          scopeKey="scope-c"
          revision={0}
          onChange={() => undefined}
        />,
      ),
    )
    expect(host.textContent).toContain('毒蛇卵')
    expect(host.textContent).toContain('蛊')
    const counts = [...host.querySelectorAll<HTMLInputElement>('input[type="number"]')].map(
      (input) => input.value,
    )
    expect(counts).toEqual(['1', '3'])
  })

  test('change callback receives the rewritten effect when a tier count is edited', async () => {
    const onChange = vi.fn()
    await act(async () =>
      root.render(
        <ResourceRewardTierList
          effect={effect}
          items={[item('117', '毒蛇卵'), item('148', '蛊')]}
          scopeKey="scope-d"
          revision={0}
          onChange={onChange}
        />,
      ),
    )
    const numberInput = host.querySelector<HTMLInputElement>('input[type="number"]')
    expect(numberInput).not.toBeNull()
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    await act(async () => {
      setter.call(numberInput!, '2')
      numberInput!.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () => {
      numberInput!.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    })
    expect(onChange).toHaveBeenCalled()
    const next = onChange.mock.calls[0]?.[0] as ResourcePoolEffect
    expect(next.rewards[0]?.count).toBe(2)
  })
})
