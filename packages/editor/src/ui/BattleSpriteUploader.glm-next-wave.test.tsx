// @vitest-environment jsdom
/**
 * TEST-GLM-NEW-F-1 F04a：BattleSpriteUploader 自身 UI 合同。
 * 去重：BattleSpriteLibrary.test/glm-ui-wave 均以 vi.mock 替身本组件只断言挂载点，
 * kimi-workflows 走 Library 内复合链路；uploader 自身的文件解码回显、缺省帧宽高猜测、
 * 切不开失败文案与取消零提交此前没有直接合同。本文件只补这些：
 * 合法小图集 → 真实解码/量化/预览与缺省猜测、应用产出 gzip 帧带；
 * 整除破坏 → 精确失败文案 + 应用禁用；取消零提交（onApply 零调用）。
 * 唯一替身：kit 浏览器硬件端口（Node Blob/crypto + createImageBitmap 真实 PNG 解码）。
 */
import type { AssetBase } from '@type-pal/reforge'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  inputByAccept,
  loadFilesIntoInput,
  loadLegalUiProject,
  useActEnvironment,
} from './__tests__/glm-ui-wave-kit.js'
import {
  atlasColors,
  installBrowserHardwarePorts,
  pngFileOf,
  solidAtlasPng,
} from './__tests__/kimi-editor-workflows/kit.js'
import { BattleSpriteUploader } from './BattleSpriteUploader.js'

let assetBase: AssetBase

beforeAll(async () => {
  installBrowserHardwarePorts()
  const legal = await loadLegalUiProject('glm-next-wave-uploader')
  assetBase = legal.assetBase
})

let host: HTMLDivElement
let root: Root
let onApply: ReturnType<typeof vi.fn<(blob: ArrayBuffer, frameCount: number) => Promise<void>>>
let onCancel: ReturnType<typeof vi.fn<() => void>>

beforeEach(() => {
  installBrowserHardwarePorts()
  useActEnvironment()
  onApply = vi.fn(async () => undefined)
  onCancel = vi.fn()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

async function mountUploader(): Promise<void> {
  await act(async () => {
    root.render(
      <BattleSpriteUploader assetBase={assetBase} onApply={onApply} onCancel={onCancel} />,
    )
  })
}

function summaryText(): string {
  const hit = host.querySelector('.bsu-frame-summary')
  expect(hit, 'frame summary').not.toBeNull()
  return hit!.textContent ?? ''
}

function applyButton(): HTMLButtonElement {
  const hit = [...host.querySelectorAll<HTMLButtonElement>('button')].find(
    (candidate) => candidate.textContent?.trim() === '应用外观',
  )
  expect(hit, '应用外观 button').not.toBeNull()
  return hit!
}

describe('F04 BattleSpriteUploader 预览与取消零提交', () => {
  test('合法小图集真实解码：缺省帧宽高猜测、逐帧预览、应用产出帧带', async () => {
    await mountUploader()
    const atlas = solidAtlasPng(16, 16, atlasColors(3))
    await loadFilesIntoInput(inputByAccept(host, 'image/png,image/webp,image/gif'), [
      pngFileOf('atlas.png', atlas.bytes),
    ])
    // 缺省猜测：单行图 → 帧高=图高 16，宽被整除 → 帧宽=16，共 3 帧。
    await vi.waitFor(() => expect(summaryText()).toBe('共 3 帧（横排逐行切）'))
    expect(host.querySelector<HTMLInputElement>('[aria-label="战斗精灵帧宽"]')?.value).toBe('16')
    expect(host.querySelector<HTMLInputElement>('[aria-label="战斗精灵帧高"]')?.value).toBe('16')
    const thumbs = [...host.querySelectorAll('.bsu-frame-grid canvas')]
    expect(thumbs).toHaveLength(3)
    expect(thumbs.map((thumb) => thumb.getAttribute('title'))).toEqual([
      '#0 16×16',
      '#1 16×16',
      '#2 16×16',
    ])
    expect(applyButton().disabled).toBe(false)
    await act(async () => applyButton().click())
    await vi.waitFor(() => expect(onApply).toHaveBeenCalledTimes(1))
    const blob = onApply.mock.calls[0]![0] as ArrayBuffer
    expect(onApply.mock.calls[0]![1]).toBe(3)
    expect(blob.byteLength).toBeGreaterThan(0)
    // 取消未被波及；应用后提交门复位。
    expect(onCancel).not.toHaveBeenCalled()
  })

  test('帧宽破坏整除 → 精确失败文案与应用禁用；取消零提交', async () => {
    await mountUploader()
    const atlas = solidAtlasPng(16, 16, atlasColors(3))
    await loadFilesIntoInput(inputByAccept(host, 'image/png,image/webp,image/gif'), [
      pngFileOf('atlas.png', atlas.bytes),
    ])
    await vi.waitFor(() => expect(summaryText()).toBe('共 3 帧（横排逐行切）'))
    const width = host.querySelector<HTMLInputElement>('[aria-label="战斗精灵帧宽"]')!
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    await act(async () => {
      width.focus()
      setter.call(width, '10')
      width.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(summaryText()).toBe('图 48×16 切不开（宽高须整除）')
    expect(applyButton().disabled).toBe(true)
    expect(host.querySelector('.bsu-frame-grid')).toBeNull()
    await act(async () =>
      [...host.querySelectorAll<HTMLButtonElement>('button')]
        .find((candidate) => candidate.textContent?.trim() === '取消')!
        .click(),
    )
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onApply).not.toHaveBeenCalled()
  })
})
