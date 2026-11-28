// @vitest-environment jsdom

import type { AssetRecordV1 } from '@type-pal/content'
import { loadStandardPalette } from '@type-pal/reforge'
import { act } from 'react'
import { describe, expect, test } from 'vitest'
import { atlasColors, pngRgba } from '../__tests__/png-fixtures.js'
import { waitForReact } from '../__tests__/react-io-wait.js'
import { sha256Hex } from '../core/binary-signature.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'
import { clickButton } from './__tests__/dom-gestures.js'
import { installImageWorkbenchTestHost } from './__tests__/image-workbench-test-host.js'
import { decodePngPixels, patternedRgba, seedImage } from './__tests__/static-image-fixtures.js'

const {
  host,
  mountTab,
  importPng,
  switchKindTab,
  imageRow,
  waitPreviewSize,
  previewCanvasPixels,
  heroTitle,
  bitmaps,
  dom,
} = installImageWorkbenchTestHost()

describe('ImageTab battle-background', () => {
  test('预览守卫：尺寸不符的战场背景资源显示错误面与缩略图徽标（守卫输入只证守卫）', async () => {
    const mounted = await mountTab()
    await switchKindTab('战场背景')
    // 真实命令播种尺寸不符但 catalog 自洽（bytes/sha 与真实字节一致）的资源；
    // 该输入唯一用途是触发预览/缩略图的防御守卫，不声称它是合法导入产物。
    const wrongDimsPng = pngRgba(100, 50, patternedRgba(100, 50, atlasColors(1)))
    await act(async () =>
      seedImage(mounted.session, {
        id: 'battle-background.invalid-size',
        kind: 'battle-background',
        label: '坏尺寸',
        png: wrongDimsPng,
      }),
    )
    await waitForReact(() => {
      expect(host.querySelector('.image-preview-error')).not.toBeNull()
    })
    expect(host.querySelector('.image-preview-error')?.textContent).toBe(
      '战场背景必须是 320×200，实际 100×50',
    )
    expect(host.querySelector('.image-preview-size')?.textContent).toBe('读取图片…')
    expect(host.querySelector('.image-preview-surface canvas.hidden')).not.toBeNull()
    // 缩略图同一守卫：有界错误徽标而非崩溃。
    await waitForReact(() => {
      expect(host.querySelector('.image-asset-thumb.error')).not.toBeNull()
    })
    expect(host.querySelector('.image-asset-thumb.error')?.getAttribute('title')).toBe(
      '战场背景必须是 320×200，实际 100×50',
    )
    expect(bitmaps().liveBitmaps()).toBe(0)
  })

  test('战场背景评审链：取消零提交选择不动；确认入库索引图合同、色盘重映射与 undo/redo', async () => {
    const mounted = await mountTab()
    await switchKindTab('战场背景')
    const historyAtTab = mounted.session.getHistoryVersion()
    const palette = await loadStandardPalette(mounted.assetBase)
    const bandIndexOf = (x: number): number => (x < 107 ? 1 : x < 214 ? 7 : 10)
    const bandRgba = new Uint8Array(320 * 200 * 4)
    for (let y = 0; y < 200; y += 1)
      for (let x = 0; x < 320; x += 1) {
        const color = palette.colors[bandIndexOf(x)]!
        bandRgba.set([color[0], color[1], color[2], 255], (y * 320 + x) * 4)
      }
    const bandPng = pngRgba(320, 200, bandRgba)

    const openReview = async (): Promise<HTMLElement> => {
      await waitForReact(
        () => {
          const review = host.querySelector<HTMLElement>('section.image-import-review')
          expect(review, '评审面板').not.toBeNull()
          expect(
            review!.querySelector<HTMLImageElement>('img[alt="上传原图"]')?.getAttribute('src'),
          ).toMatch(/^blob:/)
          expect(
            review!.querySelector<HTMLImageElement>('img[alt="项目内效果"]')?.getAttribute('src'),
          ).toMatch(/^blob:/)
        },
        { timeout: 5000 },
      )
      return host.querySelector<HTMLElement>('section.image-import-review')!
    }

    // 取消侧：零提交、评审关闭、选择停留（空 kind 上仍是空态）、object URL 全部回收。
    await importPng('原野战场.png', bandPng)
    const review = await openReview()
    expect(review.textContent).toContain('保存的是右侧效果；运行时仍保留召唤换色能力。')
    const sourceUrl = review
      .querySelector<HTMLImageElement>('img[alt="上传原图"]')!
      .getAttribute('src')!
    const effectUrl = review
      .querySelector<HTMLImageElement>('img[alt="项目内效果"]')!
      .getAttribute('src')!
    // 评审双图真实内容：原图字节逐字节等于上传文件；效果图为色盘着色后的真实像素。
    const sourceBlob = dom().objectUrlBlob(sourceUrl)
    expect(sourceBlob, '原图 object URL 持有 Blob').toBeDefined()
    expect(new Uint8Array(await sourceBlob!.arrayBuffer())).toEqual(bandPng)
    const effectBlob = dom().objectUrlBlob(effectUrl)
    expect(effectBlob, '效果图 object URL 持有 Blob').toBeDefined()
    const effect = await decodePngPixels(await effectBlob!.arrayBuffer())
    expect(effect.width).toBe(320)
    expect(effect.height).toBe(200)
    expect(Array.from(effect.rgba.slice((100 * 320 + 50) * 4, (100 * 320 + 50) * 4 + 4))).toEqual([
      ...palette.colors[1]!,
      255,
    ])
    expect(Array.from(effect.rgba.slice((100 * 320 + 150) * 4, (100 * 320 + 150) * 4 + 4))).toEqual(
      [...palette.colors[7]!, 255],
    )
    expect(Array.from(effect.rgba.slice((100 * 320 + 300) * 4, (100 * 320 + 300) * 4 + 4))).toEqual(
      [...palette.colors[10]!, 255],
    )
    expect(dom().liveObjectUrls()).toBe(2)
    expect(mounted.session.getHistoryVersion()).toBe(historyAtTab)

    await clickButton(review, '取消')
    await waitForReact(() => {
      expect(host.querySelector('.image-import-review')).toBeNull()
    })
    expect(mounted.session.getHistoryVersion()).toBe(historyAtTab)
    expect(
      Object.keys(mounted.session.getState().assetCatalog.assets).filter((key) =>
        key.startsWith('battle-background'),
      ),
    ).toHaveLength(0)
    expect(dom().liveObjectUrls()).toBe(0)
    expect(host.textContent).toContain('导入或选择一张战场背景。')
    expect(host.querySelector('.image-library-outliner .cf-err')).toBeNull()

    // 确认侧：真实量化入库，record 与实际字节自洽，id 由实际 sha 派生。
    await importPng('原野战场.png', bandPng)
    const review2 = await openReview()
    await clickButton(review2, '使用适配结果')
    await waitForReact(() => {
      expect(
        Object.keys(mounted.session.getState().assetCatalog.assets).filter((key) =>
          key.startsWith('battle-background.authored.'),
        ),
      ).toHaveLength(1)
    })
    const id = Object.keys(mounted.session.getState().assetCatalog.assets).find((key) =>
      key.startsWith('battle-background.authored.'),
    )!
    const record = mounted.session.getState().assetCatalog.assets[id]!
    const blob = mounted.session.getState().assetBlobs[record.path]
    expect(blob).toBeDefined()
    const sha = await sha256Hex(blob!)
    expect(record).toEqual({
      kind: 'battle-background',
      path: `assets/authored/battle-background/${sha}.png`,
      mediaType: 'image/png',
      bytes: blob!.byteLength,
      sha256: sha,
      label: '原野战场',
      origin: { kind: 'authored', ref: '原野战场.png' },
    } satisfies AssetRecordV1)
    expect(id).toBe(`battle-background.authored.${sha.slice(0, 16)}`)
    expect(mounted.session.getHistoryVersion()).toBeGreaterThan(historyAtTab)
    assertProjectSaveValid(mounted.session.getState())
    expect(heroTitle()).toBe('原野战场')
    expect(imageRow(id).getAttribute('aria-pressed')).toBe('true')
    expect(mounted.focusLog.at(-1)).toBe(id)

    // 存储字节真实解码：逐像素满足索引灰度合同（R=G=B=色带索引，A=255）。
    const stored = await decodePngPixels(blob!)
    expect(stored.width).toBe(320)
    expect(stored.height).toBe(200)
    let badPixel = -1
    for (let y = 0; y < 200 && badPixel < 0; y += 1)
      for (let x = 0; x < 320; x += 1) {
        const at = (y * 320 + x) * 4
        const index = bandIndexOf(x)
        if (
          stored.rgba[at] !== index ||
          stored.rgba[at + 1] !== index ||
          stored.rgba[at + 2] !== index ||
          stored.rgba[at + 3] !== 255
        ) {
          badPixel = y * 320 + x
          break
        }
      }
    expect(badPixel, '存储图必须逐像素满足索引灰度合同').toBe(-1)

    // 预览按项目标准色彩重映射：画布像素是色盘颜色而非灰度索引。
    await waitPreviewSize('320 × 200')
    const canvas = previewCanvasPixels()
    const canvasPixel = (x: number, y: number): number[] =>
      Array.from(canvas.rgba.slice((y * 320 + x) * 4, (y * 320 + x) * 4 + 4))
    expect(canvasPixel(50, 100)).toEqual([...palette.colors[1]!, 255])
    expect(canvasPixel(150, 100)).toEqual([...palette.colors[7]!, 255])
    expect(canvasPixel(300, 100)).toEqual([...palette.colors[10]!, 255])
    expect(canvasPixel(50, 100)[0]).not.toBe(canvasPixel(50, 100)[1])
    // 战场背景缩略图经同一色盘链路上图（真实解码 + 重编码 + object URL）。
    await waitForReact(() => {
      expect(host.querySelector('.image-asset-thumb img')).not.toBeNull()
    })
    expect(dom().liveObjectUrls()).toBe(1)
    expect(bitmaps().liveBitmaps()).toBe(0)

    await act(async () => {
      expect(mounted.session.undo()).toBe(true)
    })
    expect(mounted.session.getState().assetCatalog.assets[id]).toBeUndefined()
    expect(mounted.session.getState().assetBlobs[record.path]).toBeUndefined()
    await waitForReact(() => {
      expect(dom().liveObjectUrls()).toBe(0)
    })
    await act(async () => {
      expect(mounted.session.redo()).toBe(true)
    })
    expect(mounted.session.getState().assetCatalog.assets[id]).toEqual(record)
    expect(await sha256Hex(mounted.session.getState().assetBlobs[record.path]!)).toBe(sha)
    assertProjectSaveValid(mounted.session.getState())
  })
})
