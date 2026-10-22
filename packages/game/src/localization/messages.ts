import type { Command, LocalizedMessageGroup } from '@type-pal/shared'
import { getLanguage } from './language.js'

/** A display cursor, not a script cursor: source instructions retain their identities. */
export interface LocalizedDialogPlayback {
  resumeIp: number
  lineIndex: number
  /** Absence pins the original-language path until this source group finishes. */
  lines?: (string | null)[]
}

interface MessageSpan {
  start: number
  end: number
  resumeIp: number
}

let englishGroups = new Map<string, readonly (string | null)[]>()
const missingGroups = new Map<string, { start: number; end: number }>()

export function setEnglishMessages(groups: readonly LocalizedMessageGroup[]): void {
  englishGroups = new Map(groups.map((group) => [`${group.start}:${group.end}`, [...group.lines]]))
  missingGroups.clear()
}

/** Missing spans are inspectable without emitting a warning for each rendered frame. */
export function getMissingEnglishMessageGroups(): { start: number; end: number }[] {
  return [...missingGroups.values()]
}

/** SDLPal MESSAGE_GetSpan: consecutive message identities, with RestoreScreen between them. */
function messageSpan(commands: readonly Command[], sourceIp: number): MessageSpan | undefined {
  const first = commands[sourceIp]
  if (first?.op !== 'showDialog') return undefined
  let end = first.messageIndex
  let resumeIp = sourceIp + 1
  while (resumeIp < commands.length) {
    const next = commands[resumeIp]!
    if (next.op === 'raw' && next.opcode === 0x8e) {
      resumeIp++
    } else if (next.op === 'showDialog' && next.messageIndex === end + 1) {
      end = next.messageIndex
      resumeIp++
    } else break
  }
  return { start: first.messageIndex, end, resumeIp }
}

export function resolveMessageGroup(
  commands: readonly Command[],
  sourceIp: number,
): LocalizedDialogPlayback | undefined {
  if (getLanguage() !== 'en') return undefined
  const span = messageSpan(commands, sourceIp)
  if (!span) return undefined
  const key = `${span.start}:${span.end}`
  const lines = englishGroups.get(key)
  if (!lines) {
    missingGroups.set(key, { start: span.start, end: span.end })
    return undefined
  }
  return { resumeIp: span.resumeIp, lineIndex: 0, lines: [...lines] }
}

/** Pin even untranslated groups so changing the preference cannot translate only their suffix. */
export function beginDialogPlayback(
  commands: readonly Command[],
  sourceIp: number,
  availableWidth?: number,
): LocalizedDialogPlayback {
  const playback = resolveMessageGroup(commands, sourceIp) ?? {
    resumeIp: messageSpan(commands, sourceIp)?.resumeIp ?? sourceIp + 1,
    lineIndex: 0,
  }
  if (playback.lines && availableWidth !== undefined) {
    playback.lines = playback.lines.flatMap((line) =>
      line === null ? [null] : wrapEnglishDialogLine(line, availableWidth),
    )
  }
  return playback
}

interface TextToken {
  raw: string
  width: number
  space: boolean
}

function dialogTokens(raw: string): TextToken[] {
  const chars = [...raw]
  const tokens: TextToken[] = []
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]!
    if (ch === '~') {
      // The parser stops at '~'. Never turn its hidden suffix into another visible line.
      tokens.push({ raw: chars.slice(i).join(''), width: 0, space: false })
      break
    }
    if (ch === '$') {
      tokens.push({ raw: chars.slice(i, i + 3).join(''), width: 0, space: false })
      i += 2
    } else if (ch === '\\' && chars[i + 1] !== undefined) {
      const escaped = chars[++i]!
      tokens.push({
        raw: `\\${escaped}`,
        width: escaped.codePointAt(0)! < 0x80 ? 8 : 16,
        space: escaped === ' ',
      })
    } else {
      const control = '-\'@"()\\'.includes(ch)
      tokens.push({
        raw: ch,
        width: control ? 0 : ch.codePointAt(0)! < 0x80 ? 8 : 16,
        space: ch === ' ',
      })
    }
  }
  return tokens
}

/** Wrap only translated display lines. Raw escapes, colors, timing and trailing '~' stay ordered. */
export function wrapEnglishDialogLine(raw: string, availableWidth: number): string[] {
  const maxWidth = Math.max(16, availableWidth)
  const lines: string[] = []
  let row: TextToken[] = []
  let width = 0
  for (const token of dialogTokens(raw)) {
    if (width + token.width > maxWidth && width > 0) {
      let space = -1
      for (let i = row.length - 1; i >= 0; i--) {
        if (row[i]!.space) {
          space = i
          break
        }
      }
      const cut = space > 0 ? space : row.length
      lines.push(
        row
          .slice(0, cut)
          .map((part) => part.raw)
          .join(''),
      )
      row = space > 0 ? row.slice(space + 1) : []
      width = row.reduce((sum, part) => sum + part.width, 0)
      // An unbroken word after a prior space may itself exceed the available width.
      if (width + token.width > maxWidth && width > 0) {
        lines.push(row.map((part) => part.raw).join(''))
        row = []
        width = 0
      }
    }
    if (row.length === 0 && token.space && lines.length > 0) continue
    row.push(token)
    width += token.width
  }
  if (row.length > 0 || lines.length === 0) lines.push(row.map((part) => part.raw).join(''))
  return lines
}
