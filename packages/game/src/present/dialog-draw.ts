/** Draws borrowed dialogue/resources into the caller framebuffer; never advances dialogue state. */
import type { DialogBoxStyle } from '@type-pal/shared'
import type { DialogBoxState } from '../core/game-state.js'
import { FONT_COLOR_CYAN_ALT } from './dialog-text.js'
import { drawNumber } from './draw-number.js'
import { type GlyphTable, measureText, renderColoredText, renderText } from './font.js'
import type { Framebuffer } from './framebuffer.js'
import { drawSingleLineBox } from './menu/draw-box.js'

/** sdlpal text.c:1661 `y + nCurrentDialogLine * 18`:行间距 18 px */
export const LINE_HEIGHT_PX = 18

// ── 文本位置(sdlpal text.c:1313-1346 真值) ───────────────────────────────────

export interface TextPos {
  x: number
  y: number
}

export function getDialogTextPos(style: DialogBoxStyle, hasPortrait: boolean): TextPos {
  switch (style) {
    case 'top':
      return { x: hasPortrait ? 96 : 44, y: 26 }
    case 'center':
      return { x: 80, y: 40 }
    case 'bottom':
    case 'narration':
      return { x: hasPortrait ? 20 : 44, y: 126 }
    case 'item-box':
      return { x: 160, y: 30 } // kDialogCenterWindow posDialogText(160,40)+offset -10;实际走 drawItemBoxDialog
  }
}

/**
 * sdlpal text.c:1316/1340 真值 — title(姓名)位置,跟 dialog text 独立。
 * top:    (iNumCharFace > 0 ? 80 : 12, 8)
 * bottom: (iNumCharFace > 0 ? 4 : 12, 108)
 * 姓名以 `:` 结尾,画在此处,**不**计入 nCurrentDialogLine。
 */
export function getDialogTitlePos(style: DialogBoxStyle, hasPortrait: boolean): TextPos {
  switch (style) {
    case 'top':
      return { x: hasPortrait ? 80 : 12, y: 8 }
    case 'center':
      return { x: 12, y: 8 } // sdlpal default,center 一般不用 title
    case 'bottom':
    case 'narration':
      return { x: hasPortrait ? 4 : 12, y: 108 }
    case 'item-box':
      return { x: 160, y: 30 } // 物品框无 title;走 drawItemBoxDialog,此返回不被用
  }
}

// ── 头像位置(sdlpal text.c:1289-1310 真值) ───────────────────────────────────

interface PortraitPos {
  x: number
  y: number
}

function getPortraitPos(style: DialogBoxStyle, width: number, height: number): PortraitPos | null {
  switch (style) {
    case 'top':
      return { x: 48 - Math.floor(width / 2), y: 55 - Math.floor(height / 2) }
    case 'bottom':
    case 'narration':
      return { x: 270 - Math.floor(width / 2), y: 144 - Math.floor(height / 2) }
    case 'center':
    case 'item-box':
      return null // 物品框无头像(走 drawItemBoxDialog)
  }
}

// ── drawDialogBox ─────────────────────────────────────────────────────────────

/** sprite 资产接口(与 dialog-assets.DialogSprite / draw-sprite.SpriteImage 同结构)。 */
export interface DialogSprite {
  width: number
  height: number
  indices: Uint8Array
  opaque: Uint8Array
}

export interface DialogBoxDrawCtx {
  /** RGM.MKF chunk index → 角色头像 sprite */
  portraitFrames?: Map<number, DialogSprite>
  /** DATA.MKF chunk 12 dialog icon sprite group(frame index → sprite)。 */
  iconFrames?: Map<number, DialogSprite>
  /** T14:narration style(kDialogCenterWindow)画 SingleLineBox 背景,需 SPRITEUI frame 44/45/46。 */
  uiSpriteFrames?: import('../assets/png.js').IndexedImage[]
  /** L1 物品框(style='item-box'):物品 BALL 图标 Map<bitmap, icon>(SPRITENUM_ITEMBOX 也在 uiSpriteFrames[70])。 */
  itemIcons?: Map<number, import('../assets/png.js').IndexedImage>
  /** L1 物品框:物品 catalog(itemId → bitmap),解析图标用。 */
  items?: import('@type-pal/shared').Item[]
}

const KEY_ICON_FRAME = 0

/**
 * 绘一帧 dialog:画所有 shownLines(完整)+ currentLineText 的 charsRevealed 截断。
 * 行布局:`pos.y + lineIdx * LINE_HEIGHT_PX`。
 *
 * key icon 仅 waiting-page-key / waiting-end-key 显示(shouldShowKeyIcon;center 排除,
 * line-done 行间自动推进不显)。"闪烁"由 present 层 palette 0xF9-0xFE 轮转产生,icon 常显。
 */
export function drawDialogBox(
  fb: Framebuffer,
  state: DialogBoxState,
  glyphs: GlyphTable | undefined,
  ctx?: DialogBoxDrawCtx,
): void {
  // L1 紫金葫芦炼丹物品框(style='item-box')— sdlpal script.c:1479-1513。**在 hasActiveContent 守卫前**
  //   short-circuit:物品框无 shownLines/currentLineText(内容是 itemBox 字段),否则被守卫误判空而不画。
  if (state.style === 'item-box') {
    drawItemBoxDialog(fb, state, glyphs, ctx)
    return
  }

  // Sync.2 fix10:dialog 无活跃内容(shownLines=[]+currentLineText=null)时 整个 dialog 不画 —
  //   包括 portrait + key icon。对应 sdlpal `nCurrentDialogLine=0` 后 PAL_ShowDialogText 不被
  //   调,自然 portrait 不再 blit。我们 retainstate 但渲染层 short-circuit。
  //   场景:0x05 ClearDialog 翻页 + cutscene NPC opcode 期间,portrait 不再 overlay。
  //
  // 注:currentLineText 非 null 但 charsRevealed=0(startDialogLine 后第 0 tick)
  //    仍 draw — portrait + text 框已"准备好显示",玩家会看到 portrait 先于文字。
  const hasActiveContent =
    state.shownLines.length > 0 || state.currentLineText !== null || state.titleText !== undefined
  if (!hasActiveContent) return

  // T14:narration style(kDialogCenterWindow)— sdlpal text.c:1663-1710 真值。
  // 居中 SingleLineBox + 一行文字 居中显示(eg. "获得 XX × N" 物品提示)。
  // 跟其他 style(透明 typing 多行)逻辑完全不同,short-circuit。
  if (state.style === 'narration') {
    drawNarrationDialog(fb, state, glyphs, ctx)
    return
  }

  // 1. portrait 图(sdlpal text.c:1289-1310):由 portraitIcon 决定画哪张 / 是否画。
  if (state.portraitIcon !== undefined && ctx?.portraitFrames) {
    const portrait = ctx.portraitFrames.get(state.portraitIcon)
    if (portrait) {
      const pos = getPortraitPos(state.style, portrait.width, portrait.height)
      if (pos) {
        blitSprite(fb, portrait, pos.x, pos.y)
      }
    }
  }

  // 文本/标题缩进布局 — 与"是否画立绘图"解耦。sdlpal posDialogText/posDialogTitle 是 PAL_StartDialog
  //   (iNumCharFace>0)设的持久 metrics;立绘图被 PAL_MakeScene(0x05 redraw)擦掉后位置仍缩进 →
  //   其后无 PAL_StartDialog 的 showDialog 文本缩进但无图(扬州师爷"大人息怒")。portraitLayout 缺省
  //   回退 (portraitIcon !== undefined) 兼容旧存档 / 战斗对话(不带 layout)。
  const hasPortrait = state.portraitLayout ?? state.portraitIcon !== undefined

  // 2a. title(姓名,以 `:` 结尾 — sdlpal text.c:1725 真值 FONT_COLOR_CYAN_ALT,独立位置)
  if (state.titleText !== undefined) {
    const titlePos = getDialogTitlePos(state.style, hasPortrait)
    drawTextLine(
      fb,
      state.titleText,
      titlePos.x,
      titlePos.y,
      state.fontColor,
      glyphs,
      FONT_COLOR_CYAN_ALT,
    )
  }

  // 2b. text:所有已完成行 + 当前行(截 charsRevealed)
  const basePos = getDialogTextPos(state.style, hasPortrait)

  for (let i = 0; i < state.shownLines.length; i++) {
    const line = state.shownLines[i]!
    drawTextLine(
      fb,
      line,
      basePos.x,
      basePos.y + i * LINE_HEIGHT_PX,
      state.fontColor,
      glyphs,
      undefined,
      state.shownLineColors?.[i],
    )
  }

  // 当前行(typing 或 line-done):画在 shownLines 之后第 N 行
  if (state.currentLineText !== null && state.charsRevealed > 0) {
    const lineIdx = state.shownLines.length
    const visible = state.currentLineText.slice(0, state.charsRevealed)
    drawTextLine(
      fb,
      visible,
      basePos.x,
      basePos.y + lineIdx * LINE_HEIGHT_PX,
      state.fontColor,
      glyphs,
      undefined,
      state.currentLineColors?.slice(0, state.charsRevealed),
    )
  }

  // 3. key icon(等键时显示在最后一行文字末尾)。
  //    sdlpal text.c:1745 `posIcon = PAL_XY(x, y)`:x = 本行 TEXT_DisplayText 画完返回的末尾 x,
  //    y = 本行 y(posDialogText.y + nCurrentDialogLine*18,自增前)。**不是**固定右下角。
  //    "闪烁"由 present 层 palette 索引 0xF9-0xFE 每 100ms 轮转产生(text.c:1408-1426),
  //    箭头本身**常显**(不再 show/hide gate keyIconBlink)。
  if (shouldShowKeyIcon(state)) {
    // sdlpal text.c:1391 `PAL_SpriteGetFrame(bufDialogIcons, bIcon)` —— bIcon 即帧号:
    //   默认 0;`)` → 1,`(` → 2(parseDialogText 的 iconKind)。
    const iconSprite = ctx?.iconFrames?.get(state.iconKind ?? KEY_ICON_FRAME)
    if (iconSprite) {
      // 最后一行:正在显示的 currentLineText(若有)或最后一条 shownLine。
      const lineIdx =
        state.currentLineText !== null
          ? state.shownLines.length
          : Math.max(0, state.shownLines.length - 1)
      const lastLineText =
        state.currentLineText !== null
          ? state.currentLineText
          : (state.shownLines[state.shownLines.length - 1] ?? '')
      const iconX = basePos.x + measureText(lastLineText, glyphs)
      const iconY = basePos.y + lineIdx * LINE_HEIGHT_PX
      blitSprite(fb, iconSprite, iconX, iconY)
    }
  }
}

// sdlpal:icon 只在真正等键处显示 —— PAL_DialogWaitForKey 由 page-break(text.c:1654)
// 与 dialog 结束(text.c:1772)触发。line-done 是行间自动推进,不显 icon。
//
// sdlpal text.c:1385-1386 真值守卫:`if (bDialogPosition != kDialogCenterWindow && != kDialogCenter)` 才画 icon。
//   → center(kDialogCenter)即便等键也**不画**黄色箭头(也不做 0xF9-0xFE palette 闪烁,见 present.ts)。
//   narration(kDialogCenterWindow)已在 drawDialogBox short-circuit(走 drawNarrationDialog 不画 icon),
//   故此处只需补 center 排除。
function shouldShowKeyIcon(state: DialogBoxState): boolean {
  if (state.style === 'center') return false
  return state.phase === 'waiting-page-key' || state.phase === 'waiting-end-key'
}

function drawTextLine(
  fb: Framebuffer,
  text: string,
  x: number,
  y: number,
  fontColor: number,
  glyphs: GlyphTable | undefined,
  colorOverride?: number,
  colors?: number[],
): void {
  if (text.length === 0) return
  // 正文和姓名均有三向黑色阴影，由字体渲染器统一处理(text.c:1144-1156)。
  // 姓名固定色优先，其次逐字色；缺少逐字色才使用调用方给的默认色。
  if (colorOverride !== undefined) {
    renderText(fb, text, x, y, colorOverride, glyphs, true)
  } else if (colors) {
    renderColoredText(fb, text, colors, x, y, glyphs, true)
  } else {
    renderText(fb, text, x, y, fontColor, glyphs, true)
  }
}

// ── 内部 blit ─────────────────────────────────────────────────────────────────

function blitSprite(fb: Framebuffer, sprite: DialogSprite, x: number, y: number): void {
  const { width, height, indices, opaque } = sprite
  for (let dy = 0; dy < height; dy++) {
    for (let dx = 0; dx < width; dx++) {
      const i = dy * width + dx
      if (opaque[i] === 1) {
        fb.writePixel(x + dx, y + dy, indices[i]!)
      }
    }
  }
}

/** Center-window box width in 8px units: ASCII=1, other dialogue characters=2.
 * This is the dialogue layout contract, independent of the loaded glyph bitmap widths.
 */
function measureDialogUnits(text: string): number {
  let units = 0
  for (const ch of text) units += ch.codePointAt(0)! < 0x80 ? 1 : 2
  return units
}

/**
 * narration居中小窗布局，对照text.c:1663-1710。
 *
 * 视觉:屏幕中央(160, 40)居中 SingleLineBox + 一行文字。box 宽度根据文字长度计算。
 * 用于"获得 XX × N" / "钱不够" / item info 等 1-shot 1.4s 自动关闭提示。
 *
 * sdlpal 真值算法:
 *   posDialogText = PAL_XY(160, 40)               (text.c:1345)
 *   len = sum(PAL_CharWidth(ch) >> 3) for ch in lpszText   (text.c:1681)
 *   pos = PAL_XY(posDialogText.x - len * 4, posDialogText.y)
 *   PAL_CreateSingleLineBoxWithShadow(pos, (len + 1) / 2, ...)
 *   TEXT_DisplayText(lpszText, pos.x + 8 + ((len & 1) << 2), pos.y + 10, ...)
 *
 * `PAL_CharWidth(ch) >> 3`:半角 8>>3=1 / 全角 16>>3=2。
 */
function drawNarrationDialog(
  fb: Framebuffer,
  state: DialogBoxState,
  glyphs: GlyphTable | undefined,
  ctx?: DialogBoxDrawCtx,
): void {
  // narration 是 1-shot 1 行 — 取 currentLineText(若有)或 shownLines[0]
  const text = state.currentLineText ?? state.shownLines[0] ?? ''
  if (text.length === 0) return
  // 逐字符色(parseDialogText with isDialog=TRUE:DEFAULT→0;`-`青/`'``@`红;`"`黄被屏蔽)
  const colors = state.currentLineColors ?? state.shownLineColors?.[0]

  const len = measureDialogUnits(text)

  // sdlpal text.c:1345 posDialogText = PAL_XY(160, 40)
  const POS_X = 160
  const POS_Y = 40
  const boxX = POS_X - len * 4
  const boxY = POS_Y
  const boxLen = Math.floor((len + 1) / 2)

  // 画 box(若 uiSpriteFrames 缺失则只画文字,debug 防御)
  if (ctx?.uiSpriteFrames) {
    drawSingleLineBox({
      fb,
      x: boxX,
      y: boxY,
      len: boxLen,
      uiSpriteFrames: ctx.uiSpriteFrames,
      // M13(2026-06-07 sdlpal 审查):narration 框 iDialogShadow 默认 0(无阴影,text.c:1687)——
      //   g_TextLib BSS 零初始化、PAL_InitText 不设;仅紫金葫芦炼丹临时置 5。原默认 6px 投影与原版
      //   不符(拾取 / 购买 / 施法等高频提示框右下角多出灰影)。
      shadowOffset: 0,
    })
  }

  // 文字 pos(sdlpal text.c:1698)— PAL_X(pos) + 8 + ((len & 1) << 2), PAL_Y(pos) + 10
  const textX = boxX + 8 + ((len & 1) << 2)
  const textY = boxY + 10

  // sdlpal TEXT_DisplayText(text.c:1459-1613) narration path(isDialog=TRUE)真值:
  //   - 整 text 一次性 display(text.c:1597 typing delay 仅 !isDialog 走)
  //   - 逐字符 switch case(text.c:1474)— '0'-'9' 数字字符走 PAL_DrawNumber sprite digit,
  //     其余走 PAL_DrawTextUnescape
  //   - text.c:1581-1582 真值:isDialog + bCurrentFontColor==FONT_COLOR_DEFAULT → color=**0(黑)**
  //   - text.c:1594 fShadow=!isDialog(narration isDialog=TRUE → fShadow=FALSE)
  //   - text.c:1592 PAL_DrawNumber(ch-'0', 1, PAL_XY(x, y+4), kNumColorYellow, kNumAlignLeft)
  //   - text.c:1595 x += PAL_CharWidth(ch)
  let cursorX = textX
  let ci = 0
  for (const ch of text) {
    if (ch >= '0' && ch <= '9' && ctx?.uiSpriteFrames) {
      // sdlpal text.c:1583-1592 真值:数字字符 yellow sprite digit blit at (x, y+4) left-align
      const digit = ch.charCodeAt(0) - 0x30
      drawNumber(fb, digit, 1, { x: cursorX, y: textY + 4 }, 'yellow', 'left', ctx.uiSpriteFrames)
      cursorX += 8 // L33:游标步进用 PAL_CharWidth=8(font_width>>1,text.c:1595/font.c:628);digit sprite 仍 6px(上行)→ 数字间留 2px 间隙
    } else {
      // sdlpal text.c:1594 PAL_DrawTextUnescape(text, ..., color, fShadow=FALSE);color 由 parseDialogText
      //   逐字符给(narration DEFAULT→0;`-`青/`'``@`红)。text.c:1595 x += PAL_CharWidth:半角 8 / 全角 16。
      const color = colors?.[ci] ?? 0
      const advance = renderText(fb, ch, cursorX, textY, color, glyphs, false)
      cursorX += advance
    }
    ci++
  }
}

/** sdlpal ui.h:110 SPRITENUM_ITEMBOX = 70(物品框背景 sprite,在 SPRITEUI 组)。 */
const SPRITENUM_ITEMBOX = 70

/**
 * 紫金葫芦炼丹物品框(style='item-box')，布局对照script.c:1479-1513。
 *
 * 视觉:屏幕居中 ITEMBOX 精灵(UI 70)+ 物品 BALL 图标@box+(8,7) + 2 行居中文字
 *   (line1="炼出"=getWord(42) / line2=物品名=getWord(itemId))。
 *
 * sdlpal 真值:
 *   - PAL_StartDialogWithOffset(kDialogCenterWindow, 0, 0, FALSE, 0, -10)
 *     → posDialogText = (160,40) + (0,-10) = (160,30)(text.c:1345/1350)
 *   - iDialogShadow = 5(script.c:1479)→ 每行 SingleLineBox shadow=5
 *   - ITEMBOX: iBG_X=(320-w)/2, iBG_Y=(200-h)/2(script.c:1485);图标@(iBG_X+8, iBG_Y+7)(:1507)
 *   - 文字行 y = posDialogText.y + nLine*18(text.c:1661):line0=30, line1=48
 */
function drawItemBoxDialog(
  fb: Framebuffer,
  state: DialogBoxState,
  glyphs: GlyphTable | undefined,
  ctx?: DialogBoxDrawCtx,
): void {
  const ib = state.itemBox
  if (!ib) return

  // ITEMBOX 精灵 + 物品图标(屏幕居中,script.c:1483-1508)
  const box = ctx?.uiSpriteFrames?.[SPRITENUM_ITEMBOX]
  if (box) {
    const bx = Math.floor((320 - box.width) / 2)
    const by = Math.floor((200 - box.height) / 2)
    blitSprite(fb, box, bx, by)
    const item = ctx?.items?.find((it) => it.id === ib.itemId)
    const icon = item ? ctx?.itemIcons?.get(item.bitmap) : undefined
    if (icon) blitSprite(fb, icon, bx + 8, by + 7) // script.c:1507 (pos.x+8, pos.y+7)
  }

  // 2 行居中文字(kDialogCenterWindow posDialogText=(160,30),行距 18;每行各自一个 SingleLineBox)
  drawItemBoxLine(fb, ib.line1, 160, 30, glyphs, ctx)
  drawItemBoxLine(fb, ib.line2, 160, 30 + 18, glyphs, ctx)
}

/** 物品框单行:居中 SingleLineBox(shadow=5)+ 居中文字(sdlpal text.c:1681-1698 kDialogCenterWindow 路径)。 */
function drawItemBoxLine(
  fb: Framebuffer,
  text: string,
  posX: number,
  posY: number,
  glyphs: GlyphTable | undefined,
  ctx?: DialogBoxDrawCtx,
): void {
  if (!text) return
  const len = measureDialogUnits(text)
  const boxX = posX - len * 4 // text.c:1685 pos.x = posDialogText.x - len*4
  if (ctx?.uiSpriteFrames) {
    drawSingleLineBox({
      fb,
      x: boxX,
      y: posY,
      len: Math.floor((len + 1) / 2),
      uiSpriteFrames: ctx.uiSpriteFrames,
      shadowOffset: 5, // iDialogShadow=5(script.c:1479)
    })
  }
  // 文字 pos(text.c:1698):x = boxX + 8 + ((len&1)<<2), y = posY + 10;isDialog DEFAULT 色=0(text.c:1581),fShadow=FALSE
  const textX = boxX + 8 + ((len & 1) << 2)
  renderText(fb, text, textX, posY + 10, 0, glyphs, false)
}
