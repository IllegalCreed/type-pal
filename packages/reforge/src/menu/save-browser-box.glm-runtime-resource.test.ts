/**
 * TEST-GLM-RUNTIME-RESOURCE-2 R13（reforge/menu/save-browser-box.ts）。
 * 该文件此前无任何测试。合同（renderSpans 文本缝替身 + 录制 ctx）：inactive 早退、
 * 标题黄/页码右对齐/翻页三角（fillRect 像素行）、auto 槽两行标签与 save 模式禁用色、
 * 选中三角光标、已存槽 meta 行（队伍/存次黄注/地图/右对齐时间）、覆盖确认框。
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
import type { SaveBrowserState } from '../save/browser-state.js'
import { ALL_SLOT_IDS, type SlotId } from '../save/types.js'
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

  test('已存手动槽：选中三角、队伍行、存次黄注右对齐、地图名、时间右对齐', () => {
    const h = drawHost()
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
      savedTimes: 4,
    }
    stubDocumentCanvas(h)
    textCalls.mockClear()
    drawSaveBrowser(
      h.ctx,
      state({ mode: 'load', cursor: 2, metas }),
      menuAssets(),
      glyphTable(),
      0,
      locale,
      new Map<SlotId, ImageBitmap>(),
    )
    const rows = texts()
    // idx 2 在第 0 页第 3 行（page = floor(2/3) = 0 → 1/10）
    expect(rows[1]![0]).toBe('1/10')
    const textsList = rows.map((r) => r[0])
    expect(textsList).toContain('李逍遥 9  赵灵儿 8')
    expect(textsList).toContain('存4次')
    expect(textsList).toContain('余杭镇')
    expect(textsList).toContain('09/28 21:07')
    // 选中三角（idx2 选中）+ 翻页左右两三角：36×3 = 108
    expect(h.fillRect.mock.calls.length).toBe(72)
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
