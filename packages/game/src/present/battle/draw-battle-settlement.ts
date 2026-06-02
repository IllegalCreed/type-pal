/**
 * D11b 战斗胜利结算演出渲染 —— 对照 sdlpal `PAL_BattleWon`(battle.c:991-1373)的多屏 box。
 * 逐帧只画 settlement.screens[index] 当前一屏(sdlpal 每屏 VIDEO_RestoreScreen 清前屏 = 我们每帧
 * 重画整 framebuffer 后只叠当前屏,等价)。
 *
 * 真值锚:
 *  - Phase A exp/cash:battle.c:1037-1045(box (83,60) len8 + (65,105) len10;label 获得经验值/
 *    打败敌人得/文钱;数字 yellow right / yellow mid)
 *  - Phase B 升级 box:battle.c:1128-1212(单行标题 box (80,0) len10 + 主 box (82,32) 7×8 style1;
 *    标题 (110,10);8 箭头 (180,48+18j);8 标签 (100,44+18j) 色 0xBB shadow;数字 old (133,*) /
 *    cur (195,*);HP/MP max blue (154/216,+4) + slash (156/218,+2))
 *  - Phase D 练成屏:battle.c:1312-1321(box (65-ww,105) len w1+w2+w3;name (75-ww,115) / 练成
 *    (75+16w1-ww,115) / magicName (75+16(w1+w2)-ww,115) 色 0x1B)
 *
 * 布局常量(offsetX/ww1)取中文 2 全宽字标签:PAL_MenuTextMaxWidth=(32+8)>>4=2 →
 * maxPropertyWidth=1 → propertyLength=0 → offsetX=0;GETEXP "获得经验值"(5 字)w1=(80+8)>>4+3=8
 * → ww1=0。故 exp/cash + 升级 box 全用 offsetX=0/ww1=0 常量;练成屏 ww 随 name/magic 字宽动态算。
 *
 * 字串(WORD.DAT 真值,verify via lookup/words.json):
 *  GETEXP(30)=获得经验值 BEATENEMY(9)=打败敌人得 DOLLAR(10)=文钱 LEVELUP(32)=提升 ADDMAGIC(33)=练成
 *  8 标签同 PlayerStatus:LEVEL(48)修行 HP(49)体力 MP(50)真气 ATTACK(51)武术 MAGIC(52)灵力
 *  RES(53)防御 DEX(54)身法 FLEE(55)吉运
 */

import type { IndexedImage } from '../../assets/png.js'
import type { BattleSettlementScreen, HiddenExpUpScreenData, LevelUpScreenData } from '../../core/battle/battle-settlement.js'
import { getWord } from '../../core/word-lookup.js'
import { drawNumber } from '../draw-number.js'
import { renderText, type GlyphTable } from '../font.js'
import type { Framebuffer } from '../framebuffer.js'
import { drawBox, drawSingleLineBox } from '../menu/draw-box.js'

// ── sdlpal ui.h 真值 ────────────────────────────────────────────────────────
const SPRITENUM_SLASH = 39
const SPRITENUM_ARROW = 47
const BATTLEWIN_LEVELUP_LABEL_COLOR = 0xBB
const ADDMAGIC_NAME_COLOR = 0x1B // battle.c:1321 magicName 色

// WORD.DAT 真值串
const W_GETEXP = '获得经验值'
const W_BEATENEMY = '打败敌人得'
const W_DOLLAR = '文钱'
const W_LEVELUP = '提升'
const W_ADDMAGIC = '练成'
// 8 升级 box 标签(顺序 = battle.c:1141-1148:LEVEL/HP/MP/ATTACK/MAGIC/RES/DEX/FLEE)
const LEVELUP_LABELS = ['修行', '体力', '真气', '武术', '灵力', '防御', '身法', '吉运'] as const

/** sdlpal PAL_CharWidth:全宽 CJK = 16,半宽 ASCII = 8。 */
function charWidthPx(ch: string): number {
  return ch.charCodeAt(0) < 0x80 ? 8 : 16
}
/** sdlpal PAL_WordWidth:(Σ charWidth + 8) >> 4 = 占几个全宽字格。 */
function wordWidthCols(str: string): number {
  let w = 0
  for (const ch of str) w += charWidthPx(ch)
  return (w + 8) >> 4
}

/** SPRITEUI frame 不透明 blit(arrow / slash)。 */
function blitSpriteOpaque(fb: Framebuffer, frame: IndexedImage, dstX: number, dstY: number): void {
  for (let y = 0; y < frame.height; y++) {
    for (let x = 0; x < frame.width; x++) {
      const off = y * frame.width + x
      if (frame.opaque[off]! > 0)
        fb.writePixel(dstX + x, dstY + y, frame.indices[off]!)
    }
  }
}

export interface DrawBattleSettlementInput {
  fb: Framebuffer
  screen: BattleSettlementScreen
  uiSpriteFrames?: IndexedImage[]
  glyphs?: GlyphTable
}

/** 画结算演出当前一屏。 */
export function drawBattleSettlement(input: DrawBattleSettlementInput): void {
  const { fb, screen, uiSpriteFrames, glyphs } = input
  if (!uiSpriteFrames) return
  switch (screen.kind) {
    case 'exp-cash':
      drawExpCashScreen(fb, screen.expGained, screen.cashGained, uiSpriteFrames, glyphs)
      break
    case 'level-up':
      drawLevelUpScreen(fb, screen.data, uiSpriteFrames, glyphs)
      break
    case 'hidden-exp-up':
      drawHiddenExpUpScreen(fb, screen.data, uiSpriteFrames, glyphs)
      break
    case 'learn-magic':
      drawLearnMagicScreen(fb, screen.data.name, screen.data.magicName, uiSpriteFrames, glyphs)
      break
  }
}

// ── E04:隐藏属性涨点 box(sdlpal CHECK_HIDDEN_EXP,battle.c:1264-1273)──────────────
//   PAL_CreateSingleLineBox(PAL_XY(offsetX+78,60)) + "{name}{statLabel}{提升}" + 涨点数(yellow,右对齐)。
function drawHiddenExpUpScreen(
  fb: Framebuffer, data: HiddenExpUpScreenData, ui: IndexedImage[], glyphs?: GlyphTable,
): void {
  const statLabel = getWord(data.statLabelWord, '')
  const upLabel = getWord(32, '提升') // BATTLEWIN_LEVELUP_LABEL
  const w1 = Math.max(wordWidthCols(data.name), 3)
  const w2 = Math.max(wordWidthCols(statLabel), 2)
  const w3 = Math.max(wordWidthCols(upLabel), 2)
  drawSingleLineBox({ fb, x: 78, y: 60, len: w1 + w2 + w3 + 2, uiSpriteFrames: ui })
  renderText(fb, data.name, 90, 70, 0, glyphs, false)
  renderText(fb, statLabel, 90 + 16 * w1, 70, 0, glyphs, false)
  renderText(fb, upLabel, 90 + 16 * (w1 + w2), 70, 0, glyphs, false)
  drawNumber(fb, data.delta, 5, { x: 90 + 16 * (w1 + w2 + w3) + 4, y: 74 }, 'yellow', 'right', ui)
}

// ── Phase A:获得经验值 / 打败敌人得 N 文钱(battle.c:1037-1045)─────────────────
function drawExpCashScreen(
  fb: Framebuffer, expGained: number, cashGained: number,
  ui: IndexedImage[], glyphs?: GlyphTable,
): void {
  // ww1=0(中文 GETEXP 5 字 → w1=8)
  drawSingleLineBox({ fb, x: 83, y: 60, len: 8, uiSpriteFrames: ui })
  drawSingleLineBox({ fb, x: 65, y: 105, len: 10, uiSpriteFrames: ui })
  renderText(fb, W_GETEXP, 95, 70, 0, glyphs, false)
  renderText(fb, W_BEATENEMY, 77, 115, 0, glyphs, false)
  renderText(fb, W_DOLLAR, 197, 115, 0, glyphs, false)
  drawNumber(fb, expGained, 5, { x: 182, y: 74 }, 'yellow', 'right', ui)
  drawNumber(fb, cashGained, 5, { x: 162, y: 119 }, 'yellow', 'mid', ui)
}

// ── Phase B:升级 box,8 属性 old→cur(battle.c:1128-1212,offsetX=0)──────────────
function drawLevelUpScreen(
  fb: Framebuffer, d: LevelUpScreenData, ui: IndexedImage[], glyphs?: GlyphTable,
): void {
  // 标题单行 box + 主 box(style 1 战斗)
  drawSingleLineBox({ fb, x: 80, y: 0, len: 10, uiSpriteFrames: ui })
  drawBox({ fb, x: 82, y: 32, rows: 7, cols: 8, style: 1, uiSpriteFrames: ui })

  // 标题 "{name}修行提升"(battle.c:1132-1133,色 0 无阴影)
  renderText(fb, `${d.name}${LEVELUP_LABELS[0]}${W_LEVELUP}`, 110, 10, 0, glyphs, false)

  // 8 箭头(old→cur 指示)+ 8 标签(色 0xBB,有阴影)
  const arrow = ui[SPRITENUM_ARROW]
  for (let j = 0; j < 8; j++) {
    if (arrow) blitSpriteOpaque(fb, arrow, 180, 48 + 18 * j)
    renderText(fb, LEVELUP_LABELS[j]!, 100, 44 + 18 * j, BATTLEWIN_LEVELUP_LABEL_COLOR, glyphs, true)
  }

  const slash = ui[SPRITENUM_SLASH]
  // Level(battle.c:1153-1156)
  drawNumber(fb, d.level.old, 4, { x: 133, y: 47 }, 'yellow', 'right', ui)
  drawNumber(fb, d.level.cur, 4, { x: 195, y: 47 }, 'yellow', 'right', ui)
  // HP cur"/"max(battle.c:1158-1169)
  drawNumber(fb, d.hp.old, 4, { x: 133, y: 64 }, 'yellow', 'right', ui)
  drawNumber(fb, d.hp.oldMax, 4, { x: 154, y: 68 }, 'blue', 'right', ui)
  if (slash) blitSpriteOpaque(fb, slash, 156, 66)
  drawNumber(fb, d.hp.cur, 4, { x: 195, y: 64 }, 'yellow', 'right', ui)
  drawNumber(fb, d.hp.curMax, 4, { x: 216, y: 68 }, 'blue', 'right', ui)
  if (slash) blitSpriteOpaque(fb, slash, 218, 66)
  // MP cur"/"max(battle.c:1171-1182)
  drawNumber(fb, d.mp.old, 4, { x: 133, y: 82 }, 'yellow', 'right', ui)
  drawNumber(fb, d.mp.oldMax, 4, { x: 154, y: 86 }, 'blue', 'right', ui)
  if (slash) blitSpriteOpaque(fb, slash, 156, 84)
  drawNumber(fb, d.mp.cur, 4, { x: 195, y: 82 }, 'yellow', 'right', ui)
  drawNumber(fb, d.mp.curMax, 4, { x: 216, y: 86 }, 'blue', 'right', ui)
  if (slash) blitSpriteOpaque(fb, slash, 218, 84)
  // Attack/Magic/Defense/Dexterity/Flee old→cur(battle.c:1184-1212)
  const rows: [number, number, number][] = [
    [d.attack.old, d.attack.cur, 101],
    [d.magic.old, d.magic.cur, 119],
    [d.defense.old, d.defense.cur, 137],
    [d.dexterity.old, d.dexterity.cur, 155],
    [d.flee.old, d.flee.cur, 173],
  ]
  for (const [oldV, curV, y] of rows) {
    drawNumber(fb, oldV, 4, { x: 133, y }, 'yellow', 'right', ui)
    drawNumber(fb, curV, 4, { x: 195, y }, 'yellow', 'right', ui)
  }
}

// ── Phase D:{name} 练成 {magicName}(battle.c:1312-1321)──────────────────────
function drawLearnMagicScreen(
  fb: Framebuffer, name: string, magicName: string, ui: IndexedImage[], glyphs?: GlyphTable,
): void {
  const w1 = Math.max(wordWidthCols(name), 3)
  const w2 = Math.max(wordWidthCols(W_ADDMAGIC), 2)
  const w3 = Math.max(wordWidthCols(magicName), 5)
  const ww = (w1 + w2 + w3 - 10) << 3
  drawSingleLineBox({ fb, x: 65 - ww, y: 105, len: w1 + w2 + w3, uiSpriteFrames: ui })
  renderText(fb, name, 75 - ww, 115, 0, glyphs, false)
  renderText(fb, W_ADDMAGIC, 75 + 16 * w1 - ww, 115, 0, glyphs, false)
  renderText(fb, magicName, 75 + 16 * (w1 + w2) - ww, 115, ADDMAGIC_NAME_COLOR, glyphs, false)
}
