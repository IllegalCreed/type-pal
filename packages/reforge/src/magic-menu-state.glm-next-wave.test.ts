/**
 * TEST-GLM-NEW-G-1 G05：magic-menu-state 残差。
 * 旧证（magic-menu-state.test.ts / .boundaries / .glm-boundaries）已证解析过滤/导航/
 * 确认门/施放结算主链与显式 curesTier；本文件只补旧题未覆盖的公开臂：
 *   1) curePoison 效果缺 curesTier 字段时的 `?? 'common'` 缺省臂
 *      （magic-menu-state.ts:207）：common 毒被解并扣 MP；severe 毒保留且不吃 MP；
 *   2) 单人队 magicMoveCaster：返回新对象、casterIdx 值不变（:68-78；旧题只证过空队同引用）。
 * 世界/技能经现行 test-fixtures 合法构造；不 mock 被测核心。
 */
import type { PoisonDef, SkillData } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  castOutdoorSkill,
  closeMagicMenu,
  magicMoveCaster,
  openMagicMenu,
} from './magic-menu-state.js'
import { makeTestSkills, makeTestWorld } from './test-fixtures.js'

const poisonDefs: Record<number, PoisonDef> = {
  551: { id: 551, name: '赤毒', curability: 'common', color: 16 },
  999: { id: 999, name: '无影毒', curability: 'severe', color: 16 },
}

function cureSkill(curesTier?: 'common' | 'severe' | 'incurable'): SkillData {
  return {
    id: 'cure-all',
    name: '解毒术',
    desc: '',
    cost: { mp: 5 },
    usableOutsideBattle: true,
    target: 'oneAlly',
    effects: [curesTier ? { kind: 'curePoison', curesTier } : { kind: 'curePoison' }],
    animation: { effectSprite: 0 },
  }
}

describe('G05 magic-menu-state 残差', () => {
  test('curePoison 缺 curesTier 走缺省 common：解 common 毒并扣 MP', () => {
    const w = makeTestWorld()
    const caster = w.party[0]!
    caster.poisons = [{ poisonId: 551, tickIndex: 0 }]
    expect(castOutdoorSkill(w, cureSkill(), 0, 0, poisonDefs)).toBe(true)
    expect(caster.poisons).toEqual([])
    expect(caster.mp).toBe(25) // 30 - 5：真实变化才吃消耗
  })

  test('curePoison 缺 curesTier 对 severe 毒：保留毒、零效果不扣 MP', () => {
    const w = makeTestWorld()
    const caster = w.party[0]!
    caster.poisons = [{ poisonId: 999, tickIndex: 0 }]
    expect(castOutdoorSkill(w, cureSkill(), 0, 0, poisonDefs)).toBe(false)
    expect(caster.poisons).toEqual([{ poisonId: 999, tickIndex: 0 }]) // severe 毒保留
    expect(caster.mp).toBe(30) // avoid over treatment 同门
  })

  test('单人队 magicMoveCaster：返回新对象、casterIdx 值不变', () => {
    const w = makeTestWorld()
    // 正控对照：单人队 openMagicMenu 直进 pick-spell（现行公开入口）。
    expect(openMagicMenu(w, makeTestSkills()).phase).toBe('pick-spell')
    const state = { ...closeMagicMenu(), active: true, phase: 'pick-caster' as const, casterIdx: 0 }
    const movedDown = magicMoveCaster(state, w, 'down')
    expect(movedDown).not.toBe(state) // 非空队臂：新对象
    expect(movedDown.casterIdx).toBe(0) // (0+1)%1 = 0：值不变
    expect(magicMoveCaster(state, w, 'up').casterIdx).toBe(0) // (0-1+1)%1 = 0
  })
})
