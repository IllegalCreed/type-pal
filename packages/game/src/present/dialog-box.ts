/**
 * DialogBox 真实实现 — port sdlpal text.c:1208-1750
 * PAL_StartDialogWithOffset + PAL_ShowDialogText + PAL_DialogWaitForKey
 *
 * 4 styles 位置(sdlpal text.c:1208-1280 PAL_StartDialogWithOffset):
 *   top:       x=8,  y=8,   w=304, h=48  (kDialogUpper)
 *   center:    x=8,  y=80,  w=304, h=48  (kDialogCenter)
 *   bottom:    x=8,  y=144, w=304, h=48  (kDialogLower)
 *   narration: x=8,  y=144, w=304, h=48  (位置同 bottom,noBorder — M2 简化)
 *
 * typing FRAMES_PER_CHAR = 4:
 *   sdlpal @10fps(explore/event)每帧 100ms。sdlpal PAL_ShowDialogText 每帧出 1 字。
 *   M5 选 4 帧/字(~0.4s/字)以体现"逐字出现"的节奏感。
 *
 * key icon blink period = 16 帧(sdlpal PAL_DialogWaitForKey g_TextLib.bIcon 每 16 帧切换)。
 *
 * 字阴影色 = palette 50(sdlpal 真值 palette[0] 即黑;M5 用 50 暗灰占位,M6 映射真 palette)。
 */

import type { DialogBoxStyle } from '@type-pal/shared'
import type { Framebuffer } from './framebuffer.js'
import { renderText, type GlyphTable } from './font.js'
import type { DialogBoxState } from '../core/game-state.js'

// ── 常量 ──────────────────────────────────────────────────────────────────────

/** 每 N 逻辑帧显示 1 字(typing 节奏)。 */
export const FRAMES_PER_CHAR = 4

/** key icon blink 半周期(帧)。sdlpal text.c PAL_DialogWaitForKey 每 16 帧 toggle。 */
const KEY_ICON_BLINK_PERIOD = 16

/** 字阴影调色板下标(sdlpal text.c iDialogShadow > 0:字底 +1px 偏移暗色)。 */
const SHADOW_COLOR = 50

// ── 4 styles 矩形 ─────────────────────────────────────────────────────────────

export interface BoxRect {
  x: number
  y: number
  w: number
  h: number
  /** narration 无边框 */
  noBorder?: boolean
}

/**
 * sdlpal text.c:1208 PAL_StartDialogWithOffset 各 style 框坐标。
 * 原版 320×200 屏幕;x=8 全宽 304=320-2*8。
 */
const STYLE_RECTS: Record<DialogBoxStyle, BoxRect> = {
  top:       { x: 8, y: 8,   w: 304, h: 48 },
  center:    { x: 8, y: 80,  w: 304, h: 48 },
  bottom:    { x: 8, y: 144, w: 304, h: 48 },
  narration: { x: 8, y: 144, w: 304, h: 48, noBorder: true },
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

/**
 * 从文本和选项初始化 DialogBoxState。
 * event-system.ts 的 showDialog case 调此函数替代旧的 `gs.dialogBox = { text, style }`。
 */
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
 * 由 event-system.ts 的 waiting='dialog' 分支在每 tick 调用。
 *
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
    // 跳到当前页末(skip typing)
    const pageText = state.pages[state.currentPage] ?? ''
    state.charsRevealed = pageText.length
    state.isComplete = true
    state.keyIconBlink = false
    return true
  }

  if (state.currentPage < state.pages.length - 1) {
    // 翻页
    state.currentPage++
    state.typingFrames = 0
    state.charsRevealed = 0
    state.isComplete = false
    state.keyIconBlink = false
    return true
  }

  // 最后一页完成 → dialog 结束
  return false
}

// ── drawDialogBox ─────────────────────────────────────────────────────────────

/**
 * 绘制对话框一帧(由 present.ts presentFrame 调用,在所有 sprite 之上)。
 *
 * port sdlpal text.c:1271 PAL_StartDialogWithOffset(边框/背景)
 *        + text.c:1616 PAL_ShowDialogText(逐字显示)
 *        + text.c:1391 PAL_SpriteGetFrame(key icon)
 *
 * @param fb      目标 Framebuffer
 * @param state   DialogBoxState(由 startDialog 初始化,tickDialog 更新)
 * @param glyphs  GlyphTable;undefined → tofu 占位
 */
export function drawDialogBox(
  fb: Framebuffer,
  state: DialogBoxState,
  glyphs: GlyphTable | undefined,
): void {
  const rect = STYLE_RECTS[state.style]

  // 1. 框背景 + 边框(sdlpal text.c:1271 PAL_StartDialogWithOffset)
  drawBoxBg(fb, rect)

  // 2. 文本起始 X(有头像则右移 — sdlpal text.c:1313 portrait blit 后 textX 偏移)
  let textStartX = rect.x + 8
  if (state.portraitIcon !== undefined) {
    // 头像占 32px 宽 + 8px 间距 = 40px offset(sdlpal text.c:1313 x=4 + 36px portrait width 真值约 32)
    // M5 简版:画占位框,真 RLE blit 留 M6
    drawPortraitPlaceholder(fb, rect.x + 4, rect.y + 8)
    textStartX = rect.x + 40
  }

  // 3. 文本(按 charsRevealed 截断)
  const pageText = state.pages[state.currentPage] ?? ''
  const visibleText = pageText.slice(0, state.charsRevealed)
  const textY = rect.y + 12

  if (state.shadow && visibleText.length > 0) {
    // 字阴影:先画 +1px 偏移暗色版(sdlpal text.c iDialogShadow > 0)
    renderText(fb, visibleText, textStartX + 1, textY + 1, SHADOW_COLOR, glyphs)
  }
  if (visibleText.length > 0) {
    renderText(fb, visibleText, textStartX, textY, state.fontColor, glyphs)
  }

  // 4. key icon(等键时右下角闪烁 — sdlpal text.c:1391 PAL_SpriteGetFrame dialog icon)
  //    条件:当前页完成 + 还有下一页(需翻页) + 当前 blink-phase 为 true
  if (state.isComplete && state.currentPage < state.pages.length - 1 && state.keyIconBlink) {
    drawKeyIcon(fb, rect.x + rect.w - 12, rect.y + rect.h - 12)
  }
}

// ── 内部绘制辅助 ──────────────────────────────────────────────────────────────

function drawBoxBg(fb: Framebuffer, rect: BoxRect): void {
  const { x, y, w, h, noBorder } = rect
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const isBorder = !noBorder && (dy === 0 || dy === h - 1 || dx === 0 || dx === w - 1)
      // 背景:palette 0(黑);边框:palette 255(白)
      fb.writePixel(x + dx, y + dy, isBorder ? 255 : 0)
    }
  }
}

/** 头像占位(真 RLE blit 留 M6):32×32 白边框。 */
function drawPortraitPlaceholder(fb: Framebuffer, px: number, py: number): void {
  for (let dy = 0; dy < 32; dy++) {
    for (let dx = 0; dx < 32; dx++) {
      const isBorder = dy === 0 || dy === 31 || dx === 0 || dx === 31
      if (isBorder) fb.writePixel(px + dx, py + dy, 255)
    }
  }
}

/** 等键 icon:简版 4×4 白色实心块(sdlpal text.c:1391 dialog icon sprite 占位)。 */
function drawKeyIcon(fb: Framebuffer, x: number, y: number): void {
  for (let dy = 0; dy < 4; dy++) {
    for (let dx = 0; dx < 4; dx++) {
      fb.writePixel(x + dx, y + dy, 255)
    }
  }
}
