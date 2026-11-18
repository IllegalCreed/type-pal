import { expect, test } from 'vitest'
import { deepSnapshot } from './__tests__/value-snapshot.js'
import {
  actorTaggedReferencesAtNode,
  collectActorTaggedReferences,
  collectCanonicalActorTaggedReferences,
} from './actor-reference.js'
import { type AuthorCommand, checkAuthorCommands } from './author-script.js'

test('actor references distinguish a whole tree, a canonical command and its nested arm', () => {
  const appearance = {
    kind: 'setActorSprite',
    actor: 'companion',
    sprite: 'sprite.companion',
  } satisfies AuthorCommand
  const branch = {
    kind: 'branch',
    cond: { kind: 'inParty', actorId: 'leader' },
    then: [appearance],
  } satisfies AuthorCommand
  checkAuthorCommands([branch], 'body')
  const before = deepSnapshot(branch)
  const condition = {
    actorId: 'leader',
    kind: 'condition-in-party',
    where: 'command.cond.actorId',
  }
  const nested = {
    actorId: 'companion',
    kind: 'command-set-actor-sprite',
    where: 'command.then[0].actor',
  }
  expect(collectActorTaggedReferences(branch, 'command')).toEqual([condition, nested])
  expect(collectCanonicalActorTaggedReferences(branch, 'command')).toEqual([condition])
  expect(collectCanonicalActorTaggedReferences(appearance, 'command.then[0]')).toEqual([nested])
  expect(branch).toEqual(before)
})

test('actor references retain the physical indexes of party members', () => {
  const command = { kind: 'setParty', members: ['leader', 'companion'] } satisfies AuthorCommand
  checkAuthorCommands([command], 'body')
  expect(actorTaggedReferencesAtNode(command, 'command')).toEqual([
    { actorId: 'leader', kind: 'command-set-party-member', where: 'command.members[0]' },
    { actorId: 'companion', kind: 'command-set-party-member', where: 'command.members[1]' },
  ])
})

test('actor references in a draft keep valid members at their original indexes', () => {
  const draft: unknown[] = [
    null,
    'leader',
    { actor: 'leader' },
    { kind: 'setFlag', flag: 'leader', value: true },
    { kind: 'setParty', members: null },
    { kind: 'setParty', members: ['leader', '', 'companion', 3] },
    { kind: 'dialog' },
    { kind: 'dialog', cue: [] },
    { kind: 'dialog', cue: { identity: [] } },
  ]
  const before = deepSnapshot(draft)
  expect(actorTaggedReferencesAtNode(draft, 'root')).toEqual([])
  expect(collectCanonicalActorTaggedReferences(null, 'command')).toEqual([])
  expect(collectActorTaggedReferences(draft, 'body')).toEqual([
    { actorId: 'leader', kind: 'command-set-party-member', where: 'body[5].members[0]' },
    { actorId: 'companion', kind: 'command-set-party-member', where: 'body[5].members[2]' },
  ])
  expect(draft).toEqual(before)
})

test('dialogue actor edges preserve identity whether or not a portrait is present', () => {
  const body = [
    { kind: 'dialog', cue: { identity: { kind: 'actor', actor: 'hero' }, rows: [{ text: 'hi' }] } },
    { kind: 'dialog', cue: { identity: { kind: 'narration' }, rows: [{ text: 'hero' }] } },
    {
      kind: 'dialog',
      cue: {
        identity: {
          kind: 'unbound',
          speaker: 'hero',
          portrait: { asset: 'portrait.sign', side: 'left' },
        },
        rows: [{ text: 'hi' }],
      },
    },
    {
      kind: 'dialog',
      cue: {
        identity: { kind: 'actor', actor: 'guide', portrait: { kind: 'default', side: 'right' } },
        rows: [{ text: 'hi' }],
      },
    },
  ] satisfies AuthorCommand[]
  checkAuthorCommands(body, 'body')
  expect(collectActorTaggedReferences(body, 'body')).toEqual([
    { actorId: 'hero', kind: 'dialogue-actor', where: 'body[0].cue.identity.actor' },
    { actorId: 'guide', kind: 'dialogue-actor', where: 'body[3].cue.identity.actor' },
  ])
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
