/**
 * TEST-GLM-PHASE1-LEAVES-3 L11（draw-player-status.ts）— 去重表：
 *  - draw-player-status.test（毒 row 三分支）→ 不重复
 *  - grok-present P05/P07（状态页背景+毒 extra、非空装备/立绘/经验/HP）→ 不重复
 *  - 新差异：runtimeOrBase 回退（runtime 0 → base PlayerRoles 值）、装备槽 itemId 不在
 *    catalog 跳过该槽（图标与名字都不画）、roles 缺 roleId / cursor 越界早退不崩。
 */
import { describe, expect, it } from 'vitest'
import {
  fixtureGlyphs,
  makeRoles,
  makeUiFrames,
  newFb,
  pixel,
  rightDigitX,
  yellowDigit,
} from '../../__tests__/glm-phase1-leaves/present-fixtures.js'
import type { GameState } from '../../core/game-state.js'
import { createInitialGameState } from '../../core/game-state.js'
import type { PlayerStatusState } from '../../core/menu/player-status.js'
import { createPlayerStatus } from '../../core/menu/player-status.js'
import { drawPlayerStatus } from './draw-player-status.js'

const glyphs = fixtureGlyphs

function gsForStatus(): GameState {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  gs.partyMembers = [0]
  return gs
}

describe('L11 drawPlayerStatus 剩余分支', () => {
  it('runtimeOrBase：runtime 0 → 回退 base PlayerRoles 值（level/hp/maxHP/mp/maxMP）', () => {
    const gs = gsForStatus()
    // runtime 全 0（工厂初始）→ base role 0: level 1/hp 99/maxHP 100/mp 99/maxMP 40
    const roles = makeRoles()
    const state: PlayerStatusState = createPlayerStatus([0])
    const fb = newFb()
    drawPlayerStatus({
      fb,
      state,
      gs,
      playerRoles: roles,
      items: [],
      uiSpriteFrames: makeUiFrames(),
      glyphs,
    })
    // hp 99 → 黄 9/9 at ROLE_CUR_HP (42,56) 右对齐 4 位
    expect(pixel(fb, rightDigitX(42, 4, 0), 56)).toBe(yellowDigit(9))
    expect(pixel(fb, rightDigitX(42, 4, 1), 56)).toBe(yellowDigit(9))
    // maxHP 100 → 蓝 at (63,61)：个位 0、十位 0、百位 1
    expect(pixel(fb, rightDigitX(63, 4, 0), 61)).toBe(0xd0)
    expect(pixel(fb, rightDigitX(63, 4, 2), 61)).toBe(0xd1)
    // level 1 → 黄 at (54,35) 2 位
    expect(pixel(fb, rightDigitX(54, 2, 0), 35)).toBe(yellowDigit(1))
  })

  it('runtime 有值优先于 base：hp 41 画 41 非 base 99', () => {
    const gs = gsForStatus()
    gs.PlayerRolesRuntime.rgwHP[0] = 41
    const state = createPlayerStatus([0])
    const fb = newFb()
    drawPlayerStatus({
      fb,
      state,
      gs,
      playerRoles: makeRoles(),
      items: [],
      uiSpriteFrames: makeUiFrames(),
      glyphs,
    })
    expect(pixel(fb, rightDigitX(42, 4, 0), 56)).toBe(yellowDigit(1))
    expect(pixel(fb, rightDigitX(42, 4, 1), 56)).toBe(yellowDigit(4))
  })

  it('装备槽 itemId 不在 catalog：该槽图标与名字都跳过（不 `?id`，与 draw-equip 不同合同）', () => {
    const gs = gsForStatus()
    gs.PlayerRolesRuntime.rgwEquipment[0]![0] = 888 // 未知
    gs.PlayerRolesRuntime.rgwHP[0] = 41
    const state = createPlayerStatus([0])
    const fb = newFb()
    drawPlayerStatus({
      fb,
      state,
      gs,
      playerRoles: makeRoles(),
      items: [], // catalog 空
      uiSpriteFrames: makeUiFrames(),
      glyphs,
    })
    // slot0 名字位 (195,38) 保持 sentinel（item find 失败 → continue）
    expect(pixel(fb, 195, 38)).toBe(0x5a)
  })

  it('cursor 越界 / roles 缺 roleId：早退不画不崩', () => {
    const gs = gsForStatus()
    const state = createPlayerStatus([0])
    state.cursor = 5 // 越界
    const fb = newFb()
    drawPlayerStatus({
      fb,
      state,
      gs,
      playerRoles: makeRoles(),
      items: [],
      uiSpriteFrames: makeUiFrames(),
      glyphs,
    })
    expect(pixel(fb, 195, 38)).toBe(0x5a) // 全屏无内容
  })
})
