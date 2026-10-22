/** Display-only language data. Message identities refer to the common corrected scripts. */
export interface LocalizedMessageGroup {
  start: number
  end: number
  /** null requests a dialog clear / confirmation boundary, not a blank printed line. */
  lines: (string | null)[]
}

export interface PalLanguagePack {
  version: 1
  language: 'en'
  source: {
    slfSha256: string
    scriptSha256: string
    messageSha256: string
  }
  /** Decimal WORD.DAT identity; extra SDLPal UI words may exceed the original word count. */
  words: Record<string, string>
  groups: LocalizedMessageGroup[]
}
