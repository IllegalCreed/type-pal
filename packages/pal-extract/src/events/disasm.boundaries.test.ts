/**
 * TEST-RESOURCE-TOOLS-COVERAGE-1 R03：disasm 字面向量边界（events/disasm.ts）。
 * 既有 disasm.test 已覆盖具名命令/标签/入口 ip/round-trip——不重复。本文件：8B literal
 * 向量（count 0x8000/0xffff 保持 u16 无符号）、messageIndex 轴与越界回退、raw 三 operand
 * 全位型、entry 与 jump 同目标只标一次、输入保真。
 */
import { describe, expect, test } from 'vitest'
import { disasm } from './disasm.js'

/** 8B 指令：opcode + 三 operand（u16 LE）。 */
function instr(opcode: number, o0: number, o1: number, o2: number): Uint8Array {
  const out = new Uint8Array(8)
  const view = new DataView(out.buffer)
  view.setUint16(0, opcode, true)
  view.setUint16(2, o0, true)
  view.setUint16(4, o1, true)
  view.setUint16(6, o2, true)
  return out
}

const concat = (parts: readonly Uint8Array[]): Uint8Array => {
  const out = new Uint8Array(parts.reduce((sum, p) => sum + p.byteLength, 0))
  let at = 0
  for (const p of parts) {
    out.set(p, at)
    at += p.byteLength
  }
  return out
}

describe('R03 disasm 字面向量', () => {
  test('giveItem count 0x8000/0xffff 保持 32768/65535（u16 不转 signed）；raw 三 operand 全位型', () => {
    const bc = concat([
      instr(0x001f, 61, 0x8000, 0), // giveItem id=61 count=32768
      instr(0x001f, 62, 0xffff, 0), // giveItem id=62 count=65535
      instr(0x0177, 0x1234, 0x5678, 0x9abc), // 未具名 → raw
    ])
    const snapshot = bc.slice()
    const commands = disasm(bc, [])
    expect(commands[0]).toEqual({ op: 'giveItem', itemId: 61, count: 32768 })
    expect(commands[1]).toEqual({ op: 'giveItem', itemId: 62, count: 65535 })
    expect(commands[2]).toEqual({
      op: 'raw',
      opcode: 0x0177,
      operands: [0x1234, 0x5678, 0x9abc],
    })
    expect(bc).toEqual(snapshot) // 输入不变
  })
  test('messageIndex 直取文本；越界回退空串；entry 与 jump 同目标只标一次', () => {
    const messages = ['甲', '乙丙', '']
    // 0: showDialog(1) 1: goto L_2 2: end ←(jump 目标与 entryIps 重合)
    const bc = concat([
      instr(0xffff, 1, 0, 0),
      instr(0x0003, 2, 7, 0), // goto L_2 frameDelay 7
      instr(0x0000, 0, 0, 0),
      instr(0xffff, 9, 0, 0), // 越界 messageIndex
    ])
    const commands = disasm(bc, messages, [2])
    expect(commands[0]).toEqual({ op: 'showDialog', messageIndex: 1, text: '乙丙' })
    expect(commands[1]).toEqual({ op: 'goto', to: 'L_2', frameDelay: 7 })
    expect(commands[2]).toEqual({ op: 'end', label: 'L_2' }) // 同目标只标一次（不重复/不丢）
    expect(commands[3]).toEqual({ op: 'showDialog', messageIndex: 9, text: '' })
  })
})
