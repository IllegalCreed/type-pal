/**
 * C7(2026-05-29):InGameMagicMenu fullscreen UI —
 * sdlpal `uigame.c:653-875` PAL_InGameMagicMenu 1:1 port +
 * sdlpal `magicmenu.c:36-484` PAL_MagicSelectionMenu* 1:1 port +
 * sdlpal `uibattle.c:31-269` PAL_PlayerInfoBox 1:1 port。
 *
 * 渲染分阶段:
 *  1. phase='pick-caster':
 *     - 4 个 PlayerInfoBox at y=165(uigame.c:686-693:每 78 px,起点 x=45)
 *     - caster picker box at (35, 62)(uigame.c:717),含 4 caster name 灰色/亮选
 *
 *  2. phase='pick-spell':
 *     - 4 个 PlayerInfoBox at y=165(magicmenu.c:450-457 真值)
 *     - magic 描述区 cash box / MP box at top(magicmenu.c:128-216)
 *     - magic grid box at (10, 42)(magicmenu.c:121)
 *     - magic name list 4×iItemsPerLine grid + cursor(magicmenu.c:228-275)
 *
 *  3. phase='pick-target':
 *     - 同 pick-spell 的 grid + magic + 4 PlayerInfoBox
 *     - 额外:cursor sprite SPRITENUM_CURSOR_UP at PlayerInfoBox 顶 (75+78*i, 158)
 *       (uigame.c:793-796 真值)
 *
 * sdlpal UI sprite 真值:
 *  - SPRITENUM_PLAYERINFOBOX=18:player 信息框背景
 *  - SPRITENUM_PLAYERFACE_FIRST=48:player 头像起,+roleId
 *  - SPRITENUM_SLASH=39:HP/MP "/"
 *  - SPRITENUM_CURSOR=69:menu 项 cursor
 *  - SPRITENUM_CURSOR_UP=67:player target picker 上方箭头
 */

import type { Magic, PlayerRoles, Spell } from '@type-pal/shared'
import type { IndexedImage } from '../../assets/png.js'
import type { GameState } from '../../core/game-state.js'
import type { InGameMagicMenuState } from '../../core/menu/in-game-magic-menu.js'
import {
  MENUITEM_COLOR,
  MENUITEM_COLOR_INACTIVE,
  MENUITEM_COLOR_SELECTED_FIRST,
  MENUITEM_COLOR_SELECTED_INACTIVE,
  MENUITEM_COLOR_SELECTED_TOTAL,
} from '../../core/menu/inventory-menu.js'
import { drawBox, drawSingleLineBox } from './draw-box.js'
import { drawNumber } from '../draw-number.js'
import { renderText, type GlyphTable } from '../font.js'
import type { Framebuffer } from '../framebuffer.js'

// ── sdlpal ui.h sprite 真值 ────────────────────────────────────────────────
const SPRITENUM_PLAYERINFOBOX = 18
const SPRITENUM_PLAYERFACE_FIRST = 48
const SPRITENUM_SLASH = 39
const SPRITENUM_CURSOR = 69
const SPRITENUM_CURSOR_UP = 67

// PlayerInfoBox y=165 起,每 78px 一个(uigame.c:686-693)
const PLAYERINFO_Y_BASE = 165
const PLAYERINFO_X_BASE = 45
const PLAYERINFO_X_STEP = 78

// caster picker box(uigame.c:717 真值)
const CASTER_PICKER_BOX = { x: 35, y: 62 }
const CASTER_PICKER_ITEM_START = { x: 48, y: 75 }
const CASTER_PICKER_LINE = 18

// pick-spell 顶部 cash + MP box(magicmenu.c:128-142)
// cash box at (0, 0) len=5;MP box at (215, 0) len=5
const CASH_BOX = { x: 0, y: 0, len: 5 }
const CASH_LABEL = { x: 10, y: 10 }
const CASH_NUMBER_RIGHT = { x: 49, y: 14 }
const MP_BOX = { x: 215, y: 0, len: 5 }
const MP_NEEDED_RIGHT = { x: 230, y: 14 }
const MP_SLASH = { x: 260, y: 14 }
const MP_CURRENT_RIGHT = { x: 265, y: 14 }

// magic grid box(magicmenu.c:121)
const MAGIC_GRID_BOX = { x: 10, y: 42 }
const MAGIC_GRID_ITEM_START = { x: 35, y: 54 }
const MAGIC_CURSOR_X_OFFSET = 25 // dwWordLength=10 * 5/2
const MAGIC_ITEMS_PER_LINE = 3
const MAGIC_LINES_PER_PAGE = 5
const MAGIC_ITEM_TEXT_WIDTH = 87 // 8*10+7

// player target picker cursor(uigame.c:793-796:PAL_XY(75 + 78 * wPlayer, 158))
const PICKER_CURSOR_Y = 158
const PICKER_CURSOR_X_BASE = 75

function selectedColor(): number {
  return MENUITEM_COLOR_SELECTED_FIRST + (Math.floor(Date.now() / 100) % MENUITEM_COLOR_SELECTED_TOTAL)
}

// ── sprite blit(opaque mask) ─────────────────────────────────────────────
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

/**
 * sdlpal uibattle.c:31-269 PAL_PlayerInfoBox 简版渲染 — 大世界 magic menu 4 个 player info。
 *
 * 真值:
 *  - SPRITENUM_PLAYERINFOBOX (frame 18) at pos
 *  - player face SPRITENUM_PLAYERFACE_FIRST+role at (x-2, y-4)
 *  - PAL_CLASSIC HP/MP:slash at (x+49, y+6/22),HP(yellow 4 at x+26/47, y+5/8),
 *    MP(cyan 4 at x+26/47, y+21/24)
 *  - 中毒颜色用 RLEBlitMonoColor(简版省略)
 *  - status icon(confused/slow/sleep/silence)at rgStatusPos(简版省略)
 */
function drawPlayerInfoBox(
  fb: Framebuffer,
  pos: { x: number; y: number },
  roleId: number,
  gs: GameState,
  uiSpriteFrames: IndexedImage[],
): void {
  // box 背景
  const boxFrame = uiSpriteFrames[SPRITENUM_PLAYERINFOBOX]
  if (boxFrame) blitSpriteOpaque(fb, boxFrame, pos.x, pos.y)

  // player face
  const face = uiSpriteFrames[SPRITENUM_PLAYERFACE_FIRST + roleId]
  if (face) blitSpriteOpaque(fb, face, pos.x - 2, pos.y - 4)

  // HP/MP (PAL_CLASSIC layout)
  const slash = uiSpriteFrames[SPRITENUM_SLASH]
  const hp = gs.PlayerRolesRuntime.rgwHP[roleId] ?? 0
  const maxHP = gs.PlayerRolesRuntime.rgwMaxHP[roleId] ?? 0
  const mp = gs.PlayerRolesRuntime.rgwMP[roleId] ?? 0
  const maxMP = gs.PlayerRolesRuntime.rgwMaxMP[roleId] ?? 0

  if (slash) blitSpriteOpaque(fb, slash, pos.x + 49, pos.y + 6)
  drawNumber(fb, maxHP, 4, { x: pos.x + 47, y: pos.y + 8 }, 'yellow', 'right', uiSpriteFrames)
  drawNumber(fb, hp, 4, { x: pos.x + 26, y: pos.y + 5 }, 'yellow', 'right', uiSpriteFrames)

  if (slash) blitSpriteOpaque(fb, slash, pos.x + 49, pos.y + 22)
  drawNumber(fb, maxMP, 4, { x: pos.x + 47, y: pos.y + 24 }, 'cyan', 'right', uiSpriteFrames)
  drawNumber(fb, mp, 4, { x: pos.x + 26, y: pos.y + 21 }, 'cyan', 'right', uiSpriteFrames)
}

/** sdlpal uigame.c:684-693 真值:画 wMaxPartyMemberIndex+1 个 PlayerInfoBox。 */
function drawAllPlayerInfoBoxes(
  fb: Framebuffer,
  partyMembers: number[],
  gs: GameState,
  uiSpriteFrames: IndexedImage[],
): void {
  for (let i = 0; i < partyMembers.length; i++) {
    const roleId = partyMembers[i]!
    drawPlayerInfoBox(
      fb,
      { x: PLAYERINFO_X_BASE + i * PLAYERINFO_X_STEP, y: PLAYERINFO_Y_BASE },
      roleId,
      gs,
      uiSpriteFrames,
    )
  }
}

// ── pick-caster phase 渲染(uigame.c:684-723)─────────────────────────────
function drawPickCaster(input: DrawInGameMagicMenuInput): void {
  const { fb, state, gs, uiSpriteFrames, glyphs, playerRoles } = input
  drawAllPlayerInfoBoxes(fb, state.partyMembers, gs, uiSpriteFrames)

  // caster picker box(uigame.c:717:PAL_CreateBox at (35, 62),rows = wMaxPartyMemberIndex)
  const rows = Math.max(1, state.partyMembers.length - 1)
  drawBox({
    fb, x: CASTER_PICKER_BOX.x, y: CASTER_PICKER_BOX.y,
    rows, cols: 5, style: 0, uiSpriteFrames,
  })

  // 4 caster names — sdlpal `rgMenuItem[i].pos = PAL_XY(48, 75 + 18*i)`
  for (let i = 0; i < state.casterMenu.items.length; i++) {
    const it = state.casterMenu.items[i]!
    const isSelected = i === state.casterMenu.cursor
    let color: number
    if (isSelected) {
      color = it.disabled ? MENUITEM_COLOR_SELECTED_INACTIVE : selectedColor()
    } else {
      color = it.disabled ? MENUITEM_COLOR_INACTIVE : MENUITEM_COLOR
    }
    const roleId = it.id
    const role = playerRoles.roles[roleId]
    const name = role?._name ?? `role#${roleId}`
    renderText(fb, name,
      CASTER_PICKER_ITEM_START.x,
      CASTER_PICKER_ITEM_START.y + i * CASTER_PICKER_LINE,
      color, glyphs, true)
  }
}

// ── pick-spell / pick-target 顶部 cash + MP box(magicmenu.c:128-142)─────
function drawCashAndMpBox(
  fb: Framebuffer,
  gs: GameState,
  state: InGameMagicMenuState,
  spells: Spell[],
  magics: Magic[],
  uiSpriteFrames: IndexedImage[],
  glyphs?: GlyphTable,
): void {
  // cash box(magicmenu.c:130-132)
  drawSingleLineBox({ fb, x: CASH_BOX.x, y: CASH_BOX.y, len: CASH_BOX.len, uiSpriteFrames })
  renderText(fb, '金钱', CASH_LABEL.x, CASH_LABEL.y, 0, glyphs, false)
  drawNumber(fb, gs.dwCash, 6, CASH_NUMBER_RIGHT, 'yellow', 'right', uiSpriteFrames)

  // MP box(magicmenu.c:137-142):needed MP / current MP
  if (state.selectedCasterId !== undefined && state.spellMenu) {
    const cursor = state.spellMenu.cursor
    const sel = state.spellMenu.items[cursor]
    const spell = sel ? spells.find((s) => s.id === sel.id) : undefined
    const magic = spell ? magics.find((m) => m.id === spell.magicNumber) : undefined
    const needed = magic?.costMP ?? 0
    const current = gs.PlayerRolesRuntime.rgwMP[state.selectedCasterId] ?? 0

    drawSingleLineBox({ fb, x: MP_BOX.x, y: MP_BOX.y, len: MP_BOX.len, uiSpriteFrames })
    const slash = uiSpriteFrames[SPRITENUM_SLASH]
    if (slash) blitSpriteOpaque(fb, slash, MP_SLASH.x, MP_SLASH.y)
    drawNumber(fb, needed, 4, MP_NEEDED_RIGHT, 'yellow', 'right', uiSpriteFrames)
    drawNumber(fb, current, 4, MP_CURRENT_RIGHT, 'cyan', 'right', uiSpriteFrames)
  }
}

// ── magic grid(magicmenu.c:228-275)─────────────────────────────────────
function drawMagicGrid(input: DrawInGameMagicMenuInput): void {
  const { fb, state, uiSpriteFrames, glyphs, spells } = input
  if (!state.spellMenu) return

  // grid box(magicmenu.c:121:PAL_CreateBoxWithShadow at (10, 42),rows=4,cols=16)
  drawBox({
    fb, x: MAGIC_GRID_BOX.x, y: MAGIC_GRID_BOX.y,
    rows: MAGIC_LINES_PER_PAGE - 1, cols: 16, style: 1, shadowOffset: 0, uiSpriteFrames,
  })

  // page 起 idx(magicmenu.c:222-226:cursor / iItemsPerLine * iItemsPerLine - iItemsPerLine * iPageLineOffset)
  const iPageLineOffset = Math.floor(MAGIC_LINES_PER_PAGE / 2)
  let pageStart = Math.floor(state.spellMenu.cursor / MAGIC_ITEMS_PER_LINE) * MAGIC_ITEMS_PER_LINE
    - MAGIC_ITEMS_PER_LINE * iPageLineOffset
  if (pageStart < 0) pageStart = 0

  // 画 page 内 magic items
  let i = pageStart
  outer: for (let j = 0; j < MAGIC_LINES_PER_PAGE; j++) {
    for (let k = 0; k < MAGIC_ITEMS_PER_LINE; k++) {
      if (i >= state.spellMenu.items.length) break outer
      const it = state.spellMenu.items[i]!
      const isSelected = i === state.spellMenu.cursor
      let color: number
      if (isSelected) {
        color = it.disabled ? MENUITEM_COLOR_SELECTED_INACTIVE : selectedColor()
      } else {
        color = it.disabled ? MENUITEM_COLOR_INACTIVE : MENUITEM_COLOR
      }

      const spell = spells.find((s) => s.id === it.id)
      const name = spell?._name ?? it.label
      const x = MAGIC_GRID_ITEM_START.x + k * MAGIC_ITEM_TEXT_WIDTH
      const y = MAGIC_GRID_ITEM_START.y + j * 18
      renderText(fb, name, x, y, color, glyphs, true)

      if (isSelected) {
        // cursor sprite at (x + offset, y + 10)(magicmenu.c:268-270)
        const cursor = uiSpriteFrames[SPRITENUM_CURSOR]
        if (cursor) blitSpriteOpaque(fb, cursor, x + MAGIC_CURSOR_X_OFFSET, y + 10)
      }

      i++
    }
  }
}

// ── pick-target picker cursor(uigame.c:786-796 真值)───────────────────────
function drawTargetPickerCursor(input: DrawInGameMagicMenuInput): void {
  const { fb, state, uiSpriteFrames } = input
  // SPRITENUM_CURSOR_UP at (75 + 78 * wPlayer, 158)
  const cursorUp = uiSpriteFrames[SPRITENUM_CURSOR_UP]
  if (!cursorUp) return
  blitSpriteOpaque(
    fb,
    cursorUp,
    PICKER_CURSOR_X_BASE + state.targetCursor * PLAYERINFO_X_STEP,
    PICKER_CURSOR_Y,
  )
}

// ── 主 entry ────────────────────────────────────────────────────────────────

export interface DrawInGameMagicMenuInput {
  fb: Framebuffer
  state: InGameMagicMenuState
  gs: GameState
  playerRoles: PlayerRoles
  spells: Spell[]
  magics: Magic[]
  uiSpriteFrames: IndexedImage[]
  glyphs?: GlyphTable
}

export function drawInGameMagicMenu(input: DrawInGameMagicMenuInput): void {
  const { fb, state, gs, spells, magics, uiSpriteFrames, glyphs } = input

  if (state.phase === 'pick-caster') {
    drawPickCaster(input)
    return
  }

  // pick-spell / pick-target 都有:
  //  - 4 PlayerInfoBox at bottom
  //  - cash + MP box at top
  //  - magic grid box
  drawAllPlayerInfoBoxes(fb, state.partyMembers, gs, uiSpriteFrames)
  drawCashAndMpBox(fb, gs, state, spells, magics, uiSpriteFrames, glyphs)
  drawMagicGrid(input)

  if (state.phase === 'pick-target') {
    drawTargetPickerCursor(input)
  }
}
