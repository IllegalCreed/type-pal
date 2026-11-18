import { expect, test } from 'vitest'
import { deepSnapshot } from './__tests__/value-snapshot.js'
import type { ActorDef } from './actor.js'
import {
  collectDialoguePortraitReferences,
  renameDialoguePortraitExpression,
} from './actor-reference.js'
import type { DialogueIdentity } from './author-dialogue.js'
import {
  type AuthorCommand,
  assertAuthorDialogueReferences,
  checkAuthorCommands,
} from './author-script.js'

const actors: Record<string, ActorDef> = Object.fromEntries(
  ['hero', 'other'].map((id) => [
    id,
    {
      id,
      name: `name.${id}`,
      spriteId: `sprite.${id}`,
      portraits: {
        default: `portrait.${id}`,
        expressions: {
          angry: `portrait.${id}.angry`,
          calm: `portrait.${id}.calm`,
        },
      },
    },
  ]),
)
function dialog(identity: DialogueIdentity): Extract<AuthorCommand, { kind: 'dialog' }> {
  return {
    kind: 'dialog',
    cue: { identity, slot: 'bottom', rows: [{ text: 'angry' }], cursorFrame: 2 },
  }
}
const expression = (actor: string, name: string) =>
  dialog({
    kind: 'actor',
    actor,
    speakerOverride: 'speaker.override',
    portrait: { kind: 'expression', expression: name, side: 'right' },
  })
function document(): AuthorCommand[] {
  const value: AuthorCommand[] = [
    expression('hero', 'angry'),
    {
      kind: 'branch',
      cond: { kind: 'inParty', actorId: 'hero' },
      then: [expression('hero', 'angry')],
      else: [expression('hero', 'calm')],
    },
    expression('other', 'angry'),
    dialog({ kind: 'actor', actor: 'hero', portrait: { kind: 'default', side: 'left' } }),
    dialog({ kind: 'actor', actor: 'hero' }),
    dialog({ kind: 'narration' }),
    dialog({ kind: 'unbound', portrait: { asset: 'angry', side: 'left' } }),
  ]
  checkAuthorCommands(value, 'commands')
  assertAuthorDialogueReferences(value, actors)
  return value
}

test('expression rename changes only exact actor/key leaves, preserves the actual input and all other dialogue data', () => {
  const input = document()
  const before = deepSnapshot(input)
  const result = renameDialoguePortraitExpression(input, 'hero', 'angry', 'furious')
  expect(result).toEqual({
    rewritten: 2,
    value: [
      expression('hero', 'furious'),
      {
        kind: 'branch',
        cond: { kind: 'inParty', actorId: 'hero' },
        then: [expression('hero', 'furious')],
        else: [expression('hero', 'calm')],
      },
      expression('other', 'angry'),
      dialog({ kind: 'actor', actor: 'hero', portrait: { kind: 'default', side: 'left' } }),
      dialog({ kind: 'actor', actor: 'hero' }),
      dialog({ kind: 'narration' }),
      dialog({ kind: 'unbound', portrait: { asset: 'angry', side: 'left' } }),
    ],
  })
  expect(input).toEqual(before)
  checkAuthorCommands(result.value, 'commands')
  assertAuthorDialogueReferences(result.value, {
    ...actors,
    hero: {
      id: 'hero',
      name: 'name.hero',
      spriteId: 'sprite.hero',
      portraits: {
        default: 'portrait.hero',
        expressions: { calm: 'portrait.hero.calm', furious: 'portrait.hero.angry' },
      },
    },
  })
})

test('an unmatched rename still detaches the dialogue row and root list', () => {
  const input = [
    {
      kind: 'dialog',
      cue: {
        identity: {
          kind: 'actor',
          actor: 'hero',
          portrait: { kind: 'expression', expression: 'angry', side: 'right' },
        },
        rows: [{ text: 'line.angry' }],
      },
    },
  ] satisfies AuthorCommand[]
  checkAuthorCommands(input, 'body')
  assertAuthorDialogueReferences(input, actors)
  const before = deepSnapshot(input)
  const result = renameDialoguePortraitExpression(input, 'hero', 'unmatched', 'furious')
  expect(result).toEqual({ value: before, rewritten: 0 })
  const row = result.value[0]?.cue.rows[0]
  if (!row) throw new Error('rename lost the dialogue row')
  row.text = 'line.changed'
  result.value.pop()
  expect(input).toEqual(before)
})

test('portrait references retain traversal order and exact default/expression paths, excluding unbound and absent portraits', () => {
  const input = document()
  const before = deepSnapshot(input)
  expect(collectDialoguePortraitReferences(input, 'body')).toEqual([
    {
      actorId: 'hero',
      portraitKind: 'expression',
      expression: 'angry',
      where: 'body[0].cue.identity.portrait',
    },
    {
      actorId: 'hero',
      portraitKind: 'expression',
      expression: 'angry',
      where: 'body[1].then[0].cue.identity.portrait',
    },
    {
      actorId: 'hero',
      portraitKind: 'expression',
      expression: 'calm',
      where: 'body[1].else[0].cue.identity.portrait',
    },
    {
      actorId: 'other',
      portraitKind: 'expression',
      expression: 'angry',
      where: 'body[2].cue.identity.portrait',
    },
    { actorId: 'hero', portraitKind: 'default', where: 'body[3].cue.identity.portrait' },
  ])
  expect(input).toEqual(before)
})

test('guard-rejected dialogue shapes produce no portrait edge or rename', () => {
  // These are explicitly rejected inputs, not fixtures claimed to be canonical author content.
  const malformed = [
    { kind: 'dialog' },
    { kind: 'dialog', cue: [] },
    { kind: 'dialog', cue: { identity: [] } },
    { kind: 'dialog', cue: { identity: { kind: 'actor', actor: 'hero', portrait: [] } } },
  ]
  for (const input of malformed) {
    expect(() => checkAuthorCommands([input], 'commands')).toThrow()
    const before = deepSnapshot(input)
    expect(collectDialoguePortraitReferences(input, 'command')).toEqual([])
    expect(renameDialoguePortraitExpression(input, 'hero', 'angry', 'furious')).toEqual({
      value: before,
      rewritten: 0,
    })
    expect(input).toEqual(before)
  }
})
