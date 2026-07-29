import { describe, expect, test } from 'vitest'
import { upgradeItemsV7ToV8, upgradeManifestV7ToV8 } from './item-throw-v8-upgrade.js'

describe('contentVersion 7 -> 8 投掷 schema 升级', () => {
  test('只给旧投掷增加 oneEnemy，保持效果/表现顺序且输入不变', () => {
    const items = [
      {
        id: 'poison',
        name: '毒物',
        desc: [],
        buyPrice: 0,
        sellPrice: 0,
        sellable: false,
        throw: {
          effects: [{ kind: 'applyPoison', poisonId: '551' }],
          sound: 'sound.pal.001',
        },
      },
      {
        id: 'shadow',
        name: '无影毒',
        desc: [],
        buyPrice: 0,
        sellPrice: 0,
        sellable: false,
        throw: {
          effects: [
            {
              kind: 'currentHpDamage',
              numerator: 1,
              denominator: 2,
              bonus: 1,
              cap: 1000,
            },
          ],
        },
      },
      {
        id: 'plain',
        name: '普通物品',
        desc: [],
        buyPrice: 0,
        sellPrice: 0,
        sellable: false,
      },
    ]
    const before = JSON.stringify(items)
    const upgraded = upgradeItemsV7ToV8(items)
    expect(upgraded[0]!.throw).toEqual({
      target: 'oneEnemy',
      effects: [{ kind: 'applyPoison', poisonId: '551' }],
      sound: 'sound.pal.001',
    })
    expect(upgraded[1]!.throw?.target).toBe('oneEnemy')
    expect(upgraded[2]!.throw).toBeUndefined()
    expect(JSON.stringify(items)).toBe(before)
    expect(upgradeItemsV7ToV8(items)).toEqual(upgraded)
  })

  test('容忍 items 已写入而 manifest 尚未提交的升级半状态', () => {
    const interrupted = [
      {
        id: 'poison',
        name: '毒物',
        desc: [],
        buyPrice: 0,
        sellPrice: 0,
        sellable: false,
        throw: {
          target: 'oneEnemy',
          effects: [{ kind: 'applyPoison', poisonId: '551' }],
        },
      },
    ]
    expect(upgradeItemsV7ToV8(interrupted)).toEqual(interrupted)
  })

  test('拒绝 v7 未发布的效果、非法 target 与空效果', () => {
    const item = (thrown: unknown) => [
      {
        id: 'bad',
        name: '坏数据',
        desc: [],
        buyPrice: 0,
        sellPrice: 0,
        sellable: false,
        throw: thrown,
      },
    ]
    expect(() =>
      upgradeItemsV7ToV8(item({ effects: [{ kind: 'fixedDamage', amount: 1 }] })),
    ).toThrow(/只允许 applyPoison\/currentHpDamage/)
    expect(() =>
      upgradeItemsV7ToV8(
        item({
          target: 'allEnemies',
          effects: [{ kind: 'applyPoison', poisonId: '551' }],
        }),
      ),
    ).toThrow(/升级半状态只允许 oneEnemy/)
    expect(() => upgradeItemsV7ToV8(item({ effects: [] }))).toThrow(/不得为空/)
  })

  test('manifest 只升 contentVersion，minimumSaveVersion 保持 7 且输入不变', () => {
    const manifest = {
      id: 'demo',
      name: 'Demo',
      contentVersion: 7,
      minimumSaveVersion: 7,
      entryScene: 'start',
      content: {},
      assets: { catalog: 'assets/index.json', roles: {} },
      startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
    }
    const before = JSON.stringify(manifest)
    expect(upgradeManifestV7ToV8(manifest)).toEqual({ ...manifest, contentVersion: 8 })
    expect(JSON.stringify(manifest)).toBe(before)
    expect(() => upgradeManifestV7ToV8({ ...manifest, contentVersion: 8 })).toThrow(
      /contentVersion 7/,
    )
  })
})
