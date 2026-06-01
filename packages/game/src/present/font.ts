/**
 * 字符渲染(M4 P4.T3)。
 * 真 glyph blit:UTF-8 codepoint → GlyphTable → 16×16 indexed bitmap → blit。
 * 数据源:data/extracted/data/font/glyphs.json(Unifont CN BDF 预处理产物)。
 *
 * API 兼容说明:
 *   renderText(fb, text, x, y, color) — glyphs 默认 fallback(tofu 框占位)
 *   renderText(fb, text, x, y, color, glyphs) — 真字形 blit
 * 删除 M2 8×16 色块占位代码。
 */

import type { Framebuffer } from './framebuffer.js'

export interface Glyph {
  width: number    // 8 (ASCII half-width) or 16 (CJK full-width)
  height: number   // 16
  bitmap: Uint8Array
}

export interface GlyphTable {
  has(codepoint: number): boolean
  get(codepoint: number): Glyph | undefined
}

// ── Tofu fallback(16×16 空心框,渲染未加载字形时显示) ────────────────

const TOFU_BITMAP: Uint8Array = (() => {
  const b = new Uint8Array(32)
  // 顶行 + 底行全亮
  b[0] = 0xFF; b[1] = 0xFE
  b[30] = 0xFF; b[31] = 0xFE
  // 中间行只有最左最右各一像素
  for (let r = 1; r < 15; r++) {
    b[r * 2] = 0x80
    b[r * 2 + 1] = 0x02
  }
  return b
})()

const TOFU_GLYPH: Glyph = { width: 16, height: 16, bitmap: TOFU_BITMAP }

// ── loadGlyphs(browser 环境,fetch glyphs.json) ────────────────────────

export async function loadGlyphs(baseUrl = '/extracted'): Promise<GlyphTable> {
  const res = await fetch(`${baseUrl}/data/font/glyphs.json`)
  if (!res.ok) throw new Error(`font: fetch glyphs.json failed (${res.status})`)
  const data = await res.json() as {
    glyphs: { codepoint: number; width: number; height: number; bitmapBase64: string }[]
  }
  const map = new Map<number, Glyph>()
  for (const g of data.glyphs) {
    map.set(g.codepoint, {
      width: g.width,
      height: g.height,
      bitmap: Uint8Array.from(atob(g.bitmapBase64), (c) => c.charCodeAt(0)),
    })
  }
  return {
    has: (cp) => map.has(cp),
    get: (cp) => map.get(cp),
  }
}

// ── 空 GlyphTable 占位(glyphs 未加载时用 tofu fallback) ──────────────

const EMPTY_GLYPH_TABLE: GlyphTable = {
  has: () => false,
  get: () => undefined,
}

// ── Core blit ─────────────────────────────────────────────────────────

function blitGlyph(
  fb: Framebuffer,
  x: number,
  y: number,
  glyph: Glyph,
  fgColor: number,
): void {
  const bytesPerRow = Math.ceil(glyph.width / 8)
  for (let row = 0; row < glyph.height; row++) {
    for (let col = 0; col < glyph.width; col++) {
      const byteIdx = row * bytesPerRow + Math.floor(col / 8)
      const bit = (glyph.bitmap[byteIdx]! >> (7 - (col % 8))) & 1
      if (bit) {
        fb.writePixel(x + col, y + row, fgColor)
      }
    }
  }
}

// ── Public API ────────────────────────────────────────────────────────

/**
 * 把 `text` 从 (x, y) 起 blit 到 framebuffer。
 *
 * @param fb        目标 Framebuffer
 * @param text      要渲染的字符串
 * @param x         起始 X(像素)
 * @param y         起始 Y(像素)
 * @param fgColor   调色板前景色下标
 * @param glyphs    GlyphTable;省略时用空表(全 tofu 占位)
 * @returns         渲染宽度(像素)
 */
export function renderText(
  fb: Framebuffer,
  text: string,
  x: number,
  y: number,
  fgColor: number,
  glyphs: GlyphTable = EMPTY_GLYPH_TABLE,
  fShadow = false,
): number {
  let cursorX = x
  for (const ch of text) {
    const cp = ch.codePointAt(0)!
    const g = glyphs.get(cp) ?? TOFU_GLYPH
    // sdlpal text.c:1144-1155 真值 fShadow=TRUE 时 triple shadow offset
    //   (+1, 0) / (0, +1) / (+1, +1) color=0(黑)+ 主色字。
    // 注释明说 DOS triple / WIN95 single,sdlpal 自己 "fix" 统一 triple
    // (认为 WIN95 单层是 bug)。ts 跟 sdlpal 真值,不凭截图视觉调整。
    if (fShadow) {
      blitGlyph(fb, cursorX + 1, y, g, 0)
      blitGlyph(fb, cursorX, y + 1, g, 0)
      blitGlyph(fb, cursorX + 1, y + 1, g, 0)
    }
    blitGlyph(fb, cursorX, y, g, fgColor)
    cursorX += g.width
  }
  return cursorX - x
}

/**
 * 逐字符上色版 renderText —— `colors[i]` 是第 i 个 code point 的调色板色(对话控制符 `-`青/`'`红/`@`/`"`黄
 * toggle 解析出的逐字符色,见 dialog-box.parseDialogText)。port sdlpal TEXT_DisplayText 的 per-char 绘制
 * (text.c:1594 PAL_DrawTextUnescape 每字符用当时 bCurrentFontColor)。
 *
 * @returns 渲染宽度(像素)
 */
export function renderColoredText(
  fb: Framebuffer,
  text: string,
  colors: readonly number[],
  x: number,
  y: number,
  glyphs: GlyphTable = EMPTY_GLYPH_TABLE,
  fShadow = false,
): number {
  let cursorX = x
  let i = 0
  for (const ch of text) {
    const cp = ch.codePointAt(0)!
    const g = glyphs.get(cp) ?? TOFU_GLYPH
    if (fShadow) {
      // sdlpal text.c:1144-1155 triple shadow color 0(同 renderText)
      blitGlyph(fb, cursorX + 1, y, g, 0)
      blitGlyph(fb, cursorX, y + 1, g, 0)
      blitGlyph(fb, cursorX + 1, y + 1, g, 0)
    }
    blitGlyph(fb, cursorX, y, g, colors[i] ?? 0x4f) // 缺色防御 → DEFAULT 0x4F
    cursorX += g.width
    i++
  }
  return cursorX - x
}

/**
 * 测量 `text` 渲染后的总像素宽度(不写 fb)。
 *
 * @param text    要测量的字符串
 * @param glyphs  GlyphTable;省略时全字符按 16px 宽计
 * @returns       总宽度(像素)
 */
export function measureText(
  text: string,
  glyphs: GlyphTable = EMPTY_GLYPH_TABLE,
): number {
  let w = 0
  for (const ch of text) {
    const cp = ch.codePointAt(0)!
    const g = glyphs.get(cp)
    w += g?.width ?? 16
  }
  return w
}

/**
 * sdlpal `PAL_CharWidth`(font.c:611-629)忠实移植:返回 `font_width[ch] >> 1`。
 * 标准字体 font_width 默认表:ASCII(<0x80)= 16 → 8px,CJK = 32 → 16px。
 * **静态判定**(纯按 codepoint),不读字体资源、不依赖 glyph 加载 —— 与 measureText 区别:后者依赖
 * glyphs 且 ASCII 缺失 fallback 成 16px(font.ts measureText),会让 ASCII 宽度翻倍,**不可**用于布局公式。
 */
export function palCharWidth(cp: number): number {
  return cp < 0x80 ? 8 : 16
}

/**
 * sdlpal `PAL_WordWidth`(ui.c:836-861)忠实移植:`(Σ PAL_CharWidth + 8) >> 4` —— 返回"全宽字数"(量化值),
 * 非像素、非 string.length。纯 CJK 时碰巧 == 字数,但 ASCII 文案会分叉(8 个 ASCII → 4 而非 8)。
 * 用于菜单项 x 坐标公式(OpeningMenu uigame.c:107-108、动作菜单等)。
 */
export function palWordWidth(text: string): number {
  let w = 0
  for (const ch of text) w += palCharWidth(ch.codePointAt(0)!)
  return (w + 8) >> 4
}
