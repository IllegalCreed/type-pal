import type { Magic, Spell } from '@type-pal/shared'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { freezeMenuClock } from '../../__tests__/menu-clock-fixture.js'
import { beginChineseMenuText } from '../../__tests__/menu-text-fixture.js'
import { projectRuntimeToBattleRoles } from '../../core/game-state.js'
import {
  createInGameMagicMenu,
  type InGameMagicMenuState,
} from '../../core/menu/in-game-magic-menu.js'
import {
  MENUITEM_COLOR,
  MENUITEM_COLOR_INACTIVE,
  MENUITEM_COLOR_SELECTED_FIRST,
  MENUITEM_COLOR_SELECTED_INACTIVE,
} from '../../core/menu/inventory-menu.js'
import { fixtureGlyphs, textDot } from '../__tests__/glyph-fixtures.js'
import {
  createHydratedUniformState,
  menuMagic,
  menuSpell,
  uniformCasterRoles,
  uniformMagics,
  uniformSpells,
} from '../__tests__/magic-menu-fixtures.js'
import { freezeNow, makeGs, makeLiveScene, makeRoles } from '../__tests__/menu-state-fixtures.js'
import {
  BOX_STYLE0,
  cyanDigit,
  INFOBOX_ID,
  makeUiFrames,
  rightDigitX,
  uiFramesWithoutSlot,
  yellowDigit,
} from '../__tests__/menu-ui-fixtures.js'
import { fillSentinel, pixel, SENTINEL, sentinelFramebuffer } from '../__tests__/raster-fixtures.js'
import { cloneInputs } from '../__tests__/render-input-snapshots.js'
import { uniformDotGlyphs, uniformTextDot } from '../__tests__/uniform-glyphs.js'
import { createFramebuffer } from '../framebuffer.js'
import { drawInGameMagicMenu } from './draw-magic.js'

const uniformGlyphs = uniformDotGlyphs()

const positionGlyphs = fixtureGlyphs()

const FACE_4 = 0xa4

function rolesWithDeadCaster(): ReturnType<typeof uniformCasterRoles> {
  const roles = uniformCasterRoles()
  roles.roles[1]!.hp = 0 // 乙 死亡 → caster disabled
  return roles
}

function casterSnapshot(party: number[]): InGameMagicMenuState {
  return {
    phase: 'pick-caster',
    casterMenu: {
      items: party.map((id) => ({ id, label: '甲', disabled: false })),
      cursor: 0,
      pageSize: 4,
      pageOffset: 0,
    },
    targetCursor: 0,
    partyMembers: [...party],
  }
}

let restoreMenuText: () => void

beforeEach(() => {
  restoreMenuText = beginChineseMenuText()
})

afterEach(() => {
  restoreMenuText()
})

describe('Magic caster and role info', () => {
  it('pick-caster：死亡施法人未选中 0x18、被选中 0x1C；活人选中 0xF9', () => {
    const roles = rolesWithDeadCaster()
    const state = createInGameMagicMenu(roles, [0, 1], uniformSpells, uniformMagics)
    const gs = createHydratedUniformState(roles)
    gs.PlayerRolesRuntime.rgwHP[0] = 41
    gs.PlayerRolesRuntime.rgwMaxHP[0] = 58
    gs.PlayerRolesRuntime.rgwMP[0] = 12
    gs.PlayerRolesRuntime.rgwMaxMP[0] = 34
    gs.PlayerRolesRuntime.rgwHP[1] = 0
    gs.PlayerRolesRuntime.rgwMaxHP[1] = 90
    gs.PlayerRolesRuntime.rgwMP[1] = 25
    gs.PlayerRolesRuntime.rgwMaxMP[1] = 66

    // cursor 0（活人甲选中）→ 甲 0xF9，死亡乙 0x18
    const fb1 = sentinelFramebuffer()
    const restore1 = freezeMenuClock(0)
    try {
      drawInGameMagicMenu({
        fb: fb1,
        state,
        gs,
        playerRoles: roles,
        spells: uniformSpells,
        magics: uniformMagics,
        uiSpriteFrames: makeUiFrames(),
        glyphs: uniformGlyphs,
      })
    } finally {
      restore1()
    }
    const jiaDot = uniformTextDot(0, 48, 75)
    const yiDot = uniformTextDot(0, 48, 93)
    expect(pixel(fb1, jiaDot.x, jiaDot.y)).toBe(0xf9)
    expect(pixel(fb1, yiDot.x, yiDot.y)).toBe(MENUITEM_COLOR_INACTIVE)

    // cursor 1（死亡乙被选中）→ 0x1C
    state.casterMenu.cursor = 1
    const fb2 = sentinelFramebuffer()
    const restore2 = freezeMenuClock(0)
    try {
      drawInGameMagicMenu({
        fb: fb2,
        state,
        gs,
        playerRoles: roles,
        spells: uniformSpells,
        magics: uniformMagics,
        uiSpriteFrames: makeUiFrames(),
        glyphs: uniformGlyphs,
      })
    } finally {
      restore2()
    }
    expect(pixel(fb2, yiDot.x, yiDot.y)).toBe(MENUITEM_COLOR_SELECTED_INACTIVE)
  })

  it('G07-A01 防御性单人选人快照仍画一行内容框，底边在 y=78', () => {
    const { gs, roles } = makeLiveScene([4])
    const state = casterSnapshot([4])
    const frames = makeUiFrames()
    const spells: Spell[] = []
    const magics: Magic[] = []
    const fb = createFramebuffer()
    fillSentinel(fb)
    const before = cloneInputs({ gs, menu: state, roles, frames, spells, magics })
    const restore = freezeNow(0)
    try {
      drawInGameMagicMenu({
        fb,
        state,
        gs,
        playerRoles: roles,
        spells,
        magics,
        uiSpriteFrames: frames,
        glyphs: positionGlyphs,
      })
    } finally {
      restore()
    }
    const name = textDot('戊', 0, 48, 75)
    expect(pixel(fb, 35, 78)).toBe(BOX_STYLE0)
    expect(pixel(fb, 35, 86)).toBe(SENTINEL)
    expect(pixel(fb, name.x, name.y)).toBe(MENUITEM_COLOR_SELECTED_FIRST)
    expect(cloneInputs({ gs, menu: state, roles, frames, spells, magics })).toEqual(before)
  })

  it('G07-A03 缺少头像帧时头像位保持底色，体力个位仍画出', () => {
    const { gs, roles } = makeLiveScene([4, 1])
    gs.PlayerRolesRuntime.rgwHP[4] = 12
    const state = casterSnapshot([4, 1])
    const frames = uiFramesWithoutSlot(52)
    const fb = createFramebuffer()
    fillSentinel(fb)
    const restore = freezeNow(0)
    try {
      drawInGameMagicMenu({
        fb,
        state,
        gs,
        playerRoles: roles,
        spells: [],
        magics: [],
        uiSpriteFrames: frames,
        glyphs: positionGlyphs,
      })
    } finally {
      restore()
    }
    expect(pixel(fb, 43, 161)).toBe(SENTINEL)
    expect(pixel(fb, rightDigitX(71, 4, 0), 170)).toBe(yellowDigit(2))
  })

  it('G07-A04 缺少斜杠帧时斜杠位保持底色，体力个位仍画出', () => {
    const { gs, roles } = makeLiveScene([4, 1])
    gs.PlayerRolesRuntime.rgwHP[4] = 12
    const state = casterSnapshot([4, 1])
    const frames = uiFramesWithoutSlot(39)
    const fb = createFramebuffer()
    fillSentinel(fb)
    const restore = freezeNow(0)
    try {
      drawInGameMagicMenu({
        fb,
        state,
        gs,
        playerRoles: roles,
        spells: [],
        magics: [],
        uiSpriteFrames: frames,
        glyphs: positionGlyphs,
      })
    } finally {
      restore()
    }
    expect(pixel(fb, 94, 171)).toBe(SENTINEL)

    expect(pixel(fb, rightDigitX(71, 4, 0), 170)).toBe(yellowDigit(2))
  })

  it('G07-A10 信息框真气读运行时 12，不读角色静态真气 99', () => {
    const { gs, roles } = makeLiveScene([4, 1])
    const role = roles.roles[4]
    if (!role) throw new Error('role missing')
    role.mp = 99
    gs.PlayerRolesRuntime.rgwMP[4] = 12
    const state = casterSnapshot([4, 1])
    const frames = makeUiFrames()
    const fb = createFramebuffer()
    fillSentinel(fb)
    const before = cloneInputs({ gs, menu: state, roles, frames, spells: [], magics: [] })
    const restore = freezeNow(0)
    try {
      drawInGameMagicMenu({
        fb,
        state,
        gs,
        playerRoles: roles,
        spells: [],
        magics: [],
        uiSpriteFrames: frames,
        glyphs: positionGlyphs,
      })
    } finally {
      restore()
    }
    expect(pixel(fb, rightDigitX(71, 4, 0), 186)).toBe(cyanDigit(2))
    expect(pixel(fb, rightDigitX(71, 4, 1), 186)).toBe(cyanDigit(1))

    expect(cloneInputs({ gs, menu: state, roles, frames, spells: [], magics: [] })).toEqual(before)
  })

  it('G07-A11 体力上限 80 画在 y=173，当前体力 12 仍在 y=170', () => {
    const { gs, roles } = makeLiveScene([4, 1])
    gs.PlayerRolesRuntime.rgwHP[4] = 12
    gs.PlayerRolesRuntime.rgwMaxHP[4] = 80
    const state = casterSnapshot([4, 1])
    const frames = makeUiFrames()
    const fb = createFramebuffer()
    fillSentinel(fb)
    const restore = freezeNow(0)
    try {
      drawInGameMagicMenu({
        fb,
        state,
        gs,
        playerRoles: roles,
        spells: [],
        magics: [],
        uiSpriteFrames: frames,
        glyphs: positionGlyphs,
      })
    } finally {
      restore()
    }
    expect(pixel(fb, rightDigitX(92, 4, 1), 173)).toBe(yellowDigit(8))
    expect(pixel(fb, rightDigitX(92, 4, 0), 173)).toBe(yellowDigit(0))
    expect(pixel(fb, rightDigitX(71, 4, 0), 170)).toBe(yellowDigit(2))
  })

  it('G07-A13 头像落在信息框左上外侧，信息框本体仍在 (45,165)', () => {
    const { gs, roles } = makeLiveScene([4, 1])
    const state = casterSnapshot([4, 1])
    const frames = makeUiFrames()
    const fb = createFramebuffer()
    fillSentinel(fb)
    const restore = freezeNow(0)
    try {
      drawInGameMagicMenu({
        fb,
        state,
        gs,
        playerRoles: roles,
        spells: [],
        magics: [],
        uiSpriteFrames: frames,
        glyphs: positionGlyphs,
      })
    } finally {
      restore()
    }
    expect(pixel(fb, 43, 161)).toBe(FACE_4)
    expect(pixel(fb, 44, 161)).toBe(SENTINEL)
    expect(pixel(fb, 45, 165)).toBe(INFOBOX_ID)
  })

  it('G07-A14 选人阶段不画仙术格子，体力个位仍画出', () => {
    const { gs, roles } = makeLiveScene([4, 1])
    gs.PlayerRolesRuntime.rgwHP[4] = 12
    const state = casterSnapshot([4, 1])
    const frames = makeUiFrames()
    const fb = createFramebuffer()
    fillSentinel(fb)
    const restore = freezeNow(0)
    try {
      drawInGameMagicMenu({
        fb,
        state,
        gs,
        playerRoles: roles,
        spells: [menuSpell(300, '甲', 1)],
        magics: [menuMagic(1, 1)],
        uiSpriteFrames: frames,
        glyphs: positionGlyphs,
      })
    } finally {
      restore()
    }
    expect(pixel(fb, 10, 42)).toBe(SENTINEL)
    expect(pixel(fb, rightDigitX(71, 4, 0), 170)).toBe(yellowDigit(2))
  })

  it('P06 施法者阶段按队伍顺序画两人不同HP', () => {
    const gs = makeGs()
    const roles = makeRoles()
    gs.partyMembers = [4, 1]
    gs.PlayerRolesRuntime.rgwHP[4] = 12
    gs.PlayerRolesRuntime.rgwHP[1] = 34
    const viewed = projectRuntimeToBattleRoles(gs.PlayerRolesRuntime, roles)
    const menu = createInGameMagicMenu(viewed, gs.partyMembers, [])
    expect(menu.phase).toBe('pick-caster')
    expect(viewed.roles[4]?.hp).toBe(12)
    const frames = makeUiFrames()
    const fb = createFramebuffer()
    fillSentinel(fb)
    const inputs = { gs, menu, items: [], roles: viewed, frames, spells: [], magics: [] }
    const before = cloneInputs(inputs)
    const restore = freezeNow(0)
    try {
      drawInGameMagicMenu({
        fb,
        state: menu,
        gs,
        playerRoles: viewed,
        spells: [],
        magics: [],
        uiSpriteFrames: frames,
        glyphs: positionGlyphs,
      })
    } finally {
      restore()
    }
    expect(cloneInputs(inputs)).toEqual(before)
    expect(pixel(fb, textDot('戊', 0, 48, 75).x, textDot('戊', 0, 48, 75).y)).toBe(
      MENUITEM_COLOR_SELECTED_FIRST,
    )
    expect(pixel(fb, textDot('乙', 0, 48, 93).x, textDot('乙', 0, 48, 93).y)).toBe(MENUITEM_COLOR)
    expect(pixel(fb, textDot('乙', 0, 48, 75).x, textDot('乙', 0, 48, 75).y)).not.toBe(
      MENUITEM_COLOR_SELECTED_FIRST,
    )
    expect(pixel(fb, rightDigitX(71, 4, 0), 170)).toBe(yellowDigit(2))
    expect(pixel(fb, rightDigitX(71, 4, 1), 170)).toBe(yellowDigit(1))
    expect(pixel(fb, rightDigitX(149, 4, 0), 170)).toBe(yellowDigit(4))
    expect(pixel(fb, rightDigitX(149, 4, 1), 170)).toBe(yellowDigit(3))
  })
})
