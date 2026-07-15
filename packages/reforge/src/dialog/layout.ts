/**
 * 对话排版(② 外观):把 DialogueRow[] 按 maxRight 切成扁平显示行。
 * 纯函数,不碰 DOM/canvas——宽度计算靠 GlyphTable(渲染资产)。
 * 自动换行:长句折成多 DisplayLine,使内容不被分辨率绑架。
 */
import { type DialogColor, type DialogueRow, parseRichText, type TextId } from '@type-pal/content'
import type { GlyphTable } from '../text/glyph.js'

export interface DisplayLine {
  spans: { text: string; color?: DialogColor }[] // 这一个显示行的 spans(已按宽度切好)
  srcRowIdx: number // 来自第几个 DialogueRow(逐行速度归属用)
  isRowStart: boolean // 是否该 DialogueRow 的首显示行
}

interface CharRun {
  text: string
  color?: DialogColor
}

/**
 * 把 DialogueRow[] 排版成 DisplayLine[]。
 * 每个 DialogueRow 经 resolveText + parseRichText → 字符流,按 maxRight - startX 折行。
 * 一个长 DialogueRow → 多 DisplayLine(第 1 个 isRowStart=true)。
 */
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
    const spans = parseRichText(resolveText(src.text).replace(/\r\n?/g, '\n'))
    // 展开成字符流(带 color),逐字符测宽分组
    const chars: CharRun[] = []
    for (const span of spans) {
      for (const ch of span.text) chars.push({ text: ch, color: span.color })
    }
    if (chars.length === 0) {
      result.push({ spans: [{ text: '' }], srcRowIdx: rowIdx, isRowStart: true })
      continue
    }

    let curWidth = 0
    let curRun: CharRun[] = []
    let isFirstOfLine = true

    const flush = () => {
      result.push(toDisplayLine(curRun, rowIdx, isFirstOfLine))
      isFirstOfLine = false
      curRun = []
      curWidth = 0
    }

    for (const c of chars) {
      if (c.text === '\n') {
        // 原版每条 showDialog 都强制另起一行；迁移器用 \n 保留这条数据边界。
        // 即使当前行为空也要落一行，连续换行不能被宽度排版吞掉。
        flush()
        continue
      }
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
function toDisplayLine(runs: CharRun[], srcRowIdx: number, isRowStart: boolean): DisplayLine {
  const spans: { text: string; color?: DialogColor }[] = []
  for (const r of runs) {
    const last = spans[spans.length - 1]
    if (last && last.color === r.color) {
      last.text += r.text
    } else {
      spans.push({ text: r.text, color: r.color })
    }
  }
  return { spans, srcRowIdx, isRowStart }
}
