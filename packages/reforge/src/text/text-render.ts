import type { TextSpan } from '@type-pal/content'
import { bakeGlyph, type GlyphTable } from './glyph.js'
import { colorRgba } from './palette-color.js'

const SHADOW_RGBA: [number, number, number] = [0, 0, 0] // color 0 = 黑(sdlpal text.c:1144)

export interface RenderSpansOpts {
  glyphs: GlyphTable
  shadow?: boolean
  /** 打字:只画前 N 个字符(跨 span 计数);省略 = 全画。 */
  maxChars?: number
  /** 传则全字用该固定 RGBA 色(覆盖 span.color);姓名牌固定色用。 */
  forceRgba?: readonly [number, number, number]
  /** 伪加粗:主色叠画 x 与 x+1(笔画 →2px)。装备/商店面板深色 label 用 ——
   *  原版 FBP 同位是美工粗体位图字(纯黑无影,考证 2026-07-11),16px 字模
   *  细笔画显单薄,作者裁决以加粗补偿、不引入原版没有的阴影。 */
  bold?: boolean
  /** 影色覆盖(缺省黑)。黑 label 配灰影用 —— 黑字黑影糊成一坨,作者裁决影用灰。 */
  shadowRgba?: readonly [number, number, number]
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
    const rgba = opts.forceRgba ?? colorRgba(span.color ?? 'default')
    for (const ch of span.text) {
      if (shown >= limit) return cursorX - x
      const cp = ch.codePointAt(0) ?? 0
      const g = opts.glyphs.get(cp)
      const w = g?.width ?? 16
      if (g) {
        if (opts.shadow) {
          const s = bakeGlyph(cp, g, opts.shadowRgba ?? SHADOW_RGBA)
          const sx = opts.bold ? 2 : 1 // 加粗时影随主体外扩,不被第二笔盖掉
          ctx.drawImage(s, cursorX + sx, y)
          ctx.drawImage(s, cursorX, y + 1)
          ctx.drawImage(s, cursorX + sx, y + 1)
        }
        const main = bakeGlyph(cp, g, rgba)
        ctx.drawImage(main, cursorX, y)
        if (opts.bold) ctx.drawImage(main, cursorX + 1, y)
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
