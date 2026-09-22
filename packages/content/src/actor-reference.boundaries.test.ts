import { expect, test } from 'vitest'
import { deepSnapshot } from './__tests__/glm-content-contract-fixtures.js'
import type { ActorDef } from './actor.js'
import {
  actorTaggedReferencesAtNode,
  collectCanonicalActorTaggedReferences,
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
  const input = document(),
    before = deepSnapshot(input)
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
  const renamedActors = deepSnapshot(actors)
  renamedActors.hero!.portraits!.expressions = {
    calm: 'portrait.hero.calm',
    furious: 'portrait.hero.angry',
  }
  assertAuthorDialogueReferences(result.value, renamedActors)
})

test('rename returns a detached full tree even when no expression matches', () => {
  const input = document(),
    before = deepSnapshot(input)
  const result = renameDialoguePortraitExpression(input, 'absent-actor', 'angry', 'furious')
  expect(result).toEqual({ value: before, rewritten: 0 })
  const first = result.value[0]
  if (first?.kind !== 'dialog') throw new Error('fixture lost dialog')
  first.cue.rows[0]!.text = 'changed output row'
  result.value.push({ kind: 'wait', ms: 1 })
  expect(input).toEqual(before)
})

test('portrait references retain traversal order and exact default/expression paths, excluding unbound and absent portraits', () => {
  const input = document(),
    before = deepSnapshot(input)
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

test('canonical battle visit includes choreography actor leaves but leaves onLose commands for their own visitor', () => {
  const command: AuthorCommand = {
    kind: 'startBattle',
    enemyTeamId: 'team-a',
    choreography: [
      {
        at: 'battleStart',
        once: true,
        when: { kind: 'playerInParty', role: 'hero' },
        body: [
          {
            kind: 'applyActorGrowth',
            actor: 'hero',
            delta: {
              level: 0,
              maxHP: 5,
              maxMP: 0,
              attack: 0,
              magicAttack: 0,
              defense: 0,
              speed: 0,
              luck: 0,
            },
          },
          { kind: 'playActorCastEffect', actor: 'other', effect: 'pre-magic-white-flash' },
        ],
      },
    ],
    onLose: [{ kind: 'setParty', members: ['outside'] }],
  }
  checkAuthorCommands([command], 'commands')
  const before = deepSnapshot(command)
  expect(collectCanonicalActorTaggedReferences(command, 'command')).toEqual([
    {
      actorId: 'hero',
      kind: 'enemy-condition-player-in-party',
      where: 'command.choreography[0].when.role',
    },
    {
      actorId: 'hero',
      kind: 'enemy-apply-actor-growth',
      where: 'command.choreography[0].body[0].actor',
    },
    {
      actorId: 'other',
      kind: 'enemy-play-actor-cast-effect',
      where: 'command.choreography[0].body[1].actor',
    },
  ])
  expect(command).toEqual(before)
})

test('valid actor identity without a portrait still creates its actor edge, never a portrait edge', () => {
  const command = dialog({ kind: 'actor', actor: 'hero' })
  checkAuthorCommands([command], 'commands')
  const before = deepSnapshot(command)
  expect(actorTaggedReferencesAtNode(command, 'command')).toEqual([
    { actorId: 'hero', kind: 'dialogue-actor', where: 'command.cue.identity.actor' },
  ])
  expect(collectDialoguePortraitReferences(command, 'command')).toEqual([])
  expect(command).toEqual(before)
  for (const identity of [
    { kind: 'narration' },
    { kind: 'unbound', speaker: 'hero' },
  ] satisfies DialogueIdentity[]) {
    const nonActor = dialog(identity)
    checkAuthorCommands([nonActor], 'commands')
    const original = deepSnapshot(nonActor)
    expect(actorTaggedReferencesAtNode(nonActor, 'command')).toEqual([])
    expect(nonActor).toEqual(original)
  }
})

test('defensive scanners do not invent portrait references from guard-rejected dialog shapes', () => {
  // These are explicitly rejected inputs, not fixtures claimed to be canonical author content.
  const malformed = [
    { kind: 'dialog' },
    { kind: 'dialog', cue: [] },
    { kind: 'dialog', cue: { identity: [] } },
    { kind: 'dialog', cue: { identity: { kind: 'actor', actor: 'hero', portrait: [] } } },
  ]
  for (const [index, input] of malformed.entries()) {
    expect(() => checkAuthorCommands([input], 'commands')).toThrow()
    const before = deepSnapshot(input)
    expect(collectDialoguePortraitReferences(input, 'command')).toEqual([])
    expect(renameDialoguePortraitExpression(input, 'hero', 'angry', 'furious')).toEqual({
      value: before,
      rewritten: 0,
    })
    if (index < 3) expect(actorTaggedReferencesAtNode(input, 'command')).toEqual([])
    expect(input).toEqual(before)
  }
  // A partially edited collection is an unknown scanner input, not canonical setParty content.
  const partialParty = { kind: 'setParty', members: null }
  const beforeParty = deepSnapshot(partialParty)
  expect(actorTaggedReferencesAtNode(partialParty, 'command')).toEqual([])
  expect(partialParty).toEqual(beforeParty)
  expect(collectCanonicalActorTaggedReferences(null, 'command')).toEqual([])
})
