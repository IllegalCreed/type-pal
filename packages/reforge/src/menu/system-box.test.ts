import type { Locale } from '@type-pal/content'
import { lookupText } from '@type-pal/content'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  drawHost,
  glyphTable,
  menuAssets,
  stubDocumentCanvas,
} from '../__tests__/glm-runtime-resource/menu-draw-fixtures.js'
import {
  openSystemMenu,
  type SystemMenuState,
  systemConfirm,
  systemToggleConfirm,
} from '../system-menu-state.js'
import { drawSystemMenu } from './system-box.js'

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

beforeEach(() => {
  textCalls.mockClear()
})
afterEach(() => vi.unstubAllGlobals())

const locale: Locale = {}
const host = () => {
  const h = drawHost()
  stubDocumentCanvas(h)
  return h
}

function texts(): [string, number, number, readonly number[]][] {
  return textCalls.mock.calls.map((c: unknown[]) => {
    const spans = c[1] as { text: string }[]
    const opts = c[4] as { forceRgba?: readonly number[] }
    return [spans[0]!.text, c[2] as number, c[3] as number, opts.forceRgba!]
  })
}

describe('系统菜单绘制', () => {
  test('inactive 早退：零绘制', () => {
    const h = host()
    const state: SystemMenuState = {
      active: false,
      phase: 'menu',
      items: [],
      cursor: 0,
      confirmYes: false,
    }
    drawSystemMenu(h.ctx, state, menuAssets(), glyphTable(), 0, locale)
    expect(texts()).toEqual([])
    expect(h.drawImage).not.toHaveBeenCalled()
  })

  test('五个选项按行布局，选中及禁用状态使用独立色彩', () => {
    const h = host()
    const state = openSystemMenu(1) // cursor=1（load 非禁用 → 闪烁）
    // 用显式禁用标志验证绘制器收到该状态时的配色。
    state.items = state.items.map((it, i) => ({ ...it, disabled: i === 2 || i === 0 }))
    textCalls.mockClear()
    drawSystemMenu(h.ctx, state, menuAssets(), glyphTable(), 0, locale)
    const rows = texts()
    expect(rows).toHaveLength(5)
    expect(rows[0]).toEqual([lookupText('menu.system.save', locale), 53, 72, [166, 40, 32]])
    expect(rows[1]).toEqual([lookupText('menu.system.load', locale), 53, 90, [247, 231, 109]])
    expect(rows[2]).toEqual([lookupText('menu.system.music', locale), 53, 108, [166, 40, 32]])
    expect(rows[3]).toEqual([lookupText('menu.system.sound', locale), 53, 126, [199, 186, 174]])
    expect(rows[4]).toEqual([lookupText('menu.system.quit', locale), 53, 144, [199, 186, 174]])

    textCalls.mockClear()
    drawSystemMenu(h.ctx, { ...state, cursor: 0 }, menuAssets(), glyphTable(), 0, locale)
    expect(texts()[0]).toEqual([lookupText('menu.system.save', locale), 53, 72, [215, 109, 93]])
  })

  test('confirm 阶段：否/是两卷轴 + 高亮随 confirmYes 互斥', () => {
    const h = host()
    const state = systemConfirm(openSystemMenu(4)).state
    textCalls.mockClear()
    drawSystemMenu(h.ctx, state, menuAssets(), glyphTable(), 0, locale)
    const rows = texts()
    // 菜单 5 行 + confirm 左右 2 行
    expect(rows).toHaveLength(7)
    expect(rows[5]).toEqual([lookupText('menu.system.no', locale), 145, 110, [247, 231, 109]])
    expect(rows[6]).toEqual([lookupText('menu.system.yes', locale), 220, 110, [199, 186, 174]])
    h.drawImage.mockClear()
    textCalls.mockClear()
    drawSystemMenu(h.ctx, systemToggleConfirm(state), menuAssets(), glyphTable(), 0, locale)
    const flipped = texts()
    expect(flipped[5]).toEqual([lookupText('menu.system.no', locale), 145, 110, [199, 186, 174]])
    expect(flipped[6]).toEqual([lookupText('menu.system.yes', locale), 220, 110, [247, 231, 109]])
  })

  test('音乐开关显示关与开，并绘制显式传入的提示', () => {
    const h = host()
    const state = systemConfirm(openSystemMenu(2), { musicOn: true, soundOn: true }).state
    textCalls.mockClear()
    drawSystemMenu(h.ctx, state, menuAssets(), glyphTable(), 0, locale, 'menu.system.quit')
    const rows = texts()
    expect(rows[5]).toEqual([lookupText('menu.system.off', locale), 145, 110, [199, 186, 174]])
    expect(rows[6]).toEqual([lookupText('menu.system.on', locale), 220, 110, [247, 231, 109]])
    expect(rows[7]).toEqual([lookupText('menu.system.quit', locale), 130, 84, [166, 40, 32]])
  })
})
