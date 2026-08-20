import type { BaseAuthorCommand } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  getAuthorCommandAt,
  insertAuthorCommandAfter,
  moveAuthorCommandAt,
  parseAuthorCommandPath,
  removeAuthorCommandAt,
  updateAuthorCommandAt,
} from './author-command-edit.js'

const dialog = (text: string): BaseAuthorCommand => ({
  kind: 'dialog',
  cue: { rows: [{ text }] },
})

describe('canonical author command edit', () => {
  const source: BaseAuthorCommand[] = [
    {
      kind: 'branch',
      cond: { kind: 'flag', flag: 'open', is: true },
      then: [
        {
          kind: 'loop',
          mode: 'while',
          cond: { kind: 'flag', flag: 'again', is: true },
          body: [dialog('inside')],
          yield: 'worldTick',
          maxIterations: 8,
        },
      ],
      else: [],
    },
    dialog('tail'),
  ]

  test('parses and reaches nested canonical loop bodies', () => {
    expect(parseAuthorCommandPath('0/then/0/body/0')).toEqual([0, 'then', 0, 'body', 0])
    expect(getAuthorCommandAt(source, [0, 'then', 0, 'body', 0])).toEqual(dialog('inside'))
  })

  test('updates, inserts, moves and removes immutably', () => {
    const path = [0, 'then', 0, 'body', 0] as const
    const updated = updateAuthorCommandAt(source, path, dialog('changed'))
    expect(getAuthorCommandAt(updated, path)).toEqual(dialog('changed'))
    expect(getAuthorCommandAt(source, path)).toEqual(dialog('inside'))

    const inserted = insertAuthorCommandAfter(updated, path, dialog('second'))
    expect(getAuthorCommandAt(inserted, [0, 'then', 0, 'body', 1])).toEqual(dialog('second'))
    const moved = moveAuthorCommandAt(inserted, [0, 'then', 0, 'body', 1], -1)
    expect(getAuthorCommandAt(moved, path)).toEqual(dialog('second'))
    const removed = removeAuthorCommandAt(moved, path)
    expect(getAuthorCommandAt(removed, path)).toEqual(dialog('changed'))
  })

  test('inserts the first command through the -1 sentinel', () => {
    expect(insertAuthorCommandAfter([], [-1], dialog('first'))).toEqual([dialog('first')])
    expect(insertAuthorCommandAfter(source, [0, 'else', -1], dialog('else')).at(0)).toMatchObject(
      { kind: 'branch', else: [dialog('else')] },
    )
  })
})
