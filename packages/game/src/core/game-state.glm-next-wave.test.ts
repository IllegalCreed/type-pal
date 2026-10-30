/**
 * TEST-GLM-NEW-H-1 / H04 — game-state 当前公开合同补测。
 *
 * getOverworldSpriteNum由present/bootstrap消费：role0镜像覆盖 → runtime精灵号>0 → 静态表。
 * createInitialPlayerStatus(global.h:522 6×9 全零)同文件补一条布局合同。
 */
import type { PlayerRoles } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { makeHRole } from '../__tests__/glm-next-wave/H/harness.js'
import {
  createInitialGameState,
  createInitialPlayerStatus,
  getOverworldSpriteNum,
} from './game-state.js'

function staticRoles(): PlayerRoles {
  return {
    roles: [
      makeHRole(0, { spriteNum: 1 }),
      makeHRole(1, { spriteNum: 2 }),
      makeHRole(2, { spriteNum: 3 }),
    ],
  }
}

describe('getOverworldSpriteNum 三级快照解析(present/bootstrap 现行 caller)', () => {
  it('role0 + 旧字段 partyLeaderSpriteId → 最高优先(旧存档/0x65 镜像)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.partyLeaderSpriteId = 77
    gs.PlayerRolesRuntime.rgwSpriteNum[0] = 5
    expect(getOverworldSpriteNum(gs, 0, staticRoles())).toBe(77)
  })

  it('无旧字段 → runtime rgwSpriteNum>0 生效;=0 跳过(0x65 变身写 runtime 的当前值)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.PlayerRolesRuntime.rgwSpriteNum[1] = 42
    expect(getOverworldSpriteNum(gs, 1, staticRoles())).toBe(42)
    gs.PlayerRolesRuntime.rgwSpriteNum[1] = 0
    expect(getOverworldSpriteNum(gs, 1, staticRoles())).toBe(2) // 0表示没有runtime覆盖,按公开合同回退静态表
  })

  it('runtime精灵号为0时回退静态表,未提供静态表则undefined', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    expect(getOverworldSpriteNum(gs, 2, staticRoles())).toBe(3)
    expect(getOverworldSpriteNum(gs, 2)).toBeUndefined() // 无静态表 → undefined(caller 兜底)
  })
})

describe('createInitialPlayerStatus(sdlpal global.h:522 布局)', () => {
  it('6 role × 9 状态槽全零(Confused0..DualAttack8)', () => {
    const st = createInitialPlayerStatus()
    expect(st.length).toBe(6)
    for (const row of st) {
      expect(row.length).toBe(9)
      expect(row.every((v) => v === 0)).toBe(true)
    }
    // 形状/全零不足以证明所有权：修改一行不能连带其它角色或下一份初态。
    st[0]![0] = 3
    expect(st[1]![0]).toBe(0)
    expect(createInitialPlayerStatus()[0]![0]).toBe(0)
  })
})
