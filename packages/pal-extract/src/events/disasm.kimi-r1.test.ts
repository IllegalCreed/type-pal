/**
 * TEST-COVERAGE85-KIMI-EXTRACT-MIGRATE-1 · disasm 残余分支合同（events/disasm.ts）。
 *
 * 排重 basis（旧 fullName 不重复）：
 * - disasm.test.ts：end/goto/showDialog/giveItem/raw/setDialogStyle×4/loadScene 反汇编与往返。
 * - disasm.boundaries.test.ts：giveItem count u16 位型、messageIndex 轴与越界回退、raw 三 operand。
 * 本文件只补以下未覆盖 edge（fast lcov 一手测量）：
 * - emitCommand switch 的 setPalette(0x008B) case（disasm.ts:109 第 5 case）。
 * 并以合成二进制落实合同要求的「合法 round-trip + 未知 opcode + 边界」：
 * - setPalette / 具名未处理 opcode（startBattle 0x0007 → raw 保字节）/ 表外未知 opcode
 *   （0x0100 不在 opcodeTable 0x00..0xA7 填充范围与 0xFFFF 之外）均字节级往返。
 * - 合成 bytecode 的原始 bytes 与 sha256 硬断言（证据锚）。
 * 不覆盖（ledger）：emitRawFallback `operands[f] ?? 0`（:225，disasm 恒传定长三元组）、
 * findOpcodeByName `n < found`（:235，能走到这里的 verb 在 opcodeTable 均只挂一个 opcode：
 * startBattle/waitFrames/setObjectXY/setScriptEntry/setObjectState/playMusic/playSfx/ifItemLess，
 * 全部单映射）、`found ?? 0`（:238，verb 必在表内）。
 */

import { createHash } from 'node:crypto'
import { describe, expect, test } from 'vitest'
import { disasm } from './disasm.js'
import { recompile } from './recompile.js'

function instr(op: number, o0 = 0, o1 = 0, o2 = 0): Uint8Array {
  const out = new Uint8Array(8)
  const view = new DataView(out.buffer)
  view.setUint16(0, op, true)
  view.setUint16(2, o0, true)
  view.setUint16(4, o1, true)
  view.setUint16(6, o2, true)
  return out
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.byteLength
  }
  return out
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

describe('KIMI-R1 disasm setPalette case 与具名 raw 回退', () => {
  test('setPalette(0x008B) 反汇编为具名 Command 且字节级 round-trip', () => {
    const bytecode = concat(instr(0x008b, 9), instr(0x0000))
    // 合成输入原始 bytes 与 hash（证据锚）
    expect([...bytecode]).toEqual([
      0x8b, 0x00, 0x09, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00,
    ])
    expect(sha256(bytecode)).toBe(
      'bccbed81f045a3f885b4428095f866ba88a429472521fedd9e8a4a371840ed26',
    )
    const commands = disasm(bytecode, [])
    expect(commands).toEqual([{ op: 'setPalette', paletteIndex: 9 }, { op: 'end' }])
    const back = recompile(commands, [])
    expect([...back]).toEqual([...bytecode])
    expect(sha256(back)).toBe(sha256(bytecode))
  })

  test('具名但未结构化 opcode（startBattle 0x0007）落 raw 保字节，label operand 目标打标签', () => {
    // startBattle fields: [enemyId, onLost(label), onFled(label)] — emitCommand 无 case，
    // 走 emitRawFallback；pass 1 收集 label 目标 → pass 2 给指令 3 打 L_3。
    const bytecode = concat(
      instr(0x0007, 5, 3, 2), // startBattle enemy=5 onLost=L_3 onFled=L_2
      instr(0x0000), // 1 filler
      instr(0x0000), // 2 filler ← L_2
      instr(0x0001), // 3 end advance ← L_3
    )
    const commands = disasm(bytecode, [])
    expect(commands).toEqual([
      { op: 'raw', opcode: 0x0007, operands: [5, 3, 2] },
      { op: 'end' },
      { op: 'end', label: 'L_2' },
      { op: 'end', advance: true, label: 'L_3' },
    ])
    expect([...recompile(commands, [])]).toEqual([...bytecode])
  })

  test('表外未知 opcode（0x0100）落 raw 且字节级 round-trip', () => {
    const bytecode = concat(instr(0x0100, 0x1234, 0x5678, 0x9abc), instr(0x0000))
    const commands = disasm(bytecode, [])
    expect(commands).toEqual([
      { op: 'raw', opcode: 0x0100, operands: [0x1234, 0x5678, 0x9abc] },
      { op: 'end' },
    ])
    expect([...recompile(commands, [])]).toEqual([...bytecode])
  })

  test('JUMP_TARGET_OPERAND raw 条件跳目标入 BFS 标签集；0xA2 随机跳收 i+1..i+op0', () => {
    // 0x0058 ifItemLess fields[2]=to(label)：具名未结构化 → raw，但目标仍打标签（:63-65）。
    // 0x00A2 随机跳：目标 = 相对 i+1..i+op0（:66-68）。
    const bytecode = concat(
      instr(0x0058, 61, 1, 4), // ifItemLess item 61 <1 → L_4
      instr(0x00a2, 2), // random jump → 2..3
      instr(0x0000), // 2 ← random target
      instr(0x0000), // 3 ← random target
      instr(0x0000), // 4 ← L_4
    )
    const commands = disasm(bytecode, [])
    expect(commands).toEqual([
      { op: 'raw', opcode: 0x0058, operands: [61, 1, 4] },
      { op: 'raw', opcode: 0x00a2, operands: [2, 0, 0] },
      { op: 'end', label: 'L_2' },
      { op: 'end', label: 'L_3' },
      { op: 'end', label: 'L_4' },
    ])
    expect([...recompile(commands, [])]).toEqual([...bytecode])
  })

  test('entryIps 越界入口不打标签、范围内入口打标签（disasm.ts:91 双向）', () => {
    const bytecode = concat(instr(0x0000), instr(0x0001), instr(0x0002, 0, 7))
    const commands = disasm(bytecode, [], [-1, 1, 99])
    expect(commands).toEqual([
      { op: 'end', label: 'L_0' }, // end reset 的 resetTo=0 是 label 字段 → 指令 0 被打标
      { op: 'end', advance: true, label: 'L_1' },
      { op: 'end', reset: true, resetTo: 0, idleFrames: 7 },
    ])
    expect([...recompile(commands, [])]).toEqual([...bytecode])
  })
})
