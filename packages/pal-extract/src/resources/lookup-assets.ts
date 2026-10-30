/** Lookup writer borrows preflighted data; CLI owns output admission and cleanup. */
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { PalLanguagePack } from '@type-pal/shared'
import { glyphsToJson, parseBdf } from '../font/bdf-to-json.js'
import type { Words } from '../io/word.js'
import { writeJson } from '../io/write.js'

/** Borrow preflighted lookup/language data; optional font IO errors still propagate to CLI. */
export function writeLookupAssets(
  rawRoot: string,
  outputRoot: string,
  words: Words,
  messages: readonly string[],
  englishPack: PalLanguagePack | undefined,
): void {
  writeJson(resolve(outputRoot, 'lookup', 'words.json'), words)
  writeJson(resolve(outputRoot, 'lookup', 'strings.json'), messages)
  writeJson(resolve(outputRoot, 'lookup', 'languages.json'), {
    languages: englishPack ? ['zh-CN', 'en'] : ['zh-CN'],
  })
  if (englishPack) writeJson(resolve(outputRoot, 'lookup', 'en.json'), englishPack)

  const BDF_PATH = resolve(rawRoot, 'unifont-cn.bdf')
  if (existsSync(BDF_PATH)) {
    console.log('[pal-extract] BDF → JSON font glyphs …')
    const bdfText = readFileSync(BDF_PATH, 'utf8')
    const glyphs = parseBdf(bdfText)
    writeJson(resolve(outputRoot, 'data', 'font', 'glyphs.json'), glyphsToJson(glyphs))
    console.log(`[pal-extract] font glyphs written: ${glyphs.length}`)
  } else {
    console.warn('[pal-extract] unifont-cn.bdf 缺,跳过 font')
  }
}
