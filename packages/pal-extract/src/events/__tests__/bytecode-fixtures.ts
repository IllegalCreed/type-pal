import { concatBytes, u16Bytes } from '../../__tests__/binary-fixtures.js'

/** 原始8B记录，不读取opcode表或调用编解码器；用于输入，不能同时生成输出oracle。 */
export function instr(opcode: number, o0 = 0, o1 = 0, o2 = 0): Uint8Array {
  return u16Bytes(opcode, o0, o1, o2)
}

export function concat(...instructions: Uint8Array[]): Uint8Array {
  return concatBytes(instructions)
}
