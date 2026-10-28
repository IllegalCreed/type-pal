import { describe, expect, it } from 'vitest'
import { concat, instr } from './__tests__/bytecode-fixtures.js'
import { disasm } from './disasm.js'
import { recompile } from './recompile.js'

describe('disasm', () => {
  it('end(0x0000)', () => {
    expect(disasm(instr(0x0000), [])).toEqual([{ op: 'end' }])
  })

  it('goto(0x0003) 跳到指令 5,产 label "L_5"', () => {
    const bc = concat(
      instr(0x0003, 5, 0), // goto 5，计数操作数0（现有字段名frameDelay）
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

  it('L29:13 个 raw 条件跳转 opcode 的目标会打 L_ 标签', () => {
    const cases: Array<[number, number]> = [
      [0x06, 1],
      [0x1e, 1],
      [0x20, 2],
      [0x2e, 2],
      [0x33, 0],
      [0x34, 0],
      [0x38, 0],
      [0x3a, 0],
      [0x68, 0],
      [0x84, 2],
      [0x91, 0],
      [0x9c, 1],
      [0x9e, 2],
    ]
    for (const [opcode, tgtIdx] of cases) {
      const operands: [number, number, number] = [0, 0, 0]
      operands[tgtIdx] = 3
      const cmds = disasm(
        concat(
          instr(opcode, operands[0], operands[1], operands[2]), // 0: raw 条件跳转
          instr(0x0000), // 1 filler
          instr(0x0000), // 2 filler
          instr(0x0000), // 3 target
        ),
        [],
      )
      expect(cmds[3], `opcode 0x${opcode.toString(16)} target should be labeled`).toEqual({
        label: 'L_3',
        op: 'end',
      })
    }
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
    return concat(...opcodes.map((opcode) => instr(opcode)))
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
    expect(recompile(cmds, [])).toEqual(bc)
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

describe('loadScene round-trip(M3.5,opcode 0x0059)', () => {
  it('loadScene opcode 反汇编为具名 Command', () => {
    const bc = new Uint8Array(16)
    const view = new DataView(bc.buffer)
    view.setUint16(0, 0x0059, true) // opcode loadScene
    view.setUint16(2, 12, true) // sceneId=12
    // i=1: end (0x0000)
    const cmds = disasm(bc, [])
    expect(cmds[0]).toEqual({ op: 'loadScene', sceneId: 12 })
    expect(cmds[1]).toEqual({ op: 'end' })
    expect(recompile(cmds, [])).toEqual(bc)
  })
})

it('labels implicit saved entries after advance and checkpoint without changing raw bytes', () => {
  const raw = concat(instr(1), instr(8), instr(0))
  const parsed = disasm(raw, [], [0])
  expect(parsed[1]?.label).toBe('L_1')
  expect(parsed[2]?.label).toBe('L_2')
  expect(recompile(parsed, [])).toEqual(raw)
})
