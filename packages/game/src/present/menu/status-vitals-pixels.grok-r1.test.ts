/**
 * TEST-GROK-RENDER-HOST-LARGE-1 G06-D。
 * 状态页的真气、五项能力、经验斜杠空位、毒的显示序号和缺名字装备。
 * 不重复 P07 的体力与经验，也不重复 glm 的 runtime 0 回退和缺目录跳过。
 */
import { afterEach, describe, expect, it } from 'vitest'
import type { IndexedImage } from '../../assets/png.js'
import { createPlayerStatus } from '../../core/menu/player-status.js'
import { setWordTable } from '../../core/word-lookup.js'
import { fixtureGlyphs, textDot } from '../__tests__/grok-present/font.js'
import {
  blueDigit,
  cyanDigit,
  fillSentinel,
  iconImage,
  makeUiFrames,
  pixel,
  rightDigitX,
  SENTINEL,
  SLASH_ID,
  yellowDigit,
} from '../__tests__/grok-present/images.js'
import {
  cloneInputs,
  makeGs,
  makeItem,
  makeRoles,
  resetHostSingletons,
} from '../__tests__/grok-present/world.js'
import { createFramebuffer } from '../framebuffer.js'
import { drawPlayerStatus } from './draw-player-status.js'

const glyphs = fixtureGlyphs()
const CONFIRMED = 0x2c
const EQUIPMENT = 0xbe

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

describe('G06-D 状态数值与毒', () => {
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
      glyphs,
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
      glyphs,
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
      glyphs,
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
      glyphs,
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
      glyphs,
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
      glyphs,
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
      glyphs,
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
      uiSpriteFrames: withoutFrame(39),
      glyphs,
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
      glyphs,
    })
    expect(pixel(fb, rightDigitX(58, 5, 0), 15)).toBe(cyanDigit(0))
    expect(pixel(fb, rightDigitX(58, 5, 1), 15)).toBe(SENTINEL)
    expect(pixel(fb, rightDigitX(58, 5, 0), 6)).toBe(yellowDigit(2))
    expect(pixel(fb, rightDigitX(58, 5, 1), 6)).toBe(yellowDigit(1))
  })

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
      glyphs,
      objectPoisons: new Map([[7, { level: 3, color: 15 }]]),
    })
    expect(pixel(fb, 185, 58)).toBe(25)
    expect(pixel(fb, 185, 58)).not.toBe(SENTINEL)
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
      glyphs,
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
      glyphs,
      objectPoisons: poisons,
    })
    expect(pixel(fb, 185, 184)).toBe(30)
    expect(pixel(fb, 185, 184)).not.toBe(50)
  })

  it('G06-D13 第一槽 id 为 0 时跳过，第二槽画出装备名', () => {
    const gs = makeGs()
    const roles = makeRoles()
    const bead = makeItem(71, '丑', { bitmap: 4 })
    gs.partyMembers = [0]
    gs.PlayerRolesRuntime.rgwEquipment[1]![0] = bead.id
    const frames = makeUiFrames()
    const icons = new Map([[4, iconImage(0x44)]])
    const fb = createFramebuffer()
    fillSentinel(fb)
    drawPlayerStatus({
      fb,
      state: createPlayerStatus([0]),
      gs,
      playerRoles: roles,
      items: [bead],
      uiSpriteFrames: frames,
      glyphs,
      itemIcons: icons,
    })
    const name = textDot('丑', 0, 253, 78)
    expect(pixel(fb, 195, 38)).toBe(SENTINEL)
    expect(pixel(fb, name.x, name.y)).toBe(EQUIPMENT)
    expect(pixel(fb, 248, 40)).toBe(0x44)
  })

  it('G06-D14 物品在目录里但没有名字时，名字位画出 0xBE 的缺字框', () => {
    const gs = makeGs()
    const item = makeItem(72, '子', { _name: undefined, bitmap: 3 })
    gs.partyMembers = [0]
    gs.PlayerRolesRuntime.rgwEquipment[0]![0] = item.id
    const fb = createFramebuffer()
    fillSentinel(fb)
    drawPlayerStatus({
      fb,
      state: createPlayerStatus([0]),
      gs,
      playerRoles: makeRoles(),
      items: [item],
      uiSpriteFrames: makeUiFrames(),
      glyphs,
    })
    expect(item._name).toBeUndefined()
    expect(pixel(fb, 195, 38)).toBe(EQUIPMENT)
  })

  it('G06-D15 没有立绘表时头像位保持底色，角色名仍是确认色', () => {
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
      glyphs,
    })
    const name = textDot('甲', 0, 110, 8)
    expect(pixel(fb, 110, 30)).toBe(SENTINEL)
    expect(pixel(fb, name.x, name.y)).toBe(CONFIRMED)
  })
})
