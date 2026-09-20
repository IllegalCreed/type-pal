import { describe, expect, test } from 'vitest'
import {
  type BattleTrialConfig,
  parseBattleTrialConfig,
  parseTrialParty,
} from './battle-trial-config.js'

function config(): BattleTrialConfig {
  return {
    party: {
      members: [
        {
          actorId: 'hero',
          stats: { level: 5, maxHP: 20, maxMP: 0, speed: 0 },
          equipment: { weapon: null },
          skills: { kind: 'replace', ids: [] },
          hp: { kind: 'value', value: 0 },
          mp: { kind: 'percent', value: 0 },
        },
      ],
    },
    enemies: { kind: 'slots', slots: ['wolf', null, 'wolf', null, null] },
    bag: { items: [{ itemId: 'herb', quantity: 2 }] },
    fieldId: 0,
    music: { kind: 'silent' },
    money: 0,
    auto: false,
    boss: false,
  }
}
describe('battle trial JSON contract', () => {
  test('preserves explicit zero/empty/silence and enemy holes; detaches actual input', () => {
    const input = config(),
      before = structuredClone(input)
    const result = parseBattleTrialConfig(input)
    expect(result).toEqual(before)
    result.party.members[0]!.stats.level = 99
    result.party.members[0]!.equipment.weapon = 'sword'
    result.bag.items[0]!.quantity = 5
    if (result.enemies.kind === 'slots') result.enemies.slots[1] = 'wolf'
    expect(input).toEqual(before)
    expect(parseBattleTrialConfig(before)).toEqual(before)
  })
  test('accepts each source/resource mode and removes only zero inventory rows', () => {
    const value = config()
    value.enemies = { kind: 'team', teamId: 'team-alpha' }
    value.music = { kind: 'asset', assetId: 'music:forest' }
    value.party.members[0]!.skills = { kind: 'inherit' }
    value.party.members[0]!.hp = { kind: 'full' }
    value.bag.items.push({ itemId: 'empty', quantity: 0 })
    const before = structuredClone(value)
    expect(parseBattleTrialConfig(value)).toEqual({
      ...before,
      bag: { items: [{ itemId: 'herb', quantity: 2 }] },
    })
    value.music = { kind: 'default' }
    expect(parseBattleTrialConfig(value).music).toEqual({ kind: 'default' })
    expect(before.bag.items).toHaveLength(2)
  })
  test.each([
    1, 2, 3,
  ])('accepts %i unique members without reducing the five enemy slots', (count) => {
    const member = config().party.members[0]!
    const party = {
      members: Array.from({ length: count }, (_, i) => ({
        ...structuredClone(member),
        actorId: `actor-${i}`,
      })),
    }
    expect(parseTrialParty(party)).toEqual(party)
    const input = config()
    input.party = party
    expect(parseBattleTrialConfig(input).enemies).toEqual(input.enemies)
  })
  test.each([4, 5, 6])('rejects %i members at the shared launch/document boundary', (count) => {
    const input = config()
    input.party.members = Array.from({ length: count }, (_, i) => ({
      ...structuredClone(input.party.members[0]!),
      actorId: `a${i}`,
    }))
    const before = structuredClone(input)
    expect(() => parseTrialParty(input.party)).toThrow('最多3名')
    expect(() => parseBattleTrialConfig(input)).toThrow('最多3名')
    expect(input).toEqual(before)
  })
  test.each([
    [
      'unknown field',
      (v: Record<string, unknown>) => {
        v.saveSlot = 1
      },
    ],
    [
      'wrong boolean',
      (v: Record<string, unknown>) => {
        v.auto = 'false'
      },
    ],
    [
      'future enemy input',
      (v: Record<string, unknown>) => {
        v.enemies = { kind: 'slots', slots: [null, null, null, null, null], hp: 1 }
      },
    ],
    [
      'mixed music sources',
      (v: Record<string, unknown>) => {
        v.music = { kind: 'silent', assetId: 'music' }
      },
    ],
    [
      'bad music tag',
      (v: Record<string, unknown>) => {
        v.music = { kind: 'other' }
      },
    ],
    [
      'invalid ID',
      (v: Record<string, unknown>) => {
        v.fieldId = ' forest'
      },
    ],
    [
      'fractional money',
      (v: Record<string, unknown>) => {
        v.money = 0.5
      },
    ],
    [
      'overflow',
      (v: Record<string, unknown>) => {
        v.money = Number.MAX_SAFE_INTEGER + 1
      },
    ],
    [
      'NaN',
      (v: Record<string, unknown>) => {
        v.money = Number.NaN
      },
    ],
    [
      'infinity',
      (v: Record<string, unknown>) => {
        v.money = Infinity
      },
    ],
    [
      'short slots',
      (v: Record<string, unknown>) => {
        v.enemies = { kind: 'slots', slots: ['wolf'] }
      },
    ],
    [
      'sparse slots',
      (v: Record<string, unknown>) => {
        v.enemies = { kind: 'slots', slots: new Array(5) }
      },
    ],
    [
      'duplicate inventory',
      (v: Record<string, unknown>) => {
        v.bag = {
          items: [
            { itemId: 'herb', quantity: 1 },
            { itemId: 'herb', quantity: 2 },
          ],
        }
      },
    ],
  ])('rejects %s without modifying the input', (_, corrupt) => {
    const value = config() as unknown as Record<string, unknown>
    corrupt(value)
    const before = structuredClone(value)
    expect(() => parseBattleTrialConfig(value)).toThrow(/trial/)
    expect(value).toEqual(before)
  })
  test.each([
    { stats: { level: 0 } },
    { stats: { hp: 1 } },
    { equipment: { wrist: 'sword' } },
    { skills: { kind: 'inherit', ids: [] } },
    { skills: { kind: 'replace', ids: ['x', 'x'] } },
    { hp: { kind: 'full', value: 1 } },
    { mp: { kind: 'percent', value: 101 } },
    { actorId: null },
  ])('rejects malformed member field %#', (patch) => {
    const value = config()
    Object.assign(value.party.members[0]!, patch)
    expect(() => parseBattleTrialConfig(value)).toThrow(/members\[0\]/)
  })
  test('rejects duplicate templates and sparse members instead of silently filtering them', () => {
    const value = config()
    value.party.members.push(structuredClone(value.party.members[0]!))
    expect(() => parseBattleTrialConfig(value)).toThrow('重复队员')
    value.party.members = new Array(2)
    expect(() => parseBattleTrialConfig(value)).toThrow('稀疏空洞')
    value.party.members = Array.from({ length: 6 }, (_, i) => ({
      ...config().party.members[0]!,
      actorId: `a${i}`,
    }))
    expect(() => parseBattleTrialConfig(value)).toThrow('最多3名')
  })
})
