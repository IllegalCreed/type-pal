/**
 * DialogBox 真实实现 — port sdlpal text.c:1208-1815
 * PAL_StartDialogWithOffset + PAL_ShowDialogText + PAL_DialogWaitForKey + PAL_ClearDialog + PAL_EndDialog
 *
 * **sdlpal 真实交互(text.c:1616 PAL_ShowDialogText 真值)**:
 *  - 每条 showDialog opcode = 1 行;**单行 typing 完不等键**,opcode 直接推进
 *  - 累计 4 行后再来 showDialog → PAL_DialogWaitForKey(等 Confirm)+ 清屏 + 行号归零 + 画新行
 *  - dialog 整段结束(script 跑到 end / 退出 event mode)→ PAL_EndDialog → PAL_ClearDialog(TRUE)
 *    → 若有过任何行 → 等 1 次 Confirm 才真清屏
 *  - typing 进行中按 Confirm → fUserSkip = TRUE,当前行剩字瞬现(g_TextLib.fUserSkip 读后不重置 cursor)
 *
 * **状态机 phase**:
 *  - 'typing':       当前行 typing 中,Confirm = 跳行末
 *  - 'line-done':    当前行 typing 完,**event-system 自动推进 cursor.ip 到下一 opcode**,无需 Confirm
 *  - 'waiting-page-key':  shownLines==4 + 来了新 showDialog → 等 Confirm 清屏
 *  - 'waiting-end-key':   dialog 整段结束(撞 end opcode)+ 有行 → 等 Confirm 关 dialog
 *
 * **行间不停**:典型 NPC 对话 3-4 行 = 玩家按 0-1 次 Confirm(只在第 5 行 / 整段末)。
 *
 * 真值表(sdlpal text.c:1289-1346):
 *   portrait/text 位置 同前(不变,fix1 已对)。
 *   typing FRAMES_PER_CHAR = 1(每帧 1 字,@10fps = 100ms/字)。
 *   LINE_HEIGHT_PX = 18(sdlpal text.c:1661 `y + nCurrentDialogLine * 18`)。
 *   MAX_LINES_PER_PAGE = 4(text.c:1649 `nCurrentDialogLine > 3` 触发等键)。
 */

import type { DialogBoxStyle } from '@type-pal/shared'
import type { Framebuffer } from './framebuffer.js'
import { renderText, type GlyphTable } from './font.js'
import type { DialogBoxState, DialogPhase } from '../core/game-state.js'
import { drawSingleLineBox } from './menu/draw-box.js'

// ── 常量 ──────────────────────────────────────────────────────────────────────

export const FRAMES_PER_CHAR = 1
const KEY_ICON_BLINK_PERIOD = 16
const SHADOW_COLOR = 50

/**
 * sdlpal text.c:29 `#define FONT_COLOR_DEFAULT 0x4F` = 79。
 * 默认对话字体色 — palette idx 79 在原版调色板里是亮黄/浅米色。
 * 修复 fix1 错把默认设成 255(白)— sdlpal 真值是 0x4F。
 */
export const FONT_COLOR_DEFAULT = 0x4F

/** sdlpal text.c:1649 `nCurrentDialogLine > 3`:超过 3 (即 4) 触发等键 */
export const MAX_LINES_PER_PAGE = 4

/**
 * 去掉 sdlpal text.c:1534/1542 的 `$XX` / `~XX` 控制码,只 strip 不显示。
 *
 * 真值(text.c:1534-1554):
 *   `$XX` → 设 iDelayTime = X * 10 / 7(typing 速度),sdlpal 固定 `lpszText += 3` 即吃 3 字符。
 *   `~XX` → 延 X * 80 / 7 ms 后 return(本行立即结束),sdlpal 也是 2 位 decimal。
 *
 * 当前 strip-only:不做 typing 减速 / 自动 end 延时(留下一轮按需补)。
 * 视觉上原版你看不到 `$10` `~30` 字面,我们之前直接 typing 出来是 bug。
 */
export function stripDialogControlCodes(text: string): string {
  return text.replace(/[$~]\d{1,2}/g, '')
}

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
      return { x: 12, y: 8 }  // sdlpal default,center 一般不用 title
    case 'bottom':
    case 'narration':
      return { x: hasPortrait ? 4 : 12, y: 108 }
  }
}

/**
 * sdlpal text.c:1717-1719 真值 — 姓名识别:全角 `：` (0xff1a) / `∶` (0x2236) / 半角 `:` 结尾。
 */
export function isCharacterNameLine(text: string): boolean {
  if (text.length === 0) return false
  const last = text.charCodeAt(text.length - 1)
  return last === 0xff1a || last === 0x2236 || last === 0x3a /* ':' */
}

/** sdlpal text.c:33 真值 `#define FONT_COLOR_CYAN_ALT 0x8C` — 姓名 title 渲染色。 */
export const FONT_COLOR_CYAN_ALT = 0x8C

// ── 头像位置(sdlpal text.c:1289-1310 真值) ───────────────────────────────────

interface PortraitPos {
  x: number
  y: number
}

function getPortraitPos(
  style: DialogBoxStyle,
  width: number,
  height: number,
): PortraitPos | null {
  switch (style) {
    case 'top':
      return { x: 48 - Math.floor(width / 2), y: 55 - Math.floor(height / 2) }
    case 'bottom':
    case 'narration':
      return { x: 270 - Math.floor(width / 2), y: 144 - Math.floor(height / 2) }
    case 'center':
      return null
  }
}

// ── 4 styles 矩形(仅供测试 / e2e 引用;实际不画 box) ─────────────────────────

export interface BoxRect {
  x: number
  y: number
  w: number
  h: number
}

const STYLE_RECTS: Record<DialogBoxStyle, BoxRect> = {
  top:       { x: 8, y: 8,   w: 304, h: 48 },
  center:    { x: 8, y: 80,  w: 304, h: 48 },
  bottom:    { x: 8, y: 144, w: 304, h: 48 },
  narration: { x: 8, y: 144, w: 304, h: 48 },
}

export function getDialogBoxRect(style: DialogBoxStyle): BoxRect {
  return STYLE_RECTS[style]
}

// ── startDialogLine ───────────────────────────────────────────────────────────

/**
 * 启动 dialog 显示首行。event-system showDialog opcode 在 gs.dialogBox==undefined 时调。
 * shownLines=[],currentLineText=text,phase='typing'。
 */
export function startDialogLine(
  text: string,
  opts: {
    style?: DialogBoxStyle
    portraitIcon?: number
    fontColor?: number
    shadow?: boolean
  },
): DialogBoxState {
  // sdlpal text.c:1715-1727 真值:`:` 结尾的字符串 = 姓名 title,画独立位置,不计入 line。
  // 我们把它写进 titleText,**不** typing(姓名一闪而出 = sdlpal `PAL_DrawText` 单次绘)。
  const isTitle = isCharacterNameLine(text)
  return {
    titleText: isTitle ? text : undefined,
    shownLines: [],
    currentLineText: isTitle ? null : text,
    typingFrames: 0,
    charsRevealed: isTitle ? 0 : 0,
    phase: isTitle ? 'line-done' : 'typing',  // title 即出完,让 event-system 立即 ip++ 下条
    style: opts.style ?? 'bottom',
    portraitIcon: opts.portraitIcon,
    fontColor: opts.fontColor ?? FONT_COLOR_DEFAULT,
    shadow: opts.shadow ?? false,
    keyIconBlink: false,
  }
}

// ── appendDialogLine ──────────────────────────────────────────────────────────

/**
 * 把上一行(已 line-done)推进 shownLines,开始新行 typing。
 * event-system showDialog opcode 在 gs.dialogBox!=undefined 时调。
 *
 * **必须先在 caller 中检查 shouldWaitPageKey(state)** — 如果会到第 5 行,
 * 不调本函数,而是 setWaitingPageKey(state) 等键后再调。
 */
export function appendDialogLine(state: DialogBoxState, text: string): void {
  // sdlpal text.c:1715 姓名识别 — `:` 结尾的字符串画 title 位置,不进 shownLines。
  if (isCharacterNameLine(text)) {
    state.titleText = text
    // **不**修改 currentLineText / phase — title 跟现在 typing 的 dialog 并存
    return
  }
  // 把"上次 line-done 的 currentLineText"沉入 shownLines
  if (state.currentLineText !== null) {
    state.shownLines.push(state.currentLineText)
  }
  state.currentLineText = text
  state.typingFrames = 0
  state.charsRevealed = 0
  state.phase = 'typing'
  state.keyIconBlink = false
}

/**
 * 判定:再加一行是否会撞满(>=4 行已显 + 新行)→ caller 应先 setWaitingPageKey。
 *
 * 触发条件:shownLines 中已有 4 条(即 phase='line-done' 时的 currentLineText 是第 4 行,
 * 或 phase 已 'waiting-page-key' 表示尚未沉入)。本函数在 appendDialogLine 之**前**调用。
 */
export function shouldWaitPageKey(state: DialogBoxState): boolean {
  // currentLineText 若已 typing 完,逻辑上算 1 行;还没沉 shownLines 因为 append 才沉
  const effectiveLines = state.shownLines.length
    + (state.currentLineText !== null && state.phase === 'line-done' ? 1 : 0)
  return effectiveLines >= MAX_LINES_PER_PAGE
}

// ── setWaitingPageKey / setWaitingEndKey ──────────────────────────────────────

/**
 * 第 5 行 showDialog 到来 → 进 waiting-page-key,等 Confirm 清屏。
 *
 * 可选 pendingStyle:若由 setDialogStyleX 在已有 dialog 上触发的 PAL_ClearDialog(TRUE),
 * 把新 style/portrait/fontColor 暂存,Confirm 翻页时 caller 应用到 gs。
 *
 * Sync.2 fix8:可选 fullClear:若由 0x05 ClearDialog 或 setDialogStyleX 触发,
 * Confirm 翻页后 caller 应 gs.dialogBox = undefined(对应 sdlpal PAL_ClearDialog(TRUE))。
 */
export function setWaitingPageKey(
  state: DialogBoxState,
  pendingStyle?: DialogBoxState['pendingStyle'],
  fullClear?: boolean,
  preOpClear?: boolean,
  partialClear?: boolean,
): void {
  state.phase = 'waiting-page-key'
  state.typingFrames = 0
  state.keyIconBlink = true
  if (pendingStyle !== undefined) {
    state.pendingStyle = pendingStyle
  }
  if (fullClear) {
    state.pendingFullClear = true
  }
  if (preOpClear) {
    state.pendingPreOpClear = true
  }
  if (partialClear) {
    state.pendingPartialClear = true
  }
}

/** dialog 整段结束(end opcode 触发)+ 有行 → 进 waiting-end-key。 */
export function setWaitingEndKey(state: DialogBoxState): void {
  state.phase = 'waiting-end-key'
  state.typingFrames = 0
  state.keyIconBlink = true
}

// ── tickDialog ────────────────────────────────────────────────────────────────

/**
 * 每逻辑帧调一次:
 *  - typing 中 → 推 charsRevealed,完后 phase → 'line-done'
 *  - line-done / wait 状态 → blink key icon
 */
export function tickDialog(state: DialogBoxState): void {
  state.typingFrames++

  if (state.phase === 'typing' && state.currentLineText !== null) {
    const want = Math.floor(state.typingFrames / FRAMES_PER_CHAR)
    state.charsRevealed = Math.min(want, state.currentLineText.length)
    if (state.charsRevealed >= state.currentLineText.length) {
      state.phase = 'line-done'
    }
  }

  // blink key icon — 任何 line-done / wait 状态都 blink,UX 提示玩家"可推进"。
  if (state.phase !== 'typing') {
    state.keyIconBlink = (Math.floor(state.typingFrames / KEY_ICON_BLINK_PERIOD) % 2) === 0
  }
}

// ── confirmDialog ─────────────────────────────────────────────────────────────

/**
 * Confirm 按键时调,返回值告诉 event-system 接下来做什么:
 *  - 'skip-typing':  当前行 typing 中 → 跳行末(fUserSkip)。caller 不动 cursor。
 *  - 'page-advance': 之前 waiting-page-key → 清屏 + line=0。caller 应 appendDialogLine
 *                    (即推进到下一 showDialog opcode)— 实际上 caller 仍 cursor.ip++ 让
 *                    event-system 跑下一条 opcode。
 *  - 'dialog-end':   之前 waiting-end-key → 关 dialog。caller 清 gs.dialogBox + cursor.ip++。
 *  - 'noop':         其他状态(line-done 等),Confirm 无效(等自动推进)。
 */
export type ConfirmResult = 'skip-typing' | 'page-advance' | 'dialog-end' | 'noop'

export function confirmDialog(state: DialogBoxState): ConfirmResult {
  if (state.phase === 'typing' && state.currentLineText !== null) {
    state.charsRevealed = state.currentLineText.length
    state.phase = 'line-done'
    return 'skip-typing'
  }
  if (state.phase === 'waiting-page-key') {
    // 清屏 + line=0,准备画新行(caller 在 ip++ 后下条 showDialog 会调 startDialogLine/append)。
    // 注意:caller 应在 page-advance 后读 state.pendingStyle:
    //   - 非空 → 由 setDialogStyleX 触发的 ClearDialog,caller 应 apply pendingStyle 到 gs +
    //           清 gs.dialogBox(让下次 showDialog 重建)
    //   - 空 → 累计 4 行触发,caller 推 cursor.ip(下条 showDialog 会 append 第 5 行)
    state.shownLines = []
    state.currentLineText = null
    state.typingFrames = 0
    state.charsRevealed = 0
    state.phase = 'line-done' // 临时;caller 推 ip → 下条 showDialog 调 append 切到 'typing'
    state.keyIconBlink = false
    return 'page-advance'
  }
  if (state.phase === 'waiting-end-key') {
    return 'dialog-end'
  }
  return 'noop'
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
}

const KEY_ICON_FRAME = 0

/**
 * 绘一帧 dialog:画所有 shownLines(完整)+ currentLineText 的 charsRevealed 截断。
 * 行布局:`pos.y + lineIdx * LINE_HEIGHT_PX`。
 *
 * key icon 显示条件:phase != 'typing' && (有下个动作可期待)。
 *   waiting-page-key / waiting-end-key:必须 blink(玩家必须按键)
 *   line-done:也 blink(玩家可按 Confirm 跳过 fUserSkip,但本来就完了 — 显示 hint)
 */
export function drawDialogBox(
  fb: Framebuffer,
  state: DialogBoxState,
  glyphs: GlyphTable | undefined,
  ctx?: DialogBoxDrawCtx,
): void {
  // Sync.2 fix10:dialog 无活跃内容(shownLines=[]+currentLineText=null)时 整个 dialog 不画 —
  //   包括 portrait + key icon。对应 sdlpal `nCurrentDialogLine=0` 后 PAL_ShowDialogText 不被
  //   调,自然 portrait 不再 blit。我们 retainstate 但渲染层 short-circuit。
  //   场景:0x05 ClearDialog 翻页 + cutscene NPC opcode 期间,portrait 不再 overlay。
  //
  // 注:currentLineText 非 null 但 charsRevealed=0(startDialogLine 后第 0 tick)
  //    仍 draw — portrait + text 框已"准备好显示",玩家会看到 portrait 先于文字。
  const hasActiveContent = state.shownLines.length > 0
    || state.currentLineText !== null
    || state.titleText !== undefined
  if (!hasActiveContent) return

  // T14:narration style(kDialogCenterWindow)— sdlpal text.c:1663-1710 真值。
  // 居中 SingleLineBox + 一行文字 居中显示(eg. "获得 XX × N" 物品提示)。
  // 跟其他 style(透明 typing 多行)逻辑完全不同,short-circuit。
  if (state.style === 'narration') {
    drawNarrationDialog(fb, state, glyphs, ctx)
    return
  }

  // 1. portrait(sdlpal text.c:1289-1310)
  let hasPortraitRendered = false
  if (state.portraitIcon !== undefined && ctx?.portraitFrames) {
    const portrait = ctx.portraitFrames.get(state.portraitIcon)
    if (portrait) {
      const pos = getPortraitPos(state.style, portrait.width, portrait.height)
      if (pos) {
        blitSprite(fb, portrait, pos.x, pos.y)
        hasPortraitRendered = true
      }
    }
  }

  // 2a. title(姓名,以 `:` 结尾 — sdlpal text.c:1725 真值 FONT_COLOR_CYAN_ALT,独立位置)
  if (state.titleText !== undefined) {
    const titlePos = getDialogTitlePos(state.style, hasPortraitRendered)
    drawTextLine(fb, state.titleText, titlePos.x, titlePos.y, state, glyphs, FONT_COLOR_CYAN_ALT)
  }

  // 2b. text:所有已完成行 + 当前行(截 charsRevealed)
  const basePos = getDialogTextPos(state.style, hasPortraitRendered)

  for (let i = 0; i < state.shownLines.length; i++) {
    const line = state.shownLines[i]!
    drawTextLine(fb, line, basePos.x, basePos.y + i * LINE_HEIGHT_PX, state, glyphs)
  }

  // 当前行(typing 或 line-done):画在 shownLines 之后第 N 行
  if (state.currentLineText !== null && state.charsRevealed > 0) {
    const lineIdx = state.shownLines.length
    const visible = state.currentLineText.slice(0, state.charsRevealed)
    drawTextLine(fb, visible, basePos.x, basePos.y + lineIdx * LINE_HEIGHT_PX, state, glyphs)
  }

  // 3. key icon(等键 / line-done 时右下角闪烁)
  if (shouldShowKeyIcon(state) && state.keyIconBlink) {
    const iconSprite = ctx?.iconFrames?.get(KEY_ICON_FRAME)
    if (iconSprite) {
      // icon 位置:最后一行的右下方,sdlpal text.c:1745 `posIcon = PAL_XY(x, y)`
      // 简版:lower box 右下固定位置(可后期改 sdlpal 精确位置)
      const lineIdx = state.currentLineText !== null
        ? state.shownLines.length
        : Math.max(0, state.shownLines.length - 1)
      const iconX = 280
      const iconY = basePos.y + lineIdx * LINE_HEIGHT_PX + 12
      blitSprite(fb, iconSprite, iconX, iconY)
    }
  }
}

function shouldShowKeyIcon(state: DialogBoxState): boolean {
  return state.phase === 'waiting-page-key' || state.phase === 'waiting-end-key'
    || state.phase === 'line-done'
}

function drawTextLine(
  fb: Framebuffer,
  text: string,
  x: number,
  y: number,
  state: DialogBoxState,
  glyphs: GlyphTable | undefined,
  colorOverride?: number,
): void {
  if (text.length === 0) return
  // Sync.2 fix17:sdlpal text.c:1594/1725 真值,文字都有阴影(`fShadow=TRUE`)。
  // 我们之前 shadow gated by state.shadow,但 sdlpal 文字渲染 default 带 shadow。
  // 用 state.shadow ?? true,但当前 startDialogLine 默认 false → fix:都画 shadow。
  renderText(fb, text, x + 1, y + 1, SHADOW_COLOR, glyphs)
  renderText(fb, text, x, y, colorOverride ?? state.fontColor, glyphs)
}

// ── 内部 blit ─────────────────────────────────────────────────────────────────

function blitSprite(
  fb: Framebuffer,
  sprite: DialogSprite,
  x: number,
  y: number,
): void {
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

/**
 * T14:narration style(kDialogCenterWindow)1:1 port — sdlpal text.c:1663-1710 真值。
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

  // sdlpal len:半角 1 / 全角 2
  let len = 0
  for (const ch of text) {
    const cp = ch.codePointAt(0)!
    len += cp < 0x80 ? 1 : 2
  }

  // sdlpal text.c:1345 posDialogText = PAL_XY(160, 40)
  const POS_X = 160
  const POS_Y = 40
  const boxX = POS_X - len * 4
  const boxY = POS_Y
  const boxLen = Math.floor((len + 1) / 2)

  // 画 box(若 uiSpriteFrames 缺失则只画文字,debug 防御)
  if (ctx?.uiSpriteFrames) {
    drawSingleLineBox({
      fb, x: boxX, y: boxY, len: boxLen, uiSpriteFrames: ctx.uiSpriteFrames,
    })
  }

  // 文字 pos(sdlpal text.c:1698)
  const textX = boxX + 8 + ((len & 1) << 2)
  const textY = boxY + 10
  // sdlpal text.c:1698 真值:TEXT_DisplayText(lpszText, ...) **一次性 display 整 text**,
  // 不 typing(narration path 没 typing loop)。state.charsRevealed 截断仅适用 upper/lower
  // /center 透明文字风格 — narration 无视 charsRevealed,直接画全 text。
  // 字色 sdlpal text.c:29 FONT_COLOR_DEFAULT=0x4F + fShadow=true(text.c:1594 TEXT_DisplayText
  // 内调 PAL_DrawTextUnescape fShadow=!isDialog 真值:narration isDialog=TRUE → !TRUE = FALSE。
  // 但 sdlpal 真值是 isDialog=TRUE(text.c:1698 最后参),所以 fShadow=FALSE。
  renderText(fb, text, textX, textY, FONT_COLOR_DEFAULT, glyphs, false)
}
