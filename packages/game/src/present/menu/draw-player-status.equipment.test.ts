import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { beginChineseMenuText } from '../../__tests__/menu-text-fixture.js'
import { createPlayerStatus } from '../../core/menu/player-status.js'
import { fixtureGlyphs, textDot } from '../__tests__/glyph-fixtures.js'
import { makeGs, makeItem, makeRoles } from '../__tests__/menu-state-fixtures.js'
import { makeUiFrames } from '../__tests__/menu-ui-fixtures.js'
import {
  fillSentinel,
  iconImage,
  pixel,
  SENTINEL,
  sentinelFramebuffer,
} from '../__tests__/raster-fixtures.js'
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

describe('Player status equipment and portrait', () => {
  it('装备槽 itemId 不在 catalog：该槽图标与名字都跳过（不 `?id`，与 draw-equip 不同合同）', () => {
    const gs = createHydratedStatusState()
    gs.PlayerRolesRuntime.rgwEquipment[0]![0] = 888 // 未知
    gs.PlayerRolesRuntime.rgwHP[0] = 41
    const state = createPlayerStatus([0])
    const fb = sentinelFramebuffer()
    drawPlayerStatus({
      fb,
      state,
      gs,
      playerRoles: makeRoles(),
      items: [], // catalog 空
      uiSpriteFrames: makeUiFrames(),
      itemIcons: new Map([
        [0, { width: 1, height: 1, indices: Uint8Array.of(0x99), opaque: Uint8Array.of(1) }],
      ]),
      glyphs: uniformGlyphs,
    })
    // slot0 名字位 (195,38) 保持 sentinel（item find 失败 → continue）
    expect(pixel(fb, 195, 38)).toBe(0x5a)
    expect(pixel(fb, 190, 0)).toBe(0x5a)
  })

  it('G06-D13 第一槽 id 为 0 时跳过，第二槽画出装备名', () => {
    const gs = makeGs()
    const roles = makeRoles()
    const equippedItem = makeItem(71, '丑', {
      bitmap: 4,
      flags: { equipable: true, equipableBy: [true, false, false, false, false, false] },
    })
    gs.partyMembers = [0]
    gs.PlayerRolesRuntime.rgwEquipment[1]![0] = equippedItem.id
    const frames = makeUiFrames()
    const icons = new Map([[4, iconImage(0x44)]])
    const fb = createFramebuffer()
    fillSentinel(fb)
    drawPlayerStatus({
      fb,
      state: createPlayerStatus([0]),
      gs,
      playerRoles: roles,
      items: [equippedItem],
      uiSpriteFrames: frames,
      glyphs: positionGlyphs,
      itemIcons: icons,
    })
    const name = textDot('丑', 0, 253, 78)
    expect(pixel(fb, 195, 38)).toBe(SENTINEL)
    expect(pixel(fb, name.x, name.y)).toBe(EQUIPMENT)
    expect(pixel(fb, 248, 40)).toBe(0x44)
  })

  it('G06-D14 物品在目录里但没有名字时，名字位画出 0xBE 的缺字框', () => {
    const gs = makeGs()
    const item = makeItem(72, '子', {
      _name: undefined,
      bitmap: 3,
      flags: { equipable: true, equipableBy: [true, false, false, false, false, false] },
    })
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
      glyphs: positionGlyphs,
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
      glyphs: positionGlyphs,
    })
    const name = textDot('甲', 0, 110, 8)
    expect(pixel(fb, 110, 30)).toBe(SENTINEL)
    expect(pixel(fb, name.x, name.y)).toBe(CONFIRMED)
  })
})
