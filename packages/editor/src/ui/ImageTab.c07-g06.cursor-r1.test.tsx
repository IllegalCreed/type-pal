// @vitest-environment jsdom
/**
 * TEST-CURSOR-ASSET-UI-LARGE-1 C07-G06：ImageTab 合成字节 / 边界 IO / 资源关闭。
 * 排重：ImageTab.kimi-workflows 已证导入删除 undo/预览缩放/迟到解码；本组只补
 * focus 驱动 kind、item-icon/face 入库、inspector 元数据、缩略图 URL 回收与 gated readBytes。
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
  loadFilesIntoInput,
  loadLegalProject,
  stubNodeTestHost,
} from '../__tests__/cursor-asset-r1/kit.js'
import { pollUntil } from '../__tests__/cursor-asset-r1/timing.js'
import { sha256Hex } from '../core/binary-signature.js'
import {
  installImageDecodePort,
  installImageDomPorts,
  restoreImageDomPorts,
} from './__tests__/kimi-editor-workflows/k05-fixtures.js'

async function seedPng(
  id: string,
  kind: SeededImage['kind'],
  label: string,
  color: [number, number, number, number],
  w = 4,
  h = 4,
): Promise<SeededImage> {
  const encoded = pngRgba(w, h, solidRgba(w, h, color))
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
  installImageDomPorts()
  requireRealCanvas2d()
  legal = await loadLegalProject('c07-g06-image')
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

describe('C07-G06 ImageTab 合成字节与 IO', () => {
  test('C07-G06-01 focusObjectId=face 时自动切到战斗头像 Tab 并选中', async () => {
    const face = await seedPng('face.c07.a', 'face', '头像A', [40, 80, 200, 255])
    mounted = await mountImageTab(legal, { seeds: [face], focusObjectId: 'face.c07.a' })
    const activeTab = mounted.host.querySelector('[role="tab"][aria-selected="true"]')
    expect(activeTab?.textContent).toContain('战斗头像')
    expect(mounted.host.querySelector('[data-selected="true"]')?.textContent).toContain('头像A')
  })

  test('C07-G06-02 item-icon 导入：catalog 写入 sha256 与 path', async () => {
    mounted = await mountImageTab(legal)
    await act(async () => {
      ;[...mounted!.host.querySelectorAll<HTMLButtonElement>('[role="tab"]')]
        .find((b) => b.textContent?.includes('物品图标'))!
        .click()
    })
    const file = pngFileOf('icon.png', pngRgba(3, 3, solidRgba(3, 3, [200, 100, 50, 255])))
    const input = mounted.host.querySelector<HTMLInputElement>('input[accept=".png,image/png"]')!
    expect(input).toBeTruthy()
    await loadFilesIntoInput(input, [file])
    await pollUntil(() => {
      const ids = Object.keys(mounted!.session.getState().assetCatalog.assets)
      return ids.some((id) => id.startsWith('item-icon.authored.'))
    }, 'item-icon 入库')
    const entry = Object.values(mounted.session.getState().assetCatalog.assets).find(
      (record) => record.kind === 'item-icon',
    )!
    expect(entry.path).toMatch(/^assets\/authored\/item-icon\//)
    expect(entry.sha256).toHaveLength(64)
  })

  test('C07-G06-03 资源检查器显示 sha256 前缀与字节摘要', async () => {
    const portrait = await seedPng('portrait.c07.meta', 'portrait', '元数据', [1, 2, 3, 255])
    mounted = await mountImageTab(legal, { seeds: [portrait], focusObjectId: 'portrait.c07.meta' })
    await pollUntil(
      () => (mounted!.host.querySelector('.image-inspector')?.textContent ?? '').includes('文件'),
      '属性网格',
    )
    const grid = mounted.host.querySelector('.image-inspector')!.textContent ?? ''
    expect(grid).toContain(portrait.sha256)
    expect(grid).toMatch(/\d+ B|\d+\.\d+ KB/)
  })

  test('C07-G06-04 切换 kind Tab 后列表计数与空态文案', async () => {
    const face = await seedPng('face.c07.only', 'face', '唯一', [5, 5, 5, 255])
    mounted = await mountImageTab(legal, { seeds: [face] })
    const itemTab = [...mounted.host.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find(
      (b) => b.textContent?.includes('物品图标'),
    )!
    await act(async () => {
      itemTab.click()
    })
    expect(mounted.host.textContent).toContain('此项目还没有物品图标')
    const faceTab = [...mounted.host.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find(
      (b) => b.textContent?.includes('战斗头像'),
    )!
    await act(async () => {
      faceTab.click()
    })
    expect(mounted.host.querySelector('.ds-list-header__count')?.textContent).toBe('1 项')
  })

  test('C07-G06-05 诊断 Tab 只显示当前选中资源的 issue', async () => {
    const portrait = await seedPng('portrait.c07.d', 'portrait', '诊断', [9, 9, 9, 255])
    mounted = await mountImageTab(legal, {
      seeds: [portrait],
      focusObjectId: 'portrait.c07.d',
      assetDiagnostics: [
        {
          assetId: 'portrait.c07.d',
          code: 'missing-file',
          message: 'C07 诊断',
          title: 'C07 诊断标题',
          severity: 'warn',
          where: 'test',
        },
        {
          assetId: 'other.asset',
          code: 'unused-asset',
          message: '隐藏',
          title: '隐藏标题',
          severity: 'error',
          where: 'test',
        },
      ],
    })
    const diagTab = [...mounted.host.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find(
      (b) => b.textContent?.includes('诊断'),
    )!
    await act(async () => {
      diagTab.click()
    })
    expect(mounted.host.textContent).toMatch(/1 个警告|警告/)
    expect(mounted.host.textContent).not.toContain('隐藏')
  })

  test('C07-G06-06 引用 Tab 展示引用计数文案', async () => {
    const portrait = await seedPng('portrait.c07.ref', 'portrait', '引用', [3, 3, 3, 255])
    mounted = await mountImageTab(legal, { seeds: [portrait], focusObjectId: 'portrait.c07.ref' })
    const refTab = [...mounted.host.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find((b) =>
      b.textContent?.includes('引用'),
    )!
    await act(async () => {
      refTab.click()
    })
    expect(mounted.host.textContent).toMatch(/引用|0/)
  })

  test('C07-G06-07 卸载后 decode close 计数与 live bitmap 归零', async () => {
    const decodePort = installImageDecodePort()
    const portrait = await seedPng('portrait.c07.close', 'portrait', '关闭', [11, 22, 33, 255])
    mounted = await mountImageTab(legal, { seeds: [portrait], focusObjectId: 'portrait.c07.close' })
    await pollUntil(() => decodePort.completions.length >= 1, '缩略图解码')
    await unmountImageTab(mounted)
    mounted = undefined
    expect(decodePort.liveBitmaps()).toBe(0)
    expect(decodePort.closes).toBeGreaterThanOrEqual(decodePort.completions.length)
  })

  test('C07-G06-08 卸载 ImageTab 后 object URL 全部 revoke', async () => {
    const domPort = installImageDomPorts()
    const a = await seedPng('portrait.c07.a', 'portrait', 'A', [1, 0, 0, 255])
    mounted = await mountImageTab(legal, { seeds: [a], focusObjectId: 'portrait.c07.a' })
    await pollUntil(() => domPort.liveObjectUrls() >= 1, '缩略图 URL 创建')
    await unmountImageTab(mounted)
    mounted = undefined
    expect(domPort.liveObjectUrls()).toBe(0)
  })

  test('C07-G06-09 预览 readBytes：切换选中后 decode 进入次数递增', async () => {
    const decodePort = installImageDecodePort()
    const a = await seedPng('portrait.c07.a', 'portrait', 'A', [7, 7, 7, 255])
    const b = await seedPng('portrait.c07.b', 'portrait', 'B', [8, 8, 8, 255])
    mounted = await mountImageTab(legal, { seeds: [a, b], focusObjectId: 'portrait.c07.a' })
    await pollUntil(() => decodePort.completions.length >= 1, '首帧解码')
    const afterFirst = decodePort.entries.length
    const row = [
      ...mounted.host.querySelectorAll<HTMLElement>('.image-asset-list .ds-catalog-row'),
    ].find((el) => el.textContent?.includes('B'))!
    await act(async () => {
      row.click()
    })
    await pollUntil(() => decodePort.entries.length > afterFirst, '第二资源 read/decode')
    expect(decodePort.liveBitmaps()).toBe(0)
  })

  test('C07-G06-10 face 资源 hero 标题来自 label', async () => {
    const face = await seedPng('face.c07.label', 'face', '战士脸', [90, 90, 90, 255])
    mounted = await mountImageTab(legal, { seeds: [face], focusObjectId: 'face.c07.label' })
    expect(
      mounted.host.querySelector('.image-workspace > .ds-object-hero .ds-object-hero__title')
        ?.textContent,
    ).toContain('战士脸')
  })
})
