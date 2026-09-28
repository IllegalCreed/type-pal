/**
 * TEST-GLM-PHASE1-LEAVES-3 L11（draw-equip.ts）— 去重表：
 *  - grok-present P03（装备列表不可装备暗色/选人页六槽名称+预览+背景）→ 不重复
 *  - 新差异：角色身份非顺序 party [3,1]（equipableBy 按 roleId 位、选中映射按 party 序）、
 *    已装备槽 itemId 不在 catalog → 画 `?id` tofu、空槽（0）不画、roles 缺该 roleId 跳过。
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
import { confirmEquipItem, createEquipMenu } from '../../core/menu/equip-menu.js'
import { drawEquipMenu } from './draw-equip.js'

const glyphs = fixtureGlyphs

const SWORD = mkItem(500, '丁', {
  flags: { equipable: true, equipableBy: [false, false, false, true, false, false] }, // 仅 role 3 可装
})

function gsForEquip(): GameState {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  gs.partyMembers = [3, 1]
  gs.inventory = [{ itemId: 500, count: 1 }]
  return gs
}

describe('L11 drawEquipMenu 剩余分支', () => {
  it('pick-role 非顺序 party [3,1]：equipableBy 按 roleId 位着色，选中高亮按 party 序', () => {
    const gs = gsForEquip()
    const roles = makeRoles()
    const state = createEquipMenu(gs, [SWORD])
    state.list.cursor = 0
    confirmEquipItem(state, [SWORD], roles, gs.partyMembers)
    expect(state.phase).toBe('pick-role')
    expect(state.selectedItemId).toBe(500)
    const fb = newFb()
    const restore = freezeNow(0)
    try {
      drawEquipMenu({
        fb,
        state,
        gs,
        playerRoles: roles,
        items: [SWORD],
        uiSpriteFrames: makeUiFrames(),
        glyphs,
      })
    } finally {
      restore()
    }
    // role list: party[0]=role3(丁) 可装且选中 → 0xF9；party[1]=role1(乙) 位 false → 0x18
    const dingDot = textDot('丁', 0, 15, 95 + 13)
    const yiDot = textDot('乙', 0, 15, 95 + 13 + 18)
    expect(pixel(fb, dingDot.x, dingDot.y)).toBe(0xf9)
    expect(pixel(fb, yiDot.x, yiDot.y)).toBe(0x18)
  })

  it('已装备槽 itemId 不在 catalog → `?id` tofu；空槽（0）不画', () => {
    const gs = gsForEquip()
    gs.PlayerRolesRuntime.rgwEquipment[0]![3] = 777 // 未知装备
    // slot 1..5 保持 0
    const roles = makeRoles()
    const state = createEquipMenu(gs, [SWORD])
    state.list.cursor = 0
    confirmEquipItem(state, [SWORD], roles, gs.partyMembers)
    const fb = newFb()
    const restore = freezeNow(0)
    try {
      drawEquipMenu({
        fb,
        state,
        gs,
        playerRoles: roles,
        items: [SWORD],
        uiSpriteFrames: makeUiFrames(),
        glyphs,
      })
    } finally {
      restore()
    }
    // slot0 名字位 (130,11)：tofu 顶行非 sentinel（画了 ?777）
    expect(pixel(fb, 130, 11)).not.toBe(0x5a)
    // slot1 名字位 (130,33)：空槽不画 → 保持 sentinel
    expect(pixel(fb, 130, 33)).toBe(0x5a)
  })

  it('roles 缺 party 中某 roleId：该行跳过不崩，另一行正常', () => {
    const gs = gsForEquip()
    const base = makeRoles().roles
    const roles: import('@type-pal/shared').PlayerRoles = { roles: [] }
    roles.roles[0] = base[0]! // 稀疏数组：roleId 1..5 缺（index 语义）
    roles.roles[3] = base[3]!
    const state = createEquipMenu(gs, [SWORD])
    state.list.cursor = 0
    confirmEquipItem(state, [SWORD], roles, gs.partyMembers)
    const fb = newFb()
    const restore = freezeNow(0)
    try {
      drawEquipMenu({
        fb,
        state,
        gs,
        playerRoles: roles,
        items: [SWORD],
        uiSpriteFrames: makeUiFrames(),
        glyphs,
      })
    } finally {
      restore()
    }
    const dingDot = textDot('丁', 0, 15, 95 + 13)
    expect(pixel(fb, dingDot.x, dingDot.y)).toBe(0xf9)
    expect(pixel(fb, 15, 95 + 13 + 18)).toBe(0x5a) // 乙行未画
  })
})
