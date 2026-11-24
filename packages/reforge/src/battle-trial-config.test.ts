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
    const input = config()
    const before = structuredClone(input)
    const result = parseBattleTrialConfig(input)
    expect(result).toEqual(before)
    result.party.members[0]!.stats.level = 99
    result.party.members[0]!.equipment.weapon = 'sword'
    result.bag.items[0]!.quantity = 5
    if (result.enemies.kind === 'slots') result.enemies.slots[1] = 'wolf'
    expect(input).toEqual(before)
  })

  test('accepts each source/resource mode and removes only zero inventory rows', () => {
    const value = config()
    value.enemies = { kind: 'team', teamId: 'team-alpha' }
    value.music = { kind: 'asset', assetId: 'music:forest' }
    value.party.members[0]!.skills = { kind: 'inherit' }
    value.party.members[0]!.hp = { kind: 'full' }
    value.bag.items.push({ itemId: 'empty', quantity: 0 })
    value.auto = true
    value.boss = true
    expect(parseBattleTrialConfig(value)).toEqual({
      ...value,
      bag: { items: [{ itemId: 'herb', quantity: 2 }] },
    })
    value.music = { kind: 'default' }
    expect(parseBattleTrialConfig(value).music).toEqual({ kind: 'default' })
    expect(value.bag.items).toHaveLength(2)
  })

  test('preserves the inclusive resource-pool limits', () => {
    const value = config()
    value.party.members[0]!.hp = { kind: 'value', value: Number.MAX_SAFE_INTEGER }
    value.party.members[0]!.mp = { kind: 'percent', value: 100 }
    expect(parseBattleTrialConfig(value).party.members[0]).toMatchObject({
      hp: { kind: 'value', value: Number.MAX_SAFE_INTEGER },
      mp: { kind: 'percent', value: 100 },
    })
  })

  test.each([
    1, 2, 3,
  ])('accepts %i unique members without reducing the five enemy slots', (count) => {
    const input = config()
    const member = input.party.members[0]!
    input.party = {
      members: Array.from({ length: count }, (_, i) => ({
        ...structuredClone(member),
        actorId: `actor-${i}`,
      })),
    }
    expect(parseTrialParty(input.party)).toEqual(input.party)
    expect(parseBattleTrialConfig(input)).toMatchObject({
      party: input.party,
      enemies: input.enemies,
    })
  })

  test('rejects a fourth party member at the shared launch/document boundary', () => {
    const input = config()
    const member = input.party.members[0]!
    input.party.members = Array.from({ length: 4 }, (_, i) => ({
      ...structuredClone(member),
      actorId: `actor-${i}`,
    }))
    const before = structuredClone(input)
    expect(() => parseTrialParty(input.party)).toThrow('trial.party.members: 最多3名队员')
    expect(() => parseBattleTrialConfig(input)).toThrow('trial.party.members: 最多3名队员')
    expect(input).toEqual(before)
  })

  test('rejects a non-JSON object even when its fields match a legal trial', () => {
    class TrialDocument {}
    const input = Object.assign(new TrialDocument(), config())
    expect(() => parseBattleTrialConfig(input)).toThrow('trial: 期望普通JSON对象')
  })

  test.each([
    { name: 'unknown field', overrides: { saveSlot: 1 }, error: 'trial.saveSlot: 未知字段' },
    { name: 'wrong boolean', overrides: { auto: 'false' }, error: 'trial.auto: 期望布尔值' },
    {
      name: 'future enemy input',
      overrides: { enemies: { kind: 'slots', slots: [null, null, null, null, null], hp: 1 } },
      error: 'trial.enemies.hp: 未知字段',
    },
    {
      name: 'mixed music sources',
      overrides: { music: { kind: 'silent', assetId: 'music' } },
      error: 'trial.music.assetId: 未知字段',
    },
    {
      name: 'bad music tag',
      overrides: { music: { kind: 'other' } },
      error: 'trial.music.kind: 无效音乐模式',
    },
    {
      name: 'missing music asset ID',
      overrides: { music: { kind: 'asset' } },
      error: 'trial.music.assetId: 期望非空、无首尾空白的稳定ID',
    },
    {
      name: 'non-numeric field ID',
      overrides: { fieldId: ' forest' },
      error: 'trial.fieldId: 期望0～',
    },
    { name: 'negative money', overrides: { money: -1 }, error: 'trial.money: 期望0～' },
    { name: 'fractional money', overrides: { money: 0.5 }, error: 'trial.money: 期望0～' },
    {
      name: 'overflow',
      overrides: { money: Number.MAX_SAFE_INTEGER + 1 },
      error: 'trial.money: 期望0～',
    },
    { name: 'NaN', overrides: { money: Number.NaN }, error: 'trial.money: 期望0～' },
    { name: 'infinity', overrides: { money: Infinity }, error: 'trial.money: 期望0～' },
    {
      name: 'short slots',
      overrides: { enemies: { kind: 'slots', slots: ['wolf', null, null, null] } },
      error: 'trial.enemies.slots: 必须明确提供5个槽位',
    },
    {
      name: 'sparse slots',
      overrides: { enemies: { kind: 'slots', slots: new Array(5) } },
      error: 'trial.enemies.slots[0]: 不允许稀疏空洞',
    },
    {
      name: 'empty enemy slot ID',
      overrides: { enemies: { kind: 'slots', slots: ['', null, null, null, null] } },
      error: 'trial.enemies.slots[0]: 期望非空、无首尾空白的稳定ID',
    },
    {
      name: 'bad enemy source tag',
      overrides: { enemies: { kind: 'battle' } },
      error: 'trial.enemies.kind: 无效敌队模式',
    },
    {
      name: 'duplicate inventory',
      overrides: {
        bag: {
          items: [
            { itemId: 'herb', quantity: 1 },
            { itemId: 'herb', quantity: 2 },
          ],
        },
      },
      error: 'trial.bag.items[1].itemId: 重复物品',
    },
    {
      name: 'sparse inventory rows',
      overrides: { bag: { items: new Array(2) } },
      error: 'trial.bag.items[0]: 不允许稀疏空洞',
    },
  ])('rejects $name without modifying the input', ({ overrides, error }) => {
    const input = { ...config(), ...overrides }
    const before = structuredClone(input)
    expect(() => parseBattleTrialConfig(input)).toThrow(error)
    expect(input).toEqual(before)
  })

  test.each([
    { name: 'level below one', overrides: { stats: { level: 0 } }, error: 'stats.level: 期望1～' },
    { name: 'live HP in stats', overrides: { stats: { hp: 1 } }, error: 'stats.hp: 未知字段' },
    {
      name: 'unknown equipment slot',
      overrides: { equipment: { wrist: 'sword' } },
      error: 'equipment.wrist: 未知字段',
    },
    {
      name: 'inherited skills with explicit IDs',
      overrides: { skills: { kind: 'inherit', ids: [] } },
      error: 'skills.ids: 未知字段',
    },
    {
      name: 'invalid skill mode',
      overrides: { skills: { kind: 'merge' } },
      error: 'skills.kind: 无效技能模式',
    },
    {
      name: 'duplicate skills',
      overrides: { skills: { kind: 'replace', ids: ['x', 'x'] } },
      error: 'skills.ids: 重复技能',
    },
    {
      name: 'full HP with an explicit value',
      overrides: { hp: { kind: 'full', value: 1 } },
      error: 'hp.value: 未知字段',
    },
    {
      name: 'percent MP above 100',
      overrides: { mp: { kind: 'percent', value: 101 } },
      error: 'mp.value: 期望0～100的整数',
    },
    {
      name: 'missing actor ID',
      overrides: { actorId: null },
      error: 'actorId: 期望非空、无首尾空白的稳定ID',
    },
    {
      name: 'empty actor ID',
      overrides: { actorId: '' },
      error: 'actorId: 期望非空、无首尾空白的稳定ID',
    },
    {
      name: 'actor ID with outer whitespace',
      overrides: { actorId: '  hero  ' },
      error: 'actorId: 期望非空、无首尾空白的稳定ID',
    },
  ])('rejects $name on the member input', ({ overrides, error }) => {
    const input = config()
    const member = { ...input.party.members[0], ...overrides }
    expect(() => parseBattleTrialConfig({ ...input, party: { members: [member] } })).toThrow(
      `trial.party.members[0].${error}`,
    )
  })

  test('rejects duplicate templates and sparse members instead of silently filtering them', () => {
    const value = config()
    value.party.members.push(structuredClone(value.party.members[0]!))
    expect(() => parseBattleTrialConfig(value)).toThrow('trial.party.members[1].actorId: 重复队员')
    value.party.members = new Array(2)
    expect(() => parseBattleTrialConfig(value)).toThrow('trial.party.members[0]: 不允许稀疏空洞')
  })
})
