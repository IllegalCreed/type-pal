import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { setLanguage } from '../../../../packages/game/src/localization/language.js'
import {
  getMissingEnglishMessageGroups,
  resolveMessageGroup,
  setEnglishMessages,
} from '../../../../packages/game/src/localization/messages.js'
import type { Command, PalLanguagePack } from '../../../../packages/shared/src/index.js'

const [source, packPath, output] = process.argv.slice(2)
if (!source || !packPath)
  throw new Error('usage: dialog-audit-entries.ts all.json en.json [output.json]')
const sourceBytes = readFileSync(source)
const packBytes = readFileSync(packPath)
const commands: Command[] = JSON.parse(sourceBytes.toString()).segments.flatMap(
  (segment: { commands: Command[] }) => segment.commands,
)
const pack: PalLanguagePack = JSON.parse(packBytes.toString())
setLanguage('en')
setEnglishMessages(pack.groups)
const groups: {
  sourceIp: number
  resumeIp: number
  start: number
  end: number
  translated: boolean
}[] = []
for (let i = 0; i < commands.length; i++) {
  const first = commands[i]!
  if (first.op !== 'showDialog') continue
  const sourceIp = i
  let end = first.messageIndex
  while (i + 1 < commands.length) {
    const next = commands[i + 1]!
    if (next.op === 'raw' && next.opcode === 0x8e) i++
    else if (next.op === 'showDialog' && next.messageIndex === end + 1) {
      end = next.messageIndex
      i++
    } else break
  }
  groups.push({
    sourceIp,
    resumeIp: i + 1,
    start: first.messageIndex,
    end,
    translated: !!resolveMessageGroup(commands, sourceIp),
  })
}
const middleEntries = []
for (const group of groups) {
  for (let ip = group.sourceIp + 1; ip < group.resumeIp; ip++) {
    const cmd = commands[ip]!
    if (!cmd.label) continue
    let textIp = ip
    while (true) {
      const boundary = commands[textIp]
      if (boundary?.op !== 'raw' || boundary.opcode !== 0x8e) break
      textIp++
    }
    const first = commands[textIp]
    if (first?.op !== 'showDialog') continue
    const translated = !!resolveMessageGroup(commands, textIp)
    middleEntries.push({
      entryIp: ip,
      messageIp: textIp,
      messageIndex: first.messageIndex,
      sourceGroup: group,
      translated,
    })
  }
}
const result = {
  source,
  sourceSha256: createHash('sha256').update(sourceBytes).digest('hex'),
  pack: packPath,
  packSha256: createHash('sha256').update(packBytes).digest('hex'),
  commandCount: commands.length,
  labeledEntryCount: commands.filter((c) => c.label).length,
  groupCount: groups.length,
  missingFullGroups: groups.filter((g) => !g.translated),
  middleEntries,
  missing: getMissingEnglishMessageGroups(),
  scope:
    'Static labels cover disasm opcode targets, random jump range, resume/advance entries and collectScriptEntries roots. No runtime claim; dynamic/transformed save targets are outside this audit.',
}
if (output) writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`)
console.log(JSON.stringify(result, null, 2))
if (result.missingFullGroups.length || result.middleEntries.some((entry) => !entry.translated)) {
  process.exitCode = 1
}
