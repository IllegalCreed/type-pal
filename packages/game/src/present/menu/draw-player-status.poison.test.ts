import type { PlayerRole } from '@type-pal/shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { beginChineseMenuText } from '../../__tests__/menu-text-fixture.js'
import { createInitialGameState, hydratePlayerRolesRuntime } from '../../core/game-state.js'
import { createPlayerStatus } from '../../core/menu/player-status.js'
import { setWordTable } from '../../core/word-lookup.js'
import { fixtureGlyphs, textDot } from '../__tests__/glyph-fixtures.js'
import { makeGs, makeRoles } from '../__tests__/menu-state-fixtures.js'
import { makeUiFrames } from '../__tests__/menu-ui-fixtures.js'
import { fillSentinel, pixel, SENTINEL } from '../__tests__/raster-fixtures.js'
import * as fontModule from '../font.js'
import { createFramebuffer } from '../framebuffer.js'
import { drawPlayerStatus } from './draw-player-status.js'

const positionGlyphs = fixtureGlyphs()

function poisonRole(id: number): PlayerRole {
  return {
    id,
    _name: 'r',
    name: 0,
    avatar: 0,
    level: 1,
    hp: 10,
    maxHP: 10,
    mp: 5,
    maxMP: 5,
    attackStrength: 1,
    magicStrength: 1,
    defense: 1,
    dexterity: 1,
    fleeRate: 1,
    poisonResistance: 0,
    equipment: [0, 0, 0, 0, 0, 0],
    magic: [],
    elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    coveredBy: 0,
    cooperativeMagic: 0,
    attackAll: 0,
    walkFrames: 0,
    spriteNum: 0,
    spriteNumInBattle: 0,
    attackSound: 0,
    weaponSound: 0,
    criticalSound: 0,
    magicSound: 0,
    deathSound: 0,
  }
}

function createPoisonState() {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  gs.partyMembers = [0]
  hydratePlayerRolesRuntime(gs.PlayerRolesRuntime, {
    roles: Array.from({ length: 6 }, (_, id) => poisonRole(id)),
  })
  return gs
}

function drawPoisonText(opts: {
  id: number
  level: number
  color: number
  slot?: number
}): ReturnType<typeof vi.spyOn> {
  const gs = createPoisonState()
  gs.partyMembers = [0]
  gs.rgPoisonStatus[`${opts.slot ?? 0}_0`] = { wPoisonID: opts.id, wPoisonScript: 0 }
  const objectPoisons = new Map([[opts.id, { level: opts.level, color: opts.color }]])
  const flat: string[] = []
  flat[opts.id] = '蛊毒'
  setWordTable(flat)
  const spy = observeRenderText()
  drawPlayerStatus({
    fb: createFramebuffer(),
    state: createPlayerStatus([0]),
    gs,
    playerRoles: { roles: [poisonRole(0)] },
    items: [],
    uiSpriteFrames: [],
    objectPoisons,
  })
  return spy
}

const originalRenderText = fontModule.renderText

let restoreRenderText: (() => void) | undefined

function observeRenderText() {
  const spy = vi.spyOn(fontModule, 'renderText')
  restoreRenderText = () => spy.mockRestore()
  return spy
}

let restoreMenuText: () => void

beforeEach(() => {
  restoreMenuText = beginChineseMenuText()
})

afterEach(() => {
  try {
    restoreRenderText?.()
    expect(fontModule.renderText).toBe(originalRenderText)
  } finally {
    restoreRenderText = undefined
    restoreMenuText()
  }
})

describe('Player status poison rows', () => {
  it('G06-D10 毒等级等于 3 仍画出，颜色是 wColor 加 10', () => {
    const gs = makeGs()
    gs.partyMembers = [0]
    gs.rgPoisonStatus['0_0'] = { wPoisonID: 7, wPoisonScript: 0 }
    const words: string[] = []
    words[7] = '甲'
    setWordTable(words)
    const fb = createFramebuffer()
    fillSentinel(fb)
    drawPlayerStatus({
      fb,
      state: createPlayerStatus([0]),
      gs,
      playerRoles: makeRoles(),
      items: [],
      uiSpriteFrames: makeUiFrames(),
      glyphs: positionGlyphs,
      objectPoisons: new Map([[7, { level: 3, color: 15 }]]),
    })
    expect(pixel(fb, 185, 58)).toBe(25)
  })

  it('G06-D11 空槽和等级大于 3 的毒不占显示行，下一毒上移到 y=76', () => {
    const gs = makeGs()
    gs.partyMembers = [0]
    gs.rgPoisonStatus['1_0'] = { wPoisonID: 7, wPoisonScript: 0 }
    gs.rgPoisonStatus['2_0'] = { wPoisonID: 8, wPoisonScript: 0 }
    gs.rgPoisonStatus['3_0'] = { wPoisonID: 9, wPoisonScript: 0 }
    const words: string[] = []
    words[7] = '甲'
    words[8] = '乙'
    words[9] = '乙'
    setWordTable(words)
    const fb = createFramebuffer()
    fillSentinel(fb)
    drawPlayerStatus({
      fb,
      state: createPlayerStatus([0]),
      gs,
      playerRoles: makeRoles(),
      items: [],
      uiSpriteFrames: makeUiFrames(),
      glyphs: positionGlyphs,
      objectPoisons: new Map([
        [7, { level: 2, color: 20 }],
        [8, { level: 99, color: 21 }],
        [9, { level: 1, color: 22 }],
      ]),
    })
    const kept = textDot('乙', 0, 185, 76)
    const skipped = textDot('乙', 0, 185, 94)
    expect(pixel(fb, 185, 58)).toBe(30)
    expect(pixel(fb, kept.x, kept.y)).toBe(32)
    expect(pixel(fb, skipped.x, skipped.y)).toBe(SENTINEL)
  })

  it('G06-D12 第 11 条毒不再覆盖第 10 条的颜色', () => {
    const gs = makeGs()
    gs.partyMembers = [0]
    const words: string[] = []
    const poisons = new Map<number, { level: number; color: number }>()
    for (let slot = 0; slot <= 10; slot++) {
      const id = 20 + slot
      words[id] = '甲'
      gs.rgPoisonStatus[`${slot}_0`] = { wPoisonID: id, wPoisonScript: 0 }
      poisons.set(id, { level: 1, color: slot === 9 ? 20 : slot === 10 ? 40 : 1 })
    }
    setWordTable(words)
    const fb = createFramebuffer()
    fillSentinel(fb)
    drawPlayerStatus({
      fb,
      state: createPlayerStatus([0]),
      gs,
      playerRoles: makeRoles(),
      items: [],
      uiSpriteFrames: makeUiFrames(),
      glyphs: positionGlyphs,
      objectPoisons: poisons,
    })
    expect(pixel(fb, 185, 184)).toBe(30)
  })

  it('level<=3 → 毒名画在 (185,58),色 = wColor+10', () => {
    const spy = drawPoisonText({ id: 100, level: 2, color: 30 })
    // renderText(fb, text, x, y, color, glyphs, shadow)
    const call = spy.mock.calls.find((c: unknown[]) => c[2] === 185 && c[3] === 58)
    expect(call).toBeDefined()
    expect(call![1]).toBe('蛊毒') // getWord(100)
    expect(call![4]).toBe(40) // wColor 30 + 10
    expect(call![6]).toBe(true) // fShadow=TRUE
  })

  it('level>3(高级/装备毒哨兵)→ 不画', () => {
    const spy = drawPoisonText({ id: 100, level: 99, color: 30 })
    expect(spy.mock.calls.find((c: unknown[]) => c[2] === 185 && c[3] === 58)).toBeUndefined()
  })

  it('wPoisonID=0(无毒槽)→ 不画', () => {
    const gs = createPoisonState()
    const spy = observeRenderText()
    drawPlayerStatus({
      fb: createFramebuffer(),
      state: createPlayerStatus([0]),
      gs,
      playerRoles: { roles: [poisonRole(0)] },
      items: [],
      uiSpriteFrames: [],
      objectPoisons: new Map(),
    })
    expect(spy.mock.calls.find((c: unknown[]) => c[2] === 185 && c[3] === 58)).toBeUndefined()
  })

  it('重复角色队伍：状态页 cursor 2 不复用首个同角色队员的毒槽', () => {
    const gs = createPoisonState()
    gs.partyMembers = [4, 5, 4]
    gs.rgPoisonStatus['0_0'] = { wPoisonID: 100, wPoisonScript: 0 }
    const words: string[] = []
    words[100] = '蛊毒'
    setWordTable(words)
    const state = createPlayerStatus(gs.partyMembers)
    state.cursor = 2
    const spy = observeRenderText()
    drawPlayerStatus({
      fb: createFramebuffer(),
      state,
      gs,
      playerRoles: { roles: Array.from({ length: 6 }, (_, id) => poisonRole(id)) },
      items: [],
      uiSpriteFrames: [],
      objectPoisons: new Map([[100, { level: 2, color: 30 }]]),
    })
    expect(
      spy.mock.calls.filter((call) => call[2] === 185 && call[3] === 58).map((call) => call[1]),
    ).toEqual([])
  })

  it('非顺序 party：SDLPal slot 0 的毒应显示给 partyMembers[0] 的 role', () => {
    const gs = createPoisonState()
    gs.partyMembers = [4, 1]
    gs.rgPoisonStatus['0_0'] = { wPoisonID: 100, wPoisonScript: 0 }
    const roles = [poisonRole(0), poisonRole(1), poisonRole(2), poisonRole(3), poisonRole(4)]
    const objectPoisons = new Map([[100, { level: 2, color: 30 }]])
    const flat: string[] = []
    flat[100] = '蛊毒'
    setWordTable(flat)
    const spy = observeRenderText()

    drawPlayerStatus({
      fb: createFramebuffer(),
      state: createPlayerStatus([4, 1]),
      gs,
      playerRoles: { roles },
      items: [],
      uiSpriteFrames: [],
      objectPoisons,
    })

    expect(spy.mock.calls.find((c: unknown[]) => c[2] === 185 && c[3] === 58)?.[1]).toBe('蛊毒')
  })
})
