import type { Command } from '@type-pal/shared'
import { createInitialGameState } from '../../game-state.js'
/** Program data and fresh runtime records only; callers own catalogs,poison tables and console spies. */
export const magicProgram: Command[] = [
  // L_43016 气疗术 scriptOnSuccess(idx 0)
  { op: 'raw', opcode: 0x1b, operands: [0, 75, 0], label: 'L_43016' },
  { op: 'end' },
  // L_39554 五气朝元 scriptOnSuccess(idx 2)
  { op: 'raw', opcode: 0x1b, operands: [1, 300, 0], label: 'L_39554' },
  { op: 'end' },
  // L_43024 还魂咒 scriptOnSuccess(idx 4)
  { op: 'raw', opcode: 0x22, operands: [0, 1, 0], label: 'L_43024' },
  { op: 'end' },
  // L_43026 赎魂 scriptOnSuccess(idx 6)
  { op: 'raw', opcode: 0x22, operands: [0, 3, 0], label: 'L_43026' },
  { op: 'end' },
  // L_500 MP-only test(idx 8)— OP_INCREASE_MP +20
  { op: 'raw', opcode: 0x1c, operands: [0, 20, 0], label: 'L_500' },
  { op: 'end' },
  // L_501 HP+MP test(idx 10)— OP_INCREASE_HP_MP +10
  { op: 'raw', opcode: 0x1d, operands: [0, 10, 0], label: 'L_501' },
  { op: 'end' },
  // L_502 multi-op chain(idx 12)— HP-50(0xFFCE = -50 as SHORT)→ revive 10% → end
  // 注:pal-extract dump 真值 operand 是 unsigned WORD(0..65535),signExtendI16
  // 在 runner 内做 (SHORT)cast。fixture 必须用 unsigned 表达 — `-50` 直接传会被
  // JS 32-bit bitwise 误判;65486 = 65536 - 50 = 0xFFCE = -50 的 WORD 表示。
  { op: 'raw', opcode: 0x1b, operands: [0, 65486, 0], label: 'L_502' },
  { op: 'raw', opcode: 0x22, operands: [0, 1, 0] },
  { op: 'end' },
  // L_503 unknown opcode skip(idx 15)
  { op: 'raw', opcode: 0xfe, operands: [0, 0, 0], label: 'L_503' },
  { op: 'raw', opcode: 0x1b, operands: [0, 5, 0] },
  { op: 'end' },
  // L_505 MP+20 applyToAll(idx 18)
  { op: 'raw', opcode: 0x1c, operands: [1, 20, 0], label: 'L_505' },
  { op: 'end' },
  // L_506 HP+10+MP+10 applyToAll(idx 20)
  { op: 'raw', opcode: 0x1d, operands: [1, 10, 0], label: 'L_506' },
  { op: 'end' },
]
export const magicProgramLabels: Record<string, number> = {
  L_43016: 0,
  L_39554: 2,
  L_43024: 4,
  L_43026: 6,
  L_500: 8,
  L_501: 10,
  L_502: 12,
  L_503: 15,
  L_505: 18,
  L_506: 20,
}
export function magicGameState(maxHP = 200) {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  gs.partyMembers = [0, 1, 2]
  gs.PlayerRolesRuntime.rgwMaxHP = [maxHP, maxHP, maxHP, 0, 0, 0]
  gs.PlayerRolesRuntime.rgwMaxMP = [100, 100, 100, 0, 0, 0]
  gs.PlayerRolesRuntime.rgwHP = [50, 100, 50, 0, 0, 0]
  gs.PlayerRolesRuntime.rgwMP = [80, 50, 30, 0, 0, 0]
  return gs
}
