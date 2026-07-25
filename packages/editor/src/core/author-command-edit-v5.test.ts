import type { AuthorCommandV5 } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  getAuthorCommandAtV5,
  insertAuthorCommandAfterV5,
  moveAuthorCommandAtV5,
  parseAuthorCommandPathV5,
  removeAuthorCommandAtV5,
  updateAuthorCommandAtV5,
} from './author-command-edit-v5.js'

const dialog = (text: string): AuthorCommandV5 => ({
  kind: 'dialog',
  cue: { rows: [{ text }] },
})

describe('canonical v5 author command edit', () => {
  const source: AuthorCommandV5[] = [
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

  test('parses and reaches nested v5-only loop bodies', () => {
    expect(parseAuthorCommandPathV5('0/then/0/body/0')).toEqual([0, 'then', 0, 'body', 0])
    expect(getAuthorCommandAtV5(source, [0, 'then', 0, 'body', 0])).toEqual(dialog('inside'))
  })

  test('updates, inserts, moves and removes immutably', () => {
    const path = [0, 'then', 0, 'body', 0] as const
    const updated = updateAuthorCommandAtV5(source, path, dialog('changed'))
    expect(getAuthorCommandAtV5(updated, path)).toEqual(dialog('changed'))
    expect(getAuthorCommandAtV5(source, path)).toEqual(dialog('inside'))

    const inserted = insertAuthorCommandAfterV5(updated, path, dialog('second'))
    expect(getAuthorCommandAtV5(inserted, [0, 'then', 0, 'body', 1])).toEqual(dialog('second'))
    const moved = moveAuthorCommandAtV5(inserted, [0, 'then', 0, 'body', 1], -1)
    expect(getAuthorCommandAtV5(moved, path)).toEqual(dialog('second'))
    const removed = removeAuthorCommandAtV5(moved, path)
    expect(getAuthorCommandAtV5(removed, path)).toEqual(dialog('changed'))
  })

  test('inserts the first command through the -1 sentinel', () => {
    expect(insertAuthorCommandAfterV5([], [-1], dialog('first'))).toEqual([dialog('first')])
    expect(insertAuthorCommandAfterV5(source, [0, 'else', -1], dialog('else')).at(0)).toMatchObject(
      { kind: 'branch', else: [dialog('else')] },
    )
  })
})
