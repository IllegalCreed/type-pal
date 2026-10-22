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

// These are untrusted JSON responses, not invalid typed gameplay fixtures.
it.each([
  ['missing envelope', null],
  ['wrong schema version', { ...pack, version: 2 }],
  ['wrong language', { ...pack, language: 'zh-CN' }],
  ['missing source', { ...pack, source: null }],
  ['non-string source hash', { ...pack, source: { ...pack.source, slfSha256: 1 } }],
  ['invalid source hash', { ...pack, source: { ...pack.source, scriptSha256: 'bad' } }],
  ['invalid word identity', { ...pack, words: { '01': 'Name' } }],
  ['non-text word', { ...pack, words: { '37': false } }],
  ['negative message identity', { ...pack, groups: [{ start: -1, end: 0, lines: [] }] }],
  ['backward message range', { ...pack, groups: [{ start: 8, end: 6, lines: [] }] }],
  ['non-integer message identity', { ...pack, groups: [{ start: 6.5, end: 8, lines: [] }] }],
  ['non-text message', { ...pack, groups: [{ start: 6, end: 8, lines: [false] }] }],
  ['invalid layout identity', { ...pack, layout: { '0': { x: 6, y: 6, flags: 1 } } }],
  ['missing layout position', { ...pack, layout: { '29': null } }],
  ['non-numeric position', { ...pack, layout: { '29': { x: '6', y: 6, flags: 1 } } }],
  ['fractional position', { ...pack, layout: { '29': { x: 6, y: 6.5, flags: 1 } } }],
  ['position outside framebuffer', { ...pack, layout: { '29': { x: 320, y: 6, flags: 1 } } }],
  ['unsupported layout flag', { ...pack, layout: { '29': { x: 6, y: 6, flags: 4 } } }],
])('rejects an advertised corrupt language response: %s', async (_name, value) => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ languages: ['zh-CN', 'en'] })))
      .mockResolvedValueOnce(new Response(JSON.stringify(value))),
  )
  await expect(loadEnglishLanguage()).rejects.toThrow('Invalid English language pack')
})

it.each([
  ['HTTP failure', new Response('', { status: 503 }), 'Language manifest HTTP 503'],
  ['invalid shape', new Response(JSON.stringify({ languages: 'en' })), 'Invalid language manifest'],
])('rejects an unusable language manifest without requesting the pack: %s', async (_name, response, error) => {
  const fetcher = vi.fn().mockResolvedValueOnce(response)
  vi.stubGlobal('fetch', fetcher)
  await expect(loadEnglishLanguage('/assets')).rejects.toThrow(error)
  expect(fetcher.mock.calls).toEqual([['/assets/lookup/languages.json']])
})
