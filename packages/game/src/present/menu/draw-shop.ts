/**
 * 商店买 / 卖菜单渲染 — sdlpal `uigame.c:1503 PAL_BuyMenu_OnItemChange` + `uigame.c:1615 PAL_BuyMenu`
 * 1:1 port。
 *
 * sdlpal PAL_BuyMenu 真值布局:
 *  - 列表 box: PAL_CreateBox(PAL_XY(122, 8), 8, 8, 1, FALSE)
 *  - 每项名 PAL_XY(150, 21 + i*18)(PAL_ReadMenu,selected 闪烁)
 *  - 每项价 PAL_DrawNumber(price, 6, PAL_XY(238, 26 + i*18), yellow, right)
 *  - 预览(OnItemChange,当前选中项):
 *    - ITEMBOX(SPRITEUI 70)shadow@(46,14) + 正色@(40,8)
 *    - BALL 图标(item.wBitmap)@(48,15)
 *    - "现有" 单行框@(20,100) len5;label@(30,110) color0 无影;数@(69,115) yellow right 6
 *    - "金钱" 单行框@(20,141) len5;label@(30,151);dwCash@(69,156) yellow right 6
 *
 * 卖菜单(0x0027 PAL_SellMenu)sdlpal 真值复用 fullscreen PAL_ItemSelectMenu;此处用同一紧凑布局
 * 渲染(list=可卖物品,价=售价 price/2),功能等价 — 视觉非 sdlpal fullscreen picker(已向 user 说明)。
 */

import type { Item } from '@type-pal/shared'
import type { GameState } from '../../core/game-state.js'
import type { ShopMenuState } from '../../core/menu/shop-menu.js'
import type { IndexedImage } from '../../assets/png.js'
import type { Framebuffer } from '../framebuffer.js'
import { renderText, type GlyphTable } from '../font.js'
import { drawBox, drawSingleLineBox } from './draw-box.js'
import { drawNumber } from '../draw-number.js'

// sdlpal ui.h 真值色
const MENUITEM_COLOR = 0x4F
const MENUITEM_COLOR_SELECTED_FIRST = 0xF9
const MENUITEM_COLOR_SELECTED_TOTAL = 6
const SPRITENUM_ITEMBOX = 70 // ui.h:110

// sdlpal uigame.c PAL_BuyMenu / OnItemChange 真值坐标
const LIST_BOX = { x: 122, y: 8, rows: 8, cols: 8 } // PAL_CreateBox(PAL_XY(122,8), 8, 8, 1, FALSE)
const ITEM_NAME = { x: 150, yBase: 21, lineH: 18 }
const ITEM_PRICE_X = 238
const ITEM_PRICE_Y_BASE = 26
const PREVIEW_ITEMBOX = { x: 40, y: 8 }
const PREVIEW_ICON = { x: 48, y: 15 }
const OWNED_BOX = { x: 20, y: 100, len: 5 }
const CASH_BOX = { x: 20, y: 141, len: 5 }

function selectedColor(): number {
  return MENUITEM_COLOR_SELECTED_FIRST + Math.floor(Date.now() / 100) % MENUITEM_COLOR_SELECTED_TOTAL
}

/** opaque blit(同 draw-inventory)。 */
function blitSpriteOpaque(fb: Framebuffer, frame: IndexedImage, dstX: number, dstY: number): void {
  for (let y = 0; y < frame.height; y++) {
    for (let x = 0; x < frame.width; x++) {
      const off = y * frame.width + x
      if (frame.opaque[off]! > 0) fb.writePixel(dstX + x, dstY + y, frame.indices[off]!)
    }
  }
}

/** shadow blit — palCalcShadowColor(curr)(sdlpal palcommon.c:201)。 */
function blitSpriteShadow(fb: Framebuffer, frame: IndexedImage, dstX: number, dstY: number): void {
  for (let y = 0; y < frame.height; y++) {
    for (let x = 0; x < frame.width; x++) {
      const off = y * frame.width + x
      if (frame.opaque[off]! <= 0) continue
      const fbX = dstX + x
      const fbY = dstY + y
      if (fbX < 0 || fbX >= fb.width || fbY < 0 || fbY >= fb.height) continue
      const cur = fb.indices[fbY * fb.width + fbX]!
      fb.writePixel(fbX, fbY, (cur & 0xF0) | ((cur & 0x0F) >> 1))
    }
  }
}

/** "现有" 数 = inventory 数 + 全队已装备数(sdlpal uigame.c:1554-1577)。 */
function ownedCount(gs: GameState, itemId: number): number {
  let n = gs.inventory.find((e) => e.itemId === itemId)?.count ?? 0
  const eq = gs.PlayerRolesRuntime.rgwEquipment
  for (const role of gs.partyMembers) {
    for (let slot = 0; slot < eq.length; slot++) {
      if (eq[slot]?.[role] === itemId) n++
    }
  }
  return n
}

export interface DrawShopInput {
  fb: Framebuffer
  state: ShopMenuState
  gs: GameState
  /** items catalog(查 wBitmap 图标;价格已在 list.rightText)。 */
  items: Item[]
  uiSpriteFrames: IndexedImage[]
  itemIcons?: Map<number, IndexedImage>
  glyphs?: GlyphTable
}

export function drawShopMenu(input: DrawShopInput): void {
  const { fb, state, gs, items, uiSpriteFrames, itemIcons, glyphs } = input
  const list = state.list

  // 1. 列表 box(sdlpal PAL_CreateBox(PAL_XY(122,8), 8, 8, 1, FALSE))
  drawBox({
    fb, x: LIST_BOX.x, y: LIST_BOX.y,
    rows: LIST_BOX.rows, cols: LIST_BOX.cols, style: 1,
    uiSpriteFrames,
  })

  // 2. 列表项名 + 价(sdlpal uigame.c:1665-1669 价 DrawNumber;PAL_ReadMenu 画名)
  list.items.forEach((it, i) => {
    const y = ITEM_NAME.yBase + i * ITEM_NAME.lineH
    const color = i === list.cursor ? selectedColor() : MENUITEM_COLOR
    renderText(fb, it.label, ITEM_NAME.x, y, color, glyphs, true)
    const price = Number(it.rightText ?? '0')
    drawNumber(
      fb, price, 6,
      { x: ITEM_PRICE_X, y: ITEM_PRICE_Y_BASE + i * ITEM_NAME.lineH },
      'yellow', 'right', uiSpriteFrames,
    )
  })

  // 3. 预览窗(OnItemChange,当前选中项)
  const sel = list.items[list.cursor]
  const selItem = sel ? items.find((it) => it.id === sel.id) : undefined

  // ITEMBOX sprite(shadow + 正色)
  const itembox = uiSpriteFrames[SPRITENUM_ITEMBOX]
  if (itembox) {
    blitSpriteShadow(fb, itembox, PREVIEW_ITEMBOX.x + 6, PREVIEW_ITEMBOX.y + 6)
    blitSpriteOpaque(fb, itembox, PREVIEW_ITEMBOX.x, PREVIEW_ITEMBOX.y)
  }
  // BALL 图标(sdlpal uigame.c:1545-1549)
  if (selItem && itemIcons) {
    const icon = itemIcons.get(selItem.bitmap)
    if (icon) blitSpriteOpaque(fb, icon, PREVIEW_ICON.x, PREVIEW_ICON.y)
  }

  // "现有" 框 + 数(BUYMENU_LABEL_CURRENT=35 WORD.DAT="现有")
  drawSingleLineBox({ fb, x: OWNED_BOX.x, y: OWNED_BOX.y, len: OWNED_BOX.len, uiSpriteFrames })
  renderText(fb, '现有', OWNED_BOX.x + 10, OWNED_BOX.y + 10, 0, glyphs, false)
  const owned = selItem ? ownedCount(gs, selItem.id) : 0
  drawNumber(fb, owned, 6, { x: OWNED_BOX.x + 49, y: OWNED_BOX.y + 15 }, 'yellow', 'right', uiSpriteFrames)

  // "金钱" 框 + dwCash(CASH_LABEL=21 WORD.DAT="金钱")
  drawSingleLineBox({ fb, x: CASH_BOX.x, y: CASH_BOX.y, len: CASH_BOX.len, uiSpriteFrames })
  renderText(fb, '金钱', CASH_BOX.x + 10, CASH_BOX.y + 10, 0, glyphs, false)
  drawNumber(fb, gs.dwCash, 6, { x: CASH_BOX.x + 49, y: CASH_BOX.y + 15 }, 'yellow', 'right', uiSpriteFrames)

  // 4. confirm 阶段:yes/no 框(sdlpal PAL_ConfirmMenu = PAL_SelectionMenu(2, 0, {否,是}))
  //    两 SingleLineBox 在 (130,100) / (205,100),文字 (145,110) / (220,110),默认 No。
  if (state.phase === 'confirm') {
    drawConfirmBox(fb, state.confirmYes, uiSpriteFrames, glyphs)
  }
}

/** sdlpal PAL_ConfirmMenu / PAL_SelectionMenu(uigame.c:242-340)— 否(145,110)/ 是(220,110)。 */
function drawConfirmBox(
  fb: Framebuffer,
  confirmYes: boolean,
  uiSpriteFrames: IndexedImage[],
  glyphs?: GlyphTable,
): void {
  // box: PAL_CreateSingleLineBox(PAL_XY(130 + 75*(i%2), 100 + 50*(i/2)), w+1, TRUE)
  drawSingleLineBox({ fb, x: 130, y: 100, len: 2, uiSpriteFrames })
  drawSingleLineBox({ fb, x: 205, y: 100, len: 2, uiSpriteFrames })
  // 文字 PAL_XY(145, 110) / PAL_XY(220, 110);selected 闪烁(默认 No=index0)
  const noColor = !confirmYes ? selectedColor() : MENUITEM_COLOR
  const yesColor = confirmYes ? selectedColor() : MENUITEM_COLOR
  renderText(fb, '否', 145, 110, noColor, glyphs, true)
  renderText(fb, '是', 220, 110, yesColor, glyphs, true)
}
