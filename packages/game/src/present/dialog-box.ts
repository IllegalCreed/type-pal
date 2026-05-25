/**
 * DialogBox 真实实现 — port sdlpal text.c:1208-1750
 * PAL_StartDialogWithOffset + PAL_ShowDialogText + PAL_DialogWaitForKey
 *
 * **关键**:sdlpal upper/center/lower 不画 box(透明,scene 自然透出)。
 * 只有 kDialogCenterWindow 用 PAL_CreateBox sprite 边框,M5 暂不实现(留 M6)。
 *
 * 文本位置真值(sdlpal text.c:1313-1346 PAL_StartDialogWithOffset):
 *   top (upper):  hasPortrait ? (96, 26)  : (44, 26)
 *   center:       (80, 40)
 *   bottom/narration (lower): hasPortrait ? (20, 126) : (44, 126)
 *
 * 头像位置(sdlpal text.c:1289-1310):
 *   upper:  x=48 - w/2,  y=55 - h/2
 *   lower:  x=270 - w/2, y=144 - h/2
 *   center:不画头像
 *
 * typing FRAMES_PER_CHAR = 1:sdlpal 真值(每帧 1 字),@10fps = 100ms/字。
 * key icon blink:sdlpal text.c PAL_DialogWaitForKey g_TextLib.bIcon 每 16 帧 toggle。
 * 字阴影:sdlpal iDialogShadow > 0 时 +1px 偏移暗色(palette 0 黑)。M5 用 50 暗灰占位。
 */

import type { DialogBoxStyle } from '@type-pal/shared'
import type { Framebuffer } from './framebuffer.js'
import { renderText, type GlyphTable } from './font.js'
import type { DialogBoxState } from '../core/game-state.js'

// ── 常量 ──────────────────────────────────────────────────────────────────────

/**
 * 每 N 逻辑帧显示 1 字。sdlpal text.c PAL_ShowDialogText 真值 1 帧/字。
 * explore/event @10fps → 100ms/字,体感与 sdlpal classic 接近。
 */
export const FRAMES_PER_CHAR = 1

/** key icon blink 半周期(帧)。sdlpal text.c PAL_DialogWaitForKey 每 16 帧 toggle。 */
const KEY_ICON_BLINK_PERIOD = 16

/** 字阴影调色板下标(sdlpal palette[0] 真值黑;M5 用 50 暗灰占位)。 */
const SHADOW_COLOR = 50

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

/** 头像锚点:upper (48, 55) / lower (270, 144);blit 左上 = (anchor - w/2, anchor - h/2)。 */
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
      return null  // sdlpal center 不画头像
  }
}

// ── 4 styles 矩形(spec / e2e 仍可用 — sdlpal 真值,虽不画 box) ─────────────────

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

// ── splitPages ────────────────────────────────────────────────────────────────

/**
 * sdlpal `\r` 切页(PAL_ShowDialogText 检测 '\r' 时触发翻页等待)。
 * 空段过滤(防止首字符是 \r 生成空页)。
 */
function splitPages(text: string): string[] {
  return text.split('\r').filter((p) => p.length > 0)
}

// ── startDialog ───────────────────────────────────────────────────────────────

export function startDialog(
  text: string,
  opts: {
    style?: DialogBoxStyle
    portraitIcon?: number
    fontColor?: number
    shadow?: boolean
  },
): DialogBoxState {
  return {
    text,
    pages: splitPages(text),
    currentPage: 0,
    typingFrames: 0,
    charsRevealed: 0,
    isComplete: false,
    style: opts.style ?? 'bottom',
    portraitIcon: opts.portraitIcon,
    fontColor: opts.fontColor ?? 255,
    shadow: opts.shadow ?? false,
    keyIconBlink: false,
  }
}

// ── tickDialog ────────────────────────────────────────────────────────────────

/**
 * 每逻辑帧调一次:推进 typing 进度 + key icon 闪烁。
 * port sdlpal text.c:1616-1830 PAL_ShowDialogText 每帧出字逻辑。
 */
export function tickDialog(state: DialogBoxState): void {
  state.typingFrames++
  const pageText = state.pages[state.currentPage] ?? ''
  const wantChars = Math.floor(state.typingFrames / FRAMES_PER_CHAR)
  state.charsRevealed = Math.min(wantChars, pageText.length)

  if (!state.isComplete && state.charsRevealed >= pageText.length) {
    state.isComplete = true
  }

  // key icon blink:isComplete 后才有意义(sdlpal PAL_DialogWaitForKey)
  if (state.isComplete) {
    state.keyIconBlink = (Math.floor(state.typingFrames / KEY_ICON_BLINK_PERIOD) % 2) === 0
  }
}

// ── nextPage ──────────────────────────────────────────────────────────────────

/**
 * Confirm 键按下时调。三段式(port sdlpal PAL_DialogWaitForKey):
 * 1. typing 进行中 → 跳至当前页末(skip typing),return true(不翻页,消费 input)
 * 2. isComplete + 有下一页 → 翻页 + 重置 typing,return true
 * 3. isComplete + 最后一页 → return false(dialog 结束,caller 清 gs.dialogBox)
 */
export function nextPage(state: DialogBoxState): boolean {
  if (!state.isComplete) {
    const pageText = state.pages[state.currentPage] ?? ''
    state.charsRevealed = pageText.length
    state.isComplete = true
    state.keyIconBlink = false
    return true
  }

  if (state.currentPage < state.pages.length - 1) {
    state.currentPage++
    state.typingFrames = 0
    state.charsRevealed = 0
    state.isComplete = false
    state.keyIconBlink = false
    return true
  }

  return false
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

/**
 * sdlpal "key continue" icon 在 g_TextLib.bIcon 取真 frame index。
 * 0 / 1 帧最常见(箭头 / 三角)— M5 简版固定取 frame 0。
 */
const KEY_ICON_FRAME = 0

/**
 * 绘制对话框一帧(由 present.ts presentFrame 调用,在所有 sprite 之上)。
 *
 * **重要**:sdlpal upper/center/lower 真值不画 box bg / border —
 * scene 自然透出(原版半透明对话感来源)。M5 修齐,不再画 box。
 *
 * @param fb      目标 Framebuffer
 * @param state   DialogBoxState
 * @param glyphs  GlyphTable;undefined → tofu 占位
 * @param ctx     头像 + icon 资产(bootstrap 注入)
 */
export function drawDialogBox(
  fb: Framebuffer,
  state: DialogBoxState,
  glyphs: GlyphTable | undefined,
  ctx?: DialogBoxDrawCtx,
): void {
  // 1. portrait(若有 + style 允许)— sdlpal text.c:1289-1310
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

  // 2. text(按 charsRevealed 截 + sdlpal 真位置)
  const pos = getDialogTextPos(state.style, hasPortraitRendered)
  const pageText = state.pages[state.currentPage] ?? ''
  const visibleText = pageText.slice(0, state.charsRevealed)

  if (visibleText.length > 0) {
    if (state.shadow) {
      // 字阴影:+1px 偏移暗色(sdlpal iDialogShadow > 0)
      renderText(fb, visibleText, pos.x + 1, pos.y + 1, SHADOW_COLOR, glyphs)
    }
    renderText(fb, visibleText, pos.x, pos.y, state.fontColor, glyphs)
  }

  // 3. key icon(等键时右下角闪烁 — sdlpal text.c:1391 PAL_SpriteGetFrame bufDialogIcons)
  if (state.isComplete && state.currentPage < state.pages.length - 1 && state.keyIconBlink) {
    const iconSprite = ctx?.iconFrames?.get(KEY_ICON_FRAME)
    if (iconSprite) {
      // icon 位置:文本块右下方;sdlpal text.c 真值约 textX + 文本宽 + 余量。
      // 简版:在文本起点右下 ~280, textY+36 处(lower box 内右下角)。
      const iconX = 280
      const iconY = pos.y + 36
      blitSprite(fb, iconSprite, iconX, iconY)
    }
  }
}

// ── 内部 blit ─────────────────────────────────────────────────────────────────

/**
 * sprite blit(left-top 锚,opaque mask 真用)。
 * 与 draw-sprite.ts drawSprite 不同 — drawSprite 用 anchorX/anchorY 中心底,
 * dialog 用左上(sdlpal portrait blit 直接按真值左上对齐)。
 */
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
