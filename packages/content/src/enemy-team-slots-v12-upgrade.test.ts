import { describe, expect, test } from 'vitest'
import {
  upgradeEnemyTeamsV11ToV12,
  upgradeManifestV11ToV12,
  validateEnemyTeamReferencesV12,
  validateEnemyTeamsV12,
} from './enemy-team-slots-v12-upgrade.js'

describe('contentVersion 11 -> 12 enemy-team semantic slots', () => {
  test('v12 结构保留顺序与 null 空槽，并返回独立数组', () => {
    const source = [
      { id: 'team-1', slots: [null, 'enemy-a', null, 'enemy-b'] },
      { id: 'team-2', slots: [] },
    ]
    const teams = validateEnemyTeamsV12(source, new Set(['enemy-a', 'enemy-b']))
    expect(teams).toEqual(source)
    expect(teams).not.toBe(source)
    expect(teams[0]!.slots).not.toBe(source[0]!.slots)
  })

  test.each([
    ['legacy members', [{ id: 'team', members: ['enemy-a'] }]],
    ['mixed shape', [{ id: 'team', slots: ['enemy-a'], members: ['enemy-a'] }]],
    ['unknown field', [{ id: 'team', slots: [], note: true }]],
    [
      'duplicate id',
      [
        { id: 'team', slots: [] },
        { id: 'team', slots: [] },
      ],
    ],
    ['empty id', [{ id: '', slots: [] }]],
    ['more than five slots', [{ id: 'team', slots: [null, null, null, null, null, null] }]],
    ['undefined slot', [{ id: 'team', slots: [undefined] }]],
    ['numeric slot', [{ id: 'team', slots: [1] }]],
    ['empty enemy id', [{ id: 'team', slots: [''] }]],
  ])('v12 拒绝 %s', (_label, value) => {
    expect(() => validateEnemyTeamsV12(value)).toThrow()
  })

  test('引用校验忽略 null，但未知敌 id fail-loud', () => {
    const teams = validateEnemyTeamsV12([{ id: 'team', slots: [null, 'missing'] }])
    expect(() => validateEnemyTeamReferencesV12(teams, new Set(['enemy-a']))).toThrow(
      /slots\[1\].*missing/,
    )
  })

  test('本地 v11 升级只把 members 原位投影为 slots，不制造 PAL 空洞', () => {
    const source = [{ id: 'team', members: ['enemy-b', 'enemy-a'] }]
    const before = JSON.parse(JSON.stringify(source))
    expect(upgradeEnemyTeamsV11ToV12(source)).toEqual([
      { id: 'team', slots: ['enemy-b', 'enemy-a'] },
    ])
    expect(source).toEqual(before)
    expect(() =>
      upgradeEnemyTeamsV11ToV12([{ id: 'team', members: ['enemy-a'], slots: [] }]),
    ).toThrow(/未知字段/)
  })

  test('manifest 只升 content epoch，SAVE_VERSION 门槛保持 8', () => {
    const manifest = {
      id: 'p',
      name: 'p',
      contentVersion: 11,
      entryScene: 's',
      content: { enemyTeams: 'content/enemy-teams.json' },
      assets: { catalog: 'assets/index.json', roles: {} },
      startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
      minimumSaveVersion: 8,
    }
    const upgraded = upgradeManifestV11ToV12(manifest)
    expect(upgraded).toEqual({ ...manifest, contentVersion: 12, minimumSaveVersion: 8 })
    expect(manifest.contentVersion).toBe(11)
    expect(() => upgradeManifestV11ToV12({ ...manifest, contentVersion: 12 })).toThrow(
      /contentVersion 11/,
    )
    expect(() => upgradeManifestV11ToV12({ ...manifest, minimumSaveVersion: 9 })).toThrow(
      /minimumSaveVersion/,
    )
  })
})
