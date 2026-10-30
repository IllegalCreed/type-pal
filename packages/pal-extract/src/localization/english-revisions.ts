import type { LanguageRevisions } from './build-language-pack.js'
import groups from './english-message-revisions.json' with { type: 'json' }
import words from './english-word-revisions.json' with { type: 'json' }

/** Project-authored additions to Nostaljaded's 2019-08-31 Win v3.3 translation. */
export const englishRevisions: LanguageRevisions = {
  slfSha256: '81c4bed62f48ccf30bcd50ae9afc766352c06e0b52b782a9d64d7517af86ef73',
  words,
  groups,
  aliases: {
    '12749:12751': { start: 12749, end: 12752 },
    '12866:12868': { start: 12866, end: 12869 },
  },
}
