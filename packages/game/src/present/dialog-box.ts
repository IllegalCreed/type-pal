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
  return {
    shownLines: [],
    currentLineText: text,
    typingFrames: 0,
    charsRevealed: 0,
    phase: 'typing',
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
 */
export function setWaitingPageKey(
  state: DialogBoxState,
  pendingStyle?: DialogBoxState['pendingStyle'],
): void {
  state.phase = 'waiting-page-key'
  state.typingFrames = 0
  state.keyIconBlink = true
  if (pendingStyle !== undefined) {
    state.pendingStyle = pendingStyle
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

  // 2. text:所有已完成行 + 当前行(截 charsRevealed)
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
): void {
  if (text.length === 0) return
  if (state.shadow) {
    renderText(fb, text, x + 1, y + 1, SHADOW_COLOR, glyphs)
  }
  renderText(fb, text, x, y, state.fontColor, glyphs)
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
