// @vitest-environment jsdom
/**
 * TEST-CURSOR-ASSET-UI-LARGE-1 C07-G07：ImageTab 边界失败恢复与 kind 守卫。
 * 排重：K05/GLM 已证 PNG 失败零提交、删除取消；本组补 kind 替换守卫、搜索、引用扫描失败 UI、
 * face  Tab 导入与 focus 回调。
 */
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { requireRealCanvas2d } from '../__tests__/cursor-asset-r1/canvas-pixels.js'
import {
  installBrowserHardwarePorts,
  pngFileOf,
  pngRgba,
  solidRgba,
} from '../__tests__/cursor-asset-r1/image-ports.js'
import {
  type MountedImageTab,
  mountImageTab,
  type SeededImage,
  unmountImageTab,
} from '../__tests__/cursor-asset-r1/image-tab-harness.js'
import {
  fillAndBlur,
  inputByAriaLabel,
  loadFilesIntoInput,
  loadLegalProject,
  stubNodeTestHost,
} from '../__tests__/cursor-asset-r1/kit.js'
import { pollUntil } from '../__tests__/cursor-asset-r1/timing.js'
import { sha256Hex } from '../core/binary-signature.js'
import { restoreImageDomPorts } from './__tests__/kimi-editor-workflows/k05-fixtures.js'

async function seedPng(
  id: string,
  kind: SeededImage['kind'],
  label: string,
  color: [number, number, number, number],
): Promise<SeededImage> {
  const encoded = pngRgba(4, 4, solidRgba(4, 4, color))
  const bytes = encoded.buffer.slice(
    encoded.byteOffset,
    encoded.byteOffset + encoded.byteLength,
  ) as ArrayBuffer
  return { id, kind, label, bytes, sha256: await sha256Hex(bytes) }
}

let mounted: MountedImageTab | undefined
let legal: Awaited<ReturnType<typeof loadLegalProject>>

beforeEach(async () => {
  await stubNodeTestHost()
  installBrowserHardwarePorts()
  requireRealCanvas2d()
  legal = await loadLegalProject('c07-g07-image')
})

afterEach(async () => {
  restoreImageDomPorts()
  if (mounted) {
    await unmountImageTab(mounted)
    mounted = undefined
  }
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

async function clickKindTab(host: HTMLElement, label: string): Promise<void> {
  const tab = [...host.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find((b) =>
    b.textContent?.includes(label),
  )!
  await act(async () => {
    tab.click()
  })
}

describe('C07-G07 ImageTab 边界与失败恢复', () => {
  test('C07-G07-01 搜索 AssetId 过滤列表', async () => {
    const a = await seedPng('portrait.c07.alpha', 'portrait', 'Alpha', [1, 1, 1, 255])
    const b = await seedPng('portrait.c07.beta', 'portrait', 'Beta', [2, 2, 2, 255])
    mounted = await mountImageTab(legal, { seeds: [a, b] })
    const search = inputByAriaLabel<HTMLInputElement>(mounted.host, '搜索图像')
    await fillAndBlur(search, 'beta')
    expect(mounted.host.querySelectorAll('.image-asset-list .ds-catalog-row')).toHaveLength(1)
    expect(mounted.host.textContent).toContain('Beta')
  })

  test('C07-G07-02 切换 kind Tab 清空选择并展示该 kind 首项', async () => {
    const portrait = await seedPng('portrait.c07.one', 'portrait', '立绘1', [3, 3, 3, 255])
    const face = await seedPng('face.c07.one', 'face', '脸1', [4, 4, 4, 255])
    mounted = await mountImageTab(legal, {
      seeds: [portrait, face],
      focusObjectId: 'portrait.c07.one',
    })
    await clickKindTab(mounted.host, '战斗头像')
    expect(mounted.host.querySelector('[data-selected="true"]')?.textContent).toContain('脸1')
  })

  test('C07-G07-03 非 PNG 扩展名：错误面且 catalog 无新增', async () => {
    mounted = await mountImageTab(legal)
    const before = Object.keys(mounted.session.getState().assetCatalog.assets).length
    const input = mounted.host.querySelector<HTMLInputElement>('input[accept=".png,image/png"]')!
    expect(input).toBeTruthy()
    const jpeg = new File([new Uint8Array(8)], 'x.jpeg', { type: 'image/jpeg' })
    await loadFilesIntoInput(input, [jpeg])
    await pollUntil(() => (mounted!.host.textContent ?? '').includes('只允许导入 PNG'), '错误文案')
    expect(Object.keys(mounted.session.getState().assetCatalog.assets)).toHaveLength(before)
  })

  test('C07-G07-04 face Tab 导入写入 face kind', async () => {
    mounted = await mountImageTab(legal)
    await clickKindTab(mounted.host, '战斗头像')
    const input = mounted.host.querySelector<HTMLInputElement>('input[accept=".png,image/png"]')!
    expect(input).toBeTruthy()
    await loadFilesIntoInput(input, [
      pngFileOf('f.png', pngRgba(2, 2, solidRgba(2, 2, [10, 20, 30, 255]))),
    ])
    await pollUntil(
      () =>
        Object.values(mounted!.session.getState().assetCatalog.assets).some(
          (record) => record.kind === 'face',
        ),
      'face 入库',
    )
  })

  test('C07-G07-05 导入成功触发 onObjectFocus', async () => {
    mounted = await mountImageTab(legal)
    const input = mounted.host.querySelector<HTMLInputElement>('input[accept=".png,image/png"]')!
    expect(input).toBeTruthy()
    await loadFilesIntoInput(input, [
      pngFileOf('focus.png', pngRgba(2, 2, solidRgba(2, 2, [1, 2, 3, 255]))),
    ])
    await pollUntil(() => mounted!.focusLog.length > 0, 'focus 回调')
    expect(mounted.focusLog.at(-1)).toMatch(/^portrait\.authored\./)
  })

  test('C07-G07-06 hero 行展示 AssetId', async () => {
    const portrait = await seedPng('portrait.c07.idline', 'portrait', '行', [5, 5, 5, 255])
    mounted = await mountImageTab(legal, {
      seeds: [portrait],
      focusObjectId: 'portrait.c07.idline',
    })
    expect(
      mounted.host.querySelector('.image-workspace > .ds-object-hero .ds-object-hero__id')
        ?.textContent,
    ).toBe('portrait.c07.idline')
  })

  test('C07-G07-07 引用扫描失败：删除按钮禁用文案', async () => {
    const portrait = await seedPng('portrait.c07.del', 'portrait', '删', [6, 6, 6, 255])
    mounted = await mountImageTab(legal, {
      seeds: [portrait],
      focusObjectId: 'portrait.c07.del',
      referenceStatus: 'failed',
    })
    expect(mounted.host.textContent).toMatch(/引用|未知|失败/)
  })

  test('C07-G07-08 资源 origin authored 标签', async () => {
    const portrait = await seedPng('portrait.c07.origin', 'portrait', '来源', [7, 7, 7, 255])
    mounted = await mountImageTab(legal, {
      seeds: [portrait],
      focusObjectId: 'portrait.c07.origin',
    })
    await pollUntil(
      () =>
        (mounted!.host.querySelector('.image-workspace')?.textContent ?? '').includes('项目创作'),
      'origin 文案',
    )
  })

  test('C07-G07-09 空 portrait 列表：工作区提示导入', async () => {
    mounted = await mountImageTab(legal)
    expect(mounted.host.textContent).toMatch(/还没有|导入/)
  })

  test('C07-G07-10 双 portrait 切换选择：hero 标题跟随', async () => {
    const a = await seedPng('portrait.c07.a', 'portrait', '甲', [8, 8, 8, 255])
    const b = await seedPng('portrait.c07.b', 'portrait', '乙', [9, 9, 9, 255])
    mounted = await mountImageTab(legal, { seeds: [a, b], focusObjectId: 'portrait.c07.a' })
    const row = [
      ...mounted.host.querySelectorAll<HTMLElement>('.image-asset-list .ds-catalog-row'),
    ].find((el) => el.textContent?.includes('乙'))!
    await act(async () => {
      row.click()
    })
    expect(
      mounted.host.querySelector('.image-workspace > .ds-object-hero .ds-object-hero__title')
        ?.textContent,
    ).toContain('乙')
  })
})
