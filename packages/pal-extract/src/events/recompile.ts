import type { Command } from '@type-pal/shared'
import { lookupOpcode } from './opcodes.js'

/**
 * 命令清单 → 字节码。disasm 的逆操作,严格对偶。
 * round-trip 关键不变量:disasm(bc, msgs) → recompile(_, msgs) 必须字节相等。
 */
export function recompile(commands: Command[], messages: string[]): Uint8Array {
  const buf = new Uint8Array(commands.length * 8)
  const view = new DataView(buf.buffer)

  // Pass 1: build label → index map
  const labels = new Map<string, number>()
  commands.forEach((c, i) => {
    if (c.label) labels.set(c.label, i)
  })

  // Pass 2: build text → message index map (first occurrence wins)
  const textIndex = new Map<string, number>()
  messages.forEach((m, i) => {
    if (!textIndex.has(m)) textIndex.set(m, i)
  })

  commands.forEach((c, i) => {
    const off = i * 8
    if (c.op === 'raw') {
      view.setUint16(off, c.opcode, true)
      view.setUint16(off + 2, c.operands[0], true)
      view.setUint16(off + 4, c.operands[1], true)
      view.setUint16(off + 6, c.operands[2], true)
      return
    }
    if (c.op === 'end') {
      const op = c.advance ? 0x0001 : c.reset ? 0x0002 : 0x0000
      view.setUint16(off, op, true)
      // operands stay 0 (round-trip caveat for 0x0002, see disasm notes)
      return
    }
    if (c.op === 'goto') {
      view.setUint16(off, lookupOpcode('goto'), true)
      view.setUint16(off + 2, labels.get(c.to) ?? 0, true)
      view.setUint16(off + 4, c.frameDelay ?? 0, true)
      return
    }
    if (c.op === 'showDialog') {
      view.setUint16(off, lookupOpcode('showDialog'), true)
      view.setUint16(off + 2, textIndex.get(c.text) ?? 0, true)
      return
    }
    if (c.op === 'giveItem') {
      view.setUint16(off, lookupOpcode('giveItem'), true)
      view.setUint16(off + 2, c.itemId, true)
      view.setUint16(off + 4, c.count, true)
      return
    }
    // Structured commands (sequence / if / choice) should never reach here —
    // they're authored content and don't round-trip with the disassembler.
    // If they do, throw.
    throw new Error(`recompile: unsupported op ${(c as { op: string }).op}`)
  })

  return buf
}
