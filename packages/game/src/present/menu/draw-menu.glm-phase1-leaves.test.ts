/**
 * TEST-GLM-PHASE1-LEAVES-3 L09（draw-menu.ts）— 去重表：
 *  - draw-menu.test（空栈/in-game box+cash 框存在/system box/system confirm 叠框/两层栈/缺帧抛错）→ 不重复
 *  - grok-present P05（物品/图标/角色经栈转发、equipBg、状态页背景+毒）→ 不重复
 *  - 新差异：save-slot 槽位框+标签+savedTimes 数字、inventory-action 框+两标签选中色、
 *    缺 extra 的 player-status/equip/in-game-magic 占位框（Missing menu data）、
 *    shop-sell 栈项 confirm 相叠 否/是 层、system switch 相 关/开 层。
 * 实际 Framebuffer 像素断言；输入深快照不变。
 */
import { afterEach, describe, expect, it } from 'vitest'
import {
  BOX_STYLE0,
  fixtureGlyphs,
  freezeNow,
  makeGs,
  makeUiFrames,
  newFb,
  pixel,
  rightDigitX,
  textDot,
  yellowDigit,
} from '../../__tests__/glm-phase1-leaves/present-fixtures.js'
import { createInitialGameState } from '../../core/game-state.js'
import { createSystemMenu, systemMenuEnterSwitch } from '../../core/menu/in-game-menu.js'
import { createInventoryActionMenu } from '../../core/menu/inventory-action-menu.js'
import { openMenu } from '../../core/menu/menu-mode.js'
import { createSaveSlotMenu } from '../../core/menu/save-slot-menu.js'
import { createSellMenu } from '../../core/menu/sell-menu.js'
import { setWordTable } from '../../core/word-lookup.js'
import { drawMenuStack } from './draw-menu.js'

const glyphs = fixtureGlyphs

afterEach(() => setWordTable([]))

describe('L09 drawMenuStack 剩余分支', () => {
  it('save-slot：5 个单行框 (195,7+38i)、标签字色、slotMetas.savedTimes 黄色数字（缺省 0）', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const state = createSaveSlotMenu('save')
    state.slotMetas.set(2, {
      partyLevel: 1,
      cash: 0,
      sceneId: 0,
      savedAt: 0,
      savedTimes: 12,
    })
    openMenu(gs, { kind: 'save-slot', state })
    const fb = newFb()
    const frames = makeUiFrames()
    const inputs = { gs, state, frames }
    const before = structuredClone(inputs)
    const restore = freezeNow(0)
    try {
      drawMenuStack(fb, gs, frames, glyphs)
    } finally {
      restore()
    }
    expect(structuredClone(inputs)).toEqual(before)
    // 框体：每行 box 内部应是 style0 素色（左框 mid 段）
    expect(pixel(fb, 200, 11)).toBe(BOX_STYLE0)
    expect(pixel(fb, 200, 7 + 38 * 4 + 3)).toBe(BOX_STYLE0)
    // 槽 1 标签「进度一」第 0 字亮点 = 选中闪烁 0xF9（冻结 tick 0）
    const label1 = textDot('进度一', 0, 210, 17)
    expect(pixel(fb, label1.x, label1.y)).toBe(0xf9)
    // 槽 2 有 meta.savedTimes=12 → 个位/十位黄 2/1；槽 1 无 meta → 0
    expect(pixel(fb, rightDigitX(270, 4, 0), 21 + 38)).toBe(yellowDigit(2))
    expect(pixel(fb, rightDigitX(270, 4, 1), 21 + 38)).toBe(yellowDigit(1))
    expect(pixel(fb, rightDigitX(270, 4, 0), 21)).toBe(yellowDigit(0))
    // 第 5 槽框体 + 标签（非选中 0x4F）
    const label5 = textDot('进度五', 0, 210, 17 + 38 * 4)
    expect(pixel(fb, label5.x, label5.y)).toBe(0x4f)
  })

  it('inventory-action：框 (30,60)、装备/使用两标签、cursor 0 选中闪烁、切光标后选中移动', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const state = createInventoryActionMenu()
    openMenu(gs, { kind: 'inventory-action', state })
    const frames = makeUiFrames()
    const equipDot = textDot('装备', 0, 43, 73)
    const useDot = textDot('使用', 0, 43, 91)
    const fb = newFb()
    const restore = freezeNow(0)
    try {
      drawMenuStack(fb, gs, frames, glyphs)
    } finally {
      restore()
    }
    expect(pixel(fb, 40, 64)).toBe(BOX_STYLE0)
    expect(pixel(fb, equipDot.x, equipDot.y)).toBe(0xf9)
    expect(pixel(fb, useDot.x, useDot.y)).toBe(0x4f)
    // Down 一次 → 使用 选中
    const fb2 = newFb()
    state.selection.cursor = 1
    const restore2 = freezeNow(0)
    try {
      drawMenuStack(fb2, gs, frames, glyphs)
    } finally {
      restore2()
    }
    expect(pixel(fb2, useDot.x, useDot.y)).toBe(0xf9)
    expect(pixel(fb2, equipDot.x, equipDot.y)).toBe(0x4f)
  })

  it('system switch 相：叠 关/开 选框（confirmYes=false → 左「关」选中）', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const state = createSystemMenu()
    systemMenuEnterSwitch(state, 'music', false)
    openMenu(gs, { kind: 'system', state })
    const fb = newFb()
    const restore = freezeNow(0)
    try {
      drawMenuStack(fb, gs, makeUiFrames(), glyphs)
    } finally {
      restore()
    }
    const guanDot = textDot('关', 0, 145, 110)
    const kaiDot = textDot('开', 0, 220, 110)
    expect(pixel(fb, guanDot.x, guanDot.y)).toBe(0xf9) // 左选中
    expect(pixel(fb, kaiDot.x, kaiDot.y)).toBe(0x4f)
  })

  it('shop-sell 栈项：confirm 相在 grid+overlay 之上叠 否/是 确认层', () => {
    const gs = makeGs()
    const state = createSellMenu(gs, [])
    state.phase = 'confirm' // 直造 confirm 相（渲染分支）
    state.confirmYes = true
    openMenu(gs, { kind: 'shop-sell', state })
    const fb = newFb()
    const restore = freezeNow(0)
    try {
      drawMenuStack(fb, gs, makeUiFrames(), glyphs)
    } finally {
      restore()
    }
    const shiDot = textDot('是', 0, 220, 110)
    const fouDot = textDot('否', 0, 145, 110)
    expect(pixel(fb, shiDot.x, shiDot.y)).toBe(0xf9) // confirmYes=true → 右「是」选中
    expect(pixel(fb, fouDot.x, fouDot.y)).toBe(0x4f)
  })

  it('缺 extra：player-status / equip / in-game-magic 画占位框 (80,80)，不抛错', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    for (const kind of ['player-status', 'equip', 'in-game-magic'] as const) {
      gs.menuStack.length = 0
      openMenu(gs, { kind, state: { cursor: 0, partyMembers: [0], done: false } })
      const fb = newFb()
      drawMenuStack(fb, gs, makeUiFrames(), glyphs)
      expect(pixel(fb, 90, 90)).toBe(BOX_STYLE0) // 占位 box 1×14 内部
      // 占位文字 tofu 首行像素（renderText 缺字形 → tofu 框顶行全亮）
      expect(pixel(fb, 96, 88)).toBe(0x4f)
    }
  })
})
