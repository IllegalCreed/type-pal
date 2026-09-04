import { describe, expect, test } from 'vitest'
import {
  collectCanonicalCommandTargetReferences,
  collectCommandTargetReferences,
  commandTargetReferencesAtNode,
} from './command-target-reference.js'

describe('command target reference leaves', () => {
  test('collects scene/map/shop/battle/ambience targets through nested command trees', () => {
    const references = collectCommandTargetReferences(
      {
        stages: [
          {
            entry: {
              prepare: [
                { kind: 'loadScene', scene: 'scene-b', entryId: 'door' },
                { kind: 'setSceneMapOverride', scene: 'scene-c', mapId: 'map-c' },
              ],
            },
            body: [
              {
                kind: 'branch',
                cond: {
                  kind: 'all',
                  of: [
                    { kind: 'currentScene', scene: 'scene-a' },
                    {
                      kind: 'entityState',
                      target: { scene: 'scene-b', entity: 'guard' },
                    },
                  ],
                },
                then: [
                  { kind: 'openShop', shop: 7, mode: 'buy' },
                  { kind: 'openShop', shop: 0, mode: 'sell' },
                  { kind: 'openShop', shop: 99, mode: 'sell' },
                  { kind: 'startBattle', enemyTeamId: 'team-a', fieldId: 24 },
                  { kind: 'setAmbience', ambience: 'warm' },
                  { kind: 'toggleDayNight', ms: 0 },
                  { kind: 'learnSkill', role: 0, skill: 'skill-new' },
                ],
              },
            ],
          },
        ],
      },
      'root',
    )

    expect(references).toEqual(
      expect.arrayContaining([
        {
          target: { kind: 'scene', id: 'scene-b' },
          relation: 'load-scene',
          where: 'root.stages[0].entry.prepare[0].scene',
        },
        {
          target: { kind: 'scene-entry', sceneId: 'scene-b', entryId: 'door' },
          relation: 'load-scene-entry',
          where: 'root.stages[0].entry.prepare[0].entryId',
        },
        {
          target: { kind: 'map', id: 'map-c' },
          relation: 'scene-map-override',
          where: 'root.stages[0].entry.prepare[1].mapId',
        },
        {
          target: { kind: 'entity', sceneId: 'scene-b', entityId: 'guard' },
          relation: 'entity-address',
          where: 'root.stages[0].body[0].cond.of[1].target',
        },
        {
          target: { kind: 'shop', id: 7 },
          relation: 'open-shop-buy',
          where: 'root.stages[0].body[0].then[0].shop',
        },
        {
          target: { kind: 'enemy-team', id: 'team-a' },
          relation: 'start-battle',
          where: 'root.stages[0].body[0].then[3].enemyTeamId',
        },
        {
          target: { kind: 'battle-field', id: 24 },
          relation: 'start-battle',
          where: 'root.stages[0].body[0].then[3].fieldId',
        },
        {
          target: { kind: 'ambience', id: 'warm' },
          relation: 'set-ambience',
          where: 'root.stages[0].body[0].then[4].ambience',
        },
        {
          target: { kind: 'ambience', id: 'day' },
          relation: 'toggle-day-night',
          where: 'root.stages[0].body[0].then[5]',
        },
        {
          target: { kind: 'ambience', id: 'night' },
          relation: 'toggle-day-night',
          where: 'root.stages[0].body[0].then[5]',
        },
        {
          target: { kind: 'skill', id: 'skill-new' },
          relation: 'learn-skill',
          where: 'root.stages[0].body[0].then[6].skill',
        },
      ]),
    )
    expect(references.filter((reference) => reference.target.kind === 'shop')).toEqual([
      {
        target: { kind: 'shop', id: 7 },
        relation: 'open-shop-buy',
        where: 'root.stages[0].body[0].then[0].shop',
      },
    ])
  })

  test('recognizes current author and readonly legacy scene commands without guessing names', () => {
    expect(
      collectCommandTargetReferences(
        [
          {
            kind: 'selectSceneHooks',
            scene: 'scene-a',
            selection: { onEnter: { kind: 'use', value: 'arrival' } },
          },
          { kind: 'setSceneOnEnter', scene: 'scene-b', script: {} },
          { kind: 'setSceneOnTeleport', scene: 'scene-c', script: {} },
          { kind: 'clearSceneScripts', scene: 'scene-d' },
          { scene: 'not-a-reference' },
          { mapId: 'not-a-reference' },
        ],
        'commands',
      ),
    ).toEqual([
      {
        target: { kind: 'scene', id: 'scene-a' },
        relation: 'select-scene-hooks',
        where: 'commands[0].scene',
      },
      {
        target: {
          kind: 'scene-hook',
          sceneId: 'scene-a',
          slot: 'onEnter',
          hookId: 'arrival',
        },
        relation: 'select-scene-hook',
        where: 'commands[0].selection.onEnter.value',
      },
      {
        target: { kind: 'scene', id: 'scene-b' },
        relation: 'legacy-scene-script-binding',
        where: 'commands[1].scene',
      },
      {
        target: { kind: 'scene', id: 'scene-c' },
        relation: 'legacy-scene-script-binding',
        where: 'commands[2].scene',
      },
      {
        target: { kind: 'scene', id: 'scene-d' },
        relation: 'legacy-scene-script-binding',
        where: 'commands[3].scene',
      },
    ])
  })

  test('canonical visit does not recurse into nested command arms', () => {
    const command = {
      kind: 'branch',
      cond: {
        kind: 'any',
        of: [
          { kind: 'currentScene', scene: 'scene-a' },
          { kind: 'entityInScene', target: { scene: 'scene-b', entity: 'guard' } },
        ],
      },
      then: [{ kind: 'loadScene', scene: 'scene-c' }],
    }
    expect(collectCanonicalCommandTargetReferences(command, 'command')).toEqual([
      {
        target: { kind: 'scene', id: 'scene-a' },
        relation: 'condition-current-scene',
        where: 'command.cond.of[0].scene',
      },
      {
        target: { kind: 'entity', sceneId: 'scene-b', entityId: 'guard' },
        relation: 'entity-address',
        where: 'command.cond.of[1].target',
      },
    ])
  })

  test('malformed target values do not create edges', () => {
    expect(
      commandTargetReferencesAtNode({ kind: 'openShop', shop: 1.5, mode: 'buy' }, 'x'),
    ).toEqual([])
    expect(commandTargetReferencesAtNode({ kind: 'openShop', shop: -1, mode: 'buy' }, 'x')).toEqual(
      [],
    )
    expect(commandTargetReferencesAtNode({ kind: 'loadScene', scene: '' }, 'x')).toEqual([])
    expect(commandTargetReferencesAtNode({ scene: 's', entity: 'e', extra: true }, 'x')).toEqual([])
  })
})
