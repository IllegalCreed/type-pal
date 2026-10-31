import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  makeRequestRoles,
  requestMagics,
  requestSpells,
  restorativeMagics,
  restorativeRoles,
  restorativeSpells,
} from './__tests__/magic-menu-catalog.js'
import { makePickedSpellMenu, makeTargetMenu } from './__tests__/magic-menu-scenario.js'
import {
  cancelInGameMagic,
  confirmCaster,
  confirmSpell,
  confirmTarget,
  createInGameMagicMenu,
  refreshSpellMenu,
  rememberMagicCasterCursor,
} from './in-game-magic-menu.js'

beforeEach(() => rememberMagicCasterCursor(0))
afterEach(() => rememberMagicCasterCursor(0))

describe('Overworld magic requests', () => {
  it('Confirm single-target spell(气疗术)→ phase=pick-target,返回 sel', () => {
    const menu = makePickedSpellMenu()
    menu.spellMenu!.cursor = 0 // 气疗术 ObjectID296
    const request = confirmSpell(menu, restorativeSpells, restorativeMagics)
    expect(request).toEqual({ spellId: 296, casterId: 0, applyToAll: false, costMP: 6 })
    expect(menu.phase).toBe('pick-target')
    expect(menu.targetCursor).toBe(0)
    expect(menu.selectedSpellId).toBe(296)
  })

  it('Confirm applyToAll spell(灵儿的五气朝元)→ phase 留 pick-spell,sel.applyToAll=true', () => {
    const menu = createInGameMagicMenu(restorativeRoles, [0, 1, 2], restorativeSpells)
    menu.casterMenu.cursor = 1 // 灵儿
    confirmCaster(menu, restorativeRoles, restorativeSpells, restorativeMagics)
    // 本目录给灵儿296/299/300；五气朝元的ObjectID为299
    const groupSpellIndex = menu.spellMenu!.items.findIndex((i) => i.id === 299)
    expect(groupSpellIndex).toBeGreaterThanOrEqual(0)
    menu.spellMenu!.cursor = groupSpellIndex
    const request = confirmSpell(menu, restorativeSpells, restorativeMagics)
    expect(request?.applyToAll).toBe(true)
    expect(request?.costMP).toBe(40)
    expect(menu.phase).toBe('pick-spell') // 留 pick-spell;dispatcher 自己跑 script
  })

  it('重建缺失法术列表后，MP不足的法术不可确认', () => {
    const menu = makePickedSpellMenu()
    // 李逍遥 MP=80;气疗术 MP 6 ✓;凝神 MP 8 ✓;观音 MP 10 ✓ — 让其中一个超 MP
    // 改 MAGICS:凝神 100 MP → 超 80 disabled
    const expensiveMagics = restorativeMagics.map((m) => (m.id === 34 ? { ...m, costMP: 100 } : m))
    menu.spellMenu = undefined
    // re-build with overpriced
    refreshSpellMenu(menu, restorativeRoles, restorativeSpells, expensiveMagics, 80)
    // 找凝神归元(ObjectID298)idx
    const healingSpellIndex = menu.spellMenu!.items.findIndex((i) => i.id === 298)
    expect(healingSpellIndex).toBeGreaterThanOrEqual(0)
    expect(menu.spellMenu!.items[healingSpellIndex]?.disabled).toBe(true)
    menu.spellMenu!.cursor = healingSpellIndex
    const request = confirmSpell(menu, restorativeSpells, expensiveMagics)
    expect(request).toBeNull()
  })

  it('返回 {spellId, casterId, targetRoleId, costMP}', () => {
    const menu = makeTargetMenu()
    menu.targetCursor = 1 // 灵儿
    const request = confirmTarget(menu, restorativeSpells, restorativeMagics)
    expect(request).toEqual({ spellId: 296, casterId: 0, targetRoleId: 1, costMP: 6 })
  })

  it('phase!=pick-target → 返回 null', () => {
    const menu = createInGameMagicMenu(restorativeRoles, [0, 1, 2], restorativeSpells)
    expect(confirmTarget(menu, restorativeSpells, restorativeMagics)).toBeNull()
  })

  it('单人队直进 pick-spell；applyToAll 留相/单体切 pick-target；非顺序 party 返回 roleId', () => {
    const state = createInGameMagicMenu(makeRequestRoles(), [2], requestSpells, requestMagics)
    expect(state.phase).toBe('pick-spell')
    expect(state.selectedCasterId).toBe(2)
    state.spellMenu!.cursor = 0 // 300 全体甲
    expect(confirmSpell(state, requestSpells, requestMagics)).toEqual({
      spellId: 300,
      casterId: 2,
      applyToAll: true,
      costMP: 4,
    })
    expect(state.phase).toBe('pick-spell') // 全体留相
    state.spellMenu!.cursor = 1 // 301 单体乙（mp 6 < 9 → disabled → null）
    expect(confirmSpell(state, requestSpells, requestMagics)).toBeNull()
    // 换满 MP 施法人（role 0 mp20）重建
    const fundedCasterMenu = createInGameMagicMenu(
      makeRequestRoles(),
      [0],
      requestSpells,
      requestMagics,
    )
    fundedCasterMenu.spellMenu!.cursor = 1
    expect(confirmSpell(fundedCasterMenu, requestSpells, requestMagics)).toEqual({
      spellId: 301,
      casterId: 0,
      applyToAll: false,
      costMP: 9,
    })
    expect(fundedCasterMenu.phase).toBe('pick-target')
    expect(confirmTarget(fundedCasterMenu, requestSpells, requestMagics)).toEqual({
      spellId: 301,
      casterId: 0,
      targetRoleId: 0, // 单人队 target 即唯一队员
      costMP: 9,
    })
  })

  it('非顺序 party 双人 target roleId 非 cursor；错 phase 零请求；refresh cursor 落回上次 spell', () => {
    const state = createInGameMagicMenu(makeRequestRoles(), [2, 0], requestSpells, requestMagics)
    expect(state.phase).toBe('pick-caster')
    expect(confirmSpell(state, requestSpells, requestMagics)).toBeNull() // 错 phase
    expect(confirmTarget(state, requestSpells, requestMagics)).toBeNull()
    // 真实路由推进：选第二位施法人（roleId 0）→ 其法术列表选 301
    state.casterMenu.cursor = 1
    confirmCaster(state, makeRequestRoles(), requestSpells, requestMagics)
    expect(state.selectedCasterId).toBe(0)
    state.spellMenu!.cursor = 1
    expect(confirmSpell(state, requestSpells, requestMagics)!.applyToAll).toBe(false)
    state.targetCursor = 1 // party=[2,0] 第二位 = roleId 0
    expect(confirmTarget(state, requestSpells, requestMagics)).toEqual({
      spellId: 301,
      casterId: 0,
      targetRoleId: 0,
      costMP: 9,
    })
    // 错 phase：done 无请求
    state.phase = 'done'
    expect(confirmSpell(state, requestSpells, requestMagics)).toBeNull()
    // refresh：pick-spell 相位 + selectedSpellId 落回
    state.phase = 'pick-spell'
    state.selectedSpellId = 301
    refreshSpellMenu(state, makeRequestRoles(), requestSpells, requestMagics, 20)
    expect(state.spellMenu!.items[state.spellMenu!.cursor]?.id).toBe(301)
    // pick-target 取消回 pick-spell
    state.phase = 'pick-target'
    cancelInGameMagic(state)
    expect(state.phase).toBe('pick-spell')
  })
})
