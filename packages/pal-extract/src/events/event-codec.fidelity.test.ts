/** Known command/raw opcode identity and original byte preservation through disasm and recompile. */
import { describe, expect, it, test } from 'vitest'
import { concat, instr } from './__tests__/bytecode-fixtures.js'
import { disasm } from './disasm.js'
import { recompile } from './recompile.js'

describe('command and raw byte fidelity', () => {
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

  test('disasm(entryIps) → recompile 与原始字节逐字节相等；额外入口和跳转标签均保留', () => {
    const bc = new Uint8Array([
      0x59, 0, 12, 0, 0, 0, 0, 0, 0x3c, 0, 55, 0, 7, 0, 1, 0, 3, 0, 4, 0, 3, 0, 0, 0, 0xa2, 0, 1, 0,
      0, 0, 0, 0, 2, 0, 0, 0, 6, 0, 0, 0,
    ])
    const commands = disasm(bc, [], [0, 3])
    expect(commands).toEqual([
      { op: 'loadScene', sceneId: 12, label: 'L_0' },
      { op: 'setDialogStyleTop', arg0: 55, arg1: 7, arg2: 1 },
      { op: 'goto', to: 'L_4', frameDelay: 3 },
      { op: 'raw', opcode: 0xa2, operands: [1, 0, 0], label: 'L_3' },
      { op: 'end', reset: true, resetTo: 0, idleFrames: 6, label: 'L_4' },
    ])
    const back = recompile(commands, [])
    expect([...back]).toEqual([...bc]) // 独立预期 = 原始字节（round-trip 不变式）
  })

  it('end / goto / showDialog / giveItem / raw 混合字节码往返', () => {
    const bc = concat(
      instr(0x0000), // end
      instr(0x0003, 5, 0), // goto 5，计数操作数0（现有字段名frameDelay）
      instr(0x0000), // filler
      instr(0x0000), // filler
      instr(0x0000), // filler
      instr(0x0000), // i=5 (target of goto)
      instr(0xffff, 1, 0, 0), // showDialog msg 1
      instr(0x001f, 100, 2, 0), // giveItem id=100 count=2
      instr(0x0050, 1, 2, 3), // unnamed → raw
    )
    const messages = ['', '你好']
    const cmds = disasm(bc, messages)
    expect(cmds).toEqual([
      { op: 'end' },
      { op: 'goto', to: 'L_5', frameDelay: 0 },
      { op: 'end' },
      { op: 'end' },
      { op: 'end' },
      { op: 'end', label: 'L_5' },
      { op: 'showDialog', messageIndex: 1, text: '你好' },
      { op: 'giveItem', itemId: 100, count: 2 },
      { op: 'raw', opcode: 0x0050, operands: [1, 2, 3] },
    ])
    const back = recompile(cmds, messages)
    expect(Array.from(back)).toEqual(Array.from(bc))
  })

  it('end advance / reset', () => {
    const bc = concat(instr(0x0001), instr(0x0002, 42, 5))
    const cmds = disasm(bc, [])
    const back = recompile(cmds, [])
    expect(cmds).toEqual([
      { op: 'end', advance: true },
      { op: 'end', reset: true, resetTo: 42, idleFrames: 5, label: 'L_1' },
    ])
    expect([...back]).toEqual([1, 0, 0, 0, 0, 0, 0, 0, 2, 0, 42, 0, 5, 0, 0, 0])
  })
})
