import assert from 'node:assert/strict'
import { withoutFences } from './markdown.mjs'

export const preservedMarkerPairs = [
  ['<!-- incremental-original-source:start -->', '<!-- incremental-original-source:end -->'],
  ['<!-- original-source-quote:start -->', '<!-- original-source-quote:end -->'],
  ['<!-- original-source-fenced:start -->', '<!-- original-source-fenced:end -->'],
  ['<!-- template-source-example:start -->', '<!-- template-source-example:end -->'],
]

/** Find each codec independently, then union ranges. A surrounding history
 * section can never truncate a marker, and fenced headings are not boundaries. */
export function preservedMarkdownRanges(text) {
  const ranges = []
  for (const [start, end] of preservedMarkerPairs) {
    let offset = 0
    const open = []
    for (;;) {
      const begin = text.indexOf(start, offset)
      const finish = text.indexOf(end, offset)
      if (begin < 0 && finish < 0) break
      if (begin >= 0 && (finish < 0 || begin < finish)) {
        open.push(begin)
        offset = begin + start.length
      } else {
        assert(open.length > 0, 'unmatched historical source end marker')
        offset = finish + end.length
        ranges.push({ start: open.pop(), end: offset })
      }
    }
    // Approved original-source-quote wrappers also use start-to-EOF. Nested
    // quoted wrappers retain their own markers; pair them by depth first.
    for (const begin of open) {
      assert.equal(
        start,
        '<!-- original-source-quote:start -->',
        'historical source marker is unclosed',
      )
      ranges.push({ start: begin, end: text.length })
    }
  }
  for (const match of text.matchAll(/<pre\b[^>]*>[\s\S]*?<\/pre\s*>/giu))
    ranges.push({ start: match.index, end: match.index + match[0].length })
  let visible = withoutFences(text)
  // Keep offsets, including Unicode code units and newlines, unchanged.
  for (const range of [...ranges].sort((a, b) => b.start - a.start))
    visible =
      visible.slice(0, range.start) +
      visible.slice(range.start, range.end).replace(/[^\n]/g, ' ') +
      visible.slice(range.end)
  const headings = [...visible.matchAll(/^## ([^\n]*)$/gmu)]
  for (const [index, heading] of headings.entries())
    if (heading[1].startsWith('原文保全'))
      ranges.push({ start: heading.index, end: headings[index + 1]?.index ?? text.length })
  const merged = []
  for (const range of ranges.sort((a, b) => a.start - b.start || b.end - a.end)) {
    const last = merged.at(-1)
    if (last && range.start <= last.end) last.end = Math.max(last.end, range.end)
    else merged.push({ ...range })
  }
  return merged.map((range) => ({ ...range, text: text.slice(range.start, range.end) }))
}
