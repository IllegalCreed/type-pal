import type { Command, LocalizedMessageGroup, PalLanguagePack } from '@type-pal/shared'
import type { SlfLocalization } from '../io/slf.js'

export interface LanguageRevisions {
  slfSha256: string
  words: Record<string, { before: string; after: string }>
  groups: Record<string, { before: (string | null)[]; after: (string | null)[] }>
  /** Source SLF range -> range in the shared corrected script. */
  aliases: Record<string, { start: number; end: number }>
}

/** Match SDLPal's MESSAGE_GetSpan without changing any instruction or script identity. */
function messageRanges(commands: readonly Command[]): Set<string> {
  const ranges = new Set<string>()
  let i = 0
  while (i < commands.length) {
    const first = commands[i]!
    if (first.op !== 'showDialog') {
      i++
      continue
    }
    const start = first.messageIndex
    let last = start
    const next = commands[i + 1]
    if (next?.op === 'showDialog' && next.messageIndex !== last + 1) {
      i++
    } else {
      let beginning = true
      while (i < commands.length) {
        const command = commands[i]!
        if (command.op === 'showDialog' && (beginning || command.messageIndex === last + 1)) {
          last = command.messageIndex
        } else if (command.op !== 'raw' || command.opcode !== 0x8e) {
          break
        }
        i++
        beginning = false
      }
    }
    ranges.add(`${start}:${last}`)
  }
  return ranges
}

export function buildLanguagePack(
  slf: SlfLocalization,
  commands: readonly Command[],
  source: PalLanguagePack['source'],
  revisions: LanguageRevisions,
): PalLanguagePack {
  if (source.slfSha256 !== revisions.slfSha256) throw new Error('Unsupported English SLF source')
  const words = { ...slf.words }
  for (const [id, revision] of Object.entries(revisions.words)) {
    if (words[id] !== revision.before) throw new Error(`English word ${id} precondition failed`)
    words[id] = revision.after
  }
  const remaining = messageRanges(commands)
  const usedRevisions = new Set<string>()
  const usedAliases = new Set<string>()
  const groups: LocalizedMessageGroup[] = slf.groups.map((group) => {
    const key = `${group.start}:${group.end}`
    const alias = revisions.aliases[key]
    if (alias) usedAliases.add(key)
    const range = alias ?? group
    const normalized = `${range.start}:${range.end}`
    if (!remaining.delete(normalized))
      throw new Error(`English message range ${normalized} mismatch`)
    const revision = revisions.groups[key]
    if (revision) {
      if (JSON.stringify(group.lines) !== JSON.stringify(revision.before))
        throw new Error(`English message ${key} precondition failed`)
      usedRevisions.add(key)
    }
    return { start: range.start, end: range.end, lines: [...(revision?.after ?? group.lines)] }
  })
  if (remaining.size)
    throw new Error(`Missing English message ranges: ${[...remaining].join(', ')}`)
  if (usedRevisions.size !== Object.keys(revisions.groups).length)
    throw new Error('Unused English message revision')
  if (usedAliases.size !== Object.keys(revisions.aliases).length)
    throw new Error('Unused English message alias')
  // A full selectable language must not silently fall back to untranslated names or dialogue.
  for (let id = 0; id <= 564; id++) {
    if (!Object.hasOwn(words, id)) throw new Error(`Missing English word ${id}`)
  }
  if (Object.values(words).some((word) => /\p{Script=Han}/u.test(word)))
    throw new Error('Untranslated English word')
  if (
    groups.some((group) =>
      group.lines.some((line) => line !== null && /\p{Script=Han}/u.test(line)),
    )
  )
    throw new Error('Untranslated English message')
  return { version: 1, language: 'en', source, words, groups, layout: structuredClone(slf.layout) }
}
