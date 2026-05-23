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

describe('recompile + round-trip', () => {
  it('end / goto / showDialog / giveItem / raw 单条往返', () => {
    const bc = concat(
      instr(0x0000),                    // end
      instr(0x0003, 5, 0),              // goto 5, delay 0
      instr(0x0000),                    // filler
      instr(0x0000),                    // filler
      instr(0x0000),                    // filler
      instr(0x0000),                    // i=5 (target of goto)
      instr(0xffff, 1, 0, 0),           // showDialog msg 1
      instr(0x001f, 100, 2, 0),         // giveItem id=100 count=2
      instr(0x0050, 1, 2, 3),           // unnamed → raw
    )
    const messages = ['', '你好']
    const cmds = disasm(bc, messages)
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
    // 0x0001 round-trips faithfully; 0x0002 preserves resetTo and idleFrames
    expect(back[0]).toBe(0x01)
    expect(back[1]).toBe(0x00)
    expect(back[8]).toBe(0x02)
    expect(back[9]).toBe(0x00)
    // operand[0] = 42 (resetTo)
    expect(back[10]).toBe(42)
    expect(back[11]).toBe(0x00)
    // operand[1] = 5 (idleFrames)
    expect(back[12]).toBe(5)
    expect(back[13]).toBe(0x00)
  })
})
