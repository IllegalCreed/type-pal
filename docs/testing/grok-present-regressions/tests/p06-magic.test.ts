import type { Command, Magic, PlayerRoles, Spell } from '@type-pal/shared'
import { afterEach, describe, expect, it } from 'vitest'
import { setGlobalEvents } from '../../../../packages/game/src/core/event-system.js'
import {
  type GameState,
  projectRuntimeToBattleRoles,
} from '../../../../packages/game/src/core/game-state.js'
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

/** 正式菜单先把 runtime 投影成 roles。静态 mp/magic 不再单独驱动 disabled。 */
function viewRuntime(
  gs: GameState,
  staticRoles: PlayerRoles,
  roleId: number,
  spellIds: number[],
  mp: number,
): PlayerRoles {
  gs.PlayerRolesRuntime.rgwMP[roleId] = mp
  if ((gs.PlayerRolesRuntime.rgwHP[4] ?? 0) <= 0) gs.PlayerRolesRuntime.rgwHP[4] = 20
  if ((gs.PlayerRolesRuntime.rgwHP[1] ?? 0) <= 0) gs.PlayerRolesRuntime.rgwHP[1] = 20
  spellIds.forEach((id, slot) => {
    gs.PlayerRolesRuntime.rgwMagic[slot]![roleId] = id
  })
  return projectRuntimeToBattleRoles(gs.PlayerRolesRuntime, staticRoles)
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
        glyphs,
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
    const spells = [cheap, dear]
    const magics = [makeMagic(1, 8), makeMagic(2, 9)]
    gs.partyMembers = [4, 1]
    const viewed = viewRuntime(gs, roles, 4, [300, 301], 8)
    expect(viewed.roles[4]?.mp).toBe(8)
    expect(roles.roles[4]?.mp).toBe(10)
    const menu = createInGameMagicMenu(viewed, gs.partyMembers, spells, magics)
    confirmCaster(menu, viewed, spells, magics)
    expect(menu.phase).toBe('pick-spell')
    expect(menu.spellMenu?.items.map((entry) => entry.disabled)).toEqual([false, true])
    const frames = makeUiFrames()
    const fb = createFramebuffer()
    fillSentinel(fb)
    const inputs = { gs, menu, items: [], roles: viewed, frames, spells, magics }
    const before = cloneInputs(inputs)
    const restore = freezeNow(0)
    try {
      drawInGameMagicMenu({
        fb,
        state: menu,
        gs,
        playerRoles: viewed,
        spells,
        magics,
        uiSpriteFrames: frames,
        glyphs,
      })
    } finally {
      restore()
    }
    expect(cloneInputs(inputs)).toEqual(before)
    expect(gs.PlayerRolesRuntime.rgwMP[4]).toBe(8)
    const stale = makeRoles()
    stale.roles[4]!.mp = 10
    stale.roles[4]!.hp = 20
    stale.roles[1]!.hp = 20
    stale.roles[4]!.magic = [300, 301]
    const staleMenu = createInGameMagicMenu(stale, [4, 1], spells, magics)
    confirmCaster(staleMenu, stale, spells, magics)
    expect(staleMenu.spellMenu?.items[1]?.disabled).toBe(false)
    expect(menu.spellMenu?.items[1]?.disabled).toBe(true)
    expect(pixel(fb, textDot('雷', 0, 35, 54).x, textDot('雷', 0, 35, 54).y)).toBe(
      MENUITEM_COLOR_SELECTED_FIRST,
    )
    expect(pixel(fb, textDot('风', 0, 122, 54).x, textDot('风', 0, 122, 54).y)).toBe(
      MENUITEM_COLOR_INACTIVE,
    )
    expect(pixel(fb, textDot('诀', 0, 102, 3).x, textDot('诀', 0, 102, 3).y)).toBe(0x3c)
    expect(pixel(fb, rightDigitX(15, 4, 0), 14)).toBe(yellowDigit(8))
    expect(pixel(fb, rightDigitX(50, 4, 0), 14)).toBe(cyanDigit(8))
    expect(pixel(fb, rightDigitX(50, 4, 0), 14)).not.toBe(cyanDigit(0))
    expect(pixel(fb, 260, 14)).toBe(SENTINEL)
  })

  it('P06 翻页后左上格换成后页仙术，目标阶段光标按队员移动', () => {
    const gs = makeGs()
    const roles = makeRoles()
    const spells = NAMES.map((name, index) => makeSpell(300 + index, name, index + 1))
    const magics = spells.map((spell) => makeMagic(spell.magicNumber, 1))
    gs.partyMembers = [4, 1]
    const viewed = viewRuntime(
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
        glyphs,
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
        glyphs,
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
        glyphs,
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
        glyphs,
      })
      expect(cloneInputs(inputs)).toEqual(moved)
      expect(pixel(fb, 75, 158)).toBe(SENTINEL)
      expect(pixel(fb, 153, 158)).toBe(CURSOR_UP_ID)
      expect(gs.PlayerRolesRuntime.rgwMP[4]).toBe(20)
    } finally {
      restore()
    }
  })

  it('P06 输入快照能发现位图宽度、法术名、背景、毒和升级表变化', () => {
    const frames = makeUiFrames()
    const spells = [makeSpell(300, '雷', 1)]
    const magics = [makeMagic(1, 8)]
    const portraits = new Map([[5, frames[70]!]])
    const bg = { width: 4, height: 4, indices: new Uint8Array(16).fill(0x56) }
    const poisons = new Map([[77, { level: 1, color: 3 }]])
    const levelUpExp = [0, 40]
    const gs = makeGs()
    const roles = makeRoles()
    const menu = { phase: 'pick-spell' as const }
    const shot = () =>
      cloneInputs({
        gs,
        menu,
        items: [],
        roles,
        frames,
        portraits,
        spells,
        magics,
        statusBg: bg,
        poisons,
        levelUpExp,
      })
    const before = shot()
    frames[0]!.width = 99
    expect(shot()).not.toEqual(before)
    frames[0]!.width = 8
    spells[0]!._name = '错'
    expect(shot()).not.toEqual(before)
    spells[0]!._name = '雷'
    bg.height = 9
    expect(shot()).not.toEqual(before)
    bg.height = 4
    poisons.set(77, { level: 9, color: 3 })
    expect(shot()).not.toEqual(before)
    poisons.set(77, { level: 1, color: 3 })
    levelUpExp[1] = 41
    expect(shot()).not.toEqual(before)
    levelUpExp[1] = 40
    expect(shot()).toEqual(before)
  })
})
