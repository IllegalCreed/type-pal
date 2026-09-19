/**
 * TEST-GAME-MENU-BOUNDARIES-1 G05：in-game-magic-menu 状态机意图（in-game-magic-menu.ts）。
 * 既有 in-game-magic-menu.test 已覆盖选人/死人/载荷/取消/导航/刷新主干——不重复。
 * 本文件：单人队直进 pick-spell、confirmSpell applyToAll 分相、非顺序 party target roleId、
 * 错 phase 零请求、refresh 后 cursor 落回上次 spell。
 */
import type { Magic, PlayerRoles, Spell } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import {
  cancelInGameMagic,
  confirmCaster,
  confirmSpell,
  confirmTarget,
  createInGameMagicMenu,
  refreshSpellMenu,
} from './in-game-magic-menu.js'

const magics: Magic[] = [
  { id: 1, costMP: 4 } as unknown as Magic,
  { id: 2, costMP: 9 } as unknown as Magic,
]
const spells: Spell[] = [
  {
    id: 300,
    magicNumber: 1,
    flags: { usableOutsideBattle: true, applyToAll: true },
    _name: '全体甲',
  } as unknown as Spell,
  {
    id: 301,
    magicNumber: 2,
    flags: { usableOutsideBattle: true, applyToAll: false },
    _name: '单体乙',
  } as unknown as Spell,
]

function roles(): PlayerRoles {
  return {
    roles: {
      0: { id: 0, hp: 100, mp: 20, magic: [300, 301] },
      2: { id: 2, hp: 100, mp: 6, magic: [300, 301] }, // 300(cost4)可用；301(cost9)MP 不足
    },
  } as unknown as PlayerRoles
}

describe('G05 in-game-magic-menu 状态机', () => {
  it('单人队直进 pick-spell；applyToAll 留相/单体切 pick-target；非顺序 party 返回 roleId', () => {
    const state = createInGameMagicMenu(roles(), [2], spells, magics)
    expect(state.phase).toBe('pick-spell')
    expect(state.selectedCasterId).toBe(2)
    state.spellMenu!.cursor = 0 // 300 全体甲
    expect(confirmSpell(state, spells, magics)).toEqual({
      spellId: 300,
      casterId: 2,
      applyToAll: true,
      costMP: 4,
    })
    expect(state.phase).toBe('pick-spell') // 全体留相
    state.spellMenu!.cursor = 1 // 301 单体乙（mp 6 < 9 → disabled → null）
    expect(confirmSpell(state, spells, magics)).toBeNull()
    // 换满 MP 施法人（role 0 mp20）重建
    const strong = createInGameMagicMenu(roles(), [0], spells, magics)
    strong.spellMenu!.cursor = 1
    expect(confirmSpell(strong, spells, magics)).toEqual({
      spellId: 301,
      casterId: 0,
      applyToAll: false,
      costMP: 9,
    })
    expect(strong.phase).toBe('pick-target')
    expect(confirmTarget(strong, spells, magics)).toEqual({
      spellId: 301,
      casterId: 0,
      targetRoleId: 0, // 单人队 target 即唯一队员
      costMP: 9,
    })
  })
  it('非顺序 party 双人 target roleId 非 cursor；错 phase 零请求；refresh cursor 落回上次 spell', () => {
    const state = createInGameMagicMenu(roles(), [2, 0], spells, magics)
    expect(state.phase).toBe('pick-caster')
    expect(confirmSpell(state, spells, magics)).toBeNull() // 错 phase
    expect(confirmTarget(state, spells, magics)).toBeNull()
    // 真实路由推进：选第二位施法人（roleId 0）→ 其法术列表选 301
    state.casterMenu.cursor = 1
    confirmCaster(state, roles(), spells, magics)
    expect(state.selectedCasterId).toBe(0)
    state.spellMenu!.cursor = 1
    expect(confirmSpell(state, spells, magics)!.applyToAll).toBe(false)
    state.targetCursor = 1 // party=[2,0] 第二位 = roleId 0
    expect(confirmTarget(state, spells, magics)).toEqual({
      spellId: 301,
      casterId: 0,
      targetRoleId: 0,
      costMP: 9,
    })
    // 错 phase：done 无请求
    state.phase = 'done'
    expect(confirmSpell(state, spells, magics)).toBeNull()
    // refresh：pick-spell 相位 + selectedSpellId 落回
    state.phase = 'pick-spell'
    state.selectedSpellId = 301
    refreshSpellMenu(state, roles(), spells, magics, 20)
    expect(state.spellMenu!.cursor).toBe(
      state.spellMenu!.items.findIndex((entry) => entry.id === 301),
    )
    // pick-target 取消回 pick-spell
    state.phase = 'pick-target'
    cancelInGameMagic(state)
    expect(state.phase).toBe('pick-spell')
  })
})
