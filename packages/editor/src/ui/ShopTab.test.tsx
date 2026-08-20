// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import type { EditorState } from '../core/edit-session.js'
import { EditSession } from '../core/edit-session.js'
import { verifyInspectorTabs } from './inspector-tabs-test-utils.js'
import { ShopTab } from './ShopTab.js'

let root: Root
let host: HTMLDivElement

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

describe('ShopTab shared object workspace', () => {
  test('使用固定共享标题，货单正文在独立滚动层', async () => {
    const shops = [{ id: 0, items: ['item-a', 'item-b'] }]
    const session = new EditSession({
      shops,
      maps: {},
      mapIndex: { version: 1, maps: [] },
      assetCatalog: { version: 1, assets: {} },
      assetBlobs: {},
    } as unknown as EditorState)

    await act(async () => {
      root.render(<ShopTab shops={shops} items={[]} session={session} />)
    })

    const workspace = host.querySelector<HTMLElement>('.shop-main.ds-object-workspace')
    expect(workspace).not.toBeNull()
    const hero = workspace!.querySelector<HTMLElement>(':scope > .ds-object-hero')
    const content = workspace!.querySelector<HTMLElement>(':scope > .ds-object-workspace__content')
    expect(hero).not.toBeNull()
    expect(content).not.toBeNull()
    expect(content!.contains(hero)).toBe(false)
    expect(hero!.querySelector('h1')?.textContent).toBe('货单')
    expect(hero!.querySelector('.ds-object-hero__eyebrow')?.textContent).toBe('店铺')
    expect(hero!.querySelector('.ds-object-hero__id')?.textContent).toBe('#0')
    expect(hero!.querySelector('.ds-tag')?.textContent).toBe('2 种货')
    expect(host.querySelectorAll('h1')).toHaveLength(1)
    await verifyInspectorTabs(host, '商店检查器', ['摘要', '说明'])

    const helpTab = [...host.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find(
      (tab) => tab.textContent?.trim() === '说明',
    )!
    await act(async () => helpTab.click())
    expect(host.querySelector('ol.shop-help-steps')?.children).toHaveLength(3)
  })

  test('上架物品使用统一选择控件并可完成入货', async () => {
    const shops = [{ id: 0, items: [] }]
    const session = new EditSession({
      shops,
      maps: {},
      mapIndex: { version: 1, maps: [] },
      assetCatalog: { version: 1, assets: {} },
      assetBlobs: {},
    } as unknown as EditorState)
    const items = [{ id: 'item-a', name: '金创药', buyPrice: 80, sellPrice: 40 }] as never

    await act(async () => {
      root.render(<ShopTab shops={shops} items={items} session={session} />)
    })

    expect(host.querySelector('select')).toBeNull()
    const trigger = host.querySelector<HTMLButtonElement>('.shop-add-stock .ds-select')!
    expect(trigger.textContent).toContain('选择物品…')
    await act(async () => trigger.click())
    const option = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(
      (candidate) => candidate.textContent?.includes('金创药'),
    )!
    await act(async () => option.click())
    expect(trigger.textContent).toContain('金创药')
    expect(trigger.textContent).toContain('买价 80 文')

    const addButton = [...host.querySelectorAll<HTMLButtonElement>('button')].find((candidate) =>
      candidate.textContent?.includes('上架'),
    )!
    expect(addButton.disabled).toBe(false)

    await act(async () => trigger.click())
    const clear = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(
      (candidate) => candidate.textContent?.trim() === '选择物品…',
    )!
    await act(async () => clear.click())
    expect(addButton.disabled).toBe(true)

    await act(async () => trigger.click())
    const reselect = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(
      (candidate) => candidate.textContent?.includes('金创药'),
    )!
    await act(async () => reselect.click())
    await act(async () => addButton.click())
    expect(session.getState().shops?.[0]?.items).toEqual(['item-a'])
  })

  test('切换店铺会清空尚未上架的选择', async () => {
    const shops = [
      { id: 0, items: [] },
      { id: 1, items: [] },
    ]
    const session = new EditSession({
      shops,
      maps: {},
      mapIndex: { version: 1, maps: [] },
      assetCatalog: { version: 1, assets: {} },
      assetBlobs: {},
    } as unknown as EditorState)
    const items = [{ id: 'item-a', name: '金创药', buyPrice: 80, sellPrice: 40 }] as never

    await act(async () => {
      root.render(<ShopTab shops={shops} items={items} session={session} />)
    })
    const trigger = host.querySelector<HTMLButtonElement>('.shop-add-stock .ds-select')!
    await act(async () => trigger.click())
    const option = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(
      (candidate) => candidate.textContent?.includes('金创药'),
    )!
    await act(async () => option.click())
    expect(trigger.textContent).toContain('金创药')

    const secondShop = [...host.querySelectorAll<HTMLButtonElement>('.ds-catalog-row')].find(
      (candidate) => candidate.textContent?.includes('店 1'),
    )!
    await act(async () => secondShop.click())
    expect(trigger.textContent).toContain('选择物品…')
  })
})
