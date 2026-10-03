import { type AuthorCommand, checkAuthorCommands, checkAuthorScriptFlow } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  type AuthorCommandPath,
  copyAuthorCommandAt,
  getAuthorCommandAt,
  insertAuthorCommandAfter,
  moveAuthorCommandAt,
  moveAuthorCommandToIndex,
  parseAuthorCommandPath,
  removeAuthorCommandAt,
  updateAuthorCommandAt,
} from './author-command-edit.js'

const dialog = (text: string): AuthorCommand => ({
  kind: 'dialog',
  cue: { identity: { kind: 'narration' }, rows: [{ text }] },
})

const entityTarget = { scene: 's001', entity: 'e001' }

function entityStateCommands(): AuthorCommand[] {
  return [
    { kind: 'suspendEntity', target: entityTarget, ticks: 4 },
    { kind: 'hideEntity', target: entityTarget, ticks: 8 },
    { kind: 'restoreEntity', target: entityTarget },
    { kind: 'removeEntity', target: entityTarget },
  ]
}

const commandContainers: Array<{
  label: string
  body: AuthorCommand[]
  insertPath: AuthorCommandPath
  childPath: AuthorCommandPath
}> = [
  { label: '顶层正文', body: [], insertPath: [-1], childPath: [] },
  {
    label: '条件分支',
    body: [{ kind: 'branch', cond: { kind: 'flag', flag: 'open', is: true }, then: [] }],
    insertPath: [0, 'then', -1],
    childPath: [0, 'then'],
  },
  {
    label: '条件循环',
    body: [
      {
        kind: 'loop',
        mode: 'while',
        cond: { kind: 'flag', flag: 'again', is: true },
        body: [],
      },
    ],
    insertPath: [0, 'body', -1],
    childPath: [0, 'body'],
  },
  {
    label: '是否询问的同意分支',
    body: [{ kind: 'confirm', onYes: [], onNo: [] }],
    insertPath: [0, 'onYes', -1],
    childPath: [0, 'onYes'],
  },
  {
    label: '固定次数重复',
    body: [{ kind: 'repeat', count: 3, body: [] }],
    insertPath: [0, 'body', -1],
    childPath: [0, 'body'],
  },
  {
    label: '是否询问的否分支',
    body: [{ kind: 'confirm', onYes: [], onNo: [] }],
    insertPath: [0, 'onNo', -1],
    childPath: [0, 'onNo'],
  },
  {
    label: '战斗失败分支',
    body: [{ kind: 'startBattle', enemyTeamId: 'team-1', onLose: [], onFlee: [] }],
    insertPath: [0, 'onLose', -1],
    childPath: [0, 'onLose'],
  },
  {
    label: '战斗逃跑分支',
    body: [{ kind: 'startBattle', enemyTeamId: 'team-1', onLose: [], onFlee: [] }],
    insertPath: [0, 'onFlee', -1],
    childPath: [0, 'onFlee'],
  },
]

describe('canonical author command edit', () => {
  const source: AuthorCommand[] = [
    {
      kind: 'branch',
      cond: { kind: 'flag', flag: 'open', is: true },
      then: [
        {
          kind: 'loop',
          mode: 'while',
          cond: { kind: 'flag', flag: 'again', is: true },
          body: [dialog('inside')],
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

  test('moves across a nested sibling body and preserves the original reference for no-ops', () => {
    const nested: AuthorCommand[] = [
      {
        kind: 'branch',
        cond: { kind: 'flag', flag: 'open', is: true },
        then: [dialog('a'), dialog('b'), dialog('c')],
      },
    ]
    const moved = moveAuthorCommandToIndex(nested, [0, 'then', 0], 2)
    expect((moved[0] as Extract<AuthorCommand, { kind: 'branch' }>).then).toEqual([
      dialog('b'),
      dialog('c'),
      dialog('a'),
    ])
    expect(moveAuthorCommandToIndex(moved, [0, 'then', 2], 2)).toBe(moved)
    expect(moveAuthorCommandToIndex(moved, [0, 'then', 2], 3)).toBe(moved)

    const duplicate: AuthorCommand[] = [
      {
        kind: 'branch',
        cond: { kind: 'flag', flag: 'open', is: true },
        then: [dialog('same'), dialog('same')],
      },
    ]
    expect(moveAuthorCommandToIndex(duplicate, [0, 'then', 0], 1)).toBe(duplicate)
  })

  test('inserts the first command through the -1 sentinel', () => {
    expect(insertAuthorCommandAfter([], [-1], dialog('first'))).toEqual([dialog('first')])
    expect(insertAuthorCommandAfter(source, [0, 'else', -1], dialog('else')).at(0)).toMatchObject({
      kind: 'branch',
      else: [dialog('else')],
    })
  })

  test.each(
    commandContainers,
  )('edits all four entity-state commands in $label through the common current-command path', ({
    body,
    insertPath,
    childPath,
  }) => {
    const original = structuredClone(body)
    let edited = structuredClone(body)
    let cursor = insertPath

    for (const command of entityStateCommands()) {
      edited = insertAuthorCommandAfter(edited, cursor, command)
      cursor = [...cursor.slice(0, -1), Number(cursor.at(-1)) + 1]
    }

    expect(
      entityStateCommands().map(
        (_, index) => getAuthorCommandAt(edited, [...childPath, index])?.kind,
      ),
    ).toEqual(['suspendEntity', 'hideEntity', 'restoreEntity', 'removeEntity'])
    expect(() => checkAuthorCommands(edited, 'commands')).not.toThrow()

    const firstPath = [...childPath, 0]
    const copiedPath = [...childPath, 1]
    edited = updateAuthorCommandAt(edited, firstPath, {
      kind: 'suspendEntity',
      target: entityTarget,
      ticks: 12,
    })
    edited = copyAuthorCommandAt(edited, firstPath)
    expect(getAuthorCommandAt(edited, copiedPath)).toEqual(getAuthorCommandAt(edited, firstPath))
    expect(getAuthorCommandAt(edited, copiedPath)).not.toBe(getAuthorCommandAt(edited, firstPath))
    edited = moveAuthorCommandAt(edited, copiedPath, 1)
    edited = removeAuthorCommandAt(edited, [...childPath, 2])

    expect(
      entityStateCommands().map(
        (_, index) => getAuthorCommandAt(edited, [...childPath, index])?.kind,
      ),
    ).toEqual(['suspendEntity', 'hideEntity', 'restoreEntity', 'removeEntity'])
    expect(getAuthorCommandAt(edited, firstPath)).toMatchObject({ ticks: 12 })
    expect(() => checkAuthorCommands(edited, 'commands')).not.toThrow()
    expect(body).toEqual(original)
  })

  test('copy remaps named loops and their internal continues without changing the original', () => {
    const original: AuthorCommand[] = [
      {
        kind: 'repeat',
        id: 'attempt',
        label: '尝试',
        count: 3,
        body: [{ kind: 'confirm', onYes: [{ kind: 'continueLoop', loop: 'attempt' }], onNo: [] }],
      },
    ]
    const copied = copyAuthorCommandAt(original, [0])
    expect(getAuthorCommandAt(original, [0])).toMatchObject({ id: 'attempt' })
    expect(getAuthorCommandAt(copied, [1])).toMatchObject({ id: 'attempt-copy', label: '尝试' })
    expect(getAuthorCommandAt(copied, [1, 'body', 0, 'onYes', 0])).toEqual({
      kind: 'continueLoop',
      loop: 'attempt-copy',
    })
    expect(getAuthorCommandAt(original, [0, 'body', 0, 'onYes', 0])).toEqual({
      kind: 'continueLoop',
      loop: 'attempt',
    })
    expect(() =>
      checkAuthorScriptFlow(
        {
          kind: 'stages',
          initial: 'start',
          stages: [{ id: 'start', body: copied }],
        },
        'flow',
      ),
    ).not.toThrow()
  })

  test('copying an inner loop preserves its reference to an external ancestor', () => {
    const original: AuthorCommand[] = [
      {
        kind: 'loop',
        mode: 'forever',
        id: 'outer',
        body: [
          {
            kind: 'repeat',
            count: 2,
            id: 'inner',
            body: [{ kind: 'continueLoop', loop: 'outer' }],
          },
          { kind: 'breakLoop' },
        ],
      },
    ]
    const copied = copyAuthorCommandAt(original, [0, 'body', 0])
    expect(getAuthorCommandAt(copied, [0, 'body', 1])).toMatchObject({ id: 'inner-copy' })
    expect(getAuthorCommandAt(copied, [0, 'body', 1, 'body', 0])).toEqual({
      kind: 'continueLoop',
      loop: 'outer',
    })
    expect(() => checkAuthorCommands(copied, 'copied')).not.toThrow()
    expect(() =>
      checkAuthorCommands([getAuthorCommandAt(copied, [0, 'body', 1])!], 'detached'),
    ).toThrow()
  })
})
