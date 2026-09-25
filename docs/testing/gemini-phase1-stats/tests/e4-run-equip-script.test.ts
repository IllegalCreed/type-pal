/**
 * E4: runEquipScript 真实事件与指令链执行
 * 重点核验:
 * 1. goto 跳转跳转至目标 label，中间指令被跳过
 * 2. end 正常早停，后续指令不执行
 * 3. scriptOnEquip === 0 与未注册 label 安全退出的健壮性
 * 4. 16 位有符号操作数的正确还原 (signExtendI16 负数属性)
 * 5. 死循环上限拦截 (SCRIPT_TICK_LIMIT 256) 且保证 reset iCurEquipPart = -1
 */
import type { Command } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { PLAYERROLES_ROW, runEquipScript } from '../../../../packages/game/src/core/equip-effect.js'
import { setGlobalEvents } from '../../../../packages/game/src/core/event-system.js'
import { makeFreshGameState } from '../fixtures/stats-test-fixtures.js'

describe('E4: 装备脚本执行器 runEquipScript', () => {
  it('E4-01 goto 跳转跳过中间指令，只执行跳转目标的写入', () => {
    const cmds: Command[] = [
      { op: 'goto', to: 'L_602', label: 'L_600' },
      {
        op: 'raw',
        opcode: 0x17,
        operands: [14 /* Hand */, PLAYERROLES_ROW.ATTACK_STRENGTH, 99],
        label: 'L_601',
      },
      {
        op: 'raw',
        opcode: 0x17,
        operands: [14 /* Hand */, PLAYERROLES_ROW.ATTACK_STRENGTH, 15],
        label: 'L_602',
      },
      { op: 'end' },
    ]
    setGlobalEvents(cmds)

    const gs = makeFreshGameState()
    const roleId = 0
    runEquipScript(gs, 600, roleId)

    // 跳过了 L_601 (+99)，只执行了 L_602 (+15)
    expect(gs.rgEquipmentEffect[3]!.rgwAttackStrength[roleId]).toBe(15)
    expect(gs.iCurEquipPart).toBe(-1)
  })

  it('E4-02 end 指令终止脚本链，后续指令被截断', () => {
    const cmds: Command[] = [
      { op: 'raw', opcode: 0x17, operands: [14, PLAYERROLES_ROW.DEFENSE, 8], label: 'L_610' },
      { op: 'end' },
      { op: 'raw', opcode: 0x17, operands: [14, PLAYERROLES_ROW.DEFENSE, 88] },
    ]
    setGlobalEvents(cmds)

    const gs = makeFreshGameState()
    const roleId = 0
    runEquipScript(gs, 610, roleId)

    expect(gs.rgEquipmentEffect[3]!.rgwDefense[roleId]).toBe(8)
  })

  it('E4-03 scriptOnEquip === 0 或 labelMap 未命中时安全返回', () => {
    const gs = makeFreshGameState()
    runEquipScript(gs, 0, 0)
    expect(gs.iCurEquipPart).toBe(-1)

    runEquipScript(gs, 99999, 0)
    expect(gs.iCurEquipPart).toBe(-1)
  })

  it('E4-04 16 位有符号操作数正确还原负值 (signExtendI16)', () => {
    // 0xFFF6 对应 signed -10
    const cmds: Command[] = [
      {
        op: 'raw',
        opcode: 0x17,
        operands: [14, PLAYERROLES_ROW.DEXTERITY, 0xfff6],
        label: 'L_620',
      },
      { op: 'end' },
    ]
    setGlobalEvents(cmds)

    const gs = makeFreshGameState()
    const roleId = 0
    runEquipScript(gs, 620, roleId)

    expect(gs.rgEquipmentEffect[3]!.rgwDexterity[roleId]).toBe(-10)
  })

  it('E4-05 循环跳转触发 SCRIPT_TICK_LIMIT 256 保护且 finally 重置 iCurEquipPart', () => {
    const cmds: Command[] = [{ op: 'goto', to: 'L_630', label: 'L_630' }]
    setGlobalEvents(cmds)

    const gs = makeFreshGameState()
    gs.iCurEquipPart = 3
    runEquipScript(gs, 630, 0)

    // 防御上限生效退出且 reset
    expect(gs.iCurEquipPart).toBe(-1)
  })
})
