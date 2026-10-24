import type { Command } from '@type-pal/shared'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { computePlayerFaceColor } from '../present/player-info-box.js'
import { runEquipScript } from './equip-effect.js'
import { applyPlayerOpcode } from './event-opcode-player.js'
import { freshPlayerOpcodeState } from './event-opcode-player.test-fixtures.js'
import { runPlayerPoisonEntrySync } from './event-system.js'
import { setObjectPoisons } from './player-poison-state.js'
import { setGlobalEvents } from './script-catalog.js'

const poisons = [
  { id: 551, level: 0, color: 16, playerScript: 40862, enemyScript: 40864 },
  { id: 552, level: 1, color: 64, playerScript: 40866, enemyScript: 40868 },
  { id: 553, level: 1, color: 33, playerScript: 40870, enemyScript: 40872 },
  { id: 563, level: 99, color: 0, playerScript: 40860, enemyScript: 0 },
  { id: 564, level: 99, color: 0, playerScript: 40858, enemyScript: 0 },
]
const poisonColors = new Map(poisons.map((poison) => [poison.id, poison]))

// 原盘这些入口的指令保持，紧凑夹具用标签映射原IP；不是原盘全局数组的物理下标。
const commands: Command[] = [
  { op: 'end', label: 'L_0' },
  { op: 'raw', opcode: 0x18, operands: [16, 269, 0], label: 'L_39163' },
  { op: 'raw', opcode: 0x29, operands: [0, 563, 0] },
  { op: 'raw', opcode: 0x29, operands: [0, 564, 0] },
  { op: 'end' },
  { op: 'raw', opcode: 0x1b, operands: [0, 20, 0], label: 'L_40860' },
  { op: 'end' },
  { op: 'raw', opcode: 0x1c, operands: [0, 20, 0], label: 'L_40858' },
  { op: 'end' },
  { op: 'raw', opcode: 0x1b, operands: [0, 65524, 0], label: 'L_40866' },
  { op: 'end' },
  { op: 'raw', opcode: 0x1b, operands: [0, 65516, 0], label: 'L_40870' },
  { op: 'end' },
  { op: 'raw', opcode: 0x1b, operands: [0, 65529, 0], label: 'L_40862' },
  { op: 'end' },
]

beforeEach(() => {
  setObjectPoisons(poisons)
  setGlobalEvents(commands)
})
afterEach(() => {
  setObjectPoisons([])
  setGlobalEvents([])
})

function apply(
  gs: ReturnType<typeof freshPlayerOpcodeState>,
  opcode: number,
  operands: [number, number, number],
  roleId = 2,
): void {
  expect(
    applyPlayerOpcode({
      gs,
      opcode,
      operands,
      currentEventObjectId: roleId,
      runPlayerPoisonEntry: runPlayerPoisonEntrySync,
    }),
  ).toBe(true)
}

function wearingGourd() {
  const gs = freshPlayerOpcodeState()
  gs.partyMembers = [2, 0]
  gs.PlayerRolesRuntime.rgwEquipment[5]![2] = 269
  gs.PlayerRolesRuntime.rgwHP[2] = 50
  gs.PlayerRolesRuntime.rgwPoisonResistance[2] = 0
  runEquipScript(gs, 39163, 2)
  expect(gs.rgPoisonStatus['0_0']).toEqual({ wPoisonID: 563, wPoisonScript: 5 })
  expect(gs.rgPoisonStatus['1_0']).toEqual({ wPoisonID: 564, wPoisonScript: 7 })
  return gs
}

describe('Wear removal preserves the ordered ordinary-poison lifecycle', () => {
  it('卸寿葫芦后再中同级毒,后中毒颜色生效且不改另一队伍槽', () => {
    const gs = wearingGourd()
    apply(gs, 0x29, [0, 552, 0])
    gs.PlayerRolesRuntime.rgwPoisonResistance[0] = 0
    apply(gs, 0x29, [0, 552, 0], 0)
    apply(gs, 0x23, [2, 6, 0])
    apply(gs, 0x29, [0, 553, 0])

    expect(computePlayerFaceColor(gs, 2, gs.PlayerRolesRuntime.rgwHP[2]!, poisonColors)).toBe(33)
    expect(gs.rgPoisonStatus['0_0']).toEqual({ wPoisonID: 552, wPoisonScript: 9 })
    expect(gs.rgPoisonStatus['1_0']).toEqual({ wPoisonID: 553, wPoisonScript: 11 })
    expect(gs.rgPoisonStatus['0_1']).toEqual({ wPoisonID: 552, wPoisonScript: 9 })
    expect(gs.PlayerRolesRuntime.rgwEquipment[5]![2]).toBe(0)
    expect(gs.inventory).toEqual([{ itemId: 269, count: 1 }])
  })

  it('先解毒留洞再卸饰品,洞后的毒按原顺序前移且保留脚本续点,不重跑入口', () => {
    const gs = wearingGourd()
    apply(gs, 0x29, [0, 552, 0])
    apply(gs, 0x29, [0, 553, 0])
    apply(gs, 0x29, [0, 551, 0])
    apply(gs, 0x2b, [0, 552, 0])
    expect(gs.rgPoisonStatus['2_0']).toEqual({ wPoisonID: 0, wPoisonScript: 0 })
    apply(gs, 0x23, [2, 6, 0])

    expect(gs.rgPoisonStatus['0_0']).toEqual({ wPoisonID: 553, wPoisonScript: 11 })
    expect(gs.rgPoisonStatus['1_0']).toEqual({ wPoisonID: 551, wPoisonScript: 13 })
    for (let slot = 2; slot < 16; slot++)
      expect(gs.rgPoisonStatus[`${slot}_0`]).toEqual({ wPoisonID: 0, wPoisonScript: 0 })
    expect([gs.PlayerRolesRuntime.rgwHP[2], gs.PlayerRolesRuntime.rgwMP[2]]).toEqual([31, 20])
  })
})
