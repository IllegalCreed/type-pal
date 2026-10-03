// @vitest-environment jsdom
/**
 * TEST-GLM-WAVE-M-1 M02（ShopTab.glm-m）：商店页 UI 新建入口当前合同。
 * 去重：ShopTab.test.tsx 已证复制/删除/取消/试买/上架/重排/搜索；glm-leaf-wave 已证下架与
 * 空态（AddShopCommand 仅作 setup 直接 dispatch，未驱动 UI 按钮）。本文件只补：
 * 「新建店铺」按钮从空目录创建 nextShopId 店铺并选中/回调焦点，undo 精确移除；
 * 检查器摘要的「引用编号」readout 绑定当前店铺。
 */
import type { ItemData, ShopDef } from '@type-pal/content'
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { buttonByText, loadLegalProject, stubNodeTestHost } from '../__tests__/glm-m/kit.js'
import type { EditorState } from '../core/edit-session.js'
import { EditSession } from '../core/edit-session.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'
import { collectCurrentProjectReferenceIndex } from '../core/project-reference-adapters.js'
import { ShopTab } from './ShopTab.js'

const ITEMS: ItemData[] = [
  { id: 'item-shop-m', name: '桂花糕', desc: [], buyPrice: 12, sellPrice: 6, sellable: true },
]

async function legalShopState(shops: ShopDef[]): Promise<EditorState> {
  const { state } = await loadLegalProject('glm-wave-m-shop')
  const next = { ...state, items: ITEMS, shops }
  assertProjectSaveValid(next)
  return next
}

function Harness(props: { session: EditSession; focus?: string[] }) {
  useSyncExternalStore(
    (callback) => props.session.subscribe(callback),
    () => props.session.getVersion(),
  )
  const current = props.session.getState()
  return (
    <ShopTab
      shops={current.shops ?? []}
      items={current.items}
      session={props.session}
      referenceIndex={collectCurrentProjectReferenceIndex(current)}
      referenceStatus="current"
      getCurrentReferenceIndex={(next) => collectCurrentProjectReferenceIndex(next)}
      onObjectFocus={(id) => props.focus?.push(String(id))}
    />
  )
}

let root: Root
let host: HTMLDivElement

beforeEach(async () => {
  await stubNodeTestHost()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('M02 ShopTab 新建入口当前合同', () => {
  test('空目录点「新建店铺」：创建 #0 并选中回调焦点，货单空态出现；undo 精确移除', async () => {
    const focus: string[] = []
    const session = new EditSession(await legalShopState([]))
    await act(async () => {
      root.render(<Harness session={session} focus={focus} />)
      await Promise.resolve()
    })
    const before = session.getHistoryVersion()
    expect(host.textContent).toContain('还没有商店')

    await act(async () => buttonByText(host, '新建店铺').click())
    expect(session.getState().shops).toEqual([{ id: 0, items: [] }])
    expect(session.getHistoryVersion()).toBe(before + 1)
    expect(focus.at(-1)).toBe('0')
    expect(host.querySelector('.ds-object-hero__id')?.textContent).toBe('#0')
    expect(host.textContent).toContain('暂无在售物品')
    assertProjectSaveValid(session.getState())

    await act(async () => {
      expect(session.undo()).toBe(true)
    })
    expect(session.getState().shops).toEqual([])
    expect(host.textContent).toContain('还没有商店')
  })

  test('摘要检查器随当前店铺显示在售种数与引用编号', async () => {
    const session = new EditSession(
      await legalShopState([{ id: 3, items: ['item-shop-m', 'item-shop-m'] }]),
    )
    await act(async () => {
      root.render(<Harness session={session} />)
      await Promise.resolve()
    })
    const inspector = host.querySelector('.shop-inspector')
    expect(inspector?.textContent).toContain('引用编号')
    expect(inspector?.textContent).toContain('#3')
    expect(inspector?.textContent).toContain('在售物品')
    expect(inspector?.textContent).toContain('1 种')
  })
})
