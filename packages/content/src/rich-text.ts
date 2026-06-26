import type { DialogColor, TextSpan } from './index.js'

const COLOR_TAGS = ['cyan', 'red', 'redAlt', 'yellow'] as const

/**
 * 解析 locale 富文本串 → TextSpan[]。
 * 仅识别成对闭合的颜色标记 `<cyan>…</cyan>`(非嵌套);其余按纯文本。
 * 无标记 / 空串 → 单 span(空串 → `[{text:''}]`),保证调用方拿到非空数组。
 */
export function parseRichText(s: string): TextSpan[] {
  const spans: TextSpan[] = []
  const re = new RegExp(`<(${COLOR_TAGS.join('|')})>(.*?)</\\1>`, 'g')
  let last = 0
  let m: RegExpExecArray | null
  // biome-ignore lint/suspicious/noAssignInExpressions: 标准 regex 迭代
  while ((m = re.exec(s)) !== null) {
    if (m.index > last) spans.push({ text: s.slice(last, m.index) })
    spans.push({ text: m[2] as string, color: m[1] as DialogColor })
    last = m.index + m[0].length
  }
  if (last < s.length) spans.push({ text: s.slice(last) })
  if (spans.length === 0) spans.push({ text: '' })
  return spans
}
