import { describe, expect, it } from 'vitest'
import { disasm } from './disasm.js'
import { recompile } from './recompile.js'

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

describe('disasm entry-ip labeling', () => {
  it('未被跳转的入口 ip 也会打 label', () => {
    const bc = new Uint8Array(16) // 2 条指令,全 0 (= end)
    const cmds = disasm(bc, [], [1])
    expect(cmds[1]?.label).toBe('L_1')
    expect(cmds[0]?.label).toBeUndefined()
  })
})

describe('setDialogStyle round-trip', () => {
  // 映射参照 opcodes.ts(以 sdlpal script.c:3389-3426 为准);plan Task 3 模板里的初版猜测顺序已废弃,opcodes.ts 是权威。
  function buildBytecode(opcodes: number[]): Uint8Array {
    const buf = new Uint8Array(opcodes.length * 8)
    const view = new DataView(buf.buffer)
    opcodes.forEach((op, i) => view.setUint16(i * 8, op, true))
    return buf
  }

  it('四个 setDialogStyle 反汇编为具名 Command', () => {
    // 按 sdlpal script.c:3389+ 实际语义:
    // 0x003B = kDialogCenter (center) / 0x003C = kDialogUpper (top)
    // 0x003D = kDialogLower (bottom) / 0x003E = kDialogCenterWindow (narration)
    const bc = buildBytecode([0x003b, 0x003c, 0x003d, 0x003e, 0x0000])
    const cmds = disasm(bc, [])
    expect(cmds[0]).toEqual({ op: 'setDialogStyleCenter' })
    expect(cmds[1]).toEqual({ op: 'setDialogStyleTop' })
    expect(cmds[2]).toEqual({ op: 'setDialogStyleBottom' })
    expect(cmds[3]).toEqual({ op: 'setDialogStyleNarration' })
    expect(cmds[4]).toEqual({ op: 'end' })
  })

  it('round-trip 字节级一致', () => {
    const bc = buildBytecode([0x003b, 0x003c, 0x003d, 0x003e, 0x0000])
    const cmds = disasm(bc, [])
    const back = recompile(cmds, [])
    expect(back).toEqual(bc)
  })

  it('非 0 operand 进 arg0/arg1/arg2 并 round-trip 一致', () => {
    // 实际原版数据中 0x003C / 0x003D 的 operand[0] (objectId) 常非 0,
    // 必须保留以保证字节级 round-trip。
    const bc = new Uint8Array(16)
    const v = new DataView(bc.buffer)
    v.setUint16(0, 0x003c, true) // setDialogStyleTop with objectId=55
    v.setUint16(2, 55, true)
    v.setUint16(4, 7, true)
    v.setUint16(6, 1, true)
    // i=1: end
    const cmds = disasm(bc, [])
    expect(cmds[0]).toEqual({
      op: 'setDialogStyleTop',
      arg0: 55,
      arg1: 7,
      arg2: 1,
    })
    const back = recompile(cmds, [])
    expect(back).toEqual(bc)
  })
})
