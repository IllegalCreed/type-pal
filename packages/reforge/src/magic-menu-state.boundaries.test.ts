/**
 * TEST-RUNTIME-STATE-BOUNDARIES-1 E1-E4（magic 侧）：仙术菜单导航/请求域（magic-menu-state.ts）。
 * magic-menu-state.test.ts:57-152 已覆盖 resolve 基础/开单/关单/光标循环/确认施法人/网格导航/
 * pick-target/连放/MP 不足/施放结算——不重复；本文件补混合 learnedSkills 过滤、真实导航跨
 * phase no-op、缺席 guard 与 E4 请求/扣费语义（world/技能定义不可被改）。不调用 castOutdoorSkill。
 */
import type { SkillData, SkillDataMap, WorldState } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { deepSnapshot } from './__tests__/glm-state-boundary-fixtures.js'
import {
  magicBackFromTarget,
  magicConfirmCaster,
  magicConfirmSpell,
  magicMoveCaster,
  magicMoveCursor,
  magicMoveTarget,
  openMagicMenu,
  resolveOutdoorSkills,
} from './magic-menu-state.js'
import { makeTestSkills, makeTestWorld } from './test-fixtures.js'

const skill = (id: string, over: Partial<SkillData> = {}): SkillData => ({
  id,
  name: `skill.${id}`,
  desc: '',
  cost: { mp: 5 },
  usableOutsideBattle: true,
  target: 'oneAlly',
  effects: [],
  animation: { effectSprite: 0 },
  ...over,
})

/** 双人队 + 混合 learnedSkills（合法 outdoor / 非 outdoor / 缺 id）。 */
function world(): WorldState {
  const w = makeTestWorld()
  w.party.push({ ...w.party[0]!, id: 'zhao-linger', template: 'zhao-linger' })
  w.learnedSkills['li-xiaoyao'] = ['296', 'missing', '900']
  w.learnedSkills['zhao-linger'] = ['298']
  return w
}

const skills = (): SkillDataMap => {
  const base = makeTestSkills()
  return {
    ...base,
    '900': skill('900', { usableOutsideBattle: false }),
  }
}

describe('E1 learnedSkills 混合过滤', () => {
  test('缺 id 与非 outdoor 剔除、保留序 = 作者声明序；world/skills 定义不变', () => {
    const w = world()
    const table = skills()
    const wSnapshot = deepSnapshot(w)
    const tableSnapshot = deepSnapshot(table)
    const resolved = resolveOutdoorSkills(w, 'li-xiaoyao', table)
    expect(resolved.map((s) => s.id)).toEqual(['296']) // missing 剔除、900 非 outdoor 剔除
    expect(resolveOutdoorSkills(w, 'zhao-linger', table).map((s) => s.id)).toEqual(['298'])
    expect(w).toEqual(wSnapshot)
    expect(table).toEqual(tableSnapshot)
  })
})

describe('E2 真实导航进入 phase 后其他 phase 操作 no-op', () => {
  test('经真实入口进 pick-spell：caster 导航不动；进 pick-target：网格导航不动、返回恢复', () => {
    const w = world()
    const table = skills()
    const entered = magicConfirmCaster(openMagicMenu(w, table, 0), w, table)
    expect(entered.phase).toBe('pick-spell')
    expect(magicMoveCaster(entered, w, 'down')).toBe(entered) // pick-spell 上 caster 导航 no-op
    // 单体技能 → pick-target（合同：magicConfirmSpell 原地改 entered 的 phase/targetIdx）
    const toTarget = magicConfirmSpell(entered, w)
    if (toTarget?.kind !== 'toTarget') throw new Error('296 单体应进选目标')
    expect(magicMoveCursor(entered, 'down')).toBe(entered) // pick-target 上网格导航 no-op
    const moved = magicMoveTarget(entered, w, 'down')
    expect(moved.targetIdx).toBe(1)
    const back = magicBackFromTarget(moved)
    expect(back.phase).toBe('pick-spell')
    // pick-caster 上 spell/target 操作同样 no-op（真实入口：多人队开单即 pick-caster）
    const atCaster = openMagicMenu(w, table, 0)
    expect(atCaster.phase).toBe('pick-caster')
    expect(magicMoveCursor(atCaster, 'down')).toBe(atCaster)
    expect(magicMoveTarget(atCaster, w, 'up')).toBe(atCaster)
    expect(magicBackFromTarget(atCaster)).toBe(atCaster)
  })
})

describe('E3 施法人缺席/死亡/无技能/缺选中技能 guard', () => {
  test('死人确认不动（同输入正控：活人进入 pick-spell）；空列表确认 null', () => {
    const w = world()
    const table = skills()
    const open = openMagicMenu(w, table, 1)
    w.party[1]!.hp = 0 // 死人
    expect(magicConfirmCaster(open, w, table)).toBe(open) // 不动
    // 同输入正控：活人确认进入并解析
    const alive = openMagicMenu(world(), table, 1)
    const confirmed = magicConfirmCaster(alive, world(), table)
    expect(confirmed.phase).toBe('pick-spell')
    expect(confirmed.spells.map((s) => s.id)).toEqual(['298'])
    // 空技能列表：确认 null（活着但无 outdoor 仙术仍可进菜单）
    const emptyWorld = world()
    emptyWorld.learnedSkills['zhao-linger'] = []
    const emptyMenu = magicConfirmCaster(openMagicMenu(emptyWorld, table, 1), emptyWorld, table)
    expect(emptyMenu.spells).toEqual([])
    expect(magicConfirmSpell(emptyMenu, emptyWorld)).toBeNull()
  })
})

describe('E4 请求/扣费语义（magicConfirmSpell 按合同原地改菜单 state）', () => {
  test('castAll 完整返回选中技能；toTarget 后 targetIdx 重置；MP 恰好足够通过、不足 null；world 不可被改', () => {
    const w = world()
    const table = skills()
    const tableAll = { ...table, '950': skill('950', { target: 'allAllies', cost: { mp: 30 } }) }
    w.learnedSkills['li-xiaoyao'] = ['296', '950']
    const entered = magicConfirmCaster(openMagicMenu(w, tableAll, 0), w, tableAll)
    // MP 门：296 花 6（fixtures demo mp 100 → 充足）
    const first = magicConfirmSpell(entered, w)
    expect(first?.kind).toBe('toTarget')
    expect(entered.phase).toBe('pick-target') // 合同：原地改菜单 state
    expect(entered.targetIdx).toBe(0) // 进选目标重置
    const back = magicBackFromTarget(entered)
    // castAll：直放返回完整技能对象、留在 pick-spell
    const grid = magicMoveCursor(back, 'down') // cursor 0→3（第二技能 950）
    const cast = magicConfirmSpell(grid, w)
    if (cast?.kind !== 'castAll') throw new Error('950 allAllies 应直放')
    expect(cast.skill.id).toBe('950')
    expect(grid.phase).toBe('pick-spell') // 直放留面板连放
    // MP 不足：null 且 state 不变（不进入 pick-target）
    w.party[0]!.mp = 4
    const poor = magicConfirmSpell({ ...back, cursor: 0 }, w)
    expect(poor).toBeNull()
    // 恰好足够：mp = cost 精确通过
    w.party[0]!.mp = 6
    expect(magicConfirmSpell({ ...back, cursor: 0 }, w)?.kind).toBe('toTarget')
    // world 的结构字段全程只被本测试显式改动（菜单 API 不写 world）
    expect(w.party).toHaveLength(2)
    expect(w.learnedSkills['li-xiaoyao']).toEqual(['296', '950'])
  })
})
