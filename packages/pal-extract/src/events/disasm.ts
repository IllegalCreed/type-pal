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
  LoadSceneCommand,
  SetDialogStyleBottomCommand,
  SetDialogStyleCenterCommand,
  SetDialogStyleNarrationCommand,
  SetDialogStyleTopCommand,
  SetPaletteCommand,
  ShowDialogCommand,
} from '@type-pal/shared'
import { JUMP_TARGET_OPERAND, opcodeTable, RANDOM_JUMP_OPCODE } from './opcodes.js'

/**
 * 将字节码反汇编为 Command 数组,同时内联 messages 字符串。
 *
 * @param bytecode - 8 字节对齐的脚本字节序列
 * @param messages - M.MSG 字符串数组;showDialog 的 messageIndex 直接用作下标
 * @param entryIps - 入口 ip 数组(EventObject.triggerScript / autoScript、Scene.scriptOnEnter / scriptOnTeleport)。
 *                   这些 ip 本身未必被任何跳转指向,但运行时需要从此进入,所以也要打 label。
 */
export function disasm(
  bytecode: Uint8Array,
  messages: string[],
  entryIps: number[] = [],
): Command[] {
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
      // 条件跳转 opcode 虽按 raw 产出,但要给跳转目标打 L_ 标签(slice BFS 才能跟随)。
      const tgtIdx = JUMP_TARGET_OPERAND[op]
      if (tgtIdx !== undefined) {
        labelTargets.add([o0, o1, o2][tgtIdx]!)
      } else if (op === RANDOM_JUMP_OPCODE) {
        // 0xA2 随机跳:目标 = i+1..i+op0(相对)
        for (let k = 1; k <= o0; k++) labelTargets.add(i + k)
      }
      continue
    }

    const operands = [o0, o1, o2]

    // 收集跳转目标,供第 2 遍打 label
    for (let f = 0; f < 3; f++) {
      if (def.fields[f]!.kind === 'label') {
        labelTargets.add(operands[f]!)
      }
    }

    commands.push(emitCommand(def, operands, messages))
  }

  // 第 2 遍:对跳转目标 + entry ips 都打 label
  const allLabelTargets = new Set<number>(labelTargets)
  for (const ip of entryIps) {
    allLabelTargets.add(ip)
  }
  for (const target of allLabelTargets) {
    if (target >= 0 && target < commands.length) {
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
      return emitEnd(def, operands)
    case 'goto':
      return emitGoto(operands)
    case 'showDialog':
      return emitShowDialog(operands, messages)
    case 'giveItem':
      return emitGiveItem(operands)
    case 'loadScene':
      return emitLoadScene(operands)
    case 'setPalette':
      return emitSetPalette(operands)
    case 'setDialogStyleTop':
      return emitSetDialogStyle('setDialogStyleTop', operands)
    case 'setDialogStyleCenter':
      return emitSetDialogStyle('setDialogStyleCenter', operands)
    case 'setDialogStyleBottom':
      return emitSetDialogStyle('setDialogStyleBottom', operands)
    case 'setDialogStyleNarration':
      return emitSetDialogStyle('setDialogStyleNarration', operands)
    default:
      // 其余具名 opcode —— M1 落 raw 保证字节可逆
      return emitRawFallback(def, operands)
  }
}

function emitEnd(def: DefLike, operands: number[]): EndCommand {
  const c: EndCommand = { op: 'end' }
  if (def.endAdvance) c.advance = true
  if (def.endReset) {
    c.reset = true
    c.resetTo = operands[0]!
    c.idleFrames = operands[1]!
  }
  return c
}

function emitGoto(operands: number[]): GotoCommand {
  return {
    op: 'goto',
    to: `L_${operands[0]!}`,
    frameDelay: operands[1]!,
  }
}

function emitShowDialog(operands: number[], messages: string[]): ShowDialogCommand {
  // operand[0] = messageIndex;box 样式由 0x003B-0x003E 状态决定,disasm 不产出
  const messageIndex = operands[0]!
  return {
    op: 'showDialog',
    messageIndex,
    text: messages[messageIndex] ?? '',
  }
}

type SetDialogStyleOp =
  | 'setDialogStyleTop'
  | 'setDialogStyleCenter'
  | 'setDialogStyleBottom'
  | 'setDialogStyleNarration'

type SetDialogStyleCommand =
  | SetDialogStyleTopCommand
  | SetDialogStyleCenterCommand
  | SetDialogStyleBottomCommand
  | SetDialogStyleNarrationCommand

/**
 * 输出 setDialogStyle Command;只在 operand 非 0 时附加 arg0/arg1/arg2,
 * 让全 0 时形状仍是 `{ op }`(便于人工读 / 简化测试)。
 * 非 0 时 recompile 必须按原样写回,确保 round-trip 字节一致。
 */
function emitSetDialogStyle(op: SetDialogStyleOp, operands: number[]): SetDialogStyleCommand {
  const c: SetDialogStyleCommand = { op } as SetDialogStyleCommand
  if (operands[0]! !== 0) c.arg0 = operands[0]!
  if (operands[1]! !== 0) c.arg1 = operands[1]!
  if (operands[2]! !== 0) c.arg2 = operands[2]!
  return c
}

function emitGiveItem(operands: number[]): GiveItemCommand {
  return {
    op: 'giveItem',
    itemId: operands[0]!,
    count: operands[1]!,
  }
}

/** loadScene(0x0059):sceneId = operand[0];operand[1]/[2] 在 sdlpal 该 case 不读,
 *  实数据里观察到全为 0。round-trip 假设这两位为 0 —— 若极少数指令带非 0 尾巴,
 *  pal-extract 全量 round-trip 验证会立刻报错,届时再扩 arg1/arg2 兜底字段。
 */
function emitLoadScene(operands: number[]): LoadSceneCommand {
  return {
    op: 'loadScene',
    sceneId: operands[0]!,
  }
}

/** setPalette(0x008B):paletteIndex = operand[0];operand[1]/[2] sdlpal 不读、实数据全 0。
 *  round-trip 假设这两位为 0 —— 若极少数指令带非 0 尾巴,全量 round-trip 会立刻报错。
 */
function emitSetPalette(operands: number[]): SetPaletteCommand {
  return {
    op: 'setPalette',
    paletteIndex: operands[0]!,
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
