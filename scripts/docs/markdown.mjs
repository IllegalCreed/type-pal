// Small, dependency-free parser for file destinations, not a Markdown renderer.
// Keep offsets intact when hiding code so diagnostics retain original line numbers.
export function withoutFences(markdown) {
  let fence
  return markdown
    .replace(/<!--[\s\S]*?-->/g, (value) => value.replace(/[^\n]/g, ' '))
    .split('\n')
    .map((line) => {
      const match = /^(?: {0,3}> ?)* {0,3}(`{3,}|~{3,})(.*)$/.exec(line)
      if (fence) {
        if (
          match &&
          match[1][0] === fence[0] &&
          match[1].length >= fence.length &&
          !match[2].trim()
        ) {
          fence = undefined
        }
        return ' '.repeat(line.length)
      }
      if (match) {
        fence = match[1]
        return ' '.repeat(line.length)
      }
      return line
    })
    .join('\n')
}

function closingBracket(text, start) {
  let depth = 1
  for (let i = start + 1; i < text.length; i++) {
    if (text[i] === '\\') i++
    else if (text[i] === '[') depth++
    else if (text[i] === ']' && --depth === 0) return i
  }
  return -1
}

function destination(text, start) {
  let i = start
  while (/\s/.test(text[i] ?? '') && i < text.length) i++
  if (text[i] === '<') {
    const end = text.indexOf('>', i + 1)
    return end < 0
      ? undefined
      : { target: text.slice(i + 1, end), start: i + 1, targetEnd: end, end: end + 1 }
  }
  const begin = i
  let depth = 0
  for (; i < text.length; i++) {
    if (text[i] === '\\') i++
    else if (text[i] === '(') depth++
    else if (text[i] === ')') {
      if (depth === 0) break
      depth--
    } else if (/\s/.test(text[i]) && depth === 0) break
  }
  if (depth !== 0) return undefined
  return {
    target: text.slice(begin, i).replace(/\\([\s()[\]<>])/g, '$1'),
    start: begin,
    targetEnd: i,
    end: i,
  }
}

function inlineDestination(text, start) {
  const parsed = destination(text, start)
  if (!parsed) return undefined
  let end = parsed.end
  while (end < text.length && /\s/.test(text[end])) end++
  if (end !== parsed.end && ['"', "'", '('].includes(text[end])) {
    const closing = text[end] === '(' ? ')' : text[end]
    end++
    while (end < text.length && text[end] !== closing) {
      if (text[end] === '\\') end++
      end++
    }
    if (end === text.length) return undefined
    end++
    while (end < text.length && /\s/.test(text[end])) end++
  }
  return text[end] === ')' ? parsed : undefined
}

const labelKey = (label) => label.replace(/\s+/g, ' ').trim().toLowerCase()

export function markdownLinks(markdown, { positions = false } = {}) {
  const text = withoutFences(markdown)
  const lineStarts = [0]
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') lineStarts.push(i + 1)
  function lineAt(offset) {
    let lo = 0
    let hi = lineStarts.length
    while (lo + 1 < hi) {
      const mid = (lo + hi) >>> 1
      if (lineStarts[mid] <= offset) lo = mid
      else hi = mid
    }
    return lo + 1
  }
  const definitions = new Map()
  const definitionLines = new Set()
  const links = []
  for (const match of text.matchAll(/^ {0,3}\[([^\]\n]+)\]:[ \t]*(.*)$/gm)) {
    const offset = match.index + match[0].length - match[2].length
    const parsed = destination(text, offset)
    if (!parsed?.target) continue
    const { target } = parsed
    definitions.set(labelKey(match[1]), parsed)
    definitionLines.add(lineAt(match.index))
    links.push({
      target,
      line: lineAt(match.index),
      ...(positions ? { start: parsed.start, end: parsed.targetEnd } : {}),
    })
  }
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\\') {
      i++
      continue
    }
    if (text[i] === '`') {
      const run = /^`+/.exec(text.slice(i))[0]
      let end = text.indexOf(run, i + run.length)
      while (end >= 0 && (text[end - 1] === '`' || text[end + run.length] === '`')) {
        end = text.indexOf(run, end + run.length)
      }
      if (end >= 0) i = end + run.length - 1
      else i += run.length - 1
      continue
    }
    if (text[i] !== '[' || definitionLines.has(lineAt(i))) continue
    const close = closingBracket(text, i)
    if (close < 0) continue
    const label = text.slice(i + 1, close)
    let parsed
    let end = close
    if (text[close + 1] === '(') parsed = inlineDestination(text, close + 2)
    else if (text[close + 1] === '[') {
      end = text.indexOf(']', close + 2)
      if (end >= 0) parsed = definitions.get(labelKey(text.slice(close + 2, end) || label))
    } else parsed = definitions.get(labelKey(label))
    if (parsed?.target)
      links.push({
        target: parsed.target,
        line: lineAt(i),
        ...(positions ? { start: parsed.start, end: parsed.targetEnd } : {}),
      })
    i = Math.max(close, end)
  }
  return links
}
