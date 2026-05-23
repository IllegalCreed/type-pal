import { parseMessages } from '../io/msg.js'
import { parseSss } from '../io/sss.js'
import { disasm } from './disasm.js'
import { recompile } from './recompile.js'

export interface RoundtripResult {
  ok: boolean
  originalSize: number
  recompiledSize: number
  /** Byte offset of the first mismatch (undefined if perfectly equal). */
  firstDiffOffset?: number
  /** Instruction index where mismatch occurred = floor(firstDiffOffset / 8). */
  firstDiffInstruction?: number
  /** Opcode (u16 LE) at the first mismatching instruction (in original bytecode). */
  firstDiffOpcode?: number
}

/**
 * Round-trip 验证:disasm → recompile,产物与原始字节码逐字节比对。
 * 失败时返回首次不一致的字节偏移、指令下标、该指令的 opcode,
 * 便于定位 disasm/recompile 的 bug。
 */
export function roundtripCheck(sssBuf: Uint8Array, msgBuf: Uint8Array): RoundtripResult {
  const sss = parseSss(sssBuf)
  const messages = parseMessages(msgBuf, sss.messageOffsets)
  const commands = disasm(sss.bytecode, messages)
  const back = recompile(commands, messages)

  if (back.byteLength !== sss.bytecode.byteLength) {
    return {
      ok: false,
      originalSize: sss.bytecode.byteLength,
      recompiledSize: back.byteLength,
      firstDiffOffset: Math.min(back.byteLength, sss.bytecode.byteLength),
    }
  }

  for (let i = 0; i < back.length; i++) {
    if (back[i] !== sss.bytecode[i]) {
      const instr = Math.floor(i / 8) * 8
      // biome-ignore lint/style/noNonNullAssertion: instr is always within bytecode bounds (i < back.length === bytecode.length)
      const opcode = (sss.bytecode[instr]! | (sss.bytecode[instr + 1]! << 8)) >>> 0
      return {
        ok: false,
        originalSize: sss.bytecode.byteLength,
        recompiledSize: back.byteLength,
        firstDiffOffset: i,
        firstDiffInstruction: Math.floor(i / 8),
        firstDiffOpcode: opcode,
      }
    }
  }

  return {
    ok: true,
    originalSize: sss.bytecode.byteLength,
    recompiledSize: back.byteLength,
  }
}
