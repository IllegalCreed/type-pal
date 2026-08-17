import { describe, expect, test } from 'vitest'
import {
  upgradeHostileBehaviorV12ToV13,
  upgradeManifestV12ToV13,
  upgradeScenesV12ToV13,
} from './entity-lifecycle-v13-upgrade.js'

describe('content12 → content13 lifecycle upgrade', () => {
  test('maps absent respawn to authored remove/remain and exact seconds to ticks', () => {
    expect(upgradeHostileBehaviorV12ToV13({ team: 1 })).toMatchObject({
      enemyTeamId: 'team-1',
      onVictory: { kind: 'remove' },
      onPlayerFlee: { kind: 'remain' },
    })
    expect(upgradeHostileBehaviorV12ToV13({ team: 1, respawnSeconds: 80 })).toMatchObject({
      onVictory: { kind: 'hide', ticks: 800 },
    })
  })

  test.each([
    0,
    -1,
    0.01,
    1.234,
    Number.MAX_SAFE_INTEGER,
  ])('fails closed for non-positive or non-exact respawn seconds %s', (respawnSeconds) => {
    expect(() => upgradeHostileBehaviorV12ToV13({ team: 1, respawnSeconds })).toThrow(
      /respawnSeconds/,
    )
  })

  test('rejects legacy policy pollution and malformed nested onLose', () => {
    expect(() => upgradeHostileBehaviorV12ToV13({ team: 1, success: 'hide' })).toThrow(/未知字段/)
    expect(() =>
      upgradeHostileBehaviorV12ToV13({
        team: 1,
        onLose: [
          {
            kind: 'branch',
            cond: { kind: 'flag', flag: 'x', is: true },
            then: [{ kind: 'vanishEntity' }],
          },
        ],
      }),
    ).toThrow(/禁止 vanishEntity/)
  })

  test('upgrades manifest without changing minimum save version', () => {
    const source = { id: 'demo', contentVersion: 12, minimumSaveVersion: 8, content: {} }
    const upgraded = upgradeManifestV12ToV13(source)
    expect(upgraded).toMatchObject({ contentVersion: 13, minimumSaveVersion: 8 })
    expect(source).toEqual({ id: 'demo', contentVersion: 12, minimumSaveVersion: 8, content: {} })
  })

  test('rejects a manifest with a missing or changed save gate', () => {
    expect(() => upgradeManifestV12ToV13({ contentVersion: 11, minimumSaveVersion: 8 })).toThrow(
      /contentVersion 12/,
    )
    expect(() => upgradeManifestV12ToV13({ contentVersion: 12, minimumSaveVersion: 7 })).toThrow(
      /期望 8/,
    )
  })

  test('fails before writing when legacy vanish is nested in a scene behavior', () => {
    expect(() =>
      upgradeScenesV12ToV13([
        {
          id: 's001',
          mapId: 'map-001',
          entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
          entities: [
            {
              id: 'e001',
              sprite: 'npc',
              pos: { col: 0, row: 0, height: 0 },
              initialPage: 'default',
              pages: [{ id: 'default', label: 'default', trigger: 'talk' }],
              behaviors: {
                trigger: {
                  talk: {
                    label: 'talk',
                    order: 0,
                    flow: {
                      kind: 'stages',
                      initial: 'start',
                      stages: [{ id: 'start', body: [{ kind: 'vanishEntity' }] }],
                    },
                  },
                },
              },
            },
          ],
        },
      ]),
    ).toThrow(/缺少 owner\/self/)
  })
})
