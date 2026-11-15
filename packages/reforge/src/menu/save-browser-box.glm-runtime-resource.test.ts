/**
 * TEST-GLM-RUNTIME-RESOURCE-2 R13（reforge/menu/save-browser-box.ts）。
 * 该文件此前无任何测试。合同（renderSpans 文本缝替身 + 录制 ctx）：inactive 早退、
 * 标题黄/页码右对齐/翻页三角（fillRect 像素行）、auto 槽两行标签与 save 模式禁用色、
 * 选中三角光标、已存槽信息栏、覆盖确认框。
 */
import type { Locale } from '@type-pal/content'
import { lookupText } from '@type-pal/content'
import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  drawHost,
  glyphTable,
  menuAssets,
  stubDocumentCanvas,
} from '../__tests__/glm-runtime-resource/menu-draw-fixtures.js'
import { openSaveBrowser, type SaveBrowserState } from '../save/browser-state.js'
import { ALL_SLOT_IDS, type SaveMeta, type SlotId } from '../save/types.js'
import { drawSaveBrowser } from './save-browser-box.js'

const textCalls = vi.hoisted(() => vi.fn())
vi.mock('../text/text-render.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../text/text-render.js')>()
  return {
    ...actual,
    renderSpans: (...args: unknown[]) => {
      textCalls(...args)
      return 0
    },
  }
})

afterEach(() => vi.unstubAllGlobals())

const locale: Locale = {}

function state(over: Partial<SaveBrowserState>): SaveBrowserState {
  return {
    active: true,
    mode: 'load',
    cursor: 0,
    metas: ALL_SLOT_IDS.map(() => null),
    confirmOverwrite: false,
    ...over,
  }
}

function texts(): [string, number, number, readonly number[]][] {
  return textCalls.mock.calls.map((c: unknown[]) => {
    const spans = c[1] as { text: string }[]
    const opts = c[4] as { forceRgba?: readonly number[] }
    return [spans[0]!.text, c[2] as number, c[3] as number, opts.forceRgba!]
  })
}

function textMetrics() {
  const sample = glyphTable()
  return {
    has: () => true,
    get: (codepoint: number) =>
      sample.get(codepoint < 128 || codepoint === 0x00b7 || codepoint === 0x2026 ? 0x41 : 0x4e2d),
  }
}

describe('R13 drawSaveBrowser', () => {
  test('inactive 早退：零绘制', () => {
    const h = drawHost()
    drawSaveBrowser(
      h.ctx,
      state({ active: false }),
      menuAssets(),
      glyphTable(),
      0,
      locale,
      new Map(),
    )
    expect(texts()).toEqual([])
    expect(h.fillRect).not.toHaveBeenCalled()
  })

  test('标题黄 + 页码 1/10 + 仅右翻三角（第 0 页）', () => {
    const h = drawHost()
    textCalls.mockClear()
    drawSaveBrowser(h.ctx, state({ cursor: 0 }), menuAssets(), glyphTable(), 0, locale, new Map())
    const rows = texts()
    expect(rows[0]).toEqual([lookupText('menu.system.load', locale), 8, 4, [247, 231, 109]])
    expect(rows[1]).toEqual(['1/10', expect.any(Number), 4, [199, 186, 174]])
    // 第 0 页：无左翻三角 → fillRect = 右翻三角 36 + 选中光标三角 36
    expect(h.fillRect).toHaveBeenCalledTimes(72)
  })

  test('auto 槽两行标签；save 模式禁用红、选中禁用亮红', () => {
    const h = drawHost()
    textCalls.mockClear()
    drawSaveBrowser(
      h.ctx,
      state({ mode: 'save', cursor: 0 }),
      menuAssets(),
      glyphTable(),
      0,
      locale,
      new Map(),
    )
    const rows = texts()
    expect(rows[2]).toEqual(['自动', 26, 36, [215, 109, 93]]) // blocked + selected
    expect(rows[3]).toEqual(['存档', 26, 54, [215, 109, 93]])
    // 非选中的 blocked 槽（quick, row1 cy=84）→ 禁用红
    expect(rows[4]).toEqual(['快速', 26, 92, [166, 40, 32]])
    expect(rows[5]).toEqual(['存档', 26, 110, [166, 40, 32]])
  })

  test('已存手动槽保留短队伍、标题和日期，保存次数使用右对齐的黄数字', () => {
    const h = drawHost()
    const assets = menuAssets()
    const metas: SaveBrowserState['metas'][number][] = ALL_SLOT_IDS.map(() => null)
    metas[2] = {
      slotId: 'm01',
      kind: 'manual',
      party: [
        { name: '李逍遥', level: 9 },
        { name: '赵灵儿', level: 8 },
      ],
      mapName: '余杭镇',
      savedAt: new Date(2026, 8, 28, 21, 7).getTime(),
      savedTimes: 14,
    }
    stubDocumentCanvas(h)
    textCalls.mockClear()
    drawSaveBrowser(
      h.ctx,
      state({ mode: 'load', cursor: 2, metas }),
      assets,
      textMetrics(),
      0,
      locale,
      new Map<SlotId, ImageBitmap>(),
    )
    const rows = texts()
    // idx 2 在第 0 页第 3 行（page = floor(2/3) = 0 → 1/10）
    expect(rows[1]![0]).toBe('1/10')
    const textsList = rows.map((r) => r[0])
    expect(textsList).toContain('李逍遥 9  赵灵儿 8')
    expect(h.drawImage.mock.calls.filter(([image]) => assets.nums.includes(image))).toEqual([
      [assets.nums[4], 300, 152],
      [assets.nums[1], 294, 152],
    ])
    expect(textsList).not.toContain('存14次')
    expect(textsList).toContain('余杭镇')
    expect(textsList).toContain('09/28 21:07')
    // 选中三角和右翻页三角。
    expect(h.fillRect.mock.calls.length).toBe(72)
  })

  test.each([
    ['仙剑奇侠传·复刻', '仙剑奇侠传·复刻'],
    ['仙剑奇侠传·复刻长篇场景编辑器测试', '仙剑奇侠传·复刻…'],
  ])('长标题 %s 放在完整时间前的独立列内', (mapName, displayedName) => {
    const h = drawHost()
    const translate = vi.fn()
    const scale = vi.fn()
    Object.assign(h.ctx, { translate, scale })
    const assets = menuAssets()
    const meta: SaveMeta = {
      slotId: 'm01',
      kind: 'manual',
      party: [{ name: '阿奴', level: 28 }],
      mapName,
      savedAt: new Date(2026, 10, 15, 16, 31).getTime(),
      savedTimes: 1,
    }
    const browser = openSaveBrowser('load', [meta], ALL_SLOT_IDS.indexOf('m01'))
    textCalls.mockClear()
    drawSaveBrowser(h.ctx, browser, assets, textMetrics(), 0, locale, new Map())

    expect(texts()).toContainEqual([displayedName, 0, 0, [199, 186, 174]])
    expect(texts()).toContainEqual(['11/15 16:31', 0, 0, [199, 186, 174]])
    expect(translate.mock.calls).toEqual([
      [124, 168],
      [240, 168],
    ])
    expect(scale.mock.calls).toEqual([
      [0.75, 0.75],
      [0.75, 0.75],
    ])
    expect(h.drawImage.mock.calls.find(([image]) => image === assets.nums[1])).toEqual([
      assets.nums[1],
      300,
      152,
    ])
  })

  test('confirmOverwrite：叠否/是确认框（卷轴 + 左右文本）', () => {
    const h = drawHost()
    stubDocumentCanvas(h)
    textCalls.mockClear()
    drawSaveBrowser(
      h.ctx,
      state({ mode: 'save', cursor: 2, confirmOverwrite: true }),
      menuAssets(),
      glyphTable(),
      0,
      locale,
      new Map(),
    )
    const textsList = texts().map((r) => r[0])
    expect(textsList).toContain(lookupText('menu.system.no', locale))
    expect(textsList).toContain(lookupText('menu.system.yes', locale))
  })
})
