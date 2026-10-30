import { describe, expect, test } from 'vitest'
import { parseSlf } from './slf.js'

test('SLF preserves flexible message lines and clear boundaries, but unescapes word names', () => {
  const source = [
    '\uFEFF# outside comment',
    '[BEGIN SETTING]',
    'UseISOFont=1',
    '[END SETTING]',
    '[BEGIN WORDS]',
    '0=',
    "37=Ling\\'er",
    '135=Knock\\-Out',
    '600=C:\\\\',
    '[END WORDS]',
    '[BEGIN LAYOUT]',
    '5=180,11,1',
    '80=-2,0,2',
    '81=0,0',
    '[END LAYOUT]',
    '[BEGIN MESSAGE] 6',
    "Li\\'s Aunt:",
    '$02Hurry!~40',
    '',
    '# inside message',
    '[CLEAR MESSAGE]',
    '[END MESSAGE] 8',
  ].join('\r\n')
  expect(parseSlf(source)).toEqual({
    words: { '0': '', '37': "Ling'er", '135': 'Knock-Out', '600': 'C:\\' },
    layout: { '5': { x: 180, y: 11, flags: 1 }, '80': { x: -2, y: 0, flags: 2 } },
    groups: [
      {
        start: 6,
        end: 8,
        lines: ["Li\\'s Aunt:", '$02Hurry!~40', '', '# inside message', null],
      },
    ],
  })
})

test('SLF accepts disjoint message ranges and retains their authored order and clear markers', () => {
  const parsed = parseSlf(
    [
      '[BEGIN MESSAGE] 9',
      'Later scene.',
      '[CLEAR MESSAGE]',
      'After the clear.',
      '[END MESSAGE] 10',
      '[BEGIN MESSAGE] 4',
      'Earlier scene.',
      '[END MESSAGE] 6',
    ].join('\n'),
  )
  expect(parsed.groups).toEqual([
    { start: 9, end: 10, lines: ['Later scene.', null, 'After the clear.'] },
    { start: 4, end: 6, lines: ['Earlier scene.'] },
  ])
})

describe('SLF rejects malformed source before extraction cleanup', () => {
  test.each([
    ['duplicate words', '[BEGIN WORDS]\n7=A\n7=B\n[END WORDS]', 'duplicate word 7'],
    ['word escape', '[BEGIN WORDS]\n7=A\\\n[END WORDS]', 'dangling word escape'],
    ['word syntax', '[BEGIN WORDS]\nNew Game\n[END WORDS]', 'invalid WORDS assignment'],
    ['unfinished section', '[BEGIN WORDS]\n7=A', 'unterminated section'],
    ['nested section', '[BEGIN WORDS]\n[BEGIN LAYOUT]', 'unexpected section'],
    ['layout flags', '[BEGIN LAYOUT]\n1=0,0,4\n[END LAYOUT]', 'invalid layout coordinates'],
    ['duplicate layouts', '[BEGIN LAYOUT]\n1=0,0\n1=1,2\n[END LAYOUT]', 'duplicate layout 1'],
    ['layout syntax', '[BEGIN LAYOUT]\n1=left,top\n[END LAYOUT]', 'invalid layout'],
    ['reserved layout identity', '[BEGIN LAYOUT]\n83=0,0\n[END LAYOUT]', 'invalid layout'],
    [
      'unsafe word identity',
      '[BEGIN WORDS]\n9007199254740992=Word\n[END WORDS]',
      'invalid identity',
    ],
    [
      'unsafe message identity',
      '[BEGIN MESSAGE] 9007199254740992\nA\n[END MESSAGE] 9007199254740992',
      'invalid message identity',
    ],
    ['reversed range', '[BEGIN MESSAGE] 4\nA\n[END MESSAGE] 3', 'invalid message range'],
    [
      'duplicate message ranges',
      '[BEGIN MESSAGE] 4\nA\n[END MESSAGE] 6\n[BEGIN MESSAGE] 4\nB\n[END MESSAGE] 6',
      'duplicate message 4:6',
    ],
    [
      'section inside a message',
      '[BEGIN MESSAGE] 4\n[BEGIN WORDS]\n[END MESSAGE] 4',
      'unexpected section inside message',
    ],
    [
      'overlapping ranges',
      '[BEGIN MESSAGE] 4\nA\n[END MESSAGE] 6\n[BEGIN MESSAGE] 6\nB\n[END MESSAGE] 7',
      'overlapping message ranges',
    ],
    ['stray end', '[END MESSAGE] 1', 'unexpected section'],
  ])('%s', (_name, input, reason) => {
    expect(() => parseSlf(input)).toThrow(reason)
  })
})
