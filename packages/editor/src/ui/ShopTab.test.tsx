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
  })
})
