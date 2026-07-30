import { describe, expect, test } from 'vitest'
import {
  upgradeEmbeddedBattleChoreographyV9ToV10,
  upgradeEnemiesV9ToV10,
  upgradeManifestV9ToV10,
} from './enemy-script-v10-upgrade.js'

function enemy(body: unknown[], onDefeated: unknown[] = []): Record<string, unknown> {
  return {
    id: 'enemy-test',
    name: 'name.enemy-test',
    battleSprite: 'battle-sprite-test',
    yPosOffset: 0,
    stats: {},
    ai: { resistanceToSorcery: 0 },
    sounds: {},
    choreography: [{ at: 'turnStart', body }],
    onDefeated,
  }
}

describe('contentVersion 9 -> 10 enemy script upgrade', () => {
  test('旧合法 battle/onDefeated 叶原样保留、输入不变且 v10 半状态可重试', () => {
    const input = [
      enemy(
        [
          { kind: 'dialog', cue: { rows: [{ text: 'dialog.test' }] } },
          { kind: 'fleeBattle' },
        ],
        [{ kind: 'giveItem', itemId: 'reward' }],
      ),
    ]
    const before = JSON.parse(JSON.stringify(input))
    const upgraded = upgradeEnemiesV9ToV10(input)
    expect(upgraded).toEqual(before)
    expect(input).toEqual(before)
    expect(upgraded).not.toBe(input)
    expect(upgradeEnemiesV9ToV10(upgraded)).toEqual(upgraded)
  })

  test('敌人旧宽泛 Command[] 中的非法上下文命令按 owner/path fail-loud', () => {
    expect(() =>
      upgradeEnemiesV9ToV10([enemy([{ kind: 'loadScene', scene: 's002' }])]),
    ).toThrow(/enemies\[0\]\.choreography\[0\]\.body\[0\].*battle context/)
    expect(() =>
      upgradeEnemiesV9ToV10([enemy([], [{ kind: 'confirm', onNo: [] }])]),
    ).toThrow(/enemies\[0\]\.onDefeated\[0\].*onDefeated context/)
  })

  test('递归扫描 scene/shared/item-private 中嵌套的 startBattle choreography', () => {
    const source = {
      outer: [
        {
          kind: 'branch',
          then: [
            {
              kind: 'startBattle',
              team: 1,
              choreography: [
                {
                  at: 'battleStart',
                  body: [{ kind: 'playSound', asset: 'sound.test' }],
                },
              ],
            },
          ],
        },
      ],
    }
    const before = JSON.parse(JSON.stringify(source))
    const upgraded = upgradeEmbeddedBattleChoreographyV9ToV10(source, 'shared.shared-test')
    expect(upgraded).toEqual(before)
    expect(upgraded).not.toBe(source)
    expect(source).toEqual(before)

    const invalid = {
      effect: {
        kind: 'itemPrivateScript',
        script: {
          body: [
            {
              kind: 'startBattle',
              team: 1,
              choreography: [
                {
                  at: 'turnStart',
                  body: [{ kind: 'setFlag', flag: 'forbidden', value: true }],
                },
              ],
            },
          ],
        },
      },
    }
    expect(() =>
      upgradeEmbeddedBattleChoreographyV9ToV10(invalid, 'items[0].use.effects[0]'),
    ).toThrow(/items\[0\].*choreography.*battle context/)
  })

  test('manifest 只把 content9 升到 10，SAVE8 门槛不漂移', () => {
    const manifest = {
      id: 'test',
      name: '测试',
      contentVersion: 9,
      minimumSaveVersion: 8,
      entryScene: 's001',
      content: {},
      assets: { catalog: 'assets/index.json', roles: {} },
      startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
    }
    expect(upgradeManifestV9ToV10(manifest)).toEqual({
      ...manifest,
      contentVersion: 10,
    })
    expect(manifest.contentVersion).toBe(9)
    expect(() => upgradeManifestV9ToV10({ ...manifest, contentVersion: 10 })).toThrow(
      /contentVersion 9/,
    )
    expect(() => upgradeManifestV9ToV10({ ...manifest, minimumSaveVersion: 7 })).toThrow(
      /minimumSaveVersion.*期望 8/,
    )
  })
})
