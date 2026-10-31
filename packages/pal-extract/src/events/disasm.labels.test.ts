/** Disassembly label targets, entry identities and input buffer views. */
import { describe, expect, test } from 'vitest'
import { concat, instr } from './__tests__/bytecode-fixtures.js'
import { disasm } from './disasm.js'
import { recompile } from './recompile.js'

describe('local target and entry labels', () => {
  test('op0=2：目标 i+1..i+2 打 L_ 标签，fall-through i+3 不标', () => {
    const bc = concat(
      instr(0x00a2, 2, 0, 0), // 0: 随机跳，相对目标 1、2
      instr(0x0000), // 1: end ← 目标
      instr(0x0000), // 2: end ← 目标
      instr(0x0000), // 3: 不在随机目标集
    )
    const cmds = disasm(bc, [])
    expect(cmds[1]).toEqual({ label: 'L_1', op: 'end' })
    expect(cmds[2]).toEqual({ label: 'L_2', op: 'end' })
    expect(cmds[3]).toEqual({ op: 'end' })
  })

  test('op0=0：无相对目标，不标任何后续指令', () => {
    const bc = concat(instr(0x00a2, 0, 0, 0), instr(0x0000))
    const cmds = disasm(bc, [])
    expect(cmds[0]).toEqual({ op: 'raw', opcode: 0xa2, operands: [0, 0, 0] })
    expect(cmds[1]).toEqual({ op: 'end' })
  })

  test('0x04 call-script 目标 = op0；0x24 setAutoScript 目标 = op1', () => {
    const bc = concat(
      instr(0x0004, 3, 0, 0), // 0: call → 3
      instr(0x0024, 0, 4, 0), // 1: setAutoScript → 4
      instr(0x0000), // 2: 无关
      instr(0x0000), // 3: 0x04 目标
      instr(0x0000), // 4: 0x24 目标
    )
    const cmds = disasm(bc, [])
    expect(cmds[3]).toEqual({ label: 'L_3', op: 'end' })
    expect(cmds[4]).toEqual({ label: 'L_4', op: 'end' })
    expect(cmds[2]).toEqual({ op: 'end' })
  })

  test('跳转目标 ≥ 指令数：不标、不崩（第 2 遍越界丢弃）', () => {
    const bc = concat(instr(0x0003, 99, 0, 0), instr(0x0000))
    const cmds = disasm(bc, [])
    expect(cmds[0]).toEqual({ op: 'goto', to: 'L_99', frameDelay: 0 })
    expect(cmds[1]).toEqual({ op: 'end' })
  })

  test('raw 条件跳和非零指令位置的随机跳均给目标打标签', () => {
    // 0x0058 ifItemLess fields[2]=to(label)：具名未结构化 → raw，但目标仍打标签。
    // disasm只收集标签；slice才遍历图。此处随机跳位于i=1，核相对目标2/3。
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

describe('input buffer views', () => {
  test('bytecode 为大缓冲奇数偏移 subarray：与独立缓冲结果全等', () => {
    const bc = concat(instr(0x0003, 2, 5, 0), instr(0x0000), instr(0x0000))
    const parent = new Uint8Array(7 + bc.length + 3)
    parent.fill(0xee)
    parent.set(bc, 7)
    const expected = [
      { op: 'goto', to: 'L_2', frameDelay: 5 },
      { op: 'end' },
      { op: 'end', label: 'L_2' },
    ]
    expect(disasm(bc, ['x'], [2])).toEqual(expected)
    expect(disasm(parent.subarray(7, 7 + bc.length), ['x'], [2])).toEqual(expected)
  })
})
