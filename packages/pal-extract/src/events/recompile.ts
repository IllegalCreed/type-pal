import type { Command } from '@type-pal/shared'
import { lookupOpcode } from './opcodes.js'

/**
 * 命令清单 → 字节码。disasm 的逆操作,严格对偶。
 * round-trip 关键不变量:disasm(bc, msgs) → recompile(_, msgs) 必须字节相等。
 *
 * messages 参数保留以维持接口对称,recompile 不再使用它
 * (showDialog 直接写回 messageIndex,不做 text→index 映射)。
 */
export function recompile(commands: Command[], _messages: string[]): Uint8Array {
  const buf = new Uint8Array(commands.length * 8)
  const view = new DataView(buf.buffer)

  // Pass 1: build label → index map
  const labels = new Map<string, number>()
  commands.forEach((c, i) => {
    if (c.label) labels.set(c.label, i)
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
      if (c.reset) {
        view.setUint16(off + 2, c.resetTo ?? 0, true)
        view.setUint16(off + 4, c.idleFrames ?? 0, true)
      }
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
      view.setUint16(off + 2, c.messageIndex, true)
      return
    }
    if (c.op === 'giveItem') {
      view.setUint16(off, lookupOpcode('giveItem'), true)
      view.setUint16(off + 2, c.itemId, true)
      view.setUint16(off + 4, c.count, true)
      return
    }
    if (
      c.op === 'setDialogStyleCenter' ||
      c.op === 'setDialogStyleTop' ||
      c.op === 'setDialogStyleBottom' ||
      c.op === 'setDialogStyleNarration'
    ) {
      const opcode =
        c.op === 'setDialogStyleCenter'
          ? 0x003b
          : c.op === 'setDialogStyleTop'
            ? 0x003c
            : c.op === 'setDialogStyleBottom'
              ? 0x003d
              : 0x003e
      view.setUint16(off, opcode, true)
      view.setUint16(off + 2, c.arg0 ?? 0, true)
      view.setUint16(off + 4, c.arg1 ?? 0, true)
      view.setUint16(off + 6, c.arg2 ?? 0, true)
      return
    }
    // Structured commands (sequence / if / choice) should never reach here —
    // they're authored content and don't round-trip with the disassembler.
    // If they do, throw.
    throw new Error(`recompile: unsupported op ${(c as { op: string }).op}`)
  })

  return buf
}
