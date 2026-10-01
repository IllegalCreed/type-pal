// @vitest-environment jsdom
/**
 * TEST-CURSOR-ASSET-UI-LARGE-1 C02-G06：键盘公开合同（目录 roving list + 源帧选择器）。
 * 排重：BattleSpriteLibrary.test.tsx 的 verifyInspectorTabs 只证检查器页签键盘；virtual-list.test.tsx 证
 * DsVirtualList 通用组件。本文件证战斗精灵库上的集成语义：选择与激活分离（方向键只动 active、
 * Enter/Space 才上报宿主）、Home/End/越界钳制、过滤后范围收缩、ARIA 位置/按下态、无关键不拦截默认行为、
 * 源帧工具条方向键/Home/End 及 roving tabindex。
 */
import { expect, test } from 'vitest'
import {
  A_ENEMY,
  A_SPARE,
  A_STARTER,
  catalogList,
  catalogMetas,
  catalogRow,
  heroTitle,
  pressKey,
  selectedCatalogAsset,
  setupBattleSuite,
  sourceFrameButton,
  usageNameInput,
  waitProof,
} from '../__tests__/cursor-asset-r1/battle-sprite-ui.js'
import { typeDraft } from '../__tests__/cursor-asset-r1/kit.js'

const suite = setupBattleSuite()

function activeIndex(host: HTMLElement): number {
  const item = host.querySelector<HTMLElement>('.ds-virtual-list__item[data-active]')
  return Number(item?.dataset.virtualIndex ?? -1)
}

function rowButton(host: HTMLElement, asset: string): HTMLElement {
  const row = catalogRow(host, asset)
  expect(row, `行 ${asset}`).toBeDefined()
  return row!
}

test('C02-G06-01 roving tabindex：仅选中行进入 Tab 序列，其余行为 -1', async () => {
  const m = await suite.mount('c02-g06-01')
  expect(selectedCatalogAsset(m.host)).toBe(A_STARTER)
  const rows = [...m.host.querySelectorAll<HTMLElement>('.sprite-resource-row')]
  expect(rows).toHaveLength(6)
  expect(rows.map((row) => row.tabIndex)).toEqual([-1, -1, -1, -1, -1, 0])
  expect(activeIndex(m.host)).toBe(5)
})

test('C02-G06-02 方向键只移动 active，不改变选择、不上报宿主、不产生历史，并拦截默认滚动', async () => {
  const m = await suite.mount('c02-g06-02')
  const event = await pressKey(rowButton(m.host, A_STARTER), 'ArrowUp')
  expect(event.defaultPrevented).toBe(true)
  expect(activeIndex(m.host)).toBe(4)
  expect(selectedCatalogAsset(m.host)).toBe(A_STARTER)
  expect(m.viewHistory).toEqual([])
  expect(m.session.getHistoryVersion()).toBe(0)
  await pressKey(catalogList(m.host), 'ArrowDown')
  expect(activeIndex(m.host)).toBe(5)
  expect(selectedCatalogAsset(m.host)).toBe(A_STARTER)
})

test('C02-G06-03 ArrowUp 后 Enter 才选中：召唤资产成为选择并向宿主上报其用途', async () => {
  const m = await suite.mount('c02-g06-03')
  await pressKey(catalogList(m.host), 'ArrowUp')
  await pressKey(catalogList(m.host), 'Enter')
  expect(selectedCatalogAsset(m.host)).toBe('battle-sprite.authored.c02-summon')
  expect(m.viewHistory.at(-1)).toEqual({ view: 'definition', objectId: 'summon-fox' })
  expect(heroTitle(m.host)).toBe('C02召唤')
  expect(usageNameInput(m.host)?.value).toBe('狐火')
  await waitProof(m.host, 5, 1)
})

test('C02-G06-04 空格与 Enter 等价：两次上移后空格选中未配置资产并上报 asset 视图', async () => {
  const m = await suite.mount('c02-g06-04')
  await pressKey(catalogList(m.host), 'ArrowUp')
  await pressKey(catalogList(m.host), 'ArrowUp')
  expect(activeIndex(m.host)).toBe(3)
  const event = await pressKey(catalogList(m.host), ' ')
  expect(event.defaultPrevented).toBe(true)
  expect(selectedCatalogAsset(m.host)).toBe(A_SPARE)
  expect(m.viewHistory.at(-1)).toEqual({ view: 'asset', objectId: A_SPARE })
  expect(usageNameInput(m.host)).toBeNull()
})

test('C02-G06-05 Home/End 跳到首尾项，Enter 分别选中首个资产的用途与末项 starter', async () => {
  const m = await suite.mount('c02-g06-05', { focus: 'shared-fighter-a' })
  await pressKey(catalogList(m.host), 'Home')
  expect(activeIndex(m.host)).toBe(0)
  await pressKey(catalogList(m.host), 'Enter')
  expect(selectedCatalogAsset(m.host)).toBe(A_ENEMY)
  expect(m.viewHistory.at(-1)).toEqual({ view: 'definition', objectId: 'enemy-red' })

  await pressKey(catalogList(m.host), 'End')
  expect(activeIndex(m.host)).toBe(5)
  await pressKey(catalogList(m.host), 'Enter')
  expect(selectedCatalogAsset(m.host)).toBe(A_STARTER)
  expect(m.viewHistory.at(-1)).toEqual({ view: 'definition', objectId: 'starter-fighter' })
})

test('C02-G06-06 首尾钳制：在首项继续上移、在末项继续下移都不越界也不回绕', async () => {
  const m = await suite.mount('c02-g06-06')
  await pressKey(catalogList(m.host), 'Home')
  await pressKey(catalogList(m.host), 'ArrowUp')
  await pressKey(catalogList(m.host), 'ArrowUp')
  expect(activeIndex(m.host)).toBe(0)
  await pressKey(catalogList(m.host), 'End')
  await pressKey(catalogList(m.host), 'ArrowDown')
  await pressKey(catalogList(m.host), 'ArrowDown')
  expect(activeIndex(m.host)).toBe(5)
  expect(m.viewHistory).toEqual([])
})

test('C02-G06-07 过滤后键盘范围收缩：只剩一行时 ArrowDown+Enter 选中该行，setsize 同步为 1', async () => {
  const m = await suite.mount('c02-g06-07')
  const search = m.host.querySelector<HTMLInputElement>('input[aria-label="过滤战斗精灵库"]')!
  await typeDraft(search, 'C02备用')
  expect(catalogMetas(m.host)).toEqual([A_SPARE])
  expect(m.host.querySelector('.ds-virtual-list__item')?.getAttribute('aria-setsize')).toBe('1')
  await pressKey(catalogList(m.host), 'ArrowDown')
  await pressKey(catalogList(m.host), 'Enter')
  expect(selectedCatalogAsset(m.host)).toBe(A_SPARE)
  expect(m.viewHistory.at(-1)).toEqual({ view: 'asset', objectId: A_SPARE })
})

test('C02-G06-08 ARIA：列表具名，列表项位置/总数正确，按下态与未配置标签可读', async () => {
  const m = await suite.mount('c02-g06-08')
  const list = catalogList(m.host)
  expect(list.getAttribute('aria-label')).toBe('战斗精灵目录')
  const items = [...list.querySelectorAll<HTMLElement>('[role="listitem"]')]
  expect(items.map((item) => item.getAttribute('aria-posinset'))).toEqual([
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
  ])
  expect(new Set(items.map((item) => item.getAttribute('aria-setsize')))).toEqual(new Set(['6']))
  const rows = [...list.querySelectorAll<HTMLElement>('.sprite-resource-row')]
  expect(rows.map((row) => row.getAttribute('aria-pressed'))).toEqual([
    'false',
    'false',
    'false',
    'false',
    'false',
    'true',
  ])
  expect(rowButton(m.host, 'battle-sprite.authored.c02-idle').getAttribute('aria-label')).toBe(
    'C02闲置，battle-sprite.authored.c02-idle，未配置',
  )
  expect(rowButton(m.host, A_ENEMY).getAttribute('aria-label')).toBe(`C02敌人，${A_ENEMY}`)
})

test('C02-G06-09 只拦截导航键：字母、Tab、Escape 保持默认行为且不改 active', async () => {
  const m = await suite.mount('c02-g06-09')
  for (const key of ['a', 'Tab', 'Escape', 'PageUp']) {
    const event = await pressKey(catalogList(m.host), key)
    expect(event.defaultPrevented, key).toBe(false)
  }
  expect(activeIndex(m.host)).toBe(5)
  for (const key of ['ArrowUp', 'ArrowDown', 'Home', 'End', 'Enter', ' ']) {
    const event = await pressKey(catalogList(m.host), key)
    expect(event.defaultPrevented, key).toBe(true)
  }
})

test('C02-G06-10 源帧工具条键盘：方向键/Home/End 选帧并钳制，roving tabindex 跟随选中帧', async () => {
  const m = await suite.mount('c02-g06-10', { focus: 'shared-fighter-a' })
  await waitProof(m.host, 12, 2)
  const current = () => m.host.querySelector('.sprite-raw-toolbar b')?.textContent
  expect(current()).toBe('#0')
  await pressKey(sourceFrameButton(m.host, 0), 'ArrowLeft')
  expect(current()).toBe('#0')
  await pressKey(sourceFrameButton(m.host, 0), 'ArrowRight')
  await pressKey(sourceFrameButton(m.host, 1), 'ArrowDown')
  expect(current()).toBe('#2')
  expect(sourceFrameButton(m.host, 2).getAttribute('aria-pressed')).toBe('true')
  expect(sourceFrameButton(m.host, 2).tabIndex).toBe(0)
  expect(sourceFrameButton(m.host, 1).tabIndex).toBe(-1)

  await pressKey(sourceFrameButton(m.host, 2), 'End')
  expect(current()).toBe('#11')
  await pressKey(sourceFrameButton(m.host, 11), 'ArrowRight')
  expect(current()).toBe('#11')
  await pressKey(sourceFrameButton(m.host, 11), 'Home')
  expect(current()).toBe('#0')
  expect(m.session.getHistoryVersion()).toBe(0)
})
