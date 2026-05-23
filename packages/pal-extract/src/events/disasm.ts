/**
 * 反汇编 —— 字节码 → 命令清单。
 * 目标游戏 1998 Win9x 版脚本格式:每条指令 8 字节 = u16 LE opcode + 3×u16 LE 操作数。
 *
 * 两遍扫描:
 *   第 1 遍:翻指令 → Command;收集跳转目标(指令下标)。
 *   第 2 遍:对所有被跳转的指令打 label 字段。
 *
 * M1 策略:只对 end / goto / showDialog / giveItem 产出具名 Command;
 * 其余具名 opcode 及未具名 opcode 均落 RawCommand,保证字节层面可逆。
 */

import type {
  Command,
  EndCommand,
  GiveItemCommand,
  GotoCommand,
  ShowDialogCommand,
} from '@type-pal/shared'
import { opcodeTable } from './opcodes.js'

/**
 * 将字节码反汇编为 Command 数组,同时内联 messages 字符串。
 *
 * @param bytecode - 8 字节对齐的脚本字节序列
 * @param messages - M.MSG 字符串数组;showDialog 的 messageIndex 直接用作下标
 */
export function disasm(bytecode: Uint8Array, messages: string[]): Command[] {
  if (bytecode.byteLength % 8 !== 0) {
    throw new Error(`bytecode length not multiple of 8: ${bytecode.byteLength}`)
  }

  const instructions = bytecode.byteLength / 8
  const view = new DataView(bytecode.buffer, bytecode.byteOffset, bytecode.byteLength)

  const labelTargets = new Set<number>()
  const commands: Command[] = []

  // 第 1 遍:逐条翻指令
  for (let i = 0; i < instructions; i++) {
    const op = view.getUint16(i * 8, true)
    const o0 = view.getUint16(i * 8 + 2, true)
    const o1 = view.getUint16(i * 8 + 4, true)
    const o2 = view.getUint16(i * 8 + 6, true)

    const def = opcodeTable[op]

    if (!def?.named) {
      commands.push({ op: 'raw', opcode: op, operands: [o0, o1, o2] })
      continue
    }

    const operands = [o0, o1, o2]

    // 收集跳转目标,供第 2 遍打 label
    for (let f = 0; f < 3; f++) {
      // biome-ignore lint/style/noNonNullAssertion: fields has exactly 3 elements per OpcodeDef
      if (def.fields[f]!.kind === 'label') {
        // biome-ignore lint/style/noNonNullAssertion: operands[f] always defined for f in 0..2
        labelTargets.add(operands[f]!)
      }
    }

    commands.push(emitCommand(def, operands, messages))
  }

  // 第 2 遍:对跳转目标指令打 label
  for (const target of labelTargets) {
    if (target >= 0 && target < commands.length) {
      // biome-ignore lint/style/noNonNullAssertion: target < commands.length checked above
      commands[target] = { ...commands[target]!, label: `L_${target}` } as Command
    }
  }

  return commands
}

// ── 单条指令产出 ──────────────────────────────────────────────────────────────

type DefLike = {
  name: string
  fields: { name: string; kind: string }[]
  endAdvance?: boolean
  endReset?: boolean
}

function emitCommand(def: DefLike, operands: number[], messages: string[]): Command {
  switch (def.name) {
    case 'end':
      return emitEnd(def)
    case 'goto':
      return emitGoto(operands)
    case 'showDialog':
      return emitShowDialog(operands, messages)
    case 'giveItem':
      return emitGiveItem(operands)
    default:
      // 其余具名 opcode —— M1 落 raw 保证字节可逆
      return emitRawFallback(def, operands)
  }
}

function emitEnd(def: DefLike): EndCommand {
  const c: EndCommand = { op: 'end' }
  if (def.endAdvance) c.advance = true
  if (def.endReset) c.reset = true
  return c
}

function emitGoto(operands: number[]): GotoCommand {
  return {
    op: 'goto',
    // biome-ignore lint/style/noNonNullAssertion: operands always has 3 elements
    to: `L_${operands[0]!}`,
    // biome-ignore lint/style/noNonNullAssertion: operands always has 3 elements
    frameDelay: operands[1]!,
  }
}

function emitShowDialog(operands: number[], messages: string[]): ShowDialogCommand {
  // operand[0] = messageIndex;box 样式由 0x003B-0x003E 状态决定,disasm 不产出
  // biome-ignore lint/style/noNonNullAssertion: operands always has 3 elements
  const messageIndex = operands[0]!
  return {
    op: 'showDialog',
    text: messages[messageIndex] ?? '',
  }
}

function emitGiveItem(operands: number[]): GiveItemCommand {
  return {
    op: 'giveItem',
    // biome-ignore lint/style/noNonNullAssertion: operands always has 3 elements
    itemId: operands[0]!,
    // biome-ignore lint/style/noNonNullAssertion: operands always has 3 elements
    count: operands[1]!,
  }
}

/** 具名但 M1 未完整处理的 opcode —— 找回原始 opcode 数值后落 raw */
function emitRawFallback(def: DefLike, operands: number[]): Command {
  const opcode = findOpcodeByName(def.name)
  return {
    op: 'raw',
    opcode,
    operands: [operands[0] ?? 0, operands[1] ?? 0, operands[2] ?? 0],
  }
}

/** 反向查 opcodeTable —— 取 verb 对应的最小 opcode 编号 */
function findOpcodeByName(name: string): number {
  let found: number | undefined
  for (const [opStr, d] of Object.entries(opcodeTable)) {
    if (d.named && d.name === name) {
      const n = Number(opStr)
      if (found === undefined || n < found) found = n
    }
  }
  return found ?? 0
}
