/**
 * TEST-GLM-RUNTIME-RESOURCE-2 R05（events/recompile.ts）。
 * 去重账：recompile.test 覆盖单条往返/空清单/end 变体；recompile.boundaries（RESOURCE-TOOLS R04）
 * 覆盖八类命令手列字节 oracle/showDialog 不读 text/raw 全位型/输入快照，且明确「缺 label 目标
 * 默认值政策未定，不新增绿测」——本文件遵守，不为 ?? 0 补绿。本文件只做未占用合同：
 * authored 结构化命令（sequence/if/choice）拒绝、entry-ip 标签参与 goto 重定位的混合往返
 * （原始字节为独立预期，非重编译器自证）。
 */
import type { Command } from '@type-pal/shared'
import { describe, expect, test } from 'vitest'
import { disasm } from './disasm.js'
import { recompile } from './recompile.js'

describe('R05 recompile authored 结构化命令拒绝', () => {
  // sequence/if/choice 本就是 Command 联合成员（authored 内容合法 typed 输入），
  // 可直接赋参——合同 = recompile 对非字节码命令 fail-loud。
  const authoredCases: ReadonlyArray<[string, Command[]]> = [
    ['sequence', [{ op: 'sequence', steps: [] }]],
    ['if', [{ op: 'if', cond: { op: 'raw', opcode: 1, operands: [0, 0, 0] }, then: [] }]],
    ['choice', [{ op: 'choice', prompt: '选择', options: [] }]],
  ]
  test.each(authoredCases)('%s 不是字节码命令：抛 unsupported op', (_name, commands) => {
    expect(() => recompile(commands, [])).toThrow('unsupported op')
  })
})

describe('R05 混合脚本往返（入口 ip + goto + raw + 样式）', () => {
  test('disasm(entryIps) → recompile 与原始字节逐字节相等；entry 标签参与 goto 定位', () => {
    const bc = new Uint8Array(5 * 8)
    const v = new DataView(bc.buffer)
    const set = (i: number, op: number, o0 = 0, o1 = 0, o2 = 0): void => {
      v.setUint16(i * 8, op, true)
      v.setUint16(i * 8 + 2, o0, true)
      v.setUint16(i * 8 + 4, o1, true)
      v.setUint16(i * 8 + 6, o2, true)
    }
    set(0, 0x0059, 12) // loadScene 12（入口 0）
    set(1, 0x003c, 55, 7, 1) // setDialogStyleTop + args
    set(2, 0x0003, 4, 3) // goto L_4 delay 3
    set(3, 0x00a2, 1) // 随机跳 → 4
    set(4, 0x0002, 0, 6) // end reset resetTo=0 idle=6

    const commands = disasm(bc, [], [0, 3])
    expect(commands[0]?.label).toBe('L_0') // 入口 ip 打标
    expect(commands[4]?.label).toBe('L_4') // goto + 随机跳目标
    const back = recompile(commands, [])
    expect([...back]).toEqual([...bc]) // 独立预期 = 原始字节（round-trip 不变式）
  })
})
