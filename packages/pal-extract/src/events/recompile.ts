import type { Command } from '@type-pal/shared'
import { lookupOpcode } from './opcodes.js'

/**
 * 当前可逆命令子集 → 字节码；不支持authored结构化命令。
 * 原盘round-trip须逐字节相等。具名命令未保存的非零尾操作数会造成差异，
 * 由roundtripCheck报告，不能将此函数视为任意8B记录的无损编码器。
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
    if (c.op === 'loadScene') {
      // 0x0059;operand[0]=sceneId,operand[1]/[2] sdlpal 不读、实数据全 0
      view.setUint16(off, lookupOpcode('loadScene'), true)
      view.setUint16(off + 2, c.sceneId, true)
      return
    }
    if (c.op === 'setPalette') {
      // 0x008B;operand[0]=paletteIndex,operand[1]/[2] sdlpal 不读、实数据全 0
      view.setUint16(off, lookupOpcode('setPalette'), true)
      view.setUint16(off + 2, c.paletteIndex, true)
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
