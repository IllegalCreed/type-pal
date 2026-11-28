// @vitest-environment jsdom

import type { AssetRecordV1 } from '@type-pal/content'
import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { waitForReact } from '../__tests__/react-io-wait.js'
import { sha256Hex } from '../core/binary-signature.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'
import { loadFilesIntoInput } from './__tests__/glm-ui-wave-kit.js'
import { installImageWorkbenchTestHost } from './__tests__/image-workbench-test-host.js'
import { atlasColors, pngFileOf, pngRgba } from './__tests__/kimi-editor-workflows/kit.js'
import { decodePngPixels, patternedRgba } from './__tests__/static-image-fixtures.js'

const {
  host,
  mountTab,
  importPng,
  replacePng,
  switchKindTab,
  imageRow,
  clickImageRow,
  waitPreviewSize,
  previewCanvasPixels,
  waitOutlinerError,
  heroTitle,
  waitCatalogAsset,
  bitmaps,
} = installImageWorkbenchTestHost()

describe('ImageTab import', () => {
  test.each([
    { tab: '战斗头像', kind: 'face' },
    { tab: '物品图标', kind: 'item-icon' },
  ] as const)('keeps the $kind kind selected at the import entry', async ({ tab, kind }) => {
    const mounted = await mountTab()
    const png = pngRgba(4, 3, patternedRgba(4, 3, atlasColors(2)))
    const sha = await sha256Hex(png)
    const id = `${kind}.authored.${sha.slice(0, 16)}`
    await switchKindTab(tab)
    await importPng('新图像.png', png)
    const record = await waitCatalogAsset(mounted, id)
    expect(record).toMatchObject({
      kind,
      path: `assets/authored/${kind}/${sha}.png`,
      sha256: sha,
      label: '新图像',
    })
    expect(new Uint8Array(await mounted.reader.readBytes(id, kind))).toEqual(png)
    expect(mounted.focusLog).toEqual([id])
    assertProjectSaveValid(mounted.session.getState())
  })

  test('rejects a non-PNG filename without creating an entry or changing the selection', async () => {
    const { session, focusLog } = await mountTab()
    const input = host.querySelector<HTMLInputElement>('input[accept=".png,image/png"]')
    if (!input) throw new Error('Image import field missing')
    await loadFilesIntoInput(input, [new File(['not an image'], 'poster.txt')])
    expect(await waitOutlinerError()).toContain('只允许导入 PNG 文件')
    expect(session.getHistoryVersion()).toBe(0)
    expect(host.querySelector('.image-asset-list')?.textContent).toContain('此项目还没有立绘')
    expect(focusLog).toEqual([])
  })

  test('真实 PNG 导入：像素/尺寸/摘要落账，undo 停留缺失面板，redo 还原', async () => {
    const mounted = await mountTab()
    expect(host.textContent).toContain('此项目还没有立绘。')
    const colors = atlasColors(2)
    const rgba = patternedRgba(6, 4, colors)
    const png = pngRgba(6, 4, rgba)
    const sha = await sha256Hex(png)
    const id = `portrait.authored.${sha.slice(0, 16)}`
    const historyAtMount = mounted.session.getHistoryVersion()

    await importPng('英雄立绘.png', png)
    const record = await waitCatalogAsset(mounted, id)
    expect(record).toEqual({
      kind: 'portrait',
      path: `assets/authored/portrait/${sha}.png`,
      mediaType: 'image/png',
      bytes: png.byteLength,
      sha256: sha,
      label: '英雄立绘',
      origin: { kind: 'authored', ref: '英雄立绘.png' },
    } satisfies AssetRecordV1)
    const blob = mounted.session.getState().assetBlobs[record.path]
    expect(blob).toBeDefined()
    expect(blob!.byteLength).toBe(png.byteLength)
    expect(await sha256Hex(blob!)).toBe(sha)
    expect(new Uint8Array(blob!)).toEqual(png)
    expect(mounted.session.getHistoryVersion()).toBeGreaterThan(historyAtMount)
    expect(mounted.session.isDirty()).toBe(true)
    assertProjectSaveValid(mounted.session.getState())

    // 选中/焦点/hero/检查器摘要全部落在新资源上。
    expect(imageRow(id).getAttribute('aria-pressed')).toBe('true')
    expect(mounted.focusLog).toEqual([id])
    expect(heroTitle()).toBe('英雄立绘')
    expect(host.querySelector('.ds-object-hero__id')?.textContent).toBe(id)
    expect(host.querySelector('.ds-object-hero__meta')?.textContent).toContain('项目创作')
    const inspector = host.querySelector('.image-inspector')!
    expect(inspector.querySelector('[data-property-label="AssetId"] code')?.textContent).toBe(id)
    expect(inspector.querySelector('[data-property-label="文件"] code')?.textContent).toBe(
      record.path,
    )
    expect(
      inspector.querySelector('[data-property-label="来源"] .ds-property-row__value')?.textContent,
    ).toBe('项目创作')
    expect(
      inspector.querySelector('[data-property-label="大小"] .ds-property-row__value')?.textContent,
    ).toBe(`${png.byteLength} B`)

    // 预览真实解码：尺寸文案与画布像素逐字节等于输入 PNG。
    await waitPreviewSize('6 × 4')
    const shown = previewCanvasPixels()
    expect(shown.width).toBe(6)
    expect(shown.height).toBe(4)
    expect(Array.from(shown.rgba)).toEqual(Array.from(rgba))
    expect(bitmaps().liveBitmaps()).toBe(0)

    // undo：catalog/blob 移除；harness 焦点钉在被撤销 id 上，组件停留在缺失面板而非跳走。
    await act(async () => {
      expect(mounted.session.undo()).toBe(true)
    })
    expect(mounted.session.getState().assetCatalog.assets[id]).toBeUndefined()
    expect(mounted.session.getState().assetBlobs[record.path]).toBeUndefined()
    await expect(mounted.reader.readBytes(id, 'portrait')).rejects.toThrow('不在 catalog')
    const missing = host.querySelector('.image-missing-target')
    expect(missing, '缺失目标面板').not.toBeNull()
    expect(missing!.textContent).toContain(id)
    expect(missing!.textContent).toContain('不会跳到其他图片')

    // redo：record 精确还原，预览重新真实解码出原像素。
    await act(async () => {
      expect(mounted.session.redo()).toBe(true)
    })
    expect(mounted.session.getState().assetCatalog.assets[id]).toEqual(record)
    expect(await sha256Hex(mounted.session.getState().assetBlobs[record.path]!)).toBe(sha)
    await waitPreviewSize('6 × 4')
    expect(Array.from(previewCanvasPixels().rgba)).toEqual(Array.from(rgba))
    assertProjectSaveValid(mounted.session.getState())
  })

  test('同字节再导入派生 -2 后缀 id；真实资源间选择切换零提交且预览互换真实像素', async () => {
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
    // 同字节再导入：hash 相同 → base id 被占 → 派生 -2；label/origin 取自新文件名。
    await importPng('乙.png', pngA)
    const idB = `${idA}-2`
    const recordB = await waitCatalogAsset(mounted, idB)
    expect(recordB).toEqual({
      kind: 'portrait',
      path: `assets/authored/portrait/${shaA}.png`,
      mediaType: 'image/png',
      bytes: pngA.byteLength,
      sha256: shaA,
      label: '乙',
      origin: { kind: 'authored', ref: '乙.png' },
    } satisfies AssetRecordV1)
    await importPng('丙.png', pngC)
    await waitCatalogAsset(mounted, idC)
    const assets = mounted.session.getState().assetCatalog.assets
    expect(Object.keys(assets).filter((key) => key.startsWith('portrait.authored.'))).toHaveLength(
      3,
    )
    // 同字节两条 record 共享同一 blob 路径；丙独立路径。
    expect(
      Object.keys(mounted.session.getState().assetBlobs).filter((path) =>
        path.startsWith('assets/authored/portrait/'),
      ),
    ).toHaveLength(2)
    expect(mounted.focusLog).toEqual([idA, idB, idC])
    assertProjectSaveValid(mounted.session.getState())

    // 选择切换是纯浏览：预览按目标真实重载，历史版本不动。
    const historyAfterImports = mounted.session.getHistoryVersion()
    await clickImageRow(idA)
    await waitPreviewSize('6 × 4')
    expect(Array.from(previewCanvasPixels().rgba)).toEqual(Array.from(rgbaA))
    expect(heroTitle()).toBe('甲')
    await clickImageRow(idC)
    await waitPreviewSize('10 × 5')
    expect(Array.from(previewCanvasPixels().rgba)).toEqual(Array.from(rgbaC))
    expect(heroTitle()).toBe('丙')
    expect(imageRow(idC).getAttribute('aria-pressed')).toBe('true')
    await clickImageRow(idB)
    await waitPreviewSize('6 × 4')
    expect(heroTitle()).toBe('乙')
    expect(mounted.focusLog).toEqual([idA, idB, idC, idA, idC, idB])
    expect(mounted.session.getHistoryVersion()).toBe(historyAfterImports)
    expect(bitmaps().liveBitmaps()).toBe(0)
  })

  test('替换链：保留 label 真实换字节、撤销物化旧字节可解码、预览按新 sha 重载', async () => {
    const mounted = await mountTab()
    const rgbaA = patternedRgba(6, 4, atlasColors(2))
    const pngA = pngRgba(6, 4, rgbaA)
    const shaA = await sha256Hex(pngA)
    const id = `portrait.authored.${shaA.slice(0, 16)}`
    await importPng('旧立绘.png', pngA)
    const recordA = await waitCatalogAsset(mounted, id)
    await waitPreviewSize('6 × 4')
    const historyAfterImport = mounted.session.getHistoryVersion()

    const rgbaB = patternedRgba(10, 5, atlasColors(16).slice(4, 6))
    const pngB = pngRgba(10, 5, rgbaB)
    const shaB = await sha256Hex(pngB)
    await replacePng('新立绘.png', pngB)
    await waitForReact(() => {
      expect(mounted.session.getState().assetCatalog.assets[id]?.sha256).toBe(shaB)
    })
    // AssetId 与 label 不动；path/bytes/sha/origin.ref 按新内容落账。
    const recordB = mounted.session.getState().assetCatalog.assets[id]!
    expect(recordB).toEqual({
      kind: 'portrait',
      path: `assets/authored/portrait/${shaB}.png`,
      mediaType: 'image/png',
      bytes: pngB.byteLength,
      sha256: shaB,
      label: '旧立绘',
      origin: { kind: 'authored', ref: '新立绘.png' },
    } satisfies AssetRecordV1)
    expect(mounted.session.getState().assetBlobs[recordA.path]).toBeUndefined()
    const blobB = mounted.session.getState().assetBlobs[recordB.path]
    expect(blobB).toBeDefined()
    expect(new Uint8Array(blobB!)).toEqual(pngB)
    expect(mounted.session.getHistoryVersion()).toBeGreaterThan(historyAfterImport)
    assertProjectSaveValid(mounted.session.getState())
    // 预览按新 sha key 重载：新尺寸新像素；摘要同步更新；选择停留原 id。
    await waitPreviewSize('10 × 5')
    expect(Array.from(previewCanvasPixels().rgba)).toEqual(Array.from(rgbaB))
    expect(heroTitle()).toBe('旧立绘')
    expect(imageRow(id).getAttribute('aria-pressed')).toBe('true')
    expect(mounted.focusLog.at(-1)).toBe(id)
    const inspector = host.querySelector('.image-inspector')!
    expect(inspector.querySelector('[data-property-label="文件"] code')?.textContent).toBe(
      recordB.path,
    )
    expect(
      inspector.querySelector('[data-property-label="大小"] .ds-property-row__value')?.textContent,
    ).toBe(`${pngB.byteLength} B`)

    // undo：record 精确还原，previousBytes 物化旧 blob，旧字节可真实解码出旧像素。
    await act(async () => {
      expect(mounted.session.undo()).toBe(true)
    })
    expect(mounted.session.getState().assetCatalog.assets[id]).toEqual(recordA)
    expect(mounted.session.getState().assetBlobs[recordB.path]).toBeUndefined()
    const restored = mounted.session.getState().assetBlobs[recordA.path]
    expect(restored).toBeDefined()
    expect(await sha256Hex(restored!)).toBe(shaA)
    const decoded = await decodePngPixels(await mounted.reader.readBytes(id, 'portrait'))
    expect(decoded.width).toBe(6)
    expect(decoded.height).toBe(4)
    expect(Array.from(decoded.rgba)).toEqual(Array.from(rgbaA))
    await waitPreviewSize('6 × 4')
    expect(Array.from(previewCanvasPixels().rgba)).toEqual(Array.from(rgbaA))
    assertProjectSaveValid(mounted.session.getState())

    await act(async () => {
      expect(mounted.session.redo()).toBe(true)
    })
    expect(mounted.session.getState().assetCatalog.assets[id]?.sha256).toBe(shaB)
    await waitPreviewSize('10 × 5')
  })

  test('失败不污染：损坏 PNG 替换保留原 record、战场背景尺寸守卫零提交', async () => {
    const mounted = await mountTab()
    const rgbaA = patternedRgba(6, 4, atlasColors(2))
    const pngA = pngRgba(6, 4, rgbaA)
    const shaA = await sha256Hex(pngA)
    const id = `portrait.authored.${shaA.slice(0, 16)}`
    await importPng('甲.png', pngA)
    const recordA = await waitCatalogAsset(mounted, id)
    await waitPreviewSize('6 × 4')
    const historyAfterImport = mounted.session.getHistoryVersion()

    // 损坏 PNG（真实字节截断，签名头仍在 → 过签名门后在真实解码处失败）。
    await replacePng('broken.png', pngA.slice(0, 40))
    expect(await waitOutlinerError()).toContain('broken.png: PNG 解码失败')
    expect(mounted.session.getState().assetCatalog.assets[id]).toEqual(recordA)
    expect(mounted.session.getHistoryVersion()).toBe(historyAfterImport)
    expect(heroTitle()).toBe('甲')
    expect(imageRow(id).getAttribute('aria-pressed')).toBe('true')
    expect(host.querySelector('.image-preview-size')?.textContent).toBe('6 × 4')

    // 战场背景尺寸守卫：真实可解码但非 320×200 → 零提交、不进评审、选择不污染。
    await switchKindTab('战场背景')
    expect(host.textContent).toContain('此项目还没有战场背景。')
    await importPng('小菜场.png', pngRgba(100, 100, patternedRgba(100, 100, atlasColors(1))))
    expect(await waitOutlinerError()).toBe('小菜场.png: 战场背景必须是 320×200，实际 100×100')
    expect(
      Object.keys(mounted.session.getState().assetCatalog.assets).filter((key) =>
        key.startsWith('battle-background'),
      ),
    ).toHaveLength(0)
    expect(host.querySelector('.image-import-review')).toBeNull()
    expect(mounted.session.getHistoryVersion()).toBe(historyAfterImport)
    expect(host.textContent).toContain('导入或选择一张战场背景。')
  })

  test('先后完成的同内容图片导入各有独立 ID 与原文件标签', async () => {
    const { session } = await mountTab()
    const png = pngRgba(2, 2, patternedRgba(2, 2, atlasColors(2)))
    const digest = await sha256Hex(png)
    const original = pngFileOf('first.png', png)
    const bytes = await original.arrayBuffer()
    let finishRead!: (result: ArrayBuffer) => void
    const delayed = new Promise<ArrayBuffer>((resolve) => {
      finishRead = resolve
    })
    vi.spyOn(original, 'arrayBuffer').mockReturnValue(delayed)
    const input = host.querySelector<HTMLInputElement>('input[accept=".png,image/png"]')
    if (!input) throw new Error('image import field missing')
    try {
      await loadFilesIntoInput(input, [original])
      await loadFilesIntoInput(input, [pngFileOf('second.png', png)])
      await waitForReact(() => expect(session.getHistoryVersion()).toBe(1))
    } finally {
      await act(async () => finishRead(bytes))
    }
    await waitForReact(() => expect(session.getHistoryVersion()).toBe(2))
    const assets = session.getState().assetCatalog.assets
    const id = `portrait.authored.${digest.slice(0, 16)}`
    expect(assets[id]?.label).toBe('second')
    expect(assets[`${id}-2`]?.label).toBe('first')
  })
})
