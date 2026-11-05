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
  const before = structuredClone({ slf, commands, revisions })
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
  expect({ slf, commands, revisions }).toEqual(before)
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

test('a different SLF edition cannot use revisions authored for the supported source', () => {
  const { slf, commands, revisions } = fixture()
  expect(() =>
    buildLanguagePack(slf, commands, { ...source, slfSha256: 'new-edition' }, revisions),
  ).toThrow('Unsupported English SLF source')
})

test.each([
  ['word', 'English word 4 precondition failed'],
  ['message', 'English message 10:12 precondition failed'],
] as const)('a changed %s rejects its revision without changing any input', (kind, reason) => {
  const input = fixture()
  if (kind === 'word') input.slf.words['4'] = 'Different word'
  else input.slf.groups[0]!.lines[1] = 'Different line'
  const before = structuredClone(input)
  expect(() => buildLanguagePack(input.slf, input.commands, source, input.revisions)).toThrow(
    reason,
  )
  expect(input).toEqual(before)
})

test('a selectable English pack requires every common message range', () => {
  const { slf, commands, revisions } = fixture()
  slf.groups.pop()
  expect(() => buildLanguagePack(slf, commands, source, revisions)).toThrow(
    'Missing English message',
  )
})

test('a selectable English pack requires every original word identity', () => {
  const { slf, commands, revisions } = fixture()
  delete slf.words['564']
  expect(() => buildLanguagePack(slf, commands, source, revisions)).toThrow(
    'Missing English word 564',
  )
})

test('an unused message revision is rejected', () => {
  const { slf, commands, revisions } = fixture()
  revisions.groups['90:90'] = { before: ['unused'], after: ['unused'] }
  expect(() => buildLanguagePack(slf, commands, source, revisions)).toThrow(
    'Unused English message revision',
  )
})

test.each([
  'word',
  'message',
] as const)('untranslated %s text prevents publishing a partially translated pack', (kind) => {
  const { slf, commands, revisions } = fixture()
  if (kind === 'word') slf.words['398'] = '史莱姆'
  else slf.groups[1]!.lines = ['仍未翻译']
  expect(() => buildLanguagePack(slf, commands, source, revisions)).toThrow(
    `Untranslated English ${kind}`,
  )
})

test('the constructed pack owns mutable word, message and layout data', () => {
  const { slf, commands, revisions } = fixture()
  const before = structuredClone({ slf, revisions })
  const pack = buildLanguagePack(slf, commands, source, revisions)
  pack.words['4'] = 'Changed'
  pack.groups[0]!.lines[0] = 'Changed revised line'
  pack.groups[1]!.lines[0] = 'Changed unrevised line'
  pack.layout['5']!.x = 99
  expect({ slf, revisions }).toEqual(before)
})

test.each([
  ['wrong-span', 'English message range 20:22 mismatch'],
  ['unused', 'Unused English message alias'],
] as const)('a %s alias fails without mutating source text, scripts or revision rules', (kind, reason) => {
  const input = fixture()
  if (kind === 'wrong-span') input.revisions.aliases['20:20'] = { start: 20, end: 22 }
  else input.revisions.aliases['90:90'] = { start: 90, end: 90 }
  const before = structuredClone(input)
  expect(() => buildLanguagePack(input.slf, input.commands, source, input.revisions)).toThrow(
    reason,
  )
  expect(input).toEqual(before)
})
