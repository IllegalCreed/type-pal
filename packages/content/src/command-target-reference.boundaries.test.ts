import { expect, test } from 'vitest'
import { deepSnapshot } from './__tests__/glm-content-contract-fixtures.js'
import { type AuthorCommand, checkAuthorCommands } from './author-script.js'
import {
  type CommandTargetReference,
  collectCanonicalCommandTargetReferences,
  collectCommandTargetReferences,
  rewriteExplicitSceneReferences,
  visitCommandTargetReferences,
} from './command-target-reference.js'

test('hook inherit/disabled retain only the scene edge while two explicit uses retain both slot identities', () => {
  const command: AuthorCommand = {
    kind: 'selectSceneHooks',
    scene: 's',
    selection: { onEnter: { kind: 'inherit' }, onTeleport: { kind: 'disabled' } },
  }
  checkAuthorCommands([command], 'commands')
  const before = deepSnapshot(command)
  expect(collectCanonicalCommandTargetReferences(command, 'command')).toEqual([
    { target: { kind: 'scene', id: 's' }, relation: 'select-scene-hooks', where: 'command.scene' },
  ])
  expect(command).toEqual(before)
  const used: AuthorCommand = {
    kind: 'selectSceneHooks',
    scene: 's',
    selection: {
      onEnter: { kind: 'use', value: 'arrive' },
      onTeleport: { kind: 'use', value: 'return' },
    },
  }
  checkAuthorCommands([used], 'commands')
  expect(collectCanonicalCommandTargetReferences(used, 'command')).toEqual([
    { target: { kind: 'scene', id: 's' }, relation: 'select-scene-hooks', where: 'command.scene' },
    {
      target: { kind: 'scene-hook', sceneId: 's', slot: 'onEnter', hookId: 'arrive' },
      relation: 'select-scene-hook',
      where: 'command.selection.onEnter.value',
    },
    {
      target: { kind: 'scene-hook', sceneId: 's', slot: 'onTeleport', hookId: 'return' },
      relation: 'select-scene-hook',
      where: 'command.selection.onTeleport.value',
    },
  ])
})

test('visitor publishes each edge exactly once and later nodes cannot overwrite retained callbacks', () => {
  const commands: AuthorCommand[] = [
    { kind: 'loadScene', scene: 's', entryId: 'door' },
    {
      kind: 'setMultiEntityState',
      targets: [
        { scene: 's', entity: 'a' },
        { scene: 'other', entity: 'b' },
      ],
      state: 1,
    },
    { kind: 'startBattle', enemyTeamId: 'team', fieldId: 0 },
  ]
  checkAuthorCommands(commands, 'commands')
  const before = deepSnapshot(commands)
  const callbacks: CommandTargetReference[] = []
  visitCommandTargetReferences(commands, 'body', (reference) => callbacks.push(reference))
  const expected: CommandTargetReference[] = [
    { target: { kind: 'scene', id: 's' }, relation: 'load-scene', where: 'body[0].scene' },
    {
      target: { kind: 'scene-entry', sceneId: 's', entryId: 'door' },
      relation: 'load-scene-entry',
      where: 'body[0].entryId',
    },
    {
      target: { kind: 'entity', sceneId: 's', entityId: 'a' },
      relation: 'entity-address',
      where: 'body[1].targets[0]',
    },
    {
      target: { kind: 'entity', sceneId: 'other', entityId: 'b' },
      relation: 'entity-address',
      where: 'body[1].targets[1]',
    },
    {
      target: { kind: 'enemy-team', id: 'team' },
      relation: 'start-battle',
      where: 'body[2].enemyTeamId',
    },
    { target: { kind: 'battle-field', id: 0 }, relation: 'start-battle', where: 'body[2].fieldId' },
  ]
  expect(callbacks).toEqual(expected)
  expect(collectCanonicalCommandTargetReferences(commands[1], 'body[1]')).toEqual(
    expected.slice(2, 4),
  )
  expect(commands).toEqual(before)
})

test.each([
  ['', 'copy'],
  ['source', ''],
])('copy refuses empty source/target (%j -> %j) before touching the tree', (source, target) => {
  const input: AuthorCommand[] = [{ kind: 'loadScene', scene: 'source' }]
  checkAuthorCommands(input, 'commands')
  const before = deepSnapshot(input)
  expect(() => rewriteExplicitSceneReferences(input, source, target)).toThrow(
    'source/target SceneId 必须非空',
  )
  expect(input).toEqual(before)
})

test('copy deeply detaches non-reference dialogue data and leaves literal source text intact', () => {
  const input: AuthorCommand[] = [
    {
      kind: 'dialog',
      cue: {
        identity: { kind: 'narration' },
        rows: [{ text: 'source' }],
      },
    },
  ]
  checkAuthorCommands(input, 'commands')
  const before = deepSnapshot(input)
  const copied = rewriteExplicitSceneReferences(input, 'source', 'copy')
  expect(copied).toEqual(before)
  const command = copied[0]
  if (command?.kind !== 'dialog') throw new Error('fixture lost dialog')
  command.cue.rows[0]!.text = 'changed copy'
  expect(input).toEqual(before)
})

test('unvalidated draft ids do not produce phantom typed targets in tolerant reference scanning', () => {
  // This unknown-input scanner is not the authority for command validity. In particular, do not
  // infer that checkAuthorCommands rejects every malformed leaf handled defensively here.
  const invalid = [
    { kind: 'setAmbience', ambience: '' },
    { kind: 'learnSkill', role: 0, skill: 0 },
    { kind: 'currentScene', scene: '' },
    { kind: 'selectSceneHooks', scene: '', selection: {} },
  ]
  for (const input of invalid) {
    const before = deepSnapshot(input)
    expect(collectCommandTargetReferences(input, 'command')).toEqual([])
    expect(input).toEqual(before)
  }
  const partial: Array<{ input: unknown; expected: CommandTargetReference[] }> = [
    {
      input: { kind: 'selectSceneHooks', scene: 's', selection: null },
      expected: [
        {
          target: { kind: 'scene', id: 's' },
          relation: 'select-scene-hooks',
          where: 'command.scene',
        },
      ],
    },
    {
      input: { kind: 'setSceneMapOverride', scene: 's', mapId: '' },
      expected: [
        {
          target: { kind: 'scene', id: 's' },
          relation: 'scene-map-override',
          where: 'command.scene',
        },
      ],
    },
  ]
  for (const { input, expected } of partial) {
    const before = deepSnapshot(input)
    expect(collectCommandTargetReferences(input, 'command')).toEqual(expected)
    expect(input).toEqual(before)
  }
  expect(collectCanonicalCommandTargetReferences(null, 'command')).toEqual([])
})
