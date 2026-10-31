import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { beginChineseMenuText } from '../../__tests__/menu-text-fixture.js'
import { createPlayerStatus, type PlayerStatusState } from '../../core/menu/player-status.js'
import { fixtureGlyphs } from '../__tests__/glyph-fixtures.js'
import { makeGs, makeItem, makeRoles } from '../__tests__/menu-state-fixtures.js'
import {
  blueDigit,
  cyanDigit,
  makeUiFrames,
  rightDigitX,
  SLASH_ID,
  uiFramesWithoutSlot,
  yellowDigit,
} from '../__tests__/menu-ui-fixtures.js'
import { fillSentinel, pixel, SENTINEL, sentinelFramebuffer } from '../__tests__/raster-fixtures.js'
import { cloneInputs } from '../__tests__/render-input-snapshots.js'
import { createHydratedStatusState } from '../__tests__/status-state-fixtures.js'
import { uniformDotGlyphs } from '../__tests__/uniform-glyphs.js'
import { createFramebuffer } from '../framebuffer.js'
import { drawPlayerStatus } from './draw-player-status.js'

const uniformGlyphs = uniformDotGlyphs()

const positionGlyphs = fixtureGlyphs()

let restoreMenuText: () => void

beforeEach(() => {
  restoreMenuText = beginChineseMenuText()
})

afterEach(() => {
  restoreMenuText()
})

describe('Player status runtime values', () => {
  it('runtime 0 → 保留真实 runtime 0（不回退 base PlayerRoles）', () => {
    const gs = createHydratedStatusState()
    // 已走 hydrate，再由运行时变更为 0，不能与未初始化 fixture 混淆。
    gs.PlayerRolesRuntime.rgwHP[0] = 0
    gs.PlayerRolesRuntime.rgwMP[0] = 0
    gs.PlayerRolesRuntime.rgwLevel[0] = 0
    gs.PlayerRolesRuntime.rgwMaxHP[0] = 0
    gs.PlayerRolesRuntime.rgwMaxMP[0] = 0
    const roles = makeRoles()
    const state: PlayerStatusState = createPlayerStatus([0])
    const fb = sentinelFramebuffer()
    drawPlayerStatus({
      fb,
      state,
      gs,
      playerRoles: roles,
      items: [],
      uiSpriteFrames: makeUiFrames(),
      glyphs: uniformGlyphs,
    })
    expect(pixel(fb, rightDigitX(42, 4, 0), 56)).toBe(yellowDigit(0))
    expect(pixel(fb, rightDigitX(63, 4, 0), 61)).toBe(0xd0)
    expect(pixel(fb, rightDigitX(42, 4, 0), 78)).toBe(yellowDigit(0))
    expect(pixel(fb, rightDigitX(63, 4, 0), 83)).toBe(0xd0)
    expect(pixel(fb, rightDigitX(54, 2, 0), 35)).toBe(yellowDigit(0))
  })

  it('runtime 有值优先于 base：hp 41 画 41 非 base 99', () => {
    const gs = createHydratedStatusState()
    gs.PlayerRolesRuntime.rgwHP[0] = 41
    const state = createPlayerStatus([0])
    const fb = sentinelFramebuffer()
    drawPlayerStatus({
      fb,
      state,
      gs,
      playerRoles: makeRoles(),
      items: [],
      uiSpriteFrames: makeUiFrames(),
      glyphs: uniformGlyphs,
    })
    expect(pixel(fb, rightDigitX(42, 4, 0), 56)).toBe(yellowDigit(1))
    expect(pixel(fb, rightDigitX(42, 4, 1), 56)).toBe(yellowDigit(4))
  })

  it('G06-D01 当前真气 12 为黄，真气上限 80 为蓝', () => {
    const gs = makeGs()
    const roles = makeRoles()
    const items = [makeItem(70, '甲')]
    gs.partyMembers = [0]
    gs.PlayerRolesRuntime.rgwMP[0] = 12
    gs.PlayerRolesRuntime.rgwMaxMP[0] = 80
    const menu = createPlayerStatus([0])
    const frames = makeUiFrames()
    const fb = createFramebuffer()
    fillSentinel(fb)
    const before = cloneInputs({ gs, menu, items, roles, frames })
    drawPlayerStatus({
      fb,
      state: menu,
      gs,
      playerRoles: roles,
      items,
      uiSpriteFrames: frames,
      glyphs: positionGlyphs,
    })
    expect(pixel(fb, rightDigitX(42, 4, 0), 78)).toBe(yellowDigit(2))
    expect(pixel(fb, rightDigitX(42, 4, 1), 78)).toBe(yellowDigit(1))
    expect(pixel(fb, rightDigitX(63, 4, 0), 83)).toBe(blueDigit(0))
    expect(pixel(fb, rightDigitX(63, 4, 1), 83)).toBe(blueDigit(8))
    expect(cloneInputs({ gs, menu, items, roles, frames })).toEqual(before)
  })

  it('G06-D02 武术是基础 20 加装备效果 3', () => {
    const gs = makeGs()
    const roles = makeRoles()
    gs.partyMembers = [0]
    gs.PlayerRolesRuntime.rgwAttackStrength[0] = 20
    gs.rgEquipmentEffect[0]!.rgwAttackStrength[0] = 3
    const menu = createPlayerStatus([0])
    const fb = createFramebuffer()
    fillSentinel(fb)
    drawPlayerStatus({
      fb,
      state: menu,
      gs,
      playerRoles: roles,
      items: [],
      uiSpriteFrames: makeUiFrames(),
      glyphs: positionGlyphs,
    })
    expect(pixel(fb, rightDigitX(42, 4, 0), 102)).toBe(yellowDigit(3))
    expect(pixel(fb, rightDigitX(42, 4, 1), 102)).toBe(yellowDigit(2))
  })

  it('G06-D03 灵力是基础 4 加装备效果 10', () => {
    const gs = makeGs()
    gs.partyMembers = [0]
    gs.PlayerRolesRuntime.rgwMagicStrength[0] = 4
    gs.rgEquipmentEffect[2]!.rgwMagicStrength[0] = 10
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
    })
    expect(pixel(fb, rightDigitX(42, 4, 0), 122)).toBe(yellowDigit(4))
    expect(pixel(fb, rightDigitX(42, 4, 1), 122)).toBe(yellowDigit(1))
  })

  it('G06-D04 防御数字在 y=142', () => {
    const gs = makeGs()
    gs.partyMembers = [0]
    gs.PlayerRolesRuntime.rgwDefense[0] = 7
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
    })
    expect(pixel(fb, rightDigitX(42, 4, 0), 142)).toBe(yellowDigit(7))
    expect(pixel(fb, rightDigitX(42, 4, 1), 142)).toBe(SENTINEL)
  })

  it('G06-D05 身法数字在 y=162', () => {
    const gs = makeGs()
    gs.partyMembers = [0]
    gs.PlayerRolesRuntime.rgwDexterity[0] = 8
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
    })
    expect(pixel(fb, rightDigitX(42, 4, 0), 162)).toBe(yellowDigit(8))
  })

  it('G06-D06 吉运数字在 y=182', () => {
    const gs = makeGs()
    gs.partyMembers = [0]
    gs.PlayerRolesRuntime.rgwFleeRate[0] = 9
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
    })
    expect(pixel(fb, rightDigitX(42, 4, 0), 182)).toBe(yellowDigit(9))
  })

  it('G06-D07 经验斜杠坐标 (0,0) 不画，体力与真气斜杠照画', () => {
    const gs = makeGs()
    gs.partyMembers = [0]
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
    })
    expect(pixel(fb, 0, 0)).toBe(SENTINEL)
    expect(pixel(fb, 65, 58)).toBe(SLASH_ID)
    expect(pixel(fb, 65, 80)).toBe(SLASH_ID)
  })

  it('G06-D08 缺少斜杠帧时体力数字仍在，斜杠位保持底色', () => {
    const gs = makeGs()
    gs.partyMembers = [0]
    gs.PlayerRolesRuntime.rgwHP[0] = 12
    const fb = createFramebuffer()
    fillSentinel(fb)
    drawPlayerStatus({
      fb,
      state: createPlayerStatus([0]),
      gs,
      playerRoles: makeRoles(),
      items: [],
      uiSpriteFrames: uiFramesWithoutSlot(39),
      glyphs: positionGlyphs,
    })
    expect(pixel(fb, 65, 58)).toBe(SENTINEL)
    expect(pixel(fb, rightDigitX(42, 4, 0), 56)).toBe(yellowDigit(2))
  })

  it('G06-D09 未提供升级经验表时下一级只画一位青色 0，当前经验仍是 12', () => {
    const gs = makeGs()
    gs.partyMembers = [0]
    gs.PlayerRolesRuntime.rgwLevel[0] = 6
    gs.Exp.rgPrimaryExp[0] = { wExp: 12, wLevel: 6 }
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
    })
    expect(pixel(fb, rightDigitX(58, 5, 0), 15)).toBe(cyanDigit(0))
    expect(pixel(fb, rightDigitX(58, 5, 1), 15)).toBe(SENTINEL)
    expect(pixel(fb, rightDigitX(58, 5, 0), 6)).toBe(yellowDigit(2))
    expect(pixel(fb, rightDigitX(58, 5, 1), 6)).toBe(yellowDigit(1))
  })
})
