import { getWord } from '../../core/word-lookup.js'
import { drawScriptDescription } from './draw-description.js'
/**
 * World magic menu: caster/spell/target phases from SDLPal PAL_InGameMagicMenu.
 * The caller supplies catalogs and world runtime state; this module only paints.
 * Bottom role boxes reuse the same PAL_CLASSIC PlayerInfoBox pixels as battle,
 * while numeric/status values come from the world runtime, including real HP0.
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
import { getScriptDescLines } from '../../core/menu/script-desc.js'
import { drawNumber } from '../draw-number.js'
import { type GlyphTable, renderText } from '../font.js'
import type { Framebuffer } from '../framebuffer.js'
import { computePlayerFaceColor, drawPlayerInfoBox } from '../player-info-box.js'
import { drawBox, drawSingleLineBox, menuTextMaxCols } from './draw-box.js'

// ── sdlpal ui.h sprite 真值 ────────────────────────────────────────────────
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

// L8:pick-spell 顶部 MP box —— 显示 scriptDesc 说明时走 WIN95 布局(magicmenu.c:208-215 +
//   palcfg.c:383-386:box(0,0) len5 / slash 45,14 / needed 15,14 / current 50,14),MP 全在【左侧】,
//   不画金钱框、不画右侧 MP(215~265)。原 DOS-noDesc 路径(magicmenu.c:128-142)才是金钱框+右侧 MP
//   且【不画说明】——两套互斥。TS 用 wScriptDesc 出说明,故整体走 WIN95;否则说明文字(x≥102)盖住右侧 MP。
//   与战斗法术菜单(draw-battle-ui.ts)共用 sdlpal 同一 PAL_MagicSelectionMenuUpdate,布局须一致。
const MP_BOX = { x: 0, y: 0, len: 5 }
const MP_NEEDED_RIGHT = { x: 15, y: 14 }
const MP_SLASH = { x: 45, y: 14 }
const MP_CURRENT_RIGHT = { x: 50, y: 14 }
const MAGIC_DESC_X = 102
const MAGIC_DESC_Y = 3
const MAGIC_DESC_COLOR = 0x3c

// magic grid box(magicmenu.c:121)
const MAGIC_GRID_BOX = { x: 10, y: 42 }
const MAGIC_GRID_ITEM_START = { x: 35, y: 54 }
const MAGIC_CURSOR_X_OFFSET = 25 // dwWordLength=10 * 5/2
const MAGIC_LINES_PER_PAGE = 5
const MAGIC_ITEMS_PER_LINE = 3
const MAGIC_ITEM_TEXT_WIDTH = 87 // 8*10+7

// player target picker cursor(uigame.c:793-796:PAL_XY(75 + 78 * wPlayer, 158))
const PICKER_CURSOR_Y = 158
const PICKER_CURSOR_X_BASE = 75

function selectedColor(): number {
  return (
    MENUITEM_COLOR_SELECTED_FIRST + (Math.floor(Date.now() / 100) % MENUITEM_COLOR_SELECTED_TOTAL)
  )
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

/** World state stays here; the shared painter receives only live scalar values and visible counters. */
function drawAllPlayerInfoBoxes(
  fb: Framebuffer,
  partyMembers: number[],
  gs: GameState,
  uiSpriteFrames: IndexedImage[],
  glyphs: GlyphTable | undefined,
  objectPoisons: Map<number, { level: number; color: number }> | undefined,
): void {
  for (let i = 0; i < partyMembers.length; i++) {
    const roleId = partyMembers[i]!
    const hp = gs.PlayerRolesRuntime.rgwHP[roleId] ?? 0
    const status = gs.rgPlayerStatus[roleId]
    drawPlayerInfoBox(
      fb,
      { x: PLAYERINFO_X_BASE + i * PLAYERINFO_X_STEP, y: PLAYERINFO_Y_BASE },
      {
        roleId,
        hp,
        maxHP: gs.PlayerRolesRuntime.rgwMaxHP[roleId] ?? 0,
        mp: gs.PlayerRolesRuntime.rgwMP[roleId] ?? 0,
        maxMP: gs.PlayerRolesRuntime.rgwMaxMP[roleId] ?? 0,
        faceColor: computePlayerFaceColor(gs, roleId, hp, objectPoisons),
        // CLASSIC kStatus: Confused, Paralyzed, Sleep, Silence are the four visible words.
        status: {
          confused: status?.[0],
          paralyzed: status?.[1],
          sleep: status?.[2],
          silence: status?.[3],
        },
      },
      uiSpriteFrames,
      glyphs,
    )
  }
}

// ── pick-caster phase 渲染(uigame.c:684-723)─────────────────────────────
function drawPickCaster(input: DrawInGameMagicMenuInput): void {
  const { fb, state, gs, uiSpriteFrames, glyphs, playerRoles, objectPoisons } = input
  drawAllPlayerInfoBoxes(fb, state.partyMembers, gs, uiSpriteFrames, glyphs, objectPoisons)

  // caster picker box(uigame.c:717:PAL_CreateBox at (35, 62),
  //   rows = wMaxPartyMemberIndex,cols = PAL_MenuTextMaxWidth(角色名) - 1)
  const rows = Math.max(1, state.partyMembers.length - 1)
  const casterNames = state.casterMenu.items.map((it) =>
    getWord(
      playerRoles.roles[it.id]?.name ?? -1,
      playerRoles.roles[it.id]?._name ?? `role#${it.id}`,
    ),
  )
  drawBox({
    fb,
    x: CASTER_PICKER_BOX.x,
    y: CASTER_PICKER_BOX.y,
    rows,
    cols: menuTextMaxCols(casterNames, glyphs),
    style: 0,
    uiSpriteFrames,
  })

  // Party caster names — sdlpal `rgMenuItem[i].pos = PAL_XY(48, 75 + 18*i)`
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
    const name = getWord(role?.name ?? -1, role?._name ?? `role#${roleId}`)
    renderText(
      fb,
      name,
      CASTER_PICKER_ITEM_START.x,
      CASTER_PICKER_ITEM_START.y + i * CASTER_PICKER_LINE,
      color,
      glyphs,
      true,
    )
  }
}

// ── pick-spell / pick-target 顶部 MP box(WIN95 path,magicmenu.c:208-215)─────
//   L8:仅画左侧 MP 框 + slash + needed/current MP,不画金钱框(与 scriptDesc 说明互斥)。
function drawMpBox(
  fb: Framebuffer,
  gs: GameState,
  state: InGameMagicMenuState,
  spells: Spell[],
  magics: Magic[],
  uiSpriteFrames: IndexedImage[],
): void {
  // MP box(magicmenu.c:210-215):needed MP / current MP,左侧
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

function drawMagicDescription(
  fb: Framebuffer,
  state: InGameMagicMenuState,
  spells: Spell[],
  glyphs?: GlyphTable,
): void {
  if (!state.spellMenu) return
  const sel = state.spellMenu.items[state.spellMenu.cursor]
  const spell = sel ? spells.find((s) => s.id === sel.id) : undefined
  const lines = getScriptDescLines(spell?.scriptDesc ?? 0)
  drawScriptDescription(fb, lines, MAGIC_DESC_X, MAGIC_DESC_Y, 216, MAGIC_DESC_COLOR, glyphs)
}

// ── magic grid(magicmenu.c:228-275)─────────────────────────────────────
function drawMagicGrid(input: DrawInGameMagicMenuInput): void {
  const { fb, state, uiSpriteFrames, glyphs, spells } = input
  if (!state.spellMenu) return

  // grid box(magicmenu.c:121:PAL_CreateBoxWithShadow at (10, 42),rows=4,cols=16)
  drawBox({
    fb,
    x: MAGIC_GRID_BOX.x,
    y: MAGIC_GRID_BOX.y,
    rows: MAGIC_LINES_PER_PAGE - 1,
    cols: 16,
    style: 1,
    shadowOffset: 0,
    uiSpriteFrames,
  })

  // page 起 idx(magicmenu.c:222-226:cursor / iItemsPerLine * iItemsPerLine - iItemsPerLine * iPageLineOffset)
  const iPageLineOffset = Math.floor(MAGIC_LINES_PER_PAGE / 2)
  let pageStart =
    Math.floor(state.spellMenu.cursor / MAGIC_ITEMS_PER_LINE) * MAGIC_ITEMS_PER_LINE -
    MAGIC_ITEMS_PER_LINE * iPageLineOffset
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
      const name = getWord(it.id, spell?._name ?? it.label)
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
  objectPoisons?: Map<number, { level: number; color: number }>
}

export function drawInGameMagicMenu(input: DrawInGameMagicMenuInput): void {
  const { fb, state, gs, spells, magics, uiSpriteFrames, glyphs, objectPoisons } = input

  if (state.phase === 'pick-caster') {
    drawPickCaster(input)
    return
  }

  // pick-spell / pick-target 都有:
  //  - one PlayerInfoBox per party member at bottom
  //  - 左侧 MP box at top(WIN95,无金钱框)
  //  - magic grid box
  drawAllPlayerInfoBoxes(fb, state.partyMembers, gs, uiSpriteFrames, glyphs, objectPoisons)
  drawMpBox(fb, gs, state, spells, magics, uiSpriteFrames)
  drawMagicDescription(fb, state, spells, glyphs)
  drawMagicGrid(input)

  if (state.phase === 'pick-target') {
    drawTargetPickerCursor(input)
  }
}
