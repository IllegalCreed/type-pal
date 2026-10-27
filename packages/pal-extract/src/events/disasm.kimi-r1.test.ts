import { concat, instr } from './__tests__/bytecode-fixtures.js'
/**
 * setPalette、raw身份/多类跳转与entry标签的独立命令及原字节oracle。
 * 注册表具名不等于disasm有专用emit；输入向量是原始WORD记录，不声称完整可玩脚本。
 */

import { describe, expect, test } from 'vitest'
import { disasm } from './disasm.js'
import { recompile } from './recompile.js'

describe('KIMI-R1 disasm setPalette case 与具名 raw 回退', () => {
  test('setPalette(0x008B) 反汇编为具名 Command 且字节级 round-trip', () => {
    const bytecode = concat(instr(0x008b, 9), instr(0x0000))
    // 独立手列输入字节；输入SHA属于证据身份，不另测试内建hash。
    expect([...bytecode]).toEqual([
      0x8b, 0x00, 0x09, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00,
    ])
    const commands = disasm(bytecode, [])
    expect(commands).toEqual([{ op: 'setPalette', paletteIndex: 9 }, { op: 'end' }])
    const back = recompile(commands, [])
    expect([...back]).toEqual([...bytecode])
  })

  test('具名但未结构化 opcode（startBattle 0x0007）落 raw 保字节，label operand 目标打标签', () => {
    // startBattle fields: [enemyId, onLost(label), onFled(label)] — emitCommand 无 case，
    // raw 回退保留原 opcode；pass 1 收集 label 目标 → pass 2 给指令 3 打 L_3。
    const bytecode = concat(
      instr(0x0007, 5, 3, 2), // startBattle enemy=5 onLost=L_3 onFled=L_2
      instr(0x0000), // 1 filler
      instr(0x0000), // 2 filler ← L_2
      instr(0x0001), // 3 end advance ← L_3
    )
    const commands = disasm(bytecode, [])
    expect(commands).toEqual([
      { op: 'raw', opcode: 0x0007, operands: [5, 3, 2] },
      { op: 'end' },
      { op: 'end', label: 'L_2' },
      { op: 'end', advance: true, label: 'L_3' },
    ])
    expect([...recompile(commands, [])]).toEqual([...bytecode])
  })

  test('表外未知 opcode（0x0100）落 raw 且字节级 round-trip', () => {
    const bytecode = concat(instr(0x0100, 0x1234, 0x5678, 0x9abc), instr(0x0000))
    const commands = disasm(bytecode, [])
    expect(commands).toEqual([
      { op: 'raw', opcode: 0x0100, operands: [0x1234, 0x5678, 0x9abc] },
      { op: 'end' },
    ])
    expect([...recompile(commands, [])]).toEqual([...bytecode])
  })

  test('JUMP_TARGET_OPERAND raw 条件跳目标入 BFS 标签集；0xA2 随机跳收 i+1..i+op0', () => {
    // 0x0058 ifItemLess fields[2]=to(label)：具名未结构化 → raw，但目标仍打标签（:63-65）。
    // 0x00A2 随机跳：目标 = 相对 i+1..i+op0（:66-68）。
    const bytecode = concat(
      instr(0x0058, 61, 1, 4), // ifItemLess item 61 <1 → L_4
      instr(0x00a2, 2), // random jump → 2..3
      instr(0x0000), // 2 ← random target
      instr(0x0000), // 3 ← random target
      instr(0x0000), // 4 ← L_4
    )
    const commands = disasm(bytecode, [])
    expect(commands).toEqual([
      { op: 'raw', opcode: 0x0058, operands: [61, 1, 4] },
      { op: 'raw', opcode: 0x00a2, operands: [2, 0, 0] },
      { op: 'end', label: 'L_2' },
      { op: 'end', label: 'L_3' },
      { op: 'end', label: 'L_4' },
    ])
    expect([...recompile(commands, [])]).toEqual([...bytecode])
  })

  test('entryIps 越界入口不打标签、范围内入口打标签', () => {
    const bytecode = concat(instr(0x0000), instr(0x0001), instr(0x0002, 0, 7))
    const commands = disasm(bytecode, [], [-1, 1, 99])
    expect(commands).toEqual([
      { op: 'end', label: 'L_0' }, // end reset 的 resetTo=0 是 label 字段 → 指令 0 被打标
      { op: 'end', advance: true, label: 'L_1' },
      { op: 'end', reset: true, resetTo: 0, idleFrames: 7, label: 'L_2' },
    ])
    expect([...recompile(commands, [])]).toEqual([...bytecode])
  })
})
