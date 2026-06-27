/**
 * 对话排版(② 外观):把 DialogueLine[] 按 maxRight 切成扁平显示行。
 * 纯函数,不碰 DOM/canvas——宽度计算靠 GlyphTable(渲染资产)。
 * 自动换行:长句折成多 DisplayLine,使内容不被分辨率绑架。
 */
import { type DialogColor, type DialogueLine, parseRichText, type TextId } from '@type-pal/content'
import type { GlyphTable } from '../text/glyph.js'

export interface DisplayLine {
  spans: { text: string; color?: DialogColor }[] // 这一个显示行的 spans(已按宽度切好)
  srcLineIdx: number // 来自第几个 DialogueLine(姓名牌/光标归属用)
  isLineStart: boolean // 是否该 DialogueLine 的首显示行(姓名牌只画首行)
}

interface CharRun {
  text: string
  color?: DialogColor
}

/**
 * 把 DialogueLine[] 排版成 DisplayLine[]。
 * 每个 DialogueLine 经 resolveText + parseRichText → 字符流,按 maxRight - startX 折行。
 * 一个长 DialogueLine → 多 DisplayLine(第 1 个 isLineStart=true)。
 */
export function layoutLines(
  lines: readonly DialogueLine[],
  glyphs: GlyphTable,
  resolveText: (id: TextId) => string,
  maxRight: number,
  startX: number,
): DisplayLine[] {
  const usable = maxRight - startX
  const result: DisplayLine[] = []

  for (let li = 0; li < lines.length; li++) {
    const src = lines[li]
    if (!src) continue
    const spans = parseRichText(resolveText(src.text))
    // 展开成字符流(带 color),逐字符测宽分组
    const chars: CharRun[] = []
    for (const span of spans) {
      for (const ch of span.text) chars.push({ text: ch, color: span.color })
    }
    if (chars.length === 0) {
      result.push({ spans: [{ text: '' }], srcLineIdx: li, isLineStart: true })
      continue
    }

    let curWidth = 0
    let curRun: CharRun[] = []
    let isFirstOfLine = true

    const flush = () => {
      result.push(toDisplayLine(curRun, li, isFirstOfLine))
      isFirstOfLine = false
      curRun = []
      curWidth = 0
    }

    for (const c of chars) {
      const cp = c.text.codePointAt(0) ?? 0
      const w = glyphs.get(cp)?.width ?? 16
      if (curWidth + w > usable && curRun.length > 0) {
        flush()
      }
      curRun.push(c)
      curWidth += w
    }
    if (curRun.length > 0) flush()
  }

  return result
}

/** 字符 run 数组 → DisplayLine spans(合并相邻同色)。 */
function toDisplayLine(runs: CharRun[], srcLineIdx: number, isLineStart: boolean): DisplayLine {
  const spans: { text: string; color?: DialogColor }[] = []
  for (const r of runs) {
    const last = spans[spans.length - 1]
    if (last && last.color === r.color) {
      last.text += r.text
    } else {
      spans.push({ text: r.text, color: r.color })
    }
  }
  return { spans, srcLineIdx, isLineStart }
}
