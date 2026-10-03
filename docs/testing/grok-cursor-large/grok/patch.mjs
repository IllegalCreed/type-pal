/**
 * 由唯一 from/to 生成可应用 unified diff。
 * 上下文停在空行之前，避免 hunk 里出现只有空格的上下文行。
 */
export function buildApplicablePatch(originalText, from, to, source) {
  const text = typeof originalText === 'string' ? originalText : originalText.toString('utf8')
  const parts = text.split(from)
  if (parts.length !== 2) throw new Error(`mutation site count ${parts.length - 1}`)
  const mutantText = parts.join(to)
  if (mutantText === text) throw new Error('mutation did not change bytes')
  const oldLines = splitLines(text)
  const newLines = splitLines(mutantText)
  let start = 0
  const prefix = Math.min(oldLines.length, newLines.length)
  while (start < prefix && oldLines[start] === newLines[start]) start += 1
  let oldEnd = oldLines.length - 1
  let newEnd = newLines.length - 1
  while (oldEnd >= start && newEnd >= start && oldLines[oldEnd] === newLines[newEnd]) {
    oldEnd -= 1
    newEnd -= 1
  }
  let before = 0
  while (before < 3 && start - before > 0 && oldLines[start - before - 1] !== '') before += 1
  let after = 0
  while (
    after < 3 &&
    oldEnd + 1 + after < oldLines.length &&
    newEnd + 1 + after < newLines.length &&
    oldLines[oldEnd + 1 + after] !== '' &&
    oldLines[oldEnd + 1 + after] === newLines[newEnd + 1 + after]
  ) {
    after += 1
  }
  const oldFrom = start - before
  const oldMid = Math.max(0, oldEnd - start + 1)
  const newMid = Math.max(0, newEnd - start + 1)
  const oldSlice = oldLines.slice(oldFrom, oldEnd + 1 + after)
  const newSlice = newLines.slice(oldFrom, newEnd + 1 + after)
  const body = []
  for (let i = 0; i < before; i += 1) body.push(` ${oldSlice[i]}`)
  for (let i = 0; i < oldMid; i += 1) body.push(`-${oldSlice[before + i]}`)
  for (let i = 0; i < newMid; i += 1) body.push(`+${newSlice[before + i]}`)
  for (let i = 0; i < after; i += 1) body.push(` ${oldSlice[before + oldMid + i]}`)
  for (const line of body) {
    if (line === ' ' || /[ \t]$/.test(line))
      throw new Error(`unsafe patch line ${JSON.stringify(line)}`)
  }
  const header = `@@ -${oldFrom + 1},${oldSlice.length} +${oldFrom + 1},${newSlice.length} @@`
  const patch = [`--- a/${source}`, `+++ b/${source}`, header, ...body, ''].join('\n')
  return { patch, mutantText }
}

function splitLines(text) {
  const lines = text.split('\n')
  if (text.endsWith('\n')) lines.pop()
  return lines
}
