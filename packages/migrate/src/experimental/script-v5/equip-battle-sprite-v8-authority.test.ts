import { describe, expect, test } from 'vitest'
import {
  assertEquipBattleSpriteUpgradeEvidence,
  projectItemsV9ToLegacyV8,
  upgradeEquipBattleSpritesAfterR13,
} from './equip-battle-sprite-v8-authority.js'
import { stableJsonSha256 } from './stable-json.js'

const MAPPINGS = [
  ['163', 'lin-yueru', 'player-fighter-6'],
  ['164', 'lin-yueru', 'player-fighter-6'],
  ['165', 'lin-yueru', 'player-fighter-6'],
  ['179', 'anu', 'player-fighter-7'],
  ['185', 'anu', 'player-fighter-7'],
  ['187', 'anu', 'player-fighter-7'],
  ['188', 'anu', 'player-fighter-7'],
] as const

function currentItems(): unknown[] {
  return MAPPINGS.map(([itemId, actorId, spriteId]) => ({
    id: itemId,
    name: `item.${itemId}`,
    buyPrice: 0,
    sellPrice: 0,
    sellable: false,
    equip: {
      slot: 'weapon',
      equipableBy: [actorId],
      effects: [
        { kind: 'statBonus', stat: 'attack', delta: 1 },
        { kind: 'battleSprite', byActor: { [actorId]: spriteId } },
      ],
    },
  }))
}

describe('E1 · content9 battleSprite historical authority', () => {
  test('7 条 current 映射严格逆投影为 scalar，并可无损 round-trip', () => {
    const current = currentItems()
    const legacy = projectItemsV9ToLegacyV8(current)

    expect(
      legacy.map((item) => item.equip?.effects.find((effect) => effect.kind === 'battleSprite')),
    ).toEqual(
      MAPPINGS.map(([, , spriteId]) => ({
        kind: 'battleSprite',
        sprite: spriteId,
      })),
    )
    const upgraded = upgradeEquipBattleSpritesAfterR13({
      files: new Map([['content/items.json', legacy as never]]),
      managedFiles: new Set(['content/items.json']),
    })
    expect(stableJsonSha256(upgraded.snapshot.files.get('content/items.json'))).toBe(
      stableJsonSha256(current),
    )
    expect(upgraded.evidence.mappings).toEqual(
      MAPPINGS.map(([itemId, actorId, spriteId]) => ({ itemId, actorId, spriteId })),
    )
    expect(() => assertEquipBattleSpriteUpgradeEvidence(upgraded.evidence)).not.toThrow()
  })

  test('拒绝缺失/多余角色、不同形象、混合 scalar/current 与多个效果', () => {
    const mutate = (fn: (items: any[]) => void): unknown[] => {
      const items = structuredClone(currentItems()) as any[]
      fn(items)
      return items
    }

    expect(() =>
      projectItemsV9ToLegacyV8(
        mutate((items) => {
          items[0].equip.equipableBy.push('zhao-linger')
        }),
      ),
    ).toThrow(/完全一致/)
    expect(() =>
      projectItemsV9ToLegacyV8(
        mutate((items) => {
          items[0].equip.equipableBy.push('zhao-linger')
          items[0].equip.effects[1].byActor['zhao-linger'] = 'player-fighter-5'
        }),
      ),
    ).toThrow(/映射漂移|多角色形象不同/)
    expect(() =>
      projectItemsV9ToLegacyV8(
        mutate((items) => {
          items[0].equip.effects[1] = {
            kind: 'battleSprite',
            sprite: 'player-fighter-6',
          }
        }),
      ),
    ).toThrow(/未知字段/)
    expect(() =>
      projectItemsV9ToLegacyV8(
        mutate((items) => {
          items[0].equip.effects.push({
            kind: 'battleSprite',
            byActor: { 'lin-yueru': 'player-fighter-6' },
          })
        }),
      ),
    ).toThrow(/映射漂移|最多一个/)
  })

  test('拒绝 7 条 PAL 映射集合漂移与空角色映射', () => {
    expect(() => projectItemsV9ToLegacyV8(currentItems().slice(1))).toThrow(/7 条/)
    expect(() =>
      projectItemsV9ToLegacyV8(
        (structuredClone(currentItems()) as any[]).map((item, index) =>
          index === 0
            ? {
                ...item,
                equip: {
                  ...item.equip,
                  equipableBy: [],
                  effects: [{ kind: 'battleSprite', byActor: {} }],
                },
              }
            : item,
        ),
      ),
    ).toThrow(/7 条|不得为空/)
  })

  test('evidence 任一字段漂移都会失败', () => {
    const legacy = projectItemsV9ToLegacyV8(currentItems())
    const { evidence } = upgradeEquipBattleSpritesAfterR13({
      files: new Map([['content/items.json', legacy as never]]),
      managedFiles: new Set(['content/items.json']),
    })
    expect(() =>
      assertEquipBattleSpriteUpgradeEvidence({
        ...evidence,
        currentItemsDigest: '0'.repeat(64),
      }),
    ).toThrow(/digest 漂移/)
  })
})
