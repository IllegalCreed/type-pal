import type { Command, Magic, Spell } from '@type-pal/shared'
import { afterEach, describe, expect, it } from 'vitest'
import { setGlobalEvents } from '../../../../packages/game/src/core/event-system.js'
import {
  confirmCaster,
  confirmSpell,
  createInGameMagicMenu,
  inGameMagicMoveDown,
  inGameMagicPageDown,
} from '../../../../packages/game/src/core/menu/in-game-magic-menu.js'
import {
  MENUITEM_COLOR,
  MENUITEM_COLOR_INACTIVE,
  MENUITEM_COLOR_SELECTED_FIRST,
} from '../../../../packages/game/src/core/menu/inventory-menu.js'
import { createFramebuffer } from '../../../../packages/game/src/present/framebuffer.js'
import { drawInGameMagicMenu } from '../../../../packages/game/src/present/menu/draw-magic.js'
import { fixtureGlyphs, textDot } from '../fixtures/font.js'
import {
  CURSOR_UP_ID,
  cyanDigit,
  fillSentinel,
  makeUiFrames,
  pixel,
  rightDigitX,
  SENTINEL,
  yellowDigit,
} from '../fixtures/images.js'
import {
  cloneInputs,
  freezeNow,
  makeGs,
  makeRoles,
  resetHostSingletons,
} from '../fixtures/world.js'

const glyphs = fixtureGlyphs()
const NAMES = [...'甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳']

afterEach(() => {
  resetHostSingletons()
})

function makeMagic(id: number, costMP: number): Magic {
  return {
    id,
    effect: 0,
    type: 'applyToPlayer',
    xOffset: 0,
    yOffset: 0,
    special: 0,
    speed: 0,
    keepEffect: 0,
    fireDelay: 0,
    effectTimes: 0,
    shake: 0,
    wave: 0,
    unknown: 0,
    costMP,
    baseDamage: 0,
    elemental: 0,
    sound: 0,
  }
}

function makeSpell(id: number, name: string, magicNumber: number, scriptDesc = 0): Spell {
  return {
    id,
    _name: name,
    magicNumber,
    scriptOnSuccess: 0,
    scriptOnUse: 0,
    scriptDesc,
    flags: {
      usableOutsideBattle: true,
      usableInBattle: true,
      usableToEnemy: false,
      applyToAll: false,
    },
  }
}

describe('P06 仙术页', () => {
  it('P06 施法者阶段按队伍顺序画两人不同HP', () => {
    const gs = makeGs()
    const roles = makeRoles()
    gs.partyMembers = [4, 1]
    gs.PlayerRolesRuntime.rgwHP[4] = 12
    gs.PlayerRolesRuntime.rgwHP[1] = 34
    const menu = createInGameMagicMenu(roles, gs.partyMembers, [])
    expect(menu.phase).toBe('pick-caster')
    const frames = makeUiFrames()
    const fb = createFramebuffer()
    fillSentinel(fb)
    const before = cloneInputs({ gs, menu, items: [], roles, frames })
    const restore = freezeNow(0)
    try {
      drawInGameMagicMenu({
        fb,
        state: menu,
        gs,
        playerRoles: roles,
        spells: [],
        magics: [],
        uiSpriteFrames: frames,
        glyphs,
      })
    } finally {
      restore()
    }
    expect(cloneInputs({ gs, menu, items: [], roles, frames })).toEqual(before)
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

  it('P06 仙术页区分MP够与不够，并画出说明和现行MP', () => {
    const commands: Command[] = [
      { op: 'showDialog', messageIndex: 2, text: '诀', label: 'L_52001' },
      { op: 'end' },
    ]
    setGlobalEvents(commands)
    const gs = makeGs()
    const roles = makeRoles()
    roles.roles[4]!.mp = 10
    roles.roles[4]!.magic = [300, 301]
    const cheap = makeSpell(300, '雷', 1, 52001)
    const dear = makeSpell(301, '风', 2)
    const magics = [makeMagic(1, 4), makeMagic(2, 30)]
    gs.partyMembers = [4, 1]
    gs.PlayerRolesRuntime.rgwMP[4] = 8
    const menu = createInGameMagicMenu(roles, gs.partyMembers, [cheap, dear], magics)
    confirmCaster(menu, roles, [cheap, dear], magics)
    expect(menu.phase).toBe('pick-spell')
    expect(menu.spellMenu?.items.map((entry) => entry.disabled)).toEqual([false, true])
    const frames = makeUiFrames()
    const fb = createFramebuffer()
    fillSentinel(fb)
    const before = cloneInputs({ gs, menu, items: [], roles, frames })
    const restore = freezeNow(0)
    try {
      drawInGameMagicMenu({
        fb,
        state: menu,
        gs,
        playerRoles: roles,
        spells: [cheap, dear],
        magics,
        uiSpriteFrames: frames,
        glyphs,
      })
    } finally {
      restore()
    }
    expect(cloneInputs({ gs, menu, items: [], roles, frames })).toEqual(before)
    expect(gs.PlayerRolesRuntime.rgwMP[4]).toBe(8)
    expect(roles.roles[4]!.magic).toEqual([300, 301])
    expect(pixel(fb, textDot('雷', 0, 35, 54).x, textDot('雷', 0, 35, 54).y)).toBe(
      MENUITEM_COLOR_SELECTED_FIRST,
    )
    expect(pixel(fb, textDot('风', 0, 122, 54).x, textDot('风', 0, 122, 54).y)).toBe(
      MENUITEM_COLOR_INACTIVE,
    )
    expect(pixel(fb, textDot('诀', 0, 102, 3).x, textDot('诀', 0, 102, 3).y)).toBe(0x3c)
    expect(pixel(fb, rightDigitX(15, 4, 0), 14)).toBe(yellowDigit(4))
    expect(pixel(fb, rightDigitX(50, 4, 0), 14)).toBe(cyanDigit(8))
    expect(pixel(fb, rightDigitX(50, 4, 0), 14)).not.toBe(cyanDigit(0))
    expect(pixel(fb, 260, 14)).toBe(SENTINEL)
  })

  it('P06 翻页后左上格换成后页仙术，目标阶段光标按队员移动', () => {
    const gs = makeGs()
    const roles = makeRoles()
    roles.roles[4]!.mp = 20
    const spells = NAMES.map((name, index) => makeSpell(300 + index, name, index + 1))
    const magics = spells.map((spell) => makeMagic(spell.magicNumber, 1))
    roles.roles[4]!.magic = spells.map((spell) => spell.id)
    gs.partyMembers = [4, 1]
    gs.PlayerRolesRuntime.rgwMP[4] = 20
    const menu = createInGameMagicMenu(roles, gs.partyMembers, spells, magics)
    confirmCaster(menu, roles, spells, magics)
    const frames = makeUiFrames()
    const fb = createFramebuffer()
    fillSentinel(fb)
    const restore = freezeNow(0)
    try {
      drawInGameMagicMenu({
        fb,
        state: menu,
        gs,
        playerRoles: roles,
        spells,
        magics,
        uiSpriteFrames: frames,
        glyphs,
      })
      expect(pixel(fb, textDot('甲', 0, 35, 54).x, textDot('甲', 0, 35, 54).y)).toBe(
        MENUITEM_COLOR_SELECTED_FIRST,
      )
      inGameMagicPageDown(menu)
      fillSentinel(fb)
      drawInGameMagicMenu({
        fb,
        state: menu,
        gs,
        playerRoles: roles,
        spells,
        magics,
        uiSpriteFrames: frames,
        glyphs,
      })
      expect(menu.spellMenu?.cursor).toBe(15)
      expect(pixel(fb, textDot('癸', 0, 35, 54).x, textDot('癸', 0, 35, 54).y)).toBe(MENUITEM_COLOR)
      expect(pixel(fb, textDot('甲', 0, 35, 54).x, textDot('甲', 0, 35, 54).y)).not.toBe(
        MENUITEM_COLOR,
      )

      menu.spellMenu!.cursor = 0
      const picked = confirmSpell(menu, spells, magics)
      expect(picked?.applyToAll).toBe(false)
      expect(menu.phase).toBe('pick-target')
      fillSentinel(fb)
      const before = cloneInputs({ gs, menu, items: [], roles, frames })
      drawInGameMagicMenu({
        fb,
        state: menu,
        gs,
        playerRoles: roles,
        spells,
        magics,
        uiSpriteFrames: frames,
        glyphs,
      })
      expect(cloneInputs({ gs, menu, items: [], roles, frames })).toEqual(before)
      expect(pixel(fb, 75, 158)).toBe(CURSOR_UP_ID)
      inGameMagicMoveDown(menu)
      fillSentinel(fb)
      const moved = cloneInputs({ gs, menu, items: [], roles, frames })
      drawInGameMagicMenu({
        fb,
        state: menu,
        gs,
        playerRoles: roles,
        spells,
        magics,
        uiSpriteFrames: frames,
        glyphs,
      })
      expect(cloneInputs({ gs, menu, items: [], roles, frames })).toEqual(moved)
      expect(pixel(fb, 75, 158)).toBe(SENTINEL)
      expect(pixel(fb, 153, 158)).toBe(CURSOR_UP_ID)
      expect(gs.PlayerRolesRuntime.rgwMP[4]).toBe(20)
    } finally {
      restore()
    }
  })
})
