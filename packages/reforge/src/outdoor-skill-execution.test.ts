import type { PoisonDef } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { outdoorParty, outdoorSkill } from './__tests__/outdoor-skill-fixture.js'
import { expectDefined } from './defined.js'
import { castOutdoorSkill } from './outdoor-skill-execution.js'

const commonPoison = { poisonId: 551, tickIndex: 0 }
const severePoison = { poisonId: 552, tickIndex: 1 }
const lastingPoison = { poisonId: 553, tickIndex: 2 }
const poisonDefs: Record<number, PoisonDef> = {
  551: { id: 551, name: 'common', curability: 'common', color: 16 },
  552: { id: 552, name: 'severe', curability: 'severe', color: 17 },
  553: { id: 553, name: 'lasting', curability: 'incurable', color: 18 },
}

function injuredParty() {
  const world = outdoorParty(['heal'])
  return { world, caster: expectDefined(world.party[0]), recipient: expectDefined(world.party[1]) }
}

const heal = outdoorSkill('heal')

describe('大世界法术的恢复与消耗', () => {
  test('用单体治疗补到体力上限并只收施法者的真气', () => {
    const { world, caster, recipient } = injuredParty()
    expect(castOutdoorSkill(world, heal, 0, 1)).toBe(true)
    expect(recipient.hp).toBe(99)
    expect(recipient.mp).toBe(30)
    expect(caster).toMatchObject({ hp: 60, mp: 24 })
  })

  test.each([0, 99])('目标体力为 %i 时普通治疗无效果且不扣真气', (hp) => {
    const { world, caster, recipient } = injuredParty()
    recipient.hp = hp
    expect(castOutdoorSkill(world, heal, 0, 1)).toBe(false)
    expect(recipient.hp).toBe(hp)
    expect(caster.mp).toBe(30)
  })

  test('全体回复只支付一份真气且保留全满的成员', () => {
    const { world, caster, recipient } = injuredParty()
    caster.hp = 99
    const skill = outdoorSkill('group-heal', { target: 'allAllies', cost: { mp: 15 } })
    expect(castOutdoorSkill(world, skill, 0, 'all')).toBe(true)
    expect(world.party.map(({ hp }) => hp)).toEqual([99, 99])
    expect(caster.mp).toBe(15)
    expect(recipient.mp).toBe(30)
  })

  test('真气不足或已选目标不在队时保持体力和真气', () => {
    const { world, caster, recipient } = injuredParty()
    const costly = outdoorSkill('costly', { cost: { mp: 31 } })
    expect(castOutdoorSkill(world, costly, 0, 1)).toBe(false)
    expect(castOutdoorSkill(world, heal, 0, 2)).toBe(false)
    expect(castOutdoorSkill(world, heal, 2, 0)).toBe(false)
    expect(recipient.hp).toBe(60)
    expect(caster.mp).toBe(30)
  })

  test('对自己补真气时先补到上限，再扣施法成本', () => {
    const { world, caster } = injuredParty()
    const skill = outdoorSkill('restore-mp', { effects: [{ kind: 'healMp', amount: 80 }] })
    expect(castOutdoorSkill(world, skill, 0, 0)).toBe(true)
    expect(caster.mp).toBe(94)
    caster.mp = 100
    expect(castOutdoorSkill(world, skill, 0, 0)).toBe(false)
    expect(caster.mp).toBe(100)
  })

  test('战斗伤害效果不会被当作大世界回复执行', () => {
    const { world, caster, recipient } = injuredParty()
    const skill = outdoorSkill('damage', { effects: [{ kind: 'damage', power: 10, elemental: 1 }] })
    expect(castOutdoorSkill(world, skill, 0, 1)).toBe(false)
    expect(recipient.hp).toBe(60)
    expect(caster.mp).toBe(30)
  })
})

describe('大世界法术的复活与解毒', () => {
  const revive = outdoorSkill('revive', {
    cost: { mp: 16 },
    effects: [{ kind: 'revive', hpPercent: 25 }],
  })

  test('复活按上限比例取整，清可解重毒并保留不可解毒', () => {
    const { world, caster, recipient } = injuredParty()
    recipient.hp = 0
    recipient.poisons = [commonPoison, severePoison, lastingPoison]
    expect(castOutdoorSkill(world, revive, 0, 1, poisonDefs)).toBe(true)
    expect(recipient.hp).toBe(24)
    expect(recipient.poisons).toEqual([lastingPoison])
    expect(caster.mp).toBe(14)
  })

  test('对仍存活的队员施复活不改体力或消耗', () => {
    const { world, caster, recipient } = injuredParty()
    expect(castOutdoorSkill(world, revive, 0, 1, poisonDefs)).toBe(false)
    expect(recipient.hp).toBe(60)
    expect(caster.mp).toBe(30)
  })

  test('点名解毒只移除匹配的记录', () => {
    const { world, caster, recipient } = injuredParty()
    recipient.poisons = [commonPoison, severePoison, lastingPoison]
    const skill = outdoorSkill('cure-id', { effects: [{ kind: 'curePoison', poisonId: '552' }] })
    expect(castOutdoorSkill(world, skill, 0, 1, poisonDefs)).toBe(true)
    expect(recipient.poisons).toEqual([commonPoison, lastingPoison])
    expect(caster.mp).toBe(24)
  })

  test('缺省解毒只清普通毒，重试没有可解记录时不再耗费真气', () => {
    const { world, caster, recipient } = injuredParty()
    recipient.poisons = [commonPoison, severePoison, lastingPoison]
    const skill = outdoorSkill('cure-default', { effects: [{ kind: 'curePoison' }] })
    expect(castOutdoorSkill(world, skill, 0, 1, poisonDefs)).toBe(true)
    expect(recipient.poisons).toEqual([severePoison, lastingPoison])
    expect(caster.mp).toBe(24)
    expect(castOutdoorSkill(world, skill, 0, 1, poisonDefs)).toBe(false)
    expect(recipient.poisons).toEqual([severePoison, lastingPoison])
    expect(caster.mp).toBe(24)
  })
})
