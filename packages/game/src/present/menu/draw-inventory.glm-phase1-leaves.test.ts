/**
 * TEST-GLM-PHASE1-LEAVES-3 L10（draw-inventory.ts）— 去重表：
 *  - grok-present P01/P02（列表/光标/空表/翻页/六色/数量/目标层统计/现库存 live/noDesc）→ 不重复
 *  - 新差异：目录缺 item → label `?id` tofu + 选中 0x1C / 未选中 0x18（可用判定安全为否）、
 *    可用项与未知项混列各归其色、use-target 相缺 gs/playerRoles 转发 → 只画 list 不叠选人层。
 */
import { describe, expect, it } from 'vitest'
import {
  fixtureGlyphs,
  freezeNow,
  makeRoles,
  makeUiFrames,
  mkItem,
  newFb,
  pixel,
  textDot,
} from '../../__tests__/glm-phase1-leaves/present-fixtures.js'
import type { GameState } from '../../core/game-state.js'
import { createInitialGameState } from '../../core/game-state.js'
import { confirmInventoryItem, createInventoryMenu } from '../../core/menu/inventory-menu.js'
import { drawInventoryMenu } from './draw-inventory.js'

const glyphs = fixtureGlyphs

function gsWith(entries: { itemId: number; count: number }[]): GameState {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  gs.inventory = entries
  return gs
}

describe('L10 drawInventoryMenu 剩余分支', () => {
  it('库存条目 itemId 不在 catalog 且被选中：label ?id（tofu 顶行）+ SELECTED_INACTIVE 0x1C', () => {
    const gs = gsWith([{ itemId: 999, count: 3 }])
    const state = createInventoryMenu(gs, [], 'all')
    const fb = newFb()
    const restore = freezeNow(0)
    try {
      drawInventoryMenu({ fb, state, items: [], uiSpriteFrames: makeUiFrames(), glyphs })
    } finally {
      restore()
    }
    // 光标默认在 0（该未知条目）：isUsable false + isSelected → 0x1C；label 首 tofu 像素 (15,12)
    expect(pixel(fb, 15, 12)).toBe(0x1c)
  })

  it('未知项与可用项混列：未知 0x18（未选中），可用项被选中 0xF9', () => {
    const herb = mkItem(10, '甲', { flags: { usable: true, consuming: true } })
    const gs = gsWith([
      { itemId: 999, count: 1 },
      { itemId: 10, count: 1 },
    ])
    const state = createInventoryMenu(gs, [herb], 'usable')
    state.cursor = 1
    const fb = newFb()
    const restore = freezeNow(0)
    try {
      drawInventoryMenu({
        fb,
        state,
        items: [herb],
        uiSpriteFrames: makeUiFrames(),
        glyphs,
        itemIcons: new Map(),
      })
    } finally {
      restore()
    }
    expect(pixel(fb, 15, 12)).toBe(0x18) // 未知项未选中 → INACTIVE
    const herbDot = textDot('甲', 0, 15 + 100, 12) // 第 2 列
    expect(pixel(fb, herbDot.x, herbDot.y)).toBe(0xf9)
  })

  it('use-target 相缺 gs/playerRoles：只画 list，不叠选人层（防御组合不崩）', () => {
    const herb = mkItem(10, '甲', { flags: { usable: true } })
    const gs = gsWith([{ itemId: 10, count: 2 }])
    const state = createInventoryMenu(gs, [herb], 'usable')
    confirmInventoryItem(state, [herb], makeRoles(), gs.partyMembers)
    expect(state.phase).toBe('use-target')
    const fb = newFb()
    const restore = freezeNow(0)
    try {
      drawInventoryMenu({
        fb,
        state,
        items: [herb],
        uiSpriteFrames: makeUiFrames(),
        glyphs,
        // 故意不传 gs / playerRoles → 选人层不画
      })
    } finally {
      restore()
    }
    expect(pixel(fb, 120, 10)).not.toBe(0x11) // 选人层 box (110,2) 未画
  })
})
