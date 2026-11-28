// @vitest-environment jsdom

import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { atlasColors, pngRgba } from '../__tests__/png-fixtures.js'
import { waitForReact } from '../__tests__/react-io-wait.js'
import { sha256Hex } from '../core/binary-signature.js'
import { buttonByLabel, setInputValue } from './__tests__/dom-gestures.js'
import { installImageWorkbenchTestHost } from './__tests__/image-workbench-test-host.js'
import { patternedRgba, seedImage } from './__tests__/static-image-fixtures.js'

const {
  host,
  mountTab,
  importPng,
  imageRow,
  clickImageRow,
  previewStage,
  waitPreviewSize,
  previewCanvasPixels,
  zoomOutput,
  pressOnStage,
  wheelOnStage,
  pointerOnStage,
  flushAnimationFrame,
  heroTitle,
  waitCatalogAsset,
  bitmaps,
  dom,
} = installImageWorkbenchTestHost()

describe('ImageTab preview', () => {
  test('预览 viewer：fit 几何、键盘/滚轮/工具条缩放与拖拽平移真实合同', async () => {
    const mounted = await mountTab()
    const png = pngRgba(64, 32, patternedRgba(64, 32, atlasColors(2)))
    const sha = await sha256Hex(png)
    const id = `portrait.authored.${sha.slice(0, 16)}`
    await importPng('视图甲.png', png)
    await waitCatalogAsset(mounted, id)
    await waitPreviewSize('64 × 32')
    const historyAfterImport = mounted.session.getHistoryVersion()

    // fit 几何：视口 560×208（测试视口）对 64×32 → fitZoom=min(512/64,160/32)=5。
    expect(zoomOutput()).toBe('500%')
    expect(previewStage().classList.contains('fit')).toBe(true)
    expect(buttonByLabel(host, '适合').getAttribute('aria-pressed')).toBe('true')
    expect(
      host.querySelector<HTMLCanvasElement>('.image-preview-surface canvas')!.style.width,
    ).toBe('320px')
    // surface 的 max(100%, Npx) 声明超出 jsdom CSSOM 解析域（会被丢弃），不做样式断言；
    // 缩放合同由读数/类名/画布尺寸完整承载。
    // fit 态下拖拽不进入平移。
    await pointerOnStage('pointerdown', { button: 0, pointerId: 5, clientX: 100, clientY: 100 })
    expect(previewStage().classList.contains('panning')).toBe(false)
    expect(dom().pointerCaptures).toEqual([])
    await pointerOnStage('pointerup', { pointerId: 5 })
    expect(dom().pointerReleases).toEqual([])

    // 键盘缩放契约：+ 与 = 同义步进、- 回退、0 实际大小、F 适合，均 preventDefault；未知键不动。
    const plus = await pressOnStage('+')
    expect(plus.defaultPrevented).toBe(true)
    expect(zoomOutput()).toBe('625%')
    expect(previewStage().classList.contains('zoomed')).toBe(true)
    expect(buttonByLabel(host, '适合').getAttribute('aria-pressed')).toBe('false')
    await pressOnStage('=')
    expect(zoomOutput()).toBe('781%')
    await pressOnStage('0')
    expect(zoomOutput()).toBe('100%')
    expect(
      host.querySelector<HTMLCanvasElement>('.image-preview-surface canvas')!.style.width,
    ).toBe('64px')
    expect(buttonByLabel(host, '1:1').getAttribute('aria-pressed')).toBe('true')
    await pressOnStage('-')
    expect(zoomOutput()).toBe('80%')
    await pressOnStage('-')
    expect(zoomOutput()).toBe('64%')
    const unknown = await pressOnStage('x')
    expect(unknown.defaultPrevented).toBe(false)
    expect(zoomOutput()).toBe('64%')
    previewStage().scrollLeft = 33
    previewStage().scrollTop = 17
    await pressOnStage('f')
    expect(zoomOutput()).toBe('500%')
    expect(previewStage().classList.contains('fit')).toBe(true)
    await flushAnimationFrame()
    expect(dom().scrollTos).toBe(1)
    expect(previewStage().scrollLeft).toBe(0)
    expect(previewStage().scrollTop).toBe(0)

    // 工具条：range 直给、放大/缩小步进、1:1 与适合按钮。
    await setInputValue(
      host.querySelector<HTMLInputElement>('input[aria-label="图片预览缩放比例"]')!,
      '300',
    )
    expect(zoomOutput()).toBe('300%')
    await act(async () => buttonByLabel(host, '放大').click())
    expect(zoomOutput()).toBe('375%')
    await act(async () => buttonByLabel(host, '缩小').click())
    expect(zoomOutput()).toBe('300%')
    await act(async () => buttonByLabel(host, '1:1').click())
    expect(zoomOutput()).toBe('100%')
    await act(async () => buttonByLabel(host, '适合').click())
    expect(zoomOutput()).toBe('500%')
    await flushAnimationFrame()
    expect(dom().scrollTos).toBe(2)

    // 滚轮：以 fit 5 为基数按 exp 缩放；有限越界 delta 两端 clamp 到 [25%, 800%] 并禁用对应步进按钮。
    // （非有限值归一为 100% 的 clamp 合同已有 FrameAnimationEditor.test.ts 单元覆盖，不重复。）
    await wheelOnStage(-120)
    expect(zoomOutput()).toBe('599%')
    expect(previewStage().classList.contains('zoomed')).toBe(true)
    await wheelOnStage(-1200)
    expect(zoomOutput()).toBe('800%')
    expect(buttonByLabel(host, '放大').disabled).toBe(true)
    await wheelOnStage(-1200)
    expect(zoomOutput()).toBe('800%')
    await wheelOnStage(2400)
    expect(zoomOutput()).toBe('25%')
    expect(buttonByLabel(host, '缩小').disabled).toBe(true)

    // 拖拽平移：非 fit 态下主键抓取，scroll 按手势位移精确换算；异指/副键忽略；up/cancel 释放。
    await pressOnStage('0')
    expect(zoomOutput()).toBe('100%')
    await flushAnimationFrame()
    previewStage().scrollLeft = 120
    previewStage().scrollTop = 60
    await pointerOnStage('pointerdown', { button: 0, pointerId: 7, clientX: 200, clientY: 150 })
    expect(previewStage().classList.contains('panning')).toBe(true)
    expect(dom().pointerCaptures).toEqual([7])
    await pointerOnStage('pointermove', { pointerId: 9, clientX: 0, clientY: 0 })
    expect(previewStage().scrollLeft).toBe(120)
    expect(previewStage().scrollTop).toBe(60)
    await pointerOnStage('pointermove', { pointerId: 7, clientX: 170, clientY: 110 })
    expect(previewStage().scrollLeft).toBe(150)
    expect(previewStage().scrollTop).toBe(100)
    await pointerOnStage('pointermove', { pointerId: 7, clientX: 210, clientY: 190 })
    expect(previewStage().scrollLeft).toBe(110)
    expect(previewStage().scrollTop).toBe(20)
    await pointerOnStage('pointerup', { pointerId: 7 })
    expect(previewStage().classList.contains('panning')).toBe(false)
    expect(dom().pointerReleases).toEqual([7])
    await pointerOnStage('pointerdown', { button: 2, pointerId: 8, clientX: 200, clientY: 150 })
    expect(previewStage().classList.contains('panning')).toBe(false)
    expect(dom().pointerCaptures).toEqual([7])
    await pointerOnStage('pointerdown', { button: 0, pointerId: 9, clientX: 300, clientY: 300 })
    expect(previewStage().classList.contains('panning')).toBe(true)
    await pointerOnStage('pointercancel', { pointerId: 9 })
    expect(previewStage().classList.contains('panning')).toBe(false)
    expect(dom().pointerCaptures).toEqual([7, 9])
    expect(dom().pointerReleases).toEqual([7, 9])
    await pressOnStage('f')
    await flushAnimationFrame()
    expect(zoomOutput()).toBe('500%')
    expect(previewStage().scrollLeft).toBe(0)
    expect(previewStage().scrollTop).toBe(0)

    // 全部 viewer 交互纯浏览：零提交、无错误、bitmap 无泄漏。
    expect(mounted.session.getHistoryVersion()).toBe(historyAfterImport)
    expect(host.querySelector('.image-library-outliner .cf-err')).toBeNull()
    expect(bitmaps().liveBitmaps()).toBe(0)
  })

  test('预览画布初始化抛错仍关闭已解码位图，并且不写入工程', async () => {
    const mounted = await mountTab()
    const canvasFailure = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementationOnce(() => {
        throw new DOMException('预览画布不可用', 'InvalidStateError')
      })
    const png = pngRgba(2, 2, patternedRgba(2, 2, atlasColors(2)))
    await act(async () =>
      seedImage(mounted.session, {
        id: 'portrait.preview-error',
        kind: 'portrait',
        label: '预览图',
        png,
      }),
    )
    const version = mounted.session.getHistoryVersion()

    await waitForReact(() =>
      expect(host.querySelector('.image-preview-error')?.textContent).toContain('预览画布不可用'),
    )
    expect(canvasFailure.mock.instances[0]).toBe(
      host.querySelector('.image-preview-surface canvas'),
    )
    expect(bitmaps().liveBitmaps()).toBe(0)
    expect(mounted.session.getHistoryVersion()).toBe(version)
  })

  test('预览资源生命周期：切选后迟到解码不盖新选择、bitmap 关闭与 object URL 零泄漏', async () => {
    const mounted = await mountTab()
    const rgbaA = patternedRgba(64, 32, atlasColors(2))
    const pngA = pngRgba(64, 32, rgbaA)
    const rgbaB = patternedRgba(10, 5, atlasColors(16).slice(6, 8))
    const pngB = pngRgba(10, 5, rgbaB)
    // 解码闸门先于播种安装：alpha 自动选中后的预览解码停在在途（未开始/在途/完成三态可区分）。
    const hold = bitmaps().gate(pngA.byteLength)
    await act(async () =>
      seedImage(mounted.session, {
        id: 'portrait.preview-alpha',
        kind: 'portrait',
        label: '甲视图',
        png: pngA,
      }),
    )
    await act(async () =>
      seedImage(mounted.session, {
        id: 'portrait.preview-beta',
        kind: 'portrait',
        label: '乙视图',
        png: pngB,
      }),
    )
    const historyAfterSeeds = mounted.session.getHistoryVersion()
    try {
      await waitForReact(() => {
        expect(bitmaps().entries).toEqual([pngA.byteLength])
      })
      expect(bitmaps().completions).toEqual([])
      expect(host.querySelector('.image-preview-size')?.textContent).toBe('读取图片…')

      // 切到 beta：alpha 预览卸载（alive=false），beta 真实解码先行完成。
      await clickImageRow('portrait.preview-beta')
      await waitPreviewSize('10 × 5')
      expect(bitmaps().entries).toEqual([pngA.byteLength, pngB.byteLength])
      expect(bitmaps().completions).toEqual([pngB.byteLength])
      expect(Array.from(previewCanvasPixels().rgba)).toEqual(Array.from(rgbaB))
    } finally {
      hold.resolve()
    }
    // 迟到完成：alpha 位图按归属协议关闭且不落地，beta 画面/选择/错误面全部不动。
    await waitForReact(() => {
      expect(bitmaps().completions).toEqual([pngB.byteLength, pngA.byteLength])
    })
    expect(host.querySelector('.image-preview-size')?.textContent).toBe('10 × 5')
    expect(Array.from(previewCanvasPixels().rgba)).toEqual(Array.from(rgbaB))
    expect(heroTitle()).toBe('乙视图')
    expect(imageRow('portrait.preview-beta').getAttribute('aria-pressed')).toBe('true')
    expect(host.querySelector('.image-preview-error')).toBeNull()
    expect(mounted.focusLog.at(-1)).toBe('portrait.preview-beta')
    expect(mounted.session.getHistoryVersion()).toBe(historyAfterSeeds)
    expect(bitmaps().closes).toBe(2)
    expect(bitmaps().liveBitmaps()).toBe(0)
    // 两行目录缩略图各持有一个 object URL，切选不新增不泄漏。
    expect(dom().liveObjectUrls()).toBe(2)
  })
})
