/**
 * M5.6 T10b:InventoryMenu fullscreen UI 渲染 — sdlpal `itemmenu.c:28-310`
 * PAL_ItemSelectMenuUpdate 真值 1:1 port。
 *
 * sdlpal 真值布局(中文 dwWordLength=10 默认):
 *  - Box: PAL_CreateBoxWithShadow(PAL_XY(2, 0), 6, 17, style=1, FALSE, shadowOffset=0)
 *  - iItemsPerLine = 3,iItemTextWidth = 100,iLinesPerPage = 7
 *  - 每 item label 起 (15 + k*100, 12 + j*18),fShadow=TRUE
 *  - iPageLineOffset = (7+1)/2 = 4 → cursor 在 page 中目标行位置
 *  - selected 时:
 *    - ITEMBOX(SPRITEUI 70) shadow blit at (0+5, 140+5), 正色 blit at (0, 140)
 *    - BALL bitmap at (0+8, 140+7) — item.wBitmap → itemIcons map lookup
 *  - 数量(if diff > 1):drawNumber(diff, 2, (15+81+k*100, 17+j*18), 'cyan', 'right')
 *    iAmountXOffset = 8*10+1 = 81
 *  - CURSOR(SPRITEUI 69) blit at cursorPos = (15 + 25 + k*100, 22 + j*18)
 *    iCursorXOffset = 10*5/2 = 25
 *
 * Color rules(itemmenu.c:135-181 真值):
 *  - non-selected,non-usable → MENUITEM_COLOR_INACTIVE(0x18)
 *  - non-selected,equipped(amount==0)→ MENUITEM_COLOR_EQUIPPEDITEM(0xC8)
 *  - non-selected,usable → MENUITEM_COLOR(0x4F)
 *  - selected,non-usable → MENUITEM_COLOR_SELECTED_INACTIVE(0x1C)
 *  - selected,equipped → MENUITEM_COLOR_EQUIPPEDITEM(0xC8)
 *  - selected,usable → MENUITEM_COLOR_SELECTED(0xF9 + tick/100 % 6 闪烁)
 */

import type { Item } from '@type-pal/shared'
import type { InventoryMenuState } from '../../core/menu/inventory-menu.js'
import {
  INV_ITEMS_PER_LINE, INV_ITEM_TEXT_WIDTH, INV_LINES_PER_PAGE,
} from '../../core/menu/inventory-menu.js'
import type { IndexedImage } from '../../assets/png.js'
import type { Framebuffer } from '../framebuffer.js'
import { renderText, type GlyphTable } from '../font.js'
import { drawBox } from './draw-box.js'
import { drawNumber } from '../draw-number.js'

// sdlpal ui.h 真值色
const MENUITEM_COLOR = 0x4F
const MENUITEM_COLOR_INACTIVE = 0x18
const MENUITEM_COLOR_SELECTED_INACTIVE = 0x1C
const MENUITEM_COLOR_EQUIPPEDITEM = 0xC8
const MENUITEM_COLOR_SELECTED_FIRST = 0xF9
const MENUITEM_COLOR_SELECTED_TOTAL = 6
const DESCTEXT_COLOR = 0x3C

// sdlpal ui.h:110/114
const SPRITENUM_ITEMBOX = 70
const SPRITENUM_CURSOR = 69

// sdlpal itemmenu.c:54-57 真值 derived(中文 dwWordLength=10)
const INV_CURSOR_X_OFFSET = 25 // 10 * 5 / 2
const INV_AMOUNT_X_OFFSET = 81 // 10 * 8 + 1
const INV_PAGE_LINE_OFFSET = Math.floor((INV_LINES_PER_PAGE + 1) / 2) // 4
const ITEMBOX_XBASE = 0
const ITEMBOX_YBASE = 140

function selectedColor(): number {
  return MENUITEM_COLOR_SELECTED_FIRST + Math.floor(Date.now() / 100) % MENUITEM_COLOR_SELECTED_TOTAL
}

/** sprite blit (opaque mask)— 复用 draw-sprite 风格,直接内嵌轻量版本。 */
function blitSpriteOpaque(fb: Framebuffer, frame: IndexedImage, dstX: number, dstY: number): void {
  for (let y = 0; y < frame.height; y++) {
    for (let x = 0; x < frame.width; x++) {
      const off = y * frame.width + x
      if (frame.opaque[off]! > 0) {
        fb.writePixel(dstX + x, dstY + y, frame.indices[off]!)
      }
    }
  }
}

/** shadow blit — palCalcShadowColor(curr) 替换 fb 当前 pixel(sdlpal palcommon.c:201)。 */
function blitSpriteShadow(fb: Framebuffer, frame: IndexedImage, dstX: number, dstY: number): void {
  for (let y = 0; y < frame.height; y++) {
    for (let x = 0; x < frame.width; x++) {
      const off = y * frame.width + x
      if (frame.opaque[off]! > 0) {
        const fbX = dstX + x
        const fbY = dstY + y
        if (fbX < 0 || fbX >= fb.width || fbY < 0 || fbY >= fb.height) continue
        const cur = fb.indices[fbY * fb.width + fbX]!
        fb.writePixel(fbX, fbY, (cur & 0xF0) | ((cur & 0x0F) >> 1))
      }
    }
  }
}

export interface DrawInventoryInput {
  fb: Framebuffer
  state: InventoryMenuState
  /** OBJECT 表(items 元数据,用于查 wBitmap / usable flag)。 */
  items: Item[]
  uiSpriteFrames: IndexedImage[]
  itemIcons?: Map<number, IndexedImage>
  glyphs?: GlyphTable
}

export function drawInventoryMenu(input: DrawInventoryInput): void {
  const { fb, state, items, uiSpriteFrames, itemIcons, glyphs } = input

  // 1. Box — sdlpal itemmenu.c:117 真值 PAL_CreateBoxWithShadow(PAL_XY(2, 0), 6, 17, style=1, FALSE, 0)
  drawBox({
    fb, x: 2, y: 0,
    rows: INV_LINES_PER_PAGE - 1, cols: 17, style: 1,
    shadowOffset: 0,
    uiSpriteFrames,
  })

  // 2. 计算 page 起 idx(sdlpal itemmenu.c:122-126)
  //    i = cursor / iItemsPerLine * iItemsPerLine - iItemsPerLine * iPageLineOffset
  let pageStart = Math.floor(state.cursor / INV_ITEMS_PER_LINE) * INV_ITEMS_PER_LINE
    - INV_ITEMS_PER_LINE * INV_PAGE_LINE_OFFSET
  if (pageStart < 0) pageStart = 0

  let cursorScreenPos = { x: 15 + INV_CURSOR_X_OFFSET, y: 22 } // 默认(cursor 在第 0 行第 0 列)

  // 3. 画 page 内 items(sdlpal itemmenu.c:130-219)
  let i = pageStart
  outerLoop: for (let j = 0; j < INV_LINES_PER_PAGE; j++) {
    for (let k = 0; k < INV_ITEMS_PER_LINE; k++) {
      if (i >= state.inventory.length) break outerLoop
      const slot = state.inventory[i]!
      const item = items.find((it) => it.id === slot.itemId)
      const isSelected = i === state.cursor
      const diff = slot.count - slot.inUse
      // sdlpal usable check:item.flags & g_wItemFlags & 该 menu 期望的 flag。
      // ts 简版:list 默认 usable filter,不可用 = 装备中 (count<=inUse) 或 item 缺
      const isUsable = item != null && diff > 0 && item.flags.usable
      const isEquipped = slot.count === 0

      // 6 case 颜色规则(sdlpal itemmenu.c:135-181)
      let color: number
      if (isSelected) {
        if (!isUsable) color = MENUITEM_COLOR_SELECTED_INACTIVE
        else if (isEquipped) color = MENUITEM_COLOR_EQUIPPEDITEM
        else color = selectedColor()
      }
      else {
        if (!isUsable) color = MENUITEM_COLOR_INACTIVE
        else if (isEquipped) color = MENUITEM_COLOR_EQUIPPEDITEM
        else color = MENUITEM_COLOR
      }

      // Item label — sdlpal itemmenu.c:187 PAL_DrawText fShadow=TRUE
      const labelX = 15 + k * INV_ITEM_TEXT_WIDTH
      const labelY = 12 + j * 18
      const label = item?._name ?? `?${slot.itemId}`
      renderText(fb, label, labelX, labelY, color, glyphs, true)

      if (isSelected) {
        // 4. ITEMBOX sprite + BALL bitmap(sdlpal itemmenu.c:196-205)
        cursorScreenPos = { x: 15 + INV_CURSOR_X_OFFSET + k * INV_ITEM_TEXT_WIDTH, y: 22 + j * 18 }
        const itembox = uiSpriteFrames[SPRITENUM_ITEMBOX]
        if (itembox) {
          // sdlpal 真值:shadow at (xBase+5, yBase+5);正色 at (xBase, yBase)
          blitSpriteShadow(fb, itembox, ITEMBOX_XBASE + 5, ITEMBOX_YBASE + 5)
          blitSpriteOpaque(fb, itembox, ITEMBOX_XBASE, ITEMBOX_YBASE)
        }
        if (item && itemIcons) {
          const icon = itemIcons.get(item.bitmap)
          if (icon) {
            // sdlpal itemmenu.c:204 真值 (xBase+8, yBase+7)
            blitSpriteOpaque(fb, icon, ITEMBOX_XBASE + 8, ITEMBOX_YBASE + 7)
          }
        }
      }

      // 数量(sdlpal itemmenu.c:211-215):if diff > 1,DrawNumber cyan right-align
      if (diff > 1) {
        drawNumber(
          fb, diff, 2,
          { x: 15 + INV_AMOUNT_X_OFFSET + k * INV_ITEM_TEXT_WIDTH, y: 17 + j * 18 },
          'cyan', 'right', uiSpriteFrames,
        )
      }

      i++
    }
  }

  // 5. Cursor sprite — sdlpal itemmenu.c:224 真值
  const cursorFrame = uiSpriteFrames[SPRITENUM_CURSOR]
  if (cursorFrame) {
    blitSpriteOpaque(fb, cursorFrame, cursorScreenPos.x, cursorScreenPos.y)
  }

  // 6. 物品描述(sdlpal itemmenu.c:231-285)— WIN95 走 scriptDesc(M6 真做);
  //    简版:画 item _name 一行做占位(sdlpal 描述真做留 follow-up,需 RunAutoScript 真接入)
  const curSlot = state.inventory[state.cursor]
  if (curSlot) {
    const curItem = items.find((it) => it.id === curSlot.itemId)
    if (curItem) {
      renderText(fb, curItem._name ?? '', 75, 150, DESCTEXT_COLOR, glyphs, true)
    }
  }
}
