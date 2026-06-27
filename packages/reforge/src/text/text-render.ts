import type { TextSpan } from '@type-pal/content'
import type { Palette } from '@type-pal/shared'
import { bakeGlyph, type GlyphTable } from './glyph.js'
import { indexToRgba, resolveRgba } from './palette-color.js'

const SHADOW_RGBA: [number, number, number] = [0, 0, 0] // color 0 = 黑(sdlpal text.c:1144)

export interface RenderSpansOpts {
  glyphs: GlyphTable
  palette: Palette
  shadow?: boolean
  /** 打字:只画前 N 个字符(跨 span 计数);省略 = 全画。 */
  maxChars?: number
  /** 传则全字用该 palette index 色(覆盖 span.color);姓名牌固定 CYAN_ALT 用。 */
  forceColorIndex?: number
}

/**
 * 逐字符 bake+drawImage;三层阴影(+1,0)/(0,+1)/(+1,+1) 黑 + 主色。
 * 返回画到的总宽度(px)。canvas 渲染逻辑,浏览器验收。
 */
export function renderSpans(
  ctx: CanvasRenderingContext2D,
  spans: readonly TextSpan[],
  x: number,
  y: number,
  opts: RenderSpansOpts,
): number {
  let cursorX = x
  let shown = 0
  const limit = opts.maxChars ?? Number.POSITIVE_INFINITY
  for (const span of spans) {
    const rgba =
      opts.forceColorIndex != null
        ? indexToRgba(opts.forceColorIndex, opts.palette)
        : resolveRgba(span.color ?? 'default', opts.palette)
    for (const ch of span.text) {
      if (shown >= limit) return cursorX - x
      const cp = ch.codePointAt(0) ?? 0
      const g = opts.glyphs.get(cp)
      const w = g?.width ?? 16
      if (g) {
        if (opts.shadow) {
          const s = bakeGlyph(cp, g, SHADOW_RGBA)
          ctx.drawImage(s, cursorX + 1, y)
          ctx.drawImage(s, cursorX, y + 1)
          ctx.drawImage(s, cursorX + 1, y + 1)
        }
        ctx.drawImage(bakeGlyph(cp, g, rgba), cursorX, y)
      }
      cursorX += w
      shown++
    }
  }
  return cursorX - x
}

/** 不画,只算宽度(布局用;光标定位 / 测量用)。 */
export function measureSpans(spans: readonly TextSpan[], glyphs: GlyphTable): number {
  let w = 0
  for (const span of spans) {
    for (const ch of span.text) {
      w += glyphs.get(ch.codePointAt(0) ?? 0)?.width ?? 16
    }
  }
  return w
}
