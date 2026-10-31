import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { beginChineseMenuText } from '../../__tests__/menu-text-fixture.js'
import { createPlayerStatus, playerStatusNext } from '../../core/menu/player-status.js'
import { fixtureGlyphs, textDot } from '../__tests__/glyph-fixtures.js'
import { makeGs, makeItem, makeRoles } from '../__tests__/menu-state-fixtures.js'
import {
  blueDigit,
  cyanDigit,
  makeUiFrames,
  rightDigitX,
  yellowDigit,
} from '../__tests__/menu-ui-fixtures.js'
import {
  fillSentinel,
  iconImage,
  pixel,
  SENTINEL,
  sentinelFramebuffer,
} from '../__tests__/raster-fixtures.js'
import { cloneInputs } from '../__tests__/render-input-snapshots.js'
import { createHydratedStatusState } from '../__tests__/status-state-fixtures.js'
import { uniformDotGlyphs } from '../__tests__/uniform-glyphs.js'
import { createFramebuffer } from '../framebuffer.js'
import { drawPlayerStatus } from './draw-player-status.js'

const uniformGlyphs = uniformDotGlyphs()

const positionGlyphs = fixtureGlyphs()

const CONFIRMED = 0x2c

const EQUIPMENT = 0xbe

let restoreMenuText: () => void

beforeEach(() => {
  restoreMenuText = beginChineseMenuText()
})

afterEach(() => {
  restoreMenuText()
})

describe('Player status entry and selected role', () => {
  it('cursor 越界 / roles 缺 roleId：早退不画不崩', () => {
    const gs = createHydratedStatusState()
    const outside = createPlayerStatus([0])
    outside.cursor = 5
    for (const input of [
      { state: outside, playerRoles: makeRoles() },
      { state: createPlayerStatus([0]), playerRoles: { roles: [] } },
    ]) {
      const fb = sentinelFramebuffer()
      const before = fb.indices.slice()
      drawPlayerStatus({
        fb,
        gs,
        ...input,
        items: [],
        uiSpriteFrames: makeUiFrames(),
        glyphs: uniformGlyphs,
      })
      expect(fb.indices).toEqual(before)
    }
  })

  it('P07 非空装备、立绘、经验和HP按当前角色画出，绘制不改状态', () => {
    const gs = makeGs()
    const roles = makeRoles()
    const equippedItem = makeItem(61, '子', {
      bitmap: 5,
      flags: { equipable: true, equipableBy: [false, false, false, false, true, false] },
    })
    const items = [equippedItem]
    gs.partyMembers = [4, 1]
    gs.PlayerRolesRuntime.rgwEquipment[0]![4] = equippedItem.id
    gs.PlayerRolesRuntime.rgwLevel[4] = 6
    gs.PlayerRolesRuntime.rgwHP[4] = 12
    gs.PlayerRolesRuntime.rgwMaxHP[4] = 80
    gs.PlayerRolesRuntime.rgwMP[4] = 7
    gs.PlayerRolesRuntime.rgwMaxMP[4] = 40
    gs.Exp.rgPrimaryExp[4] = { wExp: 12, wLevel: 6 }
    gs.PlayerRolesRuntime.rgwLevel[1] = 2
    gs.PlayerRolesRuntime.rgwHP[1] = 34
    roles.roles[4]!.level = 1
    roles.roles[4]!.hp = 99
    const menu = createPlayerStatus(gs.partyMembers)
    const frames = makeUiFrames()
    const icons = new Map([[5, iconImage(0x85)]])
    const portraits = new Map([
      [5, iconImage(0x95)],
      [2, iconImage(0x92)],
    ])
    const levelUpExp = Array<number>(10).fill(0)
    levelUpExp[6] = 40
    const bg = { width: 4, height: 4, indices: new Uint8Array(16).fill(0x56) }
    const fb = createFramebuffer()
    fillSentinel(fb)
    const input = {
      fb,
      state: menu,
      gs,
      playerRoles: roles,
      items,
      uiSpriteFrames: frames,
      glyphs: positionGlyphs,
      portraitIcons: portraits,
      itemIcons: icons,
      levelUpExp,
    }
    const plain = { gs, menu, items, roles, frames, icons, portraits, levelUpExp }
    const beforePlain = cloneInputs(plain)
    drawPlayerStatus(input)
    expect(cloneInputs(plain)).toEqual(beforePlain)
    expect(pixel(fb, 1, 1)).toBe(SENTINEL)
    fillSentinel(fb)
    const painted = { ...plain, statusBg: bg }
    const before = cloneInputs(painted)
    drawPlayerStatus({ ...input, statusBg: bg })
    expect(cloneInputs(painted)).toEqual(before)
    expect(pixel(fb, 1, 1)).toBe(0x56)
    expect(pixel(fb, 110, 30)).toBe(0x95)
    expect(pixel(fb, 190, 0)).toBe(0x85)
    expect(pixel(fb, textDot('子', 0, 195, 38).x, textDot('子', 0, 195, 38).y)).toBe(EQUIPMENT)
    expect(pixel(fb, textDot('戊', 0, 110, 8).x, textDot('戊', 0, 110, 8).y)).toBe(CONFIRMED)
    expect(pixel(fb, rightDigitX(58, 5, 0), 6)).toBe(yellowDigit(2))
    expect(pixel(fb, rightDigitX(58, 5, 1), 6)).toBe(yellowDigit(1))
    expect(pixel(fb, rightDigitX(58, 5, 0), 15)).toBe(cyanDigit(0))
    expect(pixel(fb, rightDigitX(58, 5, 1), 15)).toBe(cyanDigit(4))
    expect(pixel(fb, rightDigitX(54, 2, 0), 35)).toBe(yellowDigit(6))

    expect(pixel(fb, rightDigitX(42, 4, 0), 56)).toBe(yellowDigit(2))
    expect(pixel(fb, rightDigitX(63, 4, 1), 61)).toBe(blueDigit(8))

    playerStatusNext(menu)
    expect(menu.cursor).toBe(1)
    expect(menu.done).toBe(false)
    fillSentinel(fb)
    const switchedInputs = { ...plain, statusBg: bg }
    const switched = cloneInputs(switchedInputs)
    drawPlayerStatus({ ...input, statusBg: bg })
    expect(cloneInputs(switchedInputs)).toEqual(switched)
    expect(pixel(fb, textDot('乙', 0, 110, 8).x, textDot('乙', 0, 110, 8).y)).toBe(CONFIRMED)
    expect(pixel(fb, textDot('戊', 0, 110, 8).x, textDot('戊', 0, 110, 8).y)).not.toBe(CONFIRMED)
    expect(pixel(fb, 110, 30)).toBe(0x92)
    expect(pixel(fb, rightDigitX(42, 4, 0), 56)).toBe(yellowDigit(4))
    expect(pixel(fb, textDot('子', 0, 195, 38).x, textDot('子', 0, 195, 38).y)).not.toBe(EQUIPMENT)
    expect(gs.PlayerRolesRuntime.rgwHP[4]).toBe(12)
    expect(roles.roles[4]!.hp).toBe(99)
  })
})
