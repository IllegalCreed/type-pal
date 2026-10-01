// @vitest-environment jsdom
/**
 * TEST-CURSOR-ASSET-UI-LARGE-1 C02-G03：选择归属（谁拥有 selectedAsset / selectedId / view）。
 * 排重：BattleSpriteLibrary.test.tsx 已证 mock 预览下的深链/筛选/草稿不串（共享双用途切换草稿）、
 * 用途被撤销或删除后回落同资源首项；glm-ui-wave 已证删除用途回落兄弟。
 * 本文件在真实预览/真实会话上补：初始归属、深链 asset 视图、目录点击向宿主上报的 view/objectId、
 * 宿主受控深链对导入面板的重置、过滤不偷换选择、未配置筛选的 asset 上报、共享资源内切换不记忆、
 * 最后一个用途删除后落到 asset 视图、行切换丢弃新增草稿与回到动作页签、外部删除选中资产的回落。
 */
import { act } from 'react'
import { expect, test, vi } from 'vitest'
import {
  A_ENEMY,
  A_IDLE,
  A_SHARED,
  A_SPARE,
  A_STARTER,
  catalogMetas,
  clickButtonByText,
  deleteAssetButton,
  deleteUsageButton,
  heroTitle,
  openImportPanel,
  openTab,
  selectAssetRow,
  selectedCatalogAsset,
  setupBattleSuite,
  usageNameInput,
  waitProof,
} from '../__tests__/cursor-asset-r1/battle-sprite-ui.js'
import { pickCombobox, typeDraft } from '../__tests__/cursor-asset-r1/kit.js'
import { DeleteUnusedBattleSpriteAssetCommand } from '../core/commands.js'
import { collectCurrentProjectReferenceIndex } from '../core/project-reference-adapters.js'

const suite = setupBattleSuite()

function inspectorWho(host: HTMLElement): string {
  return host.querySelector('.inspector .who')?.textContent ?? ''
}

function activeTab(host: HTMLElement): string {
  return (
    host
      .querySelector(
        '[role="tablist"][aria-label="战斗精灵检查器"] [role="tab"][aria-selected="true"]',
      )
      ?.textContent?.trim()
      .replace(/\s*\d+$/, '') ?? ''
  )
}

async function setSearch(host: HTMLElement, value: string): Promise<void> {
  const input = host.querySelector<HTMLInputElement>('input[aria-label="过滤战斗精灵库"]')
  expect(input, 'search').not.toBeNull()
  await typeDraft(input!, value)
}

async function setKindFilter(host: HTMLElement, label: string): Promise<void> {
  const trigger = host.querySelector<HTMLElement>('[role="combobox"][aria-label="用途筛选"]')
  expect(trigger, 'kind filter').not.toBeNull()
  await pickCombobox(trigger!, label)
}

test('C02-G03-01 无深链初始归属 definitions[0]：starter 被选中，目录行/检查器同名且不向宿主上报', async () => {
  const m = await suite.mount('c02-g03-01')
  expect(selectedCatalogAsset(m.host)).toBe(A_STARTER)
  expect(inspectorWho(m.host)).toBe(heroTitle(m.host))
  expect(usageNameInput(m.host)?.value).toBe('占位主角战斗形象')
  expect(catalogMetas(m.host)).toHaveLength(6)
  expect(m.viewHistory).toEqual([])
  expect(m.focusHistory).toEqual([])
})

test('C02-G03-02 asset 视图深链未配置资产：默认落源文件页签，提供删除而非替换', async () => {
  const m = await suite.mount('c02-g03-02', { view: 'asset', focus: A_IDLE })
  await waitProof(m.host, 4, 0)
  expect(selectedCatalogAsset(m.host)).toBe(A_IDLE)
  expect(heroTitle(m.host)).toBe('C02闲置')
  expect(activeTab(m.host)).toBe('源文件')
  expect(deleteAssetButton(m.host)).toBeDefined()
  expect(
    [...m.host.querySelectorAll('button')].some((b) => b.textContent?.trim() === '替换源文件'),
  ).toBe(false)
  expect(usageNameInput(m.host)).toBeNull()
})

test('C02-G03-03 点击目录行向宿主上报：有用途资产报首个用途，未配置资产报 asset', async () => {
  const m = await suite.mount('c02-g03-03')
  await selectAssetRow(m.host, A_SHARED)
  expect(m.viewHistory.at(-1)).toEqual({ view: 'definition', objectId: 'shared-fighter-a' })
  expect(m.focusHistory.at(-1)).toBe('shared-fighter-a')
  await selectAssetRow(m.host, A_IDLE)
  expect(m.viewHistory.at(-1)).toEqual({ view: 'asset', objectId: A_IDLE })
  expect(m.focusHistory.at(-1)).toBe(A_IDLE)
  expect(selectedCatalogAsset(m.host)).toBe(A_IDLE)
  expect(m.session.getHistoryVersion()).toBe(0)
})

test('C02-G03-04 宿主受控深链改焦点：打开中的导入面板被收起，选择跳到目标用途', async () => {
  const m = await suite.mount('c02-g03-04', { focus: 'shared-fighter-a' })
  await openImportPanel(m.host)
  expect(heroTitle(m.host)).toBe('导入战斗精灵')
  await m.update({ view: 'definition', focus: 'enemy-red' })
  expect(m.host.querySelector('.battle-sprite-upload-panel')).toBeNull()
  expect(selectedCatalogAsset(m.host)).toBe(A_ENEMY)
  expect(usageNameInput(m.host)?.value).toBe('赤鬼')
  expect(heroTitle(m.host)).toBe('C02敌人')
})

test('C02-G03-05 搜索过滤不偷换选择：选中项被滤出目录后检查器仍属原对象，清空后高亮回来', async () => {
  const m = await suite.mount('c02-g03-05', { focus: 'shared-fighter-b' })
  await waitProof(m.host, 12, 2)
  await setSearch(m.host, '赤鬼')
  expect(catalogMetas(m.host)).toEqual([A_ENEMY])
  expect(selectedCatalogAsset(m.host)).toBeUndefined()
  expect(inspectorWho(m.host)).toBe('C02共享')
  expect(usageNameInput(m.host)?.value).toBe('乙战士')
  expect(m.viewHistory).toEqual([])

  await setSearch(m.host, '')
  expect(selectedCatalogAsset(m.host)).toBe(A_SHARED)
  expect(catalogMetas(m.host)).toHaveLength(6)
})

test('C02-G03-06 未配置筛选下点行：向宿主报 asset，经深链回流落到源文件页签', async () => {
  const m = await suite.mount('c02-g03-06', { focus: 'enemy-red' })
  await setKindFilter(m.host, '未配置')
  expect(catalogMetas(m.host)).toEqual([A_IDLE, A_SPARE])
  expect(selectedCatalogAsset(m.host)).toBeUndefined()
  await selectAssetRow(m.host, A_SPARE)
  expect(m.viewHistory.at(-1)).toEqual({ view: 'asset', objectId: A_SPARE })
  expect(selectedCatalogAsset(m.host)).toBe(A_SPARE)
  expect(activeTab(m.host)).toBe('源文件')
  expect(deleteAssetButton(m.host)).toBeDefined()
})

test('C02-G03-07 共享资源内切换用途不被记忆：离开再回到该资源总落首个用途', async () => {
  const m = await suite.mount('c02-g03-07', { focus: 'shared-fighter-a' })
  await waitProof(m.host, 12, 2)
  const second = [
    ...m.host.querySelectorAll<HTMLElement>('[aria-label="切换用途"] .ds-catalog-row'),
  ].find((row) => row.textContent?.includes('乙战士'))
  expect(second).toBeDefined()
  await act(async () => second!.click())
  expect(usageNameInput(m.host)?.value).toBe('乙战士')
  expect(inspectorWho(m.host)).toBe('C02共享')
  expect(m.viewHistory.at(-1)).toEqual({ view: 'definition', objectId: 'shared-fighter-b' })

  await selectAssetRow(m.host, A_ENEMY)
  await selectAssetRow(m.host, A_SHARED)
  expect(usageNameInput(m.host)?.value).toBe('甲战士')
  expect(m.viewHistory.at(-1)).toEqual({ view: 'definition', objectId: 'shared-fighter-a' })
})

test('C02-G03-08 逐个删光共享用途：先落兄弟，最后落 asset 视图并切到源文件页签', async () => {
  const m = await suite.mount('c02-g03-08', { focus: 'shared-fighter-a' })
  await waitProof(m.host, 12, 2)
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  await act(async () => deleteUsageButton(m.host)!.click())
  expect(m.viewHistory.at(-1)).toEqual({ view: 'definition', objectId: 'shared-fighter-b' })
  expect(usageNameInput(m.host)?.value).toBe('乙战士')
  await waitProof(m.host, 12, 1)

  await act(async () => deleteUsageButton(m.host)!.click())
  expect(m.viewHistory.at(-1)).toEqual({ view: 'asset', objectId: A_SHARED })
  await waitProof(m.host, 12, 0)
  expect(activeTab(m.host)).toBe('源文件')
  expect(usageNameInput(m.host)).toBeNull()
  expect(deleteAssetButton(m.host)).toBeDefined()
  expect(selectedCatalogAsset(m.host)).toBe(A_SHARED)
})

test('C02-G03-09 新增用途草稿属于当前资源：切到别的资源行即丢弃，回来不复活', async () => {
  const m = await suite.mount('c02-g03-09', { focus: 'shared-fighter-a' })
  await waitProof(m.host, 12, 2)
  await clickButtonByText(m.host, '新增用途')
  await clickButtonByText(m.host, '召唤现身')
  await vi.waitFor(() => {
    expect(m.host.textContent).toContain('新用途尚未写入项目')
  })
  await selectAssetRow(m.host, A_ENEMY)
  expect(m.host.textContent).not.toContain('新用途尚未写入项目')
  expect(usageNameInput(m.host)?.value).toBe('赤鬼')
  await selectAssetRow(m.host, A_SHARED)
  expect(m.host.textContent).not.toContain('新用途尚未写入项目')
  expect(usageNameInput(m.host)?.value).toBe('甲战士')
  expect(m.session.getHistoryVersion()).toBe(0)
})

test('C02-G03-10 外部删除当前选中的未配置资产：选择回落目录首项并向宿主上报', async () => {
  const m = await suite.mount('c02-g03-10', { view: 'asset', focus: A_IDLE })
  await waitProof(m.host, 4, 0)
  await act(async () => {
    m.session.dispatch(
      new DeleteUnusedBattleSpriteAssetCommand(A_IDLE, (state) =>
        collectCurrentProjectReferenceIndex(state),
      ),
    )
  })
  expect(catalogMetas(m.host)).not.toContain(A_IDLE)
  expect(selectedCatalogAsset(m.host)).toBe(A_ENEMY)
  expect(m.viewHistory.at(-1)).toEqual({ view: 'definition', objectId: 'enemy-red' })
  expect(usageNameInput(m.host)?.value).toBe('赤鬼')
})

test('C02-G03-11 引用页签只属于当前行：切行后回到动作页签', async () => {
  const m = await suite.mount('c02-g03-11', { focus: 'enemy-red' })
  await openTab(m.host, /^引用/)
  expect(activeTab(m.host)).toBe('引用')
  await selectAssetRow(m.host, A_SHARED)
  expect(activeTab(m.host)).toBe('动作')
})
