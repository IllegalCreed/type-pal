/**
 * TEST-GROK-RENDER-HOST-LARGE-1 G08-B。
 * 合击血量门槛、沉默与傀儡、冻结对话和信息框边界。不重领 P15 的箭头、禁用色和物品数量。
 */
import type { Item, PlayerRole, PlayerRoles } from '@type-pal/shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { IndexedImage } from '../../assets/png.js'
import type { BattleEnemy, BattlePlayer, BattleState } from '../../core/battle/battle-state.js'
import type { DialogBoxState, GameState } from '../../core/game-state.js'
import { createInitialGameState } from '../../core/game-state.js'
import { createSeedableRng } from '../../core/rng.js'
import { fillSentinel, pixel, SENTINEL } from '../__tests__/grok-present/images.js'
import type { Glyph, GlyphTable } from '../font.js'
import { createFramebuffer, type Framebuffer } from '../framebuffer.js'
import { drawBattleUI } from './draw-battle-ui.js'

function minimalRole(id: number, opts: Partial<PlayerRole> = {}): PlayerRole {
  return {
    id,
    _name: '甲',
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
    ...opts,
  }
}

function mkBattlePlayer(roleId: number): BattlePlayer {
  return {
    roleId,
    prevHp: 200,
    prevMp: 30,
    defending: false,
    status: { sleep: 0, paralyzed: 0, confused: 0, haste: 0, slow: 0 },
  }
}

function mkEnemy(): BattleEnemy {
  return {
    e: {
      id: 50,
      _name: 'TestEnemy',
      idleFrames: 0,
      magicFrames: 0,
      attackFrames: 0,
      idleAnimSpeed: 0,
      actWaitFrames: 0,
      yPosOffset: 0,
      attackSound: 0,
      actionSound: 0,
      magicSound: 0,
      deathSound: 0,
      callSound: 0,
      health: 50,
      exp: 10,
      cash: 30,
      level: 5,
      magic: 0,
      magicRate: 0,
      attackEquivItem: 0,
      attackEquivItemRate: 0,
      stealItem: 0,
      stealItemCount: 0,
      attackStrength: 0,
      magicStrength: 0,
      defense: 0,
      dexterity: 20,
      fleeRate: 5,
      poisonResistance: 0,
      elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
      physicalResistance: 1,
      dualMove: 0,
      collectValue: 0,
    },
    status: { sleep: 0, paralyzed: 0, confused: 0, haste: 0, slow: 0 },
    prevHp: 50,
    scriptOnTurnStart: 0,
    scriptOnBattleEnd: 0,
    scriptOnReady: 0,
  }
}

function mkState(players: BattlePlayer[], overrides: Partial<BattleState> = {}): BattleState {
  return {
    players,
    enemies: [mkEnemy()],
    field: {
      id: 0,
      screenWave: 0,
      magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    },
    isBoss: false,
    phase: 'selectAction',
    turn: 1,
    selectionStartedForTurn: 1,
    actionQueue: [],
    currentActionIndex: 0,
    pendingActions: new Map(),
    uiState: 'selectMove',
    menuState: 'main',
    selectedAction: 0,
    uiCursor: 0,
    miscMenuCursor: 0,
    miscSubMenuCursor: 0,
    selectingPlayerIdx: 0,
    expGained: 0,
    cashGained: 0,
    rng: createSeedableRng(1),
    phaseStallTicks: 0,
    ...overrides,
  }
}

function blankFrame(): IndexedImage {
  return { width: 1, height: 1, indices: new Uint8Array([0]), opaque: new Uint8Array([0]) }
}

function solidFrame(index: number): IndexedImage {
  return { width: 1, height: 1, indices: new Uint8Array([index]), opaque: new Uint8Array([1]) }
}

function uiFrames(length = 80): IndexedImage[] {
  const frames = Array.from({ length }, () => blankFrame())
  if (length > 43) {
    frames[40] = solidFrame(0x06)
    frames[41] = solidFrame(0x06)
    frames[42] = solidFrame(0x06)
    frames[43] = solidFrame(0x06)
  }
  return frames
}

function glyphsOf(chars: readonly string[]): GlyphTable {
  const map = new Map<number, Glyph>()
  for (const ch of chars) {
    const cp = ch.codePointAt(0)
    if (cp === undefined) continue
    const bitmap = new Uint8Array(32)
    bitmap[0] = 0x80
    map.set(cp, { width: 16, height: 16, bitmap })
  }
  return { has: (cp) => map.has(cp), get: (cp) => map.get(cp) }
}

function mkGs(): GameState {
  return createInitialGameState({ x: 0, y: 0, facing: 'down' })
}

function keptBox(): DialogBoxState {
  return {
    shownLines: [],
    currentLineText: null,
    typingFrames: 0,
    charsRevealed: 0,
    dialogLineCount: 0,
    phase: 'line-done',
    style: 'bottom',
    fontColor: 1,
    shadow: false,
    keyIconBlink: false,
  }
}

function makeItem(id: number, bitmap: number): Item {
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

function paint(opts: {
  state: BattleState
  roles: PlayerRoles
  frames: IndexedImage[]
  glyphs?: GlyphTable
  gs?: GameState
  fill?: number
  items?: Item[]
  poisons?: Map<number, { level: number; color: number }>
  icons?: Map<number, IndexedImage>
}): Framebuffer {
  const fb = createFramebuffer()
  fillSentinel(fb, opts.fill ?? SENTINEL)
  drawBattleUI(
    fb,
    opts.state,
    opts.roles,
    [],
    opts.items ?? [],
    opts.gs ?? mkGs(),
    opts.glyphs,
    opts.frames,
    undefined,
    opts.poisons,
    opts.icons,
  )
  return fb
}

function duo(hp: number, maxHP = 200): { players: BattlePlayer[]; roles: PlayerRoles } {
  return {
    players: [mkBattlePlayer(0), mkBattlePlayer(1)],
    roles: {
      roles: [minimalRole(0, { hp, maxHP }), minimalRole(1, { hp, maxHP })],
    },
  }
}

describe('G08-B 战斗界面像素', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(0)
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('G08-B01 体力正好等于 min(100, maxHP/5) 时合击图标仍是可用灰', () => {
    const { players, roles } = duo(40, 200)
    const fb = paint({ state: mkState(players), roles, frames: uiFrames() })
    expect(pixel(fb, 54, 155)).toBe(0x02)
    expect(pixel(fb, 27, 140)).toBe(0x06)
  })

  it('G08-B02 体力比该门槛少 1 时合击图标更暗', () => {
    const { players, roles } = duo(39, 200)
    const fb = paint({ state: mkState(players), roles, frames: uiFrames() })
    expect(pixel(fb, 54, 155)).toBe(0x12)
  })

  it('G08-B03 maxHP/5 超过 100 时门槛停在 100，体力 150 的合击仍可用', () => {
    const { players, roles } = duo(150, 1000)
    const fb = paint({ state: mkState(players), roles, frames: uiFrames() })
    expect(pixel(fb, 54, 155)).toBe(0x02)
  })

  it('G08-B04 沉默使法术和合击更暗，杂项保持可用灰，选中的攻击仍是原色', () => {
    const { players, roles } = duo(200, 200)
    const self = players[0]
    if (!self) throw new Error('missing player')
    self.status = { ...self.status, silence: 2 }
    const fb = paint({ state: mkState(players), roles, frames: uiFrames() })
    expect(pixel(fb, 0, 155)).toBe(0x12)
    expect(pixel(fb, 54, 155)).toBe(0x12)
    expect(pixel(fb, 27, 170)).toBe(0x02)
    expect(pixel(fb, 27, 140)).toBe(0x06)
  })

  it('G08-B05 傀儡不封锁法术，但合击因不健康而更暗', () => {
    const { players, roles } = duo(200, 200)
    const self = players[0]
    if (!self) throw new Error('missing player')
    self.status = { ...self.status, puppet: 1 }
    const fb = paint({ state: mkState(players), roles, frames: uiFrames() })
    expect(pixel(fb, 0, 155)).toBe(0x02)
    expect(pixel(fb, 54, 155)).toBe(0x12)
  })

  it('G08-B06 同伴睡眠使健康人数不够，合击更暗而法术仍可用', () => {
    const { players, roles } = duo(200, 200)
    const ally = players[1]
    if (!ally) throw new Error('missing ally')
    ally.status = { ...ally.status, sleep: 3 }
    const fb = paint({ state: mkState(players), roles, frames: uiFrames() })
    expect(pixel(fb, 54, 155)).toBe(0x12)
    expect(pixel(fb, 0, 155)).toBe(0x02)
  })

  it('G08-B07 没有行动队员时未选图标更暗，选中的攻击仍保持原色', () => {
    const roles: PlayerRoles = { roles: [minimalRole(0)] }
    const fb = paint({
      state: mkState([mkBattlePlayer(0)], { selectingPlayerIdx: undefined }),
      roles,
      frames: uiFrames(),
    })
    expect(pixel(fb, 0, 155)).toBe(0x12)
    expect(pixel(fb, 27, 140)).toBe(0x06)
  })

  it('G08-B08 dialogBoxKept 让攻击图标和底部姓名都保持哨兵', () => {
    const gs = mkGs()
    gs.dialogBoxKept = keptBox()
    const fb = paint({
      state: mkState([mkBattlePlayer(0)]),
      roles: { roles: [minimalRole(0)] },
      frames: uiFrames(),
      gs,
      glyphs: glyphsOf(['甲']),
    })
    expect(pixel(fb, 27, 140)).toBe(SENTINEL)
    expect(pixel(fb, 5, 175)).toBe(SENTINEL)
  })

  it('G08-B09 进入物品二级后，父项道具用确认绿 0x2C，邻项仍是 0x4F', () => {
    const fb = paint({
      state: mkState([mkBattlePlayer(0)], { menuState: 'miscItemSubMenu', miscMenuCursor: 1 }),
      roles: { roles: [minimalRole(0)] },
      frames: uiFrames(),
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

  it('G08-B10 杂项菜单未进入二级时，当前项是闪烁色 0xF9 而不是确认绿', () => {
    const fb = paint({
      state: mkState([mkBattlePlayer(0)], { menuState: 'misc', miscMenuCursor: 0 }),
      roles: { roles: [minimalRole(0)] },
      frames: uiFrames(),
      glyphs: glyphsOf(['围', '攻', '道', '具', '防', '御', '逃', '跑', '状', '态']),
    })
    expect(pixel(fb, 16, 32)).toBe(0xf9)
    expect(pixel(fb, 16, 50)).toBe(0x4f)
  })

  it('G08-B11 选友方目标时攻击图标改灰，目标箭头在锚点上移 67', () => {
    const frames = uiFrames()
    frames[67] = solidFrame(0x67)
    frames[68] = solidFrame(0x68)
    const fb = paint({
      state: mkState([mkBattlePlayer(0)], { uiState: 'selectTargetPlayer', uiCursor: 0 }),
      roles: { roles: [minimalRole(0)] },
      frames,
    })
    expect(pixel(fb, 27, 140)).toBe(0x02)
    expect(pixel(fb, 232, 103)).toBe(0x67)
    expect(pixel(fb, 232, 96)).toBe(0x68)
  })

  it('G08-B12 活人的乱和封落在信息框偏移上', () => {
    const player = mkBattlePlayer(0)
    player.status = { ...player.status, confused: 2, silence: 2 }
    const fb = paint({
      state: mkState([player]),
      roles: { roles: [minimalRole(0, { hp: 100 })] },
      frames: uiFrames(),
      glyphs: glyphsOf(['乱', '封']),
    })
    expect(pixel(fb, 126, 184)).toBe(0x5f)
    expect(pixel(fb, 146, 185)).toBe(0x3c)
  })

  it('G08-B13 中毒头像按毒色高半字节重染，不再写出原索引', () => {
    const frames = uiFrames()
    frames[48] = solidFrame(0x30)
    const gs = mkGs()
    gs.rgPoisonStatus['0_0'] = { wPoisonID: 552, wPoisonScript: 0 }
    const fb = paint({
      state: mkState([mkBattlePlayer(0)]),
      roles: { roles: [minimalRole(0, { hp: 100 })] },
      frames,
      gs,
      poisons: new Map([[552, { level: 1, color: 64 }]]),
    })
    expect(pixel(fb, 89, 161)).toBe(0x40)
  })

  it('G08-B14 物品框阴影把背景 0x13 收成 0x11，本体和小球图标分开', () => {
    const frames = uiFrames()
    frames[70] = solidFrame(0x6e)
    const bead = makeItem(1, 4)
    const fb = paint({
      state: mkState([mkBattlePlayer(0)], {
        menuState: 'useItemSelect',
        itemSelect: {
          items: [{ id: 1, label: '甲', rightText: '×1', disabled: false }],
          cursor: 0,
          pageSize: 21,
          pageOffset: 0,
        },
      }),
      roles: { roles: [minimalRole(0)] },
      frames,
      glyphs: glyphsOf(['甲']),
      items: [bead],
      icons: new Map([[4, solidFrame(0x21)]]),
      fill: 0x13,
    })
    expect(pixel(fb, 5, 145)).toBe(0x11)
    expect(pixel(fb, 0, 140)).toBe(0x6e)
    expect(pixel(fb, 8, 147)).toBe(0x21)
  })

  it('G08-B15 法术网格不画物品数量，假设的个位保持哨兵', () => {
    const fb = paint({
      state: mkState([mkBattlePlayer(0)], {
        menuState: 'magicSelect',
        magicSelect: {
          items: [{ id: 1, label: '甲', rightText: '×2', disabled: false }],
          cursor: 0,
          pageSize: 15,
          pageOffset: 0,
        },
      }),
      roles: { roles: [minimalRole(0)] },
      frames: uiFrames(),
      glyphs: glyphsOf(['甲']),
    })
    expect(pixel(fb, 35, 54)).toBe(0xf9)
    expect(pixel(fb, 122, 59)).toBe(SENTINEL)
  })

  it('G08-B16 界面帧数不超过 48 时改画文字姓名，不画头像', () => {
    const frames = uiFrames(48)
    const fb = paint({
      state: mkState([mkBattlePlayer(0)]),
      roles: { roles: [minimalRole(0)] },
      frames,
      glyphs: glyphsOf(['甲']),
    })
    expect(pixel(fb, 5, 175)).toBe(1)
    expect(pixel(fb, 89, 161)).toBe(SENTINEL)
  })

  it('G08-B17 帧数刚到 49 时画头像，底部文字姓名保持哨兵', () => {
    const frames = uiFrames(49)
    frames[48] = solidFrame(0x30)
    const fb = paint({
      state: mkState([mkBattlePlayer(0)]),
      roles: { roles: [minimalRole(0)] },
      frames,
      glyphs: glyphsOf(['甲']),
    })
    expect(pixel(fb, 89, 161)).toBe(0x30)
    expect(pixel(fb, 5, 175)).toBe(SENTINEL)
  })
})
