/**
 * E5: updateAllEquipments 全员装备效果重建
 * 重点核验:
 * 1. 启动/重建时清零旧效果 (createInitialEquipmentEffect)，消除历史脏数据
 * 2. 多角色、多部位遍历重建与各自归属隔离
 * 3. 跳过无装备槽位 (itemId=0) 与无脚本物品 (scriptOnEquip=0)
 */
import type { Command, Item } from '@type-pal/shared'
import { afterEach, describe, expect, it } from 'vitest'
import { PLAYERROLES_ROW, updateAllEquipments } from '../../equip-effect.js'
import { setGlobalEvents } from '../../event-system.js'
import { makeFreshGameState, makeItem } from './stats-test-fixtures.js'

afterEach(() => setGlobalEvents([]))

describe('E5: 全员装备效果层批量重建 updateAllEquipments', () => {
  it('E5-01 清除旧有全部残留效果，并按现存装备完整重新计算', () => {
    // 准备真实全局指令:
    // 物品 101: 头部 (part 0), 防御 +5
    // 物品 102: 武器 (part 3), 攻击 +12
    const cmds: Command[] = [
      {
        op: 'raw',
        opcode: 0x17,
        operands: [11 /* Head */, PLAYERROLES_ROW.DEFENSE, 5],
        label: 'L_701',
      },
      { op: 'end' },
      {
        op: 'raw',
        opcode: 0x17,
        operands: [14 /* Hand */, PLAYERROLES_ROW.ATTACK_STRENGTH, 12],
        label: 'L_702',
      },
      { op: 'end' },
    ]
    setGlobalEvents(cmds)

    const items: Item[] = [
      makeItem({ id: 101, _name: '皮帽', scriptOnEquip: 701 }),
      makeItem({ id: 102, _name: '铁剑', scriptOnEquip: 702 }),
    ]

    const gs = makeFreshGameState()
    // 模拟旧有脏数据
    gs.rgEquipmentEffect[0]!.rgwDefense[0] = 999
    gs.rgEquipmentEffect[4]!.rgwFleeRate[0] = 888

    // 设置角色 0 的装备
    gs.PlayerRolesRuntime.rgwEquipment[0]![0] = 101 // Head
    gs.PlayerRolesRuntime.rgwEquipment[3]![0] = 102 // Hand

    updateAllEquipments(gs, items)

    // 旧脏数据被清空
    expect(gs.rgEquipmentEffect[4]!.rgwFleeRate[0]).toBe(0)
    // 现存装备重新计算并写入正确部位
    expect(gs.rgEquipmentEffect[0]!.rgwDefense[0]).toBe(5)
    expect(gs.rgEquipmentEffect[3]!.rgwAttackStrength[0]).toBe(12)
  })

  it('E5-02 多角色多部位装备并行重建，互不干扰', () => {
    const cmds: Command[] = [
      {
        op: 'raw',
        opcode: 0x17,
        operands: [12 /* Body */, PLAYERROLES_ROW.DEFENSE, 8],
        label: 'L_703',
      },
      { op: 'end' },
      {
        op: 'raw',
        opcode: 0x17,
        operands: [16 /* Wear: 5 + 0x0B = 16 */, PLAYERROLES_ROW.MAGIC_STRENGTH, 15],
        label: 'L_704',
      },
      { op: 'end' },
    ]
    setGlobalEvents(cmds)

    const items: Item[] = [
      makeItem({ id: 103, _name: '藤甲', scriptOnEquip: 703 }),
      makeItem({ id: 104, _name: '玉佩', scriptOnEquip: 704 }),
    ]

    const gs = makeFreshGameState()
    const roleA = 0
    const roleB = 1

    gs.PlayerRolesRuntime.rgwEquipment[1]![roleA] = 103 // roleA 穿藤甲
    gs.PlayerRolesRuntime.rgwEquipment[5]![roleB] = 104 // roleB 佩玉佩

    updateAllEquipments(gs, items)

    // roleA 只生效藤甲
    expect(gs.rgEquipmentEffect[1]!.rgwDefense[roleA]).toBe(8)
    expect(gs.rgEquipmentEffect[5]!.rgwMagicStrength[roleA]).toBe(0)

    // roleB 只生效玉佩
    expect(gs.rgEquipmentEffect[1]!.rgwDefense[roleB]).toBe(0)
    expect(gs.rgEquipmentEffect[5]!.rgwMagicStrength[roleB]).toBe(15)
  })
})
