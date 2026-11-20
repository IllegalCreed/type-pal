import {
  type DialogueRow,
  parseRichText,
  resolveDialogueRowText,
  type TextId,
  type TextSpan,
} from '@type-pal/content'
import { FALLBACK_GLYPH_WIDTH, type GlyphTable } from '../text/glyph.js'

export interface DisplayLine {
  spans: TextSpan[]
  /** 多行源自同一条对白时沿用该条的速度。 */
  srcRowIdx: number
}

/** maxRight 与 startX 都是画布逻辑坐标；每个源对白行单独折行。 */
export function layoutLines(
  rows: readonly DialogueRow[],
  glyphs: GlyphTable,
  resolveText: (id: TextId) => string,
  maxRight: number,
  startX: number,
): DisplayLine[] {
  const usable = maxRight - startX
  const result: DisplayLine[] = []

  for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
    const src = rows[rowIdx]
    if (!src) continue
    const spans = parseRichText(resolveDialogueRowText(src, resolveText).replace(/\r\n?/g, '\n'))
    if (spans.every(({ text }) => text.length === 0)) {
      result.push({ spans: [{ text: '' }], srcRowIdx: rowIdx })
      continue
    }

    let lineWidth = 0
    let lineSpans: TextSpan[] = []
    const finishLine = () => {
      result.push({ spans: lineSpans, srcRowIdx: rowIdx })
      lineSpans = []
      lineWidth = 0
    }

    for (const { text, color } of spans) {
      for (const character of text) {
        if (character === '\n') {
          // 显式换行保留空行和下一行的缩进。
          finishLine()
          continue
        }
        const width = glyphs.get(character.codePointAt(0) ?? 0)?.width ?? FALLBACK_GLYPH_WIDTH
        if (lineWidth + width > usable && lineSpans.length > 0) finishLine()
        const last = lineSpans.at(-1)
        if (last && last.color === color) last.text += character
        else lineSpans.push({ text: character, color })
        lineWidth += width
      }
    }
    if (lineSpans.length > 0) finishLine()
  }

  return result
}
