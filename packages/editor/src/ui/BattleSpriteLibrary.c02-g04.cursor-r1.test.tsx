// @vitest-environment jsdom
/**
 * TEST-CURSOR-ASSET-UI-LARGE-1 C02-G04：未使用战斗帧源（无用途资产）删除生命周期。
 * 排重：BattleSpriteLibrary.test.tsx 只证「删除用途」在引用 fail-closed 下禁用；glm-boundaries 只证
 * DeleteUnusedBattleSpriteAsset 命令的缺席/仍被定义引用恰抛。无任何测试走 UI「删除源文件」。
 * 本文件补：入口可见性、取消零提交、确认后目录/blob/选择、undo 以磁盘字节恢复 blob 后可再解码、
 * 引用未就绪禁用、删除前字节校验失败不丢资产、连续删除与双层撤销、删最后用途再删资产、
 * 被真实引用的 starter 用途不可删。
 */
import type { FileSource } from '@type-pal/reforge'
import { act } from 'react'
import { expect, test, vi } from 'vitest'
import {
  decodeBattleAsset,
  loadCursorBattleProject,
} from '../__tests__/cursor-asset-r1/battle-sprite-fixtures.js'
import {
  A_ENEMY,
  A_IDLE,
  A_SPARE,
  catalogMetas,
  deleteAssetButton,
  deleteUsageButton,
  noticeErrors,
  openTab,
  STANDARD_SPECS,
  selectAssetRow,
  selectedCatalogAsset,
  setupBattleSuite,
  waitProof,
} from '../__tests__/cursor-asset-r1/battle-sprite-ui.js'
import { sha256Hex } from '../core/binary-signature.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'

const suite = setupBattleSuite()

function replaceSourceButton(host: HTMLElement): HTMLButtonElement | undefined {
  return [...host.querySelectorAll<HTMLButtonElement>('button')].find(
    (candidate) => candidate.textContent?.trim() === '替换源文件',
  )
}

async function deleteSelectedAsset(host: HTMLElement): Promise<void> {
  await act(async () => {
    deleteAssetButton(host)!.click()
  })
}

test('C02-G04-01 入口互斥：有用途的帧源只给替换，无用途的帧源只给删除', async () => {
  const m = await suite.mount('c02-g04-01', { focus: 'shared-fighter-a' })
  await waitProof(m.host, 12, 2)
  expect(replaceSourceButton(m.host)).toBeDefined()
  expect(deleteAssetButton(m.host)).toBeUndefined()

  await selectAssetRow(m.host, A_IDLE)
  await waitProof(m.host, 4, 0)
  expect(replaceSourceButton(m.host)).toBeUndefined()
  expect(deleteAssetButton(m.host)).toBeDefined()
  expect(deleteAssetButton(m.host)?.title).toBe('删除当前源文件')
})

test('C02-G04-02 确认框选取消：零提交，目录与历史不变', async () => {
  const m = await suite.mount('c02-g04-02', { view: 'asset', focus: A_IDLE })
  await waitProof(m.host, 4, 0)
  const metas = catalogMetas(m.host)
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
  await deleteSelectedAsset(m.host)
  expect(confirm).toHaveBeenCalledWith('永久移除未使用帧源“C02闲置”？')
  expect(m.session.getHistoryVersion()).toBe(0)
  expect(m.session.getState().assetCatalog.assets[A_IDLE]).toBeDefined()
  expect(catalogMetas(m.host)).toEqual(metas)
  expect(selectedCatalogAsset(m.host)).toBe(A_IDLE)
  expect(noticeErrors(m.notices)).toEqual([])
})

test('C02-G04-03 确认删除：目录、catalog 与 blob 同步移除，选择落到首个其他资产并上报宿主', async () => {
  const m = await suite.mount('c02-g04-03', { view: 'asset', focus: A_IDLE })
  await waitProof(m.host, 4, 0)
  const path = m.session.getState().assetCatalog.assets[A_IDLE]!.path
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  await deleteSelectedAsset(m.host)
  await vi.waitFor(() => {
    expect(m.session.getState().assetCatalog.assets[A_IDLE]).toBeUndefined()
  })
  expect(m.session.getHistoryVersion()).toBe(1)
  expect(m.session.getState().assetBlobs[path]).toBeUndefined()
  expect(catalogMetas(m.host)).toHaveLength(5)
  expect(catalogMetas(m.host)).not.toContain(A_IDLE)
  expect(selectedCatalogAsset(m.host)).toBe(A_ENEMY)
  expect(m.viewHistory.at(-1)).toEqual({ view: 'definition', objectId: 'enemy-red' })
  expect(noticeErrors(m.notices)).toEqual([])
  assertProjectSaveValid(m.session.getState())
})

test('C02-G04-04 删除后 undo：磁盘字节写回 blob，行回到目录且可再次真实解码', async () => {
  const m = await suite.mount('c02-g04-04', { view: 'asset', focus: A_SPARE })
  await waitProof(m.host, 3, 0)
  const record = m.session.getState().assetCatalog.assets[A_SPARE]!
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  await deleteSelectedAsset(m.host)
  await vi.waitFor(() => {
    expect(m.session.getState().assetCatalog.assets[A_SPARE]).toBeUndefined()
  })
  await act(async () => {
    expect(m.session.undo()).toBe(true)
  })
  const restored = m.session.getState().assetCatalog.assets[A_SPARE]!
  expect(restored).toEqual(record)
  const blob = m.session.getState().assetBlobs[record.path]
  expect(blob).toBeDefined()
  expect(await sha256Hex(blob!.slice(0))).toBe(record.sha256)
  expect(catalogMetas(m.host)).toContain(A_SPARE)
  await selectAssetRow(m.host, A_SPARE)
  await waitProof(m.host, 3, 0)
  expect((await decodeBattleAsset(m.project, m.session.getState(), A_SPARE)).frames).toHaveLength(3)
  assertProjectSaveValid(m.session.getState())
})

test('C02-G04-05 undo/redo 两个方向都过保存门，redo 重新移除 catalog 与 blob', async () => {
  const m = await suite.mount('c02-g04-05', { view: 'asset', focus: A_IDLE })
  await waitProof(m.host, 4, 0)
  const path = m.session.getState().assetCatalog.assets[A_IDLE]!.path
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  await deleteSelectedAsset(m.host)
  await vi.waitFor(() => {
    expect(m.session.getState().assetCatalog.assets[A_IDLE]).toBeUndefined()
  })
  assertProjectSaveValid(m.session.getState())
  await act(async () => {
    expect(m.session.undo()).toBe(true)
  })
  assertProjectSaveValid(m.session.getState())
  expect(m.session.getState().assetBlobs[path]).toBeDefined()
  await act(async () => {
    expect(m.session.redo()).toBe(true)
  })
  assertProjectSaveValid(m.session.getState())
  expect(m.session.getState().assetCatalog.assets[A_IDLE]).toBeUndefined()
  expect(m.session.getState().assetBlobs[path]).toBeUndefined()
})

test('C02-G04-06 引用索引未就绪：删除源文件禁用并给出原因，就绪后恢复可点', async () => {
  const m = await suite.mount('c02-g04-06', {
    view: 'asset',
    focus: A_IDLE,
    referenceStatus: 'stale',
  })
  await waitProof(m.host, 4, 0)
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
  expect(deleteAssetButton(m.host)!.disabled).toBe(true)
  expect(deleteAssetButton(m.host)!.title).toBe('正在刷新资源引用，暂不能删除')
  await act(async () => deleteAssetButton(m.host)!.click())
  expect(confirm).not.toHaveBeenCalled()
  expect(m.session.getHistoryVersion()).toBe(0)

  await m.update({ referenceStatus: 'current' })
  expect(deleteAssetButton(m.host)!.disabled).toBe(false)
  expect(deleteAssetButton(m.host)!.title).toBe('删除当前源文件')
})

test('C02-G04-07 磁盘字节与登记不符：删除前校验拒绝，资产与历史保持', async () => {
  const project = await loadCursorBattleProject('c02-g04-07', STANDARD_SPECS)
  const sparePath = project.seeded.get(A_SPARE)!.path
  const corrupt: FileSource = {
    readText: (rel, signal) => project.source.readText(rel, signal),
    readJson: (rel, signal) => project.source.readJson(rel, signal),
    urlFor: (rel) => project.source.urlFor(rel),
    async readBytes(rel, signal) {
      const bytes = await project.source.readBytes(rel, signal)
      if (rel !== sparePath) return bytes
      const flipped = new Uint8Array(bytes.slice(0))
      flipped[flipped.length - 1] = flipped[flipped.length - 1]! ^ 0xff
      return flipped.buffer
    },
    dispose: () => project.source.dispose?.(),
  }
  const m = await suite.mountProject(project, { view: 'asset', focus: A_SPARE, source: corrupt })
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
  expect(deleteAssetButton(m.host)!.disabled).toBe(false)
  await deleteSelectedAsset(m.host)
  await vi.waitFor(() => {
    expect(noticeErrors(m.notices).length).toBeGreaterThan(0)
  })
  expect(confirm).toHaveBeenCalledOnce()
  expect(noticeErrors(m.notices).at(-1)).toContain('删除前校验')
  expect(m.session.getState().assetCatalog.assets[A_SPARE]).toBeDefined()
  expect(m.session.getHistoryVersion()).toBe(0)
})

test('C02-G04-08 连续删除两个闲置资产：每次都落首个其他资产，两次 undo 还原目录顺序', async () => {
  const m = await suite.mount('c02-g04-08', { view: 'asset', focus: A_IDLE })
  await waitProof(m.host, 4, 0)
  const original = catalogMetas(m.host)
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  await deleteSelectedAsset(m.host)
  await vi.waitFor(() => {
    expect(m.session.getState().assetCatalog.assets[A_IDLE]).toBeUndefined()
  })
  await selectAssetRow(m.host, A_SPARE)
  await waitProof(m.host, 3, 0)
  await deleteSelectedAsset(m.host)
  await vi.waitFor(() => {
    expect(m.session.getState().assetCatalog.assets[A_SPARE]).toBeUndefined()
  })
  expect(catalogMetas(m.host)).toHaveLength(4)
  expect(selectedCatalogAsset(m.host)).toBe(A_ENEMY)
  expect(m.session.getHistoryVersion()).toBe(2)

  await act(async () => {
    expect(m.session.undo()).toBe(true)
    expect(m.session.undo()).toBe(true)
  })
  expect(catalogMetas(m.host)).toEqual(original)
  expect(m.session.undo()).toBe(false)
})

test('C02-G04-09 先删最后一个用途再删源文件：两步各自可撤销，整体撤回后与初始完全一致', async () => {
  const m = await suite.mount('c02-g04-09', { focus: 'enemy-red' })
  await waitProof(m.host, 6, 1)
  const beforeSprites = structuredClone(m.session.getState().battleSprites)
  const beforeCatalog = structuredClone(m.session.getState().assetCatalog)
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  await act(async () => deleteUsageButton(m.host)!.click())
  await waitProof(m.host, 6, 0)
  expect(replaceSourceButton(m.host)).toBeUndefined()
  await deleteSelectedAsset(m.host)
  await vi.waitFor(() => {
    expect(m.session.getState().assetCatalog.assets[A_ENEMY]).toBeUndefined()
  })
  expect(m.session.getHistoryVersion()).toBe(2)
  assertProjectSaveValid(m.session.getState())

  await act(async () => {
    expect(m.session.undo()).toBe(true)
  })
  expect(m.session.getState().assetCatalog.assets[A_ENEMY]).toBeDefined()
  expect(m.session.getState().battleSprites.some((e) => e.id === 'enemy-red')).toBe(false)
  await act(async () => {
    expect(m.session.undo()).toBe(true)
  })
  expect(m.session.getState().battleSprites).toEqual(beforeSprites)
  expect(m.session.getState().assetCatalog).toEqual(beforeCatalog)
})

test('C02-G04-10 被角色引用的 starter 用途不可删：按钮禁用并写明引用数，引用页签计数一致', async () => {
  const m = await suite.mount('c02-g04-10')
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
  const button = deleteUsageButton(m.host)!
  expect(button.disabled).toBe(true)
  const count = Number(/仍有 (\d+) 处用途引用，不能删除/.exec(button.title)?.[1])
  expect(count).toBeGreaterThanOrEqual(1)
  await act(async () => button.click())
  expect(confirm).not.toHaveBeenCalled()
  expect(m.session.getState().battleSprites.some((e) => e.id === 'starter-fighter')).toBe(true)
  await openTab(m.host, new RegExp(`^引用\\s*${count}$`))
  expect(m.host.querySelectorAll('.ds-reference-row').length).toBe(count)
})
