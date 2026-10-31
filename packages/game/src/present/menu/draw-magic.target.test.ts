import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { beginChineseMenuText } from '../../__tests__/menu-text-fixture.js'
import {
  confirmCaster,
  confirmSpell,
  createInGameMagicMenu,
  inGameMagicMoveDown,
  inGameMagicPageDown,
  rememberMagicCasterCursor,
} from '../../core/menu/in-game-magic-menu.js'
import { MENUITEM_COLOR, MENUITEM_COLOR_SELECTED_FIRST } from '../../core/menu/inventory-menu.js'
import { fixtureGlyphs, textDot } from '../__tests__/glyph-fixtures.js'
import {
  menuMagic,
  menuSpell,
  setRuntimeMagicAndProjectRoles,
  spellSnapshot,
} from '../__tests__/magic-menu-fixtures.js'
import { freezeNow, makeGs, makeLiveScene, makeRoles } from '../__tests__/menu-state-fixtures.js'
import { CURSOR_UP_ID, makeUiFrames, uiFramesWithoutSlot } from '../__tests__/menu-ui-fixtures.js'
import { fillSentinel, pixel, SENTINEL } from '../__tests__/raster-fixtures.js'
import { cloneInputs } from '../__tests__/render-input-snapshots.js'
import { createFramebuffer } from '../framebuffer.js'
import { drawInGameMagicMenu } from './draw-magic.js'

const positionGlyphs = fixtureGlyphs()

const NAMES = [...'甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳']

let restoreMenuText: () => void

beforeEach(() => {
  restoreMenuText = beginChineseMenuText()
  rememberMagicCasterCursor(0)
})

afterEach(() => {
  try {
    rememberMagicCasterCursor(0)
  } finally {
    restoreMenuText()
  }
})

describe('Magic target transitions', () => {
  it('G07-A05 缺少上箭头帧时目标光标位保持底色，仙术名仍画出', () => {
    const { gs, roles } = makeLiveScene([4, 1])
    const spell = menuSpell(300, '甲', 1)
    const state = spellSnapshot([4, 1], [spell], 4)
    state.phase = 'pick-target'
    const frames = uiFramesWithoutSlot(67)
    const fb = createFramebuffer()
    fillSentinel(fb)
    const restore = freezeNow(0)
    try {
      drawInGameMagicMenu({
        fb,
        state,
        gs,
        playerRoles: roles,
        spells: [spell],
        magics: [menuMagic(1, 1)],
        uiSpriteFrames: frames,
        glyphs: positionGlyphs,
      })
    } finally {
      restore()
    }
    const name = textDot('甲', 0, 35, 54)
    expect(pixel(fb, 75, 158)).toBe(SENTINEL)
    expect(pixel(fb, name.x, name.y)).toBe(MENUITEM_COLOR_SELECTED_FIRST)
  })

  it('P06 翻页后左上格换成后页仙术，目标阶段光标按队员移动', () => {
    const gs = makeGs()
    const roles = makeRoles()
    const spells = NAMES.map((name, index) => menuSpell(300 + index, name, index + 1))
    const magics = spells.map((spell) => menuMagic(spell.magicNumber, 1))
    gs.partyMembers = [4, 1]
    const viewed = setRuntimeMagicAndProjectRoles(
      gs,
      roles,
      4,
      spells.map((spell) => spell.id),
      20,
    )
    const menu = createInGameMagicMenu(viewed, gs.partyMembers, spells, magics)
    confirmCaster(menu, viewed, spells, magics)
    const frames = makeUiFrames()
    const fb = createFramebuffer()
    fillSentinel(fb)
    const inputs = { gs, menu, items: [], roles: viewed, frames, spells, magics }
    const restore = freezeNow(0)
    try {
      const beforeFirst = cloneInputs(inputs)
      drawInGameMagicMenu({
        fb,
        state: menu,
        gs,
        playerRoles: viewed,
        spells,
        magics,
        uiSpriteFrames: frames,
        glyphs: positionGlyphs,
      })
      expect(cloneInputs(inputs)).toEqual(beforeFirst)
      expect(pixel(fb, textDot('甲', 0, 35, 54).x, textDot('甲', 0, 35, 54).y)).toBe(
        MENUITEM_COLOR_SELECTED_FIRST,
      )
      inGameMagicPageDown(menu)
      fillSentinel(fb)
      const beforePage = cloneInputs(inputs)
      drawInGameMagicMenu({
        fb,
        state: menu,
        gs,
        playerRoles: viewed,
        spells,
        magics,
        uiSpriteFrames: frames,
        glyphs: positionGlyphs,
      })
      expect(cloneInputs(inputs)).toEqual(beforePage)
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
      const before = cloneInputs(inputs)
      drawInGameMagicMenu({
        fb,
        state: menu,
        gs,
        playerRoles: viewed,
        spells,
        magics,
        uiSpriteFrames: frames,
        glyphs: positionGlyphs,
      })
      expect(cloneInputs(inputs)).toEqual(before)
      expect(pixel(fb, 75, 158)).toBe(CURSOR_UP_ID)
      inGameMagicMoveDown(menu)
      fillSentinel(fb)
      const moved = cloneInputs(inputs)
      drawInGameMagicMenu({
        fb,
        state: menu,
        gs,
        playerRoles: viewed,
        spells,
        magics,
        uiSpriteFrames: frames,
        glyphs: positionGlyphs,
      })
      expect(cloneInputs(inputs)).toEqual(moved)
      expect(pixel(fb, 75, 158)).toBe(SENTINEL)
      expect(pixel(fb, 153, 158)).toBe(CURSOR_UP_ID)
      expect(gs.PlayerRolesRuntime.rgwMP[4]).toBe(20)
    } finally {
      restore()
    }
  })
})
