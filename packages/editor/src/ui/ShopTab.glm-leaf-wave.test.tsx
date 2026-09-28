// @vitest-environment jsdom
import type { ItemData } from '@type-pal/content'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { EditSession } from '../core/edit-session.js'
import { AddItemCommand } from '../core/item-commands.js'
import {
  buildProjectReferenceSnapshot,
  createProjectReferenceIndex,
} from '../core/project-reference.js'
import { AddShopCommand, UpdateShopCommand } from '../core/shop-commands.js'
import { loadLegalUiProject } from './__tests__/glm-leaf-workflows/legal-session.js'
import { stubNodeTestHost } from './__tests__/glm-leaf-workflows/node-bridge.js'
import { ShopTab } from './ShopTab.js'

const referenceIndex = createProjectReferenceIndex(buildProjectReferenceSnapshot([]))

function plain(id: string, name: string): ItemData {
  return { id, name, desc: [], buyPrice: 0, sellPrice: 0, sellable: false }
}

/** 合法项目 + 真实物品/店铺命令：两家店（一家两个货单、一家空）。 */
async function makeShopSession(): Promise<EditSession> {
  await stubNodeTestHost()
  const legal = await loadLegalUiProject('glm-leaf-shop-tab')
  const session = new EditSession(legal.state)
  session.dispatch(new AddItemCommand(plain('herb', '草药')))
  session.dispatch(new AddItemCommand(plain('sword', '铁剑')))
  session.dispatch(new AddShopCommand(0))
  session.dispatch(new AddShopCommand(1))
  session.dispatch(new UpdateShopCommand(0, ['herb', 'sword']))
  return session
}

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
  vi.unstubAllGlobals()
})

function Harness(props: { shopSession: EditSession }) {
  const current = props.shopSession.getState()
  return (
    <ShopTab
      shops={current.shops ?? []}
      items={current.items ?? []}
      session={props.shopSession}
      referenceIndex={referenceIndex}
      referenceStatus="current"
      getCurrentReferenceIndex={() => referenceIndex}
    />
  )
}

function byLabel(label: string): HTMLButtonElement {
  const button = host.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)
  expect(button, label).not.toBeNull()
  return button!
}

describe('ShopTab 剩余合同', () => {
  test('delisting one stock entry commits exactly once and undo restores the order', async () => {
    const shopSession = await makeShopSession()
    await act(async () => root.render(<Harness shopSession={shopSession} />))
    const historyBefore = shopSession.getHistoryVersion()
    await act(async () => byLabel('下架 铁剑').click())
    expect(shopSession.getState().shops?.[0]?.items).toEqual(['herb'])
    expect(shopSession.getHistoryVersion()).toBe(historyBefore + 1)

    await act(async () => expect(shopSession.undo()).toBe(true))
    expect(shopSession.getState().shops?.[0]?.items).toEqual(['herb', 'sword'])
  })

  test('an empty shop renders its empty state and cannot delist anything', async () => {
    const shopSession = await makeShopSession()
    await act(async () => root.render(<Harness shopSession={shopSession} />))
    // 切到第二家空铺：目录第二项标题「空货单」。
    const entries = [...host.querySelectorAll('button')].filter(
      (button) => button.textContent?.trim() === '空货单1',
    )
    expect(entries).toHaveLength(1)
    await act(async () => entries[0]!.click())
    expect(host.textContent).toContain('暂无在售物品')
    expect(host.querySelector('button[aria-label^="下架"]')).toBeNull()
  })
})
