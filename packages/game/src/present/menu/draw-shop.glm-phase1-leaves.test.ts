/**
 * TEST-GLM-PHASE1-LEAVES-3 L12（draw-shop.ts）— 去重表：
 *  - grok-present P04（买列表/确认层/现有量/金钱、卖 overlay 售价一半）→ 不重复
 *  - 新差异：ownedCount = 库存 + 全队已装备（sdlpal uigame.c:1554-1577 跨 role × slot）、
 *    空店铺列表（owned 0、无图标、不崩）、drawSellOverlay 光标项非 sellable → 框画但
 *    售价 label 与数字都不画、cursorItemId 缺省同。
 */
import { describe, expect, it } from 'vitest'
import {
  BOX_STYLE0,
  fixtureGlyphs,
  makeUiFrames,
  mkItem,
  newFb,
  pixel,
  rightDigitX,
  textDot,
} from '../../__tests__/glm-phase1-leaves/present-fixtures.js'
import type { GameState } from '../../core/game-state.js'
import { createInitialGameState } from '../../core/game-state.js'
import { createBuyMenu } from '../../core/menu/shop-menu.js'
import { drawSellOverlay, drawShopMenu } from './draw-shop.js'

const glyphs = fixtureGlyphs

const SWORD = mkItem(400, '甲', { price: 50, flags: { sellable: true, equipable: true } })

function gsForShop(): GameState {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  gs.dwCash = 7
  gs.partyMembers = [0, 1]
  gs.inventory = [{ itemId: 400, count: 2 }]
  gs.PlayerRolesRuntime.rgwEquipment[3]![0] = 400 // 甲 已装备 1 件（role0 饰品槽）
  return gs
}

describe('L12 drawShopMenu 剩余分支', () => {
  it('ownedCount = 库存 2 + 跨队已装备 1 = 3（uigame.c:1554-1577）', () => {
    const gs = gsForShop()
    const state = createBuyMenu([SWORD])
    const fb = newFb()
    drawShopMenu({ fb, state, gs, items: [SWORD], uiSpriteFrames: makeUiFrames(), glyphs })
    // 「现有」数 right 6 位：个位在 rightDigitX(69,6,0)=99
    expect(pixel(fb, rightDigitX(69, 6, 0), 115)).toBe(0xb3) // yellowDigit(3)
    // 金钱 7 个位在 rightDigitX(69,6,0)=99, y=156
    expect(pixel(fb, rightDigitX(69, 6, 0), 156)).toBe(0xb7)
  })

  it('空店铺列表：框与两单行框照画，owned 0、无图标、不崩', () => {
    const gs = gsForShop()
    const state = createBuyMenu([])
    const fb = newFb()
    drawShopMenu({ fb, state, gs, items: [], uiSpriteFrames: makeUiFrames(), glyphs })
    expect(pixel(fb, 130, 16)).toBe(0x22) // style1 列表框内部
    expect(pixel(fb, rightDigitX(69, 6, 0), 115)).toBe(0xb0) // owned 0
    expect(pixel(fb, 48, 15)).toBe(0x5a) // 无选中 → 预览图标未画
  })
})

describe('L12 drawSellOverlay 剩余分支', () => {
  it('光标项非 sellable：两框照画，售价 label 与数字不画', () => {
    const gs = gsForShop()
    const unsellable = mkItem(401, '乙', { price: 30 }) // sellable=false
    const fb = newFb()
    drawSellOverlay({
      fb,
      gs,
      items: [unsellable],
      cursorItemId: 401,
      uiSpriteFrames: makeUiFrames(),
      glyphs,
    })
    // 金钱框 @(100,150) 内部 style0；金钱 label 黑点
    expect(pixel(fb, 110, 154)).toBe(BOX_STYLE0)
    // 售价框 @(224,150) 内部照画，但 label 位（字形亮点 y=164 在阴影带 156..163 之外）无字
    expect(pixel(fb, 234, 154)).toBe(BOX_STYLE0)
    expect(pixel(fb, 238, 164)).toBe(0x5a)
    // 金钱数字照画：cash 7 个位在 rightDigitX(148,6,0)=178
    expect(pixel(fb, rightDigitX(148, 6, 0), 165)).toBe(0xb7)
  })

  it('cursorItemId 缺省（空 grid）：售价框照画、无 label；sellable 项画半价', () => {
    const gs = gsForShop()
    const fb = newFb()
    drawSellOverlay({ fb, gs, items: [SWORD], uiSpriteFrames: makeUiFrames(), glyphs })
    expect(pixel(fb, 238, 164)).toBe(0x5a) // 无 cursorItemId → 不画售价
    const fb2 = newFb()
    drawSellOverlay({
      fb: fb2,
      gs,
      items: [SWORD],
      cursorItemId: 400,
      uiSpriteFrames: makeUiFrames(),
      glyphs,
    })
    // 售价 = floor(50/2) = 25 → 个位 5、十位 2 右对齐 6 位
    expect(pixel(fb2, rightDigitX(272, 6, 0), 165)).toBe(0xb5)
    expect(pixel(fb2, rightDigitX(272, 6, 1), 165)).toBe(0xb2)
    const shouDot = textDot('售', 0, 234, 160)
    expect(pixel(fb2, shouDot.x, shouDot.y)).toBe(0) // label 黑字（无影）
  })
})
