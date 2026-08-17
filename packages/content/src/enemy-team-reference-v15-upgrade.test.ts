import { describe, expect, test } from 'vitest'
import { collectEnemyTeamTaggedReferences } from './enemy-team-reference.js'
import {
  upgradeEnemyTeamReferencesV14ToV15,
  upgradeManifestV14ToV15,
} from './enemy-team-reference-v15-upgrade.js'

describe('content14 -> 15 enemy team reference upgrade', () => {
  test('recursively upgrades hostile and every startBattle arm without changing team definitions', () => {
    const source = {
      entities: [{ hostile: { team: 7, chase: { range: 2, speed: 1 } } }],
      flow: {
        body: [
          {
            kind: 'branch',
            then: [{ kind: 'startBattle', team: 9, onLose: [{ kind: 'stopScript' }] }],
          },
        ],
      },
      enemyTeams: [{ id: 'team-7', slots: ['enemy-1'] }],
    }
    const upgraded = upgradeEnemyTeamReferencesV14ToV15(source)
    expect(upgraded).toEqual({
      entities: [{ hostile: { chase: { range: 2, speed: 1 }, enemyTeamId: 'team-7' } }],
      flow: {
        body: [
          {
            kind: 'branch',
            then: [
              {
                kind: 'startBattle',
                onLose: [{ kind: 'stopScript' }],
                enemyTeamId: 'team-9',
              },
            ],
          },
        ],
      },
      enemyTeams: [{ id: 'team-7', slots: ['enemy-1'] }],
    })
    expect(source.entities[0]!.hostile.team).toBe(7)
    expect(() => upgradeEnemyTeamReferencesV14ToV15(upgraded)).toThrow(/拒绝重复升级/)
  })

  test('upgrades only the content gate and keeps save version 8', () => {
    expect(
      upgradeManifestV14ToV15({ contentVersion: 14, minimumSaveVersion: 8 } as never),
    ).toMatchObject({ contentVersion: 15, minimumSaveVersion: 8 })
  })

  test('typed collector finds nested startBattle leaves and ignores ordinary enemyTeamId fields', () => {
    expect(
      collectEnemyTeamTaggedReferences(
        {
          enemyTeamId: 'not-a-command',
          branch: [{ kind: 'startBattle', enemyTeamId: 'team-c1' }],
        },
        'root',
      ),
    ).toEqual([
      {
        enemyTeamId: 'team-c1',
        kind: 'start-battle',
        where: 'root.branch[0].enemyTeamId',
      },
    ])
  })
})
