// @vitest-environment jsdom
/**
 * TEST-CURSOR-ASSET-UI-LARGE-1 C06-G07：StampPreviewCanvas 真实像素 / 图层碰撞 / 载入归属。
 * 排重：StampPreviewCanvas.test mock reforge 与 as never；C08-G07-07/08/09 仅证 canvas 宽、
 * palette 注册表与缺帧文案。本文件补不透明像素、碰撞/图层切换、缩略图画布、缺 tileset 错误
 * 与同 revision 缓存命中——不重复 C08 库筛选/对话框轴。
 */
import type { StampTemplate } from '@type-pal/content'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  C08_TILESET,
  c08StampTemplate,
  openC08Session,
} from '../__tests__/cursor-asset-r1/c08-fixtures.js'
import { mountStampPreview } from '../__tests__/cursor-asset-r1/c08-stamp-harness.js'
import {
  isBlank,
  opaqueBounds,
  requireRealCanvas2d,
} from '../__tests__/cursor-asset-r1/canvas-pixels.js'
import { installBrowserHardwarePorts } from '../__tests__/cursor-asset-r1/image-ports.js'
import { stubNodeTestHost } from '../__tests__/cursor-asset-r1/kit.js'
import { pollUntil } from '../__tests__/cursor-asset-r1/timing.js'
import {
  loadStampPreviewAssets,
  StampMiniPreview,
  StampPreviewCanvas,
} from './StampPreviewCanvas.js'

let host: HTMLDivElement
let root: Root

beforeEach(async () => {
  await stubNodeTestHost()
  installBrowserHardwarePorts()
  requireRealCanvas2d()
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

async function waitPreviewReady(container: HTMLElement): Promise<void> {
  await pollUntil(
    () =>
      container.querySelector('canvas[role="img"]') !== null &&
      !container.textContent?.includes('正在载入'),
    'StampPreviewCanvas 资产就绪',
  )
}

describe('C06-G07 StampPreviewCanvas 像素与预览控件', () => {
  test('C06-G07-01 合法模板载入后主画布出现不透明像素', async () => {
    const template = c08StampTemplate('c06-g07-01', C08_TILESET)
    const mounted = await mountStampPreview(template)
    await waitPreviewReady(mounted.host)
    const canvas = mounted.canvas()
    expect(canvas.width).toBeGreaterThan(0)
    expect(isBlank(canvas)).toBe(false)
    expect(opaqueBounds(canvas)?.count ?? 0).toBeGreaterThan(0)
    await mounted.cleanup()
  })

  test('C06-G07-02 碰撞叠层默认 pressed；点击后 aria-pressed=false', async () => {
    const template = c08StampTemplate('c06-g07-02', C08_TILESET, 0, {
      collision: [
        [0, null],
        [null, null],
      ],
    })
    const mounted = await mountStampPreview(template)
    await waitPreviewReady(mounted.host)
    const collision = [...mounted.host.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.textContent?.includes('碰撞叠层'),
    )!
    expect(collision.getAttribute('aria-pressed')).toBe('true')
    await act(async () => collision.click())
    expect(collision.getAttribute('aria-pressed')).toBe('false')
    await mounted.cleanup()
  })

  test('C06-G07-03 隐藏唯一图层后可见成员归零', async () => {
    const template = c08StampTemplate('c06-g07-03', C08_TILESET)
    const mounted = await mountStampPreview(template)
    await waitPreviewReady(mounted.host)
    expect(mounted.host.textContent).toMatch(/[1-9]\d* 个可见成员/)
    const layer = [...mounted.host.querySelectorAll<HTMLButtonElement>('button')].find((button) =>
      button.textContent?.includes('地面'),
    )!
    await act(async () => layer.click())
    expect(mounted.host.textContent).toContain('0 个可见成员')
    await mounted.cleanup()
  })

  test('C06-G07-04 aria-label 报告层数与视觉成员数', async () => {
    const template = c08StampTemplate('c06-g07-04', C08_TILESET)
    const mounted = await mountStampPreview(template)
    await waitPreviewReady(mounted.host)
    expect(mounted.canvas().getAttribute('aria-label')).toContain('1 层、1 个视觉成员')
    await mounted.cleanup()
  })

  test('C06-G07-05 loadStampPreviewAssets 同 revision 二次调用复用同一 frames Map', async () => {
    const { legal, session, reader } = await openC08Session('c06-g07-05')
    const tileset = session.getState().tilesets![0]!
    const revision = session.getState().assetCatalog.assets[tileset.asset]!.sha256
    const first = await loadStampPreviewAssets(legal.assetBase, reader, tileset, revision)
    const second = await loadStampPreviewAssets(legal.assetBase, reader, tileset, revision)
    expect(first.frames).toBe(second.frames)
    expect(first.tilesets.get(tileset.id)).toBe(second.tilesets.get(tileset.id))
  })

  test('C06-G07-06 loadStampPreviewAssets 不同 revision 返回不同 frames Promise 结果对象', async () => {
    const { legal, session, reader } = await openC08Session('c06-g07-06')
    const tileset = session.getState().tilesets![0]!
    const revision = session.getState().assetCatalog.assets[tileset.asset]!.sha256
    const first = await loadStampPreviewAssets(legal.assetBase, reader, tileset, revision)
    const second = await loadStampPreviewAssets(legal.assetBase, reader, tileset, `${revision}-b`)
    expect(first.frames).not.toBe(second.frames)
    expect(second.tilesets.has(tileset.id)).toBe(true)
  })

  test('C06-G07-07 StampMiniPreview 34×34 缩略图出现不透明像素', async () => {
    const { legal, session, reader } = await openC08Session('c06-g07-07')
    const template = c08StampTemplate('c06-mini', C08_TILESET)
    const state = session.getState()
    await act(async () => {
      root.render(
        <StampMiniPreview
          template={template}
          tilesets={state.tilesets ?? []}
          assetCatalog={state.assetCatalog}
          assetReader={reader}
          assetBase={legal.assetBase}
        />,
      )
      await Promise.resolve()
    })
    await pollUntil(() => host.querySelector('canvas') !== null, 'StampMiniPreview canvas')
    await pollUntil(() => !isBlank(host.querySelector('canvas')!), '缩略图像素就绪')
    const canvas = host.querySelector('canvas')!
    expect(canvas.width).toBe(34)
    expect(canvas.height).toBe(34)
    expect(opaqueBounds(canvas)?.count ?? 0).toBeGreaterThan(0)
  })

  test('C06-G07-08 模板引用不存在的 tileset 时展示错误文案', async () => {
    const { legal, session, reader } = await openC08Session('c06-g07-08')
    const template = c08StampTemplate('c06-missing-ts', 'tiles-ghost')
    const state = session.getState()
    await act(async () => {
      root.render(
        <StampPreviewCanvas
          template={template}
          tilesets={state.tilesets ?? []}
          assetCatalog={state.assetCatalog}
          assetReader={reader}
          assetBase={legal.assetBase}
        />,
      )
      await Promise.resolve()
    })
    await pollUntil(() => host.textContent?.includes('不存在') === true, '缺 tileset 错误文案')
    expect(host.textContent).toMatch(/来源瓦片集|不存在/)
    expect(host.querySelector('canvas')).toBeNull()
  })

  test('C06-G07-09 双层模板 aria-label 层数=2 且像素非空', async () => {
    const base = c08StampTemplate('c06-g07-09', C08_TILESET)
    const template: StampTemplate = {
      ...base,
      layers: [
        base.layers[0]!,
        {
          id: 'decor',
          name: '装饰',
          tiles: [
            [0, null],
            [null, null],
          ],
          sources: [
            [0, null],
            [null, null],
          ],
        },
      ],
    }
    const mounted = await mountStampPreview(template)
    await waitPreviewReady(mounted.host)
    expect(mounted.canvas().getAttribute('aria-label')).toContain('2 层、2 个视觉成员')
    expect(opaqueBounds(mounted.canvas())?.count ?? 0).toBeGreaterThan(0)
    await mounted.cleanup()
  })

  test('C06-G07-10 载入中展示「正在载入瓦片预览」且尚无 canvas', async () => {
    const { legal, session, reader } = await openC08Session('c06-g07-10')
    const template = c08StampTemplate('c06-loading', C08_TILESET)
    const state = session.getState()
    let resolveHold!: () => void
    const hold = new Promise<void>((resolve) => {
      resolveHold = resolve
    })
    const slowReader = {
      ...reader,
      async readBytes(
        asset: Parameters<typeof reader.readBytes>[0],
        kind?: Parameters<typeof reader.readBytes>[1],
      ) {
        await hold
        return reader.readBytes(asset, kind)
      },
    }
    await act(async () => {
      root.render(
        <StampPreviewCanvas
          template={template}
          tilesets={state.tilesets ?? []}
          assetCatalog={state.assetCatalog}
          assetReader={slowReader as typeof reader}
          assetBase={legal.assetBase}
        />,
      )
      await Promise.resolve()
    })
    expect(host.textContent).toContain('正在载入瓦片预览')
    expect(host.querySelector('canvas')).toBeNull()
    resolveHold()
    await waitPreviewReady(host)
    expect(host.querySelector('canvas')).not.toBeNull()
  })
})
