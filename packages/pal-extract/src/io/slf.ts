import type { LocalizedMessageGroup, PalLanguagePack } from '@type-pal/shared'

export interface SlfLocalization {
  words: Record<string, string>
  groups: LocalizedMessageGroup[]
  layout: PalLanguagePack['layout']
}

/** SLF is UTF-8. Message bodies preserve whitespace, escapes and control codes. */
export function parseSlf(text: string): SlfLocalization {
  const result: SlfLocalization = { words: {}, groups: [], layout: {} }
  let section: string | undefined
  let message: { start: number; lines: (string | null)[] } | undefined
  const groups = new Set<string>()
  const layoutIds = new Set<number>()
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/)
  function fail(line: number, reason: string): never {
    throw new Error(`Invalid SLF at line ${line}: ${reason}`)
  }
  for (const [index, line] of lines.entries()) {
    const number = index + 1
    if (message) {
      const end = /^\[END MESSAGE\]\s+(\d+)\s*$/.exec(line)
      if (end) {
        const last = Number(end[1])
        if (!Number.isSafeInteger(last) || last < message.start)
          fail(number, 'invalid message range')
        const key = `${message.start}:${last}`
        if (groups.has(key)) fail(number, `duplicate message ${key}`)
        groups.add(key)
        result.groups.push({ start: message.start, end: last, lines: message.lines })
        message = undefined
      } else if (/^\[(?:BEGIN|END) /.test(line)) {
        fail(number, 'unexpected section inside message')
      } else {
        message.lines.push(line === '[CLEAR MESSAGE]' ? null : line)
      }
      continue
    }
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const start = /^\[BEGIN MESSAGE\]\s+(\d+)\s*$/.exec(line)
    if (start && !section) {
      const id = Number(start[1])
      if (!Number.isSafeInteger(id)) fail(number, 'invalid message identity')
      message = { start: id, lines: [] }
      continue
    }
    const begin = /^\[BEGIN (WORDS|LAYOUT|SETTING|CREDITS|DESCRIPTIONS)\]$/.exec(trimmed)
    if (begin && !section) {
      section = begin[1]
      continue
    }
    if (section && trimmed === `[END ${section}]`) {
      section = undefined
      continue
    }
    if (!section || trimmed.startsWith('[')) fail(number, 'unexpected section or text')
    if (section !== 'WORDS' && section !== 'LAYOUT') continue
    const assignment = /^(\d+)\s*=(.*)$/.exec(trimmed)
    if (!assignment) fail(number, `invalid ${section} assignment`)
    const id = Number(assignment[1])
    if (!Number.isSafeInteger(id)) fail(number, 'invalid identity')
    const value = assignment[2]!.trim()
    if (section === 'WORDS') {
      if (Object.hasOwn(result.words, id)) fail(number, `duplicate word ${id}`)
      if ((/\\+$/.exec(value)?.[0].length ?? 0) % 2 !== 0) fail(number, 'dangling word escape')
      result.words[id] = value.replace(/\\(.)/gu, '$1')
    } else {
      if (layoutIds.has(id)) fail(number, `duplicate layout ${id}`)
      layoutIds.add(id)
      const coordinates = /^(-?\d+),\s*(-?\d+)(?:,\s*(\d+))?$/.exec(value)
      if (!coordinates || id < 1 || id > 82) fail(number, 'invalid layout')
      const x = Number(coordinates[1])
      const y = Number(coordinates[2])
      const flags = Number(coordinates[3] ?? 0)
      if (![x, y, flags].every(Number.isSafeInteger) || flags > 3)
        fail(number, 'invalid layout coordinates or flags')
      // 81/82 specify extra description rows, not screen positions.
      if (id <= 80) result.layout[id] = { x, y, flags }
    }
  }
  if (message || section) fail(lines.length, 'unterminated section')
  const sorted = [...result.groups].sort((a, b) => a.start - b.start)
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i]!.start <= sorted[i - 1]!.end) fail(lines.length, 'overlapping message ranges')
  }
  return result
}
