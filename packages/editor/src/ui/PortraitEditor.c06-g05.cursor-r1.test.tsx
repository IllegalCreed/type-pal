// @vitest-environment jsdom
/**
 * TEST-CURSOR-ASSET-UI-LARGE-1 C06-G05：PortraitEditor 立绘真实 PNG 像素 / 切换清理 / 选择恢复。
 */

import { act } from 'react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { requireRealCanvas2d } from '../__tests__/cursor-asset-r1/canvas-pixels.js'
import {
  installBrowserHardwarePorts,
  pngRgba,
  solidRgba,
} from '../__tests__/cursor-asset-r1/image-ports.js'
import {
  controlByAriaLabel,
  loadLegalProject,
  pickCombobox,
  stubNodeTestHost,
} from '../__tests__/cursor-asset-r1/kit.js'
import {
  decodePortraitCenterRgb,
  type MountedPortraitEditor,
  mountPortraitEditor,
  unmountPortraitEditor,
} from '../__tests__/cursor-asset-r1/portrait-harness.js'
import { pollUntil } from '../__tests__/cursor-asset-r1/timing.js'
import { sha256Hex } from '../core/binary-signature.js'
import { PortraitEditor } from './PortraitEditor.js'

const RED: [number, number, number, number] = [220, 40, 40, 255]
const BLUE: [number, number, number, number] = [40, 80, 220, 255]

let mounted: MountedPortraitEditor | undefined
let legal: Awaited<ReturnType<typeof loadLegalProject>>

async function pngOf(color: typeof RED): Promise<{ png: ArrayBuffer; sha256: string }> {
  const encoded = pngRgba(8, 8, solidRgba(8, 8, color))
  const png = encoded.slice().buffer
  return { png, sha256: await sha256Hex(png) }
}

beforeEach(async () => {
  await stubNodeTestHost()
  installBrowserHardwarePorts()
  requireRealCanvas2d()
  legal = await loadLegalProject('c06-g05-portrait')
})

afterEach(async () => {
  if (mounted) {
    await unmountPortraitEditor(mounted)
    mounted = undefined
  }
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

test('C06-G05-01 默认立绘：reader 解码 PNG 主色为红', async () => {
  const red = await pngOf(RED)
  mounted = await mountPortraitEditor(legal, {
    portraitAssets: [{ id: 'portrait.c06.red', label: '红', ...red }],
    actorPatch: { portraits: { default: 'portrait.c06.red' } },
  })
  const rgb = await decodePortraitCenterRgb(mounted.reader, 'portrait.c06.red')
  expect(rgb[0]).toBeGreaterThan(180)
  expect(rgb[2]).toBeLessThan(80)
})

test('C06-G05-02 切换默认立绘：session 指向蓝且解码为蓝', async () => {
  const red = await pngOf(RED)
  const blue = await pngOf(BLUE)
  mounted = await mountPortraitEditor(legal, {
    portraitAssets: [
      { id: 'portrait.c06.red', label: '红', ...red },
      { id: 'portrait.c06.blue', label: '蓝', ...blue },
    ],
    actorPatch: { portraits: { default: 'portrait.c06.red' } },
  })
  const trigger = controlByAriaLabel<HTMLButtonElement>(mounted.host, '默认对话立绘图片', 'button')
  await pickCombobox(trigger, '蓝 (portrait.c06.blue)')
  expect(mounted.session.getState().actors[0]?.portraits?.default).toBe('portrait.c06.blue')
  const rgb = await decodePortraitCenterRgb(mounted.reader, 'portrait.c06.blue')
  expect(rgb[2]).toBeGreaterThan(180)
})

test('C06-G05-03 双表情资源：解码互异 RGB', async () => {
  const red = await pngOf(RED)
  const blue = await pngOf(BLUE)
  mounted = await mountPortraitEditor(legal, {
    portraitAssets: [
      { id: 'portrait.c06.red', label: '红', ...red },
      { id: 'portrait.c06.blue', label: '蓝', ...blue },
    ],
    actorPatch: {
      portraits: {
        default: 'portrait.c06.red',
        expressions: { A: 'portrait.c06.red', B: 'portrait.c06.blue' },
      },
    },
  })
  const a = await decodePortraitCenterRgb(mounted.reader, 'portrait.c06.red')
  const b = await decodePortraitCenterRgb(mounted.reader, 'portrait.c06.blue')
  expect(a.join()).not.toBe(b.join())
})

test('C06-G05-04 undo 默认立绘切换：回到 red 资源 id', async () => {
  const red = await pngOf(RED)
  const blue = await pngOf(BLUE)
  mounted = await mountPortraitEditor(legal, {
    portraitAssets: [
      { id: 'portrait.c06.red', label: '红', ...red },
      { id: 'portrait.c06.blue', label: '蓝', ...blue },
    ],
    actorPatch: { portraits: { default: 'portrait.c06.red' } },
  })
  const trigger = controlByAriaLabel<HTMLButtonElement>(mounted.host, '默认对话立绘图片', 'button')
  await pickCombobox(trigger, '蓝 (portrait.c06.blue)')
  await act(async () => mounted!.session.undo())
  expect(mounted.session.getState().actors[0]?.portraits?.default).toBe('portrait.c06.red')
})

test('C06-G05-05 无立绘组：空状态文案', async () => {
  mounted = await mountPortraitEditor(legal)
  expect(mounted.host.textContent).toContain('暂无对话立绘')
})

test('C06-G05-06 删除 blob 后缩略图进入 error 态', async () => {
  const red = await pngOf(RED)
  mounted = await mountPortraitEditor(legal, {
    portraitAssets: [{ id: 'portrait.c06.red', label: '红', ...red }],
    actorPatch: { portraits: { default: 'portrait.c06.red' } },
  })
  const path = mounted.session.getState().assetCatalog.assets['portrait.c06.red']!.path
  delete mounted.session.getState().assetBlobs[path]
  const actor = mounted.session.getState().actors[0]!
  await act(async () => {
    mounted!.root.render(
      <PortraitEditor
        actor={actor}
        session={mounted!.session}
        catalog={mounted!.session.getState().assetCatalog}
        reader={mounted!.reader}
      />,
    )
  })
  await pollUntil(
    () => mounted!.host.querySelector('.image-asset-thumb.error') !== null,
    'error thumb',
  )
})

test('C06-G05-07 删除表情：expressions 清空', async () => {
  const red = await pngOf(RED)
  mounted = await mountPortraitEditor(legal, {
    portraitAssets: [{ id: 'portrait.c06.red', label: '红', ...red }],
    actorPatch: {
      portraits: { default: 'portrait.c06.red', expressions: { 临时: 'portrait.c06.red' } },
    },
  })
  await act(async () => {
    mounted!.host.querySelector<HTMLButtonElement>('button[aria-label="删除表情“临时”"]')!.click()
  })
  expect(mounted.session.getState().actors[0]?.portraits?.expressions).toBeUndefined()
})

test('C06-G05-08 重命名表情：键名更新且资源 id 不变', async () => {
  const red = await pngOf(RED)
  mounted = await mountPortraitEditor(legal, {
    portraitAssets: [{ id: 'portrait.c06.red', label: '红', ...red }],
    actorPatch: {
      portraits: { default: 'portrait.c06.red', expressions: { 旧名: 'portrait.c06.red' } },
    },
  })
  const input = mounted.host.querySelector<HTMLInputElement>(
    'input[name="actor-portrait-expression-name"]',
  )!
  await act(async () => {
    input.focus()
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, '新名')
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.blur()
  })
  expect(mounted.session.getState().actors[0]?.portraits?.expressions?.新名).toBe(
    'portrait.c06.red',
  )
})

test('C06-G05-09 表情换图：解码新 asset 颜色变化', async () => {
  const red = await pngOf(RED)
  const blue = await pngOf(BLUE)
  mounted = await mountPortraitEditor(legal, {
    portraitAssets: [
      { id: 'portrait.c06.red', label: '红', ...red },
      { id: 'portrait.c06.blue', label: '蓝', ...blue },
    ],
    actorPatch: {
      portraits: { default: 'portrait.c06.red', expressions: { E1: 'portrait.c06.red' } },
    },
  })
  const trigger = controlByAriaLabel<HTMLButtonElement>(mounted.host, 'E1立绘图片', 'button')
  await pickCombobox(trigger, '蓝 (portrait.c06.blue)')
  const rgb = await decodePortraitCenterRgb(mounted.reader, 'portrait.c06.blue')
  expect(rgb[2]).toBeGreaterThan(180)
})

test('C06-G05-10 切换默认立绘增加 history', async () => {
  const red = await pngOf(RED)
  const blue = await pngOf(BLUE)
  mounted = await mountPortraitEditor(legal, {
    portraitAssets: [
      { id: 'portrait.c06.red', label: '红', ...red },
      { id: 'portrait.c06.blue', label: '蓝', ...blue },
    ],
    actorPatch: { portraits: { default: 'portrait.c06.red' } },
  })
  const before = mounted.session.getHistoryVersion()
  const trigger = controlByAriaLabel<HTMLButtonElement>(mounted.host, '默认对话立绘图片', 'button')
  await pickCombobox(trigger, '蓝 (portrait.c06.blue)')
  expect(mounted.session.getHistoryVersion()).toBeGreaterThan(before)
})

test('C06-G05-11 删除整组立绘：portraits 清空', async () => {
  const red = await pngOf(RED)
  mounted = await mountPortraitEditor(legal, {
    portraitAssets: [{ id: 'portrait.c06.red', label: '红', ...red }],
    actorPatch: { portraits: { default: 'portrait.c06.red' } },
  })
  await act(async () => {
    mounted!.host
      .querySelector<HTMLButtonElement>('button[aria-label="删除整个对话立绘组"]')!
      .click()
  })
  expect(mounted.session.getState().actors[0]?.portraits).toBeUndefined()
})
