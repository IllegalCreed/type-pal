// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { EditorState } from '../core/edit-session.js'
import { EditSession } from '../core/edit-session.js'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import { verifyInspectorTabs } from './inspector-tabs-test-utils.js'
import { ShopTab } from './ShopTab.js'

let root: Root
let host: HTMLDivElement

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0)
    return 1
  })
  Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
    configurable: true,
    value(this: HTMLElement, options: ScrollToOptions) {
      this.scrollTop = options.top ?? 0
      this.dispatchEvent(new Event('scroll'))
    },
  })
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  document.body.style.overflow = ''
  Reflect.deleteProperty(HTMLElement.prototype, 'scrollTo')
  vi.unstubAllGlobals()
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

  test('[add-picker:shop/stock] 上架物品只在弹窗明确确认后产生一条命令', async () => {
    const shops = [{ id: 0, items: [] }]
    const assetCatalog = {
      version: 1 as const,
      assets: {
        'item-icon.test.a': {
          kind: 'item-icon' as const,
          path: 'assets/items/a.png',
          mediaType: 'image/png',
          bytes: 1,
          sha256: 'item-a-revision',
          origin: { kind: 'authored' as const },
        },
      },
    }
    const session = new EditSession({
      shops,
      maps: {},
      mapIndex: { version: 1, maps: [] },
      assetCatalog,
      assetBlobs: {},
    } as unknown as EditorState)
    const items = [
      {
        id: 'item-a',
        name: '金创药',
        desc: ['恢复体力', 'HP+200'],
        icon: 'item-icon.test.a',
        buyPrice: 80,
        sellPrice: 40,
        use: { target: 'oneAlly', consuming: true, effects: [] },
      },
    ] as never
    const readBytes = vi.fn(() => new Promise<ArrayBuffer>(() => undefined))
    const assetReader = {
      readBytes,
      record: (id: string) => assetCatalog.assets[id as keyof typeof assetCatalog.assets],
    } as unknown as EditorAssetReader

    await act(async () => {
      root.render(
        <ShopTab
          shops={shops}
          items={items}
          session={session}
          assetCatalog={assetCatalog}
          assetReader={assetReader}
        />,
      )
    })

    expect(host.querySelector('.shop-add-stock')).toBeNull()
    const trigger = [...host.querySelectorAll<HTMLButtonElement>('button')].find(
      (candidate) => candidate.textContent?.trim() === '上架物品',
    )!
    expect(
      trigger.closest('[data-ds-add-picker-adoption]')?.getAttribute('data-ds-add-picker-adoption'),
    ).toBe('shop/stock')
    expect(host.querySelector('.ds-empty-state--embedded')?.textContent).toContain('暂无在售物品')
    trigger.focus()
    await act(async () => trigger.click())
    let dialog = host.querySelector<HTMLDialogElement>('dialog[open]')!
    let option = [...dialog.querySelectorAll<HTMLElement>('[role="option"]')].find((candidate) =>
      candidate.textContent?.includes('金创药'),
    )!
    await act(async () => option.click())
    expect(option.textContent).toContain('买价 80 文')
    expect(
      option.querySelector('.image-asset-thumb.ds-add-picker-option__thumbnail'),
    ).not.toBeNull()
    expect(
      option.querySelector('.ds-add-picker-option__identity .ds-control--monospace')?.textContent,
    ).toBe('item-a')
    expect(option.querySelector('.ds-add-picker-option__detail')?.textContent).toBe('HP+200')
    expect(option.querySelector('.ds-add-picker-option__trailing')?.textContent).toBe('买价 80 文')
    expect(readBytes).toHaveBeenCalledWith('item-icon.test.a', 'item-icon')
    expect(session.getHistoryVersion()).toBe(0)
    const cancelButton = [...dialog.querySelectorAll<HTMLButtonElement>('button')].find(
      (candidate) => candidate.textContent?.trim() === '取消',
    )!
    await act(async () => cancelButton.click())
    expect(session.getHistoryVersion()).toBe(0)
    expect(document.activeElement).toBe(trigger)

    await act(async () => trigger.click())
    dialog = host.querySelector<HTMLDialogElement>('dialog[open]')!
    option = [...dialog.querySelectorAll<HTMLElement>('[role="option"]')].find((candidate) =>
      candidate.textContent?.includes('金创药'),
    )!
    await act(async () => option.click())

    const addButton = [...dialog.querySelectorAll<HTMLButtonElement>('button')].find(
      (candidate) => candidate.textContent?.trim() === '上架物品',
    )!
    expect(addButton.disabled).toBe(false)
    await act(async () => addButton.click())
    expect(session.getHistoryVersion()).toBe(1)
    expect(session.getState().shops?.[0]?.items).toEqual(['item-a'])
    expect(document.activeElement).toBe(trigger)
    expect(session.undo()).toBe(true)
    expect(session.getState().shops?.[0]?.items).toEqual([])
    expect(session.redo()).toBe(true)
    expect(session.getState().shops?.[0]?.items).toEqual(['item-a'])
    await act(async () =>
      root.render(
        <ShopTab
          shops={session.getState().shops ?? []}
          items={items}
          session={session}
          assetCatalog={assetCatalog}
          assetReader={assetReader}
        />,
      ),
    )
    expect(
      [...host.querySelectorAll<HTMLButtonElement>('button')].find(
        (candidate) => candidate.textContent?.trim() === '上架物品',
      )?.disabled,
    ).toBe(true)
  })

  test('234 项货品仍由公共搜索和虚拟列表选择，取消保持零命令', async () => {
    const shops = [{ id: 0, items: [] }]
    const session = new EditSession({
      shops,
      maps: {},
      mapIndex: { version: 1, maps: [] },
      assetCatalog: { version: 1, assets: {} },
      assetBlobs: {},
    } as unknown as EditorState)
    const items = Array.from({ length: 234 }, (_, index) => ({
      id: `item-${String(index).padStart(3, '0')}`,
      name: `测试物品 ${String(index).padStart(3, '0')}`,
      buyPrice: index,
      sellPrice: 0,
    })) as never

    await act(async () => root.render(<ShopTab shops={shops} items={items} session={session} />))
    const trigger = [...host.querySelectorAll<HTMLButtonElement>('button')].find(
      (candidate) => candidate.textContent?.trim() === '上架物品',
    )!
    trigger.focus()
    await act(async () => trigger.click())
    const dialog = host.querySelector<HTMLDialogElement>('dialog[open]')!
    expect(dialog.querySelectorAll('[role="option"]').length).toBeLessThanOrEqual(16)
    expect(dialog.querySelectorAll('.ds-add-picker-option__thumbnail')).toHaveLength(
      dialog.querySelectorAll('[role="option"]').length,
    )
    const search = dialog.querySelector<HTMLInputElement>('input[type="search"]')!
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
      setter.call(search, 'item-233')
      search.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(dialog.querySelectorAll('[role="option"]')).toHaveLength(1)
    expect(dialog.querySelector('[role="option"]')?.textContent).toContain('测试物品 233')
    expect(session.getHistoryVersion()).toBe(0)
    const cancel = [...dialog.querySelectorAll<HTMLButtonElement>('button')].find(
      (candidate) => candidate.textContent?.trim() === '取消',
    )!
    await act(async () => cancel.click())
    expect(session.getHistoryVersion()).toBe(0)
  })

  test('切换店铺会关闭并清空尚未确认的上架草稿', async () => {
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
    const trigger = [...host.querySelectorAll<HTMLButtonElement>('button')].find(
      (candidate) => candidate.textContent?.trim() === '上架物品',
    )!
    await act(async () => trigger.click())
    const dialog = host.querySelector<HTMLDialogElement>('dialog[open]')!
    const option = [...dialog.querySelectorAll<HTMLElement>('[role="option"]')].find((candidate) =>
      candidate.textContent?.includes('金创药'),
    )!
    await act(async () => option.click())
    expect(dialog.querySelector('[role="option"][aria-selected="true"]')).not.toBeNull()

    const secondShop = [...host.querySelectorAll<HTMLButtonElement>('.ds-catalog-row')].find(
      (candidate) => candidate.textContent?.includes('店 1'),
    )!
    await act(async () => secondShop.click())
    expect(host.querySelector('dialog[open]')).toBeNull()
    expect(session.getHistoryVersion()).toBe(0)
    expect(session.getState().shops?.every((shop) => shop.items.length === 0)).toBe(true)
  })

  test('[reorder-family:shop-stock] 重复货物按 occurrence handle 重排，一次命令可 undo/redo，同值为零命令', async () => {
    const session = new EditSession({
      shops: [{ id: 0, items: ['item-a', 'item-b', 'item-a'] }],
      maps: {},
      mapIndex: { version: 1, maps: [] },
      assetCatalog: { version: 1, assets: {} },
      assetBlobs: {},
    } as unknown as EditorState)
    const items = [
      { id: 'item-a', name: '金创药', buyPrice: 80, sellPrice: 40 },
      { id: 'item-b', name: '还神丹', buyPrice: 120, sellPrice: 60 },
    ] as never
    const renderCurrent = async (): Promise<void> => {
      await act(async () =>
        root.render(
          <ShopTab shops={session.getState().shops ?? []} items={items} session={session} />,
        ),
      )
    }

    await renderCurrent()
    const firstRow = host.querySelectorAll<HTMLElement>('[data-ds-reorder-item]')[0]!
    const firstToken = firstRow.dataset.itemKey
    const handle = firstRow.querySelector<HTMLButtonElement>('[data-ds-reorder-handle]')!
    await act(async () => {
      for (let index = 0; index < 20; index += 1)
        handle.dispatchEvent(new MouseEvent('pointermove', { bubbles: true }))
    })
    expect(session.getHistoryVersion()).toBe(0)
    await act(async () => {
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    expect(session.getHistoryVersion()).toBe(1)
    expect(session.getState().shops?.[0]?.items).toEqual(['item-b', 'item-a', 'item-a'])
    await renderCurrent()
    expect(host.querySelectorAll<HTMLElement>('[data-ds-reorder-item]')[1]?.dataset.itemKey).toBe(
      firstToken,
    )

    const history = session.getHistoryVersion()
    await act(async () =>
      host
        .querySelectorAll<HTMLElement>('[data-ds-reorder-item]')[1]!
        .querySelector<HTMLButtonElement>('[aria-label="下移 金创药"]')!
        .click(),
    )
    expect(session.getHistoryVersion()).toBe(history)
    expect(session.getState().shops?.[0]?.items).toEqual(['item-b', 'item-a', 'item-a'])

    expect(session.undo()).toBe(true)
    expect(session.getState().shops?.[0]?.items).toEqual(['item-a', 'item-b', 'item-a'])
    expect(session.redo()).toBe(true)
    expect(session.getState().shops?.[0]?.items).toEqual(['item-b', 'item-a', 'item-a'])
  })
})
