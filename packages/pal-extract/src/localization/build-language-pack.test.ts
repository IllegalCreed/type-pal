import type { Command, PalLanguagePack } from '@type-pal/shared'
import { expect, test } from 'vitest'
import type { SlfLocalization } from '../io/slf.js'
import { buildLanguagePack, type LanguageRevisions } from './build-language-pack.js'

const source: PalLanguagePack['source'] = {
  slfSha256: 'known-slf',
  scriptSha256: 'corrected-instructions',
  messageSha256: 'raw-message-bytes',
}

function fixture(): { slf: SlfLocalization; commands: Command[]; revisions: LanguageRevisions } {
  return {
    slf: {
      words: Object.fromEntries(Array.from({ length: 565 }, (_, id) => [id, `Word${id}`])),
      groups: [
        { start: 10, end: 12, lines: ['A speaker:', 'An old line.', null, 'Another line.'] },
        { start: 20, end: 20, lines: ['Attack+2 Defense+2 Magic+2'] },
      ],
      layout: { '5': { x: 180, y: 11, flags: 1 } },
    },
    commands: [
      { op: 'showDialog', messageIndex: 10, text: 'original speaker', label: 'L_0' },
      { op: 'showDialog', messageIndex: 11, text: 'original line' },
      { op: 'raw', opcode: 0x8e, operands: [0, 0, 0] },
      { op: 'showDialog', messageIndex: 12, text: 'original next line' },
      { op: 'end' },
      { op: 'showDialog', messageIndex: 20, text: 'original attribute line', label: 'L_5' },
      { op: 'showDialog', messageIndex: 21, text: 'original second attribute line' },
      { op: 'end' },
    ],
    revisions: {
      slfSha256: source.slfSha256,
      words: { '4': { before: 'Word4', after: 'Spell' } },
      groups: {
        '10:12': {
          before: ['A speaker:', 'An old line.', null, 'Another line.'],
          after: ['A speaker:', 'The revised line.', null, 'Next page.'],
        },
      },
      aliases: { '20:20': { start: 20, end: 21 } },
    },
  }
}

test('language construction binds flexible text to common message spans without rewriting scripts', () => {
  const { slf, commands, revisions } = fixture()
  const pack = buildLanguagePack(slf, commands, source, revisions)
  expect(pack).toMatchObject({
    version: 1,
    language: 'en',
    source,
    words: { '4': 'Spell', '564': 'Word564' },
    groups: [
      { start: 10, end: 12, lines: ['A speaker:', 'The revised line.', null, 'Next page.'] },
      { start: 20, end: 21, lines: ['Attack+2 Defense+2 Magic+2'] },
    ],
    layout: { '5': { x: 180, y: 11, flags: 1 } },
  })
  expect(commands[5]).toEqual({
    op: 'showDialog',
    messageIndex: 20,
    text: 'original attribute line',
    label: 'L_5',
  })
  expect(slf.words['4']).toBe('Word4')
  expect(slf.groups[1]?.end).toBe(20)
})

test('nonincrementing adjacent messages remain separate groups', () => {
  const { slf, revisions } = fixture()
  slf.groups = [
    { start: 10, end: 10, lines: ['First'] },
    { start: 20, end: 20, lines: ['Second'] },
  ]
  revisions.groups = {}
  revisions.aliases = {}
  const commands: Command[] = [
    { op: 'showDialog', messageIndex: 10, text: 'A' },
    { op: 'showDialog', messageIndex: 20, text: 'B' },
    { op: 'end' },
  ]
  expect(
    buildLanguagePack(slf, commands, source, revisions).groups.map((group) => group.end),
  ).toEqual([10, 20])
})

test('language source and per-entry preconditions guard updates independently', () => {
  const { slf, commands, revisions } = fixture()
  expect(() =>
    buildLanguagePack(slf, commands, { ...source, slfSha256: 'new-edition' }, revisions),
  ).toThrow('Unsupported English SLF source')
  slf.words['4'] = 'Different word'
  expect(() => buildLanguagePack(slf, commands, source, revisions)).toThrow('word 4 precondition')
  slf.words['4'] = 'Word4'
  slf.groups[0]!.lines[1] = 'Different line'
  expect(() => buildLanguagePack(slf, commands, source, revisions)).toThrow(
    'message 10:12 precondition',
  )
})

test('a selectable English pack requires every common message range and original word identity', () => {
  const { slf, commands, revisions } = fixture()
  slf.groups.pop()
  expect(() => buildLanguagePack(slf, commands, source, revisions)).toThrow(
    'Missing English message',
  )
  const restored = fixture()
  delete restored.slf.words['564']
  expect(() =>
    buildLanguagePack(restored.slf, restored.commands, source, restored.revisions),
  ).toThrow('Missing English word 564')
})

test('unused revision rules and untranslated text fail rather than silently falling back', () => {
  const { slf, commands, revisions } = fixture()
  revisions.groups['90:90'] = { before: ['unused'], after: ['unused'] }
  expect(() => buildLanguagePack(slf, commands, source, revisions)).toThrow(
    'Unused English message revision',
  )
  delete revisions.groups['90:90']
  slf.words['398'] = '史莱姆'
  expect(() => buildLanguagePack(slf, commands, source, revisions)).toThrow(
    'Untranslated English word',
  )
  slf.words['398'] = 'Slime'
  slf.groups[1]!.lines = ['仍未翻译']
  expect(() => buildLanguagePack(slf, commands, source, revisions)).toThrow(
    'Untranslated English message',
  )
})
