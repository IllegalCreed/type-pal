/**
 * C5(2026-05-28):EquipItemMenu fullscreen UI — sdlpal `uigame.c:1793-2056` 1:1 port。
 *
 * 渲染层布局(sdlpal palcfg.c:307-331 默认 ScreenLayout 真值):
 *  - EquipImageBox     = (8, 8)        item 大图(BALL chunk by item.bitmap)
 *  - EquipRoleListBox  = (2, 95)       4 player names list box
 *  - EquipItemName     = (5, 70)       item 名(MENUITEM_COLOR_CONFIRMED 0x2C)
 *  - EquipItemAmount   = (51, 57)      数量(cyan,2 位 right)
 *  - EquipLabels[6]    = (92, 11+22i)  6 装备槽 label("头" "肩" "身" "手" "脚" "颈")
 *  - EquipNames[6]     = (130, 11+22i) 6 装备槽现装备名(MENUITEM_COLOR 0x4F)
 *  - EquipStatusLabels[5] = (226, 10+22i) 5 stat label(Atk/Mag/Def/Dex/Flee)
 *  - EquipStatusValues[5] = (260, 14+22i) 5 stat 数字 cyan(装备后预览)
 *  - 4 player names    每 18px 起 (15, 13) inside RoleListBox,4-case color
 *
 * 4-case color rule(sdlpal uigame.c:1929-1953):
 *   selected + equipable     → MENUITEM_COLOR_SELECTED_FIRST + tick/100%6(闪烁)
 *   selected + !equipable    → MENUITEM_COLOR_SELECTED_INACTIVE 0x1C
 *   !selected + equipable    → MENUITEM_COLOR 0x4F
 *   !selected + !equipable   → MENUITEM_COLOR_INACTIVE 0x18
 *
 * 见 [packages/game/src/core/menu/equip-menu.ts](../../core/menu/equip-menu.ts) state machine。
 *
 * phase='list' UI(sdlpal `PAL_ItemSelectMenu(equipable)`)简版复用 SelectionMenu list；
 * 完整 grid 与 InventoryMenu 共享，留 follow-up（M6 grid statemachine 抽 primitive）。
 */

import type { Item, PlayerRoles } from '@type-pal/shared'
import type { IndexedImage } from '../../assets/png.js'
import type { GameState } from '../../core/game-state.js'
import type { EquipMenuState } from '../../core/menu/equip-menu.js'
import {
  getPlayerAttackStrength,
  getPlayerDefense,
  getPlayerDexterity,
  getPlayerFleeRate,
  getPlayerMagicStrength,
} from '../../core/equip-effect.js'
import type { BattleBgAsset } from '../battle/draw-battle-bg.js'
import { drawBattleBg } from '../battle/draw-battle-bg.js'
import { drawBox } from './draw-box.js'
import { drawInventoryMenu } from './draw-inventory.js'
import { drawNumber } from '../draw-number.js'
import { renderText, type GlyphTable } from '../font.js'
import type { Framebuffer } from '../framebuffer.js'

// ── sdlpal ui.h 真值色 ─────────────────────────────────────────────────────
const MENUITEM_COLOR = 0x4F
const MENUITEM_COLOR_INACTIVE = 0x18
const MENUITEM_COLOR_SELECTED_INACTIVE = 0x1C
const MENUITEM_COLOR_CONFIRMED = 0x2C
const MENUITEM_COLOR_SELECTED_FIRST = 0xF9
const MENUITEM_COLOR_SELECTED_TOTAL = 6

function selectedColor(): number {
  return MENUITEM_COLOR_SELECTED_FIRST + (Math.floor(Date.now() / 100) % MENUITEM_COLOR_SELECTED_TOTAL)
}

// ── sdlpal palcfg.c:307-331 默认 ScreenLayout 真值 ──────────────────────────
const EQUIP_IMAGE_BOX = { x: 8, y: 8 }
const EQUIP_ROLE_LIST_BOX = { x: 2, y: 95 }
const EQUIP_ITEM_NAME = { x: 5, y: 70 }
const EQUIP_ITEM_AMOUNT = { x: 51, y: 57 }
// 装备名渲染位置(6 槽)。槽位 label(头戴/肩.../武术 等)在 classic 烤进 FBP 背景图,ts 不画。
const EQUIP_NAMES = [
  { x: 130, y: 11 }, { x: 130, y: 33 }, { x: 130, y: 55 },
  { x: 130, y: 77 }, { x: 130, y: 99 }, { x: 130, y: 121 },
] as const
// 5 stat 数字渲染位置(stat label 同样在 FBP 背景图,ts 只画数字值)。
const EQUIP_STATUS_VALUES = [
  { x: 260, y: 14 }, { x: 260, y: 36 }, { x: 260, y: 58 },
  { x: 260, y: 80 }, { x: 260, y: 102 },
] as const

// ── sprite blit(opaque mask)── 复用 draw-inventory 模式
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

export interface DrawEquipMenuInput {
  fb: Framebuffer
  state: EquipMenuState
  gs: GameState
  playerRoles: PlayerRoles
  items: Item[]
  uiSpriteFrames: IndexedImage[]
  glyphs?: GlyphTable
  /** FBP chunk 1 全屏背景(sdlpal `EQUIPMENU_BACKGROUND_FBPNUM=1`)— bootstrap 注入。 */
  equipBg?: BattleBgAsset
  /** BALL item icon map(chunkIndex → image),key = item.bitmap。 */
  itemIcons?: Map<number, IndexedImage>
}

/**
 * phase='list' 渲染 — sdlpal `PAL_ItemSelectMenu(equipable)` 完整 grid(itemmenu.c:28-310)。
 * **直接复用 drawInventoryMenu**,sdlpal 真值是同一个 fn,filter 不同而已。
 */
function drawEquipList(input: DrawEquipMenuInput): void {
  const { fb, state, items, uiSpriteFrames, glyphs, itemIcons } = input
  drawInventoryMenu({
    fb,
    state: state.list,
    items,
    uiSpriteFrames,
    itemIcons,
    glyphs,
    // gs/playerRoles 不传 — InventoryMenu use-target overlay 只在 phase='use-target' 触发,
    // EquipMenu 的 list 子状态永远 'list',不会撞 ItemUseMenu picker。
  })
}

/**
 * phase='pick-role' 渲染 — sdlpal uigame.c:1793-2056 完整 1:1 port。
 */
function drawEquipPickRole(input: DrawEquipMenuInput): void {
  const { fb, state, gs, playerRoles, items, uiSpriteFrames, glyphs, equipBg, itemIcons } = input
  if (state.selectedItemId === undefined) return
  const wItem = state.selectedItemId
  const item = items.find((x) => x.id === wItem)
  if (!item) return

  // 1. FBP chunk 1 全屏背景(sdlpal uigame.c:1822-1864)
  if (equipBg) drawBattleBg(fb, equipBg)

  // 2. item icon at EquipImageBox+(8,8)(sdlpal uigame.c:1869-1873)
  if (itemIcons) {
    const icon = itemIcons.get(item.bitmap)
    if (icon) blitSpriteOpaque(fb, icon, EQUIP_IMAGE_BOX.x + 8, EQUIP_IMAGE_BOX.y + 8)
  }

  // 3. 当前选中 role 的 6 装备槽**当前装备名**(sdlpal uigame.c:1899-1906)。
  //    槽位 label(头戴/肩.../武术 等)在 classic 是烤进 FBP 背景图的(uigame.c:1875 `if
  //    (fUseCustomScreenLayout)` 才画文字 — classic 为 false)→ ts **不再**画 label 文字,
  //    否则跟 FBP 背景文字重叠(user 2026-05-28 发现"肩棑"重影)。只画动态装备名。
  const playerRoleId = state.partyMembers[state.playerCursor]
  if (playerRoleId === undefined) return
  for (let slot = 0; slot < 6; slot++) {
    const eqItemId = gs.PlayerRolesRuntime.rgwEquipment[slot]?.[playerRoleId] ?? 0
    if (eqItemId !== 0) {
      const eqItem = items.find((x) => x.id === eqItemId)
      const namePos = EQUIP_NAMES[slot]!
      renderText(fb, eqItem?._name ?? `?${eqItemId}`, namePos.x, namePos.y, MENUITEM_COLOR, glyphs, true)
    }
  }

  // 4. 5 stat 数字 cyan(装备后 effective stat 预览,sdlpal uigame.c:1911-1915)。
  //    stat label(武术/灵力/防御/身法/吉运)同样在 FBP 背景图里,ts 不画。
  drawNumber(fb, getPlayerAttackStrength(gs, playerRoleId), 4, EQUIP_STATUS_VALUES[0]!, 'cyan', 'right', uiSpriteFrames)
  drawNumber(fb, getPlayerMagicStrength(gs, playerRoleId),  4, EQUIP_STATUS_VALUES[1]!, 'cyan', 'right', uiSpriteFrames)
  drawNumber(fb, getPlayerDefense(gs, playerRoleId),        4, EQUIP_STATUS_VALUES[2]!, 'cyan', 'right', uiSpriteFrames)
  drawNumber(fb, getPlayerDexterity(gs, playerRoleId),      4, EQUIP_STATUS_VALUES[3]!, 'cyan', 'right', uiSpriteFrames)
  drawNumber(fb, getPlayerFleeRate(gs, playerRoleId),       4, EQUIP_STATUS_VALUES[4]!, 'cyan', 'right', uiSpriteFrames)

  // 5. role list box(sdlpal uigame.c:1920)+ 4 player names with 4-case color
  //    box pos = EquipRoleListBox = (2, 95);PAL_WordMaxWidth(36, 4) - 1 列宽
  drawBox({
    fb, x: EQUIP_ROLE_LIST_BOX.x, y: EQUIP_ROLE_LIST_BOX.y,
    // sdlpal uigame.c:1920 真值:nColumns = PAL_WordMaxWidth(36, 4) - 1。
    // 角色名 36-39(李逍遥/赵灵儿/林月如/阿奴)最宽 3 全角字 → (3*16+8)>>4 = 3 → 3-1 = 2。
    // 之前写死 4 → 框过宽,右边框盖住装备槽文字(user 2026-05-28 发现)。
    rows: Math.max(1, state.partyMembers.length - 1), cols: 2, style: 0,
    uiSpriteFrames,
  })
  for (let i = 0; i < state.partyMembers.length; i++) {
    const roleId = state.partyMembers[i]!
    const role = playerRoles.roles[roleId]
    if (!role) continue
    // sdlpal `kItemFlagEquipableByPlayerRole_First << roleId` flag
    const canEquip = item.flags.equipableBy?.[roleId] ?? false
    const isSelected = i === state.playerCursor
    let color: number
    if (isSelected) {
      color = canEquip ? selectedColor() : MENUITEM_COLOR_SELECTED_INACTIVE
    } else {
      color = canEquip ? MENUITEM_COLOR : MENUITEM_COLOR_INACTIVE
    }
    // sdlpal uigame.c:1952-1953 真值:PAL_XY_OFFSET(EquipRoleListBox, 13, 13+18*i),fShadow=TRUE
    renderText(
      fb, role._name ?? `role#${roleId}`,
      EQUIP_ROLE_LIST_BOX.x + 13, EQUIP_ROLE_LIST_BOX.y + 13 + 18 * i,
      color, glyphs, true,
    )
  }

  // 6. item name + amount(sdlpal uigame.c:1958-1963)
  if (wItem !== 0) {
    renderText(fb, item._name ?? `?${wItem}`, EQUIP_ITEM_NAME.x, EQUIP_ITEM_NAME.y, MENUITEM_COLOR_CONFIRMED, glyphs, true)
    const invEntry = gs.inventory.find((e) => e.itemId === wItem)
    const amount = invEntry?.count ?? 0
    if (amount > 0) {
      drawNumber(fb, amount, 2, EQUIP_ITEM_AMOUNT, 'cyan', 'right', uiSpriteFrames)
    }
  }
}

export function drawEquipMenu(input: DrawEquipMenuInput): void {
  if (input.state.phase === 'list') drawEquipList(input)
  else if (input.state.phase === 'pick-role') drawEquipPickRole(input)
  // phase='done' 一般在 closeTopMenu 前一帧出现,不画
}
