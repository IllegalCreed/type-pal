import type { Command } from '@type-pal/shared'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { beginChineseMenuText } from '../../__tests__/menu-text-fixture.js'
import { setGlobalEvents } from '../../core/event-system.js'
import {
  createInventoryMenu,
  MENUITEM_COLOR_SELECTED_FIRST,
} from '../../core/menu/inventory-menu.js'
import { fixtureGlyphs, textDot } from '../__tests__/glyph-fixtures.js'
import { freezeNow, makeGs, makeItem } from '../__tests__/menu-state-fixtures.js'
import { makeUiFrames } from '../__tests__/menu-ui-fixtures.js'
import { fillSentinel, pixel, SENTINEL } from '../__tests__/raster-fixtures.js'
import { cloneInputs } from '../__tests__/render-input-snapshots.js'
import { createFramebuffer } from '../framebuffer.js'
import { drawInventoryMenu } from './draw-inventory.js'

const positionGlyphs = fixtureGlyphs()

const DESC = 0x3c

let restoreMenuText: () => void

beforeEach(() => {
  restoreMenuText = beginChineseMenuText()
  setGlobalEvents([])
})

afterEach(() => {
  try {
    setGlobalEvents([])
  } finally {
    restoreMenuText()
  }
})

describe('Inventory descriptions', () => {
  it('G06-B01 第二条描述在 y=167，第一条仍在 y=151', () => {
    const commands: Command[] = [
      { op: 'showDialog', messageIndex: 1, text: '甲', label: 'L_52001' },
      { op: 'showDialog', messageIndex: 2, text: '乙' },
      { op: 'end' },
    ]
    setGlobalEvents(commands)
    const gs = makeGs()
    const item = makeItem(31, '丙', { scriptDesc: 52001, flags: { usable: true } })
    const items = [item]
    gs.inventory = [{ itemId: item.id, count: 1 }]
    const menu = createInventoryMenu(gs, items, 'all')
    const frames = makeUiFrames()
    const fb = createFramebuffer()
    fillSentinel(fb)
    const restore = freezeNow(0)
    try {
      drawInventoryMenu({ fb, state: menu, items, uiSpriteFrames: frames, glyphs: positionGlyphs })
    } finally {
      restore()
    }
    const first = textDot('甲', 0, 71, 151)
    const second = textDot('乙', 0, 71, 167)
    expect(pixel(fb, second.x, second.y)).toBe(DESC)
    expect(pixel(fb, first.x, first.y)).toBe(DESC)
  })

  it('G06-B02 scriptDesc 为 0 时不画 L_0 上的描述，物品名照画', () => {
    const commands: Command[] = [
      { op: 'showDialog', messageIndex: 1, text: '甲', label: 'L_0' },
      { op: 'end' },
    ]
    setGlobalEvents(commands)
    const gs = makeGs()
    const item = makeItem(32, '乙', { scriptDesc: 0, flags: { usable: true } })
    const items = [item]
    gs.inventory = [{ itemId: item.id, count: 1 }]
    const menu = createInventoryMenu(gs, items, 'all')
    const frames = makeUiFrames()
    const fb = createFramebuffer()
    fillSentinel(fb)
    const before = cloneInputs({ gs, menu, items, frames })
    const restore = freezeNow(0)
    try {
      drawInventoryMenu({ fb, state: menu, items, uiSpriteFrames: frames, glyphs: positionGlyphs })
    } finally {
      restore()
    }
    const desc = textDot('甲', 0, 71, 151)
    const name = textDot('乙', 0, 15, 12)
    expect(pixel(fb, desc.x, desc.y)).toBe(SENTINEL)
    expect(pixel(fb, name.x, name.y)).toBe(MENUITEM_COLOR_SELECTED_FIRST)
    expect(cloneInputs({ gs, menu, items, frames })).toEqual(before)
  })

  it('G06-B03 列表相 noDesc 为真时省略描述，选中名仍在', () => {
    const commands: Command[] = [
      { op: 'showDialog', messageIndex: 1, text: '诀', label: 'L_52003' },
      { op: 'end' },
    ]
    setGlobalEvents(commands)
    const gs = makeGs()
    const item = makeItem(33, '甲', { scriptDesc: 52003, flags: { usable: true } })
    const items = [item]
    gs.inventory = [{ itemId: item.id, count: 1 }]
    const menu = createInventoryMenu(gs, items, 'all')
    const frames = makeUiFrames()
    const fb = createFramebuffer()
    fillSentinel(fb)
    const restore = freezeNow(0)
    try {
      drawInventoryMenu({
        fb,
        state: menu,
        items,
        uiSpriteFrames: frames,
        glyphs: positionGlyphs,
        noDesc: true,
      })
    } finally {
      restore()
    }
    const desc = textDot('诀', 0, 71, 151)
    const name = textDot('甲', 0, 15, 12)
    expect(pixel(fb, desc.x, desc.y)).toBe(SENTINEL)
    expect(pixel(fb, name.x, name.y)).toBe(MENUITEM_COLOR_SELECTED_FIRST)
    expect(menu.phase).toBe('list')
  })

  it('G06-B04 描述跟光标上的物品走，不画另一件的脚本', () => {
    const commands: Command[] = [
      { op: 'showDialog', messageIndex: 1, text: '丙', label: 'L_52011' },
      { op: 'end' },
      { op: 'showDialog', messageIndex: 2, text: '丁', label: 'L_52012' },
      { op: 'end' },
    ]
    setGlobalEvents(commands)
    const gs = makeGs()
    const first = makeItem(34, '甲', { scriptDesc: 52011, flags: { usable: true } })
    const second = makeItem(35, '乙', { scriptDesc: 52012, flags: { usable: true } })
    const items = [first, second]
    gs.inventory = [
      { itemId: first.id, count: 1 },
      { itemId: second.id, count: 1 },
    ]
    const menu = createInventoryMenu(gs, items, 'all')
    menu.cursor = 1
    const frames = makeUiFrames()
    const fb = createFramebuffer()
    fillSentinel(fb)
    const restore = freezeNow(0)
    try {
      drawInventoryMenu({ fb, state: menu, items, uiSpriteFrames: frames, glyphs: positionGlyphs })
    } finally {
      restore()
    }
    const other = textDot('丙', 0, 71, 151)
    const current = textDot('丁', 0, 71, 151)
    expect(pixel(fb, current.x, current.y)).toBe(DESC)
    expect(pixel(fb, other.x, other.y)).toBe(SENTINEL)
  })
})
