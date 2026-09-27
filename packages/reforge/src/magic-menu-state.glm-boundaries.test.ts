/**
 * TEST-GLM-STATE-COMMANDS-1 A01：magic-menu-state 残差
 * 去重：magic-menu-state.test.ts 20+ 例、magic-menu-state.boundaries.test.ts E1–E4 已证
 * 基础导航/选人/确认/目标/castOutdoorSkill 主路径——本文件只补冻结池内：
 * castOutdoorSkill healMp/curePoison 点名与 tier/revive+毒表/未知kind/越界、
 * magicConfirmSpell 越界/无cost.mp、magicMoveCaster 空队、MAGIC_GRID_COLS/closeMagicMenu。
 * castOutdoorSkill 原地改 world（合同如此），不施加不可变断言。
 */
import { describe, expect, test } from 'vitest'
import type { PoisonDef, SkillData, SkillDataMap, WorldState } from '@type-pal/content'
import {
  castOutdoorSkill,
  closeMagicMenu,
  MAGIC_GRID_COLS,
  magicConfirmSpell,
  magicMoveCaster,
  openMagicMenu,
} from './magic-menu-state.js'
import { makeTestSkills, makeTestWorld } from './test-fixtures.js'

const poisonDefs: Record<number, PoisonDef> = {
  551: { id: 551, name: '赤毒', curability: 'common', color: 16 },
  999: { id: 999, name: '无影毒', curability: 'severe', color: 16 },
}

function healSkill(effects: SkillData['effects'], cost: SkillData['cost'] = { mp: 5 }): SkillData {
  return {
    id: 'test-skill',
    name: '测试仙术',
    desc: '',
    cost,
    usableOutsideBattle: true,
    target: 'oneAlly',
    effects,
    animation: { effectSprite: 0 },
  }
}

describe('A01 castOutdoorSkill 残差', () => {
  test('healMp：活人回蓝 clamp 到 maxMP，扣 MP', () => {
    const w = makeTestWorld()
    const skill = healSkill([{ kind: 'healMp', amount: 50 }], { mp: 5 })
    const ok = castOutdoorSkill(w, skill, 0, 0, poisonDefs)
    expect(ok).toBe(true)
    expect(w.party[0]!.mp).toBe(Math.min(100, 30 - 5 + 50))
  })

  test('healMp：满 MP 无效果不扣 MP', () => {
    const w = makeTestWorld()
    w.party[0]!.mp = 100
    const skill = healSkill([{ kind: 'healMp', amount: 50 }])
    const ok = castOutdoorSkill(w, skill, 0, 0, poisonDefs)
    expect(ok).toBe(false)
    expect(w.party[0]!.mp).toBe(100)
  })

  test('curePoison poisonId 点名：只解匹配毒', () => {
    const w = makeTestWorld()
    w.party[0]!.poisons = [
      { poisonId: 551, tickIndex: 0 },
      { poisonId: 999, tickIndex: 0 },
    ]
    const skill = healSkill([{ kind: 'curePoison', poisonId: '551' }])
    const ok = castOutdoorSkill(w, skill, 0, 0, poisonDefs)
    expect(ok).toBe(true)
    expect(w.party[0]!.poisons).toEqual([{ poisonId: 999, tickIndex: 0 }])
  })

  test('curePoison curesTier：common 解 common、缺 def 的毒保留', () => {
    const w = makeTestWorld()
    w.party[0]!.poisons = [{ poisonId: 551, tickIndex: 0 }]
    const skill = healSkill([{ kind: 'curePoison', curesTier: 'common' }])
    const ok = castOutdoorSkill(w, skill, 0, 0, poisonDefs)
    expect(ok).toBe(true)
    expect(w.party[0]!.poisons).toEqual([])
  })

  test('revive：死人复活半血并清毒（severe 解、缺 def 保留）', () => {
    const w = makeTestWorld()
    w.party[0]!.hp = 0
    w.party[0]!.poisons = [{ poisonId: 551, tickIndex: 0 }]
    const skill = healSkill([{ kind: 'revive', hpPercent: 50 }])
    const ok = castOutdoorSkill(w, skill, 0, 0, poisonDefs)
    expect(ok).toBe(true)
    expect(w.party[0]!.hp).toBe(75)
    expect(w.party[0]!.poisons).toEqual([])
  })

  test('未知效果 kind no-op 不扣 MP', () => {
    const w = makeTestWorld()
    const skill = healSkill([{ kind: 'damage', power: 10, element: 0 } as never])
    const ok = castOutdoorSkill(w, skill, 0, 0, poisonDefs)
    expect(ok).toBe(false)
    expect(w.party[0]!.mp).toBe(30)
  })

  test('casterIdx 越界和 target 越界都 false', () => {
    const w = makeTestWorld()
    const skill = healSkill([{ kind: 'healHp', amount: 10 }])
    expect(castOutdoorSkill(w, skill, 9, 0, poisonDefs)).toBe(false)
    expect(castOutdoorSkill(w, skill, 0, 9, poisonDefs)).toBe(false)
  })
})

describe('A01 magicConfirmSpell 残差', () => {
  test('casterIdx 越界 → null 不动', () => {
    const w = makeTestWorld()
    const s = openMagicMenu(w, makeTestSkills())
    s.casterIdx = 99
    const result = magicConfirmSpell(s, w)
    expect(result).toBeNull()
  })

  test('cursor 越界（spells 非空）→ null 不动', () => {
    const w = makeTestWorld()
    const skills = makeTestSkills()
    const s = openMagicMenu(w, skills)
    s.cursor = 99
    const result = magicConfirmSpell(s, w)
    expect(result).toBeNull()
  })

  test('cost 无 mp 字段 → mpCost 0 恒过门', () => {
    const w = makeTestWorld()
    w.learnedSkills['li-xiaoyao'] = ['400']
    const skills: SkillDataMap = {
      '400': {
        id: '400',
        name: '免费技能',
        desc: '',
        cost: {},
        usableOutsideBattle: true,
        target: 'oneAlly',
        effects: [{ kind: 'healHp', amount: 10 }],
        animation: { effectSprite: 0 },
      },
    }
    const s = openMagicMenu(w, skills)
    // pick-caster → pick-spell phase
    if (s.phase === 'pick-caster') {
      s.phase = 'pick-spell'
      s.spells = Object.values(skills)
      s.cursor = 0
    }
    const result = magicConfirmSpell(s, w)
    expect(result).not.toBeNull()
    expect(result?.kind).toBe('toTarget')
  })
})

describe('A01 其它残差', () => {
  test('magicMoveCaster 空队：同引用不变', () => {
    const emptyW: WorldState = { party: [], money: 0, learnedSkills: {}, inventory: [] }
    const s = openMagicMenu(emptyW, makeTestSkills())
    const result = magicMoveCaster(s, emptyW, 'down')
    expect(result).toBe(s)
  })

  test('MAGIC_GRID_COLS === 3；closeMagicMenu 完整对象', () => {
    expect(MAGIC_GRID_COLS).toBe(3)
    const closed = closeMagicMenu()
    expect(closed).toEqual({
      active: false,
      phase: 'pick-spell',
      casterIdx: 0,
      spells: [],
      cursor: 0,
      targetIdx: 0,
    })
  })
})
