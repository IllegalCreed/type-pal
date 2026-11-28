// @vitest-environment jsdom
import { expect, test } from 'vitest'
import {
  A_ENEMY,
  A_IDLE,
  A_SHARED,
  A_SPARE,
  A_STARTER,
  A_SUMMON,
  catalogMetas,
  catalogRow,
  clickButtonByText,
  selectedCatalogAsset,
  setupBattleSuite,
  usageNameInput,
} from '../__tests__/battle-sprite-library-gestures.js'
import { pickCombobox } from '../__tests__/cursor-asset-r1/kit.js'
import { setCatalogSearch } from './catalog-controls-test-utils.js'

const suite = setupBattleSuite()

test('目录的搜索与用途取交集，隐藏的当前选择在清空后重新高亮', async () => {
  const mounted = await suite.mount('battle-catalog-filter-intersection', {
    focus: 'shared-fighter-a',
  })
  const query = mounted.host.querySelector<HTMLInputElement>('input[aria-label="过滤战斗精灵库"]')
  const kindFilter = mounted.host.querySelector<HTMLElement>(
    '[role="combobox"][aria-label="用途筛选"]',
  )
  if (!query || !kindFilter) throw new Error('精灵目录应该提供搜索和用途筛选')

  await setCatalogSearch(query, '共享')
  await pickCombobox(kindFilter, '敌人')
  expect(catalogMetas(mounted.host)).toEqual([])
  expect(usageNameInput(mounted.host)?.value).toBe('甲战士')

  await pickCombobox(kindFilter, '玩家战斗')
  expect(catalogMetas(mounted.host)).toEqual([A_SHARED])
  expect(selectedCatalogAsset(mounted.host)).toBe(A_SHARED)

  await setCatalogSearch(query, '')
  expect(new Set(catalogMetas(mounted.host))).toEqual(new Set([A_SHARED, A_STARTER]))
  await pickCombobox(kindFilter, '敌人')
  expect(catalogMetas(mounted.host)).toEqual([A_ENEMY])
  await pickCombobox(kindFilter, '召唤现身')
  expect(catalogMetas(mounted.host)).toEqual([A_SUMMON])
  await pickCombobox(kindFilter, '未配置')
  expect(new Set(catalogMetas(mounted.host))).toEqual(new Set([A_IDLE, A_SPARE]))
  expect(selectedCatalogAsset(mounted.host)).toBeUndefined()

  await pickCombobox(kindFilter, '全部')
  expect(catalogMetas(mounted.host)).toHaveLength(6)
  expect(selectedCatalogAsset(mounted.host)).toBe(A_SHARED)
  expect(mounted.focusHistory).toEqual([])
})

test('共享源帧的多个用途只占一行，目录展示资产名称、身份和未配置状态', async () => {
  const mounted = await suite.mount('battle-catalog-row-identity', {
    focus: 'shared-fighter-a',
  })
  const rows = [...mounted.host.querySelectorAll<HTMLElement>('.sprite-resource-row')]
  expect(rows).toHaveLength(6)
  expect(new Set(catalogMetas(mounted.host)).size).toBe(6)
  expect(rows.map((row) => row.dataset.leading)).toEqual(Array(6).fill('none'))
  const shared = catalogRow(mounted.host, A_SHARED)
  expect(shared?.querySelector('.ds-catalog-row__title')?.textContent).toBe('C02共享')
  expect(shared?.querySelector('.ds-catalog-row__meta')?.textContent).toBe(A_SHARED)
  expect(shared?.querySelector('.ds-tag')).toBeNull()
  expect(shared?.textContent).not.toContain('.rle')
  expect(shared?.textContent).not.toContain('玩家战斗')
  expect(catalogRow(mounted.host, A_IDLE)?.querySelector('.ds-tag')?.textContent).toBe('未配置')
  expect(mounted.host.querySelector('.sprite-library-switch')).toBeNull()

  const upload = mounted.host.querySelector('.ds-list-header__action[aria-label="导入战斗精灵"]')
  const search = mounted.host.querySelector('input[aria-label="过滤战斗精灵库"]')
  if (!upload || !search) throw new Error('精灵目录应显示导入和搜索入口')
  expect(upload.compareDocumentPosition(search) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
})

test('资产名为空白时目录仍显示本地化名称和原 AssetId', async () => {
  const mounted = await suite.mount(
    'battle-catalog-blank-label',
    { view: 'asset', focus: A_IDLE },
    [{ asset: A_IDLE, label: '   ', frameCount: 2, definitions: [] }],
  )
  const row = catalogRow(mounted.host, A_IDLE)
  expect(row?.querySelector('.ds-catalog-row__title')?.textContent).toBe('未命名战斗精灵')
  expect(row?.querySelector('.ds-catalog-row__meta')?.textContent).toBe(A_IDLE)
})

test('目录切换到大世界时通知宿主且保留工程内容', async () => {
  const mounted = await suite.mount('battle-catalog-exit-domain')
  await clickButtonByText(mounted.host, '大世界')
  expect(mounted.worldDomainCalls).toHaveLength(1)
  expect(mounted.viewHistory).toEqual([])
  expect(mounted.session.getHistoryVersion()).toBe(0)
})
