// @vitest-environment jsdom
/**
 * TEST-CURSOR-ASSET-UI-LARGE-1 C08-G03：TilesetTab 库筛选与检查器（不抢 MapMode/SceneCanvas）。
 * 排重：TilesetTab.test 引用删除/检查器 Tab；K04 真实上传链/替换竞态；U2c 重命名与深链——
 * 本文件只补搜索/分类组合、帧预览 aria 与 starter 真实解码见证。
 */
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { appendAuthoredTileset, C08_TILESET } from '../__tests__/cursor-asset-r1/c08-fixtures.js'
import {
  type MountedTilesetTab,
  mountTilesetTab,
} from '../__tests__/cursor-asset-r1/c08-tileset-harness.js'
import { pickCombobox, stubNodeTestHost, typeDraft } from '../__tests__/cursor-asset-r1/kit.js'

let mounted: MountedTilesetTab | undefined

beforeEach(async () => {
  await stubNodeTestHost()
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
    queueMicrotask(() => cb(0))
    return 1
  })
})

afterEach(async () => {
  await mounted?.cleanup()
  mounted = undefined
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

async function waitPreview(host: HTMLElement): Promise<void> {
  await vi.waitFor(() => {
    expect(host.querySelector('[aria-label="瓦片帧预览"]')).not.toBeNull()
  })
}

describe('C08-G03 TilesetTab 库视图与预览', () => {
  test('C08-G03-01 初始选中 starter 且 h1 含「起始地形」', async () => {
    mounted = await mountTilesetTab('c08-g03-01')
    await waitPreview(mounted.host)
    expect(mounted.host.querySelector('h1')?.textContent).toContain('起始地形')
    expect(mounted.host.querySelector('.tileset-readonly')?.textContent).toBe(C08_TILESET)
  })

  test('C08-G03-02 搜索瓦片集过滤列表且清空恢复', async () => {
    mounted = await mountTilesetTab('c08-g03-02')
    await appendAuthoredTileset(mounted.session, {
      id: 'c08-interior',
      name: '室内',
      category: 'indoor',
      asset: 'tileset.authored.c08interior',
    })
    await act(async () => Promise.resolve())
    const search = mounted.host.querySelector<HTMLInputElement>('input[aria-label="搜索瓦片集"]')!
    await typeDraft(search, '室内')
    expect(mounted.host.querySelectorAll('.tileset-library-row').length).toBe(1)
    await typeDraft(search, '')
    expect(mounted.host.querySelectorAll('.tileset-library-row').length).toBeGreaterThan(1)
  })

  test('C08-G03-03 分类筛选 outdoor 后只剩 starter 行', async () => {
    mounted = await mountTilesetTab('c08-g03-03')
    await appendAuthoredTileset(mounted.session, {
      id: 'c08-indoor-only',
      name: '室内专用',
      category: 'indoor',
      asset: 'tileset.authored.c08indoor',
    })
    await act(async () => Promise.resolve())
    const trigger = mounted.host.querySelector<HTMLButtonElement>(
      'button[role="combobox"][aria-label="筛选瓦片集分类"]',
    )!
    await pickCombobox(trigger, '户外')
    const ids = [...mounted.host.querySelectorAll('.tileset-library-row .mono')].map(
      (node) => node.textContent,
    )
    expect(ids).toEqual([C08_TILESET])
  })

  test('C08-G03-04 点击第二行切换检查器标题到新名称', async () => {
    mounted = await mountTilesetTab('c08-g03-04')
    await appendAuthoredTileset(mounted.session, {
      id: 'c08-second',
      name: '第二套',
      category: 'outdoor',
      asset: 'tileset.authored.c08second',
    })
    await act(async () => Promise.resolve())
    const row = [...mounted.host.querySelectorAll<HTMLButtonElement>('.tileset-library-row')].find(
      (candidate) => candidate.querySelector('.mono')?.textContent === 'c08-second',
    )!
    await act(async () => row.click())
    expect(mounted.host.querySelector('h1')?.textContent).toContain('第二套')
  })

  test('C08-G03-05 瓦片帧预览网格含 1–4 / 4 块范围文案', async () => {
    mounted = await mountTilesetTab('c08-g03-05')
    await waitPreview(mounted.host)
    expect(mounted.host.textContent).toMatch(/1–4 \/ 4 块/)
  })

  test('C08-G03-06 瓦片预览 panel aria-label 可达', async () => {
    mounted = await mountTilesetTab('c08-g03-06')
    await waitPreview(mounted.host)
    expect(mounted.host.querySelector('section[aria-label="瓦片预览"]')).not.toBeNull()
  })

  test('C08-G03-07 名称失焦提交进入 session 历史', async () => {
    mounted = await mountTilesetTab('c08-g03-07')
    const name = mounted.host.querySelector<HTMLInputElement>('[aria-label="瓦片集名称"]')!
    await typeDraft(name, 'C08 改名')
    await act(async () => name.dispatchEvent(new FocusEvent('focusout', { bubbles: true })))
    expect(mounted.session.getState().tilesets?.[0]?.name).toBe('C08 改名')
    expect(mounted.session.isDirty()).toBe(true)
  })

  test('C08-G03-08 undo 还原瓦片集名称', async () => {
    mounted = await mountTilesetTab('c08-g03-08')
    const before = mounted.session.getState().tilesets?.[0]?.name
    const name = mounted.host.querySelector<HTMLInputElement>('[aria-label="瓦片集名称"]')!
    await typeDraft(name, '临时名')
    await act(async () => name.dispatchEvent(new FocusEvent('focusout', { bubbles: true })))
    await act(async () => {
      expect(mounted!.session.undo()).toBe(true)
    })
    expect(mounted.session.getState().tilesets?.[0]?.name).toBe(before)
  })

  test('C08-G03-09 瓦片集列表 fieldset aria-label 可达', async () => {
    mounted = await mountTilesetTab('c08-g03-09')
    expect(mounted.host.querySelector('fieldset[aria-label="瓦片集列表"]')).not.toBeNull()
  })

  test('C08-G03-10 onObjectFocus 未深链时不写入 focusLog', async () => {
    mounted = await mountTilesetTab('c08-g03-10')
    expect(mounted.focusLog.length).toBe(0)
  })
})
