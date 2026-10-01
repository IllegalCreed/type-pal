// @vitest-environment jsdom
/**
 * TEST-CURSOR-ASSET-UI-LARGE-1 C02-G02：导入取消 / 失败 / 恢复。
 * 排重：kimi K01 已证「10 帧 PNG 一次导入」入库字节链与 undo/redo；uploader.glm-next-wave 已证
 * 帧宽不整除失败与取消零提交（仅 uploader 组件级）；import.boundaries 已证命名/复用核。
 * 本文件补库级导入生命周期：取消后重开为空、玩家 9 帧经库失败后同面板恢复、损坏文件恢复、
 * 单帧敌人 profile、同字节异用途复用 AssetId 与撤销链、id 递增、非 ASCII 前缀回退、
 * 导入后 undo/redo 的选择归属、面板字段在取消后保留。
 */
import { act } from 'react'
import { expect, test, vi } from 'vitest'
import {
  buttonByText,
  catalogMetas,
  clickButtonByText,
  heroTitle,
  noticeErrors,
  openImportPanel,
  pickImportFile,
  selectedCatalogAsset,
  setupBattleSuite,
  waitProof,
} from '../__tests__/cursor-asset-r1/battle-sprite-ui.js'
import { atlasColors, pngFileOf, solidAtlasPng } from '../__tests__/cursor-asset-r1/image-ports.js'
import {
  comboboxTrigger,
  controlByLabel,
  fillAndBlur,
  pickCombobox,
} from '../__tests__/cursor-asset-r1/kit.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'

const suite = setupBattleSuite()

const atlas = (count: number, rotate = 0) =>
  solidAtlasPng(
    8,
    8,
    atlasColors(16).slice(rotate).concat(atlasColors(16).slice(0, rotate)).slice(0, count),
  )

async function waitFrameSummary(host: HTMLElement, count: number): Promise<void> {
  await vi.waitFor(() => {
    expect(host.textContent).toContain(`共 ${count} 帧（横排逐行切）`)
  })
}

function assetIds(m: { session: { getState(): { assetCatalog: { assets: object } } } }): string[] {
  return Object.keys(m.session.getState().assetCatalog.assets)
}

function uploaderError(host: HTMLElement): string {
  return host.querySelector('.bsu .err')?.textContent ?? ''
}

test('C02-G02-01 取消导入：面板关闭、选择与历史不变，重开后上传器回到空态', async () => {
  const m = await suite.mount('c02-g02-01')
  const titleBefore = heroTitle(m.host)
  const selectedBefore = selectedCatalogAsset(m.host)
  await openImportPanel(m.host)
  expect(heroTitle(m.host)).toBe('导入战斗精灵')
  await pickImportFile(m.host, pngFileOf('十帧.png', atlas(10).bytes))
  await waitFrameSummary(m.host, 10)

  await clickButtonByText(m.host, '取消')
  expect(m.host.querySelector('.battle-sprite-upload-panel')).toBeNull()
  expect(heroTitle(m.host)).toBe(titleBefore)
  expect(selectedCatalogAsset(m.host)).toBe(selectedBefore)
  expect(m.session.getHistoryVersion()).toBe(0)

  await openImportPanel(m.host)
  expect(m.host.textContent).not.toContain('帧（横排逐行切）')
  expect(
    [...m.host.querySelectorAll('button')].some((b) => b.textContent?.trim() === '应用外观'),
  ).toBe(false)
})

test('C02-G02-02 玩家 9 帧图集导入失败：面板保留、零提交，换 10 帧后同面板恢复并选中新用途', async () => {
  const m = await suite.mount('c02-g02-02')
  const idsBefore = assetIds(m)
  await openImportPanel(m.host)
  await pickImportFile(m.host, pngFileOf('九帧.png', atlas(9).bytes))
  await waitFrameSummary(m.host, 9)
  await clickButtonByText(m.host, '应用外观')
  await vi.waitFor(() => {
    expect(uploaderError(m.host)).toContain('玩家战斗精灵至少需要 10 帧')
  })
  expect(noticeErrors(m.notices).at(-1)).toContain('玩家战斗精灵至少需要 10 帧')
  expect(m.host.querySelector('.battle-sprite-upload-panel')).not.toBeNull()
  expect(m.session.getHistoryVersion()).toBe(0)
  expect(assetIds(m)).toEqual(idsBefore)

  await pickImportFile(m.host, pngFileOf('十帧.png', atlas(10).bytes))
  await waitFrameSummary(m.host, 10)
  expect(uploaderError(m.host)).toBe('')
  await clickButtonByText(m.host, '应用外观')
  await vi.waitFor(() => {
    expect(m.host.querySelector('.battle-sprite-upload-panel')).toBeNull()
  })
  expect(m.session.getHistoryVersion()).toBe(1)
  expect(m.viewHistory.at(-1)).toEqual({ view: 'definition', objectId: 'authored-player-fighter' })
  expect(assetIds(m)).toHaveLength(idsBefore.length + 1)
  assertProjectSaveValid(m.session.getState())
})

test('C02-G02-03 损坏的图片文件：上传器报错且无应用入口，换合法图后恢复到可应用', async () => {
  const m = await suite.mount('c02-g02-03')
  await openImportPanel(m.host)
  await pickImportFile(m.host, pngFileOf('坏图.png', new Uint8Array([1, 2, 3, 4, 5])))
  await vi.waitFor(() => {
    expect(uploaderError(m.host).length).toBeGreaterThan(0)
  })
  expect(
    [...m.host.querySelectorAll('button')].some((b) => b.textContent?.trim() === '应用外观'),
  ).toBe(false)
  expect(m.session.getHistoryVersion()).toBe(0)

  await pickImportFile(m.host, pngFileOf('合法.png', atlas(10).bytes))
  await waitFrameSummary(m.host, 10)
  expect(uploaderError(m.host)).toBe('')
  expect(buttonByText(m.host, '应用外观').disabled).toBe(false)
})

test('C02-G02-04 单帧图导入为敌人：待机 1 帧、施法/攻击 0 帧，过保存门', async () => {
  const m = await suite.mount('c02-g02-04')
  await openImportPanel(m.host)
  await pickCombobox(comboboxTrigger(m.host, '用途'), '敌人')
  await pickImportFile(m.host, pngFileOf('单帧.png', atlas(1).bytes))
  await waitFrameSummary(m.host, 1)
  await clickButtonByText(m.host, '应用外观')
  await vi.waitFor(() => {
    expect(m.session.getState().battleSprites.some((e) => e.id === 'authored-enemy')).toBe(true)
  })
  const created = m.session.getState().battleSprites.find((e) => e.id === 'authored-enemy')!
  expect(created.profile).toEqual({
    kind: 'enemy',
    idle: { start: 0, count: 1 },
    magic: { start: 1, count: 0 },
    attack: { start: 1, count: 0 },
    idleTicksPerFrame: 5,
    actTicksPerFrame: 1,
  })
  await waitProof(m.host, 1, 1)
  assertProjectSaveValid(m.session.getState())
})

test('C02-G02-05 同字节再导入为召唤：复用同一 AssetId，撤销链只回退定义，最后才移除资产', async () => {
  const m = await suite.mount('c02-g02-05')
  const png = atlas(4)
  const importOnce = async (kindLabel: string): Promise<void> => {
    await openImportPanel(m.host)
    await pickCombobox(comboboxTrigger(m.host, '用途'), kindLabel)
    await pickImportFile(m.host, pngFileOf('四帧.png', png.bytes))
    await waitFrameSummary(m.host, 4)
    await clickButtonByText(m.host, '应用外观')
    await vi.waitFor(() => {
      expect(m.host.querySelector('.battle-sprite-upload-panel')).toBeNull()
    })
  }
  const base = assetIds(m).length
  await importOnce('敌人')
  expect(assetIds(m)).toHaveLength(base + 1)
  const asset = m.session.getState().battleSprites.find((e) => e.id === 'authored-enemy')!.asset
  await importOnce('召唤现身')
  expect(assetIds(m)).toHaveLength(base + 1)
  const summon = m.session.getState().battleSprites.find((e) => e.id === 'authored-summon')!
  expect(summon.asset).toBe(asset)
  await waitProof(m.host, 4, 2)

  const path = m.session.getState().assetCatalog.assets[asset]!.path
  expect(m.session.undo()).toBe(true)
  expect(m.session.getState().battleSprites.some((e) => e.id === 'authored-summon')).toBe(false)
  expect(m.session.getState().assetCatalog.assets[asset]).toBeDefined()
  expect(m.session.getState().assetBlobs[path]).toBeDefined()
  expect(m.session.undo()).toBe(true)
  expect(m.session.getState().assetCatalog.assets[asset]).toBeUndefined()
  expect(m.session.getState().assetBlobs[path]).toBeUndefined()
})

test('C02-G02-06 相同前缀与用途、不同图的两次导入：定义 id 依次为 boss-enemy 与 boss-enemy-2', async () => {
  const m = await suite.mount('c02-g02-06')
  for (const rotate of [0, 3]) {
    await openImportPanel(m.host)
    await fillAndBlur(controlByLabel<HTMLInputElement>(m.host, '配置 ID 前缀'), 'Boss')
    await pickCombobox(comboboxTrigger(m.host, '用途'), '敌人')
    await pickImportFile(m.host, pngFileOf('boss.png', atlas(4, rotate).bytes))
    await waitFrameSummary(m.host, 4)
    await clickButtonByText(m.host, '应用外观')
    await vi.waitFor(() => {
      expect(m.host.querySelector('.battle-sprite-upload-panel')).toBeNull()
    })
  }
  const ids = m.session.getState().battleSprites.map((e) => e.id)
  expect(ids).toContain('boss-enemy')
  expect(ids).toContain('boss-enemy-2')
  const assets = ['boss-enemy', 'boss-enemy-2'].map(
    (id) => m.session.getState().battleSprites.find((e) => e.id === id)!.asset,
  )
  expect(new Set(assets).size).toBe(2)
  assertProjectSaveValid(m.session.getState())
})

test('C02-G02-07 纯中文 ID 前缀回退 authored；显示名留空时定义名回退为前缀词干', async () => {
  const m = await suite.mount('c02-g02-07')
  await openImportPanel(m.host)
  await fillAndBlur(controlByLabel<HTMLInputElement>(m.host, '配置 ID 前缀'), '主角')
  await fillAndBlur(controlByLabel<HTMLInputElement>(m.host, '显示名'), '')
  await pickCombobox(comboboxTrigger(m.host, '用途'), '召唤现身')
  await pickImportFile(m.host, pngFileOf('召唤.png', atlas(3).bytes))
  await waitFrameSummary(m.host, 3)
  await clickButtonByText(m.host, '应用外观')
  await vi.waitFor(() => {
    expect(m.session.getState().battleSprites.some((e) => e.id === 'authored-summon')).toBe(true)
  })
  expect(m.session.getState().battleSprites.find((e) => e.id === 'authored-summon')?.label).toBe(
    'authored',
  )
  assertProjectSaveValid(m.session.getState())
})

test('C02-G02-08 导入后 undo：选择回落到目录首项；redo 恢复资产但不抢回选择', async () => {
  const m = await suite.mount('c02-g02-08')
  await openImportPanel(m.host)
  await pickImportFile(m.host, pngFileOf('十帧.png', atlas(10).bytes))
  await waitFrameSummary(m.host, 10)
  await clickButtonByText(m.host, '应用外观')
  await vi.waitFor(() => {
    expect(m.host.querySelector('.battle-sprite-upload-panel')).toBeNull()
  })
  const imported = m.session
    .getState()
    .battleSprites.find((e) => e.id === 'authored-player-fighter')!
  expect(selectedCatalogAsset(m.host)).toBe(imported.asset)

  await act(async () => {
    expect(m.session.undo()).toBe(true)
  })
  const metas = catalogMetas(m.host)
  expect(metas).not.toContain(imported.asset)
  expect(selectedCatalogAsset(m.host)).toBe(metas[0])
  expect(selectedCatalogAsset(m.host)).not.toBe(imported.asset)

  await act(async () => {
    expect(m.session.redo()).toBe(true)
  })
  expect(catalogMetas(m.host)).toContain(imported.asset)
  expect(selectedCatalogAsset(m.host)).toBe(metas[0])
})

test('C02-G02-09 用途下拉只提供三种导入类型，选召唤后写入 {kind: summon} 且全帧语义', async () => {
  const m = await suite.mount('c02-g02-09')
  await openImportPanel(m.host)
  const trigger = comboboxTrigger<HTMLButtonElement>(m.host, '用途')
  await act(async () => trigger.click())
  const listbox = document.getElementById(trigger.getAttribute('aria-controls')!)!
  expect(
    [...listbox.querySelectorAll('[role="option"]')].map((option) => option.textContent?.trim()),
  ).toEqual(['玩家战斗', '敌人', '召唤现身'])
  await pickCombobox(trigger, '召唤现身')
  await fillAndBlur(controlByLabel<HTMLInputElement>(m.host, '配置 ID 前缀'), 'fx')
  await pickImportFile(m.host, pngFileOf('fx.png', atlas(5).bytes))
  await waitFrameSummary(m.host, 5)
  await clickButtonByText(m.host, '应用外观')
  await vi.waitFor(() => {
    expect(m.session.getState().battleSprites.some((e) => e.id === 'fx-summon')).toBe(true)
  })
  expect(m.session.getState().battleSprites.find((e) => e.id === 'fx-summon')?.profile).toEqual({
    kind: 'summon',
  })
  await waitProof(m.host, 5, 1)
})

test('C02-G02-10 取消后重开保留已填 ID 与显示名；随后导入按保留值落名', async () => {
  const m = await suite.mount('c02-g02-10')
  await openImportPanel(m.host)
  await fillAndBlur(controlByLabel<HTMLInputElement>(m.host, '配置 ID 前缀'), 'keep-me')
  await fillAndBlur(controlByLabel<HTMLInputElement>(m.host, '显示名'), '保留名')
  await clickButtonByText(m.host, '取消')
  await openImportPanel(m.host)
  expect(controlByLabel<HTMLInputElement>(m.host, '配置 ID 前缀').value).toBe('keep-me')
  expect(controlByLabel<HTMLInputElement>(m.host, '显示名').value).toBe('保留名')

  await pickImportFile(m.host, pngFileOf('十帧.png', atlas(10).bytes))
  await waitFrameSummary(m.host, 10)
  await clickButtonByText(m.host, '应用外观')
  await vi.waitFor(() => {
    expect(m.session.getState().battleSprites.some((e) => e.id === 'keep-me-player-fighter')).toBe(
      true,
    )
  })
  const created = m.session.getState().battleSprites.find((e) => e.id === 'keep-me-player-fighter')!
  expect(created.label).toBe('保留名')
  expect(m.session.getState().assetCatalog.assets[created.asset]?.label).toBe('保留名')
})
