/**
 * TEST-GLM-RUNTIME-RESOURCE-2 R05（events/disasm.ts）。
 * 去重账：disasm.test 覆盖具名命令/goto 标签/showDialog/giveItem/raw/L29 13 跳/8 倍数校验/
 * 入口 ip/四 setDialogStyle/loadScene；disasm.boundaries（RESOURCE-TOOLS-COVERAGE-1 R03）覆盖
 * u16 无符号/messageIndex 轴/raw 全位型/同目标单标/输入保真。本文件只做未占用合同：
 * 0xA2 随机跳相对目标收集（含 op0=0）、0x04/0x24 脚本入口 raw 目标收集、具名未处理 op 的
 * raw fallback（opcode 保号）、标签越界丢弃、subarray byteOffset。
 */
import { describe, expect, test } from 'vitest'
import { disasm } from './disasm.js'

function instr(opcode: number, o0 = 0, o1 = 0, o2 = 0): Uint8Array {
  const out = new Uint8Array(8)
  const view = new DataView(out.buffer)
  view.setUint16(0, opcode, true)
  view.setUint16(2, o0, true)
  view.setUint16(4, o1, true)
  view.setUint16(6, o2, true)
  return out
}

const concat = (parts: readonly Uint8Array[]): Uint8Array => {
  const out = new Uint8Array(parts.reduce((sum, p) => sum + p.byteLength, 0))
  let at = 0
  for (const p of parts) {
    out.set(p, at)
    at += p.byteLength
  }
  return out
}

describe('R05 disasm 0xA2 随机跳标签收集', () => {
  test('op0=2：目标 i+1..i+2 打 L_ 标签，fall-through i+3 不标', () => {
    const bc = concat([
      instr(0x00a2, 2, 0, 0), // 0: 随机跳，相对目标 1、2
      instr(0x0000), // 1: end ← 目标
      instr(0x0000), // 2: end ← 目标
      instr(0x0000), // 3: 不在随机目标集
    ])
    const cmds = disasm(bc, [])
    expect(cmds[1]).toEqual({ label: 'L_1', op: 'end' })
    expect(cmds[2]).toEqual({ label: 'L_2', op: 'end' })
    expect(cmds[3]).toEqual({ op: 'end' })
  })

  test('op0=0：无相对目标，不标任何后续指令', () => {
    const bc = concat([instr(0x00a2, 0, 0, 0), instr(0x0000)])
    const cmds = disasm(bc, [])
    expect(cmds[0]).toEqual({ op: 'raw', opcode: 0xa2, operands: [0, 0, 0] })
    expect(cmds[1]).toEqual({ op: 'end' })
  })
})

describe('R05 disasm 脚本入口类 raw 目标收集', () => {
  test('0x04 call-script 目标 = op0；0x24 setAutoScript 目标 = op1', () => {
    const bc = concat([
      instr(0x0004, 3, 0, 0), // 0: call → 3
      instr(0x0024, 0, 4, 0), // 1: setAutoScript → 4
      instr(0x0000), // 2: 无关
      instr(0x0000), // 3: 0x04 目标
      instr(0x0000), // 4: 0x24 目标
    ])
    const cmds = disasm(bc, [])
    expect(cmds[3]).toEqual({ label: 'L_3', op: 'end' })
    expect(cmds[4]).toEqual({ label: 'L_4', op: 'end' })
    expect(cmds[2]).toEqual({ op: 'end' })
  })
})

describe('R05 disasm 具名未处理 op 的 raw fallback', () => {
  test('startBattle(0x0007, named) 无专用 emit：保号落 raw，operand 原样', () => {
    const cmds = disasm(instr(0x0007, 0x0101, 5, 9), [])
    expect(cmds).toEqual([{ op: 'raw', opcode: 0x0007, operands: [0x0101, 5, 9] }])
  })
})

describe('R05 disasm 标签越界与 subarray', () => {
  test('跳转目标 ≥ 指令数：不标、不崩（第 2 遍越界丢弃）', () => {
    const bc = concat([instr(0x0003, 99, 0, 0), instr(0x0000)])
    const cmds = disasm(bc, [])
    expect(cmds[0]).toEqual({ op: 'goto', to: 'L_99', frameDelay: 0 })
    expect(cmds[1]).toEqual({ op: 'end' })
  })

  test('bytecode 为大缓冲奇数偏移 subarray：与独立缓冲结果全等', () => {
    const bc = concat([instr(0x0003, 2, 5, 0), instr(0x0000), instr(0x0000)])
    const parent = new Uint8Array(7 + bc.length + 3)
    parent.fill(0xee)
    parent.set(bc, 7)
    expect(disasm(parent.subarray(7, 7 + bc.length), ['x'], [2])).toEqual(disasm(bc, ['x'], [2]))
  })
})
