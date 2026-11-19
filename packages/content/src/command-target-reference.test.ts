import { describe, expect, test } from 'vitest'
import { deepSnapshot } from './__tests__/value-snapshot.js'
import {
  type AuthorCommand,
  type AuthorStagesFlow,
  checkAuthorCommands,
  checkAuthorScriptFlow,
} from './author-script.js'
import {
  type CommandTargetReference,
  collectCanonicalCommandTargetReferences,
  collectCommandTargetReferences,
  visitCommandTargetReferences,
} from './command-target-reference.js'
import { type Command, checkCommands } from './script.js'

describe('command target references', () => {
  test('collects exact references from an entry preparation and nested author commands', () => {
    const flow: AuthorStagesFlow = {
      kind: 'stages',
      initial: 'arrive',
      stages: [
        {
          id: 'arrive',
          entry: {
            prepare: [{ kind: 'learnSkill', role: 0, skill: 'light' }],
            reveal: { kind: 'cut' },
          },
          body: [
            {
              kind: 'branch',
              cond: {
                kind: 'all',
                of: [
                  { kind: 'currentScene', scene: 'garden' },
                  { kind: 'entityState', target: { scene: 'hall', entity: 'guard' }, is: 1 },
                ],
              },
              then: [
                { kind: 'loadScene', scene: 'hall', entryId: 'door' },
                { kind: 'setSceneMapOverride', scene: 'hall', mapId: 'winter-hall' },
                { kind: 'openShop', shop: 7, mode: 'buy' },
                { kind: 'openShop', shop: 0, mode: 'sell' },
                { kind: 'openShop', shop: 99, mode: 'sell' },
                { kind: 'startBattle', enemyTeamId: 'patrol', fieldId: 24 },
                { kind: 'setAmbience', ambience: 'warm' },
                { kind: 'toggleDayNight', ms: 0 },
              ],
            },
          ],
        },
      ],
    }
    checkAuthorScriptFlow(flow, 'hook', { allowSceneEntry: true })
    expect(collectCommandTargetReferences(flow, 'hook')).toEqual([
      {
        target: { kind: 'skill', id: 'light' },
        relation: 'learn-skill',
        where: 'hook.stages[0].entry.prepare[0].skill',
      },
      {
        target: { kind: 'scene', id: 'garden' },
        relation: 'condition-current-scene',
        where: 'hook.stages[0].body[0].cond.of[0].scene',
      },
      {
        target: { kind: 'entity', sceneId: 'hall', entityId: 'guard' },
        relation: 'entity-address',
        where: 'hook.stages[0].body[0].cond.of[1].target',
      },
      {
        target: { kind: 'scene', id: 'hall' },
        relation: 'load-scene',
        where: 'hook.stages[0].body[0].then[0].scene',
      },
      {
        target: { kind: 'scene-entry', sceneId: 'hall', entryId: 'door' },
        relation: 'load-scene-entry',
        where: 'hook.stages[0].body[0].then[0].entryId',
      },
      {
        target: { kind: 'scene', id: 'hall' },
        relation: 'scene-map-override',
        where: 'hook.stages[0].body[0].then[1].scene',
      },
      {
        target: { kind: 'map', id: 'winter-hall' },
        relation: 'scene-map-override',
        where: 'hook.stages[0].body[0].then[1].mapId',
      },
      {
        target: { kind: 'shop', id: 7 },
        relation: 'open-shop-buy',
        where: 'hook.stages[0].body[0].then[2].shop',
      },
      {
        target: { kind: 'enemy-team', id: 'patrol' },
        relation: 'start-battle',
        where: 'hook.stages[0].body[0].then[5].enemyTeamId',
      },
      {
        target: { kind: 'battle-field', id: 24 },
        relation: 'start-battle',
        where: 'hook.stages[0].body[0].then[5].fieldId',
      },
      {
        target: { kind: 'ambience', id: 'warm' },
        relation: 'set-ambience',
        where: 'hook.stages[0].body[0].then[6].ambience',
      },
      {
        target: { kind: 'ambience', id: 'day' },
        relation: 'toggle-day-night',
        where: 'hook.stages[0].body[0].then[7]',
      },
      {
        target: { kind: 'ambience', id: 'night' },
        relation: 'toggle-day-night',
        where: 'hook.stages[0].body[0].then[7]',
      },
    ])
  })

  test('only explicit scene hook uses add hook edges and preserve both slot identities', () => {
    const commands = [
      {
        kind: 'selectSceneHooks',
        scene: 'hall',
        selection: { onEnter: { kind: 'inherit' }, onTeleport: { kind: 'disabled' } },
      },
      {
        kind: 'selectSceneHooks',
        scene: 'hall',
        selection: {
          onEnter: { kind: 'use', value: 'arrival' },
          onTeleport: { kind: 'use', value: 'return' },
        },
      },
    ] satisfies AuthorCommand[]
    const before = deepSnapshot(commands)
    checkAuthorCommands(commands, 'commands')
    expect(collectCanonicalCommandTargetReferences(commands[0], 'command')).toEqual([
      {
        target: { kind: 'scene', id: 'hall' },
        relation: 'select-scene-hooks',
        where: 'command.scene',
      },
    ])
    expect(collectCanonicalCommandTargetReferences(commands[1], 'command')).toEqual([
      {
        target: { kind: 'scene', id: 'hall' },
        relation: 'select-scene-hooks',
        where: 'command.scene',
      },
      {
        target: { kind: 'scene-hook', sceneId: 'hall', slot: 'onEnter', hookId: 'arrival' },
        relation: 'select-scene-hook',
        where: 'command.selection.onEnter.value',
      },
      {
        target: { kind: 'scene-hook', sceneId: 'hall', slot: 'onTeleport', hookId: 'return' },
        relation: 'select-scene-hook',
        where: 'command.selection.onTeleport.value',
      },
    ])
    expect(commands).toEqual(before)
  })

  test('read-only script chunks identify all three legacy scene bindings', () => {
    const body: Command[] = [
      {
        kind: 'branch',
        cond: { kind: 'flag', flag: 'opened-gate', is: true },
        then: [
          { kind: 'setSceneOnEnter', scene: 'hall', script: { chunk: 'scenes', id: 'arrival' } },
          { kind: 'setSceneOnTeleport', scene: 'gate', script: { chunk: 'scenes', id: 'leave' } },
        ],
        else: [{ kind: 'clearSceneScripts', scene: 'garden' }],
      },
    ]
    checkCommands(body, 'chunk')
    expect(collectCommandTargetReferences(body, 'chunk')).toEqual([
      {
        target: { kind: 'scene', id: 'hall' },
        relation: 'legacy-scene-script-binding',
        where: 'chunk[0].then[0].scene',
      },
      {
        target: { kind: 'scene', id: 'gate' },
        relation: 'legacy-scene-script-binding',
        where: 'chunk[0].then[1].scene',
      },
      {
        target: { kind: 'scene', id: 'garden' },
        relation: 'legacy-scene-script-binding',
        where: 'chunk[0].else[0].scene',
      },
    ])
  })

  test('canonical visits keep a condition and explicit self in their respective command scopes', () => {
    const call = {
      kind: 'callScript',
      script: 'greet',
      self: { scene: 'hall', entity: 'guide' },
    } satisfies AuthorCommand
    const branch = {
      kind: 'branch',
      cond: {
        kind: 'any',
        of: [
          { kind: 'currentScene', scene: 'hall' },
          { kind: 'entityInScene', target: { scene: 'hall', entity: 'guide' } },
        ],
      },
      then: [call, { kind: 'loadScene', scene: 'garden' }],
    } satisfies AuthorCommand
    checkAuthorCommands([branch], 'body')
    expect(collectCanonicalCommandTargetReferences(branch, 'body[0]')).toEqual([
      {
        target: { kind: 'scene', id: 'hall' },
        relation: 'condition-current-scene',
        where: 'body[0].cond.of[0].scene',
      },
      {
        target: { kind: 'entity', sceneId: 'hall', entityId: 'guide' },
        relation: 'entity-address',
        where: 'body[0].cond.of[1].target',
      },
    ])
    expect(collectCanonicalCommandTargetReferences(call, 'body[0].then[0]')).toEqual([
      {
        target: { kind: 'entity', sceneId: 'hall', entityId: 'guide' },
        relation: 'entity-address',
        where: 'body[0].then[0].self',
      },
    ])
  })

  test('a canonical scene load reports both the scene and its named entry at the original path', () => {
    const command = { kind: 'loadScene', scene: 'hall', entryId: 'door' } satisfies AuthorCommand
    checkAuthorCommands([command], 'hook')
    expect(collectCanonicalCommandTargetReferences(command, 'hook[0]')).toEqual([
      { target: { kind: 'scene', id: 'hall' }, relation: 'load-scene', where: 'hook[0].scene' },
      {
        target: { kind: 'scene-entry', sceneId: 'hall', entryId: 'door' },
        relation: 'load-scene-entry',
        where: 'hook[0].entryId',
      },
    ])
  })

  test('visitor delivers one stable edge per target and preserves explicit field zero', () => {
    const load = { kind: 'loadScene', scene: 'hall', entryId: 'door' } satisfies AuthorCommand
    const change = {
      kind: 'setMultiEntityState',
      targets: [
        { scene: 'hall', entity: 'a' },
        { scene: 'garden', entity: 'b' },
      ],
      state: 1,
    } satisfies AuthorCommand
    const commands: AuthorCommand[] = [
      load,
      change,
      { kind: 'startBattle', enemyTeamId: 'patrol', fieldId: 0 },
    ]
    const before = deepSnapshot(commands)
    checkAuthorCommands(commands, 'body')
    const callbacks: CommandTargetReference[] = []
    visitCommandTargetReferences(commands, 'body', (reference) => callbacks.push(reference))
    const entities: CommandTargetReference[] = [
      {
        target: { kind: 'entity', sceneId: 'hall', entityId: 'a' },
        relation: 'entity-address',
        where: 'body[1].targets[0]',
      },
      {
        target: { kind: 'entity', sceneId: 'garden', entityId: 'b' },
        relation: 'entity-address',
        where: 'body[1].targets[1]',
      },
    ]
    expect(callbacks).toEqual([
      { target: { kind: 'scene', id: 'hall' }, relation: 'load-scene', where: 'body[0].scene' },
      {
        target: { kind: 'scene-entry', sceneId: 'hall', entryId: 'door' },
        relation: 'load-scene-entry',
        where: 'body[0].entryId',
      },
      ...entities,
      {
        target: { kind: 'enemy-team', id: 'patrol' },
        relation: 'start-battle',
        where: 'body[2].enemyTeamId',
      },
      {
        target: { kind: 'battle-field', id: 0 },
        relation: 'start-battle',
        where: 'body[2].fieldId',
      },
    ])
    expect(collectCanonicalCommandTargetReferences(change, 'body[1]')).toEqual(entities)
    expect(commands).toEqual(before)
  })

  test('a battle with explicit music and no field yields only an enemy-team edge', () => {
    const battle = {
      kind: 'startBattle',
      enemyTeamId: 'patrol',
      music: 'music.battle',
    } satisfies AuthorCommand
    const before = deepSnapshot(battle)
    checkAuthorCommands([battle], 'body')
    const expected: CommandTargetReference[] = [
      {
        target: { kind: 'enemy-team', id: 'patrol' },
        relation: 'start-battle',
        where: 'body[0].enemyTeamId',
      },
    ]
    expect(collectCommandTargetReferences([battle], 'body')).toEqual(expected)
    expect(collectCanonicalCommandTargetReferences(battle, 'body[0]')).toEqual(expected)
    expect(battle).toEqual(before)
  })

  test('unvalidated data yields only complete tagged references at their original paths', () => {
    const draft: unknown[] = [
      null,
      { scene: 'label' },
      { mapId: 'not-a-map-reference' },
      { scene: 'hall', entity: 'guide', extra: true },
      { scene: '', entity: 'guide' },
      { kind: 'openShop', mode: 'buy', shop: -1 },
      { kind: 'openShop', mode: 'buy', shop: 1.5 },
      { kind: 'loadScene', scene: '' },
      { kind: 'loadScene' },
      { kind: 'setAmbience', ambience: '' },
      { kind: 'learnSkill', role: 0, skill: 0 },
      { kind: 'currentScene', scene: '' },
      { kind: 'selectSceneHooks', scene: '', selection: {} },
      { kind: 'selectSceneHooks', scene: 'hall', selection: null },
      { kind: 'setSceneMapOverride', scene: 'garden', mapId: '' },
    ]
    const before = deepSnapshot(draft)
    expect(collectCommandTargetReferences(draft, 'draft')).toEqual([
      {
        target: { kind: 'scene', id: 'hall' },
        relation: 'select-scene-hooks',
        where: 'draft[13].scene',
      },
      {
        target: { kind: 'scene', id: 'garden' },
        relation: 'scene-map-override',
        where: 'draft[14].scene',
      },
    ])
    expect(collectCanonicalCommandTargetReferences(null, 'command')).toEqual([])
    expect(draft).toEqual(before)
  })
})
