/** Direct command encoding, unsupported structured inputs and empty command lists. */

import type { Command } from '@type-pal/shared'
import { describe, expect, it, test } from 'vitest'
import { recompile } from './recompile.js'

describe('independent encoded bytes and command boundaries', () => {
  // sequence/if/choice 本就是 Command 联合成员（authored 内容合法 typed 输入），
  // 可直接赋参——合同 = recompile 对非字节码命令 fail-loud。
  const authoredCases: ReadonlyArray<[string, Command[]]> = [
    ['sequence', [{ op: 'sequence', steps: [] }]],
    ['if', [{ op: 'if', cond: { op: 'raw', opcode: 1, operands: [0, 0, 0] }, then: [] }]],
    ['choice', [{ op: 'choice', prompt: '选择', options: [] }]],
  ]

  test('八类命令各 8B 手列：opcode 与 operand 位型精确', () => {
    const commands: Command[] = [
      { op: 'end', advance: true },
      { op: 'goto', to: 'L_1', frameDelay: 7, label: 'L_1' }, // label 同时是重写目标
      { op: 'showDialog', messageIndex: 2, text: 'ignored' }, // recompile 不读 text（接口对称保留）
      { op: 'giveItem', itemId: 61, count: 0x8000 },
      { op: 'loadScene', sceneId: 9 },
      { op: 'setPalette', paletteIndex: 4 },
      { op: 'setDialogStyleBottom', arg0: 5 },
      { op: 'raw', opcode: 0x0177, operands: [0x1234, 0x5678, 0x9abc] },
    ]
    const snapshot = structuredClone(commands)
    const bytes = recompile(commands, [])
    expect([...bytes]).toEqual([
      0x01, 0, 0, 0, 0, 0, 0, 0, 0x03, 0, 1, 0, 7, 0, 0, 0, 0xff, 0xff, 2, 0, 0, 0, 0, 0, 0x1f, 0,
      61, 0, 0, 0x80, 0, 0, 0x59, 0, 9, 0, 0, 0, 0, 0, 0x8b, 0, 4, 0, 0, 0, 0, 0, 0x3d, 0, 5, 0, 0,
      0, 0, 0, 0x77, 0x01, 0x34, 0x12, 0x78, 0x56, 0xbc, 0x9a,
    ])
    expect(commands).toEqual(snapshot) // 输入命令不被改写
  })

  test('同文本不同 messageIndex 字节不同（文本不参与、messageIndex 保真）', () => {
    const same: Command[] = [
      { op: 'showDialog', messageIndex: 0, text: '同文' },
      { op: 'showDialog', messageIndex: 2, text: '同文' },
    ]
    const bytes = recompile(same, [])
    expect([...bytes]).toEqual([0xff, 0xff, 0, 0, 0, 0, 0, 0, 0xff, 0xff, 2, 0, 0, 0, 0, 0])
    // 注：缺 label 目标的默认值政策在 R04 设计中明确未定，本批不为其新增正确绿测。
  })

  test.each(authoredCases)('%s 不是字节码命令：抛 unsupported op', (name, commands) => {
    expect(() => recompile(commands, [])).toThrow(`recompile: unsupported op ${name}`)
  })

  it('空命令清单 → 空字节', () => {
    expect(recompile([], []).byteLength).toBe(0)
  })
})
