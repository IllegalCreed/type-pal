// @vitest-environment jsdom

import type { AssetRecordV1 } from '@type-pal/content'
import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { waitForReact } from '../__tests__/react-io-wait.js'
import { UpdateActorCommand } from '../core/actor-commands.js'
import { sha256Hex } from '../core/binary-signature.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'
import { buttonByLabel, clickButton, deferred } from './__tests__/glm-ui-wave-kit.js'
import { installImageWorkbenchTestHost } from './__tests__/image-workbench-test-host.js'
import { atlasColors, pngRgba } from './__tests__/kimi-editor-workflows/kit.js'
import { decodePngPixels, patternedRgba, seedImage } from './__tests__/static-image-fixtures.js'

const {
  host,
  mountTab,
  importPng,
  imageRow,
  clickImageRow,
  waitPreviewSize,
  heroTitle,
  waitCatalogAsset,
} = installImageWorkbenchTestHost()

const portraitId = 'portrait.deletion'

async function openDeletion(referenceStatus: 'current' | 'failed' = 'current') {
  const mounted = await mountTab({
    referenceStatus,
    async prepare(current) {
      await seedImage(current.session, {
        id: portraitId,
        kind: 'portrait',
        label: '待删除',
        png: pngRgba(2, 2, patternedRgba(2, 2, atlasColors(2))),
      })
    },
  })
  await waitPreviewSize('2 × 2')
  const read = vi.spyOn(mounted.reader, 'readBytes')
  await clickButton(host, '删除')
  const dialog = document.querySelector<HTMLDialogElement>('dialog[aria-label="删除图片"]')
  if (!dialog?.open) throw new Error('Deletion dialog did not open')
  return { ...mounted, dialog, read }
}

describe('ImageTab references', () => {
  test('删除真实资源：真实引用索引确认、选择回退与焦点、undo 字节级还原可真实解码', async () => {
    const mounted = await mountTab()
    const rgbaA = patternedRgba(6, 4, atlasColors(2))
    const pngA = pngRgba(6, 4, rgbaA)
    const shaA = await sha256Hex(pngA)
    const idA = `portrait.authored.${shaA.slice(0, 16)}`
    const rgbaC = patternedRgba(10, 5, atlasColors(16).slice(2, 4))
    const pngC = pngRgba(10, 5, rgbaC)
    const shaC = await sha256Hex(pngC)
    const idC = `portrait.authored.${shaC.slice(0, 16)}`
    await importPng('甲.png', pngA)
    await waitCatalogAsset(mounted, idA)
    await importPng('丙.png', pngC)
    await waitCatalogAsset(mounted, idC)
    await clickImageRow(idA)
    await waitPreviewSize('6 × 4')

    await clickButton(host, '删除')
    const dialog = document.querySelector<HTMLDialogElement>('dialog[aria-label="删除图片"]')
    expect(dialog, '删除确认弹窗').not.toBeNull()
    expect(dialog!.open).toBe(true)
    expect(dialog!.textContent).toContain('甲')
    expect(dialog!.textContent).toContain('0 处')
    const historyBeforeDelete = mounted.session.getHistoryVersion()
    await act(async () => {
      buttonByLabel(dialog!, '删除图片').click()
    })
    await waitForReact(() => {
      expect(mounted.session.getState().assetCatalog.assets[idA]).toBeUndefined()
    })
    expect(
      mounted.session.getState().assetBlobs[`assets/authored/portrait/${shaA}.png`],
    ).toBeUndefined()
    expect(mounted.session.getHistoryVersion()).toBeGreaterThan(historyBeforeDelete)
    await expect(mounted.reader.readBytes(idA, 'portrait')).rejects.toThrow('不在 catalog')
    // DsDialog 常驻 DOM，关闭语义由 open 属性承载。
    expect(
      document.querySelector<HTMLDialogElement>('dialog[aria-label="删除图片"]')?.open ?? false,
    ).toBe(false)
    // 选择回退到剩余真实资源并同步焦点；预览真实重载。
    await waitPreviewSize('10 × 5')
    expect(imageRow(idC).getAttribute('aria-pressed')).toBe('true')
    expect(heroTitle()).toBe('丙')
    expect(mounted.focusLog.at(-1)).toBe(idC)
    assertProjectSaveValid(mounted.session.getState())

    // undo：record/blob 字节级还原，真实解码出原像素；选择不回跳（丙仍在）。
    await act(async () => {
      expect(mounted.session.undo()).toBe(true)
    })
    const record = mounted.session.getState().assetCatalog.assets[idA]
    expect(record).toBeDefined()
    expect(record).toEqual({
      kind: 'portrait',
      path: `assets/authored/portrait/${shaA}.png`,
      mediaType: 'image/png',
      bytes: pngA.byteLength,
      sha256: shaA,
      label: '甲',
      origin: { kind: 'authored', ref: '甲.png' },
    } satisfies AssetRecordV1)
    const restoredBlob = mounted.session.getState().assetBlobs[record!.path]
    expect(restoredBlob).toBeDefined()
    expect(await sha256Hex(restoredBlob!)).toBe(shaA)
    const decoded = await decodePngPixels(await mounted.reader.readBytes(idA, 'portrait'))
    expect(decoded.width).toBe(6)
    expect(decoded.height).toBe(4)
    expect(Array.from(decoded.rgba)).toEqual(Array.from(rgbaA))
    expect(heroTitle()).toBe('丙')
    assertProjectSaveValid(mounted.session.getState())
  })

  test('cancel closes the dialog without reading bytes or changing history', async () => {
    const { session, read, dialog } = await openDeletion()
    const version = session.getHistoryVersion()
    await clickButton(dialog, '取消')
    expect(dialog.open).toBe(false)
    expect(read).not.toHaveBeenCalled()
    expect(session.getHistoryVersion()).toBe(version)
    expect(session.getState().assetCatalog.assets[portraitId]?.label).toBe('待删除')
  })

  test('a failed reference scan disables deletion without treating the count as zero', async () => {
    const { session, read, dialog } = await openDeletion('failed')
    const version = session.getHistoryVersion()
    const remove = buttonByLabel(dialog, '删除图片')
    expect(dialog.textContent).toContain('未知（扫描失败）')
    expect(remove.disabled).toBe(true)
    await act(async () => remove.click())
    expect(read).not.toHaveBeenCalled()
    expect(session.getHistoryVersion()).toBe(version)
    expect(session.getState().assetCatalog.assets[portraitId]?.label).toBe('待删除')
  })

  test('a portrait reference added during the byte read blocks the delete commit', async () => {
    const { session, reader, read, dialog } = await openDeletion()
    const bytes = await reader.readBytes(portraitId, 'portrait')
    read.mockClear()
    const pending = deferred<ArrayBuffer>()
    read.mockReturnValueOnce(pending.promise)
    expect(dialog.textContent).toContain('0 处')
    try {
      await clickButton(dialog, '删除图片')
      expect(read).toHaveBeenCalledWith(portraitId, 'portrait')
      await act(async () => {
        session.dispatch(new UpdateActorCommand('hero', { portraits: { default: portraitId } }))
      })
      assertProjectSaveValid(session.getState())
    } finally {
      await act(async () => pending.resolve(bytes))
    }
    await waitForReact(() =>
      expect(host.textContent).toContain(`资源 ${portraitId} 仍被 1 处引用，不能删除`),
    )
    expect(session.getHistoryVersion()).toBe(2)
    expect(session.getState().assetCatalog.assets[portraitId]?.label).toBe('待删除')
    expect(session.getState().actors.find((actor) => actor.id === 'hero')?.portraits?.default).toBe(
      portraitId,
    )
  })
})
