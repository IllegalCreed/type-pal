// @vitest-environment jsdom
/**
 * TEST-CURSOR-ASSET-UI-LARGE-1 C08-G07：Stamp 叶组件（Editor/库/对话框/预览）。
 * 排重：StampLibraryTab.test 16 项工作流；StampContentEditor.glm-leaf；StampTemplateDialog.glm-l；
 * StampPreviewCanvas.test mock 缺帧——本文件用合法 blank + 真实 reader，补库筛选/画布尺寸/对话框 create/预览 canvas。
 */
import type { StampTemplate } from '@type-pal/content'
import { buildBlankProjectMap, paintProjectMapTiles } from '@type-pal/reforge'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  C08_TILESET,
  c08StampTemplate,
  openC08Session,
} from '../__tests__/cursor-asset-r1/c08-fixtures.js'
import {
  mountStampContentEditor,
  mountStampLibrary,
  mountStampPreview,
  mountStampTemplateDialog,
} from '../__tests__/cursor-asset-r1/c08-stamp-harness.js'
import { stubNodeTestHost, typeDraft } from '../__tests__/cursor-asset-r1/kit.js'
import { installBrowserHardwarePorts } from './__tests__/kimi-editor-workflows/kit.js'
import { loadStampPreviewAssets } from './StampPreviewCanvas.js'

beforeEach(async () => {
  await stubNodeTestHost()
  installBrowserHardwarePorts()
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
    queueMicrotask(() => cb(0))
    return 1
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('C08-G07 Stamp 叶组件合同', () => {
  test('C08-G07-01 StampLibraryTab 搜索过滤模板行', async () => {
    const mounted = await mountStampLibrary('c08-g07-01', ['c08-alpha', 'c08-beta'])
    const search = mounted.host.querySelector<HTMLInputElement>('input[aria-label="搜索组合模板"]')!
    await typeDraft(search, 'alpha')
    const rows = [...mounted.host.querySelectorAll('.stamp-library-row')].map(
      (row) => row.textContent ?? '',
    )
    expect(rows.some((text) => text.includes('c08-alpha'))).toBe(true)
    expect(rows.some((text) => text.includes('c08-beta'))).toBe(false)
    await mounted.cleanup()
  })

  test('C08-G07-02 StampLibraryTab 选中第二模板 who 同步', async () => {
    const mounted = await mountStampLibrary('c08-g07-02', ['c08-one', 'c08-two'])
    const row = [...mounted.host.querySelectorAll<HTMLButtonElement>('.stamp-library-row')].find(
      (candidate) => candidate.textContent?.includes('c08-two'),
    )!
    await act(async () => row.click())
    expect(mounted.host.querySelector('.who')?.textContent).toContain('c08-two')
    await mounted.cleanup()
  })

  test('C08-G07-03 StampContentEditor 改组合名称 blur 触发 onChange', async () => {
    const template = c08StampTemplate('c08-edit', C08_TILESET)
    const onChange = vi.fn()
    const mounted = await mountStampContentEditor(template, onChange)
    const name = mounted.propertiesHost.querySelector<HTMLInputElement>(
      'input[aria-label="组合名称"]',
    )!
    await typeDraft(name, '新组合名')
    await act(async () => name.dispatchEvent(new FocusEvent('focusout', { bubbles: true })))
    expect(onChange).toHaveBeenCalled()
    expect(onChange.mock.calls.at(-1)?.[0]?.name).toBe('新组合名')
    await mounted.cleanup()
  })

  test('C08-G07-04 StampContentEditor migrated 名称输入初始 disabled', async () => {
    const template = c08StampTemplate('c08-mig', C08_TILESET, 0, { origin: 'migrated' })
    const mounted = await mountStampContentEditor(template, () => undefined)
    const name = mounted.propertiesHost.querySelector<HTMLInputElement>(
      'input[aria-label="组合名称"]',
    )!
    expect(name.disabled).toBe(true)
    await mounted.cleanup()
  })

  test('C08-G07-05 StampTemplateDialog create 空名称阻止保存', async () => {
    const map = buildBlankProjectMap(2, 2, C08_TILESET)
    paintProjectMapTiles(map, [
      { layerId: 'floor', row: 0, col: 0, tileId: 0, tilesetId: C08_TILESET, height: 0 },
    ])
    const selection = {
      kind: 'cells' as const,
      hitScope: 'visible-unlocked-layers' as const,
      visualSlots: [{ layerId: 'floor', row: 0, col: 0 }],
      gridPoints: [],
    }
    const mounted = await mountStampTemplateDialog({ map, selection })
    const name = mounted.host.querySelector<HTMLInputElement>('input[name="stamp-name"]')!
    await typeDraft(name, '   ')
    const save = mounted.host.querySelector<HTMLButtonElement>('button[type="submit"]')!
    await act(async () => save.click())
    expect(mounted.session.getState().stamps.length).toBe(0)
    await mounted.cleanup()
  })

  test('C08-G07-06 StampTemplateDialog create 合法保存登记模板', async () => {
    let map = buildBlankProjectMap(3, 2, C08_TILESET)
    map = paintProjectMapTiles(map, [
      { layerId: 'floor', row: 0, col: 0, tileId: 1, tilesetId: C08_TILESET, height: 0 },
    ])
    const selection = {
      kind: 'cells' as const,
      hitScope: 'visible-unlocked-layers' as const,
      visualSlots: [{ layerId: 'floor', row: 0, col: 0 }],
      gridPoints: [],
    }
    const mounted = await mountStampTemplateDialog({ map, selection })
    const name = mounted.host.querySelector<HTMLInputElement>('input[name="stamp-name"]')!
    await typeDraft(name, '有效组合')
    const save = [...mounted.host.querySelectorAll<HTMLButtonElement>('button')].find((button) =>
      button.textContent?.includes('创建组合'),
    )!
    await act(async () => save.click())
    await vi.waitFor(() => {
      expect(mounted.session.getState().stamps.length).toBe(1)
    })
    expect(mounted.saved[0]?.mode).toBe('create')
    await mounted.cleanup()
  })

  test('C08-G07-07 StampPreviewCanvas 渲染 canvas 元素', async () => {
    const template = c08StampTemplate('c08-prev', C08_TILESET)
    const mounted = await mountStampPreview(template)
    await vi.waitFor(() => {
      expect(mounted.canvas().width).toBeGreaterThan(0)
    })
    await mounted.cleanup()
  })

  test('C08-G07-08 loadStampPreviewAssets 返回 palette 与 tilesets 注册表', async () => {
    const { legal, session, reader } = await openC08Session('c08-g07-08')
    const tileset = session.getState().tilesets![0]!
    const assets = await loadStampPreviewAssets(
      legal.assetBase,
      reader,
      tileset,
      session.getState().assetCatalog.assets[tileset.asset]!.sha256,
    )
    expect(assets.palette.colors.length).toBe(256)
    expect(assets.tilesets.has(tileset.id)).toBe(true)
  })

  test('C08-G07-09 StampPreviewCanvas 缺帧模板显示 fail-visible 文案', async () => {
    const broken: StampTemplate = {
      ...c08StampTemplate('c08-broken', C08_TILESET),
      layers: [
        {
          id: 'floor',
          name: '地面',
          tiles: [[99], [null]],
          sources: [[0], [null]],
        },
      ],
    }
    const mounted = await mountStampPreview(broken)
    await vi.waitFor(() => {
      expect(mounted.host.textContent).toMatch(/资源缺失|#99/)
    })
    await mounted.cleanup()
  })

  test('C08-G07-10 StampLibraryTab focusObjectId 初始选中指定模板', async () => {
    const mounted = await mountStampLibrary('c08-g07-10', ['c08-a', 'c08-b'], 'c08-b')
    expect(mounted.host.querySelector('.stamp-library-row.selected')?.textContent).toContain(
      'c08-b',
    )
    await mounted.cleanup()
  })
})
