import { describe, expect, test } from 'vitest'
import { upgradeItemsV8ToV9, upgradeManifestV8ToV9 } from './equip-battle-sprite-v9-upgrade.js'

function item(equipableBy: string[], effects: unknown[], id = 'weapon'): Record<string, unknown> {
  return {
    id,
    name: id,
    desc: [],
    buyPrice: 0,
    sellPrice: 0,
    sellable: false,
    equip: { slot: 'weapon', equipableBy, effects },
  }
}

describe('contentVersion 8 -> 9 · 装备战斗形象按角色升级', () => {
  test('scalar 复制到全部旧 equipableBy，singleton 与 multi-role 都不猜角色类型', () => {
    expect(
      upgradeItemsV8ToV9([
        item(['lin-yueru'], [{ kind: 'battleSprite', sprite: 'fighter-6' }], 'whip'),
        item(
          ['li-xiaoyao', 'lin-yueru'],
          [{ kind: 'battleSprite', sprite: 'fighter-shared' }],
          'shared',
        ),
      ]),
    ).toMatchObject([
      {
        equip: {
          effects: [{ kind: 'battleSprite', byActor: { 'lin-yueru': 'fighter-6' } }],
        },
      },
      {
        equip: {
          effects: [
            {
              kind: 'battleSprite',
              byActor: {
                'li-xiaoyao': 'fighter-shared',
                'lin-yueru': 'fighter-shared',
              },
            },
          ],
        },
      },
    ])
  })

  test('多个旧 scalar 按最后一次写入折叠，并保留最后旧效果所在顺序', () => {
    const [upgraded] = upgradeItemsV8ToV9([
      item(
        ['hero'],
        [
          { kind: 'statBonus', stat: 'attack', delta: 1 },
          { kind: 'battleSprite', sprite: 'first' },
          { kind: 'attackAll' },
          { kind: 'battleSprite', sprite: 'last' },
          { kind: 'regenHp', amount: 20 },
        ],
      ),
    ])
    expect(upgraded?.equip?.effects).toEqual([
      { kind: 'statBonus', stat: 'attack', delta: 1 },
      { kind: 'attackAll' },
      { kind: 'battleSprite', byActor: { hero: 'last' } },
      { kind: 'regenHp', amount: 20 },
    ])
  })

  test('v9 半状态可幂等重试且不修改输入', () => {
    const input = [
      item(
        ['hero', 'mage'],
        [{ kind: 'battleSprite', byActor: { hero: 'fighter-1' } }, { kind: 'attackAll' }],
      ),
    ]
    const before = JSON.parse(JSON.stringify(input))
    const upgraded = upgradeItemsV8ToV9(input)
    expect(upgraded).toEqual(before)
    expect(input).toEqual(before)
    expect(upgraded).not.toBe(input)
    expect(upgraded[0]).not.toBe(input[0])
  })

  test('零角色、同物品新旧混合、重复新效果与畸形字段全部 fail-loud', () => {
    expect(() =>
      upgradeItemsV8ToV9([item([], [{ kind: 'battleSprite', sprite: 'fighter' }])]),
    ).toThrow(/equipableBy 为空/)
    expect(() =>
      upgradeItemsV8ToV9([
        item(
          ['hero'],
          [
            { kind: 'battleSprite', sprite: 'old' },
            { kind: 'battleSprite', byActor: { hero: 'new' } },
          ],
        ),
      ]),
    ).toThrow(/形态混合/)
    expect(() =>
      upgradeItemsV8ToV9([
        item(
          ['hero'],
          [
            { kind: 'battleSprite', byActor: { hero: 'one' } },
            { kind: 'battleSprite', byActor: { hero: 'two' } },
          ],
        ),
      ]),
    ).toThrow(/最多一个/)
    expect(() =>
      upgradeItemsV8ToV9([
        item(['hero'], [{ kind: 'battleSprite', sprite: 'fighter', extra: true }]),
      ]),
    ).toThrow(/未知字段/)
  })

  test('manifest 同步升 content9/SAVE8 门槛且输入不变', () => {
    const manifest = {
      id: 'test',
      name: '测试',
      contentVersion: 8,
      minimumSaveVersion: 7,
      entryScene: 's',
      content: {},
      assets: { catalog: 'assets/index.json', roles: {} },
      startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
    }
    const upgraded = upgradeManifestV8ToV9(manifest)
    expect(upgraded).toEqual({ ...manifest, contentVersion: 9, minimumSaveVersion: 8 })
    expect(manifest).toMatchObject({ contentVersion: 8, minimumSaveVersion: 7 })
    expect(() => upgradeManifestV8ToV9({ ...manifest, contentVersion: 9 })).toThrow(
      /contentVersion 8/,
    )
    expect(() => upgradeManifestV8ToV9({ ...manifest, minimumSaveVersion: 6 })).toThrow(
      /minimumSaveVersion.*期望 7/,
    )
    expect(() => upgradeManifestV8ToV9({ ...manifest, minimumSaveVersion: undefined })).toThrow(
      /minimumSaveVersion.*期望 7/,
    )
  })
})
