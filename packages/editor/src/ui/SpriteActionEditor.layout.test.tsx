// @vitest-environment jsdom

import { act } from 'react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import {
  installDsScrollToStub,
  uninstallDsScrollToStub,
} from '../__tests__/cursor-asset-r1/design-system-harness.js'
import {
  clickButtonByText,
  controlByAriaLabel,
  fillAndBlur,
  typeDraft,
} from '../__tests__/cursor-asset-r1/kit.js'
import { waitForReact } from '../__tests__/react-io-wait.js'
import {
  ACTION_SPRITE,
  actionDialog,
  actionPoses,
  mountActionWorkspace,
  openActionEditor,
} from '../__tests__/sprite-action-workspace.js'
import { setupWorldSpriteLibrarySuite } from '../__tests__/world-sprite-library-gestures.js'

const suite = setupWorldSpriteLibrarySuite()
beforeEach(installDsScrollToStub)
afterEach(uninstallDsScrollToStub)
const poses = {
  idle: { label: '待机', order: 0, steps: [{ frame: 0, durationMs: 150 }] },
  wave: { label: '挥手', order: 1, steps: [{ frame: 1, durationMs: 200 }] },
}

function controlNarrowViewport(narrow: boolean) {
  const viewport = Object.assign(new EventTarget(), {
    matches: narrow,
    media: '(max-width: 720px)',
  })
  vi.stubGlobal('matchMedia', () => viewport)
  return async (matches: boolean): Promise<void> => {
    viewport.matches = matches
    await act(async () => viewport.dispatchEvent(new Event('change')))
  }
}

test('大目录只渲染窗口和当前选择，由搜索框统一持有键盘焦点', async () => {
  const actions = Object.fromEntries(
    Array.from({ length: 52 }, (_, order) => [
      `pose-${order + 1}`,
      { label: `动作 ${order + 1}`, order, steps: [{ frame: order % 4, durationMs: 250 }] },
    ]),
  )
  const library = await mountActionWorkspace(suite, 'sprite-action-virtual-list', actions)
  await library.navigate({ view: 'definition', objectId: ACTION_SPRITE, actionId: 'pose-52' })
  const dialog = actionDialog(library)
  const search = controlByAriaLabel<HTMLInputElement>(dialog, '搜索预制动作')
  const listbox = dialog.querySelector<HTMLElement>('.sprite-action-directory [role="listbox"]')!
  expect(listbox.dataset.virtual).toBe('true')
  expect(listbox.tabIndex).toBe(-1)
  expect(listbox.querySelectorAll('[role="option"]').length).toBeLessThan(52)
  const active = document.getElementById(search.getAttribute('aria-activedescendant')!)
  expect(active?.getAttribute('aria-selected')).toBe('true')
  expect(active?.querySelector('code')?.textContent).toBe('pose-52')
  expect(listbox.contains(active)).toBe(true)
  expect(listbox.querySelector('[data-ds-reorder-handle]')).toBeNull()
  expect(dialog.querySelector('h3')?.textContent).toBe('动作 52')
  expect(library.session.getHistoryVersion()).toBe(0)
})

test('窄屏列表与详情分开，返回时恢复能找到当前动作的搜索结果', async () => {
  controlNarrowViewport(true)
  const library = await mountActionWorkspace(suite, 'sprite-action-narrow-layout', poses)
  await openActionEditor(library)
  const dialog = () => actionDialog(library)
  const search = () => controlByAriaLabel<HTMLInputElement>(dialog(), '搜索预制动作')
  expect(dialog().querySelector('.sprite-action-detail-pane')).toBeNull()
  await typeDraft(search(), '待机')
  const selected = dialog().querySelector<HTMLElement>('.sprite-action-directory [role="option"]')!
  await act(async () => selected.click())
  expect(dialog().querySelector('.sprite-action-directory')).toBeNull()
  await waitForReact(() => expect(document.activeElement).toBe(dialog().querySelector('h3')))
  const name = dialog().querySelector<HTMLInputElement>('[name="sprite-action-name"]')!
  await fillAndBlur(name, '站定')
  await clickButtonByText(dialog(), '返回动作列表')
  expect(dialog().querySelector('.sprite-action-detail-pane')).toBeNull()
  expect(search().value).toBe('')
  expect(dialog().querySelector('[role="option"][aria-selected="true"]')?.textContent).toContain(
    '站定',
  )
  await waitForReact(() => expect(document.activeElement).toBe(search()))
  expect(actionPoses(library)?.idle?.label).toBe('站定')
  expect(library.session.getHistoryVersion()).toBe(1)
})

test('正在详情输入时缩窄窗口，保留当前动作名称和详情页面', async () => {
  const changeViewport = controlNarrowViewport(false)
  const library = await mountActionWorkspace(suite, 'sprite-action-resize-with-draft', poses)
  const editor = await openActionEditor(library)
  const name = editor.querySelector<HTMLInputElement>('[name="sprite-action-name"]')!
  await typeDraft(name, '缩窄前的名称')
  expect(library.session.getHistoryVersion()).toBe(0)
  await changeViewport(true)
  expect(actionDialog(library).querySelector('.sprite-action-directory')).toBeNull()
  const detail = actionDialog(library).querySelector('.sprite-action-detail-pane')!
  expect(detail.contains(name)).toBe(true)
  expect(name.value).toBe('缩窄前的名称')
  await waitForReact(() => expect(actionPoses(library)?.idle?.label).toBe('缩窄前的名称'))
  expect(library.session.getHistoryVersion()).toBe(1)
})
