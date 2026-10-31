import type { Command, Item, PlayerRoles, Spell } from '@type-pal/shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setGlobalEvents } from '../../../core/event-system.js'
import {
  battleGs,
  battleState,
  item,
  role,
  rolesOf,
  battlePlayer as rosterPlayer,
} from '../../__tests__/battle-render-fixtures.js'
import { createDigitFrames } from '../../__tests__/digit-frames.js'
import { glyphsOf } from '../../__tests__/glyph-fixtures.js'
import { cyanDigit, yellowDigit } from '../../__tests__/menu-ui-fixtures.js'
import { at, pixel, SENTINEL, solidIndexedImage } from '../../__tests__/raster-fixtures.js'
import { createFramebuffer } from '../../framebuffer.js'
import { drawBattleUI } from '../draw-battle-ui.js'
import { battleEnemy, battlePlayer, spriteEnemy, spriteRole } from './battle-sprite-state.js'
import {
  filledUiFrames,
  namedRole,
  paintUi,
  selectionFrames,
  singleEnemyUiState,
  transparentUiFrames,
  uiBattleState,
  uiGameState,
} from './battle-ui-fixtures.js'

function battleSpell(id: number, name?: string): Spell {
  return {
    id,
    _name: name,
    magicNumber: 0,
    scriptOnSuccess: 0,
    scriptOnUse: 0,
    scriptDesc: 0,
    flags: {
      usableOutsideBattle: false,
      usableInBattle: true,
      usableToEnemy: true,
      applyToAll: false,
    },
  }
}

function battleItem(id: number, name?: string): Item {
  return {
    id,
    _name: name,
    bitmap: 0,
    price: 0,
    scriptOnUse: 0,
    scriptOnEquip: 0,
    scriptOnThrow: 0,
    scriptDesc: 0,
    flags: {
      usable: true,
      equipable: false,
      throwable: false,
      consuming: true,
      applyToAll: false,
      sellable: false,
      equipableBy: [false, false, false, false, false, false],
    },
  }
}

const UI = filledUiFrames()

function iconItem(id: number, bitmap: number): Item {
  return {
    id,
    _name: '甲',
    bitmap,
    price: 1,
    scriptOnUse: 0,
    scriptOnEquip: 0,
    scriptOnThrow: 0,
    scriptDesc: 0,
    flags: {
      usable: true,
      equipable: false,
      throwable: false,
      consuming: true,
      applyToAll: false,
      sellable: false,
      equipableBy: [false, false, false, false, false, false],
    },
  }
}

describe('battle UI descriptions and grids', () => {
  beforeEach(() => vi.spyOn(Date, 'now').mockReturnValue(0))

  afterEach(() => vi.restoreAllMocks())

  it('selectMove + magicSelect —— 画选中仙术 scriptDesc 说明', () => {
    const fb = createFramebuffer()
    const playerRoles: PlayerRoles = { roles: [spriteRole(0)] }
    const state = uiBattleState([battlePlayer(0)], [battleEnemy(spriteEnemy(50))], {
      uiState: 'selectMove',
      menuState: 'magicSelect',
      magicSelect: {
        items: [{ id: 296, label: '气疗术', rightText: 'MP 6', disabled: false }],
        cursor: 0,
        pageSize: 15,
        pageOffset: 0,
      },
    })
    const spell = { ...battleSpell(296), scriptDesc: 43016 }
    const commands: Command[] = [
      { op: 'raw', opcode: 0xa7, operands: [0, 0, 0], label: 'L_43016' },
      { op: 'showDialog', messageIndex: 1, text: '回复少量体力。' },
      { op: 'end' },
    ]
    setGlobalEvents(commands)
    try {
      drawBattleUI(fb, state, playerRoles, [spell], [], uiGameState(), undefined, UI)
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

  // L8(magicmenu.c:189-216 WIN95 path):法术菜单显示 scriptDesc 说明时,MP 框/数字应在左侧
  //   (slash 45,14 / needed 15,14 / current 50,14),且无金钱框、无右侧 MP(215~265)。
  //   修前 TS 叠了 DOS-noDesc 的金钱框+右侧 MP(magicmenu.c:128-142),是任何单一 sdlpal 路径都没有的组合。
  it('法术菜单用 WIN95 布局 —— MP 在左侧,右侧 MP 区(215~265)无 slash/MP sprite', () => {
    const fb = createFramebuffer()
    const playerRoles: PlayerRoles = { roles: [spriteRole(0)] }
    const state = uiBattleState([battlePlayer(0)], [battleEnemy(spriteEnemy(50))], {
      uiState: 'selectMove',
      menuState: 'magicSelect',
      magicSelect: {
        items: [{ id: 296, label: '雷震子', rightText: 'MP 5', disabled: false }],
        cursor: 0,
        pageSize: 15,
        pageOffset: 0,
      },
    })
    drawBattleUI(
      fb,
      state,
      playerRoles,
      [battleSpell(296)],
      [],
      uiGameState(),
      undefined,
      createDigitFrames(),
    )
    expect(fb.indices[14 * 320 + 33]).toBe(24) // yellow 5
    expect(fb.indices[14 * 320 + 45]).toBe(39) // slash
    expect(fb.indices[14 * 320 + 68]).toBe(56) // runtime MP 0
    for (let y = 12; y < 19; y++) {
      expect(fb.indices.slice(y * 320 + 216, y * 320 + 272).every((value) => value === 0)).toBe(
        true,
      )
    }
  })

  it('selectMove + magicSelect：32法术末页保留选中项，末尾空位不画', () => {
    const fb = createFramebuffer()
    const playerRoles: PlayerRoles = { roles: [spriteRole(0)] }
    const items = Array.from({ length: 32 }, (_, i) => ({
      id: 296 + i,
      label: '甲',
      rightText: 'MP 5',
      disabled: false,
    }))
    const state = uiBattleState([battlePlayer(0)], [battleEnemy(spriteEnemy(50))], {
      uiState: 'selectMove',
      menuState: 'magicSelect',
      magicSelect: { items, cursor: 31, pageSize: 15, pageOffset: 0 },
    })
    drawBattleUI(fb, state, playerRoles, [], [], uiGameState(), glyphsOf(['甲']), UI)
    // 末页从24开始，31在第3行第2列；32已越过列表，不能绘制。
    expect(fb.indices[54 * 320 + 35]).toBe(0x4f)
    expect(fb.indices[90 * 320 + 122]).toBe(0xf9)
    expect(fb.indices[90 * 320 + 209]).toBe(0) // 4px测试框在此已结束；不能出现第33项文字
  })

  it('selectMove + useItemSelect —— 画 ITEMBOX、BALL 图标和 scriptDesc 说明', () => {
    const fb = createFramebuffer()
    const playerRoles: PlayerRoles = { roles: [spriteRole(0)] }
    const state = uiBattleState([battlePlayer(0)], [battleEnemy(spriteEnemy(50))], {
      uiState: 'selectMove',
      menuState: 'useItemSelect',
      itemSelect: {
        items: [{ id: 1, label: '金创药', rightText: '×3', disabled: false }],
        cursor: 0,
        pageSize: 21,
        pageOffset: 0,
      },
    })
    const item = { ...battleItem(1), bitmap: 7, scriptDesc: 40133 }
    const icon = {
      width: 2,
      height: 2,
      indices: new Uint8Array(4).fill(123),
      opaque: new Uint8Array(4).fill(1),
    }
    const commands: Command[] = [
      { op: 'raw', opcode: 0xa7, operands: [0, 0, 0], label: 'L_40133' },
      { op: 'showDialog', messageIndex: 1, text: '恢复体力。' },
      { op: 'end' },
    ]
    setGlobalEvents(commands)
    try {
      drawBattleUI(
        fb,
        state,
        playerRoles,
        [],
        [item],
        uiGameState(),
        undefined,
        UI,
        undefined,
        new Map([[7, icon]]),
      )
    } finally {
      setGlobalEvents([])
    }

    expect(fb.indices[147 * 320 + 8]).toBe(123) // BALL 图标:itemmenu.c (xBase+8,yBase+7)
    let descriptionPixels = 0
    for (let y = 151; y < 167; y++) {
      for (let x = 71; x < 220; x++) {
        if (fb.indices[y * 320 + x] === 0x3c) descriptionPixels++
      }
    }
    expect(descriptionPixels).toBeGreaterThan(0)
  })
})

describe('battle menu chrome and quantities', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(0)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('进入物品二级后，父项道具用确认绿 0x2C，邻项仍是 0x4F', () => {
    const fb = paintUi({
      state: singleEnemyUiState([battlePlayer(0)], {
        menuState: 'miscItemSubMenu',
        miscMenuCursor: 1,
      }),
      roles: { roles: [namedRole(0)] },
      frames: transparentUiFrames(),
      glyphs: glyphsOf([
        '围',
        '攻',
        '道',
        '具',
        '防',
        '御',
        '逃',
        '跑',
        '状',
        '态',
        '使',
        '用',
        '投',
        '掷',
      ]),
    })
    expect(pixel(fb, 16, 50)).toBe(0x2c)
    expect(pixel(fb, 16, 32)).toBe(0x4f)
  })

  it('杂项菜单未进入二级时，当前项是闪烁色 0xF9 而不是确认绿', () => {
    const fb = paintUi({
      state: singleEnemyUiState([battlePlayer(0)], { menuState: 'misc', miscMenuCursor: 0 }),
      roles: { roles: [namedRole(0)] },
      frames: transparentUiFrames(),
      glyphs: glyphsOf(['围', '攻', '道', '具', '防', '御', '逃', '跑', '状', '态']),
    })
    expect(pixel(fb, 16, 32)).toBe(0xf9)
    expect(pixel(fb, 16, 50)).toBe(0x4f)
  })

  it('物品框阴影把背景 0x13 收成 0x11，本体和小球图标分开', () => {
    const frames = transparentUiFrames()
    frames[70] = solidIndexedImage(1, 1, 0x6e)
    const bead = iconItem(1, 4)
    const fb = paintUi({
      state: singleEnemyUiState([battlePlayer(0)], {
        menuState: 'useItemSelect',
        itemSelect: {
          items: [{ id: 1, label: '甲', rightText: '×1', disabled: false }],
          cursor: 0,
          pageSize: 21,
          pageOffset: 0,
        },
      }),
      roles: { roles: [namedRole(0)] },
      frames,
      glyphs: glyphsOf(['甲']),
      items: [bead],
      icons: new Map([[4, solidIndexedImage(1, 1, 0x21)]]),
      fill: 0x13,
    })
    expect(pixel(fb, 5, 145)).toBe(0x11)
    expect(pixel(fb, 0, 140)).toBe(0x6e)
    expect(pixel(fb, 8, 147)).toBe(0x21)
  })

  it('法术网格不画物品数量，假设的个位保持哨兵', () => {
    const frames = transparentUiFrames()
    frames[58] = solidIndexedImage(1, 1, 0x72) // 若误走物品数量路径，青色2必须能覆盖哨兵。
    const fb = paintUi({
      state: singleEnemyUiState([battlePlayer(0)], {
        menuState: 'magicSelect',
        magicSelect: {
          items: [{ id: 1, label: '甲', rightText: 'MP 2', disabled: false }],
          cursor: 0,
          pageSize: 15,
          pageOffset: 0,
        },
      }),
      roles: { roles: [namedRole(0)] },
      frames,
      glyphs: glyphsOf(['甲']),
    })
    expect(pixel(fb, 35, 54)).toBe(0xf9)
    expect(pixel(fb, 122, 59)).toBe(SENTINEL)
  })
})

describe('battle grid values and ownership', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(0)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('预填禁用菜单按需求9与8着色，运行时MP数字是8不是静态10', () => {
    // drawBattleUI 只按 menu.items[].disabled 上色，青色现行数字读 rgwMP。
    // MP 不足如何变成 disabled 不在本链：见 battle-system.test.ts
    // 「建表:MP 不足 → disabled 灰项(magicmenu.c:347-352)」。
    const frames = selectionFrames()
    const cast = rolesOf([role(0, { mp: 10 })])
    const gs = battleGs()
    gs.PlayerRolesRuntime.rgwMP[0] = 8
    const menu = {
      items: [
        { id: 1, label: '甲', rightText: 'MP 9', disabled: true },
        { id: 2, label: '乙', rightText: 'MP 8', disabled: false },
      ],
      cursor: 0,
      pageSize: 15,
      pageOffset: 0,
    }
    const state = battleState([rosterPlayer(0)], [], {
      uiState: 'selectMove',
      menuState: 'magicSelect',
      selectingPlayerIdx: 0,
      magicSelect: menu,
    })
    const glyphs = glyphsOf(['甲', '乙'])
    const fb = createFramebuffer()
    const beforeRoleMp = cast.roles[0]!.mp
    const beforeRuntime = gs.PlayerRolesRuntime.rgwMP[0]
    const beforeMenu = structuredClone(menu)
    drawBattleUI(fb, state, cast, [], [], gs, glyphs, frames)
    expect(cast.roles[0]!.mp).toBe(beforeRoleMp)
    expect(gs.PlayerRolesRuntime.rgwMP[0]).toBe(beforeRuntime)
    expect(menu).toEqual(beforeMenu)
    // 需求个位 (33,14)，现行个位 (68,14)。选中但 MP 不够是 0x1C。
    expect(at(fb, 33, 14)).toBe(yellowDigit(9))
    expect(at(fb, 68, 14)).toBe(cyanDigit(8))
    expect(at(fb, 35, 54)).toBe(0x1c)

    menu.cursor = 1
    const fbOn = createFramebuffer()
    drawBattleUI(fbOn, state, cast, [], [], gs, glyphs, frames)
    expect(gs.PlayerRolesRuntime.rgwMP[0]).toBe(8)
    expect(cast.roles[0]!.mp).toBe(10)
    expect(at(fbOn, 33, 14)).toBe(yellowDigit(8))
    expect(at(fbOn, 68, 14)).toBe(cyanDigit(8))
    // 三项一列宽 87。光标在第二项时，第一项退回未选暗色 0x18，第二项是 0xF9。
    expect(at(fbOn, 35, 54)).toBe(0x18)
    expect(at(fbOn, 122, 54)).toBe(0xf9)
  })

  it('正常单人队的物品数量2画青字，数量1不画', () => {
    const frames = selectionFrames()
    const gs = battleGs()
    const cast = rolesOf([role(0, { hp: 11 })])
    const bead = item(1)
    const items = [bead]
    const itemMenu = {
      items: [{ id: bead.id, label: '甲', rightText: '×2', disabled: false }],
      cursor: 0,
      pageSize: 21,
      pageOffset: 0,
    }
    const withAmount = battleState([rosterPlayer(0)], [], {
      uiState: 'selectMove',
      menuState: 'useItemSelect',
      itemSelect: itemMenu,
    })
    const amountFb = createFramebuffer()
    const beforeItems = items.map((entry) => ({ ...entry, flags: { ...entry.flags } }))
    drawBattleUI(amountFb, withAmount, cast, [], items, gs, glyphsOf(['甲']), frames)
    expect(items.map((entry) => ({ ...entry, flags: { ...entry.flags } }))).toEqual(beforeItems)
    expect(at(amountFb, 102, 17)).toBe(cyanDigit(2))

    itemMenu.items[0]!.rightText = '×1'
    const oneFb = createFramebuffer()
    drawBattleUI(oneFb, withAmount, cast, [], items, gs, glyphsOf(['甲']), frames)
    expect(items).toHaveLength(1)
    expect(items[0]?.id).toBe(bead.id)
    expect(at(oneFb, 102, 17)).toBe(0)
  })
})
