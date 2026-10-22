import type { PalLanguagePack } from '@type-pal/shared'
import { afterEach, expect, it, vi } from 'vitest'
import { loadEnglishLanguage, parseLanguagePack } from './language-pack.js'

const pack: PalLanguagePack = {
  version: 1,
  language: 'en',
  source: {
    slfSha256: 'a'.repeat(64),
    scriptSha256: 'b'.repeat(64),
    messageSha256: 'c'.repeat(64),
  },
  words: { '37': "Ling'er" },
  groups: [{ start: 6, end: 8, lines: ["Li\\'s Aunt:", 'Come downstairs!', null] }],
  layout: { '29': { x: 6, y: 6, flags: 1 } },
}

afterEach(() => vi.unstubAllGlobals())

it('a Chinese-only extraction never fetches an absent English resource', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ languages: ['zh-CN'] })))
  vi.stubGlobal('fetch', fetcher)
  expect(await loadEnglishLanguage()).toBeUndefined()
  expect(fetcher.mock.calls).toEqual([['/extracted/lookup/languages.json']])
})

it('loads the advertised language with word identities, clear tokens and layout intact', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(new Response(JSON.stringify({ languages: ['zh-CN', 'en'] })))
    .mockResolvedValueOnce(new Response(JSON.stringify(pack)))
  vi.stubGlobal('fetch', fetcher)
  expect(await loadEnglishLanguage()).toEqual(pack)
  expect(fetcher.mock.calls[1]).toEqual(['/extracted/lookup/en.json'])
})

it('rejects an ambiguous duplicate group before publishing a language pack', () => {
  expect(() => parseLanguagePack({ ...pack, groups: [...pack.groups, pack.groups[0]] })).toThrow(
    'Invalid English language pack',
  )
})

it('propagates an advertised language download failure instead of reporting English as ready', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ languages: ['zh-CN', 'en'] })))
      .mockResolvedValueOnce(new Response('', { status: 503 })),
  )
  await expect(loadEnglishLanguage()).rejects.toThrow('English language pack HTTP 503')
})
