/**
 * TEST-GLM-PHASE1-LEAVES-3 L10（draw-magic.ts）— 去重表：
 *  - draw-magic.test（pick-spell 说明/WIN95 MP 布局）→ 不重复
 *  - grok-present P06（施法人 HP/仙术页 MP 够与不够色/翻页/目标光标/输入快照）→ 不重复
 *  - 新差异：选中+禁用 0x1C（施法人死亡被选中、法术 MP 不足被选中——预置 disabled 着色，
 *    不冒称 MP 可用性判定已执行）、空法术表只画框+MP needed 0、spell 不在 catalog 时 label
 *    回退 menu item（不冒称执行了施法人名回退）。
 */
import type { Magic, Spell } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import {
  fixtureGlyphs,
  freezeNow,
  makeRoles as makeBaseRoles,
  makeUiFrames,
  newFb,
  pixel,
  textDot,
} from '../../__tests__/glm-phase1-leaves/present-fixtures.js'
import { createInitialGameState, hydratePlayerRolesRuntime } from '../../core/game-state.js'
import { magicWithCost } from '../../core/menu/__tests__/magic-cost-fixture.js'
import type { InGameMagicMenuState } from '../../core/menu/in-game-magic-menu.js'
import { createInGameMagicMenu } from '../../core/menu/in-game-magic-menu.js'
import {
  MENUITEM_COLOR_INACTIVE,
  MENUITEM_COLOR_SELECTED_INACTIVE,
} from '../../core/menu/inventory-menu.js'
import { drawInGameMagicMenu } from './draw-magic.js'

const glyphs = fixtureGlyphs

function makeRoles(): ReturnType<typeof makeBaseRoles> {
  const roles = makeBaseRoles()
  for (const role of roles.roles) role.mp = 20
  return roles
}

function runtimeState(roles: ReturnType<typeof makeRoles>, party = [0, 1]) {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  gs.partyMembers = [...party]
  hydratePlayerRolesRuntime(gs.PlayerRolesRuntime, roles)
  return gs
}

function mkSpell(id: number, magicNumber: number, name: string | undefined): Spell {
  return {
    id,
    magicNumber,
    scriptOnSuccess: 0,
    scriptOnUse: 0,
    scriptDesc: 0,
    flags: {
      usableOutsideBattle: true,
      usableInBattle: true,
      usableToEnemy: false,
      applyToAll: false,
    },
    _name: name,
  }
}

const SPELLS: Spell[] = [mkSpell(300, 1, '甲'), mkSpell(301, 2, '乙')]
const MAGICS: Magic[] = [magicWithCost(1, 0), magicWithCost(2, 999)]

function rolesWithDead(): ReturnType<typeof makeRoles> {
  const roles = makeRoles()
  roles.roles[1]!.hp = 0 // 乙 死亡 → caster disabled
  return roles
}

function pickCasterState(): { state: InGameMagicMenuState; roles: ReturnType<typeof makeRoles> } {
  const roles = makeRoles()
  roles.roles[0]!.magic = [300, 301]
  const state = createInGameMagicMenu(roles, [0, 1], SPELLS, MAGICS)
  return { state, roles }
}

describe('L10 drawInGameMagicMenu 剩余分支', () => {
  it('pick-caster：死亡施法人未选中 0x18、被选中 0x1C；活人选中 0xF9', () => {
    const roles = rolesWithDead()
    const state = createInGameMagicMenu(roles, [0, 1], SPELLS, MAGICS)
    const gs = runtimeState(roles)
    gs.PlayerRolesRuntime.rgwHP[0] = 41
    gs.PlayerRolesRuntime.rgwMaxHP[0] = 58
    gs.PlayerRolesRuntime.rgwMP[0] = 12
    gs.PlayerRolesRuntime.rgwMaxMP[0] = 34
    gs.PlayerRolesRuntime.rgwHP[1] = 0
    gs.PlayerRolesRuntime.rgwMaxHP[1] = 90
    gs.PlayerRolesRuntime.rgwMP[1] = 25
    gs.PlayerRolesRuntime.rgwMaxMP[1] = 66

    // cursor 0（活人甲选中）→ 甲 0xF9，死亡乙 0x18
    const fb1 = newFb()
    const restore1 = freezeNow(0)
    try {
      drawInGameMagicMenu({
        fb: fb1,
        state,
        gs,
        playerRoles: roles,
        spells: SPELLS,
        magics: MAGICS,
        uiSpriteFrames: makeUiFrames(),
        glyphs,
      })
    } finally {
      restore1()
    }
    const jiaDot = textDot('甲', 0, 48, 75)
    const yiDot = textDot('乙', 0, 48, 93)
    expect(pixel(fb1, jiaDot.x, jiaDot.y)).toBe(0xf9)
    expect(pixel(fb1, yiDot.x, yiDot.y)).toBe(MENUITEM_COLOR_INACTIVE)

    // cursor 1（死亡乙被选中）→ 0x1C
    state.casterMenu.cursor = 1
    const fb2 = newFb()
    const restore2 = freezeNow(0)
    try {
      drawInGameMagicMenu({
        fb: fb2,
        state,
        gs,
        playerRoles: roles,
        spells: SPELLS,
        magics: MAGICS,
        uiSpriteFrames: makeUiFrames(),
        glyphs,
      })
    } finally {
      restore2()
    }
    expect(pixel(fb2, yiDot.x, yiDot.y)).toBe(MENUITEM_COLOR_SELECTED_INACTIVE)
  })

  it('pick-spell：选中+MP不足 0x1C（预置 disabled 着色，不证明判定已执行）', () => {
    const { state, roles } = pickCasterState()
    state.casterMenu.cursor = 0
    state.phase = 'pick-spell'
    state.selectedCasterId = 0
    const gs = runtimeState(roles)
    gs.PlayerRolesRuntime.rgwMP[0] = 5 // 乙(999) 不可用
    // 手工建 spellMenu（同 buildSpellMenu 结果：法术升序 300,301，301 disabled）；cursor 0
    state.spellMenu = {
      items: [
        { id: 300, label: '甲', rightText: 'MP 0', disabled: false },
        { id: 301, label: '乙', rightText: 'MP 999', disabled: true },
      ],
      cursor: 0,
      pageSize: 15,
      pageOffset: 0,
    }
    const fb = newFb()
    const restore = freezeNow(0)
    try {
      drawInGameMagicMenu({
        fb,
        state,
        gs,
        playerRoles: roles,
        spells: SPELLS,
        magics: MAGICS,
        uiSpriteFrames: makeUiFrames(),
        glyphs,
      })
    } finally {
      restore()
    }
    // grid 第一格 (35,54)=甲 选中 0xF9；第二格 (35+87,54)=乙 0x18（未选中禁用）
    const jiaDot = textDot('甲', 0, 35, 54)
    expect(pixel(fb, jiaDot.x, jiaDot.y)).toBe(0xf9)
    const yiDot = textDot('乙', 0, 35 + 87, 54)
    expect(pixel(fb, yiDot.x, yiDot.y)).toBe(MENUITEM_COLOR_INACTIVE)

    // 光标移到禁用乙 → 0x1C
    state.spellMenu.cursor = 1
    const fb2 = newFb()
    const restore2 = freezeNow(0)
    try {
      drawInGameMagicMenu({
        fb: fb2,
        state,
        gs,
        playerRoles: roles,
        spells: SPELLS,
        magics: MAGICS,
        uiSpriteFrames: makeUiFrames(),
        glyphs,
      })
    } finally {
      restore2()
    }
    expect(pixel(fb2, yiDot.x, yiDot.y)).toBe(MENUITEM_COLOR_SELECTED_INACTIVE)
  })

  it('空法术表：只画 grid 框，不画条目不抛错；MP 框 needed 0', () => {
    const roles = makeRoles()
    const state = createInGameMagicMenu(roles, [0], SPELLS, MAGICS)
    state.spellMenu = { items: [], cursor: 0, pageSize: 15, pageOffset: 0 }
    state.phase = 'pick-spell'
    state.selectedCasterId = 0
    const gs = runtimeState(roles, [0])
    gs.PlayerRolesRuntime.rgwMP[0] = 7
    const fb = newFb()
    const restore = freezeNow(0)
    try {
      drawInGameMagicMenu({
        fb,
        state,
        gs,
        playerRoles: roles,
        spells: SPELLS,
        magics: MAGICS,
        uiSpriteFrames: makeUiFrames(),
        glyphs,
      })
    } finally {
      restore()
    }
    expect(pixel(fb, 20, 50)).toBe(0x22) // style1 grid 框内部
    // MP needed = cursor 空表 → sel undefined → 0：个位黄 0 在 rightDigitX(15,4,0)=33
    expect(pixel(fb, 33, 14)).toBe(0xb0)
    // current MP 7 → cyan 7 个位在 rightDigitX(50,4,0)=68
    expect(pixel(fb, 68, 14)).toBe(0x77)
  })

  it('spell 不在 catalog：grid 使用 menu item 的完整 label', () => {
    const roles = makeRoles()
    const state = createInGameMagicMenu(roles, [0, 1], SPELLS, MAGICS)
    // spell 301 不在传入 catalog，第二个字仍须来自完整的 item.label。
    state.casterMenu.cursor = 0
    state.phase = 'pick-spell'
    state.selectedCasterId = 0
    state.spellMenu = {
      items: [{ id: 301, label: '乙乙', rightText: '', disabled: false }],
      cursor: 0,
      pageSize: 15,
      pageOffset: 0,
    }
    const gs = runtimeState(roles)
    const fb = newFb()
    const restore = freezeNow(0)
    try {
      drawInGameMagicMenu({
        fb,
        state,
        gs,
        playerRoles: roles,
        spells: [], // 301 不在 catalog → find undefined → label 回退
        magics: MAGICS,
        uiSpriteFrames: makeUiFrames(),
        glyphs,
      })
    } finally {
      restore()
    }
    const yiDot = textDot('乙乙', 1, 35, 54) // item.label 第 1 字
    expect(pixel(fb, yiDot.x, yiDot.y)).toBe(0xf9)
  })
})
