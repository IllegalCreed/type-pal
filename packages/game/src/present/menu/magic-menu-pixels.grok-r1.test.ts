/**
 * TEST-GROK-RENDER-HOST-LARGE-1 G07-A。
 * 仙术页的单人选人框、说明第二行、缺帧，以及体力上限和真气读运行时。
 * 不重复 P06 的两人体力、左侧 MP 8 和目标光标位移，也不重复 glm 的死亡色与空表。
 */
import type { Command, Magic, Spell } from '@type-pal/shared'
import { afterEach, describe, expect, it } from 'vitest'
import type { IndexedImage } from '../../assets/png.js'
import { setGlobalEvents } from '../../core/event-system.js'
import type { InGameMagicMenuState } from '../../core/menu/in-game-magic-menu.js'
import { MENUITEM_COLOR, MENUITEM_COLOR_SELECTED_FIRST } from '../../core/menu/inventory-menu.js'
import { fixtureGlyphs, textDot } from '../__tests__/grok-present/font.js'
import {
  BOX_STYLE0,
  BOX_STYLE1,
  CURSOR_ID,
  cyanDigit,
  fillSentinel,
  INFOBOX_ID,
  makeUiFrames,
  pixel,
  rightDigitX,
  SENTINEL,
  SLASH_ID,
  yellowDigit,
} from '../__tests__/grok-present/images.js'
import {
  cloneInputs,
  freezeNow,
  makeGs,
  makeRoles,
  resetHostSingletons,
} from '../__tests__/grok-present/world.js'
import { createFramebuffer } from '../framebuffer.js'
import { drawInGameMagicMenu } from './draw-magic.js'

const glyphs = fixtureGlyphs()
const FACE_4 = 0xa4

afterEach(() => {
  resetHostSingletons()
})

function withoutFrame(index: number): IndexedImage[] {
  const source = makeUiFrames()
  const frames: IndexedImage[] = []
  for (let i = 0; i < source.length; i++) {
    if (i !== index) frames[i] = source[i]!
  }
  return frames
}

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

function casterState(party: number[]): InGameMagicMenuState {
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

function spellState(
  party: number[],
  spells: Spell[],
  casterId: number | undefined,
): InGameMagicMenuState {
  return {
    phase: 'pick-spell',
    casterMenu: {
      items: party.map((id) => ({ id, label: '甲', disabled: false })),
      cursor: 0,
      pageSize: 4,
      pageOffset: 0,
    },
    selectedCasterId: casterId,
    spellMenu: {
      items: spells.map((spell) => ({
        id: spell.id,
        label: spell._name ?? '甲',
        disabled: false,
      })),
      cursor: 0,
      pageSize: 15,
      pageOffset: 0,
    },
    targetCursor: 0,
    partyMembers: [...party],
  }
}

describe('G07-A 仙术菜单像素', () => {
  it('G07-A01 选人阶段只有一人时仍画出一行内容框，底边在 y=78', () => {
    const gs = makeGs()
    const roles = makeRoles()
    const state = casterState([4])
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
        glyphs,
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

  it('G07-A02 第二条仙术说明在 y=19，第一条仍在 y=3', () => {
    const commands: Command[] = [
      { op: 'showDialog', messageIndex: 1, text: '诀', label: 'L_88021' },
      { op: 'showDialog', messageIndex: 2, text: '雷' },
      { op: 'end' },
    ]
    setGlobalEvents(commands)
    const gs = makeGs()
    const roles = makeRoles()
    const spell = makeSpell(300, '甲', 1, 88021)
    const state = spellState([4, 1], [spell], 4)
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
        spells: [spell],
        magics: [makeMagic(1, 1)],
        uiSpriteFrames: frames,
        glyphs,
      })
    } finally {
      restore()
    }
    const first = textDot('诀', 0, 102, 3)
    const second = textDot('雷', 0, 102, 19)
    expect(pixel(fb, second.x, second.y)).toBe(0x3c)
    expect(pixel(fb, first.x, first.y)).toBe(0x3c)
    expect(pixel(fb, second.x, 3)).toBe(SENTINEL)
  })

  it('G07-A03 缺少头像帧时头像位保持底色，体力个位仍画出', () => {
    const gs = makeGs()
    const roles = makeRoles()
    gs.partyMembers = [4, 1]
    gs.PlayerRolesRuntime.rgwHP[4] = 12
    const state = casterState([4, 1])
    const frames = withoutFrame(52)
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
        glyphs,
      })
    } finally {
      restore()
    }
    expect(pixel(fb, 43, 161)).toBe(SENTINEL)
    expect(pixel(fb, rightDigitX(71, 4, 0), 170)).toBe(yellowDigit(2))
  })

  it('G07-A04 缺少斜杠帧时斜杠位保持底色，体力个位仍画出', () => {
    const gs = makeGs()
    const roles = makeRoles()
    gs.PlayerRolesRuntime.rgwHP[4] = 12
    const state = casterState([4, 1])
    const frames = withoutFrame(39)
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
        glyphs,
      })
    } finally {
      restore()
    }
    expect(pixel(fb, 94, 171)).toBe(SENTINEL)
    expect(pixel(fb, 94, 171)).not.toBe(SLASH_ID)
    expect(pixel(fb, rightDigitX(71, 4, 0), 170)).toBe(yellowDigit(2))
  })

  it('G07-A05 缺少上箭头帧时目标光标位保持底色，仙术名仍画出', () => {
    const gs = makeGs()
    const roles = makeRoles()
    const spell = makeSpell(300, '甲', 1)
    const state = spellState([4, 1], [spell], 4)
    state.phase = 'pick-target'
    const frames = withoutFrame(67)
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
        magics: [makeMagic(1, 1)],
        uiSpriteFrames: frames,
        glyphs,
      })
    } finally {
      restore()
    }
    const name = textDot('甲', 0, 35, 54)
    expect(pixel(fb, 75, 158)).toBe(SENTINEL)
    expect(pixel(fb, name.x, name.y)).toBe(MENUITEM_COLOR_SELECTED_FIRST)
  })

  it('G07-A06 未选定施法人时不画顶部真气，仙术名仍画出', () => {
    const gs = makeGs()
    const roles = makeRoles()
    gs.PlayerRolesRuntime.rgwMP[4] = 6
    const spell = makeSpell(300, '甲', 1)
    const state = spellState([4, 1], [spell], undefined)
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
        spells: [spell],
        magics: [makeMagic(1, 4)],
        uiSpriteFrames: frames,
        glyphs,
      })
    } finally {
      restore()
    }
    const name = textDot('甲', 0, 35, 54)
    expect(pixel(fb, rightDigitX(15, 4, 0), 14)).toBe(SENTINEL)
    expect(pixel(fb, rightDigitX(15, 4, 0), 14)).not.toBe(yellowDigit(0))
    expect(pixel(fb, name.x, name.y)).toBe(MENUITEM_COLOR_SELECTED_FIRST)
  })

  it('G07-A07 法术目录没有对应 magic 时需要真气画成黄 0，现行真气仍是青 6', () => {
    const gs = makeGs()
    const roles = makeRoles()
    gs.PlayerRolesRuntime.rgwMP[4] = 6
    const spell = makeSpell(300, '甲', 9)
    const state = spellState([4, 1], [spell], 4)
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
        spells: [spell],
        magics: [makeMagic(1, 4)],
        uiSpriteFrames: frames,
        glyphs,
      })
    } finally {
      restore()
    }
    const name = textDot('甲', 0, 35, 54)
    expect(pixel(fb, rightDigitX(15, 4, 0), 14)).toBe(yellowDigit(0))
    expect(pixel(fb, rightDigitX(50, 4, 0), 14)).toBe(cyanDigit(6))
    expect(pixel(fb, name.x, name.y)).toBe(MENUITEM_COLOR_SELECTED_FIRST)
  })

  it('G07-A08 第三列仙术在 x=209，颜色是未选中色', () => {
    const gs = makeGs()
    const roles = makeRoles()
    const spells = [makeSpell(300, '甲', 1), makeSpell(301, '乙', 2), makeSpell(302, '丙', 3)]
    const state = spellState([4, 1], spells, 4)
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
        spells,
        magics: spells.map((spell) => makeMagic(spell.magicNumber, 1)),
        uiSpriteFrames: frames,
        glyphs,
      })
    } finally {
      restore()
    }
    const third = textDot('丙', 0, 209, 54)
    const first = textDot('甲', 0, 35, 54)
    expect(pixel(fb, third.x, third.y)).toBe(MENUITEM_COLOR)
    expect(pixel(fb, first.x, first.y)).toBe(MENUITEM_COLOR_SELECTED_FIRST)
  })

  it('G07-A09 第二行仙术在 y=72，颜色是未选中色', () => {
    const gs = makeGs()
    const roles = makeRoles()
    const spells = [
      makeSpell(300, '甲', 1),
      makeSpell(301, '乙', 2),
      makeSpell(302, '丙', 3),
      makeSpell(303, '丁', 4),
    ]
    const state = spellState([4, 1], spells, 4)
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
        spells,
        magics: spells.map((spell) => makeMagic(spell.magicNumber, 1)),
        uiSpriteFrames: frames,
        glyphs,
      })
    } finally {
      restore()
    }
    const row = textDot('丁', 0, 35, 72)
    expect(pixel(fb, row.x, row.y)).toBe(MENUITEM_COLOR)
    expect(pixel(fb, textDot('甲', 0, 35, 54).x, textDot('甲', 0, 35, 54).y)).toBe(
      MENUITEM_COLOR_SELECTED_FIRST,
    )
  })

  it('G07-A10 信息框真气读运行时 12，不读角色静态真气 99', () => {
    const gs = makeGs()
    const roles = makeRoles()
    const role = roles.roles[4]
    if (!role) throw new Error('role missing')
    role.mp = 99
    gs.PlayerRolesRuntime.rgwMP[4] = 12
    const state = casterState([4, 1])
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
        glyphs,
      })
    } finally {
      restore()
    }
    expect(pixel(fb, rightDigitX(71, 4, 0), 186)).toBe(cyanDigit(2))
    expect(pixel(fb, rightDigitX(71, 4, 1), 186)).toBe(cyanDigit(1))
    expect(pixel(fb, rightDigitX(71, 4, 0), 186)).not.toBe(cyanDigit(9))
    expect(cloneInputs({ gs, menu: state, roles, frames, spells: [], magics: [] })).toEqual(before)
  })

  it('G07-A11 体力上限 80 画在 y=173，当前体力 12 仍在 y=170', () => {
    const gs = makeGs()
    const roles = makeRoles()
    gs.PlayerRolesRuntime.rgwHP[4] = 12
    gs.PlayerRolesRuntime.rgwMaxHP[4] = 80
    const state = casterState([4, 1])
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
        glyphs,
      })
    } finally {
      restore()
    }
    expect(pixel(fb, rightDigitX(92, 4, 1), 173)).toBe(yellowDigit(8))
    expect(pixel(fb, rightDigitX(92, 4, 0), 173)).toBe(yellowDigit(0))
    expect(pixel(fb, rightDigitX(71, 4, 0), 170)).toBe(yellowDigit(2))
  })

  it('G07-A12 缺少光标帧 69 时名字照画，光标位留着格子框色', () => {
    const gs = makeGs()
    const roles = makeRoles()
    const spell = makeSpell(300, '甲', 1)
    const state = spellState([4, 1], [spell], 4)
    const frames = withoutFrame(69)
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
        magics: [makeMagic(1, 1)],
        uiSpriteFrames: frames,
        glyphs,
      })
    } finally {
      restore()
    }
    const name = textDot('甲', 0, 35, 54)
    expect(pixel(fb, 62, 64)).toBe(BOX_STYLE1)
    expect(pixel(fb, 62, 64)).not.toBe(CURSOR_ID)
    expect(pixel(fb, name.x, name.y)).toBe(MENUITEM_COLOR_SELECTED_FIRST)
  })

  it('G07-A13 头像落在信息框左上外侧，信息框本体仍在 (45,165)', () => {
    const gs = makeGs()
    const roles = makeRoles()
    const state = casterState([4, 1])
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
        glyphs,
      })
    } finally {
      restore()
    }
    expect(pixel(fb, 43, 161)).toBe(FACE_4)
    expect(pixel(fb, 44, 161)).toBe(SENTINEL)
    expect(pixel(fb, 45, 165)).toBe(INFOBOX_ID)
  })

  it('G07-A14 选人阶段不画仙术格子，体力个位仍画出', () => {
    const gs = makeGs()
    const roles = makeRoles()
    gs.PlayerRolesRuntime.rgwHP[4] = 12
    const state = casterState([4, 1])
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
        spells: [makeSpell(300, '甲', 1)],
        magics: [makeMagic(1, 1)],
        uiSpriteFrames: frames,
        glyphs,
      })
    } finally {
      restore()
    }
    expect(pixel(fb, 10, 42)).toBe(SENTINEL)
    expect(pixel(fb, rightDigitX(71, 4, 0), 170)).toBe(yellowDigit(2))
  })

  it('G07-A15 格子光标的实点是 0x69，中间透明孔留着格子框色', () => {
    const gs = makeGs()
    const roles = makeRoles()
    const spell = makeSpell(300, '甲', 1)
    const state = spellState([4, 1], [spell], 4)
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
        spells: [spell],
        magics: [makeMagic(1, 1)],
        uiSpriteFrames: frames,
        glyphs,
      })
    } finally {
      restore()
    }
    expect(pixel(fb, 62, 64)).toBe(CURSOR_ID)
    expect(pixel(fb, 61, 64)).toBe(BOX_STYLE1)
  })
})
