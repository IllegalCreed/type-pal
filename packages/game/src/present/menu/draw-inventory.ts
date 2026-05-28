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

import type { Item, PlayerRoles } from '@type-pal/shared'
import type { GameState } from '../../core/game-state.js'
import type { InventoryMenuState } from '../../core/menu/inventory-menu.js'
import {
  INV_ITEMS_PER_LINE, INV_ITEM_TEXT_WIDTH, INV_LINES_PER_PAGE,
} from '../../core/menu/inventory-menu.js'
import { matchesFilter } from '../../core/menu/item-select.js'
import type { IndexedImage } from '../../assets/png.js'
import type { Framebuffer } from '../framebuffer.js'
import { renderText, type GlyphTable } from '../font.js'
import { drawBox } from './draw-box.js'
import { drawNumber } from '../draw-number.js'
import {
  getPlayerAttackStrength,
  getPlayerDefense,
  getPlayerDexterity,
  getPlayerFleeRate,
  getPlayerMagicStrength,
} from '../../core/equip-effect.js'
import { getSharedCommands, getSharedLabelMap } from '../../core/event-system.js'

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

/**
 * 从 shared.json 取 item.wScriptDesc chain 内所有 showDialog text 行 —
 * sdlpal itemmenu.c:267-284 WIN95 path:从 wScriptDesc 起 entry,wOperation==0 stop。
 * 每条 0xFFFF(ts 反编译为 'showDialog')entry 是一行描述。
 *
 * 木剑 scriptDesc=40133 真值 chain:
 *   raw 0xA7 (noop) → showDialog "用木材雕刻的剑，小孩玩具。" → showDialog "武术+2 身法+3" → end
 */
function getScriptDescLines(scriptDesc: number): string[] {
  const labelMap = getSharedLabelMap()
  const ip = labelMap[`L_${scriptDesc}`]
  if (ip === undefined) return []
  const cmds = getSharedCommands()
  const lines: string[] = []
  for (let i = ip; i < cmds.length && i < ip + 32; i++) {
    const cmd = cmds[i]!
    if (cmd.op === 'end') break
    if (cmd.op === 'showDialog') {
      lines.push(cmd.text)
    }
    // 其他 op(raw 0xA7 noop / 等)跳过
  }
  return lines
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
  /** M5.6 session 3:phase='use-target' 时画 PAL_ItemUseMenu — 需 gs(取 PlayerRolesRuntime
   *  HP/MP/stat 等)+ playerRoles(取 _name)。缺省时 use-target 还是只画 list 不画 player picker。 */
  gs?: GameState
  playerRoles?: PlayerRoles
}

// sdlpal `uigame.c:1289-1473` PAL_ItemUseMenu 真值常量
const ITEMUSE_BOX = { x: 110, y: 2, rows: 7, cols: 9 }              // PAL_CreateBox(PAL_XY(110, 2), 7, 9, 0, FALSE)
const ITEMUSE_STAT_LABEL_X = 200
const ITEMUSE_STAT_VALUE_X = 240
const ITEMUSEMENU_COLOR_STATLABEL = 0xBB                            // sdlpal ui.h:120
const ITEMUSE_NAME_X = 125
const ITEMUSE_NAME_Y_BASE = 16
const ITEMUSE_NAME_LINE_HEIGHT = 20                                 // PAL_XY(125, 16 + 20*i)
const ITEMUSE_ITEMBOX_POS = { x: 120, y: 80 }                        // SPRITENUM_ITEMBOX=70
const ITEMUSE_ITEM_ICON = { x: 127, y: 88 }                          // BALL bitmap
const ITEMUSE_ITEM_NAME_POS = { x: 116, y: 143 }                     // PAL_GetWord(wItemToUse)
const ITEMUSE_ITEM_AMOUNT = { x: 170, y: 133 }                       // PAL_DrawNumber(amount, 2, ..., cyan, right)
const ITEMUSE_HP_SLASH = { x: 263, y: 38 }                           // SPRITENUM_SLASH=39 / 2 row spacing
const ITEMUSE_MP_SLASH = { x: 263, y: 56 }
const STATUS_COLOR_EQUIPMENT = 0xBE                                  // sdlpal ui.h:97
const SPRITENUM_SLASH = 39

/**
 * sdlpal `uigame.c:1289-1473` PAL_ItemUseMenu 1:1 port — phase='use-target' 时叠加画。
 *
 * 真值布局:
 *  - box PAL_XY(110, 2) 7×9
 *  - 右侧 stat label/value(LEVEL/HP/MP/ATK/MAG/RES/DEX/FLEE)
 *  - 左侧 5 player names PAL_XY(125, 16+20*i),selected 用 MENUITEM_COLOR_SELECTED 闪烁
 *  - 底部 ITEMBOX sprite at (120, 80) + BALL icon at (127, 88) + 物品名 at (116, 143) + amount
 */
function drawItemUseMenu(
  fb: Framebuffer,
  state: InventoryMenuState,
  items: Item[],
  uiSpriteFrames: IndexedImage[],
  glyphs: GlyphTable | undefined,
  itemIcons: Map<number, IndexedImage> | undefined,
  gs: GameState,
  playerRoles: PlayerRoles,
): void {
  if (!state.targetMenu || state.selectedItemId === undefined) return
  const selectedItem = items.find((it) => it.id === state.selectedItemId)
  if (!selectedItem) return

  // 1. box(sdlpal uigame.c:1328 PAL_CreateBox(PAL_XY(110, 2), 7, 9, 0, FALSE))
  drawBox({
    fb, x: ITEMUSE_BOX.x, y: ITEMUSE_BOX.y,
    rows: ITEMUSE_BOX.rows, cols: ITEMUSE_BOX.cols, style: 0,
    uiSpriteFrames,
  })

  // 2. 右侧 8 stat labels(uigame.c:1333-1348)— 等距 18px
  //    flat[id] 真值(verify lookup/words.json):48=修行 49=体力 50=真气 51=武术 52=灵力 53=防御 54=身法 55=吉运
  const STAT_LABELS = ['修行', '体力', '真气', '武术', '灵力', '防御', '身法', '吉运'] as const
  for (let i = 0; i < STAT_LABELS.length; i++) {
    renderText(fb, STAT_LABELS[i]!, ITEMUSE_STAT_LABEL_X, 16 + 18 * i, ITEMUSEMENU_COLOR_STATLABEL, glyphs, true)
  }

  // 3. 当前 cursor player 的 stat values(uigame.c:1350-1378)
  const cursorIdx = state.targetMenu.cursor
  const sel = state.targetMenu.items[cursorIdx]
  if (sel) {
    const roleId = sel.id
    const runtime = gs.PlayerRolesRuntime
    const level = runtime.rgwLevel[roleId] ?? 0
    const hp = runtime.rgwHP[roleId] ?? 0
    const maxHP = runtime.rgwMaxHP[roleId] ?? 0
    const mp = runtime.rgwMP[roleId] ?? 0
    const maxMP = runtime.rgwMaxMP[roleId] ?? 0
    // C5(2026-05-28)真 effective stat:base + Σ rgEquipmentEffect[i] —
    // sdlpal uigame.c:1369-1378 真值 `PAL_GetPlayerAttackStrength` 等。
    const atk = getPlayerAttackStrength(gs, roleId)
    const mag = getPlayerMagicStrength(gs, roleId)
    const def = getPlayerDefense(gs, roleId)
    const dex = getPlayerDexterity(gs, roleId)
    const flee = getPlayerFleeRate(gs, roleId)

    // uigame.c:1352:level (4 位 yellow right)
    drawNumber(fb, level, 4, { x: ITEMUSE_STAT_VALUE_X, y: 20 }, 'yellow', 'right', uiSpriteFrames)

    // uigame.c:1355-1360:slash sprite + maxHP(blue 4 位)+ HP(yellow 4 位)
    const slashFrame = uiSpriteFrames[SPRITENUM_SLASH]
    if (slashFrame) blitSpriteOpaque(fb, slashFrame, ITEMUSE_HP_SLASH.x, ITEMUSE_HP_SLASH.y)
    drawNumber(fb, maxHP, 4, { x: 261, y: 40 }, 'blue', 'right', uiSpriteFrames)
    drawNumber(fb, hp,    4, { x: ITEMUSE_STAT_VALUE_X, y: 37 }, 'yellow', 'right', uiSpriteFrames)

    // uigame.c:1362-1367:同上 MP
    if (slashFrame) blitSpriteOpaque(fb, slashFrame, ITEMUSE_MP_SLASH.x, ITEMUSE_MP_SLASH.y)
    drawNumber(fb, maxMP, 4, { x: 261, y: 58 }, 'blue', 'right', uiSpriteFrames)
    drawNumber(fb, mp,    4, { x: ITEMUSE_STAT_VALUE_X, y: 55 }, 'yellow', 'right', uiSpriteFrames)

    // 5 stat numbers(uigame.c:1369-1378)— PAL_XY(240, 74/92/110/128/146)
    drawNumber(fb, atk,  4, { x: ITEMUSE_STAT_VALUE_X, y: 74  }, 'yellow', 'right', uiSpriteFrames)
    drawNumber(fb, mag,  4, { x: ITEMUSE_STAT_VALUE_X, y: 92  }, 'yellow', 'right', uiSpriteFrames)
    drawNumber(fb, def,  4, { x: ITEMUSE_STAT_VALUE_X, y: 110 }, 'yellow', 'right', uiSpriteFrames)
    drawNumber(fb, dex,  4, { x: ITEMUSE_STAT_VALUE_X, y: 128 }, 'yellow', 'right', uiSpriteFrames)
    drawNumber(fb, flee, 4, { x: ITEMUSE_STAT_VALUE_X, y: 146 }, 'yellow', 'right', uiSpriteFrames)
  }

  // 4. party member names(uigame.c:1383-1396)
  state.targetMenu.items.forEach((memberItem, i) => {
    const role = playerRoles.roles[memberItem.id]
    const name = role?._name ?? `role#${memberItem.id}`
    const color = i === cursorIdx ? selectedColor() : MENUITEM_COLOR
    renderText(fb, name, ITEMUSE_NAME_X, ITEMUSE_NAME_Y_BASE + ITEMUSE_NAME_LINE_HEIGHT * i, color, glyphs, true)
  })

  // 5. ITEMBOX sprite at (120, 80)(uigame.c:1398)
  const itemboxFrame = uiSpriteFrames[SPRITENUM_ITEMBOX]
  if (itemboxFrame) {
    blitSpriteShadow(fb, itemboxFrame, ITEMUSE_ITEMBOX_POS.x + 5, ITEMUSE_ITEMBOX_POS.y + 5)
    blitSpriteOpaque(fb, itemboxFrame, ITEMUSE_ITEMBOX_POS.x, ITEMUSE_ITEMBOX_POS.y)
  }

  // 6. BALL icon at (127, 88)(uigame.c:1408-1412)+ 物品名 + amount
  if (itemIcons) {
    const icon = itemIcons.get(selectedItem.bitmap)
    if (icon) blitSpriteOpaque(fb, icon, ITEMUSE_ITEM_ICON.x, ITEMUSE_ITEM_ICON.y)
  }
  // 物品名 at (116, 143),color = STATUS_COLOR_EQUIPMENT 0xBE,fShadow=TRUE
  renderText(fb, selectedItem._name ?? `?${selectedItem.id}`, ITEMUSE_ITEM_NAME_POS.x, ITEMUSE_ITEM_NAME_POS.y, STATUS_COLOR_EQUIPMENT, glyphs, true)
  // amount — sdlpal `uigame.c:1401` 真值 `i = PAL_GetItemAmount(wItemToUse)` 每帧 live 读
  // gpGlobals->rgInventory,**不用** state.inventory snapshot(否则用一次后 picker 始终显
  // 旧 amount,看起来"道具没减")。
  const invEntry = gs.inventory.find((e) => e.itemId === selectedItem.id)
  const amount = invEntry?.count ?? 0
  if (amount > 0) {
    drawNumber(fb, amount, 2, ITEMUSE_ITEM_AMOUNT, 'cyan', 'right', uiSpriteFrames)
  }
}

export function drawInventoryMenu(input: DrawInventoryInput): void {
  const { fb, state, items, uiSpriteFrames, itemIcons, glyphs, gs, playerRoles } = input

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
      // sdlpal itemmenu.c:171 真值:`!(item.wFlags & g_wItemFlags) || nAmount <= nAmountInUse`
      // → 不满足 menu 入口 filter(equip/usable/...)就是 inactive。
      // 修(2026-05-29 session 4 user 怒怼"李逍遥能装的木剑红色"):**用 state.filter 判 filter
      // 命中**,而不是 hardcode `flags.usable` — EquipMenu 复用本 fn 时 filter='equip',原版误把
      // 装备类全标 INACTIVE 红色,equipable 才被当 "selectable usable"。
      const isUsable = item != null && diff > 0 && matchesFilter(item, state.filter)
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

  // 6. 物品描述(sdlpal itemmenu.c:231-285 WIN95 path)— 跑 item.wScriptDesc chain
  //    取所有 showDialog text 渲染到底部描述区(sdlpal `PAL_ITEM_DESC_BOTTOM` flag → x=71 y=151
  //    每行 +16,DESCTEXT_COLOR 0x3C,fShadow=TRUE)。
  //    脚本 chain 由 pal-extract 反编译时把 sdlpal opcode 0xFFFF(WIN95 message draw,script.c:3607-3637)
  //    转为 'showDialog' op 带 inline text — 直接遍历即可,不需要解 message 文件。
  const curSlot = state.inventory[state.cursor]
  if (curSlot) {
    const curItem = items.find((it) => it.id === curSlot.itemId)
    const sid = curItem?.scriptDesc ?? 0
    if (sid !== 0) {
      const lines = getScriptDescLines(sid)
      for (let li = 0; li < lines.length; li++) {
        renderText(fb, lines[li]!, 71, 151 + li * 16, DESCTEXT_COLOR, glyphs, true)
      }
    }
  }

  // M5.6 session 3:phase='use-target' → 叠加画 PAL_ItemUseMenu(uigame.c:1289-1473)。
  // user 反馈"使用物品时并没有弹出选择角色的 UI" — confirmInventoryItem 已切 phase
  // 但渲染层没接,本次补。需 gs + playerRoles(catalog),draw-menu.ts 转发。
  if (state.phase === 'use-target' && gs && playerRoles) {
    drawItemUseMenu(fb, state, items, uiSpriteFrames, glyphs, itemIcons, gs, playerRoles)
  }
}
