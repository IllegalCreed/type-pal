/** Current overworld sprite priority from runtime snapshots and optional static roles. */
import type { PlayerRoles } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { makeRoleRecord } from '../__tests__/battle-records.js'
import { createInitialGameState, getOverworldSpriteNum } from './game-state.js'

function makeSpriteRoles(): PlayerRoles {
  return {
    roles: [
      makeRoleRecord(0, { spriteNum: 1 }),
      makeRoleRecord(1, { spriteNum: 2 }),
      makeRoleRecord(2, { spriteNum: 3 }),
    ],
  }
}

describe('Overworld sprite selection', () => {
  it('role zero explicit mirror overrides runtime and static sprite', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.partyLeaderSpriteId = 77
    gs.PlayerRolesRuntime.rgwSpriteNum[0] = 5
    expect(getOverworldSpriteNum(gs, 0, makeSpriteRoles())).toBe(77)
  })

  it('positive runtime sprite overrides static; zero restores static fallback', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.PlayerRolesRuntime.rgwSpriteNum[1] = 42
    expect(getOverworldSpriteNum(gs, 1, makeSpriteRoles())).toBe(42)
    gs.PlayerRolesRuntime.rgwSpriteNum[1] = 0
    expect(getOverworldSpriteNum(gs, 1, makeSpriteRoles())).toBe(2) // 0表示没有runtime覆盖,按公开合同回退静态表
  })

  it('zero runtime uses static role sprite or returns undefined without a table', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    expect(getOverworldSpriteNum(gs, 2, makeSpriteRoles())).toBe(3)
    expect(getOverworldSpriteNum(gs, 2)).toBeUndefined() // 无静态表 → undefined(caller 兜底)
  })
})
