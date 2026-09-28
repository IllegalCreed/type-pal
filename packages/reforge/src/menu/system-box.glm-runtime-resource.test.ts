/**
 * TEST-GLM-RUNTIME-RESOURCE-2 R11（reforge/menu/system-box.ts）。
 * 该文件此前无任何测试。合同（renderSpans 文本缝替身 + 录制 ctx）：
 * inactive 早退、5 项布局 (53,72+18i) 与四色（普通/选中闪烁/禁用/禁用选中）、
 * confirm 阶段否/是高亮互斥、switch 阶段关/开、占位提示 (130,84) 禁用色。
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
import { openSystemMenu, type SystemMenuState } from '../system-menu-state.js'
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

describe('R11 drawSystemMenu', () => {
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

  test('5 项 (53,72+18i)；禁用项红、选中闪烁、禁用选中 0x1C', () => {
    const h = host()
    const state = openSystemMenu(1) // cursor=1（load 非禁用 → 闪烁）
    // save/music 禁用；四色全覆盖：禁用红 / 选中闪烁 / 普通
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
  })

  test('confirm 阶段：否/是两卷轴 + 高亮随 confirmYes 互斥', () => {
    const h = host()
    const state = openSystemMenu()
    state.phase = 'confirm'
    state.confirmYes = false
    textCalls.mockClear()
    drawSystemMenu(h.ctx, state, menuAssets(), glyphTable(), 0, locale)
    const rows = texts()
    // 菜单 5 行 + confirm 左右 2 行
    expect(rows).toHaveLength(7)
    expect(rows[5]).toEqual([lookupText('menu.system.no', locale), 145, 110, [247, 231, 109]])
    expect(rows[6]).toEqual([lookupText('menu.system.yes', locale), 220, 110, [199, 186, 174]])
    h.drawImage.mockClear()
    textCalls.mockClear()
    state.confirmYes = true
    drawSystemMenu(h.ctx, state, menuAssets(), glyphTable(), 0, locale)
    const flipped = texts()
    expect(flipped[5]).toEqual([lookupText('menu.system.no', locale), 145, 110, [199, 186, 174]])
    expect(flipped[6]).toEqual([lookupText('menu.system.yes', locale), 220, 110, [247, 231, 109]])
  })

  test('switch 阶段：关/开标签；占位提示画 (130,84) 禁用色', () => {
    const h = host()
    const state = openSystemMenu()
    state.phase = 'switch'
    state.confirmYes = true
    textCalls.mockClear()
    drawSystemMenu(h.ctx, state, menuAssets(), glyphTable(), 0, locale, 'menu.system.quit')
    const rows = texts()
    expect(rows[5]).toEqual([lookupText('menu.system.off', locale), 145, 110, [199, 186, 174]])
    expect(rows[6]).toEqual([lookupText('menu.system.on', locale), 220, 110, [247, 231, 109]])
    expect(rows[7]).toEqual([lookupText('menu.system.quit', locale), 130, 84, [166, 40, 32]])
  })
})
