import { describe, expect, test } from 'vitest'
import type { AuthorDialogueCue } from './author-dialogue.js'
import { type AuthorCommand, checkAuthorCommands } from './author-script.js'
import { checkBaseAuthorCommands } from './author-script-core.js'
import { checkRuntimeCommands } from './runtime-script.js'

type Wrap = (body: AuthorCommand[]) => AuthorCommand[]
const flag = { kind: 'flag' as const, flag: 'ready', is: true }
const cases: { name: string; path: string; wrap: Wrap }[] = [
  { name: 'direct', path: 'commands[0]', wrap: (body) => body },
  {
    name: 'then',
    path: 'commands[0].then[0]',
    wrap: (body) => [{ kind: 'branch', cond: flag, then: body }],
  },
  {
    name: 'else',
    path: 'commands[0].else[0]',
    wrap: (body) => [{ kind: 'branch', cond: flag, then: [], else: body }],
  },
  {
    name: 'loop',
    path: 'commands[0].body[0]',
    wrap: (body) => [
      { kind: 'loop', mode: 'while', cond: flag, body, yield: 'worldTick', maxIterations: 2 },
    ],
  },
  {
    name: 'onLose',
    path: 'commands[0].onLose[0]',
    wrap: (body) => [{ kind: 'startBattle', enemyTeamId: 'team', onLose: body }],
  },
  {
    name: 'onFlee',
    path: 'commands[0].onFlee[0]',
    wrap: (body) => [{ kind: 'startBattle', enemyTeamId: 'team', onFlee: body }],
  },
  {
    name: 'onFail',
    path: 'commands[0].onFail[0]',
    wrap: (body) => [{ kind: 'teleportOut', onFail: body }],
  },
  { name: 'onNo', path: 'commands[0].onNo[0]', wrap: (body) => [{ kind: 'confirm', onNo: body }] },
]

function battle(identity: AuthorDialogueCue['identity'] = { kind: 'narration' }) {
  const cue: AuthorDialogueCue = { identity, rows: [{ text: 'line' }] }
  const command: AuthorCommand = {
    kind: 'startBattle',
    enemyTeamId: 'team',
    choreography: [{ at: 'battleStart', body: [{ kind: 'dialog', cue }] }],
  }
  return { command, cue }
}

describe('author battle choreography preserves the active dialogue dialect', () => {
  test.each(cases)('$name rejects missing author identity at the exact nested path', ({
    wrap,
    path,
  }) => {
    const legal = wrap([battle().command])
    const legalBefore: unknown = JSON.parse(JSON.stringify(legal))
    expect(() => checkAuthorCommands(legal, 'commands')).not.toThrow()
    expect(legal).toEqual(legalBefore)

    const broken = battle()
    // Deliberately violate one author field after constructing a valid typed command.
    Reflect.deleteProperty(broken.cue, 'identity')
    const input = wrap([broken.command])
    const before: unknown = JSON.parse(JSON.stringify(input))
    expect(() => checkAuthorCommands(input, 'commands')).toThrow(
      `${path}.choreography[0].body[0].cue.identity: 期望对象`,
    )
    expect(input).toEqual(before)
  })

  test.each<AuthorDialogueCue['identity']>([
    { kind: 'narration' },
    { kind: 'actor', actor: 'actor.li' },
    { kind: 'unbound', speaker: 'name.vendor' },
  ])('accepts current identity $kind without rewriting it', (identity) => {
    const input = [battle(identity).command]
    const before: unknown = JSON.parse(JSON.stringify(input))
    checkAuthorCommands(input, 'commands')
    expect(input).toEqual(before)
  })

  test('forwards the actual cue and its exact path to the selected validator', () => {
    const input = battle()
    const seen: { cue: unknown; path: string }[] = []
    const sentinel = new Error('custom cue rejection')
    expect(() =>
      checkBaseAuthorCommands([input.command], 'commands', {
        checkDialogueCue(cue, path) {
          seen.push({ cue, path })
          throw sentinel
        },
      }),
    ).toThrow(sentinel)
    expect(seen).toEqual([{ cue: input.cue, path: 'commands[0].choreography[0].body[0].cue' }])
    expect(seen[0]?.cue).toBe(input.cue)
  })

  test('runtime choreography keeps accepting resolved cue rows without author identity', () => {
    const input = [
      {
        kind: 'startBattle',
        enemyTeamId: 'team',
        choreography: [
          { at: 'battleStart', body: [{ kind: 'dialog', cue: { rows: [{ text: 'resolved' }] } }] },
        ],
      },
    ]
    const before: unknown = JSON.parse(JSON.stringify(input))
    expect(() => checkRuntimeCommands(input, 'commands')).not.toThrow()
    expect(input).toEqual(before)
  })
})
