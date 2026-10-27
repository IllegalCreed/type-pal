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
  test.each(authoredCases)('%s 不是字节码命令：抛 unsupported op', (name, commands) => {
    expect(() => recompile(commands, [])).toThrow(`recompile: unsupported op ${name}`)
  })
})

describe('R05 混合脚本往返（入口 ip + goto + raw + 样式）', () => {
  test('disasm(entryIps) → recompile 与原始字节逐字节相等；额外入口和跳转标签均保留', () => {
    const bc = new Uint8Array([
      0x59, 0, 12, 0, 0, 0, 0, 0, 0x3c, 0, 55, 0, 7, 0, 1, 0, 3, 0, 4, 0, 3, 0, 0, 0, 0xa2, 0, 1, 0,
      0, 0, 0, 0, 2, 0, 0, 0, 6, 0, 0, 0,
    ])
    const commands = disasm(bc, [], [0, 3])
    expect(commands).toEqual([
      { op: 'loadScene', sceneId: 12, label: 'L_0' },
      { op: 'setDialogStyleTop', arg0: 55, arg1: 7, arg2: 1 },
      { op: 'goto', to: 'L_4', frameDelay: 3 },
      { op: 'raw', opcode: 0xa2, operands: [1, 0, 0], label: 'L_3' },
      { op: 'end', reset: true, resetTo: 0, idleFrames: 6, label: 'L_4' },
    ])
    const back = recompile(commands, [])
    expect([...back]).toEqual([...bc]) // 独立预期 = 原始字节（round-trip 不变式）
  })
})
