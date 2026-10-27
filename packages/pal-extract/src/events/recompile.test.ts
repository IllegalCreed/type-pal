import { describe, expect, it } from 'vitest'
import { concat, instr } from './__tests__/bytecode-fixtures.js'
import { disasm } from './disasm.js'
import { recompile } from './recompile.js'

describe('recompile + round-trip', () => {
  it('end / goto / showDialog / giveItem / raw 单条往返', () => {
    const bc = concat(
      instr(0x0000), // end
      instr(0x0003, 5, 0), // goto 5, delay 0
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

  it('空命令清单 → 空字节', () => {
    expect(recompile([], []).byteLength).toBe(0)
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
