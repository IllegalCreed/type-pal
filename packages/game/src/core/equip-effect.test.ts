/** Synchronous equipment scripts: inventory swaps, poison dispatch, and context reset. */
import type { Command } from '@type-pal/shared'
import { afterEach, describe, expect, it } from 'vitest'
import { PLAYERROLES_ROW, runEquipScript } from './equip-effect.js'
import { freshPlayerOpcodeState } from './event-opcode-player.test-fixtures.js'
import { setGlobalEvents, setObjectPoisons } from './event-system.js'

afterEach(() => {
  setGlobalEvents([])
  setObjectPoisons([])
})
describe('runEquipScript 0x18 真换装(script.c:768-811)', () => {
  // scriptOnEquip = L_500: 0x18 [14,163,0](part 14-0xB=3 Hand,装备 item 163)
  function setupEquipScript(): void {
    // The catalog resolves the original script label to its compact array position.
    const cmds: Command[] = [
      { op: 'raw', opcode: 0x18, operands: [14, 163, 0], label: 'L_500' },
      { op: 'end' },
    ]
    setGlobalEvents(cmds)
  }

  it('空槽装新装备:rgwEquipment 写入 + 背包移除新装备 + wLastUnequippedItem=0', () => {
    setupEquipScript()
    const gs = freshPlayerOpcodeState()
    gs.PlayerRolesRuntime.rgwEquipment[3]![2] = 0 // role 2 林月如 手持槽空
    gs.inventory = [{ itemId: 163, count: 1 }] // 背包有长鞭
    runEquipScript(gs, 500, 2)
    expect(gs.PlayerRolesRuntime.rgwEquipment[3]![2]).toBe(163) // 装上了
    expect(gs.inventory.find((e) => e.itemId === 163)).toBeUndefined() // 背包移除
    expect(gs.wLastUnequippedItem).toBe(0)
  })

  it('换下旧装备:新装上 + 旧装备入包 + wLastUnequippedItem=旧', () => {
    setupEquipScript()
    const gs = freshPlayerOpcodeState()
    gs.PlayerRolesRuntime.rgwEquipment[3]![2] = 100 // 已装旧武器 100
    gs.inventory = [{ itemId: 163, count: 1 }]
    runEquipScript(gs, 500, 2)
    expect(gs.PlayerRolesRuntime.rgwEquipment[3]![2]).toBe(163) // 换成新的
    expect(gs.inventory.find((e) => e.itemId === 163)).toBeUndefined() // 新装备出包
    expect(gs.inventory.find((e) => e.itemId === 100)?.count).toBe(1) // 旧装备入包
    expect(gs.wLastUnequippedItem).toBe(100)
  })

  it('已装着自己(update 上下文):条件相等 → 不 swap,背包不动', () => {
    setupEquipScript()
    const gs = freshPlayerOpcodeState()
    gs.PlayerRolesRuntime.rgwEquipment[3]![2] = 163 // 已装 163(=op1)
    gs.inventory = [{ itemId: 163, count: 1 }]
    runEquipScript(gs, 500, 2)
    expect(gs.PlayerRolesRuntime.rgwEquipment[3]![2]).toBe(163)
    expect(gs.inventory.find((e) => e.itemId === 163)?.count).toBe(1) // 背包不变(没 swap)
  })
})
// Equipment scripts use the real player-poison entry runner.
describe('equipment poison entry dispatch', () => {
  it('0x29 stores a poison at the selected party slot when resistance is zero', () => {
    const cmds: Command[] = [
      { op: 'raw', opcode: 0x29, operands: [0, 563, 0], label: 'L_520' }, // applyAll=0,毒 563
      { op: 'end' },
    ]
    setGlobalEvents(cmds)
    setObjectPoisons([{ id: 563, level: 99, color: 0, playerScript: 0, enemyScript: 0 }])
    const gs = freshPlayerOpcodeState()
    gs.partyMembers = [1]
    // poisonResistance 默认 0 → RandomLong(1,100) > 0 必 true → 中
    runEquipScript(gs, 520, 1)
    expect(gs.rgPoisonStatus['0_0']).toEqual({ wPoisonID: 563, wPoisonScript: 0 })
  })
  it('0x29 runs the poison entry immediately and retains its returned checkpoint', () => {
    setObjectPoisons([{ id: 100, level: 2, color: 0, playerScript: 555, enemyScript: 0 }])
    const cmds: Command[] = [
      { op: 'raw', opcode: 0x29, operands: [0, 100, 0], label: 'L_520' },
      { op: 'end' },
      { op: 'raw', opcode: 0x1b, operands: [0, 20, 0], label: 'L_555' },
      { op: 'end', advance: true },
    ]
    setGlobalEvents(cmds)
    const gs = freshPlayerOpcodeState()
    gs.partyMembers = [1]
    gs.PlayerRolesRuntime.rgwPoisonResistance[1] = 0
    gs.PlayerRolesRuntime.rgwMaxHP[1] = 100
    gs.PlayerRolesRuntime.rgwHP[1] = 50
    runEquipScript(gs, 520, 1)
    expect(gs.PlayerRolesRuntime.rgwHP[1]).toBe(70)
    expect(gs.rgPoisonStatus['0_0']).toEqual({ wPoisonID: 100, wPoisonScript: 4 })
  })
})
describe('equipment context lifetime', () => {
  it('runEquipScript:0x18 设 part 后 0x1A redirect 到覆盖层;脚本结束 iCurEquipPart reset=-1', () => {
    // The compact catalog maps L_501 to the equipment-context instruction.
    const cmds: Command[] = [
      { op: 'raw', opcode: 0x18, operands: [14, 163, 0], label: 'L_501' }, // part 14-0xB=3,装 163
      { op: 'raw', opcode: 0x1a, operands: [PLAYERROLES_ROW.ATTACK_STRENGTH, 7, 0] }, // 加 Atk 到覆盖层
      { op: 'end' },
    ]
    setGlobalEvents(cmds)
    const gs = freshPlayerOpcodeState()
    gs.PlayerRolesRuntime.rgwAttackStrength[2] = 50
    gs.PlayerRolesRuntime.rgwEquipment[3]![2] = 163
    gs.inventory = [{ itemId: 163, count: 1 }]
    runEquipScript(gs, 501, 2)
    // 0x1A 经 iCurEquipPart=3 redirect → 写 rgEquipmentEffect[3],base 不动
    expect(gs.rgEquipmentEffect[3]!.rgwAttackStrength[2]).toBe(7)
    expect(gs.PlayerRolesRuntime.rgwAttackStrength[2]).toBe(50)
    // 脚本结束必须 reset,否则后续无关 0x1A 误写覆盖层
    expect(gs.iCurEquipPart).toBe(-1)
  })
})
