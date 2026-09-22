/**
 * TEST-NONVISUAL-COVERAGE-2 W2-B B01：battle-trial-config 剩余拒绝/默认臂（wave2）。
 * 既有 battle-trial-config.test.ts 三标题已证显式零/空/静音、源模式全集、重复模板/稀疏数组；
 * 本文件补冻结定位剩余臂：trialObject 原型拒绝（非普通 JSON 对象）、trialArray 稀疏拒绝、
 * trialId 首尾空白拒绝、percent 上界、装备槽未知键拒绝、skills.kind 无效拒绝与重复技能。
 */
import { describe, expect, test } from 'vitest'
import type { BattleTrialConfig } from './battle-trial-config.js'
import {
  parseBattleTrialConfig,
  parseTrialEnemies,
  parseTrialMusic,
} from './battle-trial-config.js'

const legalConfig = (): unknown =>
  parseBattleTrialConfig({
    party: {
      members: [
        {
          actorId: 'hero',
          stats: {},
          equipment: {},
          skills: { kind: 'inherit' },
          hp: { kind: 'full' },
          mp: { kind: 'full' },
        },
      ],
    },
    enemies: { kind: 'team', teamId: 'wolves' },
    bag: { items: [] },
    fieldId: 0,
    music: { kind: 'default' },
    money: 0,
    auto: false,
    boss: false,
  })

describe('W2-B B01 trial-config 剩余拒绝臂', () => {
  test('trialObject 拒绝非普通 JSON 对象（原型链实例）', () => {
    class Fancy {
      party = legalConfig
    }
    expect(() => parseBattleTrialConfig(new Fancy())).toThrow('trial: 期望普通JSON对象')
  })

  test('trialArray 拒绝稀疏数组；trialId 拒绝空串与首尾空白', () => {
    const sparse = legalConfig() as Record<string, unknown>
    sparse.bag = { items: new Array(2) } // 稀疏
    expect(() => parseBattleTrialConfig(sparse)).toThrow('不允许稀疏空洞')
    const blankActor = legalConfig() as { party: { members: Array<Record<string, unknown>> } }
    blankActor.party.members[0]!.actorId = '  hero  '
    expect(() => parseBattleTrialConfig(blankActor)).toThrow('无首尾空白')
    const emptyActor = legalConfig() as { party: { members: Array<Record<string, unknown>> } }
    emptyActor.party.members[0]!.actorId = ''
    expect(() => parseBattleTrialConfig(emptyActor)).toThrow('期望非空')
  })

  test('percent 上界：100 合法、101 拒绝；value 无上界整数仍合法', () => {
    const percent = legalConfig() as { party: { members: Array<Record<string, unknown>> } }
    percent.party.members[0]!.hp = { kind: 'percent', value: 100 }
    expect(() => parseBattleTrialConfig(percent)).not.toThrow()
    const over = legalConfig() as { party: { members: Array<Record<string, unknown>> } }
    over.party.members[0]!.hp = { kind: 'percent', value: 101 }
    expect(() => parseBattleTrialConfig(over)).toThrow('期望0～100的整数')
    const bigValue = legalConfig() as { party: { members: Array<Record<string, unknown>> } }
    bigValue.party.members[0]!.hp = { kind: 'value', value: 999 }
    expect(() => parseBattleTrialConfig(bigValue)).not.toThrow()
  })

  test('装备槽未知键拒绝；skills.kind 无效拒绝；replace 重复技能拒绝', () => {
    const badSlot = legalConfig() as { party: { members: Array<Record<string, unknown>> } }
    badSlot.party.members[0]!.equipment = { unknownSlot: 'sword' }
    expect(() => parseBattleTrialConfig(badSlot)).toThrow('equipment.unknownSlot: 未知字段')
    const badKind = legalConfig() as { party: { members: Array<Record<string, unknown>> } }
    badKind.party.members[0]!.skills = { kind: 'merge' }
    expect(() => parseBattleTrialConfig(badKind)).toThrow('无效技能模式')
    const dupSkills = legalConfig() as { party: { members: Array<Record<string, unknown>> } }
    dupSkills.party.members[0]!.skills = { kind: 'replace', ids: ['fire', 'fire'] }
    expect(() => parseBattleTrialConfig(dupSkills)).toThrow('重复技能')
  })

  test('enemies：非 5 槽拒绝、空 id 拒绝、恰 5 槽含 null 合法；music asset 缺 assetId 拒绝', () => {
    const fourSlots = legalConfig() as Record<string, unknown>
    fourSlots.enemies = { kind: 'slots', slots: [null, null, null, null] }
    expect(() => parseBattleTrialConfig(fourSlots)).toThrow('必须明确提供5个槽位')
    const emptyId = legalConfig() as Record<string, unknown>
    emptyId.enemies = { kind: 'slots', slots: ['', null, null, null, null] }
    expect(() => parseBattleTrialConfig(emptyId)).toThrow('期望非空')
    const five = legalConfig() as Record<string, unknown>
    five.enemies = { kind: 'slots', slots: ['slime', null, null, null, null] }
    expect(() => parseBattleTrialConfig(five)).not.toThrow()
    const badMusic = legalConfig() as Record<string, unknown>
    badMusic.music = { kind: 'asset' }
    expect(() => parseBattleTrialConfig(badMusic)).toThrow('music.assetId')
    expect(() => parseTrialMusic({ kind: 'unknown' })).toThrow('无效音乐模式')
    expect(() => parseTrialEnemies({ kind: 'battle' })).toThrow('无效敌队模式')
  })

  test('合法全集 round-trip：数组/对象输入不被原地修改（深快照保真）', () => {
    const input = legalConfig()
    const snapshot = structuredClone(input)
    const parsed: BattleTrialConfig = parseBattleTrialConfig(input)
    expect(input).toEqual(snapshot)
    expect(parsed.party.members[0]!.actorId).toBe('hero')
    expect(parsed.enemies).toEqual({ kind: 'team', teamId: 'wolves' })
  })
})
