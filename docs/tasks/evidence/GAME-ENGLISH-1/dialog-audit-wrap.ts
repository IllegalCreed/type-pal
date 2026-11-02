import { readFileSync, writeFileSync } from 'node:fs'
import { wrapEnglishDialogLine } from '../../../../packages/game/src/localization/messages.js'
import { parseDialogText } from '../../../../packages/game/src/present/dialog-box.js'
import type { PalLanguagePack } from '../../../../packages/shared/src/index.js'

const [packPath, output] = process.argv.slice(2)
if (!packPath) throw new Error('usage: dialog-audit-wrap.ts en.json [output.json]')
const pack: PalLanguagePack = JSON.parse(readFileSync(packPath, 'utf8'))
let checkedLines = 0
const failures: unknown[] = []
for (const width of [192, 208, 224, 260, 288]) {
  for (const group of pack.groups)
    for (const raw of group.lines) {
      if (raw === null) continue
      const source = parseDialogText(raw, 0x4f, false)
      const wrapped = wrapEnglishDialogLine(raw, width)
      let color = 0x4f
      let delay = 3
      let visible = ''
      const lineWidths = []
      for (const line of wrapped) {
        const parsed = parseDialogText(line, color, false, delay)
        lineWidths.push(
          [...parsed.text].reduce((sum, ch) => sum + (ch.codePointAt(0)! < 0x80 ? 8 : 16), 0),
        )
        color = parsed.endColor
        delay = parsed.endIDelay
        visible += parsed.text
      }
      checkedLines++
      if (
        lineWidths.some((n) => n > width) ||
        source.text.replace(/\s+/g, '') !== visible.replace(/\s+/g, '') ||
        color !== source.endColor ||
        delay !== source.endIDelay
      )
        failures.push({
          start: group.start,
          end: group.end,
          raw,
          width,
          wrapped,
          lineWidths,
          color,
          delay,
          source,
        })
    }
}
const result = {
  checkedLines,
  failures,
  scope:
    'All translated raw lines at each portrait/body/narration width; checks no visible non-whitespace loss, max pixel width under the ASCII8/nonASCII16 display contract, final color and delay. Not a glyph raster/layout screenshot oracle.',
}
if (output) writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`)
console.log(JSON.stringify(result, null, 2))
if (failures.length) process.exitCode = 1
