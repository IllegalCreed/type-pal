import { describe, expect, it } from 'vitest'
import { disasm } from './disasm.js'

function instr(op: number, o0 = 0, o1 = 0, o2 = 0): Uint8Array {
  const buf = new Uint8Array(8)
  const v = new DataView(buf.buffer)
  v.setUint16(0, op, true)
  v.setUint16(2, o0, true)
  v.setUint16(4, o1, true)
  v.setUint16(6, o2, true)
  return buf
}

function concat(...arrs: Uint8Array[]): Uint8Array {
  const total = arrs.reduce((s, a) => s + a.byteLength, 0)
  const out = new Uint8Array(total)
  let off = 0
  for (const a of arrs) {
    out.set(a, off)
    off += a.byteLength
  }
  return out
}

describe('disasm', () => {
  it('end(0x0000)', () => {
    expect(disasm(instr(0x0000), [])).toEqual([{ op: 'end' }])
  })

  it('goto(0x0003) 跳到指令 5,产 label "L_5"', () => {
    const bc = concat(
      instr(0x0003, 5, 0), // goto 5, delay 0
      instr(0x0000), // i=1: end (filler)
      instr(0x0000), // i=2
      instr(0x0000), // i=3
      instr(0x0000), // i=4
      instr(0x0000), // i=5: end (target)
    )
    const cmds = disasm(bc, [])
    expect(cmds[0]).toEqual({ op: 'goto', to: 'L_5', frameDelay: 0 })
    expect(cmds[5]).toEqual({ label: 'L_5', op: 'end' })
  })

  it('showDialog(0xFFFF) 内联文本(messageIndex 是 operand[0])', () => {
    const cmds = disasm(instr(0xffff, 7, 0, 0), ['', '', '', '', '', '', '', '你好,客官。'])
    expect(cmds).toEqual([{ op: 'showDialog', messageIndex: 7, text: '你好,客官。' }])
  })

  it('giveItem(0x001F)', () => {
    expect(disasm(instr(0x001f, 100, 2), [])).toEqual([{ op: 'giveItem', itemId: 100, count: 2 }])
  })

  it('未具名 opcode → raw', () => {
    expect(disasm(instr(0x0050, 1, 2, 3), [])).toEqual([
      { op: 'raw', opcode: 0x0050, operands: [1, 2, 3] },
    ])
  })

  it('bytecode 长度不是 8 倍数 → 报错', () => {
    expect(() => disasm(new Uint8Array(7), [])).toThrow(/multiple of 8/)
  })
})
