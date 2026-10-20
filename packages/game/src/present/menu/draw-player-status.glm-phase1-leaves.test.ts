/**
 * TEST-GLM-PHASE1-LEAVES-3 L11（draw-player-status.ts）— 去重表：
 *  - draw-player-status.test（毒 row 三分支）→ 不重复
 *  - grok-present P05/P07（状态页背景+毒 extra、非空装备/立绘/经验/HP）→ 不重复
 *  - 新差异：已初始化 runtime 的零值（不回退静态属性）、装备槽 itemId 不在
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
import { createInitialGameState, hydratePlayerRolesRuntime } from '../../core/game-state.js'
import type { PlayerStatusState } from '../../core/menu/player-status.js'
import { createPlayerStatus } from '../../core/menu/player-status.js'
import { drawPlayerStatus } from './draw-player-status.js'

const glyphs = fixtureGlyphs

function gsForStatus(): GameState {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  gs.partyMembers = [0]
  hydratePlayerRolesRuntime(gs.PlayerRolesRuntime, makeRoles())
  return gs
}

describe('L11 drawPlayerStatus 剩余分支', () => {
  it('runtime 0 → 保留真实 runtime 0（不回退 base PlayerRoles）', () => {
    const gs = gsForStatus()
    // 已走 hydrate，再由运行时变更为 0，不能与未初始化 fixture 混淆。
    gs.PlayerRolesRuntime.rgwHP[0] = 0
    gs.PlayerRolesRuntime.rgwMP[0] = 0
    gs.PlayerRolesRuntime.rgwLevel[0] = 0
    gs.PlayerRolesRuntime.rgwMaxHP[0] = 0
    gs.PlayerRolesRuntime.rgwMaxMP[0] = 0
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
    expect(pixel(fb, rightDigitX(42, 4, 0), 56)).toBe(yellowDigit(0))
    expect(pixel(fb, rightDigitX(63, 4, 0), 61)).toBe(0xd0)
    expect(pixel(fb, rightDigitX(42, 4, 0), 78)).toBe(yellowDigit(0))
    expect(pixel(fb, rightDigitX(63, 4, 0), 83)).toBe(0xd0)
    expect(pixel(fb, rightDigitX(54, 2, 0), 35)).toBe(yellowDigit(0))
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
      itemIcons: new Map([
        [0, { width: 1, height: 1, indices: Uint8Array.of(0x99), opaque: Uint8Array.of(1) }],
      ]),
      glyphs,
    })
    // slot0 名字位 (195,38) 保持 sentinel（item find 失败 → continue）
    expect(pixel(fb, 195, 38)).toBe(0x5a)
    expect(pixel(fb, 190, 0)).toBe(0x5a)
  })

  it('cursor 越界 / roles 缺 roleId：早退不画不崩', () => {
    const gs = gsForStatus()
    const outside = createPlayerStatus([0])
    outside.cursor = 5
    for (const input of [
      { state: outside, playerRoles: makeRoles() },
      { state: createPlayerStatus([0]), playerRoles: { roles: [] } },
    ]) {
      const fb = newFb()
      const before = fb.indices.slice()
      drawPlayerStatus({ fb, gs, ...input, items: [], uiSpriteFrames: makeUiFrames(), glyphs })
      expect(fb.indices).toEqual(before)
    }
  })
})
