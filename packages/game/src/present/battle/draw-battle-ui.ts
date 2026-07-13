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
 *   selectTargetEnemy            → 4 图标(mono)+ 选中敌人 sprite ColorShift
 *   selectTargetPlayer           → 4 图标(mono)+ 选中队员上方箭头
 *   selectTargetEnemyAll/PlayerAll→ 即时 commit 的过渡态(不画目标箭头)
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

import type { EnemyPosTable, Item, PlayerRoles, Spell } from '@type-pal/shared'
import type { IndexedImage } from '../../assets/png.js'
import { getPlayerBasePos } from '../../core/battle/battle-positions.js'
import type { BattleState } from '../../core/battle/battle-state.js'
import type { GameState } from '../../core/game-state.js'
import {
  MENUITEM_COLOR,
  MENUITEM_COLOR_INACTIVE,
  MENUITEM_COLOR_SELECTED_FIRST,
  MENUITEM_COLOR_SELECTED_INACTIVE,
  MENUITEM_COLOR_SELECTED_TOTAL,
} from '../../core/menu/inventory-menu.js'
import type { SelectionMenuState } from '../../core/menu/primitives.js'
import { getScriptDescLines } from '../../core/menu/script-desc.js'
import { drawNumber } from '../draw-number.js'
import { type GlyphTable, renderText } from '../font.js'
import type { Framebuffer } from '../framebuffer.js'
import { drawBox, drawSingleLineBox, menuTextMaxCols } from '../menu/draw-box.js'

/** PAL 索引 1 —— 白色(底部状态栏文字)。 */
const UI_TEXT_COLOR = 1

// ── sdlpal SPRITEUI frame 真值 ──────────────────────────────────────────────
const SPRITENUM_BATTLEICON_ATTACK = 40
// sdlpal uibattle.h:61-65 箭头精灵帧:目标选中(SELECTEDPLAYER 67 / 红 66)、当前行动队员(CURRENTPLAYER 69 / 红 68)。
const SPRITENUM_BATTLE_ARROW_SELECTEDPLAYER = 67
const SPRITENUM_BATTLE_ARROW_SELECTEDPLAYER_RED = 66
const SPRITENUM_BATTLE_ARROW_CURRENTPLAYER = 69
const SPRITENUM_BATTLE_ARROW_CURRENTPLAYER_RED = 68
const SPRITENUM_CURSOR = 69
const SPRITENUM_SLASH = 39
const SPRITENUM_PLAYERINFOBOX = 18 // 队员信息框背景(uibattle.h:SPRITENUM_PLAYERINFOBOX)
const SPRITENUM_PLAYERFACE_FIRST = 48 // 头像起,+ wPlayerRole(uibattle.c:155)
const SPRITENUM_ITEMBOX = 70

// 战斗队员信息框(PAL_PlayerInfoBox)位置:PAL_XY(91 + 77*i, 165)(uibattle.c:925)。
const PLAYERINFO_X_BASE = 91
const PLAYERINFO_X_STEP = 77
const PLAYERINFO_Y = 165

/**
 * 主菜单 4 图标(uibattle.c:813-817,PAL_CLASSIC):sprite 号 = ATTACK+i,pos = sdlpal 真值。
 * 顺序对齐 selectedAction:0攻击 1法术 2合击 3杂项。
 */
const MAIN_ICONS: ReadonlyArray<{ sprite: number; x: number; y: number }> = [
  { sprite: SPRITENUM_BATTLEICON_ATTACK + 0, x: 27, y: 140 }, // 攻击
  { sprite: SPRITENUM_BATTLEICON_ATTACK + 1, x: 0, y: 155 }, // 法术
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
// L8:法术菜单显示 scriptDesc 说明时,MP 框/数字在【左侧】(WIN95 path,magicmenu.c:208-215 +
//   palcfg.c:383-386 MagicMP* 默认:box(0,0) len5 / slash 45,14 / needed 15,14 / current 50,14)。
//   原 DOS-noDesc 路径(magicmenu.c:128-142)才画金钱框+右侧 MP(215~265),且【不画说明】——两套
//   布局在 sdlpal 互斥。TS 用 wScriptDesc(WIN95 机制)出说明,故整体走 WIN95 布局、去掉金钱框/右侧 MP,
//   否则说明文字(x≥102)会盖住右侧 MP(见用户实测截图)。
const MP_BOX = { x: 0, y: 0, len: 5 }
const MP_NEEDED = { x: 15, y: 14 }
const MP_SLASH = { x: 45, y: 14 }
const MP_CURRENT = { x: 50, y: 14 }
const MAGIC_DESC_X = 102
const MAGIC_DESC_Y = 3
const MAGIC_DESC_COLOR = 0x3c

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
const ITEMBOX_X = 0
const ITEMBOX_Y = 140
const ITEM_DESC_COLOR = 0x3c

// 底部队员状态栏(M3 文字版,PAL_PlayerInfoBox sprite 化是独立函数,非本任务范围)
const PARTY_STATUS_BASE_X = 5
const PARTY_STATUS_BASE_Y = 175
const PARTY_STATUS_STRIDE_X = 60

/** 箭头相对 anchor 的偏移(anchor = 精灵底中,箭头画头顶上方;sdlpal 真值 x-8)。 */
const TARGET_ARROW_DX = -8
const TARGET_ARROW_DY_PLAYER = -67 // 选中友方:uibattle.c:1574 `y - 67`
const TARGET_ARROW_DY_CURRENT_PLAYER = -74 // 当前行动队员:uibattle.c:1004 `y - 74`

/**
 * 信息框状态文字(sdlpal uibattle.c:240-255 + 66-98 rgwStatusWord/rgStatusPos/rgbStatusColor,CLASSIC)。
 * 只 confused/paralyzed/sleep/silence 有 WORD(buff 类 puppet/bravery/protect/haste/dualAttack word=0 不显示)。
 * WORD.DAT 真值(xxd data/raw/WORD.DAT id N*10):乱=0x1D / 定=0x1B / 眠=0x1C / 封=0x1A(单字)。
 * pos/color 相对框 pos(框原点 91+77*i,165 与 sdlpal 一致 → 直接用 sdlpal 偏移)。
 */
const BATTLE_STATUS_LABELS: ReadonlyArray<{
  key: 'confused' | 'paralyzed' | 'sleep' | 'silence'
  char: string
  dx: number
  dy: number
  color: number
}> = [
  { key: 'confused', char: '乱', dx: 35, dy: 19, color: 0x5f },
  { key: 'paralyzed', char: '定', dx: 44, dy: 12, color: 0xbf },
  { key: 'sleep', char: '眠', dx: 54, dy: 1, color: 0x0e },
  { key: 'silence', char: '封', dx: 55, dy: 20, color: 0x3c },
]

/** 闪烁选中色(sdlpal ui.h:36-39:0xF9 + SDL_GetTicks 周期)。 */
function selectedColor(): number {
  return (
    MENUITEM_COLOR_SELECTED_FIRST + (Math.floor(Date.now() / 100) % MENUITEM_COLOR_SELECTED_TOTAL)
  )
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

/** ITEMBOX 阴影:按当前背景色降低低 4 bit,对齐 PAL_RLEBlitToSurfaceWithShadow。 */
function blitSpriteShadow(fb: Framebuffer, frame: IndexedImage, dstX: number, dstY: number): void {
  for (let y = 0; y < frame.height; y++) {
    for (let x = 0; x < frame.width; x++) {
      const off = y * frame.width + x
      if (frame.opaque[off]! === 0) continue
      const px = dstX + x
      const py = dstY + y
      if (px < 0 || px >= fb.width || py < 0 || py >= fb.height) continue
      const current = fb.indices[py * fb.width + px]!
      fb.writePixel(px, py, (current & 0xf0) | ((current & 0x0f) >> 1))
    }
  }
}

/**
 * port sdlpal `PAL_RLEBlitMonoColor`(palcommon.c:446-640):单色描边 blit。
 *   每不透明像素:b = clamp((src & 0x0F) + iColorShift, 0, 0x0F);输出 = b | (bColor & 0xF0)。
 * 战斗图标:可用 = MonoColor(0, -4)灰阶;不可用 = MonoColor(0x10, -4)更暗(uibattle.c:1070-1078)。
 */
function blitSpriteMonoColor(
  fb: Framebuffer,
  frame: IndexedImage,
  dstX: number,
  dstY: number,
  bColor: number,
  iColorShift: number,
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
  _enemyPos?: EnemyPosTable,
  objectPoisons?: Map<number, { level: number; color: number }>,
  itemIcons?: Map<number, IndexedImage>,
): void {
  // 战斗内对话显示期间**整个战斗 UI 都不画**(动作菜单 + 血量信息框都隐藏)——
  //   user 2026-05-31 实测:对话时不显示战斗 UI,血量面板当然也不显示。
  //   sdlpal:PAL_ShowDialogText 同步 blocking,对话期 PAL_BattleUIUpdate 完全不刷(菜单/信息框都不画)。
  const dialogActive =
    gs.dialogBox != null || gs.dialogBoxKept != null || (state.battleDialogQueue?.length ?? 0) > 0
  if (dialogActive) return

  // 敌人逃跑动画期间**整个战斗 UI 不画**(命令菜单 + 血量 InfoBox 全隐)——
  //   sdlpal 真值(battle.c:736-797):草妖类敌在 pre-battle/turnStart 脚本里逃跑(0x69)→
  //   BattleResult≠OnGoing → 主循环 while 首判即 break → PAL_BattleStartFrame/PAL_BattleUIUpdate
  //   从不调用 → 此类"演出战"全程无 UI。我们逃跑动画 phase 仍停 selectAction、uiState 仍 'wait'
  //   (tickBattleEnemyEscapeAnim 在 phase-agnostic hold 处 return),故在此显式早退对齐
  //   (user 2026-06-14 报:草妖战命令菜单已隐,但血量面板仍闪一下)。
  if (state.enemyEscapeAnim) return

  // fAutoBattle(0x8A 整场自动战斗)期间**整个战斗 UI 不画**(PlayerInfoBox + 行动菜单 + 箭头)——
  //   sdlpal uibattle.c:839 fAutoBattle 分支自动 commit 后 `goto end`,跳过所有 UI 绘制;玩家全程不交互。
  //   (user 2026-06-14 报:石长老vs盖罗娇剧情自动战开场闪一下战斗 UI。)
  if (state.fAutoBattle) return

  // 底部队员信息框(PAL_PlayerInfoBox)—— sdlpal 仅在**主循环进入玩家回合后**画(uibattle.c:888-928
  //   `Phase != PerformAction && !fAutoAttack`,且整个 PAL_BattleUIUpdate 只在主循环里调用)。perform
  //   阶段(uiState='hidden')隐藏,只剩飘字。
  //   `selectionStartedForTurn === turn` = 本回合玩家选择已**真正开始**(startFirstReadyPlayerSelection
  //   置位,battle-system.ts:585)。tickPreBattle 一进 selectAction 就置 uiState='wait',但该置位要等
  //   turnStart 脚本跑完才发生 —— preBattle 转 selectAction 的过渡帧、turnStart 脚本执行中(草妖类开场
  //   逃跑永远到不了玩家回合)此值 ≠ turn → 不画 InfoBox(user 2026-06-14:草妖战我方血量面板仍闪)。
  const showInfoBoxes =
    state.uiState !== 'hidden' && !state.fAutoAttack && state.selectionStartedForTurn === state.turn
  if (showInfoBoxes)
    drawPlayerInfoBoxes(fb, state, playerRoles, gs, objectPoisons, glyphs, uiSpriteFrames)

  // 当前行动队员头顶箭头(sdlpal uibattle.c:994-1007:`state != Wait` 时无条件画,blink 68红/69)。
  //   selectMove + 所有 target 选择阶段都显示,指向 selectingPlayerIdx(= wCurPlayerIndex)。
  if (state.uiState !== 'hidden' && state.uiState !== 'wait')
    drawCurrentPlayerArrow(fb, state, uiSpriteFrames)

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
          drawItemSelectGrid(fb, state, items, glyphs, uiSpriteFrames, itemIcons)
          break
        case 'misc':
          drawMiscMenu(fb, state, glyphs, uiSpriteFrames)
          break
        case 'miscItemSubMenu':
          drawMiscMenu(fb, state, glyphs, uiSpriteFrames, true) // L9:二级子层 → 父项『道具』已确认绿
          drawMiscItemSubMenu(fb, state, glyphs, uiSpriteFrames)
          break
      }
      break
    case 'selectTargetEnemy':
    case 'selectTargetEnemyAll':
      // 敌方目标选择**无箭头**。selectTargetEnemy(单体):选中敌人由 sprite 层 ColorShift 7 闪烁高亮
      //   (draw-battle-sprites enemyTargetHighlightShift,sdlpal uibattle.c:1495-1510)。
      // selectTargetEnemyAll(全体):CLASSIC 立即提交、**无高亮**(uibattle.c:1611-1617),仅过渡态。
      // DL30:选敌态 C **不画**主菜单图标(uibattle.c:1431-1543 该 case 无图标;仅
      //   SelectTargetPlayer :1557-1561 画 mono 图标)——原版选敌时左下图标消失。
      break
    case 'selectTargetPlayer':
      drawMainIcons(fb, state, playerRoles, uiSpriteFrames, false)
      drawPlayerTargetArrow(fb, state, uiSpriteFrames, /* all= */ false)
      break
    case 'selectTargetPlayerAll':
      drawMainIcons(fb, state, playerRoles, uiSpriteFrames, false)
      // PAL_CLASSIC 的 PlayerAll 是即时 commit 状态,不等待目标选择;TS 若短暂渲染到这帧也不画箭头,
      // 避免梦蛇/全体辅助法术闪一帧友方目标。
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
 * 底部队员信息框 —— port sdlpal `PAL_PlayerInfoBox`(uibattle.c:30-269,PAL_CLASSIC)。
 *   每队员 PAL_XY(91+77*i, 165):box 背景(frame 18)+ 头像(frame 48+roleId,(x-2,y-4))
 *   + HP/MP(CLASSIC 布局 uibattle.c:210-238):slash + maxHP/HP(yellow)+ maxMP/MP(cyan)。
 *   中毒头像变色 + 状态字(乱/定/眠/封)已实现;CLASSIC 无 time-meter bar。
 * HP/MP 读 **战斗 playerRoles**(战内活值);无 uiSpriteFrames(单测)→ 文字版兜底。
 */
/**
 * 头像染色色号 —— port sdlpal `PAL_PlayerInfoBox`(uibattle.c:114-162)bPoisonColor 逻辑:
 *   默认 0xFF(满色,正常 blit);遍历该队员 16 毒槽(gs.rgPoisonStatus 全局)取**最高 level(≤3)**毒的
 *   wColor;死亡 hp==0 强制 0(黑白 mono)。返回 0xFF → 调用方走满色 blit,否则 mono 重染(band=color&0xF0)。
 * level>3 的毒(如 561/562 L4)不影响头像色(sdlpal `wPoisonLevel <= 3` 守卫)。
 */
export function computePlayerFaceColor(
  gs: GameState,
  roleId: number,
  hp: number,
  objectPoisons: Map<number, { level: number; color: number }> | undefined,
): number {
  let bPoisonColor = 0xff
  let maxLevel = 0
  if (objectPoisons) {
    for (let slot = 0; slot < 16; slot++) {
      const ps = gs.rgPoisonStatus[`${slot}_${roleId}`]
      if (!ps || ps.wPoisonID === 0) continue
      const pd = objectPoisons.get(ps.wPoisonID)
      if (pd && pd.level <= 3 && pd.level >= maxLevel) {
        maxLevel = pd.level
        bPoisonColor = pd.color & 0xff
      }
    }
  }
  if (hp === 0) bPoisonColor = 0 // 死亡:黑白 mono(uibattle.c:143-151)
  return bPoisonColor
}

function drawPlayerInfoBoxes(
  fb: Framebuffer,
  state: BattleState,
  playerRoles: PlayerRoles,
  gs: GameState,
  objectPoisons: Map<number, { level: number; color: number }> | undefined,
  glyphs: GlyphTable | undefined,
  uiSpriteFrames: IndexedImage[] | undefined,
): void {
  if (!uiSpriteFrames || uiSpriteFrames.length <= SPRITENUM_PLAYERFACE_FIRST) {
    drawPartyStatus(fb, state, playerRoles, glyphs) // 无 sprite 资源 → 文字兜底(单测)
    return
  }
  const box = uiSpriteFrames[SPRITENUM_PLAYERINFOBOX]
  const slash = uiSpriteFrames[SPRITENUM_SLASH]
  state.players.forEach((p, i) => {
    const role = playerRoles.roles[p.roleId]
    if (!role) return
    const x = PLAYERINFO_X_BASE + i * PLAYERINFO_X_STEP
    const y = PLAYERINFO_Y
    if (box) blitSpriteOpaque(fb, box, x, y) // 框背景(uibattle.c:108)
    const face = uiSpriteFrames[SPRITENUM_PLAYERFACE_FIRST + p.roleId]
    if (face) {
      const bPoisonColor = computePlayerFaceColor(gs, p.roleId, role.hp, objectPoisons)
      if (bPoisonColor === 0xff)
        blitSpriteOpaque(fb, face, x - 2, y - 4) // 满色(uibattle.c:155)
      else blitSpriteMonoColor(fb, face, x - 2, y - 4, bPoisonColor, 0) // 中毒/死亡单色(uibattle.c:160)
    }
    // CLASSIC HP/MP(uibattle.c:210-238)
    if (slash) blitSpriteOpaque(fb, slash, x + 49, y + 6)
    drawNumber(fb, role.maxHP, 4, { x: x + 47, y: y + 8 }, 'yellow', 'right', uiSpriteFrames)
    drawNumber(fb, role.hp, 4, { x: x + 26, y: y + 5 }, 'yellow', 'right', uiSpriteFrames)
    if (slash) blitSpriteOpaque(fb, slash, x + 49, y + 22)
    drawNumber(fb, role.maxMP, 4, { x: x + 47, y: y + 24 }, 'cyan', 'right', uiSpriteFrames)
    drawNumber(fb, role.mp, 4, { x: x + 26, y: y + 21 }, 'cyan', 'right', uiSpriteFrames)
    // 状态文字(乱/定/眠/封)—— sdlpal uibattle.c:240-255,仅活人,各 status>0 时画单字。
    if (role.hp > 0) {
      for (const s of BATTLE_STATUS_LABELS) {
        if ((p.status[s.key] ?? 0) > 0)
          renderText(fb, s.char, x + s.dx, y + s.dy, s.color, glyphs, true)
      }
    }
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
function isBattleActionValidForDraw(
  state: BattleState,
  action: number,
  playerRoles: PlayerRoles,
): boolean {
  const idx = state.selectingPlayerIdx
  // 无有效队员 context → 全部 invalid(镜像 battle-system isActionValid:undefined/缺 role 返回 false)。
  if (idx === undefined) return false
  const player = state.players[idx]
  const role = player ? playerRoles.roles[player.roleId] : undefined
  if (!player || !role) return false
  const healthy = (p: typeof player, r: typeof role): boolean => {
    if (r.hp <= 0 || (r.hp > 0 && r.hp < Math.min(100, Math.floor(r.maxHP / 5)))) return false
    const st = p.status
    return (
      (st.sleep ?? 0) === 0 &&
      (st.confused ?? 0) === 0 &&
      (st.silence ?? 0) === 0 &&
      (st.paralyzed ?? 0) === 0 &&
      (st.puppet ?? 0) === 0
    )
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
  confirmed = false, // L9:进物品二级子层时父菜单当前项用已确认绿 0x2C(uibattle.c:402-405),非闪烁选中色
): void {
  if (hasBoxFrames(uiSpriteFrames, 0)) {
    drawBox({
      fb,
      x: MISC_BOX.x,
      y: MISC_BOX.y,
      rows: MISC_BOX.rows,
      cols: menuTextMaxCols(MISC_LABELS as readonly string[], glyphs),
      style: 0,
      uiSpriteFrames: uiSpriteFrames!,
    })
  }
  for (let i = 0; i < MISC_LABELS.length; i++) {
    // L9:fConfirmed(进二级子层)→ 当前项用 MENUITEM_COLOR_CONFIRMED=0x2C 固定绿,非闪烁选中色(uibattle.c:402-405)。
    const color = i === state.miscMenuCursor ? (confirmed ? 0x2c : selectedColor()) : MENUITEM_COLOR
    renderText(
      fb,
      MISC_LABELS[i]!,
      MISC_ITEM_X,
      MISC_ITEM_Y0 + i * MISC_ITEM_DY,
      color,
      glyphs,
      true,
    )
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
      fb,
      x: MISC_ITEM_SUB_BOX.x,
      y: MISC_ITEM_SUB_BOX.y,
      rows: MISC_ITEM_SUB_BOX.rows,
      cols: menuTextMaxCols(
        MISC_ITEM_SUB.map((m) => m.label),
        glyphs,
      ),
      style: 0,
      uiSpriteFrames: uiSpriteFrames!,
    })
  }
  MISC_ITEM_SUB.forEach((it, i) => {
    const color = i === state.miscSubMenuCursor ? selectedColor() : MENUITEM_COLOR
    renderText(fb, it.label, it.x, it.y, color, glyphs, true)
  })
}

/**
 * 法术选择网格(magicmenu.c:35-299)—— box(10,42) + 3列分页 + cursor + MP box + scriptDesc 说明。
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
  const selectedSpell = spells.find((spell) => spell.id === menu.items[menu.cursor]?.id)

  if (hasBoxFrames(uiSpriteFrames, 1)) {
    drawBox({
      fb,
      x: MAGIC_GRID_BOX.x,
      y: MAGIC_GRID_BOX.y,
      rows: MAGIC_GRID_BOX.rows,
      cols: MAGIC_GRID_BOX.cols,
      style: 1,
      shadowOffset: 0,
      uiSpriteFrames: uiSpriteFrames!,
    })
  }

  // MP box(WIN95 path,magicmenu.c:208-215):仅左侧 MP 框 + slash + needed/current MP,
  //   不画金钱框(DOS-noDesc 互斥路径,且与下面的 scriptDesc 说明不能同屏)。
  if (uiSpriteFrames) {
    if (uiSpriteFrames.length > 46) {
      drawSingleLineBox({ fb, x: MP_BOX.x, y: MP_BOX.y, len: MP_BOX.len, uiSpriteFrames })
    }
    const sel = menu.items[menu.cursor]
    const needed = parseRightNumber(sel?.rightText)
    const role =
      state.selectingPlayerIdx !== undefined ? state.players[state.selectingPlayerIdx] : undefined
    const currentMp = role ? (gs.PlayerRolesRuntime.rgwMP[role.roleId] ?? 0) : 0
    const slash = uiSpriteFrames[SPRITENUM_SLASH]
    if (slash) blitSpriteOpaque(fb, slash, MP_SLASH.x, MP_SLASH.y)
    drawNumber(fb, needed, 4, MP_NEEDED, 'yellow', 'right', uiSpriteFrames)
    drawNumber(fb, currentMp, 4, MP_CURRENT, 'cyan', 'right', uiSpriteFrames)
  }

  // 仙术说明(magicmenu.c:191-205 WIN95 path):wScript = rgObject[wMagic].item.wScriptDesc,
  // 0xFFFF 描述行画在 MagicDescMsgPos(102,3)+line*16,DESCTEXT_COLOR。
  const description = getScriptDescLines(selectedSpell?.scriptDesc ?? 0)
  for (let line = 0; line < description.length; line++) {
    renderText(
      fb,
      description[line]!,
      MAGIC_DESC_X,
      MAGIC_DESC_Y + line * 16,
      MAGIC_DESC_COLOR,
      glyphs,
      true,
    )
  }

  drawSelectGridItems(fb, menu, glyphs, uiSpriteFrames, {
    cols: MAGIC_COLS,
    rows: MAGIC_ROWS,
    pageLineOffset: MAGIC_PAGE_LINE_OFFSET,
    itemX0: MAGIC_ITEM_X0,
    itemY0: MAGIC_ITEM_Y0,
    itemW: MAGIC_ITEM_W,
    lineDy: MAGIC_LINE_DY,
    cursorXOff: MAGIC_CURSOR_X_OFF,
    cursorYOff: 10,
    amountXOff: undefined,
  })
}

/**
 * 物品选择网格(itemmenu.c:28-311)—— box + 3列分页 + cursor + 数量,
 * 以及选中物品的 ITEMBOX、BALL 图标和 scriptDesc 说明。
 */
function drawItemSelectGrid(
  fb: Framebuffer,
  state: BattleState,
  items: Item[],
  glyphs: GlyphTable | undefined,
  uiSpriteFrames: IndexedImage[] | undefined,
  itemIcons: Map<number, IndexedImage> | undefined,
): void {
  const menu = state.itemSelect
  if (!menu) return

  if (hasBoxFrames(uiSpriteFrames, 1)) {
    drawBox({
      fb,
      x: ITEM_GRID_BOX.x,
      y: ITEM_GRID_BOX.y,
      rows: ITEM_GRID_BOX.rows,
      cols: ITEM_GRID_BOX.cols,
      style: 1,
      shadowOffset: 0,
      uiSpriteFrames: uiSpriteFrames!,
    })
  }

  drawSelectGridItems(fb, menu, glyphs, uiSpriteFrames, {
    cols: ITEM_COLS,
    rows: ITEM_ROWS,
    pageLineOffset: ITEM_PAGE_LINE_OFFSET,
    itemX0: ITEM_ITEM_X0,
    itemY0: ITEM_ITEM_Y0,
    itemW: ITEM_ITEM_W,
    lineDy: ITEM_LINE_DY,
    cursorXOff: ITEM_CURSOR_X_OFF,
    cursorYOff: 10,
    amountXOff: ITEM_AMOUNT_X_OFF,
  })

  const selected = menu.items[menu.cursor]
  const item = selected ? items.find((candidate) => candidate.id === selected.id) : undefined
  if (!item) return

  const itemBox = uiSpriteFrames?.[SPRITENUM_ITEMBOX]
  if (itemBox) {
    blitSpriteShadow(fb, itemBox, ITEMBOX_X + 5, ITEMBOX_Y + 5)
    blitSpriteOpaque(fb, itemBox, ITEMBOX_X, ITEMBOX_Y)
  }
  const icon = itemIcons?.get(item.bitmap)
  if (icon) blitSpriteOpaque(fb, icon, ITEMBOX_X + 8, ITEMBOX_Y + 7)

  const description = getScriptDescLines(item.scriptDesc)
  for (let line = 0; line < description.length; line++) {
    renderText(fb, description[line]!, 71, 151 + line * 16, ITEM_DESC_COLOR, glyphs, true)
  }
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
          drawNumber(
            fb,
            amount,
            2,
            { x: x + lay.amountXOff, y: y + 5 },
            'cyan',
            'right',
            uiSpriteFrames,
          )
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
 * 当前行动队员头顶箭头 —— sdlpal uibattle.c:994-1007(`state != Wait` 时无条件画)。
 *   blink:`i = CURRENTPLAYER_RED(68); if (s_iFrame & 1) i = CURRENTPLAYER(69)` → odd 帧 69 / even 68。
 *   位置:当前队员(selectingPlayerIdx = wCurPlayerIndex)精灵底锚 + (x-8, y-74)。
 *   (敌方目标选择**无箭头**,改 sprite 层 ColorShift 高亮 —— 见 draw-battle-sprites.enemyTargetHighlightShift。)
 */
function drawCurrentPlayerArrow(
  fb: Framebuffer,
  state: BattleState,
  uiSpriteFrames: IndexedImage[] | undefined,
): void {
  if (!uiSpriteFrames || state.selectingPlayerIdx === undefined) return
  const arrow =
    uiSpriteFrames[
      arrowBlinkRed()
        ? SPRITENUM_BATTLE_ARROW_CURRENTPLAYER
        : SPRITENUM_BATTLE_ARROW_CURRENTPLAYER_RED
    ]
  if (!arrow) return
  const anchor = getPlayerBasePos(state.players.length, state.selectingPlayerIdx)
  if (!anchor) return
  blitSpriteOpaque(fb, arrow, anchor.x + TARGET_ARROW_DX, anchor.y + TARGET_ARROW_DY_CURRENT_PLAYER)
}

/**
 * 友方 target 箭头(uibattle.c:1564-1576)。
 *   sprite 67(常)/ 66(红)闪烁;箭头画在队员头顶(anchor.y - 67)。all=true 为历史 helper,
 *   PAL_CLASSIC 的 PlayerAll 现在即时 commit,不会调用它画全体箭头。
 */
function drawPlayerTargetArrow(
  fb: Framebuffer,
  state: BattleState,
  uiSpriteFrames: IndexedImage[] | undefined,
  all: boolean,
): void {
  if (!uiSpriteFrames) return
  const arrow =
    uiSpriteFrames[
      arrowBlinkRed()
        ? SPRITENUM_BATTLE_ARROW_SELECTEDPLAYER_RED
        : SPRITENUM_BATTLE_ARROW_SELECTEDPLAYER
    ]
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
