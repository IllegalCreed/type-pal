import type { Command, Magic, PlayerRole, PlayerRoles, Spell } from '@type-pal/shared'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { freezeMenuClock } from '../../__tests__/menu-clock-fixture.js'
import { beginChineseMenuText } from '../../__tests__/menu-text-fixture.js'
import { setGlobalEvents } from '../../core/event-system.js'
import { createInitialGameState, hydratePlayerRolesRuntime } from '../../core/game-state.js'
import { magicWithCost } from '../../core/menu/__tests__/magic-cost-fixture.js'
import {
  confirmCaster,
  createInGameMagicMenu,
  type InGameMagicMenuState,
  rememberMagicCasterCursor,
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
  setRuntimeMagicAndProjectRoles,
  spellSnapshot,
  uniformCasterRoles,
  uniformMagics,
  uniformSpells,
} from '../__tests__/magic-menu-fixtures.js'
import { freezeNow, makeGs, makeLiveScene, makeRoles } from '../__tests__/menu-state-fixtures.js'
import {
  BOX_STYLE1,
  CURSOR_ID,
  cyanDigit,
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

function uniformMagicMenu(): {
  state: InGameMagicMenuState
  roles: ReturnType<typeof uniformCasterRoles>
} {
  const roles = uniformCasterRoles()
  roles.roles[0]!.magic = [300, 301]
  const state = createInGameMagicMenu(roles, [0, 1], uniformSpells, uniformMagics)
  return { state, roles }
}

function solidUiFrames(): Array<{
  width: number
  height: number
  indices: Uint8Array
  opaque: Uint8Array
}> {
  return Array.from({ length: 80 }, () => ({
    width: 4,
    height: 4,
    indices: new Uint8Array(16).fill(15),
    opaque: new Uint8Array(16).fill(1),
  }))
}

function layoutRole(id: number): PlayerRole {
  return {
    id,
    _name: `Role${id}`,
    avatar: 0,
    spriteNumInBattle: id,
    spriteNum: 0,
    name: 0,
    attackAll: 0,
    level: 10,
    maxHP: 200,
    maxMP: 30,
    hp: 200,
    mp: 30,
    attackStrength: 0,
    magicStrength: 0,
    defense: 0,
    dexterity: 30,
    fleeRate: 5,
    poisonResistance: 0,
    elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    walkFrames: 0,
    attackSound: 0,
    weaponSound: 0,
    criticalSound: 0,
    magicSound: 0,
    deathSound: 0,
  }
}

let restoreMenuText: () => void

beforeEach(() => {
  restoreMenuText = beginChineseMenuText()
  setGlobalEvents([])
  rememberMagicCasterCursor(0)
})

afterEach(() => {
  try {
    setGlobalEvents([])
    rememberMagicCasterCursor(0)
  } finally {
    restoreMenuText()
  }
})

describe('Magic spell grid and descriptions', () => {
  it('pick-spell：选中+MP不足 0x1C（预置 disabled 着色，不证明判定已执行）', () => {
    const { state, roles } = uniformMagicMenu()
    state.casterMenu.cursor = 0
    state.phase = 'pick-spell'
    state.selectedCasterId = 0
    const gs = createHydratedUniformState(roles)
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
    const fb = sentinelFramebuffer()
    const restore = freezeMenuClock(0)
    try {
      drawInGameMagicMenu({
        fb,
        state,
        gs,
        playerRoles: roles,
        spells: uniformSpells,
        magics: uniformMagics,
        uiSpriteFrames: makeUiFrames(),
        glyphs: uniformGlyphs,
      })
    } finally {
      restore()
    }
    // grid 第一格 (35,54)=甲 选中 0xF9；第二格 (35+87,54)=乙 0x18（未选中禁用）
    const jiaDot = uniformTextDot(0, 35, 54)
    expect(pixel(fb, jiaDot.x, jiaDot.y)).toBe(0xf9)
    const yiDot = uniformTextDot(0, 35 + 87, 54)
    expect(pixel(fb, yiDot.x, yiDot.y)).toBe(MENUITEM_COLOR_INACTIVE)

    // 光标移到禁用乙 → 0x1C
    state.spellMenu.cursor = 1
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

  it('空法术表：只画 grid 框，不画条目不抛错；MP 框 needed 0', () => {
    const roles = uniformCasterRoles()
    const state = createInGameMagicMenu(roles, [0], uniformSpells, uniformMagics)
    state.spellMenu = { items: [], cursor: 0, pageSize: 15, pageOffset: 0 }
    state.phase = 'pick-spell'
    state.selectedCasterId = 0
    const gs = createHydratedUniformState(roles, [0])
    gs.PlayerRolesRuntime.rgwMP[0] = 7
    const fb = sentinelFramebuffer()
    const restore = freezeMenuClock(0)
    try {
      drawInGameMagicMenu({
        fb,
        state,
        gs,
        playerRoles: roles,
        spells: uniformSpells,
        magics: uniformMagics,
        uiSpriteFrames: makeUiFrames(),
        glyphs: uniformGlyphs,
      })
    } finally {
      restore()
    }
    expect(pixel(fb, 20, 50)).toBe(0x22)
    expect(pixel(fb, 39, 58)).toBe(0x22)
    expect(pixel(fb, 62, 64)).toBe(0x22) // style1 grid 框内部
    // MP needed = cursor 空表 → sel undefined → 0：个位黄 0 在 rightDigitX(15,4,0)=33
    expect(pixel(fb, 33, 14)).toBe(0xb0)
    // current MP 7 → cyan 7 个位在 rightDigitX(50,4,0)=68
    expect(pixel(fb, 68, 14)).toBe(0x77)
  })

  it('spell 不在 catalog：grid 使用 menu item 的完整 label', () => {
    const roles = uniformCasterRoles()
    const state = createInGameMagicMenu(roles, [0, 1], uniformSpells, uniformMagics)
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
    const gs = createHydratedUniformState(roles)
    const fb = sentinelFramebuffer()
    const restore = freezeMenuClock(0)
    try {
      drawInGameMagicMenu({
        fb,
        state,
        gs,
        playerRoles: roles,
        spells: [], // 301 不在 catalog → find undefined → label 回退
        magics: uniformMagics,
        uiSpriteFrames: makeUiFrames(),
        glyphs: uniformGlyphs,
      })
    } finally {
      restore()
    }
    const yiDot = uniformTextDot(1, 35, 54) // item.label 第 1 字
    expect(pixel(fb, yiDot.x, yiDot.y)).toBe(0xf9)
  })

  it('G07-A02 第二条仙术说明在 y=19，第一条仍在 y=3', () => {
    const commands: Command[] = [
      { op: 'showDialog', messageIndex: 1, text: '诀', label: 'L_88021' },
      { op: 'showDialog', messageIndex: 2, text: '雷' },
      { op: 'end' },
    ]
    setGlobalEvents(commands)
    const { gs, roles } = makeLiveScene([4, 1])
    const spell = menuSpell(300, '甲', 1, 88021)
    const state = spellSnapshot([4, 1], [spell], 4)
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
        magics: [menuMagic(1, 1)],
        uiSpriteFrames: frames,
        glyphs: positionGlyphs,
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

  it('G07-A06 防御性缺施法人快照不画顶部真气，仙术名仍画出', () => {
    const { gs, roles } = makeLiveScene([4, 1])
    gs.PlayerRolesRuntime.rgwMP[4] = 6
    const spell = menuSpell(300, '甲', 1)
    const state = spellSnapshot([4, 1], [spell], undefined)
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
        magics: [menuMagic(1, 4)],
        uiSpriteFrames: frames,
        glyphs: positionGlyphs,
      })
    } finally {
      restore()
    }
    const name = textDot('甲', 0, 35, 54)
    expect(pixel(fb, rightDigitX(15, 4, 0), 14)).toBe(SENTINEL)

    expect(pixel(fb, name.x, name.y)).toBe(MENUITEM_COLOR_SELECTED_FIRST)
  })

  it('G07-A07 法术目录没有对应 magic 时需要真气画成黄 0，现行真气仍是青 6', () => {
    const { gs, roles } = makeLiveScene([4, 1])
    gs.PlayerRolesRuntime.rgwMP[4] = 6
    const spell = menuSpell(300, '甲', 9)
    const state = spellSnapshot([4, 1], [spell], 4)
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
        magics: [menuMagic(1, 4)],
        uiSpriteFrames: frames,
        glyphs: positionGlyphs,
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
    const { gs, roles } = makeLiveScene([4, 1])
    const spells = [menuSpell(300, '甲', 1), menuSpell(301, '乙', 2), menuSpell(302, '丙', 3)]
    const state = spellSnapshot([4, 1], spells, 4)
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
        magics: spells.map((spell) => menuMagic(spell.magicNumber, 1)),
        uiSpriteFrames: frames,
        glyphs: positionGlyphs,
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
    const { gs, roles } = makeLiveScene([4, 1])
    const spells = [
      menuSpell(300, '甲', 1),
      menuSpell(301, '乙', 2),
      menuSpell(302, '丙', 3),
      menuSpell(303, '丁', 4),
    ]
    const state = spellSnapshot([4, 1], spells, 4)
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
        magics: spells.map((spell) => menuMagic(spell.magicNumber, 1)),
        uiSpriteFrames: frames,
        glyphs: positionGlyphs,
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

  it('G07-A12 缺少光标帧 69 时名字照画，光标位留着格子框色', () => {
    const { gs, roles } = makeLiveScene([4, 1])
    const spell = menuSpell(300, '甲', 1)
    const state = spellSnapshot([4, 1], [spell], 4)
    const frames = uiFramesWithoutSlot(69)
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
    expect(pixel(fb, 62, 64)).toBe(BOX_STYLE1)

    expect(pixel(fb, name.x, name.y)).toBe(MENUITEM_COLOR_SELECTED_FIRST)
  })

  it('G07-A15 格子光标的实点是 0x69，中间透明孔留着格子框色', () => {
    const { gs, roles } = makeLiveScene([4, 1])
    const spell = menuSpell(300, '甲', 1)
    const state = spellSnapshot([4, 1], [spell], 4)
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
        magics: [menuMagic(1, 1)],
        uiSpriteFrames: frames,
        glyphs: positionGlyphs,
      })
    } finally {
      restore()
    }
    expect(pixel(fb, 62, 64)).toBe(CURSOR_ID)
    expect(pixel(fb, 61, 64)).toBe(BOX_STYLE1)
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
    const cheap = menuSpell(300, '雷', 1, 52001)
    const dear = menuSpell(301, '风', 2)
    const spells = [cheap, dear]
    const magics = [menuMagic(1, 8), menuMagic(2, 9)]
    gs.partyMembers = [4, 1]
    const viewed = setRuntimeMagicAndProjectRoles(gs, roles, 4, [300, 301], 8)
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
        glyphs: positionGlyphs,
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

    expect(pixel(fb, 260, 14)).toBe(SENTINEL)
  })

  it('pick-spell 画选中仙术 scriptDesc 说明(magicmenu.c:191)', () => {
    const fb = createFramebuffer()
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })

    const state: InGameMagicMenuState = {
      phase: 'pick-spell',
      casterMenu: {
        items: [{ id: 0, label: 'Role0', disabled: false }],
        cursor: 0,
        pageSize: 1,
        pageOffset: 0,
      },
      selectedCasterId: 0,
      spellMenu: {
        items: [{ id: 296, label: '气疗术', rightText: 'MP 6', disabled: false }],
        cursor: 0,
        pageSize: 15,
        pageOffset: 0,
      },
      targetCursor: 0,
      partyMembers: [0],
    }
    const playerRoles: PlayerRoles = { roles: [layoutRole(0)] }
    hydratePlayerRolesRuntime(gs.PlayerRolesRuntime, playerRoles)
    const spells: Spell[] = [
      {
        id: 296,
        _name: '气疗术',
        magicNumber: 33,
        scriptOnSuccess: 0,
        scriptOnUse: 0,
        scriptDesc: 43275,
        flags: {
          usableOutsideBattle: true,
          usableInBattle: true,
          usableToEnemy: false,
          applyToAll: false,
        },
      },
    ]
    const magics: Magic[] = [{ ...magicWithCost(33, 6), type: 'applyToPlayer' }]
    const commands: Command[] = [
      { op: 'raw', opcode: 0xa7, operands: [0, 0, 0], label: 'L_43275' },
      { op: 'showDialog', messageIndex: 1, text: '回复少量体力。' },
      { op: 'end' },
    ]

    setGlobalEvents(commands)
    try {
      drawInGameMagicMenu({
        fb,
        state,
        gs,
        playerRoles,
        spells,
        magics,
        uiSpriteFrames: solidUiFrames(),
      })
    } finally {
      setGlobalEvents([])
    }

    let descriptionPixels = 0
    for (let y = 3; y < 19; y++) {
      for (let x = 102; x < 260; x++) {
        if (fb.indices[y * 320 + x] === 0x3c) descriptionPixels++
      }
    }
    expect(descriptionPixels).toBeGreaterThan(0)
  })

  it('L8:pick-spell 用 WIN95 布局 —— MP 在左侧,右侧 MP 区(215~265)无 slash/MP sprite', () => {
    const fb = createFramebuffer()
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const state: InGameMagicMenuState = {
      phase: 'pick-spell',
      casterMenu: {
        items: [{ id: 0, label: 'Role0', disabled: false }],
        cursor: 0,
        pageSize: 1,
        pageOffset: 0,
      },
      selectedCasterId: 0,
      spellMenu: {
        items: [{ id: 296, label: '气疗术', rightText: 'MP 6', disabled: false }],
        cursor: 0,
        pageSize: 15,
        pageOffset: 0,
      },
      targetCursor: 0,
      partyMembers: [0],
    }
    const playerRoles: PlayerRoles = { roles: [layoutRole(0)] }
    hydratePlayerRolesRuntime(gs.PlayerRolesRuntime, playerRoles)
    const spells: Spell[] = [
      {
        id: 296,
        _name: '气疗术',
        magicNumber: 33,
        scriptOnSuccess: 0,
        scriptOnUse: 0,
        scriptDesc: 0,
        flags: {
          usableOutsideBattle: true,
          usableInBattle: true,
          usableToEnemy: false,
          applyToAll: false,
        },
      },
    ]
    const magics: Magic[] = [{ ...magicWithCost(33, 6), type: 'applyToPlayer' }]
    drawInGameMagicMenu({
      fb,
      state,
      gs,
      playerRoles,
      spells,
      magics,
      uiSpriteFrames: solidUiFrames(),
    })
    // SPRITENUM_SLASH(39)=4×4 index-15 块;UI 数字 sprite 同为 index-15。
    const count15 = (x0: number, x1: number, y0: number, y1: number): number => {
      let n = 0
      for (let y = y0; y < y1; y++)
        for (let x = x0; x < x1; x++) if (fb.indices[y * 320 + x] === 15) n++
      return n
    }
    // 右侧 MP 区(buggy:slash@260 + current@265 + needed@230)WIN95 下应清空
    expect(count15(216, 272, 12, 19)).toBe(0)
    // 左侧 MP 区(WIN95:needed@15 + slash@45 + current@50)应有写入
    expect(count15(14, 55, 12, 19)).toBeGreaterThan(0)
  })
})
