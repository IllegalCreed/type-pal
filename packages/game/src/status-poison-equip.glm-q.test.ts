// Q06 · game status 毒槽与装备派生值直测残差（排重：opcode 层 0x29/cure-by-level 与
// 装备效果重建旧测已证；本文件只补 isPlayerPoisoned ByKind/伪毒臂、curePlayerPoisonByKind、
// removePoisonLevel99、addPoisonForPlayer runner 契约与 fleeRate/poisonResistance 读取器）。
import { afterEach, describe, expect, test, vi } from 'vitest'
import { getPlayerFleeRate, getPlayerPoisonResistance } from './core/equipment-state.js'
import type { EquipmentEffectRoles } from './core/game-state.js'
import { createInitialGameState, type GameState } from './core/game-state.js'
import {
  addPoisonForPlayer,
  curePlayerPoisonByKind,
  curePlayerPoisonByLevel,
  isPlayerPoisoned,
  removePoisonLevel99,
  setObjectPoisons,
} from './core/player-poison-state.js'

function effectRoles(fields: Partial<EquipmentEffectRoles>): EquipmentEffectRoles {
  return {
    rgwSpriteNumInBattle: [],
    rgwAttackAll: [],
    rgwLevel: [],
    rgwMaxHP: [],
    rgwMaxMP: [],
    rgwHP: [],
    rgwMP: [],
    rgwAttackStrength: [],
    rgwMagicStrength: [],
    rgwDefense: [],
    rgwDexterity: [],
    rgwFleeRate: [],
    rgwPoisonResistance: [],
    rgwElementalResistance: [],
    rgwCoveredBy: [],
    rgwCooperativeMagic: [],
    ...fields,
  }
}

function gs(): GameState {
  const state = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  state.partyMembers = [0]
  return state
}

function seed(gs0: GameState, roleId: number, slot: number, poisonId: number, script = 0): void {
  const partySlot = gs0.partyMembers.indexOf(roleId)
  if (partySlot < 0) throw new Error(`test fixture role ${roleId} is not in party`)
  gs0.rgPoisonStatus[`${slot}_${partySlot}`] = { wPoisonID: poisonId, wPoisonScript: script }
}

afterEach(() => setObjectPoisons([]))

describe('CODE53 离队角色没有毒槽 ownership', () => {
  function partyWithPoisons(): GameState {
    const state = gs()
    state.partyMembers = [4, 1]
    setObjectPoisons([
      { id: 552, level: 1, color: 64, playerScript: 10, enemyScript: 0 },
      { id: 553, level: 2, color: 64, playerScript: 20, enemyScript: 0 },
      { id: 563, level: 99, color: 0, playerScript: 30, enemyScript: 0 },
    ])
    state.rgPoisonStatus = {
      '0_0': { wPoisonID: 552, wPoisonScript: 11 },
      '1_0': { wPoisonID: 563, wPoisonScript: 31 },
      '0_1': { wPoisonID: 553, wPoisonScript: 21 },
    }
    return state
  }

  // role 0 是合法角色，但不在当前队伍；其 ID 恰好与 role 4 的队伍槽 0 相同。
  // global.c:1483-1493/1543-1555/1590-1602/1641-1653 要求先查队伍，不能回退 roleId。
  test('查询离队角色不能读到当前首槽角色的真毒或指定毒', () => {
    const state = partyWithPoisons()
    expect(isPlayerPoisoned(state, 0)).toBe(false)
    expect(isPlayerPoisoned(state, 0, 552)).toBe(false)
    expect(isPlayerPoisoned(state, 4, 552)).toBe(true)
  })

  test('向离队角色施毒不执行入口，也不创建槽或改变在队角色的毒', () => {
    const state = partyWithPoisons()
    const before = structuredClone(state.rgPoisonStatus)
    const runner = vi.fn((ip: number) => ip + 1)
    addPoisonForPlayer(state, 0, 553, runner)
    expect(runner).not.toHaveBeenCalled()
    expect(state.rgPoisonStatus).toEqual(before)
  })

  test.each([
    { name: '按种类解毒', run: (state: GameState) => curePlayerPoisonByKind(state, 0, 552) },
    { name: '按等级解毒', run: (state: GameState) => curePlayerPoisonByLevel(state, 0, 3) },
    { name: '卸装备清伪毒', run: (state: GameState) => removePoisonLevel99(state, 0) },
  ])('$name：离队角色操作不能修改当前队伍毒表', ({ run }) => {
    const state = partyWithPoisons()
    const before = structuredClone(state.rgPoisonStatus)
    run(state)
    expect(state.rgPoisonStatus).toEqual(before)
  })
})

describe('Q06 isPlayerPoisoned', () => {
  test('ByKind 只查指定毒 id，不看等级与其它毒', () => {
    setObjectPoisons([{ id: 5, level: 1, color: 0, playerScript: 0, enemyScript: 0 }])
    const g = gs()
    expect(isPlayerPoisoned(g, 0)).toBe(false)
    seed(g, 0, 0, 7)
    expect(isPlayerPoisoned(g, 0, 7)).toBe(true)
    expect(isPlayerPoisoned(g, 0, 5)).toBe(false)
  })

  test('ByLevel(role,0)：level>=99 装备伪毒不算中毒', () => {
    setObjectPoisons([
      { id: 5, level: 1, color: 0, playerScript: 0, enemyScript: 0 },
      { id: 90, level: 99, color: 0, playerScript: 0, enemyScript: 0 },
    ])
    const g = gs()
    seed(g, 0, 0, 90) // 寿葫芦类伪毒
    expect(isPlayerPoisoned(g, 0)).toBe(false)
    seed(g, 0, 1, 5) // 真毒
    expect(isPlayerPoisoned(g, 0)).toBe(true)
  })

  test('毒表未注入时伪毒按 level 0 退化处理（旧 caller 兼容臂）', () => {
    setObjectPoisons([])
    const g = gs()
    seed(g, 0, 0, 90)
    expect(isPlayerPoisoned(g, 0)).toBe(true)
  })
})

describe('Q06 cure / remove', () => {
  test('curePlayerPoisonByKind 只清该毒全部槽位', () => {
    const g = gs()
    seed(g, 0, 0, 7, 11)
    seed(g, 0, 3, 7, 22)
    seed(g, 0, 5, 9, 33)
    curePlayerPoisonByKind(g, 0, 7)
    expect(g.rgPoisonStatus['0_0']).toEqual({ wPoisonID: 0, wPoisonScript: 0 })
    expect(g.rgPoisonStatus['3_0']).toEqual({ wPoisonID: 0, wPoisonScript: 0 })
    expect(g.rgPoisonStatus['5_0']).toEqual({ wPoisonID: 9, wPoisonScript: 33 })
  })

  test('removePoisonLevel99 清 level>=99、留 level<99', () => {
    setObjectPoisons([
      { id: 90, level: 99, color: 0, playerScript: 0, enemyScript: 0 },
      { id: 5, level: 2, color: 0, playerScript: 0, enemyScript: 0 },
    ])
    const g = gs()
    seed(g, 0, 0, 90, 44)
    seed(g, 0, 1, 5, 55)
    removePoisonLevel99(g, 0)
    expect(g.rgPoisonStatus['0_0']).toEqual({ wPoisonID: 5, wPoisonScript: 55 })
    expect(g.rgPoisonStatus['1_0']).toEqual({ wPoisonID: 0, wPoisonScript: 0 })
  })

  test('curePlayerPoisonByLevel 无 99 例外：maxLevel 内连装备毒一并清', () => {
    setObjectPoisons([{ id: 90, level: 99, color: 0, playerScript: 0, enemyScript: 0 }])
    const g = gs()
    seed(g, 0, 0, 90, 66)
    curePlayerPoisonByLevel(g, 0, 99)
    expect(g.rgPoisonStatus['0_0']).toEqual({ wPoisonID: 0, wPoisonScript: 0 })
  })
})

describe('Q06 addPoisonForPlayer', () => {
  test('去重：已有同毒不落第二槽', () => {
    const g = gs()
    seed(g, 0, 2, 7, 11)
    addPoisonForPlayer(g, 0, 7)
    const occupied = Object.entries(g.rgPoisonStatus).filter(([, p]) => p && p.wPoisonID === 7)
    expect(occupied).toHaveLength(1)
    expect(g.rgPoisonStatus['2_0']?.wPoisonScript).toBe(11)
  })

  test('runner 注入：施毒当下跑入口脚本并存返回的 next entry；无 runner 存原始 ip', () => {
    setObjectPoisons([{ id: 7, level: 1, color: 0, playerScript: 300, enemyScript: 0 }])
    const g = gs()
    const runner = vi.fn((ip: number) => ip + 5)
    addPoisonForPlayer(g, 0, 7, runner)
    expect(runner).toHaveBeenCalledWith(300)
    expect(g.rgPoisonStatus['0_0']).toEqual({ wPoisonID: 7, wPoisonScript: 305 })
    const g2 = gs()
    addPoisonForPlayer(g2, 0, 7)
    expect(g2.rgPoisonStatus['0_0']).toEqual({ wPoisonID: 7, wPoisonScript: 300 })
  })

  test('playerScript=0 时不调 runner；16 槽全满时静默丢弃', () => {
    setObjectPoisons([{ id: 7, level: 1, color: 0, playerScript: 0, enemyScript: 0 }])
    const g = gs()
    const runner = vi.fn((ip: number) => ip)
    addPoisonForPlayer(g, 0, 7, runner)
    expect(runner).not.toHaveBeenCalled()
    expect(g.rgPoisonStatus['0_0']?.wPoisonID).toBe(7)
    const full = gs()
    for (let slot = 0; slot < 16; slot++) seed(full, 0, slot, 100 + slot)
    addPoisonForPlayer(full, 0, 7)
    expect(Object.values(full.rgPoisonStatus).some((p) => p && p.wPoisonID === 7)).toBe(false)
  })
})

describe('Q06 装备派生值读取器', () => {
  test('fleeRate = runtime base + 各装备槽之和', () => {
    const g = gs()
    g.PlayerRolesRuntime.rgwFleeRate[0] = 10
    g.rgEquipmentEffect[1] = effectRoles({ rgwFleeRate: [5] })
    g.rgEquipmentEffect[6] = effectRoles({ rgwFleeRate: [2] })
    expect(getPlayerFleeRate(g, 0)).toBe(17)
  })

  test('poisonResistance 钳制 [0,100]：负值归零、超百封顶', () => {
    const g = gs()
    g.PlayerRolesRuntime.rgwPoisonResistance[0] = 90
    g.rgEquipmentEffect[0] = effectRoles({ rgwPoisonResistance: [30] })
    expect(getPlayerPoisonResistance(g, 0)).toBe(100)
    g.PlayerRolesRuntime.rgwPoisonResistance[0] = 10
    g.rgEquipmentEffect[0] = effectRoles({ rgwPoisonResistance: [-40] })
    expect(getPlayerPoisonResistance(g, 0)).toBe(0)
  })
})
