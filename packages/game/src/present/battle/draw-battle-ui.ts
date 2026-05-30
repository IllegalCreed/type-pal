/**
 * 战斗 UI 渲染 —— 1:1 忠实 port sdlpal PAL_CLASSIC `PAL_BattleUIUpdate`(uibattle.c:785-1767)。
 *
 * 主菜单是 **4 个图标**(攻击/法术/合击/杂项,方向选),物品/防御/逃跑/状态/围攻在**杂项盒**里;
 * 法术/物品选择是 **3 列分页网格 + 灰项 + MP/数量**;target picker 单敌跳选 / 全体即时 commit。
 *
 * 渲染按 `(uiState × menuState)` 分支(= sdlpal BATTLEUISTATE × BATTLEMENUSTATE):
 *   selectMove + main            → 4 图标(selectedAction 高亮 + 灰项 MonoColor)
 *   selectMove + magicSelect     → 4 图标 + 法术网格(magicmenu.c)
 *   selectMove + useItem/throwItem→ 4 图标 + 物品网格(itemmenu.c)
 *   selectMove + misc            → 4 图标 + 杂项盒(围攻/道具/防御/逃跑/状态)
 *   selectMove + miscItemSubMenu → 4 图标 + 杂项盒 + 物品二级(使用/投掷)
 *   selectTargetEnemy            → 4 图标(mono)+ 选中敌人上方箭头
 *   selectTargetPlayer           → 4 图标(mono)+ 选中队员上方箭头
 *   selectTargetEnemyAll/PlayerAll→ 即时 commit 的过渡态(画全体箭头)
 *   wait / hidden                → 只画底部队员状态栏
 *
 * 对话显示期间(gs.dialogBox / battleDialogQueue)**隐藏动作菜单**(只画状态栏),对话结束恢复。
 *
 * sdlpal UI sprite 真值(SPRITEUI / DATA.MKF chunk 9):
 *   40-43 = 战斗图标 ATTACK/MAGIC/COOPMAGIC/MISCMENU(uibattle.h:56-59)
 *   66/67 = SELECTEDPLAYER 箭头 红/常(uibattle.h:64-65);68/69 = CURRENTPLAYER 箭头
 *   69 = 菜单 cursor;39 = "/" slash;44-46 = 单行 box;0-17 = 9-slice box(style 0/1)
 *
 * 灰项 / 文字色用 sdlpal `ui.h:29-41` MENUITEM_COLOR_*;像素保真(font / palette)留 user 验。
 */

import type { Item, EnemyPosTable, PlayerRoles, Spell } from '@type-pal/shared'
import type { IndexedImage } from '../../assets/png.js'
import { getEnemyBasePos, getPlayerBasePos } from '../../core/battle/battle-positions.js'
import type { BattleState } from '../../core/battle/battle-state.js'
import type { SelectionMenuState } from '../../core/menu/primitives.js'
import {
  MENUITEM_COLOR,
  MENUITEM_COLOR_INACTIVE,
  MENUITEM_COLOR_SELECTED_FIRST,
  MENUITEM_COLOR_SELECTED_INACTIVE,
  MENUITEM_COLOR_SELECTED_TOTAL,
} from '../../core/menu/inventory-menu.js'
import type { GameState } from '../../core/game-state.js'
import { drawBox, menuTextMaxCols, drawSingleLineBox } from '../menu/draw-box.js'
import { drawNumber } from '../draw-number.js'
import { renderText, type GlyphTable } from '../font.js'
import type { Framebuffer } from '../framebuffer.js'

/** PAL 索引 1 —— 白色(底部状态栏文字)。 */
const UI_TEXT_COLOR = 1

// ── sdlpal SPRITEUI frame 真值 ──────────────────────────────────────────────
const SPRITENUM_BATTLEICON_ATTACK = 40
const SPRITENUM_BATTLE_ARROW_SELECTEDPLAYER = 67
const SPRITENUM_BATTLE_ARROW_SELECTEDPLAYER_RED = 66
const SPRITENUM_CURSOR = 69
const SPRITENUM_SLASH = 39

/**
 * 主菜单 4 图标(uibattle.c:813-817,PAL_CLASSIC):sprite 号 = ATTACK+i,pos = sdlpal 真值。
 * 顺序对齐 selectedAction:0攻击 1法术 2合击 3杂项。
 */
const MAIN_ICONS: ReadonlyArray<{ sprite: number; x: number; y: number }> = [
  { sprite: SPRITENUM_BATTLEICON_ATTACK + 0, x: 27, y: 140 }, // 攻击
  { sprite: SPRITENUM_BATTLEICON_ATTACK + 1, x: 0, y: 155 },  // 法术
  { sprite: SPRITENUM_BATTLEICON_ATTACK + 2, x: 54, y: 155 }, // 合击
  { sprite: SPRITENUM_BATTLEICON_ATTACK + 3, x: 27, y: 170 }, // 杂项
]

// 杂项盒(uibattle.c:368-413):box(2,20),5 项 (16, 32/50/68/86/104),WORD.DAT CLASSIC 顺序
const MISC_BOX = { x: 2, y: 20, rows: 4 }
const MISC_ITEM_X = 16
const MISC_ITEM_Y0 = 32
const MISC_ITEM_DY = 18
/** WORD.DAT 真值(verify lookup/words.json):56围攻 / 57道具 / 58防御 / 59逃跑 / 60状态。 */
const MISC_LABELS = ['围攻', '道具', '防御', '逃跑', '状态'] as const

// 物品二级(uibattle.c:471-545):box(30,50) rows1,使用(44,62)/投掷(44,80)
const MISC_ITEM_SUB_BOX = { x: 30, y: 50, rows: 1 }
const MISC_ITEM_SUB = [
  { label: '使用', x: 44, y: 62 }, // WORD.DAT 23
  { label: '投掷', x: 44, y: 80 }, // WORD.DAT 24
] as const

// 法术网格(magicmenu.c:75-80,CN dwWordLength=10):box(10,42) 4×16 style1;item (35,54)+k*87+j*18
const MAGIC_GRID_BOX = { x: 10, y: 42, rows: 4, cols: 16 }
const MAGIC_ITEM_X0 = 35
const MAGIC_ITEM_Y0 = 54
const MAGIC_ITEM_W = 87
const MAGIC_LINE_DY = 18
const MAGIC_CURSOR_X_OFF = 25 // dwWordLength*5/2
const MAGIC_COLS = 3
const MAGIC_ROWS = 5
const MAGIC_PAGE_LINE_OFFSET = Math.floor(MAGIC_ROWS / 2)
// cash box(magicmenu.c:130-142,非 WIN95)+ MP box
const CASH_BOX = { x: 0, y: 0, len: 5 }
const CASH_LABEL = { x: 10, y: 10 }
const CASH_NUM = { x: 49, y: 14 }
const MP_BOX = { x: 215, y: 0, len: 5 }
const MP_NEEDED = { x: 230, y: 14 }
const MP_SLASH = { x: 260, y: 14 }
const MP_CURRENT = { x: 265, y: 14 }

// 物品网格(itemmenu.c:51-57,CN):box(2,0) 6×17 style1;item (15,12)+k*100+j*18
const ITEM_GRID_BOX = { x: 2, y: 0, rows: 6, cols: 17 }
const ITEM_ITEM_X0 = 15
const ITEM_ITEM_Y0 = 12
const ITEM_ITEM_W = 100
const ITEM_LINE_DY = 18
const ITEM_CURSOR_X_OFF = 25
const ITEM_AMOUNT_X_OFF = 81 // dwWordLength*8+1
const ITEM_COLS = 3
const ITEM_ROWS = 7
const ITEM_PAGE_LINE_OFFSET = Math.floor((ITEM_ROWS + 1) / 2)

// 底部队员状态栏(M3 文字版,PAL_PlayerInfoBox sprite 化是独立函数,非本任务范围)
const PARTY_STATUS_BASE_X = 5
const PARTY_STATUS_BASE_Y = 175
const PARTY_STATUS_STRIDE_X = 60

/** 目标箭头相对 anchor 的偏移(anchor = 精灵底中,箭头画头顶上方)。 */
const TARGET_ARROW_DX = -8
const TARGET_ARROW_DY_ENEMY = -50
const TARGET_ARROW_DY_PLAYER = -67 // uibattle.c:1574 `y - 67`

/** 闪烁选中色(sdlpal ui.h:36-39:0xF9 + SDL_GetTicks 周期)。 */
function selectedColor(): number {
  return MENUITEM_COLOR_SELECTED_FIRST + (Math.floor(Date.now() / 100) % MENUITEM_COLOR_SELECTED_TOTAL)
}

/** s_iFrame & 1 等价的红/常箭头闪烁(sdlpal uibattle.c:1564-1568 用 s_iFrame,这里用时钟)。 */
function arrowBlinkRed(): boolean {
  return (Math.floor(Date.now() / 40) & 1) === 1
}

// ── sprite blit helpers ─────────────────────────────────────────────────────
function blitSpriteOpaque(fb: Framebuffer, frame: IndexedImage, dstX: number, dstY: number): void {
  for (let y = 0; y < frame.height; y++) {
    for (let x = 0; x < frame.width; x++) {
      const off = y * frame.width + x
      if (frame.opaque[off]! > 0) fb.writePixel(dstX + x, dstY + y, frame.indices[off]!)
    }
  }
}

/**
 * port sdlpal `PAL_RLEBlitMonoColor`(palcommon.c:446-640):单色描边 blit。
 *   每不透明像素:b = clamp((src & 0x0F) + iColorShift, 0, 0x0F);输出 = b | (bColor & 0xF0)。
 * 战斗图标:可用 = MonoColor(0, -4)灰阶;不可用 = MonoColor(0x10, -4)更暗(uibattle.c:1070-1078)。
 */
function blitSpriteMonoColor(
  fb: Framebuffer, frame: IndexedImage, dstX: number, dstY: number, bColor: number, iColorShift: number,
): void {
  const band = bColor & 0xf0
  for (let y = 0; y < frame.height; y++) {
    for (let x = 0; x < frame.width; x++) {
      const off = y * frame.width + x
      if (frame.opaque[off]! === 0) continue
      let b = (frame.indices[off]! & 0x0f) + iColorShift
      if (b > 0x0f) b = 0x0f
      else if (b < 0) b = 0
      fb.writePixel(dstX + x, dstY + y, b | band)
    }
  }
}

/** uiSpriteFrames 是否够画 9-slice box(style 0 需 frame 0-8,style 1 需 9-17)。 */
function hasBoxFrames(uiSpriteFrames: IndexedImage[] | undefined, style: 0 | 1): boolean {
  return !!uiSpriteFrames && uiSpriteFrames.length > style * 9 + 8
}

/**
 * 画战斗 UI。每帧调用一次(在 bg + sprites 之上)。
 *
 * @param uiSpriteFrames SPRITEUI 全 frame(图标/box/cursor/箭头/数字);缺省 → 跳过 sprite 相关绘制。
 * @param enemyPos       ENEMYPOS 表(敌方 target 箭头定位);缺省 → fallback 表。
 */
export function drawBattleUI(
  fb: Framebuffer,
  state: BattleState,
  playerRoles: PlayerRoles,
  spells: Spell[],
  items: Item[],
  gs: GameState,
  glyphs?: GlyphTable,
  uiSpriteFrames?: IndexedImage[],
  enemyPos?: EnemyPosTable,
): void {
  drawPartyStatus(fb, state, playerRoles, glyphs)

  // 战斗内对话显示期间隐藏动作菜单(user 2026-05-31 实测 bug):只保留底部状态栏。
  //   sdlpal:PAL_ShowDialogText 同步 blocking,对话期菜单不刷(uibattle.c:889 PerformAction goto end 同理)。
  const dialogActive = gs.dialogBox != null || (state.battleDialogQueue?.length ?? 0) > 0
  if (dialogActive) return

  switch (state.uiState) {
    case 'selectMove':
      drawMainIcons(fb, state, playerRoles, uiSpriteFrames, /* highlight= */ true)
      switch (state.menuState) {
        case 'main':
          break
        case 'magicSelect':
          drawMagicSelectGrid(fb, state, gs, spells, glyphs, uiSpriteFrames)
          break
        case 'useItemSelect':
        case 'throwItemSelect':
          drawItemSelectGrid(fb, state, items, glyphs, uiSpriteFrames)
          break
        case 'misc':
          drawMiscMenu(fb, state, glyphs, uiSpriteFrames)
          break
        case 'miscItemSubMenu':
          drawMiscMenu(fb, state, glyphs, uiSpriteFrames)
          drawMiscItemSubMenu(fb, state, glyphs, uiSpriteFrames)
          break
      }
      break
    case 'selectTargetEnemy':
      drawMainIcons(fb, state, playerRoles, uiSpriteFrames, /* highlight= */ false)
      drawEnemyTargetArrow(fb, state, uiSpriteFrames, enemyPos, /* all= */ false)
      break
    case 'selectTargetEnemyAll':
      drawMainIcons(fb, state, playerRoles, uiSpriteFrames, false)
      drawEnemyTargetArrow(fb, state, uiSpriteFrames, enemyPos, /* all= */ true)
      break
    case 'selectTargetPlayer':
      drawMainIcons(fb, state, playerRoles, uiSpriteFrames, false)
      drawPlayerTargetArrow(fb, state, uiSpriteFrames, /* all= */ false)
      break
    case 'selectTargetPlayerAll':
      drawMainIcons(fb, state, playerRoles, uiSpriteFrames, false)
      drawPlayerTargetArrow(fb, state, uiSpriteFrames, /* all= */ true)
      break
    case 'wait':
    case 'hidden':
      break
  }
}

/**
 * 底部队员状态栏:每个 party 成员显示 名字 / HP / MP(M3 文字版)。
 * sdlpal PAL_PlayerInfoBox(sprite 头像 + 时间槽)是独立函数,sprite 化非本任务范围。
 */
function drawPartyStatus(
  fb: Framebuffer,
  state: BattleState,
  playerRoles: PlayerRoles,
  glyphs?: GlyphTable,
): void {
  state.players.forEach((p, i) => {
    const role = playerRoles.roles[p.roleId]
    if (!role) return
    const x = PARTY_STATUS_BASE_X + i * PARTY_STATUS_STRIDE_X
    const y = PARTY_STATUS_BASE_Y
    renderText(fb, role._name ?? `P${i + 1}`, x, y, UI_TEXT_COLOR, glyphs)
    renderText(fb, `HP:${role.hp}/${role.maxHP}`, x, y + 8, UI_TEXT_COLOR, glyphs)
    renderText(fb, `MP:${role.mp}/${role.maxMP}`, x, y + 16, UI_TEXT_COLOR, glyphs)
  })
}

/**
 * 主菜单 4 图标(uibattle.c:1063-1080)。
 *   selectedAction(highlight 时)= 全彩 blit;可用未选 = MonoColor(0, -4);不可用 = MonoColor(0x10, -4)。
 *   highlight=false(target 状态)→ 全部 MonoColor(0, -4),无高亮。
 * 灰项判定用 selectMove 的 isBattleActionValid(silence / coop healthy)。
 */
function drawMainIcons(
  fb: Framebuffer,
  state: BattleState,
  playerRoles: PlayerRoles,
  uiSpriteFrames: IndexedImage[] | undefined,
  highlight: boolean,
): void {
  if (!uiSpriteFrames) return
  for (let i = 0; i < MAIN_ICONS.length; i++) {
    const icon = MAIN_ICONS[i]!
    const frame = uiSpriteFrames[icon.sprite]
    if (!frame) continue
    const valid = isBattleActionValidForDraw(state, i, playerRoles)
    if (highlight && state.selectedAction === i) {
      blitSpriteOpaque(fb, frame, icon.x, icon.y) // 选中 = 全彩(uibattle.c:1067-1068)
    } else if (valid) {
      blitSpriteMonoColor(fb, frame, icon.x, icon.y, 0, -4) // 可用 = 灰阶(uibattle.c:1071-1073)
    } else {
      blitSpriteMonoColor(fb, frame, icon.x, icon.y, 0x10, -4) // 不可用 = 更暗(uibattle.c:1076-1078)
    }
  }
}

/**
 * 灰项判定(渲染侧)—— 镜像 battle-system isActionValid(uibattle.c:271-341,PAL_CLASSIC):
 *   0攻击/3杂项恒可用;1法术 → 非 silence;2合击 → 本人 healthy 且 healthy 人数 > 1。
 * 渲染层独立实现避免循环依赖 core/battle-system(只读 state,不改)。
 */
function isBattleActionValidForDraw(state: BattleState, action: number, playerRoles: PlayerRoles): boolean {
  const idx = state.selectingPlayerIdx
  // 无有效队员 context → 全部 invalid(镜像 battle-system isActionValid:undefined/缺 role 返回 false)。
  if (idx === undefined) return false
  const player = state.players[idx]
  const role = player ? playerRoles.roles[player.roleId] : undefined
  if (!player || !role) return false
  const healthy = (p: typeof player, r: typeof role): boolean => {
    if (r.hp <= 0 || (r.hp > 0 && r.hp < Math.max(1, Math.floor(r.maxHP / 5)))) return false
    const st = p.status
    return (st.sleep ?? 0) === 0 && (st.confused ?? 0) === 0 && (st.silence ?? 0) === 0 &&
      (st.paralyzed ?? 0) === 0 && (st.puppet ?? 0) === 0
  }
  switch (action) {
    case 1:
      return (player.status.silence ?? 0) === 0
    case 2: {
      if (state.players.length <= 1) return false
      let n = 0
      state.players.forEach((p) => {
        const r = playerRoles.roles[p.roleId]
        if (r && healthy(p, r)) n++
      })
      return healthy(player, role) && n > 1
    }
    default:
      return true
  }
}

/** 杂项盒(uibattle.c:343-413):box(2,20) + 5 项 围攻/道具/防御/逃跑/状态,miscMenuCursor 高亮。 */
function drawMiscMenu(
  fb: Framebuffer,
  state: BattleState,
  glyphs: GlyphTable | undefined,
  uiSpriteFrames: IndexedImage[] | undefined,
): void {
  if (hasBoxFrames(uiSpriteFrames, 0)) {
    drawBox({
      fb, x: MISC_BOX.x, y: MISC_BOX.y, rows: MISC_BOX.rows,
      cols: menuTextMaxCols(MISC_LABELS as readonly string[], glyphs), style: 0, uiSpriteFrames: uiSpriteFrames!,
    })
  }
  for (let i = 0; i < MISC_LABELS.length; i++) {
    const color = i === state.miscMenuCursor ? selectedColor() : MENUITEM_COLOR
    renderText(fb, MISC_LABELS[i]!, MISC_ITEM_X, MISC_ITEM_Y0 + i * MISC_ITEM_DY, color, glyphs, true)
  }
}

/** 物品二级(uibattle.c:471-545):box(30,50) + 使用/投掷,miscSubMenuCursor 高亮。 */
function drawMiscItemSubMenu(
  fb: Framebuffer,
  state: BattleState,
  glyphs: GlyphTable | undefined,
  uiSpriteFrames: IndexedImage[] | undefined,
): void {
  if (hasBoxFrames(uiSpriteFrames, 0)) {
    drawBox({
      fb, x: MISC_ITEM_SUB_BOX.x, y: MISC_ITEM_SUB_BOX.y, rows: MISC_ITEM_SUB_BOX.rows,
      cols: menuTextMaxCols(MISC_ITEM_SUB.map((m) => m.label), glyphs), style: 0, uiSpriteFrames: uiSpriteFrames!,
    })
  }
  MISC_ITEM_SUB.forEach((it, i) => {
    const color = i === state.miscSubMenuCursor ? selectedColor() : MENUITEM_COLOR
    renderText(fb, it.label, it.x, it.y, color, glyphs, true)
  })
}

/**
 * 法术选择网格(magicmenu.c:35-299)—— box(10,42) + 3列分页 + cursor + cash/MP box。
 * 灰项色:选中enabled=闪烁 / 选中disabled=SELECTED_INACTIVE / 未选disabled=INACTIVE / 未选enabled=MENUITEM_COLOR。
 */
function drawMagicSelectGrid(
  fb: Framebuffer,
  state: BattleState,
  gs: GameState,
  spells: Spell[],
  glyphs: GlyphTable | undefined,
  uiSpriteFrames: IndexedImage[] | undefined,
): void {
  const menu = state.magicSelect
  if (!menu) return
  void spells

  if (hasBoxFrames(uiSpriteFrames, 1)) {
    drawBox({
      fb, x: MAGIC_GRID_BOX.x, y: MAGIC_GRID_BOX.y, rows: MAGIC_GRID_BOX.rows, cols: MAGIC_GRID_BOX.cols,
      style: 1, shadowOffset: 0, uiSpriteFrames: uiSpriteFrames!,
    })
  }

  // cash + MP box(magicmenu.c:128-142,非 WIN95)
  if (uiSpriteFrames) {
    if (uiSpriteFrames.length > 46) {
      drawSingleLineBox({ fb, x: CASH_BOX.x, y: CASH_BOX.y, len: CASH_BOX.len, uiSpriteFrames })
      renderText(fb, '金钱', CASH_LABEL.x, CASH_LABEL.y, 0, glyphs, false)
      drawNumber(fb, gs.dwCash, 6, CASH_NUM, 'yellow', 'right', uiSpriteFrames)
      drawSingleLineBox({ fb, x: MP_BOX.x, y: MP_BOX.y, len: MP_BOX.len, uiSpriteFrames })
    }
    const sel = menu.items[menu.cursor]
    const needed = parseRightNumber(sel?.rightText)
    const role = state.selectingPlayerIdx !== undefined
      ? state.players[state.selectingPlayerIdx]
      : undefined
    const currentMp = role ? (gs.PlayerRolesRuntime.rgwMP[role.roleId] ?? 0) : 0
    const slash = uiSpriteFrames[SPRITENUM_SLASH]
    if (slash) blitSpriteOpaque(fb, slash, MP_SLASH.x, MP_SLASH.y)
    drawNumber(fb, needed, 4, MP_NEEDED, 'yellow', 'right', uiSpriteFrames)
    drawNumber(fb, currentMp, 4, MP_CURRENT, 'cyan', 'right', uiSpriteFrames)
  }

  drawSelectGridItems(fb, menu, glyphs, uiSpriteFrames, {
    cols: MAGIC_COLS, rows: MAGIC_ROWS, pageLineOffset: MAGIC_PAGE_LINE_OFFSET,
    itemX0: MAGIC_ITEM_X0, itemY0: MAGIC_ITEM_Y0, itemW: MAGIC_ITEM_W, lineDy: MAGIC_LINE_DY,
    cursorXOff: MAGIC_CURSOR_X_OFF, cursorYOff: 10, amountXOff: undefined,
  })
}

/** 物品选择网格(itemmenu.c:28-311)—— box(2,0) + 3列分页 + cursor + 数量。 */
function drawItemSelectGrid(
  fb: Framebuffer,
  state: BattleState,
  items: Item[],
  glyphs: GlyphTable | undefined,
  uiSpriteFrames: IndexedImage[] | undefined,
): void {
  const menu = state.itemSelect
  if (!menu) return
  void items

  if (hasBoxFrames(uiSpriteFrames, 1)) {
    drawBox({
      fb, x: ITEM_GRID_BOX.x, y: ITEM_GRID_BOX.y, rows: ITEM_GRID_BOX.rows, cols: ITEM_GRID_BOX.cols,
      style: 1, shadowOffset: 0, uiSpriteFrames: uiSpriteFrames!,
    })
  }

  drawSelectGridItems(fb, menu, glyphs, uiSpriteFrames, {
    cols: ITEM_COLS, rows: ITEM_ROWS, pageLineOffset: ITEM_PAGE_LINE_OFFSET,
    itemX0: ITEM_ITEM_X0, itemY0: ITEM_ITEM_Y0, itemW: ITEM_ITEM_W, lineDy: ITEM_LINE_DY,
    cursorXOff: ITEM_CURSOR_X_OFF, cursorYOff: 10, amountXOff: ITEM_AMOUNT_X_OFF,
  })
}

interface GridLayout {
  cols: number
  rows: number
  pageLineOffset: number
  itemX0: number
  itemY0: number
  itemW: number
  lineDy: number
  cursorXOff: number
  cursorYOff: number
  /** 数量数字相对 itemX 的偏移(物品网格用;法术网格 undefined = 不画)。 */
  amountXOff: number | undefined
}

/**
 * 通用 N 列分页网格绘制(magicmenu.c:222-275 / itemmenu.c:122-224 共同结构)。
 *   page 起 = cursor/cols*cols - cols*pageLineOffset(钳 >=0);逐 cell 上色 + cursor 精灵 + (物品)数量。
 */
function drawSelectGridItems(
  fb: Framebuffer,
  menu: SelectionMenuState,
  glyphs: GlyphTable | undefined,
  uiSpriteFrames: IndexedImage[] | undefined,
  lay: GridLayout,
): void {
  let pageStart = Math.floor(menu.cursor / lay.cols) * lay.cols - lay.cols * lay.pageLineOffset
  if (pageStart < 0) pageStart = 0
  let i = pageStart
  outer: for (let j = 0; j < lay.rows; j++) {
    for (let k = 0; k < lay.cols; k++) {
      if (i >= menu.items.length) break outer
      const it = menu.items[i]!
      const selected = i === menu.cursor
      let color: number
      if (selected) color = it.disabled ? MENUITEM_COLOR_SELECTED_INACTIVE : selectedColor()
      else color = it.disabled ? MENUITEM_COLOR_INACTIVE : MENUITEM_COLOR
      const x = lay.itemX0 + k * lay.itemW
      const y = lay.itemY0 + j * lay.lineDy
      renderText(fb, it.label, x, y, color, glyphs, true)
      // 数量(物品网格:if amount>1 cyan right;itemmenu.c:211-215)
      if (lay.amountXOff !== undefined && uiSpriteFrames) {
        const amount = parseRightNumber(it.rightText)
        if (amount > 1) {
          drawNumber(fb, amount, 2, { x: x + lay.amountXOff, y: y + 5 }, 'cyan', 'right', uiSpriteFrames)
        }
      }
      if (selected && uiSpriteFrames) {
        const cursor = uiSpriteFrames[SPRITENUM_CURSOR]
        if (cursor) blitSpriteOpaque(fb, cursor, x + lay.cursorXOff, y + lay.cursorYOff)
      }
      i++
    }
  }
}

/** 从 rightText 解析数字(`MP 12` / `×3` → 12 / 3),无 → 0。 */
function parseRightNumber(rightText: string | undefined): number {
  if (!rightText) return 0
  const m = rightText.match(/\d+/)
  return m ? Number(m[0]) : 0
}

/**
 * 敌方 target 箭头 —— sdlpal CLASSIC 用 ColorShift 高亮敌人精灵(uibattle.c:1498-1510);
 * ts 简化为箭头标在敌人头顶(精灵 ColorShift 高亮属 sprite 层,留 user 验/后续)。
 * all=true(EnemyAll 过渡态)→ 全部活敌画箭头。
 */
function drawEnemyTargetArrow(
  fb: Framebuffer,
  state: BattleState,
  uiSpriteFrames: IndexedImage[] | undefined,
  enemyPos: EnemyPosTable | undefined,
  all: boolean,
): void {
  if (!uiSpriteFrames) return
  const arrow = uiSpriteFrames[arrowBlinkRed()
    ? SPRITENUM_BATTLE_ARROW_SELECTEDPLAYER_RED
    : SPRITENUM_BATTLE_ARROW_SELECTEDPLAYER]
  if (!arrow) return
  const draw = (idx: number): void => {
    const anchor = getEnemyBasePos(enemyPos, state.enemies.length, idx, state.enemies[idx]?.e.yPosOffset ?? 0)
    if (!anchor) return
    blitSpriteOpaque(fb, arrow, anchor.x + TARGET_ARROW_DX, anchor.y + TARGET_ARROW_DY_ENEMY)
  }
  if (all) {
    state.enemies.forEach((e, i) => { if (e.e.health > 0) draw(i) })
  } else {
    draw(state.uiCursor)
  }
}

/**
 * 友方 target 箭头(uibattle.c:1564-1576 / PlayerAll 1670-1695)。
 *   sprite 67(常)/ 66(红)闪烁;箭头画在队员头顶(anchor.y - 67)。all=true → 全部队员。
 */
function drawPlayerTargetArrow(
  fb: Framebuffer,
  state: BattleState,
  uiSpriteFrames: IndexedImage[] | undefined,
  all: boolean,
): void {
  if (!uiSpriteFrames) return
  const arrow = uiSpriteFrames[arrowBlinkRed()
    ? SPRITENUM_BATTLE_ARROW_SELECTEDPLAYER_RED
    : SPRITENUM_BATTLE_ARROW_SELECTEDPLAYER]
  if (!arrow) return
  const draw = (idx: number): void => {
    const anchor = getPlayerBasePos(state.players.length, idx)
    if (!anchor) return
    blitSpriteOpaque(fb, arrow, anchor.x + TARGET_ARROW_DX, anchor.y + TARGET_ARROW_DY_PLAYER)
  }
  if (all) {
    for (let i = 0; i < state.players.length; i++) draw(i)
  } else {
    draw(state.uiCursor)
  }
}
